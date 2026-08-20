# Customer Portal - Testing Guide

## ✅ Backend API Status

### Customers API
- **Endpoint**: `http://localhost:3001/api/customers`
- **Status**: ✅ WORKING
- **Records**: 55 customers
- **Fields Available**:
  - id, uuid, firstName, lastName, email, phone, mobile
  - companyName, website, address, city, district
  - segment_id, assigned_user_id, assigned_supervisor_id
  - source, rating, total_spent, customer_lifetime_value
  - preferred_contact_method, is_deleted, notes
  - last_contact_date, next_follow_up, assigned_to
  - priority, is_escalated, escalated_at
  - status, **isActive** ✅ (ADDED)
  - customerType, lifecycleStage
  - gender, dateOfBirth, maritalStatus, anniversaryDate
  - profession, availableTime
  - createdAt, updatedAt

## 📋 Customer Portal Menu Items

All menu items are properly configured and should load data:

### 1. Dashboard (`/customer/dashboard`)
- ✅ Basic welcome page
- No API calls required
- **Status**: READY

### 2. My Profile (`/customer/profile`)
- Uses: `/api/customers` (list) to find customer by email
- Uses: `/api/cdm/family/:customerId` for family members
- Features:
  - Edit name and phone
  - View/Add/Edit/Delete family members
- **Status**: READY

### 3. My Addresses (`/customer/addresses`)
- Uses: `/api/customers` to get customer address
- Features:
  - View and update primary address
- **Status**: READY

### 4. Wallet & Points (`/customer/wallet`)
- Uses: `/api/loyalty/wallet/:userId`
- Uses: `/api/loyalty/wallet/:userId/transactions`
- Features:
  - Balance, total earned, total spent
  - Transaction history
- **Status**: READY

### 5. My Orders (`/customer/orders`)
- Uses: `/api/customers` to find customer
- Uses: `/api/sales` to get all orders
- Filters orders by customer ID
- **Status**: READY

### 6. Support Tickets (`/customer/support`)
- Uses: `/api/customers` to find customer
- Uses: `/api/cdm/tickets` for support tickets
- Features:
  - View tickets
  - Create new tickets
  - Reply to tickets
- **Status**: READY

### 7. Referral Link (`/customer/referrals`)
- Uses: `/api/customers` to find customer
- Uses: `/api/loyalty/referral-link/:customerId`
- Uses: `/api/loyalty/referral-stats/:customerId`
- Features:
  - Share referral link
  - View referral stats (total referrals, converted, pending)
  - View list of referred customers
- **Status**: READY

## 🔧 Technical Configuration

### Backend
- **Port**: 3001
- **Mode**: Watch mode (`npm run start:dev`)
- **Database**: PostgreSQL (trustcart_erp)
- **Status**: ✅ Running

### Frontend
- **Port**: 3000
- **Mode**: Dev mode (`npm run dev`)
- **API Base**: `http://localhost:3001/api`
- **Status**: ✅ Running

## 🧪 Testing Steps

### 1. Test Backend API
```powershell
# Test customers endpoint
Invoke-RestMethod "http://localhost:3001/api/customers" | Select-Object -First 1

# Expected: Returns customer object with all fields including isActive
```

### 2. Test Frontend Access
1. Open: http://localhost:3000/customer/login
2. Login with test customer credentials
3. Navigate to each menu item:
   - Dashboard → Should show welcome message
   - My Profile → Should load customer details
   - My Addresses → Should show address form
   - Wallet & Points → Should show balance (may be 0 if no transactions)
   - My Orders → Should show orders or "no orders" message
   - Support Tickets → Should show tickets or empty state
   - Referral Link → Should show referral link and stats

### 3. Verify Loading States
- Each page should show "Loading..." initially
- Data should appear within 1-2 seconds
- No infinite "Loading..." states

### 4. Check for Errors
- Open browser console (F12)
- Look for any red errors
- Common issues:
  - 401 Unauthorized → Login again
  - 404 Not Found → Check API endpoint
  - 500 Internal Server Error → Check backend console

## 🎯 Success Criteria

✅ All menu items clickable and navigate correctly
✅ No infinite loading states
✅ API returns 200 status for `/api/customers`
✅ Customer data displays correctly on pages
✅ No console errors in browser
✅ Backend running without errors

## 📝 Sample Test Customers

From database (55 total):
- ahmed.karim@email.com
- fatima.akter@email.com
- john.doe@example.com
- sarah.khan@example.com
- ahmed.ali@example.com

All have `isActive: true`

## 🐛 Troubleshooting

### Issue: "Loading..." never ends
**Solution**: 
- Check backend is running on port 3001
- Check `/api/customers` returns 200
- Check browser console for errors

### Issue: 401 Unauthorized
**Solution**:
- Logout and login again
- Check authToken in localStorage
- Verify token validation endpoint

### Issue: No data showing
**Solution**:
- Check customer email matches database
- Verify customer record exists
- Check browser network tab for API responses

## ✅ Status: ALL SYSTEMS READY

- Backend API: ✅ Working
- Frontend: ✅ Running
- Database: ✅ 55 customers with isActive field
- Customer Portal: ✅ All menu items ready
- Authentication: ✅ Token-based auth configured
