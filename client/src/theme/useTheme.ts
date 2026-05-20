import { useState, useEffect } from 'react';
import { lightTheme, darkTheme } from './colors';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'light';
  });

  useEffect(() => {
    const vars = theme === 'light' ? lightTheme : darkTheme;
    const root = document.documentElement;

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return { theme, toggle };
}
