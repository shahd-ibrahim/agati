"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { Lang, Theme } from "@/lib/types";

interface AppContextValue {
  lang: Lang;
  toggleLang: () => void;
  theme: Theme;
  toggleTheme: () => void;
  table: string | null;
  setTable: (t: string | null) => void;
  toast: (message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
};

const setCookie = (k: string, v: string) => {
  document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`;
};

const readSession = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeSession = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) */
  }
};

export function AppProvider({
  children,
  initialLang,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLang: Lang;
  initialTheme: Theme;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [table, setTableState] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  // Restore the table number captured from the QR link after hydration.
  useEffect(() => {
    setTableState(readSession<string | null>("table", null));
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "ar" ? "en" : "ar";
      setCookie("lang", next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      setCookie("ui-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const setTable = useCallback((t: string | null) => {
    setTableState(t);
    writeSession("table", t);
  }, []);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      toggleLang,
      theme,
      toggleTheme,
      table,
      setTable,
      toast,
    }),
    [lang, toggleLang, theme, toggleTheme, table, setTable, toast],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[80] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-glass px-4 py-2.5 text-sm font-medium text-ink shadow-luxe backdrop-blur-xl"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 text-accent" />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
}
