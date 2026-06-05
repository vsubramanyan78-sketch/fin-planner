import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'neon-dark' | 'frosted-glass';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  syncWithSystem: boolean;
  setSyncWithSystem: (sync: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'neon-dark',
  setTheme: () => {},
  toggleTheme: () => {},
  syncWithSystem: false,
  setSyncWithSystem: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [syncWithSystem, setSyncWithSystemState] = useState(() => {
    return localStorage.getItem('theme_sync_system') === 'true';
  });
  
  const [theme, setTheme] = useState<Theme>(() => {
    if (localStorage.getItem('theme_sync_system') === 'true') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'neon-dark' : 'frosted-glass';
    }
    return (localStorage.getItem('user_theme') as Theme) || 'neon-dark';
  });

  const setSyncWithSystem = (sync: boolean) => {
    localStorage.setItem('theme_sync_system', sync ? 'true' : 'false');
    setSyncWithSystemState(sync);
    if (sync) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'neon-dark' : 'frosted-glass');
    }
  };

  const setThemeWithStorage = (newTheme: Theme) => {
    localStorage.setItem('user_theme', newTheme);
    setTheme(newTheme);
  };

  useEffect(() => {
    if (theme === 'frosted-glass') {
      document.documentElement.classList.add('frosted-glass');
      document.body.classList.add('frosted-glass');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('frosted-glass');
      document.body.classList.remove('frosted-glass');
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  }, [theme]);

  // Hook system change listeners
  useEffect(() => {
    if (!syncWithSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'neon-dark' : 'frosted-glass');
    };

    setTheme(mediaQuery.matches ? 'neon-dark' : 'frosted-glass');
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [syncWithSystem]);

  const toggleTheme = () => {
    // If user manually toggles, disable system sync
    if (syncWithSystem) {
      setSyncWithSystem(false);
    }
    const nextTheme = theme === 'neon-dark' ? 'frosted-glass' : 'neon-dark';
    setThemeWithStorage(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeWithStorage, toggleTheme, syncWithSystem, setSyncWithSystem }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
