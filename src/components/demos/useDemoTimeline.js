'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDemoTimeline - Drives a scripted animation sequence for game demos.
 *
 * Each step in the timeline has a `at` (seconds) and `action` string.
 * The hook fires steps in order and exposes the current accumulated state
 * so the rendering component can decide what to show.
 *
 * Timeline events can include an optional `caption` field. When present,
 * the hook updates the current caption string. This is used by tutorial
 * modals to auto-advance explanatory text in sync with the demo.
 *
 * @param {Array<{at: number, action: string, data?: any, caption?: string}>} timeline
 * @param {object} options
 * @param {boolean} options.paused - pause playback (e.g. reduced motion)
 * @param {number} options.loopDelay - ms to wait before restarting (default 1500)
 * @returns {{ step: number, action: string|null, data: any, history: string[], caption: string|null }}
 */
export default function useDemoTimeline(timeline, { paused = false, loopDelay = 1500 } = {}) {
  const [step, setStep] = useState(-1);
  const [action, setAction] = useState(null);
  const [data, setData] = useState(null);
  const [caption, setCaption] = useState(null);
  const historyRef = useRef([]);
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const stepRef = useRef(-1);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(
    (currentStep, baseTime) => {
      const nextIdx = currentStep + 1;

      if (nextIdx >= timeline.length) {
        // Loop: reset after delay
        timerRef.current = setTimeout(() => {
          stepRef.current = -1;
          historyRef.current = [];
          setStep(-1);
          setAction(null);
          setData(null);
          setCaption(null);
          setHistory([]);
          startTimeRef.current = Date.now();
          scheduleNext(-1, Date.now());
        }, loopDelay);
        return;
      }

      const nextEvent = timeline[nextIdx];
      const targetTime = baseTime + nextEvent.at * 1000;
      const delay = Math.max(0, targetTime - Date.now());

      timerRef.current = setTimeout(() => {
        stepRef.current = nextIdx;
        historyRef.current = [...historyRef.current, nextEvent.action];
        setStep(nextIdx);
        setAction(nextEvent.action);
        setData(nextEvent.data ?? null);
        if (nextEvent.caption !== undefined) {
          setCaption(nextEvent.caption);
        }
        setHistory([...historyRef.current]);
        scheduleNext(nextIdx, baseTime);
      }, delay);
    },
    [timeline, loopDelay]
  );

  useEffect(() => {
    if (paused) {
      clearTimer();
      return;
    }

    // Start playback
    stepRef.current = -1;
    historyRef.current = [];
    setStep(-1);
    setAction(null);
    setData(null);
    setCaption(null);
    setHistory([]);
    startTimeRef.current = Date.now();
    scheduleNext(-1, Date.now());

    return clearTimer;
  }, [paused, scheduleNext, clearTimer]);

  return { step, action, data, history, caption };
}
