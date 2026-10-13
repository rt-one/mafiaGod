import React, { createContext, useContext, useState } from 'react';
import { THEMES } from '../styles/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
	const [currentThemeKey, setCurrentThemeKey] = useState('noir');

	const theme = THEMES[currentThemeKey] || THEMES.noir;

	const changeTheme = (themeKey) => {
		if (THEMES[themeKey]) {
			setCurrentThemeKey(themeKey);
		}
	};

	return (
		<ThemeContext.Provider value={{ theme, currentThemeKey, changeTheme, THEMES }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
