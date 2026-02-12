# Landing Pages Module — Complete Guide

## Overview

The Landing Pages module lets you create product-focused sales landing pages similar to CartFlows / WooFunnels in WordPress. Each page has a unique slug URL, a full-page marketing layout with sections, an inline order form, and analytics (views + orders).

**Reference design:** `shop.grambanglastore.com/?cartflows_step=gur-powder-6kg`

---

## URL Pattern

| Pattern | Example |
|---------|---------|
| Public page | `https://yourdomain.com/lp/{slug}` |
| Admin list | `https://yourdomain.com/admin/landing-pages` |
| Admin editor | `https://yourdomain.com/admin/landing-pages/{id}` |
| Create new | `https://yourdomain.com/admin/landing-pages/create` |
| API (admin) | `GET/POST/PUT/DELETE /api/landing-pages` |
| API (public) | `GET /api/landing-pages/public/slug/{slug}` |

### Why `/lp/{slug}` instead of query params?

The reference site uses `?cartflows_step=gur-powder-6kg` — that's a WordPress plugin quirk. Clean paths (`/lp/seed-mix`) are better for:
- **SEO** — search engines prefer clean URLs
- **Social sharing** — looks professional when shared on Facebook/WhatsApp
- **Analytics** — easier to track in Google Analytics
- **Short links** — cleaner for QR codes, SMS, etc.

---

## Architecture

### Backend (NestJS)

```
backend/src/modules/landing-pages/
├── landing-page.entity.ts      — TypeORM entity with JSONB sections & products
├── landing-pages.service.ts    — CRUD + stats + view/order counting
├── landing-pages.controller.ts — REST API (public + admin endpoints)
└── landing-pages.module.ts     — NestJS module registration
```

Registered in `app.module.ts` as `LandingPagesModule`.

### Frontend (Next.js)

```
frontend/src/pages/
├── admin/landing-pages/
│   ├── index.tsx      — Admin listing with stats dashboard
│   ├── [id].tsx       — Full editor (General, Sections, Products, Settings, SEO tabs)
│   └── create.tsx     — Create page (reuses [id].tsx editor)
└── lp/
    └── [slug].tsx     — Public landing page renderer
```

### Database

```sql
-- Table: landing_pages
-- Migration: db/migrations/create_landing_pages.sql
-- Run: run-landing-pages-migration.bat
```

---

## How to Create a New Landing Page

### Step 1 — Admin Panel

1. Log in to the admin panel
2. Click **"Landing Pages"** in the left sidebar (rocket icon 🚀)
3. Click **"New Landing Page"**
4. Fill in the tabs:

| Tab | What to configure |
|-----|-------------------|
| **General** | Title, slug, description, hero image/title/subtitle, colors |
| **Page Sections** | Add any combination of: Hero, Benefits, Trust, CTA, Images, Custom HTML |
| **Products** | Add product variants with name, price, compare price, image |
| **Settings** | Phone number, delivery options, COD, scheduling, active/inactive |
| **SEO** | Meta title, meta description, OG image for social sharing |

5. Click **Save**
6. Click **Preview** to open the public page in a new tab

### Step 2 — Share the URL

Your landing page is live at: `https://yourdomain.com/lp/{slug}`

Share this URL via:
- Facebook/Instagram ads
- WhatsApp messages
- SMS campaigns
- QR codes on physical materials
- Google Ads

---

## How to Add More Landing Pages in the Future

1. Go to **Admin → Landing Pages**
2. Click **"New Landing Page"**
3. Or click the **Duplicate** button (copy icon) on an existing page to clone it
4. Modify the content and save

That's it — no code changes needed. The system is fully dynamic.

---

## Page Sections System

Each landing page has a flexible sections builder. Available section types:

| Type | Description | Use Case |
|------|-------------|----------|
| `hero` | Full-width banner with title + content | Mid-page emphasis blocks |
| `benefits` | Grid of icon + text items | Product benefits, features list |
| `trust` | Checklist-style items | "Why choose us" section |
| `cta` | Call to action with button | "Order now" prompts |
| `images` | Image gallery grid | Product photos, before/after |
| `custom-html` | Raw HTML content | Any custom content |

Sections can be:
- **Reordered** with up/down arrows
- **Hidden** without deleting (eye icon)
- **Customized** with individual background and text colors
- **Deleted** entirely

---

## API Reference

### Public Endpoints (No Auth Required)

```
GET  /api/landing-pages/public/active          — List all active landing pages
GET  /api/landing-pages/public/slug/{slug}     — Get page by slug (increments view count)
POST /api/landing-pages/{id}/increment-order   — Increment order count
```

### Admin Endpoints (JWT + Permission Required)

```
GET    /api/landing-pages                — List all pages
GET    /api/landing-pages/stats          — Get aggregate stats
GET    /api/landing-pages/{id}           — Get single page
POST   /api/landing-pages               — Create page
PUT    /api/landing-pages/{id}           — Update page
DELETE /api/landing-pages/{id}           — Delete page
PUT    /api/landing-pages/{id}/toggle    — Toggle active status
POST   /api/landing-pages/{id}/duplicate — Duplicate a page
```

