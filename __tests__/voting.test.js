import {
	calculateDefenseThreshold,
	getMinDefenseVotes,
	isQualifiedForDefense,
	getQualifyingCandidates,
	determineFinalVotingResult,
} from '../src/logic/voting';

describe('GL-006 voting logic', () => {
	const makePlayer = (id, name) => ({ id, name, isAlive: true });

	describe('1. Majority threshold calculations', () => {
		test('calculates correct threshold for even and odd living player counts', () => {
			expect(calculateDefenseThreshold(6)).toBe(3.0);
			expect(calculateDefenseThreshold(7)).toBe(3.5);
			expect(calculateDefenseThreshold(8)).toBe(4.0);
			expect(calculateDefenseThreshold(3)).toBe(1.5);
		});

		test('calculates minimum integer votes needed', () => {
			expect(getMinDefenseVotes(6)).toBe(3);
			expect(getMinDefenseVotes(7)).toBe(4);
			expect(getMinDefenseVotes(8)).toBe(4);
			expect(getMinDefenseVotes(3)).toBe(2);
		});
	});

	describe('2. Qualification for defense', () => {
		test('qualifies when votes >= livingPlayerCount / 2', () => {
			expect(isQualifiedForDefense(3, 6)).toBe(true);
			expect(isQualifiedForDefense(4, 6)).toBe(true);
			expect(isQualifiedForDefense(2, 6)).toBe(false);

			expect(isQualifiedForDefense(4, 7)).toBe(true);
			expect(isQualifiedForDefense(3, 7)).toBe(false);
		});

		test('returns false for negative or non-number votes', () => {
			expect(isQualifiedForDefense(-1, 6)).toBe(false);
			expect(isQualifiedForDefense(undefined, 6)).toBe(false);
		});
	});

	describe('3. Multiple defense candidates', () => {
		test('returns all players meeting threshold', () => {
			const p1 = makePlayer('1', 'آوا');
			const p2 = makePlayer('2', 'بهرام');
			const p3 = makePlayer('3', 'ترانه');
			const p4 = makePlayer('4', 'داوود');
			const players = [p1, p2, p3, p4];

			const votesMap = { 1: 2, 2: 3, 3: 1, 4: 0 };
			// 4 players -> threshold is 2
			const qualified = getQualifyingCandidates(players, votesMap, 4);
			expect(qualified).toEqual([p1, p2]);
		});
	});

	describe('4. Zero qualifying candidates', () => {
		test('returns empty array when nobody meets threshold', () => {
			const p1 = makePlayer('1', 'آوا');
			const p2 = makePlayer('2', 'بهرام');
			const players = [p1, p2];

			const votesMap = { 1: 0, 2: 0 };
			const qualified = getQualifyingCandidates(players, votesMap, 2);
			expect(qualified).toEqual([]);
		});
	});

	describe('Case 0: Only one candidate in final voting', () => {
		const p1 = makePlayer('1', 'آوا');

		test('eliminates single candidate when they reach threshold again', () => {
			// 6 players -> threshold 3. p1 gets 3 votes
			const result = determineFinalVotingResult([p1], { 1: 3 }, 6);
			expect(result.outcome).toBe('ELIMINATE');
			expect(result.candidate).toEqual(p1);
			expect(result.buttonLabel).toBe('ثبت و خروج آوا');
		});

		test('continues game without elimination when single candidate fails threshold', () => {
			// 6 players -> threshold 3. p1 gets 2 votes
			const result = determineFinalVotingResult([p1], { 1: 2 }, 6);
			expect(result.outcome).toBe('CONTINUE');
			expect(result.candidate).toBeNull();
			expect(result.buttonLabel).toBe('ثبت و ادامه بازی');
		});
	});

	describe('Case A: Unique winner with votes > 0', () => {
		const p1 = makePlayer('1', 'آوا');
		const p2 = makePlayer('2', 'بهرام');

		test('eliminates candidate with unique highest votes', () => {
			const result = determineFinalVotingResult([p1, p2], { 1: 3, 2: 1 }, 6);
			expect(result.outcome).toBe('ELIMINATE');
			expect(result.candidate).toEqual(p1);
			expect(result.buttonLabel).toBe('ثبت و خروج آوا');
		});
	});

	describe('Case B: All vote counts are zero', () => {
		const p1 = makePlayer('1', 'آوا');
		const p2 = makePlayer('2', 'بهرام');

		test('continues game when all candidates have zero votes', () => {
			const result = determineFinalVotingResult([p1, p2], { 1: 0, 2: 0 }, 6);
			expect(result.outcome).toBe('CONTINUE');
			expect(result.candidate).toBeNull();
			expect(result.buttonLabel).toBe('ثبت و ادامه بازی');
		});
	});

	describe('Case C: Tied highest vote total', () => {
		const p1 = makePlayer('1', 'آوا');
		const p2 = makePlayer('2', 'بهرام');
		const p3 = makePlayer('3', 'ترانه');

		test('continues game when there is a tie for highest votes', () => {
			const result = determineFinalVotingResult([p1, p2, p3], { 1: 2, 2: 2, 3: 1 }, 6);
			expect(result.outcome).toBe('CONTINUE');
			expect(result.candidate).toBeNull();
			expect(result.buttonLabel).toBe('ثبت و ادامه بازی');
		});
	});
});
