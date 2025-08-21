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

// Play a calm, welcoming sound when starting the game
export function playStartSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;
  
  // Create a gentle two-note chime (C5 and G5)
  const notes = [
    { freq: 523.25, start: 0, duration: 0.4 },      // C5
    { freq: 783.99, start: 0.2, duration: 0.4 },    // G5 (perfect fifth)
  ];
  
  notes.forEach(({ freq, start, duration }) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Use sine wave for a soft, calm tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, currentTime + start);
    
    // Gentle envelope with soft attack and long release
    gainNode.gain.setValueAtTime(0, currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0.12, currentTime + start + 0.05); // Soft attack
    gainNode.gain.setValueAtTime(0.12, currentTime + start + 0.15); // Brief sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration); // Gentle release
    
    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start(currentTime + start);
    oscillator.stop(currentTime + start + duration);
  });
  
  // Add a subtle low harmonic for warmth
  const bass = context.createOscillator();
  const bassGain = context.createGain();
  
  bass.type = 'sine';
  bass.frequency.setValueAtTime(130.81, currentTime); // C3 (two octaves below)
  
  bassGain.gain.setValueAtTime(0, currentTime);
  bassGain.gain.linearRampToValueAtTime(0.05, currentTime + 0.1);
  bassGain.gain.setValueAtTime(0.05, currentTime + 0.3);
  bassGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.6);
  
  bass.connect(bassGain);
  bassGain.connect(context.destination);
  
  bass.start(currentTime);
  bass.stop(currentTime + 0.6);
}