Required permission: `manage-system-settings`

---

## Database Schema

```sql
CREATE TABLE landing_pages (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,      -- URL identifier
    description TEXT,
    hero_image_url VARCHAR(500),
    hero_title VARCHAR(255),
    hero_subtitle TEXT,
    hero_button_text VARCHAR(100),
    primary_color VARCHAR(50),              -- Theme colors
    secondary_color VARCHAR(50),
    background_color VARCHAR(50),
    meta_title VARCHAR(500),                -- SEO
    meta_description TEXT,
    og_image_url VARCHAR(500),
    sections JSONB DEFAULT '[]',            -- Flexible page sections
    products JSONB DEFAULT '[]',            -- Product variants
    phone_number VARCHAR(20),
    whatsapp_number VARCHAR(255),
    show_order_form BOOLEAN DEFAULT true,
    cash_on_delivery BOOLEAN DEFAULT true,
    free_delivery BOOLEAN DEFAULT false,
    delivery_note TEXT,
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,               -- Analytics
    order_count INT DEFAULT 0,
    start_date TIMESTAMP,                   -- Scheduling
    end_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Deployment Checklist

1. **Run the migration:**
   ```bash
   # Option A: Use the batch file
   run-landing-pages-migration.bat

   # Option B: Manual
   psql -U postgres -d trustcart_erp -f db/migrations/create_landing_pages.sql
   ```

2. **Rebuild backend:**
   ```bash
   cd backend && npm run build
   ```

3. **Rebuild frontend:**
   ```bash
   cd frontend && npm run build
   ```

4. **Upload images** to `frontend/public/` or Cloudinary and reference them in the admin editor.

5. **Create your first landing page** in the admin panel.

---

## SEO Best Practices for Landing Pages

1. **Set a descriptive meta title** — e.g., "প্রিমিয়াম সিড মিক্স - স্বাস্থ্যকর স্ন্যাকিং | TrustCart"
2. **Write a compelling meta description** — under 160 characters
3. **Upload an OG image** — 1200×630px for social sharing
4. **Use descriptive slugs** — `/lp/seed-mix` not `/lp/page-1`
5. **Keep the page fast** — optimize images before uploading

---

## Connecting Landing Page Orders to the Main Order System

Currently, the landing page order form is standalone (records view/order counts). To fully integrate with the main sales order system:

1. In the order form submit handler (`frontend/src/pages/lp/[slug].tsx`), call the main sales order API instead of just incrementing counts:
   ```typescript
   // Replace the simple increment with:
   await apiClient.post('/sales/orders', {
     customer_name: orderForm.name,
     customer_phone: orderForm.phone,
     shipping_address: orderForm.address,
     district: orderForm.district,
     items: orderItems.map(item => ({
       product_name: item.product.name,
       product_id: item.product.product_id, // if linked to real product
       quantity: item.quantity,
       unit_price: item.product.price,
     })),
     source: 'landing-page',
     landing_page_slug: page.slug,
     payment_method: 'cod',
   });
   ```

2. Add a `product_id` field in the admin product editor to link landing page products to real inventory products.

---

## Advanced: Custom Domain / Subdomain Routing

For production, you may want URLs like `shop.yourdomain.com/seed-mix` instead of `yourdomain.com/lp/seed-mix`.

### Option A: Nginx Rewrite (Recommended)

```nginx
# In your nginx config
location ~ ^/([a-z0-9-]+)$ {
    # Check if it's a landing page slug
    proxy_pass http://frontend_server/lp/$1;
}
```

### Option B: Next.js Rewrites

In `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/p/:slug',  // or any pattern you prefer
      destination: '/lp/:slug',
    },
  ];
}
```

### Option C: Query Param Style (like grambanglastore)

If you want `?cartflows_step=seed-mix` style URLs for compatibility:

In `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/',
      has: [{ type: 'query', key: 'cartflows_step' }],
      destination: '/lp/:cartflows_step',
    },
  ];
}
```

Then `yourdomain.com/?cartflows_step=seed-mix` → renders `/lp/seed-mix`.

---

## File Summary

| File | Purpose |
|------|---------|
| `backend/src/modules/landing-pages/landing-page.entity.ts` | Database entity |
| `backend/src/modules/landing-pages/landing-pages.service.ts` | Business logic |
| `backend/src/modules/landing-pages/landing-pages.controller.ts` | API endpoints |
| `backend/src/modules/landing-pages/landing-pages.module.ts` | NestJS module |
| `backend/src/app.module.ts` | Module registration (updated) |
| `frontend/src/pages/admin/landing-pages/index.tsx` | Admin list + stats |
| `frontend/src/pages/admin/landing-pages/[id].tsx` | Admin editor (5-tab) |
| `frontend/src/pages/admin/landing-pages/create.tsx` | Create page entry |
| `frontend/src/pages/lp/[slug].tsx` | Public landing page |
| `frontend/src/layouts/AdminLayout.tsx` | Sidebar menu (updated) |
| `db/migrations/create_landing_pages.sql` | Database migration + seed |
| `run-landing-pages-migration.bat` | Migration runner |
| `LANDING_PAGES_GUIDE.md` | This guide |
