import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Grid3x3,
  Magnet,
  Minus,
  MousePointerClick,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Maximize,
  Warehouse,
  Workflow,
  BarChart3,
} from 'lucide-react'
import { EditorCanvas, type EditorCanvasHandle } from './canvas/EditorCanvas'
import { EnvironmentPanel } from './environment-panel/EnvironmentPanel'
import { MetricsPanel } from './metrics-panel/MetricsPanel'
import { LibraryPanel } from './library-panel/LibraryPanel'
import { PropertiesPanel } from './properties-panel/PropertiesPanel'
import { SelectionToolbar } from './properties-panel/SelectionToolbar'
import { FlowCanvas, type FlowCanvasHandle } from './flow/FlowCanvas'
import { FlowLibraryPanel } from './flow/FlowLibraryPanel'
import { FlowPropertiesPanel } from './flow/FlowPropertiesPanel'
import { useEditorStore } from './state/useEditorStore'
import { layoutRepository } from '../../shared/data/repository'
import { findStorageOverlaps, getBoundsStatus } from '../../shared/lib/spatialRules'
import { IconButton } from '../../shared/ui/IconButton'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import type { ObjectTypeKey } from '../../types/layout'
import type { FlowNodeType } from '../../types/flow'

type Board = 'layout' | 'flow'

