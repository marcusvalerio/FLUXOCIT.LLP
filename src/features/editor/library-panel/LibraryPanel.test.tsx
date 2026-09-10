import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// O card desenha o símbolo técnico real via Konva (canvas), que não roda em jsdom. O que este
// teste observa é a interação, não o desenho.
vi.mock('../objects/ObjectThumbnail', () => ({
  ObjectThumbnail: () => <span data-testid="thumb" />,
}))

const { LibraryPanel } = await import('./LibraryPanel')

/**
 * Regressão da inserção duplicada: **uma interação de inserção gera exatamente uma criação**.
 *
 * O card tem dois caminhos de criação — o arrasto nativo e o clique/toque — e o motor do
 * navegador pode despachar mais de um evento pelo mesmo gesto físico. O que se cobra aqui é a
 * distinção entre "mesmo gesto" e "dois gestos intencionais": o primeiro insere uma vez, o
 * segundo insere de novo.
 */
function renderPanel() {
  const onPick = vi.fn()
  render(<LibraryPanel onPick={onPick} variant="grid" />)
  // O primeiro card da categoria inicial — qualquer um serve, todos passam pelo mesmo caminho.
  // O símbolo técnico só existe dentro de um card, o que o distingue dos chips de categoria.
  const card = screen.getAllByTestId('thumb')[0].closest('button')
  if (!card) throw new Error('card da biblioteca não encontrado')
  return { onPick, card }
}

/** Um toque completo como o navegador o entrega: ponteiro, e depois o clique daquele ponteiro. */
function tap(card: HTMLElement) {
  fireEvent.pointerDown(card, { pointerType: 'touch' })
  fireEvent.pointerUp(card, { pointerType: 'touch' })
  fireEvent.click(card, { detail: 1 })
}

function dataTransfer() {
  return { setData: vi.fn(), effectAllowed: '', types: [] as string[] }
}

describe('LibraryPanel — inserção por gesto', () => {
  it('A — um toque insere exatamente uma vez', () => {
    const { onPick, card } = renderPanel()
    tap(card)
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('B/C — toques separados inserem uma vez cada', () => {
    const { onPick, card } = renderPanel()
    tap(card)
    tap(card)
    tap(card)
    expect(onPick).toHaveBeenCalledTimes(3)
  })

  it('D — o clique sintético que o WebKit acrescenta ao mesmo toque não insere de novo', () => {
    const { onPick, card } = renderPanel()
    fireEvent.pointerDown(card, { pointerType: 'touch' })
    fireEvent.pointerUp(card, { pointerType: 'touch' })
    fireEvent.click(card, { detail: 1 })
    // Mesmo dedo, mesmo gesto — sem pointerdown novo no meio.
    fireEvent.click(card, { detail: 1 })
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('E — toque prolongado não vira arrasto nativo, e continua sendo um toque só', () => {
    const { onPick, card } = renderPanel()
    fireEvent.pointerDown(card, { pointerType: 'touch' })
    const transfer = dataTransfer()
    const started = fireEvent.dragStart(card, { dataTransfer: transfer })

    // O arrasto foi cancelado (preventDefault) e nada foi escrito no dataTransfer: no toque, a
    // prancheta está atrás da gaveta e não há para onde soltar.
    expect(started).toBe(false)
    expect(transfer.setData).not.toHaveBeenCalled()

    fireEvent.click(card, { detail: 1 })
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('F/G — no mouse, o gesto que virou arrasto não insere também pelo clique', () => {
    const { onPick, card } = renderPanel()

    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    const transfer = dataTransfer()
    fireEvent.dragStart(card, { dataTransfer: transfer })
    // A criação do arrasto é do drop no canvas (EditorCanvas), não do card.
    expect(transfer.setData).toHaveBeenCalledTimes(1)
    fireEvent.click(card, { detail: 1 })
    fireEvent.dragEnd(card)
    expect(onPick).not.toHaveBeenCalled()

    // Um clique de verdade depois do arrasto continua inserindo.
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 1 })
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('I — o clique de mouse do desktop segue inserindo uma vez por clique', () => {
    const { onPick, card } = renderPanel()
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 1 })
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 1 })
    expect(onPick).toHaveBeenCalledTimes(2)
  })

  it('ativação por teclado e por leitor de tela nunca é barrada', () => {
    const { onPick, card } = renderPanel()
    // Enter/Espaço num <button> chegam como clique sem ponteiro (detail 0).
    fireEvent.click(card, { detail: 0 })
    fireEvent.click(card, { detail: 0 })
    expect(onPick).toHaveBeenCalledTimes(2)
  })
})
