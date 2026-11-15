"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, Search, X } from "lucide-react";
import { useApp } from "./AppProvider";
import { C, DishCard, Thumb } from "./menu/parts";
import { DishModal } from "./menu/DishModal";
import { FullIndex } from "./menu/FullIndex";
import { restaurant } from "@/lib/config";
import { formatNumber, formatPrice, t, tr } from "@/lib/i18n";
import { searchMenu } from "@/lib/search";
import type { Category, Lang, MenuData, SetMenu } from "@/lib/types";

const POLL_MS = 20_000;
const LANG_CHOSEN_KEY = "menu_lang_chosen";
const SECTION_KEY = "menu_section";
const SET_MENU = "set-menu";
const EASE = [0.22, 1, 0.36, 1] as const;

const itemsLabel = (n: number, lang: Lang) => (lang === "ar" ? (n === 1 ? "صنف واحد" : n === 2 ? "صنفان" : n <= 10 ? `${n} أصناف` : `${n} صنفاً`) : `${n} ${n === 1 ? "item" : "items"}`);

/**
 * Warm light-mode menu. Flow: welcome language gate → menu (category strip, search, horizontal
 * dish cards) → dish photo sheet. The Full Index (text only) opens from the top bar.
 */
export function MenuExperience({ initialMenu, tableId }: { initialMenu: MenuData; tableId?: string }) {
  const { lang, toggleLang, setTable } = useApp();
  const [menu, setMenu] = useState(initialMenu);
  const categories = useMemo(() => [...menu.categories].sort((a, b) => a.order - b.order), [menu.categories]);
  const [gate, setGate] = useState<"checking" | "show" | "done">("checking");
  // The gate fades itself out and unmounts on a timer, rather than relying on an exit animation.
  const [gateMounted, setGateMounted] = useState(true);
  const [section, setSection] = useState<string>(categories[0]?.id ?? SET_MENU);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ categoryId: string; index: number } | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableId) setTable(tableId);
  }, [tableId, setTable]);

  // Language gate once per visit; remember the open section across reloads.
  useEffect(() => {
    try {
      setGate(sessionStorage.getItem(LANG_CHOSEN_KEY) ? "done" : "show");
      const saved = sessionStorage.getItem(SECTION_KEY);
      if (saved && (saved === SET_MENU || categories.some((c) => c.id === saved))) setSection(saved);
    } catch {
      setGate("show");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gate !== "done") return;
    const id = setTimeout(() => setGateMounted(false), 450);
    return () => clearTimeout(id);
  }, [gate]);

  // Saved on the user's taps (not in an effect, which could overwrite the stored value on mount).
  const remember = (id: string) => {
    try {
      sessionStorage.setItem(SECTION_KEY, id);
    } catch {
      /* storage blocked */
    }
  };

  // Live availability / price changes from /admin.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (res.ok && alive) {
          const next = (await res.json()) as MenuData;
          setMenu((prev) => (prev.updatedAt === next.updatedAt ? prev : next));
        }
      } catch {
        /* offline: keep current menu */
      }
    };
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const chooseLang = (l: Lang) => {
    if (l !== lang) toggleLang();
    try {
      sessionStorage.setItem(LANG_CHOSEN_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setGate("done");
  };

  const selectSection = useCallback((id: string) => {
    setSection(id);
    remember(id);
    setQuery("");
    // keep the strip + search visible, bring the list to the top
    const top = listTop.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollBy({ top: top - 8, behavior: "smooth" });
  }, []);

  /** From search or the Full Index: switch to the dish's category and open its photo. */
  const openDish = useCallback((categoryId: string, index: number) => {
    setIndexOpen(false);
    setQuery("");
    setSection(categoryId);
    remember(categoryId);
    setModal({ categoryId, index });
  }, []);

  const active = categories.find((c) => c.id === section) ?? null;
  const hits = useMemo(() => searchMenu(categories, query), [categories, query]);
  const modalCat = modal ? categories.find((c) => c.id === modal.categoryId) : undefined;
  const closeModal = useCallback(() => setModal(null), []);
  const closeIndex = useCallback(() => setIndexOpen(false), []);

  return (
    <div className="min-h-[100dvh]" style={{ background: C.bg, color: C.ink }}>
      {gateMounted && <WelcomeGate ready={gate === "show"} leaving={gate === "done"} onChoose={chooseLang} />}

      {gate === "done" && (
        <>
          <TopBar onOpenIndex={() => setIndexOpen(true)} />

          <main className="mx-auto max-w-2xl pb-16">
            <CategoryStrip categories={categories} setMenu={menu.setMenu} active={query ? "" : section} onSelect={selectSection} />

            {/* full-width search */}
            <div className="px-4 pt-1">
              <label className="relative flex h-12 items-center rounded-full border bg-white" style={{ borderColor: C.line, boxShadow: C.shadow }}>
                <Search className="pointer-events-none absolute start-4 h-[18px] w-[18px]" style={{ color: C.faint }} />
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === "ar" ? "بحث في القائمة..." : "Search menu..."}
                  aria-label={lang === "ar" ? "بحث في القائمة" : "Search menu"}
                  className="h-full w-full rounded-full bg-transparent pe-10 ps-11 text-[16px] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                  style={{ color: C.ink }}
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label={tr("close", lang)} className="absolute end-3 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: C.well, color: C.slate }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>

            <div ref={listTop} className="scroll-mt-40 px-4 pt-5">
              <AnimatePresence mode="wait" initial={false}>
                {query.trim() ? (
                  <Section key={`q-${query}`} title={lang === "ar" ? "نتائج البحث" : "Search results"} count={hits.length} lang={lang}>
                    {hits.length === 0 ? (
                      <p className="rounded-2xl border bg-white px-4 py-8 text-center text-sm" style={{ borderColor: C.line, color: C.slate }}>
                        {lang === "ar" ? "لا توجد أطباق مطابقة" : "No matching dishes"}
                      </p>
                    ) : (
                      hits.map((h, i) => (
                        <Row key={h.item.id} i={i}>
                          <DishCard item={h.item} lang={lang} categoryLabel={t(h.category.name, lang)} onOpen={() => openDish(h.category.id, h.itemIndex)} />
                        </Row>
                      ))
                    )}
                  </Section>
                ) : section === SET_MENU && menu.setMenu ? (
                  <SetMenuView key={`set-${lang}`} setMenu={menu.setMenu} lang={lang} />
                ) : active ? (
                  <Section key={`${active.id}-${lang}`} title={t(active.name, lang)} count={active.items.length} lang={lang}>
                    {active.items.map((item, i) => (
                      <Row key={item.id} i={i}>
                        <DishCard item={item} lang={lang} priority={i < 3} onOpen={() => setModal({ categoryId: active.id, index: i })} />
                      </Row>
                    ))}
                  </Section>
                ) : null}
              </AnimatePresence>
            </div>

            <footer className="mt-10 px-6 text-center text-[11px] leading-relaxed" style={{ color: C.faint }}>
              <p>{tr("pricesNote", lang)}</p>
              <p>{tr("sfda", lang)}</p>
            </footer>
          </main>

          <DishModal
            items={modalCat?.items ?? []}
            index={modalCat && modal ? modal.index : null}
            categoryName={modalCat ? t(modalCat.name, lang) : ""}
            onIndex={(index) => setModal((m) => (m ? { ...m, index } : m))}
            onClose={closeModal}
          />
          <FullIndex
            open={indexOpen}
            categories={categories}
            setMenu={menu.setMenu}
            onClose={closeIndex}
            onPickDish={openDish}
            onPickSetMenu={() => {
              setIndexOpen(false);
              selectSection(SET_MENU);
            }}
          />
        </>
      )}
    </div>
  );
}

