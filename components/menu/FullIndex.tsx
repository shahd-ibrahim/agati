"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useApp } from "../AppProvider";
import { useSheet } from "../useSheet";
import { C, other } from "./parts";
import { allergenLabels, formatCalories, formatPrice, t, tr } from "@/lib/i18n";
import type { Category, SetMenu } from "@/lib/types";

/** Text-only master index (no thumbnails): Set Menu + every category and dish. Tapping a dish opens its photo. */
export function FullIndex({
  open,
  categories,
  setMenu,
  onClose,
  onPickDish,
  onPickSetMenu,
}: {
  open: boolean;
  categories: Category[];
  setMenu?: SetMenu;
  onClose: () => void;
  onPickDish: (categoryId: string, itemIndex: number) => void;
  onPickSetMenu: () => void;
}) {
  const { lang } = useApp();
  useSheet(open, onClose);
  const total = categories.reduce((s, c) => s + c.items.length, 0);
  const join = (all?: boolean) => (all ? (lang === "ar" ? "، " : ", ") : lang === "ar" ? " أو " : " or ");

  const SectionHead = ({ title, sub, right, onClick }: { title: string; sub: string; right: string; onClick?: () => void }) => {
    const inner = (
      <>
        <span className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full" style={{ background: C.accent }} />
          <span className="font-display text-lg font-bold" style={{ color: C.ink }}>
            {title}
          </span>
          <span className="text-xs" style={{ color: C.faint }}>
            <bdi lang={other(lang)}>{sub}</bdi>
          </span>
        </span>
        <span className="font-ui text-xs font-semibold" style={{ color: C.accentInk }}>
          {right}
        </span>
      </>
    );
    const cls = "flex w-full items-center justify-between gap-3 pb-2 text-start";
    return onClick ? (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    ) : (
      <div className={cls}>{inner}</div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: C.bg }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? "القائمة الشاملة" : "Full Index"}
        >
          <div className="border-b bg-white px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)]" style={{ borderColor: C.line }}>
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold" style={{ color: C.ink }}>
                  {lang === "ar" ? "القائمة الشاملة" : "Full Index"}
                </h2>
                <p className="text-xs" style={{ color: C.slate }}>
                  {lang === "ar" ? `${categories.length} أقسام · ${total} صنفاً · اضغط على أي طبق لعرض صورته` : `${categories.length} categories · ${total} items · tap a dish to see its photo`}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label={tr("close", lang)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.line, color: C.ink }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="no-scrollbar mx-auto mt-3 flex max-w-2xl gap-1.5 overflow-x-auto" aria-label={lang === "ar" ? "الأقسام" : "Sections"}>
              {setMenu && (
                <a href="#fi-set" className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: C.accent }}>
                  {t(setMenu.title, lang)}
                </a>
              )}
              {categories.map((c) => (
                <a key={c.id} href={`#fi-${c.id}`} className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: C.line, color: C.ink, background: C.card }}>
                  {t(c.name, lang)}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 pb-[max(env(safe-area-inset-bottom),28px)]">
            <div className="mx-auto max-w-2xl">
              {setMenu && (
                <section id="fi-set" className="scroll-mt-3 pt-6">
                  <SectionHead title={t(setMenu.title, lang)} sub={t(setMenu.title, other(lang))} right={formatPrice(setMenu.price, lang)} onClick={onPickSetMenu} />
                  <ul className="rounded-2xl border bg-white px-4" style={{ borderColor: C.line }}>
                    {setMenu.courses.map((c) => (
                      <li key={c.name.en} className="flex gap-3 border-b py-2.5 text-[13.5px] last:border-b-0" style={{ borderColor: C.line }}>
                        <span className="w-28 shrink-0 font-semibold" style={{ color: C.ink }}>
                          {t(c.name, lang)}
                        </span>
                        <span style={{ color: C.slate }}>{c.options.map((o) => t(o, lang)).join(join(c.all))}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {categories.map((c) => (
                <section key={c.id} id={`fi-${c.id}`} className="scroll-mt-3 pt-7">
                  <SectionHead title={t(c.name, lang)} sub={t(c.name, other(lang))} right={`${c.items.length}`} />
                  <ul className="rounded-2xl border bg-white" style={{ borderColor: C.line }}>
                    {c.items.map((it, ii) => (
                      <li key={it.id} className="border-b last:border-b-0" style={{ borderColor: C.line }}>
                        <button type="button" onClick={() => onPickDish(c.id, ii)} className="flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-[#FAF8F5]">
                          <span className="min-w-0 flex-1">
                            <span className={`text-[15px] font-bold ${it.isAvailable ? "" : "line-through opacity-50"}`} style={{ color: C.ink }}>
                              {t(it.name, lang)}
                            </span>{" "}
                            <span className="text-xs" style={{ color: C.faint }}>
                              · <bdi lang={other(lang)}>{t(it.name, other(lang))}</bdi>
                            </span>
                            <span className="font-ui mt-0.5 block text-[11px]" style={{ color: C.slate }}>
                              {formatCalories(it.calories, lang)}
                              {it.allergens.filter((a) => a !== "chef").length > 0 &&
                                ` · ${it.allergens.filter((a) => a !== "chef").map((a) => t(allergenLabels[a], lang)).join(lang === "ar" ? "، " : ", ")}`}
                              {!it.isAvailable && ` · ${lang === "ar" ? "نفدت الكمية" : "Sold out"}`}
                            </span>
                          </span>
                          <span className="font-ui shrink-0 pt-0.5 text-[14.5px] font-extrabold tabular-nums" style={{ color: C.accentInk }}>
                            {formatPrice(it.price, lang)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="pt-6 text-center text-[11px]" style={{ color: C.faint }}>
                {tr("pricesNote", lang)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
