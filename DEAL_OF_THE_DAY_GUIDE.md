# Deal of the Day Implementation Guide

## Overview
The Deal of the Day feature allows admin to control which product appears in the special "Deal of the Day" section on the homepage.

## Database Setup

### Run Migration
```bash
cd backend
run-deal-of-the-day-migration.bat
```

This creates:
- `deal_of_the_day` table with product relationship
- Unique constraint ensuring only one active deal at a time
- Automatic timestamp updates

## Backend Implementation

### New Files Created
1. **deal-of-the-day.entity.ts** - TypeORM entity for deal management
2. **deal-of-the-day-migration.sql** - Database schema

### Updated Files
1. **products.module.ts** - Added DealOfTheDay entity
2. **products.service.ts** - Added methods:
   - `getDealOfTheDay()` - Get current active deal
   - `setDealOfTheDay(productId, endDate?)` - Set new deal
   - `removeDealOfTheDay()` - Deactivate current deal

3. **products.controller.ts** - Added endpoints:
   - `GET /products/deal-of-the-day` - Public endpoint
   - `POST /products/admin/deal-of-the-day` - Admin: set deal
   - `DELETE /products/admin/deal-of-the-day` - Admin: remove deal

## Frontend Implementation

### Admin Panel
**Location:** `/admin/products/deal-of-the-day`

**File:** `frontend/src/pages/admin/products/deal-of-the-day.tsx`

Features:
- View current Deal of the Day with full details
- Search and select product from catalog
- Set optional end date for deal expiration
- Remove current deal
- Visual feedback with fire icon 🔥

### Homepage
**File:** `frontend/src/pages/index.tsx`

Changes:
- Added `dealOfTheDay` state
- Added `loadDealOfTheDay()` function
- Updated Deal of the Day section to use API data instead of first featured product
- Section only displays when a deal is active

## API Endpoints

### Get Deal of the Day (Public)
```
GET /products/deal-of-the-day

Response:
{
  "id": 123,
  "slug": "product-slug",
  "name_en": "Product Name",
  "base_price": 1000,
  "sale_price": 800,
  "brand": "Brand Name",
  "image_url": "https://...",
  "stock_quantity": 50
}
```

### Set Deal of the Day (Admin)
```
POST /products/admin/deal-of-the-day

Body:
{
  "productId": 123,
  "endDate": "2025-12-31T23:59:59" // Optional
}

Response:
{
  "id": 1,
  "product_id": 123,
  "is_active": true,
  "start_date": "2025-12-29T...",
  "end_date": "2025-12-31T23:59:59"
}
```

### Remove Deal of the Day (Admin)
```
DELETE /products/admin/deal-of-the-day

Response:
{
  "success": true,
  "message": "Deal of the day removed"
}
```

## Usage Instructions

### For Administrators

1. **Access the Manager**
   - Navigate to Admin Panel → Products → Deal of the Day
   - Or go to `/admin/products/deal-of-the-day`

2. **Set a New Deal**
   - Use the search box to find a product
   - Click on the product to select it (shows checkmark)
   - Optionally set an end date/time
   - Click "Set as Deal of the Day"

3. **Remove Current Deal**
   - Click "Remove Deal" button in the current deal card
   - Confirm the action

4. **View Current Deal**
   - Current deal displays at the top with:
     - Product image and details
     - Pricing information
     - Stock quantity
     - Quick remove button

### For Customers

The Deal of the Day appears on the homepage with:
- Eye-catching gradient background (amber/orange)
- Large product image
- Bold pricing display
- Fire emoji 🔥 badge
- "Grab This Deal Now!" call-to-action button

## Features

### Admin Features
- ✅ Search products by name or SKU
- ✅ Visual product selection with images
- ✅ Optional expiration date setting
- ✅ One-click deal removal
- ✅ Current deal preview with full details
- ✅ Automatic deactivation of previous deals

### Database Features
- ✅ Only one active deal at a time (enforced by unique index)
- ✅ Automatic timestamp management
- ✅ Cascade delete when product is removed
- ✅ Foreign key relationship with products table

### Homepage Features
- ✅ Dynamic loading from API
- ✅ Beautiful gradient design
- ✅ Responsive layout (mobile/desktop)
- ✅ Smooth animations with framer-motion
- ✅ Only shows when deal is active

## File Structure

```
backend/
├── deal-of-the-day-migration.sql
├── run-deal-of-the-day-migration.bat
└── src/modules/products/
    ├── deal-of-the-day.entity.ts (NEW)
    ├── products.module.ts (UPDATED)
    ├── products.service.ts (UPDATED)
    └── products.controller.ts (UPDATED)

frontend/
└── src/pages/
    ├── index.tsx (UPDATED)
    └── admin/products/
        └── deal-of-the-day.tsx (NEW)
```

## Testing

1. **Run Migration**
   ```bash
   cd backend
   run-deal-of-the-day-migration.bat
   ```

2. **Start Backend** (if not running)
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Test Admin Panel**
   - Go to `/admin/products/deal-of-the-day`
   - Select a product
   - Set as deal
   - Verify success message

4. **Test Homepage**
   - Go to homepage `/`
   - Scroll to "Deal of the Day" section
   - Verify product displays correctly
   - Click "Grab This Deal Now!" to test link

## Notes

- Only ONE deal can be active at a time
- Setting a new deal automatically deactivates the previous one
- The section won't display on homepage if no deal is set
- End date is optional - deals can run indefinitely
- Deleting a product will automatically remove it as deal of the day (cascade delete)
