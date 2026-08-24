# Storefronts (multi-brand sites)

A **storefront** is a customer-facing brand website (own domain, own design)
that sells products from the shared TrustCart inventory. First storefront:
**Handsome Man** (`handsomemanbd.com`).

## Design decisions (2026-08-22)

| Decision | Choice |
|---|---|
| Orders | Reuse `POST /sales` with `order_source = <storefront slug>`. No new order table. |
| Products | Picked from inventory via `storefront_products` join table. `product_id` always required. |
| Prices | No per-storefront override — TrustCart's `base_price`/`sale_price` shown as-is. |
| Categories | Per-storefront `storefront_categories` table. Main `categories` table untouched. |
| Meta pixel / CAPI | Per-storefront columns on `storefronts` (pixel id, CAPI token, test code). CAPI reads them in `MetaCapiService.getStorefrontPixelConfig()`. |
| Frontend | Same Next.js app. Hand-coded template per storefront (like landing page templates). HM lives in `frontend/src/pages/hm/` + `frontend/src/components/storefronts/handsomeman/`. |
| Routing | `frontend/src/middleware.ts` maps the domain to the `/hm/*` page tree with clean URLs. |

## Data model

- `storefronts` — one row per brand site (domain, template, theme, pixel, delivery charges, contact, SEO).
- `storefront_categories` — category tree scoped by `storefront_id`; unique `(storefront_id, slug)`.
- `storefront_products` — listing table: `(storefront_id, product_id)` unique, plus category, sort, publish/feature flags.

Migration: `db/migrations/2026-08-22-create-storefronts.sql` (idempotent, seeds Handsome Man + permissions).

## API

Admin (JWT + permissions `view-storefronts` / `manage-storefronts` / `delete-storefronts`):

- `GET/POST /storefronts`, `GET/PUT/DELETE /storefronts/:id`
- `GET/POST /storefronts/:id/categories`, `PUT/DELETE /storefronts/:id/categories/:categoryId`
- `GET/POST /storefronts/:id/products`, `PUT/DELETE /storefronts/:id/products/:listingId`

Public (no auth, consumed by the brand site):

- `GET /storefronts/public/:slug/config` — storefront + active categories (CAPI token stripped)
- `GET /storefronts/public/:slug/products?category=&search=&featured=`
- `GET /storefronts/public/:slug/products/:productSlug`

## Admin UI

Sidebar group **Storefronts** holds everything customer-facing that isn't the
main TrustCart site:

- **All Storefronts** → `/admin/storefronts`  (permission `view-storefronts`)
- **Landing Pages** → `/admin/landing-pages`  (permission `view-landing-pages`)
- **LP Maker** → `/admin/lp-maker`  (permission `view-landing-pages`)

A user holding only the permissions for some entries sees only those.

## LP Maker (drag-and-drop page builder)

Builder pages ARE landing pages: rows in `landing_pages` with
`template = 'builder'` and their block tree in the `builder_blocks` jsonb
column (migration `db/migrations/2026-08-24-add-builder-blocks.sql`). They
inherit everything landing pages have — public URL `/lp/<slug>`, orders into
Sales with `order_source = 'landing_page'`, view/order counters,
duplicate/toggle/delete, per-page delivery charges, phone/WhatsApp buttons.

- Editor: `/admin/lp-maker/<id>` — palette (click to add), canvas
  (drag to reorder via `@hello-pangea/dnd`, click to select, hover toolbar),
  settings panel driven by each block's field schema.
- Block registry: `frontend/src/components/lp-maker/blocks.ts` — add a new
  block type there (defaults + fields) plus a render case in
  `BlockRenderer.tsx`; the settings panel needs no changes.
- Shared renderer: `BlockRenderer.tsx` is used by the canvas AND the public
  page, so the preview matches production. The interactive order form lives
  in `BuilderTemplate.tsx` (order-form block → real checkout).
- Delivery charges, phone/WhatsApp, SEO and publish state are in the
  editor's **Page settings** tab (stored on the landing_pages row itself).

- `/admin/storefronts` — list + create.
- `/admin/storefronts/:id` — tabs: **Products** (search inventory → add, per-row category/sort/feature/publish), **Categories** (CRUD), **Settings** (domain, theme, pixel/CAPI, delivery charges, SEO).

## Adding a new storefront later

1. Create the row in `/admin/storefronts` (slug becomes the `order_source`).
2. Hand-code a template: new folder under `frontend/src/components/storefronts/<slug>/` and pages under `frontend/src/pages/<prefix>/`.
3. Map the domain in `frontend/src/middleware.ts` (`STOREFRONT_DOMAINS`).
4. Add the domain to backend CORS (`backend/src/main.ts`) and `DEDICATED_PIXEL_HOSTS` (`frontend/src/pages/_document.tsx`).
5. nginx conf + DNS + certbot (copy `nginx/handsomemanbd.conf`).
