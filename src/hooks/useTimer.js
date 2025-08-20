import { useState, useEffect, useRef } from 'react';

export function useTimer(isRunning = false) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const reset = () => {
    setElapsed(0);
    startTimeRef.current = Date.now();
  };

  const pause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resume = () => {
    if (!intervalRef.current && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  };

  return {
    elapsed,
    reset,
    pause,
    resume
  };
}