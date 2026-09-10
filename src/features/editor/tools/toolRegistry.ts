/**
 * Registro de ferramentas do editor.
 *
 * Cada ferramenta declara o próprio comportamento em vez de espalhar condicionais pelo canvas:
 * qual cursor usa, se desenha arrastando, se deixa objetos manipuláveis e qual atalho a ativa.
 * O canvas consulta o registro; adicionar FLOW, CORRIDOR ou ANNOTATION no futuro é acrescentar
 * uma entrada aqui e o tratamento do respectivo rascunho, sem tocar no resto do editor.
 */
export type EditorToolId = 'select' | 'pan' | 'wall' | 'area' | 'measure' | 'place'

export interface EditorToolDefinition {
  id: EditorToolId
  label: string
  /** Frase curta que explica o gesto — vai para a tooltip e para a faixa de contexto. */
  hint: string
  /** Tecla que ativa a ferramenta (sempre uma letra, sem modificador). */
  shortcut: string
  cursor: 'default' | 'grab' | 'crosshair'
  /** Desenha arrastando sobre a prancheta (parede, área, medição). */
  draws: boolean
  /** Objetos continuam arrastáveis com esta ferramenta ativa (só a de seleção). */
  allowsObjectDrag: boolean
}

export const EDITOR_TOOLS: readonly EditorToolDefinition[] = [
  {
    id: 'select',
    label: 'Selecionar',
    hint: 'Clique para selecionar · arraste para mover · arraste no vazio para seleção em área',
    shortcut: 'V',
    cursor: 'default',
    draws: false,
    allowsObjectDrag: true,
  },
  {
    id: 'pan',
    label: 'Mover prancheta',
    hint: 'Arraste para deslocar a prancheta — também com botão direito ou espaço',
    shortcut: 'H',
    cursor: 'grab',
    draws: false,
    allowsObjectDrag: false,
  },
  {
    id: 'wall',
    label: 'Parede',
    hint: 'Arraste de um ponto a outro para desenhar uma parede — Shift trava o ângulo',
    shortcut: 'W',
    cursor: 'crosshair',
    draws: true,
    allowsObjectDrag: false,
  },
  {
    id: 'area',
    label: 'Área',
    hint: 'Arraste para criar uma área operacional',
    shortcut: 'A',
    cursor: 'crosshair',
    draws: true,
    allowsObjectDrag: false,
  },
  {
    id: 'measure',
    label: 'Medir',
    hint: 'Arraste entre dois pontos para medir a distância real',
    shortcut: 'M',
    cursor: 'crosshair',
    draws: true,
    allowsObjectDrag: false,
  },
  {
    id: 'place',
    label: 'Inserir objeto',
    hint: 'Escolha um objeto na biblioteca e clique na prancheta para posicioná-lo',
    shortcut: 'P',
    cursor: 'crosshair',
    draws: false,
    allowsObjectDrag: false,
  },
] as const

const BY_ID = new Map(EDITOR_TOOLS.map((tool) => [tool.id, tool]))

export function getTool(id: EditorToolId): EditorToolDefinition {
  return BY_ID.get(id) ?? EDITOR_TOOLS[0]
}

/** Ferramenta associada a uma tecla (ignora combinações com modificador — Ctrl+A é "selecionar tudo"). */
export function toolForShortcut(key: string): EditorToolId | null {
  const normalized = key.toUpperCase()
  return EDITOR_TOOLS.find((tool) => tool.shortcut === normalized)?.id ?? null
}
