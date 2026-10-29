import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import DayScreen from '../src/screens/DayScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import SoundService from '../src/services/soundService';

const makePlayer = (id, side, name) => ({
	id,
	name,
	character: side === 'mafia' ? 'godfather' : 'citizen',
	side,
	isAlive: true,
});

const threePlayers = [
	makePlayer('1', 'mafia', 'آوا'),
	makePlayer('2', 'city', 'بهرام'),
	makePlayer('3', 'city', 'ترانه'),
];

const fourPlayers = [
	makePlayer('1', 'mafia', 'آوا'),
	makePlayer('2', 'city', 'بهرام'),
	makePlayer('3', 'city', 'ترانه'),
	makePlayer('4', 'city', 'داوود'),
];

const baseProps = {
	lastNightResults: null,
	gameHistory: [],
	onStartNight: jest.fn(),
	onVoteOut: jest.fn(),
	gameOverState: null,
};

function renderDay(props = {}) {
	return render(
		<ThemeProvider>
			<DayScreen players={threePlayers} dayCount={1} {...baseProps} {...props} />
		</ThemeProvider>,
	);
}

describe('GL-001 three-player day', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('keeps the 3-player timer and elimination, with no night control', () => {
		const { getByText, queryByText } = renderDay();

		expect(getByText('شروع ۳ نفره')).toBeTruthy();
		expect(getByText('خروج با رأی‌گیری 🚫')).toBeTruthy();
		expect(queryByText('اعلام شب 💤')).toBeNull();
	});

	test('elimination goes through the existing player-selection modal', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId } = renderDay({ onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		expect(getByText('رأی‌گیری اولیه خروج')).toBeTruthy();

		// Bahram gets 2 initial votes (threshold for 3 players is 1.5, min 2)
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));

		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('مرحله دفاعیه')).toBeTruthy();

		// Bahram is sole candidate (Case 0). Give Bahram 2 final votes (threshold 2)
		fireEvent.press(getByTestId('plus-final-2'));
		fireEvent.press(getByTestId('plus-final-2'));

		const confirmBtn = getByText('ثبت و خروج بهرام');
		expect(confirmBtn).toBeTruthy();
		fireEvent.press(confirmBtn);

		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('2');
	});

	test('repeat confirmation does not emit duplicate eliminations', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId } = renderDay({ onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		fireEvent.press(getByTestId('plus-final-2'));
		fireEvent.press(getByTestId('plus-final-2'));

		const confirmBtn = getByText('ثبت و خروج بهرام');
		fireEvent.press(confirmBtn);
		fireEvent.press(confirmBtn);

		expect(onVoteOut).toHaveBeenCalledTimes(1);
	});

	test('day zero three-player keeps intro behavior without a night button', () => {
		const { getByText, queryByText } = renderDay({ dayCount: 0 });

		expect(getByText('روز معارفه')).toBeTruthy();
		expect(getByText('شروع ۳ نفره')).toBeTruthy();
		expect(getByText('خروج با رأی‌گیری 🚫')).toBeTruthy();
		expect(queryByText('اعلام شب 💤')).toBeNull();
	});

	test('non-day-zero three-player also has no night button', () => {
		const { queryByText } = renderDay({ dayCount: 2 });

		expect(queryByText('اعلام شب 💤')).toBeNull();
	});
});

