import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { IconButton } from '../../../shared/ui/IconButton'
import {
  FLOW_CONNECTION_TYPE_LABELS,
  FLOW_NODE_TYPE_LABELS,
  FLOW_NODE_TYPES_ORDER,
  type FlowConnection,
  type FlowNode,
} from '../../../types/flow'

const CONNECTION_TYPE_OPTIONS = (Object.keys(FLOW_CONNECTION_TYPE_LABELS) as (keyof typeof FLOW_CONNECTION_TYPE_LABELS)[]).map(
  (value) => ({ value, label: FLOW_CONNECTION_TYPE_LABELS[value] }),
)

function FlowNodeProperties({ node }: { node: FlowNode }) {
  const setFlowNodeProperty = useEditorStore((s) => s.setFlowNodeProperty)
  const deleteFlowNode = useEditorStore((s) => s.deleteFlowNode)
  const duplicateFlowNode = useEditorStore((s) => s.duplicateFlowNode)
  const objects = useEditorStore((s) => s.objects)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-text-primary">{FLOW_NODE_TYPE_LABELS[node.type]}</h2>
        <div className="flex gap-1">
          <IconButton label="Duplicar" onClick={() => duplicateFlowNode(node.id)}>
            <Copy size={18} />
          </IconButton>
          <IconButton label="Excluir" onClick={() => deleteFlowNode(node.id)}>
            <Trash2 size={18} className="text-danger" />
          </IconButton>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Nome</span>
          <input
            type="text"
            value={node.name ?? ''}
            placeholder={FLOW_NODE_TYPE_LABELS[node.type]}
            onChange={(e) => setFlowNodeProperty(node.id, 'name', e.target.value)}
            className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base tabular-nums text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Tipo</span>
          <select
            value={node.type}
            onChange={(e) => setFlowNodeProperty(node.id, 'type', e.target.value)}
            className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {FLOW_NODE_TYPES_ORDER.map((t) => (
              <option key={t} value={t}>
                {FLOW_NODE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Área associada</span>
          <select
            value={node.linkedObjectId ?? ''}
            onChange={(e) => setFlowNodeProperty(node.id, 'linkedObjectId', e.target.value || undefined)}
            className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Nenhuma</option>
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.objectType}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-text-secondary block mb-1">Observação</span>
          <textarea
            value={node.notes ?? ''}
            onChange={(e) => setFlowNodeProperty(node.id, 'notes', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </label>
      </div>
    </div>
  )
}

function FlowConnectionProperties({ connection }: { connection: FlowConnection }) {
  const setFlowConnectionProperty = useEditorStore((s) => s.setFlowConnectionProperty)
  const reverseFlowConnection = useEditorStore((s) => s.reverseFlowConnection)
  const deleteFlowConnection = useEditorStore((s) => s.deleteFlowConnection)
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const fromNode = flowNodes.find((n) => n.id === connection.fromNodeId)
  const toNode = flowNodes.find((n) => n.id === connection.toNodeId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-text-primary">Conexão</h2>
        <div className="flex gap-1">
          <IconButton label="Inverter direção" onClick={() => reverseFlowConnection(connection.id)}>
            <ArrowLeftRight size={18} />
          </IconButton>
          <IconButton label="Excluir conexão" onClick={() => deleteFlowConnection(connection.id)}>
            <Trash2 size={18} className="text-danger" />
          </IconButton>
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        {fromNode ? FLOW_NODE_TYPE_LABELS[fromNode.type] : '?'} → {toNode ? FLOW_NODE_TYPE_LABELS[toNode.type] : '?'}
      </p>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Tipo de fluxo</span>
          <select
            value={connection.flowType}
            onChange={(e) => setFlowConnectionProperty(connection.id, 'flowType', e.target.value)}
            className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CONNECTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-text-secondary">Identificação</span>
          <input
            type="text"
            value={connection.label ?? ''}
            onChange={(e) => setFlowConnectionProperty(connection.id, 'label', e.target.value)}
            className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base tabular-nums text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
          />
        </label>
      </div>
    </div>
  )
}

export function FlowPropertiesPanel() {
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const selectedFlowNodeId = useEditorStore((s) => s.selectedFlowNodeId)
  const selectedFlowConnectionId = useEditorStore((s) => s.selectedFlowConnectionId)

  const node = selectedFlowNodeId ? flowNodes.find((n) => n.id === selectedFlowNodeId) : undefined
  const connection = selectedFlowConnectionId ? flowConnections.find((c) => c.id === selectedFlowConnectionId) : undefined

  if (node) return <FlowNodeProperties node={node} />
  if (connection) return <FlowConnectionProperties connection={connection} />
  return null
}
