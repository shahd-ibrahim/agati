"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  FolderInput,
  ListPlus,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Pencil,
  Percent,
  Plus,
  QrCode,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DishImage } from "@/components/ui";
import { allergenLabels, formatCalories, t } from "@/lib/i18n";
import { ALLERGENS, type BulkAction, type Category, type Lang, type LocalizedString, type MenuData, type MenuItem } from "@/lib/types";

const L = (ar: string, en: string): LocalizedString => ({ ar, en });
const ui = {
  title: L("لوحة التحكم", "Admin Dashboard"),
  password: L("كلمة المرور", "Password"),
  login: L("دخول", "Sign in"),
  wrongPassword: L("كلمة المرور غير صحيحة", "Incorrect password"),
  logout: L("خروج", "Sign out"),
  viewMenu: L("عرض القائمة", "View menu"),
  qr: L("رموز QR", "QR codes"),
  categories: L("الأقسام", "Categories"),
  allDishes: L("كل الأطباق", "All dishes"),
  addCategory: L("قسم جديد", "New category"),
  dishes: L("طبق", "dishes"),
  soldOutCount: L("نفدت", "sold out"),
  addDish: L("إضافة طبق", "Add dish"),
  bulkAdd: L("إضافة جماعية", "Bulk add"),
  editDish: L("تعديل الطبق", "Edit dish"),
  search: L("ابحث في كل الأطباق…", "Search all dishes…"),
  available: L("متوفر", "Available"),
  soldOut: L("نفدت الكمية", "Sold Out"),
  price: L("السعر (ر.س)", "Price (SAR)"),
  calories: L("السعرات (kcal) — اتركه فارغاً إن لم يتوفر", "Calories (kcal) — leave empty if unknown"),
  nameAr: L("الاسم بالعربية", "Name (Arabic)"),
  nameEn: L("الاسم بالإنجليزية", "Name (English)"),
  descAr: L("الوصف / المكونات بالعربية", "Description / ingredients (Arabic)"),
  descEn: L("الوصف / المكونات بالإنجليزية", "Description / ingredients (English)"),
  longAr: L("وصف مفصل بالعربية (اختياري)", "Long description, Arabic (optional)"),
  longEn: L("وصف مفصل بالإنجليزية (اختياري)", "Long description, English (optional)"),
  category: L("القسم", "Category"),
  image: L("رابط صورة الطبق", "Dish image URL"),
  allergens: L("مسببات الحساسية والوسوم", "Allergens & tags"),
  save: L("حفظ", "Save"),
  cancel: L("إلغاء", "Cancel"),
  confirmDelete: L("حذف نهائي؟", "Delete permanently?"),
  saved: L("تم الحفظ", "Saved"),
  deleted: L("تم الحذف", "Deleted"),
  selected: L("محدد", "selected"),
  markAvailable: L("متوفر", "Available"),
  markSoldOut: L("نفدت", "Sold out"),
  moveTo: L("نقل إلى…", "Move to…"),
  priceChange: L("تعديل السعر ٪", "Price ±%"),
  apply: L("تطبيق", "Apply"),
  delete: L("حذف", "Delete"),
  clear: L("إلغاء التحديد", "Clear"),
  catName: L("اسم القسم", "Category name"),
  cover: L("صورة غلاف القسم (بوابة الأقسام)", "Category cover image (portal)"),
  pickFromDishes: L("أو اختر من صور الأطباق", "or pick from dish photos"),
  deleteCategory: L("حذف القسم", "Delete category"),
  categoryNotEmpty: L("لا يمكن حذف قسم يحتوي على أطباق", "Move or delete its dishes first"),
  bulkHelp: L(
    "طبق في كل سطر. الحقول مفصولة بـ | بالترتيب: الاسم بالعربية | الاسم بالإنجليزية | السعر | السعرات | الوصف بالعربية | الوصف بالإنجليزية | رابط الصورة (الحقول الأخيرة اختيارية). يمكن اللصق من Excel مباشرة (أعمدة مفصولة بـ Tab).",
    "One dish per line, fields separated by | in this order: Arabic name | English name | price | kcal | Arabic description | English description | image URL (the last fields are optional). You can paste straight from Excel (tab-separated columns).",
  ),
  rowsReady: L("أطباق جاهزة", "dishes ready"),
  rowErrors: L("أسطر بها أخطاء", "lines with errors"),
  addAll: L("إضافة الكل", "Add all"),
  emptyCat: L("لا توجد أطباق في هذا القسم", "No dishes in this category"),
  noMatch: L("لا نتائج", "No matches"),
};

