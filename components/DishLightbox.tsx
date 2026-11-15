"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { AllergenBadge } from "./ui";
import { useSheet } from "./useSheet";
import { DishPlaceholder, indexLabel } from "./CosmicMenu";
import { formatCalories, formatPrice, t, tr } from "@/lib/i18n";
import type { Lang, MenuItem } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const MUTED = "#A0AAB5";
const other = (l: Lang): Lang => (l === "ar" ? "en" : "ar");

/**
 * Full-photo lightbox: 3:4 portrait, bilingual details, allergens and calories.
 * Swipe left/right (direction-aware in RTL), use the arrow buttons or keys, Esc to close.
 */
export function DishLightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: MenuItem[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const open = index !== null;
  const [dir, setDir] = useState(1); // +1 = moving forward, for the slide direction
  useSheet(open, onClose);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      setDir(delta);
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  // Arrow keys follow the visual direction of the current language.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(lang === "ar" ? 1 : -1);
      if (e.key === "ArrowRight") go(lang === "ar" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, lang]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;
    if (Math.abs(x) < 60 && Math.abs(info.velocity.x) < 500) return;
    // In RTL the next dish sits to the left, so dragging right moves forward.
    const forward = lang === "ar" ? x > 0 : x < 0;
    go(forward ? 1 : -1);
  };

  const item = index !== null ? items[index] : null;
  // Visual slide direction: forward enters from the inline-end side.
  const sign = (lang === "ar" ? -1 : 1) * dir;

  return (
    <AnimatePresence>
      {item && index !== null && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#080B0F]/80 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label={t(item.name, lang)}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-[max(env(safe-area-inset-top),16px)]" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* Top bar */}
            <div className="mb-3 flex items-center justify-between text-white">
              <span className="font-ui text-xs font-semibold tabular-nums tracking-[0.25em]" style={{ color: "var(--brand-light-blue)" }}>
                {indexLabel(index)} <span style={{ color: MUTED }}>/ {indexLabel(items.length - 1)}</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("close", lang)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Photo (swipeable) */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white/[0.03] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
              <AnimatePresence initial={false} custom={sign}>
                <motion.div
                  key={item.id}
                  custom={sign}
                  className="absolute inset-0 touch-pan-y"
                  variants={{
                    enter: (s: number) => ({ x: `${s * 30}%`, opacity: 0, scale: 1.04 }),
                    center: { x: 0, opacity: 1, scale: 1 },
                    exit: (s: number) => ({ x: `${s * -30}%`, opacity: 0, scale: 0.98 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, ease: EASE }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.35}
                  onDragEnd={onDragEnd}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={t(item.name, lang)}
                      fill
                      sizes="(min-width: 448px) 448px, 100vw"
                      priority
                      draggable={false}
                      className={`pointer-events-none object-cover ${item.isAvailable ? "" : "grayscale"}`}
                    />
                  ) : (
                    <DishPlaceholder label={t(item.name, lang)} large />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Prev / next */}
              <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
                {[-1, 1].map((d) => {
                  // Visual left button = previous in LTR, next in RTL.
                  const Icon = d === -1 ? ChevronLeft : ChevronRight;
                  const delta = lang === "ar" ? -d : d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => go(delta)}
                      aria-label={delta > 0 ? (lang === "ar" ? "الطبق التالي" : "Next dish") : lang === "ar" ? "الطبق السابق" : "Previous dish"}
                      className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90"
                      style={{ direction: "ltr" }}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
              {!item.isAvailable && (
                <span className="absolute start-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-red-200 backdrop-blur">{tr("soldOut", lang)}</span>
              )}
            </div>

            {/* Dots */}
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {items.map((d, i) => (
                <span
                  key={d.id}
                  className="h-1 w-6 origin-center rounded-full transition-[transform,opacity] duration-300"
                  style={{ background: "var(--brand-turquoise)", opacity: i === index ? 1 : 0.25, transform: `scaleX(${i === index ? 1 : 0.4})` }}
                />
              ))}
            </div>

            {/* Details: cross-fade with the photo */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${item.id}-${lang}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mt-5 text-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.75rem] font-extrabold leading-tight">{t(item.name, lang)}</h2>
                    <p className="mt-0.5 text-start text-sm font-semibold" style={{ color: MUTED }}>
                      <bdi lang={other(lang)}>{t(item.name, other(lang))}</bdi>
                    </p>
                  </div>
                  <span className={`font-ui shrink-0 pt-1 text-2xl font-extrabold tabular-nums ${item.isAvailable ? "text-gradient" : "line-through opacity-50"}`}>
                    {formatPrice(item.price, lang)}
                  </span>
                </div>

                <div className="mt-5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  <p className="text-[15px] leading-relaxed text-white/90">{t(item.longDescription ?? item.description, lang)}</p>
                  <p lang={other(lang)} dir={other(lang) === "ar" ? "rtl" : "ltr"} className="mt-3 text-[13px] leading-relaxed" style={{ color: MUTED }}>
                    {t(item.longDescription ?? item.description, other(lang))}
                  </p>
                </div>

                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-t pt-4 text-sm" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  <dt className="font-ui text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                    {tr("energy", lang)}
                  </dt>
                  <dd className="font-ui font-bold" style={{ color: "var(--brand-light-blue)" }}>
                    <bdi>{formatCalories(item.calories, lang)}</bdi> · <bdi lang={other(lang)}>{formatCalories(item.calories, other(lang))}</bdi>
                  </dd>
                  <dt className="font-ui text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                    {tr("allergens", lang)}
                  </dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {item.allergens.length ? (
                      item.allergens.map((a) => <AllergenBadge key={a} allergen={a} lang={lang} />)
                    ) : (
                      <span style={{ color: MUTED }}>{tr("noAllergens", lang)}</span>
                    )}
                  </dd>
                </dl>

                <p className="mt-5 text-[11px] leading-relaxed" style={{ color: MUTED }}>
                  {tr("sfda", lang)}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
