/**
 * Aghatti brand palette.
 *   turquoise  #1ECAD3  (specified brand colour; the logo artwork itself measures #00ACC8)
 *   light-blue #63D2FF  (specified brand colour)
 *   bronze     #8B6F4C  (wordmark, measured from the logo)
 * Tailwind v4 reads this file through `@config` in app/globals.css. The same values are CSS
 * variables (--brand-turquoise, --brand-light-blue, --brand-bronze).
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          turquoise: "#1ECAD3",
          "light-blue": "#63D2FF",
          bronze: "#8B6F4C",
        },
        obsidian: {
          DEFAULT: "#05070B",
          card: "#14191F",
        },
      },
    },
  },
};

export default config;
