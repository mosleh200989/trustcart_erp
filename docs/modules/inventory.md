# TrustCart ERP — Inventory Management System (IMS)

## Complete Technical & Functional Documentation

**Version:** 1.0  
**Date:** March 26, 2026  
**Status:** Planning & Design  
**Authors:** TrustCart Dev Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Objectives](#2-goals--objectives)
3. [System Architecture](#3-system-architecture)
4. [Database Schema & Entity Design](#4-database-schema--entity-design)
5. [Module Structure (Backend)](#5-module-structure-backend)
6. [API Reference](#6-api-reference)
7. [Business Logic & Workflows](#7-business-logic--workflows)
8. [Frontend Pages & UI Design](#8-frontend-pages--ui-design)
9. [RBAC & Permissions](#9-rbac--permissions)
10. [Integration Points](#10-integration-points)
11. [Reports & Analytics](#11-reports--analytics)
12. [Notifications & Alerts](#12-notifications--alerts)
13. [Barcode & Label Support](#13-barcode--label-support)
14. [Performance & Scalability](#14-performance--scalability)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Glossary](#16-glossary)

---

## 1. Executive Summary

The TrustCart Inventory Management System (IMS) is a comprehensive module for managing stock across warehouses, tracking every unit of inventory from procurement through to customer delivery. It integrates deeply with the existing **Products**, **Sales**, **Purchase**, **Accounting**, and **Supplier Portal** modules.

### Current State

| Component | Status |
|-----------|--------|
| Inventory Module (Backend) | Placeholder — mock endpoints only, no entities/DTOs |
| Purchase Module (Backend) | Placeholder — mock endpoints only |
| Product Entity | Has `stock_quantity` field (product-level only) |
| Sales Order Flow | No stock deduction on order placement |
| Frontend Inventory Page | Mock UI shell |
| Frontend Purchase Page | Mock UI shell |
| RBAC Permissions | Inventory Manager role defined with 8+ permissions (not enforced) |
| Supplier Portal | Login + empty dashboard placeholder |

### Target State

A fully operational inventory system with:
- Multi-warehouse stock management with bin/shelf locations
- Real-time stock tracking per product, variant, warehouse, and location
- Complete purchase order lifecycle (draft → approved → received → closed)
- Goods Received Notes (GRN) with quality inspection
- Stock movements: receipts, transfers, adjustments, sales deductions, returns
- Batch/lot tracking with expiry management (critical for organic groceries)
- Cycle counting & full physical inventory
- Reorder point automation with low-stock alerts
- Supplier management with performance scoring
- Complete audit trail for all stock changes
- Integration with Sales (auto-deduction), Accounting (COGS), and Reporting

---

## 2. Goals & Objectives

### 2.1 Business Goals

| # | Goal | Priority |
|---|------|----------|
| G1 | Maintain accurate real-time stock counts across all storage locations | Critical |
| G2 | Prevent overselling by enforcing stock validation at order placement | Critical |
| G3 | Track product batches/lots with expiry dates (organic grocery compliance) | Critical |
| G4 | Automate reorder notifications when stock falls below threshold | High |
| G5 | Provide complete traceability from supplier to customer (farm-to-table) | High |
| G6 | Reduce stock discrepancies through systematic cycle counting | High |
| G7 | Optimize warehouse space utilization through location management | Medium |
| G8 | Enable data-driven purchasing through demand forecasting | Medium |
| G9 | Integrate with accounting for automated COGS calculation | Medium |
| G10 | Support multi-warehouse operations (main warehouse, cold storage, dark stores) | Medium |

### 2.2 Technical Goals

| # | Goal |
|---|------|
| T1 | Zero data loss on stock transactions via database transactions with ACID compliance |
| T2 | Sub-second stock availability checks for e-commerce storefront |
| T3 | Optimistic concurrency control to prevent race conditions on stock updates |
| T4 | Complete audit trail for every stock change (who, what, when, why) |
| T5 | Event-driven architecture for stock alerts and integrations |
| T6 | Horizontal scalability through Redis caching for stock levels |
| T7 | API-first design enabling mobile warehouse apps in the future |

### 2.3 Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Stock check response time | < 200ms (cached), < 500ms (cold) |
| Concurrent stock operations | Support 50+ simultaneous stock updates |
| Audit log retention | 3 years minimum |
| Data consistency | Eventual consistency within 5 seconds for cached values |
| Availability | 99.5% uptime for stock-related endpoints |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Inventory │ │ Purchase │ │ Supplier │ │ Warehouse│ │ Reports  │  │
│  │ Dashboard │ │ Orders   │ │ Mgmt     │ │ Mgmt     │ │ & Alerts │  │
│  └─────┬─────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘  │
└────────┼─────────────┼───────────┼───────────┼───────────┼──────────┘
         │             │           │           │           │
    ─────┼─────────────┼───────────┼───────────┼───────────┼──── REST API
         │             │           │           │           │
┌────────┼─────────────┼───────────┼───────────┼───────────┼──────────┐
│        ▼             ▼           ▼           ▼           ▼          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    NestJS API Gateway                         │   │
│  │        JWT Auth + RBAC PermissionsGuard                      │   │
│  └──────────┬───────────┬────────────┬───────────┬──────────────┘   │
│             │           │            │           │                   │
│  ┌──────────▼──┐ ┌──────▼──────┐ ┌──▼────────┐ ┌▼──────────────┐  │
│  │ Inventory   │ │ Purchase    │ │ Warehouse  │ │ Supplier      │  │
│  │ Module      │ │ Module      │ │ Module     │ │ Module        │  │
│  │             │ │             │ │            │ │               │  │
│  │ - Stock     │ │ - PO CRUD   │ │ - Location │ │ - Profiles    │  │
│  │ - Movements │ │ - GRN       │ │ - Zones    │ │ - Performance │  │
│  │ - Batches   │ │ - Returns   │ │ - Capacity │ │ - Contracts   │  │
│  │ - Counting  │ │ - Approvals │ │ - Mapping  │ │ - Catalog     │  │
│  │ - Alerts    │ │             │ │            │ │               │  │
│  └──────┬──────┘ └──────┬──────┘ └─────┬─────┘ └──────┬────────┘  │
│         │               │              │               │            │
│  ┌──────▼───────────────▼──────────────▼───────────────▼────────┐  │
│  │                     TypeORM Repositories                      │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────▼────────────────────────────────────┐  │
│  │                    PostgreSQL Database                         │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌─────────────────────────┐ │  │
│  │  │ warehouses │ │ stock_levels │ │ stock_movements         │ │  │
│  │  │ locations  │ │ stock_batches│ │ purchase_orders         │ │  │
│  │  │ suppliers  │ │ reorder_rules│ │ goods_received_notes    │ │  │
│  │  │ ...        │ │ ...          │ │ inventory_counts  ...   │ │  │
│  │  └────────────┘ └──────────────┘ └─────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Redis Cache (Stock Level Cache)                  │   │
│  │    stock:product:123  →  { warehouse_1: 50, warehouse_2: 30 }│   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            Bull Queue (Async Jobs)                            │   │
│  │    - Low stock alert notifications                           │   │
│  │    - Stock level cache refresh                               │   │
│  │    - Batch expiry warnings                                   │   │
│  │    - Reorder point evaluation                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          BACKEND (NestJS)                            │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Dependency Graph

```
InventoryModule
├── depends on → ProductsModule (product data, variant info)
├── depends on → WarehouseModule (warehouse/location data)
├── depends on → SupplierModule (supplier data for POs)
├── depends on → AuthModule (JWT authentication)
├── depends on → RbacModule (permission checks)
├── depends on → AuditLogModule (activity logging)
├── consumed by → SalesModule (stock reservation & deduction)
├── consumed by → AccountingModule (COGS integration)
└── consumed by → ReportsModule (inventory reports)

PurchaseModule
├── depends on → InventoryModule (stock receipts)
├── depends on → SupplierModule (supplier selection)
├── depends on → ProductsModule (product catalog)
├── depends on → WarehouseModule (receiving warehouse)
├── depends on → AuthModule + RbacModule
└── consumed by → AccountingModule (AP integration)

WarehouseModule
├── depends on → AuthModule + RbacModule
└── consumed by → InventoryModule, PurchaseModule

SupplierModule
├── depends on → AuthModule + RbacModule
└── consumed by → PurchaseModule, InventoryModule
```

### 3.3 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend Framework | NestJS 10.x | API layer, DI, module system |
| ORM | TypeORM 0.3.17 | Database access, entity mapping |
| Database | PostgreSQL 12+ | Primary data store |
| Cache | Redis (ioredis 5.3.x) | Stock level caching, session |
| Queue | Bull | Async job processing |
| Auth | Passport.js + JWT | Authentication |
| Validation | class-validator + class-transformer | DTO validation |
| Frontend | React 18+ / Vite | Admin UI |
| Styling | Tailwind CSS | Component styling |
| HTTP Client | Axios | API communication |

---

## 4. Database Schema & Entity Design

### 4.1 Entity Relationship Diagram

```
┌──────────────┐     ┌─────────────────┐     ┌───────────────────┐
│  warehouses  │     │warehouse_locations│     │   warehouse_zones │
│──────────────│     │─────────────────│     │───────────────────│
│ id (PK)      │◄──┐ │ id (PK)         │     │ id (PK)           │
│ code         │   │ │ warehouse_id(FK)│────►│ warehouse_id (FK) │
│ name         │   │ │ zone_id (FK)    │────►│ name              │
│ type         │   │ │ aisle           │     │ type (ambient/    │
│ address      │   │ │ rack            │     │       cold/frozen)│
│ city         │   │ │ shelf           │     │ temperature_range │
│ is_active    │   │ │ bin             │     │ is_active         │
│ manager_id   │   │ │ capacity        │     └───────────────────┘
│ ...          │   │ │ is_active       │
└──────┬───────┘   │ └─────────────────┘
       │           │
       │    ┌──────┴──────────┐     ┌─────────────────────┐
       │    │  stock_levels   │     │   stock_batches      │
       │    │─────────────────│     │─────────────────────│
       │    │ id (PK)         │     │ id (PK)             │
       │    │ product_id (FK) │     │ product_id (FK)     │
       │    │ variant_key     │     │ warehouse_id (FK)   │
       │    │ warehouse_id(FK)│     │ batch_number        │
       │    │ location_id(FK) │     │ lot_number          │
       │    │ batch_id (FK)   │     │ supplier_id (FK)    │
       │    │ quantity         │     │ purchase_order_id   │
       │    │ reserved_qty    │     │ manufacturing_date  │
       │    │ available_qty   │     │ expiry_date         │
       │    │ reorder_point   │     │ received_date       │
       │    │ reorder_qty     │     │ initial_quantity    │
       │    │ max_stock_level │     │ remaining_quantity  │
       │    │ cost_price      │     │ cost_price          │
       │    │ updated_at      │     │ status              │
       │    └─────────────────┘     │ quality_status      │
       │                            └─────────────────────┘
       │
┌──────┴───────────────────┐     ┌───────────────────────────┐
│   stock_movements        │     │   inventory_counts         │
│──────────────────────────│     │───────────────────────────│
│ id (PK)                  │     │ id (PK)                   │
│ reference_number         │     │ count_number              │
│ movement_type            │     │ warehouse_id (FK)         │
│ product_id (FK)          │     │ count_type (full/cycle/   │
│ variant_key              │     │            spot)          │
│ batch_id (FK)            │     │ status                    │
│ source_warehouse_id (FK) │     │ started_by                │
│ source_location_id (FK)  │     │ started_at                │
│ dest_warehouse_id (FK)   │     │ completed_at              │
│ dest_location_id (FK)    │     │ approved_by               │
│ quantity                 │     │ approved_at               │
│ unit_cost                │     │ notes                     │
│ reason                   │     └───────────────────────────┘
│ notes                    │
│ related_document_type    │     ┌───────────────────────────┐
│ related_document_id      │     │ inventory_count_items      │
│ performed_by             │     │───────────────────────────│
│ approved_by              │     │ id (PK)                   │
│ created_at               │     │ count_id (FK)             │
│ ...                      │     │ product_id (FK)           │
└──────────────────────────┘     │ variant_key               │
                                 │ location_id (FK)          │
┌──────────────────────┐         │ batch_id (FK)             │
│    suppliers         │         │ system_quantity           │
│──────────────────────│         │ counted_quantity          │
│ id (PK)              │         │ variance                  │
│ code                 │         │ variance_reason           │
│ company_name         │         │ counted_by                │
│ contact_person       │         │ counted_at                │
│ email                │         └───────────────────────────┘
│ phone                │
│ address              │         ┌───────────────────────────┐
│ city                 │         │   reorder_rules           │
│ country              │         │───────────────────────────│
│ tax_id               │         │ id (PK)                   │
│ payment_terms        │         │ product_id (FK)           │
│ lead_time_days       │         │ variant_key               │
│ rating               │         │ warehouse_id (FK)         │
│ status               │         │ reorder_point             │
│ is_active            │         │ reorder_quantity          │
│ user_id (FK)         │         │ max_stock_level           │
│ ...                  │         │ safety_stock              │
└──────────┬───────────┘         │ lead_time_days            │
           │                     │ preferred_supplier_id(FK) │
           │                     │ is_active                 │
           │                     │ auto_reorder              │
           │                     └───────────────────────────┘
           │
┌──────────▼───────────────────┐     ┌──────────────────────────┐
│    purchase_orders           │     │  purchase_order_items     │
│──────────────────────────────│     │──────────────────────────│
│ id (PK)                      │     │ id (PK)                  │
│ po_number                    │     │ purchase_order_id (FK)   │
│ supplier_id (FK)             │     │ product_id (FK)          │
│ warehouse_id (FK)            │     │ variant_key              │
│ status                       │     │ quantity_ordered         │
│ order_date                   │     │ quantity_received        │
│ expected_delivery_date       │     │ unit_price               │
│ actual_delivery_date         │     │ tax_amount               │
│ subtotal                     │     │ line_total               │
│ tax_amount                   │     │ notes                    │
│ shipping_cost                │     └──────────────────────────┘
│ total_amount                 │
│ payment_status               │     ┌──────────────────────────┐
│ payment_terms                │     │ goods_received_notes     │
│ notes                        │     │──────────────────────────│
│ internal_notes               │     │ id (PK)                  │
│ created_by                   │     │ grn_number               │
│ approved_by                  │     │ purchase_order_id (FK)   │
│ approved_at                  │     │ supplier_id (FK)         │
│ cancelled_by                 │     │ warehouse_id (FK)        │
│ cancelled_at                 │     │ received_by              │
│ cancel_reason                │     │ received_date            │
│ created_at                   │     │ status                   │
│ updated_at                   │     │ notes                    │
└──────────────────────────────┘     │ created_at               │
                                     └──────────────────────────┘
                                     ┌──────────────────────────┐
                                     │ grn_items                │
                                     │──────────────────────────│
                                     │ id (PK)                  │
                                     │ grn_id (FK)              │
                                     │ po_item_id (FK)          │
                                     │ product_id (FK)          │
                                     │ variant_key              │
                                     │ quantity_received        │
                                     │ quantity_accepted        │
                                     │ quantity_rejected        │
                                     │ rejection_reason         │
                                     │ batch_number             │
                                     │ lot_number               │
                                     │ manufacturing_date       │
                                     │ expiry_date              │
                                     │ unit_cost                │
                                     │ location_id (FK)         │
                                     │ quality_status           │
                                     │ quality_notes            │
                                     └──────────────────────────┘

┌──────────────────────────────┐
│   stock_transfers            │
│──────────────────────────────│
│ id (PK)                      │
│ transfer_number              │
│ source_warehouse_id (FK)     │
│ dest_warehouse_id (FK)       │
│ status                       │
│ requested_by                 │
│ requested_at                 │
│ approved_by                  │
│ approved_at                  │
│ shipped_at                   │
│ received_at                  │
│ notes                        │
│ created_at                   │
│ updated_at                   │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│   stock_transfer_items       │
│──────────────────────────────│
│ id (PK)                      │
│ transfer_id (FK)             │
│ product_id (FK)              │
│ variant_key                  │
│ batch_id (FK)                │
│ quantity_requested           │
│ quantity_shipped             │
│ quantity_received            │
│ source_location_id (FK)      │
│ dest_location_id (FK)        │
│ notes                        │
└──────────────────────────────┘

┌──────────────────────────────┐
│   stock_adjustments          │
│──────────────────────────────│
│ id (PK)                      │
│ adjustment_number            │
│ warehouse_id (FK)            │
│ adjustment_type              │
│ status                       │
│ reason                       │
│ notes                        │
│ created_by                   │
│ approved_by                  │
│ approved_at                  │
│ created_at                   │
│ updated_at                   │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│   stock_adjustment_items     │
│──────────────────────────────│
│ id (PK)                      │
│ adjustment_id (FK)           │
│ product_id (FK)              │
│ variant_key                  │
│ batch_id (FK)                │
│ location_id (FK)             │
│ quantity_before              │
│ quantity_after               │
│ quantity_change              │
│ unit_cost                    │
│ reason                       │
└──────────────────────────────┘

┌──────────────────────────────┐
│   stock_reservations         │
│──────────────────────────────│
│ id (PK)                      │
│ product_id (FK)              │
│ variant_key                  │
│ warehouse_id (FK)            │
│ batch_id (FK)                │
│ sales_order_id (FK)          │
│ quantity                     │
│ status                       │
│ reserved_at                  │
│ expires_at                   │
│ released_at                  │
│ created_at                   │
└──────────────────────────────┘
```

### 4.2 Detailed Entity Specifications

#### 4.2.1 `warehouses` — Warehouse Master

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment primary key |
| code | VARCHAR(20) | NOT NULL, UNIQUE | Warehouse code (e.g., `WH-MAIN`, `WH-COLD`) |
| name | VARCHAR(150) | NOT NULL | Display name |
| type | VARCHAR(30) | NOT NULL | `main`, `cold_storage`, `dark_store`, `transit` |
| address | TEXT | | Full address |
| city | VARCHAR(100) | | City |
| district | VARCHAR(100) | | District |
| country | VARCHAR(50) | DEFAULT 'Bangladesh' | Country |
| phone | VARCHAR(30) | | Contact phone |
| email | VARCHAR(255) | | Contact email |
| manager_id | INT | FK → users.id | Warehouse manager |
| latitude | DECIMAL(10,7) | | GPS latitude |
| longitude | DECIMAL(10,7) | | GPS longitude |
| total_area_sqft | DECIMAL(10,2) | | Total storage area |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| is_default | BOOLEAN | DEFAULT false | Default receiving warehouse |
| operating_hours | JSONB | | `{ "mon": "08:00-20:00", ... }` |
| notes | TEXT | | Internal notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Created timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Updated timestamp |

**Indexes:** `idx_warehouses_code`, `idx_warehouses_is_active`

#### 4.2.2 `warehouse_zones` — Temperature/Storage Zones

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | Parent warehouse |
| name | VARCHAR(100) | NOT NULL | Zone name (e.g., "Ambient Zone A", "Cold Room 1") |
| type | VARCHAR(30) | NOT NULL | `ambient`, `cold`, `frozen`, `dry`, `hazardous` |
| temperature_min | DECIMAL(5,2) | | Min temperature (°C) |
| temperature_max | DECIMAL(5,2) | | Max temperature (°C) |
| humidity_min | DECIMAL(5,2) | | Min humidity (%) |
| humidity_max | DECIMAL(5,2) | | Max humidity (%) |
| is_active | BOOLEAN | DEFAULT true | Active flag |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `idx_warehouse_zones_warehouse_id`

#### 4.2.3 `warehouse_locations` — Bin/Shelf Locations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | Parent warehouse |
| zone_id | INT | FK → warehouse_zones.id | Parent zone |
| code | VARCHAR(30) | NOT NULL | Location code (e.g., `A-01-03-B`) |
| aisle | VARCHAR(10) | | Aisle identifier |
| rack | VARCHAR(10) | | Rack identifier |
| shelf | VARCHAR(10) | | Shelf identifier |
| bin | VARCHAR(10) | | Bin identifier |
| location_type | VARCHAR(30) | DEFAULT 'storage' | `storage`, `receiving`, `shipping`, `returns`, `quarantine` |
| max_weight_kg | DECIMAL(10,2) | | Weight capacity |
| max_volume_m3 | DECIMAL(10,4) | | Volume capacity |
| is_active | BOOLEAN | DEFAULT true | |
| barcode | VARCHAR(50) | UNIQUE | Scannable barcode |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `idx_wh_locations_warehouse`, `idx_wh_locations_code`, `idx_wh_locations_barcode`  
**Unique:** `(warehouse_id, code)`

#### 4.2.4 `suppliers` — Supplier Master

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| code | VARCHAR(20) | NOT NULL, UNIQUE | Supplier code (e.g., `SUP-001`) |
| company_name | VARCHAR(200) | NOT NULL | Business name |
| company_name_bn | VARCHAR(200) | | Bengali name |
| contact_person | VARCHAR(150) | | Primary contact |
| email | VARCHAR(255) | | Email |
| phone | VARCHAR(30) | | Phone |
| alt_phone | VARCHAR(30) | | Alternate phone |
| address | TEXT | | Full address |
| city | VARCHAR(100) | | City |
| district | VARCHAR(100) | | District |
| country | VARCHAR(50) | DEFAULT 'Bangladesh' | |
| tax_id | VARCHAR(50) | | Tax identification |
| trade_license | VARCHAR(50) | | Trade license number |
| bank_name | VARCHAR(100) | | Bank name |
| bank_account_number | VARCHAR(50) | | Bank account |
| bank_branch | VARCHAR(100) | | Branch |
| payment_terms | VARCHAR(50) | DEFAULT 'net_30' | `cod`, `net_15`, `net_30`, `net_60`, `advance` |
| credit_limit | DECIMAL(12,2) | | Maximum credit |
| lead_time_days | INT | DEFAULT 3 | Average delivery lead time |
| rating | DECIMAL(3,2) | | Performance rating (0.00–5.00) |
| total_orders | INT | DEFAULT 0 | Running total |
| total_amount | DECIMAL(15,2) | DEFAULT 0 | Running total |
| category | VARCHAR(50) | | `organic_produce`, `dairy`, `grains`, `spices`, `packaging`, `general` |
| certifications | JSONB | DEFAULT '[]' | `["organic", "fair-trade", "gmp"]` |
| notes | TEXT | | Internal notes |
| status | VARCHAR(20) | DEFAULT 'active' | `active`, `inactive`, `blacklisted`, `pending_approval` |
| is_active | BOOLEAN | DEFAULT true | |
| user_id | INT | FK → users.id | Link to supplier portal account |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `idx_suppliers_code`, `idx_suppliers_status`, `idx_suppliers_company_name`

#### 4.2.5 `supplier_products` — Supplier-Product Catalog Link

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| supplier_id | INT | FK → suppliers.id, NOT NULL | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | Size variant key (nullable = all variants) |
| supplier_sku | VARCHAR(50) | | Supplier's own SKU |
| unit_price | DECIMAL(10,2) | NOT NULL | Last quoted price |
| min_order_quantity | INT | DEFAULT 1 | MOQ |
| lead_time_days | INT | | Product-specific lead time |
| is_preferred | BOOLEAN | DEFAULT false | Preferred supplier for this product |
| is_active | BOOLEAN | DEFAULT true | |
| last_supplied_at | TIMESTAMP | | Last supply date |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique:** `(supplier_id, product_id, variant_key)`

#### 4.2.6 `stock_levels` — Current Stock per Product/Warehouse/Location

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | Size variant identifier (null = base product) |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| location_id | INT | FK → warehouse_locations.id | Specific shelf/bin |
| batch_id | INT | FK → stock_batches.id | |
| quantity | INT | NOT NULL, DEFAULT 0 | Total physical quantity |
| reserved_quantity | INT | DEFAULT 0 | Reserved for pending orders |
| available_quantity | INT | GENERATED ALWAYS AS (quantity - reserved_quantity) STORED | Sellable stock |
| damaged_quantity | INT | DEFAULT 0 | Damaged but still in location |
| cost_price | DECIMAL(10,2) | | Weighted average cost |
| last_counted_at | TIMESTAMP | | Last physical count date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modification |

**Indexes:** `idx_stock_product_warehouse`, `idx_stock_product`, `idx_stock_warehouse`, `idx_stock_batch`  
**Unique:** `(product_id, variant_key, warehouse_id, location_id, batch_id)`

**Computed column note:** `available_quantity` is a generated column for query performance. Use `quantity - reserved_quantity` directly where generated columns are unavailable.

#### 4.2.7 `stock_batches` — Batch/Lot Tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| batch_number | VARCHAR(50) | NOT NULL | Batch number (from supplier or internal) |
| lot_number | VARCHAR(50) | | Lot number |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| supplier_id | INT | FK → suppliers.id | Source supplier |
| purchase_order_id | INT | FK → purchase_orders.id | Source PO |
| grn_id | INT | FK → goods_received_notes.id | GRN that created this batch |
| warehouse_id | INT | FK → warehouses.id | Current warehouse |
| manufacturing_date | DATE | | Manufacture/harvest date |
| expiry_date | DATE | | Expiry/best-before date |
| received_date | DATE | NOT NULL | Date received in warehouse |
| initial_quantity | INT | NOT NULL | Quantity at time of receiving |
| remaining_quantity | INT | NOT NULL | Current remaining |
| cost_price | DECIMAL(10,2) | NOT NULL | Per-unit cost at receipt |
| status | VARCHAR(20) | DEFAULT 'available' | `available`, `quarantine`, `expired`, `recalled`, `consumed` |
| quality_status | VARCHAR(20) | DEFAULT 'accepted' | `pending`, `accepted`, `rejected`, `conditional` |
| quality_notes | TEXT | | QC inspector notes |
| notes | TEXT | | General notes |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `idx_batch_product`, `idx_batch_expiry`, `idx_batch_status`, `idx_batch_number`  
**Unique:** `(batch_number, product_id, warehouse_id)`

#### 4.2.8 `stock_movements` — Immutable Transaction Log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| reference_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated (e.g., `SM-20260326-0001`) |
| movement_type | VARCHAR(30) | NOT NULL | See movement types below |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| batch_id | INT | FK → stock_batches.id | |
| source_warehouse_id | INT | FK → warehouses.id | Source warehouse (for transfers/dispatch) |
| source_location_id | INT | FK → warehouse_locations.id | |
| destination_warehouse_id | INT | FK → warehouses.id | Destination (for receipts/transfers) |
| destination_location_id | INT | FK → warehouse_locations.id | |
| quantity | INT | NOT NULL | Quantity moved (always positive) |
| unit_cost | DECIMAL(10,2) | | Cost at time of movement |
| total_cost | DECIMAL(12,2) | | quantity × unit_cost |
| balance_before | INT | | Stock before this movement |
| balance_after | INT | | Stock after this movement |
| reason | VARCHAR(255) | | Reason description |
| notes | TEXT | | Additional notes |
| related_document_type | VARCHAR(30) | | `purchase_order`, `sales_order`, `grn`, `transfer`, `adjustment`, `return`, `count` |
| related_document_id | INT | | ID of related record |
| performed_by | INT | FK → users.id, NOT NULL | User who executed |
| approved_by | INT | FK → users.id | Approver (for adjustments) |
| created_at | TIMESTAMP | DEFAULT NOW() | Immutable creation time |

**Movement Types:**

| Type | Direction | Description |
|------|-----------|-------------|
| `receipt` | IN | Goods received from supplier (via GRN) |
| `sales_dispatch` | OUT | Stock dispatched for sales order |
| `sales_return` | IN | Customer return restocked |
| `transfer_out` | OUT | Stock sent to another warehouse |
| `transfer_in` | IN | Stock received from another warehouse |
| `adjustment_increase` | IN | Positive stock adjustment |
| `adjustment_decrease` | OUT | Negative stock adjustment |
| `damage_write_off` | OUT | Damaged goods written off |
| `expiry_write_off` | OUT | Expired goods written off |
| `production_consume` | OUT | Used in production/repackaging |
| `production_output` | IN | Output from production/repackaging |
| `opening_balance` | IN | Initial stock load |
| `count_adjustment` | IN/OUT | Variance correction after inventory count |

**Indexes:** `idx_movement_product`, `idx_movement_type`, `idx_movement_date`, `idx_movement_ref`, `idx_movement_related_doc`

#### 4.2.9 `purchase_orders` — Purchase Order Header

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| po_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated (e.g., `PO-20260326-001`) |
| supplier_id | INT | FK → suppliers.id, NOT NULL | |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | Receiving warehouse |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | See status flow below |
| priority | VARCHAR(10) | DEFAULT 'normal' | `low`, `normal`, `high`, `urgent` |
| order_date | DATE | NOT NULL | Date PO was raised |
| expected_delivery_date | DATE | | Expected delivery |
| actual_delivery_date | DATE | | Actual receive date |
| subtotal | DECIMAL(12,2) | DEFAULT 0 | Sum of line totals |
| tax_amount | DECIMAL(12,2) | DEFAULT 0 | Tax total |
| shipping_cost | DECIMAL(10,2) | DEFAULT 0 | Freight charges |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 | Discount |
| total_amount | DECIMAL(12,2) | DEFAULT 0 | Grand total |
| payment_status | VARCHAR(20) | DEFAULT 'unpaid' | `unpaid`, `partial`, `paid` |
| payment_terms | VARCHAR(50) | | Override from supplier default |
| payment_due_date | DATE | | Payment due |
| currency | VARCHAR(3) | DEFAULT 'BDT' | Currency code |
| notes | TEXT | | Notes for supplier |
| internal_notes | TEXT | | Internal notes |
| terms_and_conditions | TEXT | | PO T&C |
| created_by | INT | FK → users.id, NOT NULL | Creator |
| approved_by | INT | FK → users.id | Approver |
| approved_at | TIMESTAMP | | |
| cancelled_by | INT | FK → users.id | |
| cancelled_at | TIMESTAMP | | |
| cancel_reason | VARCHAR(255) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**PO Status Flow:**

```
draft → pending_approval → approved → partially_received → received → closed
                 │                          │
                 ▼                          ▼
              rejected                   cancelled
```

| Status | Description |
|--------|-------------|
| `draft` | Being prepared, editable |
| `pending_approval` | Submitted for approval |
| `approved` | Approved, sent to supplier |
| `partially_received` | Some items received via GRN |
| `received` | All items received |
| `closed` | Completed and reconciled |
| `rejected` | Approval rejected |
| `cancelled` | Cancelled |

#### 4.2.10 `purchase_order_items` — PO Line Items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| purchase_order_id | INT | FK → purchase_orders.id, NOT NULL | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | Size variant key |
| description | VARCHAR(500) | | Item description override |
| quantity_ordered | INT | NOT NULL | Qty ordered |
| quantity_received | INT | DEFAULT 0 | Qty received (via GRN) |
| unit_price | DECIMAL(10,2) | NOT NULL | Unit cost |
| tax_rate | DECIMAL(5,2) | DEFAULT 0 | Tax % |
| tax_amount | DECIMAL(10,2) | DEFAULT 0 | Tax per line |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 | Line discount |
| line_total | DECIMAL(12,2) | NOT NULL | Computed total |
| expected_delivery_date | DATE | | Per-item date |
| notes | TEXT | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.11 `goods_received_notes` — GRN Header

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| grn_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated (e.g., `GRN-20260326-001`) |
| purchase_order_id | INT | FK → purchase_orders.id | Source PO (null for non-PO receipts) |
| supplier_id | INT | FK → suppliers.id, NOT NULL | |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | Receiving warehouse |
| received_by | INT | FK → users.id, NOT NULL | Receiver |
| received_date | TIMESTAMP | NOT NULL | Actual receipt date/time |
| status | VARCHAR(20) | DEFAULT 'draft' | `draft`, `pending_qc`, `accepted`, `partial_accept`, `rejected` |
| invoice_number | VARCHAR(50) | | Supplier invoice ref |
| invoice_date | DATE | | |
| delivery_note_number | VARCHAR(50) | | Supplier delivery note |
| vehicle_number | VARCHAR(30) | | Vehicle plate |
| driver_name | VARCHAR(100) | | |
| notes | TEXT | | |
| quality_check_required | BOOLEAN | DEFAULT true | |
| quality_checked_by | INT | FK → users.id | |
| quality_checked_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.12 `grn_items` — GRN Line Items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| grn_id | INT | FK → goods_received_notes.id, NOT NULL | |
| po_item_id | INT | FK → purchase_order_items.id | Link to PO item |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| quantity_expected | INT | | From PO item |
| quantity_received | INT | NOT NULL | Actual qty received |
| quantity_accepted | INT | DEFAULT 0 | Passed QC |
| quantity_rejected | INT | DEFAULT 0 | Failed QC |
| rejection_reason | VARCHAR(255) | | |
| batch_number | VARCHAR(50) | | Batch from supplier |
| lot_number | VARCHAR(50) | | Lot number |
| manufacturing_date | DATE | | |
| expiry_date | DATE | | |
| unit_cost | DECIMAL(10,2) | NOT NULL | Actual unit cost |
| location_id | INT | FK → warehouse_locations.id | Target storage location |
| quality_status | VARCHAR(20) | DEFAULT 'pending' | `pending`, `accepted`, `rejected`, `conditional` |
| quality_notes | TEXT | | QC remarks |
| temperature_on_arrival | DECIMAL(5,2) | | For cold chain items (°C) |
| created_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.13 `stock_transfers` — Inter-Warehouse Transfer Header

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| transfer_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated (e.g., `ST-20260326-001`) |
| source_warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| destination_warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'draft' | `draft`, `pending_approval`, `approved`, `in_transit`, `received`, `cancelled` |
| priority | VARCHAR(10) | DEFAULT 'normal' | |
| requested_by | INT | FK → users.id, NOT NULL | |
| requested_at | TIMESTAMP | NOT NULL | |
| approved_by | INT | FK → users.id | |
| approved_at | TIMESTAMP | | |
| shipped_by | INT | FK → users.id | |
| shipped_at | TIMESTAMP | | When stock left source |
| received_by | INT | FK → users.id | |
| received_at | TIMESTAMP | | When stock arrived at destination |
| notes | TEXT | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.14 `stock_transfer_items` — Transfer Line Items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| transfer_id | INT | FK → stock_transfers.id, NOT NULL | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| batch_id | INT | FK → stock_batches.id | |
| quantity_requested | INT | NOT NULL | |
| quantity_shipped | INT | DEFAULT 0 | Actual sent |
| quantity_received | INT | DEFAULT 0 | Actual received |
| source_location_id | INT | FK → warehouse_locations.id | |
| destination_location_id | INT | FK → warehouse_locations.id | |
| notes | VARCHAR(255) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.15 `stock_adjustments` — Adjustment Header

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| adjustment_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| adjustment_type | VARCHAR(30) | NOT NULL | `increase`, `decrease`, `write_off`, `damage`, `expiry`, `recount` |
| status | VARCHAR(20) | DEFAULT 'draft' | `draft`, `pending_approval`, `approved`, `rejected`, `cancelled` |
| reason | VARCHAR(255) | NOT NULL | Mandatory reason |
| notes | TEXT | | |
| total_value_impact | DECIMAL(12,2) | DEFAULT 0 | Financial impact |
| created_by | INT | FK → users.id, NOT NULL | |
| approved_by | INT | FK → users.id | |
| approved_at | TIMESTAMP | | |
| rejected_by | INT | FK → users.id | |
| rejected_at | TIMESTAMP | | |
| rejection_reason | VARCHAR(255) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.16 `stock_adjustment_items` — Adjustment Line Items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| adjustment_id | INT | FK → stock_adjustments.id, NOT NULL | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| batch_id | INT | FK → stock_batches.id | |
| location_id | INT | FK → warehouse_locations.id | |
| quantity_before | INT | NOT NULL | Stock before |
| quantity_after | INT | NOT NULL | Stock after |
| quantity_change | INT | NOT NULL | Can be negative |
| unit_cost | DECIMAL(10,2) | | Cost per unit |
| value_impact | DECIMAL(12,2) | | Financial impact |
| reason | VARCHAR(255) | | Per-item reason |

#### 4.2.17 `inventory_counts` — Physical Count Header

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| count_number | VARCHAR(50) | NOT NULL, UNIQUE | Auto-generated |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| count_type | VARCHAR(20) | NOT NULL | `full`, `cycle`, `spot` |
| scope_zone_id | INT | FK → warehouse_zones.id | For cycle counts |
| scope_category_id | INT | | Category-scoped cycle count |
| status | VARCHAR(20) | DEFAULT 'planned' | `planned`, `in_progress`, `pending_review`, `approved`, `cancelled` |
| started_by | INT | FK → users.id | |
| started_at | TIMESTAMP | | |
| completed_at | TIMESTAMP | | |
| approved_by | INT | FK → users.id | |
| approved_at | TIMESTAMP | | |
| total_items_counted | INT | DEFAULT 0 | |
| total_variances | INT | DEFAULT 0 | Items with discrepancy |
| total_variance_value | DECIMAL(12,2) | DEFAULT 0 | Sum of value discrepancies |
| notes | TEXT | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

#### 4.2.18 `inventory_count_items` — Count Line Items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| count_id | INT | FK → inventory_counts.id, NOT NULL | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| location_id | INT | FK → warehouse_locations.id | |
| batch_id | INT | FK → stock_batches.id | |
| system_quantity | INT | NOT NULL | Expected from system |
| counted_quantity | INT | | Actual counted |
| variance | INT | GENERATED AS (counted_quantity - system_quantity) | Difference |
| variance_value | DECIMAL(12,2) | | Value of discrepancy |
| variance_reason | VARCHAR(255) | | Explanation for variance |
| counted_by | INT | FK → users.id | |
| counted_at | TIMESTAMP | | |
| verified_by | INT | FK → users.id | Second count if needed |
| verified_quantity | INT | | Second count qty |
| status | VARCHAR(20) | DEFAULT 'pending' | `pending`, `counted`, `verified`, `approved` |

#### 4.2.19 `reorder_rules` — Reorder Point Configuration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| warehouse_id | INT | FK → warehouses.id | Null = global |
| reorder_point | INT | NOT NULL | Trigger when available qty drops to this |
| reorder_quantity | INT | NOT NULL | Suggested order quantity |
| max_stock_level | INT | | Maximum stock to hold |
| safety_stock | INT | DEFAULT 0 | Buffer stock |
| lead_time_days | INT | DEFAULT 3 | Expected supplier lead time |
| preferred_supplier_id | INT | FK → suppliers.id | |
| auto_reorder | BOOLEAN | DEFAULT false | Auto-create PO when triggered |
| is_active | BOOLEAN | DEFAULT true | |
| last_triggered_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Unique:** `(product_id, variant_key, warehouse_id)`

#### 4.2.20 `stock_reservations` — Soft Reservation for Pending Orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| product_id | INT | FK → products.id, NOT NULL | |
| variant_key | VARCHAR(100) | | |
| warehouse_id | INT | FK → warehouses.id, NOT NULL | |
| batch_id | INT | FK → stock_batches.id | |
| sales_order_id | INT | FK → sales_orders.id, NOT NULL | |
| quantity | INT | NOT NULL | Reserved qty |
| status | VARCHAR(20) | DEFAULT 'active' | `active`, `fulfilled`, `released`, `expired` |
| reserved_at | TIMESTAMP | DEFAULT NOW() | |
| expires_at | TIMESTAMP | | Auto-release if order not confirmed |
| fulfilled_at | TIMESTAMP | | When dispatch confirmed |
| released_at | TIMESTAMP | | When reservation cancelled |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes:** `idx_reservation_product_warehouse`, `idx_reservation_order`, `idx_reservation_status`

#### 4.2.21 `stock_alerts` — Alert Log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| alert_type | VARCHAR(30) | NOT NULL | `low_stock`, `out_of_stock`, `overstock`, `expiry_warning`, `expiry_critical`, `reorder_triggered` |
| product_id | INT | FK → products.id | |
| variant_key | VARCHAR(100) | | |
| warehouse_id | INT | FK → warehouses.id | |
| batch_id | INT | FK → stock_batches.id | |
| message | TEXT | NOT NULL | Human-readable message |
| severity | VARCHAR(10) | NOT NULL | `info`, `warning`, `critical` |
| is_read | BOOLEAN | DEFAULT false | |
| is_resolved | BOOLEAN | DEFAULT false | |
| resolved_by | INT | FK → users.id | |
| resolved_at | TIMESTAMP | | |
| resolution_notes | VARCHAR(255) | | |
| metadata | JSONB | DEFAULT '{}' | Extra context |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## 5. Module Structure (Backend)

### 5.1 Folder Layout

```
backend/src/modules/
├── inventory/
│   ├── inventory.module.ts
│   ├── inventory.controller.ts
│   ├── inventory.service.ts
│   ├── stock-movement.service.ts
│   ├── stock-level.service.ts
│   ├── stock-alert.service.ts
│   ├── batch-tracking.service.ts
│   ├── inventory-count.service.ts
│   ├── entities/
│   │   ├── stock-level.entity.ts
│   │   ├── stock-movement.entity.ts
│   │   ├── stock-batch.entity.ts
│   │   ├── stock-reservation.entity.ts
│   │   ├── stock-adjustment.entity.ts
│   │   ├── stock-adjustment-item.entity.ts
│   │   ├── stock-transfer.entity.ts
│   │   ├── stock-transfer-item.entity.ts
│   │   ├── inventory-count.entity.ts
│   │   ├── inventory-count-item.entity.ts
│   │   ├── reorder-rule.entity.ts
│   │   └── stock-alert.entity.ts
│   ├── dto/
│   │   ├── create-stock-adjustment.dto.ts
│   │   ├── create-stock-transfer.dto.ts
│   │   ├── create-inventory-count.dto.ts
│   │   ├── record-count-item.dto.ts
│   │   ├── create-reorder-rule.dto.ts
│   │   ├── stock-query.dto.ts
│   │   └── update-stock-level.dto.ts
│   └── interfaces/
│       └── stock-movement.interface.ts
│
├── purchase/
│   ├── purchase.module.ts
│   ├── purchase.controller.ts
│   ├── purchase.service.ts
│   ├── grn.controller.ts
│   ├── grn.service.ts
│   ├── entities/
│   │   ├── purchase-order.entity.ts
│   │   ├── purchase-order-item.entity.ts
│   │   ├── goods-received-note.entity.ts
│   │   └── grn-item.entity.ts
│   └── dto/
│       ├── create-purchase-order.dto.ts
│       ├── update-purchase-order.dto.ts
│       ├── create-grn.dto.ts
│       └── approve-po.dto.ts
│
├── warehouse/
│   ├── warehouse.module.ts
│   ├── warehouse.controller.ts
│   ├── warehouse.service.ts
│   ├── entities/
│   │   ├── warehouse.entity.ts
│   │   ├── warehouse-zone.entity.ts
│   │   └── warehouse-location.entity.ts
│   └── dto/
│       ├── create-warehouse.dto.ts
│       ├── update-warehouse.dto.ts
│       ├── create-zone.dto.ts
│       └── create-location.dto.ts
│
├── supplier/
│   ├── supplier.module.ts
│   ├── supplier.controller.ts
│   ├── supplier.service.ts
│   ├── entities/
│   │   ├── supplier.entity.ts
│   │   └── supplier-product.entity.ts
│   └── dto/
│       ├── create-supplier.dto.ts
│       ├── update-supplier.dto.ts
│       └── supplier-query.dto.ts
```

### 5.2 Module Registration

Each module registers in `app.module.ts`:

```typescript
@Module({
  imports: [
    // ... existing modules
    WarehouseModule,
    SupplierModule,
    InventoryModule,   // depends on Warehouse, Products
    PurchaseModule,    // depends on Supplier, Inventory, Warehouse
  ],
})
export class AppModule {}
```

### 5.3 Service Responsibilities

| Service | Module | Responsibilities |
|---------|--------|------------------|
| `InventoryService` | Inventory | Stock level queries, aggregation, availability checks |
| `StockMovementService` | Inventory | Record all stock movements (receipts, dispatch, transfers, adjustments) |
| `StockLevelService` | Inventory | Real-time stock level management, reservation, release |
| `StockAlertService` | Inventory | Low stock detection, expiry warnings, notification dispatch |
| `BatchTrackingService` | Inventory | Batch/lot lifecycle, FEFO (First Expiry First Out) logic |
| `InventoryCountService` | Inventory | Physical count management, variance calculation |
| `PurchaseService` | Purchase | PO lifecycle management, approval workflow |
| `GrnService` | Purchase | Goods receiving, QC flow, auto-stock-receipt |
| `WarehouseService` | Warehouse | Warehouse/zone/location CRUD |
| `SupplierService` | Supplier | Supplier CRUD, performance tracking, catalog |

---

## 6. API Reference

### 6.1 Warehouse Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/warehouses` | `manage-warehouses` | List all warehouses |
| GET | `/warehouses/:id` | `manage-warehouses` | Get warehouse details |
| POST | `/warehouses` | `manage-warehouses` | Create warehouse |
| PUT | `/warehouses/:id` | `manage-warehouses` | Update warehouse |
| DELETE | `/warehouses/:id` | `manage-warehouses` | Deactivate warehouse |
| GET | `/warehouses/:id/zones` | `manage-warehouses` | List zones in warehouse |
| POST | `/warehouses/:id/zones` | `manage-warehouses` | Create zone |
| PUT | `/warehouses/:warehouseId/zones/:id` | `manage-warehouses` | Update zone |
| GET | `/warehouses/:id/locations` | `manage-warehouses` | List locations |
| POST | `/warehouses/:id/locations` | `manage-warehouses` | Create location |
| PUT | `/warehouses/:warehouseId/locations/:id` | `manage-warehouses` | Update location |
| POST | `/warehouses/:id/locations/bulk` | `manage-warehouses` | Bulk create locations |
| GET | `/warehouses/:id/locations/:locId/stock` | `view-inventory` | Stock at location |

### 6.2 Supplier Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/suppliers` | `view-suppliers` | List all suppliers (paginated, filterable) |
| GET | `/suppliers/:id` | `view-suppliers` | Get supplier details |
| POST | `/suppliers` | `manage-suppliers` | Create supplier |
| PUT | `/suppliers/:id` | `manage-suppliers` | Update supplier |
| DELETE | `/suppliers/:id` | `manage-suppliers` | Deactivate supplier |
| GET | `/suppliers/:id/products` | `view-suppliers` | Supplier product catalog |
| POST | `/suppliers/:id/products` | `manage-suppliers` | Add product to catalog |
| PUT | `/suppliers/:id/products/:spId` | `manage-suppliers` | Update catalog entry |
| DELETE | `/suppliers/:id/products/:spId` | `manage-suppliers` | Remove from catalog |
| GET | `/suppliers/:id/purchase-orders` | `view-purchase-orders` | POs for supplier |
| GET | `/suppliers/:id/performance` | `view-suppliers` | Performance metrics |

### 6.3 Inventory / Stock Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| **Stock Levels** | | | |
| GET | `/inventory/stock-levels` | `view-inventory` | List stock levels (filterable by warehouse, product, category) |
| GET | `/inventory/stock-levels/product/:productId` | `view-inventory` | Stock for a specific product across all warehouses |
| GET | `/inventory/stock-levels/warehouse/:warehouseId` | `view-inventory` | All stock in a warehouse |
| GET | `/inventory/stock-levels/low-stock` | `view-inventory` | Products below reorder point |
| GET | `/inventory/stock-levels/out-of-stock` | `view-inventory` | Products with zero available qty |
| GET | `/inventory/stock-levels/availability/:productId` | Public | Real-time availability check (for storefront) |
| **Stock Movements** | | | |
| GET | `/inventory/movements` | `view-inventory` | List movements (filterable, paginated) |
| GET | `/inventory/movements/:id` | `view-inventory` | Movement detail |
| GET | `/inventory/movements/product/:productId` | `view-inventory` | Movement history for a product |
| **Stock Adjustments** | | | |
| GET | `/inventory/adjustments` | `view-inventory` | List adjustments |
| GET | `/inventory/adjustments/:id` | `view-inventory` | Adjustment detail |
| POST | `/inventory/adjustments` | `stock-adjustment` | Create stock adjustment |
| PUT | `/inventory/adjustments/:id` | `stock-adjustment` | Update draft adjustment |
| POST | `/inventory/adjustments/:id/submit` | `stock-adjustment` | Submit for approval |
| POST | `/inventory/adjustments/:id/approve` | `approve-stock-adjustment` | Approve adjustment |
| POST | `/inventory/adjustments/:id/reject` | `approve-stock-adjustment` | Reject adjustment |
| **Stock Transfers** | | | |
| GET | `/inventory/transfers` | `view-inventory` | List transfers |
| GET | `/inventory/transfers/:id` | `view-inventory` | Transfer detail |
| POST | `/inventory/transfers` | `stock-transfer` | Create transfer request |
| PUT | `/inventory/transfers/:id` | `stock-transfer` | Update draft transfer |
| POST | `/inventory/transfers/:id/approve` | `approve-stock-adjustment` | Approve transfer |
| POST | `/inventory/transfers/:id/ship` | `stock-transfer` | Mark as shipped |
| POST | `/inventory/transfers/:id/receive` | `stock-transfer` | Mark as received |
| POST | `/inventory/transfers/:id/cancel` | `stock-transfer` | Cancel transfer |
| **Batch Tracking** | | | |
| GET | `/inventory/batches` | `batch-tracking` | List batches (filterable) |
| GET | `/inventory/batches/:id` | `batch-tracking` | Batch detail + movement history |
| GET | `/inventory/batches/expiring` | `batch-tracking` | Batches nearing expiry |
| GET | `/inventory/batches/expired` | `batch-tracking` | Expired batches |
| PUT | `/inventory/batches/:id/status` | `batch-tracking` | Update batch status (quarantine, recall) |
| **Inventory Counts** | | | |
| GET | `/inventory/counts` | `view-inventory` | List counts |
| GET | `/inventory/counts/:id` | `view-inventory` | Count detail with items |
| POST | `/inventory/counts` | `manage-stock` | Create new count |
| POST | `/inventory/counts/:id/start` | `manage-stock` | Start counting |
| POST | `/inventory/counts/:id/items` | `manage-stock` | Record counted quantity |
| POST | `/inventory/counts/:id/complete` | `manage-stock` | Submit count for review |
| POST | `/inventory/counts/:id/approve` | `approve-stock-adjustment` | Approve count & apply adjustments |
| **Reorder Rules** | | | |
| GET | `/inventory/reorder-rules` | `view-inventory` | List reorder rules |
| POST | `/inventory/reorder-rules` | `manage-stock` | Create rule |
| PUT | `/inventory/reorder-rules/:id` | `manage-stock` | Update rule |
| DELETE | `/inventory/reorder-rules/:id` | `manage-stock` | Delete rule |
| POST | `/inventory/reorder-rules/evaluate` | `manage-stock` | Manually trigger evaluation |
| **Alerts** | | | |
| GET | `/inventory/alerts` | `view-inventory` | List active alerts |
| GET | `/inventory/alerts/unread-count` | `view-inventory` | Unread alert count |
| POST | `/inventory/alerts/:id/read` | `view-inventory` | Mark alert as read |
| POST | `/inventory/alerts/:id/resolve` | `manage-stock` | Resolve alert |
| POST | `/inventory/alerts/read-all` | `view-inventory` | Mark all as read |

### 6.4 Purchase Order Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/purchase/orders` | `view-purchase-orders` | List POs (filterable, paginated) |
| GET | `/purchase/orders/:id` | `view-purchase-orders` | PO detail with items |
| POST | `/purchase/orders` | `create-purchase-orders` | Create PO |
| PUT | `/purchase/orders/:id` | `edit-purchase-orders` | Update draft PO |
| POST | `/purchase/orders/:id/submit` | `create-purchase-orders` | Submit for approval |
| POST | `/purchase/orders/:id/approve` | `approve-purchase-orders` | Approve PO |
| POST | `/purchase/orders/:id/reject` | `approve-purchase-orders` | Reject PO |
| POST | `/purchase/orders/:id/cancel` | `edit-purchase-orders` | Cancel PO |
| GET | `/purchase/orders/:id/grns` | `view-purchase-orders` | GRNs for this PO |
| POST | `/purchase/orders/:id/duplicate` | `create-purchase-orders` | Duplicate PO as draft |
| GET | `/purchase/orders/:id/pdf` | `view-purchase-orders` | Download PO as PDF |
| **Goods Received Notes** | | | |
| GET | `/purchase/grns` | `view-purchase-orders` | List GRNs |
| GET | `/purchase/grns/:id` | `view-purchase-orders` | GRN detail with items |
| POST | `/purchase/grns` | `receive-goods` | Create GRN (triggers stock receipt) |
| PUT | `/purchase/grns/:id` | `receive-goods` | Update draft GRN |
| POST | `/purchase/grns/:id/accept` | `receive-goods` | Accept GRN after QC |
| POST | `/purchase/grns/:id/reject` | `receive-goods` | Reject GRN |

### 6.5 Supplier Portal API (for supplier-account role)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/supplier-portal/profile` | `supplier-self-service` | Own profile |
| PUT | `/supplier-portal/profile` | `supplier-self-service` | Update own profile |
| GET | `/supplier-portal/purchase-orders` | `supplier-self-service` | POs addressed to this supplier |
| GET | `/supplier-portal/purchase-orders/:id` | `supplier-self-service` | PO detail |
| POST | `/supplier-portal/purchase-orders/:id/confirm` | `supplier-self-service` | Confirm PO |
| GET | `/supplier-portal/catalog` | `supplier-self-service` | Own product catalog |
| PUT | `/supplier-portal/catalog/:id` | `supplier-self-service` | Update pricing |

### 6.6 Key Request/Response Examples

#### Create Purchase Order

```json
// POST /purchase/orders
{
  "supplier_id": 5,
  "warehouse_id": 1,
  "expected_delivery_date": "2026-04-02",
  "priority": "normal",
  "payment_terms": "net_30",
  "notes": "Monthly organic produce order",
  "items": [
    {
      "product_id": 42,
      "variant_key": "500g",
      "quantity_ordered": 200,
      "unit_price": 85.00,
      "tax_rate": 5.0
    },
    {
      "product_id": 67,
      "quantity_ordered": 100,
      "unit_price": 120.00,
      "tax_rate": 5.0
    }
  ]
}
```

#### Create GRN (Goods Receiving)

```json
// POST /purchase/grns
{
  "purchase_order_id": 15,
  "supplier_id": 5,
  "warehouse_id": 1,
  "received_date": "2026-03-26T10:30:00Z",
  "invoice_number": "INV-2026-0342",
  "vehicle_number": "DH-KA-12-3456",
  "items": [
    {
      "po_item_id": 31,
      "product_id": 42,
      "variant_key": "500g",
      "quantity_received": 190,
      "quantity_accepted": 185,
      "quantity_rejected": 5,
      "rejection_reason": "Damaged packaging",
      "batch_number": "BATCH-ORG-2026-0315",
      "manufacturing_date": "2026-03-20",
      "expiry_date": "2026-04-20",
      "unit_cost": 85.00,
      "location_id": 12,
      "temperature_on_arrival": 4.2
    }
  ]
}
```

#### Create Stock Adjustment

```json
// POST /inventory/adjustments
{
  "warehouse_id": 1,
  "adjustment_type": "damage",
  "reason": "Water damage in Zone B during rain leak",
  "items": [
    {
      "product_id": 42,
      "variant_key": "500g",
      "batch_id": 88,
      "location_id": 12,
      "quantity_change": -15,
      "reason": "Water-damaged packaging, unsaleable"
    }
  ]
}
```

#### Stock Availability Check Response

```json
// GET /inventory/stock-levels/availability/42
{
  "product_id": 42,
  "product_name": "Organic Basmati Rice",
  "sku": "ORG-RICE-001",
  "total_available": 450,
  "is_in_stock": true,
  "variants": [
    {
      "variant_key": "500g",
      "available": 200,
      "is_in_stock": true
    },
    {
      "variant_key": "1kg",
      "available": 150,
      "is_in_stock": true
    },
    {
      "variant_key": "5kg",
      "available": 100,
      "is_in_stock": true
    }
  ],
  "warehouses": [
    { "warehouse_id": 1, "name": "Main Warehouse", "available": 350 },
    { "warehouse_id": 2, "name": "Cold Storage", "available": 100 }
  ],
  "earliest_expiry": "2026-04-20",
  "nearest_batch_qty": 185
}
```

---

## 7. Business Logic & Workflows

### 7.1 Goods Receiving Flow (Purchase → Stock)

```
┌─────────┐    ┌────────────┐    ┌──────────┐    ┌──────────────┐    ┌────────────┐
│ Create   │    │ Approve    │    │ Supplier │    │ Create GRN   │    │ QC Check   │
│ PO       │───►│ PO         │───►│ Delivers │───►│ (Receive     │───►│ (Inspect   │
│ (Draft)  │    │ (Approved) │    │ Goods    │    │  at dock)    │    │  quality)  │
└─────────┘    └────────────┘    └──────────┘    └──────┬───────┘    └──────┬─────┘
                                                        │                    │
                                                        ▼                    ▼
                                                 ┌──────────────┐    ┌──────────────┐
                                                 │ Record batch │    │ Accept/Reject│
                                                 │ numbers &    │    │ items per QC │
                                                 │ expiry dates │    │ findings     │
                                                 └──────┬───────┘    └──────┬───────┘
                                                        │                    │
                                                        ▼                    ▼
                                                 ┌──────────────────────────────────┐
                                                 │ On GRN Accept:                   │
                                                 │ 1. Create stock_batches records  │
                                                 │ 2. Update stock_levels (+qty)    │
                                                 │ 3. Record stock_movement(receipt)│
                                                 │ 4. Update PO received counts     │
                                                 │ 5. Update product.stock_quantity │
                                                 │ 6. Invalidate Redis cache        │
                                                 │ 7. Log in audit_log              │
                                                 └──────────────────────────────────┘
```

**Key Rules:**
- A PO can have multiple GRNs (partial deliveries)
- PO status auto-transitions: `approved` → `partially_received` → `received` based on item receipt %
- Rejected GRN items do NOT enter stock; they are logged for supplier performance tracking
- Batch numbers are mandatory for perishable products
- Temperature-on-arrival is recorded for cold chain items
- All operations execute within a single database transaction

### 7.2 Sales Order Stock Flow

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐    ┌──────────────┐
│ Customer     │    │ Stock Availability│    │ Reserve Stock     │    │ Order        │
│ Places Order │───►│ Check (real-time) │───►│ (Soft Lock)       │───►│ Confirmed    │
│              │    │ Sufficient? YES   │    │ reserved_qty += n │    │              │
└──────────────┘    └──────────────────┘    └───────────────────┘    └──────┬───────┘
                           │ NO                                             │
                           ▼                                                ▼
                    ┌──────────────┐                                 ┌──────────────┐
                    │ Reject Order │                                 │ Pick & Pack  │
                    │ / Backorder  │                                 │ from Warehouse│
                    └──────────────┘                                 └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────────┐
                                                                    │ Dispatch:         │
                                                                    │ 1. Deduct stock   │
                                                                    │    qty -= n       │
                                                                    │ 2. Release reserve│
                                                                    │    reserved -= n  │
                                                                    │ 3. Record movement│
                                                                    │    (sales_dispatch)│
                                                                    │ 4. FEFO batch     │
                                                                    │    selection      │
                                                                    │ 5. Update product │
                                                                    │    stock_quantity │
                                                                    │ 6. Update Redis   │
                                                                    │ 7. Audit log      │
                                                                    └──────────────────┘
```

**FEFO (First Expiry, First Out) Logic:**
For organic groceries, batches are consumed in expiry date order:

1. Query `stock_batches` where `product_id = X`, `status = 'available'`, `remaining_quantity > 0`
2. Order by `expiry_date ASC NULLS LAST`, then `received_date ASC`
3. Deduct from earliest-expiring batch first
4. If a batch doesn't have enough, continue to next batch
5. Update `remaining_quantity` on each consumed batch

**Stock Reservation Rules:**
- Reservations expire after configurable timeout (default: 30 minutes for guest cart, 24 hours for placed orders)
- Expired reservations are auto-released by a scheduled Bull job
- `available_quantity = quantity - reserved_quantity` ensures no double-selling

### 7.3 Stock Transfer Flow

```
┌───────────┐    ┌──────────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ Request   │    │ Approve      │    │ Ship      │    │ In Transit│    │ Receive   │
│ Transfer  │───►│ Transfer     │───►│ (Deduct   │───►│           │───►│ (Add to   │
│ (Draft)   │    │              │    │  source)  │    │           │    │  dest)    │
└───────────┘    └──────────────┘    └───────────┘    └───────────┘    └───────────┘
                                          │                                  │
                                          ▼                                  ▼
                                   stock_movement              stock_movement
                                   (transfer_out)              (transfer_in)
                                   source qty -=               dest qty +=
```

**Rules:**
- Source warehouse stock is deducted on SHIP (not on approval)
- Destination warehouse stock is added on RECEIVE
- Between ship and receive, stock is "in transit" — visible in transit reports
- Quantity received may differ from shipped (damage in transit)
- Variance triggers a stock adjustment automatically

### 7.4 Stock Adjustment Flow

```
┌──────────────┐    ┌───────────────┐    ┌────────────┐    ┌──────────────────┐
│ Create       │    │ Submit for    │    │ Manager    │    │ Apply:           │
│ Adjustment   │───►│ Approval      │───►│ Approves   │───►│ 1. Update stock  │
│ (Draft)      │    │               │    │            │    │ 2. Record movement│
└──────────────┘    └───────────────┘    └────────────┘    │ 3. Update product│
                                              │            │ 4. Audit log     │
                                              ▼            │ 5. Clear cache   │
                                         ┌────────────┐   └──────────────────┘
                                         │ Manager    │
                                         │ Rejects    │
                                         └────────────┘
```

**Adjustment Types & Rules:**

| Type | Approval Required | Description |
|------|-------------------|-------------|
| `increase` | Yes (always) | Found extra stock |
| `decrease` | Yes (always) | Stock missing |
| `damage` | Yes (if value > threshold) | Damaged goods removal |
| `expiry` | Auto-approved | Expired goods write-off |
| `write_off` | Yes (always) | General write-off |
| `recount` | Auto-approved | Post-count correction |

### 7.5 Physical Inventory Count Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────────┐
│ Plan     │    │ Freeze Zone  │    │ Count Items  │    │ Review        │
│ Count    │───►│ (Optional:   │───►│ (Workers scan│───►│ Variances     │
│          │    │  restrict    │    │  & record)   │    │ (Manager)     │
└──────────┘    │  movements)  │    └──────────────┘    └───────┬───────┘
                └──────────────┘                                │
                                                    ┌───────────┼───────────┐
                                                    ▼           ▼           ▼
                                             ┌───────────┐ ┌────────┐ ┌──────────┐
                                             │ Approve & │ │ Recount│ │ Reject   │
                                             │ Apply     │ │ Items  │ │ Count    │
                                             │ Adj       │ │ w/     │ │          │
                                             └───────────┘ │ Variance│ └──────────┘
                                                           └────────┘
```

**Count Types:**

| Type | Scope | Frequency | Description |
|------|-------|-----------|-------------|
| `full` | Entire warehouse | Quarterly / Annually | All items in warehouse counted |
| `cycle` | Zone or category | Weekly / Monthly | Rotating subset per schedule |
| `spot` | Specific products | As needed | Quick check on suspicious items |

**Variance Handling:**
1. System calculates `variance = counted_quantity - system_quantity` per item
2. Items with zero variance are auto-approved
3. Items with variance require manager review
4. On approval, system creates `stock_adjustment` (type: `recount`) and corresponding `stock_movement` records
5. High-variance items (> configurable threshold) may require a second count (verification)

### 7.6 Return/Restock Flow

```
Customer Return → Sales Module marks return → Inventory receives restock request
                                                       │
                                           ┌───────────┼───────────┐
                                           ▼           ▼           ▼
                                    ┌───────────┐ ┌────────┐ ┌──────────┐
                                    │ Restock   │ │ Damage │ │ Dispose  │
                                    │ (Grade A) │ │ (Grade │ │ (Unsale- │
                                    │ Add to    │ │  B)    │ │  able)   │
                                    │ stock     │ │ Adj    │ │ Write-off│
                                    └───────────┘ └────────┘ └──────────┘
```

### 7.7 Reorder Point Evaluation

```
Scheduled Job (Bull Queue) — runs every 4 hours (configurable)
                │
                ▼
    For each active reorder_rule:
    ┌──────────────────────────────────────┐
    │ Check: available_qty <= reorder_point │
    │                                      │
    │  YES → Create stock_alert            │
    │        (low_stock or reorder_triggered)│
    │                                      │
    │  If auto_reorder = true:             │
    │    → Auto-create draft PO to         │
    │      preferred_supplier for          │
    │      reorder_quantity                │
    │                                      │
    │  NO → No action                      │
    └──────────────────────────────────────┘
```

### 7.8 Batch Expiry Management

```
Scheduled Job (daily at 06:00)
        │
        ▼
┌────────────────────────────────────────────┐
│ For each stock_batch with status=available: │
│                                            │
│ If expiry_date <= TODAY:                   │
│   → Set status = 'expired'                │
│   → Create stock_alert (expiry_critical)  │
│   → Auto-create write-off adjustment      │
│                                            │
│ If expiry_date <= TODAY + 7 days:          │
│   → Create stock_alert (expiry_warning)   │
│                                            │
│ If expiry_date <= TODAY + 30 days:         │
│   → Create stock_alert (expiry_warning,   │
│     severity: info)                        │
└────────────────────────────────────────────┘
```

---

## 8. Frontend Pages & UI Design

### 8.1 Navigation Structure

```
Admin Panel Sidebar
└── Inventory Management
    ├── Dashboard (overview, KPIs, alerts)
    ├── Stock Levels (search, filter by warehouse/category/status)
    ├── Stock Movements (transaction history log)
    ├── Stock Adjustments (create, approve, list)
    ├── Stock Transfers (create, track, receive)
    ├── Batch Tracking (list, expiry monitor)
    ├── Inventory Counts (plan, execute, review)
    ├── Reorder Rules (configure thresholds)
    └── Alerts (notifications center)
└── Purchase Management
    ├── Purchase Orders (list, create, approve)
    ├── Goods Receiving (GRN list, create)
    └── Purchase Returns (future)
└── Warehouse Management
    ├── Warehouses (list, create, edit)
    ├── Zones & Locations (manage per warehouse)
    └── Warehouse Map (visual layout — future)
└── Supplier Management
    ├── Suppliers (list, create, edit)
    ├── Supplier Catalog (product-supplier links)
    └── Supplier Performance (ratings, metrics)
```

### 8.2 Page Specifications

#### 8.2.1 Inventory Dashboard (`/admin/inventory`)

**KPI Cards (top row):**
| Card | Value | Icon | Color |
|------|-------|------|-------|
| Total Products | Count of active products | `FaBoxes` | Blue |
| Total Stock Value | Sum of qty × cost | `FaMoneyBill` | Green |
| Low Stock Items | Count below reorder point | `FaExclamationTriangle` | Orange |
| Out of Stock | Count with zero available | `FaTimesCircle` | Red |
| Expiring Soon (7d) | Batches expiring in 7 days | `FaClock` | Yellow |
| Pending POs | POs not yet received | `FaTruck` | Purple |

**Dashboard Widgets:**
1. **Stock Movement Chart** — Bar chart: receipts vs dispatches over last 30 days
2. **Low Stock Alert Table** — Top 10 critically low items with reorder buttons
3. **Expiring Batches Timeline** — Upcoming expirations this month
4. **Recent Movements** — Last 20 stock movements with type badges
5. **Warehouse Utilization** — Donut chart per warehouse
6. **Purchase Order Status** — PO funnel (draft → approved → received → closed)

#### 8.2.2 Stock Levels Page (`/admin/inventory/stock-levels`)

**Features:**
- Search by product name, SKU, barcode
- Filter by: Warehouse, Category, Stock Status (in-stock / low / out-of-stock), Batch status
- Sortable columns: Product, SKU, Warehouse, Available, Reserved, Total, Cost Value
- Expandable rows: show variant breakdown, batch details, location details
- Export to CSV/Excel
- Bulk actions: adjust stock, create transfer

**Table Columns:**

| Column | Description |
|--------|-------------|
| Product | Name + thumbnail |
| SKU | Product SKU |
| Category | Category name |
| Warehouse | Warehouse name |
| Available | Green if > reorder, Orange if low, Red if zero |
| Reserved | Pending order reservations |
| Total | Physical total |
| Cost Value | qty × cost_price |
| Last Movement | Date of last stock change |
| Actions | View details, Adjust, Transfer |

#### 8.2.3 Stock Adjustment Page (`/admin/inventory/adjustments`)

**List View:**
- Filterable by status, adjustment type, warehouse, date range
- Status badges: Draft (gray), Pending (yellow), Approved (green), Rejected (red)

**Create/Edit Form:**
- Warehouse selector
- Adjustment type dropdown
- Reason (required text)
- Item table:
  - Product search (autocomplete)
  - Variant selector
  - Batch selector (dropdown of active batches at that warehouse)
  - Location selector
  - Current Qty (auto-filled, read-only)
  - New Qty (editable) or Change Qty (+/-)
  - Per-item reason
- Notes textarea
- Submit for Approval / Save as Draft buttons

#### 8.2.4 Stock Transfers Page (`/admin/inventory/transfers`)

**List View:**
- Columns: Transfer #, Source → Destination, Status, Items, Requested By, Date
- Status flow badges with date timestamps

**Create Form:**
- Source warehouse selector
- Destination warehouse selector
- Priority selector
- Item table:
  - Product search
  - Variant selector
  - Batch selector (from source warehouse)
  - Source location selector
  - Quantity to transfer
  - Available at source (read-only)
- Notes
- Submit or Save Draft

**Receive Form (at destination):**
- Quantity received per item (may differ from shipped)
- Destination location selector
- Condition notes per item
- Accept transfer button

#### 8.2.5 Purchase Order Pages (`/admin/purchase/orders`)

**List View:**
- Columns: PO #, Supplier, Warehouse, Status, Total Amount, Order Date, Expected Date, Actions
- Quick filters: Status tabs (All, Draft, Pending, Approved, Receiving, Closed)
- Search by PO number, supplier name

**Create/Edit Form:**
- Supplier selector (searchable dropdown with details preview)
- Receiving warehouse selector
- Expected delivery date
- Priority selector
- Payment terms (auto-filled from supplier, overridable)
- Items table:
  - Product search (filtered by supplier catalog if available)
  - Variant selector
  - Qty ordered
  - Unit price (auto-filled from supplier_products.unit_price)
  - Tax rate
  - Line total (auto-calculated)
- Subtotal / Tax / Shipping / Discount / Grand Total summary
- Notes for supplier / Internal notes
- Save Draft / Submit for Approval

**Detail View:**
- PO header with all info
- Items table
- GRN history (linked GRNs with received counts)
- Activity timeline (created → submitted → approved → first GRN → closed)
- Actions: Approve, Reject, Cancel, Print PDF, Create GRN

#### 8.2.6 GRN Pages (`/admin/purchase/grns`)

**Create Form (from PO):**
- Auto-populated from PO items (expected quantities)
- For each item:
  - Received quantity (editable)
  - Accepted quantity (after QC)
  - Rejected quantity + reason
  - Batch number (text input)
  - Lot number
  - Manufacturing date
  - Expiry date
  - Storage location selector
  - Temperature on arrival (for cold chain)
  - Quality notes
- Delivery details: vehicle number, driver name, invoice number
- Accept GRN button (triggers stock receipts)

#### 8.2.7 Batch Tracking Page (`/admin/inventory/batches`)

**List View:**
- Columns: Batch #, Product, Lot #, Supplier, Received Date, Expiry Date, Remaining Qty, Status
- Color-coded expiry: Green (> 30d), Yellow (7–30d), Orange (< 7d), Red (expired)
- Filters: Expiry range, Status, Product, Warehouse
- Actions: View history, Quarantine, Write-off

**Detail View:**
- Batch info card
- Stock movement history for this batch
- Current location(s) and quantities
- Quality inspection records

#### 8.2.8 Inventory Count Page (`/admin/inventory/counts`)

**List View:**
- Columns: Count #, Warehouse, Type, Status, Started, Items Counted, Variances, Actions

**Execute Count View (mobile-friendly):**
- Location-by-location counting interface
- Product displayed with image, name, SKU
- Barcode scan field → auto-populate product
- System Qty (hidden until entered, to avoid bias — configurable)
- Counted Qty input
- Variance shown after entry
- Next item / Previous item navigation
- Complete count button

#### 8.2.9 Supplier Management Pages (`/admin/suppliers`)

**List View:**
- Columns: Code, Company Name, Contact, Phone, Email, Status, Rating (stars), Total Orders
- Filters: Status, Category, Rating range
- Actions: View, Edit, View Products, View POs

**Create/Edit Form:**
- Company details (name, name_bn, address, city, district)
- Contact details (person, email, phone, alt_phone)
- Business details (tax_id, trade_license)
- Banking (bank name, account, branch)
- Terms (payment terms, credit limit, lead time)
- Category selector + Certifications checkboxes
- Status selector
- Notes

**Performance View:**
- On-time delivery rate (%)
- Quality acceptance rate (%)
- Average lead time
- Order history chart
- Fill rate (ordered vs received %)

#### 8.2.10 Warehouse Management Pages (`/admin/warehouses`)

**List View:**
- Columns: Code, Name, Type, Manager, Location, Active, Actions
- Type badges (Main, Cold Storage, Dark Store)

**Detail/Edit View:**
- General info (name, type, address, contact)
- Manager assignment
- Operating hours grid
- **Zones tab**: List of zones with temperature ranges
- **Locations tab**: Hierarchical view (Zone → Aisle → Rack → Shelf → Bin)
  - Bulk location generator: "Create 10 locations in Aisle A, Rack 1, Shelves 1-10"
  - Table with location code, type, capacity, active, barcode

#### 8.2.11 Alerts & Notifications Page (`/admin/inventory/alerts`)

- Real-time alert feed (WebSocket or polling)
- Filter by type, severity, resolved/unresolved
- Group by product or type
- Quick actions: Mark resolved, Create PO (for low stock), View product
- Bell icon badge in header shows unread count

### 8.3 Frontend File Structure

```
frontend/src/
├── pages/admin/
│   ├── inventory/
│   │   ├── index.tsx              (Dashboard)
│   │   ├── stock-levels.tsx       (Stock Levels)
│   │   ├── movements.tsx          (Movement History)
│   │   ├── adjustments/
│   │   │   ├── index.tsx          (List)
│   │   │   └── [id].tsx           (Create/Edit/View)
│   │   ├── transfers/
│   │   │   ├── index.tsx          (List)
│   │   │   └── [id].tsx           (Create/Edit/View)
│   │   ├── batches/
│   │   │   ├── index.tsx          (List)
│   │   │   └── [id].tsx           (Detail)
│   │   ├── counts/
│   │   │   ├── index.tsx          (List)
│   │   │   ├── [id].tsx           (Detail/Review)
│   │   │   └── execute/[id].tsx   (Count Entry)
│   │   ├── reorder-rules.tsx      (Reorder Configuration)
│   │   └── alerts.tsx             (Alert Center)
│   ├── purchase/
│   │   ├── orders/
│   │   │   ├── index.tsx          (List)
│   │   │   └── [id].tsx           (Create/Edit/View)
│   │   └── grns/
│   │       ├── index.tsx          (List)
│   │       └── [id].tsx           (Create/View)
│   ├── warehouses/
│   │   ├── index.tsx              (List)
│   │   └── [id].tsx               (Detail/Edit)
│   └── suppliers/
│       ├── index.tsx              (List)
│       ├── [id].tsx               (Detail/Edit)
│       └── performance.tsx        (Performance Dashboard)
├── components/admin/inventory/
│   ├── StockLevelTable.tsx
│   ├── StockMovementTable.tsx
│   ├── AdjustmentForm.tsx
│   ├── TransferForm.tsx
│   ├── PurchaseOrderForm.tsx
│   ├── GrnForm.tsx
│   ├── BatchCard.tsx
│   ├── CountEntryForm.tsx
│   ├── WarehouseLocationTree.tsx
│   ├── SupplierSearchSelect.tsx
│   ├── ProductStockBadge.tsx
│   ├── ExpiryBadge.tsx
│   ├── MovementTypeBadge.tsx
│   ├── StockChart.tsx
│   └── AlertCard.tsx
├── services/
│   ├── inventoryApi.ts            (Inventory API calls)
│   ├── purchaseApi.ts             (Purchase API calls)
│   ├── warehouseApi.ts            (Warehouse API calls)
│   └── supplierApi.ts             (Supplier API calls)
```

---

## 9. RBAC & Permissions

### 9.1 Inventory-Related Roles

| Role | Slug | Priority | Permissions |
|------|------|----------|-------------|
| **Super Admin** | `super-admin` | 1000 | ALL permissions |
| **Admin** | `admin` | 900 | ALL inventory permissions |
| **Purchase Manager** | `purchase-manager` | 700 | `view-purchase-orders`, `create-purchase-orders`, `edit-purchase-orders`, `approve-purchase-orders`, `receive-goods`, `manage-suppliers`, `view-suppliers`, `view-inventory` |
| **Inventory Manager** | `inventory-manager` | 600 | `view-inventory`, `manage-stock`, `stock-transfer`, `stock-adjustment`, `approve-stock-adjustment`, `manage-warehouses`, `view-stock-reports`, `batch-tracking` |
| **Warehouse Staff** | `warehouse-staff` | 300 | `view-inventory`, `manage-stock`, `stock-transfer`, `batch-tracking`, `receive-goods` |
| **Sales Executive** | `sales-executive` | 500 | `view-inventory` (read-only stock check) |
| **Supplier Account** | `supplier-account` | 100 | `supplier-self-service` |

### 9.2 Complete Permission Catalog

| Permission Slug | Description | Module |
|-----------------|-------------|--------|
| `view-inventory` | View stock levels, movements, batches | Inventory |
| `manage-stock` | Manual stock additions, inventory counts | Inventory |
| `stock-transfer` | Create/manage inter-warehouse transfers | Inventory |
| `stock-adjustment` | Create stock adjustments | Inventory |
| `approve-stock-adjustment` | Approve/reject adjustments, transfers, counts | Inventory |
| `manage-warehouses` | CRUD warehouses, zones, locations | Warehouse |
| `view-stock-reports` | View inventory reports & analytics | Inventory |
| `batch-tracking` | View/manage batch & lot details | Inventory |
| `view-suppliers` | View supplier list & details | Supplier |
| `manage-suppliers` | CRUD supplier records | Supplier |
| `view-purchase-orders` | View PO list & details | Purchase |
| `create-purchase-orders` | Create new POs | Purchase |
| `edit-purchase-orders` | Edit draft POs, cancel POs | Purchase |
| `approve-purchase-orders` | Approve/reject POs | Purchase |
| `receive-goods` | Create GRNs, accept deliveries | Purchase |
| `supplier-self-service` | Supplier portal access | Supplier Portal |

### 9.3 Approval Matrix

| Action | Creator | Approver | Minimum Role |
|--------|---------|----------|--------------|
| Stock Adjustment | Warehouse Staff+ | Inventory Manager+ | inventory-manager |
| Stock Transfer | Warehouse Staff+ | Inventory Manager+ | inventory-manager |
| Purchase Order | Purchase Manager+ | Admin+ | admin |
| Inventory Count | Inventory Manager+ | Admin+ | admin |
| Batch Quarantine | Warehouse Staff+ | N/A (immediate) | warehouse-staff |
| GRN Accept | Warehouse Staff+ | N/A (immediate) | warehouse-staff |
| Supplier Creation | Purchase Manager+ | N/A (immediate) | purchase-manager |

---

## 10. Integration Points

### 10.1 Products Module Integration

**Direction:** Inventory ↔ Products

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Stock Sync | Inventory → Products | When `stock_levels` change, update `products.stock_quantity` with total available across warehouses. Also update variant stock in `size_variants` JSONB. |
| Product Catalog | Products → Inventory | Inventory reads product details (name, SKU, variants) for stock level display. |
| Product Creation | Products → Inventory | When a new product is created, optionally create initial stock level records with opening balance. |

**Sync Logic for `products.stock_quantity`:**

```sql
-- Triggered after any stock level change
UPDATE products
SET stock_quantity = (
  SELECT COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0)
  FROM stock_levels sl
  WHERE sl.product_id = products.id
    AND sl.variant_key IS NULL  -- base product only
)
WHERE id = :productId;

-- For size variants, update JSONB
UPDATE products
SET size_variants = (
  SELECT jsonb_agg(
    CASE 
      WHEN sv->>'name' = :variantKey 
      THEN sv || jsonb_build_object('stock', :newAvailableQty)
      ELSE sv
    END
  )
  FROM jsonb_array_elements(size_variants) sv
)
WHERE id = :productId;
```

### 10.2 Sales Module Integration

**Direction:** Sales → Inventory

| Event | Trigger | Inventory Action |
|-------|---------|------------------|
| Order Created | `SalesService.create()` | Check availability → Create `stock_reservation` |
| Order Confirmed | Status → `confirmed` | Maintain reservation |
| Order Packed | Status → `packed` | Deduct stock, release reservation, create `stock_movement(sales_dispatch)` |
| Order Cancelled | Status → `cancelled` | Release reservation, restore available qty |
| Order Returned | Return processed | Create `stock_movement(sales_return)`, add back to stock or write-off |

**Implementation: Event-Based via NestJS EventEmitter**

```typescript
// In Sales module (existing):
this.eventEmitter.emit('order.created', { orderId, items });
this.eventEmitter.emit('order.packed', { orderId });
this.eventEmitter.emit('order.cancelled', { orderId });

// In Inventory module (listener):
@OnEvent('order.created')
async handleOrderCreated(payload: OrderCreatedEvent) {
  await this.stockLevelService.reserveStock(payload);
}

@OnEvent('order.packed')
async handleOrderPacked(payload: OrderPackedEvent) {
  await this.stockLevelService.dispatchStock(payload);
}

@OnEvent('order.cancelled')
async handleOrderCancelled(payload: OrderCancelledEvent) {
  await this.stockLevelService.releaseReservation(payload);
}
```

### 10.3 Accounting Module Integration

**Direction:** Inventory → Accounting

| Event | Accounting Impact |
|-------|------------------|
| Stock Receipt (GRN) | Debit: Inventory Asset, Credit: Accounts Payable |
| Sales Dispatch | Debit: COGS, Credit: Inventory Asset |
| Stock Write-Off | Debit: Inventory Loss/Damage Expense, Credit: Inventory Asset |
| Stock Adjustment (+) | Debit: Inventory Asset, Credit: Inventory Adjustment Account |
| Stock Adjustment (−) | Debit: Inventory Shrinkage Expense, Credit: Inventory Asset |

**Valuation Methods Supported:**

| Method | Description | Use Case |
|--------|-------------|----------|
| **Weighted Average Cost (WAC)** | Recalculated on each receipt | Default for TrustCart |
| **FIFO** | First In, First Out costing | Fallback for regulatory |
| **FEFO** | First Expiry, First Out (physical) | For batch dispatching |

**WAC Calculation on Receipt:**

```
New WAC = (Current Stock × Current WAC + Received Qty × Purchase Price) / (Current Stock + Received Qty)
```

### 10.4 Redis Cache Integration

**Cached Data:**

| Key Pattern | TTL | Data | Invalidation |
|-------------|-----|------|-------------|
| `stock:product:{id}` | 5 min | `{ total_available, variants: {...}, warehouses: [...] }` | On any stock movement for this product |
| `stock:warehouse:{id}:summary` | 10 min | `{ total_items, total_value, low_stock_count }` | On any stock change in warehouse |
| `stock:low-stock` | 15 min | Array of low-stock product IDs | On stock changes |
| `stock:alerts:unread:{userId}` | 2 min | Unread alert count | On new alert or read |

**Cache Invalidation Strategy:**
- Write-through: Update cache immediately after DB write
- Fallback to DB on cache miss
- Background job refreshes stale entries every 5 minutes

### 10.5 Notification Integration

| Event | Notification Type | Recipients |
|-------|-------------------|------------|
| Low stock alert | In-app + Email | Inventory Manager, Purchase Manager |
| Out of stock | In-app + Email + SMS | Admin, Inventory Manager |
| Batch expiring (7 days) | In-app | Inventory Manager |
| Batch expired | In-app + Email | Inventory Manager, Admin |
| PO approved | In-app + Email (to supplier) | Supplier, Purchase Manager |
| GRN received | In-app | Inventory Manager |
| Transfer shipped | In-app | Dest. warehouse manager |
| Adjustment pending | In-app | Approver (Inventory Manager+) |
| Overselling attempted | In-app | Admin, Sales Manager |

---

## 11. Reports & Analytics

### 11.1 Standard Reports

| Report | Description | Filters | Output |
|--------|-------------|---------|--------|
| **Stock Summary** | Current stock by product across warehouses | Warehouse, Category, Date | Table + CSV |
| **Stock Valuation** | Total inventory value by warehouse/category | Warehouse, Valuation method | Table + PDF |
| **Stock Movement Log** | All movements in date range | Date range, Product, Type, Warehouse | Table + CSV |
| **Low Stock Report** | Items below reorder point | Warehouse, Category | Table + Excel |
| **Expiry Report** | Batches expiring within N days | Days ahead, Warehouse | Table + Excel |
| **Purchase Order Summary** | PO status, amounts, delivery performance | Date range, Supplier, Status | Table + PDF |
| **Supplier Performance** | On-time %, quality %, fill rate per supplier | Date range, Supplier | Chart + Table |
| **Warehouse Utilization** | Stock levels vs capacity per warehouse | Warehouse | Chart |
| **Stock Aging** | Stock age distribution (0-30, 30-60, 60-90, 90+ days) | Warehouse, Category | Chart + Table |
| **Adjustment Summary** | All adjustments with reasons, values, approver | Date range, Warehouse, Type | Table + PDF |
| **Transfer Summary** | Transfer volume between warehouses | Date range, Warehouses | Table + Chart |
| **Inventory Count Variance** | Variance analysis from counts | Count period, Warehouse | Table + PDF |
| **ABC Analysis** | Classify products by value contribution (Pareto) | Category | Chart + Table |
| **Dead Stock** | Items with no movement for N days | Days threshold, Warehouse | Table |
| **Fast/Slow Movers** | Velocity analysis (units sold per period) | Date range, Warehouse | Chart + Table |

### 11.2 Dashboard Analytics

**KPI Metrics (auto-refreshed every 5 minutes):**

| Metric | Calculation |
|--------|-------------|
| Inventory Turnover Ratio | COGS / Average Inventory Value |
| Days of Inventory | 365 / Inventory Turnover |
| Stock Accuracy | (Matched items in last count) / (Total counted items) × 100 |
| Fill Rate | (Sales orders fully filled) / (Total sales orders) × 100 |
| Carrying Cost | Estimated at 20-30% of inventory value annually |
| Shrinkage Rate | (Adjustment losses) / (Total inventory value) × 100 |
| Order Cycle Time | Avg(GRN received_date - PO order_date) |

---

## 12. Notifications & Alerts

### 12.1 Alert Severity Levels

| Severity | Color | Auto-Resolve | Examples |
|----------|-------|-------------|----------|
| `info` | Blue | No | Batch arriving in 30 days to expiry |
| `warning` | Orange | No | Stock below reorder point, batch expiring in 7 days |
| `critical` | Red | No | Out of stock, batch expired, failed GRN QC |

### 12.2 Alert Triggers

| Trigger | Alert Type | Severity | Message Template |
|---------|-----------|----------|------------------|
| `available_qty <= reorder_point` | `low_stock` | warning | "{product} stock low at {warehouse}: {qty} remaining (reorder point: {rp})" |
| `available_qty = 0` | `out_of_stock` | critical | "{product} is OUT OF STOCK at {warehouse}" |
| `available_qty > max_stock_level` | `overstock` | info | "{product} exceeds max stock at {warehouse}: {qty} (max: {max})" |
| `expiry_date - TODAY <= 7` | `expiry_warning` | warning | "Batch {batch#} of {product} expires on {date} ({qty} units)" |
| `expiry_date <= TODAY` | `expiry_critical` | critical | "Batch {batch#} of {product} has EXPIRED ({qty} units)" |
| `auto_reorder triggered` | `reorder_triggered` | info | "Auto-reorder PO created for {product}: {qty} units from {supplier}" |

### 12.3 Delivery Channels

| Channel | Implementation | Used For |
|---------|---------------|----------|
| In-app notification (bell icon) | WebSocket (socket.io) or polling | All alerts |
| Email | Nodemailer + templates | Critical alerts, PO notifications |
| SMS (future) | Third-party API | Out-of-stock emergencies |
| Supplier email | Nodemailer | PO notifications |

---

## 13. Barcode & Label Support

### 13.1 Barcode Standards

| Entity | Format | Example |
|--------|--------|---------|
| Product SKU | Code 128 / EAN-13 | `ORG-RICE-001` |
| Warehouse Location | Code 128 | `WH01-A01-R01-S03-B02` |
| Batch Number | Code 128 | `BATCH-ORG-2026-0315` |
| Purchase Order | Code 128 | `PO-20260326-001` |
| GRN | Code 128 | `GRN-20260326-001` |
| Transfer | Code 128 | `ST-20260326-001` |

### 13.2 Label Printing

| Label | Content | Size | Trigger |
|-------|---------|------|---------|
| Shelf label | Product name, SKU, barcode, bin code | 50×25mm | On location assignment |
| Batch label | Batch #, Product, Expiry, QTY, barcode | 100×50mm | On GRN accept |
| PO label | PO number, supplier, expected date, barcode | A4 sheet | On PO approval |
| Location label | Location code, zone, barcode | 75×25mm | On location creation |

### 13.3 Scanner Integration (Mobile/Web)

- Frontend supports USB barcode scanner input (keyboard wedge mode)
- Barcode scan in inventory count → auto-lookup product
- Barcode scan at GRN → identify PO item
- Future: React Native mobile app for warehouse operations

---

## 14. Performance & Scalability

### 14.1 Database Optimization

| Strategy | Implementation |
|----------|---------------|
| Composite indexes | All frequent query patterns indexed (product+warehouse, batch+status) |
| Partitioning | `stock_movements` partitioned by month (future, when > 1M rows) |
| Materialized views | `mv_stock_summary` for dashboard KPIs (refreshed every 5 min) |
| Connection pooling | TypeORM pool size: 10-20 connections |
| Read replicas | Future: route read queries to replica |

### 14.2 Caching Strategy

| Layer | Technology | Scope |
|-------|-----------|-------|
| L1 | Node.js in-memory (LRU) | Warehouse list, location list (static data) |
| L2 | Redis | Stock levels, alert counts, dashboard KPIs |
| L3 | PostgreSQL | Source of truth |

### 14.3 Concurrency Control

**Optimistic Locking for Stock Updates:**

```sql
-- Prevent race conditions on stock deduction
UPDATE stock_levels
SET quantity = quantity - :deductQty,
    updated_at = NOW()
WHERE id = :stockLevelId
  AND quantity >= :deductQty  -- Ensure sufficient stock
RETURNING *;

-- If 0 rows affected → insufficient stock → rollback transaction
```

**Advisory Locks for Critical Operations:**

```sql
-- Lock a product's stock for atomic operation
SELECT pg_advisory_xact_lock(:productId);
-- ... perform stock operations ...
-- Lock auto-released at transaction end
```

### 14.4 Scalability Considerations

| Scenario | Strategy |
|----------|----------|
| 10K+ products | Paginated queries with cursor-based pagination |
| 100K+ stock movements/month | Monthly partitioned `stock_movements` table |
| High concurrent orders | Redis-based stock check → advisory lock for deduction |
| Multiple warehouses (10+) | Warehouse-scoped queries, warehouse-specific cache keys |
| Real-time dashboard | WebSocket push for critical changes, 30s polling for KPIs |

---

## 15. Implementation Roadmap

### Phase 1 — Foundation (Core Infrastructure)

**Objective:** Establish the database schema, core entities, and basic CRUD operations.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 1.1 Create all database migration scripts (20 tables) | Critical | None |
| 1.2 Implement Warehouse entities & CRUD (warehouse, zone, location) | Critical | 1.1 |
| 1.3 Implement Supplier entities & CRUD (supplier, supplier_product) | Critical | 1.1 |
| 1.4 Implement Stock Level entity & basic queries | Critical | 1.1, 1.2 |
| 1.5 Implement Stock Movement entity & recording service | Critical | 1.1, 1.4 |
| 1.6 Implement Stock Batch entity & basic lifecycle | Critical | 1.1 |
| 1.7 Create DTOs with class-validator for all entities | Critical | 1.2–1.6 |
| 1.8 Register modules in AppModule & configure TypeORM entities | Critical | 1.2–1.6 |
| 1.9 Seed initial warehouse & supplier data | High | 1.2, 1.3 |
| 1.10 Frontend: Warehouse CRUD pages | High | 1.2 |
| 1.11 Frontend: Supplier CRUD pages | High | 1.3 |

### Phase 2 — Purchase & Receiving

**Objective:** Complete purchase order lifecycle and goods receiving.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 2.1 Implement Purchase Order entity & CRUD | Critical | Phase 1 |
| 2.2 Implement PO approval workflow | Critical | 2.1 |
| 2.3 Implement GRN entity & receiving flow | Critical | 2.1, 1.5 |
| 2.4 GRN → auto-create batches & stock receipts | Critical | 2.3, 1.6, 1.5 |
| 2.5 Update PO status on GRN creation | High | 2.3 |
| 2.6 Products.stock_quantity sync on receipt | Critical | 2.4 |
| 2.7 Frontend: Purchase Order pages (list, create, detail) | Critical | 2.1 |
| 2.8 Frontend: GRN pages (create from PO, detail) | Critical | 2.3 |
| 2.9 PO PDF generation | Medium | 2.1 |

### Phase 3 — Stock Operations

**Objective:** Stock adjustments, transfers, inventory counts.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 3.1 Implement Stock Adjustment entity & workflow | Critical | Phase 1 |
| 3.2 Adjustment approval flow | Critical | 3.1 |
| 3.3 Implement Stock Transfer entity & workflow | Critical | Phase 1 |
| 3.4 Transfer ship/receive with movement recording | Critical | 3.3 |
| 3.5 Implement Inventory Count entity & workflow | High | Phase 1 |
| 3.6 Count variance → auto-adjustment on approval | High | 3.5, 3.1 |
| 3.7 Frontend: Adjustment pages | Critical | 3.1 |
| 3.8 Frontend: Transfer pages | Critical | 3.3 |
| 3.9 Frontend: Inventory Count pages | High | 3.5 |

### Phase 4 — Sales Integration & Real-Time Stock

**Objective:** Connect inventory with sales order flow.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 4.1 Stock reservation on order placement | Critical | Phase 1 |
| 4.2 Stock deduction on dispatch (FEFO logic) | Critical | 4.1 |
| 4.3 Reservation release on cancellation | Critical | 4.1 |
| 4.4 Return/restock integration | High | Phase 3 |
| 4.5 Storefront availability API (public endpoint) | Critical | 1.4 |
| 4.6 Redis stock cache implementation | High | 1.4 |
| 4.7 Prevent overselling validation | Critical | 4.1 |
| 4.8 Update cart/checkout to check real-time stock | High | 4.5 |

### Phase 5 — Alerts, Reorder & Reports

**Objective:** Automation, monitoring, and analytics.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 5.1 Implement Reorder Rule entity & configuration | High | Phase 1 |
| 5.2 Implement Stock Alert entity & service | High | Phase 1 |
| 5.3 Low stock detection Bull job | High | 5.1, 5.2 |
| 5.4 Batch expiry monitoring Bull job | High | Phase 1 |
| 5.5 Auto-reorder PO creation | Medium | 5.1, Phase 2 |
| 5.6 Notification dispatch (in-app + email) | High | 5.2 |
| 5.7 Inventory Dashboard with KPIs | Critical | All phases |
| 5.8 Stock Summary & Valuation reports | High | Phase 1 |
| 5.9 Movement Log report | High | Phase 1 |
| 5.10 Supplier Performance report | Medium | Phase 2 |
| 5.11 ABC Analysis report | Medium | Phase 1 |
| 5.12 Dead Stock / Fast-Slow Mover reports | Medium | Phase 1 |
| 5.13 Inventory Count Variance report | Medium | Phase 3 |
| 5.14 Export to CSV/Excel/PDF | Medium | 5.7–5.13 |

### Phase 6 — Polish & Advanced Features

**Objective:** Supplier portal, barcode support, advanced analytics.

| Task | Priority | Dependencies |
|------|----------|-------------|
| 6.1 Supplier Portal: PO view & confirmation | Medium | Phase 2 |
| 6.2 Barcode label generation (batch, location) | Medium | Phase 2, 3 |
| 6.3 Barcode scanner integration in count/GRN UI | Medium | Phase 3 |
| 6.4 Accounting module integration (COGS journals) | Medium | Phase 4 |
| 6.5 Inventory audit log with full traceability | High | All phases |
| 6.6 Demand forecasting (simple moving average) | Low | Phase 5 |
| 6.7 Warehouse visual map (location layout) | Low | Phase 1 |
| 6.8 Mobile-responsive warehouse operations | Medium | Phase 3 |
| 6.9 Bulk import (products, stock, suppliers via CSV) | Medium | Phase 1 |
| 6.10 Comprehensive E2E testing | High | All phases |

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **SKU** | Stock Keeping Unit — unique product identifier |
| **PO** | Purchase Order — document ordering goods from supplier |
| **GRN** | Goods Received Note — document confirming receipt of goods |
| **FEFO** | First Expiry, First Out — dispatch method using earliest expiry batch first |
| **FIFO** | First In, First Out — cost accounting method |
| **WAC** | Weighted Average Cost — inventory valuation method |
| **COGS** | Cost of Goods Sold — accounting expense for sold inventory |
| **MOQ** | Minimum Order Quantity — minimum units a supplier will sell |
| **Lead Time** | Days between placing an order and receiving goods |
| **Safety Stock** | Buffer stock maintained to prevent stockouts |
| **Reorder Point** | Stock level that triggers a new purchase order |
| **Cycle Count** | Partial physical inventory count on a rotating schedule |
| **ABC Analysis** | Inventory classification: A (high value), B (medium), C (low) |
| **Dead Stock** | Inventory with no sales/movement for an extended period |
| **Shrinkage** | Inventory loss from theft, damage, or counting errors |
| **Batch** | A group of items produced/received together, tracked as one unit |
| **Lot** | Similar to batch, often used for traceability in food/pharma |
| **Quarantine** | Holding status for stock pending quality inspection or recall decision |
| **Bin** | The smallest storage location unit within a warehouse |
| **Zone** | A distinct temperature/type area within a warehouse |
| **Stock Reservation** | Soft lock on stock for a pending sales order |
| **Variance** | Difference between system stock and physically counted stock |
| **Fill Rate** | Percentage of customer orders fulfilled completely from stock |
| **Inventory Turnover** | How many times inventory is sold and replaced in a period |

---

## Appendix A: Migration File List

The following SQL migration files need to be created in `db/migrations/`:

| # | File Name | Tables Created |
|---|-----------|---------------|
| 1 | `create_warehouses.sql` | `warehouses` |
| 2 | `create_warehouse_zones.sql` | `warehouse_zones` |
| 3 | `create_warehouse_locations.sql` | `warehouse_locations` |
| 4 | `create_suppliers.sql` | `suppliers` |
| 5 | `create_supplier_products.sql` | `supplier_products` |
| 6 | `create_stock_batches.sql` | `stock_batches` |
| 7 | `create_stock_levels.sql` | `stock_levels` |
| 8 | `create_stock_movements.sql` | `stock_movements` |
| 9 | `create_stock_reservations.sql` | `stock_reservations` |
| 10 | `create_purchase_orders.sql` | `purchase_orders`, `purchase_order_items` |
| 11 | `create_goods_received_notes.sql` | `goods_received_notes`, `grn_items` |
| 12 | `create_stock_transfers.sql` | `stock_transfers`, `stock_transfer_items` |
| 13 | `create_stock_adjustments.sql` | `stock_adjustments`, `stock_adjustment_items` |
| 14 | `create_inventory_counts.sql` | `inventory_counts`, `inventory_count_items` |
| 15 | `create_reorder_rules.sql` | `reorder_rules` |
| 16 | `create_stock_alerts.sql` | `stock_alerts` |
| 17 | `seed_default_warehouse.sql` | Initial warehouse + zones + locations |
| 18 | `seed_sample_suppliers.sql` | Sample supplier records |
| 19 | `add_inventory_permissions.sql` | Seed new permissions into RBAC tables |

---

## Appendix B: Environment Variables

```env
# Inventory Module Config
INVENTORY_CACHE_TTL=300                  # Stock cache TTL in seconds (5 min)
INVENTORY_RESERVATION_TIMEOUT=1800       # Reservation expiry in seconds (30 min)
INVENTORY_REORDER_CHECK_INTERVAL=14400   # Reorder evaluation interval in seconds (4 hours)
INVENTORY_EXPIRY_CHECK_CRON=0 6 * * *    # Daily at 06:00
INVENTORY_LOW_STOCK_EMAIL=true           # Send email on low stock
INVENTORY_EXPIRY_WARNING_DAYS=30         # Days before expiry to warn
INVENTORY_EXPIRY_CRITICAL_DAYS=7         # Days before expiry for critical alert
INVENTORY_DEFAULT_VALUATION=wac          # Valuation method: wac, fifo
INVENTORY_ADJUSTMENT_AUTO_APPROVE_LIMIT=5000  # BDT limit for auto-approval
```

---

## Appendix C: Testing Strategy

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit Tests | Service methods, DTO validation, utility functions | Jest, class-validator |
| Integration Tests | Controller endpoints, database operations | Jest + Supertest + test DB |
| E2E Tests | Complete workflows (PO → GRN → Stock → Sale) | Jest + Supertest |
| Performance Tests | Stock check under load, concurrent updates | k6 or Artillery |

**Critical Test Scenarios:**
1. Concurrent stock deduction (two orders for same product simultaneously)
2. FEFO batch consumption across multiple batches
3. PO → GRN → Stock receipt → Product.stock_quantity sync
4. Reservation timeout and auto-release
5. Stock adjustment approval → movement recording → level update
6. Inventory count with variance → adjustment creation → approval → stock correction
7. Transfer ship from source → receive at destination with quantity discrepancy
8. Low stock alert trigger → auto-reorder PO creation
9. Batch expiry detection → alert → write-off adjustment

---

*End of Document*
