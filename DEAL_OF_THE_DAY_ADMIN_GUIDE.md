# Deal of the Day - Admin Management Guide

## Database Information

**Table/Collection Name**: `deal_of_the_day`

This PostgreSQL table stores the Deal of the Day configuration with the following structure:

```sql
CREATE TABLE deal_of_the_day (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table Features:
- ✅ **Unique Constraint**: Only ONE active deal can exist at a time
- ✅ **Auto-deactivation**: Expired deals are automatically disabled
- ✅ **Cascade Delete**: Deal is removed if the product is deleted
- ✅ **Indexed**: Fast lookups on `product_id` and `is_active`

---

## Admin API Endpoints

### 1. Set Deal of the Day
**Endpoint**: `POST /api/products/admin/deal-of-the-day`

**Request Body**:
```json
{
  "productId": 231,
  "endDate": "2026-01-31T23:59:59Z"  // Optional
}
```

**Example using cURL**:
```bash
curl -X POST http://localhost:3001/api/products/admin/deal-of-the-day \
  -H "Content-Type: application/json" \
  -d '{"productId": 231, "endDate": "2026-01-31T23:59:59Z"}'
```

**What it does**:
- Deactivates any existing active deal
- Creates a new Deal of the Day
- If `endDate` is not provided, the deal runs indefinitely until manually removed

---

### 2. Remove Deal of the Day
**Endpoint**: `DELETE /api/products/admin/deal-of-the-day`

**Example using cURL**:
```bash
curl -X DELETE http://localhost:3001/api/products/admin/deal-of-the-day
```

**What it does**:
- Deactivates the current active deal
- Deal remains in database but with `is_active = false`

---

### 3. Get Current Deal of the Day (Public)
**Endpoint**: `GET /api/products/deal-of-the-day`

**Response**:
```json
{
  "id": 231,
  "slug": "cumin-seeds-jeera",
  "name_en": "Cumin Seeds (Jeera)",
  "base_price": "300.00",
  "sale_price": "250.00",
  "image_url": "https://example.com/cumin.jpg",
  "category_name": "Spices"
}
```

**What it does**:
- Returns the currently active deal
- Automatically excludes expired deals
- Returns `null` if no active deal exists

---

## Admin Panel Integration (Future)

### Recommended Admin UI Flow:

1. **Deal Management Page** (`/admin/products/deal-of-the-day`):
   - Product selector dropdown (from active products)
   - Optional end date picker
   - "Set as Deal of the Day" button
   - Current deal display with "Remove Deal" button

2. **Sample React/Next.js Component**:
```tsx
const DealOfTheDayManager = () => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentDeal, setCurrentDeal] = useState(null);

  const setDeal = async () => {
    await fetch('/api/products/admin/deal-of-the-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        productId: parseInt(selectedProductId), 
        endDate: endDate || undefined 
      })
    });
    // Refresh current deal
  };

  const removeDeal = async () => {
    await fetch('/api/products/admin/deal-of-the-day', {
      method: 'DELETE'
    });
    setCurrentDeal(null);
  };

  return (
    <div>
      <h2>Manage Deal of the Day</h2>
      
      {currentDeal && (
        <div>
          <h3>Current Deal: {currentDeal.name_en}</h3>
          <button onClick={removeDeal}>Remove Deal</button>
        </div>
      )}

      <div>
        <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option>Select Product</option>
          {/* Map products here */}
        </select>
        <input 
          type="datetime-local" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
        <button onClick={setDeal}>Set Deal</button>
      </div>
    </div>
  );
};
```

---

## Database Query Examples

### Check Current Active Deal:
```sql
SELECT * FROM deal_of_the_day WHERE is_active = true;
```

### View All Deal History:
```sql
SELECT 
  d.*, 
  p.name_en as product_name,
  p.sale_price
FROM deal_of_the_day d
LEFT JOIN products p ON d.product_id = p.id
ORDER BY d.created_at DESC;
```

### Manually Set a Deal (SQL):
```sql
-- Deactivate current deal
UPDATE deal_of_the_day SET is_active = false WHERE is_active = true;

-- Insert new deal
INSERT INTO deal_of_the_day (product_id, end_date, is_active)
VALUES (231, '2026-01-31 23:59:59', true);
```

---

## Frontend Display (Already Implemented)

The homepage (`frontend/src/pages/index.tsx`) already has the code to display the Deal of the Day:

```tsx
// Loads on page mount
const loadDealOfTheDay = async () => {
  const response = await apiClient.get('/products/deal-of-the-day');
  setDealOfTheDay(response.data);
};

// Displays in the UI
{dealOfTheDay && (
  <DealSection product={dealOfTheDay} />
)}
```

---

## Current Status

✅ **Database Table**: Created with migration  
✅ **Backend API**: Fully implemented  
✅ **Frontend Display**: Implemented on homepage  
⏳ **Admin Panel UI**: Not yet created (endpoints are ready)  

### Next Steps:
1. Create admin panel page at `/admin/products/deal-of-the-day`
2. Add product selector and date picker
3. Test the flow end-to-end

---

## Troubleshooting

### Issue: Deal not showing on frontend
**Check**:
1. Is there an active deal in database? `SELECT * FROM deal_of_the_day WHERE is_active = true;`
2. Is the deal expired? Check `end_date` field
3. Is the product active? `SELECT status FROM products WHERE id = <product_id>;`

### Issue: Can't set new deal
**Check**:
1. Verify product_id exists in products table
2. Check backend logs for errors
3. Ensure database constraint doesn't block (only one active deal allowed)

---

**Last Updated**: Dec 30, 2025  
**Database**: PostgreSQL (trustcart_erp)  
**Backend**: NestJS + TypeORM  
**Frontend**: Next.js + React
