import React, { useState } from 'react';
import {
	StyleSheet,
	View,
	TouchableOpacity,
	Modal,
	SafeAreaView,
	ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';

import AppText from './src/components/AppText';
import SetupScreen from './src/screens/SetupScreen';
import ShuffleScreen from './src/screens/ShuffleScreen';
import DayScreen from './src/screens/DayScreen';
import NightScreen from './src/screens/NightScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { FONTS } from './src/styles/theme';
import { determineGameStatus } from './src/logic/gameStatus';

// --- DEV MOCK DATA ---
// const MOCK_PLAYERS = [
// 	{
// 		id: '1',
// 		name: 'متین',
// 		character: 'godfather',
// 		displayCharacter: 'پدرخوانده',
// 		side: 'mafia',
// 		isAlive: true,
// 		acts: [null],
// 	},
// 	{
// 		id: '2',
// 		name: 'رامتین',
// 		character: 'doctorlecter',
// 		displayCharacter: 'دکترلکتر',
// 		side: 'mafia',
// 		isAlive: true,
// 		acts: [null],
// 	},
// 	{
// 		id: '3',
// 		name: 'روژین',
// 		character: 'doctor',
// 		displayCharacter: 'دکتر',
// 		side: 'city',
// 		isAlive: true,
// 		acts: [null],
// 	},
// 	{
// 		id: '4',
// 		name: 'محمد',
// 		character: 'detective',
// 		displayCharacter: 'کارآگاه',
// 		side: 'city',
// 		isAlive: true,
// 		acts: [null],
// 	},
// 	{
// 		id: '5',
// 		name: 'سارا',
// 		character: 'sniper',
// 		displayCharacter: 'حرفه‌ای',
// 		side: 'city',
// 		isAlive: true,
// 		acts: [null],
// 	},
// 	{
// 		id: '6',
// 		name: 'حسن',
// 		character: 'invincible',
// 		displayCharacter: 'جان‌سخت',
// 		side: 'city',
// 		isAlive: true,
// 		acts: [null],
// 	},
// ];

function MainGame() {
	useKeepAwake();

	const { theme } = useTheme();

	const [gameState, setGameState] = useState('SETUP'); // SETUP, SHUFFLE, DAY, NIGHT
	const [players, setPlayers] = useState([]);
	const [selectedChars, setSelectedChars] = useState([]);
	const [dayCount, setDayCount] = useState(0);
	const [lastNightResults, setLastNightResults] = useState(null);
	const [gameOver, setGameOver] = useState(null); // 'CITY_WIN', 'MAFIA_WIN'

	// DEV:

	// 1. Change 'SETUP' to 'DAY' (or 'NIGHT')
	// const [gameState, setGameState] = useState('NIGHT');
	// 2. Supply the mock players
	// const [players, setPlayers] = useState(MOCK_PLAYERS);
	// 3. Set whatever day you want to test (e.g. Day 1 or Day 2)
	// const [dayCount, setDayCount] = useState(2);
	// 4. Mock night results if testing day reports
	// const [lastNightResults, setLastNightResults] = useState({
	// 	losses: ['سارا'],
	// 	silenced: 'متین',
	// 	enquiry: true,
	// 	returned: null,
	// });
	// const [gameOver, setGameOver] = useState(null);

	// Timeline Ledger State (Public Events Only)
	const [gameHistory, setGameHistory] = useState([
		{
			id: 'intro',
			type: 'INTRO',
			title: 'روز معارفه',
			description: 'معارفه بازیکنان و تقسیم نقش‌ها انجام شد.',
		},
	]);

	const verifyGameStatus = (currentPlayers, currentDay) => {
		if (currentDay === 0) return null;

		const result = determineGameStatus(currentPlayers);
		if (result) setGameOver(result);
		return result;
	};

	const handleStartSetup = (playerList, characterList) => {
		setPlayers(playerList);
		setSelectedChars(characterList);
		setGameState('SHUFFLE');
	};

	const handleShuffleComplete = (assignedPlayers) => {
		setPlayers(assignedPlayers);
		// GL-001: evaluate the initial state right after role distribution.
		// Under the GL-004 composition rule (city >= mafia + 1) a fresh game can
		// never be an immediate win, but a legacy/dev roster still can.
		const initialResult = determineGameStatus(assignedPlayers);
		if (initialResult) {
			setGameOver(initialResult);
		}
		setGameState('DAY');
	};

	const handleStartNight = () => {
		setGameState('NIGHT');
	};

	const handleNightConcluded = (updatedPlayers, summary) => {
		setPlayers(updatedPlayers);
		setLastNightResults(summary);

		const isIntro = dayCount === 0;
		const nextDay = dayCount + 1;
		setDayCount(nextDay);

		// Append Public Night Record to Ledger (No secret roles disclosed)
		if (!isIntro) {
			const deads = updatedPlayers.filter((p) => !p.isAlive);
			const deadMafia = deads.filter((p) => p.side === 'mafia').length;
			const deadCity = deads.filter((p) => p.side === 'city').length;

			const nightRecord = {
				id: `night-${dayCount}`,
				type: 'NIGHT',
				title: `شب ${dayCount}`,
				losses: summary.losses || [],
				returned: summary.returned || null,
				silenced: summary.silenced || null,
				enquiry: summary.enquiry || false,
				enquiryTally: summary.enquiry ? { deadMafia, deadCity } : null,
			};

			setGameHistory((prev) => [...prev, nightRecord]);
		}

		if (!isIntro) {
			const result = verifyGameStatus(updatedPlayers, nextDay);
			if (!result) {
				setGameState('DAY');
			}
		} else {
			setGameState('DAY');
		}
	};

	const handleVoteOut = (playerId) => {
		const votedPlayer = players.find((p) => p.id === playerId);
		if (!votedPlayer || !votedPlayer.isAlive) return;
		const updated = players.map((p) => (p.id === playerId ? { ...p, isAlive: false } : p));
		setPlayers(updated);

		// Append Public Vote Out Event to Ledger
		if (votedPlayer) {
			const voteRecord = {
				id: `vote-${Date.now()}`,
				type: 'VOTEOUT',
				title: `روز ${dayCount}`,
				playerName: votedPlayer.name,
			};
			setGameHistory((prev) => [...prev, voteRecord]);
		}

		verifyGameStatus(updated, dayCount);
	};

	const restartGame = () => {
		setGameState('SETUP');
		setPlayers([]);
		setSelectedChars([]);
		setDayCount(0);
		setLastNightResults(null);
		setGameOver(null);
		setGameHistory([
			{
				id: 'intro',
				type: 'INTRO',
				title: 'روز معارفه',
				description: 'معارفه بازیکنان و تقسیم نقش‌ها انجام شد.',
			},
		]);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.bgDark }]}>
			<StatusBar style="light" />

			{gameState === 'SETUP' && <SetupScreen onStartGame={handleStartSetup} />}

			{gameState === 'SHUFFLE' && (
				<ShuffleScreen
					initialPlayers={players}
					initialCharacters={selectedChars}
					onComplete={handleShuffleComplete}
				/>
			)}

			{gameState === 'DAY' && (
				<DayScreen
					players={players}
					dayCount={dayCount}
					lastNightResults={lastNightResults}
					gameHistory={gameHistory}
					onStartNight={handleStartNight}
					onVoteOut={handleVoteOut}
					gameOverState={gameOver}
				/>
			)}

			{gameState === 'NIGHT' && (
				<NightScreen
					players={players}
					dayCount={dayCount}
					onNightConcluded={handleNightConcluded}
				/>
			)}

			{/* Game Over Modal */}
			<Modal visible={!!gameOver} transparent animationType="fade">
				<View
					style={[
						styles.gameOverOverlay,
						{ backgroundColor: gameOver === 'MAFIA_WIN' ? '#3d0c0c' : '#0a2f1d' },
					]}
				>
					<AppText weight="extraBold" style={styles.gameOverTitle}>
						{gameOver === 'MAFIA_WIN' ? 'شهر باخت ❌' : 'شهر برد ✅'}
					</AppText>
					<TouchableOpacity style={styles.restartBtn} onPress={restartGame}>
						<AppText weight="bold" style={styles.restartBtnText}>
							بازی دوباره
						</AppText>
					</TouchableOpacity>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

export default function App() {
	const [fontsLoaded] = useFonts({
		'Ray-Light': require('./assets/static/fonts/Ray-Light.ttf'),
		'Ray-Medium': require('./assets/static/fonts/Ray-Medium.ttf'),
		'Ray-Black': require('./assets/static/fonts/Ray-Black.ttf'),
		'Ray-ExtraBlack': require('./assets/static/fonts/Ray-ExtraBlack.ttf'),
	});

	if (!fontsLoaded) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#e1cda7" />
			</View>
		);
	}

	return (
		<ThemeProvider>
			<MainGame />
		</ThemeProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		backgroundColor: '#121212',
		justifyContent: 'center',
		alignItems: 'center',
	},
	gameOverOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
		gap: 24,
	},
	gameOverTitle: {
		fontFamily: FONTS.extraBold,
		fontSize: 42,
		color: '#fff',
		textAlign: 'center',
	},
	restartBtn: {
		backgroundColor: '#fff',
		paddingVertical: 16,
		paddingHorizontal: 36,
		borderRadius: 16,
		width: '80%',
		alignItems: 'center',
	},
	restartBtnText: {
		fontFamily: FONTS.bold,
		color: '#000',
		fontSize: 20,
	},
});
