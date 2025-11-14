'use client';
import { useRef, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function StatsBar({
  time,
  mistakes,
  solved,
  isSmallPhone = false,
  isMobilePhone = false,
  isHardMode = false,
  hardModeTimeLimit = 120,
  hasActiveHint = false,
}) {
  const { reduceMotion } = useTheme();
  const [bounceTimer, setBounceTimer] = useState(false);
  const [bounceMistakes, setBounceMistakes] = useState(false);
  const [bounceSolved, setBounceSolved] = useState(false);
  const prevTime = useRef(time);
  const prevMistakes = useRef(mistakes);
  const prevSolved = useRef(solved);

  // Parse time string to get seconds for hard mode calculation
  const getSecondsFromTime = (timeStr) => {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const currentSeconds = getSecondsFromTime(time);
  const remainingSeconds = Math.max(0, hardModeTimeLimit - currentSeconds);
  const remainingTime = `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  const isTimeCritical = isHardMode && remainingSeconds <= 30;

  // Animate timer changes
  useEffect(() => {
    if (time !== prevTime.current && !reduceMotion) {
      setBounceTimer(true);
      setTimeout(() => setBounceTimer(false), 200);

      // Removed milestone burst animation
    }
    prevTime.current = time;
  }, [time, reduceMotion, currentSeconds]);

  // Animate mistakes changes
  useEffect(() => {
    if (mistakes !== prevMistakes.current && !reduceMotion) {
      setBounceMistakes(true);
      setTimeout(() => setBounceMistakes(false), 200);
    }
    prevMistakes.current = mistakes;
  }, [mistakes, reduceMotion]);

  // Animate solved changes
  useEffect(() => {
    if (solved !== prevSolved.current && !reduceMotion) {
      setBounceSolved(true);
      setTimeout(() => setBounceSolved(false), 200);
    }
    prevSolved.current = solved;
  }, [solved, reduceMotion]);

  return (
    <div
      className={`flex justify-between sm:justify-evenly ${
        // Reduce spacing when hint is active on mobile
        hasActiveHint && (isSmallPhone || isMobilePhone)
          ? isSmallPhone
            ? 'gap-1 mb-2 p-1.5'
            : 'gap-2 mb-2 p-2'
          : isSmallPhone
            ? 'gap-2 mb-3 p-2'
            : isMobilePhone
              ? 'gap-3 mb-4 p-3'
              : 'gap-4 sm:gap-6 md:gap-8 mb-6 p-4'
      } ${isHardMode ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-red-200 dark:border-red-800' : 'bg-light-sand dark:bg-gray-800'} rounded-2xl score-display max-w-md mx-auto transition-all duration-300`}
    >
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold ${isHardMode && isTimeCritical ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-dark-text dark:text-gray-200'} ${
            bounceTimer && !reduceMotion ? 'animate-timer-bounce' : ''
          }`}
        >
          {isHardMode ? remainingTime : time}
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } ${isHardMode && isTimeCritical ? 'text-red-600 dark:text-red-400' : 'text-gray-text dark:text-gray-400'} mt-1`}
        >
          {isHardMode ? 'Time Left' : 'Time'}
        </div>
      </div>
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold text-dark-text dark:text-gray-200 ${
            bounceMistakes && !reduceMotion ? 'animate-timer-bounce' : ''
          }`}
        >
          {mistakes}/4
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } text-gray-text dark:text-gray-400 mt-1`}
        >
          Mistakes
        </div>
      </div>
      <div className="text-center flex-1 sm:flex-initial">
        <div
          className={`${
            isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'
          } font-bold text-dark-text dark:text-gray-200 ${
            bounceSolved && !reduceMotion ? 'animate-timer-bounce' : ''
          }`}
        >
          {solved}/4
        </div>
        <div
          className={`${
            isSmallPhone ? 'text-[10px]' : 'text-xs'
          } text-gray-text dark:text-gray-400 mt-1`}
        >
          Solved
        </div>
      </div>
    </div>
  );
}
