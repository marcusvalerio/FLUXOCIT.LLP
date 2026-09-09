import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  Download,
  Grid3x3,
  Layers,
  Loader2,
  Magnet,
  Maximize,
  Minus,
  MoreVertical,
  MousePointerClick,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  TriangleAlert,
  Undo2,
  Warehouse,
  Workflow,
} from 'lucide-react'
import { EditorCanvas, type EditorCanvasHandle } from './canvas/EditorCanvas'
import { CanvasControls } from './canvas/CanvasControls'
import { EnvironmentPanel } from './environment-panel/EnvironmentPanel'
import { MetricsPanel } from './metrics-panel/MetricsPanel'
import { LibraryPanel } from './library-panel/LibraryPanel'
import { PropertiesPanel } from './properties-panel/PropertiesPanel'
import { PropertiesEmptyState } from './properties-panel/PropertiesEmptyState'
import { SelectionToolbar } from './properties-panel/SelectionToolbar'
import { FlowCanvas, type FlowCanvasHandle } from './flow/FlowCanvas'
import { FlowLibraryPanel } from './flow/FlowLibraryPanel'
import { FlowPropertiesPanel } from './flow/FlowPropertiesPanel'
import { useEditorStore } from './state/useEditorStore'
import { layoutRepository } from '../../shared/data/repository'
import { findStorageOverlaps, getBoundsStatus } from '../../shared/lib/spatialRules'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import { SegmentedControl } from '../../shared/ui/SegmentedControl'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import type { ObjectTypeKey } from '../../types/layout'
import type { FlowNodeType } from '../../types/flow'

type Board = 'layout' | 'flow'
type SidePanelTab = 'properties' | 'environment' | 'metrics'

const BOARD_OPTIONS: { value: Board; label: string }[] = [
  { value: 'layout', label: 'Layout' },
  { value: 'flow', label: 'Fluxo' },
]

const SIDE_PANEL_OPTIONS: { value: SidePanelTab; label: string }[] = [
  { value: 'properties', label: 'Propriedades' },
  { value: 'environment', label: 'Ambiente' },
  { value: 'metrics', label: 'Métricas' },
]

/** Rótulo e cor do indicador de salvamento no cabeçalho — estado, não decoração. */
const SAVE_LABEL: Record<'idle' | 'saving' | 'saved' | 'error', string> = {
  idle: 'Rascunho local',
  saving: 'Salvando…',
  saved: 'Salvo agora',
  error: 'Não foi possível salvar',
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  return (
    <span
      className={`hidden max-w-full min-w-0 items-center gap-1.5 overflow-hidden text-[11px] leading-none transition-colors duration-150 sm:inline-flex ${
        status === 'error' ? 'text-danger' : 'text-text-secondary'
      }`}
      aria-live="polite"
    >
      {status === 'saving' && <Loader2 size={12} className="animate-spin" />}
      {status === 'saved' && <Check size={12} className="text-success" />}
      {status === 'error' && <TriangleAlert size={12} />}
      {status === 'idle' && <span className="h-1.5 w-1.5 rounded-full bg-text-disabled" />}
      <span className="truncate">{SAVE_LABEL[status]}</span>
    </span>
  )
}

/** Título de bloco dos painéis laterais — mesma tipografia em biblioteca e propriedades. */
function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
      <h2 className="font-heading text-[13px] font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  )
}

