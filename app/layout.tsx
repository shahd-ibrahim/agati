import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cairo, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { restaurant } from "@/lib/config";
import type { Lang, Theme } from "@/lib/types";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-cairo", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-playfair", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: `${restaurant.name.ar} | ${restaurant.name.en} — Menu`,
  description: `${restaurant.tagline.en} — interactive digital menu`,
  icons: { icon: "/brand/brand-1.png", apple: "/brand/brand-1.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0E11" },
    { media: "(prefers-color-scheme: light)", color: "#0B0E11" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Language & theme live in cookies so the server renders the right direction/theme: no flash, no layout shift.
  const store = await cookies();
  const lang: Lang = store.get("lang")?.value === "en" ? "en" : "ar";
  const theme: Theme = store.get("ui-theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={`${theme === "dark" ? "dark" : ""} ${cairo.variable} ${playfair.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <AppProvider initialLang={lang} initialTheme={theme}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
