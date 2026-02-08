'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Constellation cluster settings
const CONSTELLATION_COUNT = 18;
const MIN_STARS_PER = 2;
const MAX_STARS_PER = 5;
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
 * Each constellation picks a center point, then spawns 2-5 stars
 * within CLUSTER_RADIUS of that center. All stars in a cluster
 * share the same drift velocity so the shape stays rigid.
 */
function createConstellations(width, height) {
  const stars = [];
  const constellations = [];

  for (let c = 0; c < CONSTELLATION_COUNT; c++) {
    const size = MIN_STARS_PER + Math.floor(Math.random() * (MAX_STARS_PER - MIN_STARS_PER + 1));
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const dx = (Math.random() - 0.5) * 2 * MAX_SPEED;
    const dy = (Math.random() - 0.5) * 2 * MAX_SPEED;

    const group = [];
    for (let s = 0; s < size; s++) {
      // Spread stars around the center within the cluster radius
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * (CLUSTER_RADIUS - 15);
      const idx = stars.length;
      stars.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
        baseOpacity: MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY),
        dx,
        dy,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
      group.push(idx);
    }
    constellations.push(group);
  }

  return { stars, constellations };
}

/**
 * Starfield - Subtle animated constellation background using HTML5 Canvas
 */
export function Starfield() {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
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

    const { stars, constellations } = createConstellations(width, height);
    starsRef.current = stars;
    constellationsRef.current = constellations;
  }, []);

  const drawFrame = useCallback((time, isAnimated) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const color = isDarkRef.current ? DARK_MODE_COLOR : LIGHT_MODE_COLOR;
    const stars = starsRef.current;

    ctx.clearRect(0, 0, width, height);

    // Update positions if animated
    if (isAnimated) {
      for (const star of stars) {
        star.x += star.dx;
        star.y += star.dy;

        if (star.x < -CLUSTER_RADIUS) star.x = width + CLUSTER_RADIUS;
        if (star.x > width + CLUSTER_RADIUS) star.x = -CLUSTER_RADIUS;
        if (star.y < -CLUSTER_RADIUS) star.y = height + CLUSTER_RADIUS;
        if (star.y > height + CLUSTER_RADIUS) star.y = -CLUSTER_RADIUS;
      }
    }

    // Draw constellation lines
    ctx.strokeStyle = `rgba(${color}, ${LINE_OPACITY})`;
    ctx.lineWidth = LINE_WIDTH;
    for (const group of constellationsRef.current) {
      if (group.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stars[group[0]].x, stars[group[0]].y);
      for (let i = 1; i < group.length; i++) {
        ctx.lineTo(stars[group[i]].x, stars[group[i]].y);
      }
      ctx.stroke();
    }

    // Draw stars
    for (const star of stars) {
      const twinkle = isAnimated ? Math.sin(time * TWINKLE_SPEED + star.twinkleOffset) : 0;
      const opacity = star.baseOpacity + twinkle * 0.1;

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${Math.max(0.05, opacity)})`;
      ctx.fill();
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
