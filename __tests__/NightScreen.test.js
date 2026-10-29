import React from 'react';
import { render, act } from '@testing-library/react-native';

import NightScreen, { resolveNightActions } from '../src/screens/NightScreen';
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

describe('GL-007 night abilities require their owner to survive', () => {
	const makePlayer = ({ id, name, character, side = 'city', isAlive = true, acts = [], ...rest }) => ({
		id,
		name,
		character,
		side,
		isAlive,
		acts,
		...rest,
	});

	const resolve = (players) => resolveNightActions(players, 1);
	const byName = (players, name) => players.find((player) => player.name === name);

	test('cancels a killed Psychologist’s silence in the summary and updated player state', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'روان‌شناس'] }),
			makePlayer({ id: 'psy', name: 'روان‌شناس', character: 'psychologist', acts: [null, 'شهروند'] }),
			makePlayer({ id: 'cit', name: 'شهروند', character: 'citizen' }),
		]);

		expect(result.summary).toMatchObject({ losses: ['روان‌شناس'], silenced: null });
		expect(byName(result.updatedPlayers, 'روان‌شناس')).toMatchObject({ isAlive: false, acts: [null, 'no-act'] });
	});

	test('cancels a vulnerable killed Invincible’s inquiry without consuming its quota', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'جان‌سخت'] }),
			makePlayer({
				id: 'inv',
				name: 'جان‌سخت',
				character: 'invincible',
				acts: [null, 'yes'],
				vulnerable: true,
				enquiryUsed: 1,
			}),
		]);

		expect(result.summary).toMatchObject({ losses: ['جان‌سخت'], enquiry: false });
		expect(byName(result.updatedPlayers, 'جان‌سخت')).toMatchObject({
			isAlive: false,
			enquiryUsed: 1,
			acts: [null, 'no-act'],
		});
	});

	test('cancels another killed role owner’s effect, including Constantine’s resurrection', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'کنستانتین'] }),
			makePlayer({ id: 'con', name: 'کنستانتین', character: 'constantine', acts: [null, 'بازیکن مرده'] }),
			makePlayer({ id: 'dead', name: 'بازیکن مرده', character: 'citizen', isAlive: false }),
		]);

		expect(result.summary).toMatchObject({ losses: ['کنستانتین'], returned: null });
		expect(byName(result.updatedPlayers, 'کنستانتین')).toMatchObject({ isAlive: false, acts: [null, 'no-act'] });
		expect(byName(result.updatedPlayers, 'بازیکن مرده').isAlive).toBe(false);
	});

	test('allows a Doctor-protected player to survive and perform their action', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'روان‌شناس'] }),
			makePlayer({ id: 'doc', name: 'دکتر', character: 'doctor', acts: [null, 'روان‌شناس'] }),
			makePlayer({ id: 'psy', name: 'روان‌شناس', character: 'psychologist', acts: [null, 'شهروند'] }),
			makePlayer({ id: 'cit', name: 'شهروند', character: 'citizen' }),
		]);

		expect(result.summary).toMatchObject({ losses: [], silenced: 'شهروند' });
		expect(byName(result.updatedPlayers, 'روان‌شناس').isAlive).toBe(true);
	});

	test('keeps a surviving role owner’s action and public summary effect synchronized', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'شهروند الف'] }),
			makePlayer({ id: 'psy', name: 'روان‌شناس', character: 'psychologist', acts: [null, 'شهروند ب'] }),
			makePlayer({ id: 'a', name: 'شهروند الف', character: 'citizen' }),
			makePlayer({ id: 'b', name: 'شهروند ب', character: 'citizen' }),
		]);

		const publicNightRecord = {
			losses: result.summary.losses,
			silenced: result.summary.silenced,
			enquiry: result.summary.enquiry,
			returned: result.summary.returned,
		};
		expect(byName(result.updatedPlayers, 'شهروند الف').isAlive).toBe(false);
		expect(byName(result.updatedPlayers, 'روان‌شناس').isAlive).toBe(true);
		expect(publicNightRecord).toEqual({
			losses: ['شهروند الف'],
			silenced: 'شهروند ب',
			enquiry: false,
			returned: null,
		});
	});

	test('cancels a sniper shot when the sniper is killed by the Mafia without Doctor protection', () => {
		const result = resolve([
			makePlayer({ id: 'gf', name: 'پدرخوانده', character: 'godfather', side: 'mafia', acts: [null, 'حرفه‌ای'] }),
			makePlayer({ id: 'sni', name: 'حرفه‌ای', character: 'sniper', acts: [null, 'مافیا'] }),
			makePlayer({ id: 'maf', name: 'مافیا', character: 'doctorlecter', side: 'mafia' }),
		]);

		expect(result.summary.losses).toEqual(['حرفه‌ای']);
		expect(byName(result.updatedPlayers, 'حرفه‌ای')).toMatchObject({ isAlive: false, acts: [null, 'no-act'] });
		expect(byName(result.updatedPlayers, 'مافیا').isAlive).toBe(true);
	});
});
