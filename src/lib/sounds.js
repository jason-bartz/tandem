// Audio effects for the game
import { getVolumeFor } from './soundSettings';

let audioContext = null;
let _visibilityListenerAdded = false;

// Check user's sound preference from localStorage
function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tandemSound') !== 'false';
}

// --- Shared utilities ---

// Create a noise buffer for percussion/texture synthesis
function createNoiseBuffer(context, duration) {
  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Create a stereo panner (spatial audio)
function createPanner(context, pan) {
  if (context.createStereoPanner) {
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }
  // Fallback: connect directly
  return null;
}

// Connect through optional panner to destination
function connectToOutput(context, source, panner) {
  if (panner) {
    source.connect(panner);
    panner.connect(context.destination);
  } else {
    source.connect(context.destination);
  }
}

// Initialize or resume the shared AudioContext.
// Returns null if sound is disabled or unavailable — callers bail early.
export function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!isSoundEnabled()) return null;

  // Create a new AudioContext if we don't have one, or if the existing one
  // is closed (can happen on iOS due to system audio interruptions or memory pressure).
  if (!audioContext || audioContext.state === 'closed') {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }

  // Browsers (especially Safari/iOS) suspend the AudioContext when the tab
  // or app goes to the background. Calling resume() inside a user-gesture
  // handler restores it; outside a gesture it queues for the next gesture.
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  // One-time listener: resume audio when the page returns to foreground.
  // This covers the case where the user switches back to the tab without
  // immediately triggering a sound-producing interaction.
  if (!_visibilityListenerAdded) {
    _visibilityListenerAdded = true;
    document.addEventListener('visibilitychange', () => {
      if (
        document.visibilityState === 'visible' &&
        audioContext &&
        audioContext.state === 'suspended'
      ) {
        audioContext.resume();
      }
    });
  }

  return audioContext;
}

// Play crowd disappointment sound for game failure
export function playCrowdDisappointmentSound() {
  if (typeof window === 'undefined') return;
  if (!isSoundEnabled()) return;

  const audio = new Audio('/sounds/crowd-disappointment.mp3');
  audio.volume = 0.35;
  audio.play().catch(() => {
    // Ignore autoplay errors
  });
}

// Create a happy success sound using Web Audio API
export function playSuccessSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Create oscillators for a happy chord progression
  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 }, // C5
    { freq: 659.25, start: 0.1, duration: 0.15 }, // E5
    { freq: 783.99, start: 0.2, duration: 0.15 }, // G5
    { freq: 1046.5, start: 0.3, duration: 0.4 }, // C6 (sustained)
    { freq: 1318.51, start: 0.35, duration: 0.35 }, // E6 (harmony)
  ];

  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Use sine wave for a soft, pleasant tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);

    // Create envelope for each note
    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.15, currentTime + start + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.05, currentTime + start + duration * 0.7); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, currentTime + start + duration); // Release

    // Add slight vibrato for warmth
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 5; // 5Hz vibrato
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 2; // Subtle vibrato depth

    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);

    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
    vibrato.start(currentTime + start);
    vibrato.stop(currentTime + start + duration);
  });

  // Add some bell-like harmonics for extra sparkle
  const bellTime = currentTime + 0.4;
  const bell = context.createOscillator();
  const bellGain = context.createGain();

  bell.type = 'triangle';
  bell.frequency.setValueAtTime(2093, bellTime); // C7

  bellGain.gain.setValueAtTime(0, bellTime);
  bellGain.gain.linearRampToValueAtTime(0.08, bellTime + 0.01);
  bellGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.5);

  bell.connect(bellGain);
  bellGain.connect(context.destination);

  bell.start(bellTime);
  bell.stop(bellTime + 0.5);
}

// Play a pleasant ding for correct individual answers
export function playCorrectSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Create a simple, pleasant two-note ding
  const notes = [
    { freq: 659.25, start: 0, duration: 0.1 }, // E5
    { freq: 880, start: 0.05, duration: 0.15 }, // A5
  ];

  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);

    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.12, currentTime + start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + start + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
  });
}

// Play a simple click sound for interactions
export function playClickSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, context.currentTime);

  gainNode.gain.setValueAtTime(0.1, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.05);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.05);
}

// Play error sound
export function playErrorSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(200, context.currentTime);
  oscillator.frequency.linearRampToValueAtTime(150, context.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.05, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.15);
}

// Play a cute, cheerful welcome melody when starting the game
export function playStartSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Cheerful welcome melody - cute and inviting
  const notes = [
    { frequency: 523.25, start: 0, duration: 0.2 }, // C5 - welcoming
    { frequency: 659.25, start: 0.15, duration: 0.2 }, // E5 - bright
    { frequency: 783.99, start: 0.3, duration: 0.2 }, // G5 - lifting
    { frequency: 659.25, start: 0.45, duration: 0.15 }, // E5 - quick bounce
    { frequency: 783.99, start: 0.55, duration: 0.3 }, // G5 - settling
  ];

  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Use sine wave for a soft, pleasant tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.frequency, currentTime + note.start);

    // Gentle envelope for each note
    gainNode.gain.setValueAtTime(0, currentTime + note.start);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + note.start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.start + note.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + note.start);
    oscillator.stop(currentTime + note.start + note.duration);
  });
}

// Play a gentle failure sound - soft and not harsh
export function playFailureSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Create a gentle, descending melody with soft tones
  const notes = [
    { freq: 523.25, start: 0, duration: 0.2 }, // C5
    { freq: 440, start: 0.15, duration: 0.2 }, // A4
    { freq: 392, start: 0.3, duration: 0.25 }, // G4
    { freq: 329.63, start: 0.45, duration: 0.35 }, // E4 (longer, softer fade)
  ];

  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Use triangle wave for a softer, mellower tone
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);

    // Gentle envelope with soft attack and release
    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.08, currentTime + start + 0.03); // Soft attack
    gainNode.gain.setValueAtTime(0.06, currentTime + start + duration * 0.5); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration); // Gentle release

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
  });

  // Add a soft low harmony for warmth (not harsh)
  const harmony = context.createOscillator();
  const harmonyGain = context.createGain();

  harmony.type = 'sine';
  harmony.frequency.setValueAtTime(164.81, currentTime + 0.3); // E3 - low, warm tone

  harmonyGain.gain.setValueAtTime(0, currentTime + 0.3);
  harmonyGain.gain.linearRampToValueAtTime(0.04, currentTime + 0.35);
  harmonyGain.gain.setValueAtTime(0.03, currentTime + 0.6);
  harmonyGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.8);

  harmony.connect(harmonyGain);
  harmonyGain.connect(context.destination);

  harmony.start(currentTime + 0.3);
  harmony.stop(currentTime + 0.8);
}

// Play clapper sound for Reel Connections game start
export function playClapperSound() {
  if (typeof window === 'undefined') return;
  if (!isSoundEnabled()) return;

  const audio = new Audio('/sounds/clapper.wav');
  audio.volume = 0.35;
  audio.play().catch(() => {
    // Ignore autoplay errors
  });
}

// Play a soft, friendly button tone for starting the game - warm and inviting
export function playButtonTone() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Soft two-tone ascending pattern - gentle and warm
  const notes = [
    { frequency: 440, start: 0, duration: 0.08 }, // A4 - gentle start
    { frequency: 659.25, start: 0.06, duration: 0.12 }, // E5 - soft lift
  ];

  notes.forEach((note) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Triangle wave for a softer, mellower tone (like a music box)
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(note.frequency, currentTime + note.start);

    // Gentle envelope with soft attack and smooth decay
    gainNode.gain.setValueAtTime(0, currentTime + note.start);
    gainNode.gain.linearRampToValueAtTime(0.08, currentTime + note.start + 0.015);
    gainNode.gain.setValueAtTime(0.07, currentTime + note.start + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.start + note.duration);

    // Add a filter to make it even warmer and rounder
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.7;

    // Add subtle vibrato for organic warmth
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 4;
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 1.5;

    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator.frequency);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + note.start);
    oscillator.stop(currentTime + note.start + note.duration);
    vibrato.start(currentTime + note.start);
    vibrato.stop(currentTime + note.start + note.duration);
  });

  // Add a very soft "pluck" sound for gentle tactile feedback
  const pluck = context.createOscillator();
  const pluckGain = context.createGain();

  pluck.type = 'sine';
  pluck.frequency.setValueAtTime(220, currentTime);

  pluckGain.gain.setValueAtTime(0.02, currentTime);
  pluckGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.03);

  pluck.connect(pluckGain);
  pluckGain.connect(context.destination);

  pluck.start(currentTime);
  pluck.stop(currentTime + 0.03);
}

