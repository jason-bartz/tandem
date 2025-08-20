'use client';
import { useGame } from '@/hooks/useGame';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/hooks/useTheme';
import { useSound } from '@/hooks/useSound';
import { GAME_STATES } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function GameContainer() {
  const game = useGame();
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING);
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound, playSound } = useSound();

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
    }
    game.completeGame(won);
  };

  const backgroundImage = theme === 'dark' 
    ? "url('/images/dark-mode-bg.webp')" 
    : "url('/images/light-mode-bg.webp')";

  if (game.loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/light-mode-bg.webp')" }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  if (game.error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Oops!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {game.error}
          </p>
          <button
            onClick={game.loadPuzzle}
            className="px-6 py-3 bg-plum text-white rounded-xl hover:bg-plum-dark transition-colors"
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
      className={`min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat ${theme}`}
      style={{ backgroundImage }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
          {game.gameState === GAME_STATES.WELCOME && (
            <WelcomeScreen
              onStart={game.startGame}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}

          {game.gameState === GAME_STATES.PLAYING && (
            <PlayingScreen
              puzzle={game.puzzle}
              answers={game.answers}
              correctAnswers={game.correctAnswers}
              mistakes={game.mistakes}
              solved={game.solved}
              time={timer.elapsed}
              onUpdateAnswer={game.updateAnswer}
              onCheckAnswers={handleCheckAnswers}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}

          {game.gameState === GAME_STATES.COMPLETE && (
            <CompleteScreen
              won={game.solved === 4}
              time={timer.elapsed}
              mistakes={game.mistakes}
              correctAnswers={game.correctAnswers}
              puzzleTheme={game.puzzle?.theme}
              onPlayAgain={game.resetGame}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}
      </div>
    </div>
  );
}