describe('GL-005 Constantine public resurrection report & narration', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(SoundService, 'playAndWait').mockResolvedValue();
		jest.spyOn(SoundService, 'wait').mockResolvedValue();
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('daily-results modal announces the returned player when resurrection occurred', () => {
		const lastNightResults = {
			losses: ['آوا'],
			returned: 'بهرام',
			silenced: null,
			enquiry: false,
		};

		const { getByText, getAllByText } = renderDay({
			dayCount: 2,
			lastNightResults,
		});

		expect(getByText('گزارش اتفاقات شب گذشته')).toBeTruthy();
		expect(getByText('✨ بازگشت به بازی')).toBeTruthy();
		expect(getAllByText('بهرام').length).toBeGreaterThanOrEqual(1);
	});

	test('daily-results modal announces هیچکس under resurrection when no player returned', () => {
		const lastNightResults = {
			losses: ['آوا'],
			returned: null,
			silenced: null,
			enquiry: false,
		};

		const { getByText, getAllByText } = renderDay({
			dayCount: 2,
			lastNightResults,
		});

		expect(getByText('گزارش اتفاقات شب گذشته')).toBeTruthy();
		expect(getByText('✨ بازگشت به بازی')).toBeTruthy();
		expect(getAllByText('هیچکس').length).toBeGreaterThanOrEqual(1);
	});

	test('persistent ledger records resurrection associated with the night when it occurred', () => {
		const gameHistory = [
			{
				id: 'night-1',
				type: 'NIGHT',
				title: 'شب ۱',
				losses: ['آوا'],
				returned: 'بهرام',
				silenced: null,
				enquiry: false,
			},
		];

		const { getByText } = renderDay({
			dayCount: 2,
			gameHistory,
		});

		expect(getByText(/بازگشت به بازی:/)).toBeTruthy();
		expect(getByText('بهرام')).toBeTruthy();
	});

	test('persistent ledger omits resurrection line when no player returned', () => {
		const gameHistory = [
			{
				id: 'night-1',
				type: 'NIGHT',
				title: 'شب ۱',
				losses: ['آوا'],
				returned: null,
				silenced: null,
				enquiry: false,
			},
		];

		const { queryByText } = renderDay({
			dayCount: 2,
			gameHistory,
		});

		expect(queryByText(/بازگشت به بازی:/)).toBeNull();
	});

	test('narration sequence plays resurrection after losses and before enquiry/silence', async () => {
		const playAndWaitSpy = jest.spyOn(SoundService, 'playAndWait');
		const lastNightResults = {
			losses: ['آوا'],
			returned: 'بهرام',
			silenced: 'ترانه',
			enquiry: true,
		};

		renderDay({
			dayCount: 2,
			lastNightResults,
		});

		await act(async () => {
			await Promise.resolve();
		});

		const playedKeys = playAndWaitSpy.mock.calls.map((call) => call[0]);

		expect(playedKeys).toContain('resurrection');
		const lossIndex = playedKeys.indexOf('loss0');
		const resurrectionIndex = playedKeys.indexOf('resurrection');
		const enquiryIndex = playedKeys.indexOf('enquiryIntro');
		const silenceIndex = playedKeys.indexOf('silence');

		expect(lossIndex).toBeLessThan(resurrectionIndex);
		expect(resurrectionIndex).toBeLessThan(enquiryIndex);
		expect(enquiryIndex).toBeLessThan(silenceIndex);
	});

	test('narration sequence skips resurrection audio when no player returned', async () => {
		const playAndWaitSpy = jest.spyOn(SoundService, 'playAndWait');
		const lastNightResults = {
			losses: ['آوا'],
			returned: null,
			silenced: 'ترانه',
			enquiry: true,
		};

		renderDay({
			dayCount: 2,
			lastNightResults,
		});

		await act(async () => {
			await Promise.resolve();
		});

		const playedKeys = playAndWaitSpy.mock.calls.map((call) => call[0]);

		expect(playedKeys).not.toContain('resurrection');
		const lossIndex = playedKeys.indexOf('loss0');
		const enquiryIndex = playedKeys.indexOf('enquiryIntro');
		const silenceIndex = playedKeys.indexOf('silence');

		expect(lossIndex).toBeLessThan(enquiryIndex);
		expect(enquiryIndex).toBeLessThan(silenceIndex);
	});
});

