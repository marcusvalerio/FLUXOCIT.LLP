import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './useEditorStore'
import type { Layout } from '../../../types/layout'

function emptyLayout(): Layout {
  return {
    id: 'layout-1',
    organizationId: 'local',
    name: 'Test layout',
    scalePxPerMeter: 50,
    gridStepM: 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects: [],
  }
}

beforeEach(() => {
  useEditorStore.getState().loadLayout(emptyLayout())
})

describe('useEditorStore', () => {
  it('desfazer devolve o objeto à posição anterior ao arraste (commitDragPositions)', () => {
    const store = useEditorStore.getState()
    store.addObject('pallet', 500, 500)
    const obj = useEditorStore.getState().objects[0]!
    const origin = { x: obj.x, y: obj.y }

    // Sequência de um arraste, como em canvas/ObjectNode: movimentos ao vivo (sem histórico)
    // seguidos do commit no dragend.
    useEditorStore.getState().moveObjectLive(obj.id, origin.x + 300, origin.y + 200)
    useEditorStore
      .getState()
      .commitDragPositions(
        [{ id: obj.id, x: origin.x, y: origin.y }],
        [{ id: obj.id, x: origin.x + 300, y: origin.y + 200 }],
      )

    const moved = useEditorStore.getState().objects[0]!
    expect({ x: moved.x, y: moved.y }).toEqual({ x: origin.x + 300, y: origin.y + 200 })

    useEditorStore.getState().undo()
    const undone = useEditorStore.getState().objects[0]!
    expect({ x: undone.x, y: undone.y }).toEqual(origin)

    useEditorStore.getState().redo()
    const redone = useEditorStore.getState().objects[0]!
    expect({ x: redone.x, y: redone.y }).toEqual({ x: origin.x + 300, y: origin.y + 200 })
  })

  it('adds an object snapped to the grid, centered on the insertion point', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const [obj] = useEditorStore.getState().objects
    expect(obj.objectType).toBe('pallet')
    // default pallet is 120x100 cm, centered on (500,500) -> top-left (440, 450)
    expect(obj.x).toBe(440)
    expect(obj.y).toBe(450)
  })

  it('records undo history on commit and supports undo/redo', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const id = useEditorStore.getState().objects[0].id

    useEditorStore.getState().commitObject(id, { x: 999 })
    expect(useEditorStore.getState().objects[0].x).toBe(999)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().objects[0].x).toBe(440)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().objects[0].x).toBe(999)
  })

  it('does not record history for live drag updates', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const id = useEditorStore.getState().objects[0].id
    const historyLengthBefore = useEditorStore.getState().history.past.length

    useEditorStore.getState().moveObjectLive(id, 700, 700)

    expect(useEditorStore.getState().history.past.length).toBe(historyLengthBefore)
    expect(useEditorStore.getState().objects[0].x).toBe(700)
  })

  it('duplicates an object with an offset and selects the copy', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const originalId = useEditorStore.getState().objects[0].id

    useEditorStore.getState().duplicateObject(originalId)

    const { objects, selectedIds } = useEditorStore.getState()
    expect(objects).toHaveLength(2)
    const copy = objects.find((o) => o.id !== originalId)!
    expect(copy.x).toBe(objects[0].x + 20)
    expect(selectedIds).toEqual([copy.id])
  })

  it('rotates an object and normalizes the angle', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const id = useEditorStore.getState().objects[0].id

    useEditorStore.getState().rotateObject(id, -90)
    expect(useEditorStore.getState().objects[0].rotationDeg).toBe(270)
  })

  it('deletes an object and clears its selection', () => {
    useEditorStore.getState().addObject('pallet', 500, 500)
    const id = useEditorStore.getState().objects[0].id

    useEditorStore.getState().deleteObject(id)

    expect(useEditorStore.getState().objects).toHaveLength(0)
    expect(useEditorStore.getState().selectedIds).toEqual([])
  })

  describe('multi-selection', () => {
    it('toggles membership in the selection', () => {
      useEditorStore.getState().addObject('pallet', 500, 500)
      const id = useEditorStore.getState().objects[0].id
      useEditorStore.getState().selectObject(null) // addObject auto-selects; start from empty

      useEditorStore.getState().toggleSelect(id)
      expect(useEditorStore.getState().selectedIds).toEqual([id])

      useEditorStore.getState().toggleSelect(id)
      expect(useEditorStore.getState().selectedIds).toEqual([])
    })

    it('selectMany replaces or merges the selection', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 300, 300)
      const [a, b] = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany([a], false)
      expect(useEditorStore.getState().selectedIds).toEqual([a])

      useEditorStore.getState().selectMany([b], true)
      expect(new Set(useEditorStore.getState().selectedIds)).toEqual(new Set([a, b]))
    })

    it('moveManyLive updates positions without history, commitMany records one undo step', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 300, 300)
      const [a, b] = useEditorStore.getState().objects.map((o) => o.id)
      const historyBefore = useEditorStore.getState().history.past.length

      useEditorStore.getState().moveManyLive([
        { id: a, x: 1000, y: 1000 },
        { id: b, x: 2000, y: 2000 },
      ])
      expect(useEditorStore.getState().history.past.length).toBe(historyBefore)
      expect(useEditorStore.getState().objects.map((o) => o.x)).toEqual([1000, 2000])

      useEditorStore.getState().commitMany([
        { id: a, patch: { x: 1500 } },
        { id: b, patch: { x: 2500 } },
      ])
      expect(useEditorStore.getState().history.past.length).toBe(historyBefore + 1)
      expect(useEditorStore.getState().objects.map((o) => o.x)).toEqual([1500, 2500])

      useEditorStore.getState().undo()
      expect(useEditorStore.getState().objects.map((o) => o.x)).toEqual([1000, 2000])
    })

    it('deleteSelected removes every selected object as one undo step', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 300, 300)
      useEditorStore.getState().addObject('pallet', 500, 500)
      const [a, b] = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany([a, b], false)
      useEditorStore.getState().deleteSelected()

      expect(useEditorStore.getState().objects).toHaveLength(1)
      expect(useEditorStore.getState().selectedIds).toEqual([])

      useEditorStore.getState().undo()
      expect(useEditorStore.getState().objects).toHaveLength(3)
    })

    it('duplicateSelected copies every selected object with an offset', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 300, 300)
      const ids = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany(ids, false)
      useEditorStore.getState().duplicateSelected()

      expect(useEditorStore.getState().objects).toHaveLength(4)
      expect(useEditorStore.getState().selectedIds).toHaveLength(2)
    })
  })

  describe('z-order (Fase 9)', () => {
    function addThree() {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 200, 200)
      useEditorStore.getState().addObject('pallet', 300, 300)
      const [a, b, c] = useEditorStore.getState().objects
      return { a, b, c }
    }

    function orderedIds() {
      return [...useEditorStore.getState().objects].sort((x, y) => x.zIndex - y.zIndex).map((o) => o.id)
    }

    it('bringSelectedToFront moves the selected object above all others', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectObject(a.id)
      useEditorStore.getState().bringSelectedToFront()
      expect(orderedIds()).toEqual([b.id, c.id, a.id])
    })

    it('sendSelectedToBack moves the selected object below all others', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectObject(c.id)
      useEditorStore.getState().sendSelectedToBack()
      expect(orderedIds()).toEqual([c.id, a.id, b.id])
    })

    it('bringSelectedForward swaps with the next-higher unselected neighbor', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectObject(a.id)
      useEditorStore.getState().bringSelectedForward()
      expect(orderedIds()).toEqual([b.id, a.id, c.id])
    })

    it('bringSelectedForward is a no-op when already at the front', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectObject(c.id)
      useEditorStore.getState().bringSelectedForward()
      expect(orderedIds()).toEqual([a.id, b.id, c.id])
    })

    it('sendSelectedBackward swaps with the next-lower unselected neighbor', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectObject(c.id)
      useEditorStore.getState().sendSelectedBackward()
      expect(orderedIds()).toEqual([a.id, c.id, b.id])
    })

    it('preserves relative order among multiple selected objects when brought to front', () => {
      const { a, b, c } = addThree()
      useEditorStore.getState().selectMany([a.id, b.id], false)
      useEditorStore.getState().bringSelectedToFront()
      expect(orderedIds()).toEqual([c.id, a.id, b.id])
    })

    it('does nothing when nothing is selected', () => {
      addThree()
      const before = orderedIds()
      useEditorStore.getState().bringSelectedToFront()
      expect(orderedIds()).toEqual(before)
    })

    it('supports undo after a z-order change', () => {
      const { a, b, c } = addThree()
      const before = orderedIds()
      useEditorStore.getState().selectObject(a.id)
      useEditorStore.getState().bringSelectedToFront()
      expect(orderedIds()).toEqual([b.id, c.id, a.id])
      useEditorStore.getState().undo()
      expect(orderedIds()).toEqual(before)
    })
  })

  describe('áreas como camada de fundo (Fase 9)', () => {
    function orderedIds() {
      return [...useEditorStore.getState().objects].sort((x, y) => x.zIndex - y.zIndex).map((o) => o.id)
    }

    it('uma área inserida depois de outros objetos ainda fica atrás deles', () => {
      useEditorStore.getState().addObject('rack', 100, 100)
      const rack = useEditorStore.getState().objects[0]
      useEditorStore.getState().addObject('area', 500, 500)
      const area = useEditorStore.getState().objects[1]

      expect(area.zIndex).toBeLessThan(rack.zIndex)
      expect(orderedIds()).toEqual([area.id, rack.id])
    })

    it('um objeto comum inserido depois de uma área continua na frente dela', () => {
      useEditorStore.getState().addObject('area', 500, 500)
      const area = useEditorStore.getState().objects[0]
      useEditorStore.getState().addObject('rack', 100, 100)
      const rack = useEditorStore.getState().objects[1]

      expect(rack.zIndex).toBeGreaterThan(area.zIndex)
      expect(orderedIds()).toEqual([area.id, rack.id])
    })

    it('duplicar uma área mantém a cópia atrás dos objetos comuns', () => {
      useEditorStore.getState().addObject('rack', 100, 100)
      const rack = useEditorStore.getState().objects[0]
      useEditorStore.getState().addObject('area', 500, 500)
      const area = useEditorStore.getState().objects[1]

      useEditorStore.getState().duplicateObject(area.id)
      const copy = useEditorStore.getState().objects.find((o) => o.id !== area.id && o.id !== rack.id)!

      expect(copy.zIndex).toBeLessThan(rack.zIndex)
      expect(orderedIds()[orderedIds().length - 1]).toBe(rack.id)
    })

    it('duplicateSelected também mantém áreas atrás ao duplicar objetos mistos', () => {
      useEditorStore.getState().addObject('rack', 100, 100)
      const rack = useEditorStore.getState().objects[0]
      useEditorStore.getState().addObject('area', 500, 500)
      const area = useEditorStore.getState().objects[1]

      useEditorStore.getState().selectMany([rack.id, area.id], false)
      useEditorStore.getState().duplicateSelected()

      const all = useEditorStore.getState().objects
      const areaCopy = all.find((o) => o.category === 'area' && o.id !== area.id)!
      const rackCopy = all.find((o) => o.category !== 'area' && o.id !== rack.id)!
      expect(areaCopy.zIndex).toBeLessThan(rack.zIndex)
      expect(areaCopy.zIndex).toBeLessThan(rackCopy.zIndex)
    })
  })

  describe('align and distribute', () => {
    it('aligns selected objects to the left edge of the group bounding box', () => {
      useEditorStore.getState().addObject('pallet', 100, 100) // -> x=40
      useEditorStore.getState().addObject('pallet', 500, 100) // -> x=440
      const ids = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany(ids, false)
      useEditorStore.getState().alignSelected('left')

      const xs = useEditorStore.getState().objects.map((o) => o.x)
      expect(xs[0]).toBe(xs[1])
      expect(xs[0]).toBe(40)
    })

    it('aligns selected objects to their combined horizontal center', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 700, 100)
      const ids = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany(ids, false)
      useEditorStore.getState().alignSelected('centerX')

      const centers = useEditorStore.getState().objects.map((o) => o.x + o.width / 2)
      expect(centers[0]).toBeCloseTo(centers[1], 5)
    })

    it('does not align a single-object selection', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      const id = useEditorStore.getState().objects[0].id
      const xBefore = useEditorStore.getState().objects[0].x

      useEditorStore.getState().selectMany([id], false)
      useEditorStore.getState().alignSelected('left')

      expect(useEditorStore.getState().objects[0].x).toBe(xBefore)
    })

    it('distributes 3+ objects with equal spacing between bounding boxes', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 400, 100)
      useEditorStore.getState().addObject('pallet', 1200, 100)
      const ids = useEditorStore.getState().objects.map((o) => o.id)

      useEditorStore.getState().selectMany(ids, false)
      useEditorStore.getState().distributeSelected('x')

      const sorted = [...useEditorStore.getState().objects].sort((a, b) => a.x - b.x)
      const gap1 = sorted[1].x - (sorted[0].x + sorted[0].width)
      const gap2 = sorted[2].x - (sorted[1].x + sorted[1].width)
      expect(gap1).toBeCloseTo(gap2, 5)
    })

    it('does not distribute fewer than 3 objects', () => {
      useEditorStore.getState().addObject('pallet', 100, 100)
      useEditorStore.getState().addObject('pallet', 400, 100)
      const ids = useEditorStore.getState().objects.map((o) => o.id)
      const before = useEditorStore.getState().objects.map((o) => o.x)

      useEditorStore.getState().selectMany(ids, false)
      useEditorStore.getState().distributeSelected('x')

      expect(useEditorStore.getState().objects.map((o) => o.x)).toEqual(before)
    })
  })

  describe('Fluxo board', () => {
    it('adds a flow node centered on the insertion point and selects it', () => {
      useEditorStore.getState().addFlowNode('receiving', 500, 500)
      const [node] = useEditorStore.getState().flowNodes
      expect(node.type).toBe('receiving')
      expect(useEditorStore.getState().selectedFlowNodeId).toBe(node.id)
    })

    it('cascades successive insertions so they do not perfectly overlap', () => {
      useEditorStore.getState().addFlowNode('receiving', 500, 500)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [first, second] = useEditorStore.getState().flowNodes
      expect(second.x).not.toBe(first.x)
      expect(second.y).not.toBe(first.y)
    })

    it('creates a connection between two nodes with a flow type', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      const [conn] = useEditorStore.getState().flowConnections
      expect(conn.fromNodeId).toBe(from.id)
      expect(conn.toNodeId).toBe(to.id)
      expect(conn.flowType).toBe('material')
    })

    it('does not create a self-connection or a duplicate connection', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      const [node] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(node.id, node.id, 'material')
      expect(useEditorStore.getState().flowConnections).toHaveLength(0)

      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'pallet')
      expect(useEditorStore.getState().flowConnections).toHaveLength(1)
    })

    it('deleting a node cascades to remove connections referencing it', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      expect(useEditorStore.getState().flowConnections).toHaveLength(1)

      useEditorStore.getState().deleteFlowNode(from.id)
      expect(useEditorStore.getState().flowNodes).toHaveLength(1)
      expect(useEditorStore.getState().flowConnections).toHaveLength(0)
    })

    it('duplicates a node with an offset position and selects the copy', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      const [original] = useEditorStore.getState().flowNodes
      useEditorStore.getState().duplicateFlowNode(original.id)
      const nodes = useEditorStore.getState().flowNodes
      expect(nodes).toHaveLength(2)
      const copy = nodes[1]
      expect(copy.id).not.toBe(original.id)
      expect(copy.x).toBe(original.x + 24)
      expect(useEditorStore.getState().selectedFlowNodeId).toBe(copy.id)
    })

    it('setFlowNodeProperty updates name/notes/linkedObjectId without touching other nodes', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [n1] = useEditorStore.getState().flowNodes
      useEditorStore.getState().setFlowNodeProperty(n1.id, 'name', 'REC-01')
      useEditorStore.getState().setFlowNodeProperty(n1.id, 'linkedObjectId', 'layout-obj-1')

      const [updated1, updated2] = useEditorStore.getState().flowNodes
      expect(updated1.name).toBe('REC-01')
      expect(updated1.linkedObjectId).toBe('layout-obj-1')
      expect(updated2.name).toBeUndefined()
    })

    it('loadLayout restores flowNodes/flowConnections from the saved layout, defaulting to empty', () => {
      useEditorStore.getState().loadLayout({
        ...emptyLayout(),
        flowNodes: [{ id: 'n1', type: 'receiving', x: 0, y: 0 }],
        flowConnections: [],
      })
      expect(useEditorStore.getState().flowNodes).toHaveLength(1)

      useEditorStore.getState().loadLayout(emptyLayout())
      expect(useEditorStore.getState().flowNodes).toEqual([])
      expect(useEditorStore.getState().flowConnections).toEqual([])
    })

    it('selecting a node clears connection selection and vice versa', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      const [conn] = useEditorStore.getState().flowConnections

      useEditorStore.getState().selectFlowConnection(conn.id)
      expect(useEditorStore.getState().selectedFlowNodeId).toBeNull()

      useEditorStore.getState().selectFlowNode(from.id)
      expect(useEditorStore.getState().selectedFlowConnectionId).toBeNull()
    })

    it('reverses a connection direction (swaps from/to)', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      const [conn] = useEditorStore.getState().flowConnections

      useEditorStore.getState().reverseFlowConnection(conn.id)
      const [reversed] = useEditorStore.getState().flowConnections
      expect(reversed.fromNodeId).toBe(to.id)
      expect(reversed.toNodeId).toBe(from.id)
    })

    it('deleting a connection only removes that connection', () => {
      useEditorStore.getState().addFlowNode('receiving', 100, 100)
      useEditorStore.getState().addFlowNode('storage', 500, 500)
      const [from, to] = useEditorStore.getState().flowNodes
      useEditorStore.getState().addFlowConnection(from.id, to.id, 'material')
      const [conn] = useEditorStore.getState().flowConnections

      useEditorStore.getState().deleteFlowConnection(conn.id)
      expect(useEditorStore.getState().flowConnections).toHaveLength(0)
      expect(useEditorStore.getState().flowNodes).toHaveLength(2)
    })
  })
})
