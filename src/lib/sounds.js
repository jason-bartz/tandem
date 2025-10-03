// Audio effects for the game
let audioContext = null;

// Initialize audio context on user interaction
export function initAudio() {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
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
    gainNode.gain.linearRampToValueAtTime(0.08, currentTime + note.start + 0.015); // Softer attack
    gainNode.gain.setValueAtTime(0.07, currentTime + note.start + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.start + note.duration);

    // Add a filter to make it even warmer and rounder
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500; // Lower cutoff for warmer tone
    filter.Q.value = 0.7; // Gentle resonance

    // Add subtle vibrato for organic warmth
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 4; // Gentle 4Hz vibrato
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 1.5; // Very subtle vibrato

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
  pluck.frequency.setValueAtTime(220, currentTime); // A3 - warm low tone

  pluckGain.gain.setValueAtTime(0.02, currentTime); // Very soft
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