describe('GL-006 Complete Voting Workflow', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(SoundService, 'playSound').mockImplementation(() => {});
		jest.spyOn(SoundService, 'stopOneShotSounds').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('opens initial voting modal listing living players with counters and threshold info', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		expect(getByText('رأی‌گیری اولیه خروج')).toBeTruthy();
		// 4 players -> threshold is 2
		expect(getByText(/حدنصاب ورود به دفاعیه: ۲ رأی/)).toBeTruthy();

		expect(getByText('آوا')).toBeTruthy();
		expect(getByText('بهرام')).toBeTruthy();
		expect(getByText('ترانه')).toBeTruthy();
		expect(getByText('داوود')).toBeTruthy();

		expect(getByTestId('plus-initial-1')).toBeTruthy();
		expect(getByTestId('minus-initial-1')).toBeTruthy();
	});

	test('prevents negative vote counts on initial voting', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		const minusBtn = getByTestId('minus-initial-1');

		// Press minus when vote is 0
		fireEvent.press(minusBtn);
		// Proceed to defense should still fail since vote is 0
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('هیچ بازیکنی به حد نصاب دفاعیه نرسید.')).toBeTruthy();
	});

	test('caps vote counts to the eligible voters in both voting stages', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		const initialPlus = getByTestId('plus-initial-1');
		fireEvent.press(initialPlus);
		fireEvent.press(initialPlus);
		fireEvent.press(initialPlus);
		fireEvent.press(initialPlus);
		expect(initialPlus.props.accessibilityState.disabled).toBe(true);

		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		const finalPlus = getByTestId('plus-final-1');
		fireEvent.press(finalPlus);
		fireEvent.press(finalPlus);
		fireEvent.press(finalPlus);
		expect(finalPlus.props.accessibilityState.disabled).toBe(true);
	});

	test('blocks entering defense when zero candidates meet the threshold', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Give 1 vote to player 1 (threshold is 2 for 4 players)
		fireEvent.press(getByTestId('plus-initial-1'));

		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('هیچ بازیکنی به حد نصاب دفاعیه نرسید.')).toBeTruthy();
		// Remains in initial stage, does NOT enter defense
		expect(queryByText('مرحله دفاعیه')).toBeNull();

		// Moderator can correct: give 1 more vote to reach 2
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
	});

	test('allows multiple qualifying candidates into defense stage', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Give 2 votes to Ava, 2 votes to Bahram, 1 vote to Taraneh
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-3'));

		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
		expect(getByText(/نامزدهای دفاعیه \(۲ نفر\)/)).toBeTruthy();

		// Ava and Bahram are listed, Taraneh is NOT listed in defense
		expect(getByTestId('plus-final-1')).toBeTruthy();
		expect(getByTestId('plus-final-2')).toBeTruthy();
		expect(() => getByTestId('plus-final-3')).toThrow();
	});

	test('manages 60-second defense timer with sound cues and allows vote submission after expiration', () => {
		const playSoundSpy = jest.spyOn(SoundService, 'playSound');
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		const startTimerBtn = getByTestId('start-defense-timer');
		expect(getByText(/⏱️ ۶۰ ثانیه/)).toBeTruthy();

		fireEvent.press(startTimerBtn);

		// Advance 50 seconds (10s remaining)
		act(() => {
			jest.advanceTimersByTime(50000);
		});
		expect(playSoundSpy).toHaveBeenCalledWith('lastWord');

		// Advance 7 seconds (3s remaining)
		act(() => {
			jest.advanceTimersByTime(7000);
		});
		expect(playSoundSpy).toHaveBeenCalledWith('countdown3');

		// Advance to 0s
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		expect(getByText(/⏱️ ۰ ثانیه/)).toBeTruthy();

		// Modal must remain open and allow final voting submission
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
	});

	test('Case A: eliminates unique winner when multiple candidates are in defense', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Final votes: Ava has 2, Bahram has 1
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-2'));

		const submitBtn = getByText('ثبت و خروج آوا');
		expect(submitBtn).toBeTruthy();

		fireEvent.press(submitBtn);
		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('1');
	});

	test('Case B: concludes voting without elimination when all final vote counts are zero', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// All final votes 0
		const continueBtn = getByText('ثبت و ادامه بازی');
		expect(continueBtn).toBeTruthy();

		fireEvent.press(continueBtn);
		expect(onVoteOut).not.toHaveBeenCalled();
		// Returns to daytime, modal closed
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('Case C: concludes voting without elimination on a tied highest final vote', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Tie: Ava has 1, Bahram has 1
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-2'));

		const continueBtn = getByText('ثبت و ادامه بازی');
		expect(continueBtn).toBeTruthy();

		fireEvent.press(continueBtn);
		expect(onVoteOut).not.toHaveBeenCalled();
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('Case 0: single candidate continues game if votes < threshold and eliminates if >= threshold', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Ava alone qualifies with 2 votes (threshold 2)
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// 1 vote in defense is below threshold of 2 -> should show 'ثبت و ادامه بازی'
		fireEvent.press(getByTestId('plus-final-1'));
		expect(getByText('ثبت و ادامه بازی')).toBeTruthy();

		// Add 1 more vote to reach 2 (threshold) -> should show 'ثبت و خروج آوا'
		fireEvent.press(getByTestId('plus-final-1'));
		expect(getByText('ثبت و خروج آوا')).toBeTruthy();

		fireEvent.press(getByText('ثبت و خروج آوا'));
		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('1');
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('hides the elimination control after voting concludes and keeps night control available', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		// Before voting, elimination button and night button are both visible
		expect(getByText('خروج با رأی‌گیری 🚫')).toBeTruthy();
		expect(getByText('اعلام شب 💤')).toBeTruthy();

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Conclude voting with 'ثبت و ادامه بازی'
		fireEvent.press(getByText('ثبت و ادامه بازی'));

		// After voting concludes for this day:
		// Elimination button must be hidden
		expect(queryByText('خروج با رأی‌گیری 🚫')).toBeNull();
		// Night button remains available
		expect(getByText('اعلام شب 💤')).toBeTruthy();
	});

	test('cleans up defense timer when modal is closed with cancel button', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		fireEvent.press(getByTestId('start-defense-timer'));
		// Click cancel during defense
		fireEvent.press(getByText('انصراف'));

		expect(queryByText('مرحله دفاعیه')).toBeNull();
		// Timer should not crash or fire intervals when modal is closed
		act(() => {
			jest.advanceTimersByTime(65000);
		});
	});

	test('shows the single-candidate elimination threshold, qualifying style, and timer dismissal hint', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		expect(getByText(/حدنصاب خروج: ۲ رأی/)).toBeTruthy();

		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-1'));
		expect(getByText(/آوا.*❌/)).toBeTruthy();

		fireEvent.press(getByTestId('start-defense-timer'));
		expect(getByText('(برای لغو لمس کنید)')).toBeTruthy();
		fireEvent.press(getByTestId('dismiss-defense-timer'));
		expect(getByTestId('start-defense-timer')).toBeTruthy();
	});
});