/* ───────────── Welcome language gate ───────────── */

function WelcomeGate({ ready, leaving, onChoose }: { ready: boolean; leaving: boolean; onChoose: (l: Lang) => void }) {
  const logo = restaurant.logos.stacked;
  return (
    <motion.div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 ${leaving ? "pointer-events-none" : ""}`}
      style={{ background: C.bg }}
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      aria-hidden={leaving}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="flex flex-col items-center">
        <Image src={logo.src} width={logo.w} height={logo.h} alt={`${restaurant.name.ar} · ${restaurant.name.en}`} priority sizes="110px" className="h-44 w-auto" />
        <p className="mt-6 text-center text-[15px]" style={{ color: C.slate }}>
          أهلاً وسهلاً بكم في أغاتي
        </p>
        <p className="font-ui text-center text-[13px]" style={{ color: C.faint }}>
          Welcome to Aghatti · Iraqi cuisine
        </p>
      </motion.div>
      <motion.div
        className="mt-10 flex w-full max-w-xs flex-col gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
      >
        <button
          type="button"
          onClick={() => onChoose("ar")}
          className="h-14 rounded-2xl text-lg font-bold text-white transition-transform active:scale-[0.98]"
          style={{ background: C.accent, boxShadow: "0 6px 20px rgba(23,162,184,0.25)", fontFamily: "var(--font-cairo)" }}
        >
          العربية
        </button>
        <button
          type="button"
          onClick={() => onChoose("en")}
          className="font-ui h-14 rounded-2xl border bg-white text-lg font-bold transition-transform active:scale-[0.98]"
          style={{ borderColor: C.line, color: C.ink, boxShadow: C.shadow }}
        >
          English
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ───────────── Top bar ───────────── */

function TopBar({ onOpenIndex }: { onOpenIndex: () => void }) {
  const { lang, toggleLang, table } = useApp();
  const logo = restaurant.logos.horizontal;
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "rgba(250,248,245,0.92)", borderColor: C.line }}>
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex min-w-0 items-center gap-2">
          <Image src={logo.src} width={logo.w} height={logo.h} alt={`${restaurant.name.ar} · ${restaurant.name.en}`} priority sizes="72px" className="h-9 w-auto shrink-0" />
          <div className="hidden min-w-0 leading-tight min-[420px]:block">
            <p className="font-display truncate text-sm font-bold" style={{ color: C.ink }}>
              {lang === "ar" ? "قائمة الطعام" : "Menu"}
            </p>
            <p className="truncate text-[11px]" style={{ color: C.faint }}>
              {table ? (lang === "ar" ? `طاولة ${table}` : `Table ${table}`) : t(restaurant.tagline, lang)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex h-9 items-center rounded-full border bg-white p-0.5 text-[12px] font-semibold" style={{ borderColor: C.line }} role="group" aria-label="Language">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => l !== lang && toggleLang()}
                aria-pressed={l === lang}
                className={`h-full rounded-full px-2.5 transition-colors ${l === "en" ? "font-ui" : ""}`}
                style={l === lang ? { background: C.accent, color: "#fff" } : { color: C.slate }}
              >
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenIndex}
            className="flex h-9 items-center gap-1.5 rounded-full border bg-white px-3 text-[12px] font-semibold"
            style={{ borderColor: C.line, color: C.ink }}
          >
            <BookOpenText className="h-4 w-4" style={{ color: C.accentInk }} />
            <span className="hidden min-[380px]:inline">{lang === "ar" ? "القائمة الشاملة" : "Full Index"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ───────────── Visual category strip ───────────── */

function CategoryStrip({ categories, setMenu, active, onSelect }: { categories: Category[]; setMenu?: SetMenu; active: string; onSelect: (id: string) => void }) {
  const { lang } = useApp();
  const strip = useRef<HTMLDivElement>(null);
  const tiles = useRef<Record<string, HTMLButtonElement | null>>({});

  // keep the active tile in view (RTL and LTR)
  useEffect(() => {
    const el = strip.current;
    const tile = active ? tiles.current[active] : null;
    if (!el || !tile) return;
    const a = el.getBoundingClientRect();
    const b = tile.getBoundingClientRect();
    if (b.left < a.left + 12 || b.right > a.right - 12) el.scrollBy({ left: b.left + b.width / 2 - (a.left + a.width / 2), behavior: "smooth" });
  }, [active, lang]);

  const tile = (id: string, label: string, sub: string, thumb: React.ReactNode) => {
    const on = id === active;
    return (
      <button
        key={id}
        ref={(el) => {
          tiles.current[id] = el;
        }}
        type="button"
        onClick={() => onSelect(id)}
        aria-current={on ? "true" : undefined}
        className="relative flex w-[78px] shrink-0 flex-col items-center gap-1.5"
      >
        <span className="rounded-[18px] p-[3px] transition-colors" style={{ boxShadow: on ? `0 0 0 2px ${C.accent}` : "none" }}>
          {thumb}
        </span>
        <span
          className="line-clamp-2 min-h-[2.4em] rounded-full px-1.5 text-center text-[11.5px] leading-[1.2] transition-colors"
          style={on ? { color: C.accentInk, fontWeight: 700 } : { color: C.ink, fontWeight: 500 }}
        >
          {label}
        </span>
        <span className="sr-only">{sub}</span>
      </button>
    );
  };

  return (
    <nav ref={strip} className="no-scrollbar relative flex gap-1.5 overflow-x-auto px-3 pb-3 pt-4" aria-label={lang === "ar" ? "الأقسام" : "Categories"}>
      {setMenu &&
        tile(
          SET_MENU,
          lang === "ar" ? "قائمة الغداء" : "Set Menu",
          formatPrice(setMenu.price, lang),
          <span className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(145deg, ${C.accent}, #0E7C8A)` }}>
            <span className="font-ui text-lg font-extrabold leading-none">{setMenu.price}</span>
            <span className="text-[10px] font-semibold opacity-90">{lang === "ar" ? "ر.س" : "SAR"}</span>
          </span>,
        )}
      {categories.map((c) =>
        tile(c.id, t(c.name, lang), itemsLabel(c.items.length, lang), <Thumb src={c.coverImage} label={t(c.name, lang)} sizes="64px" rounded="rounded-2xl" className="h-16 w-16" />),
      )}
    </nav>
  );
}

