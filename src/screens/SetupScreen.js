import React, { useState, useRef } from 'react';
import {
	View,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ScrollView,
	Modal,
} from 'react-native';
import AppText from '../components/AppText';
import { ALL_CHARACTERS } from '../constants/characters';
import { FONTS, globalStyles } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { toPersianDigits } from '../utils/persianDigits';

export default function SetupScreen({ onStartGame }) {
	const { theme, currentThemeKey, changeTheme, THEMES } = useTheme();

	const [playerName, setPlayerName] = useState('');
	const [players, setPlayers] = useState([]);
	const [selectedChars, setSelectedChars] = useState([]);
	const [showThemeModal, setShowThemeModal] = useState(false);
	const nameInputRef = useRef(null);

	const refocusNameInput = () => {
		requestAnimationFrame(() => {
			nameInputRef.current?.focus();
		});
	};

	const addPlayer = () => {
		const trimmed = playerName.trim();
		if (!trimmed) return;
		if (players.some((p) => p.name === trimmed)) {
			Alert.alert('خطا', 'این بازیکن قبلاً اضافه شده است.');
			return;
		}
		setPlayers([...players, { id: Date.now().toString(), name: trimmed }]);
		setPlayerName('');
		refocusNameInput();
	};

	const removePlayer = (id) => {
		setPlayers(players.filter((p) => p.id !== id));
	};

	const toggleCharacter = (character) => {
		const isSelected = selectedChars.some((c) => c.id === character.id);
		if (isSelected) {
			setSelectedChars(selectedChars.filter((c) => c.id !== character.id));
		} else {
			setSelectedChars([...selectedChars, character]);
		}
	};

	const handleStart = () => {
		if (players.length < 3) {
			Alert.alert('خطا', 'حداقل ۳ بازیکن برای شروع بازی نیاز است.');
			return;
		}
		if (players.length !== selectedChars.length) {
			Alert.alert(
				'عدم تطابق',
				`تعداد بازیکن‌ها (${toPersianDigits(players.length)}) با تعداد نقش‌ها (${toPersianDigits(
					selectedChars.length,
				)}) برابر نیست.`,
			);
			return;
		}
		onStartGame(players, selectedChars);
	};

	// DEV: shortcut to automatically input dummy players
	const autoFillDevData = () => {
		const dummyPlayers = [
			{ id: '1', name: 'متین' },
			{ id: '2', name: 'رامتین' },
			{ id: '3', name: 'روژین' },
			{ id: '4', name: 'محمد' },
			{ id: '5', name: 'سارا' },
			{ id: '6', name: 'حسن' },
		];
		setPlayers(dummyPlayers);
		setSelectedChars(ALL_CHARACTERS.slice(0, 6));
	};

	return (
		<View style={[styles.container, globalStyles.safeArea, { backgroundColor: theme.bgDark }]}>
			{/* Header */}
			<View style={styles.header}>
				<AppText style={[globalStyles.title, { color: theme.textLight }]}>گادیار</AppText>
				<View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
					{/* Theme Switcher Button */}
					<TouchableOpacity
						style={[styles.themeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
						onPress={() => setShowThemeModal(true)}
					>
						<AppText style={{ fontSize: 16 }}>🎨</AppText>
					</TouchableOpacity>

					<View
						style={[
							globalStyles.badge,
							{ backgroundColor: theme.surface, borderColor: theme.border },
						]}
					>
						<AppText style={[globalStyles.badgeText, { color: theme.textLight }]}>تنظیمات</AppText>
					</View>

					{__DEV__ && (
						<TouchableOpacity onPress={autoFillDevData} style={styles.devBtn}>
							<AppText style={styles.devBtnText}>⚡ تست سریع</AppText>
						</TouchableOpacity>
					)}
				</View>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				nestedScrollEnabled
			>
				{/* Players Box */}
				<View style={[styles.card, { backgroundColor: theme.cardDark, borderColor: theme.border }]}>
					<AppText style={[globalStyles.textRTL, styles.sectionTitle, { color: theme.textLight }]}>
						لیست بازیکنان ({toPersianDigits(players.length)})
					</AppText>
					<View style={styles.inputRow}>
						<TouchableOpacity
							style={[styles.addBtn, { backgroundColor: theme.textLight }]}
							onPress={addPlayer}
						>
							<AppText style={[styles.addBtnText, { color: theme.bgDark }]}>افزودن</AppText>
						</TouchableOpacity>
						<TextInput
							ref={nameInputRef}
							style={[
								styles.input,
								{
									backgroundColor: theme.surface,
									color: theme.textLight,
									borderColor: theme.border,
								},
							]}
							placeholder="نام بازیکن..."
							placeholderTextColor={theme.textMuted}
							value={playerName}
							onChangeText={setPlayerName}
							onSubmitEditing={addPlayer}
							blurOnSubmit={false}
							returnKeyType="next"
						/>
					</View>
					<View style={styles.playersList}>
						{players.map((item) => (
							<View key={item.id} style={[styles.playerItem, { borderBottomColor: theme.border }]}>
								<TouchableOpacity onPress={() => removePlayer(item.id)}>
									<AppText style={[styles.removeText, { color: theme.danger }]}>✕</AppText>
								</TouchableOpacity>
								<AppText style={[styles.playerText, { color: theme.textLight }]}>
									{item.name}
								</AppText>
							</View>
						))}
					</View>
				</View>

				{/* Characters Box */}
				<View style={[styles.card, { backgroundColor: theme.cardDark, borderColor: theme.border }]}>
					<AppText style={[globalStyles.textRTL, styles.sectionTitle, { color: theme.textLight }]}>
						انتخاب نقش‌ها ({toPersianDigits(selectedChars.length)} انتخاب شده)
					</AppText>
					<View style={styles.grid}>
						<View style={styles.gridContainer}>
							{ALL_CHARACTERS.map((item) => {
								const isSelected = selectedChars.some((c) => c.id === item.id);
								const roleColor = item.side === 'mafia' ? theme.mafiaRed : theme.citizenBlue;

								return (
									<TouchableOpacity
										key={item.id}
										style={[
											styles.gridItem,
											{
												backgroundColor: isSelected ? roleColor : theme.surface,
												borderColor: roleColor,
												opacity: isSelected ? 1 : 0.7,
											},
										]}
										onPress={() => toggleCharacter(item)}
									>
										<AppText
											style={[
												styles.gridItemText,
												{
													color: isSelected ? '#ffffff' : roleColor,
													fontFamily: isSelected ? FONTS.bold : FONTS.regular,
												},
											]}
										>
											{isSelected && <>&#10004; </>}
											{item.display}
										</AppText>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
			</ScrollView>

			<View style={[styles.startFooter, { backgroundColor: theme.cardDark }]}>
				<TouchableOpacity
					style={[styles.startBtn, { backgroundColor: theme.success }]}
					onPress={handleStart}
				>
					<AppText style={[styles.startBtnText, { color: theme.textLight }]}>شروع</AppText>
				</TouchableOpacity>
			</View>

			{/* Theme Switcher Modal */}
			<Modal visible={showThemeModal} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.themeModalContainer,
							{ backgroundColor: theme.cardDark, borderColor: theme.border },
						]}
					>
						<AppText weight="bold" style={[styles.themeModalTitle, { color: theme.textLight }]}>
							انتخاب تم برنامه
						</AppText>

						<View style={styles.themesList}>
							{Object.values(THEMES).map((t) => {
								const isCurrent = currentThemeKey === t.id;
								return (
									<TouchableOpacity
										key={t.id}
										style={[
											styles.themeOption,
											{ backgroundColor: t.bgDark, borderColor: isCurrent ? theme.gold : t.border },
											isCurrent && { borderWidth: 2 },
										]}
										onPress={() => {
											changeTheme(t.id);
											setShowThemeModal(false);
										}}
									>
										<View style={[styles.themePreviewBadge, { backgroundColor: t.surface }]}>
											<View
												style={{
													width: 12,
													height: 12,
													borderRadius: 6,
													backgroundColor: t.mafiaRed,
												}}
											/>
											<View
												style={{
													width: 12,
													height: 12,
													borderRadius: 6,
													backgroundColor: t.citizenBlue,
												}}
											/>
										</View>
										<AppText weight="bold" style={{ color: t.textLight, fontSize: 15 }}>
											{t.name}
										</AppText>
									</TouchableOpacity>
								);
							})}
						</View>

						<TouchableOpacity
							style={[styles.closeThemeBtn, { backgroundColor: theme.surface }]}
							onPress={() => setShowThemeModal(false)}
						>
							<AppText style={{ color: theme.textLight, fontFamily: FONTS.bold }}>بستن</AppText>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 4,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		gap: 16,
		paddingBottom: 88,
	},
	startFooter: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		padding: 16,
		paddingTop: 12,
	},
	header: {
		flexDirection: 'row-reverse',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	themeBtn: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	devBtn: {
		backgroundColor: '#ff9800',
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 10,
	},
	devBtnText: {
		color: '#000',
		fontSize: 13,
		fontFamily: FONTS.bold,
	},
	card: {
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
	},
	sectionTitle: {
		fontSize: 16,
		marginBottom: 8,
		fontFamily: FONTS.bold,
	},
	inputRow: {
		flexDirection: 'row',
		gap: 8,
	},
	input: {
		fontFamily: 'Ray-Medium',
		flex: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		textAlign: 'right',
		borderWidth: 1,
	},
	addBtn: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 10,
		justifyContent: 'center',
	},
	addBtnText: {
		fontFamily: FONTS.bold,
	},
	playersList: {
		marginTop: 10,
	},
	playerItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 6,
		borderBottomWidth: 1,
	},
	playerText: {
		fontSize: 15,
	},
	removeText: {
		fontSize: 16,
		paddingHorizontal: 8,
	},
	grid: {
		flex: 1,
		marginTop: 6,
	},
	gridContainer: {
		flexDirection: 'row-reverse',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	gridItem: {
		width: '48%',
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		borderWidth: 1.5,
	},
	gridItemText: {
		fontSize: 16,
	},
	startBtn: {
		paddingVertical: 10,
		borderRadius: 14,
		alignItems: 'center',
	},
	startBtnText: {
		fontFamily: FONTS.bold,
		fontSize: 26,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	themeModalContainer: {
		width: '100%',
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
	},
	themeModalTitle: {
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 16,
	},
	themesList: {
		gap: 10,
		marginBottom: 16,
	},
	themeOption: {
		flexDirection: 'row-reverse',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
	},
	themePreviewBadge: {
		flexDirection: 'row',
		gap: 6,
		padding: 6,
		borderRadius: 8,
	},
	closeThemeBtn: {
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: 'center',
	},
});
