import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = ['dark', 'light', 'system'];

function getSystemTheme() {
  // System default follows OS, but WhatsApp Web defaults to light
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // New users get 'light' by default (like WhatsApp Web)
    return localStorage.getItem('wa-theme') || 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('wa-theme', theme);
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const changeTheme = (t) => {
    if (THEMES.includes(t)) setTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Apply theme immediately on page load (before React renders) — prevents flash
(function () {
  const saved = localStorage.getItem('wa-theme') || 'light';
  applyTheme(saved);
})();
