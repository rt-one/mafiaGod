import SoundService from '../src/services/soundService';
import { AUDIO_FILES } from '../src/constants/audioMap';
import { AUDIO_FILES as AUDIO_FILES_SERVICES } from '../src/services/audioMap';

describe('GL-005 Audio integration and robustness', () => {
	test('audioMap export matches', () => {
		expect(AUDIO_FILES).toBeDefined();
		expect(AUDIO_FILES_SERVICES).toBe(AUDIO_FILES);
	});

	test('playAndWait for missing audio key resolves immediately and does not hang', async () => {
		const result = await SoundService.playAndWait('something');
		expect(result).toBeUndefined();
	});

	test('playAndWait for null or undefined key resolves immediately', async () => {
		const result1 = await SoundService.playAndWait(null);
		const result2 = await SoundService.playAndWait(undefined);
		expect(result1).toBeUndefined();
		expect(result2).toBeUndefined();
	});
});
