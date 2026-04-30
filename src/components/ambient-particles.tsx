"use client";

import { useEffect, useRef } from "react";

const COUNT = 48;
const MIN_ALPHA = 0.06;
const MAX_ALPHA = 0.14;
const MIN_R = 0.35;
const MAX_R = 1.1;
const SPEED = 0.04;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseAlpha: number;
  phase: number;
};

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const reducedMotionRef = useRef(false);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    reducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initParticles = (w: number, h: number) => {
      particlesRef.current = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: randomBetween(-SPEED, SPEED),
        vy: randomBetween(-SPEED, SPEED),
        r: randomBetween(MIN_R, MAX_R),
        baseAlpha: randomBetween(MIN_ALPHA, MAX_ALPHA),
        phase: Math.random() * Math.PI * 2
      }));
    };

    const draw = (w: number, h: number, t: number, animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particlesRef.current) {
        const twinkle = animate ? 0.85 + 0.15 * Math.sin(t * 0.8 + p.phase) : 1;
        const a = p.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.fillStyle = `rgba(161, 161, 170, ${a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!particlesRef.current.length) {
        initParticles(w, h);
      } else {
        for (const p of particlesRef.current) {
          p.x = Math.min(Math.max(p.x, 0), w);
          p.y = Math.min(Math.max(p.y, 0), h);
        }
      }

      if (reducedMotionRef.current) {
        draw(w, h, 0, false);
      }
    };

    resize();

    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      timeRef.current += 0.012;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
      }

      draw(w, h, timeRef.current, true);

      if (!reducedMotionRef.current) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    if (reducedMotionRef.current) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      draw(w, h, 0, false);
    } else {
      frameRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
