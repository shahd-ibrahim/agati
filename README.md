# Aghatti (اغاتي) — Iraqi Cuisine · Interactive QR Menu

Luxury, mobile-first bilingual (Arabic RTL default / English LTR) restaurant menu built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4 and Framer Motion.

A calm, warm **light-mode** hospitality menu (cream `#FAF8F5`, white cards, charcoal text, Aghatti turquoise `#17A2B8` only as a small accent), inspired by fine-dining QR menus:

1. **Welcome gate**: the Aghatti logo, a welcome line, and two buttons, **العربية** and **English**. It is shown once per visit.
2. **Menu**:
   - **Top bar:** logo + "قائمة الطعام", an `العربية / English` switch and a **القائمة الشاملة / Full Index** button.
   - **Category strip:** a horizontally scrollable row of rounded thumbnail tiles, with **Set Menu 115 SAR** first, then the 10 categories. The active tile has a turquoise ring.
   - **Search:** a full-width bar (`بحث في القائمة...`) that filters all 80 items and the category names live. Arabic spelling variants match each other (كبه ⇄ كبة).
   - **Dish cards:** the active category heading with its count (`المقبلات الباردة • 8 أصناف`), then horizontal white cards with name, a 2-line description, allergen pills (حليب، قمح، مكسرات، سمسم / بقول…), a `🔥 250 سعرة حرارية` badge, the price (`35.00 ر.س`) and a 96×96 photo.
3. **Dish sheet**: tapping a card opens the full photo with both languages, calories and allergens. Swipe or use the arrows to move through the category.
4. **Full Index**: a text-only list of the Set Menu and every category and dish. Tapping a dish jumps to its category and opens its photo.

Prices and calories use Western digits in both languages, as on the printed menu.

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
  MenuExperience (welcome gate, top bar, category strip, search, dish list), menu/parts, menu/DishModal, menu/FullIndex, QrGate, QrGenerator, AppProvider, ui
lib/
  types.ts, i18n.ts, config.ts, search.ts, menu-store.ts, auth.ts, qr-token.ts
```
