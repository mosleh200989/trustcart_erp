# Miscellaneous UX Fixes — Changelog

## Date: 2025-01-XX

### 1. MobileBottomNav Account URL Fix
- **File:** `frontend/src/components/MobileBottomNav.tsx`
- **Change:** Fixed Account nav item URL from `/customer/account` to `/customer/dashboard` to match the actual customer dashboard route used in ElectroNavbar.

### 2. Error Pages — "Go Back" Button
- **Files:** `frontend/src/pages/404.tsx`, `frontend/src/pages/500.tsx`, `frontend/src/pages/_error.tsx`
- **Change:** Added a "Go Back" button (using `router.back()`) alongside the existing "Back to Home" button on all error pages. Uses `FaArrowLeft` icon with a bordered/outlined button style to differentiate from the primary Home button.

### 3. Customer Portal Sidebar — Sticky + Navigation Buttons
- **File:** `frontend/src/layouts/CustomerLayout.tsx`
- **Changes:**
  - Made desktop sidebar sticky (`lg:sticky lg:top-0 lg:h-screen`) so it stays visible while scrolling page content.
  - Added "Home" (link to `/`) and "Go Back" (`router.back()`) buttons at the top of the sidebar, below the logo.
  - Imported `FaArrowLeft` icon for the Go Back button.

### 4. Wishlist — Works Without Login
- **File:** `frontend/src/components/ElectroProductCard.tsx`
- **Change:** Removed the `isAuthenticated` check from `handleAddToWishlist`. Wishlist now works like the cart — fully localStorage-based, no login required. Also now stores `originalPrice` in the wishlist localStorage data for dual pricing support.

### 5. Wishlist Cards — Add to Cart & Buy Now Buttons + Dual Pricing
- **File:** `frontend/src/pages/wishlist.tsx`
- **Changes:**
  - Updated `WishlistItem` interface to include `originalPrice?: number`.
  - Added "Add to Cart" button (orange, uses CartContext `addItem`) and "Buy Now" button (green, adds to cart then navigates to `/checkout`).
  - Display dual pricing: current price in orange + original/base price with strikethrough when a discount exists.
  - Added proper ARIA labels to action buttons.

### 6. Navbar Scroll Direction Show/Hide
- **Files:** `frontend/src/components/ElectroNavbar.tsx`, `frontend/src/components/MobileBottomNav.tsx`
- **Changes:**
  - **ElectroNavbar:** Wrapped entire navbar in a `sticky top-0` container with `transition-transform duration-300`. Scroll direction detection using `requestAnimationFrame` — hides navbar (`-translate-y-full`) on scroll down, shows it (`translate-y-0`) on scroll up. Always visible when near page top (< 80px). Uses 5px scroll threshold to avoid jitter.
  - **MobileBottomNav:** Same scroll direction logic — hides bottom nav (`translate-y-full`) on scroll down, shows it on scroll up. Hooks placed before early return to comply with React rules of hooks.

---

### Technical Notes
- All scroll detection uses `requestAnimationFrame` for performance (no layout thrashing).
- Scroll threshold of 5px prevents jitter from micro-scrolls or touch bouncing.
- Wishlist localStorage format now: `{ id, name, price, originalPrice?, image }`.
- No backend changes required — all modifications are frontend-only.