type Row = MenuItem & { categoryId: string };

const emptyItem = (categoryId: string): Row => ({
  id: "",
  categoryId,
  name: L("", ""),
  description: L("", ""),
  longDescription: L("", ""),
  price: 0,
  calories: null,
  allergens: [],
  image: "",
  isAvailable: true,
});

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText);
  return res.json() as Promise<T>;
}

const field = "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";
const lbl = "mb-1 block text-xs font-semibold text-muted";

/* ═════════════════════════ Session gate ═════════════════════════ */

export default function AdminPage() {
  const { lang } = useApp();
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [menuUrl, setMenuUrl] = useState("/");

  const checkSession = useCallback(
    () =>
      api<{ authenticated: boolean; menuUrl?: string }>("/api/admin/session")
        .then((r) => {
          if (r.menuUrl) setMenuUrl(r.menuUrl);
          setAuth(r.authenticated ? "in" : "out");
        })
        .catch(() => setAuth("out")),
    [],
  );

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (auth === "loading")
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  if (auth === "out")
    return (
      <Login
        lang={lang}
        onSuccess={() => {
          // Return to the page that required login (same-origin paths only).
          const next = new URLSearchParams(window.location.search).get("next");
          if (next && next.startsWith("/") && !next.startsWith("//")) window.location.assign(next);
          else checkSession();
        }}
      />
    );
  return <Dashboard menuUrl={menuUrl} onLogout={() => setAuth("out")} />;
}

