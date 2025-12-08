/* eslint-disable no-console */
/**
 * Generate word frequency scores based on linguistic heuristics
 * This creates reasonable frequency approximations for crossword puzzles
 */

const fs = require('fs');
const path = require('path');

// Common letter frequency in English (higher = more common)
const letterFrequency = {
  E: 12.7,
  T: 9.06,
  A: 8.17,
  O: 7.51,
  I: 6.97,
  N: 6.75,
  S: 6.33,
  H: 6.09,
  R: 5.99,
  D: 4.25,
  L: 4.03,
  C: 2.78,
  U: 2.76,
  M: 2.41,
  W: 2.36,
  F: 2.23,
  G: 2.02,
  Y: 1.97,
  P: 1.93,
  B: 1.29,
  V: 0.98,
  K: 0.77,
  J: 0.15,
  X: 0.15,
  Q: 0.1,
  Z: 0.07,
};

// Common bigrams (letter pairs) - boost score for these
const commonBigrams = new Set([
  'TH',
  'HE',
  'IN',
  'ER',
  'AN',
  'RE',
  'ON',
  'AT',
  'EN',
  'ND',
  'TI',
  'ES',
  'OR',
  'TE',
  'OF',
  'ED',
  'IS',
  'IT',
  'AL',
  'AR',
  'ST',
  'TO',
  'NT',
  'NG',
  'SE',
  'HA',
  'AS',
  'OU',
  'IO',
  'LE',
]);

// Very common short words (2-3 letters) - manual boost
const veryCommonShortWords = new Set([
  'THE',
  'AND',
  'FOR',
  'ARE',
  'BUT',
  'NOT',
  'YOU',
  'ALL',
  'CAN',
  'HER',
  'WAS',
  'ONE',
  'OUR',
  'OUT',
  'DAY',
  'GET',
  'HAS',
  'HIM',
  'HIS',
  'HOW',
  'ITS',
  'MAY',
  'NEW',
  'NOW',
  'OLD',
  'SEE',
  'TWO',
  'WAY',
  'WHO',
  'WHY',
  'DID',
  'SAY',
  'SHE',
  'TOO',
  'USE',
  'HER',
  'OWN',
  'SAW',
  'SET',
  'PUT',
  'TO',
  'OF',
  'IN',
  'IT',
  'IS',
  'BE',
  'AS',
  'AT',
  'SO',
  'WE',
  'HE',
  'BY',
  'OR',
  'ON',
  'DO',
  'IF',
  'ME',
  'MY',
  'UP',
  'AN',
  'GO',
  'NO',
  'US',
  'AM',
  'IT',
  'AN',
  'AS',
  'AT',
  'BE',
  'BY',
]);

// Common 4-letter words
const veryCommon4Letters = new Set([
  'HAVE',
  'THAT',
  'WITH',
  'THIS',
  'WILL',
  'YOUR',
  'FROM',
  'THEY',
  'BEEN',
  'CALL',
  'COME',
  'MADE',
  'FIND',
  'LONG',
  'DOWN',
  'MAKE',
  'MUCH',
  'ONLY',
  'OVER',
  'SUCH',
  'TAKE',
  'THAN',
  'THEM',
  'WELL',
  'WERE',
  'WHEN',
  'VERY',
  'TIME',
  'KNOW',
  'WORK',
  'BACK',
  'HAND',
  'GOOD',
  'GREAT',
  'YEAR',
  'LIFE',
  'SAME',
  'SOME',
  'ALSO',
  'THEN',
  'MOST',
  'BOTH',
  'EVEN',
  'HELP',
  'JUST',
  'LIKE',
  'LOOK',
  'MORE',
  'NEED',
  'PART',
  'SEEM',
  'SHOW',
  'TELL',
  'TURN',
  'WANT',
  'WHAT',
  'WORD',
  'WORK',
  'YEAR',
  'ABLE',
  'AREA',
  'BEST',
  'CASE',
  'EACH',
  'FACE',
  'FACT',
  'FEEL',
  'FOUR',
  'FREE',
  'FULL',
  'GAVE',
  'GIVE',
  'GONE',
  'HEAD',
  'HEAR',
  'HELD',
  'HERE',
  'HIGH',
  'HOME',
  'IDEA',
  'INTO',
  'KEEP',
  'KIND',
  'KNEW',
  'LAST',
  'LATE',
  'LEFT',
  'LESS',
  'LINE',
  'LIST',
  'LIVE',
  'LOVE',
  'MANY',
  'MEAN',
  'MIND',
  'MOVE',
  'MUST',
  'NAME',
  'NEAR',
  'NEXT',
  'ONCE',
  'OPEN',
  'PAID',
  'PASS',
  'PAST',
  'PLAN',
  'PLAY',
  'READ',
  'REAL',
  'REST',
  'SAID',
  'SEEN',
  'SENT',
  'SIDE',
  'SOON',
  'STAY',
  'STOP',
  'SURE',
  'TALK',
  'TOLD',
  'TOOK',
  'TRUE',
  'USED',
  'WAIT',
  'WALK',
  'WEEK',
  'WENT',
  'WIDE',
  'WISH',
  'WOMAN',
  'FIVE',
  'BODY',
  'BOOK',
  'BOTH',
  'CALL',
]);

