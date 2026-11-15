import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { ALLERGENS, type Category, type MenuData, type MenuItem, type MenuItemInput } from "./types";

/**
 * File-backed menu store. `data/menu.json` is the live database. It is created from
 * `data/menu.seed.json` on the first admin write. Categories own their items, so the
 * file reads like the printed menu. To move to MySQL / PostgreSQL, swap `getMenu` and
 * `mutateMenu` for queries; the routes and UI don't change.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const LIVE = path.join(DATA_DIR, "menu.json");
const SEED = path.join(DATA_DIR, "menu.seed.json");

let writeQueue: Promise<unknown> = Promise.resolve();

type LegacyItem = MenuItem & { categoryId?: string; available?: boolean };
type LegacyCategory = Partial<Category> & { id: string; topCornerImage?: string };
type LegacyMenu = { categories: LegacyCategory[]; items?: LegacyItem[]; setMenu?: MenuData["setMenu"]; updatedAt?: string };

/** Accepts the current nested shape and the older flat `{ categories, items[] }` shape. */
function normalize(raw: LegacyMenu): MenuData {
  const flat = raw.items ?? [];
  const categories: Category[] = raw.categories.map((c, i) => ({
    id: c.id,
    name: c.name ?? { ar: c.id, en: c.id },
    order: c.order ?? i,
    coverImage: c.coverImage ?? c.topCornerImage ?? "",
    items: [...(c.items ?? []), ...flat.filter((it) => it.categoryId === c.id)].map(normalizeItem),
  }));
  categories.sort((a, b) => a.order - b.order);
  return { categories, ...(raw.setMenu ? { setMenu: raw.setMenu } : {}), updatedAt: raw.updatedAt ?? new Date(0).toISOString() };
}

function normalizeItem(it: LegacyItem): MenuItem {
  return {
    id: it.id,
    name: it.name,
    description: it.description ?? { ar: "", en: "" },
    ...(it.longDescription && (it.longDescription.ar || it.longDescription.en) ? { longDescription: it.longDescription } : {}),
    price: it.price,
    calories: typeof it.calories === "number" ? it.calories : null,
    allergens: (it.allergens ?? []).filter((a) => ALLERGENS.includes(a)),
    image: it.image ?? "",
    isAvailable: it.isAvailable ?? it.available ?? true,
  };
}

export async function getMenu(): Promise<MenuData> {
  let raw: string;
  try {
    raw = await fs.readFile(LIVE, "utf8");
  } catch {
    raw = await fs.readFile(SEED, "utf8");
  }
  return normalize(JSON.parse(raw) as LegacyMenu);
}

async function saveMenu(data: MenuData) {
  data.updatedAt = new Date().toISOString();
  data.categories.forEach((c, i) => (c.order = i));
  const tmp = `${LIVE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, LIVE);
  return data;
}

/** Serialises read-modify-write cycles so concurrent admin edits don't clobber each other. */
export function mutateMenu<T>(fn: (data: MenuData) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const data = await getMenu();
    const result = await fn(data);
    await saveMenu(data);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

/* ───────────── helpers ───────────── */

export function findItem(data: MenuData, id: string) {
  for (const category of data.categories) {
    const index = category.items.findIndex((i) => i.id === id);
    if (index !== -1) return { category, index, item: category.items[index] };
  }
  return null;
}

export const slugify = (s: string, fallback = "dish") =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || fallback;

/** Unique id across all items (or categories). */
export function uniqueId(base: string, taken: Set<string>) {
  let id = base;
  while (taken.has(id)) id = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  taken.add(id);
  return id;
}

export const allItemIds = (data: MenuData) => new Set(data.categories.flatMap((c) => c.items.map((i) => i.id)));

const isLocalized = (v: unknown): v is { ar: string; en: string } =>
  !!v && typeof v === "object" && typeof (v as { ar: unknown }).ar === "string" && typeof (v as { en: unknown }).en === "string";

/** Validates an incoming (partial) item. Returns an error message or null. */
export function validateItem(item: MenuItemInput, partial: boolean): string | null {
  const need = (k: keyof MenuItemInput) => !partial || k in item;
  if (need("name") && !(isLocalized(item.name) && (item.name.ar.trim() || item.name.en.trim()))) return "name must be { ar, en } with at least one value";
  if ("description" in item && item.description !== undefined && !isLocalized(item.description)) return "description must be { ar, en }";
  if (need("price") && !(typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0)) return "price must be a number ≥ 0";
  if ("calories" in item && item.calories !== undefined && item.calories !== null && !(typeof item.calories === "number" && Number.isInteger(item.calories) && item.calories >= 0))
    return "calories must be a whole number ≥ 0, or null";
  if ("allergens" in item && item.allergens !== undefined && !Array.isArray(item.allergens)) return "allergens must be an array";
  if ("image" in item && item.image !== undefined && typeof item.image !== "string") return "image must be a URL string";
  if ("isAvailable" in item && item.isAvailable !== undefined && typeof item.isAvailable !== "boolean") return "isAvailable must be a boolean";
  return null;
}

/** Builds a complete item from validated input. */
export function buildItem(input: MenuItemInput, id: string): MenuItem {
  return normalizeItem({
    id,
    name: { ar: input.name?.ar.trim() ?? "", en: input.name?.en.trim() ?? "" },
    description: input.description ?? { ar: "", en: "" },
    longDescription: input.longDescription,
    price: Math.round((input.price ?? 0) * 100) / 100,
    calories: input.calories ?? null,
    allergens: input.allergens ?? [],
    image: input.image ?? "",
    isAvailable: input.isAvailable ?? true,
  });
}

export function validateCategory(c: Partial<Category>, partial: boolean): string | null {
  if ((!partial || "name" in c) && !(isLocalized(c.name) && (c.name.ar.trim() || c.name.en.trim()))) return "name must be { ar, en }";
  if ("coverImage" in c && c.coverImage !== undefined && typeof c.coverImage !== "string") return "coverImage must be a URL string";
  return null;
}
