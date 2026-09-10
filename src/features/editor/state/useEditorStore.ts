import { create } from 'zustand'
import { createId } from '../../../shared/lib/id'
import { normalizeDeg } from '../../../shared/lib/units'
import { getBoundingBox, snapToGrid } from '../../../shared/lib/geometry'
import type { Layout, LayoutObject, ObjectCategory, ObjectTypeKey } from '../../../types/layout'
import type { FlowConnection, FlowConnectionType, FlowNode, FlowNodeType } from '../../../types/flow'
import { FLOW_NODE_SIZE } from '../../../types/flow'
import { OBJECT_CATALOG } from '../objects/catalog'
import type { EditorToolId } from '../tools/toolRegistry'

export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY'
export type DistributeAxis = 'x' | 'y'

const MAX_HISTORY = 100

/** Áreas funcionam como camadas de fundo (Fase 9 § Áreas) — em vez de sempre empilhar o novo
 * objeto no topo, uma área nova/duplicada recebe o zIndex mais baixo do layout, para nunca
 * cobrir visualmente (nem roubar clique/seleção de) objetos já colocados sobre ela. O usuário
 * ainda pode trazer uma área para frente deliberadamente via as ações de z-order. */
function insertZIndex(objects: LayoutObject[], category: ObjectCategory): number {
  if (category !== 'area') return objects.length
  return objects.length > 0 ? Math.min(...objects.map((o) => o.zIndex)) - 1 : 0
}

/** Fallback environment size (m) for layouts created before this feature, or with invalid dims. */
export const DEFAULT_ENV_WIDTH_M = 20
export const DEFAULT_ENV_HEIGHT_M = 15

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface Camera {
  x: number
  y: number
  zoom: number
}

/** Medição efêmera da ferramenta Medir — vive no editor, nunca no modelo salvo do projeto. */
export interface Measurement {
  start: { x: number; y: number }
  end: { x: number; y: number }
}

interface EditorState {
  layoutId: string | null
  layoutName: string
  scalePxPerMeter: number
  gridStepM: number
  /** Physical dimensions (m) of the space being planned — see docs/BUSINESS_RULES.md § Ambiente. */
  envWidthM: number
  envHeightM: number
  objects: LayoutObject[]
  selectedIds: string[]
  camera: Camera
  /** Ferramenta ativa — ver features/editor/tools/toolRegistry.ts. */
  activeTool: EditorToolId
  /** Tipo armado para a ferramenta "Inserir objeto": o próximo clique na prancheta o posiciona. */
  placeObjectType: ObjectTypeKey | null
  /** Resultado corrente da ferramenta Medir (cm, coordenadas de mundo) — não é persistido. */
  measurement: Measurement | null
  /** True enquanto a barra de espaço estiver pressionada: o arraste vira pan temporário, então
   * os objetos param de ser arrastáveis para o gesto não fazer as duas coisas ao mesmo tempo. */
  spacePanActive: boolean
  snapEnabled: boolean
  gridVisible: boolean
  /** Layout board: shows connections from the Fluxo board whose endpoints are both linked to a
   * Layout object, overlaid on the canvas (P7 — "visualizar o fluxo sobre o Layout"). */
  flowOverlayVisible: boolean
  /** Mobile: entered via long-press on an object; while true, taps toggle selection instead of replacing it. */
  multiSelectMode: boolean
  saveStatus: SaveStatus
  /** Histórico de edição do projeto — Layout e Fluxo juntos, porque desfazer é uma ação do
   * usuário sobre o projeto, não sobre a prancheta em que ele está no momento. */
  history: { past: EditorSnapshot[]; future: EditorSnapshot[] }

  // --- Fluxo board (same project, separate data — see docs/ARCHITECTURE.md § Fluxo) ---
  flowNodes: FlowNode[]
  flowConnections: FlowConnection[]
  selectedFlowNodeId: string | null
  selectedFlowConnectionId: string | null
  /** Set while the user is dragging a connection out of a node's handle; cleared on drop. */
  pendingConnectionFromId: string | null

