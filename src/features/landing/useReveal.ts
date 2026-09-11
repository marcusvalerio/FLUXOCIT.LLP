import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-reveal primitive for the Landing Page narrative (docs/UX.md § Landing) — a section
 * mounts hidden (`.reveal`) and gets `.is-visible` the first time it crosses into the viewport,
 * via IntersectionObserver rather than a scroll listener (no per-frame layout work). Fires once:
 * a chapter that already told its part of the story shouldn't hide again on scroll-back.
 *
 * Reduced motion isn't special-cased here — index.css's blanket `transition-duration: 1ms` under
 * `prefers-reduced-motion: reduce` already makes the reveal instantaneous, so content still
 * appears (never permanently hidden), it just doesn't animate in.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}
