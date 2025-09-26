// Offline puzzle templates for iOS when API is unavailable
// These are generated deterministically based on date

const emojiCategories = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅'],
  food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥝', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🥒', '🥬'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🥊', '🥋'],
  nature: ['🌸', '💮', '🏵', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌿', '☘', '🍀', '🍁', '🍂', '🍃'],
  objects: ['⌚', '📱', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍', '🚨', '🚔', '🚍'],
  weather: ['☀', '🌤', '⛅', '🌥', '☁', '🌦', '🌧', '⛈', '🌩', '🌨', '❄', '☃', '⛄', '🌬', '💨', '💧', '💦', '☔', '☂', '🌊']
};

const wordCategories = {
  animals: ['DOG', 'CAT', 'MOUSE', 'HAMSTER', 'RABBIT', 'FOX', 'BEAR', 'PANDA', 'KOALA', 'TIGER', 'LION', 'COW', 'PIG', 'FROG', 'MONKEY', 'CHICKEN', 'PENGUIN', 'BIRD', 'DUCK', 'EAGLE'],
  food: ['APPLE', 'ORANGE', 'LEMON', 'BANANA', 'WATERMELON', 'GRAPES', 'STRAWBERRY', 'MELON', 'CHERRY', 'PEACH', 'KIWI', 'COCONUT', 'AVOCADO', 'EGGPLANT', 'POTATO', 'CARROT', 'CORN', 'PEPPER', 'CUCUMBER', 'LETTUCE'],
  activities: ['SOCCER', 'BASKETBALL', 'FOOTBALL', 'BASEBALL', 'TENNIS', 'VOLLEYBALL', 'RUGBY', 'POOL', 'PINGPONG', 'BADMINTON', 'HOCKEY', 'CRICKET', 'LACROSSE', 'GOLF', 'ARCHERY', 'FISHING', 'BOXING', 'KARATE'],
  nature: ['FLOWER', 'ROSE', 'TULIP', 'SUNFLOWER', 'DAISY', 'PLANT', 'TREE', 'PALM', 'CACTUS', 'HERB', 'CLOVER', 'SHAMROCK', 'MAPLE', 'LEAF', 'AUTUMN'],
  objects: ['WATCH', 'PHONE', 'LAPTOP', 'KEYBOARD', 'COMPUTER', 'PRINTER', 'MOUSE', 'JOYSTICK', 'DISK', 'CASSETTE', 'CAMERA', 'VIDEO', 'FILM', 'PROJECTOR'],
  travel: ['CAR', 'TAXI', 'BUS', 'RACING', 'POLICE', 'AMBULANCE', 'FIRETRUCK', 'VAN', 'TRUCK', 'TRACTOR', 'SCOOTER', 'BICYCLE', 'MOTORCYCLE', 'SIREN', 'TRAIN'],
  weather: ['SUN', 'CLOUDY', 'OVERCAST', 'RAIN', 'STORM', 'THUNDER', 'SNOW', 'SNOWMAN', 'WIND', 'HURRICANE', 'DROP', 'WATER', 'UMBRELLA', 'OCEAN']
};

const themes = [
  'In the Kitchen',
  'At the Beach',
  'Movie Night',
  'Sports Day',
  'Garden Party',
  'Road Trip',
  'Camping Adventure',
  'Birthday Celebration',
  'School Days',
  'Winter Fun',
  'Summer Vacation',
  'Pet Show',
  'Music Festival',
  'Game Night',
  'Restaurant',
  'Shopping Spree',
  'Art Gallery',
  'Zoo Visit',
  'Library',
  'Picnic Time'
];

// Seeded random number generator for deterministic puzzle generation
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate hash from date string
function hashDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate a deterministic puzzle based on date
function generateOfflinePuzzle(date) {
  const seed = hashDate(date);
  const random = (max) => Math.floor(seededRandom(seed + max) * max);

  // Select theme
  const themeIndex = random(themes.length);
  const theme = themes[themeIndex];

  // Select category for this puzzle
  const categoryNames = Object.keys(emojiCategories);
  const categoryIndex = random(categoryNames.length);
  const category = categoryNames[categoryIndex];

  // Generate clues (4 sets)
  const clues = [];
  const usedEmojis = new Set();
  const usedWords = new Set();

  for (let i = 0; i < 4; i++) {
    // Select unique emoji
    let emojiIndex;
    let emoji;
    do {
      emojiIndex = random(emojiCategories[category].length + i);
      emoji = emojiCategories[category][emojiIndex % emojiCategories[category].length];
    } while (usedEmojis.has(emoji));
    usedEmojis.add(emoji);

    // Select unique word
    let wordIndex;
    let word;
    do {
      wordIndex = random(wordCategories[category].length + i + 10);
      word = wordCategories[category][wordIndex % wordCategories[category].length];
    } while (usedWords.has(word));
    usedWords.add(word);

    clues.push({
      emoji,
      word,
      letters: word.split('')
    });
  }

  return {
    puzzle: {
      date,
      theme,
      clues,
      difficulty: random(3) + 1, // 1-3 difficulty
      category
    }
  };
}

// Get an offline puzzle for a specific date
export function getOfflinePuzzle(date) {
  try {
    const puzzle = generateOfflinePuzzle(date);
    // Generated offline puzzle for date
    return puzzle;
  } catch (error) {
    // Error generating offline puzzle - return default

    // Return a default puzzle as last resort
    return {
      puzzle: {
        date,
        theme: 'Daily Challenge',
        clues: [
          { emoji: '🌸', word: 'FLOWER', letters: ['F', 'L', 'O', 'W', 'E', 'R'] },
          { emoji: '🌳', word: 'TREE', letters: ['T', 'R', 'E', 'E'] },
          { emoji: '🌿', word: 'PLANT', letters: ['P', 'L', 'A', 'N', 'T'] },
          { emoji: '🍃', word: 'LEAF', letters: ['L', 'E', 'A', 'F'] }
        ],
        difficulty: 1,
        category: 'nature'
      }
    };
  }
}

// Pre-generate a set of offline puzzles
export function generateOfflinePuzzleSet(startDate, days = 7) {
  const puzzles = {};
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    puzzles[dateStr] = generateOfflinePuzzle(dateStr);
  }

  return puzzles;
}

// Check if a date has an offline puzzle available
export function hasOfflinePuzzle(date) {
  // We can always generate a puzzle for any date
  return true;
}

// Get offline puzzle with caching
let offlineCache = {};

export function getCachedOfflinePuzzle(date) {
  if (!offlineCache[date]) {
    offlineCache[date] = getOfflinePuzzle(date);
  }
  return offlineCache[date];
}

// Clear offline cache
export function clearOfflineCache() {
  offlineCache = {};
}

export default {
  getOfflinePuzzle,
  generateOfflinePuzzleSet,
  hasOfflinePuzzle,
  getCachedOfflinePuzzle,
  clearOfflineCache
};