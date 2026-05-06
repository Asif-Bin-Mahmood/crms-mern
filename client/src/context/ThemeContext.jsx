import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // localStorage থেকে theme load করো, না থাকলে 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('durantofix-theme') || 'dark';
  });

  // theme পরিবর্তনে <html> element-এ data-theme set করো
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('durantofix-theme', theme);
  }, [theme]);

  function toggle() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
