"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, ChevronLeft, ChevronRight, LayoutList, Maximize2, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { AllergenBadge } from "./ui";
import { TiltCard } from "./cosmic/TiltCard";
import { COSMIC } from "./cosmic/Starfield";
import { useSheet } from "./useSheet";
import { restaurant } from "@/lib/config";
import { allergenLabels, formatCalories, formatNumber, formatPrice, t, tr } from "@/lib/i18n";
import type { Category, Lang, MenuItem, SetMenu } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const MUTED = "#9FB3BD";

export const indexLabel = (i: number) => String(i + 1).padStart(2, "0");
const other = (l: Lang): Lang => (l === "ar" ? "en" : "ar");

/** Arabic counting forms for "item" (صنف). */
export function itemsLabel(n: number, lang: Lang) {
  if (lang === "en") return `${n} ${n === 1 ? "item" : "items"}`;
  if (n === 1) return "صنف واحد";
  if (n === 2) return "صنفان";
  const num = formatNumber(n, "ar");
  return n >= 3 && n <= 10 ? `${num} أصناف` : `${num} صنفاً`;
}

const neonGlass = {
  background: "linear-gradient(135deg, rgba(30,202,211,0.22), rgba(99,210,255,0.08))",
  border: `1px solid ${COSMIC.teal}aa`,
  boxShadow: `0 0 22px -4px ${COSMIC.teal}, inset 0 0 12px -4px ${COSMIC.teal}`,
  color: "#E9FDFF",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
} as const;

/* ═════════════════════════ Shared: language + table ═════════════════════════ */