// Play a soft, magical hint sound - like a gentle lightbulb moment
export function playHintSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Create a soft, dreamy chime with a gentle sparkle
  // Main chime - softer and warmer
  const chime = context.createOscillator();
  const chimeGain = context.createGain();

  // Triangle wave for a softer, music-box-like tone
  chime.type = 'triangle';
  chime.frequency.setValueAtTime(880, currentTime); // A5

  // Gentler envelope with softer attack
  chimeGain.gain.setValueAtTime(0, currentTime);
  chimeGain.gain.linearRampToValueAtTime(0.1, currentTime + 0.03); // Softer, slower attack
  chimeGain.gain.setValueAtTime(0.08, currentTime + 0.1);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);

  // Add a warm filter
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2500; // Warmer tone
  filter.Q.value = 1; // Slight resonance for character

  chime.connect(filter);
  filter.connect(chimeGain);
  chimeGain.connect(context.destination);

  chime.start(currentTime);
  chime.stop(currentTime + 0.4);

  // Add gentle sparkle overtones - softer and more musical
  const sparkleNotes = [
    { freq: 1318.51, delay: 0.02 }, // E6 - gentle sparkle
    { freq: 1760, delay: 0.05 }, // A6 - soft twinkle
    { freq: 2093, delay: 0.08 }, // C7 - delicate shimmer
  ];

  sparkleNotes.forEach(({ freq, delay }) => {
    const sparkle = context.createOscillator();
    const sparkleGain = context.createGain();

    // Sine wave for pure, bell-like sparkles
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(freq, currentTime + delay);

    // Very gentle amplitude envelope
    sparkleGain.gain.setValueAtTime(0, currentTime + delay);
    sparkleGain.gain.linearRampToValueAtTime(0.03, currentTime + delay + 0.02); // Very soft
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + delay + 0.25);

    // Add subtle tremolo for organic feel
    const tremolo = context.createOscillator();
    tremolo.frequency.value = 6; // Gentle tremolo
    const tremoloGain = context.createGain();
    tremoloGain.gain.value = 0.01; // Very subtle

    tremolo.connect(tremoloGain);
    tremoloGain.connect(sparkleGain.gain);

    sparkle.connect(sparkleGain);
    sparkleGain.connect(context.destination);

    sparkle.start(currentTime + delay);
    sparkle.stop(currentTime + delay + 0.3);
    tremolo.start(currentTime + delay);
    tremolo.stop(currentTime + delay + 0.3);
  });

  // Add a soft harmonic undertone for warmth
  const undertone = context.createOscillator();
  const undertoneGain = context.createGain();

  undertone.type = 'sine';
  undertone.frequency.setValueAtTime(440, currentTime); // A4 - warm foundation

  undertoneGain.gain.setValueAtTime(0, currentTime);
  undertoneGain.gain.linearRampToValueAtTime(0.04, currentTime + 0.04);
  undertoneGain.gain.setValueAtTime(0.03, currentTime + 0.15);
  undertoneGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.35);

  undertone.connect(undertoneGain);
  undertoneGain.connect(context.destination);

  undertone.start(currentTime);
  undertone.stop(currentTime + 0.35);
}

// Play a "one away" sound - questioning but not negative, like "hmm, almost"
export function playOneAwaySound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Two-note "hmm" pattern - questioning but encouraging
  const notes = [
    { freq: 392, start: 0, duration: 0.12 }, // G4 - questioning
    { freq: 349.23, start: 0.1, duration: 0.18 }, // F4 - slight descent, pondering
  ];

  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Triangle wave for a softer, thoughtful tone
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);

    // Gentle envelope
    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.1, currentTime + start + 0.02);
    gainNode.gain.setValueAtTime(0.08, currentTime + start + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    // Add warmth with a lowpass filter
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
  });
}

// Play a soft, thocky keypress sound - like a quality mechanical keyboard
export function playKeyPressSound() {
  const context = initAudio();
  if (!context) {
    return;
  }

  const currentTime = context.currentTime;

  // Layer 1: Low-frequency "thock" body - the satisfying deep sound
  const thock = context.createOscillator();
  const thockGain = context.createGain();

  // Triangle wave for warm, rounded tone
  thock.type = 'triangle';
  thock.frequency.setValueAtTime(180, currentTime); // Low frequency for depth

  // Quick attack and decay for that "thock" feel
  thockGain.gain.setValueAtTime(0, currentTime);
  thockGain.gain.linearRampToValueAtTime(0.15, currentTime + 0.005); // Very fast attack
  thockGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.04); // Quick decay

  // Add a lowpass filter for warmth
  const thockFilter = context.createBiquadFilter();
  thockFilter.type = 'lowpass';
  thockFilter.frequency.value = 800; // Warm, muffled tone
  thockFilter.Q.value = 0.5; // Gentle rolloff

  thock.connect(thockFilter);
  thockFilter.connect(thockGain);
  thockGain.connect(context.destination);

  thock.start(currentTime);
  thock.stop(currentTime + 0.05);

  // Layer 2: Mid-frequency "click" - the tactile feedback
  const click = context.createOscillator();
  const clickGain = context.createGain();

  // Sine wave for clean, crisp click
  click.type = 'sine';
  click.frequency.setValueAtTime(1200, currentTime); // Mid-high frequency

  // Very short, sharp envelope
  clickGain.gain.setValueAtTime(0, currentTime);
  clickGain.gain.linearRampToValueAtTime(0.08, currentTime + 0.002); // Instant attack
  clickGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.015); // Very quick decay

  click.connect(clickGain);
  clickGain.connect(context.destination);

  click.start(currentTime);
  click.stop(currentTime + 0.02);

  // Layer 3: Subtle high-frequency "tap" - adds airiness
  const tap = context.createOscillator();
  const tapGain = context.createGain();

  // Triangle wave for softer highs
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(2400, currentTime); // High frequency

  // Very subtle, quick envelope
  tapGain.gain.setValueAtTime(0, currentTime);
  tapGain.gain.linearRampToValueAtTime(0.03, currentTime + 0.001); // Instant
  tapGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.01); // Ultra quick

  // High-shelf filter to soften the highs
  const tapFilter = context.createBiquadFilter();
  tapFilter.type = 'highshelf';
  tapFilter.frequency.value = 3000;
  tapFilter.gain.value = -3; // Reduce harshness

  tap.connect(tapFilter);
  tapFilter.connect(tapGain);
  tapGain.connect(context.destination);

  tap.start(currentTime);
  tap.stop(currentTime + 0.012);
}

