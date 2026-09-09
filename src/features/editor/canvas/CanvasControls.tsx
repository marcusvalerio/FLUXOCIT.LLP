import {
  Crosshair,
  Download,
  Grid3x3,
  Hand,
  Magnet,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  Workflow,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEditorStore } from '../state/useEditorStore'
import { IconButton } from '../../../shared/ui/IconButton'

interface CanvasControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToView: () => void
  /** Centraliza a câmera na seleção atual (ou no ambiente, quando nada está selecionado). */
  onCenterOnSelection: () => void
  onExportPng: () => void
}

function Cluster({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto flex gap-0.5 rounded-xl border border-border bg-surface/95 p-1 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 my-1.5 w-px shrink-0 bg-border" />
}

/**
 * Controles flutuantes da prancheta: zoom no canto superior esquerdo, ferramentas na barra
 * inferior central e leitura de escala no canto inferior esquerdo. Todos ficam sobre o canvas
 * sem capturar eventos fora dos próprios botões (`pointer-events` só nos clusters), para não
 * roubar área útil de seleção/pan.
 */
export function CanvasControls({
  onZoomIn,
  onZoomOut,
  onFitToView,
  onCenterOnSelection,
  onExportPng,
}: CanvasControlsProps) {
  const zoom = useEditorStore((s) => s.camera.zoom)
  const canvasTool = useEditorStore((s) => s.canvasTool)
  const setCanvasTool = useEditorStore((s) => s.setCanvasTool)
  const gridVisible = useEditorStore((s) => s.gridVisible)
  const toggleGrid = useEditorStore((s) => s.toggleGrid)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const flowOverlayVisible = useEditorStore((s) => s.flowOverlayVisible)
  const toggleFlowOverlay = useEditorStore((s) => s.toggleFlowOverlay)
  const scalePxPerMeter = useEditorStore((s) => s.scalePxPerMeter)

  // Barra de escala: quantos px de tela valem 1 m no zoom atual (o número que o usuário usa para
  // "medir no olho" antes de conferir na régua).
  const meterInScreenPx = scalePxPerMeter * zoom

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-3 top-9 flex flex-col gap-2 md:top-8">
        <Cluster className="flex-col">
          <IconButton label="Aumentar zoom" size="sm" tooltip tooltipSide="right" onClick={onZoomIn}>
            <Plus size={18} />
          </IconButton>
          <IconButton label="Diminuir zoom" size="sm" tooltip tooltipSide="right" onClick={onZoomOut}>
            <Minus size={18} />
          </IconButton>
          <span aria-hidden="true" className="mx-1.5 my-0.5 h-px bg-border" />
          <IconButton label="Ajustar à tela" size="sm" tooltip tooltipSide="right" onClick={onFitToView}>
            <Maximize size={18} />
          </IconButton>
          <IconButton
            label="Centralizar na seleção"
            size="sm"
            tooltip
            tooltipSide="right"
            onClick={onCenterOnSelection}
          >
            <Crosshair size={18} />
          </IconButton>
        </Cluster>
      </div>

      {/* Barra de ferramentas — escondida no mobile, onde a barra inferior fixa cumpre o papel. */}
      <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 md:block">
        <Cluster>
          <IconButton
            label="Selecionar"
            size="sm"
            tooltip
            active={canvasTool === 'select'}
            onClick={() => setCanvasTool('select')}
          >
            <MousePointer2 size={18} />
          </IconButton>
          <IconButton
            label="Mover prancheta (ou botão direito / espaço)"
            size="sm"
            tooltip
            active={canvasTool === 'pan'}
            onClick={() => setCanvasTool('pan')}
          >
            <Hand size={18} />
          </IconButton>
          <Divider />
          <IconButton label="Alternar grade" size="sm" tooltip active={gridVisible} onClick={toggleGrid}>
            <Grid3x3 size={18} />
          </IconButton>
          <IconButton
            label="Alternar snap"
            size="sm"
            tooltip
            active={snapEnabled}
            onClick={() => setSnapEnabled(!snapEnabled)}
          >
            <Magnet size={18} />
          </IconButton>
          <IconButton
            label="Mostrar fluxo sobre o layout"
            size="sm"
            tooltip
            active={flowOverlayVisible}
            onClick={toggleFlowOverlay}
          >
            <Workflow size={18} />
          </IconButton>
          <Divider />
          <IconButton label="Exportar como imagem (PNG)" size="sm" tooltip onClick={onExportPng}>
            <Download size={18} />
          </IconButton>
        </Cluster>
      </div>

      {/* Escala e zoom atuais */}
      <div className="absolute bottom-3 left-3 hidden md:block">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="font-heading text-xs font-medium tabular-nums text-text-primary">
            {Math.round(zoom * 100)}%
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="flex items-center gap-1.5" aria-label="Escala da prancheta">
            <span
              className="h-2 border-x border-b border-text-disabled"
              style={{ width: Math.max(16, Math.min(96, meterInScreenPx)) }}
            />
            <span className="text-[11px] leading-none text-text-secondary">1 m</span>
          </span>
        </div>
      </div>
    </div>
  )
}
