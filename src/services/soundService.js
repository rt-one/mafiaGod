import { Audio } from 'expo-av';
import { AUDIO_FILES } from '../constants/audioMap';

class SoundService {
	constructor() {
		this.bgSound = null;
		this.currentSound = null;
		this.currentResolve = null;
		this.oneShotSounds = new Set();
		this.initAudioMode();
	}

	async initAudioMode() {
		try {
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: false,
				staysActiveInBackground: true,
				playsInSilentModeIOS: true,
				shouldDuckAndroid: true,
				playThroughEarpieceAndroid: false,
			});
		} catch (e) {
			console.warn('Audio mode initialization failed:', e);
		}
	}

	async playSound(key) {
		try {
			const source = AUDIO_FILES[key];
			if (!source) return;

			const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
			this.oneShotSounds.add(sound);
			sound.setOnPlaybackStatusUpdate((status) => {
				if (status.didJustFinish || status.error) {
					this.oneShotSounds.delete(sound);
					sound.unloadAsync().catch(() => {});
				}
			});
		} catch (error) {
			console.warn(`Error playing sound ${key}:`, error);
		}
	}

	async stopCurrentSound() {
		try {
			if (this.currentSound) {
				const sound = this.currentSound;
				this.currentSound = null;
				await sound.stopAsync().catch(() => {});
				await sound.unloadAsync().catch(() => {});
			}
			if (this.currentResolve) {
				this.currentResolve();
				this.currentResolve = null;
			}
		} catch (error) {}
	}

	async stopOneShotSounds() {
		const sounds = [...this.oneShotSounds];
		this.oneShotSounds.clear();
		await Promise.all(
			sounds.map(async (sound) => {
				await sound.stopAsync().catch(() => {});
				await sound.unloadAsync().catch(() => {});
			})
		);
	}

	async playAndWait(key) {
		try {
			const source = AUDIO_FILES[key];
			if (!source) return Promise.resolve();

			await this.stopCurrentSound();

			return new Promise(async (resolve) => {
				this.currentResolve = resolve;

				const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
				this.currentSound = sound;

				sound.setOnPlaybackStatusUpdate(async (status) => {
					if (status.didJustFinish || status.error) {
						await sound.unloadAsync().catch(() => {});
						if (this.currentSound === sound) {
							this.currentSound = null;
						}
						if (this.currentResolve) {
							this.currentResolve();
							this.currentResolve = null;
						}
					}
				});
			});
		} catch (error) {
			console.warn(`Error in playAndWait for ${key}:`, error);
			if (this.currentResolve) {
				this.currentResolve();
				this.currentResolve = null;
			}
			return Promise.resolve();
		}
	}

	async startBackgroundMusic() {
		try {
			if (this.bgSound) {
				await this.bgSound.stopAsync().catch(() => {});
				await this.bgSound.unloadAsync().catch(() => {});
				this.bgSound = null;
			}
			const { sound } = await Audio.Sound.createAsync(AUDIO_FILES.bgMusic, {
				shouldPlay: true,
				isLooping: true,
				volume: 0.35,
			});
			this.bgSound = sound;
		} catch (error) {}
	}

	async stopBackgroundMusic() {
		try {
			if (this.bgSound) {
				await this.bgSound.stopAsync().catch(() => {});
				await this.bgSound.unloadAsync().catch(() => {});
				this.bgSound = null;
			}
		} catch (error) {}
	}

	wait(seconds) {
		return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
	}
}

export default new SoundService();
