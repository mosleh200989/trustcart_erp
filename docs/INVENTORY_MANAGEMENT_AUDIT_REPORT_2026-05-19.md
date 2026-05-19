# Inventory Management Audit Report

**Project:** TrustCart ERP  
**Module:** Inventory Management System, including Warehouse, Supplier, Purchase, Sales integration, reporting, barcode, import, forecasting, and repackaging flows  
**Audit date:** 2026-05-19  
**Auditor:** Codex  
**Status:** Professional module audit based on repository review

---

## 1. Executive Summary

The Inventory Management implementation is substantial and covers most of the operational surface expected from a mature ERP inventory module. The backend includes stock levels, stock movements, reservations, adjustments, transfers, inventory counts, reorder rules, alerts, reports, barcode utilities, demand forecasting, bulk imports, warehouse maps, and repackaging. Supporting modules for warehouses, suppliers, purchase orders, GRNs, and supplier portal access are also present. Both Glowra and Chinova frontends contain a broad admin inventory UI.

The module is functionally ambitious and already integrated with sales order status changes and courier shipment workflows. However, the current implementation should not yet be considered production-hardened for financial or stock-critical operations. The most important risks are stock consistency, transaction boundaries, validation gaps, duplicated denormalized stock updates, incomplete permission seeding, and several query/logic defects that can cause incorrect reporting or stock movement behavior.

**Overall assessment:** Good feature coverage, medium implementation maturity, high operational risk until stock consistency and testing gaps are addressed.

---

## 2. Audit Scope

### Reviewed Areas

- Backend inventory module:
  - `backend/src/modules/inventory`
  - `InventoryService`
  - `StockMovementService`
  - inventory DTOs and entities
- Supporting backend modules:
  - `backend/src/modules/warehouse`
  - `backend/src/modules/supplier`
  - `backend/src/modules/purchase`
  - sales integration points in `backend/src/modules/sales`
- Database migrations:
  - `db/migrations/2026-03-27-inventory-management-phase1.sql`
  - `db/migrations/2026-03-27-inventory-seed-data.sql`
  - related later inventory/accounting migrations where visible
- Frontend inventory admin pages:
  - `frontend-glowra/src/pages/admin/inventory`
  - `frontend-chinova/src/pages/admin/inventory`
  - shared API clients and admin layout entries
- Existing IMS documentation:
  - `docs/INVENTORY_MANAGEMENT_SYSTEM.md`

### Not Performed

- No database runtime verification was performed.
- No API smoke tests were executed.
- No frontend browser testing was performed.
- Git status could not be read because Git rejected the repository as a dubious ownership path in the current shell context.

---

## 3. Implemented Capability Summary

| Area | Current Coverage | Notes |
|---|---:|---|
| Warehouse management | Strong | Warehouse, zone, and location CRUD exist. |
| Supplier management | Moderate | Supplier and supplier-product CRUD exist; supplier portal exists. |
| Purchase orders and GRN | Moderate to strong | PO lifecycle and GRN receipt-to-stock flow exist. |
| Stock levels | Moderate | Stock levels are tracked by product, variant, warehouse, location, and batch in schema, but service lookups often collapse dimensions. |
| Stock movements | Moderate | Central movement service exists, but movement updates do not fully respect composite stock dimensions. |
| Stock reservations | Moderate | Sales reservation and expiry cleanup exist; warehouse/location/batch precision is limited. |
| Sales integration | Partial | Dispatch, cancellation release, and returns are integrated, but failures are logged without blocking order status changes. |
| Adjustments | Moderate | Draft, submit, approve, reject flow exists. Validation and stock guards need strengthening. |
| Transfers | Moderate | Draft, approve, ship, receive, cancel flow exists. Stock transfer edge cases need tighter controls. |
| Inventory counts | Moderate | Count creation, recording, completion, approval exist. Variance valuation and item identity need improvement. |
| Reorder rules and alerts | Moderate | Low stock, overstock, expiry alerts, and auto-PO creation exist. Duplicate prevention is too broad. |
| Reports | Moderate | Valuation, movements, supplier performance, ABC, dead stock, velocity, variance, CSV export exist. Some report queries are incorrect or too coarse. |
| Barcode and labels | Moderate | Barcode generation and lookup exist. Scanner workflows are basic in frontend. |
| Forecasting | Basic | Simple moving-average style forecasting exists. |
| Bulk import | Basic | Product, stock level, and supplier imports exist, but import validation and auditability are limited. |
| Frontend admin UI | Broad | Many pages exist in both brand frontends; type safety and shared code reuse are limited. |

