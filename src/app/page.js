import { getPuzzleForDate } from '@/lib/db';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import GameContainerClient from '@/components/game/GameContainerClient';

// Conditional dynamic based on build target
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

// Only force dynamic for web builds, not for iOS static export
export const dynamic = isCapacitorBuild ? undefined : 'force-dynamic';
export const revalidate = isCapacitorBuild ? undefined : 0;

async function getTodaysPuzzle() {
  // For iOS build, return null and let the client fetch
  if (isCapacitorBuild) {
    return null;
  }

  try {
    const currentInfo = getCurrentPuzzleInfo();
    const puzzle = await getPuzzleForDate(currentInfo.isoDate);

    // Ensure puzzle has proper structure
    if (puzzle && !puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
      puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
        emoji: emoji,
        answer: puzzle.words[index] || puzzle.correctAnswers[index]
      }));
    }

    // Add puzzle number to puzzle object if not present
    if (puzzle && !puzzle.puzzleNumber) {
      puzzle.puzzleNumber = currentInfo.number;
    }

    return {
      success: true,
      date: currentInfo.isoDate,
      puzzle: puzzle || null,
      puzzleNumber: puzzle?.puzzleNumber || currentInfo.number,
      displayDate: currentInfo.date,
    };
  } catch (error) {
    console.error('Failed to fetch initial puzzle:', error);
    return null;
  }
}

export default async function Home() {
  const initialPuzzleData = await getTodaysPuzzle();

  return <GameContainerClient initialPuzzleData={initialPuzzleData} />;
}