"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useApp } from "../AppProvider";
import { useSheet } from "../useSheet";
import { AllergenPill, C, CaloriePill, Monogram, other } from "./parts";
import { allergenLabels, formatPrice, t, tr } from "@/lib/i18n";
import type { MenuItem } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Full-photo detail sheet. Swipe the photo or use the arrows to move through the category. */
export function DishModal({
  items,
  index,
  categoryName,
  onIndex,
  onClose,
}: {
  items: MenuItem[];
  index: number | null;
  categoryName: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const open = index !== null && index < items.length;
  const [dir, setDir] = useState(1);
  useSheet(open, onClose);

  const go = (d: number) => {
    if (index === null || items.length < 2) return;
    setDir(d);
    onIndex((index + d + items.length) % items.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(lang === "ar" ? 1 : -1);
      if (e.key === "ArrowRight") go(lang === "ar" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;
    if (Math.abs(x) < 50 && Math.abs(info.velocity.x) < 450) return;
    go((lang === "ar" ? x > 0 : x < 0) ? 1 : -1);
  };

  const item = open ? items[index!] : null;
  const sign = (lang === "ar" ? -1 : 1) * dir;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="dish-modal"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: "rgba(26,29,32,0.45)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t(item.name, lang)}
            className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{ background: C.card, boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <span className="font-ui text-xs font-semibold" style={{ color: C.slate }}>
                {categoryName} · {index! + 1} / {items.length}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={tr("close", lang)}
                className="flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: C.line, color: C.ink }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),20px)]">
              {/* photo */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ background: C.well }}>
                <AnimatePresence initial={false} custom={sign} mode="popLayout">
                  <motion.div
                    key={item.id}
                    custom={sign}
                    className="absolute inset-0 touch-pan-y"
                    variants={{
                      enter: (s: number) => ({ x: `${s * 40}%`, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (s: number) => ({ x: `${s * -40}%`, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: EASE }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={onDragEnd}
                  >
                    {item.image ? (
                      <Image src={item.image} alt={t(item.name, lang)} fill priority draggable={false} sizes="(min-width: 512px) 480px, 100vw" className={`pointer-events-none object-cover ${item.isAvailable ? "" : "grayscale"}`} />
                    ) : (
                      <Monogram label={t(item.name, lang)} big />
                    )}
                  </motion.div>
                </AnimatePresence>
                {items.length > 1 &&
                  ([-1, 1] as const).map((d) => {
                    const delta = lang === "ar" ? -d : d;
                    const Icon = d === -1 ? ChevronLeft : ChevronRight;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => go(delta)}
                        aria-label={delta > 0 ? (lang === "ar" ? "الطبق التالي" : "Next dish") : lang === "ar" ? "الطبق السابق" : "Previous dish"}
                        className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full ${d === -1 ? "left-2" : "right-2"}`}
                        style={{ background: "rgba(255,255,255,0.92)", color: C.ink, boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
              </div>

              {/* details */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${item.id}-${lang}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl font-bold leading-tight" style={{ color: C.ink }}>
                        {t(item.name, lang)}
                      </h2>
                      <p className="mt-0.5 text-sm" style={{ color: C.faint }}>
                        <bdi lang={other(lang)}>{t(item.name, other(lang))}</bdi>
                      </p>
                    </div>
                    <span className="font-ui shrink-0 pt-1 text-xl font-extrabold tabular-nums" style={{ color: C.accentInk }}>
                      {formatPrice(item.price, lang)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <CaloriePill calories={item.calories} lang={lang} large />
                    {item.allergens.filter((a) => a !== "chef").map((a) => (
                      <AllergenPill key={a} allergen={a} lang={lang} />
                    ))}
                    {item.allergens.includes("chef") && (
                      <span className="text-xs font-semibold" style={{ color: "#8B6F4C" }}>
                        ★ {t(allergenLabels.chef, lang)}
                      </span>
                    )}
                    {!item.isAvailable && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#FDECEC", color: "#B42318" }}>
                        {lang === "ar" ? "نفدت الكمية" : "Sold out"}
                      </span>
                    )}
                  </div>

                  {(item.description.ar || item.description.en) && (
                    <div className="mt-4 border-t pt-4" style={{ borderColor: C.line }}>
                      <p className="text-[15px] leading-relaxed" style={{ color: C.ink }}>
                        {t(item.longDescription ?? item.description, lang)}
                      </p>
                      <p lang={other(lang)} dir={other(lang) === "ar" ? "rtl" : "ltr"} className="mt-2 text-[13px] leading-relaxed" style={{ color: C.slate }}>
                        {t(item.longDescription ?? item.description, other(lang))}
                      </p>
                    </div>
                  )}
                  <p className="mt-4 text-[11px] leading-relaxed" style={{ color: C.faint }}>
                    {tr("sfda", lang)}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
