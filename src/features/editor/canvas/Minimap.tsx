import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { CATEGORY_COLORS } from '../../../shared/lib/colors'
import { getBoundingBox } from '../../../shared/lib/geometry'
import { cmToPx } from '../../../shared/lib/units'
import { useEditorStore } from '../state/useEditorStore'

interface MinimapProps {
  /** Tamanho da área visível da prancheta, em px de tela — define o retângulo da viewport. */
  viewportWidth: number
  viewportHeight: number
}

const MINIMAP_WIDTH = 148
const MINIMAP_MAX_HEIGHT = 112

/**
 * Minimapa do ambiente: mostra a planta inteira, a silhueta de cada objeto e o retângulo da
 * viewport atual. Clicar (ou arrastar) recentraliza a prancheta naquele ponto — é navegação,
 * não edição: nada aqui seleciona ou move objetos.
 */
export function Minimap({ viewportWidth, viewportHeight }: MinimapProps) {
  const objects = useEditorStore((s) => s.objects)
  const camera = useEditorStore((s) => s.camera)
  const setCamera = useEditorStore((s) => s.setCamera)
  const scalePxPerMeter = useEditorStore((s) => s.scalePxPerMeter)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const envWidthPx = cmToPx(envWidthM * 100, scalePxPerMeter)
  const envHeightPx = cmToPx(envHeightM * 100, scalePxPerMeter)
  if (envWidthPx <= 0 || envHeightPx <= 0) return null

  // O minimapa mantém a proporção real do ambiente, limitado em largura e altura.
  const scale = Math.min(MINIMAP_WIDTH / envWidthPx, MINIMAP_MAX_HEIGHT / envHeightPx)
  const width = envWidthPx * scale
  const height = envHeightPx * scale

  // Viewport em coordenadas de mundo (px do canvas) → coordenadas do minimapa.
  const viewLeft = (-camera.x / camera.zoom) * scale
  const viewTop = (-camera.y / camera.zoom) * scale
  const viewWidth = (viewportWidth / camera.zoom) * scale
  const viewHeight = (viewportHeight / camera.zoom) * scale

  function centerCameraOn(clientX: number, clientY: number) {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldPxX = (clientX - rect.left) / scale
    const worldPxY = (clientY - rect.top) / scale
    setCamera({
      x: viewportWidth / 2 - worldPxX * camera.zoom,
      y: viewportHeight / 2 - worldPxY * camera.zoom,
    })
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    centerCameraOn(e.clientX, e.clientY)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    centerCameraOn(e.clientX, e.clientY)
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="rounded-xl border border-border bg-surface/95 p-1.5 shadow-sm backdrop-blur-sm">
      <div
        ref={surfaceRef}
        role="button"
        tabIndex={-1}
        aria-label="Minimapa: clique para navegar pela prancheta"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative cursor-crosshair overflow-hidden rounded-lg border border-border bg-surface touch-none"
        style={{ width, height }}
      >
        {objects.map((obj) => {
          const box = getBoundingBox(obj)
          const left = cmToPx(box.minX, scalePxPerMeter) * scale
          const top = cmToPx(box.minY, scalePxPerMeter) * scale
          return (
            <div
              key={obj.id}
              className="absolute rounded-[1px]"
              style={{
                left,
                top,
                width: Math.max(2, cmToPx(box.maxX - box.minX, scalePxPerMeter) * scale),
                height: Math.max(2, cmToPx(box.maxY - box.minY, scalePxPerMeter) * scale),
                backgroundColor: CATEGORY_COLORS[obj.category] ?? CATEGORY_COLORS.other,
                opacity: obj.category === 'area' ? 0.35 : 0.8,
              }}
            />
          )
        })}
        {/* Viewport atual. Quando ela cobre o ambiente inteiro (zoom afastado) o retângulo
            coincide com a moldura e some sozinho — nada de bloco azul sobre a planta. */}
        <div
          data-testid="minimap-viewport"
          className="pointer-events-none absolute rounded-[3px] border border-primary bg-primary/5 transition-[left,top,width,height] duration-100 ease-out"
          style={{
            left: Math.max(0, viewLeft),
            top: Math.max(0, viewTop),
            width: Math.min(width, viewWidth + Math.min(0, viewLeft)),
            height: Math.min(height, viewHeight + Math.min(0, viewTop)),
          }}
        />
      </div>
    </div>
  )
}
