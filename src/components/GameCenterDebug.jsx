'use client';

import { useState } from 'react';
import gameCenterService from '@/services/gameCenter.service';
import { loadStats } from '@/lib/storage';

export default function GameCenterDebug() {
  const [debugState, setDebugState] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Expose to global for console access
  if (typeof window !== 'undefined') {
    window.gameCenterDebug = {
      checkState: () => gameCenterService.debugGetState(),
      testSubmission: (streak) => gameCenterService.debugTestSubmission(streak),
      getStats: () => loadStats(),
    };
  }

  const checkState = async () => {
    setLoading(true);
    try {
      const state = await gameCenterService.debugGetState();
      setDebugState(state);
    } catch (error) {
      console.error('Failed to get debug state:', error);
    }
    setLoading(false);
  };

  const testSubmission = async (streak) => {
    setLoading(true);
    try {
      const result = await gameCenterService.debugTestSubmission(streak);
      setTestResult(result);
    } catch (error) {
      console.error('Test submission failed:', error);
    }
    setLoading(false);
  };

  const checkLocalStats = async () => {
    try {
      const stats = await loadStats();
      console.log('Local Stats:', stats);
      alert(
        `Local Stats:
        Played: ${stats.played}
        Wins: ${stats.wins}
        Current Streak: ${stats.currentStreak}
        Best Streak: ${stats.bestStreak}
        Last Streak Date: ${stats.lastStreakDate || 'Not set'}`
      );
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-lg font-bold">Game Center Debug Panel</h3>

      <div className="space-y-2">
        <button
          onClick={checkState}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Check Game Center State
        </button>

        <button
          onClick={checkLocalStats}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 ml-2"
        >
          Check Local Stats
        </button>
      </div>

      <div className="space-y-2">
        <p>Test Leaderboard Submission:</p>
        <div className="flex gap-2">
          <button
            onClick={() => testSubmission(1)}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Submit 1 Day
          </button>
          <button
            onClick={() => testSubmission(3)}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Submit 3 Days
          </button>
          <button
            onClick={() => testSubmission(7)}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Submit 7 Days
          </button>
        </div>
      </div>

      {debugState && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded">
          <h4 className="font-semibold mb-2">Debug State:</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(debugState, null, 2)}</pre>
        </div>
      )}

      {testResult && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded">
          <h4 className="font-semibold mb-2">Test Result:</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