---

## 4. Strengths

1. **Broad ERP-grade scope**
   - The module is not just a stock counter. It includes receiving, batching, reservations, transfers, counting, alerting, reporting, warehouse maps, barcode labels, and repackaging.

2. **Clear modular boundaries**
   - Inventory, purchase, warehouse, and supplier domains are separated into NestJS modules.

3. **Movement ledger concept is present**
   - `stock_movements` provides the foundation for an audit trail and traceability.

4. **Sales integration has begun**
   - Order cancellation releases reservations, shipment dispatch deducts stock, and returns can restock inventory.

5. **Database schema is rich**
   - The schema supports warehouse locations, batches, expiry dates, supplier products, GRNs, reorder rules, reservations, and count variance.

6. **Frontend coverage is unusually complete**
   - Dashboard, alerts, adjustments, transfers, counts, reports, suppliers, warehouses, warehouse map, forecasts, barcode tools, imports, and audit trail pages are implemented for both brand frontends.

---

## 5. Key Findings

### Critical Findings

#### C1. Stock movement updates ignore full stock identity

`StockMovementService.updateStockLevel` looks up stock levels only by `product_id` and `warehouse_id`. It does not include `variant_key`, `location_id`, or `batch_id`, even though the schema has a unique index across those dimensions.

**Impact:** Batch-level, variant-level, and location-level inventory can merge into the wrong stock row. This undermines FEFO, warehouse bin accuracy, count accuracy, and audit trail reliability.

**Recommendation:** Update all stock-level reads and writes to use the full identity tuple:

```text
product_id + variant_key + warehouse_id + location_id + batch_id
```

Where a dimension is optional, handle null semantics explicitly and consistently.

#### C2. Dispatch can double-deduct or under-record stock movement

In `dispatchStock`, batch deduction reduces `stock_batches.remaining_quantity`, then `recordMovement` deducts from `stock_levels`. If remaining quantity still exists after batch deduction, direct stock-level deductions can also occur. Movement creation in the fallback path is conditional on `batches.length === 0`, so partial batch plus non-batch dispatch can become under-audited.

**Impact:** Stock levels, batch quantities, movement logs, and product-level stock can drift apart.

**Recommendation:** Refactor dispatch around one source of deduction truth. Prefer selecting stock-level rows joined to batches, then record one movement per deduction. Avoid separately mutating batch and stock quantities outside a unified transaction model.

#### C3. Inventory side-effects can fail without blocking order state changes

Sales order shipment updates order status and courier history first, then attempts stock dispatch in a `try/catch`. If inventory dispatch fails, the order remains shipped and only a warning is logged.

**Impact:** Orders can be marked shipped without stock being deducted. This is a major reconciliation and fulfillment risk.

**Recommendation:** Make inventory dispatch part of the same business transaction or introduce a compensating workflow that blocks shipment confirmation until stock dispatch succeeds.

#### C4. Audit trail warehouse filter references a non-existent column

The audit trail query filters on `sm.dest_warehouse_id`, while the schema and entity use `destination_warehouse_id`.

**Impact:** Warehouse-filtered audit trail requests can fail at runtime.

**Recommendation:** Replace `dest_warehouse_id` with `destination_warehouse_id` and add regression tests for audit filters.

#### C5. Warehouse map stock join is incorrect

