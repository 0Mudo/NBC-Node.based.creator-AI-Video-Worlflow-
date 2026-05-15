import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('nbc_theme')
    if (saved === 'dark' || saved === 'light') return saved
    return 'dark'
  } catch {
    return 'dark'
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('nbc_theme', next) } catch {}
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
  setTheme: (theme) => {
    try { localStorage.setItem('nbc_theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  }
}))
