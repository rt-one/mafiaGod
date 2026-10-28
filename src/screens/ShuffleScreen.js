import React, { useState, useEffect } from 'react';
import {
	View,
	TouchableOpacity,
	FlatList,
	Modal,
	Image,
	StyleSheet,
	ScrollView,
} from 'react-native';
import { CHARACTER_IMAGES } from '../constants/characterImages';
import { FONTS, globalStyles } from '../styles/theme';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';

export default function ShuffleScreen({ initialPlayers, initialCharacters, onComplete }) {
	const { theme } = useTheme();

	const [assignedPlayers, setAssignedPlayers] = useState([]);
	const [seenPlayerIds, setSeenPlayerIds] = useState([]);
	const [modalPlayer, setModalPlayer] = useState(null);

	useEffect(() => {
		const shuffledChars = [...initialCharacters];
		for (let i = shuffledChars.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffledChars[i], shuffledChars[j]] = [shuffledChars[j], shuffledChars[i]];
		}

		const assigned = initialPlayers.map((player, index) => {
			const char = shuffledChars[index];
			return {
				...player,
				character: char.name,
				displayCharacter: char.display,
				side: char.side,
				description: char.des,
				isAlive: true,
				acts: [null],
				vulnerable: false,
				obvious: false,
				enquiryUsed: 0,
			};
		});

		setAssignedPlayers(assigned);
	}, []);

	const openCard = (player) => {
		if (seenPlayerIds.includes(player.id)) return;
		setModalPlayer(player);
	};

	const closeCard = () => {
		if (modalPlayer && !seenPlayerIds.includes(modalPlayer.id)) {
			const updatedSeen = [...seenPlayerIds, modalPlayer.id];
			setSeenPlayerIds(updatedSeen);
			setModalPlayer(null);

			if (updatedSeen.length === assignedPlayers.length) {
				setTimeout(() => {
					onComplete(assignedPlayers);
				}, 300);
			}
		} else {
			setModalPlayer(null);
		}
	};

	return (
		<View style={[styles.container, globalStyles.safeArea, { backgroundColor: theme.bgDark }]}>
			<View style={styles.header}>
				<AppText style={[globalStyles.title, { color: theme.textLight }]}>گادیار</AppText>
				<View
					style={[
						globalStyles.badge,
						{ backgroundColor: theme.surface, borderColor: theme.border },
					]}
				>
					<AppText style={[globalStyles.badgeText, { color: theme.textLight }]}>
						توزیع نقش‌ها
					</AppText>
				</View>
			</View>

			<AppText style={[globalStyles.textRTL, styles.subtitle, { color: theme.textMuted }]}>
				هر بازیکن روی نام خود ضربه بزند و نقش خود را مشاهده کند:
			</AppText>

			<FlatList
				data={assignedPlayers}
				keyExtractor={(item) => item.id}
				numColumns={2}
				contentContainerStyle={styles.list}
				renderItem={({ item }) => {
					const isSeen = seenPlayerIds.includes(item.id);
					return (
						<TouchableOpacity
							style={[
								styles.playerCard,
								{
									backgroundColor: isSeen ? theme.surface : theme.cardDark,
									borderColor: theme.border,
								},
								isSeen && styles.playerCardSeen,
							]}
							disabled={isSeen}
							onPress={() => openCard(item)}
						>
							<AppText
								style={[
									styles.playerCardText,
									{ color: theme.textLight },
									isSeen && styles.playerCardTextSeen,
								]}
							>
								{item.name}
							</AppText>
						</TouchableOpacity>
					);
				}}
			/>

			{/* Role Reveal Modal */}
			<Modal visible={!!modalPlayer} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					{modalPlayer && (
						<View
							style={[
								styles.modalContainer,
								{ backgroundColor: theme.cardDark, borderColor: theme.border },
							]}
						>
							{/* Character Image */}
							{CHARACTER_IMAGES[modalPlayer.character] && (
								<View
									style={[
										styles.imageWrapper,
										{ backgroundColor: theme.surface, borderColor: theme.bgDark },
									]}
								>
									<Image
										source={CHARACTER_IMAGES[modalPlayer.character]}
										style={styles.characterImage}
										resizeMode="cover"
									/>
								</View>
							)}

							{/* Character Title */}
							<AppText
								style={[
									styles.modalRoleTitle,
									{ color: modalPlayer.side === 'mafia' ? theme.mafiaRed : theme.citizenBlue },
								]}
							>
								{modalPlayer.displayCharacter}
							</AppText>

							{/* Player Name */}
							<AppText style={[styles.modalPlayerName, { color: theme.textLight }]}>
								بازیکن: {modalPlayer.name}
							</AppText>

							{/* Description */}
							<ScrollView style={styles.descriptionScroll}>
								<AppText style={[styles.modalDescription, { color: theme.textLight }]}>
									{modalPlayer.description}
								</AppText>
							</ScrollView>

							{/* Action Button */}
							<TouchableOpacity
								style={[styles.modalBtn, { backgroundColor: theme.textLight }]}
								onPress={closeCard}
							>
								<AppText style={[styles.modalBtnText, { color: theme.bgDark }]}>متوجه شدم</AppText>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	header: {
		flexDirection: 'row-reverse',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	subtitle: {
		marginBottom: 16,
		fontSize: 15,
	},
	list: {
		gap: 12,
	},
	playerCard: {
		flex: 1,
		margin: 6,
		height: 90,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
	},
	playerCardSeen: {
		opacity: 0.35,
	},
	playerCardText: {
		fontFamily: FONTS.bold,
		fontSize: 22,
	},
	playerCardTextSeen: {
		textDecorationLine: 'line-through',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContainer: {
		width: '100%',
		maxHeight: '85%',
		borderRadius: 30,
		padding: 20,
		alignItems: 'center',
		borderWidth: 1,
	},
	imageWrapper: {
		width: '100%',
		height: 180,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 10,
		borderWidth: 4,
		overflow: 'hidden',
	},
	characterImage: {
		width: '100%',
		height: '100%',
	},
	modalRoleTitle: {
		fontFamily: FONTS.extraBold,
		fontSize: 30,
		marginBottom: 4,
	},
	modalPlayerName: {
		fontFamily: FONTS.bold,
		fontSize: 16,
		marginBottom: 10,
	},
	descriptionScroll: {
		maxHeight: 110,
		marginBottom: 16,
	},
	modalDescription: {
		fontFamily: FONTS.regular,
		fontSize: 14,
		lineHeight: 22,
		textAlign: 'right',
		writingDirection: 'rtl',
	},
	modalBtn: {
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 16,
		width: '100%',
		alignItems: 'center',
	},
	modalBtnText: {
		fontFamily: FONTS.bold,
		fontSize: 18,
	},
});
