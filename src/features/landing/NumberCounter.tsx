import { useEffect, useRef, useState } from 'react'

interface NumberCounterProps {
  value: number
  suffix?: string
  decimals?: number
  /** Starts counting once true (driven by the section's own useReveal) — never on mount, so the
   * number doesn't finish climbing before the visitor has scrolled far enough to see it. */
  start: boolean
  durationMs?: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Counts up from 0 to `value` once `start` flips true — the "dados aparecendo" moment of the
 * Intelligence chapter (docs/UX.md § Landing). Uses requestAnimationFrame (not a setInterval
 * ticking every N ms) so the count stays smooth regardless of frame rate, and skips the animation
 * entirely under prefers-reduced-motion — the number just appears at its final value.
 */
export function NumberCounter({ value, suffix = '', decimals = 0, start, durationMs = 1400 }: NumberCounterProps) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!start) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplay(value)
      return
    }
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      setDisplay(value * easeOutCubic(t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, value, durationMs])

  return (
    <span>
      {display.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
