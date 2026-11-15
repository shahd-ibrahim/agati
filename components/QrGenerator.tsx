"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, ArrowRight, Download, Printer, ShieldCheck } from "lucide-react";
import { useApp } from "./AppProvider";
import { restaurant } from "@/lib/config";
import { formatNumber, t } from "@/lib/i18n";
import type { Lang, LocalizedString } from "@/lib/types";

const L = (ar: string, en: string): LocalizedString => ({ ar, en });
const ui = {
  title: L("مولّد رموز QR للطاولات", "Table QR Generator"),
  intro: L(
    "كل رمز يحمل مفتاح دخول موقّعاً خاصاً بالطاولة. القائمة لا تفتح إلا عبر هذه الرموز. اطبعها أو حمّلها بدقة عالية.",
    "Each code carries a signed access token for its table. The menu only opens through these codes. Print them or download them in high resolution.",
  ),
  from: L("من طاولة", "From table"),
  to: L("إلى طاولة", "To table"),
  baseUrl: L("رابط الموقع", "Site URL"),
  print: L("طباعة الكل", "Print all"),
  download: L("تحميل PNG", "Download PNG"),
  table: L("طاولة رقم", "Table"),
  general: L("رمز عام (بدون طاولة)", "General code (no table)"),
  scan: L("امسح لعرض القائمة والطلب", "Scan to view the menu & order"),
  back: L("لوحة التحكم", "Dashboard"),
  max: L("حتى ١٠٠ طاولة في المرة. تغيير QR_SECRET يُبطل كل الرموز المطبوعة.", "Up to 100 tables at a time. Changing QR_SECRET invalidates every printed code."),
  includeGeneral: L("إضافة رمز عام", "Include a general code"),
};

const RENDER_SIZE = 1024; // canvas px: crisp when printed at ~8 cm

export function QrGenerator({ tokens, generalToken, maxTable }: { tokens: Record<string, string>; generalToken: string; maxTable: number }) {
  const { lang } = useApp();
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(20);
  const [withGeneral, setWithGeneral] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => setBaseUrl(window.location.origin), []);

  const tables = useMemo(() => {
    const a = Math.min(maxTable, Math.max(1, Math.floor(from) || 1));
    const b = Math.min(maxTable, a + 99, Math.max(a, Math.floor(to) || a));
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }, [from, to, maxTable]);

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const Back = lang === "ar" ? ArrowRight : ArrowLeft;
  const field = "font-ui h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none";

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16 pt-6 sm:px-6 print:max-w-none print:p-0">
      <div className="no-print">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
          <Back className="h-3.5 w-3.5" /> {t(ui.back, lang)}
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold text-ink">{t(ui.title, lang)}</h1>
        <p className="mt-2 flex max-w-2xl items-start gap-2 text-sm leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {t(ui.intro, lang)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">{t(ui.from, lang)}</span>
            <input type="number" min={1} max={maxTable} value={from} onChange={(e) => setFrom(Number(e.target.value))} className={field} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">{t(ui.to, lang)}</span>
            <input type="number" min={1} max={maxTable} value={to} onChange={(e) => setTo(Number(e.target.value))} className={field} />
          </label>
          <label className="col-span-2 sm:col-span-1">
            <span className="mb-1 block text-xs font-semibold text-muted">{t(ui.baseUrl, lang)}</span>
            <input dir="ltr" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={field} />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="col-span-2 flex h-11 items-center justify-center gap-2 self-end rounded-full bg-accent px-6 text-sm font-bold text-[#03161b] sm:col-span-1"
          >
            <Printer className="h-4 w-4" /> {t(ui.print, lang)}
          </button>
          <label className="col-span-2 flex items-center gap-2 text-sm text-ink sm:col-span-4">
            <input type="checkbox" checked={withGeneral} onChange={(e) => setWithGeneral(e.target.checked)} className="h-4 w-4 accent-[#00acc8]" />
            {t(ui.includeGeneral, lang)}
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">{t(ui.max, lang)}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:mt-0 print:grid-cols-3 print:gap-0">
        {withGeneral && <QrCard label={t(ui.general, lang)} fileName="general" url={`${cleanBase}/?qr=${generalToken}`} lang={lang} />}
        {tables.map((n) => (
          <QrCard
            key={n}
            label={`${t(ui.table, lang)} ${lang === "ar" ? formatNumber(n, lang) : `#${n}`}`}
            fileName={`table-${n}`}
            url={`${cleanBase}/t/${n}?token=${tokens[n]}`}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

function QrCard({ label, url, fileName, lang }: { label: string; url: string; fileName: string; lang: Lang }) {
  const wrap = useRef<HTMLDivElement>(null);
  const logo = restaurant.logos.stacked;

  const download = () => {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `aghatti-${fileName}-qr.png`;
    a.click();
  };

  return (
    <div className="flex break-inside-avoid flex-col items-center rounded-3xl border border-line bg-surface p-4 text-center print:rounded-none print:border-dashed print:border-neutral-300 print:bg-white print:p-6">
      <Image src={logo.src} width={logo.w} height={logo.h} alt={restaurant.name.en} className="h-16 w-auto" sizes="40px" />
      <div ref={wrap} className="mt-3 w-full rounded-2xl bg-white p-3 ring-1 ring-accent/40 print:ring-0">
        <QRCodeCanvas
          value={url}
          size={RENDER_SIZE}
          level="H"
          marginSize={1}
          fgColor="#0B0E11"
          bgColor="#ffffff"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
      <p className="font-display mt-3 text-lg font-bold text-ink print:text-black">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted print:text-neutral-600">{t(ui.scan, lang)}</p>
      <p dir="ltr" className="font-ui mt-1 max-w-full truncate text-[10px] text-muted/80 print:hidden" title={url}>
        {url}
      </p>
      <button
        type="button"
        onClick={download}
        className="no-print mt-3 flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-ink hover:border-accent/60"
      >
        <Download className="h-3.5 w-3.5" /> {t(ui.download, lang)}
      </button>
    </div>
  );
}