function TopControls() {
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleLang} className="font-ui h-9 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink">
        {lang === "ar" ? "EN" : "ع"}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="theme"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Login({ lang, onSuccess }: { lang: Lang; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await api("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) });
      onSuccess();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5">
      <div className="absolute end-5 top-5">
        <TopControls />
      </div>
      <form onSubmit={submit} className="w-full max-w-sm rounded-[28px] border border-line bg-surface p-7 shadow-luxe">
        <div className="arch arch-glow mx-auto mb-5 flex h-20 w-16 items-center justify-center bg-surface-2">
          <Lock className="h-6 w-6 text-accent" />
        </div>
        <h1 className="font-display text-center text-2xl font-bold text-ink">{t(ui.title, lang)}</h1>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium text-muted">{t(ui.password, lang)}</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-bg px-4 text-ink focus:border-accent focus:outline-none"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-500">{t(ui.wrongPassword, lang)}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent font-bold text-[#03161b] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t(ui.login, lang)}
        </button>
      </form>
    </div>
  );
}

/* ═════════════════════════ Dashboard ═════════════════════════ */

function Dashboard({ menuUrl, onLogout }: { menuUrl: string; onLogout: () => void }) {
  const { lang, toast } = useApp();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [catId, setCatId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(() => api<MenuData>("/api/menu").then(setMenu), []);
  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => [...(menu?.categories ?? [])].sort((a, b) => a.order - b.order), [menu]);
  const allRows = useMemo<Row[]>(() => categories.flatMap((c) => c.items.map((it) => ({ ...it, categoryId: c.id }))), [categories]);
  const currentCat = categories.find((c) => c.id === catId) ?? null;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A search always spans every category, which is what you want with 80+ dishes.
    return allRows.filter(
      (r) =>
        (q ? r.name.ar.includes(q) || r.name.en.toLowerCase().includes(q) || r.description.ar.includes(q) || r.description.en.toLowerCase().includes(q) : catId === "all" || r.categoryId === catId),
    );
  }, [allRows, query, catId]);

  const catName = (id: string) => t(categories.find((c) => c.id === id)?.name, lang);
  const totalSoldOut = allRows.filter((r) => !r.isAvailable).length;

  // Drop selections that no longer exist after a reload.
  useEffect(() => {
    setSelected((s) => new Set([...s].filter((id) => allRows.some((r) => r.id === id))));
  }, [allRows]);

  const run = async (fn: () => Promise<unknown>, okMsg = t(ui.saved, lang)) => {
    try {
      await fn();
      toast(okMsg);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      load();
    }
  };

  const patch = (id: string, body: Partial<Row>) => {
    // optimistic
    setMenu((m) =>
      m ? { ...m, categories: m.categories.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...body } : i)) })) } : m,
    );
    return run(() => api(`/api/menu/${id}`, { method: "PATCH", body: JSON.stringify(body) }));
  };

  const bulk = (action: BulkAction) => run(() => api("/api/menu/bulk", { method: "POST", body: JSON.stringify(action) }).then(() => setSelected(new Set())));

  const removeOne = (r: Row) => {
    if (!window.confirm(`${t(ui.confirmDelete, lang)}\n${t(r.name, lang)}`)) return;
    run(() => api(`/api/menu/${r.id}`, { method: "DELETE" }), t(ui.deleted, lang));
  };

  const logout = async () => {
    await api("/api/admin/session", { method: "DELETE" });
    onLogout();
  };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((s) => (allVisibleSelected ? new Set([...s].filter((id) => !rows.some((r) => r.id === id))) : new Set([...s, ...rows.map((r) => r.id)])));
  const toggleOne = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));

  if (!menu)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-28 pt-6 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-ink">Admin</p>
          <h1 className="font-display text-3xl font-bold text-ink">{t(ui.title, lang)}</h1>
          <p className="font-ui mt-1 text-xs text-muted">
            {categories.length} {t(ui.categories, lang)} · {allRows.length} {t(ui.dishes, lang)} · {totalSoldOut} {t(ui.soldOutCount, lang)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={menuUrl} target="_blank" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink">
            <ExternalLink className="h-3.5 w-3.5" /> {t(ui.viewMenu, lang)}
          </Link>
          <Link href="/qr-generator" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink">
            <QrCode className="h-3.5 w-3.5" /> {t(ui.qr, lang)}
          </Link>
          <TopControls />
          <button type="button" onClick={logout} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
            <LogOut className="h-3.5 w-3.5" /> {t(ui.logout, lang)}
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Category sidebar */}
        <CategorySidebar
          lang={lang}
          categories={categories}
          total={allRows.length}
          activeId={catId}
          onSelect={(id) => {
            setCatId(id);
            setQuery("");
          }}
          onReorder={(order) => run(() => api("/api/categories", { method: "PUT", body: JSON.stringify({ order }) }))}
          onCreate={(name) =>
            run(async () => {
              const c = await api<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name }) });
              setCatId(c.id);
            })
          }
        />

        <section className="min-w-0">
          {currentCat && !query && (
            <CategoryPanel
              key={currentCat.id}
              lang={lang}
              category={currentCat}
              dishPhotos={allRows.map((r) => r.image).filter(Boolean)}
              onSave={(body) => run(() => api(`/api/categories/${currentCat.id}`, { method: "PATCH", body: JSON.stringify(body) }))}
              onDelete={() => {
                if (!window.confirm(`${t(ui.confirmDelete, lang)}\n${t(currentCat.name, lang)}`)) return;
                run(async () => {
                  await api(`/api/categories/${currentCat.id}`, { method: "DELETE" });
                  setCatId("all");
                }, t(ui.deleted, lang));
              }}
            />
          )}

          {/* Toolbar */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(ui.search, lang)}
                className="h-11 w-full rounded-full border border-line bg-surface pe-4 ps-10 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={!categories.length}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50"
              >
                <ListPlus className="h-4 w-4" /> {t(ui.bulkAdd, lang)}
              </button>
              <button
                type="button"
                onClick={() => setEditing(emptyItem(currentCat?.id ?? categories[0]?.id ?? ""))}
                disabled={!categories.length}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-[#03161b] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> {t(ui.addDish, lang)}
              </button>
            </div>
          </div>

          {/* Dish table */}
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Checkbox checked={allVisibleSelected} onChange={toggleAll} label="select all" />
              <span>
                {rows.length} {t(ui.dishes, lang)}
              </span>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">{t(query ? ui.noMatch : ui.emptyCat, lang)}</p>
            ) : (
              <ul>
                {rows.map((r) => (
                  <AdminRow
                    key={r.id}
                    row={r}
                    lang={lang}
                    showCategory={catId === "all" || !!query}
                    categoryName={catName(r.categoryId)}
                    selected={selected.has(r.id)}
                    onToggle={() => toggleOne(r.id)}
                    onPatch={(b) => patch(r.id, b)}
                    onEdit={() => setEditing(r)}
                    onDelete={() => removeOne(r)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkBar
            lang={lang}
            count={selected.size}
            categories={categories}
            onClear={() => setSelected(new Set())}
            onAction={(a) => {
              const ids = [...selected];
              if (a.kind === "delete") {
                if (!window.confirm(`${t(ui.confirmDelete, lang)} (${ids.length})`)) return;
                bulk({ action: "delete", ids });
              } else if (a.kind === "avail") bulk({ action: "setAvailability", ids, value: a.value });
              else if (a.kind === "move") bulk({ action: "move", ids, categoryId: a.categoryId });
              else if (a.kind === "price") bulk({ action: "adjustPrice", ids, percent: a.percent });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <ItemEditor
            key={editing.id || "new"}
            row={editing}
            categories={categories}
            lang={lang}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              toast(t(ui.saved, lang));
              load();
            }}
          />
        )}
        {bulkOpen && (
          <BulkAdd
            key="bulk"
            lang={lang}
            categories={categories}
            defaultCategoryId={currentCat?.id ?? categories[0]?.id ?? ""}
            onClose={() => setBulkOpen(false)}
            onDone={(count, categoryId) => {
              setBulkOpen(false);
              setCatId(categoryId);
              toast(`+${count} ${t(ui.dishes, lang)}`);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Category sidebar ───────────── */

function CategorySidebar({
  lang,
  categories,
  total,
  activeId,
  onSelect,
  onReorder,
  onCreate,
}: {
  lang: Lang;
  categories: Category[];
  total: number;
  activeId: string;
  onSelect: (id: string) => void;
  onReorder: (order: string[]) => void;
  onCreate: (name: LocalizedString) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(L("", ""));

  const move = (i: number, d: number) => {
    const ids = categories.map((c) => c.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  };

  const item = (on: boolean) => `flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors ${on ? "bg-accent/15 text-accent-ink ring-1 ring-accent/50" : "text-ink hover:bg-surface-2"}`;

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-2xl border border-line bg-surface p-2">
        <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t(ui.categories, lang)}</p>
        <button type="button" onClick={() => onSelect("all")} className={item(activeId === "all")}>
          <span>{t(ui.allDishes, lang)}</span>
          <span className="font-ui text-xs text-muted">{total}</span>
        </button>
        <ul className="mt-1 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {categories.map((c, i) => (
            <li key={c.id} className="group flex shrink-0 items-center gap-1 lg:shrink">
              <button type="button" onClick={() => onSelect(c.id)} className={item(activeId === c.id)}>
                <span className="truncate">{t(c.name, lang)}</span>
                <span className="font-ui text-xs text-muted">
                  {c.items.length}
                  {c.items.some((x) => !x.isAvailable) && <span className="ms-1 text-red-400">•</span>}
                </span>
              </button>
              <div className="hidden flex-col lg:flex">
                <button type="button" aria-label="up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-20">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" aria-label="down" disabled={i === categories.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-20">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {adding ? (
          <form
            className="mt-2 space-y-2 rounded-xl border border-line p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.ar.trim() && !name.en.trim()) return;
              onCreate(name);
              setName(L("", ""));
              setAdding(false);
            }}
          >
            <input dir="rtl" autoFocus placeholder="الاسم بالعربية" value={name.ar} onChange={(e) => setName({ ...name, ar: e.target.value })} className={field} />
            <input dir="ltr" placeholder="English name" value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} className={field} />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-full bg-accent py-2 text-xs font-bold text-[#03161b]">
                {t(ui.save, lang)}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-full px-3 text-xs font-semibold text-muted">
                {t(ui.cancel, lang)}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-muted hover:text-ink">
            <Plus className="h-3.5 w-3.5" /> {t(ui.addCategory, lang)}
          </button>
        )}
      </div>
    </aside>
  );
}

/* ───────────── Category panel: name + cover image ───────────── */

function CategoryPanel({
  lang,
  category,
  dishPhotos,
  onSave,
  onDelete,
}: {
  lang: Lang;
  category: Category;
  dishPhotos: string[];
  onSave: (body: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [cover, setCover] = useState(category.coverImage);
  const dirty = name.ar !== category.name.ar || name.en !== category.name.en || cover !== category.coverImage;
  const photos = [...new Set(dishPhotos)];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={lbl}>{t(ui.catName, lang)} (AR)</span>
          <input dir="rtl" value={name.ar} onChange={(e) => setName({ ...name, ar: e.target.value })} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.catName, lang)} (EN)</span>
          <input dir="ltr" value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} className={field} />
        </label>
        <div className="flex items-start gap-3 sm:col-span-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line">
            {cover ? <Image src={cover} alt="" fill sizes="64px" className="object-cover" /> : null}
          </div>
          <label className="min-w-0 flex-1">
            <span className={lbl}>{t(ui.cover, lang)}</span>
            <input dir="ltr" list={`photos-${category.id}`} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://… or /dishes/…" className={`${field} font-ui text-xs`} />
            <span className="mt-1 block text-[10px] text-muted">{t(ui.pickFromDishes, lang)}</span>
          </label>
        </div>
        <datalist id={`photos-${category.id}`}>
          {photos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={category.items.length > 0}
          title={category.items.length ? t(ui.categoryNotEmpty, lang) : undefined}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t(ui.deleteCategory, lang)}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave({ name, coverImage: cover })}
          className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-bold text-[#03161b] disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> {t(ui.save, lang)}
        </button>
      </div>
    </div>
  );
}

/* ───────────── Rows ───────────── */

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${checked ? "border-accent bg-accent text-[#03161b]" : "border-line"}`}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}

function AdminRow({
  row,
  lang,
  showCategory,
  categoryName,
  selected,
  onToggle,
  onPatch,
  onEdit,
  onDelete,
}: {
  row: Row;
  lang: Lang;
  showCategory: boolean;
  categoryName: string;
  selected: boolean;
  onToggle: () => void;
  onPatch: (b: Partial<Row>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [price, setPrice] = useState(String(row.price));
  const [cal, setCal] = useState(row.calories === null ? "" : String(row.calories));
  useEffect(() => setPrice(String(row.price)), [row.price]);
  useEffect(() => setCal(row.calories === null ? "" : String(row.calories)), [row.calories]);

  const commitPrice = () => {
    const n = Number(price);
    if (Number.isFinite(n) && n >= 0 && n !== row.price) onPatch({ price: Math.round(n * 100) / 100 });
    else setPrice(String(row.price));
  };
  const commitCal = () => {
    if (cal.trim() === "") {
      if (row.calories !== null) onPatch({ calories: null });
      return;
    }
    const n = Math.round(Number(cal));
    if (Number.isFinite(n) && n >= 0 && n !== row.calories) onPatch({ calories: n });
    else setCal(row.calories === null ? "" : String(row.calories));
  };
  const num = "font-ui h-9 w-[4.5rem] rounded-lg border border-line bg-bg px-2 text-sm text-ink focus:border-accent focus:outline-none";

  return (
    <li className={`flex flex-wrap items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 sm:flex-nowrap ${selected ? "bg-accent/5" : ""}`}>
      <Checkbox checked={selected} onChange={onToggle} label={t(row.name, lang)} />
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        <DishImage src={row.image} alt="" sizes="44px" className={row.isAvailable ? "" : "grayscale"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{t(row.name, lang)}</p>
        <p className="truncate text-[11px] text-muted">
          {showCategory && <span className="text-accent-ink">{categoryName} · </span>}
          {t(row.name, lang === "ar" ? "en" : "ar")} · {formatCalories(row.calories, lang)}
        </p>
      </div>
      <label className="flex items-center gap-1 text-[10px] font-semibold text-muted" title={t(ui.price, lang)}>
        SAR
        <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={commitPrice} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className={num} />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-semibold text-muted" title={t(ui.calories, lang)}>
        kcal
        <input inputMode="numeric" placeholder="—" value={cal} onChange={(e) => setCal(e.target.value)} onBlur={commitCal} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className={num} />
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={row.isAvailable}
        onClick={() => onPatch({ isAvailable: !row.isAvailable })}
        className={`flex h-9 min-w-[6.75rem] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors ${
          row.isAvailable ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-500"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${row.isAvailable ? "bg-emerald-500" : "bg-red-500"}`} />
        {t(row.isAvailable ? ui.available : ui.soldOut, lang)}
      </button>
      <button type="button" onClick={onEdit} aria-label="edit" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} aria-label="delete" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ───────────── Bulk action bar ───────────── */

type BarAction = { kind: "avail"; value: boolean } | { kind: "move"; categoryId: string } | { kind: "price"; percent: number } | { kind: "delete" };

function BulkBar({ lang, count, categories, onClear, onAction }: { lang: Lang; count: number; categories: Category[]; onClear: () => void; onAction: (a: BarAction) => void }) {
  const [percent, setPercent] = useState("");
  const btn = "flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-ink hover:border-accent/60";
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className="fixed inset-x-0 bottom-4 z-40 px-4"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-glass p-2.5 shadow-luxe backdrop-blur-xl">
        <span className="font-ui px-2 text-sm font-bold text-accent-ink">
          {count} {t(ui.selected, lang)}
        </span>
        <button type="button" className={btn} onClick={() => onAction({ kind: "avail", value: true })}>
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t(ui.markAvailable, lang)}
        </button>
        <button type="button" className={btn} onClick={() => onAction({ kind: "avail", value: false })}>
          <span className="h-2 w-2 rounded-full bg-red-500" /> {t(ui.markSoldOut, lang)}
        </button>
        <label className={`${btn} pe-1`}>
          <FolderInput className="h-3.5 w-3.5" />
          <select
            value=""
            onChange={(e) => e.target.value && onAction({ kind: "move", categoryId: e.target.value })}
            className="bg-transparent text-xs font-semibold text-ink focus:outline-none"
          >
            <option value="">{t(ui.moveTo, lang)}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.name, lang)}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const p = Number(percent);
            if (Number.isFinite(p) && p !== 0) onAction({ kind: "price", percent: p });
            setPercent("");
          }}
        >
          <span className="relative">
            <Percent className="pointer-events-none absolute start-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
            <input
              inputMode="decimal"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder={t(ui.priceChange, lang)}
              className="font-ui h-9 w-28 rounded-full border border-line bg-bg pe-2 ps-7 text-xs text-ink focus:border-accent focus:outline-none"
            />
          </span>
          <button type="submit" className={btn}>
            {t(ui.apply, lang)}
          </button>
        </form>
        <button type="button" className={`${btn} text-red-500`} onClick={() => onAction({ kind: "delete" })}>
          <Trash2 className="h-3.5 w-3.5" /> {t(ui.delete, lang)}
        </button>
        <button type="button" onClick={onClear} className="ms-auto flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
          <X className="h-3.5 w-3.5" /> {t(ui.clear, lang)}
        </button>
      </div>
    </motion.div>
  );
}