// Common 5-letter words
const veryCommon5Letters = new Set([
  'ABOUT',
  'AFTER',
  'AGAIN',
  'BEING',
  'BELOW',
  'COULD',
  'EVERY',
  'FIRST',
  'FOUND',
  'GOING',
  'GREAT',
  'GROUP',
  'HAPPY',
  'HOUSE',
  'LARGE',
  'LATER',
  'LEAVE',
  'LEVEL',
  'LIGHT',
  'MIGHT',
  'NEVER',
  'OTHER',
  'PARTY',
  'PLACE',
  'POINT',
  'QUITE',
  'RIGHT',
  'SHALL',
  'SINCE',
  'SMALL',
  'SOUND',
  'STAND',
  'START',
  'STATE',
  'STILL',
  'STUDY',
  'THEIR',
  'THERE',
  'THESE',
  'THING',
  'THINK',
  'THOSE',
  'THREE',
  'UNDER',
  'UNTIL',
  'WATER',
  'WHERE',
  'WHICH',
  'WHILE',
  'WOMAN',
  'WORLD',
  'WOULD',
  'WRITE',
  'YEARS',
  'YOUNG',
  'ABOVE',
  'ALONG',
  'AMONG',
  'BEGIN',
  'BLACK',
  'BRING',
  'BUILD',
  'CARRY',
  'CAUSE',
  'CHECK',
  'CHILD',
  'CLEAR',
  'CLOSE',
  'OFTEN',
  'ORDER',
  'PAPER',
  'POWER',
  'EARLY',
  'HUMAN',
  'LOCAL',
  'MAJOR',
  'MONEY',
  'MONTH',
  'NORTH',
  'PARTY',
  'AREAS',
  'ASKED',
  'BASED',
  'BEGAN',
  'BOARD',
  'CASES',
  'CHANG',
  'CLASS',
  'COMES',
  'COURT',
  'DEATH',
  'DOING',
  'DRIVE',
  'EARLY',
  'EIGHT',
  'ENTRY',
  'EXTRA',
  'FIELD',
  'FINAL',
  'FORCE',
  'FRONT',
  'GIVEN',
  'GRACE',
  'HANDS',
  'HEARD',
  'HEART',
  'HEAVY',
  'IDEAS',
  'IMAGE',
  'ISSUE',
  'ITEMS',
  'JONES',
  'KNOWN',
  'LANDS',
  'LEAST',
  'LEGAL',
  'LINES',
  'LIVED',
  'LOOKS',
  'MAKES',
  'MARCH',
  'MEANS',
  'MODEL',
  'MOVED',
  'MUSIC',
  'NAMED',
  'NEEDS',
  'NIGHT',
  'NOTES',
  'OFFER',
  'OPENING',
  'PEACE',
  'PETER',
  'PHONE',
  'PIECE',
  'PLANS',
  'PLAYS',
  'PRICE',
  'QUITE',
  'RANGE',
  'REACH',
  'READY',
  'RIVER',
  'ROUND',
  'ROYAL',
  'SCALE',
  'SCENE',
  'SENSE',
  'SERVE',
  'SEVEN',
  'SHALL',
  'SHARE',
  'SHORT',
  'SHOWN',
  'SIDES',
  'SITES',
  'SIXTH',
  'SMITH',
  'SOUTH',
  'SPACE',
  'SPEAK',
  'SPENT',
  'SPORT',
  'STAFF',
  'STAGE',
  'STARS',
  'STEPS',
  'STOCK',
  'STONE',
  'STOOD',
  'STORE',
  'STORY',
  'STUFF',
  'STYLE',
  'TABLE',
  'TAKEN',
  'TERMS',
  'TEXAS',
  'THANK',
  'TITLE',
  'TODAY',
  'TOTAL',
  'TOUCH',
  'TOWER',
  'TRACK',
  'TRADE',
  'TRAIN',
  'TREAT',
  'TRIED',
  'TRIES',
  'TRUTH',
  'TWICE',
  'TYPES',
  'UNION',
  'UNITS',
  'USING',
  'VALUE',
  'VIDEO',
  'VISIT',
  'VOICE',
  'WATCH',
  'WEEKS',
  'WENT',
  'WHITE',
  'WHOLE',
  'WOMEN',
  'WORDS',
  'WORKS',
  'WORSE',
  'WORTH',
  'WRONG',
  'WROTE',
]);

