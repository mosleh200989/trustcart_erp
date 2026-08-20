# TrustCart Frontend UX Audit Report

## Customer Ordering Flow Summary

**Current flow:** Homepage → Products Listing → Product Detail → Add to Cart → Cart Page → Checkout → Thank You

---

## 1. CRITICAL ISSUES (Must Fix)

### 1.1 Two Competing Design Systems / Dead Code
The codebase has **two separate navbars, footers, and product cards**:
- **Old system:** `Navbar.tsx`, `Layout.tsx`, `ProductCard.tsx` (Bootstrap-based, emoji icons 📘🐦📷)
- **New system:** `ElectroNavbar.tsx`, `ElectroFooter.tsx`, `ElectroProductCard.tsx` (Tailwind-based, proper icons)

The homepage and all main pages use the **Electro** components, but `Layout.tsx` and `Navbar.tsx` still exist and are imported nowhere in the main flow. The old `Navbar.tsx` links login to `/admin/login` instead of `/customer/login`. **Remove all dead code** to avoid confusion.

### 1.2 Track Order Page is Non-Functional
`track-order.tsx` literally says: *"Order tracking is not fully implemented yet. Please contact support."* This is a prominent nav link — either implement it or remove it from the navigation until ready.

### 1.3 Cart Uses Only localStorage — No Server Sync
The entire cart system (`cart.tsx`, `checkout.tsx`, `ElectroProductCard.tsx`) persists cart data **only in `localStorage`**. This means:
- Cart is lost if user clears browser data or switches devices
- No ability to recover abandoned carts for marketing
- Guest checkout creates customers on-the-fly but cart is never linked server-side before order

### 1.4 Duplicate Auth State Management
There are **three** auth systems in parallel:
- `AuthContext.tsx` (React Context)
- `stores/auth.ts` (Zustand store)
- Direct `localStorage.getItem('user')` and `localStorage.getItem('authToken')` reads in old Navbar

The Zustand store is essentially unused. `ElectroNavbar` calls `auth.getCurrentUser()` API on every mount. Consolidate to one system.

### 1.5 No SEO / Head Tags
None of the public pages (`index.tsx`, `products.tsx`, `[id].tsx`) use `<Head>` from `next/head`. There are **zero** meta titles, descriptions, Open Graph tags, or structured data (JSON-LD for products). This is devastating for an e-commerce site's discoverability.

---

## 2. HIGH-PRIORITY UX ISSUES

### 2.1 Homepage

| Issue | Detail |
|---|---|
| **No skeleton loading** | The page shows nothing while 7 parallel API calls fire (`loadProducts`, `loadCategories`, `loadBanners`, `loadSpecialOffers`, `loadDealOfTheDay`, `loadHotDeals`, `loadCombos`). Only featured products show a spinner. |
| **Excessive horizontal padding on desktop** | `lg:px-48 xl:px-56` makes content extremely narrow on large screens. Content area becomes ~600px on a 1920px screen. |
| **Fake reviews** | `reviews={Math.floor(Math.random() * 200)}` generates random review counts on every render. This is misleading to customers and causes hydration mismatches in Next.js. |
| **Console.log pollution** | Over 15 `console.log` statements left in production code across homepage alone. |
| **Newsletter section commented out** | The newsletter section at the bottom is commented out — either implement or remove. |

### 2.2 Product Listing Page

| Issue | Detail |
|---|---|
| **Client-side filtering only** | ALL products are fetched at once (`/products`), then filtered/sorted client-side. This won't scale beyond a few hundred products. |
| **No URL-based search** | The search input in the filter panel doesn't sync with URL query params, unlike category/sort. If you search and refresh, search is lost. |
| **No "no image" fallback in search dropdown** | If a product has no image, nothing renders (no placeholder). |
| **Pagination shows ALL pages** | For large catalogs, rendering every page button will be unusable. Need truncated pagination (1 2 3 ... 48 49 50). |

### 2.3 Product Detail Page (`[id].tsx`)

| Issue | Detail |
|---|---|
| **No "Out of Stock" prevention** | Users can add out-of-stock items to cart. The product detail page doesn't check stock before `handleAddToCart`. Only the card button is disabled, not the detail page button. |
| **No quantity validation against stock** | Quantity selector has no upper limit. Users can set quantity to 999 even if stock is 5. |
| **Image zoom implementation** | `showZoom` state exists but the actual zoom UI rendering wasn't reviewed — verify this works on mobile. |
| **Share functionality** | Share button exists but no sharing dropdown/panel implementation was visible. |

### 2.4 Cart Page

