import { StyleSheet, Dimensions, StatusBar } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard game factions (Immutable across themes)
export const CORE_COLORS = {
	mafiaRed: '#bc1818',
	citizenBlue: '#16b2c6',
	nightBlue: '#1b2a47',
	gold: '#e1cda7',
	success: '#198754',
	danger: '#dc3545',
	warning: '#ffc107',
	textLight: '#ffffff',
	textDark: '#121212',
	textMuted: '#9e9e9e',
};

// Available Theme Palettes
export const THEMES = {
	noir: {
		id: 'noir',
		name: 'نوآر (کلاسیک)',
		bgDark: '#121212',
		cardDark: '#1e1e1e',
		surface: '#292929',
		border: '#3a3a3a',
		...CORE_COLORS,
	},
	midnight: {
		id: 'midnight',
		name: 'سرمه‌ای شب',
		bgDark: '#0a111c',
		cardDark: '#121d30',
		surface: '#1b2a45',
		border: '#24385a',
		...CORE_COLORS,
	},
	emerald: {
		id: 'emerald',
		name: 'زمردی تاریک',
		bgDark: '#071510',
		cardDark: '#0e241c',
		surface: '#17362b',
		border: '#20483a',
		...CORE_COLORS,
	},
	amoled: {
		id: 'amoled',
		name: 'مشکی خالص (AMOLED)',
		bgDark: '#000000',
		cardDark: '#121212',
		surface: '#1a1a1a',
		border: '#2b2b2b',
		...CORE_COLORS,
	},
};

export const FONTS = {
	light: 'Ray-Light',
	regular: 'Ray-Medium',
	bold: 'Ray-Black',
	extraBold: 'Ray-ExtraBlack',
};

export const globalStyles = StyleSheet.create({
	safeArea: {
		flex: 1,
		marginTop: StatusBar.currentHeight,
	},
	textRTL: {
		fontFamily: FONTS.regular,
		textAlign: 'right',
		writingDirection: 'rtl',
	},
	title: {
		fontFamily: FONTS.extraBold,
		fontSize: 26,
		textAlign: 'right',
		writingDirection: 'rtl',
	},
	badge: {
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 6,
		paddingHorizontal: 16,
	},
	badgeText: {
		fontFamily: FONTS.bold,
		fontSize: 16,
	},
});