  loadLayout: (layout: Layout) => void
  setEnvironmentSize: (widthM: number, heightM: number) => void
  addObject: (objectType: ObjectTypeKey, worldXCm: number, worldYCm: number) => void
  /** Cria um objeto com geometria explícita (ferramentas Parede/Área) — mesma entrada de
   * histórico e mesma seleção resultante de qualquer outra criação. Devolve o id criado. */
  createObject: (input: {
    objectType: ObjectTypeKey
    x: number
    y: number
    width?: number
    length?: number
    rotationDeg?: number
    properties?: Record<string, unknown>
  }) => string
  moveObjectLive: (id: string, xCm: number, yCm: number) => void
  commitObject: (id: string, patch: Partial<LayoutObject>) => void
  setProperty: (id: string, key: string, value: unknown) => void
  selectObject: (id: string | null) => void
  toggleSelect: (id: string) => void
  selectMany: (ids: string[], additive: boolean) => void
  deleteObject: (id: string) => void
  duplicateObject: (id: string) => void
  rotateObject: (id: string, deltaDeg: number) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  rotateSelected: (deltaDeg: number) => void
  /** Z-order (Fase 9 § Z-order) — all four act on the current multi-selection, and always
   * renumber zIndex to a clean 0..n-1 sequence across every object (not just the selected ones),
   * so stacking order never drifts after repeated use. */
  bringSelectedToFront: () => void
  sendSelectedToBack: () => void
  bringSelectedForward: () => void
  sendSelectedBackward: () => void
  moveManyLive: (updates: { id: string; x: number; y: number }[]) => void
  commitMany: (updates: { id: string; patch: Partial<LayoutObject> }[]) => void
  commitDragPositions: (
    origin: { id: string; x: number; y: number }[],
    final: { id: string; x: number; y: number }[],
  ) => void
  alignSelected: (mode: AlignMode) => void
  distributeSelected: (axis: DistributeAxis) => void
  undo: () => void
  redo: () => void
  setCamera: (camera: Partial<Camera>) => void
  setActiveTool: (tool: EditorToolId) => void
  /** Arma um tipo de objeto e ativa a ferramenta de inserção; `null` desarma e volta a Selecionar. */
  armPlaceObject: (objectType: ObjectTypeKey | null) => void
  setMeasurement: (measurement: Measurement | null) => void
  setSpacePanActive: (active: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  toggleGrid: () => void
  setSaveStatus: (status: SaveStatus) => void
  setMultiSelectMode: (enabled: boolean) => void
  toggleFlowOverlay: () => void

  addFlowNode: (type: FlowNodeType, x: number, y: number) => void
  moveFlowNodeLive: (id: string, x: number, y: number) => void
  /** Fim do arraste de um nó. `origin` é a posição de antes do gesto, para o undo voltar ao
   * lugar certo (durante o arraste moveFlowNodeLive não registra histórico). */
  commitFlowNodePosition: (
    id: string,
    x: number,
    y: number,
    origin?: { x: number; y: number },
  ) => void
  setFlowNodeProperty: (id: string, key: string, value: unknown) => void
  selectFlowNode: (id: string | null) => void
  deleteFlowNode: (id: string) => void
  duplicateFlowNode: (id: string) => void
  addFlowConnection: (fromId: string, toId: string, flowType: FlowConnectionType) => void
  selectFlowConnection: (id: string | null) => void
  setFlowConnectionProperty: (id: string, key: string, value: unknown) => void
  reverseFlowConnection: (id: string) => void
  deleteFlowConnection: (id: string) => void
  setPendingConnectionFrom: (id: string | null) => void
}

/** Estado editável de um projeto num instante — a unidade do undo/redo. */
export interface EditorSnapshot {
  objects: LayoutObject[]
  flowNodes: FlowNode[]
  flowConnections: FlowConnection[]
}

function cloneObjects(objects: LayoutObject[]): LayoutObject[] {
  return objects.map((o) => ({ ...o, properties: { ...o.properties } }))
}

/** Fotografia do estado atual para o histórico. `objects` pode vir sobrescrito por quem já
 * calculou o estado "de antes" (fim de arraste, por exemplo). */
function snapshot(
  state: { objects: LayoutObject[]; flowNodes: FlowNode[]; flowConnections: FlowConnection[] },
  objectsOverride?: LayoutObject[],
): EditorSnapshot {
  return {
    objects: cloneObjects(objectsOverride ?? state.objects),
    flowNodes: state.flowNodes.map((n) => ({ ...n })),
    flowConnections: state.flowConnections.map((c) => ({ ...c })),
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  layoutId: null,
  layoutName: '',
  scalePxPerMeter: 50,
  gridStepM: 0.1,
  envWidthM: DEFAULT_ENV_WIDTH_M,
  envHeightM: DEFAULT_ENV_HEIGHT_M,
  objects: [],
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select',
  placeObjectType: null,
  measurement: null,
  spacePanActive: false,
  snapEnabled: true,
  gridVisible: true,
  flowOverlayVisible: false,
  multiSelectMode: false,
  saveStatus: 'idle',
  history: { past: [], future: [] },

  flowNodes: [],
  flowConnections: [],
  selectedFlowNodeId: null,
  selectedFlowConnectionId: null,
  pendingConnectionFromId: null,

  loadLayout: (layout) =>
    set({
      layoutId: layout.id,
      layoutName: layout.name,
      scalePxPerMeter: layout.scalePxPerMeter,
      gridStepM: layout.gridStepM,
      envWidthM: layout.widthM && layout.widthM > 0 ? layout.widthM : DEFAULT_ENV_WIDTH_M,
      envHeightM: layout.heightM && layout.heightM > 0 ? layout.heightM : DEFAULT_ENV_HEIGHT_M,
      objects: layout.objects,
      selectedIds: [],
      history: { past: [], future: [] },
      saveStatus: 'idle',
      flowNodes: layout.flowNodes ?? [],
      flowConnections: layout.flowConnections ?? [],
      selectedFlowNodeId: null,
      selectedFlowConnectionId: null,
      pendingConnectionFromId: null,
    }),

  setEnvironmentSize: (widthM, heightM) =>
    set({
      envWidthM: Math.max(1, widthM),
      envHeightM: Math.max(1, heightM),
    }),

  /** Criação canônica: toda inserção de objeto passa por aqui (biblioteca, ferramentas de
   * desenho, drag & drop), então histórico, seleção e z-order têm sempre o mesmo comportamento. */
  createObject: ({ objectType, x, y, width, length, rotationDeg, properties }) => {
    const def = OBJECT_CATALOG[objectType]
    const { objects, history } = get()

    const newObject: LayoutObject = {
      id: createId(),
      objectType,
      category: def.category,
      x,
      y,
      width: width ?? def.defaultWidth,
      length: length ?? def.defaultLength,
      rotationDeg: rotationDeg ?? 0,
      zIndex: insertZIndex(objects, def.category),
      properties: { ...(def.defaultProperties ?? {}), ...(properties ?? {}) },
    }

    set({
      objects: [...objects, newObject],
      selectedIds: [newObject.id],
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
    return newObject.id
  },

  addObject: (objectType, worldXCm, worldYCm) => {
    const def = OBJECT_CATALOG[objectType]
    const { gridStepM, snapEnabled } = get()
    const stepCm = gridStepM * 100
    const rawX = worldXCm - def.defaultWidth / 2
    const rawY = worldYCm - def.defaultLength / 2

    get().createObject({
      objectType,
      x: snapEnabled ? snapToGrid(rawX, stepCm) : rawX,
      y: snapEnabled ? snapToGrid(rawY, stepCm) : rawY,
    })
  },

  /** Updates position during an active drag without touching undo history. */
  moveObjectLive: (id, xCm, yCm) => {
    set({
      objects: get().objects.map((o) => (o.id === id ? { ...o, x: xCm, y: yCm } : o)),
    })
  },

  /** Commits a change (drag end, property edit, etc.) and records undo history. */
  commitObject: (id, patch) => {
    const { objects, history } = get()
    const before = snapshot(get())
    set({
      objects: objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  setProperty: (id, key, value) => {
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    if (key === 'name' || key === 'x' || key === 'y' || key === 'width' || key === 'length' || key === 'rotationDeg') {
      get().commitObject(id, { [key]: value } as Partial<LayoutObject>)
    } else {
      get().commitObject(id, { properties: { ...obj.properties, [key]: value } })
    }
  },

  selectObject: (id) =>
    set({ selectedIds: id ? [id] : [], multiSelectMode: id ? get().multiSelectMode : false }),

  toggleSelect: (id) => {
    const { selectedIds } = get()
    set({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    })
  },

  selectMany: (ids, additive) => {
    if (!additive) {
      set({ selectedIds: ids })
      return
    }
    const existing = get().selectedIds
    const merged = new Set(existing)
    for (const id of ids) merged.add(id)
    set({ selectedIds: Array.from(merged) })
  },

  deleteObject: (id) => {
    const { objects, history, selectedIds } = get()
    set({
      objects: objects.filter((o) => o.id !== id),
      selectedIds: selectedIds.filter((s) => s !== id),
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  duplicateObject: (id) => {
    const { objects, history } = get()
    const original = objects.find((o) => o.id === id)
    if (!original) return
    const copy: LayoutObject = {
      ...original,
      id: createId(),
      x: original.x + 20,
      y: original.y + 20,
      properties: { ...original.properties },
      zIndex: insertZIndex(objects, original.category),
    }
    set({
      objects: [...objects, copy],
      selectedIds: [copy.id],
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  rotateObject: (id, deltaDeg) => {
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    get().commitObject(id, { rotationDeg: normalizeDeg(obj.rotationDeg + deltaDeg) })
  },

  deleteSelected: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    set({
      objects: objects.filter((o) => !ids.has(o.id)),
      selectedIds: [],
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  duplicateSelected: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    let nextFrontZ = objects.length
    let nextBackZ = objects.length > 0 ? Math.min(...objects.map((o) => o.zIndex)) - 1 : -1
    const copies: LayoutObject[] = []
    objects.forEach((o) => {
      if (!ids.has(o.id)) return
      copies.push({
        ...o,
        id: createId(),
        x: o.x + 20,
        y: o.y + 20,
        properties: { ...o.properties },
        zIndex: o.category === 'area' ? nextBackZ-- : nextFrontZ++,
      })
    })
    set({
      objects: [...objects, ...copies],
      selectedIds: copies.map((c) => c.id),
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  rotateSelected: (deltaDeg) => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    set({
      objects: objects.map((o) =>
        ids.has(o.id) ? { ...o, rotationDeg: normalizeDeg(o.rotationDeg + deltaDeg) } : o,
      ),
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  bringSelectedToFront: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    const order = [...objects].sort((a, b) => a.zIndex - b.zIndex)
    const rest = order.filter((o) => !ids.has(o.id))
    const selected = order.filter((o) => ids.has(o.id))
    const reordered = [...rest, ...selected].map((o, i) => ({ ...o, zIndex: i }))
    set({
      objects: reordered,
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  sendSelectedToBack: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    const order = [...objects].sort((a, b) => a.zIndex - b.zIndex)
    const rest = order.filter((o) => !ids.has(o.id))
    const selected = order.filter((o) => ids.has(o.id))
    const reordered = [...selected, ...rest].map((o, i) => ({ ...o, zIndex: i }))
    set({
      objects: reordered,
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  bringSelectedForward: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    const order = [...objects].sort((a, b) => a.zIndex - b.zIndex)
    // Walk from the top down so the frontmost selected object moves first, letting each one
    // "ripple" past its nearest unselected neighbor without fighting the others in this pass.
    for (let i = order.length - 1; i >= 0; i--) {
      const obj = order[i]
      if (!obj || !ids.has(obj.id)) continue
      const next = order[i + 1]
      if (!next || ids.has(next.id)) continue
      order[i] = next
      order[i + 1] = obj
    }
    set({
      objects: order.map((o, i) => ({ ...o, zIndex: i })),
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  sendSelectedBackward: () => {
    const { objects, history, selectedIds } = get()
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    const order = [...objects].sort((a, b) => a.zIndex - b.zIndex)
    for (let i = 0; i < order.length; i++) {
      const obj = order[i]
      if (!obj || !ids.has(obj.id)) continue
      const prev = order[i - 1]
      if (!prev || ids.has(prev.id)) continue
      order[i] = prev
      order[i - 1] = obj
    }
    set({
      objects: order.map((o, i) => ({ ...o, zIndex: i })),
      history: { past: [...history.past, snapshot(get())].slice(-MAX_HISTORY), future: [] },
    })
  },

  /** Updates several objects' positions during an active multi-drag without touching undo history. */
  moveManyLive: (updates) => {
    const byId = new Map(updates.map((u) => [u.id, u]))
    set({
      objects: get().objects.map((o) => {
        const u = byId.get(o.id)
        return u ? { ...o, x: u.x, y: u.y } : o
      }),
    })
  },

  /** Commits several changes (multi-drag end, align, distribute) as a single undo step. */
  commitMany: (updates) => {
    const { objects, history } = get()
    const before = snapshot(get())
    const byId = new Map(updates.map((u) => [u.id, u.patch]))
    set({
      objects: objects.map((o) => {
        const patch = byId.get(o.id)
        return patch ? { ...o, ...patch } : o
      }),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  /**
   * Fim de um arraste: aplica as posições finais e registra como passo de undo as posições de
   * ANTES do gesto. Necessário porque durante o arraste moveObjectLive/moveManyLive já alteraram
   * `objects` sem tocar no histórico — um commitMany aqui gravaria o estado já movido como
   * "anterior", e desfazer logo após mover não devolveria o objeto ao lugar de origem.
   */
  commitDragPositions: (origin, final) => {
    const { objects, history } = get()
    const originById = new Map(origin.map((u) => [u.id, u]))
    const finalById = new Map(final.map((u) => [u.id, u]))
    const before = snapshot(
      get(),
      objects.map((o) => {
        const u = originById.get(o.id)
        return u ? { ...o, x: u.x, y: u.y } : o
      }),
    )
    set({
      objects: objects.map((o) => {
        const u = finalById.get(o.id)
        return u ? { ...o, x: u.x, y: u.y } : o
      }),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  alignSelected: (mode) => {
    const { objects, selectedIds } = get()
    const targets = objects.filter((o) => selectedIds.includes(o.id))
    if (targets.length < 2) return

    const boxes = targets.map((o) => ({ obj: o, box: getBoundingBox(o) }))
    const minX = Math.min(...boxes.map((b) => b.box.minX))
    const maxX = Math.max(...boxes.map((b) => b.box.maxX))
    const minY = Math.min(...boxes.map((b) => b.box.minY))
    const maxY = Math.max(...boxes.map((b) => b.box.maxY))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const updates = boxes.map(({ obj, box }) => {
      let dx = 0
      let dy = 0
      switch (mode) {
        case 'left':
          dx = minX - box.minX
          break
        case 'right':
          dx = maxX - box.maxX
          break
        case 'top':
          dy = minY - box.minY
          break
        case 'bottom':
          dy = maxY - box.maxY
          break
        case 'centerX':
          dx = centerX - (box.minX + box.maxX) / 2
          break
        case 'centerY':
          dy = centerY - (box.minY + box.maxY) / 2
          break
      }
      return { id: obj.id, patch: { x: obj.x + dx, y: obj.y + dy } }
    })

    get().commitMany(updates)
  },

  distributeSelected: (axis) => {
    const { objects, selectedIds } = get()
    const targets = objects.filter((o) => selectedIds.includes(o.id))
    if (targets.length < 3) return

    const withBoxes = targets.map((o) => ({ obj: o, box: getBoundingBox(o) }))
    const sorted = [...withBoxes].sort((a, b) =>
      axis === 'x' ? a.box.minX - b.box.minX : a.box.minY - b.box.minY,
    )

    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span =
      axis === 'x' ? last.box.maxX - first.box.minX : last.box.maxY - first.box.minY
    const totalSize = sorted.reduce(
      (sum, { box }) => sum + (axis === 'x' ? box.maxX - box.minX : box.maxY - box.minY),
      0,
    )
    const gap = (span - totalSize) / (sorted.length - 1)

    let cursor = axis === 'x' ? first.box.minX : first.box.minY
    const updates = sorted.map(({ obj, box }) => {
      const size = axis === 'x' ? box.maxX - box.minX : box.maxY - box.minY
      const targetMin = cursor
      cursor += size + gap
      const dx = axis === 'x' ? targetMin - box.minX : 0
      const dy = axis === 'y' ? targetMin - box.minY : 0
      return { id: obj.id, patch: { x: obj.x + dx, y: obj.y + dy } }
    })

    get().commitMany(updates)
  },

  undo: () => {
    const { history } = get()
    const previous = history.past.at(-1)
    if (!previous) return
    set({
      objects: previous.objects,
      flowNodes: previous.flowNodes,
      flowConnections: previous.flowConnections,
      history: {
        past: history.past.slice(0, -1),
        future: [snapshot(get()), ...history.future].slice(0, MAX_HISTORY),
      },
      selectedIds: [],
      selectedFlowNodeId: null,
      selectedFlowConnectionId: null,
    })
  },

  redo: () => {
    const { history } = get()
    const next = history.future[0]
    if (!next) return
    set({
      objects: next.objects,
      flowNodes: next.flowNodes,
      flowConnections: next.flowConnections,
      history: {
        past: [...history.past, snapshot(get())].slice(-MAX_HISTORY),
        future: history.future.slice(1),
      },
      selectedIds: [],
      selectedFlowNodeId: null,
      selectedFlowConnectionId: null,
    })
  },

  setCamera: (camera) => set({ camera: { ...get().camera, ...camera } }),
  setActiveTool: (tool) => {
    // Trocar de ferramenta limpa o que pertencia à anterior: o tipo armado da inserção e a
    // medição na tela. Sem isso o editor guarda estado invisível de uma ferramenta inativa.
    set({
      activeTool: tool,
      placeObjectType: tool === 'place' ? get().placeObjectType : null,
      measurement: tool === 'measure' ? get().measurement : null,
    })
  },

  armPlaceObject: (objectType) =>
    set({
      placeObjectType: objectType,
      activeTool: objectType ? 'place' : 'select',
    }),

  setMeasurement: (measurement) => set({ measurement }),
  setSpacePanActive: (active) => {
    if (get().spacePanActive !== active) set({ spacePanActive: active })
  },
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  toggleGrid: () => set({ gridVisible: !get().gridVisible }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setMultiSelectMode: (enabled) => set({ multiSelectMode: enabled }),
  toggleFlowOverlay: () => set({ flowOverlayVisible: !get().flowOverlayVisible }),

  // --- Prancheta de Fluxo. Toda mutação confirmada entra no MESMO histórico do Layout: desfazer
  // é uma ação sobre o projeto, e o usuário que acabou de apagar uma etapa por engano espera
  // Ctrl+Z, esteja ele em qual prancheta estiver. Só o arraste ao vivo (moveFlowNodeLive) fica
  // fora, como no Layout — quem registra a entrada de histórico é o commit do fim do gesto. ---

  addFlowNode: (type, x, y) => {
    const { flowNodes, history } = get()
    const before = snapshot(get())
    // Successive inserts land at the same requested point (the view center) — cascade each one
    // a bit further down/right so a quick run of "add step" taps reads as a list, not a stack of
    // perfectly overlapping boxes.
    const cascade = flowNodes.length % 8
    const newNode: FlowNode = {
      id: createId(),
      type,
      x: x - FLOW_NODE_SIZE.width / 2 + cascade * 28,
      y: y - FLOW_NODE_SIZE.height / 2 + cascade * 28,
    }
    set({
      flowNodes: [...flowNodes, newNode],
      selectedFlowNodeId: newNode.id,
      selectedFlowConnectionId: null,
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  moveFlowNodeLive: (id, x, y) => {
    set({ flowNodes: get().flowNodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })
  },

  commitFlowNodePosition: (id, x, y, origin) => {
    const { history } = get()
    // Igual ao Layout: durante o arraste moveFlowNodeLive já moveu o nó sem histórico, então o
    // "antes" precisa ser a posição de origem do gesto — senão desfazer não devolve nada.
    const before = origin
      ? snapshot({
          ...get(),
          flowNodes: get().flowNodes.map((n) => (n.id === id ? { ...n, x: origin.x, y: origin.y } : n)),
        })
      : snapshot(get())
    set({
      flowNodes: get().flowNodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  setFlowNodeProperty: (id, key, value) => {
    const { history } = get()
    const before = snapshot(get())
    set({
      flowNodes: get().flowNodes.map((n) => (n.id === id ? { ...n, [key]: value } : n)),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  selectFlowNode: (id) => set({ selectedFlowNodeId: id, selectedFlowConnectionId: id ? null : get().selectedFlowConnectionId }),

  deleteFlowNode: (id) => {
    const { history } = get()
    const before = snapshot(get())
    set({
      flowNodes: get().flowNodes.filter((n) => n.id !== id),
      flowConnections: get().flowConnections.filter((c) => c.fromNodeId !== id && c.toNodeId !== id),
      selectedFlowNodeId: get().selectedFlowNodeId === id ? null : get().selectedFlowNodeId,
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  duplicateFlowNode: (id) => {
    const original = get().flowNodes.find((n) => n.id === id)
    if (!original) return
    const { history } = get()
    const before = snapshot(get())
    const copy: FlowNode = { ...original, id: createId(), x: original.x + 24, y: original.y + 24 }
    set({
      flowNodes: [...get().flowNodes, copy],
      selectedFlowNodeId: copy.id,
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  addFlowConnection: (fromId, toId, flowType) => {
    if (fromId === toId) return
    const { flowConnections } = get()
    const alreadyExists = flowConnections.some((c) => c.fromNodeId === fromId && c.toNodeId === toId)
    if (alreadyExists) return
    const { history } = get()
    const before = snapshot(get())
    const newConnection: FlowConnection = { id: createId(), fromNodeId: fromId, toNodeId: toId, flowType }
    set({
      flowConnections: [...flowConnections, newConnection],
      selectedFlowConnectionId: newConnection.id,
      selectedFlowNodeId: null,
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  selectFlowConnection: (id) => set({ selectedFlowConnectionId: id, selectedFlowNodeId: id ? null : get().selectedFlowNodeId }),

  setFlowConnectionProperty: (id, key, value) => {
    const { history } = get()
    const before = snapshot(get())
    set({
      flowConnections: get().flowConnections.map((c) => (c.id === id ? { ...c, [key]: value } : c)),
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  reverseFlowConnection: (id) => {
    const { history } = get()
    const before = snapshot(get())
    set({
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
      flowConnections: get().flowConnections.map((c) =>
        c.id === id ? { ...c, fromNodeId: c.toNodeId, toNodeId: c.fromNodeId } : c,
      ),
    })
  },

  deleteFlowConnection: (id) => {
    const { history } = get()
    const before = snapshot(get())
    set({
      flowConnections: get().flowConnections.filter((c) => c.id !== id),
      selectedFlowConnectionId: get().selectedFlowConnectionId === id ? null : get().selectedFlowConnectionId,
      history: { past: [...history.past, before].slice(-MAX_HISTORY), future: [] },
    })
  },

  setPendingConnectionFrom: (id) => set({ pendingConnectionFromId: id }),
}))