/* ───────────── Modals ───────────── */

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <>
      <motion.div className="fixed inset-0 z-50 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[28px] border border-line bg-surface shadow-luxe sm:bottom-6 sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>
      </motion.div>
    </>
  );
}

function ItemEditor({ row, categories, lang, onClose, onSaved }: { row: Row; categories: Category[]; lang: Lang; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Row>({ ...row, longDescription: row.longDescription ?? L("", "") });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = !row.id;

  const set = <K extends keyof Row>(k: K, v: Row[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setLoc = (k: "name" | "description" | "longDescription", l: Lang, v: string) => setDraft((d) => ({ ...d, [k]: { ...(d[k] ?? L("", "")), [l]: v } }));

  const save = async () => {
    setError(null);
    const { id, ...body } = draft;
    void id;
    if (!body.longDescription?.ar && !body.longDescription?.en) delete body.longDescription;
    setBusy(true);
    try {
      if (isNew) await api("/api/menu", { method: "POST", body: JSON.stringify(body) });
      else await api(`/api/menu/${row.id}`, { method: "PATCH", body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t(isNew ? ui.addDish : ui.editDish, lang)}
      onClose={onClose}
      footer={
        <>
          {error && <p className="me-auto text-sm text-red-500">{error}</p>}
          <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-muted">
            {t(ui.cancel, lang)}
          </button>
          <button type="button" onClick={save} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-[#03161b] disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t(ui.save, lang)}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className={lbl}>{t(ui.nameAr, lang)}</span>
          <input dir="rtl" value={draft.name.ar} onChange={(e) => setLoc("name", "ar", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.nameEn, lang)}</span>
          <input dir="ltr" value={draft.name.en} onChange={(e) => setLoc("name", "en", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.descAr, lang)}</span>
          <textarea dir="rtl" rows={2} value={draft.description.ar} onChange={(e) => setLoc("description", "ar", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.descEn, lang)}</span>
          <textarea dir="ltr" rows={2} value={draft.description.en} onChange={(e) => setLoc("description", "en", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.longAr, lang)}</span>
          <textarea dir="rtl" rows={3} value={draft.longDescription?.ar ?? ""} onChange={(e) => setLoc("longDescription", "ar", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.longEn, lang)}</span>
          <textarea dir="ltr" rows={3} value={draft.longDescription?.en ?? ""} onChange={(e) => setLoc("longDescription", "en", e.target.value)} className={field} />
        </label>
        <label>
          <span className={lbl}>{t(ui.price, lang)}</span>
          <input type="number" min={0} step="0.5" value={draft.price} onChange={(e) => set("price", Number(e.target.value))} className={`${field} font-ui`} />
        </label>
        <label>
          <span className={lbl}>{t(ui.calories, lang)}</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="—"
            value={draft.calories ?? ""}
            onChange={(e) => set("calories", e.target.value === "" ? null : Math.round(Number(e.target.value)))}
            className={`${field} font-ui`}
          />
        </label>
        <label>
          <span className={lbl}>{t(ui.category, lang)}</span>
          <select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={field}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.name, lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={lbl}>{t(ui.image, lang)}</span>
          <input dir="ltr" placeholder="https://… or /dishes/…" value={draft.image} onChange={(e) => set("image", e.target.value)} className={`${field} font-ui text-xs`} />
        </label>
        <div className="sm:col-span-2">
          <span className={lbl}>{t(ui.allergens, lang)}</span>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const on = draft.allergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("allergens", on ? draft.allergens.filter((x) => x !== a) : [...draft.allergens, a])}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "bg-accent text-[#03161b]" : "border border-line text-muted"}`}
                >
                  {t(allergenLabels[a], lang)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" checked={draft.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} className="h-4 w-4 accent-[#00acc8]" />
          {t(ui.available, lang)}
        </label>
      </div>
    </Modal>
  );
}

/** Parses pasted lines: `ar | en | price | kcal | descAr | descEn | image` (or tab-separated from Excel). */
function parseBulk(text: string) {
  const ok: Partial<MenuItem>[] = [];
  const bad: number[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) return;
      const f = (line.includes("\t") ? line.split("\t") : line.split("|")).map((x) => x.trim());
      const [ar = "", en = "", price = "", kcal = "", dar = "", den = "", image = ""] = f;
      const p = Number(price.replace(/[^\d.]/g, ""));
      const kc = kcal.replace(/[^\d.]/g, "");
      const k = kc === "" ? null : Math.round(Number(kc));
      if ((!ar && !en) || !price || !Number.isFinite(p) || (k !== null && !Number.isFinite(k))) {
        bad.push(i + 1);
        return;
      }
      ok.push({ name: { ar, en }, description: { ar: dar, en: den }, price: p, calories: k, image, allergens: [], isAvailable: true });
    });
  return { ok, bad };
}

function BulkAdd({
  lang,
  categories,
  defaultCategoryId,
  onClose,
  onDone,
}: {
  lang: Lang;
  categories: Category[];
  defaultCategoryId: string;
  onClose: () => void;
  onDone: (count: number, categoryId: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseBulk(text), [text]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api("/api/menu/bulk", { method: "POST", body: JSON.stringify({ action: "create", categoryId, items: parsed.ok } satisfies BulkAction) });
      onDone(parsed.ok.length, categoryId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t(ui.bulkAdd, lang)}
      onClose={onClose}
      footer={
        <>
          {error && <p className="me-auto text-sm text-red-500">{error}</p>}
          <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-muted">
            {t(ui.cancel, lang)}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || parsed.ok.length === 0 || parsed.bad.length > 0}
            className="flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-[#03161b] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t(ui.addAll, lang)} ({parsed.ok.length})
          </button>
        </>
      }
    >
      <label className="block">
        <span className={lbl}>{t(ui.category, lang)}</span>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.name, lang)}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-4 text-xs leading-relaxed text-muted">{t(ui.bulkHelp, lang)}</p>
      <textarea
        dir="auto"
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder={"سمك بني مشوي | Grilled Bunni Fish | 110 | 640 | سمك بني على الفحم | Charcoal bunni fish\nكبة حلب | Aleppo Kubba | 32 | 380"}
        className={`${field} font-ui mt-2 text-xs leading-relaxed`}
      />
      <p className="font-ui mt-2 text-xs">
        <span className="text-emerald-500">
          {parsed.ok.length} {t(ui.rowsReady, lang)}
        </span>
        {parsed.bad.length > 0 && (
          <span className="ms-3 text-red-500">
            {parsed.bad.length} {t(ui.rowErrors, lang)}: {parsed.bad.slice(0, 10).join(", ")}
          </span>
        )}
      </p>
    </Modal>
  );
}