// Play a wondrous magical sound for Element Soup combinations
export function playCombineSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Magical swirl - ascending with a mystical feel
  const swirlNotes = [
    { freq: 392, start: 0, duration: 0.12 }, // G4
    { freq: 523.25, start: 0.06, duration: 0.12 }, // C5
    { freq: 659.25, start: 0.12, duration: 0.15 }, // E5
  ];

  swirlNotes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.1, currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    // Add subtle vibrato for magical shimmer
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 8;
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 3;

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
    vibrato.start(currentTime + start);
    vibrato.stop(currentTime + start + duration);
  });

  // Layer 2: Culminating chime - the moment of creation
  const chime = context.createOscillator();
  const chimeGain = context.createGain();

  chime.type = 'sine';
  chime.frequency.setValueAtTime(783.99, currentTime + 0.18); // G5

  chimeGain.gain.setValueAtTime(0, currentTime + 0.18);
  chimeGain.gain.linearRampToValueAtTime(0.15, currentTime + 0.19);
  chimeGain.gain.setValueAtTime(0.12, currentTime + 0.25);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);

  chime.connect(chimeGain);
  chimeGain.connect(context.destination);

  chime.start(currentTime + 0.18);
  chime.stop(currentTime + 0.45);

  // Layer 3: Sparkle dust - quick high twinkles
  const sparkles = [
    { freq: 1318.51, start: 0.2, duration: 0.1 }, // E6
    { freq: 1567.98, start: 0.24, duration: 0.12 }, // G6
  ];

  sparkles.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.04, currentTime + start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 4: Soft harmonic undertone - warmth and wonder
  const undertone = context.createOscillator();
  const undertoneGain = context.createGain();

  undertone.type = 'sine';
  undertone.frequency.setValueAtTime(196, currentTime); // G3

  undertoneGain.gain.setValueAtTime(0, currentTime);
  undertoneGain.gain.linearRampToValueAtTime(0.06, currentTime + 0.05);
  undertoneGain.gain.setValueAtTime(0.04, currentTime + 0.2);
  undertoneGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.35);

  undertone.connect(undertoneGain);
  undertoneGain.connect(context.destination);

  undertone.start(currentTime);
  undertone.stop(currentTime + 0.4);
}

// Play a triumphant fanfare for first discovery in Element Soup
export function playFirstDiscoverySound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Triumphant ascending arpeggio (compressed timing)
  const notes = [
    { freq: 523.25, start: 0, duration: 0.12 }, // C5
    { freq: 659.25, start: 0.07, duration: 0.12 }, // E5
    { freq: 783.99, start: 0.14, duration: 0.12 }, // G5
    { freq: 1046.5, start: 0.21, duration: 0.28 }, // C6
    { freq: 1318.51, start: 0.25, duration: 0.25 }, // E6
    { freq: 1567.98, start: 0.29, duration: 0.32 }, // G6
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.15, currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Add sparkle harmonics
  const sparkles = [
    { freq: 2093, start: 0.35, duration: 0.2 }, // C7
    { freq: 2637, start: 0.39, duration: 0.18 }, // E7
  ];

  sparkles.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.06, currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });
}

// Play a triumphant victory sound for Element Soup game completion
export function playSoupWinSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Triumphant fanfare - ascending victory melody
  const fanfareNotes = [
    { freq: 523.25, start: 0, duration: 0.15 }, // C5
    { freq: 659.25, start: 0.12, duration: 0.15 }, // E5
    { freq: 783.99, start: 0.24, duration: 0.15 }, // G5
    { freq: 1046.5, start: 0.36, duration: 0.4 }, // C6 - victory peak
  ];

  fanfareNotes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.15, currentTime + start + 0.015);
    gain.gain.setValueAtTime(0.12, currentTime + start + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 2: Celebratory harmony - rich chord
  const harmonyNotes = [
    { freq: 261.63, start: 0.36, duration: 0.5 }, // C4
    { freq: 329.63, start: 0.38, duration: 0.48 }, // E4
    { freq: 392, start: 0.4, duration: 0.46 }, // G4
  ];

  harmonyNotes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.08, currentTime + start + 0.03);
    gain.gain.setValueAtTime(0.06, currentTime + start + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 3: Sparkle cascade - celebration twinkles
  const sparkles = [
    { freq: 1318.51, start: 0.5, duration: 0.15 }, // E6
    { freq: 1567.98, start: 0.55, duration: 0.15 }, // G6
    { freq: 2093, start: 0.6, duration: 0.2 }, // C7
    { freq: 2637, start: 0.65, duration: 0.2 }, // E7
  ];

  sparkles.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.05, currentTime + start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 4: Deep celebratory bass - grounding victory
  const bass = context.createOscillator();
  const bassGain = context.createGain();

  bass.type = 'sine';
  bass.frequency.setValueAtTime(130.81, currentTime + 0.36); // C3

  bassGain.gain.setValueAtTime(0, currentTime + 0.36);
  bassGain.gain.linearRampToValueAtTime(0.1, currentTime + 0.4);
  bassGain.gain.setValueAtTime(0.08, currentTime + 0.6);
  bassGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.9);

  bass.connect(bassGain);
  bassGain.connect(context.destination);

  bass.start(currentTime + 0.36);
  bass.stop(currentTime + 1.0);
}

// Play a magical "start game" sound for Element Soup - evokes wonder and discovery
export function playSoupStartSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Magical ascending shimmer - like opening a spellbook
  // Layer 1: Warm foundation chord
  const foundationNotes = [
    { freq: 261.63, start: 0, duration: 0.5 }, // C4 - grounding
    { freq: 329.63, start: 0.05, duration: 0.45 }, // E4 - warmth
  ];

  foundationNotes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.06, currentTime + start + 0.03);
    gain.gain.setValueAtTime(0.045, currentTime + start + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 2: Ascending magical arpeggio - wonder and discovery
  const arpeggioNotes = [
    { freq: 523.25, start: 0.1, duration: 0.18 }, // C5
    { freq: 659.25, start: 0.2, duration: 0.18 }, // E5
    { freq: 783.99, start: 0.3, duration: 0.18 }, // G5
    { freq: 1046.5, start: 0.4, duration: 0.3 }, // C6 - peak wonder
  ];

  arpeggioNotes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.09, currentTime + start + 0.015);
    gain.gain.setValueAtTime(0.075, currentTime + start + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    // Add subtle vibrato for magical feel
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 5;
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 2;

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
    vibrato.start(currentTime + start);
    vibrato.stop(currentTime + start + duration);
  });

  // Layer 3: Sparkle/twinkle effects - sense of magic
  const sparkles = [
    { freq: 1318.51, start: 0.45, duration: 0.2 }, // E6
    { freq: 1567.98, start: 0.5, duration: 0.2 }, // G6
    { freq: 2093, start: 0.55, duration: 0.25 }, // C7
  ];

  sparkles.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.0375, currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });

  // Layer 4: Low mystical hum - sense of ancient wisdom
  const hum = context.createOscillator();
  const humGain = context.createGain();

  hum.type = 'sine';
  hum.frequency.setValueAtTime(130.81, currentTime); // C3

  humGain.gain.setValueAtTime(0, currentTime);
  humGain.gain.linearRampToValueAtTime(0.03, currentTime + 0.1);
  humGain.gain.setValueAtTime(0.0225, currentTime + 0.4);
  humGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.7);

  hum.connect(humGain);
  humGain.connect(context.destination);

  hum.start(currentTime);
  hum.stop(currentTime + 0.7);
}

// Play a subtle "plunk" sound when selecting an element (like Infinite Craft)
export function playPlunkSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Warm low-frequency plop — satisfying single-layer click
  const plop = context.createOscillator();
  const plopGain = context.createGain();

  plop.type = 'sine';
  plop.frequency.setValueAtTime(350, currentTime);
  plop.frequency.exponentialRampToValueAtTime(130, currentTime + 0.09);

  plopGain.gain.setValueAtTime(0, currentTime);
  plopGain.gain.linearRampToValueAtTime(0.14, currentTime + 0.005);
  plopGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

  plop.connect(plopGain);
  plopGain.connect(context.destination);

  plop.start(currentTime);
  plop.stop(currentTime + 0.12);
}

// Play a new element discovery sound (softer than first discovery)
export function playNewElementSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Gentle ascending chime
  const notes = [
    { freq: 659.25, start: 0, duration: 0.12 }, // E5
    { freq: 880, start: 0.08, duration: 0.12 }, // A5
    { freq: 1046.5, start: 0.16, duration: 0.2 }, // C6
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.1, currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });
}

