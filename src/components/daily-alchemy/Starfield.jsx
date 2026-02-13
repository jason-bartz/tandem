'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Constellation cluster settings
const CONSTELLATION_COUNT = 18;
const MIN_STARS_PER = 2;
const MAX_STARS_PER = 6;
const CLUSTER_RADIUS = 60; // max px between stars in a constellation
const MIN_SIZE = 0.8;
const MAX_SIZE = 3;
const MAX_SPEED = 0.12;
const MIN_OPACITY = 0.2;
const MAX_OPACITY = 0.55;
const TWINKLE_SPEED = 0.003;
const FRAME_SKIP = 2;
const LINE_OPACITY = 0.12;
const LINE_WIDTH = 0.7;

const LIGHT_MODE_COLOR = '140, 140, 155';
const DARK_MODE_COLOR = '180, 180, 200';

/**
 * Create constellations as tight spatial clusters.
 * Each constellation has a center point that drifts, with stars stored
 * as offsets from the center. This ensures all stars in a constellation
 * wrap together as a unit, preventing lines from stretching across the screen.
 */
function createConstellations(width, height) {
  const constellations = [];

  for (let c = 0; c < CONSTELLATION_COUNT; c++) {
    const size = MIN_STARS_PER + Math.floor(Math.random() * (MAX_STARS_PER - MIN_STARS_PER + 1));
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const dx = (Math.random() - 0.5) * 2 * MAX_SPEED;
    const dy = (Math.random() - 0.5) * 2 * MAX_SPEED;

    const stars = [];
    for (let s = 0; s < size; s++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * (CLUSTER_RADIUS - 15);
      stars.push({
        offsetX: Math.cos(angle) * dist,
        offsetY: Math.sin(angle) * dist,
        size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
        baseOpacity: MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY),
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    constellations.push({ cx, cy, dx, dy, stars });
  }

  return constellations;
}

/**
 * Starfield - Subtle animated constellation background using HTML5 Canvas
 */
export function Starfield() {
  const canvasRef = useRef(null);
  const constellationsRef = useRef([]);
  const frameCountRef = useRef(0);
  const animationIdRef = useRef(null);
  const { isDark, reduceMotion } = useTheme();

  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    constellationsRef.current = createConstellations(width, height);
  }, []);

  const drawFrame = useCallback((time, isAnimated) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const color = isDarkRef.current ? DARK_MODE_COLOR : LIGHT_MODE_COLOR;
    const margin = CLUSTER_RADIUS;

    ctx.clearRect(0, 0, width, height);

    for (const constellation of constellationsRef.current) {
      // Move the constellation center — all stars wrap together as a unit
      if (isAnimated) {
        constellation.cx += constellation.dx;
        constellation.cy += constellation.dy;

        if (constellation.cx < -margin) constellation.cx = width + margin;
        if (constellation.cx > width + margin) constellation.cx = -margin;
        if (constellation.cy < -margin) constellation.cy = height + margin;
        if (constellation.cy > height + margin) constellation.cy = -margin;
      }

      const { cx, cy, stars } = constellation;

      // Draw constellation lines
      if (stars.length >= 2) {
        ctx.strokeStyle = `rgba(${color}, ${LINE_OPACITY})`;
        ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(cx + stars[0].offsetX, cy + stars[0].offsetY);
        for (let i = 1; i < stars.length; i++) {
          ctx.lineTo(cx + stars[i].offsetX, cy + stars[i].offsetY);
        }
        ctx.stroke();
      }

      // Draw stars
      for (const star of stars) {
        const twinkle = isAnimated ? Math.sin(time * TWINKLE_SPEED + star.twinkleOffset) : 0;
        const opacity = star.baseOpacity + twinkle * 0.1;

        ctx.beginPath();
        ctx.arc(cx + star.offsetX, cy + star.offsetY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${Math.max(0.05, opacity)})`;
        ctx.fill();
      }
    }
  }, []);

  const animate = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      frameCountRef.current++;

      if (frameCountRef.current % FRAME_SKIP !== 0) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      drawFrame(time, true);
      animationIdRef.current = requestAnimationFrame(animate);
    },
    [drawFrame]
  );

  useEffect(() => {
    initCanvas();

    if (reduceMotion) {
      drawFrame(0, false);
    } else {
      animationIdRef.current = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      initCanvas();
      if (reduceMotion) {
        drawFrame(0, false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [reduceMotion, initCanvas, animate, drawFrame]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
  );
}

export default Starfield;
