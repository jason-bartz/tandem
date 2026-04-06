'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Evolution tiers — primordial to cosmic achievement
const EVOLUTION_TIERS = [
  { threshold: 0, emojis: ['🧬', '🫧', '💧', '✨'] },
  { threshold: 0.15, emojis: ['🦠', '🫧', '🧬'] },
  { threshold: 0.3, emojis: ['🪸', '🐚', '🦐', '🪼'] },
  { threshold: 0.5, emojis: ['🐟', '🐠', '🦎', '🌿'] },
  { threshold: 0.7, emojis: ['🦋', '🐢', '🐦', '🌺'] },
  { threshold: 0.85, emojis: ['🦁', '🐘', '🏔️', '🌳'] },
  { threshold: 1.0, emojis: ['🏛️', '🚀', '🌍', '⭐'] },
];

// Depth layers: far (blurred, slow), mid (default), near (large, fast)
const DEPTH_LAYERS = [
  { sizeMin: 12, sizeMax: 18, blur: 1, opacityMult: 0.7, speedMult: 0.6, driftMult: 0.7 },
  { sizeMin: 20, sizeMax: 30, blur: 0, opacityMult: 1.0, speedMult: 1.0, driftMult: 1.0 },
  { sizeMin: 30, sizeMax: 40, blur: 0, opacityMult: 1.15, speedMult: 1.4, driftMult: 1.3 },
];

const PARTICLE_COUNT = 25;
const BASE_OPACITY = 0.1;
const OPACITY_RANGE = 0.05;
const FADE_MS = 1500;
const PULSE_MS = 800;
const FLOAT_IN_MS = 1200;
const WELCOME_CYCLE_MS = 45000;
const WELCOME_HOLD_MS = 3000;
// Approximate center of the CombinationArea (viewport %)
const COMBO_ORIGIN_X = 50;
const COMBO_ORIGIN_Y = 28;

function getDepth(id) {
  if (id < 9) return 0; // far: 9 particles
  if (id < 19) return 1; // mid: 10 particles
  return 2; // near: 6 particles
}

function createParticleConfigs() {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => {
    const depth = getDepth(id);
    const layer = DEPTH_LAYERS[depth];
    return {
      id,
      depth,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
      baseOpacity: (BASE_OPACITY + Math.random() * OPACITY_RANGE) * layer.opacityMult,
      blur: layer.blur,
      driftXDur: (40 + Math.random() * 60) / layer.speedMult,
      driftYDur: (35 + Math.random() * 55) / layer.speedMult,
      driftXDelay: Math.random() * -60,
      driftYDelay: Math.random() * -60,
      driftXPx: (20 + Math.random() * 35) * layer.driftMult,
      driftYPx: (15 + Math.random() * 30) * layer.driftMult,
      rotDur: 50 + Math.random() * 70,
      rotDelay: Math.random() * -80,
      rotDeg: 8 + Math.random() * 14,
      // Each particle gets a random keyframe variant for organic variety
      driftVariant: Math.floor(Math.random() * 3),
      tierOffset: (Math.random() - 0.5) * 0.1,
    };
  });
}

function getTierEmoji(progress, config) {
  for (let i = EVOLUTION_TIERS.length - 1; i >= 0; i--) {
    if (progress >= EVOLUTION_TIERS[i].threshold + config.tierOffset || i === 0) {
      const emojis = EVOLUTION_TIERS[i].emojis;
      return emojis[config.id % emojis.length];
    }
  }
  return '✨';
}

/**
 * EvolutionaryBackground — floating emoji background that evolves with gameplay.
 *
 * Features:
 *  - Depth layers: far (small, blurred, slow), mid, near (large, fast)
 *  - Birth pulse: emojis scale up then settle when they appear (daily/freeplay)
 *  - Float-in: in creative mode, new emojis fly in from the combination area
 *
 * Modes:
 *  - "welcome"  — auto-loops evolution from primordial → cosmic, then resets
 *  - "daily"    — progress (0-1) drives evolution based on puzzle completion
 *  - "freeplay" — shows emojis from player's discovered elements
 */
