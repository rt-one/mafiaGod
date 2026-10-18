export const MAX_INVINCIBLE_ENQUIRIES = 2;

const countYesActsBefore = (player, dayCount) => {
	if (!player || !Array.isArray(player.acts)) return 0;
	const limit = typeof dayCount === 'number' ? dayCount : player.acts.length;
	let count = 0;
	for (let idx = 0; idx < player.acts.length && idx < limit; idx += 1) {
		if (player.acts[idx] === 'yes') count += 1;
	}
	return count;
};

export const getInvincibleEnquiryCount = (player, dayCount) => {
	if (!player) return 0;
	if (typeof player.enquiryUsed === 'number' && Number.isFinite(player.enquiryUsed)) {
		return Math.max(0, Math.floor(player.enquiryUsed));
	}
	return countYesActsBefore(player, dayCount);
};

export const getInvincibleEnquiriesRemaining = (player, dayCount) => {
	return Math.max(0, MAX_INVINCIBLE_ENQUIRIES - getInvincibleEnquiryCount(player, dayCount));
};

export const canRequestInvincibleEnquiry = (player, dayCount) => {
	return getInvincibleEnquiryCount(player, dayCount) < MAX_INVINCIBLE_ENQUIRIES;
};

export const isInvincibleAliveAfterNight = (invincible, losses, returnedName) => {
	if (!invincible) return false;
	if (!Array.isArray(losses)) return true;
	if (!losses.includes(invincible.name)) return true;
	// GL-007 hook: when Invincible dies this night, a requested enquiry is cancelled.
	return returnedName === invincible.name;
};

export const getNextInvincibleEnquiryCount = ({ player, dayCount, requested, granted, survives }) => {
	const current = getInvincibleEnquiryCount(player, dayCount);
	if (!requested || !granted || !survives) return current;
	return current + 1;
};