The warehouse map query joins `warehouse_locations` using `wl.id = sl.warehouse_id`. This should use `sl.location_id`.

**Impact:** Warehouse location occupancy and map summaries can be wrong.

**Recommendation:** Join stock levels to locations with `wl.id = sl.location_id`, while separately filtering `sl.warehouse_id`.

---

### High Findings

#### H1. Stock reservations are not precise enough

Reservations store product, variant, warehouse, sales order, and quantity, but not batch or location. Release and fulfillment also update stock levels by product and warehouse only.

**Impact:** Reservations can release or fulfill against a different batch/location than the one originally reserved.

**Recommendation:** Store `stock_level_id`, `batch_id`, and `location_id` on reservations, or reserve directly against exact stock-level rows.

#### H2. Denormalized `products.stock_quantity` is updated in multiple competing ways

The module sometimes increments/decrements `products.stock_quantity` manually and sometimes syncs it from `stock_levels`.

**Impact:** A failure or missed path can cause storefront product stock to differ from actual stock levels.

**Recommendation:** Treat `stock_levels` as source of truth. Replace manual increments/decrements with a single sync function or database trigger/materialized summary.

#### H3. Permission seeding appears incomplete

The phase-1 migration seeds only a small set of inventory permissions. Controllers and frontend routes reference many additional permissions such as `view-inventory`, `manage-stock`, `stock-adjustment`, `stock-transfer`, `approve-stock-adjustment`, and purchase permissions.

**Impact:** Users may see menus but fail API authorization, or admins may need manual permission repair.

**Recommendation:** Create a consolidated RBAC migration for all inventory, warehouse, supplier, purchase, reports, import, barcode, and approval permissions.

#### H4. DTO validation is inconsistent across critical flows

Inventory adjustment, transfer, count, and reorder DTOs use `class-validator`, but purchase order and GRN controllers accept `any`. Repackaging and import endpoints also accept broad `any`.

**Impact:** Invalid quantities, missing items, unexpected fields, negative values, and malformed dates can reach business logic.

**Recommendation:** Add DTOs for PO, PO item, GRN, GRN item, repack config, repack order, import validation, and barcode lookup. Enforce positive numeric quantities.

#### H5. Migration is destructive

`2026-03-27-inventory-management-phase1.sql` drops inventory tables before recreating them.

**Impact:** Running this in the wrong environment can destroy inventory, purchase, warehouse, supplier, and movement data.

**Recommendation:** Replace destructive migration behavior with additive, idempotent migrations. Keep destructive reset scripts clearly separated and named as local/dev-only.

#### H6. Background jobs are implemented with raw `setInterval`

Reservation cleanup, reorder evaluation, and expiry checks are scheduled inside `onModuleInit`.

**Impact:** In a multi-instance deployment, every backend instance may run the same jobs, creating duplicate alerts or duplicate auto-reorder POs.

**Recommendation:** Use Nest scheduler with distributed locking, Bull queue repeatable jobs, or database advisory locks around scheduled jobs.

---

### Medium Findings

#### M1. Reorder alert duplicate prevention is too broad

Duplicate checks look mainly at product and alert type, not always warehouse or variant.

**Impact:** A low-stock alert for one warehouse can suppress a legitimate alert for another warehouse.

**Recommendation:** Match unresolved alerts by `alert_type`, `product_id`, `variant_key`, and `warehouse_id`.

#### M2. Auto-reorder PO numbering is inconsistent

Manual PO numbers use a date-based sequence. Auto-reorder creates `PO-000001` style numbers by parsing digits from the last PO number.

**Impact:** Number collisions and ordering confusion are possible.

**Recommendation:** Centralize document-number generation for PO, GRN, adjustment, transfer, count, movement, and repack order numbers.

#### M3. Inventory count variance value appears incorrectly calculated

Count completion multiplies variance by `variance_value`, but `variance_value` is not reliably populated as unit value.

**Impact:** Count variance financial reporting can be inaccurate.

