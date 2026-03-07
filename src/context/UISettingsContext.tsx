import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const UI_STORAGE_KEY = 'expense-tracker-ui'

type NavPosition = 'bottom' | 'top'
type NavColor = 'dark' | 'accent'

interface UISettingsState {
  navPosition: NavPosition
  navColor: NavColor
  navFixed: boolean
}

interface UISettingsContextValue extends UISettingsState {
  setNavPosition: (value: NavPosition) => void
  setNavColor: (value: NavColor) => void
  setNavFixed: (value: boolean) => void
}

function loadUISettings(): UISettingsState {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) {
      return {
        navPosition: 'top',
        navColor: 'dark',
        navFixed: true,
      }
    }
    const parsed = JSON.parse(raw) as Partial<UISettingsState>
    return {
      navPosition: parsed.navPosition === 'bottom' ? 'bottom' : 'top',
      navColor: parsed.navColor === 'accent' ? 'accent' : 'dark',
      navFixed: typeof parsed.navFixed === 'boolean' ? parsed.navFixed : true,
    }
  } catch {
    return {
      navPosition: 'top',
      navColor: 'dark',
      navFixed: true,
    }
  }
}

function saveUISettings(state: UISettingsState) {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

const UISettingsContext = createContext<UISettingsContextValue | null>(null)

export function UISettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UISettingsState>(loadUISettings)

  const setNavPosition = useCallback((value: NavPosition) => {
    setState((prev) => {
      const next = { ...prev, navPosition: value }
      saveUISettings(next)
      return next
    })
  }, [])

  const setNavColor = useCallback((value: NavColor) => {
    setState((prev) => {
      const next = { ...prev, navColor: value }
      saveUISettings(next)
      return next
    })
  }, [])

  const setNavFixed = useCallback((value: boolean) => {
    setState((prev) => {
      const next = { ...prev, navFixed: value }
      saveUISettings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      setNavPosition,
      setNavColor,
      setNavFixed,
    }),
    [state, setNavPosition, setNavColor, setNavFixed]
  )

  return (
    <UISettingsContext.Provider value={value}>
      {children}
    </UISettingsContext.Provider>
  )
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext)
  if (!ctx) throw new Error('useUISettings must be used within UISettingsProvider')
  return ctx
}

