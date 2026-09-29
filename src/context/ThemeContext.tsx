import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isAutoSchedule: boolean;
  timeOfDayLabel: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
  isAutoSchedule: false,
  timeOfDayLabel: 'Day',
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('kenax_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'light'; // Default to Day (Light Mode)
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('kenax_theme');
      if (saved === 'dark') return 'dark';
      return 'light';
    } catch {
      return 'light';
    }
  });

  const applyThemeToDOM = useCallback((active: 'light' | 'dark') => {
    const root = document.documentElement;
    setResolvedTheme(active);

    if (active === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      root.style.backgroundColor = '#0b0f19';
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = '#0b0f19';
        document.body.style.color = '#f8fafc';
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      root.style.backgroundColor = '#f8fafc';
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }
    }
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('kenax_theme', newTheme);
    } catch {}
  };

  // Direct toggle between Light (Day) and Dark (Night)
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isAutoSchedule: false,
        timeOfDayLabel: theme === 'dark' ? 'Night' : 'Day',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