describe('GL-006 Complete Voting Workflow', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(SoundService, 'playSound').mockImplementation(() => {});
		jest.spyOn(SoundService, 'stopOneShotSounds').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('opens initial voting modal listing living players with counters and threshold info', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		expect(getByText('رأی‌گیری اولیه خروج')).toBeTruthy();
		// 4 players -> threshold is 2
		expect(getByText(/حدنصاب ورود به دفاعیه: ۲ رأی/)).toBeTruthy();

		expect(getByText('آوا')).toBeTruthy();
		expect(getByText('بهرام')).toBeTruthy();
		expect(getByText('ترانه')).toBeTruthy();
		expect(getByText('داوود')).toBeTruthy();

		expect(getByTestId('plus-initial-1')).toBeTruthy();
		expect(getByTestId('minus-initial-1')).toBeTruthy();
	});

	test('prevents negative vote counts on initial voting', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		const minusBtn = getByTestId('minus-initial-1');

		// Press minus when vote is 0
		fireEvent.press(minusBtn);
		// Proceed to defense should still fail since vote is 0
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('هیچ بازیکنی به حد نصاب دفاعیه نرسید.')).toBeTruthy();
	});

	test('blocks entering defense when zero candidates meet the threshold', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Give 1 vote to player 1 (threshold is 2 for 4 players)
		fireEvent.press(getByTestId('plus-initial-1'));

		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('هیچ بازیکنی به حد نصاب دفاعیه نرسید.')).toBeTruthy();
		// Remains in initial stage, does NOT enter defense
		expect(queryByText('مرحله دفاعیه')).toBeNull();

		// Moderator can correct: give 1 more vote to reach 2
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
	});

	test('allows multiple qualifying candidates into defense stage', () => {
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Give 2 votes to Ava, 2 votes to Bahram, 1 vote to Taraneh
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-3'));

		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
		expect(getByText(/نامزدهای دفاعیه \(۲ نفر\)/)).toBeTruthy();

		// Ava and Bahram are listed, Taraneh is NOT listed in defense
		expect(getByTestId('plus-final-1')).toBeTruthy();
		expect(getByTestId('plus-final-2')).toBeTruthy();
		expect(() => getByTestId('plus-final-3')).toThrow();
	});

	test('manages 60-second defense timer with sound cues and allows vote submission after expiration', () => {
		const playSoundSpy = jest.spyOn(SoundService, 'playSound');
		const { getByText, getByTestId } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		const startTimerBtn = getByTestId('start-defense-timer');
		expect(getByText(/⏱️ ۶۰ ثانیه/)).toBeTruthy();

		fireEvent.press(startTimerBtn);

		// Advance 50 seconds (10s remaining)
		act(() => {
			jest.advanceTimersByTime(50000);
		});
		expect(playSoundSpy).toHaveBeenCalledWith('lastWord');

		// Advance 7 seconds (3s remaining)
		act(() => {
			jest.advanceTimersByTime(7000);
		});
		expect(playSoundSpy).toHaveBeenCalledWith('countdown3');

		// Advance to 0s
		act(() => {
			jest.advanceTimersByTime(3000);
		});
		expect(getByText(/⏱️ ۰ ثانیه/)).toBeTruthy();

		// Modal must remain open and allow final voting submission
		expect(getByText('مرحله دفاعیه')).toBeTruthy();
	});

	test('Case A: eliminates unique winner when multiple candidates are in defense', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Final votes: Ava has 2, Bahram has 1
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-2'));

		const submitBtn = getByText('ثبت و خروج آوا');
		expect(submitBtn).toBeTruthy();

		fireEvent.press(submitBtn);
		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('1');
	});

	test('Case B: concludes voting without elimination when all final vote counts are zero', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// All final votes 0
		const continueBtn = getByText('ثبت و ادامه بازی');
		expect(continueBtn).toBeTruthy();

		fireEvent.press(continueBtn);
		expect(onVoteOut).not.toHaveBeenCalled();
		// Returns to daytime, modal closed
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('Case C: concludes voting without elimination on a tied highest final vote', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByTestId('plus-initial-2'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Tie: Ava has 1, Bahram has 1
		fireEvent.press(getByTestId('plus-final-1'));
		fireEvent.press(getByTestId('plus-final-2'));

		const continueBtn = getByText('ثبت و ادامه بازی');
		expect(continueBtn).toBeTruthy();

		fireEvent.press(continueBtn);
		expect(onVoteOut).not.toHaveBeenCalled();
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('Case 0: single candidate continues game if votes < threshold and eliminates if >= threshold', () => {
		const onVoteOut = jest.fn();
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers, onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		// Ava alone qualifies with 2 votes (threshold 2)
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// 1 vote in defense is below threshold of 2 -> should show 'ثبت و ادامه بازی'
		fireEvent.press(getByTestId('plus-final-1'));
		expect(getByText('ثبت و ادامه بازی')).toBeTruthy();

		// Add 1 more vote to reach 2 (threshold) -> should show 'ثبت و خروج آوا'
		fireEvent.press(getByTestId('plus-final-1'));
		expect(getByText('ثبت و خروج آوا')).toBeTruthy();

		fireEvent.press(getByText('ثبت و خروج آوا'));
		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('1');
		expect(queryByText('مرحله دفاعیه')).toBeNull();
	});

	test('hides the elimination control after voting concludes and keeps night control available', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		// Before voting, elimination button and night button are both visible
		expect(getByText('خروج با رأی‌گیری 🚫')).toBeTruthy();
		expect(getByText('اعلام شب 💤')).toBeTruthy();

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		// Conclude voting with 'ثبت و ادامه بازی'
		fireEvent.press(getByText('ثبت و ادامه بازی'));

		// After voting concludes for this day:
		// Elimination button must be hidden
		expect(queryByText('خروج با رأی‌گیری 🚫')).toBeNull();
		// Night button remains available
		expect(getByText('اعلام شب 💤')).toBeTruthy();
	});

	test('cleans up defense timer when modal is closed with cancel button', () => {
		const { getByText, getByTestId, queryByText } = renderDay({ players: fourPlayers });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByTestId('plus-initial-1'));
		fireEvent.press(getByText('ثبت رأی اولیه و ورود به دفاعیه'));

		fireEvent.press(getByTestId('start-defense-timer'));
		// Click cancel during defense
		fireEvent.press(getByText('انصراف'));

		expect(queryByText('مرحله دفاعیه')).toBeNull();
		// Timer should not crash or fire intervals when modal is closed
		act(() => {
			jest.advanceTimersByTime(65000);
		});
	});
});
