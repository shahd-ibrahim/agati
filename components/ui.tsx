"use client";

import Image from "next/image";
import { useState } from "react";
import { Bean, ChefHat, Fish, Flame, Milk, Nut, UtensilsCrossed, Wheat } from "lucide-react";
import { allergenLabels, formatCalories, t } from "@/lib/i18n";
import type { Allergen, Lang } from "@/lib/types";

const allergenIcon: Record<Allergen, typeof Flame> = {
  spicy: Flame,
  nuts: Nut,
  dairy: Milk,
  gluten: Wheat,
  seed: Bean,
  fish: Fish,
  chef: ChefHat,
};

const allergenTone: Record<Allergen, string> = {
  spicy: "text-[#d9622b] border-[#d9622b]/30 bg-[#d9622b]/10",
  nuts: "text-[#a8743e] border-[#a8743e]/30 bg-[#a8743e]/10",
  dairy: "text-[#4f86b8] border-[#4f86b8]/30 bg-[#4f86b8]/10",
  gluten: "text-[#c9a33a] border-[#c9a33a]/30 bg-[#c9a33a]/10",
  seed: "text-[#9ccc65] border-[#9ccc65]/30 bg-[#9ccc65]/10",
  fish: "text-[#5aa9e6] border-[#5aa9e6]/30 bg-[#5aa9e6]/10",
  chef: "text-accent-ink border-accent/40 bg-accent/10",
};

export function AllergenBadge({ allergen, lang, compact }: { allergen: Allergen; lang: Lang; compact?: boolean }) {
  const Icon = allergenIcon[allergen];
  const label = t(allergenLabels[allergen], lang);
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full border text-[11px] font-medium leading-none ${allergenTone[allergen]} ${
        compact ? "h-6 w-6 justify-center" : "px-2 py-1"
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
      {!compact && label}
    </span>
  );
}

export function CaloriesBadge({ calories, lang, className = "" }: { calories: number; lang: Lang; className?: string }) {
  return (
    <span
      className={`font-ui inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/80 px-2 py-1 text-[11px] font-semibold leading-none text-muted ${className}`}
    >
      <Flame className="h-3 w-3 text-accent" strokeWidth={2.2} />
      {formatCalories(calories, lang)}
    </span>
  );
}

/** next/image with a graceful placeholder if the URL fails (e.g. a bad admin URL). */
export function DishImage({
  src,
  alt,
  sizes,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-2 to-surface ${className}`}>
        <UtensilsCrossed className="h-8 w-8 text-accent/60" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
