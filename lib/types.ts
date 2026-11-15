export type Lang = "ar" | "en";
export type Theme = "dark" | "light";

export interface LocalizedString {
  ar: string;
  en: string;
}

export type Allergen = "spicy" | "nuts" | "dairy" | "gluten" | "seed" | "fish" | "chef";

export const ALLERGENS: Allergen[] = ["spicy", "gluten", "nuts", "dairy", "seed", "fish", "chef"];

export interface MenuItem {
  id: string;
  name: LocalizedString;
  /** Concise line shown in the category list (ingredients / style). */
  description: LocalizedString;
  /** Optional longer copy shown in the detail modal. */
  longDescription?: LocalizedString;
  /** Price in SAR, VAT inclusive. */
  price: number;
  /** Energy in kcal (SFDA requirement). `null` = not yet provided (shown as "—"). */
  calories: number | null;
  allergens: Allergen[];
  /** Photo URL (local `/dishes/...` or https). May be empty. */
  image: string;
  isAvailable: boolean;
}

export interface Category {
  id: string;
  name: LocalizedString;
  order: number;
  /** Photo shown on the category's portal card and its page header. */
  coverImage: string;
  items: MenuItem[];
}

/** One course of the set menu: the guest picks from `options` (or gets all of them when `all` is true). */
export interface SetMenuCourse {
  name: LocalizedString;
  options: LocalizedString[];
  all?: boolean;
}

export interface SetMenu {
  title: LocalizedString;
  /** SAR per person, VAT inclusive. */
  price: number;
  note?: LocalizedString;
  courses: SetMenuCourse[];
}

export interface MenuData {
  categories: Category[];
  setMenu?: SetMenu;
  updatedAt: string;
}

/** Item with its category id: what the API accepts when creating or moving a dish. */
export type MenuItemInput = Partial<MenuItem> & { categoryId?: string };

export type BulkAction =
  | { action: "setAvailability"; ids: string[]; value: boolean }
  | { action: "move"; ids: string[]; categoryId: string }
  | { action: "adjustPrice"; ids: string[]; percent: number }
  | { action: "delete"; ids: string[] }
  | { action: "create"; categoryId: string; items: MenuItemInput[] };