// Play a satisfying "pop" sound when adding an element to favorites
export function playFavoriteAddSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Bubbly pop - quick pitch drop like a bubble popping
  const pop = context.createOscillator();
  const popGain = context.createGain();

  pop.type = 'sine';
  pop.frequency.setValueAtTime(600, currentTime);
  pop.frequency.exponentialRampToValueAtTime(200, currentTime + 0.08);

  popGain.gain.setValueAtTime(0, currentTime);
  popGain.gain.linearRampToValueAtTime(0.15, currentTime + 0.005);
  popGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

  pop.connect(popGain);
  popGain.connect(context.destination);

  pop.start(currentTime);
  pop.stop(currentTime + 0.12);

  // Layer 2: Bright "ding" overtone for satisfaction
  const ding = context.createOscillator();
  const dingGain = context.createGain();

  ding.type = 'triangle';
  ding.frequency.setValueAtTime(1200, currentTime + 0.02);

  dingGain.gain.setValueAtTime(0, currentTime + 0.02);
  dingGain.gain.linearRampToValueAtTime(0.08, currentTime + 0.025);
  dingGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.12);

  ding.connect(dingGain);
  dingGain.connect(context.destination);

  ding.start(currentTime + 0.02);
  ding.stop(currentTime + 0.15);

  // Layer 3: Subtle sparkle for star-like feel
  const sparkle = context.createOscillator();
  const sparkleGain = context.createGain();

  sparkle.type = 'sine';
  sparkle.frequency.setValueAtTime(2000, currentTime + 0.03);

  sparkleGain.gain.setValueAtTime(0, currentTime + 0.03);
  sparkleGain.gain.linearRampToValueAtTime(0.04, currentTime + 0.035);
  sparkleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

  sparkle.connect(sparkleGain);
  sparkleGain.connect(context.destination);

  sparkle.start(currentTime + 0.03);
  sparkle.stop(currentTime + 0.12);
}

// Play a "sweep" sound when clearing all favorites with the broom
export function playFavoriteClearSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Descending whoosh - like sweeping away
  const whoosh = context.createOscillator();
  const whooshGain = context.createGain();

  whoosh.type = 'sawtooth';
  whoosh.frequency.setValueAtTime(800, currentTime);
  whoosh.frequency.exponentialRampToValueAtTime(100, currentTime + 0.25);

  // Lowpass filter to make it softer
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, currentTime + 0.2);
  filter.Q.value = 1;

  whooshGain.gain.setValueAtTime(0, currentTime);
  whooshGain.gain.linearRampToValueAtTime(0.06, currentTime + 0.02);
  whooshGain.gain.setValueAtTime(0.05, currentTime + 0.1);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);

  whoosh.connect(filter);
  filter.connect(whooshGain);
  whooshGain.connect(context.destination);

  whoosh.start(currentTime);
  whoosh.stop(currentTime + 0.35);

  // Layer 2: Soft brush texture using noise-like effect
  const brushNotes = [
    { freq: 400, start: 0, duration: 0.08 },
    { freq: 300, start: 0.06, duration: 0.08 },
    { freq: 200, start: 0.12, duration: 0.1 },
  ];

  brushNotes.forEach(({ freq, start, duration }) => {
    const brush = context.createOscillator();
    const brushGain = context.createGain();

    brush.type = 'triangle';
    brush.frequency.setValueAtTime(freq, currentTime + start);
    brush.frequency.exponentialRampToValueAtTime(freq * 0.5, currentTime + start + duration);

    brushGain.gain.setValueAtTime(0, currentTime + start);
    brushGain.gain.linearRampToValueAtTime(0.03, currentTime + start + 0.01);
    brushGain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    brush.connect(brushGain);
    brushGain.connect(context.destination);

    brush.start(currentTime + start);
    brush.stop(currentTime + start + duration + 0.05);
  });

  // Layer 3: Final soft thud - like dust settling
  const thud = context.createOscillator();
  const thudGain = context.createGain();

  thud.type = 'sine';
  thud.frequency.setValueAtTime(120, currentTime + 0.2);

  thudGain.gain.setValueAtTime(0, currentTime + 0.2);
  thudGain.gain.linearRampToValueAtTime(0.06, currentTime + 0.21);
  thudGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.35);

  thud.connect(thudGain);
  thudGain.connect(context.destination);

  thud.start(currentTime + 0.2);
  thud.stop(currentTime + 0.4);
}

// Play a satisfying deep thock sound for toggle switches
export function playSwitchClickSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Muted click transient - short, soft attack
  const click = context.createOscillator();
  const clickGain = context.createGain();

  click.type = 'triangle';
  click.frequency.setValueAtTime(1200, currentTime);
  click.frequency.exponentialRampToValueAtTime(400, currentTime + 0.01);

  clickGain.gain.setValueAtTime(0.08, currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.02);

  click.connect(clickGain);
  clickGain.connect(context.destination);

  click.start(currentTime);
  click.stop(currentTime + 0.03);

  // Layer 2: Deep resonant thock - the satisfying body of the sound
  const thock = context.createOscillator();
  const thockGain = context.createGain();

  thock.type = 'sine';
  thock.frequency.setValueAtTime(250, currentTime);
  thock.frequency.exponentialRampToValueAtTime(120, currentTime + 0.06);

  thockGain.gain.setValueAtTime(0.15, currentTime);
  thockGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

  thock.connect(thockGain);
  thockGain.connect(context.destination);

  thock.start(currentTime);
  thock.stop(currentTime + 0.1);
}

// Play a gentle notification chime for received co-op emotes
export function playEmoteNotificationSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Two gentle ascending notes - soft and non-intrusive
  const notes = [
    { freq: 659.25, start: 0, duration: 0.12 }, // E5
    { freq: 783.99, start: 0.08, duration: 0.15 }, // G5
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.08, currentTime + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration + 0.02);
  });
}

// Play a soft pop when a co-op partner's element appears in your bank
export function playPartnerElementSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Soft bubble pop - quick pitch drop
  const pop = context.createOscillator();
  const popGain = context.createGain();

  pop.type = 'sine';
  pop.frequency.setValueAtTime(500, currentTime);
  pop.frequency.exponentialRampToValueAtTime(180, currentTime + 0.06);

  popGain.gain.setValueAtTime(0, currentTime);
  popGain.gain.linearRampToValueAtTime(0.07, currentTime + 0.004);
  popGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

  pop.connect(popGain);
  popGain.connect(context.destination);

  pop.start(currentTime);
  pop.stop(currentTime + 0.1);

  // Layer 2: Subtle bright sparkle
  const sparkle = context.createOscillator();
  const sparkleGain = context.createGain();

  sparkle.type = 'sine';
  sparkle.frequency.setValueAtTime(1400, currentTime + 0.01);

  sparkleGain.gain.setValueAtTime(0, currentTime + 0.01);
  sparkleGain.gain.linearRampToValueAtTime(0.025, currentTime + 0.015);
  sparkleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

  sparkle.connect(sparkleGain);
  sparkleGain.connect(context.destination);

  sparkle.start(currentTime + 0.01);
  sparkle.stop(currentTime + 0.1);
}

// Play a descending whoosh when clearing element selections
export function playClearSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Filtered noise burst sweeping down — feels like wiping away
  const bufferSize = context.sampleRate * 0.12;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(1.5, currentTime);
  filter.frequency.setValueAtTime(800, currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, currentTime + 0.1);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0, currentTime);
  gain.gain.linearRampToValueAtTime(0.18, currentTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(currentTime);
  noise.stop(currentTime + 0.12);
}

// Play a crisp click/thock when pressing the Combine or Subtract button
export function playCombineButtonSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Layer 1: Sharp click transient — the snap you hear first
  const click = context.createOscillator();
  const clickGain = context.createGain();

  click.type = 'triangle';
  click.frequency.setValueAtTime(1100, currentTime);
  click.frequency.exponentialRampToValueAtTime(350, currentTime + 0.012);

  clickGain.gain.setValueAtTime(0.12, currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.025);

  click.connect(clickGain);
  clickGain.connect(context.destination);

  click.start(currentTime);
  click.stop(currentTime + 0.03);

  // Layer 2: Resonant thock body — the satisfying low-end follow-through
  const thock = context.createOscillator();
  const thockGain = context.createGain();

  thock.type = 'sine';
  thock.frequency.setValueAtTime(280, currentTime);
  thock.frequency.exponentialRampToValueAtTime(140, currentTime + 0.05);

  thockGain.gain.setValueAtTime(0.14, currentTime);
  thockGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.06);

  thock.connect(thockGain);
  thockGain.connect(context.destination);

  thock.start(currentTime);
  thock.stop(currentTime + 0.08);
}

