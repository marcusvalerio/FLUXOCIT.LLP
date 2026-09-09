import { FLOW_NODE_TYPES_ORDER, FLOW_NODE_TYPE_COLORS, FLOW_NODE_TYPE_LABELS, type FlowNodeType } from '../../../types/flow'

interface FlowLibraryPanelProps {
  onInsert: (type: FlowNodeType) => void
  /** Grade de 2 colunas para a gaveta mobile; a barra lateral usa lista. */
  variant?: 'list' | 'grid'
}

/** Descrição curta da etapa — mesma função dos subtítulos da biblioteca de objetos: dizer o que
 * a etapa representa na operação, não repetir o nome. */
const FLOW_NODE_DESCRIPTIONS: Record<FlowNodeType, string> = {
  receiving: 'Entrada de mercadorias',
  inspection: 'Conferência de cargas',
  storage: 'Guarda de estoque',
  picking: 'Separação de pedidos',
  staging: 'Consolidação de cargas',
  shipping: 'Saída de mercadorias',
  returns: 'Logística reversa',
  quarantine: 'Bloqueio de estoque',
  administrative: 'Apoio e escritório',
  custom: 'Etapa personalizada',
}

/**
 * Paleta de etapas do Fluxo — mesmo padrão de linha da biblioteca de objetos (marca visual,
 * nome, função), para que as duas pranchetas tenham a mesma sensação de biblioteca profissional.
 */
export function FlowLibraryPanel({ onInsert, variant = 'list' }: FlowLibraryPanelProps) {
  return (
    <div className={variant === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'}>
      {FLOW_NODE_TYPES_ORDER.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onInsert(type)}
          className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:border-border hover:bg-surface-alt/60 active:scale-[0.99]"
        >
          <span
            className="h-9 w-9 shrink-0 rounded-lg border border-black/5 transition-transform duration-150 group-hover:scale-105"
            style={{ backgroundColor: FLOW_NODE_TYPE_COLORS[type], opacity: 0.9 }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium leading-tight text-text-primary">
              {FLOW_NODE_TYPE_LABELS[type]}
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-tight text-text-secondary">
              {FLOW_NODE_DESCRIPTIONS[type]}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
