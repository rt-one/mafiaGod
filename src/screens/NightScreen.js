import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	ScrollView,
} from 'react-native';
import SoundService from '../services/soundService';
import { FONTS, globalStyles } from '../styles/theme';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import {
	canRequestInvincibleEnquiry,
	getInvincibleEnquiriesRemaining,
	getNextInvincibleEnquiryCount,
} from '../logic/invincibleEnquiry';
import { getSuccessfulResurrection } from '../logic/resurrection';
import { toPersianDigits } from '../utils/persianDigits';

export default function NightScreen({ players, dayCount, onNightConcluded }) {
	const { theme } = useTheme();

	const [phase, setPhase] = useState('INTRO'); // INTRO, MAFIA_TIMER, PLAYER_SELECTION, PLAYER_ACT, CONCLUDING
	const [mafiaSeconds, setMafiaSeconds] = useState(30);
	const [seenPlayers, setSeenPlayers] = useState([]);
	const [activePlayer, setActivePlayer] = useState(null);
	const [playerSeconds, setPlayerSeconds] = useState(10);
	const [selectedTarget, setSelectedTarget] = useState('no-act');
	const [doctorlecterShot, setDoctorlecterShot] = useState('no-act');
	const [inquiryResult, setInquiryResult] = useState(null);
	const [localPlayers, setLocalPlayers] = useState(players);

	const timerRef = useRef(null);
	const isEndingRef = useRef(false);

	const alivePlayers = localPlayers.filter((p) => p.isAlive);
	const deadPlayers = localPlayers.filter((p) => !p.isAlive);
	const isGodfatherDead = localPlayers.some((p) => p.character === 'godfather' && !p.isAlive);

	useEffect(() => {
		isEndingRef.current = false;
		runNightIntro();
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			SoundService.stopBackgroundMusic();
		};
	}, []);

	// DEV: Testing the conclusion routine
	// useEffect(
	// 	function () {
	// 		onNightConcluded(
	// 			[
	// 				...players,
	// 				{ ...players.find((p) => p.name === 'رامتین'), isAlive: false },
	// 				{ ...players.find((p) => p.name === 'سارا'), isAlive: false },
	// 			],
	// 			{
	// 				losses: new Set(['سارا', 'رامتین']),
	// 				silenced: 'متین',
	// 				enquiry: true,
	// 				returned: null,
	// 			},
	// 		);
	// 	},
	// 	[onNightConcluded, players],
	// );

	const runNightIntro = async () => {
		await SoundService.startBackgroundMusic();
		await SoundService.playAndWait('sleep');
		await SoundService.wait(3);
		await SoundService.playAndWait('mafiaAwake');
		await SoundService.wait(0.5);
		await SoundService.playAndWait('mafiaTime');

		setPhase('MAFIA_TIMER');
		startMafiaTimer(30);
	};

	const startMafiaTimer = (seconds) => {
		setMafiaSeconds(seconds);
		timerRef.current = setInterval(() => {
			setMafiaSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timerRef.current);
					handleMafiaSleep();
					return 0;
				}
				const next = prev - 1;
				if (next === 10) SoundService.playSound('lastWord');
				// Turns out, it's better off removed
				// if (next === 5) SoundService.playSound('countdown5');
				return next;
			});
		}, 1000);
	};

	const handleMafiaSleep = async () => {
		await SoundService.playAndWait('mafiaSleep');
		await SoundService.wait(2.5);

		if (dayCount === 0) {
			endNight(localPlayers);
		} else {
			await SoundService.playAndWait('actsStart');
			setPhase('PLAYER_SELECTION');
		}
	};

	const openPlayerPanel = (player) => {
		setActivePlayer(player);
		setSelectedTarget('no-act');
		setDoctorlecterShot('no-act');
		setInquiryResult(null);
		setPhase('PLAYER_ACT');
		startPlayerTimer(10, player);
	};

	const startPlayerTimer = (seconds, player) => {
		setPlayerSeconds(seconds);
		if (timerRef.current) clearInterval(timerRef.current);

		timerRef.current = setInterval(() => {
			setPlayerSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timerRef.current);
					confirmPlayerAction(player);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const confirmPlayerAction = (player) => {
		if (player.character === 'invincible' && selectedTarget === 'yes') {
			const current = localPlayers.find((item) => item.id === player.id) || player;
			if (!canRequestInvincibleEnquiry(current, dayCount)) {
				Alert.alert('محدودیت استعلام', 'جان‌سخت قبلاً هر دو استعلام خود را استفاده کرده است.');
				return;
			}
		}
		if (timerRef.current) clearInterval(timerRef.current);
		SoundService.playSound('bell');

		const updated = localPlayers.map((p) => {
			if (p.id === player.id) {
				const acts = [...(p.acts || [])];
				acts[dayCount] = selectedTarget;
				const updatedPlayer = { ...p, acts };
				if (player.character === 'doctorlecter' && isGodfatherDead) {
					updatedPlayer.shots = { ...(p.shots || {}), [dayCount]: doctorlecterShot };
				}
				return updatedPlayer;
			}
			return p;
		});

		setLocalPlayers(updated);
		const newSeen = [...seenPlayers, player.id];
		setSeenPlayers(newSeen);
		setActivePlayer(null);

		if (newSeen.length === alivePlayers.length) {
			endNight(updated);
		} else {
			setPhase('PLAYER_SELECTION');
		}
	};

	const checkDetectiveSide = () => {
		if (selectedTarget === 'no-act') return;
		const target = localPlayers.find((p) => p.name === selectedTarget);
		if (!target) return;

		let side = target.side;
		if (target.character === 'godfather') {
			if (target.obvious) {
				side = 'mafia';
			} else {
				setLocalPlayers((prev) =>
					prev.map((p) => (p.name === target.name ? { ...p, obvious: true } : p)),
				);
				side = 'city';
			}
		}
		setInquiryResult(side);
	};

	const endNight = async (currentPlayers) => {
		if (isEndingRef.current) return;
		isEndingRef.current = true;

		setPhase('CONCLUDING');
		await SoundService.stopBackgroundMusic();

		const activeList = currentPlayers && currentPlayers.length > 0 ? currentPlayers : localPlayers;
		const nightResult = concludeNight(activeList);

		await SoundService.playAndWait('awake');
		await SoundService.wait(1);

		onNightConcluded(nightResult.updatedPlayers, nightResult.summary);
	};

	const concludeNight = (playersList) => {
		const summary = {
			losses: [],
			silenced: null,
			enquiry: false,
			returned: null,
		};

		if (dayCount === 0) {
			return { updatedPlayers: playersList, summary };
		}

		const addUniqueLoss = (targetName) => {
			if (targetName && !summary.losses.includes(targetName)) {
				summary.losses.push(targetName);
			}
		};

		const doc = playersList.find((p) => p.character === 'doctor' && p.isAlive);
		const lecter = playersList.find((p) => p.character === 'doctorlecter' && p.isAlive);
		const invincible = playersList.find((p) => p.character === 'invincible' && p.isAlive);
		const sniper = playersList.find((p) => p.character === 'sniper' && p.isAlive);

		const docSaveTarget = doc?.acts?.[dayCount];
		const lecterSaveTarget = lecter?.acts?.[dayCount];

		// 1. Mafia Shot
		let mafiaTargetName = null;
		const gf = playersList.find((p) => p.character === 'godfather' && p.isAlive);
		if (gf && gf.acts?.[dayCount] && gf.acts[dayCount] !== 'no-act') {
			mafiaTargetName = gf.acts[dayCount];
		} else if (lecter && lecter.shots?.[dayCount] && lecter.shots[dayCount] !== 'no-act') {
			mafiaTargetName = lecter.shots[dayCount];
		}

		let invincibleVulnerable = invincible?.vulnerable || false;

		if (mafiaTargetName && mafiaTargetName !== 'no-act') {
			if (mafiaTargetName !== docSaveTarget) {
				if (invincible && mafiaTargetName === invincible.name) {
					if (invincibleVulnerable) {
						addUniqueLoss(invincible.name);
					} else {
						invincibleVulnerable = true;
					}
				} else {
					addUniqueLoss(mafiaTargetName);
				}
			}
		}

		// 2. Sniper Shot
		if (sniper && sniper.acts?.[dayCount] && sniper.acts[dayCount] !== 'no-act') {
			const sniperTargetName = sniper.acts[dayCount];
			const targetPlayer = playersList.find((p) => p.name === sniperTargetName);

			if (targetPlayer) {
				if (targetPlayer.side === 'city') {
					addUniqueLoss(sniper.name);
				} else if (targetPlayer.side === 'mafia') {
					if (sniperTargetName !== lecterSaveTarget) {
						addUniqueLoss(sniperTargetName);
					}
				}
			}
		}

		// 3. Invincible Enquiry (GL-002: at most two successful enquiries per game)
		const invincibleEnquiryRequested = invincible?.acts?.[dayCount] === 'yes';
		const invincibleEnquiryGranted =
			invincibleEnquiryRequested && canRequestInvincibleEnquiry(invincible, dayCount);
		if (invincibleEnquiryGranted) {
			summary.enquiry = true;
		}

		// 4. Psychologist Mute
		const psych = playersList.find((p) => p.character === 'psychologist' && p.isAlive);
		if (psych && psych.acts?.[dayCount] && psych.acts[dayCount] !== 'no-act') {
			summary.silenced = psych.acts[dayCount];
		}

		// 5. Constantine Resurrection
		summary.returned = getSuccessfulResurrection(playersList, dayCount);

		const updatedPlayers = playersList.map((p) => {
			let isAlive = p.isAlive;
			if (summary.losses.includes(p.name)) isAlive = false;
			if (summary.returned === p.name) isAlive = true;
			const isInvincible = p.character === 'invincible';
			// GL-002/GL-007 compatibility: an enquiry is consumed only when it was
			// granted and Invincible is alive after this night. Under current
			// resolution a granted enquiry never changes losses, so this survives
			// value always matches the final isAlive, while a future GL-007 change
			// that cancels the enquiry on death will automatically not consume it.
			const enquiryUsed = isInvincible
				? getNextInvincibleEnquiryCount({
						player: p,
						dayCount,
						requested: p.name === invincible?.name && invincibleEnquiryRequested,
						granted: p.name === invincible?.name && invincibleEnquiryGranted,
						survives: isAlive,
					})
				: p.enquiryUsed;
			return {
				...p,
				isAlive,
				vulnerable: isInvincible ? invincibleVulnerable : p.vulnerable,
				...(isInvincible ? { enquiryUsed } : null),
			};
		});

		return { updatedPlayers, summary };
	};

	const getSelfSaveCount = (player) => {
		if (!player || !player.acts) return 0;
		return player.acts.filter((act) => act === player.name).length;
	};

	const hasUsedSinglePower = (player) => {
		if (!player || !player.acts) return false;
		return player.acts.some((act, idx) => idx < dayCount && act !== null && act !== 'no-act');
	};

	return (
		<View style={[styles.container, globalStyles.safeArea, { backgroundColor: theme.bgDark }]}>
			{/* Header */}
			<View style={styles.header}>
				<AppText style={[globalStyles.title, { color: theme.textLight }]}>گادیار</AppText>
				<View
					style={[
						globalStyles.badge,
						{ backgroundColor: theme.surface, borderColor: theme.border },
					]}
				>
					<AppText style={[globalStyles.badgeText, { color: theme.textLight }]}>
						{dayCount === 0 ? 'شب معارفه' : `شب ${toPersianDigits(dayCount)}`}
					</AppText>
				</View>
			</View>

			{phase === 'INTRO' && (
				<View style={styles.centerContainer}>
					<ActivityIndicator size="large" color={theme.textLight} />
					<AppText style={[styles.introText, { color: theme.textLight }]}>
						شهر به خواب می‌رود...
					</AppText>
				</View>
			)}

			{phase === 'MAFIA_TIMER' && (
				<View style={styles.centerContainer}>
					<AppText style={[styles.mafiaTimerLabel, { color: theme.mafiaRed }]}>
						زمان {dayCount === 0 && 'معارفه و '}هماهنگی مافیا
					</AppText>
					<AppText style={[styles.timerText, { color: theme.textLight }]}>
						{toPersianDigits(mafiaSeconds)}
					</AppText>
				</View>
			)}

			{phase === 'PLAYER_SELECTION' && (
				<View style={{ flex: 1 }}>
					<AppText
						style={[globalStyles.textRTL, styles.selectionInstruction, { color: theme.textMuted }]}
					>
						بازیکنان به نوبت گوشی را تحویل گرفته و نقش خود را ایفا کنند:
					</AppText>
					<FlatList
						data={alivePlayers}
						keyExtractor={(item) => item.id}
						numColumns={2}
						renderItem={({ item }) => {
							const isSeen = seenPlayers.includes(item.id);
							return (
								<TouchableOpacity
									style={[
										styles.playerCard,
										{ backgroundColor: theme.cardDark, borderColor: theme.border },
										isSeen && styles.playerCardSeen,
									]}
									disabled={isSeen}
									onPress={() => openPlayerPanel(item)}
								>
									<AppText style={[styles.playerCardText, { color: theme.textLight }]}>
										{item.name}
									</AppText>
								</TouchableOpacity>
							);
						}}
					/>
				</View>
			)}

			{phase === 'PLAYER_ACT' && activePlayer && (
				<View style={[styles.actContainer, { backgroundColor: theme.cardDark }]}>
					<AppText style={[styles.actTimerText, { color: theme.textLight }]}>
						{toPersianDigits(playerSeconds)}
					</AppText>
					<AppText style={[styles.actPlayerTitle, { color: theme.textLight }]}>
						{activePlayer.name} ({activePlayer.displayCharacter})
					</AppText>

					<ScrollView style={styles.actScroll}>
						<AppText style={[styles.selectorLabel, { color: theme.textLight }]}>
							انتخاب هدف نقش:
						</AppText>

						<TouchableOpacity
							style={[
								styles.targetOption,
								{ backgroundColor: theme.surface },
								selectedTarget === 'no-act' && { backgroundColor: theme.gold },
								!!inquiryResult && { opacity: 0.5 },
							]}
							disabled={!!inquiryResult}
							onPress={() => setSelectedTarget('no-act')}
						>
							<AppText
								style={[
									styles.targetOptionText,
									selectedTarget === 'no-act' && { color: theme.textDark, fontFamily: FONTS.bold },
								]}
							>
								--- بدون عمل ---
							</AppText>
						</TouchableOpacity>

						{/* Godfather */}
						{activePlayer.character === 'godfather' &&
							alivePlayers.map((p) => (
								<TouchableOpacity
									key={p.id}
									style={[
										styles.targetOption,
										{ backgroundColor: theme.surface },
										selectedTarget === p.name && { backgroundColor: theme.gold },
									]}
									onPress={() => setSelectedTarget(p.name)}
								>
									<AppText
										style={[
											styles.targetOptionText,
											selectedTarget === p.name && {
												color: theme.textDark,
												fontFamily: FONTS.bold,
											},
										]}
									>
										{p.name}
									</AppText>
								</TouchableOpacity>
							))}

						{/* Doctor Lecter */}
						{activePlayer.character === 'doctorlecter' &&
							alivePlayers
								.filter((p) => p.side === 'mafia')
								.filter((p) =>
									p.name === activePlayer.name ? getSelfSaveCount(activePlayer) < 1 : true,
								)
								.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											selectedTarget === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setSelectedTarget(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												selectedTarget === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name} {p.name === activePlayer.name ? '(نجات خود)' : ''}
										</AppText>
									</TouchableOpacity>
								))}

						{/* Doctor */}
						{activePlayer.character === 'doctor' &&
							alivePlayers
								.filter((p) =>
									p.name === activePlayer.name ? getSelfSaveCount(activePlayer) < 1 : true,
								)
								.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											selectedTarget === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setSelectedTarget(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												selectedTarget === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name} {p.name === activePlayer.name ? '(نجات خود)' : ''}
										</AppText>
									</TouchableOpacity>
								))}

						{/* Detective */}
						{activePlayer.character === 'detective' &&
							alivePlayers
								.filter((p) => p.id !== activePlayer.id)
								.map((p) => {
									const isSelected = selectedTarget === p.name;
									const isLocked = !!inquiryResult;
									return (
										<TouchableOpacity
											key={p.id}
											style={[
												styles.targetOption,
												{ backgroundColor: theme.surface },
												isSelected && { backgroundColor: theme.gold },
												isLocked && !isSelected && { opacity: 0.35 },
											]}
											disabled={isLocked}
											onPress={() => setSelectedTarget(p.name)}
										>
											<AppText
												style={[
													styles.targetOptionText,
													isSelected && { color: theme.textDark, fontFamily: FONTS.bold },
												]}
											>
												{p.name}
											</AppText>
										</TouchableOpacity>
									);
								})}

						{/* Sniper */}
						{activePlayer.character === 'sniper' &&
							alivePlayers
								.filter((p) => p.id !== activePlayer.id)
								.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											selectedTarget === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setSelectedTarget(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												selectedTarget === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name}
										</AppText>
									</TouchableOpacity>
								))}

						{/* Invincible */}
						{activePlayer.character === 'invincible' &&
							(() => {
								const invincibleState =
									localPlayers.find((item) => item.id === activePlayer.id) || activePlayer;
								const remaining = getInvincibleEnquiriesRemaining(invincibleState, dayCount);
								const exhausted = remaining <= 0;
								return (
									<View>
										<AppText style={[styles.selectorLabel, { color: theme.textMuted }]}>
											{exhausted
												? 'سهمیه استعلام تمام شده است 🚫'
												: `استعلام باقی‌مانده: ${toPersianDigits(remaining)} از ${toPersianDigits(2)}`}
										</AppText>
										<TouchableOpacity
											style={[
												styles.targetOption,
												{ backgroundColor: theme.surface },
												selectedTarget === 'yes' && { backgroundColor: theme.gold },
												exhausted && { opacity: 0.4 },
											]}
											disabled={exhausted}
											onPress={() => setSelectedTarget('yes')}
										>
											<AppText
												style={[
													styles.targetOptionText,
													selectedTarget === 'yes' && {
														color: theme.textDark,
														fontFamily: FONTS.bold,
													},
												]}
											>
												بله (استعلام)
											</AppText>
										</TouchableOpacity>
									</View>
								);
							})()}

						{/* Constantine */}
						{activePlayer.character === 'constantine' &&
							(!hasUsedSinglePower(activePlayer) ? (
								deadPlayers.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											selectedTarget === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setSelectedTarget(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												selectedTarget === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name} (بازگشت به بازی)
										</AppText>
									</TouchableOpacity>
								))
							) : (
								<AppText
									style={{ color: theme.textMuted, textAlign: 'center', marginVertical: 10 }}
								>
									قابلیت بازگشت قبلاً استفاده شده است.
								</AppText>
							))}

						{/* Psychologist */}
						{activePlayer.character === 'psychologist' &&
							(!hasUsedSinglePower(activePlayer) ? (
								alivePlayers.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											selectedTarget === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setSelectedTarget(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												selectedTarget === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name} (سایلنت)
										</AppText>
									</TouchableOpacity>
								))
							) : (
								<AppText
									style={{ color: theme.textMuted, textAlign: 'center', marginVertical: 10 }}
								>
									قابلیت سایلنت قبلاً استفاده شده است.
								</AppText>
							))}

						{/* Doctor Lecter Secondary Shot */}
						{activePlayer.character === 'doctorlecter' && isGodfatherDead && (
							<View style={styles.lecterShotBox}>
								<AppText style={styles.lecterShotLabel}>شلیک مافیا (پدرخوانده مرده است):</AppText>
								<TouchableOpacity
									style={[
										styles.targetOption,
										{ backgroundColor: theme.surface },
										doctorlecterShot === 'no-act' && { backgroundColor: theme.gold },
									]}
									onPress={() => setDoctorlecterShot('no-act')}
								>
									<AppText
										style={[
											styles.targetOptionText,
											doctorlecterShot === 'no-act' && {
												color: theme.textDark,
												fontFamily: FONTS.bold,
											},
										]}
									>
										--- بدون شلیک ---
									</AppText>
								</TouchableOpacity>
								{alivePlayers.map((p) => (
									<TouchableOpacity
										key={p.id}
										style={[
											styles.targetOption,
											{ backgroundColor: theme.surface },
											doctorlecterShot === p.name && { backgroundColor: theme.gold },
										]}
										onPress={() => setDoctorlecterShot(p.name)}
									>
										<AppText
											style={[
												styles.targetOptionText,
												doctorlecterShot === p.name && {
													color: theme.textDark,
													fontFamily: FONTS.bold,
												},
											]}
										>
											{p.name}
										</AppText>
									</TouchableOpacity>
								))}
							</View>
						)}

						{/* Detective Inquiry Button */}
						{activePlayer.character === 'detective' && (
							<View style={{ marginTop: 12 }}>
								<TouchableOpacity
									style={[
										styles.inquiryBtn,
										{ backgroundColor: theme.nightBlue },
										(selectedTarget === 'no-act' || !!inquiryResult) && { opacity: 0.5 },
									]}
									disabled={selectedTarget === 'no-act' || !!inquiryResult}
									onPress={checkDetectiveSide}
								>
									<AppText style={styles.inquiryBtnText}>
										{inquiryResult ? 'استعلام ثبت شد ✓' : 'استعلام کارآگاه'}
									</AppText>
								</TouchableOpacity>

								{inquiryResult && (
									<View
										style={[
											styles.inquiryAlert,
											{
												backgroundColor: inquiryResult === 'mafia' ? theme.danger : theme.success,
											},
										]}
									>
										<AppText style={styles.inquiryAlertText}>
											{selectedTarget} یک{' '}
											{inquiryResult === 'mafia' ? 'مافیا است 👍' : 'شهروند است 👎'}
										</AppText>
									</View>
								)}
							</View>
						)}
					</ScrollView>

					<TouchableOpacity
						style={[styles.doneBtn, { backgroundColor: theme.textLight }]}
						onPress={() => confirmPlayerAction(activePlayer)}
					>
						<AppText style={[styles.doneBtnText, { color: theme.bgDark }]}>ثبت و نفر بعد</AppText>
					</TouchableOpacity>
				</View>
			)}

			{phase === 'CONCLUDING' && (
				<View style={styles.centerContainer}>
					<ActivityIndicator size="large" color={theme.textLight} />
					<AppText style={[styles.introText, { color: theme.textLight }]}>
						شب به پایان می‌رسد. بیدارباش شهر...
					</AppText>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	header: {
		flexDirection: 'row-reverse',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
	introText: { fontSize: 22 },
	mafiaTimerLabel: { fontSize: 18 },
	timerText: { fontFamily: FONTS.bold, fontSize: 140 },
	selectionInstruction: { fontSize: 16, marginBottom: 12 },
	playerCard: {
		flex: 1,
		margin: 6,
		height: 80,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
	},
	playerCardSeen: { opacity: 0.3 },
	playerCardText: { fontSize: 20 },
	actContainer: { flex: 1, borderRadius: 20, padding: 16 },
	actTimerText: { fontSize: 52, fontFamily: FONTS.bold, textAlign: 'center' },
	actPlayerTitle: { fontSize: 20, textAlign: 'center', marginBottom: 12 },
	actScroll: { flex: 1, marginBottom: 12 },
	selectorLabel: { fontSize: 15, marginBottom: 8, textAlign: 'right' },
	targetOption: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 10,
		marginBottom: 6,
		alignItems: 'center',
	},
	targetOptionText: { color: '#fff', fontSize: 18 },
	lecterShotBox: { marginTop: 16, padding: 12, backgroundColor: '#4a3f13', borderRadius: 12 },
	lecterShotLabel: { color: '#fff', marginBottom: 8, textAlign: 'right' },
	inquiryBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
	inquiryBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 18 },
	inquiryAlert: { marginTop: 8, padding: 12, borderRadius: 10, alignItems: 'center' },
	inquiryAlertText: { color: '#fff', fontSize: 16 },
	doneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
	doneBtnText: { fontFamily: FONTS.bold, fontSize: 16 },
});
