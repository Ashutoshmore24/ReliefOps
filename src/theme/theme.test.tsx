import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyThemeToDocument,
  getStoredTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from './theme';
import { ThemeContext, ThemeProvider } from './ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { solve } from '../algorithm/solver';
import { presets } from '../domain/mission';
import { loadExecution } from '../playback/state';
import { PresentationMode } from '../features/presentation/PresentationMode';

describe('theme system & utilities', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to dark mode when no saved preference exists', () => {
    expect(getStoredTheme()).toBe('dark');
  });

  it('retrieves saved light and dark theme preferences accurately', () => {
    mockStorage[THEME_STORAGE_KEY] = 'light';
    expect(getStoredTheme()).toBe('light');

    mockStorage[THEME_STORAGE_KEY] = 'dark';
    expect(getStoredTheme()).toBe('dark');
  });

  it('safely ignores invalid values and defaults to dark mode', () => {
    mockStorage[THEME_STORAGE_KEY] = 'high-contrast-neon';
    expect(getStoredTheme()).toBe('dark');
  });

  it('handles restricted or throwing localStorage gracefully without crashing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError: LocalStorage access denied');
      },
      setItem: () => {
        throw new Error('SecurityError: LocalStorage access denied');
      },
    });

    expect(() => getStoredTheme()).not.toThrow();
    expect(getStoredTheme()).toBe('dark');

    expect(() => saveTheme('light')).not.toThrow();
  });

  it('saves explicit theme preference to localStorage', () => {
    saveTheme('light');
    expect(mockStorage[THEME_STORAGE_KEY]).toBe('light');

    saveTheme('dark');
    expect(mockStorage[THEME_STORAGE_KEY]).toBe('dark');
  });

  it('applies theme attribute and colorScheme style to document element', () => {
    const mockElement = {
      setAttribute: vi.fn(),
      style: { colorScheme: '' },
    };
    vi.stubGlobal('document', { documentElement: mockElement });

    applyThemeToDocument('light');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(mockElement.style.colorScheme).toBe('light');

    applyThemeToDocument('dark');
    expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(mockElement.style.colorScheme).toBe('dark');
  });

  it('handles undefined document in SSR environments gracefully', () => {
    vi.stubGlobal('document', undefined);
    expect(() => applyThemeToDocument('light')).not.toThrow();
  });
});

describe('ThemeToggle component', () => {
  it('renders Sun icon with accessible label "Switch to light theme" when theme is dark', () => {
    const html = renderToStaticMarkup(
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: vi.fn(), setTheme: vi.fn() }}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );

    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('aria-label="Switch to light theme"');
    expect(html).toContain('title="Switch to light theme"');
    expect(html).toContain('sun-icon');
    expect(html).toContain('Light');
  });

  it('renders Moon icon with accessible label "Switch to dark theme" when theme is light', () => {
    const html = renderToStaticMarkup(
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() }}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );

    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).toContain('title="Switch to dark theme"');
    expect(html).toContain('moon-icon');
    expect(html).toContain('Dark');
  });

  it('renders correctly inside ThemeProvider', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('Switch to light theme');
  });

  it('is integrated into presentation mode header', () => {
    const mission = presets['Flood relief'];
    const execution = solve(mission);
    const playback = loadExecution(execution);

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <PresentationMode
          title="Flood relief"
          mission={mission}
          playback={playback}
          change={vi.fn()}
          exit={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(html).toContain('presentation-header-actions');
    expect(html).toContain('theme-toggle-btn');
    expect(html).toContain('Switch to light theme');
  });
});
