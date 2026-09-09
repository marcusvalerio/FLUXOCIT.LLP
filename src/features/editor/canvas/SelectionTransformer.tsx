import { useEffect, useRef, type RefObject } from 'react'
import { Transformer } from 'react-konva'
import type Konva from 'konva'
import { OBJECT_CATALOG } from '../objects/catalog'
import { useEditorStore } from '../state/useEditorStore'
import { cmToPx, normalizeDeg, pxToCm } from '../../../shared/lib/units'
import type { LayoutObject } from '../../../types/layout'

const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15)
const MIN_SIZE_CM = 20

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

interface SelectionTransformerProps {
  /** Ref to the id->Konva.Group map (read inside effects, never during render). */
  nodesByIdRef: RefObject<Map<string, Konva.Group>>
  pxPerMeter: number
}

/** Resize + rotate handles for a single selected object. Multi-selection uses the align/distribute toolbar instead. */
export function SelectionTransformer({ nodesByIdRef, pxPerMeter }: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const objects = useEditorStore((s) => s.objects)
  const commitObject = useEditorStore((s) => s.commitObject)

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedObj = selectedId ? objects.find((o) => o.id === selectedId) : undefined

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const node = selectedId ? nodesByIdRef.current.get(selectedId) : undefined
    if (node) {
      transformer.nodes([node])
    } else {
      transformer.nodes([])
    }
    transformer.getLayer()?.batchDraw()
  })

  function handleTransformEnd(e: Konva.KonvaEventObject<Event>) {
    if (!selectedObj) return
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)

    // Konva's rotate-anchor math can leave scale at e.g. 0.999999998 instead of exactly 1 —
    // treat anything within this epsilon as "no resize" so a plain rotation never drifts dimensions.
    const resized = Math.abs(scaleX - 1) > 1e-6 || Math.abs(scaleY - 1) > 1e-6
    const newWidthCm = resized
      ? Math.max(MIN_SIZE_CM, pxToCm(cmToPx(selectedObj.width, pxPerMeter) * scaleX, pxPerMeter))
      : selectedObj.width
    const newLengthCm = resized
      ? Math.max(MIN_SIZE_CM, pxToCm(cmToPx(selectedObj.length, pxPerMeter) * scaleY, pxPerMeter))
      : selectedObj.length
    const newRotation = round(normalizeDeg(node.rotation()), 1)
    const newCenterXCm = pxToCm(node.x(), pxPerMeter)
    const newCenterYCm = pxToCm(node.y(), pxPerMeter)

    const patch: Partial<LayoutObject> = {
      rotationDeg: newRotation,
      x: round(newCenterXCm - newWidthCm / 2, 1),
      y: round(newCenterYCm - newLengthCm / 2, 1),
    }
    if (resized) {
      patch.width = round(newWidthCm, 1)
      patch.length = round(newLengthCm, 1)
    }
    commitObject(selectedObj.id, patch)
  }

  const resizable = selectedObj ? OBJECT_CATALOG[selectedObj.objectType].resizable : false
  const minPx = cmToPx(MIN_SIZE_CM, pxPerMeter)

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      resizeEnabled={resizable}
      enabledAnchors={resizable ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right'] : []}
      rotationSnaps={ROTATION_SNAPS}
      rotationSnapTolerance={6}
      /* Alças generosas o bastante para o toque (44px de área efetiva com a folga do Konva) e
       * discretas o bastante para não esconder o desenho: contorno azul de 1.5px, alça branca
       * com anel azul. */
      anchorSize={14}
      anchorCornerRadius={7}
      anchorStroke="#0796D7"
      anchorStrokeWidth={2}
      anchorFill="#FFFFFF"
      borderStroke="#0796D7"
      borderStrokeWidth={1.5}
      keepRatio={false}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < minPx || newBox.height < minPx) return oldBox
        return newBox
      }}
      onTransformEnd={handleTransformEnd}
    />
  )
}