**Recommendation:** Store unit cost separately or calculate variance value from stock level cost at count time.

#### M4. Frontend admin pages are duplicated across brands

Glowra and Chinova maintain near-identical inventory pages and API clients.

**Impact:** Bug fixes must be repeated and can drift between brands.

**Recommendation:** Extract shared inventory admin components and API types into a common package or shared folder.

#### M5. Existing IMS documentation is stale

`docs/INVENTORY_MANAGEMENT_SYSTEM.md` still describes the module as planning/mock in places, while the code now implements much of the system.

**Impact:** Developers and stakeholders may misunderstand current module readiness.

**Recommendation:** Update the documentation to reflect actual implementation status, known gaps, and operational readiness.

#### M6. Imports bypass movement-ledger standards

Bulk stock-level import writes directly to `stock_levels`.

**Impact:** Opening balances or corrections created by import may not appear in movement history.

**Recommendation:** Treat stock import as an opening balance or stock adjustment workflow and record `stock_movements`.

---

## 6. Architecture Review

### Backend

The backend is well separated at module level. The most important architectural improvement is to make stock mutation flow through one reliable stock transaction service. Today, stock can be changed by:

- `StockMovementService.recordMovement`
- direct `stock_levels` updates
- direct `products.stock_quantity` updates
- direct `stock_batches.remaining_quantity` updates
- import SQL
- GRN SQL
- count approval logic
- repack order completion logic

This is manageable during initial development but risky at ERP scale. A production-grade inventory system should have one mutation path that:

1. Locks exact stock rows.
2. Validates available quantity.
3. Writes stock movement ledger.
4. Updates stock levels.
5. Updates batch quantity where applicable.
6. Syncs or publishes stock summaries.
7. Emits alert/reorder/accounting events.

### Database

The database schema is rich and generally aligned with an ERP inventory model. The main concerns are migration safety, nullable dimension semantics, and the need for stronger constraints around non-negative quantities.

Recommended constraints:

- `quantity >= 0`
- `reserved_quantity >= 0`
- `reserved_quantity <= quantity`
- `remaining_quantity >= 0`
- `quantity_ordered > 0`
- `quantity_received >= 0`
- `reorder_quantity > 0`
- `reorder_point >= 0`

### Frontend

The admin UI covers most expected workflows and is already wired to backend service clients. The main professionalization opportunities are:

- shared typed inventory models
- better loading and empty states
- permission-aware action visibility, not only route visibility
- fewer raw IDs in forms
- improved scanner workflows
- user confirmation for irreversible stock operations
- shared code between Glowra and Chinova

---

## 7. Operational Readiness Assessment

| Category | Rating | Reason |
|---|---:|---|
| Feature completeness | 8/10 | Broad module surface is implemented. |
| Stock accuracy readiness | 4/10 | Core stock identity and mutation consistency issues remain. |
| Security and RBAC readiness | 5/10 | Guards exist, but permissions appear incomplete and inconsistent. |
| Reporting readiness | 5/10 | Many reports exist, but some query defects and valuation concerns remain. |
| Frontend readiness | 6/10 | Broad UI exists, but duplication and type gaps remain. |
| Maintainability | 5/10 | Large services, many raw SQL blocks, duplicated brand UI. |
| Test readiness | 3/10 | No focused inventory test evidence found during audit. |
| Production readiness | 4/10 | Needs hardening before high-volume or financial reliance. |

---

## 8. Recommendations

### Immediate Priority

1. Fix audit trail and warehouse map query defects.
2. Refactor `StockMovementService` to respect variant, location, and batch dimensions.
3. Make shipment stock dispatch atomic with order shipment status changes.
4. Remove direct/manual `products.stock_quantity` updates from business flows.
5. Add guards against negative stock, negative reservations, and over-release.
6. Seed all referenced inventory and purchase permissions.
7. Add tests for GRN receipt, transfer, adjustment, reservation, dispatch, return, count approval, reorder alert, and report filters.

