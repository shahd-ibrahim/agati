"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, Search, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { COSMIC } from "./cosmic/Starfield";
import { useSheet } from "./useSheet";
import { allergenLabels, formatCalories, formatNumber, formatPrice, t, tr } from "@/lib/i18n";
import type { Category, Lang, MenuItem, SetMenu } from "@/lib/types";

const MUTED = "#9FB3BD";
const HAIR = "rgba(255,255,255,0.09)";
const other = (l: Lang): Lang => (l === "ar" ? "en" : "ar");

/* ───────────── Arabic-aware text normalisation ─────────────
   Strips tashkeel/tatweel and unifies letter variants, so "كبه" finds "كبة", "اسبريسو" finds
   "إسبريسو", and "مشاوى" finds "مشاوي". Latin text is lower-cased with accents removed. */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // latin accents
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DishHit = { category: Category; categoryIndex: number; item: MenuItem; itemIndex: number; score: number };

/** Every query word must appear somewhere; name matches rank above description/category matches. */
export function searchMenu(categories: Category[], query: string, limit = 40): { dishes: DishHit[]; categories: Category[] } {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return { dishes: [], categories: [] };
  const dishes: DishHit[] = [];
  const cats: Category[] = [];
  categories.forEach((category, categoryIndex) => {
    const catText = normalize(`${category.name.ar} ${category.name.en}`);
    if (words.every((w) => catText.includes(w))) cats.push(category);
    category.items.forEach((item, itemIndex) => {
      const name = normalize(`${item.name.ar} ${item.name.en}`);
      const desc = normalize(`${item.description.ar} ${item.description.en}`);
      const all = `${name} ${desc} ${catText}`;
      if (!words.every((w) => all.includes(w))) return;
      let score = 0;
      for (const w of words) {
        if (name.split(" ").some((tok) => tok.startsWith(w))) score += 6;
        else if (name.includes(w)) score += 4;
        else if (desc.includes(w)) score += 2;
        else score += 1; // category-name match
      }
      dishes.push({ category, categoryIndex, item, itemIndex, score });
    });
  });
  dishes.sort((a, b) => b.score - a.score || a.categoryIndex - b.categoryIndex || a.itemIndex - b.itemIndex);
  return { dishes: dishes.slice(0, limit), categories: cats };
}

const glassBar = {
  background: "rgba(5,7,11,0.78)",
  borderColor: `${COSMIC.teal}55`,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
} as const;

/* ═════════════════════════ Persistent top bar: live search + Full Index ═════════════════════════ */

