import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../state/useEditorStore'
import { FlowNodeShape, MAX_NODE_NAME_LENGTH } from './FlowNodeShape'
import { FlowConnectionShape } from './FlowConnectionShape'
import { FLOW_NODE_SIZE, FLOW_NODE_TYPE_LABELS, type FlowNodeType } from '../../../types/flow'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.5

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

function getCenter(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

export interface FlowCanvasHandle {
  insertNodeAtCenter: (type: FlowNodeType) => void
  zoomIn: () => void
  zoomOut: () => void
  fitToView: () => void
}

interface FlowCanvasProps {
  registerHandle: (handle: FlowCanvasHandle) => void
}

interface FlowCamera {
  x: number
  y: number
  zoom: number
}

export function FlowCanvas({ registerHandle }: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [camera, setCameraState] = useState<FlowCamera>({ x: 40, y: 40, zoom: 1 })
  const [tempConnectionEnd, setTempConnectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [cursor, setCursor] = useState<'default' | 'grab' | 'grabbing'>('default')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const nodesById = useRef<Map<string, Konva.Group>>(new Map())
  const spaceDownRef = useRef(false)
  const panActiveRef = useRef(false)
  const panLastScreenRef = useRef<{ x: number; y: number } | null>(null)
  const singleTouchPan = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistance = useRef<number | null>(null)
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null)

  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const selectedFlowNodeId = useEditorStore((s) => s.selectedFlowNodeId)
  const selectedFlowConnectionId = useEditorStore((s) => s.selectedFlowConnectionId)
  const pendingConnectionFromId = useEditorStore((s) => s.pendingConnectionFromId)
  const selectFlowNode = useEditorStore((s) => s.selectFlowNode)
  const selectFlowConnection = useEditorStore((s) => s.selectFlowConnection)
  const addFlowNode = useEditorStore((s) => s.addFlowNode)
  const moveFlowNodeLive = useEditorStore((s) => s.moveFlowNodeLive)
  const commitFlowNodePosition = useEditorStore((s) => s.commitFlowNodePosition)
  const setPendingConnectionFrom = useEditorStore((s) => s.setPendingConnectionFrom)
  const addFlowConnection = useEditorStore((s) => s.addFlowConnection)
  const setFlowNodeProperty = useEditorStore((s) => s.setFlowNodeProperty)

  const nodesById_lookup = useMemo(() => new Map(flowNodes.map((n) => [n.id, n])), [flowNodes])
  const pendingFromNode = pendingConnectionFromId ? nodesById_lookup.get(pendingConnectionFromId) : undefined
  const editingNode = editingNodeId ? nodesById_lookup.get(editingNodeId) : undefined

  function startEditingNode(id: string) {
    const node = nodesById_lookup.get(id)
    if (!node) return
    setEditingNodeId(id)
    setEditingValue(node.name ?? '')
  }

  function commitEditingNode() {
    if (editingNodeId) setFlowNodeProperty(editingNodeId, 'name', editingValue.trim())
    setEditingNodeId(null)
  }

  function cancelEditingNode() {
    setEditingNodeId(null)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        if (!spaceDownRef.current) setCursor('grab')
        spaceDownRef.current = true
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        setCursor(panActiveRef.current ? 'grabbing' : 'default')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
  }

  useEffect(() => {
    registerHandle({
      insertNodeAtCenter: (type) => {
        const worldX = (size.width / 2 - camera.x) / camera.zoom
        const worldY = (size.height / 2 - camera.y) / camera.zoom
        addFlowNode(type, worldX, worldY)
      },
      zoomIn: () => setCameraState((c) => ({ ...c, zoom: clampZoom(c.zoom * 1.25) })),
      zoomOut: () => setCameraState((c) => ({ ...c, zoom: clampZoom(c.zoom / 1.25) })),
      fitToView: () => {
        if (flowNodes.length === 0) {
          setCameraState({ x: 40, y: 40, zoom: 1 })
          return
        }
        const minX = Math.min(...flowNodes.map((n) => n.x))
        const minY = Math.min(...flowNodes.map((n) => n.y))
        const maxX = Math.max(...flowNodes.map((n) => n.x + FLOW_NODE_SIZE.width))
        const maxY = Math.max(...flowNodes.map((n) => n.y + FLOW_NODE_SIZE.height))
        const padding = 48
        const contentW = maxX - minX
        const contentH = maxY - minY
        const availW = size.width - padding * 2
        const availH = size.height - padding * 2
        if (availW <= 0 || availH <= 0 || contentW <= 0 || contentH <= 0) return
        const zoom = clampZoom(Math.min(availW / contentW, availH / contentH, 1.5))
        setCameraState({
          zoom,
          x: padding + (availW - contentW * zoom) / 2 - minX * zoom,
          y: padding + (availH - contentH * zoom) / 2 - minY * zoom,
        })
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerHandle, size, camera, addFlowNode, flowNodes])

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const oldZoom = camera.zoom
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newZoom = clampZoom(oldZoom * (direction > 0 ? 1.1 : 1 / 1.1))
    const worldX = (pointer.x - camera.x) / oldZoom
    const worldY = (pointer.y - camera.y) / oldZoom
    setCameraState({ zoom: newZoom, x: pointer.x - worldX * newZoom, y: pointer.y - worldY * newZoom })
  }

  function stageToWorld(pointer: { x: number; y: number }) {
    return { x: (pointer.x - camera.x) / camera.zoom, y: (pointer.y - camera.y) / camera.zoom }
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const isEmptyTarget = e.target === stage
    const isMiddleButton = e.evt.button === 1
    const isRightButton = e.evt.button === 2

    // Mesma gramática de navegação da prancheta de Layout (ver canvas/EditorCanvas): botão
    // direito, botão do meio ou espaço + arrastar deslocam a prancheta de qualquer ponto —
    // inclusive sobre um nó, sem arrastá-lo junto.
    if (isMiddleButton || isRightButton || (e.evt.button === 0 && spaceDownRef.current)) {
      panActiveRef.current = true
      panLastScreenRef.current = pointer
      setCursor('grabbing')
      e.evt.preventDefault()
      return
    }
    if (isEmptyTarget) {
      selectFlowNode(null)
      selectFlowConnection(null)
    }
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    if (panActiveRef.current && panLastScreenRef.current) {
      const dx = pointer.x - panLastScreenRef.current.x
      const dy = pointer.y - panLastScreenRef.current.y
      setCameraState((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
      panLastScreenRef.current = pointer
      return
    }
    if (pendingConnectionFromId) {
      setTempConnectionEnd(stageToWorld(pointer))
    }
  }

  function findNodeIdAt(stage: Konva.Stage, pointer: { x: number; y: number }): string | null {
    const shape = stage.getIntersection(pointer)
    if (!shape) return null
    let node: Konva.Node | null = shape
    while (node) {
      const name = node.name()
      if (name?.startsWith('flow-node-')) return name.replace('flow-node-', '')
      node = node.getParent()
    }
    return null
  }

  function finishPendingConnection(stage: Konva.Stage | null) {
    if (!pendingConnectionFromId) return
    if (stage) {
      const pointer = stage.getPointerPosition()
      if (pointer) {
        const targetId = findNodeIdAt(stage, pointer)
        if (targetId && targetId !== pendingConnectionFromId) {
          addFlowConnection(pendingConnectionFromId, targetId, 'material')
        }
      }
    }
    setPendingConnectionFrom(null)
    setTempConnectionEnd(null)
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    panActiveRef.current = false
    panLastScreenRef.current = null
    setCursor(spaceDownRef.current ? 'grab' : 'default')
    finishPendingConnection(e.target.getStage())
  }

  function handleTouchStart(e: Konva.KonvaEventObject<TouchEvent>) {
    const stage = e.target.getStage()
    const touches = e.evt.touches
    if (touches.length === 1 && stage && e.target === stage) {
      singleTouchPan.current = { x: touches[0].clientX, y: touches[0].clientY }
      selectFlowNode(null)
      selectFlowConnection(null)
    }
    if (touches.length >= 2) {
      // A second finger landing mid-drag (e.g. a pinch starting near a node) hands the gesture
      // to pinch-zoom instead of letting them fight — same guard as the Layout canvas.
      nodesById.current.forEach((node) => {
        if (node.isDragging()) node.stopDrag()
      })
    }
  }

  function handleTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches

    if (touches.length === 1 && singleTouchPan.current && !pendingConnectionFromId) {
      const dx = touches[0].clientX - singleTouchPan.current.x
      const dy = touches[0].clientY - singleTouchPan.current.y
      setCameraState((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
      singleTouchPan.current = { x: touches[0].clientX, y: touches[0].clientY }
      return
    }
    if (pendingConnectionFromId && touches.length === 1) {
      const stage = e.target.getStage()
      const rect = stage?.container().getBoundingClientRect()
      if (rect) {
        setTempConnectionEnd(stageToWorld({ x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }))
      }
      return
    }

    if (touches.length !== 2) return
    e.evt.preventDefault()
    singleTouchPan.current = null

    const stage = e.target.getStage()
    if (!stage) return
    const rect = stage.container().getBoundingClientRect()
    const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }
    const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top }
    const distance = getDistance(p1, p2)
    const center = getCenter(p1, p2)

    if (lastPinchDistance.current !== null && lastPinchCenter.current !== null) {
      const anchor = lastPinchCenter.current
      setCameraState((c) => {
        const scaleChange = distance / (lastPinchDistance.current ?? distance)
        const newZoom = clampZoom(c.zoom * scaleChange)
        // Ponto de interesse ancorado no centro anterior dos dedos: o pinch dá zoom e o
        // deslocamento do centro dá pan, no mesmo gesto (igual à prancheta de Layout).
        const worldX = (anchor.x - c.x) / c.zoom
        const worldY = (anchor.y - c.y) / c.zoom
        return { zoom: newZoom, x: center.x - worldX * newZoom, y: center.y - worldY * newZoom }
      })
    }
    lastPinchDistance.current = distance
    lastPinchCenter.current = center
  }

  function handleTouchEnd(e: Konva.KonvaEventObject<TouchEvent>) {
    if (e.evt.touches.length === 0) singleTouchPan.current = null
    if (e.evt.touches.length < 2) {
      lastPinchDistance.current = null
      lastPinchCenter.current = null
    }
    finishPendingConnection(e.target.getStage())
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-canvas overflow-hidden touch-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor }}
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
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            {flowConnections.map((conn) => {
              const fromNode = nodesById_lookup.get(conn.fromNodeId)
              const toNode = nodesById_lookup.get(conn.toNodeId)
              if (!fromNode || !toNode) return null
              return (
                <FlowConnectionShape
                  key={conn.id}
                  connection={conn}
                  fromNode={fromNode}
                  toNode={toNode}
                  selected={selectedFlowConnectionId === conn.id}
                  onSelect={selectFlowConnection}
                />
              )
            })}
            {pendingFromNode && tempConnectionEnd && (
              <Line
                points={[
                  pendingFromNode.x + FLOW_NODE_SIZE.width,
                  pendingFromNode.y + FLOW_NODE_SIZE.height / 2,
                  tempConnectionEnd.x,
                  tempConnectionEnd.y,
                ]}
                stroke="#0796D7"
                strokeWidth={2}
                dash={[6, 4]}
                listening={false}
              />
            )}
            {flowNodes.map((node) => (
              <FlowNodeShape
                key={node.id}
                node={node}
                selected={selectedFlowNodeId === node.id}
                linked={Boolean(node.linkedObjectId)}
                editing={editingNodeId === node.id}
                onSelect={selectFlowNode}
                onDragMove={moveFlowNodeLive}
                onDragEnd={commitFlowNodePosition}
                onHandleDragStart={(id) => setPendingConnectionFrom(id)}
                onStartEdit={startEditingNode}
                registerRef={(id, n) => {
                  if (n) {
                    n.name(`flow-node-${id}`)
                    nodesById.current.set(id, n)
                  } else {
                    nodesById.current.delete(id)
                  }
                }}
              />
            ))}
          </Layer>
        </Stage>
      )}
      {editingNode && (
        <input
          autoFocus
          type="text"
          value={editingValue}
          maxLength={MAX_NODE_NAME_LENGTH}
          placeholder={FLOW_NODE_TYPE_LABELS[editingNode.type]}
          onChange={(e) => setEditingValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commitEditingNode}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitEditingNode()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancelEditingNode()
            }
          }}
          className="absolute rounded-md border-2 border-primary bg-surface px-2 text-sm font-semibold text-text-primary shadow-md focus:outline-none"
          style={{
            left: camera.x + editingNode.x * camera.zoom + 14 * camera.zoom,
            top: camera.y + editingNode.y * camera.zoom,
            width: (FLOW_NODE_SIZE.width - 28) * camera.zoom,
            height: FLOW_NODE_SIZE.height * camera.zoom,
            fontSize: 14 * camera.zoom,
          }}
        />
      )}
      {flowNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-text-secondary text-sm text-center max-w-xs px-4">
            Prancheta de Fluxo vazia — use a biblioteca para adicionar a primeira etapa do
            processo (ex.: Recebimento).
          </p>
        </div>
      )}
    </div>
  )
}
