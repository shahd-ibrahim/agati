# Aghatti (اغاتي) — Iraqi Cuisine · Interactive QR Menu

Luxury, mobile-first bilingual (Arabic RTL default / English LTR) restaurant menu built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4 and Framer Motion.

The menu is a **Cosmic Gastronomy Portal** on luxury dark (`#05070B`) in the brand turquoise `#1ECAD3` and light blue `#63D2FF`:

- **Holographic reveal** (1.1s, once per visit): the Aghatti logo flickers in with scan-lines and a light sweep.
- **Category hub**: a 3D parallax starfield, the logo in orbit rings, the `عربي | EN` switch, and a glowing **Set Menu 115 SAR** banner that opens the full 8-course set menu. All 10 categories appear as floating glass portals with magnetic spring tilt and item counts. There is no hidden top tab bar.
- **Warp zoom**: the chosen portal rushes forward, the stars streak and a light burst lands you on the category.
- **Anti-gravity dish stage**: one dish at a time in a large levitating frame (y ±4px, 5s loop). It has a neon-glass SAR price badge, a calorie pill and allergen icons (Spicy, Gluten, Nuts, Dairy, Bean/Seed), glowing left/right arrows, swipe, a **Dish index** drawer for jumping, a tap-to-expand full-size view, and a **← كل الأقسام / All Categories** pill at the top. The phone's back gesture also returns to the hub.
- **Live search** (sticky top bar on every screen): matches Arabic and English dish names, descriptions and category names as you type. Arabic spelling variants match each other (ة/ه, أ/إ/ا, ى/ي, diacritics), so كبه finds كبة. Results show both names, a category badge, calories and price, plus quick chips for matching categories. Tapping a result opens that dish's category, selects the dish and opens its full-size photo.
- **القائمة الشاملة / Full Index** (top pill and a hub card): a text-only list of the Set Menu and all 10 categories, with turquoise section headers and section jump chips. Each row shows the name in both languages, calories and allergens, and the price. Tapping a dish closes the index and opens that dish's photo.
- View-only menu: no cart or online ordering. Animations use `transform`/`opacity` only; the starfield pauses in background tabs and stays still for reduced-motion users.

## Run

```bash
npm install
cp .env.example .env.local   # then edit the values
npm run dev
```

| Route | What it is |
| --- | --- |
| `/` | **QR gate**: "يرجى مسح الباركود الموجود على الطاولة / QR Scan Required" lock screen |
| `/t/12?token=…` | Menu for table 12. The token is an HMAC of the table number, so it can't be guessed or moved to another table |
| `/?qr=…` | Menu without a table (general code, e.g. entrance or takeaway) |
| `/admin` | Password-protected dashboard: categories (add, rename, reorder, corner images), dishes (add, edit, inline price/kcal, availability), bulk actions, bulk add by pasting, signed "View menu" link |
| `/qr-generator` | Admin only. Printable, downloadable QR codes with signed tokens (default tables 1–20, up to 200) |

After a valid scan, access is saved in `sessionStorage` for 6 hours, so reloads and plain `/` keep working in that tab.

## Brand

Logos from the brand Drive folder are in `public/brand/` (`logo-outline`, `logo-main`, `logo-alt`, `brand-1`, `brand-2`, plus `logo-white` and `logo-color`). The `ui-*.png` files are trimmed, web-sized copies used by the UI. `ui-outline-bold.png` (a thicker-stroke `logo-outline.png`) is no longer used by the UI.

Colours were measured from the logo pixels:

| Variable | Hex | Source |
| --- | --- | --- |
| `--brand-turquoise` | `#00ACC8` | calligraphy leaf (most common logo colour) |
| `--brand-bronze` | `#8B6F4C` | wordmark |
| `--brand-light-blue` | `#80D6E4` | **derived**: a 50% tint of the turquoise. The logos have no separate light blue |

## Dish photos

