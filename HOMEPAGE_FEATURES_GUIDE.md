# Homepage Features Implementation Guide

## Overview
This guide documents the complete implementation of the new homepage features for TrustCart ERP, including Deal of the Day, Popular Products, New Arrivals, Featured Products, Recently Viewed, Combo Deals, Customer Reviews, and Email Subscription.

## Implementation Date
December 12, 2025

## Features Implemented

### 1. Homepage Sections
The new homepage includes the following sections in order:

1. **Hero Banner** - Welcome section with CTA
2. **Deal of the Day (আজকের বিশেষ অফার)** - Special daily deals with timer
3. **Popular Products (জনপ্রিয় পণ্য)** - Best-selling products
4. **Combo Deals (কম্বো অফার)** - Product bundles with discounts
5. **New Arrivals (নতুন পণ্য)** - Recently added products
6. **Featured Products (বিশেষ নির্বাচিত)** - Hand-picked products
7. **Recently Viewed (সম্প্রতি দেখা পণ্য)** - User's browsing history
8. **Customer Reviews (গ্রাহক পর্যালোচনা)** - Featured customer testimonials
9. **Email Subscribe (নিউজলেটার সাবস্ক্রাইব)** - Newsletter signup
10. **Features Section** - Free delivery, secure payment, easy return, 24/7 support

### 2. Add to Cart Popup
- **Top Section**: Continue Shopping button and View Cart button
- **Bottom Section**: "আপনি পছন্দ করতে পারেন" (You may love) with 4 suggested products
- Bilingual content (Bengali + English)
- Responsive design with animations

### 3. Product Detail Page Enhancement
- Related products section at the bottom
- Fetches products from same category using API
- Title: "সম্পর্কিত পণ্য" (Related Products)
- Shows up to 12 related products

### 4. Cart Page Enhancement
- Complete cart management with quantity controls
- Order summary with delivery charges
- Free delivery notification for orders ৳500+
- **কার্টে আরও যা যুক্ত করতে পারেন** section with 8 suggested products
- Enhanced UI with Bengali + English labels

## Database Schema

### New Tables Created

#### 1. Product Feature Flags (Modified `products` table)
```sql
ALTER TABLE products ADD COLUMN:
- is_deal_of_day BOOLEAN DEFAULT FALSE
- is_popular BOOLEAN DEFAULT FALSE
- is_new_arrival BOOLEAN DEFAULT FALSE
- is_featured BOOLEAN DEFAULT FALSE
- deal_price DECIMAL(10,2)
- deal_expires_at TIMESTAMP
```

