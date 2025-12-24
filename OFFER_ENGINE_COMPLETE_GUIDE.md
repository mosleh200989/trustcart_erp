# 🎯 OFFER / PROMOTION ENGINE - Complete Implementation Guide

## Overview
Industry-standard, rule-based offer engine for TrustCart ERP that supports:
- ✅ Time-based promotions (Flash Sales, Limited Time)
- ✅ Percentage & Flat discounts
- ✅ BOGO (Buy One Get One) offers
- ✅ Free product rewards
- ✅ Conditional offers (cart amount, user level, first order)
- ✅ Auto-apply & manual coupon codes
- ✅ Priority-based conflict resolution
- ✅ Usage limits (total & per-user)

---

## 📁 File Structure

```
backend/
├── offer-engine-migration.sql         # Database schema
└── src/modules/offers/
    ├── entities/
    │   ├── offer.entity.ts
    │   ├── offer-condition.entity.ts
    │   ├── offer-reward.entity.ts
    │   ├── offer-product.entity.ts
    │   ├── offer-category.entity.ts
    │   └── offer-usage.entity.ts
    ├── offers.service.ts              # Core evaluation logic
    ├── offers.controller.ts           # REST API endpoints
    └── offers.module.ts

frontend/
└── src/pages/admin/offers/
    ├── index.tsx                      # Offers management UI
    └── create.tsx                     # Offer creation form
```

---

## 🗄️ Database Schema

### Core Tables

1. **offers** - Main offer configuration
2. **offer_conditions** - Rules that must be met
3. **offer_rewards** - Benefits customer receives
4. **offer_products** - Applicable products
5. **offer_categories** - Applicable categories
6. **offer_usage** - Track redemptions
7. **offer_codes** - Coupon/promo codes

### Migration

Run the migration:
```bash
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f backend/offer-engine-migration.sql
```

---

## 🎨 Example Offer Configurations

### 1️⃣ Flash Sale - 90% OFF for 1 Hour

```json
{
  "name": "Flash Sale - 90% OFF",
  "offerType": "PERCENTAGE",
  "startTime": "2025-01-10T18:00:00",
  "endTime": "2025-01-10T19:00:00",
  "priority": 100,
  "autoApply": true,
  "maxUsageTotal": 1000,
  "rewards": [
    {
      "rewardType": "DISCOUNT_PERCENT",
      "value": {"percent": 90}
    }
  ]
}
```

### 2️⃣ Buy 1 Get 1 Free

```json
{
  "name": "BOGO - Product X",
  "offerType": "BOGO",
  "startTime": "2025-01-01T00:00:00",
  "endTime": "2025-12-31T23:59:59",
  "autoApply": true,
  "conditions": [
    {
      "conditionType": "PRODUCT_QTY",
      "operator": ">=",
      "value": {"product_id": 12, "min": 1}
    }
  ],
  "rewards": [
    {
      "rewardType": "FREE_PRODUCT",
      "value": {"product_id": 12},
      "maxFreeQty": 1
    }
  ]
}
```

### 3️⃣ First Order 20% Discount

```json
{
  "name": "Welcome Discount - 20% OFF",
  "offerType": "PERCENTAGE",
  "startTime": "2025-01-01T00:00:00",
  "endTime": "2025-12-31T23:59:59",
  "autoApply": true,
  "maxUsagePerUser": 1,
  "conditions": [
    {
      "conditionType": "FIRST_ORDER",
      "operator": "=",
      "value": {"first_order": true}
    }
  ],
  "rewards": [
    {
      "rewardType": "DISCOUNT_PERCENT",
      "value": {"percent": 20}
    }
  ]
}
```

### 4️⃣ Cart Total ৳1000+ Get Free Shipping

```json
{
  "name": "Free Shipping - Over ৳1000",
  "offerType": "FREE_PRODUCT",
  "minCartAmount": 1000,
  "autoApply": true,
  "rewards": [
    {
      "rewardType": "FREE_SHIPPING"
    }
  ]
}
```

### 5️⃣ Buy 2 Product A, Get 1 Product B Free

```json
{
  "name": "Buy 2 Get Different Product Free",
  "offerType": "FREE_PRODUCT",
  "autoApply": true,
  "conditions": [
    {
      "conditionType": "PRODUCT_QTY",
      "operator": ">=",
      "value": {"product_id": 10, "min": 2}
    }
  ],
  "rewards": [
    {
      "rewardType": "FREE_PRODUCT",
      "value": {"product_id": 25},
      "maxFreeQty": 1
    }
  ]
}
```

---

## 🔧 Backend API Endpoints

### Admin Endpoints

```typescript
// Create offer
POST /offers
Body: OfferCreateDTO

// List all offers
GET /offers?includeInactive=true

// Get single offer
GET /offers/:id

// Update offer
PUT /offers/:id

// Delete offer
DELETE /offers/:id

// Get offer statistics
GET /offers/:id/stats
```

### Customer/Checkout Endpoints

```typescript
// Get active offers for customer
GET /offers/active/list?customerId=123

// Evaluate offers for cart
POST /offers/evaluate
Body: {
  cart: CartItem[],
  customerId?: number,
  customerData?: { totalOrders, level, etc }
}

// Get best offer (conflict resolution)
POST /offers/best
Body: {
  cart: CartItem[],
  customerId?: number,
  customerData?: any
}

// Record offer usage
POST /offers/usage
Body: {
  offerId: number,
  customerId: number,
  orderId: number,
  discountAmount: number
}
```

---

## 🎯 Offer Evaluation Logic

### Flow

```
1. Fetch active offers (time-based)
2. Filter by usage limits
3. Check conditions
   - Cart total
   - Product quantity
   - User attributes (first order, level)
   - Category/Brand
4. Calculate rewards
5. Apply conflict resolution (priority)
6. Return best offer
```

