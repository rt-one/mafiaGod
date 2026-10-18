const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Latin digits (0-9) in any value to Persian digits (۰-۹).
 * Display-only helper: game logic must keep using real numbers.
 */
export const toPersianDigits = (input) => {
	if (input === null || input === undefined) return '';
	return String(input).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
};