| Issue | Detail |
|---|---|
| **No stock validation** | Cart items can be quantities that exceed available stock. No real-time stock check. |
| **Line total not shown** | Cart shows unit price per item but not `price × quantity` line total. Users must calculate mentally. |
| **Delivery charge shown as range** | Shows "৳60 – ৳110" with no way to specify which zone — the checkout page does have zone selection, but cart gives unclear expectations. |
| **No coupon/promo code field** | The cart summary has no promo code input. Users only see this at checkout (if at all — it's the `offerCode` field). |

### 2.5 Checkout Page

| Issue | Detail |
|---|---|
| **Cart + Checkout on same page** | The checkout page re-renders the entire cart with edit capability (quantity change, remove items). This is redundant with the cart page and makes the page very long. Consider a more streamlined checkout. |
| **No form validation UX** | Only `required` HTML attribute is used. No inline error messages, no field highlighting, no real-time validation feedback until submit. |
| **No order summary visible on mobile** | The order summary is in a right sidebar that scrolls below on mobile. On long forms, users can't see their total. Consider a sticky mobile summary bar. |
| **Guest checkout creates customer silently** | When a non-logged-in user checks out, a customer record is created via `/customers/public` without informing the user. They have no password and no idea they have an "account." |
| **No address autocomplete** | For a Dhaka-based business, consider integrating address suggestions or at least district/area dropdowns. |

### 2.6 Thank You Page

| Issue | Detail |
|---|---|
| **Generally well-built** | Has order status tracker, upsell offers, recommended products. This is the strongest page in the flow. |
| **No order email confirmation shown** | Page doesn't indicate whether a confirmation email/SMS was sent. |

---

## 3. NAVIGATION & INFORMATION ARCHITECTURE

| Issue | Recommendation |
|---|---|
| **No category navigation from navbar** | Desktop navbar has "ALL CATEGORIES" dropdown, but no mega-menu with subcategories. For grocery, hierarchical browsing is essential. |
| **No breadcrumb on homepage** | Other pages have breadcrumbs, homepage doesn't (expected). But breadcrumbs on cart/checkout use plain text "Home / Cart" instead of clickable links. |
| **Mobile menu missing key items** | Wishlist and Account links are hidden on mobile (only in hamburger menu down in code). Cart icon is the only action visible. |
| **Two registration pages** | Both `/register` and `/customer/register` exist. Which should customers use? Navbar links to `/customer/login` while the old Navbar links to `/admin/login`. |
| **No "Forgot Password" link** | The login page has no password recovery option. |

---

## 4. MOBILE UX

| Issue | Detail |
|---|---|
| **Homepage padding** | `lg:px-48 xl:px-56` is correctly not applied on mobile, but the content jump between mobile and desktop is jarring. |
| **Product card touch targets** | "Add to Cart" button on mobile is quite small (`py-1.5 text-xs`). Should be at least 44px touch target per WCAG. |
| **Search experience** | Mobile search is good (appears below header), but closing results on blur with `setTimeout(200ms)` can cause missed taps on slow connections. |
| **No bottom navigation bar** | Modern e-commerce apps use a sticky bottom nav for Home/Categories/Cart/Account on mobile. Currently all navigation requires opening the hamburger menu. |

---

## 5. PERFORMANCE CONCERNS

| Issue | Detail |
|---|---|
| **No image optimization** | Using raw `<img>` tags everywhere instead of Next.js `<Image>` component. No lazy loading, no responsive srcsets, no WebP/AVIF. |
| **No data caching** | React Query (TanStack Query) is installed in `package.json` but **never used** anywhere. Every page mount re-fetches all data. |
| **framer-motion on every section** | Homepage wraps every section in `<motion.div>` with `whileInView`. While nice, this adds JS overhead. Consider reducing to key sections only. |
| **All products fetched at once** | Both homepage and products page fetch `/products` (all products in DB). Need server-side pagination. |

---

## 6. ACCESSIBILITY (a11y)

| Issue | Detail |
|---|---|
| **No ARIA labels on icon buttons** | Heart (wishlist), Quick View, quantity +/- buttons have no accessible labels. |
| **No focus management** | Modal (AddToCartPopup) doesn't trap focus. Tab key goes behind the modal. |
| **No skip navigation link** | No "Skip to main content" link for keyboard users. |
| **Color contrast** | Orange-on-white text may not meet WCAG AA contrast ratio (4.5:1). Verify `#f97316` on white. |
| **Form labels** | Checkout form labels are associated by position, not by `htmlFor`/`id` attributes. |

---

## 7. DESIGN CONSISTENCY

| Issue | Detail |
|---|---|
| **Mixed CSS approaches** | Some components use inline `style={{}}` (old Navbar, Layout), others use Tailwind classes. The Electro components are consistently Tailwind. |
| **Inconsistent border radius** | Product cards use `rounded-lg`, buttons use `rounded-full` or `rounded-lg`, modals use `rounded-lg` or `rounded-2xl`. |
| **No design token system** | Colors are hardcoded (`text-orange-500`, `bg-gray-900`). Tailwind config could define brand colors as semantic tokens. |
| **Wishlist UX inconsistent** | Wishlist uses only `localStorage` with no visual badge count in navbar (cart has a badge, wishlist doesn't). |

---

## 8. PRIORITIZED RECOMMENDATIONS

### Immediate (Week 1)
1. **Remove dead code** — delete `Navbar.tsx`, `Layout.tsx`, `ProductCard.tsx`, old `index-new.tsx`, `index-electro.tsx`, `products-electro.tsx`, `cart-new.tsx`
2. **Add `<Head>` tags** to all public pages with title, meta description, og:image
3. **Remove fake reviews** — either implement real reviews or remove the rating display
4. **Remove console.logs** from production code
5. **Fix track-order** — either connect to the real backend order status API or hide the nav link

### Short-term (Week 2-3)
6. **Add skeleton loading states** for homepage sections
7. **Implement server-side pagination** for products API
8. **Add stock validation** on add-to-cart and quantity updates
9. **Show line totals** in cart (price × quantity)
10. **Add "Forgot Password"** to customer login
11. **Use Next.js `<Image>`** component for all product images
12. **Add a sticky mobile order summary** on checkout

### Medium-term (Month 1-2)
13. **Consolidate auth** into a single system (AuthContext is the best candidate)
14. **Implement server-side cart** with localStorage as fallback for guests
15. **Add React Query** for data fetching/caching (it's already installed!)
16. **Implement real product search** with debounced API calls and URL sync
17. **Build a mobile bottom navigation bar**
18. **Add address auto-complete** or district/area dropdown for Dhaka

### Long-term
19. **Implement product reviews** system
20. **Add mega-menu** category navigation with subcategories
21. **Progressive Web App (PWA)** support for mobile users
22. **Accessibility audit** — ARIA labels, focus management, contrast ratios
23. **A/B test** single-page checkout vs. multi-step checkout