// Play a gentle ascending two-note chime when saving to a slot
export function playSaveSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  const notes = [
    { freq: 523.25, start: 0, duration: 0.1 }, // C5
    { freq: 659.25, start: 0.06, duration: 0.12 }, // E5
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.08, currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration + 0.02);
  });
}

// =============================================================================
// A: SIGNATURE COMPLETION SOUNDS — Per-game variants with shared melodic DNA
// =============================================================================

// Shared "Tandem ding" motif: rising 3-note pattern resolving to a satisfying peak
// Each game transposes to its own key and uses a unique timbre

// Tandem: Marimba-like (warm wood) — C major
export function playTandemCompletionSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Wood transient (noise burst through bandpass)
  const noiseLen = 0.03;
  const noiseBuf = createNoiseBuffer(context, noiseLen);

  const motif = [
    { freq: 523.25, start: 0, dur: 0.18 }, // C5
    { freq: 659.25, start: 0.12, dur: 0.18 }, // E5
    { freq: 783.99, start: 0.24, dur: 0.18 }, // G5
    { freq: 1046.5, start: 0.38, dur: 0.45 }, // C6 — peak
  ];

  motif.forEach(({ freq, start, dur }) => {
    // Wood transient
    const noise = context.createBufferSource();
    noise.buffer = noiseBuf;
    const bp = context.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 1.5;
    bp.Q.value = 2;
    const ng = context.createGain();
    ng.gain.setValueAtTime(0.12 * vol, t + start);
    ng.gain.exponentialRampToValueAtTime(0.001, t + start + 0.02);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(context.destination);
    noise.start(t + start);
    noise.stop(t + start + noiseLen);

    // Triangle body (marimba-like)
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + start);
    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.18 * vol, t + start + 0.008);
    g.gain.setValueAtTime(0.14 * vol, t + start + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    const lp = context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 0.7;

    osc.connect(lp);
    lp.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });

  // Warm harmonic undertone
  const sub = context.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 261.63; // C4
  const sg = context.createGain();
  sg.gain.setValueAtTime(0, t + 0.38);
  sg.gain.linearRampToValueAtTime(0.06 * vol, t + 0.42);
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
  sub.connect(sg);
  sg.connect(context.destination);
  sub.start(t + 0.38);
  sub.stop(t + 0.9);

  // Bell shimmer on peak
  const bell = context.createOscillator();
  bell.type = 'sine';
  bell.frequency.value = 2093; // C7
  const bg = context.createGain();
  bg.gain.setValueAtTime(0, t + 0.42);
  bg.gain.linearRampToValueAtTime(0.05 * vol, t + 0.44);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  bell.connect(bg);
  bg.connect(context.destination);
  bell.start(t + 0.42);
  bell.stop(t + 0.85);
}

// Mini: Piano-like (detuned sine pairs for chorus) — F major
export function playMiniCompletionSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  const motif = [
    { freq: 349.23, start: 0, dur: 0.2 }, // F4
    { freq: 440, start: 0.13, dur: 0.2 }, // A4
    { freq: 523.25, start: 0.26, dur: 0.2 }, // C5
    { freq: 698.46, start: 0.4, dur: 0.5 }, // F5 — peak
  ];

  motif.forEach(({ freq, start, dur }) => {
    // Detuned pair for chorus/piano feel
    [-1.5, 1.5].forEach((detune) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + start);
      osc.detune.value = detune;

      const g = context.createGain();
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(0.12 * vol, t + start + 0.005);
      g.gain.setValueAtTime(0.09 * vol, t + start + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

      osc.connect(g);
      g.connect(context.destination);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.05);
    });
  });

  // Soft sustain pedal resonance
  const res = context.createOscillator();
  res.type = 'sine';
  res.frequency.value = 174.61; // F3
  const rg = context.createGain();
  rg.gain.setValueAtTime(0, t + 0.4);
  rg.gain.linearRampToValueAtTime(0.04 * vol, t + 0.45);
  rg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  res.connect(rg);
  rg.connect(context.destination);
  res.start(t + 0.4);
  res.stop(t + 0.95);
}

// Reel: Cinematic (brass-like filtered sawtooth) — Bb major
export function playReelCompletionSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  const motif = [
    { freq: 233.08, start: 0, dur: 0.2 }, // Bb3
    { freq: 293.66, start: 0.12, dur: 0.2 }, // D4
    { freq: 349.23, start: 0.24, dur: 0.2 }, // F4
    { freq: 466.16, start: 0.38, dur: 0.5 }, // Bb4 — peak
  ];

  motif.forEach(({ freq, start, dur }) => {
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t + start);

    // Lowpass to tame sawtooth into brass-like warmth
    const lp = context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(freq * 3, t + start);
    lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t + start + dur);
    lp.Q.value = 1.2;

    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.08 * vol, t + start + 0.02);
    g.gain.setValueAtTime(0.06 * vol, t + start + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    osc.connect(lp);
    lp.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });

  // Dramatic low brass support
  const brass = context.createOscillator();
  brass.type = 'sawtooth';
  brass.frequency.value = 116.54; // Bb2
  const blp = context.createBiquadFilter();
  blp.type = 'lowpass';
  blp.frequency.value = 400;
  blp.Q.value = 0.7;
  const bg = context.createGain();
  bg.gain.setValueAtTime(0, t + 0.38);
  bg.gain.linearRampToValueAtTime(0.05 * vol, t + 0.42);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  brass.connect(blp);
  blp.connect(bg);
  bg.connect(context.destination);
  brass.start(t + 0.38);
  brass.stop(t + 0.95);

  // Cinematic cymbal shimmer
  const noiseBuf = createNoiseBuffer(context, 0.5);
  const cymbal = context.createBufferSource();
  cymbal.buffer = noiseBuf;
  const hp = context.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const cg = context.createGain();
  cg.gain.setValueAtTime(0, t + 0.38);
  cg.gain.linearRampToValueAtTime(0.04 * vol, t + 0.42);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
  cymbal.connect(hp);
  hp.connect(cg);
  cg.connect(context.destination);
  cymbal.start(t + 0.38);
  cymbal.stop(t + 0.9);
}

// Alchemy: Enhanced version of existing soup win (mystical with shared motif DNA)
export function playAlchemyCompletionSound() {
  // Delegate to existing sound which already has the right character
  playSoupWinSound();
}

// =============================================================================
// B: PER-GAME SONIC PALETTES — Tandem and Mini get unique correct/error sounds
// =============================================================================

// Tandem correct: Wood block tap (warm, tactile)
export function playTandemCorrectSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Noise transient (wood attack)
  const noiseBuf = createNoiseBuffer(context, 0.025);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = context.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 1.5;
  const ng = context.createGain();
  ng.gain.setValueAtTime(0.15 * vol, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.03);

  // Warm triangle body
  const osc = context.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(659.25, t); // E5
  osc.frequency.setValueAtTime(880, t + 0.04); // A5
  const g = context.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14 * vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  const lp = context.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2000;

  osc.connect(lp);
  lp.connect(g);
  g.connect(context.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}

// Tandem error: Soft wooden "bonk" (not harsh)
export function playTandemErrorSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Low wood thud
  const osc = context.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  const g = context.createGain();
  g.gain.setValueAtTime(0.12 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  const lp = context.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  osc.connect(lp);
  lp.connect(g);
  g.connect(context.destination);
  osc.start(t);
  osc.stop(t + 0.15);

  // Muffled noise for wood texture
  const noiseBuf = createNoiseBuffer(context, 0.04);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = context.createBiquadFilter();
  bp.type = 'lowpass';
  bp.frequency.value = 600;
  const ng = context.createGain();
  ng.gain.setValueAtTime(0.06 * vol, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.05);
}

