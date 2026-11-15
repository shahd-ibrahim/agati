"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Magnetic 3D spring tilt with a light glare that follows the finger or cursor.
 * Only `transform` and a gradient position animate, through springs, so it stays at 60fps.
 * Works with touch: the card tilts while a finger moves over it, and page scrolling is untouched.
 */
export function TiltCard({
  children,
  className = "",
  rounded = "rounded-[26px]",
  max = 12,
  magnetic = 0,
  glare = "rgba(30,202,211,0.28)",
}: {
  children: React.ReactNode;
  className?: string;
  /** Radius of the tilting surface (the glare is clipped to it). */
  rounded?: string;
  max?: number;
  /** px the surface is pulled toward the pointer (magnetic feel); 0 = off */
  magnetic?: number;
  glare?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const mx = useSpring(useTransform(px, [0, 1], [-magnetic, magnetic]), spring);
  const my = useSpring(useTransform(py, [0, 1], [-magnetic, magnetic]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, ${glare}, transparent 55%)`;

  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div style={{ perspective: 900 }} className={className}>
      <motion.div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={reset}
        onPointerCancel={reset}
        onPointerUp={reset}
        style={{ rotateX, rotateY, x: mx, y: my, transformStyle: "preserve-3d" }}
        className={`relative h-full overflow-hidden will-change-transform ${rounded}`}
      >
        {children}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: glareBg }} />
      </motion.div>
    </div>
  );
}
