/**
 * Logic for Constantine's resurrection power (GL-005).
 * Constantine may return a dead player to the game once per match.
 */

export const canConstantineResurrect = (constantine, dayCount) => {
	if (!constantine || !constantine.isAlive || !Array.isArray(constantine.acts)) return false;
	const alreadyUsed = constantine.acts.some(
		(act, idx) => idx < dayCount && act !== null && act !== 'no-act',
	);
	return !alreadyUsed;
};

export const getSuccessfulResurrection = (playersList, dayCount) => {
	if (!Array.isArray(playersList) || dayCount === 0) return null;
	const constan = playersList.find((p) => p.character === 'constantine' && p.isAlive);
	if (!constan || !constan.acts || !constan.acts[dayCount] || constan.acts[dayCount] === 'no-act') {
		return null;
	}
	if (!canConstantineResurrect(constan, dayCount)) {
		return null;
	}
	const targetName = constan.acts[dayCount];
	const targetPlayer = playersList.find((p) => p.name === targetName);
	// Only a previously dead player can be successfully returned
	if (targetPlayer && !targetPlayer.isAlive) {
		return targetName;
	}
	return null;
};
