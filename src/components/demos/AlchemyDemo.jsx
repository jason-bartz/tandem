'use client';
import { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Minus, Sparkles } from 'lucide-react';
import DemoContainer from './DemoContainer';
import useDemoTimeline from './useDemoTimeline';

const MOCK_ELEMENTS = [
  { name: 'Water', emoji: '💧' },
  { name: 'Fire', emoji: '🔥' },
  { name: 'Earth', emoji: '🌍' },
  { name: 'Wind', emoji: '💨' },
  { name: 'Steam', emoji: '♨️' },
  { name: 'Lava', emoji: '🌋' },
  { name: 'Mud', emoji: '🟤' },
  { name: 'Cloud', emoji: '☁️' },
];

export const ALCHEMY_TIMELINE = [
  // First combination: Water + Fire = Steam
  { at: 0.8, action: 'selectSlot0', data: { element: 0 } },
  { at: 1.5, action: 'selectSlot1', data: { element: 1 } },
  { at: 2.3, action: 'combine' },
  { at: 2.8, action: 'result', data: { element: 4 } },
  { at: 4.0, action: 'dismissResult' },
  // Second combination: Earth + Fire = Lava
  { at: 4.8, action: 'selectSlot0', data: { element: 2 } },
  { at: 5.5, action: 'selectSlot1', data: { element: 1 } },
  { at: 6.3, action: 'combine' },
  { at: 6.8, action: 'result', data: { element: 5 } },
  { at: 8.0, action: 'dismissResult' },
  // Switch to subtract mode, then Lava - Fire = Earth (demonstrating subtract)
  { at: 8.6, action: 'toggleSubtract' },
  { at: 9.2, action: 'selectSlot0', data: { element: 5 } },
  { at: 9.8, action: 'selectSlot1', data: { element: 1 } },
  { at: 10.5, action: 'combine' },
  { at: 11.0, action: 'result', data: { element: 7 } },
  { at: 12.2, action: 'dismissResult' },
  // Switch back to add mode
  { at: 12.6, action: 'toggleSubtract' },
  // Pause before loop
  { at: 14.0, action: 'reset' },
];

