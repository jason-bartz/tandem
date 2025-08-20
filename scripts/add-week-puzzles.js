require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const puzzles = [
  {
    date: '2025-08-21',
    emojiPair: '🌊🏄',
    words: ['SURF', 'BOARD', 'WAVE', 'RIDER'],
    correctPairs: {
      'SURF': 'BOARD',
      'BOARD': 'SURF',
      'WAVE': 'RIDER',
      'RIDER': 'WAVE'
    }
  },
  {
    date: '2025-08-22',
    emojiPair: '🎭🎬',
    words: ['MOVIE', 'STAR', 'DRAMA', 'QUEEN'],
    correctPairs: {
      'MOVIE': 'STAR',
      'STAR': 'MOVIE',
      'DRAMA': 'QUEEN',
      'QUEEN': 'DRAMA'
    }
  },
  {
    date: '2025-08-23',
    emojiPair: '🏖️☀️',
    words: ['BEACH', 'DAY', 'SUN', 'SHINE'],
    correctPairs: {
      'BEACH': 'DAY',
      'DAY': 'BEACH',
      'SUN': 'SHINE',
      'SHINE': 'SUN'
    }
  },
  {
    date: '2025-08-24',
    emojiPair: '🎮🕹️',
    words: ['VIDEO', 'GAME', 'ARCADE', 'PLAYER'],
    correctPairs: {
      'VIDEO': 'GAME',
      'GAME': 'VIDEO',
      'ARCADE': 'PLAYER',
      'PLAYER': 'ARCADE'
    }
  },
  {
    date: '2025-08-25',
    emojiPair: '📚🔖',
    words: ['BOOK', 'MARK', 'PAGE', 'TURNER'],
    correctPairs: {
      'BOOK': 'MARK',
      'MARK': 'BOOK',
      'PAGE': 'TURNER',
      'TURNER': 'PAGE'
    }
  },
  {
    date: '2025-08-26',
    emojiPair: '🍕🧀',
    words: ['PIZZA', 'PIE', 'CHEESE', 'CAKE'],
    correctPairs: {
      'PIZZA': 'PIE',
      'PIE': 'PIZZA',
      'CHEESE': 'CAKE',
      'CAKE': 'CHEESE'
    }
  },
  {
    date: '2025-08-27',
    emojiPair: '🚀🌟',
    words: ['ROCKET', 'SHIP', 'STAR', 'LIGHT'],
    correctPairs: {
      'ROCKET': 'SHIP',
      'SHIP': 'ROCKET',
      'STAR': 'LIGHT',
      'LIGHT': 'STAR'
    }
  }
];

async function addPuzzles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('tandem');
    const collection = db.collection('puzzles');
    
    for (const puzzle of puzzles) {
      const existingPuzzle = await collection.findOne({ date: puzzle.date });
      
      if (existingPuzzle) {
        console.log(`Puzzle for ${puzzle.date} already exists, updating...`);
        await collection.replaceOne(
          { date: puzzle.date },
          {
            ...puzzle,
            createdAt: existingPuzzle.createdAt || new Date(),
            updatedAt: new Date()
          }
        );
      } else {
        console.log(`Adding puzzle for ${puzzle.date}...`);
        await collection.insertOne({
          ...puzzle,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log('\n✅ Successfully added/updated all puzzles!');
    
    // Display the puzzles
    console.log('\n📅 Puzzles for the week:');
    for (const puzzle of puzzles) {
      console.log(`${puzzle.date}: ${puzzle.emojiPair} - ${puzzle.words.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error adding puzzles:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

addPuzzles();