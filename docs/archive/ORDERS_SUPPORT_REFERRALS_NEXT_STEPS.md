# Orders, Support Tickets, Referrals — Audit Notes & Next Steps

This document summarizes the current state of the **Orders**, **Support Tickets**, and **Referrals** features (frontend + backend), what was fixed, and what to implement next.

## 1) Orders

### Current behavior
- Customer portal pages were previously loading **all orders** via `GET /sales` and filtering client-side.
- Backend `GET /sales` returns **snake_case** keys (intended for admin sales UI), while customer portal pages expected **camelCase**.

### Fixes applied
- Added a customer-portal-safe endpoint: `GET /sales/my` (JWT protected) which returns only the authenticated customer’s orders in camelCase shape.
- Updated customer portal pages to use `sales.my()` instead of `sales.list()`.
- Fixed missing frontend API wrapper method: `sales.update()` (order cancel was calling a non-existent method).

### Next improvements
- Add a dedicated cancel endpoint (recommended): `POST /sales/:id/cancel` (JWT protected, checks ownership + allowed statuses).
- Add order status lifecycle validation (e.g. can’t go from `delivered` back to `pending`).
- Consider adding pagination to `GET /sales` and/or admin order search endpoints.

## 2) Support Tickets

### Current behavior
- Customer portal uses `GET /support` (JWT protected) and `POST /support` to create tickets.
- Admin UI uses `GET /support/all` and update routes like `/support/:id/reply`.

### Fixes applied
- Fixed a critical route collision: `GET /support/all` could be captured by `GET /support/:id` depending on route registration order.
- Reduced heavy customer lookups by adding `CustomersService.findByEmail()` and using it in Support controller.
- Protected admin support endpoints with JWT guard.
- Frontend customer support UI now handles backend status value `in_progress` (underscore).

### Next improvements
- Add DTO validation for ticket creation/update (subject length, message length, allowed statuses, allowed priorities).
- Normalize statuses across frontend/backend (`in_progress` recommended everywhere).
- Add audit fields (who replied, who changed status) if needed for operations.

## 3) Referrals

### Current behavior
- Customer referrals page uses the `loyalty` API wrapper.
- Admin loyalty member page was using **hardcoded** `http://localhost:3001/...` fetch calls.

### Fixes applied
- Replaced hardcoded fetch URLs in admin loyalty member page with `apiClient` calls (uses `NEXT_PUBLIC_API_URL` and includes auth token).

### Next improvements
- Ensure referral code generation is server-driven (avoid client-only codes diverging from DB).
- Add admin tooling to manually mark a referral as completed (with safe idempotency).
- Add clear “reward credited” timeline UI and show wallet transaction reference.