function ElementChip({ element, isHighlighted }) {
  return (
    <motion.div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${
        isHighlighted
          ? 'bg-accent-yellow dark:bg-accent-yellow/70 text-gray-900'
          : 'bg-bg-card dark:bg-gray-700 text-text-primary'
      }`}
      animate={isHighlighted ? { scale: 1.05 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <span>{element.emoji}</span>
      <span>{element.name}</span>
    </motion.div>
  );
}

function CombineSlot({ element, label }) {
  return (
    <div
      className={`w-16 h-16 flex flex-col items-center justify-center rounded-lg text-center ${
        element
          ? 'bg-bg-card dark:bg-gray-700'
          : 'bg-bg-surface dark:bg-gray-800 border border-dashed border-border-main'
      }`}
    >
      {element ? (
        <>
          <span className="text-lg">{element.emoji}</span>
          <span className="text-[8px] font-medium text-text-primary">{element.name}</span>
        </>
      ) : (
        <span className="text-[9px] text-text-muted">{label}</span>
      )}
    </div>
  );
}

function OperatorToggle({ subtractMode }) {
  return (
    <div className="flex items-center rounded-lg overflow-hidden">
      <div
        className={`w-6 h-6 flex items-center justify-center transition-colors duration-200 ${
          !subtractMode
            ? 'bg-accent-green text-gray-900'
            : 'bg-gray-300 dark:bg-gray-600 text-text-muted'
        }`}
      >
        <Plus className="w-3 h-3" />
      </div>
      <div
        className={`w-6 h-6 flex items-center justify-center transition-colors duration-200 ${
          subtractMode
            ? 'bg-red-400 dark:bg-red-500 text-white'
            : 'bg-gray-300 dark:bg-gray-600 text-text-muted'
        }`}
      >
        <Minus className="w-3 h-3" />
      </div>
    </div>
  );
}

export default function AlchemyDemo({ timeline, onCaptionChange } = {}) {
  const { reduceMotion } = useTheme();
  const activeTimeline = timeline || ALCHEMY_TIMELINE;
  const { history, caption } = useDemoTimeline(activeTimeline, { paused: reduceMotion });

  useEffect(() => {
    if (onCaptionChange && caption !== null) {
      onCaptionChange(caption);
    }
  }, [caption, onCaptionChange]);

  const state = useMemo(() => {
    let slot0 = null;
    let slot1 = null;
    let resultElement = null;
    let combining = false;
    let subtractMode = false;
    const discovered = new Set();

    for (let i = 0; i < history.length; i++) {
      const event = activeTimeline[i];
      if (!event) break;
      switch (event.action) {
        case 'selectSlot0':
          slot0 = event.data.element;
          break;
        case 'selectSlot1':
          slot1 = event.data.element;
          break;
        case 'toggleSubtract':
          subtractMode = !subtractMode;
          break;
        case 'combine':
          combining = true;
          break;
        case 'result':
          combining = false;
          resultElement = event.data.element;
          discovered.add(event.data.element);
          slot0 = null;
          slot1 = null;
          break;
        case 'dismissResult':
          resultElement = null;
          break;
        case 'reset':
          slot0 = null;
          slot1 = null;
          resultElement = null;
          combining = false;
          subtractMode = false;
          discovered.clear();
          break;
      }
    }

    return {
      slot0,
      slot1,
      resultElement,
      combining,
      subtractMode,
      discovered: new Set(discovered),
    };
  }, [history, activeTimeline]);

  const staticContent = (
    <div className="p-3 bg-bg-surface dark:bg-gray-900">
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-bg-surface dark:bg-gray-800 border border-dashed border-border-main">
          <span className="text-[9px] text-text-muted">Slot 1</span>
        </div>
        <Plus className="w-4 h-4 text-accent-green" />
        <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-bg-surface dark:bg-gray-800 border border-dashed border-border-main">
          <span className="text-[9px] text-text-muted">Slot 2</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MOCK_ELEMENTS.slice(0, 4).map((el, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-bg-card dark:bg-gray-700 text-text-primary"
          >
            <span>{el.emoji}</span>
            <span>{el.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <DemoContainer staticContent={staticContent}>
      <div className="p-3 bg-bg-surface dark:bg-gray-900">
        {/* Combination area — on top like the real game */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <CombineSlot
            element={state.slot0 !== null ? MOCK_ELEMENTS[state.slot0] : null}
            label="Slot 1"
          />
          <OperatorToggle subtractMode={state.subtractMode} />
          <CombineSlot
            element={state.slot1 !== null ? MOCK_ELEMENTS[state.slot1] : null}
            label="Slot 2"
          />
        </div>

        {/* Combine button */}
        <div className="flex justify-center mb-3">
          <motion.div
            className={`px-4 py-1 rounded-md text-[10px] font-bold font-jua transition-colors duration-200 ${
              state.slot0 !== null && state.slot1 !== null
                ? state.subtractMode
                  ? 'bg-red-400 dark:bg-red-500 text-white'
                  : 'bg-accent-green text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-text-muted'
            }`}
            animate={state.combining ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {state.subtractMode ? 'Subtract' : 'Combine'}
          </motion.div>
        </div>

        {/* Element bank — below combination area like the real game */}
        <div className="flex flex-wrap gap-1.5">
          {MOCK_ELEMENTS.slice(0, 4).map((el, i) => (
            <ElementChip
              key={i}
              element={el}
              isHighlighted={state.slot0 === i || state.slot1 === i}
            />
          ))}
          {/* Show discovered elements */}
          {[4, 5, 6, 7].map(
            (i) =>
              state.discovered.has(i) && (
                <motion.div
                  key={i}
                  initial={!reduceMotion ? { scale: 0, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ElementChip
                    element={MOCK_ELEMENTS[i]}
                    isHighlighted={state.slot0 === i || state.slot1 === i}
                  />
                </motion.div>
              )
          )}
        </div>

        {/* Result popup */}
        <AnimatePresence>
          {state.resultElement !== null && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="flex flex-col items-center gap-1 px-6 py-4 bg-bg-card dark:bg-gray-800 rounded-lg"
                initial={!reduceMotion ? { scale: 0.3, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={!reduceMotion ? { scale: 0.3, opacity: 0 } : undefined}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Sparkles className="w-4 h-4 text-accent-yellow" />
                <span className="text-2xl">{MOCK_ELEMENTS[state.resultElement].emoji}</span>
                <span className="text-sm font-jua text-text-primary">
                  {MOCK_ELEMENTS[state.resultElement].name}
                </span>
                <span className="text-[9px] text-text-muted">New Discovery!</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoContainer>
  );
}