export function TopSearchBar({
  categories,
  onPickDish,
  onPickCategory,
  onOpenIndex,
}: {
  categories: Category[];
  onPickDish: (categoryId: string, itemIndex: number) => void;
  onPickCategory: (categoryId: string) => void;
  onOpenIndex: () => void;
}) {
  const { lang } = useApp();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchMenu(categories, q), [categories, q]);
  const open = q.trim().length > 0 && focused;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQ("");
        input.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const done = () => {
    setQ("");
    setFocused(false);
    input.current?.blur();
  };

  return (
    <div className="sticky top-0 z-40 px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)]" style={{ background: "linear-gradient(to bottom, rgba(5,7,11,0.92) 60%, transparent)" }}>
      <div className="relative mx-auto flex max-w-6xl items-center gap-2">
        <label className="relative flex h-11 flex-1 items-center rounded-full border" style={{ ...glassBar, boxShadow: focused ? `0 0 24px -6px ${COSMIC.teal}` : undefined }}>
          <Search className="pointer-events-none absolute start-3.5 h-4 w-4" style={{ color: COSMIC.light }} />
          <input
            ref={input}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            // delay so a tap on a result registers before the list closes
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={lang === "ar" ? "ابحث عن طبق أو قسم..." : "Search dishes or categories..."}
            aria-label={lang === "ar" ? "بحث" : "Search"}
            className="h-full w-full rounded-full bg-transparent pe-9 ps-10 text-[16px] text-white placeholder:text-[#7f97a3] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label={tr("close", lang)} className="absolute end-2 flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={onOpenIndex}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-extrabold text-white transition-transform active:scale-95"
          style={{ ...glassBar, borderColor: COSMIC.teal, boxShadow: `0 0 18px -6px ${COSMIC.teal}` }}
        >
          <BookOpenText className="h-4 w-4" style={{ color: COSMIC.light }} />
          <span className="hidden min-[360px]:inline">{lang === "ar" ? "القائمة الشاملة" : "Full Index"}</span>
        </button>

        {/* Live results */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[64dvh] overflow-y-auto overscroll-contain rounded-[22px] border"
              style={{ background: "rgba(7,14,20,0.97)", borderColor: `${COSMIC.teal}55`, boxShadow: `0 24px 60px -20px #000, 0 0 30px -14px ${COSMIC.teal}` }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              role="listbox"
              aria-label={lang === "ar" ? "نتائج البحث" : "Search results"}
              onPointerDown={(e) => e.preventDefault() /* keep input focus while tapping */}
            >
              {results.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b p-3" style={{ borderColor: HAIR }}>
                  {results.categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onPickCategory(c.id);
                        done();
                      }}
                      className="rounded-full px-3 py-1 text-[12px] font-bold"
                      style={{ background: `${COSMIC.teal}22`, color: COSMIC.light, boxShadow: `inset 0 0 0 1px ${COSMIC.teal}66` }}
                    >
                      ✦ {t(c.name, lang)} · {formatNumber(c.items.length, lang)}
                    </button>
                  ))}
                </div>
              )}
              {results.dishes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm" style={{ color: MUTED }}>
                  {lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching dishes"}
                </p>
              ) : (
                <ul>
                  {results.dishes.map((h) => (
                    <li key={h.item.id} className="border-b last:border-b-0" style={{ borderColor: HAIR }}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          onPickDish(h.category.id, h.itemIndex);
                          done();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] font-bold ${h.item.isAvailable ? "text-white" : "text-white/50 line-through"}`}>{t(h.item.name, lang)}</span>
                          <span className="block truncate text-[11.5px]" style={{ color: `${COSMIC.light}b3` }}>
                            <bdi lang={other(lang)}>{t(h.item.name, other(lang))}</bdi>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                            <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: `${COSMIC.teal}1f`, color: COSMIC.light }}>
                              {t(h.category.name, lang)}
                            </span>
                            <span className="font-ui" style={{ color: MUTED }}>
                              {formatCalories(h.item.calories, lang)}
                            </span>
                          </span>
                        </span>
                        <span className="font-ui shrink-0 text-[15px] font-extrabold tabular-nums" style={{ color: COSMIC.light }}>
                          {formatPrice(h.item.price, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═════════════════════════ Text-only master index ═════════════════════════ */

export function FullIndexOverlay({
  open,
  categories,
  setMenu,
  onClose,
  onPickDish,
  onOpenSetMenu,
}: {
  open: boolean;
  categories: Category[];
  setMenu?: SetMenu;
  onClose: () => void;
  onPickDish: (categoryId: string, itemIndex: number) => void;
  onOpenSetMenu: () => void;
}) {
  const { lang } = useApp();
  useSheet(open, onClose);
  const total = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "#05070B" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? "القائمة الشاملة" : "Full Menu Index"}
        >
          {/* header */}
          <div className="border-b px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)]" style={{ borderColor: `${COSMIC.teal}44` }}>
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <div>
                <p className="font-ui text-[10px] font-bold tracking-[0.3em]" style={{ color: COSMIC.light }}>
                  {lang === "ar" ? "FULL MENU INDEX" : "القائمة الشاملة"}
                </p>
                <h2 className="font-display text-2xl font-black text-white">{lang === "ar" ? "القائمة الشاملة" : "Full Menu Index"}</h2>
                <p className="font-ui text-[11px]" style={{ color: MUTED }}>
                  {lang === "ar" ? `${formatNumber(categories.length, "ar")} أقسام · ${formatNumber(total, "ar")} صنفاً · اضغط على أي طبق لعرض صورته` : `${categories.length} categories · ${total} items · tap any dish to see its photo`}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label={tr("close", lang)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* section jump chips */}
            <nav className="no-scrollbar mx-auto mt-3 flex max-w-3xl gap-1.5 overflow-x-auto" aria-label={lang === "ar" ? "الأقسام" : "Sections"}>
              {setMenu && (
                <a href="#idx-set-menu" className="shrink-0 rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: `${COSMIC.teal}2a`, color: "#fff", boxShadow: `inset 0 0 0 1px ${COSMIC.teal}` }}>
                  ✦ {t(setMenu.title, lang)}
                </a>
              )}
              {categories.map((c) => (
                <a key={c.id} href={`#idx-${c.id}`} className="shrink-0 rounded-full px-3 py-1 text-[12px] font-bold" style={{ color: COSMIC.light, boxShadow: `inset 0 0 0 1px ${COSMIC.teal}55` }}>
                  {t(c.name, lang)}
                </a>
              ))}
            </nav>
          </div>

          {/* body: text only, no thumbnails */}
          <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 pb-[max(env(safe-area-inset-bottom),28px)]">
            <div className="mx-auto max-w-3xl">
              {setMenu && (
                <section id="idx-set-menu" className="scroll-mt-2 pt-6">
                  <button
                    type="button"
                    onClick={onOpenSetMenu}
                    className="flex w-full items-baseline justify-between gap-3 border-b pb-2 text-start"
                    style={{ borderColor: COSMIC.teal }}
                  >
                    <h3 className="font-display text-lg font-black" style={{ color: COSMIC.teal }}>
                      ✦ {t(setMenu.title, lang)} <span className="text-xs font-semibold" style={{ color: MUTED }}>· <bdi lang={other(lang)}>{t(setMenu.title, other(lang))}</bdi></span>
                    </h3>
                    <span className="font-ui shrink-0 text-base font-black tabular-nums text-white">{formatPrice(setMenu.price, lang)}</span>
                  </button>
                  <ul>
                    {setMenu.courses.map((c) => (
                      <li key={c.name.en} className="flex gap-3 border-b py-2.5 text-[13.5px]" style={{ borderColor: HAIR }}>
                        <span className="w-28 shrink-0 font-bold text-white">{t(c.name, lang)}</span>
                        <span style={{ color: MUTED }}>{c.options.map((o) => t(o, lang)).join(c.all ? (lang === "ar" ? "، " : ", ") : lang === "ar" ? " أو " : " or ")}</span>
                      </li>
                    ))}
                  </ul>
                  {setMenu.note && (
                    <p className="pt-2 text-[11px]" style={{ color: MUTED }}>
                      {t(setMenu.note, lang)}
                    </p>
                  )}
                </section>
              )}

              {categories.map((c, ci) => (
                <section key={c.id} id={`idx-${c.id}`} className="scroll-mt-2 pt-8">
                  <div className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: COSMIC.teal }}>
                    <h3 className="font-display text-lg font-black" style={{ color: COSMIC.teal }}>
                      <span className="font-ui me-2 text-[11px] tabular-nums" style={{ color: COSMIC.light }}>
                        {String(ci + 1).padStart(2, "0")}
                      </span>
                      {t(c.name, lang)} <span className="text-xs font-semibold" style={{ color: MUTED }}>· <bdi lang={other(lang)}>{t(c.name, other(lang))}</bdi></span>
                    </h3>
                    <span className="font-ui shrink-0 text-[11px]" style={{ color: MUTED }}>
                      {formatNumber(c.items.length, lang)}
                    </span>
                  </div>
                  <ul>
                    {c.items.map((it, ii) => (
                      <li key={it.id} className="border-b" style={{ borderColor: HAIR }}>
                        <button
                          type="button"
                          onClick={() => onPickDish(c.id, ii)}
                          className="flex w-full items-start gap-3 py-2.5 text-start transition-colors hover:bg-white/[0.03] active:bg-white/[0.06]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className={`text-[15px] font-bold ${it.isAvailable ? "text-white" : "text-white/45 line-through"}`}>{t(it.name, lang)}</span>{" "}
                            <span className="text-[12px]" style={{ color: `${COSMIC.light}b3` }}>
                              · <bdi lang={other(lang)}>{t(it.name, other(lang))}</bdi>
                            </span>
                            <span className="font-ui mt-0.5 block text-[11px]" style={{ color: MUTED }}>
                              {formatCalories(it.calories, lang)}
                              {it.allergens.length > 0 && ` · ${it.allergens.map((a) => t(allergenLabels[a], lang)).join(lang === "ar" ? "، " : ", ")}`}
                              {!it.isAvailable && ` · ${tr("soldOut", lang)}`}
                            </span>
                          </span>
                          <span className="font-ui shrink-0 pt-0.5 text-[15px] font-black tabular-nums text-white">{formatPrice(it.price, lang)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <p className="pt-6 text-center text-[11px]" style={{ color: MUTED }}>
                {tr("pricesNote", lang)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
