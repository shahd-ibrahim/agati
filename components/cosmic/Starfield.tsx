"use client";

import { useEffect, useRef } from "react";

/** Cosmic Gastronomy palette: brand turquoise + light blue on luxury dark. */
export const COSMIC = {
  space: "#05070B",
  teal: "#1ECAD3",
  /** secondary glow (orbits, index numbers, calorie pills) */
  accent: "#63D2FF",
  brand: "#1ECAD3",
  light: "#63D2FF",
};

type Star = { x: number; y: number; z: number; pz: number; size: number; color: string };

/**
 * 3D parallax starfield on a single canvas (cheap on phones) plus two slow, GPU-only nebula
 * layers. `warpKey` changing triggers a ~0.9s hyperspace streak (used on category transitions).
 * Pauses when the tab is hidden; draws a single still frame for prefers-reduced-motion.
 */
export function Starfield({ warpKey }: { warpKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const warpUntil = useRef(0);
  const firstWarp = useRef(true);

  useEffect(() => {
    if (firstWarp.current) {
      firstWarp.current = false;
      return;
    }
    warpUntil.current = performance.now() + 900;
  }, [warpKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = performance.now();
    // pointer / tilt parallax target and eased value (-1..1)
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };

    const palette = [ "#ffffff", "#ffffff", "#ffffff", "#bff5f8", COSMIC.teal, COSMIC.accent ];
    const spawn = (z = Math.random()): Star => ({
      x: (Math.random() * 2 - 1) * 1.2,
      y: (Math.random() * 2 - 1) * 1.2,
      z: Math.max(0.05, z),
      pz: Math.max(0.05, z),
      size: Math.random() * 1.1 + 0.35,
      color: palette[(Math.random() * palette.length) | 0],
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(320, Math.round((w * h) / 2600));
      stars = Array.from({ length: count }, () => spawn());
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const warping = now < warpUntil.current;
      const warpT = warping ? 1 - (warpUntil.current - now) / 900 : 0;
      // ease in-out speed curve for the warp
      const speed = reduced ? 0 : 0.035 + (warping ? Math.sin(warpT * Math.PI) * 1.8 : 0);

      eased.x += (target.x - eased.x) * 0.04;
      eased.y += (target.y - eased.y) * 0.04;
      const cx = w / 2 + eased.x * 28;
      const cy = h / 2 + eased.y * 28;
      const f = Math.max(w, h) * 0.55;

      ctx.fillStyle = COSMIC.space;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.05) Object.assign(s, spawn(1));
        const k = f / s.z;
        const sx = cx + s.x * k;
        const sy = cy + s.y * k;
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) {
          if (s.z < 0.9) Object.assign(s, spawn(1));
          continue;
        }
        const depth = 1 - s.z;
        const r = s.size * (0.4 + depth * 1.6);
        ctx.globalAlpha = Math.min(1, 0.25 + depth * 0.9);
        if (warping) {
          const pk = f / s.pz;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = r;
          ctx.beginPath();
          ctx.moveTo(cx + s.x * pk, cy + s.y * pk);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.color;
          ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / w) * 2 - 1;
      target.y = (e.clientY / h) * 2 - 1;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      target.x = Math.max(-1, Math.min(1, e.gamma / 30));
      target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ background: COSMIC.space }}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Nebulae: large blurred gradients drifting with transform only */}
      <div
        className="nebula absolute -left-[30vmax] -top-[25vmax] h-[80vmax] w-[80vmax] rounded-full opacity-[0.22] mix-blend-screen"
        style={{ background: `radial-gradient(closest-side, ${COSMIC.teal}, transparent 70%)`, animationDuration: "38s" }}
      />
      <div
        className="nebula absolute -bottom-[30vmax] -right-[25vmax] h-[75vmax] w-[75vmax] rounded-full opacity-[0.16] mix-blend-screen"
        style={{ background: `radial-gradient(closest-side, ${COSMIC.accent}, transparent 70%)`, animationDuration: "46s", animationDelay: "-12s" }}
      />
      <div
        className="nebula absolute left-[20vw] top-[35vh] h-[50vmax] w-[50vmax] rounded-full opacity-[0.10] mix-blend-screen"
        style={{ background: `radial-gradient(closest-side, ${COSMIC.brand}, transparent 70%)`, animationDuration: "52s", animationDelay: "-25s" }}
      />
      {/* vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(3,11,16,0.85) 100%)" }} />
    </div>
  );
}
