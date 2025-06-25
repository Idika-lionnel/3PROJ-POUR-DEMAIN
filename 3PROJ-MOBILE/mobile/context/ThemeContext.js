// context/ThemeContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const colorScheme = Appearance.getColorScheme();
  const [dark, setDark] = useState(colorScheme === 'dark');

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setDark(colorScheme === 'dark');
    });
    return () => listener.remove();
  }, []);

  const toggleTheme = () => {
    setDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};