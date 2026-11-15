import type { LocalizedString } from "./types";

/** Restaurant-level settings. Change these to rebrand the menu. */
export const restaurant = {
  name: { ar: "اغاتي", en: "Aghatti" } satisfies LocalizedString,
  tagline: {
    ar: "مطبخ عراقي",
    en: "Iraqi Cuisine",
  } satisfies LocalizedString,
  /** Official logos, downloaded from the brand Drive folder into public/brand/. */
  /** ui-* files are trimmed, web-sized copies of the originals (generated from brand-2, brand-1, logo-outline, logo-white). */
  logos: {
    /** Colour leaf + bronze wordmark, horizontal: header */
    horizontal: { src: "/brand/ui-horizontal.png", w: 1128, h: 620 },
    /** Colour leaf + wordmark, stacked: QR gate, QR cards */
    stacked: { src: "/brand/ui-stacked.png", w: 717, h: 1400 },
    /** Thin outline: hero watermark */
    outline: { src: "/brand/ui-outline.png", w: 1215, h: 1400 },
    /** All white: dark surfaces */
    white: { src: "/brand/ui-white.png", w: 781, h: 1400 },
  },
  /** Saudi VAT, prices are VAT inclusive. */
  vatRate: 0.15,
};
