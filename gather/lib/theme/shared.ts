export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_PREFERENCES = ["light", "dark", "system"] as const
export const THEME_STORAGE_KEY = "theme"
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)"
export const DEFAULT_THEME_PREFERENCE = "system" satisfies ThemePreference
export const DEFAULT_RESOLVED_THEME = "light" satisfies ResolvedTheme

type ThemeRoot = {
  classList: Pick<DOMTokenList, "toggle">
  style: Pick<CSSStyleDeclaration, "colorScheme">
}

export function isThemePreference(value: string | null): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value ?? "")
}

export function getThemePreference(
  value: string | null | undefined
): ThemePreference {
  const normalizedValue = value ?? null

  return isThemePreference(normalizedValue)
    ? normalizedValue
    : DEFAULT_THEME_PREFERENCE
}

export function resolveThemePreference(
  theme: ThemePreference,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  return theme === DEFAULT_THEME_PREFERENCE ? systemTheme : theme
}

export function applyResolvedTheme(root: ThemeRoot, resolvedTheme: ResolvedTheme) {
  root.classList.toggle("dark", resolvedTheme === "dark")
  root.style.colorScheme = resolvedTheme
}

export function getThemeBootstrapScript() {
  return `(()=>{const storageKey=${JSON.stringify(THEME_STORAGE_KEY)};const mediaQuery=${JSON.stringify(SYSTEM_THEME_QUERY)};const validThemes=${JSON.stringify(THEME_PREFERENCES)};let storedTheme=null;try{storedTheme=window.localStorage.getItem(storageKey)}catch{}const theme=validThemes.includes(storedTheme)?storedTheme:${JSON.stringify(DEFAULT_THEME_PREFERENCE)};const prefersDark=typeof window.matchMedia==="function"&&window.matchMedia(mediaQuery).matches;const resolvedTheme=theme===${JSON.stringify(DEFAULT_THEME_PREFERENCE)}?(prefersDark?"dark":"light"):theme;const root=document.documentElement;root.classList.toggle("dark",resolvedTheme==="dark");root.style.colorScheme=resolvedTheme;})();`
}
