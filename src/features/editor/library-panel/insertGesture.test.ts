import { describe, expect, it } from 'vitest'
import { createInsertGestureGuard } from './insertGesture'

/** Um clique vindo de ponteiro real traz `detail` ≥ 1; teclado e `click()` programático trazem 0. */
const POINTER_CLICK = 1
const SYNTHETIC_CLICK = 0

describe('insertGestureGuard', () => {
  it('deixa passar a primeira ativação de cada gesto', () => {
    const guard = createInsertGestureGuard()

    guard.beginGesture('touch')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)

    guard.beginGesture('touch')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)

    guard.beginGesture('touch')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
  })

  it('ignora a segunda ativação do mesmo gesto', () => {
    const guard = createInsertGestureGuard()

    guard.beginGesture('touch')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
    // O `click` sintético que o WebKit ainda despacha depois do toque: mesmo dedo, mesmo gesto.
    expect(guard.claimActivation(POINTER_CLICK)).toBe(false)
  })

  it('não confunde toques rápidos e sucessivos com repetição do mesmo gesto', () => {
    const guard = createInsertGestureGuard()
    let inserted = 0

    // Sem nenhuma espera entre eles — o que separa os gestos é o pointerdown, não o relógio.
    for (let i = 0; i < 3; i++) {
      guard.beginGesture('touch')
      if (guard.claimActivation(POINTER_CLICK)) inserted++
    }

    expect(inserted).toBe(3)
  })

  it('cede o gesto ao arrasto: quem soltou na prancheta não insere de novo pelo clique', () => {
    const guard = createInsertGestureGuard()

    guard.beginGesture('mouse')
    guard.markAsDrag()
    expect(guard.claimActivation(POINTER_CLICK)).toBe(false)

    // O gesto seguinte volta ao normal.
    guard.beginGesture('mouse')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
  })

  it('reconhece o gesto de toque para que o arrasto nativo não comece', () => {
    const guard = createInsertGestureGuard()

    guard.beginGesture('touch')
    expect(guard.isTouchGesture()).toBe(true)

    guard.beginGesture('mouse')
    expect(guard.isTouchGesture()).toBe(false)

    guard.beginGesture('pen')
    expect(guard.isTouchGesture()).toBe(false)
  })

  it('nunca barra ativação sem ponteiro — teclado, leitor de tela, click() programático', () => {
    const guard = createInsertGestureGuard()

    guard.beginGesture('touch')
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
    expect(guard.claimActivation(SYNTHETIC_CLICK)).toBe(true)
    expect(guard.claimActivation(SYNTHETIC_CLICK)).toBe(true)
  })

  it('falha para o lado permissivo em motor que não despacha pointer events', () => {
    const guard = createInsertGestureGuard()

    // Nenhum beginGesture: inserir de menos é pior do que inserir de mais.
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
    expect(guard.claimActivation(POINTER_CLICK)).toBe(true)
  })
})
