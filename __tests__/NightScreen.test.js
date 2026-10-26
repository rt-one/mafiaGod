import React from 'react';
import { render, act } from '@testing-library/react-native';

import NightScreen from '../src/screens/NightScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import SoundService from '../src/services/soundService';

describe('GL-005 NightScreen resolution with Constantine resurrection', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.spyOn(SoundService, 'playAndWait').mockResolvedValue();
		jest.spyOn(SoundService, 'wait').mockResolvedValue();
		jest.spyOn(SoundService, 'startBackgroundMusic').mockResolvedValue();
		jest.spyOn(SoundService, 'stopBackgroundMusic').mockResolvedValue();
		jest.spyOn(SoundService, 'stopCurrentSound').mockResolvedValue();
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('renders without crashing during night phase', async () => {
		const players = [
			{ id: '1', name: 'قسطنطین', character: 'constantine', side: 'city', isAlive: true, acts: [] },
			{
				id: '2',
				name: 'شهروند مرده',
				character: 'citizen',
				side: 'city',
				isAlive: false,
				acts: [],
			},
			{
				id: '3',
				name: 'پدرخوانده',
				character: 'godfather',
				side: 'mafia',
				isAlive: true,
				acts: [],
			},
		];

		const onNightConcluded = jest.fn();
		const { toJSON } = render(
			<ThemeProvider>
				<NightScreen players={players} dayCount={1} onNightConcluded={onNightConcluded} />
			</ThemeProvider>,
		);

		await act(async () => {
			jest.advanceTimersByTime(1000);
		});

		expect(toJSON()).toBeTruthy();
	});
});
