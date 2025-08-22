'use client';
import { useGameWithInitialData } from '@/hooks/useGameWithInitialData';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/hooks/useTheme';
import { useSound } from '@/hooks/useSound';
import { GAME_STATES } from '@/lib/constants';
import { playFailureSound } from '@/lib/sounds';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function GameContainerClient({ initialPuzzleData }) {
  const game = useGameWithInitialData(initialPuzzleData);
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING);
  const { theme, toggleTheme } = useTheme();
  const { playSound } = useSound();

  const handleCheckAnswers = () => {
    const result = game.checkAnswers();
    
    if (result.correct > 0) {
      playSound('correct');
    }
    if (result.incorrect > 0) {
      playSound('incorrect');
    }
  };

  const handleComplete = (won) => {
    if (won) {
      playSound('complete');
    } else {
      // Play the gentle failure sound
      playFailureSound();
    }
    game.completeGame(won);
  };
  
  const handleSelectPuzzle = async (date) => {
    const success = await game.loadPuzzle(date);
    if (success) {
      // Start the game immediately after loading archive puzzle
      game.startGame();
    }
  };

  const backgroundImage = theme === 'dark' 
    ? "url('/images/dark-mode-bg.webp')" 
    : "url('/images/light-mode-bg.webp')";

  if (game.loading) {
    return (
      <div 
        className="fixed inset-0 w-full h-full flex items-center justify-center"
        style={{ 
          backgroundImage: "url('/images/light-mode-bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  if (game.error) {
    return (
      <div 
        className="fixed inset-0 w-full h-full flex items-center justify-center"
        style={{ 
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center mx-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Oops!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {game.error}
          </p>
          <button
            onClick={game.loadPuzzle}
            className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main container with wallpaper background
  return (
    <div 
      className="fixed inset-0 w-full h-full flex items-center justify-center"
      style={{ 
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Content wrapper - constrains width but allows height to adjust */}
      <div className="w-full max-w-xl mx-auto p-6 animate-fade-in">
        {game.gameState === GAME_STATES.WELCOME && (
          <WelcomeScreen 
            onStart={game.startGame}
            theme={theme}
            toggleTheme={toggleTheme}
            onSelectPuzzle={handleSelectPuzzle}
            puzzle={game.puzzle}
          />
        )}
        
        {game.gameState === GAME_STATES.PLAYING && (
          <PlayingScreen
            puzzle={game.puzzle}
            answers={game.answers}
            correctAnswers={game.correctAnswers}
            checkedWrongAnswers={game.checkedWrongAnswers}
            mistakes={game.mistakes}
            solved={game.solved}
            time={timer.elapsed}
            onUpdateAnswer={game.updateAnswer}
            onCheckAnswers={handleCheckAnswers}
            onCheckSingleAnswer={game.checkSingleAnswer}
            theme={theme}
            toggleTheme={toggleTheme}
            onSelectPuzzle={handleSelectPuzzle}
            hintsUsed={game.hintsUsed}
            onUseHint={game.useHint}
            hasCheckedAnswers={game.hasCheckedAnswers}
            onReturnToWelcome={game.returnToWelcome}
          />
        )}
        
        {game.gameState === GAME_STATES.COMPLETE && (
          <CompleteScreen
            won={game.won}
            time={timer.elapsed}
            mistakes={game.mistakes}
            correctAnswers={game.solved}
            puzzleTheme={game.puzzle?.theme}
            onPlayAgain={game.resetGame}
            theme={theme}
            toggleTheme={toggleTheme}
            hintsUsed={game.hintsUsed}
            onSelectPuzzle={handleSelectPuzzle}
            onReturnToWelcome={game.returnToWelcome}
          />
        )}
      </div>
    </div>
  );
}