#### 2. combo_deals
```sql
CREATE TABLE combo_deals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) NOT NULL,
  combo_price DECIMAL(10,2),
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. combo_deal_products (Junction Table)
```sql
CREATE TABLE combo_deal_products (
  combo_deal_id INTEGER REFERENCES combo_deals(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  PRIMARY KEY (combo_deal_id, product_id)
);
```

#### 4. customer_reviews
```sql
CREATE TABLE customer_reviews (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  video_url VARCHAR(255),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. email_subscribers
```sql
CREATE TABLE email_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP
);
```

#### 6. user_product_views
```sql
CREATE TABLE user_product_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backend Implementation

### New Modules Created

#### 1. Combos Module
**Location**: `backend/src/modules/combos/`

**Files**:
- `combo-deal.entity.ts` - TypeORM entity
- `combos.service.ts` - Business logic
- `combos.controller.ts` - REST endpoints
- `combos.module.ts` - Module configuration

**Endpoints**:
- `GET /api/combos` - List all active combo deals
- `GET /api/combos/:slug` - Get combo deal by slug
- `POST /api/combos` - Create new combo deal (admin)

#### 2. Reviews Module
**Location**: `backend/src/modules/reviews/`

**Files**:
- `customer-review.entity.ts`
- `reviews.service.ts`
- `reviews.controller.ts`
- `reviews.module.ts`

**Endpoints**:
- `GET /api/reviews` - List all approved reviews
- `GET /api/reviews/featured` - Get featured reviews
- `GET /api/reviews/product/:productId` - Get reviews for a product
- `POST /api/reviews` - Submit new review

#### 3. Subscribers Module
**Location**: `backend/src/modules/subscribers/`

**Files**:
- `email-subscriber.entity.ts`
- `subscribers.service.ts`
- `subscribers.controller.ts`
- `subscribers.module.ts`

**Endpoints**:
- `POST /api/subscribers/subscribe` - Subscribe to newsletter
- `POST /api/subscribers/unsubscribe` - Unsubscribe from newsletter
- `GET /api/subscribers` - List all subscribers (admin)

#### 4. Product Views Module
**Location**: `backend/src/modules/product-views/`

**Files**:
- `user-product-view.entity.ts`
- `product-views.service.ts`
- `product-views.controller.ts`
- `product-views.module.ts`

**Endpoints**:
- `POST /api/product-views/track` - Track product view
- `GET /api/product-views/recent` - Get recently viewed products

### Extended Products Module

Added new methods to `ProductsService`:
- `findDealOfDay()` - Get deal of day products
- `findPopular()` - Get popular products
- `findNewArrivals()` - Get new arrival products
- `findFeatured()` - Get featured products
- `findRelated(productId, limit)` - Get related products by category
- `findSuggested(limit)` - Get random suggested products
- `findRecentlyViewed(userId, sessionId, limit)` - Get user's recently viewed products

Added new endpoints to `ProductsController`:
- `GET /api/products/featured/deal-of-day`
- `GET /api/products/featured/popular`
- `GET /api/products/featured/new-arrivals`
- `GET /api/products/featured/featured`
- `GET /api/products/related/:productId`
- `GET /api/products/featured/suggested`
- `GET /api/products/featured/recently-viewed`

## Frontend Implementation

### New Components

#### AddToCartPopup.tsx
**Location**: `frontend/src/components/AddToCartPopup.tsx`

**Features**:
- Modal popup with backdrop
- Top section: Continue Shopping + View Cart buttons
- Bottom section: 4 suggested products
- Fully bilingual (Bengali + English)
- Responsive design
- Smooth animations

**Usage**:
```tsx
<AddToCartPopup 
  isOpen={showPopup}
  onClose={() => setShowPopup(false)}
  product={selectedProduct}
/>
```

### Updated Pages

#### 1. Homepage (index.tsx)
**Location**: `frontend/src/pages/index.tsx`

**New Features**:
- 10 distinct sections with Bengali + English titles
- Loads data from 7 different API endpoints
- Session-based recently viewed tracking
- Email subscription form with validation
- AddToCartPopup integration
- Fully responsive grid layouts

**State Management**:
```tsx
const [dealOfDayProducts, setDealOfDayProducts] = useState<any[]>([]);
const [popularProducts, setPopularProducts] = useState<any[]>([]);
const [newArrivals, setNewArrivals] = useState<any[]>([]);
const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
const [combosDeals, setCombosDeals] = useState<any[]>([]);
const [customerReviews, setCustomerReviews] = useState<any[]>([]);
```

#### 2. Product Detail Page (product/[slug].tsx)
**Location**: `frontend/src/pages/product/[slug].tsx`

**Changes**:
- Related products now fetched from API based on product ID and category
- Title changed to Bengali: "সম্পর্কিত পণ্য"
- Shows subtitle: "Related Products - একই ক্যাটাগরির আরও পণ্য"
- Displays up to 12 related products

#### 3. Cart Page (cart.tsx)
**Location**: `frontend/src/pages/cart.tsx`

**Complete Redesign**:
- **Left Column (8/12)**: Cart items with:
  - Product image, name, SKU
  - Quantity controls (+/-)
  - Price display
  - Remove button
- **Right Column (4/12)**: Order summary with:
  - Subtotal calculation
  - Delivery charges (Free for ৳500+)
  - Total amount
  - Checkout button
  - Continue shopping button
- **Bottom Section**: "কার্টে আরও যা যুক্ত করতে পারেন" with 8 suggested products
- Empty cart state with CTA

### API Integration

#### Extended api.ts
**Location**: `frontend/src/services/api.ts`

**New API Methods**:

```typescript
// Products API Extensions
products.getDealOfDay()
products.getPopular()
products.getNewArrivals()
products.getFeatured()
products.getRelated(productId, limit)
products.getSuggested(limit)
products.getRecentlyViewed(userId, sessionId, limit)

// Combo Deals API
combos.list()
combos.getBySlug(slug)
combos.create(data)

// Reviews API
reviews.list()
reviews.getFeatured()
reviews.getByProduct(productId)
reviews.create(data)

// Subscribers API
subscribers.subscribe(email)
subscribers.unsubscribe(email)

// Product Views API
productViews.trackView(productId, userId, sessionId)
productViews.getRecentlyViewed(userId, sessionId, limit)
```

## Sample Data

### Combo Deals (4 samples)
1. **Immunity Booster Combo** - 25% off, ৳1200
2. **Energy Essentials Pack** - 20% off, ৳1500
3. **Heart Health Bundle** - 30% off, ৳1800
4. **Weight Management Kit** - 25% off, ৳2000

### Customer Reviews (6 samples)
- 3 featured reviews with video URLs
- 3 text-only reviews
- Mix of Bengali and English content
- Ratings from 4-5 stars
- Linked to products

## Setup Instructions

### Step 1: Run Database Migration
```bash
cd backend
psql -U postgres -d trustcart_erp -f homepage-features-migration.sql
```

**This will**:
- Add product feature flags
- Create 6 new tables
- Add indexes for performance
- Insert sample data

### Step 2: Verify Database
```bash
psql -U postgres -d trustcart_erp -c "
  SELECT 'Deal of Day:', COUNT(*) FROM products WHERE is_deal_of_day = TRUE;
  SELECT 'Combo Deals:', COUNT(*) FROM combo_deals;
  SELECT 'Reviews:', COUNT(*) FROM customer_reviews;
"
```

### Step 3: Update app.module.ts
Already updated with:
- 4 new entities imported
- 4 new modules registered
- Entities added to TypeORM configuration

### Step 4: Restart Backend
```bash
cd backend
npm run start:dev
```

**Verify**:
- Server starts without errors
- Check console for module loading
- No TypeORM errors

### Step 5: Restart Frontend
```bash
cd frontend
npm run dev
```

**Verify**:
- Next.js compiles successfully
- No TypeScript errors
- Homepage loads all sections

## Testing Checklist

### Homepage Tests
- [ ] Hero banner displays correctly
- [ ] Deal of Day section loads with timer
- [ ] Popular products display (8 products)
- [ ] Combo deals show with discount badges
- [ ] New arrivals display with "NEW" badge
- [ ] Featured products section loads
- [ ] Recently viewed shows user's history
- [ ] Customer reviews display correctly
- [ ] Video reviews embed properly
- [ ] Email subscription form works
- [ ] Success/error messages display
- [ ] All sections responsive on mobile

### Add to Cart Popup Tests
- [ ] Popup opens when product added to cart
- [ ] Continue Shopping button closes popup
- [ ] View Cart button navigates to cart
- [ ] 4 suggested products display
- [ ] Product images load correctly
- [ ] Clicking suggested product navigates correctly
- [ ] Popup closes on backdrop click
- [ ] Popup closes on X button

### Product Detail Page Tests
- [ ] Related products section displays
- [ ] Products from same category show
- [ ] Up to 12 related products display
- [ ] Bengali + English titles display
- [ ] ProductCard components work

### Cart Page Tests
- [ ] Empty cart state shows correctly
- [ ] Cart items display with images
- [ ] Quantity controls work (+/-)
- [ ] Remove button works
- [ ] Clear all button works
- [ ] Subtotal calculates correctly
- [ ] Delivery charge logic works (Free for ৳500+)
- [ ] Total amount correct
- [ ] Suggested products section loads
- [ ] 8 suggested products display
- [ ] Checkout button navigates
- [ ] Continue shopping button works

## API Endpoints Summary

### Products
- `GET /api/products/featured/deal-of-day` - Deal of day products
- `GET /api/products/featured/popular` - Popular products
- `GET /api/products/featured/new-arrivals` - New arrivals
- `GET /api/products/featured/featured` - Featured products
- `GET /api/products/related/:productId?limit=4` - Related products
- `GET /api/products/featured/suggested?limit=4` - Suggested products
- `GET /api/products/featured/recently-viewed?userId=&sessionId=&limit=8` - Recently viewed

### Combos
- `GET /api/combos` - All combo deals
- `GET /api/combos/:slug` - Single combo by slug
- `POST /api/combos` - Create combo (admin)

### Reviews
- `GET /api/reviews` - All approved reviews
- `GET /api/reviews/featured` - Featured reviews
- `GET /api/reviews/product/:productId` - Product reviews
- `POST /api/reviews` - Submit review

### Subscribers
- `POST /api/subscribers/subscribe` - Subscribe email
- `POST /api/subscribers/unsubscribe` - Unsubscribe email
- `GET /api/subscribers` - List subscribers (admin)

### Product Views
- `POST /api/product-views/track` - Track view
- `GET /api/product-views/recent?userId=&sessionId=&limit=8` - Get recent views

## Files Created/Modified

### Database
- ✅ `backend/homepage-features-migration.sql` (280 lines)

### Backend - Entities
- ✅ `backend/src/modules/combos/combo-deal.entity.ts`
- ✅ `backend/src/modules/reviews/customer-review.entity.ts`
- ✅ `backend/src/modules/subscribers/email-subscriber.entity.ts`
- ✅ `backend/src/modules/product-views/user-product-view.entity.ts`

### Backend - Services
- ✅ `backend/src/modules/combos/combos.service.ts`
- ✅ `backend/src/modules/reviews/reviews.service.ts`
- ✅ `backend/src/modules/subscribers/subscribers.service.ts`
- ✅ `backend/src/modules/product-views/product-views.service.ts`
- ✅ `backend/src/modules/products/products.service.ts` (extended)

### Backend - Controllers
- ✅ `backend/src/modules/combos/combos.controller.ts`
- ✅ `backend/src/modules/reviews/reviews.controller.ts`
- ✅ `backend/src/modules/subscribers/subscribers.controller.ts`
- ✅ `backend/src/modules/product-views/product-views.controller.ts`
- ✅ `backend/src/modules/products/products.controller.ts` (extended)

### Backend - Modules
- ✅ `backend/src/modules/combos/combos.module.ts`
- ✅ `backend/src/modules/reviews/reviews.module.ts`
- ✅ `backend/src/modules/subscribers/subscribers.module.ts`
- ✅ `backend/src/modules/product-views/product-views.module.ts`
- ✅ `backend/src/app.module.ts` (updated)

### Frontend - Components
- ✅ `frontend/src/components/AddToCartPopup.tsx`

### Frontend - Pages
- ✅ `frontend/src/pages/index.tsx` (completely redesigned)
- ✅ `frontend/src/pages/product/[slug].tsx` (updated)
- ✅ `frontend/src/pages/cart.tsx` (completely redesigned)

### Frontend - Services
- ✅ `frontend/src/services/api.ts` (extended)

### Backup Files Created
- `frontend/src/pages/index-old.tsx` (original homepage)
- `frontend/src/pages/cart-old.tsx` (original cart)

## Performance Considerations

### Database Indexes
All new tables have proper indexes:
- Product flags indexed for fast filtering
- Slug columns indexed for lookups
- Foreign keys indexed for joins
- Composite indexes for junction tables

### API Optimization
- Queries use proper JOINs and ARRAY_AGG
- WHERE clauses filter inactive/unpublished items
- LIMIT clauses prevent excessive data fetch
- Proper error handling prevents crashes

### Frontend Optimization
- Parallel API calls using Promise.all
- Lazy loading of images
- Session storage for recently viewed
- Debounced form submissions

## Future Enhancements

### Potential Improvements
1. **Admin Panel**:
   - Manage deal of day products
   - Approve/reject reviews
   - Create combo deals
   - View subscriber list

2. **Advanced Features**:
   - Product view tracking for analytics
   - Personalized recommendations
   - Review moderation workflow
   - Email campaign management

3. **Performance**:
   - Redis caching for frequently accessed data
   - CDN for product images
   - API response caching
   - Database query optimization

4. **SEO**:
   - Meta tags for combo deals
   - Structured data for reviews
   - Sitemap generation
   - Open Graph tags

## Troubleshooting

### Common Issues

**1. Database Migration Fails**
```bash
# Check if tables already exist
psql -U postgres -d trustcart_erp -c "\dt combo_deals"

# Drop tables if needed (caution!)
DROP TABLE IF EXISTS combo_deal_products CASCADE;
DROP TABLE IF EXISTS combo_deals CASCADE;
```

**2. Backend Module Not Loading**
- Check TypeORM entity imports in app.module.ts
- Verify all module imports
- Check for TypeScript compilation errors
- Restart backend with `npm run start:dev`

**3. Frontend API Calls Failing**
- Verify backend is running on port 3001
- Check CORS configuration
- Inspect browser network tab
- Check API base URL in api.ts

**4. Homepage Sections Not Loading**
- Open browser console for errors
- Check API endpoints return data
- Verify state management in useEffect
- Check for CORS/network issues

**5. AddToCartPopup Not Showing**
- Verify Bootstrap CSS is loaded
- Check modal state management
- Inspect z-index conflicts
- Check for JavaScript errors

## Support

For issues or questions:
1. Check console for errors
2. Verify database migration completed
3. Ensure all services are running
4. Review API responses in Network tab
5. Check this documentation

## Version History

**Version 1.0** - December 12, 2025
- Initial implementation
- All features complete
- Documentation created
- Ready for production

---

**Implementation Complete** ✅  
All homepage features, popup, related products, and cart enhancements successfully implemented and ready for deployment.
