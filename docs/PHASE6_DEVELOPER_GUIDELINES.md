# Inventory Management System — Phase 6: Developer Guidelines

**Module:** Inventory Management System (IMS)
**Phase:** 6 — Polish & Advanced Features
**Date:** March 28, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [New Backend Endpoints](#2-new-backend-endpoints)
3. [New Entities](#3-new-entities)
4. [New Frontend Pages](#4-new-frontend-pages)
5. [Module Dependencies & Imports](#5-module-dependencies--imports)
6. [Barcode Integration](#6-barcode-integration)
7. [Accounting / COGS](#7-accounting--cogs)
8. [Supplier Portal Auth Flow](#8-supplier-portal-auth-flow)
9. [Bulk Import](#9-bulk-import)
10. [Demand Forecasting](#10-demand-forecasting)
11. [Testing Checklist](#11-testing-checklist)
12. [File Reference](#12-file-reference)
13. [User Guide — How to Use Each Feature](#13-user-guide--how-to-use-each-feature)

---

## 1. Overview

Phase 6 adds polish and advanced features to the IMS. All changes are additive — no existing endpoints, entities, or pages were removed or altered in their behavior.

**Tasks completed (per roadmap Section 15):**

| # | Task | Status |
|---|------|--------|
| 6.1 | Supplier Portal: PO view & confirmation | ✅ Done |
| 6.2 | Barcode label generation (batch, location, PO) | ✅ Done |
| 6.3 | Barcode scanner integration in count/GRN UI | ✅ Done |
| 6.4 | Accounting module integration (COGS journals) | ✅ Done |
| 6.5 | Inventory audit log with full traceability | ✅ Done |
| 6.6 | Demand forecasting (simple moving average) | ✅ Done |
| 6.7 | Warehouse visual map (location layout) | ✅ Done |
| 6.8 | Mobile-responsive warehouse operations | ✅ Done |
| 6.9 | Bulk import (products, stock, suppliers via CSV) | ✅ Done |
| 6.10 | Comprehensive E2E testing | Manual checklist provided below |

---

## 2. New Backend Endpoints

### Supplier Portal (`/supplier-portal`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/supplier-portal/profile` | `supplier-self-service` | Get own supplier profile |
| PUT | `/supplier-portal/profile` | `supplier-self-service` | Update contact/bank info |
| GET | `/supplier-portal/purchase-orders` | `supplier-self-service` | List POs for this supplier |
| GET | `/supplier-portal/purchase-orders/:id` | `supplier-self-service` | PO detail with items |
| POST | `/supplier-portal/purchase-orders/:id/confirm` | `supplier-self-service` | Confirm PO with delivery date |
| GET | `/supplier-portal/catalog` | `supplier-self-service` | List supplier products |
| PUT | `/supplier-portal/catalog/:id` | `supplier-self-service` | Update pricing/MOQ/lead time |

### Barcode (`/inventory/barcode`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/inventory/barcode/generate?text=X&type=code128` | `view-inventory` | Returns PNG image |
| GET | `/inventory/barcode/label/batch/:batchId` | `view-inventory` | Batch label data + barcode text |
| GET | `/inventory/barcode/label/location/:locationId` | `view-inventory` | Location label data |
| GET | `/inventory/barcode/label/po/:poId` | `view-inventory` | PO label data |
| GET | `/inventory/barcode/lookup?code=X` | `view-inventory` | Lookup product/batch/location/PO |

### Forecasting (`/inventory/forecasts`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/inventory/forecasts` | `view-inventory` | List all demand forecasts |
| POST | `/inventory/forecasts/generate` | `manage-stock` | Regenerate SMA forecasts |
| GET | `/inventory/forecasts/accuracy` | `view-inventory` | Forecast vs actual comparison |

### Bulk Import (`/inventory/import`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/inventory/import/validate` | `manage-stock` | Validate rows before import |
| POST | `/inventory/import/execute` | `manage-stock` | Execute import |

**Body schema:** `{ import_type: "products" | "stock_levels" | "suppliers", rows: [...] }`

### Audit Trail & Map

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/inventory/audit-trail` | `view-inventory` | Filtered stock movement history |
| GET | `/inventory/warehouse-map/:warehouseId` | `view-warehouses` | Zone/location/stock visual data |

### Accounting Journals (`/accounting`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/accounting/journals` | `view-ledgers` | List journal entries (filterable) |
| GET | `/accounting/journals/summary` | `view-ledgers` | Aggregated by entry type |
| GET | `/accounting/journals/:id` | `view-ledgers` | Journal with line items |
| POST | `/accounting/journals` | `manage-ledgers` | Create manual journal entry |

---

## 3. New Entities

### `demand_forecasts` table

| Column | Type | Notes |
|--------|------|-------|
| id | PK | Auto-increment |
| product_id | int | FK to products |
| warehouse_id | int | FK to warehouses |
| forecast_period | int | 3, 6, or 12 (months) |
| moving_average_qty | int | SMA of monthly sales |
| historical_std_dev | int | Standard deviation |
| suggested_reorder_qty | int | avg + 1.5 × stddev |
| velocity | varchar(20) | fast / normal / slow / dead |
| forecasted_date | date | Future projection point |
| effective_from | date | Calculation date |
| created_at | timestamp | Auto |

**File:** `backend/src/modules/inventory/entities/demand-forecast.entity.ts`

### `journal_entries` + `journal_lines` tables

- **journal_entries:** journal_number (unique), entry_date, entry_type, description, debit_total, credit_total, status, reference_type, reference_id, posted_by, posted_at, metadata (JSONB)
- **journal_lines:** journal_entry_id (FK), account_code, account_name, description, debit_amount, credit_amount, product_id, warehouse_id

**Files:** `backend/src/modules/accounting/entities/journal-entry.entity.ts`, `journal-line.entity.ts`

---

## 4. New Frontend Pages

| Page | Path | Route |
|------|------|-------|
| Barcode Tools | `pages/admin/inventory/barcode.tsx` | `/admin/inventory/barcode` |
| Demand Forecasts | `pages/admin/inventory/forecasts.tsx` | `/admin/inventory/forecasts` |
| Warehouse Map | `pages/admin/inventory/warehouse-map.tsx` | `/admin/inventory/warehouse-map` |
| Bulk Import | `pages/admin/inventory/import.tsx` | `/admin/inventory/import` |
| Audit Trail | `pages/admin/inventory/audit-trail.tsx` | `/admin/inventory/audit-trail` |
| Supplier Portal | `pages/supplier/dashboard.tsx` | `/supplier/dashboard` (rewritten) |

**All pages are added to the AdminLayout sidebar** under the Inventory section.

---

## 5. Module Dependencies & Imports

### Backend changes to `app.module.ts`

Three new entities added to the global TypeORM entity array:
- `JournalEntry`, `JournalLine` (from accounting)
- `DemandForecast` (from inventory)

### `inventory.module.ts`

`DemandForecast` added to `TypeOrmModule.forFeature([...])` and `forecastRepo` injected into `InventoryService`.

### `accounting.module.ts`

`TypeOrmModule.forFeature([JournalEntry, JournalLine])` added.

### `supplier.module.ts`

`SupplierPortalController` added to the controllers array.

### npm packages added (backend)

- `bwip-js` — Barcode image generation (Code128, EAN-13, QR)
- `csv-parser` — CSV file parsing for bulk import

---

## 6. Barcode Integration

### How barcode generation works

The backend uses `bwip-js` to generate barcode images server-side. The `/inventory/barcode/generate` endpoint returns a PNG buffer with `Content-Type: image/png`.

**Supported types:** `code128` (default), `ean13`, `qrcode`, `datamatrix`

### Frontend scanner input

Two pages have scanner inputs:
- **GRN detail page** (`grns/[id].tsx`): Scanner in the items header. On Enter, calls `/inventory/barcode/lookup` → if product found, adds a new item row.
- **Inventory Count detail page** (`counts/[id].tsx`): Scanner in items header (visible during `in_progress` status). On Enter, looks up product → if found in count items, increments `counted_quantity` by 1.

Hardware barcode scanners typically send keystrokes followed by Enter — this works natively with these inputs.

---

## 7. Accounting / COGS

### Account codes used

| Code | Purpose |
|------|---------|
| `INVENTORY_ASSET` | Debit on receipt, credit on dispatch |
| `ACCOUNTS_PAYABLE` | Credit on receipt (GRN) |
| `COGS` | Debit on sales dispatch |
| `INVENTORY_ADJUSTMENT` | Debit or credit on adjustments |
| `INVENTORY_SHRINKAGE` | Debit on write-offs |

### Service methods for other modules to call

```typescript
// When GRN is accepted:
accountingService.recordStockReceipt(grnId, items, userId);

// When sales order is dispatched:
accountingService.recordSalesDispatch(orderId, items, userId);

// When stock adjustment is approved:
accountingService.recordStockAdjustment(adjustmentId, type, value, userId);
```

> **Note:** These methods are available but not automatically invoked by existing Phase 1–5 flows. To fully integrate, add calls in the GRN acceptance handler, sales dispatch handler, and adjustment approval handler.

---

## 8. Supplier Portal Auth Flow

1. Supplier user logs in via `/supplier/login` with `supplier-account` role.
2. Requests hit `/supplier-portal/*` endpoints.
3. The controller's `getSupplierForUser(userId)` method looks up `suppliers` table by `user_id` column.
4. All endpoints are guarded by `supplier-self-service` permission.
5. Suppliers can only see their own POs and catalog — determined by `supplier_id` matching.

---

## 9. Bulk Import

### Supported import types

| Type | Required columns | Upsert behavior |
|------|-----------------|-----------------|
| `products` | name, sku | Upsert on `sku` (conflict update) |
| `stock_levels` | sku or product_id, warehouse_id, quantity | Upsert on `product_id + warehouse_id` |
| `suppliers` | company_name | Insert only (no conflict key) |

### Workflow

1. Frontend parses CSV client-side (no file upload to server — data sent as JSON array)
2. `POST /inventory/import/validate` — returns `{ valid, errors[] }`
3. `POST /inventory/import/execute` — returns `{ imported, errors[] }`

---

## 10. Demand Forecasting

### Algorithm

- Pulls last 12 months of `sales_dispatch` movements, grouped by product + warehouse + month.
- Calculates Simple Moving Average for 3, 6, and 12-month windows.
- `suggested_reorder_qty = avg + (stddev × 1.5)` (safety stock buffer).
- Velocity classification: `fast` (>100/mo), `normal` (10–100), `slow` (<10), `dead` (0).

### Regeneration

Call `POST /inventory/forecasts/generate`. Old forecasts for the same product+warehouse+period are replaced (delete + insert).

---

## 11. Testing Checklist

Since automated E2E tests are not included, use this manual checklist:

### Supplier Portal
- [ ] Supplier login → redirects to `/supplier/dashboard`
- [ ] PO list shows only POs for the logged-in supplier
- [ ] Confirm button works on `approved`/`sent` POs
- [ ] Profile edit saves and reloads correctly
- [ ] Non-supplier users cannot access `/supplier-portal/*`

### Barcode
- [ ] `/inventory/barcode/generate?text=TEST123` returns a PNG image
- [ ] Batch/location/PO label endpoints return correct data
- [ ] Lookup finds products by SKU, batches by number, locations by code
- [ ] Scanner input in GRN page adds a product row
- [ ] Scanner input in Count page increments quantity

### Forecasting
- [ ] Generate button creates forecasts (check DB)
- [ ] Period filter (3/6/12 months) works
- [ ] Accuracy tab shows comparisons

### Bulk Import
- [ ] Template CSV downloads correctly
- [ ] Validation catches missing required fields
- [ ] Products import with upsert on SKU
- [ ] Stock levels import resolves SKU to product_id

### Audit Trail
- [ ] Shows stock movements with product/warehouse/user names
- [ ] Filters by product_id, warehouse_id, date range work

### Warehouse Map
- [ ] Dropdown loads warehouses
- [ ] Zones and locations render as grid
- [ ] Color coding reflects occupancy

### Accounting
- [ ] `GET /accounting/journals` returns entries
- [ ] Summary groups by entry type
- [ ] Journal detail shows debit/credit lines

---

## 12. File Reference

### Backend — new files

```
backend/src/modules/
├── accounting/
│   └── entities/
│       ├── journal-entry.entity.ts     ← NEW
│       └── journal-line.entity.ts      ← NEW
├── inventory/
│   └── entities/
│       └── demand-forecast.entity.ts   ← NEW
└── supplier/
    └── supplier-portal.controller.ts   ← NEW
```

### Backend — modified files

```
backend/src/
├── app.module.ts                       ← Added 3 entity imports
├── modules/
│   ├── accounting/
│   │   ├── accounting.module.ts        ← Added TypeORM imports
│   │   ├── accounting.service.ts       ← Rewritten with COGS logic
│   │   └── accounting.controller.ts    ← Rewritten with journal endpoints
│   ├── inventory/
│   │   ├── inventory.module.ts         ← Added DemandForecast
│   │   ├── inventory.service.ts        ← Added 12+ Phase 6 methods
│   │   └── inventory.controller.ts     ← Added 12+ Phase 6 endpoints
│   └── supplier/
│       └── supplier.module.ts          ← Registered portal controller
```

### Frontend — new files

```
frontend/src/pages/admin/inventory/
├── barcode.tsx          ← NEW — Barcode tools page
├── forecasts.tsx        ← NEW — Demand forecasting page
├── warehouse-map.tsx    ← NEW — Warehouse visual map page
├── import.tsx           ← NEW — Bulk CSV import page
└── audit-trail.tsx      ← NEW — Inventory audit trail page
```

### Frontend — modified files

```
frontend/src/
├── services/api.ts                     ← Added 7 Phase 6 API objects
├── layouts/AdminLayout.tsx             ← Added 5 sidebar nav items + icons
└── pages/
    ├── supplier/dashboard.tsx          ← Rewritten from placeholder
    └── admin/
        ├── purchase/grns/[id].tsx      ← Added barcode scanner input
        └── inventory/counts/[id].tsx   ← Added barcode scanner input
```

---

## 13. User Guide — How to Use Each Feature

This section is written for all team members. No coding knowledge is needed.

---

### 13.1 How to Create a Warehouse

1. Log in to the admin panel.
2. In the left sidebar, click **Inventory** → **Warehouses**.
3. Click the **"+ Add Warehouse"** button (top-right).
4. Fill in the form:
   - **Name** — Give the warehouse a clear name (e.g., "Main Warehouse Dhaka").
   - **Code** — A short code (e.g., "WH-DHK-01").
   - **Address** — Physical address of the warehouse.
   - **Type** — Select the type (e.g., "main", "distribution", "cold_storage").
   - **Is Active** — Keep checked to make it available for operations.
5. Click **Save**.

**After creating a warehouse**, you should add **Zones** and **Locations** inside it (see below).

---

### 13.2 How to Add Zones and Locations Inside a Warehouse

1. Go to **Inventory** → **Warehouses**.
2. In the warehouse table, find the warehouse you want to configure.
3. Click the **purple map marker icon** (📍) in the **Actions** column — this opens the Zones & Locations view.
4. You will see two sections: **Zones** and **Locations**.

**To add a zone:**
1. Click the **"+ Add Zone"** button (top-right of the Zones section).
2. Fill in:
   - **Name** (e.g., "Cold Zone", "Dry Storage", "Receiving Area")
   - **Type** (ambient, cold, frozen, dry, hazardous)
   - **Temperature Min / Max** (optional — in °C)
   - **Humidity Min / Max** (optional — in %)
   - **Active** — keep checked
3. Click **Create Zone**.

**To add a location:**
1. Click the **"+ Add Location"** button (top-right of the Locations section).
2. Fill in:
   - **Code** (e.g., "A-01-01" for Aisle A, Rack 01, Shelf 01)
   - **Zone** (optional — select which zone this location belongs to)
   - **Aisle, Rack, Shelf, Bin** (optional — helps identify the physical position)
   - **Location Type** (storage, receiving, shipping, returns, quarantine)
   - **Barcode** (optional — can be auto-generated later using Barcode Tools)
3. Click **Create Location**.

**To edit or delete** a zone or location, use the **edit** (pencil) and **delete** (trash) icons in each row.

**Tip:** Use the **Warehouse Map** page (Inventory → Warehouse Map) to see a visual layout of all your zones and locations.

---

### 13.3 How to Add a New Supplier

1. Go to **Inventory** → **Suppliers**.
2. Click **"+ Add Supplier"**.
3. Fill in:
   - **Company Name** (required)
   - **Contact Person**
   - **Email** and **Phone**
   - **Address**
   - **Payment Terms** (e.g., "Net 30")
4. Click **Save**.

**To add many suppliers at once**, use the **Bulk Import** page (Inventory → Bulk Import), select "Suppliers", upload a CSV file.

---

### 13.4 How to Create a Purchase Order

1. Go to **Purchase** → **Purchase Orders**.
2. Click **"+ New Purchase Order"**.
3. Select the **Supplier** and **Warehouse** (where goods will be delivered).
4. Add items:
   - Select a **Product** from the dropdown.
   - Enter the **Quantity** and **Unit Price**.
   - Repeat for all items you want to order.
5. Click **Save as Draft** or **Submit for Approval**.
6. Once approved, the PO can be sent to the supplier.

---

### 13.5 How to Receive Goods (GRN — Goods Received Note)

1. Go to **Purchase** → **Goods Receiving**.
2. Click **"+ New GRN"**.
3. Select the **Purchase Order** you are receiving goods for — this auto-fills the expected items.
4. For each item, enter:
   - **Quantity Received** — how many you actually received.
   - **Quantity Accepted** — how many passed quality check.
   - **Quantity Rejected** — how many were damaged/defective.
   - **Batch Number** — the supplier's batch code (important for traceability).
   - **Expiry Date** — when this batch expires.
5. **Using a barcode scanner?** Place your cursor in the **barcode scanner field** (top of the items list) and scan a product. It will automatically add the product to the list.
6. Click **Save** then submit for QC approval.

---

### 13.6 How to Do an Inventory Count

1. Go to **Inventory** → **Inventory Counts**.
2. Click **"+ New Count"**.
3. Select the **Warehouse** and **Count Type** (full or cycle).
4. Click **Save**, then click **"Start Count"** — this populates the item list from current stock levels.
5. Go physically to the warehouse. For each item:
   - Enter the **Counted Quantity** (what you actually counted on the shelf).
   - If there is a difference from the system quantity, enter a **Reason**.
6. **Using a barcode scanner?** Place your cursor in the **barcode scanner field** (top of the items list) and scan a product. Each scan adds +1 to that product's counted quantity.
7. When done, click **"Complete Count"** — this sends it for review.
8. A manager clicks **"Approve"** to accept the count and automatically adjust stock.

---

### 13.7 How to Use the Barcode Tools

1. Go to **Inventory** → **Barcode Tools**.

**Generate a Barcode:**
1. Click the **"Generate"** tab.
2. Type any text (product SKU, batch number, etc.).
3. Choose the barcode type (Code 128 is the standard).
4. Click **Generate** — the barcode image appears.
5. Click **Download** to save, or **Print** to print directly.

**Look Up a Barcode:**
1. Click the **"Lookup"** tab.
2. Scan or type the barcode code.
3. The system tells you what it belongs to (product, batch, location, or PO).

**Print Labels:**
1. Click the **"Print Labels"** tab.
2. Select the label type (Batch, Location, or Purchase Order).
3. Enter the ID number.
4. Click **Load Label** — the label preview appears with barcode.
5. Click **Print Label**.

---

### 13.8 How to Use Bulk Import

1. Go to **Inventory** → **Bulk Import**.
2. Select what you want to import: **Products**, **Stock Levels**, or **Suppliers**.
3. Click **"Download Template CSV"** — this gives you a sample file with the correct columns.
4. Open the template in Excel or Google Sheets.
5. Fill in your data (one row per item). **Do not change the column headers.**
6. Save as CSV file.
7. Click **"Choose CSV File"** and select your file.
8. The system shows a **preview table** of your data.
9. Click **"Validate"** first — this checks for errors without importing anything.
10. If validation passes (green message), click **"Import"**.
11. The result screen tells you how many rows were imported and if any had errors.

**Important:** For stock levels import, you need either the **Product ID** or the **SKU** (the product must already exist in the system).

---

### 13.9 How to View Demand Forecasts

1. Go to **Inventory** → **Forecasts**.
2. Click **"Generate Forecasts"** to calculate predictions based on your sales history.
3. The table shows:
   - **Avg Monthly Qty** — how much you typically sell per month.
   - **Suggested Reorder** — how much you should order (includes a safety buffer).
   - **Velocity** — whether the product is Fast, Normal, Slow, or Dead moving.
4. Use the **period filter** (3 / 6 / 12 months) to change the analysis window.
5. Click the **"Accuracy Report"** tab to see how past forecasts compared to actual sales.

---

### 13.10 How to Use the Warehouse Map

1. Go to **Inventory** → **Warehouse Map**.
2. Select a warehouse from the dropdown.
3. The page shows all zones as horizontal sections, with locations as color-coded boxes:
   - **Gray** = Empty (no stock)
   - **Yellow** = Low stock
   - **Blue** = Medium stock
   - **Green** = Well stocked
4. Hover over any location box to see exact product count and total quantity.

---

### 13.11 How to View the Audit Trail

1. Go to **Inventory** → **Audit Trail**.
2. You see a log of every stock movement in the system.
3. Use the filters at the top to narrow down:
   - **Product ID** — show movements for a specific product.
   - **Warehouse ID** — show movements in a specific warehouse.
   - **Date From / Date To** — show movements within a date range.
4. Click **"Apply Filters"** to update the list.
5. Each row shows: what moved, who did it, when, from where, to where, and the stock balance before and after.

---

### 13.12 Supplier Portal (For Suppliers)

Suppliers have their own login page at `/supplier/login`.

After logging in, suppliers see three tabs:

1. **Purchase Orders** — View all purchase orders assigned to them.
   - Click **"Confirm"** on any pending PO to accept it.
   - Optionally provide an expected delivery date.

2. **My Catalog** — View and see the products they supply, with pricing and lead time information.

3. **Profile** — View and edit their company contact details.

**Note for admins:** To give a supplier access, create a user account with the "supplier-account" role, and make sure the supplier record has the `user_id` field linked to that user.

---

### 13.13 How to Create a Stock Adjustment

1. Go to **Inventory** → **Adjustments**.
2. Click **"+ New Adjustment"**.
3. Select the **Warehouse** and enter a **Reason** (e.g., "Damaged goods", "Found extra stock").
4. Add items:
   - Select the **Product**.
   - Enter the **Adjustment Quantity** (positive = add stock, negative = remove stock).
5. Click **Save**, then **Submit for Approval**.
6. A manager reviews and approves — stock levels are updated automatically.

---

### 13.14 How to Create a Stock Transfer

1. Go to **Inventory** → **Transfers**.
2. Click **"+ New Transfer"**.
3. Select the **Source Warehouse** (where stock is coming from) and **Destination Warehouse** (where it is going).
4. Add items with quantities.
5. Click **Save** and then **Submit**.
6. When goods physically arrive, the transfer is marked as received and stock levels update in both warehouses.

---

### 13.15 How to Set Up Reorder Rules

1. Go to **Inventory** → **Reorder Rules**.
2. Click **"+ Add Rule"**.
3. Fill in:
   - **Product** — which product to watch.
   - **Warehouse** — which warehouse's stock to monitor.
   - **Reorder Point** — when stock falls below this number, trigger an alert.
   - **Reorder Quantity** — how much to order when restocking.
   - **Preferred Supplier** — who to order from.
   - **Auto-Create PO** — if checked, the system automatically creates a Purchase Order when stock is low (runs every 4 hours).
4. Click **Save**.

**Tip:** Use the **Forecasts** page to help decide what reorder quantities to set.
