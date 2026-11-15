"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ScanLine } from "lucide-react";
import { MenuExperience } from "./MenuExperience";
import { useApp } from "./AppProvider";
import { restaurant } from "@/lib/config";
import type { MenuData } from "@/lib/types";

const ACCESS_KEY = "qr_access";
const ACCESS_TTL_MS = 6 * 60 * 60 * 1000; // one dining session

type Access = { table: string | null; grantedAt: number };

function readAccess(): Access | null {
  try {
    const raw = sessionStorage.getItem(ACCESS_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Access;
    return Date.now() - a.grantedAt < ACCESS_TTL_MS ? a : null;
  } catch {
    return null;
  }
}

function writeAccess(table: string | null) {
  try {
    sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ table, grantedAt: Date.now() } satisfies Access));
  } catch {
    /* storage blocked: access then lasts only while the QR link is open */
  }
}

/**
 * The menu only opens from a valid QR link. The server verifies the token. When it is
 * valid, the menu is rendered right away and the grant is saved in sessionStorage, so
 * reloads, `/` and other pages keep working for the rest of the session.
 */
export function QrGate({ verified, table, initialMenu }: { verified: boolean; table: string | null; initialMenu: MenuData | null }) {
  const [state, setState] = useState<"granted" | "checking" | "locked">(verified ? "granted" : "checking");
  const [menu, setMenu] = useState<MenuData | null>(initialMenu);

  useEffect(() => {
    if (verified) {
      writeAccess(table);
      return;
    }
    if (!readAccess()) {
      setState("locked");
      return;
    }
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => r.json() as Promise<MenuData>)
      .then((m) => {
        setMenu(m);
        setState("granted");
      })
      .catch(() => setState("locked"));
  }, [verified, table]);

  if (state === "granted" && menu) return <MenuExperience initialMenu={menu} tableId={verified ? (table ?? undefined) : undefined} />;
  return <LockScreen checking={state !== "locked"} />;
}

function LockScreen({ checking }: { checking: boolean }) {
  const { lang } = useApp();
  const logo = restaurant.logos.stacked;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* faint turquoise halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-turquoise) 0%, transparent 65%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="arch-ring relative w-full max-w-[19rem]"
      >
        <div className="arch flex flex-col items-center bg-surface px-7 pb-8 pt-14">
          <Image src={logo.src} width={logo.w} height={logo.h} alt={`${restaurant.name.ar} · ${restaurant.name.en}`} priority className="h-40 w-auto" sizes="120px" />

          {checking ? (
            <div className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-surface-2" aria-label="Loading">
              <motion.div
                className="h-full w-1/2 rounded-full bg-accent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/50 bg-accent/10 shadow-[0_0_24px_-6px_var(--accent)]">
                <ScanLine className="h-7 w-7 text-accent" />
              </div>

              <h1 dir="rtl" lang="ar" className="font-display mt-5 text-xl font-bold leading-snug text-ink" style={{ fontFamily: "var(--font-cairo)" }}>
                يرجى مسح الباركود الموجود على الطاولة
              </h1>
              <p dir="rtl" lang="ar" className="mt-2 text-sm leading-relaxed text-muted" style={{ fontFamily: "var(--font-cairo)" }}>
                قائمة الطعام متاحة حصرياً عبر مسح رمز QR المخصص لطاولتك.
              </p>

              <div className="mx-auto my-5 h-px w-16 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

              <h2 dir="ltr" lang="en" className="font-ui text-base font-semibold text-ink">
                QR Scan Required
              </h2>
              <p dir="ltr" lang="en" className="font-ui mt-1.5 text-[13px] leading-relaxed text-muted">
                This menu is available exclusively by scanning the QR code on your table.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {!checking && (
        <p className="font-ui relative mt-8 text-[11px] uppercase tracking-[0.3em] text-muted/70">
          {lang === "ar" ? restaurant.tagline.ar : restaurant.tagline.en}
        </p>
      )}
    </main>
  );
}
