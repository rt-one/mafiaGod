import { determineGameStatus } from '../src/logic/gameStatus';

const makePlayer = (id, side, isAlive = true) => ({
	id,
	name: `player-${id}`,
	character: side === 'mafia' ? 'godfather' : 'citizen',
	side,
	isAlive,
});

describe('GL-001 game status', () => {
	test('active three-player state (1 mafia, 2 city) does not end the game', () => {
		expect(
			determineGameStatus([
				makePlayer('1', 'mafia'),
				makePlayer('2', 'city'),
				makePlayer('3', 'city'),
			]),
		).toBeNull();
	});

	test('zero living mafia is an immediate city win', () => {
		expect(
			determineGameStatus([makePlayer('1', 'city'), makePlayer('2', 'city', false)]),
		).toBe('CITY_WIN');
	});

	test('parity (1 mafia vs 1 city) is an immediate mafia win', () => {
		expect(determineGameStatus([makePlayer('1', 'mafia'), makePlayer('2', 'city')])).toBe(
			'MAFIA_WIN',
		);
	});

	test('eliminating the last mafia at three players ends the game for the city', () => {
		const before = [
			makePlayer('1', 'mafia'),
			makePlayer('2', 'city'),
			makePlayer('3', 'city'),
		];
		const after = before.map((player) =>
			player.id === '1' ? { ...player, isAlive: false } : player,
		);
		expect(determineGameStatus(after)).toBe('CITY_WIN');
	});

	test('eliminating a city player at three players hands mafia the parity win', () => {
		const before = [
			makePlayer('1', 'mafia'),
			makePlayer('2', 'city'),
			makePlayer('3', 'city'),
		];
		const after = before.map((player) =>
			player.id === '2' ? { ...player, isAlive: false } : player,
		);
		expect(determineGameStatus(after)).toBe('MAFIA_WIN');
	});

	test('initial roster violating the composition rule is detected right after shuffle', () => {
		expect(
			determineGameStatus([
				makePlayer('1', 'mafia'),
				makePlayer('2', 'mafia'),
				makePlayer('3', 'city'),
			]),
		).toBe('MAFIA_WIN');
	});

	test('empty and all-dead rosters stay undecided', () => {
		expect(determineGameStatus([])).toBeNull();
		expect(determineGameStatus([makePlayer('1', 'mafia', false)])).toBeNull();
	});
});