// Mini correct: Pencil-scratch ping (crisp, cerebral)
export function playMiniCorrectSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Scratch transient (short noise through highpass)
  const noiseBuf = createNoiseBuffer(context, 0.015);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const hp = context.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000;
  const ng = context.createGain();
  ng.gain.setValueAtTime(0.06 * vol, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  noise.connect(hp);
  hp.connect(ng);
  ng.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.02);

  // Clean sine ping
  [-1.2, 1.2].forEach((detune) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(698.46, t); // F5
    osc.detune.value = detune;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

// Mini error: Soft eraser rub
export function playMiniErrorSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Filtered noise sweep down (eraser)
  const noiseBuf = createNoiseBuffer(context, 0.15);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = context.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1200, t);
  bp.frequency.exponentialRampToValueAtTime(400, t + 0.12);
  bp.Q.value = 1;
  const g = context.createGain();
  g.gain.setValueAtTime(0.08 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(bp);
  bp.connect(g);
  g.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.15);
}

// Reel correct: Cinematic "reveal" with pan direction
export function playReelCorrectSound(pan = 0) {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  const panner = createPanner(context, pan);

  // Brass stab
  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(466.16, t); // Bb4
  osc.frequency.setValueAtTime(587.33, t + 0.05); // D5
  const lp = context.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2000, t);
  lp.frequency.exponentialRampToValueAtTime(800, t + 0.15);
  lp.Q.value = 1;
  const g = context.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.1 * vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(lp);
  lp.connect(g);
  connectToOutput(context, g, panner);
  osc.start(t);
  osc.stop(t + 0.25);

  // Subtle cymbal hit
  const noiseBuf = createNoiseBuffer(context, 0.12);
  const cymbal = context.createBufferSource();
  cymbal.buffer = noiseBuf;
  const hp = context.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const cg = context.createGain();
  cg.gain.setValueAtTime(0.03 * vol, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  cymbal.connect(hp);
  hp.connect(cg);
  connectToOutput(context, cg, panner ? createPanner(context, pan) : null);
  cymbal.start(t);
  cymbal.stop(t + 0.15);
}

// Reel error: Dramatic "wrong answer" buzzer (soft, cinematic)
export function playReelErrorSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Low brass buzz
  const osc = context.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.linearRampToValueAtTime(100, t + 0.15);
  const lp = context.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  lp.Q.value = 0.8;
  const g = context.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06 * vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(lp);
  lp.connect(g);
  g.connect(context.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

// =============================================================================
// C: KEYPRESS PITCH ESCALATION — pitch rises as row fills
// =============================================================================

// position: 0-based index of the letter being typed
// totalLetters: total letters in the row (e.g., 5)
export function playKeyPressEscalating(position = 0, totalLetters = 5) {
  const context = initAudio();
  if (!context) return;

  const vol = getVolumeFor('keypress');
  if (vol === 0) return;

  const t = context.currentTime;

  // Base pitch rises with position
  const basePitch = 180 + (position / Math.max(totalLetters - 1, 1)) * 80;
  const clickPitch = 1200 + (position / Math.max(totalLetters - 1, 1)) * 400;

  // Layer 1: Low-frequency "thock" body
  const thock = context.createOscillator();
  thock.type = 'triangle';
  thock.frequency.setValueAtTime(basePitch, t);

  const thockGain = context.createGain();
  thockGain.gain.setValueAtTime(0.15 * vol, t);
  thockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  const thockFilter = context.createBiquadFilter();
  thockFilter.type = 'lowpass';
  thockFilter.frequency.value = 800;
  thockFilter.Q.value = 0.5;

  thock.connect(thockFilter);
  thockFilter.connect(thockGain);
  thockGain.connect(context.destination);
  thock.start(t);
  thock.stop(t + 0.05);

  // Layer 2: Mid-frequency click (escalating)
  const click = context.createOscillator();
  click.type = 'sine';
  click.frequency.setValueAtTime(clickPitch, t);

  const clickGain = context.createGain();
  clickGain.gain.setValueAtTime(0.08 * vol, t);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

  click.connect(clickGain);
  clickGain.connect(context.destination);
  click.start(t);
  click.stop(t + 0.02);

  // Layer 3: Subtle high tap
  const tap = context.createOscillator();
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(2400 + position * 100, t);

  const tapGain = context.createGain();
  tapGain.gain.setValueAtTime(0.03 * vol, t);
  tapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);

  tap.connect(tapGain);
  tapGain.connect(context.destination);
  tap.start(t);
  tap.stop(t + 0.012);
}

// =============================================================================
// D: STREAK CHIME — Progressive audio reward based on streak length
// =============================================================================

// Wraps a game's completion sound with progressive layers based on streak
// game: 'tandem' | 'mini' | 'reel' | 'alchemy'
// streakCount: current streak length
export function playStreakCompletionSound(game, streakCount = 1) {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Play the base game completion sound
  switch (game) {
    case 'tandem':
      playTandemCompletionSound();
      break;
    case 'mini':
      playMiniCompletionSound();
      break;
    case 'reel':
      playReelCompletionSound();
      break;
    case 'alchemy':
      playAlchemyCompletionSound();
      break;
    default:
      playTandemCompletionSound();
  }

  // Day 1-6: Just the base sound
  if (streakCount < 7) return;

  // Day 7+: Add a harmonic 5th undertone
  const fifthFreqs = {
    tandem: 196, // G3 (5th below C4)
    mini: 130.81, // C3 (5th below F3)
    reel: 155.56, // Eb3 (5th below Bb3)
    alchemy: 196, // G3
  };

  const fifth = context.createOscillator();
  fifth.type = 'sine';
  fifth.frequency.value = fifthFreqs[game] || 196;
  const fg = context.createGain();
  fg.gain.setValueAtTime(0, t + 0.3);
  fg.gain.linearRampToValueAtTime(0.05 * vol, t + 0.4);
  fg.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  fifth.connect(fg);
  fg.connect(context.destination);
  fifth.start(t + 0.3);
  fifth.stop(t + 1.1);

  // Day 30+: Add a brief ascending arpeggio before the ding
  if (streakCount < 30) return;

  const graceNotes = [
    { freq: 392, start: -0.15, dur: 0.08 }, // G4
    { freq: 440, start: -0.1, dur: 0.08 }, // A4
    { freq: 493.88, start: -0.05, dur: 0.08 }, // B4
  ];

  graceNotes.forEach(({ freq, start, dur }) => {
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = context.createGain();
    // Grace notes play before the completion, so use max(0, scheduled time)
    const schedTime = Math.max(t + start, t);
    g.gain.setValueAtTime(0, schedTime);
    g.gain.linearRampToValueAtTime(0.06 * vol, schedTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, schedTime + dur);
    osc.connect(g);
    g.connect(context.destination);
    osc.start(schedTime);
    osc.stop(schedTime + dur + 0.02);
  });

  // Day 100+: Full mini-fanfare with sparkle cascade
  if (streakCount < 100) return;

  const sparkles = [
    { freq: 2093, start: 0.6, dur: 0.15 }, // C7
    { freq: 2349.32, start: 0.65, dur: 0.15 }, // D7
    { freq: 2637.02, start: 0.7, dur: 0.15 }, // E7
    { freq: 3135.96, start: 0.75, dur: 0.2 }, // G7
    { freq: 4186.01, start: 0.82, dur: 0.25 }, // C8
  ];

  sparkles.forEach(({ freq, start, dur }) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.04 * vol, t + start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.02);
  });
}

// =============================================================================
// E: ALL FOUR DONE FANFARE — Plays when all 4 daily games are complete
// =============================================================================

