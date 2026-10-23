import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppTheme } from '../types';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'gray_white',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('vybe_theme');
    return (saved === 'vybe_colorful' || saved === 'gray_white') ? saved : 'gray_white';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('vybe_theme', newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'gray_white' ? 'vybe_colorful' : 'gray_white';
    setTheme(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'vybe_colorful') {
      root.classList.add('theme-vybe-colorful');
      root.classList.remove('theme-gray-white');
    } else {
      root.classList.add('theme-gray-white');
      root.classList.remove('theme-vybe-colorful');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div className={`min-h-screen ${theme === 'vybe_colorful' ? 'theme-vybe-colorful' : 'theme-gray-white'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
