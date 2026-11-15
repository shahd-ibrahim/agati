"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useApp } from "./AppProvider";
import { Starfield } from "./cosmic/Starfield";
import { CategoryPortal, CategoryStage, HoloIntro, SetMenuModal } from "./CosmicMenu";
import { DishLightbox } from "./DishLightbox";
import { FullIndexOverlay, TopSearchBar } from "./SearchAndIndex";
import type { MenuData } from "@/lib/types";

const POLL_MS = 20_000;
const VIEW_KEY = "menu_view";
const INTRO_KEY = "menu_intro_done";
type HistoryState = { aghattiCat?: string } | null;

/**
 * Cosmic Gastronomy flow:
 *   holographic logo (1.1s, once per visit) → category hub (+ Set Menu) ⇄ warp ⇄ anti-gravity dish stage ⇄ full-size modal.
 * Entering a category pushes a history entry, so the phone's back gesture returns to the hub.
 */
export function MenuExperience({ initialMenu, tableId }: { initialMenu: MenuData; tableId?: string }) {
  const { lang, setTable } = useApp();
  const [menu, setMenu] = useState(initialMenu);
  const categories = useMemo(() => [...menu.categories].sort((a, b) => a.order - b.order), [menu.categories]);
  const [view, setView] = useState<string | null>(null);
  const [dishIndex, setDishIndex] = useState(0);
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [warpKey, setWarpKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [setMenuOpen, setSetMenuOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);

  useEffect(() => {
    if (tableId) setTable(tableId);
  }, [tableId, setTable]);

  // Intro once per visit; restore the open category after reload; follow the back button.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(INTRO_KEY)) setIntro(true);
      const saved = sessionStorage.getItem(VIEW_KEY);
      if (saved && categories.some((c) => c.id === saved)) {
        setView(saved);
        history.replaceState({ aghattiCat: saved } satisfies HistoryState, "");
      }
    } catch {
      /* storage blocked */
    }
    const onPop = (e: PopStateEvent) => {
      setExpanded(false);
      setWarpKey((k) => k + 1);
      setDishIndex(0);
      setView((e.state as HistoryState)?.aghattiCat ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endIntro = useCallback(() => {
    setIntro(false);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    try {
      if (view) sessionStorage.setItem(VIEW_KEY, view);
      else sessionStorage.removeItem(VIEW_KEY);
    } catch {
      /* storage blocked */
    }
  }, [view]);

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

  useEffect(() => {
    if (view && !categories.some((c) => c.id === view)) setView(null);
  }, [categories, view]);

  const openCategory = useCallback((id: string) => {
    setLaunchId(id);
    setDishIndex(0);
    setWarpKey((k) => k + 1);
    setView(id);
    history.pushState({ aghattiCat: id } satisfies HistoryState, "");
  }, []);

  /** From search or the Full Index: go to the dish's category, select that dish and open its photo. */
  const enterCategory = useCallback(
    (categoryId: string) => {
      if (view === categoryId) return;
      setLaunchId(null);
      setWarpKey((k) => k + 1);
      setView(categoryId);
      const state = { aghattiCat: categoryId } satisfies HistoryState;
      if ((history.state as HistoryState)?.aghattiCat) history.replaceState(state, "");
      else history.pushState(state, "");
    },
    [view],
  );

  const jumpToDish = useCallback(
    (categoryId: string, itemIndex: number) => {
      setIndexOpen(false);
      setSetMenuOpen(false);
      setDishIndex(itemIndex);
      enterCategory(categoryId);
      setExpanded(true);
    },
    [enterCategory],
  );

  const pickCategory = useCallback(
    (categoryId: string) => {
      setExpanded(false);
      setDishIndex(0);
      enterCategory(categoryId);
    },
    [enterCategory],
  );

  const closeIndex = useCallback(() => setIndexOpen(false), []);

  const goHub = useCallback(() => {
    setExpanded(false);
    if ((history.state as HistoryState)?.aghattiCat) history.back();
    else {
      setWarpKey((k) => k + 1);
      setView(null);
    }
  }, []);

  const activeIndex = view ? categories.findIndex((c) => c.id === view) : -1;
  const active = activeIndex >= 0 ? categories[activeIndex] : null;
  const safeDish = active ? Math.min(dishIndex, Math.max(0, active.items.length - 1)) : 0;
  const closeExpanded = useCallback(() => setExpanded(false), []);
  const closeSetMenu = useCallback(() => setSetMenuOpen(false), []);

  return (
    <div className="dark relative min-h-[100dvh] overflow-x-hidden text-white">
      <Starfield warpKey={warpKey} />

      <AnimatePresence>{intro && <HoloIntro key="intro" onDone={endIntro} />}</AnimatePresence>

      {!intro && <TopSearchBar categories={categories} onPickDish={jumpToDish} onPickCategory={pickCategory} onOpenIndex={() => setIndexOpen(true)} />}

      {!intro && (
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0 })}>
          {active ? (
            <CategoryStage
              key={`stage-${active.id}-${lang}`}
              category={active}
              index={activeIndex}
              total={categories.length}
              dishIndex={safeDish}
              onDish={setDishIndex}
              onBack={goHub}
              onExpand={() => setExpanded(true)}
            />
          ) : (
            <CategoryPortal
              key={`hub-${lang}`}
              categories={categories}
              setMenu={menu.setMenu}
              launchId={launchId}
              onOpen={openCategory}
              onOpenSetMenu={() => setSetMenuOpen(true)}
              onOpenIndex={() => setIndexOpen(true)}
            />
          )}
        </AnimatePresence>
      )}

      <FullIndexOverlay
        open={indexOpen}
        categories={categories}
        setMenu={menu.setMenu}
        onClose={closeIndex}
        onPickDish={jumpToDish}
        onOpenSetMenu={() => {
          setIndexOpen(false);
          setSetMenuOpen(true);
        }}
      />
      <SetMenuModal setMenu={menu.setMenu} open={setMenuOpen} onClose={closeSetMenu} />
      <DishLightbox items={active?.items ?? []} index={active && expanded && active.items.length ? safeDish : null} onIndex={setDishIndex} onClose={closeExpanded} />
    </div>
  );
}
