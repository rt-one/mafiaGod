/**
 * Pure win evaluation shared by App.js game flow (GL-001).
 * Mafia wins at parity (aliveMafia >= aliveCity); city wins at zero living mafia.
 * Unlike the in-App wrapper, this takes no day exemption so the initial
 * post-shuffle state can be evaluated too.
 */
export const determineGameStatus = (currentPlayers) => {
	if (!Array.isArray(currentPlayers)) return null;
	const aliveMafia = currentPlayers.filter((p) => p.isAlive && p.side === 'mafia').length;
	const aliveCity = currentPlayers.filter((p) => p.isAlive && p.side === 'city').length;

	if (aliveMafia === 0 && aliveCity === 0) return null;

	if (aliveMafia === 0) return 'CITY_WIN';
	if (aliveMafia >= aliveCity) return 'MAFIA_WIN';
	return null;
};
