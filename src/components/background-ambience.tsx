"use client";

import { useEffect, useRef } from "react";

const NEON_RGB = "0, 255, 136";
const WALL_RESTITUTION = 0.94;
const RING_RESTITUTION = 0.38;
/** Extra space beyond touching — rings start gently pushing apart before overlapping */
const RING_COMFORT = 52;
const MIN_SPEED = 10;
const MAX_SPEED = 26;
const MAX_SPEED_CLAMP = 44;
const MAX_DT = 1 / 30;

type Ring = { x: number; y: number; vx: number; vy: number; r: number };

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createRings(width: number, height: number): Ring[] {
  const rings: Ring[] = [];
  /** ~250–350px diameter */
  const radii = [
    randomBetween(125, 175),
    randomBetween(125, 175),
    randomBetween(125, 175)
  ];

  for (let i = 0; i < 3; i++) {
    const r = radii[i];
    let x = width / 2;
    let y = height / 2;
    for (let attempt = 0; attempt < 100; attempt++) {
      x = randomBetween(r + 32, Math.max(r + 33, width - r - 32));
      y = randomBetween(r + 32, Math.max(r + 33, height - r - 32));
      let clear = true;
      for (const o of rings) {
        if (Math.hypot(x - o.x, y - o.y) < r + o.r + 56) {
          clear = false;
          break;
        }
      }
      if (clear) break;
    }
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(MIN_SPEED, MAX_SPEED);
    rings.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r
    });
  }
  return rings;
}

function clampSpeed(vx: number, vy: number) {
  const m = Math.hypot(vx, vy);
  if (m > MAX_SPEED_CLAMP) {
    const s = MAX_SPEED_CLAMP / m;
    return { vx: vx * s, vy: vy * s };
  }
  return { vx, vy };
}

function clampRingsToBounds(rings: Ring[], w: number, h: number) {
  for (const ring of rings) {
    ring.x = Math.min(Math.max(ring.x, ring.r), w - ring.r);
    ring.y = Math.min(Math.max(ring.y, ring.r), h - ring.r);
  }
}

function stepPhysics(rings: Ring[], w: number, h: number, dt: number) {
  for (const ring of rings) {
    ring.x += ring.vx * dt;
    ring.y += ring.vy * dt;
  }

  for (const ring of rings) {
    if (ring.x - ring.r <= 0) {
      ring.x = ring.r;
      ring.vx = Math.abs(ring.vx) * WALL_RESTITUTION;
    } else if (ring.x + ring.r >= w) {
      ring.x = w - ring.r;
      ring.vx = -Math.abs(ring.vx) * WALL_RESTITUTION;
    }
    if (ring.y - ring.r <= 0) {
      ring.y = ring.r;
      ring.vy = Math.abs(ring.vy) * WALL_RESTITUTION;
    } else if (ring.y + ring.r >= h) {
      ring.y = h - ring.r;
      ring.vy = -Math.abs(ring.vy) * WALL_RESTITUTION;
    }
  }

  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const a = rings[i];
      const b = rings[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      const minDist = a.r + b.r + RING_COMFORT;
      if (d < 1e-4) {
        dx = Math.cos(i * 2.1) * 0.01;
        dy = Math.sin(i * 2.1) * 0.01;
        d = Math.hypot(dx, dy);
      }
      if (d < minDist) {
        const nx = dx / d;
        const ny = dy / d;
        const overlap = minDist - d;
        const half = overlap * 0.52;
        a.x -= nx * half;
        a.y -= ny * half;
        b.x += nx * half;
        b.y += ny * half;

        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          const impulse = -(1 + RING_RESTITUTION) * rvn * 0.5;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  }

  for (const ring of rings) {
    const c = clampSpeed(ring.vx, ring.vy);
    ring.vx = c.vx;
    ring.vy = c.vy;
  }

  clampRingsToBounds(rings, w, h);
}

/**
 * Soft neon tube: ~15–20% peak opacity, diffused halo (shadow + blur),
 * feathered edges so it blends into the background.
 */
function drawNeonRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const strokePass = (opts: {
    filter: string;
    shadowBlur: number;
    shadowAlpha: number;
    strokeAlpha: number;
    lineWidth: number;
  }) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.filter = opts.filter;
    ctx.shadowBlur = opts.shadowBlur;
    ctx.shadowColor = `rgba(${NEON_RGB}, ${opts.shadowAlpha})`;
    ctx.strokeStyle = `rgba(${NEON_RGB}, ${opts.strokeAlpha})`;
    ctx.lineWidth = opts.lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  ctx.save();

  strokePass({
    filter: "blur(14px)",
    shadowBlur: 100,
    shadowAlpha: 0.07,
    strokeAlpha: 0.055,
    lineWidth: 36
  });
  strokePass({
    filter: "blur(8px)",
    shadowBlur: 72,
    shadowAlpha: 0.1,
    strokeAlpha: 0.085,
    lineWidth: 22
  });
  strokePass({
    filter: "blur(4px)",
    shadowBlur: 44,
    shadowAlpha: 0.12,
    strokeAlpha: 0.12,
    lineWidth: 12
  });
  strokePass({
    filter: "blur(2px)",
    shadowBlur: 28,
    shadowAlpha: 0.14,
    strokeAlpha: 0.155,
    lineWidth: 6
  });
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  strokePass({
    filter: "blur(1px)",
    shadowBlur: 0,
    shadowAlpha: 0,
    strokeAlpha: 0.18,
    lineWidth: 2.25
  });

  ctx.restore();
}

export function BackgroundAmbience() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ringsRef = useRef<Ring[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!ringsRef.current) {
        ringsRef.current = createRings(w, h);
      } else {
        clampRingsToBounds(ringsRef.current, w, h);
      }
    };

    syncSize();

    const onResize = () => syncSize();
    window.addEventListener("resize", onResize);

    let running = true;

    const stopFrameLoop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const frame = (ts: number) => {
      if (!running) return;
      const { w, h } = sizeRef.current;
      const rings = ringsRef.current;
      if (!rings || w < 1 || h < 1) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const last = lastTsRef.current;
      lastTsRef.current = ts;
      let dt = last == null ? 1 / 60 : (ts - last) / 1000;
      dt = Math.min(Math.max(dt, 0), MAX_DT);

      stepPhysics(rings, w, h, dt);

      ctx.clearRect(0, 0, w, h);
      for (const ring of rings) {
        drawNeonRing(ctx, ring.x, ring.y, ring.r);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    const startFrameLoop = () => {
      if (rafRef.current != null) return;
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopFrameLoop();
      } else {
        startFrameLoop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (!document.hidden) {
      startFrameLoop();
    }

    return () => {
      running = false;
      stopFrameLoop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(9,9,11,0.45)_100%)]" />
    </div>
  );
}