export function EditorPage() {
  const { layoutId } = useParams<{ layoutId: string }>()
  const navigate = useNavigate()
  const canvasHandleRef = useRef<EditorCanvasHandle | null>(null)
  const flowCanvasHandleRef = useRef<FlowCanvasHandle | null>(null)
  const [board, setBoard] = useState<Board>('layout')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [environmentOpen, setEnvironmentOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return

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
  ])

  function handleInsert(objectType: ObjectTypeKey) {
    canvasHandleRef.current?.insertAtCenter(objectType)
    setLibraryOpen(false)
  }

  const saveStatusLabel: Record<typeof saveStatus, string> = {
    idle: '',
    saving: 'Salvando…',
    saved: 'Salvo',
    error: 'Erro ao salvar',
  }

  return (
    <div className="h-dvh w-full flex flex-col bg-bg">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface shrink-0">
        <IconButton label="Voltar" onClick={() => navigate('/projects')}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className="font-display text-sm md:text-base font-semibold text-text-primary truncate hidden sm:block sm:max-w-[30%]">
          {layoutName || 'Layout'}
        </h1>
        <div className="flex items-center gap-0.5 bg-surface-alt rounded-md p-0.5 mx-auto sm:mx-0">
          <button
            onClick={() => setBoard('layout')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              board === 'layout' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Layout
          </button>
          <button
            onClick={() => setBoard('flow')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              board === 'flow' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            Fluxo
          </button>
        </div>
        <span
          className={`text-xs shrink-0 transition-colors duration-200 hidden sm:inline ${saveStatus === 'error' ? 'text-danger' : 'text-text-secondary'}`}
        >
          {saveStatusLabel[saveStatus]}
        </span>
        <ThemeToggle />
      </header>

      {board === 'layout' && (
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden md:block w-64 border-r border-border bg-surface overflow-y-auto p-3">
          <LibraryPanel onInsert={handleInsert} />
        </aside>

        <main className="flex-1 relative min-w-0 min-h-0">
          <EditorCanvas registerHandle={registerHandle} onDraggingChange={setCanvasDragging} />

          <div className="absolute top-3 left-3 flex flex-col gap-1 bg-surface border border-border rounded-lg shadow-sm p-1">
            <IconButton label="Aumentar zoom" onClick={() => canvasHandleRef.current?.zoomIn()}>
              <Plus size={18} />
            </IconButton>
            <IconButton label="Diminuir zoom" onClick={() => canvasHandleRef.current?.zoomOut()}>
              <Minus size={18} />
            </IconButton>
            <IconButton label="Ajustar à tela" onClick={() => canvasHandleRef.current?.fitToView()}>
              <Maximize size={18} />
            </IconButton>
          </div>

          <div className="absolute top-3 left-16 flex gap-1 bg-surface border border-border rounded-lg shadow-sm p-1">
            <IconButton label="Desfazer" onClick={undo}>
              <Undo2 size={18} />
            </IconButton>
            <IconButton label="Refazer" onClick={redo}>
              <Redo2 size={18} />
            </IconButton>
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1 bg-surface border border-border rounded-lg shadow-sm p-1">
            <IconButton label="Alternar grade" active={gridVisible} onClick={toggleGrid}>
              <Grid3x3 size={18} />
            </IconButton>
            <IconButton label="Alternar snap" active={snapEnabled} onClick={() => setSnapEnabled(!snapEnabled)}>
              <Magnet size={18} />
            </IconButton>
            <IconButton label="Mostrar fluxo sobre o layout" active={flowOverlayVisible} onClick={toggleFlowOverlay}>
              <Workflow size={18} />
            </IconButton>
            <IconButton
              label="Configurar ambiente"
              active={environmentOpen}
              onClick={() => {
                selectObject(null)
                setMetricsOpen(false)
                setEnvironmentOpen((v) => !v)
              }}
            >
              <Warehouse size={18} />
            </IconButton>
            <IconButton
              label="Métricas do projeto"
              active={metricsOpen}
              onClick={() => {
                selectObject(null)
                setEnvironmentOpen(false)
                setMetricsOpen((v) => !v)
              }}
            >
              <BarChart3 size={18} />
            </IconButton>
            <IconButton label="Exportar como imagem (PNG)" onClick={() => canvasHandleRef.current?.exportPng()}>
              <Download size={18} />
            </IconButton>
          </div>

          {environmentOpen && (
            <aside className="hidden md:block absolute bottom-3 right-3 w-72 bg-surface border border-border rounded-lg shadow-sm p-4 animate-panel-in">
              <EnvironmentPanel />
            </aside>
          )}

          {metricsOpen && (
            <aside className="hidden md:block absolute bottom-3 right-3 w-72 max-h-[calc(100%-1.5rem)] overflow-y-auto bg-surface border border-border rounded-lg shadow-sm p-4 animate-panel-in">
              <MetricsPanel />
            </aside>
          )}

          {selectedObject && (
            <aside className="hidden md:block absolute top-3 right-16 w-72 bg-surface border border-border rounded-lg shadow-sm p-4 animate-panel-in">
              <PropertiesPanel object={selectedObject} hasOverlap={overlappingIds.has(selectedObject.id)} boundsStatus={selectedBoundsStatus} />
            </aside>
          )}

          {hasMultiSelection && (
            <aside className="hidden md:block absolute top-3 right-16 w-72 bg-surface border border-border rounded-lg shadow-sm p-4 animate-panel-in">
              <SelectionToolbar />
            </aside>
          )}

          {multiSelectMode && (
            <div className="md:hidden absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary text-white rounded-full pl-3 pr-1 py-1 shadow-sm text-sm font-medium">
              <MousePointerClick size={16} />
              {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
              <button
                onClick={() => setMultiSelectMode(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                aria-label="Concluir seleção"
              >
                <Check size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
      )}

      {board === 'flow' && (
      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden md:block w-64 border-r border-border bg-surface overflow-y-auto p-3">
          <FlowLibraryPanel onInsert={handleFlowInsert} />
        </aside>

        <main className="flex-1 relative min-w-0 min-h-0">
          <FlowCanvas registerHandle={registerFlowHandle} />

          <div className="absolute top-3 left-3 flex flex-col gap-1 bg-surface border border-border rounded-lg shadow-sm p-1">
            <IconButton label="Aumentar zoom" onClick={() => flowCanvasHandleRef.current?.zoomIn()}>
              <Plus size={18} />
            </IconButton>
            <IconButton label="Diminuir zoom" onClick={() => flowCanvasHandleRef.current?.zoomOut()}>
              <Minus size={18} />
            </IconButton>
            <IconButton label="Ajustar à tela" onClick={() => flowCanvasHandleRef.current?.fitToView()}>
              <Maximize size={18} />
            </IconButton>
          </div>

          {(selectedFlowNodeId || selectedFlowConnectionId) && (
            <aside className="hidden md:block absolute top-3 right-3 w-72 bg-surface border border-border rounded-lg shadow-sm p-4 animate-panel-in">
              <FlowPropertiesPanel />
            </aside>
          )}
        </main>
      </div>
      )}

      {board === 'layout' && (
      <footer className="flex items-center justify-around gap-1 px-2 py-2 border-t border-border bg-surface shrink-0 md:hidden">
        <IconButton
          label="Inserir objeto"
          onClick={() => {
            selectObject(null)
            setLibraryOpen(true)
          }}
        >
          <Plus size={22} />
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
      <footer className="flex items-center justify-around gap-1 px-2 py-2 border-t border-border bg-surface shrink-0 md:hidden">
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

      {board === 'layout' && libraryOpen && (
        <BottomSheet title="Biblioteca de objetos" onClose={() => setLibraryOpen(false)}>
          <LibraryPanel onInsert={handleInsert} />
        </BottomSheet>
      )}

      {board === 'flow' && libraryOpen && (
        <BottomSheet title="Biblioteca de etapas" onClose={() => setLibraryOpen(false)}>
          <FlowLibraryPanel onInsert={handleFlowInsert} />
        </BottomSheet>
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
