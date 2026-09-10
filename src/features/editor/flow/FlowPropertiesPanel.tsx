import { useState } from 'react'
import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { IconButton } from '../../../shared/ui/IconButton'
import {
  FLOW_CAPACITY_UNITS,
  FLOW_CONNECTION_TYPE_LABELS,
  FLOW_NODE_TYPE_LABELS,
  FLOW_NODE_TYPES_ORDER,
  FLOW_TIME_UNITS,
  getCapacityLabel,
  getFlowOperationalFields,
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
  const operational = getFlowOperationalFields(node.type)

  // Campos numéricos com rascunho local: digitar "1" em "12" não pode virar um commit por tecla
  // (cada commit é uma entrada de histórico). O valor sobe no blur/Enter.
  //
  // O rascunho é reinicializado por remontagem (ver a `key` em FlowPropertiesPanel, que inclui os
  // valores persistidos) em vez de por efeito de sincronização: digitar não remonta nada, e um
  // undo que mude a capacidade traz o campo de volta ao valor certo sozinho.
  const [capacityDraft, setCapacityDraft] = useState(node.capacity?.toString() ?? '')
  const [timeDraft, setTimeDraft] = useState(node.processTime?.toString() ?? '')

  function commitNumber(key: 'capacity' | 'processTime', raw: string) {
    const trimmed = raw.trim().replace(',', '.')
    if (trimmed === '') {
      if (node[key] !== undefined) setFlowNodeProperty(node.id, key, undefined)
      return
    }
    const parsed = Number.parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed < 0) {
      setCapacityDraft(node.capacity?.toString() ?? '')
      setTimeDraft(node.processTime?.toString() ?? '')
      return
    }
    if (parsed === node[key]) return
    setFlowNodeProperty(node.id, key, parsed)
    // A unidade acompanha o número: sem ela, "20" não quer dizer nada.
    if (key === 'capacity' && !node.capacityUnit) {
      setFlowNodeProperty(node.id, 'capacityUnit', operational.defaultCapacityUnit)
    }
    if (key === 'processTime' && !node.processTimeUnit) {
      setFlowNodeProperty(node.id, 'processTimeUnit', 'min')
    }
  }

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

        {/* Metadata operacional — só os campos que fazem sentido para este tipo de etapa
            (ver types/flow.getFlowOperationalFields): não se pergunta a vazão de uma área
            administrativa nem o tempo de processo de uma quarentena. */}
        {(operational.capacity || operational.time) && (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
              Operação
            </p>

            {operational.capacity && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-text-secondary">{getCapacityLabel(node.type)}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={capacityDraft}
                    placeholder="—"
                    aria-label={getCapacityLabel(node.type)}
                    onChange={(e) => setCapacityDraft(e.target.value)}
                    onBlur={() => commitNumber('capacity', capacityDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base tabular-nums text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
                  />
                  <select
                    value={node.capacityUnit ?? operational.defaultCapacityUnit}
                    aria-label="Unidade de capacidade"
                    onChange={(e) => setFlowNodeProperty(node.id, 'capacityUnit', e.target.value)}
                    className="w-[5.5rem] rounded-md border border-border bg-surface px-1.5 py-1.5 text-xs text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {FLOW_CAPACITY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}

            {operational.time && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-text-secondary">Tempo de processo</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={timeDraft}
                    placeholder="—"
                    aria-label="Tempo de processo"
                    onChange={(e) => setTimeDraft(e.target.value)}
                    onBlur={() => commitNumber('processTime', timeDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-base tabular-nums text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
                  />
                  <select
                    value={node.processTimeUnit ?? 'min'}
                    aria-label="Unidade de tempo"
                    onChange={(e) => setFlowNodeProperty(node.id, 'processTimeUnit', e.target.value)}
                    className="w-[5.5rem] rounded-md border border-border bg-surface px-1.5 py-1.5 text-xs text-text-primary transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {FLOW_TIME_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}
          </div>
        )}

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

  // A chave inclui os valores persistidos: qualquer mudança vinda de fora (undo, edição em outro
  // lugar) remonta o bloco e reinicializa os rascunhos; digitar não muda a chave.
  if (node)
    return (
      <FlowNodeProperties
        key={`${node.id}:${node.capacity ?? ''}:${node.processTime ?? ''}`}
        node={node}
      />
    )
  if (connection) return <FlowConnectionProperties connection={connection} />
  return null
}
