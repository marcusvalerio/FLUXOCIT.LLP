import { useMemo, useState, type DragEvent as ReactDragEvent } from 'react'
import { Search, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  OBJECT_CATALOG,
  OBJECT_CATEGORIES_ORDER,
  getObjectDescription,
} from '../objects/catalog'
import { ObjectThumbnail } from '../objects/ObjectThumbnail'
import { LIBRARY_DND_MIME } from './dragAndDrop'
import { searchCatalog } from './search'
import type { ObjectTypeDefinition } from '../objects/types'
import type { ObjectTypeKey } from '../../../types/layout'

interface LibraryPanelProps {
  /** O que fazer com o objeto escolhido — na barra lateral, armar a ferramenta de inserção;
   * na gaveta de toque, inserir direto no centro da viewport (um toque só). */
  onPick: (objectType: ObjectTypeKey) => void
  /** Layout de grade (2 colunas) para a gaveta mobile; a barra lateral usa lista. */
  variant?: 'list' | 'grid'
  /** Tipo atualmente armado, destacado na lista. */
  armedType?: ObjectTypeKey | null
}

function LibraryItem({
  def,
  variant,
  armed,
  onPick,
}: {
  def: ObjectTypeDefinition
  variant: 'list' | 'grid'
  armed: boolean
  onPick: (objectType: ObjectTypeKey) => void
}) {
  const [dragging, setDragging] = useState(false)

  // Arrastar até a prancheta insere no ponto solto; o clique/toque insere no centro da viewport
  // (único caminho no toque, onde a API nativa de drag não existe). Ver library-panel/dragAndDrop.
  //
  // `draggable` só entra na variante de lista (barra lateral, mouse/desktop) — na gaveta mobile
  // (`grid`) ele nunca tem efeito útil (a própria linha acima já diz que a API nativa de drag não
  // existe no toque), e um elemento HTML5 `draggable="true"` é um vetor conhecido de conflito com
  // o reconhecimento de gesto de scroll do navegador em touch (histórico especialmente no
  // WebKit/Safari): o navegador precisa decidir entre "começar um drag nativo" e "rolar", e essa
  // decisão pode consumir o toque para a detecção de drag em vez da rolagem. Removê-lo do card
  // mobile elimina essa disputa sem custo — nada usa `draggable` no toque de qualquer forma.
  const dragProps = {
    draggable: true,
    onDragStart: (e: ReactDragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData(LIBRARY_DND_MIME, def.key)
      e.dataTransfer.effectAllowed = 'copy'
      setDragging(true)
    },
    onDragEnd: () => setDragging(false),
  }

  if (variant === 'grid') {
    return (
      <button
        onClick={() => onPick(def.key)}
        aria-pressed={armed}
        className={`group flex flex-col overflow-hidden rounded-xl border bg-surface text-left transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-primary/50 hover:shadow-sm active:scale-[0.98] ${
          armed ? 'border-primary ring-1 ring-primary/30' : 'border-border'
        } ${dragging ? 'library-item-dragging' : ''}`}
      >
        <span className="flex items-center justify-center bg-surface-alt/70 transition-colors duration-150 group-hover:bg-primary/5">
          <ObjectThumbnail objectType={def.key} width={130} height={78} />
        </span>
        <span className="px-2.5 py-2">
          <span className="block truncate text-[13px] font-medium leading-tight text-text-primary">{def.label}</span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-text-secondary">
            {getObjectDescription(def.key)}
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      {...dragProps}
      onClick={() => onPick(def.key)}
      aria-pressed={armed}
      className={`group flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:bg-surface-alt/60 active:scale-[0.99] ${
        armed ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
      } ${dragging ? 'library-item-dragging' : ''}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-alt/70 transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/5">
        <ObjectThumbnail objectType={def.key} width={40} height={40} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight text-text-primary">{def.label}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-text-secondary">
          {getObjectDescription(def.key)}
        </span>
      </span>
    </button>
  )
}

/**
 * Biblioteca de objetos: busca no topo, categorias em chips e itens em linhas densas — ícone
 * técnico (o mesmo desenho que vai para a prancheta, via ObjectThumbnail), nome e função.
 *
 * Com busca ativa a navegação por categoria sai do caminho e os resultados aparecem agrupados,
 * porque procurar "doca" não deveria exigir saber que doca é "Estrutura".
 */
export function LibraryPanel({ onPick, variant = 'list', armedType = null }: LibraryPanelProps) {
  const [category, setCategory] = useState<(typeof OBJECT_CATEGORIES_ORDER)[number]>('structure')
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  const results = useMemo(() => {
    if (searching) return searchCatalog(query, OBJECT_CATEGORIES_ORDER)
    return [
      { category: category as string, items: Object.values(OBJECT_CATALOG).filter((def) => def.category === category) },
    ]
  }, [category, query, searching])

  const itemsClassName =
    variant === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative mb-3 shrink-0">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled transition-colors duration-150"
        />
        <input
          /* type="text" e não "search": o Chromium desenha seu próprio ✕ em inputs de busca, que
             duplicaria o botão de limpar do design system logo ao lado. */
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar equipamento..."
          aria-label="Buscar na biblioteca de objetos"
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm text-text-primary placeholder:text-text-disabled transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {searching && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-disabled transition-colors duration-150 hover:bg-surface-alt hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {!searching && (
        <div className="mb-3 flex shrink-0 flex-wrap gap-1">
          {OBJECT_CATEGORIES_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={cat === category}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-[background-color,color] duration-150 ease-out ${
                cat === category
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-slim [-webkit-overflow-scrolling:touch]">
        {results.map((group) => (
          <div key={group.category}>
            {searching && (
              <p className="mb-1.5 px-2 font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
                {CATEGORY_LABELS[group.category]}
              </p>
            )}
            <div className={itemsClassName}>
              {group.items.map((def) => (
                <LibraryItem
                  key={def.key}
                  def={def}
                  variant={variant}
                  armed={def.key === armedType}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center animate-fade-in">
            <p className="text-sm text-text-secondary">Nenhum objeto encontrado.</p>
            <p className="mt-1 text-xs text-text-disabled">Tente outro termo, como “doca” ou “pallet”.</p>
          </div>
        )}
      </div>
    </div>
  )
}
