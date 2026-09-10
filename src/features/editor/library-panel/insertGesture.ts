/**
 * Uma inserção por gesto físico.
 *
 * O card da biblioteca tem dois caminhos de criação sobre o *mesmo* elemento: o arrasto nativo
 * (`draggable` → `dragstart` → `drop` no canvas, que cria no ponto solto) e o clique/toque (que
 * cria no centro da viewport). Nada, até aqui, amarrava os dois ao gesto que os originou — e num
 * motor em que um toque longo inicia o arrasto nativo **e** ainda despacha o `click` sintético do
 * fim do toque (WebKit/iOS), um único gesto do dedo percorria os dois fluxos e criava dois
 * objetos.
 *
 * A proteção aqui é de *identidade de gesto*, não de tempo: nada é bloqueado por N milissegundos.
 * Cada `pointerdown` abre um gesto novo; a primeira ativação daquele gesto vale, as repetições
 * sintéticas do mesmo gesto não. Dois toques intencionais são dois `pointerdown` e continuam
 * valendo dois — que é justamente a diferença que um debounce não sabe fazer.
 *
 * Falha para o lado permissivo de propósito: ativação sem pointer (teclado, leitor de tela,
 * `element.click()`) e motores que não despacham pointer events nunca são barrados. O risco de
 * inserir de menos é pior que o de inserir de mais.
 */
export interface InsertGestureGuard {
  /** Início de um gesto físico. Chamado no `pointerdown` do card. */
  beginGesture(pointerType: string | undefined): void
  /** O gesto em curso é de toque? Decide se o arrasto nativo pode começar. */
  isTouchGesture(): boolean
  /** O gesto em curso virou arrasto nativo: a criação é do `drop`, não do clique. */
  markAsDrag(): void
  /**
   * Esta ativação pode criar um objeto?
   *
   * @param detail `MouseEvent.detail` do clique — 0 em ativação por teclado, leitor de tela ou
   * `click()` programático; ≥ 1 quando veio de um ponteiro de verdade.
   */
  claimActivation(detail: number): boolean
}

export function createInsertGestureGuard(): InsertGestureGuard {
  /** Só passamos a exigir um gesto aberto depois de ver o primeiro pointer event do elemento. */
  let sawPointerEvents = false
  let touchGesture = false
  let dragged = false
  let consumed = false

  return {
    beginGesture(pointerType) {
      sawPointerEvents = true
      touchGesture = pointerType === 'touch'
      dragged = false
      consumed = false
    },
    isTouchGesture() {
      return touchGesture
    },
    markAsDrag() {
      dragged = true
    },
    claimActivation(detail) {
      if (detail === 0) return true
      if (!sawPointerEvents) return true
      if (dragged) return false
      if (consumed) return false
      consumed = true
      return true
    },
  }
}
