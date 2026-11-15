"use client";

import Image from "next/image";
import { Flame } from "lucide-react";
import { allergenLabels, formatCalories, formatPrice, t } from "@/lib/i18n";
import type { Allergen, Lang, MenuItem } from "@/lib/types";

/** Warm light hospitality palette (fixed values, so the menu never follows a dark admin theme). */
export const C = {
  bg: "#FAF8F5",
  card: "#FFFFFF",
  well: "#F3EFE9",
  line: "#ECE8E1",
  ink: "#1A1D20",
  slate: "#646B73",
  faint: "#9AA0A6",
  accent: "#17A2B8",
  accentInk: "#0E7C8A",
  accentSoft: "#E7F6F8",
  shadow: "0 4px 20px rgba(0,0,0,0.04)",
};

export const other = (l: Lang): Lang => (l === "ar" ? "en" : "ar");

/** Rounded photo, or a quiet monogram tile when a dish has no photo yet. */
export function Thumb({ src, label, sizes, priority, className = "", rounded = "rounded-xl", dim }: { src: string; label: string; sizes: string; priority?: boolean; className?: string; rounded?: string; dim?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ background: C.well }}>
      {src ? (
        <Image src={src} alt={label} fill sizes={sizes} priority={priority} className={`object-cover ${dim ? "grayscale" : ""}`} />
      ) : (
        <Monogram label={label} />
      )}
    </div>
  );
}

export function Monogram({ label, big }: { label: string; big?: boolean }) {
  const glyph = label.replace(/^ال/, "").trim().charAt(0) || "•";
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${C.well}, #FBF9F6)` }}>
      <span className="absolute aspect-square w-[62%] rounded-full border" style={{ borderColor: `${C.accent}33` }} />
      <span className={`font-display relative font-bold ${big ? "text-6xl" : "text-2xl"}`} style={{ color: C.accentInk, opacity: 0.75 }}>
        {glyph}
      </span>
    </div>
  );
}

export function AllergenPill({ allergen, lang }: { allergen: Allergen; lang: Lang }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-5" style={{ background: C.well, color: C.slate }}>
      {t(allergenLabels[allergen], lang)}
    </span>
  );
}

export function CaloriePill({ calories, lang, large }: { calories: number | null; lang: Lang; large?: boolean }) {
  return (
    <span
      className={`font-ui inline-flex items-center gap-1 rounded-full font-semibold ${large ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10.5px] leading-5"}`}
      style={{ background: C.accentSoft, color: C.accentInk }}
    >
      <Flame className={large ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2.2} />
      {formatCalories(calories, lang)}
    </span>
  );
}

/** Horizontal dish card: text on the reading side, a 96×96 photo on the other. */
export function DishCard({ item, lang, categoryLabel, priority, onOpen }: { item: MenuItem; lang: Lang; categoryLabel?: string; priority?: boolean; onOpen: () => void }) {
  const soldOut = !item.isAvailable;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-3.5 rounded-2xl border p-3.5 text-start transition-[transform,box-shadow] duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] active:scale-[0.99]"
      style={{ background: C.card, borderColor: C.line, boxShadow: C.shadow }}
      aria-label={`${t(item.name, lang)} · ${formatPrice(item.price, lang)}`}
    >
      <div className={`flex min-w-0 flex-1 flex-col ${soldOut ? "opacity-60" : ""}`}>
        {categoryLabel && (
          <span className="mb-0.5 text-[10.5px] font-semibold" style={{ color: C.accentInk }}>
            {categoryLabel}
          </span>
        )}
        <h3 className="font-display text-base font-bold leading-snug" style={{ color: C.ink }}>
          {t(item.name, lang)}
        </h3>
        {(item.description.ar || item.description.en) && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: C.slate }}>
            {t(item.description, lang)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {item.allergens.filter((a) => a !== "chef").map((a) => (
            <AllergenPill key={a} allergen={a} lang={lang} />
          ))}
          <CaloriePill calories={item.calories} lang={lang} />
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2.5">
          <span className={`font-ui text-[15px] font-extrabold tabular-nums ${soldOut ? "line-through" : ""}`} style={{ color: C.accentInk }}>
            {formatPrice(item.price, lang)}
          </span>
          {soldOut && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: "#FDECEC", color: "#B42318" }}>
              {lang === "ar" ? "نفدت الكمية" : "Sold out"}
            </span>
          )}
          {item.allergens.includes("chef") && (
            <span className="text-[10.5px] font-semibold" style={{ color: "#8B6F4C" }}>
              ★ {t(allergenLabels.chef, lang)}
            </span>
          )}
        </div>
      </div>
      <Thumb src={item.image} label={t(item.name, lang)} sizes="96px" priority={priority} dim={soldOut} className="h-24 w-24 shrink-0" />
    </button>
  );
}
