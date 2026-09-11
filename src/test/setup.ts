import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// jsdom has no IntersectionObserver — a minimal no-op stub is enough for components that just
// need the constructor to exist (e.g. features/landing/useReveal's scroll-reveal), since their
// content stays in the DOM regardless of the observer ever firing (only a CSS class toggles).
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
