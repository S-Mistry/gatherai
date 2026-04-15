"use client"

import * as React from "react"

import {
  DEFAULT_RESOLVED_THEME,
  DEFAULT_THEME_PREFERENCE,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  getThemePreference,
  isThemePreference,
  resolveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme/shared"

type ThemeContextValue = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (value: React.SetStateAction<ThemePreference>) => void
}

type ThemeProviderProps = {
  children: React.ReactNode
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getStoredTheme() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE
  }

  try {
    return getThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_PREFERENCE
  }
}

function getSystemTheme() {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return DEFAULT_RESOLVED_THEME
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light"
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    window.setTimeout(() => {
      document.head.removeChild(style)
    }, 1)
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function isKeyboardEventLike(event: Event): event is KeyboardEvent {
  return "key" in event && typeof event.key === "string"
}

function useThemeContext() {
  const context = React.useContext(ThemeContext)

  if (context === null) {
    throw new Error("ThemeProvider is missing from the component tree.")
  }

  return context
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useThemeContext()

  React.useEffect(() => {
    function onKeyDown(event: Event) {
      if (!isKeyboardEventLike(event)) {
        return
      }

      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<ThemePreference>(() => getStoredTheme())
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    getSystemTheme()
  )
  const [hasMounted, setHasMounted] = React.useState(false)

  const resolvedTheme = resolveThemePreference(theme, systemTheme)

  const setTheme = React.useCallback(
    (value: React.SetStateAction<ThemePreference>) => {
      setThemeState((currentTheme) => {
        const candidateTheme =
          typeof value === "function" ? value(currentTheme) : value
        const nextTheme = isThemePreference(candidateTheme)
          ? candidateTheme
          : currentTheme

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
          } catch {}
        }

        return nextTheme
      })
    },
    []
  )

  React.useEffect(() => {
    if (!("matchMedia" in window)) {
      return
    }

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)

    function onChange() {
      setSystemTheme(getSystemTheme())
    }

    mediaQuery.addEventListener("change", onChange)
    onChange()

    return () => {
      mediaQuery.removeEventListener("change", onChange)
    }
  }, [])

  React.useEffect(() => {
    function onStorageChange(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }

      setThemeState(getThemePreference(event.newValue))
    }

    window.addEventListener("storage", onStorageChange)

    return () => {
      window.removeEventListener("storage", onStorageChange)
    }
  }, [])

  React.useLayoutEffect(() => {
    setThemeState(getStoredTheme())
    setSystemTheme(getSystemTheme())
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    if (!hasMounted) {
      return
    }

    const restoreTransitions = disableTransitionsTemporarily()
    applyResolvedTheme(document.documentElement, resolvedTheme)
    restoreTransitions()
  }, [hasMounted, resolvedTheme])

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme, theme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

export { ThemeProvider }
