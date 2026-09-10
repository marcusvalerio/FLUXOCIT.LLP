import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

/** Mantida do nome anterior — ver LocalLayoutRepository: chave de armazenamento não é branding. */
const STORAGE_KEY = 'fluxocit:theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isThemeMode(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

/** 'system' clears the explicit attribute so the prefers-color-scheme media query in
 * src/app/index.css takes over; 'light'/'dark' stamp it so that choice always wins. */
function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const initialTheme = readStoredTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Best-effort persistence — an unavailable localStorage (e.g. private browsing quota)
      // still lets the theme apply for the current session.
    }
    set({ theme })
  },
}))
