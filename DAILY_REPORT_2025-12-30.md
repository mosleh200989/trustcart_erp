# Daily Work Report — 2025-12-30

## Summary
Today’s work focused on stabilizing the TrustCart ERP customer portal and backend after the **phone-first authentication** change (email optional), plus fixing a sequence of runtime 500s caused by **identity assumptions (email vs id)** and **TypeORM entity registration**.

AI assistance used during the day (per your workflow):
- **GPT-5.2** (GitHub Copilot)
- **Sonnet-4.5**

## High-Level Outcomes
- Customer-scoped backend endpoints were hardened to work when `email` is `null`.
- TypeORM runtime failures related to missing entity metadata were fixed by registering new entities in the global entity list.
- Loyalty Wallet support was extended toward UUID customers (schema + backend + frontend typing alignment).

## Timeline / Worklog (What Was Done)

### 1) UI + stability improvements (storefront / customer portal)
- Improved storefront UI around “Deal of the Day” (layout/styling polish).
- Fixed frontend runtime crashes (null-guarding on pages that were failing due to missing fields).

### 2) Product images + product details improvements
- Admin product editing: `additional_info` moved from raw JSON textarea into a **key/value UI**, persisted as JSONB.
- Added database support for product images via a `product_images` table.
- Backend image fallback: if no explicit primary image is present, a sensible fallback is returned.
- Product details page enhanced with slider + CTA buttons.

### 3) Customer auth model change (critical)
- Implemented **phone required + unique**, and **email optional**.
- Login updated to accept identifier (email or phone).
- Handled migration edge cases (duplicate phone, aborted transaction) and resolved a TypeORM column-type inference issue.

### 4) Customer profile + family members stabilization
- Profile page updated:
  - phone read-only
  - email editable
- Family member relationship values were constrained to match DB check constraint (preventing 500s).

### 5) Addresses 500 fix (root cause: email nullable)
Problem:
- Customer address endpoints were failing with:
  - `Customer not found with email: null`

Fix:
- Updated backend address controller to identify customer by **`req.user.id`** (UUID) instead of `req.user.email`.

Key backend changes:
- `backend/src/modules/customers/customer-addresses.controller.ts`
  - Added a helper pattern to fetch customer ID from JWT (`req.user.id`) and use it across GET/POST/PUT/DELETE.
- `backend/src/modules/auth/jwt.strategy.ts`
  - Ensured `req.user` includes `id`, plus other useful fields (`phone`, `roleId`, `roleSlug`) for downstream authorization.

### 6) Wallet 500 fix (TypeORM metadata error)
Problem:
- Wallet endpoint failed with:
  - `No metadata for "CustomerWallet" was found`

Root cause:
- The project uses a **hard-coded TypeORM `entities: [...]` list in AppModule**.
- Loyalty entities existed and `TypeOrmModule.forFeature()` was configured, but the entities were not present in the global list → TypeORM could not build metadata.

Fix:
- Registered loyalty entities in the global TypeORM entity list.

Key backend change:
- `backend/src/app.module.ts`
  - Added loyalty entities:
    - `CustomerMembership`, `CustomerWallet`, `WalletTransaction`, `CustomerReferral`, `MonthlyGroceryList`, `GroceryListItem`, `PriceLock`

Result:
- Backend started successfully and mapped loyalty routes.

### 7) Wallet UUID alignment work (ongoing but implemented)
Risk identified:
- Current customers use **UUID primary keys**, but loyalty schema originally assumed **`customer_id INT`**.
- Frontend wallet calls were passing numeric IDs, which is incompatible with UUID customer tokens.

Implemented approach (backward-compatible):
- Add UUID support alongside legacy int support:
  - `customer_wallets.customer_uuid uuid NULL`
  - `wallet_transactions.customer_uuid uuid NULL`
  - Make legacy `customer_id` nullable
  - Use partial unique indexes to preserve uniqueness when values exist

Files added/updated:
- DB migration script added:
  - `backend/loyalty-wallet-uuid-migration.sql`
- Backend entity updates:
  - `backend/src/modules/loyalty/entities/customer-wallet.entity.ts`
  - `backend/src/modules/loyalty/entities/wallet-transaction.entity.ts`
- Backend wallet logic updated to accept **UUID or legacy int**:
  - `backend/src/modules/loyalty/loyalty.service.ts`
  - `backend/src/modules/loyalty/loyalty.controller.ts`
- Frontend typing updated to treat customer IDs as string UUIDs:
  - `frontend/src/services/api.ts`

Note:
- Only wallet + wallet transactions were updated for UUID support in code.
- Other loyalty endpoints (membership/referrals/grocery lists/price locks) still assume numeric customer IDs and may need similar treatment if they are used from the UUID-based customer portal.

## Database / Migration Work

### Loyalty wallet UUID migration
File:
- `backend/loyalty-wallet-uuid-migration.sql`

What it does:
- Adds `customer_uuid` columns
- Drops NOT NULL on `customer_id`
- Drops the existing unique constraint on `customer_id` (constraint name is discovered dynamically)
- Adds partial unique indexes:
  - unique `customer_id` where not null
  - unique `customer_uuid` where not null

### Existing loyalty migration (legacy)
File already present:
- `backend/membership-loyalty-migration.sql`

Key detail:
- Uses `customer_id INT` in multiple loyalty tables, which conflicts with UUID customers unless extended.

## Engineering Notes / Lessons
- After making `email` optional, any endpoint that relied on `req.user.email` will break for phone-only accounts.
- Because TypeORM entities are registered explicitly in `AppModule`, **every new entity must be added to that global `entities: [...]` list**.
- Schema drift (UUID vs INT customer identifiers) is the underlying reason loyalty features may repeatedly fail until aligned.

## Verification Status
- Backend compiles and starts successfully after registering loyalty entities.
- Address endpoints were structurally fixed by switching to JWT `id`.
- Wallet UUID changes were implemented in code + migration script created, but require DB migration execution and an end-to-end retest from the browser.

## Next Steps (Recommended)
1. Apply the DB migration:
   - Run `backend/loyalty-wallet-uuid-migration.sql` against your Postgres database.
2. Retest customer wallet end-to-end:
   - Customer portal `Wallet` page should call `/api/loyalty/wallet/<customer-uuid>`.
3. Extend UUID support to the rest of loyalty module tables if needed:
   - membership, referrals, grocery lists, price locks.
4. Consider enforcing authorization on loyalty endpoints:
   - Current wallet endpoints accept a `:customerId` param; ideally customer portal calls should use `req.user.id` instead of trusting a path param.

## Files Touched (Key)
Backend:
- `backend/src/modules/customers/customer-addresses.controller.ts`
- `backend/src/modules/auth/jwt.strategy.ts`
- `backend/src/app.module.ts`
- `backend/src/modules/loyalty/loyalty.controller.ts`
- `backend/src/modules/loyalty/loyalty.service.ts`
- `backend/src/modules/loyalty/entities/customer-wallet.entity.ts`
- `backend/src/modules/loyalty/entities/wallet-transaction.entity.ts`
- `backend/loyalty-wallet-uuid-migration.sql` (new)

Frontend:
- `frontend/src/services/api.ts`
- `frontend/src/pages/customer/wallet.tsx` (uses `auth.getCurrentUser()` + wallet APIs)

---
Report generated: 2025-12-30