### Condition Types

- **CART_TOTAL** - Minimum cart amount
- **PRODUCT_QTY** - Product X quantity >= N
- **MIN_ITEMS** - Minimum items in cart
- **CATEGORY** - Cart has category X
- **BRAND** - Cart has brand X
- **FIRST_ORDER** - Customer's first purchase
- **USER_LEVEL** - MLM/Membership level
- **USER_SEGMENT** - Customer segment (VIP, Gold, etc)

### Reward Types

- **DISCOUNT_PERCENT** - % discount
- **DISCOUNT_FLAT** - Fixed amount discount
- **FREE_PRODUCT** - Free item(s)
- **FREE_SHIPPING** - No delivery charge

---

## 🚀 Integration with Checkout

### Checkout Flow

```typescript
// In frontend checkout page
import apiClient from '@/services/api';

// Step 1: Get best offer for cart
const response = await apiClient.post('/offers/best', {
  cart: cartItems,
  customerId: customer?.id,
  customerData: {
    totalOrders: customer.totalOrders,
    level: customer.level
  }
});

const bestOffer = response.data;

if (bestOffer && bestOffer.applicable) {
  // Apply discount
  const discountAmount = bestOffer.discountAmount;
  const finalTotal = cartTotal - discountAmount;
  
  // Add free products if any
  if (bestOffer.freeProducts) {
    bestOffer.freeProducts.forEach(fp => {
      addToCart(fp.productId, fp.quantity, 0); // 0 price
    });
  }
  
  // Show offer banner
  showOfferBanner(bestOffer.offer.name);
}

// Step 2: After order placed, record usage
await apiClient.post('/offers/usage', {
  offerId: bestOffer.offer.id,
  customerId: customer.id,
  orderId: createdOrder.id,
  discountAmount: discountAmount
});
```

---

## 🎛️ Admin Panel Features

### Offer Management Dashboard
- ✅ List all offers with status (Live/Scheduled/Inactive)
- ✅ Filter by active/all
- ✅ Quick activate/deactivate toggle
- ✅ Usage statistics (current/max)
- ✅ Priority badges
- ✅ Auto-apply indicators

### Offer Creation Form
- ✅ Basic info (name, description, type)
- ✅ Date/time picker for duration
- ✅ Priority setting
- ✅ Usage limits (total & per-user)
- ✅ Cart constraints (min amount, max discount)
- ✅ Condition builder (JSON-based)
- ✅ Reward configurator
- ✅ Auto-apply toggle

---

## 🔒 Security & Business Rules

### Safeguards

1. **Usage Limits** - Prevent over-redemption
2. **Max Discount Cap** - Control losses
3. **Time-based** - Automatic activation/deactivation
4. **Priority System** - Handle overlapping offers
5. **Per-user Limit** - Prevent abuse
6. **Stock Check** - For free products
7. **Transaction Lock** - Atomic usage recording

### Best Practices

- Always set `maxDiscountAmount` for % discounts
- Use high priority (100+) for flash sales
- Enable `autoApply` for customer convenience
- Set reasonable `maxUsagePerUser` (typically 1)
- Test offers before going live

---

## 📊 Analytics & Reporting

### Offer Performance Metrics

```typescript
GET /offers/:id/stats

Response:
{
  "offer": {...},
  "totalUsages": 234,
  "uniqueCustomers": 189,
  "totalDiscountGiven": 45600.00,
  "usages": [...]
}
```

### Revenue Impact

```sql
-- Total discounts given per offer
SELECT 
  o.name,
  COUNT(u.id) as redemptions,
  SUM(u.discount_amount) as total_discount
FROM offers o
JOIN offer_usage u ON u.offer_id = o.id
GROUP BY o.id, o.name
ORDER BY total_discount DESC;
```

---

## 🔮 Future Enhancements

1. **Coupon Codes** - Already in schema, implement frontend
2. **A/B Testing** - Test different offers
3. **Personalization** - AI-based offer suggestions
4. **Scheduler** - Cron jobs for auto-activation
5. **WebSocket** - Real-time flash sale countdown
6. **Bundle Builder** - Visual product selection
7. **Report Export** - CSV/Excel analytics

---

## 🧪 Testing Examples

### Test Case 1: Flash Sale Validation

```bash
# Create flash sale
curl -X POST http://localhost:4000/offers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1-Hour Flash Sale",
    "offerType": "PERCENTAGE",
    "startTime": "2025-01-15T20:00:00",
    "endTime": "2025-01-15T21:00:00",
    "priority": 100,
    "autoApply": true,
    "rewards": [{
      "rewardType": "DISCOUNT_PERCENT",
      "value": {"percent": 90}
    }]
  }'
```

### Test Case 2: Evaluate BOGO

```bash
# Evaluate cart for BOGO
curl -X POST http://localhost:4000/offers/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [
      {"product_id": 12, "quantity": 2, "price": 500}
    ],
    "customerId": 1
  }'
```

---

## 📞 Support

For questions or issues:
- Check logs: `backend/src/modules/offers/`
- Database: `psql -d trustcart_erp`
- API Testing: Use Postman collection

---

## ✅ Checklist

- [x] Database migration executed
- [x] Entities registered in app.module.ts
- [x] Backend service with evaluation logic
- [x] REST API endpoints
- [x] Admin UI for offer management
- [x] Offer creation form
- [ ] Integrate with checkout page
- [ ] Test all offer types
- [ ] Set up monitoring/alerts
- [ ] Train staff on admin panel

---

**Status**: ✅ Backend & Admin UI Complete - Ready for Integration

**Next Steps**: 
1. Run database migration
2. Access admin panel at `http://localhost:3000/admin/offers`
3. Create test offers
4. Integrate with checkout flow