### Short-Term Improvements

1. Add DTOs for all purchase, GRN, repack, import, and reporting endpoints.
2. Centralize document number generation.
3. Use distributed-safe scheduling for cleanup, reorder, and expiry jobs.
4. Add movement-ledger entries for imports and opening balances.
5. Replace frontend raw ID entry fields with searchable selects where possible.
6. Consolidate duplicated frontend inventory pages into reusable components.

### Medium-Term Improvements

1. Introduce a dedicated inventory transaction service.
2. Add stock reconciliation reports comparing:
   - stock levels
   - batch remaining quantities
   - product stock quantity
   - movement ledger balances
3. Introduce stock mutation events for accounting, alerts, cache invalidation, and analytics.
4. Add warehouse-specific stock policies, such as FEFO-only dispatch for expirable goods.
5. Add supplier scorecards using actual GRN timing, rejection rates, and fill rates.

### Long-Term Improvements

1. Add mobile-friendly warehouse workflows for receiving, picking, counting, and transfers.
2. Add barcode scanner-first UX for warehouse operations.
3. Add inventory accounting journals for receipts, dispatch, adjustments, and returns.
4. Add periodic movement ledger reconciliation jobs.
5. Add performance tests for high-concurrency stock reservation and dispatch.

---

## 9. Suggested Test Plan

### Backend Unit and Integration Tests

- Stock movement creates correct movement record and stock-level update for each movement type.
- Movement updates isolate product, variant, warehouse, location, and batch.
- GRN acceptance creates batch, receipt movement, PO item received quantity, and product stock summary.
- Adjustment approval cannot create negative stock.
- Transfer ship deducts only source stock; transfer receive adds only destination stock.
- Inventory count approval applies exact variance once.
- Reservation prevents overselling under concurrent requests.
- Reservation release cannot reduce reserved quantity below zero.
- Dispatch failure prevents shipment confirmation.
- Return restock creates correct movement and updates stock summary.
- Reorder evaluation creates one alert per product, variant, and warehouse.
- Audit trail warehouse filter works.
- Warehouse map location occupancy is accurate.

### Frontend Tests

- Inventory dashboard renders KPI data and empty states.
- Adjustment creation validates required fields and quantity changes.
- Transfer detail page handles partial ship and partial receive.
- Count page saves scanned items and variance reasons.
- Import page validates malformed CSV rows before execution.
- Report export produces expected URLs and handles empty data.

---

## 10. Suggested Implementation Roadmap

### Phase 1: Stabilize Core Accuracy

- Fix query defects.
- Refactor stock-level identity handling.
- Centralize product stock syncing.
- Add critical backend tests.
- Seed missing permissions.

### Phase 2: Harden Workflows

- Make shipment and inventory dispatch atomic.
- Add DTO validation for purchase, GRN, repack, and import.
- Convert stock imports into auditable opening-balance movements.
- Strengthen adjustment, transfer, and count validation.

### Phase 3: Improve Operations

- Replace raw intervals with distributed-safe scheduled jobs.
- Improve frontend typed models and shared components.
- Add reconciliation reports.
- Update the existing IMS documentation to match the implemented system.

### Phase 4: Production-Grade Inventory

- Add accounting journal integration.
- Add stock mutation events and cache invalidation.
- Add mobile/scanner-first warehouse workflows.
- Add performance and concurrency testing.

---

## 11. Conclusion

The inventory management module has a strong foundation and unusually wide feature coverage for an ERP system. The database model and UI coverage show that the system is designed for real operational use, not merely basic stock tracking.

The biggest issue is not missing features. The biggest issue is trustworthiness of stock state under real operations. Before relying on the module for high-volume fulfillment, accounting, or procurement automation, the team should prioritize stock mutation consistency, audit correctness, permission completeness, validation, and tests.

Once those gaps are addressed, this module can become a professional-grade inventory backbone for TrustCart ERP.

