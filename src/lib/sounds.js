// Audio effects for the game
let audioContext = null;
let _visibilityListenerAdded = false;

// Check user's sound preference from localStorage
function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tandemSound') !== 'false';
}

// Initialize or resume the shared AudioContext.
// Returns null if sound is disabled or unavailable — callers bail early.
export function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!isSoundEnabled()) return null;

  if (!audioContext) {
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
