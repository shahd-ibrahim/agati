import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { restaurant } from "@/lib/config";
import type { Lang, Theme } from "@/lib/types";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-cairo", display: "swap" });
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
    { media: "(prefers-color-scheme: dark)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Language & theme live in cookies so the server renders the right direction/theme: no flash, no layout shift.
  const store = await cookies();
  const lang: Lang = store.get("lang")?.value === "en" ? "en" : "ar";
  // Light is the default; dark only if someone switched it on in /admin.
  const theme: Theme = store.get("ui-theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={`${theme === "dark" ? "dark" : ""} ${cairo.variable} ${jakarta.variable}`}
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