- 30 of the 80 items have a photo that was checked by eye to match the dish. 28 are Unsplash photos stored locally as `public/dishes/u-*.jpg` (1200px), so nothing loads from Unsplash at runtime. `fish.jpg` (Masgouf) comes from the EVO Group portfolio and is **watermarked**.
- The other 50 items (dolma-style dishes, kubbah, desserts, most drinks…) show a designed orbiting-monogram placeholder until a real photo is added in `/admin` (dish → image URL, for example `/dishes/kunafa.jpg` after copying the file into `public/dishes/`).
- `public/dishes/raw/` (about 240 MB of scraped originals) is git-ignored. Delete it before deploying.

## Calories, allergens and set menu

- Prices, calories and allergens come exactly from the supplied menu. 10 items had no calorie figure (Pacha Soup, Spicy Potato, Fresh Orange, Fresh Pomegranate, soft drinks and waters). They show "—" until you enter a value in `/admin`.
- The Set Menu (115 SAR per person) lives in `setMenu` in the menu JSON. It isn't editable in `/admin` yet; edit `data/menu.json` or `data/menu.seed.json` directly.

## Configuration (`.env.local`)

- `ADMIN_PASSWORD`: admin login (default `agati2026`, **change it**)
- `ADMIN_SECRET`: signs the admin session cookie
- `QR_SECRET`: signs table QR tokens. **Changing it invalidates every printed QR code**

Restaurant name / tagline / VAT rate: `lib/config.ts`.

## Data

`data/menu.json` (live, created on the first admin save) and `data/menu.seed.json` (the real Aghatti menu: 10 categories, 80 items, plus `setMenu`) share one shape:

```jsonc
{
  "categories": [
    {
      "id": "fish",
      "name": { "ar": "الأسماك", "en": "Seafood & Fish" },
      "order": 0,
      "coverImage": "/dishes/…jpg",     // portal capsule + category hero
      "items": [
        { "id": "masgouf-fish", "name": { "ar": "…", "en": "…" }, "description": { "ar": "…", "en": "…" },
          "longDescription": { "ar": "…", "en": "…" },   // optional
          "price": 115, "calories": 780,      // calories may be null when unknown (shown as "—")
          "allergens": ["fish"], "image": "/dishes/fish.jpg", "isAvailable": true }
      ]
    }
  ],
  "updatedAt": "…"
}
```

Delete `data/menu.json` to reset to the seed. Older flat `{ categories, items[] }` files are converted automatically when read.

### API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/menu` | Public: the whole menu |
| POST | `/api/menu` | Create a dish (`categoryId` + item fields) |
| PATCH / DELETE | `/api/menu/[id]` | Edit a dish (pass `categoryId` to move it) or delete it |
| POST | `/api/menu/bulk` | `setAvailability`, `move`, `adjustPrice` (±%), `delete`, `create` (up to 500 dishes per call) |
| POST / PUT | `/api/categories` | Create a category / reorder (`{ order: [ids] }`) |
| PATCH / DELETE | `/api/categories/[id]` | Rename or set the cover image / delete (refused while it still has dishes) |

Every write is admin-only and goes through `lib/menu-store.ts`. To use MySQL or PostgreSQL, swap `getMenu` and `mutateMenu` there; the routes and UI stay the same.

### Bulk add format

In `/admin` → **Bulk add**, paste one dish per line:

```
Arabic name | English name | price | kcal | Arabic description | English description | image URL
```

Only the first four fields are required. Tab-separated rows pasted straight from Excel work too.

> Serverless hosts (for example Vercel) have a read-only filesystem. Use a database there, or deploy with `next start` on a VPS.

## Structure

```
app/
  page.tsx, t/[tableId]/page.tsx     menu entry points (server → MenuExperience)
  admin/page.tsx                      dashboard
  qr-generator/page.tsx               QR utility
  api/menu, api/menu/[id]             GET (public) / POST, PATCH, DELETE (admin)
  api/menu/bulk, api/categories       bulk dish operations, category CRUD + reorder
  api/admin/session                   login / logout
components/
  CosmicMenu (portal, category view, dish cards, portal dock), cosmic/Starfield, cosmic/TiltCard, DishLightbox, MenuExperience, QrGate, QrGenerator, AppProvider, ui
lib/
  types.ts, i18n.ts, config.ts, menu-store.ts, auth.ts, qr-token.ts
```
