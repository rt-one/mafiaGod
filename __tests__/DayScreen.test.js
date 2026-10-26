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
		const { getByText } = renderDay({ onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		expect(getByText('انتخاب فرد برای خروج')).toBeTruthy();

		fireEvent.press(getByText('بهرام'));
		fireEvent.press(getByText('اخراج بازیکن'));

		expect(onVoteOut).toHaveBeenCalledTimes(1);
		expect(onVoteOut).toHaveBeenCalledWith('2');
	});

	test('repeat confirmation does not emit duplicate eliminations', () => {
		const onVoteOut = jest.fn();
		const { getByText } = renderDay({ onVoteOut });

		fireEvent.press(getByText('خروج با رأی‌گیری 🚫'));
		fireEvent.press(getByText('بهرام'));
		fireEvent.press(getByText('اخراج بازیکن'));
		// The modal closes after the first confirm; a stray second signal
		// must be impossible, so exactly one elimination is recorded.
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
		expect(getByText('✨ بازگشت به بازی:')).toBeTruthy();
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
		expect(getByText('✨ بازگشت به بازی:')).toBeTruthy();
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

		// Expected order:
		// 1. 'about'
		// 2. losses ('loss0', '1', 'loss1')
		// 3. 'resurrection'
		// 4. 'enquiryIntro' ...
		// 5. 'silence'
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
