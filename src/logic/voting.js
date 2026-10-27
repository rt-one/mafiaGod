/**
 * Pure voting logic for GodYar day elimination workflow (GL-006).
 */

/**
 * Calculates the defense qualification threshold.
 * A player qualifies for defense if: votes >= livingPlayerCount / 2
 * Examples:
 *   7 living players -> threshold = 3.5 (requires >= 4 votes)
 *   6 living players -> threshold = 3.0 (requires >= 3 votes)
 */
export const calculateDefenseThreshold = (livingPlayerCount) => {
	if (typeof livingPlayerCount !== 'number' || livingPlayerCount <= 0) return 0;
	return livingPlayerCount / 2;
};

export const getMinDefenseVotes = (livingPlayerCount) => {
	return Math.ceil(calculateDefenseThreshold(livingPlayerCount));
};

export const isQualifiedForDefense = (votes, livingPlayerCount) => {
	if (typeof votes !== 'number' || votes < 0) return false;
	return votes >= calculateDefenseThreshold(livingPlayerCount);
};

export const getQualifyingCandidates = (players, votesMap, livingPlayerCount) => {
	if (!Array.isArray(players)) return [];
	const map = votesMap || {};
	return players.filter((p) => isQualifiedForDefense(map[p.id] || 0, livingPlayerCount));
};

/**
 * Determines the final voting outcome and exact button label:
 *
 * CASE 0: ONLY ONE CANDIDATE
 *   If candidate votes >= livingPlayerCount / 2:
 *     outcome: 'ELIMINATE', buttonLabel: `ثبت و خروج ${candidate.name}`
 *   Otherwise:
 *     outcome: 'CONTINUE', buttonLabel: 'ثبت و ادامه بازی'
 *
 * CASE B: ALL VOTE COUNTS ARE ZERO
 *   outcome: 'CONTINUE', buttonLabel: 'ثبت و ادامه بازی'
 *
 * CASE C: TIED HIGHEST VOTE TOTAL
 *   outcome: 'CONTINUE', buttonLabel: 'ثبت و ادامه بازی'
 *
 * CASE A: ONE UNIQUE WINNER (with votes > 0)
 *   outcome: 'ELIMINATE', candidate: winner, buttonLabel: `ثبت و خروج ${winner.name}`
 */
export const determineFinalVotingResult = (defenseCandidates, finalVotesMap, livingPlayerCount) => {
	const candidates = Array.isArray(defenseCandidates) ? defenseCandidates : [];
	const map = finalVotesMap || {};

	if (candidates.length === 0) {
		return {
			outcome: 'CONTINUE',
			candidate: null,
			buttonLabel: 'ثبت و ادامه بازی',
		};
	}

	// CASE 0: ONLY ONE CANDIDATE
	if (candidates.length === 1) {
		const singleCandidate = candidates[0];
		const votes = map[singleCandidate.id] || 0;
		if (isQualifiedForDefense(votes, livingPlayerCount)) {
			return {
				outcome: 'ELIMINATE',
				candidate: singleCandidate,
				buttonLabel: `ثبت و خروج ${singleCandidate.name}`,
			};
		}
		return {
			outcome: 'CONTINUE',
			candidate: null,
			buttonLabel: 'ثبت و ادامه بازی',
		};
	}

	// MULTIPLE CANDIDATES
	const voteCounts = candidates.map((c) => map[c.id] || 0);
	const maxVotes = Math.max(...voteCounts);

	// CASE B: ALL VOTE COUNTS ARE ZERO
	if (maxVotes === 0) {
		return {
			outcome: 'CONTINUE',
			candidate: null,
			buttonLabel: 'ثبت و ادامه بازی',
		};
	}

	const topCandidates = candidates.filter((c) => (map[c.id] || 0) === maxVotes);

	// CASE C: TIED HIGHEST VOTE TOTAL
	if (topCandidates.length > 1) {
		return {
			outcome: 'CONTINUE',
			candidate: null,
			buttonLabel: 'ثبت و ادامه بازی',
		};
	}

	// CASE A: ONE UNIQUE WINNER
	const winner = topCandidates[0];
	return {
		outcome: 'ELIMINATE',
		candidate: winner,
		buttonLabel: `ثبت و خروج ${winner.name}`,
	};
};
