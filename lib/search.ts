import type { Category, MenuItem } from "./types";

/**
 * Arabic-aware normalisation: strips tashkeel/tatweel and unifies letter variants, so "كبه"
 * finds "كبة", "اسبريسو" finds "إسبريسو" and "مشاوى" finds "مشاوي". Latin text is lower-cased
 * with accents removed.
 */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "")
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

/** Every query word must match somewhere; name matches rank above description and category matches. */
export function searchMenu(categories: Category[], query: string, limit = 60): DishHit[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  const hits: DishHit[] = [];
  categories.forEach((category, categoryIndex) => {
    const catText = normalize(`${category.name.ar} ${category.name.en}`);
    category.items.forEach((item, itemIndex) => {
      const name = normalize(`${item.name.ar} ${item.name.en}`);
      const desc = normalize(`${item.description.ar} ${item.description.en}`);
      if (!words.every((w) => `${name} ${desc} ${catText}`.includes(w))) return;
      let score = 0;
      for (const w of words) {
        if (name.split(" ").some((tok) => tok.startsWith(w))) score += 6;
        else if (name.includes(w)) score += 4;
        else if (desc.includes(w)) score += 2;
        else score += 1;
      }
      hits.push({ category, categoryIndex, item, itemIndex, score });
    });
  });
  hits.sort((a, b) => b.score - a.score || a.categoryIndex - b.categoryIndex || a.itemIndex - b.itemIndex);
  return hits.slice(0, limit);
}
