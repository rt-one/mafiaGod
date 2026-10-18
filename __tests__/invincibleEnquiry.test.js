import {
	MAX_INVINCIBLE_ENQUIRIES,
	canRequestInvincibleEnquiry,
	getInvincibleEnquiriesRemaining,
	getInvincibleEnquiryCount,
	getNextInvincibleEnquiryCount,
} from '../src/logic/invincibleEnquiry';

const makeInvincible = (overrides = {}) => ({
	id: 'inv1',
	name: 'حسن',
	character: 'invincible',
	side: 'city',
	isAlive: true,
	acts: [],
	enquiryUsed: 0,
	...overrides,
});

describe('GL-002 invincible enquiry limit', () => {
	test('first two enquiries are allowed, third is rejected', () => {
		let player = makeInvincible({ acts: [] });

		// Night 1: first enquiry succeeds and survives.
		expect(canRequestInvincibleEnquiry(player, 1)).toBe(true);
		player = {
			...player,
			acts: ['no-act', 'yes'],
			enquiryUsed: getNextInvincibleEnquiryCount({
				player,
				dayCount: 1,
				requested: true,
				granted: true,
				survives: true,
			}),
		};
		expect(getInvincibleEnquiryCount(player, 2)).toBe(1);
		expect(getInvincibleEnquiriesRemaining(player, 2)).toBe(1);

		// Night 2: second enquiry succeeds and survives.
		expect(canRequestInvincibleEnquiry(player, 2)).toBe(true);
		player = {
			...player,
			acts: ['no-act', 'yes', 'yes'],
			enquiryUsed: getNextInvincibleEnquiryCount({
				player,
				dayCount: 2,
				requested: true,
				granted: true,
				survives: true,
			}),
		};
		expect(getInvincibleEnquiryCount(player, 3)).toBe(2);
		expect(getInvincibleEnquiriesRemaining(player, 3)).toBe(0);

		// Night 3: limit reached, a further request is rejected.
		expect(canRequestInvincibleEnquiry(player, 3)).toBe(false);
		const unchanged = getNextInvincibleEnquiryCount({
			player,
			dayCount: 3,
			requested: true,
			granted: false,
			survives: true,
		});
		expect(unchanged).toBe(2);
		expect(unchanged).toBeLessThanOrEqual(MAX_INVINCIBLE_ENQUIRIES);
	});

	test('counter persists across nights and resets for a new game', () => {
		const night2 = makeInvincible({ acts: ['no-act', 'yes'], enquiryUsed: 1 });
		expect(getInvincibleEnquiryCount(night2, 2)).toBe(1);

		const fresh = makeInvincible();
		expect(getInvincibleEnquiryCount(fresh, 1)).toBe(0);
		expect(canRequestInvincibleEnquiry(fresh, 1)).toBe(true);
	});

	test('legacy players without the counter fall back to prior yes acts', () => {
		const legacy = makeInvincible({ acts: ['no-act', 'yes', 'yes'] });
		delete legacy.enquiryUsed;
		expect(getInvincibleEnquiryCount(legacy, 3)).toBe(2);
		expect(canRequestInvincibleEnquiry(legacy, 3)).toBe(false);
	});

	test('an enquiry on a night invincible dies does not consume the quota (GL-007 compatibility)', () => {
		const player = makeInvincible({ acts: ['no-act', 'yes'], enquiryUsed: 1 });
		const next = getNextInvincibleEnquiryCount({
			player,
			dayCount: 2,
			requested: true,
			granted: true,
			survives: false,
		});
		expect(next).toBe(1);
		expect(canRequestInvincibleEnquiry({ ...player, enquiryUsed: next }, 3)).toBe(true);
	});
});