// Common crossword names (4-letter) - NYT/WaPo favorites
const crosswordNames4 = new Set([
  'ADAM',
  'ALAN',
  'ALEX',
  'ANNA',
  'ANNE',
  'ARLO',
  'BEAU',
  'CARL',
  'DANA',
  'DEAN',
  'EDEN',
  'ELLA',
  'EMMA',
  'ERIC',
  'ERIN',
  'EVAN',
  'EZRA',
  'FRED',
  'GAGA',
  'HANK',
  'JAKE',
  'JANE',
  'JEAN',
  'JOAN',
  'JOHN',
  'JUNO',
  'KATE',
  'KYLO',
  'LEIA',
  'LIAM',
  'LILY',
  'LISA',
  'LOKI',
  'LUNA',
  'MARY',
  'MAYA',
  'MILA',
  'NEIL',
  'NEMO',
  'NOAH',
  'NORA',
  'OLAF',
  'OWEN',
  'PAUL',
  'REBA',
  'ROSA',
  'RYAN',
  'SAGE',
  'SARA',
  'THOR',
  'TINA',
  'TONY',
  'VERA',
  'YODA',
  'ZARA',
  'ZOEY',
  'THEO',
  'ARYA',
  'JADE',
  'RUBY',
  'ELSA',
  'DOJA',
  'WREN',
]);

// Common crossword names (5-letter) - NYT/WaPo favorites
const crosswordNames5 = new Set([
  'ADELE',
  'ALICE',
  'ARIEL',
  'ATLAS',
  'BARRY',
  'BILLY',
  'BRIAN',
  'BRUCE',
  'CAROL',
  'CHLOE',
  'CLARA',
  'DEREK',
  'DIANA',
  'DYLAN',
  'ELENA',
  'ELLEN',
  'ELTON',
  'EMILY',
  'FELIX',
  'GAVIN',
  'GRACE',
  'HALEY',
  'HARRY',
  'HELEN',
  'HENRY',
  'HOMER',
  'IRENE',
  'JAMES',
  'JAMIE',
  'JASON',
  'JENNY',
  'JERRY',
  'JIMMY',
  'JONAS',
  'JULIA',
  'KAREN',
  'KEVIN',
  'LAURA',
  'LEWIS',
  'LIZZO',
  'LOGAN',
  'LORDE',
  'LOUIS',
  'LUCAS',
  'MARIA',
  'MASON',
  'MILES',
  'MOLLY',
  'NAOMI',
  'NANCY',
  'OBAMA',
  'OLIVE',
  'OPRAH',
  'OSCAR',
  'PARIS',
  'PETER',
  'QUINN',
  'RALPH',
  'REESE',
  'RILEY',
  'ROGER',
  'SARAH',
  'SOFIA',
  'STEVE',
  'TYLER',
  'VENUS',
  'WANDA',
]);

// Modern tech, brands, and pop culture terms (4-letter)
const modernTerms4 = new Set([
  'APPS',
  'BLOG',
  'BOBA',
  'COLA',
  'DELI',
  'ECHO',
  'ETSY',
  'ESPN',
  'FIFA',
  'GRAM',
  'HULU',
  'IKEA',
  'IMAX',
  'IMHO',
  'JPEG',
  'LEGO',
  'LYFT',
  'MEME',
  'NCAA',
  'RING',
  'ROKU',
  'ROTI',
  'SIRI',
  'SLAW',
  'SNAP',
  'SODA',
  'TACO',
  'TOFU',
  'TUNA',
  'TTYL',
  'UBER',
  'VIBE',
  'VISA',
  'WIFI',
  'WNBA',
  'YELP',
  'YOGA',
  'YOLO',
  'YUZU',
  'ZOOM',
  'OAHU',
  'RIGA',
  'FOMO',
  'GOAT',
  'STAN',
]);

// Modern tech, brands, and pop culture terms (5-letter)
const modernTerms5 = new Set([
  'ALEXA',
  'ASANA',
  'ANIME',
  'BAGEL',
  'BASIC',
  'BINGE',
  'BRAND',
  'BRAVO',
  'CACAO',
  'COACH',
  'EMAIL',
  'EMOJI',
  'EXTRA',
  'GMAIL',
  'GUAVA',
  'INBOX',
  'LATTE',
  'LOGIN',
  'MANGO',
  'MOCHI',
  'MOCHA',
  'NACHO',
  'PALEO',
  'PANKO',
  'PASTA',
  'PEPSI',
  'PIXEL',
  'PIZZA',
  'RAMEN',
  'SALSA',
  'SALTY',
  'SELFIE',
  'SHARE',
  'SUSHI',
  'SWIPE',
  'TAPAS',
  'TESLA',
  'TWEET',
  'VEGAN',
  'VENMO',
  'VIDEO',
  'VIRAL',
  'VODKA',
  'AUDIO',
  'PENNE',
  'KEFIR',
]);