export function EditorPage() {
  const { layoutId } = useParams<{ layoutId: string }>()
  const navigate = useNavigate()
  const canvasHandleRef = useRef<EditorCanvasHandle | null>(null)
  const flowCanvasHandleRef = useRef<FlowCanvasHandle | null>(null)
  const [board, setBoard] = useState<Board>('layout')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [environmentOpen, setEnvironmentOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('properties')
  const [menuOpen, setMenuOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  // Mobile properties sheet: starts collapsed on every new selection (so it never sits on top
  // of a just-inserted/selected object, which appears at the viewport center) and is forced
  // collapsed for the duration of any drag — it only re-expands when the user explicitly taps
  // it. See docs/UX.md § 2.2 and the Fase 1 mobile touch-interception fix.
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(true)
  const [canvasDragging, setCanvasDragging] = useState(false)
  const [flowPropertiesCollapsed, setFlowPropertiesCollapsed] = useState(true)

  const layoutName = useEditorStore((s) => s.layoutName)
  const objects = useEditorStore((s) => s.objects)
  // Live drag updates (moveObjectLive/moveManyLive) change `objects` every frame without touching
  // history — using history length as the autosave trigger instead means we only persist committed
  // changes, not every in-progress drag frame (BR-41: autosave on relevant changes, not live tracking).
  const historyVersion = useEditorStore((s) => s.history.past.length)
  const canUndo = useEditorStore((s) => s.history.past.length > 0)
  const canRedo = useEditorStore((s) => s.history.future.length > 0)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectObject = useEditorStore((s) => s.selectObject)
  const loadLayout = useEditorStore((s) => s.loadLayout)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const deleteSelected = useEditorStore((s) => s.deleteSelected)
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected)
  const rotateSelected = useEditorStore((s) => s.rotateSelected)
  const multiSelectMode = useEditorStore((s) => s.multiSelectMode)
  const setMultiSelectMode = useEditorStore((s) => s.setMultiSelectMode)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const gridVisible = useEditorStore((s) => s.gridVisible)
  const toggleGrid = useEditorStore((s) => s.toggleGrid)
  const flowOverlayVisible = useEditorStore((s) => s.flowOverlayVisible)
  const toggleFlowOverlay = useEditorStore((s) => s.toggleFlowOverlay)
  const saveStatus = useEditorStore((s) => s.saveStatus)
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus)
  const layoutId2 = useEditorStore((s) => s.layoutId)

  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)

  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const selectedFlowNodeId = useEditorStore((s) => s.selectedFlowNodeId)
  const selectedFlowConnectionId = useEditorStore((s) => s.selectedFlowConnectionId)
  const selectFlowNode = useEditorStore((s) => s.selectFlowNode)
  const selectFlowConnection = useEditorStore((s) => s.selectFlowConnection)
  const deleteFlowNode = useEditorStore((s) => s.deleteFlowNode)
  const deleteFlowConnection = useEditorStore((s) => s.deleteFlowConnection)
  const duplicateFlowNode = useEditorStore((s) => s.duplicateFlowNode)
  const hasFlowSelection = Boolean(selectedFlowNodeId || selectedFlowConnectionId)

  const registerFlowHandle = useCallback((handle: FlowCanvasHandle) => {
    flowCanvasHandleRef.current = handle
  }, [])

  function handleFlowInsert(type: FlowNodeType) {
    flowCanvasHandleRef.current?.insertNodeAtCenter(type)
    setLibraryOpen(false)
  }

  const selectedObject = selectedIds.length === 1 ? objects.find((o) => o.id === selectedIds[0]) : undefined
  const hasMultiSelection = selectedIds.length > 1
  const overlappingIds = useMemo(() => findStorageOverlaps(objects), [objects])
  const selectedBoundsStatus = selectedObject
    ? getBoundsStatus(selectedObject, envWidthM * 100, envHeightM * 100)
    : undefined

  const registerHandle = useCallback((handle: EditorCanvasHandle) => {
    canvasHandleRef.current = handle
  }, [])

  // Reset the mobile properties sheet to collapsed on every new selection.
  const selectedIdsKey = selectedIds.join(',')
  useEffect(() => {
    setPropertiesCollapsed(true)
  }, [selectedIdsKey])

  // Selecionar algo na prancheta traz o painel lateral de volta para Propriedades — sem isso a
  // seleção parecia "não fazer nada" quando o usuário estava vendo Métricas.
  useEffect(() => {
    if (selectedIds.length > 0) setSidePanelTab('properties')
  }, [selectedIdsKey, selectedIds.length])

  // A drag starting while the sheet happens to be expanded (the user opened it, then decided
  // to drag the object) latches it collapsed — so it doesn't pop back open the instant the
  // drag ends. It only comes back via an explicit tap (onToggleCollapsed).
  useEffect(() => {
    if (canvasDragging) setPropertiesCollapsed(true)
  }, [canvasDragging])

  // Same collapse-on-new-selection behavior for the Fluxo mobile sheet — a newly inserted node
  // also lands at the viewport center, so it must not be immediately covered either.
  const flowSelectionKey = `${selectedFlowNodeId ?? ''}:${selectedFlowConnectionId ?? ''}`
  useEffect(() => {
    setFlowPropertiesCollapsed(true)
  }, [flowSelectionKey])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!layoutId) return
      const layout = await layoutRepository.getLayout(layoutId)
      if (!cancelled && layout) {
        loadLayout(layout)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [layoutId, loadLayout])

  // Retry hook for both autosave effects below (Fase 9 § Estados de rede: "nunca apagar
  // silenciosamente trabalho não sincronizado... tentar sincronizar novamente quando apropriado").
  // A failed save never touches editor state — `objects`/`flowNodes` stay exactly as the user left
  // them in memory — so a retry only needs to re-run the same save, not recover any data.
  const [saveRetryTick, setSaveRetryTick] = useState(0)

  useEffect(() => {
    function handleOnline() {
      setSaveRetryTick((t) => t + 1)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  useEffect(() => {
    if (saveStatus !== 'error') return
    const timer = setTimeout(() => setSaveRetryTick((t) => t + 1), 5000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  // Autosave (debounced) on every committed change (undo history entry) after the initial load —
  // not on every live-drag frame, which changes `objects` without touching history.
  useEffect(() => {
    if (loading || !layoutId2) return
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        await layoutRepository.saveLayoutObjects(layoutId2, useEditorStore.getState().objects)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyVersion, layoutId2, loading, saveRetryTick])

  // Fluxo autosave (debounced) — no undo history to key off (see useEditorStore.ts), so this
  // debounces directly on the node/connection arrays; moveFlowNodeLive resets the timer on every
  // drag frame, so a save only actually fires once the user pauses (in practice, on drag end).
  useEffect(() => {
    if (loading || !layoutId2) return
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const state = useEditorStore.getState()
        await layoutRepository.saveFlowBoard(layoutId2, state.flowNodes, state.flowConnections)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes, flowConnections, layoutId2, loading, saveRetryTick])

  /** Salvamento explícito: o autosave já cobre o trabalho, mas o botão dá a confirmação que o
   * usuário procura antes de fechar o projeto — e um retry imediato quando algo falhou. */
  async function handleManualSave() {
    if (!layoutId2) return
    setSaveStatus('saving')
    try {
      const state = useEditorStore.getState()
      await layoutRepository.saveLayoutObjects(layoutId2, state.objects)
      await layoutRepository.saveFlowBoard(layoutId2, state.flowNodes, state.flowConnections)
      setSaveStatus('saved')
      setJustSaved(true)
      window.setTimeout(() => setJustSaved(false), 1600)
    } catch {
      setSaveStatus('error')
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleManualSave()
        return
      }

      if (board === 'flow') {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFlowNodeId) {
          e.preventDefault()
          deleteFlowNode(selectedFlowNodeId)
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFlowConnectionId) {
          e.preventDefault()
          deleteFlowConnection(selectedFlowConnectionId)
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedFlowNodeId) {
          e.preventDefault()
          duplicateFlowNode(selectedFlowNodeId)
        } else if (e.key === 'Escape') {
          selectFlowNode(null)
          selectFlowConnection(null)
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelected()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedIds.length > 0) {
        e.preventDefault()
        duplicateSelected()
      } else if (e.key === 'Escape') {
        selectObject(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    board,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectObject,
    selectedIds,
    selectedFlowNodeId,
    selectedFlowConnectionId,
    deleteFlowNode,
    deleteFlowConnection,
    duplicateFlowNode,
    selectFlowNode,
    selectFlowConnection,
    layoutId2,
  ])

  // Menu de ações secundárias: fecha ao clicar fora ou com Escape.
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-editor-menu]')) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function handleInsert(objectType: ObjectTypeKey) {
    canvasHandleRef.current?.insertAtCenter(objectType)
    setLibraryOpen(false)
  }

  const menuItemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary transition-colors duration-150 hover:bg-surface-alt'

  return (
    <div className="flex h-dvh w-full flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3">
        {/* Identidade + projeto */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5">
          <span className="hidden shrink-0 select-none font-display text-[15px] font-semibold tracking-tight text-text-primary lg:inline">
            FluxoCit<span className="text-primary">.LLP</span>
          </span>
          <span aria-hidden="true" className="hidden h-5 w-px bg-border lg:block" />
          <IconButton label="Voltar aos projetos" size="sm" tooltip tooltipSide="bottom" onClick={() => navigate('/projects')}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-sm font-semibold leading-tight text-text-primary">
              {layoutName || 'Projeto'}
            </h1>
            <SaveIndicator status={saveStatus} />
          </div>
        </div>

        {/* Prancheta ativa */}
        <SegmentedControl
          ariaLabel="Prancheta"
          options={BOARD_OPTIONS}
          value={board}
          onChange={(next) => setBoard(next)}
          className="shrink-0"
        />

        {/* Ações */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5">
          {board === 'layout' && (
            <div className="hidden items-center gap-0.5 sm:flex">
              <IconButton label="Desfazer" size="sm" tooltip tooltipSide="bottom" disabled={!canUndo} onClick={undo}>
                <Undo2 size={18} />
              </IconButton>
              <IconButton label="Refazer" size="sm" tooltip tooltipSide="bottom" disabled={!canRedo} onClick={redo}>
                <Redo2 size={18} />
              </IconButton>
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            </div>
          )}
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={handleManualSave} className="shrink-0">
            {justSaved ? <Check size={16} className="animate-pop-in" /> : <Save size={16} />}
            <span className="hidden sm:inline">{justSaved ? 'Salvo' : 'Salvar'}</span>
          </Button>

          <div className="relative shrink-0" data-editor-menu>
            <IconButton
              label="Mais ações"
              size="sm"
              active={menuOpen}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical size={18} />
            </IconButton>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-1.5 w-60 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-lg animate-panel-in"
              >
                <button
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => {
                    setMenuOpen(false)
                    if (board === 'layout') canvasHandleRef.current?.fitToView()
                    else flowCanvasHandleRef.current?.fitToView()
                  }}
                >
                  <Maximize size={16} className="text-text-secondary" />
                  Ajustar à tela
                </button>
                {board === 'layout' && (
                  <>
                    <button
                      role="menuitem"
                      className={menuItemClass}
                      onClick={() => {
                        setMenuOpen(false)
                        canvasHandleRef.current?.exportPng()
                      }}
                    >
                      <Download size={16} className="text-text-secondary" />
                      Exportar como imagem (PNG)
                    </button>
                    <div aria-hidden="true" className="my-1.5 h-px bg-border" />
                    <button
                      role="menuitem"
                      className={`${menuItemClass} md:hidden`}
                      onClick={() => {
                        setMenuOpen(false)
                        setEnvironmentOpen(true)
                      }}
                    >
                      <Warehouse size={16} className="text-text-secondary" />
                      Ambiente
                    </button>
                    <button
                      role="menuitem"
                      className={`${menuItemClass} md:hidden`}
                      onClick={() => {
                        setMenuOpen(false)
                        setMetricsOpen(true)
                      }}
                    >
                      <BarChart3 size={16} className="text-text-secondary" />
                      Métricas do projeto
                    </button>
                    <div aria-hidden="true" className="my-1.5 h-px bg-border md:hidden" />
                    <button
                      role="menuitem"
                      aria-pressed={gridVisible}
                      className={menuItemClass}
                      onClick={toggleGrid}
                    >
                      <Grid3x3 size={16} className={gridVisible ? 'text-primary' : 'text-text-secondary'} />
                      Grade
                      <span className="ml-auto text-[11px] text-text-disabled">{gridVisible ? 'Ativa' : 'Oculta'}</span>
                    </button>
                    <button
                      role="menuitem"
                      aria-pressed={snapEnabled}
                      className={menuItemClass}
                      onClick={() => setSnapEnabled(!snapEnabled)}
                    >
                      <Magnet size={16} className={snapEnabled ? 'text-primary' : 'text-text-secondary'} />
                      Snap
                      <span className="ml-auto text-[11px] text-text-disabled">{snapEnabled ? 'Ativo' : 'Inativo'}</span>
                    </button>
                    <button
                      role="menuitem"
                      aria-pressed={flowOverlayVisible}
                      className={menuItemClass}
                      onClick={toggleFlowOverlay}
                    >
                      <Workflow size={16} className={flowOverlayVisible ? 'text-primary' : 'text-text-secondary'} />
                      Fluxo sobre o layout
                      <span className="ml-auto text-[11px] text-text-disabled">
                        {flowOverlayVisible ? 'Visível' : 'Oculto'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Biblioteca — barra lateral no desktop, gaveta no tablet/mobile */}
        <aside className="hidden w-[264px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <PanelHeader title={board === 'layout' ? 'Biblioteca' : 'Etapas de processo'}>
            <Layers size={15} className="text-text-disabled" />
          </PanelHeader>
          <div className="flex min-h-0 flex-1 flex-col p-2.5">
            {board === 'layout' ? (
              <LibraryPanel onInsert={handleInsert} />
            ) : (
              <FlowLibraryPanel onInsert={handleFlowInsert} />
            )}
          </div>
        </aside>

        {/* Prancheta */}
        <main className="relative min-h-0 min-w-0 flex-1">
          {/* A troca de prancheta é uma mudança de contexto: um fade curto explica que a área
              inteira mudou, sem animar o conteúdo do canvas (que é Konva e caro de animar). */}
          <div key={board} className="absolute inset-0 animate-fade-in">
          {board === 'layout' ? (
            <EditorCanvas
              registerHandle={registerHandle}
              onDraggingChange={setCanvasDragging}
              showMinimap
              overlay={
                <CanvasControls
                  onZoomIn={() => canvasHandleRef.current?.zoomIn()}
                  onZoomOut={() => canvasHandleRef.current?.zoomOut()}
                  onFitToView={() => canvasHandleRef.current?.fitToView()}
                  onCenterOnSelection={() => canvasHandleRef.current?.centerOnSelection()}
                  onExportPng={() => canvasHandleRef.current?.exportPng()}
                />
              }
            />
          ) : (
            <FlowCanvas registerHandle={registerFlowHandle} />
          )}
          </div>

          {board === 'flow' && (
            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-0.5 rounded-xl border border-border bg-surface/95 p-1 shadow-sm backdrop-blur-sm">
                <IconButton
                  label="Aumentar zoom"
                  size="sm"
                  tooltip
                  tooltipSide="right"
                  onClick={() => flowCanvasHandleRef.current?.zoomIn()}
                >
                  <Plus size={18} />
                </IconButton>
                <IconButton
                  label="Diminuir zoom"
                  size="sm"
                  tooltip
                  tooltipSide="right"
                  onClick={() => flowCanvasHandleRef.current?.zoomOut()}
                >
                  <Minus size={18} />
                </IconButton>
                <span aria-hidden="true" className="mx-1.5 my-0.5 h-px bg-border" />
                <IconButton
                  label="Ajustar à tela"
                  size="sm"
                  tooltip
                  tooltipSide="right"
                  onClick={() => flowCanvasHandleRef.current?.fitToView()}
                >
                  <Maximize size={18} />
                </IconButton>
              </div>
            </div>
          )}

          {multiSelectMode && board === 'layout' && (
            <div className="absolute left-1/2 top-14 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary py-1 pl-3 pr-1 text-sm font-medium text-white shadow-sm animate-drop-in md:hidden">
              <MousePointerClick size={16} />
              {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
              <button
                onClick={() => setMultiSelectMode(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors duration-150 hover:bg-white/30"
                aria-label="Concluir seleção"
              >
                <Check size={16} />
              </button>
            </div>
          )}

          {/* Abrir a biblioteca no tablet, onde a barra lateral não cabe */}
          <div className="absolute left-3 bottom-3 hidden md:block lg:hidden">
            <Button variant="secondary" size="sm" onClick={() => setLibraryOpen(true)} className="shadow-sm">
              <Plus size={16} />
              Biblioteca
            </Button>
          </div>
        </main>

        {/* Propriedades / contexto */}
        <aside className="hidden w-[288px] shrink-0 flex-col border-l border-border bg-surface md:flex xl:w-[312px]">
          {board === 'layout' ? (
            <>
              <div className="flex h-12 shrink-0 items-center border-b border-border px-2">
                <SegmentedControl
                  ariaLabel="Painel lateral"
                  size="sm"
                  options={SIDE_PANEL_OPTIONS}
                  value={sidePanelTab}
                  onChange={setSidePanelTab}
                  className="w-full [&>button]:flex-1"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-slim">
                {sidePanelTab === 'properties' && (
                  <>
                    {selectedObject && (
                      <div className="animate-fade-in">
                        <PropertiesPanel
                          object={selectedObject}
                          hasOverlap={overlappingIds.has(selectedObject.id)}
                          boundsStatus={selectedBoundsStatus}
                        />
                      </div>
                    )}
                    {hasMultiSelection && (
                      <div className="animate-fade-in">
                        <SelectionToolbar />
                      </div>
                    )}
                    {!selectedObject && !hasMultiSelection && <PropertiesEmptyState />}
                  </>
                )}
                {sidePanelTab === 'environment' && (
                  <div className="animate-fade-in">
                    <EnvironmentPanel />
                  </div>
                )}
                {sidePanelTab === 'metrics' && (
                  <div className="animate-fade-in">
                    <MetricsPanel />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <PanelHeader title="Propriedades" />
              <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-slim">
                {hasFlowSelection ? (
                  <div className="animate-fade-in">
                    <FlowPropertiesPanel />
                  </div>
                ) : (
                  <PropertiesEmptyState />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Barra de ações — mobile */}
      {board === 'layout' && (
        <footer className="flex shrink-0 items-center justify-around gap-1 border-t border-border bg-surface px-2 py-2 md:hidden">
          <IconButton
            label="Inserir objeto"
            onClick={() => {
              selectObject(null)
              setLibraryOpen(true)
            }}
          >
            <Plus size={22} />
          </IconButton>
          <IconButton label="Desfazer" disabled={!canUndo} onClick={undo}>
            <Undo2 size={22} />
          </IconButton>
          <IconButton label="Refazer" disabled={!canRedo} onClick={redo}>
            <Redo2 size={22} />
          </IconButton>
          {selectedIds.length > 0 && (
            <>
              <IconButton label="Girar -90°" onClick={() => rotateSelected(-90)}>
                <RotateCcw size={22} />
              </IconButton>
              <IconButton label="Girar +90°" onClick={() => rotateSelected(90)}>
                <RotateCw size={22} />
              </IconButton>
              <IconButton label="Duplicar" onClick={duplicateSelected}>
                <Copy size={22} />
              </IconButton>
              <IconButton label="Excluir" onClick={deleteSelected}>
                <Trash2 size={22} className="text-danger" />
              </IconButton>
            </>
          )}
        </footer>
      )}

      {board === 'flow' && (
        <footer className="flex shrink-0 items-center justify-around gap-1 border-t border-border bg-surface px-2 py-2 md:hidden">
          <IconButton
            label="Inserir etapa"
            onClick={() => {
              selectFlowNode(null)
              selectFlowConnection(null)
              setLibraryOpen(true)
            }}
          >
            <Plus size={22} />
          </IconButton>
          {selectedFlowNodeId && (
            <>
              <IconButton label="Duplicar" onClick={() => duplicateFlowNode(selectedFlowNodeId)}>
                <Copy size={22} />
              </IconButton>
              <IconButton label="Excluir" onClick={() => deleteFlowNode(selectedFlowNodeId)}>
                <Trash2 size={22} className="text-danger" />
              </IconButton>
            </>
          )}
          {selectedFlowConnectionId && !selectedFlowNodeId && (
            <IconButton label="Excluir conexão" onClick={() => deleteFlowConnection(selectedFlowConnectionId)}>
              <Trash2 size={22} className="text-danger" />
            </IconButton>
          )}
        </footer>
      )}

      {/* Gaveta da biblioteca — mobile e tablet */}
      {board === 'layout' && libraryOpen && (
        <>
          <BottomSheet title="Biblioteca de objetos" onClose={() => setLibraryOpen(false)}>
            <LibraryPanel onInsert={handleInsert} variant="grid" />
          </BottomSheet>
          <div className="fixed inset-0 z-30 hidden md:block lg:hidden">
            <button
              aria-label="Fechar biblioteca"
              onClick={() => setLibraryOpen(false)}
              className="absolute inset-0 bg-black/25 animate-fade-in"
            />
            <div className="absolute inset-y-0 left-0 flex w-[320px] flex-col border-r border-border bg-surface shadow-lg animate-slide-in-left">
              <PanelHeader title="Biblioteca">
                <button
                  onClick={() => setLibraryOpen(false)}
                  aria-label="Fechar biblioteca"
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
                >
                  ✕
                </button>
              </PanelHeader>
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <LibraryPanel onInsert={handleInsert} />
              </div>
            </div>
          </div>
        </>
      )}

      {board === 'flow' && libraryOpen && (
        <>
          <BottomSheet title="Biblioteca de etapas" onClose={() => setLibraryOpen(false)}>
            <FlowLibraryPanel onInsert={handleFlowInsert} />
          </BottomSheet>
          <div className="fixed inset-0 z-30 hidden md:block lg:hidden">
            <button
              aria-label="Fechar biblioteca"
              onClick={() => setLibraryOpen(false)}
              className="absolute inset-0 bg-black/25 animate-fade-in"
            />
            <div className="absolute inset-y-0 left-0 flex w-[320px] flex-col border-r border-border bg-surface shadow-lg animate-slide-in-left">
              <PanelHeader title="Etapas de processo" />
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 scrollbar-slim">
                <FlowLibraryPanel onInsert={handleFlowInsert} />
              </div>
            </div>
          </div>
        </>
      )}

      {board === 'layout' && selectedObject && (
        <div className="md:hidden">
          <BottomSheet
            title={selectedObject.name || 'Propriedades'}
            onClose={() => selectObject(null)}
            modal={false}
            collapsed={propertiesCollapsed || canvasDragging}
            onToggleCollapsed={() => setPropertiesCollapsed((v) => !v)}
          >
            <PropertiesPanel object={selectedObject} hasOverlap={overlappingIds.has(selectedObject.id)} boundsStatus={selectedBoundsStatus} />
          </BottomSheet>
        </div>
      )}

      {board === 'layout' && hasMultiSelection && (
        <div className="md:hidden">
          <BottomSheet title="Seleção múltipla" onClose={() => selectObject(null)} modal={false}>
            <SelectionToolbar />
          </BottomSheet>
        </div>
      )}

      {board === 'layout' && environmentOpen && (
        <div className="md:hidden">
          <BottomSheet title="Ambiente" onClose={() => setEnvironmentOpen(false)}>
            <EnvironmentPanel />
          </BottomSheet>
        </div>
      )}

      {board === 'layout' && metricsOpen && (
        <div className="md:hidden">
          <BottomSheet title="Métricas" onClose={() => setMetricsOpen(false)}>
            <MetricsPanel />
          </BottomSheet>
        </div>
      )}

      {board === 'flow' && hasFlowSelection && (
        <div className="md:hidden">
          <BottomSheet
            title="Propriedades"
            onClose={() => {
              selectFlowNode(null)
              selectFlowConnection(null)
            }}
            modal={false}
            collapsed={flowPropertiesCollapsed}
            onToggleCollapsed={() => setFlowPropertiesCollapsed((v) => !v)}
          >
            <FlowPropertiesPanel />
          </BottomSheet>
        </div>
      )}
    </div>
  )
}