export function playAllFourDoneFanfare() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Movement 1: Tandem motif fragment (C major, marimba)
  const m1 = [
    { freq: 523.25, start: 0, dur: 0.12, type: 'triangle' }, // C5
    { freq: 659.25, start: 0.08, dur: 0.12, type: 'triangle' }, // E5
  ];

  // Movement 2: Mini motif fragment (F major, piano)
  const m2 = [
    { freq: 698.46, start: 0.2, dur: 0.12, type: 'sine' }, // F5
    { freq: 880, start: 0.28, dur: 0.12, type: 'sine' }, // A5
  ];

  // Movement 3: Reel motif fragment (Bb, brass)
  const m3 = [
    { freq: 932.33, start: 0.4, dur: 0.12, type: 'sawtooth' }, // Bb5
    { freq: 1174.66, start: 0.48, dur: 0.12, type: 'sawtooth' }, // D6
  ];

  // Movement 4: Alchemy motif fragment (mystical, resolves)
  const m4 = [
    { freq: 1318.51, start: 0.6, dur: 0.12, type: 'triangle' }, // E6
    { freq: 1567.98, start: 0.68, dur: 0.12, type: 'triangle' }, // G6
  ];

  // Grand resolution chord
  const resolution = [
    { freq: 261.63, start: 0.82, dur: 0.8, type: 'sine' }, // C4
    { freq: 329.63, start: 0.84, dur: 0.78, type: 'sine' }, // E4
    { freq: 392, start: 0.86, dur: 0.76, type: 'sine' }, // G4
    { freq: 523.25, start: 0.88, dur: 0.74, type: 'sine' }, // C5
    { freq: 659.25, start: 0.9, dur: 0.72, type: 'sine' }, // E5
    { freq: 1046.5, start: 0.92, dur: 0.7, type: 'triangle' }, // C6
  ];

  [...m1, ...m2, ...m3, ...m4].forEach(({ freq, start, dur, type }) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.12 * vol, t + start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    if (type === 'sawtooth') {
      const lp = context.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = freq * 2;
      lp.Q.value = 0.8;
      osc.connect(lp);
      lp.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });

  // Resolution chord with swell
  resolution.forEach(({ freq, start, dur, type }) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.08 * vol, t + start + 0.05);
    g.gain.setValueAtTime(0.06 * vol, t + start + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.1);
  });

  // Final sparkle cascade
  const sparkles = [
    { freq: 2093, start: 1.1, dur: 0.15 },
    { freq: 2637.02, start: 1.15, dur: 0.15 },
    { freq: 3135.96, start: 1.2, dur: 0.15 },
    { freq: 3951.07, start: 1.25, dur: 0.2 },
    { freq: 4186.01, start: 1.32, dur: 0.3 },
  ];

  sparkles.forEach(({ freq, start, dur }) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.05 * vol, t + start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });

  // Warm bass note to ground everything
  const bass = context.createOscillator();
  bass.type = 'sine';
  bass.frequency.value = 65.41; // C2
  const bg = context.createGain();
  bg.gain.setValueAtTime(0, t + 0.82);
  bg.gain.linearRampToValueAtTime(0.07 * vol, t + 0.9);
  bg.gain.setValueAtTime(0.05 * vol, t + 1.2);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
  bass.connect(bg);
  bg.connect(context.destination);
  bass.start(t + 0.82);
  bass.stop(t + 1.8);
}

// =============================================================================
// F: SPATIAL AUDIO — Directional pan for Reel and Alchemy
// =============================================================================

// Alchemy: Combine with left-center-right pan
export function playCombineSoundSpatial(leftPan = -0.4, rightPan = 0.4) {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Left element (ascending note)
  const leftPanner = createPanner(context, leftPan);
  const osc1 = context.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(392, t); // G4
  const g1 = context.createGain();
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(0.1 * vol, t + 0.01);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc1.connect(g1);
  connectToOutput(context, g1, leftPanner);
  osc1.start(t);
  osc1.stop(t + 0.15);

  // Right element (ascending note)
  const rightPanner = createPanner(context, rightPan);
  const osc2 = context.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(523.25, t + 0.06); // C5
  const g2 = context.createGain();
  g2.gain.setValueAtTime(0, t + 0.06);
  g2.gain.linearRampToValueAtTime(0.1 * vol, t + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc2.connect(g2);
  connectToOutput(context, g2, rightPanner);
  osc2.start(t + 0.06);
  osc2.stop(t + 0.2);

  // Center merge (chime at center)
  const osc3 = context.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(783.99, t + 0.14); // G5
  const g3 = context.createGain();
  g3.gain.setValueAtTime(0, t + 0.14);
  g3.gain.linearRampToValueAtTime(0.12 * vol, t + 0.15);
  g3.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc3.connect(g3);
  g3.connect(context.destination); // center = no pan
  osc3.start(t + 0.14);
  osc3.stop(t + 0.4);

  // Sparkle dust at center
  [1318.51, 1567.98].forEach((freq, i) => {
    const s = context.createOscillator();
    s.type = 'sine';
    s.frequency.value = freq;
    const sg = context.createGain();
    sg.gain.setValueAtTime(0, t + 0.18 + i * 0.04);
    sg.gain.linearRampToValueAtTime(0.03 * vol, t + 0.19 + i * 0.04);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.28 + i * 0.04);
    s.connect(sg);
    sg.connect(context.destination);
    s.start(t + 0.18 + i * 0.04);
    s.stop(t + 0.32 + i * 0.04);
  });
}

// Mini: Directional correct sound based on across/down
export function playMiniCorrectSoundDirectional(direction = 'across') {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Across = slight left-to-right sweep, Down = center
  const pan = direction === 'across' ? 0.15 : 0;
  const panner = createPanner(context, pan);

  // Pencil ping with directional hint
  [-1.2, 1.2].forEach((detune) => {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(698.46, t); // F5
    osc.detune.value = detune;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    connectToOutput(context, g, panner ? createPanner(context, pan) : null);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

// =============================================================================
// G: SYNTHESIZED REPLACEMENTS FOR STOCK AUDIO FILES
// =============================================================================

// Replace clapper.wav — Film clapper synthesis
export function playClapperSoundSynthesized() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Sharp transient "clap" (noise burst)
  const noiseBuf = createNoiseBuffer(context, 0.04);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = context.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2500;
  bp.Q.value = 2;
  const ng = context.createGain();
  ng.gain.setValueAtTime(0.3 * vol, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.04);

  // Wood resonance body
  const wood = context.createOscillator();
  wood.type = 'triangle';
  wood.frequency.setValueAtTime(400, t);
  wood.frequency.exponentialRampToValueAtTime(150, t + 0.06);
  const wg = context.createGain();
  wg.gain.setValueAtTime(0.2 * vol, t);
  wg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  const lp = context.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  wood.connect(lp);
  lp.connect(wg);
  wg.connect(context.destination);
  wood.start(t);
  wood.stop(t + 0.1);

  // Second clap (the board closing) — slightly delayed
  const noise2 = context.createBufferSource();
  noise2.buffer = noiseBuf;
  const bp2 = context.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.value = 3500;
  bp2.Q.value = 2.5;
  const ng2 = context.createGain();
  ng2.gain.setValueAtTime(0.25 * vol, t + 0.05);
  ng2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  noise2.connect(bp2);
  bp2.connect(ng2);
  ng2.connect(context.destination);
  noise2.start(t + 0.05);
  noise2.stop(t + 0.09);
}

// Replace crowd-disappointment.mp3 — Synthesized crowd "aww"
export function playCrowdDisappointmentSynthesized() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Multiple descending tones at different frequencies = "crowd" feel
  const voices = [
    { freq: 350, endFreq: 200, start: 0, dur: 0.6, type: 'sine' },
    { freq: 320, endFreq: 180, start: 0.02, dur: 0.55, type: 'triangle' },
    { freq: 280, endFreq: 160, start: 0.04, dur: 0.5, type: 'sine' },
    { freq: 400, endFreq: 220, start: 0.01, dur: 0.58, type: 'triangle' },
    { freq: 260, endFreq: 150, start: 0.03, dur: 0.52, type: 'sine' },
  ];

  voices.forEach(({ freq, endFreq, start, dur, type }) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t + start);
    osc.frequency.linearRampToValueAtTime(endFreq, t + start + dur);

    // Add slight random vibrato for organic crowd feel
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 4 + Math.random() * 3;
    const vg = context.createGain();
    vg.gain.value = 3 + Math.random() * 2;
    vibrato.connect(vg);
    vg.connect(osc.frequency);

    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.04 * vol, t + start + 0.05);
    g.gain.setValueAtTime(0.035 * vol, t + start + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    const lp = context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;

    osc.connect(lp);
    lp.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.1);
    vibrato.start(t + start);
    vibrato.stop(t + start + dur + 0.1);
  });

  // Breathy noise component
  const noiseBuf = createNoiseBuffer(context, 0.7);
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = context.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.linearRampToValueAtTime(300, t + 0.6);
  bp.Q.value = 0.8;
  const ng = context.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.03 * vol, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(context.destination);
  noise.start(t);
  noise.stop(t + 0.7);
}

