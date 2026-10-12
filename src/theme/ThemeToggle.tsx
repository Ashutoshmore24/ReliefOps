import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun size={17} className="theme-toggle-icon sun-icon" aria-hidden="true" />
      ) : (
        <Moon size={17} className="theme-toggle-icon moon-icon" aria-hidden="true" />
      )}
      <span className="theme-toggle-text">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