export function EvolutionaryBackground({ mode = 'daily', progress = 0, recentEmojis = [] }) {
  const { reduceMotion } = useTheme();

  const configs = useMemo(() => createParticleConfigs(), []);

  // Initial emoji per particle based on starting props
  const initialProgress = mode === 'welcome' ? 0 : Math.min(1, Math.max(0, progress));
  const getInitialEmoji = (config, index) => {
    if (mode === 'freeplay' && recentEmojis.length > 0) {
      return recentEmojis[index % recentEmojis.length];
    }
    return getTierEmoji(initialProgress, config);
  };

  // Per-particle state
  const [pStates, setPStates] = useState(() =>
    configs.map((c, i) => ({
      emoji: getInitialEmoji(c, i),
      opacity: c.baseOpacity,
      pulse: false,
      floatIn: false,
    }))
  );

  const displayedRef = useRef(configs.map((c, i) => getInitialEmoji(c, i)));
  const timers = useRef(new Map());

  // ─── Welcome mode: auto-cycling progress ────────────────────────
  const [autoProgress, setAutoProgress] = useState(0);

  useEffect(() => {
    if (mode !== 'welcome') return;
    const t0 = Date.now();
    const cycle = WELCOME_CYCLE_MS + WELCOME_HOLD_MS;
    const id = setInterval(() => {
      const elapsed = (Date.now() - t0) % cycle;
      setAutoProgress(elapsed < WELCOME_CYCLE_MS ? elapsed / WELCOME_CYCLE_MS : 1);
    }, 80);
    return () => clearInterval(id);
  }, [mode]);

  // ─── Compute target emojis ──────────────────────────────────────
  const effectiveProgress = mode === 'welcome' ? autoProgress : Math.min(1, Math.max(0, progress));

  // Freeplay: stable emoji assignments — only the genuinely new emoji
  // triggers a single particle change, instead of reshuffling all 25.
  const [freeplayPool, setFreeplayPool] = useState(() => {
    if (mode === 'freeplay' && recentEmojis.length > 0) {
      return configs.map((_, i) => recentEmojis[i % recentEmojis.length]);
    }
    return [];
  });
  const prevRecentRef = useRef(mode === 'freeplay' ? recentEmojis : []);

  useEffect(() => {
    if (mode !== 'freeplay') return;
    if (recentEmojis.length === 0) return;

    const prev = prevRecentRef.current;
    prevRecentRef.current = recentEmojis;

    if (prev.length === 0) {
      // First load — set particles directly without transition animation
      const pool = configs.map((_, i) => recentEmojis[i % recentEmojis.length]);
      setFreeplayPool(pool);
      displayedRef.current = pool;
      setPStates(
        configs.map((c, i) => ({
          emoji: pool[i],
          opacity: c.baseOpacity,
          pulse: false,
          floatIn: false,
        }))
      );
      return;
    }

    // Find genuinely new emojis not in the previous set
    const prevSet = new Set(prev);
    const newEmojis = recentEmojis.filter((e) => !prevSet.has(e));
    if (newEmojis.length === 0) return;

    setFreeplayPool((current) => {
      const next = [...current];
      const recentSet = new Set(recentEmojis);

      // Prefer replacing particles whose emoji dropped out of the recent set
      const staleIndices = [];
      next.forEach((emoji, i) => {
        if (!recentSet.has(emoji)) staleIndices.push(i);
      });

      // If not enough stale slots, pick random particles
      if (staleIndices.length < newEmojis.length) {
        const available = next.map((_, i) => i).filter((i) => !staleIndices.includes(i));
        for (let j = available.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [available[j], available[k]] = [available[k], available[j]];
        }
        staleIndices.push(...available.slice(0, newEmojis.length - staleIndices.length));
      }

      newEmojis.forEach((emoji, idx) => {
        if (idx < staleIndices.length) {
          next[staleIndices[idx]] = emoji;
        }
      });

      return next;
    });
  }, [mode, recentEmojis, configs]);

  const targetEmojis = useMemo(() => {
    if (mode === 'freeplay') {
      return freeplayPool.length > 0 ? freeplayPool : configs.map(() => '✨');
    }
    return configs.map((c) => getTierEmoji(effectiveProgress, c));
  }, [mode, effectiveProgress, freeplayPool, configs]);

  // ─── Transition particles when target emojis change ─────────────
  useEffect(() => {
    const usePulse = mode !== 'welcome';
    const useFloat = mode === 'freeplay';

    targetEmojis.forEach((target, i) => {
      if (timers.current.has(i)) return;
      if (target === displayedRef.current[i]) return;

      const delay = mode === 'freeplay' ? Math.random() * 600 : 0;

      const outerTimer = setTimeout(() => {
        // Phase 1: fade out, clear animation flags
        setPStates((prev) => {
          const next = [...prev];
          next[i] = { ...prev[i], opacity: 0, pulse: false, floatIn: false };
          return next;
        });

        // Phase 2: swap emoji + appear with effects
        const swapTimer = setTimeout(() => {
          displayedRef.current[i] = target;
          setPStates((prev) => {
            const next = [...prev];
            next[i] = {
              emoji: target,
              opacity: configs[i].baseOpacity,
              pulse: usePulse,
              floatIn: useFloat,
            };
            return next;
          });

          // Phase 3: settle — clear animation flags after they finish
          const settleMs = useFloat ? FLOAT_IN_MS : PULSE_MS;
          const settleTimer = setTimeout(() => {
            setPStates((prev) => {
              const next = [...prev];
              next[i] = { ...prev[i], pulse: false, floatIn: false };
              return next;
            });
            timers.current.delete(i);
          }, settleMs + 100);

          timers.current.set(i, settleTimer);
        }, FADE_MS);

        timers.current.set(i, swapTimer);
      }, delay);

      timers.current.set(i, outerTimer);
    });
  }, [targetEmojis, mode, configs]);

  // Cleanup on unmount
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <>
      <style>{`
        .alchemy-scroll::-webkit-scrollbar {
          display: none;
        }
        .alchemy-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes evo-drift-x-0 {
          0% { transform: translateX(calc(var(--dx) * 1px)); }
          25% { transform: translateX(calc(var(--dx) * -0.4px)); }
          50% { transform: translateX(calc(var(--dx) * -0.9px)); }
          75% { transform: translateX(calc(var(--dx) * 0.3px)); }
          100% { transform: translateX(calc(var(--dx) * 1px)); }
        }
        @keyframes evo-drift-x-1 {
          0% { transform: translateX(calc(var(--dx) * -0.7px)); }
          30% { transform: translateX(calc(var(--dx) * 0.8px)); }
          60% { transform: translateX(calc(var(--dx) * -0.3px)); }
          85% { transform: translateX(calc(var(--dx) * 1px)); }
          100% { transform: translateX(calc(var(--dx) * -0.7px)); }
        }
        @keyframes evo-drift-x-2 {
          0% { transform: translateX(calc(var(--dx) * 0.5px)); }
          20% { transform: translateX(calc(var(--dx) * -1px)); }
          55% { transform: translateX(calc(var(--dx) * 0.7px)); }
          80% { transform: translateX(calc(var(--dx) * -0.2px)); }
          100% { transform: translateX(calc(var(--dx) * 0.5px)); }
        }
        @keyframes evo-drift-y-0 {
          0% { transform: translateY(calc(var(--dy) * 1px)); }
          30% { transform: translateY(calc(var(--dy) * -0.6px)); }
          60% { transform: translateY(calc(var(--dy) * -0.8px)); }
          80% { transform: translateY(calc(var(--dy) * 0.5px)); }
          100% { transform: translateY(calc(var(--dy) * 1px)); }
        }
        @keyframes evo-drift-y-1 {
          0% { transform: translateY(calc(var(--dy) * -0.5px)); }
          25% { transform: translateY(calc(var(--dy) * 0.9px)); }
          50% { transform: translateY(calc(var(--dy) * -0.2px)); }
          75% { transform: translateY(calc(var(--dy) * -1px)); }
          100% { transform: translateY(calc(var(--dy) * -0.5px)); }
        }
        @keyframes evo-drift-y-2 {
          0% { transform: translateY(calc(var(--dy) * 0.3px)); }
          35% { transform: translateY(calc(var(--dy) * -0.8px)); }
          65% { transform: translateY(calc(var(--dy) * 1px)); }
          90% { transform: translateY(calc(var(--dy) * -0.4px)); }
          100% { transform: translateY(calc(var(--dy) * 0.3px)); }
        }
        @keyframes evo-rotate {
          0% { transform: rotate(calc(var(--rot) * 1deg)); }
          50% { transform: rotate(calc(var(--rot) * -1deg)); }
          100% { transform: rotate(calc(var(--rot) * 1deg)); }
        }
        @keyframes evo-pulse {
          0% { opacity: 0; transform: scale(1.3); }
          40% { opacity: var(--base-op); transform: scale(1.3); }
          100% { opacity: var(--base-op); transform: scale(1); }
        }
        @keyframes evo-emerge {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: var(--base-op); transform: scale(1.2); }
          100% { opacity: var(--base-op); transform: scale(1); }
        }
        @keyframes evo-float-in {
          0% { transform: translate(var(--ffx), var(--ffy)); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {configs.map((c, i) => {
          const ps = pStates[i];
          if (!ps) return null;

          // Outer wrapper: handles float-in translation (creative mode)
          const floatInAnimation =
            ps.floatIn && !reduceMotion
              ? `evo-float-in ${FLOAT_IN_MS}ms ease-out forwards`
              : 'none';

          // Span: pulse animation (daily) or emerge animation (creative) or CSS transition
          const spanAnimation = ps.floatIn
            ? `evo-emerge ${FLOAT_IN_MS}ms ease-out forwards`
            : `evo-pulse ${PULSE_MS}ms ease-out forwards`;

          // Build span style — animation mode vs transition mode
          const spanStyle =
            ps.pulse && !reduceMotion
              ? {
                  fontSize: `${c.size}px`,
                  '--base-op': c.baseOpacity,
                  animation: spanAnimation,
                  display: 'block',
                  lineHeight: 1,
                  filter: c.blur > 0 ? `blur(${c.blur}px)` : 'none',
                  userSelect: 'none',
                }
              : {
                  fontSize: `${c.size}px`,
                  opacity: ps.opacity,
                  transition: reduceMotion ? 'none' : `opacity ${FADE_MS}ms ease`,
                  display: 'block',
                  lineHeight: 1,
                  filter: c.blur > 0 ? `blur(${c.blur}px)` : 'none',
                  userSelect: 'none',
                };

          return (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                left: `${c.x}%`,
                top: `${c.y}%`,
                '--ffx': `${COMBO_ORIGIN_X - c.x}vw`,
                '--ffy': `${COMBO_ORIGIN_Y - c.y}vh`,
                animation: floatInAnimation,
              }}
            >
              <div
                style={{
                  '--dx': c.driftXPx,
                  animation: reduceMotion
                    ? 'none'
                    : `evo-drift-x-${c.driftVariant} ${c.driftXDur}s ease-in-out ${c.driftXDelay}s infinite`,
                }}
              >
                <div
                  style={{
                    '--dy': c.driftYPx,
                    animation: reduceMotion
                      ? 'none'
                      : `evo-drift-y-${c.driftVariant} ${c.driftYDur}s ease-in-out ${c.driftYDelay}s infinite`,
                  }}
                >
                  <div
                    style={{
                      '--rot': c.rotDeg,
                      animation: reduceMotion
                        ? 'none'
                        : `evo-rotate ${c.rotDur}s ease-in-out ${c.rotDelay}s infinite`,
                    }}
                  >
                    <span style={spanStyle}>{ps.emoji}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default EvolutionaryBackground;
