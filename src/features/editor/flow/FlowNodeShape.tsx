import { Circle, Group, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import { FLOW_NODE_SIZE, FLOW_NODE_TYPE_COLORS, FLOW_NODE_TYPE_LABELS, type FlowNode } from '../../../types/flow'

interface FlowNodeShapeProps {
  node: FlowNode
  selected: boolean
  linked: boolean
  editing: boolean
  onSelect: (id: string) => void
  /** Início do arraste — usado para registrar a posição de origem no histórico. */
  onDragStart?: (id: string, x: number, y: number) => void
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onHandleDragStart: (id: string, x: number, y: number) => void
  onStartEdit: (id: string) => void
  registerRef: (id: string, node: Konva.Group | null) => void
}

const { width, height } = FLOW_NODE_SIZE
/** Soft cap on a Fluxo node's name — generous for any real process-step label, just a safety net
 * against pasting something absurdly long into the inline editor (see FlowCanvas's overlay input). */
export const MAX_NODE_NAME_LENGTH = 80

/** A process-step box: rounded rect tinted by type, name/type label, and a small connect handle
 * on the right edge the user drags to another node to create a directional connection. */
export function FlowNodeShape({
  node,
  selected,
  linked,
  editing,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onHandleDragStart,
  onStartEdit,
  registerRef,
}: FlowNodeShapeProps) {
  const color = FLOW_NODE_TYPE_COLORS[node.type]
  const defaultLabel = FLOW_NODE_TYPE_LABELS[node.type]
  const label = node.name?.trim() || defaultLabel

  return (
    <Group
      name={`flow-node-${node.id}`}
      ref={(n) => registerRef(node.id, n)}
      x={node.x}
      y={node.y}
      draggable
      onDragStart={(e) => onDragStart?.(node.id, e.target.x(), e.target.y())}
      onDragMove={(e) => onDragMove(node.id, e.target.x(), e.target.y())}
      onDragEnd={(e) => onDragEnd(node.id, e.target.x(), e.target.y())}
      onClick={() => onSelect(node.id)}
      onTap={() => onSelect(node.id)}
      onDblClick={() => onStartEdit(node.id)}
      onDblTap={() => onStartEdit(node.id)}
    >
      <Rect width={width} height={height} fill={color} opacity={0.14} stroke={color} strokeWidth={selected ? 3 : 1.5} cornerRadius={10} shadowColor="#000000" shadowOpacity={selected ? 0.18 : 0.08} shadowBlur={8} />
      <Rect x={0} y={0} width={6} height={height} fill={color} cornerRadius={[10, 0, 0, 10]} />
      {!editing && (
        <Text
          text={label}
          x={14}
          y={0}
          width={width - 28}
          height={height}
          verticalAlign="middle"
          fontSize={14}
          fontStyle="600"
          fill={color}
          wrap="word"
          ellipsis
        />
      )}
      {linked && (
        <Circle x={width - 14} y={14} radius={4} fill="#16A34A" stroke="#FFFFFF" strokeWidth={1} />
      )}
      {/* Connect handle — press-and-drag from here to another node to create a connection.
          Plain pointer events (no Konva `draggable`) so the gesture is fully driven by
          FlowCanvas's own stage-level mousemove/touchmove/mouseup, which both draws the
          rubber-band line and detects the drop target. */}
      <Circle
        x={width}
        y={height / 2}
        radius={9}
        hitStrokeWidth={12}
        fill="#FFFFFF"
        stroke={color}
        strokeWidth={2}
        onMouseDown={(e) => {
          e.cancelBubble = true
          onHandleDragStart(node.id, node.x + width, node.y + height / 2)
        }}
        onTouchStart={(e) => {
          e.cancelBubble = true
          onHandleDragStart(node.id, node.x + width, node.y + height / 2)
        }}
      />
    </Group>
  )
}