/**
 * Calculate frequency score for a word based on linguistic heuristics
 */
function calculateFrequencyScore(word) {
  let score = 100; // Base score

  // 1. Letter frequency score
  let letterScore = 0;
  for (const char of word) {
    letterScore += letterFrequency[char] || 0.5;
  }
  score += letterScore;

  // 2. Common bigrams boost
  let bigramBonus = 0;
  for (let i = 0; i < word.length - 1; i++) {
    const bigram = word[i] + word[i + 1];
    if (commonBigrams.has(bigram)) {
      bigramBonus += 10;
    }
  }
  score += bigramBonus;

  // 3. Vowel distribution (words with good vowel distribution are more common)
  const vowels = (word.match(/[AEIOU]/g) || []).length;
  const vowelRatio = vowels / word.length;
  if (vowelRatio >= 0.3 && vowelRatio <= 0.5) {
    score += 20; // Ideal vowel ratio
  } else if (vowelRatio < 0.2 || vowelRatio > 0.6) {
    score -= 30; // Poor vowel ratio
  }

  // 4. Penalize rare letter combinations
  if (word.includes('Q') && !word.includes('U')) score -= 50;
  if (word.includes('X') || word.includes('Z')) score -= 20;
  if (word.includes('J')) score -= 15;

  // 5. Manual boosts for very common words
  if (veryCommonShortWords.has(word)) {
    score += 500; // Major boost for common short words
  }
  if (veryCommon4Letters.has(word)) {
    score += 400;
  }
  if (veryCommon5Letters.has(word)) {
    score += 350;
  }

  // 6. Boost for crossword-friendly names (common in NYT/WaPo minis)
  if (crosswordNames4.has(word)) {
    score += 300; // Significant boost for common crossword names
  }
  if (crosswordNames5.has(word)) {
    score += 280;
  }

  // 7. Boost for modern terms (tech, brands, pop culture)
  if (modernTerms4.has(word)) {
    score += 250; // Good boost for modern vocabulary
  }
  if (modernTerms5.has(word)) {
    score += 230;
  }

  // 8. Common endings boost
  if (word.endsWith('ED') || word.endsWith('ER') || word.endsWith('LY')) score += 20;
  if (word.endsWith('ING') || word.endsWith('TION')) score += 25;

  // 7. Common prefixes boost
  if (word.startsWith('UN') || word.startsWith('RE') || word.startsWith('IN')) score += 15;

  // 8. Length penalty for obscure-looking patterns
  if (word.length === 2 && !veryCommonShortWords.has(word)) {
    score -= 50; // Many 2-letter words are obscure
  }

  // Ensure minimum score
  return Math.max(score, 1);
}

/**
 * Process a word list file and generate frequency data
 */
function processWordList(inputPath, outputPath, wordLength) {
  console.log(`Processing ${wordLength}-letter words...`);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const words = content
    .split('\n')
    .map((line) => line.trim().toUpperCase())
    .filter((word) => word.length === wordLength);

  // Calculate scores for all words
  const wordFrequencies = words.map((word) => ({
    word,
    frequency: calculateFrequencyScore(word),
  }));

  // Sort by frequency (descending)
  wordFrequencies.sort((a, b) => b.frequency - a.frequency);

  // Normalize scores to 0-100 range
  const maxScore = wordFrequencies[0].frequency;
  const minScore = wordFrequencies[wordFrequencies.length - 1].frequency;
  const normalizedFrequencies = wordFrequencies.map((item) => ({
    word: item.word,
    frequency: Math.round(((item.frequency - minScore) / (maxScore - minScore)) * 100),
  }));

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(normalizedFrequencies, null, 2), 'utf-8');

  console.log(`  ✓ Generated ${normalizedFrequencies.length} words`);
  console.log(
    `  ✓ Top 10: ${normalizedFrequencies
      .slice(0, 10)
      .map((w) => w.word)
      .join(', ')}`
  );
  console.log(`  ✓ Saved to ${outputPath}\n`);
}

// Main execution
const databaseDir = path.join(__dirname, '..', 'database');
const wordFreqDir = path.join(databaseDir, 'word_frequencies');

// Ensure output directory exists
if (!fs.existsSync(wordFreqDir)) {
  fs.mkdirSync(wordFreqDir, { recursive: true });
}

// Process each word length
for (let length = 2; length <= 5; length++) {
  const inputPath = path.join(databaseDir, `${length}_letter_words.txt`);
  const outputPath = path.join(wordFreqDir, `${length}_letter_frequencies.json`);

  if (fs.existsSync(inputPath)) {
    processWordList(inputPath, outputPath, length);
  } else {
    console.log(`Warning: ${inputPath} not found, skipping...`);
  }
}

console.log('✓ Word frequency generation complete!');
