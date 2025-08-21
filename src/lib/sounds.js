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
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create oscillators for a happy chord progression
  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 },     // C5
    { freq: 659.25, start: 0.1, duration: 0.15 },   // E5
    { freq: 783.99, start: 0.2, duration: 0.15 },   // G5
    { freq: 1046.50, start: 0.3, duration: 0.4 },   // C6 (sustained)
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
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create a simple, pleasant two-note ding
  const notes = [
    { freq: 659.25, start: 0, duration: 0.1 },    // E5
    { freq: 880, start: 0.05, duration: 0.15 },   // A5
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
  if (!context) return;

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
  if (!context) return;

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

// Play a playful, game-like sound when starting the game
export function playStartSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create a bouncy, ascending melody - like a happy little jump
  const notes = [
    { freq: 392, start: 0, duration: 0.08 },        // G4
    { freq: 523.25, start: 0.05, duration: 0.08 },  // C5
    { freq: 659.25, start: 0.1, duration: 0.12 },   // E5
  ];
  
  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Mix of sine and triangle for a softer, more playful tone
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);
    
    // Quick, bouncy envelope
    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.15, currentTime + start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + start + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
  });
  
  // Add a little "pop" at the end for extra playfulness
  const pop = context.createOscillator();
  const popGain = context.createGain();
  
  pop.type = 'sine';
  pop.frequency.setValueAtTime(1046.5, currentTime + 0.15); // C6
  
  popGain.gain.setValueAtTime(0, currentTime + 0.15);
  popGain.gain.linearRampToValueAtTime(0.08, currentTime + 0.16);
  popGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.25);
  
  pop.connect(popGain);
  popGain.connect(context.destination);
  
  pop.start(currentTime + 0.15);
  pop.stop(currentTime + 0.25);
}

// Play a gentle failure sound - soft and not harsh
export function playFailureSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create a gentle, descending melody with soft tones
  const notes = [
    { freq: 523.25, start: 0, duration: 0.2 },      // C5
    { freq: 440, start: 0.15, duration: 0.2 },      // A4
    { freq: 392, start: 0.3, duration: 0.25 },      // G4
    { freq: 329.63, start: 0.45, duration: 0.35 },  // E4 (longer, softer fade)
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

// Play a magical hint sound - like a lightbulb moment
export function playHintSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create a magical "ding" with a sparkle effect
  // Main chime
  const chime = context.createOscillator();
  const chimeGain = context.createGain();
  
  chime.type = 'sine';
  chime.frequency.setValueAtTime(880, currentTime); // A5
  
  chimeGain.gain.setValueAtTime(0, currentTime);
  chimeGain.gain.linearRampToValueAtTime(0.2, currentTime + 0.02);
  chimeGain.gain.setValueAtTime(0.15, currentTime + 0.1);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);
  
  chime.connect(chimeGain);
  chimeGain.connect(context.destination);
  
  chime.start(currentTime);
  chime.stop(currentTime + 0.4);
  
  // Add sparkle overtones
  const sparkleFreqs = [1760, 2637, 3520]; // A6, E7, A7
  
  sparkleFreqs.forEach((freq, index) => {
    const sparkle = context.createOscillator();
    const sparkleGain = context.createGain();
    
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(freq, currentTime + 0.02 + (index * 0.03));
    
    sparkleGain.gain.setValueAtTime(0, currentTime + 0.02 + (index * 0.03));
    sparkleGain.gain.linearRampToValueAtTime(0.05, currentTime + 0.03 + (index * 0.03));
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2 + (index * 0.05));
    
    sparkle.connect(sparkleGain);
    sparkleGain.connect(context.destination);
    
    sparkle.start(currentTime + 0.02 + (index * 0.03));
    sparkle.stop(currentTime + 0.3 + (index * 0.05));
  });
}