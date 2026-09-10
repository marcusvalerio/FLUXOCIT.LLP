import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, within } from '@testing-library/react'

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
/** O card é o <button> que embrulha o símbolo técnico — o que distingue um card dos chips de
 * categoria, que também são botões. É neste elemento que o dedo encosta. */
function cardsOf(container: HTMLElement): HTMLButtonElement[] {
  return within(container)
    .getAllByTestId('thumb')
    .map((thumb) => {
      const card = thumb.closest('button')
      if (!card) throw new Error('card da biblioteca não encontrado')
      return card as HTMLButtonElement
    })
}

function renderPanel() {
  const onPick = vi.fn()
  const { container, unmount } = render(<LibraryPanel onPick={onPick} variant="grid" />)
  const cards = cardsOf(container)
  return { onPick, card: cards[0], cards, unmount }
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
  it('7 — o guardião está no card que o usuário toca, não num ancestral', () => {
    const { onPick, card } = renderPanel()

    // O elemento que carrega o gesto é o próprio card: é ele que anuncia o arrasto nativo…
    expect(card.tagName).toBe('BUTTON')
    expect(card).toHaveAttribute('draggable', 'true')

    // …e é o toque *nele* que insere. Um toque no painel, fora de qualquer card, não insere nada.
    const panel = card.closest('div[class*="flex-col"]')
    if (!panel) throw new Error('painel não encontrado')
    fireEvent.pointerDown(panel, { pointerType: 'touch' })
    fireEvent.click(panel, { detail: 1 })
    expect(onPick).not.toHaveBeenCalled()

    tap(card)
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('7 — cada card tem identidade de gesto própria', () => {
    const { onPick, cards } = renderPanel()

    tap(cards[0])
    tap(cards[1])

    expect(onPick).toHaveBeenCalledTimes(2)
    expect(onPick.mock.calls[0][0]).not.toBe(onPick.mock.calls[1][0])
  })

  it('8 — com vários painéis montados, só o que recebeu o gesto responde', () => {
    // É o que o editor faz de verdade: barra lateral (desktop), gaveta (mobile) e gaveta
    // (tablet) coexistem no DOM, escondidas por CSS. Só uma recebe o dedo.
    const sidebar = vi.fn()
    const sheet = vi.fn()
    const { container: sidebarDom } = render(<LibraryPanel onPick={sidebar} variant="list" />)
    const { container: sheetDom } = render(<LibraryPanel onPick={sheet} variant="grid" />)

    tap(cardsOf(sheetDom)[0])

    expect(sheet).toHaveBeenCalledTimes(1)
    expect(sidebar).not.toHaveBeenCalled()

    tap(cardsOf(sidebarDom)[0])

    expect(sidebar).toHaveBeenCalledTimes(1)
    expect(sheet).toHaveBeenCalledTimes(1)
  })

  it('J — abrir e fechar a biblioteca não acumula handlers', () => {
    const documentSpy = vi.spyOn(document, 'addEventListener')
    const windowSpy = vi.spyOn(window, 'addEventListener')

    // Cinco ciclos de abrir/fechar a gaveta.
    for (let i = 0; i < 5; i++) {
      const { unmount } = renderPanel()
      unmount()
    }

    // A biblioteca não registra nada em document/window — não há o que vazar entre aberturas.
    expect(documentSpy).not.toHaveBeenCalled()
    expect(windowSpy).not.toHaveBeenCalled()
    documentSpy.mockRestore()
    windowSpy.mockRestore()

    // E a abertura seguinte continua inserindo uma vez por toque, não seis.
    const { onPick, card } = renderPanel()
    tap(card)
    expect(onPick).toHaveBeenCalledTimes(1)
  })
})
