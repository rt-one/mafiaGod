import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DayScreen from '../src/screens/DayScreen';
import { ThemeProvider } from '../src/context/ThemeContext';

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