// Replace human_clapping_8_people.mp3 — Synthesized applause
export function playApplauseSynthesized() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Applause = many short noise bursts at slightly random intervals
  const clapCount = 24;
  const duration = 1.8;

  for (let i = 0; i < clapCount; i++) {
    const start = (i / clapCount) * duration + (Math.random() - 0.5) * 0.06;
    const noiseBuf = createNoiseBuffer(context, 0.025);
    const noise = context.createBufferSource();
    noise.buffer = noiseBuf;

    const bp = context.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 2000;
    bp.Q.value = 1 + Math.random();

    const g = context.createGain();
    // Swell: quiet → loud → fade
    const progress = i / clapCount;
    const envelope =
      progress < 0.3
        ? progress / 0.3 // ramp up
        : progress > 0.7
          ? (1 - progress) / 0.3 // ramp down
          : 1; // sustain
    g.gain.setValueAtTime(0.12 * vol * envelope, t + start);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + 0.02);

    // Random stereo position
    const pan = createPanner(context, (Math.random() - 0.5) * 0.8);
    noise.connect(bp);
    bp.connect(g);
    connectToOutput(context, g, pan);

    const schedStart = Math.max(t + start, t);
    noise.start(schedStart);
    noise.stop(schedStart + 0.025);
  }
}

// =============================================================================
// H: AMBIENT TEXTURE LAYERS — Subtle atmospheric drones per game
// =============================================================================

let _ambientNodes = null;

// Start ambient texture for a game
// game: 'tandem' | 'mini' | 'reel' | 'alchemy'
export function startAmbientTexture(game) {
  stopAmbientTexture(); // Clean up any existing

  const context = initAudio();
  if (!context) return;

  const vol = getVolumeFor('ambient');
  if (vol === 0) return;

  const nodes = [];
  const t = context.currentTime;
  const masterGain = context.createGain();
  // Fade in over 3 seconds
  masterGain.gain.setValueAtTime(0, t);
  masterGain.gain.linearRampToValueAtTime(1, t + 3);
  masterGain.connect(context.destination);

  switch (game) {
    case 'tandem': {
      // Warm pad: gentle C major drone
      [261.63, 329.63, 392].forEach((freq) => {
        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = context.createGain();
        g.gain.value = vol * 0.3;
        // Slow LFO tremolo
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.2 + Math.random() * 0.1;
        const lfoG = context.createGain();
        lfoG.gain.value = vol * 0.08;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        const lp = context.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        osc.connect(lp);
        lp.connect(g);
        g.connect(masterGain);
        osc.start(t);
        lfo.start(t);
        nodes.push(osc, lfo);
      });
      break;
    }
    case 'mini': {
      // Library ambience: gentle white noise at very low volume
      const bufferSize = context.sampleRate * 4;
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const lp = context.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      const g = context.createGain();
      g.gain.value = vol * 0.4;
      noise.connect(lp);
      lp.connect(g);
      g.connect(masterGain);
      noise.start(t);
      nodes.push(noise);
      break;
    }
    case 'reel': {
      // Film projector hum: low buzz + flutter
      const hum = context.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 60;
      const lp = context.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 200;
      lp.Q.value = 0.5;
      const g = context.createGain();
      g.gain.value = vol * 0.35;
      // Flutter LFO (projector mechanism)
      const flutter = context.createOscillator();
      flutter.frequency.value = 8;
      const flutterG = context.createGain();
      flutterG.gain.value = vol * 0.1;
      flutter.connect(flutterG);
      flutterG.connect(g.gain);
      hum.connect(lp);
      lp.connect(g);
      g.connect(masterGain);
      hum.start(t);
      flutter.start(t);
      nodes.push(hum, flutter);
      break;
    }
    case 'alchemy': {
      // Mystical bubbling: random pitched pops at intervals
      // Use a repeating noise-burst pattern
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 130.81; // C3
      const g = context.createGain();
      g.gain.value = vol * 0.25;
      // Shimmer LFO
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoG = context.createGain();
      lfoG.gain.value = vol * 0.1;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      const lp = context.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300;
      osc.connect(lp);
      lp.connect(g);
      g.connect(masterGain);
      osc.start(t);
      lfo.start(t);
      nodes.push(osc, lfo);

      // High shimmer
      const shimmer = context.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = 1046.5; // C6
      const sg = context.createGain();
      sg.gain.value = vol * 0.1;
      const sLfo = context.createOscillator();
      sLfo.frequency.value = 0.15;
      const sLfoG = context.createGain();
      sLfoG.gain.value = vol * 0.05;
      sLfo.connect(sLfoG);
      sLfoG.connect(sg.gain);
      shimmer.connect(sg);
      sg.connect(masterGain);
      shimmer.start(t);
      sLfo.start(t);
      nodes.push(shimmer, sLfo);
      break;
    }
  }

  _ambientNodes = { nodes, masterGain, context };
}

// Stop ambient texture with fade-out
export function stopAmbientTexture() {
  if (!_ambientNodes) return;

  const { nodes, masterGain, context } = _ambientNodes;
  const t = context.currentTime;

  // Fade out over 1 second
  masterGain.gain.setValueAtTime(masterGain.gain.value, t);
  masterGain.gain.linearRampToValueAtTime(0, t + 1);

  // Stop all nodes after fade
  setTimeout(() => {
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    });
    try {
      masterGain.disconnect();
    } catch {
      /* already disconnected */
    }
  }, 1100);

  _ambientNodes = null;
}

// =============================================================================
// Tandem start sound (branded — replaces generic playStartSound on Tandem)
// =============================================================================

export function playTandemStartSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Quick marimba-like ascending motif
  const notes = [
    { freq: 392, start: 0, dur: 0.12 }, // G4
    { freq: 523.25, start: 0.1, dur: 0.12 }, // C5
    { freq: 659.25, start: 0.2, dur: 0.15 }, // E5
    { freq: 523.25, start: 0.32, dur: 0.1 }, // C5 (bounce)
    { freq: 659.25, start: 0.4, dur: 0.2 }, // E5 (settle)
  ];

  const noiseBuf = createNoiseBuffer(context, 0.02);

  notes.forEach(({ freq, start, dur }) => {
    // Wood transient
    const noise = context.createBufferSource();
    noise.buffer = noiseBuf;
    const bp = context.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 1.5;
    bp.Q.value = 1.5;
    const ng = context.createGain();
    ng.gain.setValueAtTime(0.08 * vol, t + start);
    ng.gain.exponentialRampToValueAtTime(0.001, t + start + 0.015);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(context.destination);
    noise.start(t + start);
    noise.stop(t + start + 0.02);

    // Triangle body
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = context.createGain();
    g.gain.setValueAtTime(0, t + start);
    g.gain.linearRampToValueAtTime(0.15 * vol, t + start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    const lp = context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    osc.connect(lp);
    lp.connect(g);
    g.connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });
}

// Mini start sound (clean, cerebral)
export function playMiniStartSound() {
  const context = initAudio();
  if (!context) return;
  const t = context.currentTime;
  const vol = getVolumeFor('sfx');
  if (vol === 0) return;

  // Soft piano-like chord spread
  const notes = [
    { freq: 349.23, start: 0, dur: 0.25 }, // F4
    { freq: 440, start: 0.05, dur: 0.22 }, // A4
    { freq: 523.25, start: 0.1, dur: 0.2 }, // C5
  ];

  notes.forEach(({ freq, start, dur }) => {
    [-1.5, 1.5].forEach((detune) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = context.createGain();
      g.gain.setValueAtTime(0, t + start);
      g.gain.linearRampToValueAtTime(0.09 * vol, t + start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      osc.connect(g);
      g.connect(context.destination);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.05);
    });
  });
}
