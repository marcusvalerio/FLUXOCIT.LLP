import { useRef } from 'react'
import { Group, Rect } from 'react-konva'
import Konva from 'konva'
import { OBJECT_CATALOG } from '../objects/catalog'
import { useEditorStore } from '../state/useEditorStore'
import { cmToPx, pxToCm } from '../../../shared/lib/units'
import { getBoundingBox, snapToGrid } from '../../../shared/lib/geometry'
import { resolveObjectSnap } from '../../../shared/lib/snap'
import { getLogisticsSnapLines } from '../../../shared/lib/logisticsSnap'
import type { BoundsStatus } from '../../../shared/lib/spatialRules'
import type { LayoutObject } from '../../../types/layout'
import type { SnapGuides } from './GuideLines'

const LONG_PRESS_MS = 500
const SNAP_THRESHOLD_SCREEN_PX = 8

interface ObjectNodeProps {
  obj: LayoutObject
  pxPerMeter: number
  selected: boolean
  /** True when this object's footprint overlaps another storage object (rack/corridor) — see spatialRules.ts. */
  hasOverlap: boolean
  /** Whether the object's footprint sits inside, straddles, or is entirely off the environment. */
  boundsStatus: BoundsStatus
  /** True when this object is involved in a 🔴 critical spatial violation beyond the two above
   * (corredor bloqueado, conflito equipamento×estrutura, doca bloqueada) — see
   * spatialRules.computeSpatialViolations. Reuses the same red outline as hasOverlap. */
  hasCriticalViolation?: boolean
  /** True when this object is involved in a 🟡 warning-level spatial violation beyond boundsStatus
   * (corredor estreito, área sobreposta, doca parcialmente bloqueada). Reuses the same orange
   * outline as boundsStatus !== 'inside'. */
  hasWarningViolation?: boolean
  registerRef: (id: string, node: Konva.Group | null) => void
  onSnapGuideChange: (guides: SnapGuides | null) => void
  onDraggingChange: (dragging: boolean) => void
  /** False enquanto a prancheta está em modo de deslocamento (ferramenta "Mover prancheta" ou
   * espaço pressionado): o mesmo gesto não pode mover o objeto e a prancheta ao mesmo tempo. */
  draggable?: boolean
}

