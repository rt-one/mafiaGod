import { canConstantineResurrect, getSuccessfulResurrection } from '../src/logic/resurrection';

describe('GL-005 Constantine resurrection logic', () => {
	const makePlayer = ({ id, name, character, side, isAlive, acts = [] }) => ({
		id,
		name,
		character,
		side,
		isAlive,
		acts,
	});

	describe('canConstantineResurrect', () => {
		test('allows resurrection on night 1 when no prior acts exist', () => {
			const constan = makePlayer({
				id: 'c1',
				name: 'کنستانتین',
				character: 'constantine',
				side: 'city',
				isAlive: true,
				acts: [],
			});
			expect(canConstantineResurrect(constan, 1)).toBe(true);
		});

		test('allows resurrection if prior night was no-act', () => {
			const constan = makePlayer({
				id: 'c1',
				name: 'کنستانتین',
				character: 'constantine',
				side: 'city',
				isAlive: true,
				acts: [null, 'no-act'],
			});
			expect(canConstantineResurrect(constan, 2)).toBe(true);
		});

		test('rejects resurrection if already used on an earlier night', () => {
			const constan = makePlayer({
				id: 'c1',
				name: 'کنستانتین',
				character: 'constantine',
				side: 'city',
				isAlive: true,
				acts: [null, 'مرده ۱'],
			});
			expect(canConstantineResurrect(constan, 2)).toBe(false);
		});

		test('returns false if Constantine is dead', () => {
			const constan = makePlayer({
				id: 'c1',
				name: 'کنستانتین',
				character: 'constantine',
				side: 'city',
				isAlive: false,
				acts: [],
			});
			expect(canConstantineResurrect(constan, 1)).toBe(false);
		});
	});

	describe('getSuccessfulResurrection', () => {
		test('returns target name when dead player is successfully resurrected', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: [null, 'علی'],
				}),
				makePlayer({
					id: '2',
					name: 'علی',
					character: 'citizen',
					side: 'city',
					isAlive: false,
				}),
				makePlayer({
					id: '3',
					name: 'سارا',
					character: 'godfather',
					side: 'mafia',
					isAlive: true,
				}),
			];

			expect(getSuccessfulResurrection(players, 1)).toBe('علی');
		});

		test('returns null if targeted player is already alive (not a return from dead)', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: [null, 'علی'],
				}),
				makePlayer({
					id: '2',
					name: 'علی',
					character: 'citizen',
					side: 'city',
					isAlive: true, // already alive!
				}),
			];

			expect(getSuccessfulResurrection(players, 1)).toBeNull();
		});

		test('returns null if Constantine already used resurrection on a previous night', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: [null, 'مرده اول', 'مرده دوم'],
				}),
				makePlayer({
					id: '2',
					name: 'مرده دوم',
					character: 'citizen',
					side: 'city',
					isAlive: false,
				}),
			];

			// Day 2 resolution, but Constantine already acted on Day 1
			expect(getSuccessfulResurrection(players, 2)).toBeNull();
		});

		test('returns null if Constantine selected no-act', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: [null, 'no-act'],
				}),
				makePlayer({
					id: '2',
					name: 'علی',
					character: 'citizen',
					side: 'city',
					isAlive: false,
				}),
			];

			expect(getSuccessfulResurrection(players, 1)).toBeNull();
		});

		test('returns null if Constantine is dead at start of night resolution', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: false,
					acts: [null, 'علی'],
				}),
				makePlayer({
					id: '2',
					name: 'علی',
					character: 'citizen',
					side: 'city',
					isAlive: false,
				}),
			];

			expect(getSuccessfulResurrection(players, 1)).toBeNull();
		});

		test('returns null on dayCount 0 (introductory night)', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: ['علی'],
				}),
				makePlayer({
					id: '2',
					name: 'علی',
					character: 'citizen',
					side: 'city',
					isAlive: false,
				}),
			];

			expect(getSuccessfulResurrection(players, 0)).toBeNull();
		});

		test('returns null if target player does not exist', () => {
			const players = [
				makePlayer({
					id: '1',
					name: 'رضا',
					character: 'constantine',
					side: 'city',
					isAlive: true,
					acts: [null, 'ناموجود'],
				}),
			];

			expect(getSuccessfulResurrection(players, 1)).toBeNull();
		});
	});
});
