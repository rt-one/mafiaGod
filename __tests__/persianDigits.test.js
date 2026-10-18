import { toPersianDigits } from '../src/utils/persianDigits';

describe('toPersianDigits', () => {
	test('converts every Latin digit to Persian', () => {
		expect(toPersianDigits(0)).toBe('۰');
		expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
	});

	test('converts digits embedded in mixed strings', () => {
		expect(toPersianDigits('روز 3')).toBe('روز ۳');
		expect(toPersianDigits('شب 12')).toBe('شب ۱۲');
		expect(toPersianDigits('استعلام باقی‌مانده: 1 از 2')).toBe('استعلام باقی‌مانده: ۱ از ۲');
	});

	test('handles common timer and count values', () => {
		expect(toPersianDigits(30)).toBe('۳۰');
		expect(toPersianDigits(180)).toBe('۱۸۰');
		expect(toPersianDigits(60)).toBe('۶۰');
		expect(toPersianDigits(10)).toBe('۱۰');
	});

	test('leaves already-Persian text untouched and handles empty input', () => {
		expect(toPersianDigits('۳ نفره')).toBe('۳ نفره');
		expect(toPersianDigits('وقایع ثبت‌شده شهر')).toBe('وقایع ثبت‌شده شهر');
		expect(toPersianDigits(null)).toBe('');
		expect(toPersianDigits(undefined)).toBe('');
	});
});
