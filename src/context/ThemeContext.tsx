import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'neon-dark' | 'frosted-glass';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'neon-dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('neon-dark');

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

  const toggleTheme = () => setTheme(prev => prev === 'neon-dark' ? 'frosted-glass' : 'neon-dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
