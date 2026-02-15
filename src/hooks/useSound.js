import { useState, useEffect } from 'react';
import { STORAGE_KEYS, SOUND_CONFIG } from '@/lib/constants';
import { initAudio } from '@/lib/sounds';

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
    setSoundEnabled(saved !== 'false');
  }, []);

  const playSound = (type) => {
    if (!soundEnabled || !SOUND_CONFIG.ENABLED) {
      return;
    }

    const audioContext = initAudio();
    if (!audioContext) {
      return;
    }

    const soundConfig = SOUND_CONFIG.SOUNDS[type.toUpperCase()];
    if (!soundConfig) {
      return;
    }

    const { frequencies, duration } = soundConfig;

    if (type === 'complete') {
      frequencies.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
        gainNode.gain.setValueAtTime(SOUND_CONFIG.VOLUME, audioContext.currentTime + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + i * 0.1 + duration
        );

        oscillator.start(audioContext.currentTime + i * 0.1);
        oscillator.stop(audioContext.currentTime + i * 0.1 + duration);
      });
    } else {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      frequencies.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(
          freq,
          audioContext.currentTime + i * (duration / frequencies.length)
        );
      });

      gainNode.gain.setValueAtTime(SOUND_CONFIG.VOLUME, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem(STORAGE_KEYS.SOUND, newState.toString());

    if (newState) {
      playSound('correct');
    }
  };

  return {
    soundEnabled,
    toggleSound,
    playSound,
  };
}