export function LangAndTable({ compact }: { compact?: boolean }) {
  const { lang, toggleLang, table } = useApp();
  return (
    <div className="flex items-center gap-2">
      {table && (
        <span
          className={`font-ui inline-flex items-center gap-1.5 rounded-full border px-3 font-semibold ${compact ? "h-8 text-[11px]" : "h-9 text-xs"}`}
          style={{ borderColor: `${COSMIC.teal}66`, color: COSMIC.light, background: "rgba(5,7,11,0.6)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COSMIC.teal, boxShadow: `0 0 8px ${COSMIC.teal}` }} />
          {lang === "ar" ? `${tr("table", lang)} ${formatNumber(Number(table), lang)}` : `${tr("table", lang)}${table}`}
        </span>
      )}
      <div
        className={`flex items-center rounded-full border p-0.5 font-bold ${compact ? "h-8 text-[11px]" : "h-9 text-xs"}`}
        style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(5,7,11,0.6)" }}
        role="group"
        aria-label="Language"
      >
        {(["ar", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => l !== lang && toggleLang()}
            aria-pressed={l === lang}
            className={`rounded-full px-3 py-1 transition-colors ${l === "ar" ? "font-[family-name:var(--font-cairo)]" : "font-ui"}`}
            style={l === lang ? { background: COSMIC.teal, color: "#021A1C", boxShadow: `0 0 16px -2px ${COSMIC.teal}` } : { color: MUTED }}
          >
            {l === "ar" ? "عربي" : "EN"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════ 0 · Holographic logo reveal (1.1s) ═════════════════════════ */

export function HoloIntro({ onDone }: { onDone: () => void }) {
  const logo = restaurant.logos.stacked;
  useEffect(() => {
    const id = setTimeout(onDone, 1100);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "radial-gradient(circle at 50% 45%, rgba(30,202,211,0.12), #05070B 60%)" }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      aria-hidden
    >
      <motion.div
        className="holo-flicker relative overflow-hidden px-10 py-8"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.25, transition: { duration: 0.45 } }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <Image
          src={logo.src}
          width={logo.w}
          height={logo.h}
          alt=""
          priority
          sizes="140px"
          className="relative h-44 w-auto"
          style={{ filter: `drop-shadow(0 0 14px ${COSMIC.teal}) drop-shadow(0 0 40px ${COSMIC.light}66)` }}
        />
        <div className="holo-scan pointer-events-none absolute inset-0 mix-blend-screen" />
        <div
          className="holo-sweep pointer-events-none absolute inset-x-0 top-0 h-1/3"
          style={{ background: `linear-gradient(to bottom, transparent, ${COSMIC.light}55, transparent)` }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ═════════════════════════ 1 · Full-screen spatial category hub ═════════════════════════ */

export function CategoryPortal({
  categories,
  setMenu,
  launchId,
  onOpen,
  onOpenSetMenu,
  onOpenIndex,
}: {
  categories: Category[];
  setMenu?: SetMenu;
  launchId: string | null;
  onOpen: (id: string) => void;
  onOpenSetMenu: () => void;
  onOpenIndex: () => void;
}) {
  const { lang } = useApp();
  const logo = restaurant.logos.stacked;
  const total = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <motion.main
      className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-4 pb-16 pt-1 sm:px-6"
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.1 } }}
    >
      <div className="flex justify-end">
        <LangAndTable />
      </div>

      {/* Logo in orbit */}
      <motion.div
        className="relative mx-auto mt-1 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.4, transition: { duration: 0.45 } }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <span className="logo-glow absolute inset-6 rounded-full" style={{ background: `radial-gradient(circle, ${COSMIC.teal}55, transparent 70%)` }} />
        <span className="orbit-spin absolute inset-0 rounded-full border border-dashed" style={{ borderColor: `${COSMIC.light}55` }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: COSMIC.light, boxShadow: `0 0 12px ${COSMIC.light}` }} />
        </span>
        <span className="orbit-spin absolute inset-4 rounded-full border" style={{ borderColor: `${COSMIC.teal}40`, animationDuration: "26s", animationDirection: "reverse" }}>
          <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: COSMIC.teal, boxShadow: `0 0 10px ${COSMIC.teal}` }} />
        </span>
        <Image
          src={logo.src}
          width={logo.w}
          height={logo.h}
          alt={`${restaurant.name.ar} · ${restaurant.name.en}`}
          priority
          sizes="90px"
          className="relative h-24 w-auto sm:h-28"
          style={{ filter: `drop-shadow(0 0 18px ${COSMIC.teal}88)` }}
        />
      </motion.div>

      <motion.div className="mt-2 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7, ease: EASE }}>
        <h1
          className="font-display text-[2rem] font-black leading-tight sm:text-5xl"
          style={{ backgroundImage: `linear-gradient(90deg, ${COSMIC.light}, #ffffff 50%, ${COSMIC.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
        >
          {lang === "ar" ? "بوابة الأقسام" : "Cosmic Gastronomy Portal"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {lang === "ar" ? "اختر قسماً لتنطلق إلى أطباقه" : "Choose a category to warp into its dishes"}
        </p>
        <p className="font-ui mt-2 text-[11px] font-semibold tracking-[0.25em]" style={{ color: COSMIC.light }}>
          {lang === "ar" ? `${formatNumber(categories.length, "ar")} أقسام · ${itemsLabel(total, "ar")}` : `${categories.length} CATEGORIES · ${total} ITEMS`}
        </p>
      </motion.div>

      {/* Highlighted Set Menu portal */}
      {setMenu && (
        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
          transition={{ delay: 0.35, type: "spring", stiffness: 150, damping: 18 }}
        >
          <div className="zg-float" style={{ animationDuration: "10s" }}>
            <TiltCard rounded="rounded-[26px]" max={6} magnetic={6}>
              <button
                type="button"
                onClick={onOpenSetMenu}
                className="relative flex w-full items-center gap-4 overflow-hidden rounded-[26px] border px-5 py-4 text-start"
                style={{
                  background: `linear-gradient(110deg, rgba(30,202,211,0.28), rgba(5,12,18,0.92) 45%, rgba(99,210,255,0.22))`,
                  borderColor: COSMIC.teal,
                  boxShadow: `0 0 40px -10px ${COSMIC.teal}, inset 0 1px 0 rgba(255,255,255,0.14)`,
                }}
              >
                <span className="orbit-spin pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full border border-dashed" style={{ borderColor: `${COSMIC.light}55` }} />
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl" style={neonGlass}>
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-lg font-black leading-tight text-white sm:text-xl">{t(setMenu.title, lang)}</span>
                  <span className="block text-[12px]" style={{ color: COSMIC.light }}>
                    <bdi lang={other(lang)}>{t(setMenu.title, other(lang))}</bdi>
                    {setMenu.note ? ` · ${t(setMenu.note, lang)}` : ""}
                  </span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: MUTED }}>
                    {lang === "ar" ? `${formatNumber(setMenu.courses.length, "ar")} مراحل · من الشوربة إلى المشروبات` : `${setMenu.courses.length} courses · soup to drinks`}
                  </span>
                </span>
                <span className="font-ui shrink-0 rounded-full px-3.5 py-2 text-base font-black tabular-nums" style={neonGlass}>
                  {formatPrice(setMenu.price, lang)}
                </span>
              </button>
            </TiltCard>
          </div>
        </motion.div>
      )}

      {/* Full text-only index card */}
      <motion.button
        type="button"
        onClick={onOpenIndex}
        className="mt-3 flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-start"
        style={{ background: "rgba(6,12,18,0.82)", borderColor: `${COSMIC.light}55`, boxShadow: `0 0 26px -14px ${COSMIC.light}` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        transition={{ delay: 0.42, duration: 0.5, ease: EASE }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={neonGlass}>
          <BookOpenText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-base font-black text-white">
            {lang === "ar" ? "القائمة الشاملة" : "Full Menu Index"}{" "}
            <span className="text-xs font-semibold" style={{ color: MUTED }}>
              · <bdi lang={other(lang)}>{lang === "ar" ? "Full Index" : "القائمة الشاملة"}</bdi>
            </span>
          </span>
          <span className="block text-[11.5px]" style={{ color: MUTED }}>
            {lang === "ar" ? `كل الأقسام والأطباق (${formatNumber(total, "ar")}) في قائمة نصية واحدة سريعة` : `Every category and dish (${total}) in one fast text list`}
          </span>
        </span>
        {lang === "ar" ? <ArrowLeft className="h-5 w-5 shrink-0" style={{ color: COSMIC.light }} /> : <ArrowRight className="h-5 w-5 shrink-0" style={{ color: COSMIC.light }} />}
      </motion.button>

      {/* Orbital grid of glass portals */}
      <div className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">
        {categories.map((c, i) => (
          <PortalCard key={c.id} category={c} index={i} lang={lang} launching={launchId} onOpen={() => onOpen(c.id)} />
        ))}
      </div>

      <p className="mt-10 text-center text-[11px] leading-relaxed" style={{ color: MUTED }}>
        {tr("pricesNote", lang)} · {tr("sfda", lang)}
      </p>
    </motion.main>
  );
}

function PortalCard({ category, index, lang, launching, onOpen }: { category: Category; index: number; lang: Lang; launching: string | null; onOpen: () => void }) {
  const chosen = launching === category.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 46, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        chosen
          ? { opacity: 0, scale: 2.4, transition: { duration: 0.55, ease: [0.55, 0, 0.75, 0.2] } }
          : { opacity: 0, scale: 0.55, y: 30, transition: { duration: 0.35, delay: (index % 5) * 0.02 } }
      }
      transition={{ delay: 0.45 + index * 0.06, type: "spring", stiffness: 140, damping: 16 }}
      style={{ zIndex: chosen ? 20 : 1 }}
      className="relative"
    >
      <div className="zg-float" style={{ animationDuration: `${7.5 + (index % 4) * 1.35}s`, animationDelay: `-${(index * 1.7) % 9}s` }}>
        <TiltCard rounded="rounded-[26px]" max={14} magnetic={8}>
          <button
            type="button"
            onClick={onOpen}
            className="group block w-full rounded-[26px] border p-2 text-start"
            style={{
              background: "linear-gradient(160deg, rgba(30,202,211,0.16), rgba(6,12,18,0.9) 38%, rgba(6,12,18,0.94) 70%, rgba(99,210,255,0.10))",
              borderColor: `${COSMIC.teal}59`,
              boxShadow: `0 0 34px -14px ${COSMIC.teal}, inset 0 1px 0 rgba(255,255,255,0.10)`,
            }}
            aria-label={`${t(category.name, lang)} · ${itemsLabel(category.items.length, lang)}`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#06121A]">
              {category.coverImage ? (
                <Image
                  src={category.coverImage}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 46vw"
                  priority={index < 4}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              ) : (
                <DishPlaceholder label={t(category.name, lang)} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070B] via-transparent to-transparent opacity-80" />
              <span
                className="font-ui absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                style={{ background: "rgba(5,7,11,0.7)", color: COSMIC.light, border: `1px solid ${COSMIC.light}55` }}
              >
                {indexLabel(index)}
              </span>
            </div>
            <div className="px-1.5 pb-1.5 pt-2.5">
              <h3 className="font-display text-[15px] font-extrabold leading-snug text-white sm:text-base">{t(category.name, lang)}</h3>
              <p lang={other(lang)} className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: MUTED }}>
                <bdi>{t(category.name, other(lang))}</bdi>
              </p>
              <span
                className="font-ui mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                style={{ background: `${COSMIC.teal}26`, color: COSMIC.light, boxShadow: `inset 0 0 0 1px ${COSMIC.teal}55` }}
              >
                ✦ {itemsLabel(category.items.length, lang)}
              </span>
            </div>
          </button>
        </TiltCard>
      </div>
    </motion.div>
  );
}

/* ═════════════════════════ Set Menu modal ═════════════════════════ */

export function SetMenuModal({ setMenu, open, onClose }: { setMenu?: SetMenu; open: boolean; onClose: () => void }) {
  const { lang } = useApp();
  useSheet(open, onClose);
  return (
    <AnimatePresence>
      {open && setMenu && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#05070B]/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={t(setMenu.title, lang)}
        >
          <motion.div
            className="relative mx-auto my-6 w-[min(100%-2rem,32rem)] overflow-hidden rounded-[28px] border p-6"
            style={{ background: "linear-gradient(170deg, rgba(10,30,38,0.95), rgba(5,8,12,0.97))", borderColor: COSMIC.teal, boxShadow: `0 0 60px -14px ${COSMIC.teal}` }}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <button type="button" onClick={onClose} aria-label={tr("close", lang)} className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white">
              <X className="h-4 w-4" />
            </button>
            <p className="font-ui text-[11px] font-bold tracking-[0.3em]" style={{ color: COSMIC.light }}>
              SET MENU
            </p>
            <h2 className="font-display mt-1 text-3xl font-black text-white">{t(setMenu.title, lang)}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="font-ui rounded-full px-4 py-1.5 text-xl font-black tabular-nums" style={neonGlass}>
                {formatPrice(setMenu.price, lang)}
              </span>
              {setMenu.note && (
                <span className="text-sm" style={{ color: MUTED }}>
                  {t(setMenu.note, lang)}
                </span>
              )}
            </div>

            <ol className="mt-6">
              {setMenu.courses.map((c, i) => (
                <motion.li
                  key={c.name.en}
                  className="relative border-t py-3.5 ps-10"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <span className="font-ui absolute start-0 top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" style={neonGlass}>
                    {indexLabel(i)}
                  </span>
                  <p className="font-display text-base font-bold text-white">
                    {t(c.name, lang)}{" "}
                    <span className="text-xs font-semibold" style={{ color: MUTED }}>
                      · <bdi lang={other(lang)}>{t(c.name, other(lang))}</bdi>
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COSMIC.light }}>
                    {c.options.map((o) => t(o, lang)).join(c.all ? (lang === "ar" ? "، " : ", ") : lang === "ar" ? " أو " : " or ")}
                  </p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {c.all ? (lang === "ar" ? "تشكيلة كاملة" : "All included") : lang === "ar" ? "اختر واحداً" : "Choose one"}
                  </p>
                </motion.li>
              ))}
            </ol>
            <p className="mt-4 text-[11px]" style={{ color: MUTED }}>
              {tr("pricesNote", lang)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═════════════════════════ 2 · Anti-gravity dish stage ═════════════════════════ */

export function CategoryStage({
  category,
  index,
  total,
  dishIndex,
  onDish,
  onBack,
  onExpand,
}: {
  category: Category;
  index: number;
  total: number;
  dishIndex: number;
  onDish: (i: number) => void;
  onBack: () => void;
  onExpand: () => void;
}) {
  const { lang } = useApp();
  const [dir, setDir] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const items = category.items;
  const n = items.length;
  const item = n ? items[Math.min(dishIndex, n - 1)] : undefined;

  const go = useCallback(
    (delta: number) => {
      if (!n) return;
      setDir(delta);
      onDish((dishIndex + delta + n) % n);
    },
    [dishIndex, n, onDish],
  );

  // Keyboard arrows follow the reading direction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.body.style.overflow === "hidden") return;
      if (e.key === "ArrowLeft") go(lang === "ar" ? 1 : -1);
      if (e.key === "ArrowRight") go(lang === "ar" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lang]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;
    if (Math.abs(x) < 50 && Math.abs(info.velocity.x) < 450) return;
    go((lang === "ar" ? x > 0 : x < 0) ? 1 : -1);
  };

  // "next" enters from the inline-end side
  const sign = (lang === "ar" ? -1 : 1) * dir;
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const soldOut = item ? !item.isAvailable : false;

  return (
    <motion.main
      className="relative z-10 mx-auto flex min-h-[calc(100dvh-64px)] max-w-xl flex-col px-4 pb-[max(env(safe-area-inset-bottom),18px)] pt-1"
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.35 } }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {/* warp landing flash */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 z-30 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${COSMIC.light}cc, ${COSMIC.teal}55 25%, transparent 60%)` }}
        initial={{ opacity: 0.95, scale: 0.05 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />

      {/* Top: glowing "All Categories" pill */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-extrabold text-white transition-transform active:scale-95"
          style={{ ...neonGlass, background: "rgba(5,7,11,0.7)" }}
        >
          <BackIcon className="h-4 w-4" style={{ color: COSMIC.light }} />
          {lang === "ar" ? "كل الأقسام" : "All Categories"}
        </button>
        <LangAndTable compact />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ui text-[10.5px] font-bold tabular-nums tracking-[0.3em]" style={{ color: COSMIC.light }}>
            {indexLabel(index)} / {indexLabel(total - 1)}
          </p>
          <h1 className="font-display truncate text-[1.6rem] font-black leading-tight text-white" style={{ textShadow: `0 0 24px ${COSMIC.teal}55` }}>
            {t(category.name, lang)}
          </h1>
        </div>
        {n > 0 && (
          <span className="font-ui shrink-0 pb-1 text-sm font-bold tabular-nums" style={{ color: MUTED }}>
            <span className="text-white">{formatNumber(dishIndex + 1, lang)}</span> / {formatNumber(n, lang)}
          </span>
        )}
      </div>

      {!item ? (
        <p className="mt-16 text-center text-sm" style={{ color: MUTED }}>
          {lang === "ar" ? "لا توجد أطباق في هذا القسم بعد" : "No dishes in this category yet"}
        </p>
      ) : (
        <>
          {/* Floating dish frame */}
          <div className="relative mt-4">
            <AnimatePresence initial={false} custom={sign} mode="popLayout">
              <motion.div
                key={item.id}
                custom={sign}
                variants={{
                  enter: (s: number) => ({ x: `${s * 55}%`, opacity: 0, scale: 0.88, rotate: s * 4 }),
                  center: { x: 0, opacity: 1, scale: 1, rotate: 0 },
                  exit: (s: number) => ({ x: `${s * -55}%`, opacity: 0, scale: 0.88, rotate: s * -4 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.55, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={onDragEnd}
                className="touch-pan-y"
              >
                {/* anti-gravity levitation: y −4 ↔ 4px, 5s loop */}
                <motion.div animate={{ y: [-4, 4] }} transition={{ duration: 2.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
                  <TiltCard rounded="rounded-[28px]" max={7}>
                    <button
                      type="button"
                      onClick={onExpand}
                      className="relative block aspect-[4/5] max-h-[54dvh] w-full overflow-hidden rounded-[28px] border"
                      style={{ borderColor: `${COSMIC.teal}88`, boxShadow: `0 0 50px -14px ${COSMIC.teal}, 0 30px 60px -30px #000` }}
                      aria-label={`${t(item.name, lang)} · ${lang === "ar" ? "عرض بالحجم الكامل" : "view full size"}`}
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={t(item.name, lang)}
                          fill
                          priority
                          draggable={false}
                          sizes="(min-width: 576px) 540px, 92vw"
                          className={`pointer-events-none object-cover ${soldOut ? "grayscale" : ""}`}
                        />
                      ) : (
                        <DishPlaceholder label={t(item.name, lang)} large />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05070B]/85 via-transparent to-transparent" />
                      <span className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-ui absolute bottom-3 end-3 rounded-full px-3.5 py-1.5 text-lg font-black tabular-nums" style={neonGlass}>
                        <span className={soldOut ? "line-through opacity-60" : ""}>{formatPrice(item.price, lang)}</span>
                      </span>
                      {soldOut && <span className="absolute start-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-red-300">{tr("soldOut", lang)}</span>}
                    </button>
                  </TiltCard>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* explicit glowing arrows */}
            {n > 1 &&
              ([-1, 1] as const).map((d) => {
                const delta = lang === "ar" ? -d : d; // visual left = previous in LTR, next in RTL
                const Icon = d === -1 ? ChevronLeft : ChevronRight;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => go(delta)}
                    aria-label={delta > 0 ? (lang === "ar" ? "الطبق التالي" : "Next dish") : lang === "ar" ? "الطبق السابق" : "Previous dish"}
                    className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition-transform active:scale-90 ${d === -1 ? "-left-2" : "-right-2"}`}
                    style={{ ...neonGlass, background: "rgba(5,7,11,0.65)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
          </div>

          {/* Dish details cross-fade with the frame */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${item.id}-${lang}`}
              className="mt-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <h2 className="font-display text-[1.65rem] font-black leading-tight text-white">{t(item.name, lang)}</h2>
              <p className="text-sm font-semibold" style={{ color: `${COSMIC.light}cc` }}>
                <bdi lang={other(lang)}>{t(item.name, other(lang))}</bdi>
              </p>
              {(item.description.ar || item.description.en) && (
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED }}>
                  {t(item.description, lang)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="font-ui rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: COSMIC.light, border: `1px solid ${COSMIC.light}66`, background: `${COSMIC.light}14` }}>
                  {formatCalories(item.calories, lang)}
                </span>
                {item.allergens.map((a) => (
                  <AllergenBadge key={a} allergen={a} lang={lang} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* progress + quick-jump index */}
          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <div className="flex flex-1 flex-wrap gap-1" aria-hidden>
              {items.map((it, i) => (
                <span
                  key={it.id}
                  className="h-1 w-4 origin-center rounded-full transition-[transform,opacity] duration-300"
                  style={{ background: COSMIC.teal, opacity: i === dishIndex ? 1 : 0.22, transform: `scaleX(${i === dishIndex ? 1 : 0.5})` }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-bold text-white"
              style={{ ...neonGlass, background: "rgba(5,7,11,0.7)" }}
            >
              <LayoutList className="h-4 w-4" style={{ color: COSMIC.light }} />
              {lang === "ar" ? "فهرس الأطباق" : "Dish index"}
            </button>
          </div>
        </>
      )}

      <DishIndexDrawer
        open={drawer}
        items={items}
        current={dishIndex}
        title={t(category.name, lang)}
        onClose={() => setDrawer(false)}
        onPick={(i) => {
          setDir(i >= dishIndex ? 1 : -1);
          onDish(i);
          setDrawer(false);
        }}
      />
    </motion.main>
  );
}

function DishIndexDrawer({
  open,
  items,
  current,
  title,
  onClose,
  onPick,
}: {
  open: boolean;
  items: MenuItem[];
  current: number;
  title: string;
  onClose: () => void;
  onPick: (i: number) => void;
}) {
  const { lang } = useApp();
  useSheet(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[78dvh] w-full max-w-xl flex-col rounded-t-[28px] border border-b-0"
            style={{ background: "linear-gradient(180deg, #0A1A22, #05070B)", borderColor: `${COSMIC.teal}66`, boxShadow: `0 -10px 50px -20px ${COSMIC.teal}` }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div>
                <p className="font-ui text-[10px] font-bold tracking-[0.3em]" style={{ color: COSMIC.light }}>
                  {lang === "ar" ? "فهرس الأطباق" : "DISH INDEX"}
                </p>
                <p className="font-display text-lg font-bold text-white">{title}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={tr("close", lang)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(env(safe-area-inset-bottom),16px)]">
              {items.map((it, i) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onPick(i)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start transition-colors hover:bg-white/5"
                    style={i === current ? { background: `${COSMIC.teal}1f`, boxShadow: `inset 0 0 0 1px ${COSMIC.teal}66` } : undefined}
                  >
                    <span className="font-ui w-6 text-center text-[11px] font-bold tabular-nums" style={{ color: COSMIC.light }}>
                      {indexLabel(i)}
                    </span>
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#06121A]">
                      {it.image ? <Image src={it.image} alt="" fill sizes="44px" className="object-cover" /> : <DishPlaceholder label={t(it.name, lang)} small />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-bold ${it.isAvailable ? "text-white" : "text-white/50 line-through"}`}>{t(it.name, lang)}</span>
                      <span className="block truncate text-[11px]" style={{ color: MUTED }}>
                        {formatCalories(it.calories, lang)}
                        {it.allergens.length > 0 && ` · ${it.allergens.map((a) => t(allergenLabels[a], lang)).join(lang === "ar" ? "، " : ", ")}`}
                      </span>
                    </span>
                    <span className="font-ui shrink-0 text-sm font-extrabold tabular-nums" style={{ color: COSMIC.light }}>
                      {formatPrice(it.price, lang)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Designed stand-in for dishes without a verified photo: an orbiting monogram, not a broken or wrong image. */
export function DishPlaceholder({ label, large, small }: { label: string; large?: boolean; small?: boolean }) {
  const glyph = label.replace(/^ال/, "").trim().charAt(0) || "✦";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(circle at 50% 42%, ${COSMIC.teal}38, transparent 58%), linear-gradient(160deg, #0B2630, #05070B)` }}
    >
      {!small && (
        <>
          <span className="orbit-spin absolute aspect-square w-[64%] rounded-full border border-dashed" style={{ borderColor: `${COSMIC.light}55` }}>
            <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: COSMIC.light, boxShadow: `0 0 10px ${COSMIC.light}` }} />
          </span>
          <span className="absolute aspect-square w-[44%] rounded-full border" style={{ borderColor: `${COSMIC.teal}44` }} />
        </>
      )}
      <span
        className={`font-display relative font-black ${large ? "text-8xl" : small ? "text-lg" : "text-5xl"}`}
        style={{ color: "#E8FBFA", textShadow: `0 0 24px ${COSMIC.teal}, 0 0 4px ${COSMIC.light}` }}
      >
        {glyph}
      </span>
    </div>
  );
}
