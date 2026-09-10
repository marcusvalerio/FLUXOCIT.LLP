import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import { Box } from 'lucide-react'
import type Konva from 'konva'
import { Environment } from './Environment'
import { FlowOverlay } from './FlowOverlay'
import { Grid } from './Grid'
import { ObjectNode } from './ObjectNode'
import { ObjectRenderStatic } from './ObjectRenderStatic'
import { Minimap } from './Minimap'
import { RULER_SIZE, Rulers } from './Rulers'
import { GuideLines, type SnapGuides } from './GuideLines'
import { SelectionTransformer } from './SelectionTransformer'
import { useEditorStore, type Camera } from '../state/useEditorStore'
import { getBoundingBox, rectIntersectsObject } from '../../../shared/lib/geometry'
import { computeSpatialViolations, findStorageOverlaps, getBoundsStatus } from '../../../shared/lib/spatialRules'
import { cmToPx, pxToCm } from '../../../shared/lib/units'
import { useIsDarkMode } from '../../../shared/lib/useIsDarkMode'
import { OBJECT_CATALOG } from '../objects/catalog'
import { LIBRARY_DND_MIME } from '../library-panel/dragAndDrop'
import { getTool } from '../tools/toolRegistry'
import {
  constrainAngle,
  distanceCm,
  formatDistance,
  rectFromPoints,
  snapPoint,
  wallFromPoints,
  type PointCm,
} from '../tools/draftGeometry'
import type { ObjectTypeKey } from '../../../types/layout'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const MARQUEE_MIN_PX = 4
const EXPORT_PADDING_PX = 24
/** The exported layout uses an opaque, blank paper-like backdrop rather than transparency. */
const EXPORT_BG = '#F6F4F0'

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