export function ObjectNode({
  obj,
  draggable = true,
  pxPerMeter,
  selected,
  hasOverlap,
  boundsStatus,
  hasCriticalViolation = false,
  hasWarningViolation = false,
  registerRef,
  onSnapGuideChange,
  onDraggingChange,
}: ObjectNodeProps) {
  const gridStepM = useEditorStore((s) => s.gridStepM)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const zoom = useEditorStore((s) => s.camera.zoom)
  const selectedCount = useEditorStore((s) => s.selectedIds.length)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)

  const originRef = useRef<Map<string, { x: number; y: number }> | null>(null)
  const dragAnchorStartPxRef = useRef<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const suppressTapRef = useRef(false)

  const def = OBJECT_CATALOG[obj.objectType]
  const widthPx = cmToPx(obj.width, pxPerMeter)
  const lengthPx = cmToPx(obj.length, pxPerMeter)
  const centerXPx = cmToPx(obj.x + obj.width / 2, pxPerMeter)
  const centerYPx = cmToPx(obj.y + obj.length / 2, pxPerMeter)
  const Render = def.render

  function clearLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handleTouchStart() {
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressTapRef.current = true
      const store = useEditorStore.getState()
      store.setMultiSelectMode(true)
      // Long-press only ever adds to the selection — never removes. The common case is
      // long-pressing an object that's already selected (e.g. just inserted or just tapped),
      // which should simply enter multi-select mode without deselecting it.
      if (!store.selectedIds.includes(obj.id)) {
        store.toggleSelect(obj.id)
      }
      longPressTimerRef.current = null
    }, LONG_PRESS_MS)
  }

  function handleSelect(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (suppressTapRef.current) {
      suppressTapRef.current = false
      return
    }
    const shiftKey = 'shiftKey' in e.evt ? e.evt.shiftKey : false
    const store = useEditorStore.getState()
    if (shiftKey || store.multiSelectMode) {
      store.toggleSelect(obj.id)
    } else {
      store.selectObject(obj.id)
    }
  }

  function handleDragStart(e: Konva.KonvaEventObject<DragEvent>) {
    clearLongPress()
    onDraggingChange(true)
    const store = useEditorStore.getState()
    let selection = store.selectedIds
    if (!selection.includes(obj.id)) {
      store.selectObject(obj.id)
      selection = [obj.id]
    }
    const movingIds = selection.length > 1 ? selection : [obj.id]
    const origin = new Map<string, { x: number; y: number }>()
    for (const id of movingIds) {
      const o = store.objects.find((x) => x.id === id)
      if (o) origin.set(id, { x: o.x, y: o.y })
    }
    originRef.current = origin
    dragAnchorStartPxRef.current = { x: e.target.x(), y: e.target.y() }
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    // A second finger joining mid-drag hands the gesture to pinch-zoom (see EditorCanvas) —
    // bail out immediately so this frame's jump in touch position never moves the object.
    const nativeEvt = e.evt as unknown as TouchEvent
    if ('touches' in nativeEvt && nativeEvt.touches.length > 1) {
      e.target.stopDrag()
      return
    }

    const origin = originRef.current
    const anchorStart = dragAnchorStartPxRef.current
    if (!origin || !anchorStart) return

    const store = useEditorStore.getState()
    const anchorOrigin = origin.get(obj.id)
    if (!anchorOrigin) return

    const deltaXCm = pxToCm(e.target.x() - anchorStart.x, pxPerMeter)
    const deltaYCm = pxToCm(e.target.y() - anchorStart.y, pxPerMeter)
    const rawAnchorX = anchorOrigin.x + deltaXCm
    const rawAnchorY = anchorOrigin.y + deltaYCm

    let finalDeltaX = deltaXCm
    let finalDeltaY = deltaYCm
    let guideX: number | undefined
    let guideY: number | undefined

    if (snapEnabled) {
      const movingIds = new Set(origin.keys())
      const anchorBox = getBoundingBox({ ...obj, x: rawAnchorX, y: rawAnchorY })
      const otherBoxes = store.objects.filter((o) => !movingIds.has(o.id)).map(getBoundingBox)
      // The environment's own edges are valid snap targets too — flush against a wall is a very
      // common intentional placement (see docs/BUSINESS_RULES.md § Ambiente).
      otherBoxes.push({ minX: 0, minY: 0, maxX: envWidthM * 100, maxY: envHeightM * 100 })
      const thresholdCm = pxToCm(SNAP_THRESHOLD_SCREEN_PX / zoom, pxPerMeter)
      // Snap logístico: alvos que existem pelo significado do objeto (carga unitizada assenta na
      // estrutura de armazenagem, equipamento segue o eixo do corredor) — ver lib/logisticsSnap.
      const logisticsLines = getLogisticsSnapLines(
        { ...obj, x: rawAnchorX, y: rawAnchorY },
        store.objects.filter((o) => !movingIds.has(o.id)),
      )
      const snapResult = resolveObjectSnap(anchorBox, otherBoxes, thresholdCm, logisticsLines)
      const stepCm = gridStepM * 100

      if (snapResult.x) {
        finalDeltaX = deltaXCm + snapResult.x.delta
        guideX = snapResult.x.guidePosition
      } else {
        finalDeltaX = snapToGrid(rawAnchorX, stepCm) - anchorOrigin.x
      }
      if (snapResult.y) {
        finalDeltaY = deltaYCm + snapResult.y.delta
        guideY = snapResult.y.guidePosition
      } else {
        finalDeltaY = snapToGrid(rawAnchorY, stepCm) - anchorOrigin.y
      }
    }

    onSnapGuideChange({
      x: guideX,
      y: guideY,
      readoutXCm: anchorOrigin.x + finalDeltaX,
      readoutYCm: anchorOrigin.y + finalDeltaY,
    })

    const updates = Array.from(origin.entries()).map(([id, pos]) => ({
      id,
      x: pos.x + finalDeltaX,
      y: pos.y + finalDeltaY,
    }))
    store.moveManyLive(updates)
  }

  function handleDragEnd() {
    const origin = originRef.current
    onDraggingChange(false)
    onSnapGuideChange(null)
    if (!origin) return
    const store = useEditorStore.getState()
    const final = Array.from(origin.keys()).map((id) => {
      const o = store.objects.find((x) => x.id === id)
      return { id, x: o?.x ?? 0, y: o?.y ?? 0 }
    })
    // As posições de origem (capturadas no dragstart) são o que o undo precisa registrar — durante
    // o gesto, moveManyLive já moveu os objetos sem histórico. Ver commitDragPositions.
    store.commitDragPositions(
      Array.from(origin.entries()).map(([id, pos]) => ({ id, x: pos.x, y: pos.y })),
      final,
    )
    originRef.current = null
    dragAnchorStartPxRef.current = null
  }

  return (
    <Group
      ref={(node) => {
        registerRef(obj.id, node)
        // IMPORTANT: do not animate from the ref callback. React/Konva can invoke a callback ref
        // again on ordinary renders when the callback identity changes. Animating here caused the
        // object to repeatedly fade/scale in during pointer movement and state updates, producing
        // a visible flicker / "Christmas tree" effect. Object insertion should remain stable.
      }}
      x={centerXPx}
      y={centerYPx}
      offsetX={widthPx / 2}
      offsetY={lengthPx / 2}
      rotation={obj.rotationDeg}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onClick={handleSelect}
      onTap={handleSelect}
    >
      <Render obj={obj} widthPx={widthPx} lengthPx={lengthPx} />
      {/* Universal hit area: every logistics object remains selectable even when its technical
          renderer uses small/decorative shapes or non-listening children. It follows the exact
          footprint, stays visually transparent, and lets the Group keep the same drag/select flow
          on desktop and touch devices. */}
      <Rect
        width={widthPx}
        height={lengthPx}
        fill="rgba(0,0,0,0.001)"
        listening
      />
      {(hasOverlap || hasCriticalViolation) && (
        <Rect
          width={widthPx}
          height={lengthPx}
          stroke="#DC2626"
          strokeWidth={2.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {(boundsStatus !== 'inside' || hasWarningViolation) && (
        <Rect
          width={widthPx}
          height={lengthPx}
          stroke="#D97706"
          strokeWidth={2.5}
          dash={[3, 3]}
          listening={false}
        />
      )}
      {selected && selectedCount > 1 && (
        <Rect width={widthPx} height={lengthPx} stroke="#0796D7" strokeWidth={2} listening={false} />
      )}
    </Group>
  )
}
