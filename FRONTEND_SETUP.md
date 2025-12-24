# TrustCart ERP - Frontend Setup & Usage

## 🚀 Running the Frontend

The frontend is already running on **http://localhost:3002**

### If you need to restart:

```bash
cd frontend
npm run dev
```

---

## 📋 Pages Created

### Customer E-Commerce

- **Home Page** (`/`) - Welcome page with features overview
- **Products List** (`/products`) - Browse all products 
- **Product Detail** (`/product/[id]`) - View single product details
- **Shopping Cart** (`/cart`) - View items in cart (localStorage-based)
- **Checkout** (`/checkout`) - Order form

### Admin Backend

- **Login** (`/admin/login`) - Admin login with JWT authentication

---

## 🔐 Admin Login

To test the admin login:

1. Navigate to **http://localhost:3002/admin/login**
2. Use credentials from the database:
   - **Email**: Any user email from `trustcart_erp.users` table
   - **Password**: User password (hashed in `password_hash`)

> **Note**: The backend auth endpoint is at `POST /auth/login`. The login page sends `{email, password}` and expects `{accessToken}` in response. The token is saved to localStorage.

---

## 🎨 Styling

- **Framework**: Bootstrap 5.3 (via CDN)
- **CSS Classes**: Bootstrap utilities (container, row, col-md-*, btn, card, navbar, etc.)
- **Layout Component**: Wraps all pages with Navbar and container

---

## 🔗 Backend Integration

### API Base URL

The frontend is configured to call the backend at:

```
http://localhost:3001
```

If backend runs on a different port/host, update `frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

Or set environment variable in `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://your-backend-url:3001
```

### API Helpers

```typescript
// Login
import { auth } from '@/services/api';
const { accessToken } = await auth.login('email@example.com', 'password');

// Get Products
import { products } from '@/services/api';
const allProducts = await products.list();
const product = await products.get(1);
```

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.tsx              # Home page
│   │   ├── products.tsx           # Products list
│   │   ├── product/[id].tsx       # Product detail
│   │   ├── cart.tsx               # Shopping cart
│   │   ├── checkout.tsx           # Checkout form
│   │   ├── admin/
│   │   │   └── login.tsx          # Admin login
│   │   ├── _app.tsx               # App wrapper with Layout
│   │   ├── _document.tsx          # HTML document (Bootstrap CDN)
│   ├── components/
│   │   ├── Layout.tsx             # Main layout wrapper
│   │   └── Navbar.tsx             # Navigation bar
│   ├── services/
│   │   └── api.ts                 # Axios client + auth/products helpers
│   └── styles/
│       └── globals.css
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

---

## 🏃 Development Workflow

### Hot Reload
Any changes to files in `src/` are automatically hot-reloaded in the browser.

### Build for Production

```bash
cd frontend
npm run build
npm run start
```

---

## ✅ Checklist

- [x] Bootstrap 5 CSS framework via CDN
- [x] Responsive navbar with links
- [x] E-commerce storefront (home, products, detail, cart, checkout)
- [x] Admin login page with JWT auth
- [x] Layout component for consistent UI
- [x] API service helpers (auth, products)
- [x] localStorage for cart data
- [x] Next.js hot reload in development

---

## 🐛 Troubleshooting

**Port 3002 in use?**
```bash
# Change port explicitly:
npm run dev -- -p 3003
```

**Backend not responding?**
- Ensure backend is running: `http://localhost:3001`
- Check browser console for CORS errors
- Verify `.env.local` or `NEXT_PUBLIC_API_URL` points to correct backend

**Styling not working?**
- Check bootstrap CSS loaded in Network tab
- Ensure `_document.tsx` has Bootstrap CDN links

---

## 🎯 Next Steps

1. **Test E-Commerce Flow**
   - Visit http://localhost:3002/
   - Browse products at `/products`
   - Click "Add to cart" (implement localStorage logic)
   - Proceed to checkout

2. **Test Admin Login**
   - Visit http://localhost:3002/admin/login
   - Try login with test credentials
   - Verify JWT token stored in localStorage

3. **Create Admin Dashboard**
   - Add `/admin/dashboard` page
   - Show user profile & logout
   - Display business stats

4. **Add Product CRUD**
   - Build admin product management
   - Connect to backend `/products` endpoints (POST, PUT, DELETE)

---

Generated: Dec 11, 2025 | TrustCart ERP Frontend v1.0
