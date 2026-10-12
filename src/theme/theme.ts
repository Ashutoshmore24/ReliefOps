export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'reliefops_theme';

export function getStoredTheme(): Theme {
  try {
    const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      const saved = storage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
  } catch {
    // Graceful fallback for restricted environments
  }
  return 'dark'; // Dark is default
}

export function saveTheme(theme: Theme): void {
  try {
    const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (storage) {
      storage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Graceful fallback
  }
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}