/* ───────────── Lists ───────────── */

function Section({ title, count, lang, children }: { title: string; count: number; lang: Lang; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease: EASE }}>
      <h2 className="mb-3 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full" style={{ background: C.accent }} />
        <span className="font-display text-lg font-bold" style={{ color: C.ink }}>
          {title}
        </span>
        <span className="text-sm" style={{ color: C.faint }}>
          • {itemsLabel(count, lang)}
        </span>
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </motion.section>
  );
}

function Row({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function SetMenuView({ setMenu, lang }: { setMenu: SetMenu; lang: Lang }) {
  const join = (all?: boolean) => (all ? (lang === "ar" ? "، " : ", ") : lang === "ar" ? " أو " : " or ");
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease: EASE }}>
      <div className="rounded-2xl border bg-white p-5" style={{ borderColor: C.line, boxShadow: C.shadow }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold" style={{ color: C.ink }}>
              {t(setMenu.title, lang)}
            </h2>
            {setMenu.note && (
              <p className="text-xs" style={{ color: C.slate }}>
                {t(setMenu.note, lang)}
              </p>
            )}
          </div>
          <span className="font-ui shrink-0 rounded-full px-3 py-1 text-lg font-extrabold" style={{ background: C.accentSoft, color: C.accentInk }}>
            {formatPrice(setMenu.price, lang)}
          </span>
        </div>
        <ol className="mt-4">
          {setMenu.courses.map((c, i) => (
            <li key={c.name.en} className="flex gap-3 border-t py-3" style={{ borderColor: C.line }}>
              <span className="font-ui flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: C.accentSoft, color: C.accentInk }}>
                {formatNumber(i + 1, lang)}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold" style={{ color: C.ink }}>
                  {t(c.name, lang)}
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: C.slate }}>
                  {c.options.map((o) => t(o, lang)).join(join(c.all))}
                </p>
                <p className="text-[11px]" style={{ color: C.faint }}>
                  {c.all ? (lang === "ar" ? "تشكيلة كاملة" : "All included") : lang === "ar" ? "اختر واحداً" : "Choose one"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}