function getCenter(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

export interface EditorCanvasHandle {
  insertAtCenter: (objectType: ObjectTypeKey) => void
  zoomIn: () => void
  zoomOut: () => void
  fitToView: () => void
  /** Traz a seleção atual para o centro da viewport, mantendo o zoom (ou enquadra o ambiente
   * inteiro quando nada está selecionado). */
  centerOnSelection: () => void
  exportPng: () => void
}

interface EditorCanvasProps {
  registerHandle: (handle: EditorCanvasHandle) => void
  /** Fires whenever any object starts/stops being dragged — lets the mobile properties sheet
   * collapse out of the way for the duration of the gesture. See docs/UX.md § 2.2. */
  onDraggingChange?: (dragging: boolean) => void
  /** Conteúdo sobreposto ao canvas (controles flutuantes) — fica aqui dentro para acompanhar
   * exatamente a área da prancheta, sem duplicar o cálculo de tamanho. */
  overlay?: ReactNode
  /** Minimapa no canto inferior direito (desktop/tablet). */
  showMinimap?: boolean
}

export function EditorCanvas({ registerHandle, onDraggingChange, overlay, showMinimap = false }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [guides, setGuides] = useState<SnapGuides | null>(null)
  const [isDraggingObject, setIsDraggingObject] = useState(false)
  const [cursor, setCursor] = useState<'default' | 'grab' | 'grabbing' | 'crosshair'>('default')
  /** Realce da prancheta enquanto um item da biblioteca é arrastado sobre ela (drag & drop). */
  const [dropActive, setDropActive] = useState(false)
  const [cursorWorldM, setCursorWorldM] = useState<{ x: number; y: number } | null>(null)

  const lastPinchDistance = useRef<number | null>(null)
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null)
  const singleTouchPan = useRef<{ x: number; y: number } | null>(null)
  const spaceDownRef = useRef(false)
  const mouseModeRef = useRef<'none' | 'pan' | 'marquee' | 'draft'>('none')
  const panLastScreenRef = useRef<{ x: number; y: number } | null>(null)
  const marqueeStartWorldRef = useRef<{ x: number; y: number } | null>(null)
  const marqueeShiftRef = useRef(false)
  const nodesById = useRef<Map<string, Konva.Group>>(new Map())
  const exportStageRef = useRef<Konva.Stage>(null)

  const layoutName = useEditorStore((s) => s.layoutName)
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectObject = useEditorStore((s) => s.selectObject)
  const selectMany = useEditorStore((s) => s.selectMany)
  const camera = useEditorStore((s) => s.camera)
  const setCamera = useEditorStore((s) => s.setCamera)
  const activeTool = useEditorStore((s) => s.activeTool)
  const tool = getTool(activeTool)
  const placeObjectType = useEditorStore((s) => s.placeObjectType)
  const measurement = useEditorStore((s) => s.measurement)
  const setMeasurement = useEditorStore((s) => s.setMeasurement)
  const createObject = useEditorStore((s) => s.createObject)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const gridStepM = useEditorStore((s) => s.gridStepM)
  const spacePanActive = useEditorStore((s) => s.spacePanActive)
  const setSpacePanActive = useEditorStore((s) => s.setSpacePanActive)
  /** Gesto de desenho em andamento (parede, área, medição), em coordenadas de mundo (cm). */
  const [draft, setDraft] = useState<{ start: PointCm; end: PointCm } | null>(null)
  const shiftDownRef = useRef(false)
  const scalePxPerMeter = useEditorStore((s) => s.scalePxPerMeter)
  const gridVisible = useEditorStore((s) => s.gridVisible)
  const flowOverlayVisible = useEditorStore((s) => s.flowOverlayVisible)
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const addObject = useEditorStore((s) => s.addObject)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)
  const envWidthPx = cmToPx(envWidthM * 100, scalePxPerMeter)
  const envHeightPx = cmToPx(envHeightM * 100, scalePxPerMeter)
  const overlappingIds = useMemo(() => findStorageOverlaps(objects), [objects])
  const boundsStatusById = useMemo(() => {
    const envWidthCm = envWidthM * 100
    const envHeightCm = envHeightM * 100
    const map = new Map<string, ReturnType<typeof getBoundsStatus>>()
    for (const o of objects) map.set(o.id, getBoundsStatus(o, envWidthCm, envHeightCm))
    return map
  }, [objects, envWidthM, envHeightM])
  // Corredor bloqueado, conflito equipamento×estrutura, área operacional sobreposta, corredor
  // estreito, doca bloqueada (Fase 8 § Regras logísticas básicas) — layered onto the same
  // red/orange outlines as the existing overlap/bounds checks above (see ObjectNode).
  const { criticalViolationIds, warningViolationIds } = useMemo(() => {
    const violations = computeSpatialViolations(objects, envWidthM * 100, envHeightM * 100)
    const critical = new Set<string>()
    const warning = new Set<string>()
    for (const v of violations) {
      const target = v.severity === 'critical' ? critical : warning
      for (const id of v.objectIds) target.add(id)
    }
    return { criticalViolationIds: critical, warningViolationIds: warning }
  }, [objects, envWidthM, envHeightM])
  useIsDarkMode()

  // Keep the complete environment and any object that legitimately extends beyond it in the export.
  const exportBoundsPx = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = envWidthPx
    let maxY = envHeightPx
    for (const obj of objects) {
      const box = getBoundingBox(obj)
      minX = Math.min(minX, cmToPx(box.minX, scalePxPerMeter))
      minY = Math.min(minY, cmToPx(box.minY, scalePxPerMeter))
      maxX = Math.max(maxX, cmToPx(box.maxX, scalePxPerMeter))
      maxY = Math.max(maxY, cmToPx(box.maxY, scalePxPerMeter))
    }
    return {
      offsetX: -minX + EXPORT_PADDING_PX,
      offsetY: -minY + EXPORT_PADDING_PX,
      width: maxX - minX + EXPORT_PADDING_PX * 2,
      height: maxY - minY + EXPORT_PADDING_PX * 2,
    }
  }, [objects, envWidthPx, envHeightPx, scalePxPerMeter])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const latestHandleMouseUp = useRef(() => {})
  useEffect(() => {
    latestHandleMouseUp.current = handleMouseUp
  })

  useEffect(() => {
    function onWindowMouseUp() {
      if (mouseModeRef.current !== 'none') {
        latestHandleMouseUp.current()
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Shift') shiftDownRef.current = true
      if (e.key === 'Escape') setDraft(null)
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        if (!spaceDownRef.current) setCursor('grab')
        spaceDownRef.current = true
        setSpacePanActive(true)
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') shiftDownRef.current = false
      if (e.code === 'Space') {
        spaceDownRef.current = false
        setSpacePanActive(false)
        setCursor(mouseModeRef.current === 'pan' ? 'grabbing' : 'default')
      }
    }
    function onBlur() {
      // A janela perdeu o foco com espaço pressionado: sem isso o canvas ficaria "preso" em pan.
      spaceDownRef.current = false
      setSpacePanActive(false)
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [setSpacePanActive])

  // A ferramenta ativa define o cursor de repouso: mãozinha para "mover prancheta", seta para
  // "selecionar" — feedback imediato de qual gesto o arraste vai produzir.
  useEffect(() => {
    if (mouseModeRef.current === 'pan') return
    setCursor(tool.cursor)
  }, [tool])

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
  }

  function computeFitCamera(): Partial<Camera> | null {
    const padding = 32
    const availWidth = size.width - RULER_SIZE - padding * 2
    const availHeight = size.height - RULER_SIZE - padding * 2
    if (availWidth <= 0 || availHeight <= 0 || envWidthPx <= 0 || envHeightPx <= 0) return null
    const newZoom = clampZoom(Math.min(availWidth / envWidthPx, availHeight / envHeightPx))
    const contentWidth = envWidthPx * newZoom
    const contentHeight = envHeightPx * newZoom
    return {
      zoom: newZoom,
      x: RULER_SIZE + padding + (availWidth - contentWidth) / 2,
      y: RULER_SIZE + padding + (availHeight - contentHeight) / 2,
    }
  }

  useEffect(() => {
    registerHandle({
      insertAtCenter: (objectType) => {
        const worldXPx = (size.width / 2 - camera.x) / camera.zoom
        const worldYPx = (size.height / 2 - camera.y) / camera.zoom
        const worldXCm = (worldXPx / scalePxPerMeter) * 100
        const worldYCm = (worldYPx / scalePxPerMeter) * 100
        addObject(objectType, worldXCm, worldYCm)
      },
      zoomIn: () => setCamera({ zoom: clampZoom(camera.zoom * 1.25) }),
      zoomOut: () => setCamera({ zoom: clampZoom(camera.zoom / 1.25) }),
      fitToView: () => {
        const fit = computeFitCamera()
        if (fit) setCamera(fit)
      },
      centerOnSelection: () => {
        const selected = objects.filter((o) => selectedIds.includes(o.id))
        if (selected.length === 0) {
          const fit = computeFitCamera()
          if (fit) setCamera(fit)
          return
        }
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const obj of selected) {
          const box = getBoundingBox(obj)
          minX = Math.min(minX, box.minX)
          minY = Math.min(minY, box.minY)
          maxX = Math.max(maxX, box.maxX)
          maxY = Math.max(maxY, box.maxY)
        }
        const centerXPx = cmToPx((minX + maxX) / 2, scalePxPerMeter)
        const centerYPx = cmToPx((minY + maxY) / 2, scalePxPerMeter)
        setCamera({
          x: (size.width + RULER_SIZE) / 2 - centerXPx * camera.zoom,
          y: (size.height + RULER_SIZE) / 2 - centerYPx * camera.zoom,
        })
      },
      exportPng: () => {
        const stage = exportStageRef.current
        if (!stage) return

        const canvas = stage.toCanvas({ pixelRatio: 2 })
        canvas.toBlob(async (blob) => {
          if (!blob) return
          const safeName = (layoutName || 'layout').trim().replace(/[^\p{L}\p{N}\- _]/gu, '') || 'layout'
          const fileName = `${safeName}.png`
          const file = new File([blob], fileName, { type: 'image/png' })

          // On mobile Safari, the download attribute on a data/blob URL is unreliable.
          // Prefer the native share sheet when file sharing is available so the user can
          // explicitly save the PNG to Photos/Files. Desktop and browsers without sharing
          // keep the normal direct-download behavior.
          const canShareFile = typeof navigator !== 'undefined'
            && typeof navigator.share === 'function'
            && typeof navigator.canShare === 'function'
            && navigator.canShare({ files: [file] })

          if (canShareFile) {
            try {
              await navigator.share({ files: [file], title: fileName })
              return
            } catch (error) {
              if (error instanceof DOMException && error.name === 'AbortError') return
            }
          }

          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = fileName
          link.rel = 'noopener'
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        }, 'image/png')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerHandle, size, camera, scalePxPerMeter, addObject, setCamera, envWidthPx, envHeightPx, layoutName, objects, selectedIds])

  const lastFittedLayoutId = useRef<string | null>(null)
  const storeLayoutId = useEditorStore((s) => s.layoutId)
  useEffect(() => {
    if (!storeLayoutId || lastFittedLayoutId.current === storeLayoutId) return
    const fit = computeFitCamera()
    if (!fit) return
    lastFittedLayoutId.current = storeLayoutId
    setCamera(fit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLayoutId, size.width, size.height, envWidthPx, envHeightPx])

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldZoom = camera.zoom
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * (direction > 0 ? 1.1 : 1 / 1.1)))

    const worldX = (pointer.x - camera.x) / oldZoom
    const worldY = (pointer.y - camera.y) / oldZoom

    setCamera({
      zoom: newZoom,
      x: pointer.x - worldX * newZoom,
      y: pointer.y - worldY * newZoom,
    })
  }

  /** Ponto do mundo (cm) correspondente à posição atual do ponteiro no Stage. */
  function pointerWorldCm(stage: Konva.Stage): PointCm | null {
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return {
      x: pxToCm((pointer.x - camera.x) / camera.zoom, scalePxPerMeter),
      y: pxToCm((pointer.y - camera.y) / camera.zoom, scalePxPerMeter),
    }
  }

  /** Extremidade do rascunho já com snap de grade e, com Shift, trava de ângulo. */
  function resolveDraftEnd(start: PointCm, raw: PointCm): PointCm {
    const stepCm = gridStepM * 100
    const angled = shiftDownRef.current && activeTool !== 'area' ? constrainAngle(start, raw) : raw
    return snapPoint(angled, stepCm, snapEnabled)
  }

  function beginDraft(point: PointCm) {
    const start = snapPoint(point, gridStepM * 100, snapEnabled)
    setDraft({ start, end: start })
  }

  /** Fecha o gesto de desenho: cria o objeto (parede/área) ou fixa a medição. */
  function commitDraft(current: { start: PointCm; end: PointCm }) {
    if (activeTool === 'measure') {
      setMeasurement(distanceCm(current.start, current.end) > 0 ? current : null)
      return
    }
    if (activeTool === 'wall') {
      const thickness = OBJECT_CATALOG.wall.defaultLength
      const geometry = wallFromPoints(current.start, current.end, thickness)
      if (geometry) createObject({ objectType: 'wall', ...geometry })
      return
    }
    if (activeTool === 'area') {
      const geometry = rectFromPoints(current.start, current.end)
      if (geometry) createObject({ objectType: 'area', ...geometry })
    }
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const isEmptyTarget = e.target === stage
    const isMiddleButton = e.evt.button === 1
    const isRightButton = e.evt.button === 2

    // Deslocar a prancheta (pan) — quatro caminhos equivalentes, e todos funcionam mesmo com o
    // cursor sobre um objeto, exceto o arraste comum com o botão esquerdo (esse continua sendo
    // "mover o objeto"). É essa separação que garante: PAN nunca move objeto, mover objeto nunca
    // move a prancheta. Ver docs/UX.md § Navegação da prancheta.
    //   · botão direito + arrastar   · botão do meio + arrastar
    //   · espaço + arrastar          · ferramenta "Mover prancheta" ativa
    const panWithLeftButton = e.evt.button === 0 && (spaceDownRef.current || activeTool === 'pan')
    if (isMiddleButton || isRightButton || panWithLeftButton) {
      mouseModeRef.current = 'pan'
      panLastScreenRef.current = pointer
      setCursor('grabbing')
      e.evt.preventDefault()
      // Um pan iniciado sobre um objeto não pode deixar o Konva começar a arrastá-lo junto.
      nodesById.current.forEach((node) => {
        if (node.isDragging()) node.stopDrag()
      })
      return
    }

    // Ferramentas de desenho e de inserção assumem o clique esquerdo em qualquer ponto da
    // prancheta — inclusive sobre um objeto, já que desenhar uma parede por cima de um rack é
    // legítimo. Só a ferramenta Selecionar chega no marquee/seleção abaixo.
    if (e.evt.button === 0 && (tool.draws || activeTool === 'place')) {
      const point = pointerWorldCm(stage)
      if (!point) return
      e.evt.preventDefault()
      if (activeTool === 'place') {
        if (placeObjectType) addObject(placeObjectType, point.x, point.y)
        return
      }
      mouseModeRef.current = 'draft'
      beginDraft(point)
      return
    }

    if (isEmptyTarget && e.evt.button === 0) {
      mouseModeRef.current = 'marquee'
      const worldX = (pointer.x - camera.x) / camera.zoom
      const worldY = (pointer.y - camera.y) / camera.zoom
      marqueeStartWorldRef.current = { x: worldX, y: worldY }
      marqueeShiftRef.current = e.evt.shiftKey
      setMarqueeRect({ x: worldX, y: worldY, width: 0, height: 0 })
      if (!e.evt.shiftKey) selectObject(null)
    }
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const worldXCm = pxToCm((pointer.x - camera.x) / camera.zoom, scalePxPerMeter)
    const worldYCm = pxToCm((pointer.y - camera.y) / camera.zoom, scalePxPerMeter)
    setCursorWorldM({ x: worldXCm / 100, y: worldYCm / 100 })

    if (mouseModeRef.current === 'draft' && draft) {
      const point = pointerWorldCm(stage)
      if (point) setDraft({ start: draft.start, end: resolveDraftEnd(draft.start, point) })
      return
    }

    if (mouseModeRef.current === 'pan' && panLastScreenRef.current) {
      const dx = pointer.x - panLastScreenRef.current.x
      const dy = pointer.y - panLastScreenRef.current.y
      setCamera({ x: camera.x + dx, y: camera.y + dy })
      panLastScreenRef.current = pointer
    } else if (mouseModeRef.current === 'marquee' && marqueeStartWorldRef.current) {
      const worldX = (pointer.x - camera.x) / camera.zoom
      const worldY = (pointer.y - camera.y) / camera.zoom
      const start = marqueeStartWorldRef.current
      setMarqueeRect({
        x: Math.min(start.x, worldX),
        y: Math.min(start.y, worldY),
        width: Math.abs(worldX - start.x),
        height: Math.abs(worldY - start.y),
      })
    }
  }

  function finishMarquee() {
    if (marqueeRect && (marqueeRect.width > MARQUEE_MIN_PX || marqueeRect.height > MARQUEE_MIN_PX)) {
      const rectCm = {
        minX: pxToCm(marqueeRect.x, scalePxPerMeter),
        minY: pxToCm(marqueeRect.y, scalePxPerMeter),
        maxX: pxToCm(marqueeRect.x + marqueeRect.width, scalePxPerMeter),
        maxY: pxToCm(marqueeRect.y + marqueeRect.height, scalePxPerMeter),
      }
      // Interseção com a pegada real (rotacionada) de cada objeto, não com seu bounding box —
      // ver shared/lib/geometry.rectIntersectsObject.
      const hits = objects.filter((o) => rectIntersectsObject(rectCm, o)).map((o) => o.id)
      if (hits.length > 0) selectMany(hits, marqueeShiftRef.current)
    }
    mouseModeRef.current = 'none'
    panLastScreenRef.current = null
    marqueeStartWorldRef.current = null
    setMarqueeRect(null)
  }

  function handleMouseUp() {
    if (mouseModeRef.current === 'draft') {
      if (draft) commitDraft(draft)
      setDraft(null)
    }
    if (mouseModeRef.current === 'marquee') finishMarquee()
    mouseModeRef.current = 'none'
    panLastScreenRef.current = null
    setCursor(spaceDownRef.current ? 'grab' : tool.cursor)
  }

  function handleTouchStart(e: Konva.KonvaEventObject<TouchEvent>) {
    const stage = e.target.getStage()
    const touches = e.evt.touches

    // Com uma ferramenta de desenho ativa, um dedo desenha (não desloca a prancheta) — dois
    // dedos continuam sendo zoom/pan, então o gesto de navegar nunca é confundido com traçar.
    if (touches.length === 1 && stage && (tool.draws || activeTool === 'place')) {
      const point = pointerWorldCm(stage)
      singleTouchPan.current = null
      if (point) {
        if (activeTool === 'place') {
          if (placeObjectType) addObject(placeObjectType, point.x, point.y)
        } else {
          mouseModeRef.current = 'draft'
          beginDraft(point)
        }
      }
      return
    }

    if (touches.length === 1 && stage && e.target === stage) {
      singleTouchPan.current = { x: touches[0].clientX, y: touches[0].clientY }
    } else {
      singleTouchPan.current = null
    }
    if (touches.length >= 2) {
      nodesById.current.forEach((node) => {
        if (node.isDragging()) node.stopDrag()
      })
    }
  }

  function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches

    if (touches.length === 1 && mouseModeRef.current === 'draft' && draft) {
      const stage = e.target.getStage()
      const point = stage ? pointerWorldCm(stage) : null
      if (point) setDraft({ start: draft.start, end: resolveDraftEnd(draft.start, point) })
      e.evt.preventDefault()
      return
    }

    if (touches.length === 1 && singleTouchPan.current) {
      const dx = touches[0].clientX - singleTouchPan.current.x
      const dy = touches[0].clientY - singleTouchPan.current.y
      setCamera({ x: camera.x + dx, y: camera.y + dy })
      singleTouchPan.current = { x: touches[0].clientX, y: touches[0].clientY }
      return
    }

    if (touches.length !== 2) return
    e.evt.preventDefault()

    nodesById.current.forEach((node) => {
      if (node.isDragging()) node.stopDrag()
    })

    const stage = e.target.getStage()
    if (!stage) return
    const rect = stage.container().getBoundingClientRect()
    const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }
    const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top }
    const distance = getDistance(p1, p2)
    const center = getCenter(p1, p2)

    if (lastPinchDistance.current !== null && lastPinchCenter.current !== null) {
      const oldZoom = camera.zoom
      const scaleChange = distance / lastPinchDistance.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * scaleChange))

      // O ponto do mundo sob o centro dos dois dedos é o ponto de interesse: ele fica ancorado
      // durante o pinch (zoom) e acompanha o deslocamento do centro (pan com dois dedos) — os
      // dois gestos convivem no mesmo movimento, como em qualquer app de mapa/prancheta.
      const worldX = (lastPinchCenter.current.x - camera.x) / oldZoom
      const worldY = (lastPinchCenter.current.y - camera.y) / oldZoom

      setCamera({
        zoom: newZoom,
        x: center.x - worldX * newZoom,
        y: center.y - worldY * newZoom,
      })
    }

    lastPinchDistance.current = distance
    lastPinchCenter.current = center
  }

  function handleTouchEnd(e: Konva.KonvaEventObject<TouchEvent>) {
    if (mouseModeRef.current === 'draft' && e.evt.touches.length === 0) {
      if (draft) commitDraft(draft)
      setDraft(null)
      mouseModeRef.current = 'none'
    }
    if (e.evt.touches.length === 0) singleTouchPan.current = null
    if (e.evt.touches.length < 2) {
      lastPinchDistance.current = null
      lastPinchCenter.current = null
    }
  }

  function handleTap(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (e.target === e.target.getStage()) {
      selectObject(null)
    }
  }

  /** Linha da ferramenta Medir: o rascunho enquanto o gesto acontece, ou a medição fixada. */
  const measureSource = activeTool === 'measure' ? (draft ?? measurement) : measurement
  const measureLine = measureSource
    ? {
        points: [
          cmToPx(measureSource.start.x, scalePxPerMeter),
          cmToPx(measureSource.start.y, scalePxPerMeter),
          cmToPx(measureSource.end.x, scalePxPerMeter),
          cmToPx(measureSource.end.y, scalePxPerMeter),
        ],
        label: formatDistance(distanceCm(measureSource.start, measureSource.end)),
        screenX:
          camera.x + cmToPx((measureSource.start.x + measureSource.end.x) / 2, scalePxPerMeter) * camera.zoom,
        screenY:
          camera.y + cmToPx((measureSource.start.y + measureSource.end.y) / 2, scalePxPerMeter) * camera.zoom,
      }
    : null

  const selectionBadge = (() => {
    if (selectedIds.length !== 1) return null
    const obj = objects.find((o) => o.id === selectedIds[0])
    if (!obj) return null
    const box = getBoundingBox(obj)
    const x = camera.x + cmToPx((box.minX + box.maxX) / 2, scalePxPerMeter) * camera.zoom
    const y = camera.y + cmToPx(box.maxY, scalePxPerMeter) * camera.zoom + 12
    if (x < RULER_SIZE || x > size.width || y < RULER_SIZE || y > size.height - 8) return null
    return {
      x,
      y,
      label: `${(obj.width / 100).toFixed(2).replace(/\.?0+$/, '')} × ${(obj.length / 100).toFixed(2).replace(/\.?0+$/, '')} m`,
    }
  })()

  /** Converte um ponto da tela (evento DOM) em coordenadas de mundo (cm) — usado pelo drop da
   * biblioteca, que chega como evento HTML, fora do Konva. */
  function screenToWorldCm(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const worldXPx = (clientX - rect.left - camera.x) / camera.zoom
    const worldYPx = (clientY - rect.top - camera.y) / camera.zoom
    return { xCm: pxToCm(worldXPx, scalePxPerMeter), yCm: pxToCm(worldYPx, scalePxPerMeter) }
  }

  function handleDomDragOver(e: ReactDragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(LIBRARY_DND_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dropActive) setDropActive(true)
  }

  function handleDomDrop(e: ReactDragEvent<HTMLDivElement>) {
    const objectType = e.dataTransfer.getData(LIBRARY_DND_MIME) as ObjectTypeKey
    setDropActive(false)
    if (!objectType || !(objectType in OBJECT_CATALOG)) return
    e.preventDefault()
    const point = screenToWorldCm(e.clientX, e.clientY)
    if (!point) return
    addObject(objectType, point.xCm, point.yCm)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-canvas overflow-hidden touch-none"
      style={{ cursor }}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={handleDomDragOver}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDropActive(false)
      }}
      onDrop={handleDomDrop}
    >
      {size.width > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          x={camera.x}
          y={camera.y}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setCursorWorldM(null)}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTap={handleTap}
        >
          <Layer listening={false}>
            <Environment widthPx={envWidthPx} heightPx={envHeightPx} zoom={camera.zoom} />
            {gridVisible && (
              <Grid
                pxPerMeter={scalePxPerMeter}
                camera={camera}
                stageWidth={size.width}
                stageHeight={size.height}
                envWidthPx={envWidthPx}
                envHeightPx={envHeightPx}
              />
            )}
          </Layer>
          {flowOverlayVisible && (
            <Layer listening={false}>
              <FlowOverlay
                flowConnections={flowConnections}
                flowNodes={flowNodes}
                objects={objects}
                pxPerMeter={scalePxPerMeter}
              />
            </Layer>
          )}
          <Layer>
            {objects
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((obj) => (
                <ObjectNode
                  key={obj.id}
                  obj={obj}
                  pxPerMeter={scalePxPerMeter}
                  selected={selectedIds.includes(obj.id)}
                  hasOverlap={overlappingIds.has(obj.id)}
                  boundsStatus={boundsStatusById.get(obj.id) ?? 'inside'}
                  hasCriticalViolation={criticalViolationIds.has(obj.id)}
                  hasWarningViolation={warningViolationIds.has(obj.id)}
                  registerRef={(id, node) => {
                    if (node) nodesById.current.set(id, node)
                    else nodesById.current.delete(id)
                  }}
                  onSnapGuideChange={setGuides}
                  draggable={tool.allowsObjectDrag && !spacePanActive}
                  onDraggingChange={(dragging) => {
                    setIsDraggingObject(dragging)
                    onDraggingChange?.(dragging)
                  }}
                />
              ))}
            <SelectionTransformer nodesByIdRef={nodesById} pxPerMeter={scalePxPerMeter} />
            {isDraggingObject && (
              <GuideLines
                guides={guides}
                pxPerMeter={scalePxPerMeter}
                camera={camera}
                stageWidth={size.width}
                stageHeight={size.height}
              />
            )}
            {/* Rascunho da ferramenta ativa: parede como faixa na espessura real, área como
                retângulo, medição como linha com cotas. Tudo em azul de interface e sem
                listening, para nunca interceptar o gesto que o está desenhando. */}
            {draft && activeTool === 'wall' && (
              <Line
                points={[
                  cmToPx(draft.start.x, scalePxPerMeter),
                  cmToPx(draft.start.y, scalePxPerMeter),
                  cmToPx(draft.end.x, scalePxPerMeter),
                  cmToPx(draft.end.y, scalePxPerMeter),
                ]}
                stroke="#0796D7"
                strokeWidth={cmToPx(OBJECT_CATALOG.wall.defaultLength, scalePxPerMeter)}
                opacity={0.45}
                lineCap="butt"
                listening={false}
              />
            )}
            {draft && activeTool === 'area' && (
              <Rect
                x={cmToPx(Math.min(draft.start.x, draft.end.x), scalePxPerMeter)}
                y={cmToPx(Math.min(draft.start.y, draft.end.y), scalePxPerMeter)}
                width={cmToPx(Math.abs(draft.end.x - draft.start.x), scalePxPerMeter)}
                height={cmToPx(Math.abs(draft.end.y - draft.start.y), scalePxPerMeter)}
                fill="#0796D7"
                opacity={0.14}
                stroke="#0796D7"
                strokeWidth={1.5 / camera.zoom}
                dash={[6 / camera.zoom, 4 / camera.zoom]}
                listening={false}
              />
            )}
            {measureLine && (
              <Line
                points={measureLine.points}
                stroke="#0796D7"
                strokeWidth={1.5 / camera.zoom}
                dash={[8 / camera.zoom, 4 / camera.zoom]}
                listening={false}
              />
            )}
            {marqueeRect && (
              <Rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.width}
                height={marqueeRect.height}
                fill="#0796D7"
                opacity={0.1}
                stroke="#0796D7"
                strokeWidth={1 / camera.zoom}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}
      {size.width > 0 && (
        <Rulers
          camera={camera}
          scalePxPerMeter={scalePxPerMeter}
          envWidthM={envWidthM}
          envHeightM={envHeightM}
          containerWidth={size.width}
          containerHeight={size.height}
        />
      )}
      {/* Estado vazio: discreto, no centro da prancheta, e sai de cena suavemente assim que o
          primeiro objeto entra (fica montado só para a transição de opacidade acontecer). */}
      <div
        aria-hidden={objects.length > 0}
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ease-out ${
          objects.length === 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-surface/60 px-8 py-7 text-center backdrop-blur-[1px]">
          <Box size={28} className="text-text-disabled" strokeWidth={1.5} />
          <p className="font-heading text-sm font-semibold text-text-primary">Comece a montar seu layout</p>
          <p className="max-w-[15rem] text-xs leading-relaxed text-text-secondary">
            Arraste equipamentos da barra lateral ou toque para adicionar
          </p>
        </div>
      </div>

      {/* Prancheta como alvo de drop: moldura azul discreta enquanto um item é arrastado. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none rounded-none ring-2 ring-inset transition-opacity duration-150 ${
          dropActive ? 'ring-primary/60 opacity-100' : 'ring-transparent opacity-0'
        }`}
      />

      {/* Dimensões da seleção, ancoradas abaixo do objeto: a resposta de "que tamanho ficou?"
          durante arraste e redimensionamento, sem precisar olhar o painel lateral. */}
      {selectionBadge && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-medium leading-none tabular-nums text-text-secondary shadow-sm"
          style={{ left: selectionBadge.x, top: selectionBadge.y }}
        >
          {selectionBadge.label}
        </div>
      )}

      {measureLine && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary/40 bg-surface/95 px-2 py-1 font-heading text-[11px] font-semibold leading-none tabular-nums text-primary shadow-sm"
          style={{ left: measureLine.screenX, top: measureLine.screenY }}
        >
          {measureLine.label}
        </div>
      )}

      {overlay}

      {showMinimap && size.width > 0 && (
        <div className="absolute bottom-3 right-3 hidden md:block animate-fade-in">
          <Minimap viewportWidth={size.width} viewportHeight={size.height} />
        </div>
      )}

      {cursorWorldM && (
        <div className="hidden md:block absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/95 border border-border rounded-md shadow-sm px-3 py-1.5 text-xs text-text-secondary font-medium pointer-events-none tabular-nums">
          X: {cursorWorldM.x.toFixed(2)} m &nbsp;·&nbsp; Y: {cursorWorldM.y.toFixed(2)} m
        </div>
      )}
      {envWidthPx > 0 && envHeightPx > 0 && (
        <div
          aria-hidden
          style={{ position: 'fixed', top: -99999, left: -99999, pointerEvents: 'none' }}
        >
          <Stage ref={exportStageRef} width={exportBoundsPx.width} height={exportBoundsPx.height}>
            <Layer listening={false}>
              {/* Opaque paper backdrop: the PNG always contains a blank prancheta, never transparency. */}
              <Rect
                x={0}
                y={0}
                width={exportBoundsPx.width}
                height={exportBoundsPx.height}
                fill={EXPORT_BG}
              />
            </Layer>
            <Layer listening={false} x={exportBoundsPx.offsetX} y={exportBoundsPx.offsetY}>
              <Environment widthPx={envWidthPx} heightPx={envHeightPx} zoom={1} />
              {gridVisible && (
                <Grid
                  pxPerMeter={scalePxPerMeter}
                  camera={{ x: 0, y: 0, zoom: 1 }}
                  stageWidth={envWidthPx}
                  stageHeight={envHeightPx}
                  envWidthPx={envWidthPx}
                  envHeightPx={envHeightPx}
                />
              )}
            </Layer>
            <Layer listening={false} x={exportBoundsPx.offsetX} y={exportBoundsPx.offsetY}>
              {objects
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((obj) => (
                  <ObjectRenderStatic key={obj.id} obj={obj} pxPerMeter={scalePxPerMeter} />
                ))}
            </Layer>
          </Stage>
        </div>
      )}
    </div>
  )
}
