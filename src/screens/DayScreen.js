import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import SoundService from '../services/soundService';
import { FONTS, globalStyles } from '../styles/theme';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { toPersianDigits } from '../utils/persianDigits';
import {
	getMinDefenseVotes,
	getQualifyingCandidates,
	determineFinalVotingResult,
} from '../logic/voting';

export default function DayScreen({
	players,
	dayCount,
	lastNightResults,
	gameHistory,
	onStartNight,
	onVoteOut,
	gameOverState,
}) {
	const { theme } = useTheme();

	const [timerSeconds, setTimerSeconds] = useState(null);
	const [showNightConfirmModal, setShowNightConfirmModal] = useState(false);

	const isAfterActionNight = dayCount >= 2 && !!lastNightResults;
	const [showResultsModal, setShowResultsModal] = useState(isAfterActionNight);

	// GL-006 Complete Voting Workflow State
	const [votingConcludedToday, setVotingConcludedToday] = useState(false);
	const [showVoteModal, setShowVoteModal] = useState(false);
	const [votingStage, setVotingStage] = useState('INITIAL'); // 'INITIAL' | 'DEFENSE'
	const [eligibleVoters, setEligibleVoters] = useState([]);
	const [frozenLivingCount, setFrozenLivingCount] = useState(0);
	const [initialVotes, setInitialVotes] = useState({});
	const [defenseCandidates, setDefenseCandidates] = useState([]);
	const [finalVotes, setFinalVotes] = useState({});
	const [defenseTimerSeconds, setDefenseTimerSeconds] = useState(null);
	const [defenseTimerRunning, setDefenseTimerRunning] = useState(false);
	const [votingError, setVotingError] = useState(null);

	const timerIntervalRef = useRef(null);
	const defenseTimerIntervalRef = useRef(null);
	const narratedDayRef = useRef(-1); // Ensures narration only happens once per day
	const submittingVoteRef = useRef(false);

	const alivePlayers = players.filter((p) => p.isAlive);
	const isThreePlayersLeft = alivePlayers.length === 3;
	const initialVoteLimit = Math.max(0, frozenLivingCount - 1);
	const finalVoteLimit = Math.max(0, frozenLivingCount - defenseCandidates.length);

	useEffect(() => {
		if (isAfterActionNight && narratedDayRef.current !== dayCount) {
			narratedDayRef.current = dayCount;
			narrateNightResults();
		}
	}, [dayCount, isAfterActionNight]);

	const narrateNightResults = async () => {
		await SoundService.wait(0.6);
		await SoundService.playAndWait('about');
		await SoundService.wait(0.3);

		// 1. Announce killed players
		const losses = lastNightResults?.losses || [];
		if (losses.length > 0) {
			await SoundService.playAndWait('loss0');
			if (losses.length >= 1 && losses.length <= 5) {
				await SoundService.playAndWait(losses.length.toString());
			}
			await SoundService.playAndWait('loss1');
			await SoundService.wait(0.4);
		} else {
			await SoundService.playAndWait('noLoss');
			await SoundService.wait(0.4);
		}

		// 2. If a player successfully returned to the game, play the resurrection announcement
		if (lastNightResults?.returned) {
			await SoundService.playAndWait('resurrection');
			await SoundService.wait(0.4);
		}

		// 3. If Invincible requested an inquiry, announce the inquiry result
		if (lastNightResults?.enquiry) {
			await SoundService.playAndWait('enquiryIntro');
			await SoundService.wait(0.3);

			const deads = players.filter((p) => !p.isAlive);
			const deadMafia = deads.filter((p) => p.side === 'mafia').length;
			const deadCity = deads.filter((p) => p.side === 'city').length;

			if (deadMafia + deadCity === 0) {
				await SoundService.playAndWait('enquiryNoLoss');
				await SoundService.wait(0.3);
			} else {
				if (deadMafia > 0) {
					if (deadMafia <= 5) await SoundService.playAndWait(deadMafia.toString());
					await SoundService.playAndWait('enquiry0');
					await SoundService.wait(0.2);
					if (deadCity > 0) await SoundService.playAndWait('enquiry1');
				}
				if (deadCity > 0) {
					if (deadCity <= 5) await SoundService.playAndWait(deadCity.toString());
					await SoundService.playAndWait('enquiry2');
					await SoundService.wait(0.2);
				}
				await SoundService.playAndWait('enquiry3');
				await SoundService.wait(0.3);
			}
		} else {
			await SoundService.playAndWait('noEnquiry');
			await SoundService.wait(0.4);
		}

		// 4. Continue any remaining existing narration steps in their established order
		if (lastNightResults?.silenced) {
			await SoundService.playAndWait('silence');
			await SoundService.wait(0.4);
		}
	};

	const startTimer = (seconds) => {
		if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
		SoundService.stopOneShotSounds();
		setTimerSeconds(seconds);

		timerIntervalRef.current = setInterval(() => {
			setTimerSeconds((prev) => {
				if (prev === null) return null;
				if (prev <= 1) {
					clearInterval(timerIntervalRef.current);
					return 0;
				}
				const next = prev - 1;
				if (next === 10) SoundService.playSound('lastWord');
				if (next === 3) SoundService.playSound('countdown3');
				return next;
			});
		}, 1000);
	};

	const resetTimer = () => {
		if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
		SoundService.stopOneShotSounds();
		setTimerSeconds(null);
	};

	// Clean up timers on unmount
	useEffect(() => {
		return () => {
			if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
			if (defenseTimerIntervalRef.current) clearInterval(defenseTimerIntervalRef.current);
		};
	}, []);

	// Reset daily voting state when a new day begins or players reset
	useEffect(() => {
		setVotingConcludedToday(false);
		stopDefenseTimer();
		setDefenseTimerSeconds(null);
		setShowVoteModal(false);
		setVotingStage('INITIAL');
		setVotingError(null);
		submittingVoteRef.current = false;
	}, [dayCount]);

	// Open the elimination modal and freeze eligible living players
	const openVotingModal = () => {
		if (votingConcludedToday) return;
		const living = players.filter((p) => p.isAlive);
		const initialMap = {};
		living.forEach((p) => {
			initialMap[p.id] = 0;
		});
		setEligibleVoters(living);
		setFrozenLivingCount(living.length);
		setInitialVotes(initialMap);
		setDefenseCandidates([]);
		setFinalVotes({});
		setVotingStage('INITIAL');
		setVotingError(null);
		stopDefenseTimer();
		setDefenseTimerSeconds(null);
		submittingVoteRef.current = false;
		setShowVoteModal(true);
	};

	const closeVotingModal = () => {
		stopDefenseTimer();
		setDefenseTimerSeconds(null);
		setShowVoteModal(false);
		setVotingStage('INITIAL');
		setVotingError(null);
		submittingVoteRef.current = false;
	};

	const changeInitialVote = (playerId, delta) => {
		setVotingError(null);
		setInitialVotes((prev) => {
			const current = prev[playerId] || 0;
			const next = Math.min(initialVoteLimit, Math.max(0, current + delta));
			return { ...prev, [playerId]: next };
		});
	};

	const handleProceedToDefense = () => {
		const qualified = getQualifyingCandidates(eligibleVoters, initialVotes, frozenLivingCount);
		if (qualified.length === 0) {
			setVotingError('هیچ بازیکنی به حد نصاب دفاعیه نرسید.');
			return;
		}
		setVotingError(null);
		setDefenseCandidates(qualified);
		const finalMap = {};
		qualified.forEach((c) => {
			finalMap[c.id] = 0;
		});
		setFinalVotes(finalMap);
		stopDefenseTimer();
		setDefenseTimerSeconds(null);
		setVotingStage('DEFENSE');
	};

	const changeFinalVote = (candidateId, delta) => {
		setFinalVotes((prev) => {
			const current = prev[candidateId] || 0;
			const next = Math.min(finalVoteLimit, Math.max(0, current + delta));
			return { ...prev, [candidateId]: next };
		});
	};

	const startDefenseTimer = () => {
		if (defenseTimerIntervalRef.current) clearInterval(defenseTimerIntervalRef.current);
		SoundService.stopOneShotSounds();
		setDefenseTimerSeconds(60);
		setDefenseTimerRunning(true);

		defenseTimerIntervalRef.current = setInterval(() => {
			setDefenseTimerSeconds((prev) => {
				if (prev === null) return null;
				if (prev <= 1) {
					clearInterval(defenseTimerIntervalRef.current);
					defenseTimerIntervalRef.current = null;
					setDefenseTimerRunning(false);
					return 0;
				}
				const next = prev - 1;
				if (next === 10) SoundService.playSound('lastWord');
				if (next === 3) SoundService.playSound('countdown3');
				return next;
			});
		}, 1000);
	};

	const stopDefenseTimer = () => {
		if (defenseTimerIntervalRef.current) {
			clearInterval(defenseTimerIntervalRef.current);
			defenseTimerIntervalRef.current = null;
		}
		SoundService.stopOneShotSounds();
		setDefenseTimerRunning(false);
	};

	const resetDefenseTimer = () => {
		stopDefenseTimer();
		setDefenseTimerSeconds(null);
	};

	const handleFinalVoteSubmit = () => {
		if (submittingVoteRef.current) return;
		submittingVoteRef.current = true;

		const result = determineFinalVotingResult(defenseCandidates, finalVotes, frozenLivingCount);

		stopDefenseTimer();
		setShowVoteModal(false);
		setVotingConcludedToday(true);

		if (result.outcome === 'ELIMINATE' && result.candidate) {
			onVoteOut(result.candidate.id);
		}
	};

	const getLossesText = () => {
		if (
			lastNightResults?.losses &&
			Array.isArray(lastNightResults.losses) &&
			lastNightResults.losses.length > 0
		) {
			return lastNightResults.losses.join('، ');
		}
		return 'هیچکس';
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
						{dayCount === 0 ? 'روز معارفه' : `روز ${toPersianDigits(dayCount)}`}
					</AppText>
				</View>
			</View>

			{/* Main Center Area: Active Timer OR Timeline Ledger */}
			<View style={styles.centerContainer}>
				{timerSeconds !== null && timerSeconds > 0 ? (
					<TouchableOpacity
						style={styles.timerDisplayTouch}
						onPress={resetTimer}
						activeOpacity={0.8}
					>
						<AppText style={[styles.timerText, { color: theme.textLight }]}>
							{toPersianDigits(timerSeconds)}
						</AppText>
						<AppText style={[styles.timerCancelHint, { color: theme.textMuted }]}>
							(برای بازگشت به وقایع لمس کنید)
						</AppText>
					</TouchableOpacity>
				) : (
					<View
						style={[
							styles.ledgerContainer,
							{ backgroundColor: theme.cardDark, borderColor: theme.border },
						]}
					>
						<View style={styles.ledgerHeader}>
							<AppText weight="bold" style={[styles.ledgerTitle, { color: theme.gold }]}>
								📜 وقایع ثبت‌شده شهر
							</AppText>
						</View>
						<ScrollView
							style={styles.ledgerScroll}
							contentContainerStyle={styles.ledgerScrollContent}
							nestedScrollEnabled
						>
							{gameHistory && gameHistory.length > 0 ? (
								[...gameHistory].reverse().map((entry) => (
									<View
										key={entry.id}
										style={[
											styles.ledgerItem,
											{
												backgroundColor: theme.surface,
												borderRightColor: entry.type === 'NIGHT' ? theme.nightBlue : theme.mafiaRed,
											},
										]}
									>
										<AppText weight="bold" style={[styles.entryTitle, { color: theme.textLight }]}>
											{toPersianDigits(entry.title)}
										</AppText>
										{entry.type === 'INTRO' && (
											<AppText style={[styles.entryBody, { color: theme.textMuted }]}>
												{entry.description}
											</AppText>
										)}
										{entry.type === 'NIGHT' && (
											<View style={styles.entryDetails}>
												<AppText style={[styles.entryBody, { color: theme.textLight }]}>
													☠️ کشته‌ها:{' '}
													<AppText
														weight="bold"
														style={{
															color: entry.losses.length > 0 ? theme.danger : theme.textMuted,
														}}
													>
														{entry.losses.length > 0 ? entry.losses.join('، ') : 'هیچکس'}
													</AppText>
												</AppText>
												{entry.returned && (
													<AppText style={[styles.entryBody, { color: theme.success }]}>
														✨ بازگشت به بازی: <AppText weight="bold">{entry.returned}</AppText>
													</AppText>
												)}
												{entry.silenced && (
													<AppText style={[styles.entryBody, { color: theme.warning }]}>
														🤫 سایلنت: {entry.silenced}
													</AppText>
												)}
												{entry.enquiry && entry.enquiryTally && (
													<AppText style={[styles.entryBody, { color: theme.citizenBlue }]}>
														🪦 استعلام: {toPersianDigits(entry.enquiryTally.deadMafia)} مافیا و{' '}
														{toPersianDigits(entry.enquiryTally.deadCity)} شهروند
													</AppText>
												)}
											</View>
										)}
										{entry.type === 'VOTEOUT' && (
											<AppText style={[styles.entryBody, { color: theme.danger }]}>
												🚫 خروج با رأی‌گیری: <AppText weight="bold">{entry.playerName}</AppText>
											</AppText>
										)}
									</View>
								))
							) : (
								<AppText style={[styles.emptyLedgerText, { color: theme.textMuted }]}>
									هنوز رخدادی در بازی ثبت نشده است.
								</AppText>
							)}
						</ScrollView>
					</View>
				)}
			</View>

			{/* Control Buttons */}
			<View style={styles.controlsContainer}>
				{isThreePlayersLeft ? (
					<>
						<TouchableOpacity
							style={[
								styles.btn,
								styles.chaosBtn,
								{ backgroundColor: theme.surface, borderColor: theme.border },
							]}
							onPress={() => startTimer(180)}
						>
							<AppText style={[styles.btnText, { color: theme.textLight }]}>شروع ۳ نفره</AppText>
							<AppText style={[styles.btnSubText, { color: theme.textMuted }]}>۱۸۰ ثانیه</AppText>
						</TouchableOpacity>
						{!votingConcludedToday && (
							<TouchableOpacity
								style={[styles.btn, styles.voteContainerBtn, { borderColor: theme.danger }]}
								onPress={openVotingModal}
							>
								<AppText style={[styles.voteBtnText, { color: theme.danger }]}>
									خروج با رأی‌گیری 🚫
								</AppText>
							</TouchableOpacity>
						)}
					</>
				) : (
					<>
						<TouchableOpacity
							style={[styles.btn, styles.nightBtn, { backgroundColor: theme.nightBlue }]}
							onPress={() => setShowNightConfirmModal(true)}
						>
							<AppText style={[styles.nightBtnText, { color: theme.textLight }]}>
								اعلام شب 💤
							</AppText>
						</TouchableOpacity>
						{!votingConcludedToday && (
							<TouchableOpacity
								style={[styles.btn, styles.voteContainerBtn, { borderColor: theme.danger }]}
								onPress={openVotingModal}
							>
								<AppText style={[styles.voteBtnText, { color: theme.danger }]}>
									خروج با رأی‌گیری 🚫
								</AppText>
							</TouchableOpacity>
						)}
						<View style={styles.timerBtnRow}>
							<TouchableOpacity
								style={[
									styles.btn,
									styles.challengeBtn,
									{ backgroundColor: theme.surface, borderColor: theme.border },
								]}
								onPress={() => startTimer(30)}
							>
								<AppText style={[styles.btnText, { color: theme.textLight }]}>چالش</AppText>
								<AppText style={[styles.btnSubText, { color: theme.textMuted }]}>۳۰ ثانیه</AppText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.btn,
									styles.turnBtn,
									{ backgroundColor: theme.surface, borderColor: theme.border },
								]}
								onPress={() => startTimer(60)}
							>
								<AppText style={[styles.btnText, { color: theme.textLight }]}>نوبت</AppText>
								<AppText style={[styles.btnSubText, { color: theme.textMuted }]}>۶۰ ثانیه</AppText>
							</TouchableOpacity>
						</View>
					</>
				)}
			</View>

			{/* Night Results Modal */}
			<Modal visible={showResultsModal} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={[styles.resultsContainer, { backgroundColor: theme.gold }]}>
						<AppText style={styles.resultsTitle}>گزارش اتفاقات شب گذشته</AppText>
						<ScrollView style={{ maxHeight: 250, width: '100%' }}>
							<AppText style={[styles.resultsHeader, { borderColor: theme.border }]}>
								☠️ کشته‌ها:
							</AppText>
							<AppText style={styles.resultsBody}>{getLossesText()}</AppText>
							<AppText style={[styles.resultsHeader, { borderColor: theme.border }]}>
								✨ بازگشت به بازی:
							</AppText>
							<AppText style={styles.resultsBody}>
								{lastNightResults?.returned ? lastNightResults.returned : 'هیچکس'}
							</AppText>
							<AppText style={[styles.resultsHeader, { borderColor: theme.border }]}>
								🤫 سایلنت شده:
							</AppText>
							<AppText style={styles.resultsBody}>
								{lastNightResults?.silenced ? lastNightResults.silenced : 'هیچکس'}
							</AppText>
							<AppText style={[styles.resultsHeader, { borderColor: theme.border }]}>
								🪦 استعلام جان‌سخت:
							</AppText>
							<AppText style={styles.resultsBody}>
								{lastNightResults?.enquiry
									? `بله (${toPersianDigits(
											players.filter((p) => !p.isAlive && p.side === 'mafia').length,
										)} مافیا و ${toPersianDigits(
											players.filter((p) => !p.isAlive && p.side === 'city').length,
										)} شهروند)`
									: 'نداشت'}
							</AppText>
						</ScrollView>
						<TouchableOpacity
							style={[
								styles.resultsCloseBtn,
								{ backgroundColor: theme.warning, borderColor: theme.border },
							]}
							onPress={() => setShowResultsModal(false)}
						>
							<AppText style={[styles.resultsCloseBtnText, { color: theme.textDark }]}>
								شروع روز ⛅
							</AppText>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* GL-006 Elimination / Voting Modal */}
			<Modal visible={showVoteModal} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.voteModalContainer,
							{ backgroundColor: theme.cardDark, borderColor: theme.border },
						]}
					>
						{votingStage === 'INITIAL' ? (
							<>
								<AppText style={[styles.voteModalTitle, { color: theme.textLight }]}>
									رأی‌گیری اولیه خروج
								</AppText>
								<AppText style={[styles.voteModalSubtitle, { color: theme.textMuted }]}>
									حدنصاب ورود به دفاعیه: {toPersianDigits(getMinDefenseVotes(frozenLivingCount))}{' '}
									رأی (از {toPersianDigits(frozenLivingCount)} نفر)
								</AppText>

								{votingError && (
									<View
										style={[
											styles.votingErrorBox,
											{ backgroundColor: '#3d1212', borderColor: theme.danger },
										]}
									>
										<AppText style={[styles.votingErrorText, { color: theme.danger }]}>
											{votingError}
										</AppText>
									</View>
								)}

								<ScrollView
									style={{ width: '100%' }}
									contentContainerStyle={{ paddingVertical: 4 }}
								>
									{eligibleVoters.map((player) => {
										const count = initialVotes[player.id] || 0;
										const isQualified = count >= frozenLivingCount / 2;
										const hasReachedVoteLimit = count >= initialVoteLimit;
										return (
											<View
												key={player.id}
												style={[
													styles.voteItemRow,
													{ backgroundColor: theme.surface, borderColor: theme.border },
													isQualified && {
														borderColor: theme.danger,
														borderWidth: 2,
														backgroundColor: '#300f0b',
													},
												]}
											>
												<View style={styles.counterRow}>
													<TouchableOpacity
														testID={`minus-initial-${player.id}`}
														style={[
															styles.counterBtn,
															{ backgroundColor: theme.cardDark, borderColor: theme.border },
															count === 0 && { opacity: 0.35 },
														]}
														disabled={count === 0}
														onPress={() => changeInitialVote(player.id, -1)}
													>
														<AppText style={[styles.counterBtnText, { color: theme.textLight }]}>
															-
														</AppText>
													</TouchableOpacity>
													<AppText style={[styles.counterValue, { color: theme.textLight }]}>
														{toPersianDigits(count)}
													</AppText>
													<TouchableOpacity
														testID={`plus-initial-${player.id}`}
														style={[
															styles.counterBtn,
															{ backgroundColor: theme.cardDark, borderColor: theme.border },
															hasReachedVoteLimit && { opacity: 0.35 },
														]}
														disabled={hasReachedVoteLimit}
														onPress={() => changeInitialVote(player.id, 1)}
													>
														<AppText style={[styles.counterBtnText, { color: theme.textLight }]}>
															+
														</AppText>
													</TouchableOpacity>
												</View>
												<AppText
													style={[
														styles.votePlayerName,
														{ color: theme.textLight },
														isQualified && { fontFamily: FONTS.bold },
													]}
												>
													{player.name} {isQualified ? '💬' : ''}
												</AppText>
											</View>
										);
									})}
								</ScrollView>

								<View style={styles.voteActions}>
									<TouchableOpacity
										style={[styles.voteCancelBtn, { backgroundColor: theme.surface }]}
										onPress={closeVotingModal}
									>
										<AppText style={[styles.voteCancelText, { color: theme.textLight }]}>
											انصراف
										</AppText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.voteConfirmBtn, { backgroundColor: theme.warning }]}
										onPress={handleProceedToDefense}
									>
										<AppText style={[styles.voteConfirmText, { color: theme.textDark }]}>
											ثبت رأی اولیه و ورود به دفاعیه
										</AppText>
									</TouchableOpacity>
								</View>
							</>
						) : (
							<>
								<View style={styles.defenseTitleRow}>
									<AppText style={[styles.voteModalTitle, { color: theme.textLight }]}>
										مرحله دفاعیه
									</AppText>
								</View>

								{/* Defense Timer */}
								{defenseTimerRunning ? (
									<TouchableOpacity
										testID="dismiss-defense-timer"
										style={[
											styles.defenseTimerBox,
											{ backgroundColor: theme.surface, borderColor: theme.border },
										]}
										onPress={resetDefenseTimer}
										activeOpacity={0.8}
									>
										<AppText style={[styles.defenseTimerValue, { color: theme.textLight }]}>
											⏱️ {toPersianDigits(defenseTimerSeconds)} ثانیه
										</AppText>
										<AppText style={[styles.timerCancelHint, { color: theme.textMuted }]}>
											(برای لغو لمس کنید)
										</AppText>
									</TouchableOpacity>
								) : (
									<View
										style={[
											styles.defenseTimerBox,
											{ backgroundColor: theme.surface, borderColor: theme.border },
										]}
									>
										<AppText style={[styles.defenseTimerValue, { color: theme.textLight }]}>
											⏱️ {toPersianDigits(defenseTimerSeconds !== null ? defenseTimerSeconds : 60)}{' '}
											ثانیه
										</AppText>
										<TouchableOpacity
											testID="start-defense-timer"
											style={[styles.defenseTimerStartBtn, { backgroundColor: theme.warning }]}
											onPress={startDefenseTimer}
										>
											<AppText style={[styles.defenseTimerStartBtnText, { color: theme.textDark }]}>
												شروع زمان دفاع (۶۰ ثانیه)
											</AppText>
										</TouchableOpacity>
									</View>
								)}

								{defenseCandidates.length === 1 ? (
									<AppText style={[styles.defenseThresholdTitle, { color: theme.textMuted }]}>
										حدنصاب خروج: {toPersianDigits(getMinDefenseVotes(frozenLivingCount))} رأی
									</AppText>
								) : (
									<AppText
										style={[styles.voteModalSubtitle, { color: theme.textMuted, marginTop: 4 }]}
									>
										نامزدهای دفاعیه ({toPersianDigits(defenseCandidates.length)} نفر):
									</AppText>
								)}

								<ScrollView
									style={{ width: '100%' }}
									contentContainerStyle={{ paddingVertical: 4 }}
								>
									{defenseCandidates.map((candidate) => {
										const count = finalVotes[candidate.id] || 0;
										const hasReachedVoteLimit = count >= finalVoteLimit;
										const isQualified =
											determineFinalVotingResult(defenseCandidates, finalVotes, frozenLivingCount)
												.candidate?.id === candidate.id;
										return (
											<View
												key={candidate.id}
												style={[
													styles.voteItemRow,
													{ backgroundColor: theme.surface, borderColor: theme.border },
													isQualified && {
														borderColor: theme.danger,
														borderWidth: 2,
														backgroundColor: '#300f0b',
													},
												]}
											>
												<View style={styles.counterRow}>
													<TouchableOpacity
														testID={`minus-final-${candidate.id}`}
														style={[
															styles.counterBtn,
															{ backgroundColor: theme.cardDark, borderColor: theme.border },
															count === 0 && { opacity: 0.35 },
														]}
														disabled={count === 0}
														onPress={() => changeFinalVote(candidate.id, -1)}
													>
														<AppText style={[styles.counterBtnText, { color: theme.textLight }]}>
															-
														</AppText>
													</TouchableOpacity>
													<AppText style={[styles.counterValue, { color: theme.textLight }]}>
														{toPersianDigits(count)}
													</AppText>
													<TouchableOpacity
														testID={`plus-final-${candidate.id}`}
														style={[
															styles.counterBtn,
															{ backgroundColor: theme.cardDark, borderColor: theme.border },
															hasReachedVoteLimit && { opacity: 0.35 },
														]}
														disabled={hasReachedVoteLimit}
														onPress={() => changeFinalVote(candidate.id, 1)}
													>
														<AppText style={[styles.counterBtnText, { color: theme.textLight }]}>
															+
														</AppText>
													</TouchableOpacity>
												</View>
												<AppText
													style={[
														styles.votePlayerName,
														{ color: theme.textLight },
														isQualified && { fontFamily: FONTS.bold },
													]}
												>
													{candidate.name} {isQualified ? '❌' : ''}
												</AppText>
											</View>
										);
									})}
								</ScrollView>

								{(() => {
									const finalAction = determineFinalVotingResult(
										defenseCandidates,
										finalVotes,
										frozenLivingCount,
									);
									return (
										<View style={styles.voteActions}>
											<TouchableOpacity
												style={[styles.voteCancelBtn, { backgroundColor: theme.surface }]}
												onPress={closeVotingModal}
											>
												<AppText style={[styles.voteCancelText, { color: theme.textLight }]}>
													انصراف
												</AppText>
											</TouchableOpacity>
											<TouchableOpacity
												style={[
													styles.voteConfirmBtn,
													{
														backgroundColor:
															finalAction.outcome === 'ELIMINATE' ? theme.mafiaRed : theme.warning,
													},
												]}
												onPress={handleFinalVoteSubmit}
											>
												<AppText
													style={[
														styles.voteConfirmText,
														{
															color: finalAction.outcome === 'ELIMINATE' ? '#fff' : theme.textDark,
														},
													]}
												>
													{finalAction.buttonLabel}
												</AppText>
											</TouchableOpacity>
										</View>
									);
								})()}
							</>
						)}
					</View>
				</View>
			</Modal>

			{/* Night Confirmation Modal */}
			<Modal visible={showNightConfirmModal} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View
						style={[
							styles.confirmModalContainer,
							{ backgroundColor: theme.cardDark, borderColor: theme.border },
						]}
					>
						<AppText style={[styles.confirmModalTitle, { color: theme.textLight }]}>
							آیا از اعلام شب اطمینان دارید؟
						</AppText>
						<AppText style={[styles.confirmModalSubtitle, { color: theme.textMuted }]}>
							با ورود به شب، شهر به خواب رفته و امکان بازگشت به این روز وجود ندارد.
						</AppText>
						<View style={styles.confirmActions}>
							<TouchableOpacity
								style={[
									styles.cancelBtn,
									{ backgroundColor: theme.surface, borderColor: theme.border },
								]}
								onPress={() => setShowNightConfirmModal(false)}
							>
								<AppText style={[styles.cancelBtnText, { color: theme.textLight }]}>انصراف</AppText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.confirmBtn, { backgroundColor: theme.nightBlue }]}
								onPress={() => {
									setShowNightConfirmModal(false);
									onStartNight();
								}}
							>
								<AppText style={styles.confirmBtnText}>بله، شروع شب 🌙</AppText>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, justifyContent: 'space-between' },
	header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
	centerContainer: { flex: 1, marginVertical: 10, justifyContent: 'center' },
	timerDisplayTouch: { alignItems: 'center', justifyContent: 'center' },
	timerText: { fontFamily: FONTS.bold, fontSize: 130 },
	timerCancelHint: { fontFamily: FONTS.regular, fontSize: 13 },
	ledgerContainer: { flex: 1, borderRadius: 18, padding: 14, borderWidth: 1 },
	ledgerHeader: {
		borderBottomWidth: 1,
		borderColor: 'rgba(255,255,255,0.08)',
		paddingBottom: 8,
		marginBottom: 8,
	},
	ledgerTitle: { fontSize: 16, textAlign: 'right' },
	ledgerScroll: { flex: 1 },
	ledgerScrollContent: { gap: 8, paddingVertical: 4 },
	ledgerItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderRightWidth: 4 },
	entryTitle: { fontSize: 15, textAlign: 'right', marginBottom: 4 },
	entryBody: { fontFamily: FONTS.regular, fontSize: 13, textAlign: 'right', lineHeight: 20 },
	entryDetails: { gap: 2 },
	emptyLedgerText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
	controlsContainer: { gap: 10 },
	timerBtnRow: { flexDirection: 'row', gap: 10 },
	btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	turnBtn: { flex: 1, aspectRatio: 1, borderWidth: 1 },
	chaosBtn: { aspectRatio: 1, borderWidth: 1 },
	challengeBtn: { flex: 1, aspectRatio: 1, borderWidth: 1 },
	btnText: { fontFamily: FONTS.bold, fontSize: 26 },
	btnSubText: { fontSize: 18 },
	voteContainerBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
	voteBtnText: { fontSize: 18 },
	nightBtn: { paddingVertical: 16 },
	nightBtnText: { fontFamily: FONTS.bold, fontSize: 20 },
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	resultsContainer: {
		width: '100%',
		borderRadius: 20,
		padding: 20,
		paddingBottom: 18,
		alignItems: 'center',
	},
	resultsTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#000', marginBottom: 12 },
	resultsHeader: {
		fontFamily: FONTS.bold,
		borderTopWidth: 1,
		paddingTop: 4,
		fontSize: 16,
		color: '#000',
		lineHeight: 26,
		textAlign: 'right',
		writingDirection: 'rtl',
	},
	resultsBody: {
		fontSize: 16,
		color: '#000',
		lineHeight: 24,
		textAlign: 'center',
		writingDirection: 'rtl',
		marginBottom: 20,
	},
	resultsCloseBtn: {
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 12,
		borderWidth: 1,
		marginTop: 16,
		width: '100%',
		alignItems: 'center',
	},
	resultsCloseBtnText: { fontFamily: FONTS.bold, fontSize: 18 },
	voteModalContainer: {
		maxHeight: '85%',
		width: '100%',
		borderRadius: 20,
		padding: 20,
		paddingTop: 18,
		alignItems: 'center',
		borderWidth: 1,
	},
	voteModalTitle: { fontFamily: FONTS.bold, fontSize: 18, marginBottom: 4 },
	defenseTitleRow: { alignItems: 'center', marginBottom: 4 },
	defenseThresholdTitle: { fontSize: 13, marginBottom: 4 },
	voteModalSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
	votingErrorBox: {
		width: '100%',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 10,
		alignItems: 'center',
	},
	votingErrorText: { fontSize: 14, fontFamily: FONTS.bold, textAlign: 'center' },
	voteItemRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 10,
		marginBottom: 8,
		borderWidth: 1,
	},
	votePlayerName: {
		fontSize: 17,
		flex: 1,
		textAlign: 'right',
		writingDirection: 'rtl',
		marginEnd: 14,
	},
	counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	counterBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	counterBtnText: {
		fontSize: 20,
		fontFamily: FONTS.bold,
		textAlign: 'center',
		includeFontPadding: false,
	},
	counterValue: { fontSize: 18, fontFamily: FONTS.bold, minWidth: 24, textAlign: 'center' },
	defenseTimerBox: {
		width: '100%',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	defenseTimerValue: { fontSize: 22, fontFamily: FONTS.bold },
	defenseTimerRunningText: { fontSize: 15, fontFamily: FONTS.bold },
	defenseTimerStartBtn: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 4,
	},
	defenseTimerStartBtnText: { fontSize: 15, fontFamily: FONTS.bold },
	voteActions: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
	voteCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
	voteCancelText: { fontFamily: FONTS.bold },
	voteConfirmBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
	voteConfirmText: { fontFamily: FONTS.bold, textAlign: 'center' },
	confirmModalContainer: {
		width: '100%',
		borderRadius: 20,
		padding: 22,
		alignItems: 'center',
		borderWidth: 1,
	},
	confirmModalTitle: { fontSize: 18, textAlign: 'center', marginBottom: 8 },
	confirmModalSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
	confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
	cancelBtn: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 12,
		borderWidth: 1,
	},
	cancelBtnText: { fontFamily: FONTS.bold, fontSize: 15 },
	confirmBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
	confirmBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
