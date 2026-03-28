import axios from 'axios';

import { BACKEND_API_BASE_URL } from '@/config/backend';

const apiClient = axios.create({
  baseURL: BACKEND_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

// Transform snake_case API response to camelCase for frontend
const transformProduct = (p: any) => {
  // Generate image paths
  const imageName = p.image_url || null;
  let largeImage = '/images/default-product.png';
  let thumbImage = '/images/default-product.png';
  
  if (imageName) {
    if (imageName.startsWith('http')) {
      largeImage = imageName;
      thumbImage = imageName;
    } else {
      largeImage = `/assets/uploads/${imageName}`;
      thumbImage = `/assets/uploads/thumbs/${imageName}`;
    }
  }
  
  return {
    id: p.id,
    slug: p.slug || '', // ADD: slug field
    sku: p.sku,
    productCode: p.product_code,
    name: p.name_en || p.name || 'Unknown Product',
    nameEn: p.name_en || p.name || 'Unknown Product',
    nameBn: p.name_bn || '',
    descriptionEn: p.description_en,
    price: parseFloat(p.base_price) || parseFloat(p.selling_price) || parseFloat(p.price) || 0,
    basePrice: parseFloat(p.base_price) || 0,
    wholesalePrice: parseFloat(p.wholesale_price) || 0,
    originalPrice: p.wholesale_price ? parseFloat(p.base_price) : (parseFloat(p.base_price) * 1.2) || 0,
    stock: p.stock_quantity != null ? Number(p.stock_quantity) : 0,
    sold: 0,
    rating: 5,
    reviews: 0,
    image: largeImage,
    imageUrl: largeImage,
    thumb: thumbImage,
    categoryId: p.category_id,
    category_id: p.category_id,
    status: p.status || 'active',
    createdAt: p.created_at
  };
};

export const products = {
  async list() {
    try {
      const res = await apiClient.get('/products');
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length > 0) {
        const transformed = data.map(transformProduct);
        return transformed;
      }
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching products:', err);
      throw err;
    }
  },
  async get(id: string | number) {
    const res = await apiClient.get(`/products/${id}`);
    return transformProduct(res.data);
  },
  async getBySlug(slug: string) {
    try {
      const res = await apiClient.get(`/products/by-slug/${slug}`);
      return transformProduct(res.data);
    } catch (err) {
      console.error('Error fetching product by slug:', err);
      throw err;
    }
  },
  async create(data: any) {
    const res = await apiClient.post('/products', data);
    return res.data;
  },
  async update(id: string | number, data: any) {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data;
  },
  async delete(id: string | number) {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  },
  
  // Homepage Features
  async getDealOfDay() {
    try {
      const res = await apiClient.get('/products/featured/deal-of-day');
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching deal of day:', err);
      return [];
    }
  },
  async getPopular() {
    try {
      const res = await apiClient.get('/products/featured/popular');
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching popular products:', err);
      return [];
    }
  },
  async getNewArrivals() {
    try {
      const res = await apiClient.get('/products/featured/new-arrivals');
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching new arrivals:', err);
      return [];
    }
  },
  async getFeatured() {
    try {
      const res = await apiClient.get('/products/featured/featured');
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching featured products:', err);
      return [];
    }
  },
  async getRelated(productId: number, limit: number = 4) {
    try {
      const res = await apiClient.get(`/products/related/${productId}?limit=${limit}`);
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching related products:', err);
      return [];
    }
  },
  async getSuggested(limit: number = 4) {
    try {
      const res = await apiClient.get(`/products/featured/suggested?limit=${limit}`);
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching suggested products:', err);
      return [];
    }
  },
  async getRecentlyViewed(userId?: number, sessionId?: string, limit: number = 8) {
    try {
      let url = `/products/featured/recently-viewed?limit=${limit}`;
      if (userId) url += `&userId=${userId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      const res = await apiClient.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching recently viewed products:', err);
      return [];
    }
  },
};

// Transform category response
const transformCategory = (c: any) => ({
  id: c.id,
  name: c.name || '',
  nameEn: c.name_en || c.name || '',
  nameBn: c.name_bn || '',
  slug: c.slug || '',
  icon: '🗂',
  parent_id: c.parent_id || null,
});

export const categories = {
  async list(options?: { active?: boolean }) {
    const res = await apiClient.get('/categories', {
      params: options?.active === undefined ? undefined : { active: options.active },
    });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(transformCategory);
  },
};

// Customers API
export const customers = {
  async me() {
    const res = await apiClient.get('/customers/me');
    return res.data;
  },
  async list() {
    const res = await apiClient.get('/customers');
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: string | number) {
    const res = await apiClient.get(`/customers/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/customers', data);
    return res.data;
  },
  async update(id: string | number, data: any) {
    const res = await apiClient.put(`/customers/${id}`, data);
    return res.data;
  },
  async delete(id: string | number) {
    const res = await apiClient.delete(`/customers/${id}`);
    return res.data;
  },
};

// CDM / Family Members API
export const cdm = {
  async getFamily(customerId: number) {
    const res = await apiClient.get(`/cdm/family/${customerId}`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async addFamily(data: any) {
    const res = await apiClient.post('/cdm/family', data);
    return res.data;
  },
  async updateFamily(id: number, data: any) {
    const res = await apiClient.put(`/cdm/family/${id}`, data);
    return res.data;
  },
  async deleteFamily(id: number) {
    const res = await apiClient.delete(`/cdm/family/${id}`);
    return res.data;
  },
};

// Sales API
export const sales = {
  async list() {
    const res = await apiClient.get('/sales');
    return Array.isArray(res.data) ? res.data : [];
  },
  async my() {
    const res = await apiClient.get('/sales/my');
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: string | number) {
    const res = await apiClient.get(`/sales/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/sales', data);
    return res.data;
  },
  async update(id: string | number, data: any) {
    const res = await apiClient.put(`/sales/${id}`, data);
    return res.data;
  },
  async cancel(id: string | number, cancelReason?: string) {
    const res = await apiClient.post(`/sales/${id}/cancel`, cancelReason ? { cancelReason } : {});
    return res.data;
  },
  async delete(id: string | number) {
    const res = await apiClient.delete(`/sales/${id}`);
    return res.data;
  },
};

// Loyalty / Wallet / Referrals API
export const loyalty = {
  async getMyWallet() {
    const res = await apiClient.get(`/loyalty/me/wallet`);
    return res.data;
  },
  async getMyWalletTransactions(limit: number = 20) {
    const res = await apiClient.get(`/loyalty/me/wallet/transactions`, {
      params: { limit },
    });
    return Array.isArray(res.data) ? res.data : [];
  },
  async getMyReferrals() {
    const res = await apiClient.get(`/loyalty/me/referrals`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async getMyReferralCode() {
    const res = await apiClient.get(`/loyalty/me/referral-code`);
    return res.data?.referralCode as string;
  },
  async getMyReferralStats() {
    const res = await apiClient.get(`/loyalty/me/referrals/stats`);
    return res.data || {};
  },
  async getWallet(customerId: string) {
    const res = await apiClient.get(`/loyalty/wallet/${customerId}`);
    return res.data;
  },
  async getWalletTransactions(customerId: string, limit: number = 20) {
    const res = await apiClient.get(`/loyalty/wallet/${customerId}/transactions`, {
      params: { limit },
    });
    return Array.isArray(res.data) ? res.data : [];
  },
  async getReferrals(customerId: string) {
    const res = await apiClient.get(`/loyalty/referrals/${customerId}`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async getReferralCode(customerId: string) {
    const res = await apiClient.get(`/loyalty/referral-code/${customerId}`);
    return res.data?.referralCode as string;
  },
  async getReferralStats(customerId: string) {
    const res = await apiClient.get(`/loyalty/referrals/${customerId}/stats`);
    return res.data || {};
  },
};

// Support Tickets API
export const support = {
  async list() {
    const res = await apiClient.get('/support');
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/support', data);
    return res.data;
  },
};

// Blog API
export const blog = {
  async listPosts() {
    try {
      const res = await apiClient.get('/blog/posts');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching blog posts:', err);
      return [];
    }
  },
  async getPostBySlug(slug: string) {
    try {
      const res = await apiClient.get(`/blog/posts/slug/${slug}`);
      return res.data;
    } catch (err) {
      console.error('Error fetching blog post:', err);
      throw err;
    }
  },
  async getPostsByCategory(categorySlug: string) {
    try {
      const res = await apiClient.get(`/blog/posts/category/${categorySlug}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching posts by category:', err);
      return [];
    }
  },
  async getPostsByTag(tagSlug: string) {
    try {
      const res = await apiClient.get(`/blog/posts/tag/${tagSlug}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching posts by tag:', err);
      return [];
    }
  },
  async getRelatedPosts(postId: number) {
    try {
      const res = await apiClient.get(`/blog/posts/${postId}/related`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching related posts:', err);
      return [];
    }
  },
  async listCategories() {
    try {
      const res = await apiClient.get('/blog/categories');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching blog categories:', err);
      return [];
    }
  },
  async listTags() {
    try {
      const res = await apiClient.get('/blog/tags');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching blog tags:', err);
      return [];
    }
  },
};

// Users API
export const users = {
  async me() {
    const res = await apiClient.get('/users/me');
    return res.data;
  },
  async list() {
    const res = await apiClient.get('/users');
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: string | number) {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/users', data);
    return res.data;
  },
  async update(id: string | number, data: any) {
    const res = await apiClient.put(`/users/${id}`, data);
    return res.data;
  },
  async updateMe(data: any) {
    const res = await apiClient.put('/users/me', data);
    return res.data;
  },
  async delete(id: string | number) {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  },
};

// RBAC API
export const rbac = {
  async listRoles(includeInactive?: boolean) {
    const res = await apiClient.get('/rbac/roles', { params: includeInactive ? { includeInactive: true } : undefined });
    return Array.isArray(res.data) ? res.data : [];
  },
  async createRole(data: { name: string; slug: string; description?: string; priority?: number }) {
    const res = await apiClient.post('/rbac/roles', data);
    return res.data;
  },
  async updateRole(roleId: string | number, data: { name?: string; slug?: string; description?: string; priority?: number; is_active?: boolean }) {
    const res = await apiClient.put(`/rbac/roles/${roleId}`, data);
    return res.data;
  },
  async deactivateRole(roleId: string | number) {
    const res = await apiClient.delete(`/rbac/roles/${roleId}`);
    return res.data;
  },
  async listPermissions(module?: string) {
    const res = await apiClient.get('/rbac/permissions', { params: module ? { module } : undefined });
    return Array.isArray(res.data) ? res.data : [];
  },
  async getRolePermissions(roleId: string | number) {
    const res = await apiClient.get(`/rbac/roles/${roleId}/permissions`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async setRolePermissions(roleId: string | number, permissionIds: number[]) {
    const res = await apiClient.put(`/rbac/roles/${roleId}/permissions`, { permissionIds });
    return res.data;
  },
  async grantRolePermission(roleId: string | number, permissionId: number) {
    const res = await apiClient.post(`/rbac/roles/${roleId}/permissions`, { permissionId });
    return res.data;
  },
  async revokeRolePermission(roleId: string | number, permissionId: number) {
    const res = await apiClient.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`);
    return res.data;
  },
  async getUserRoles(userId: string | number) {
    const res = await apiClient.get(`/rbac/users/${userId}/roles`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async assignRole(userId: string | number, roleId: number) {
    const res = await apiClient.post(`/rbac/users/${userId}/roles`, { roleId });
    return res.data;
  },
  async removeRole(userId: string | number, roleId: number) {
    const res = await apiClient.delete(`/rbac/users/${userId}/roles/${roleId}`);
    return res.data;
  },
  async getUserPermissions(userId: string | number) {
    const res = await apiClient.get(`/rbac/users/${userId}/permissions`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async grantPermission(userId: string | number, permissionId: number) {
    const res = await apiClient.post(`/rbac/users/${userId}/permissions`, { permissionId });
    return res.data;
  },
  async revokePermission(userId: string | number, permissionId: number) {
    const res = await apiClient.delete(`/rbac/users/${userId}/permissions/${permissionId}`);
    return res.data;
  },
};

// Combo Deals API
export const combos = {
  async list() {
    try {
      const res = await apiClient.get('/combos');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching combo deals:', err);
      return [];
    }
  },
  async getBySlug(slug: string) {
    try {
      const res = await apiClient.get(`/combos/${slug}`);
      return res.data;
    } catch (err) {
      console.error('Error fetching combo deal:', err);
      throw err;
    }
  },
  async create(data: any) {
    const res = await apiClient.post('/combos', data);
    return res.data;
  },
};

// Customer Reviews API
export const reviews = {
  async list() {
    try {
      const res = await apiClient.get('/reviews');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching reviews:', err);
      return [];
    }
  },
  async getFeatured() {
    try {
      const res = await apiClient.get('/reviews/featured');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching featured reviews:', err);
      return [];
    }
  },
  async getByProduct(productId: number) {
    try {
      const res = await apiClient.get(`/reviews/product/${productId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Error fetching product reviews:', err);
      return [];
    }
  },
  async create(data: any) {
    const res = await apiClient.post('/reviews', data);
    return res.data;
  },
};

// Email Subscribers API
export const subscribers = {
  async subscribe(email: string) {
    try {
      const res = await apiClient.post('/subscribers/subscribe', { email });
      return res.data;
    } catch (err) {
      console.error('Error subscribing:', err);
      throw err;
    }
  },
  async unsubscribe(email: string) {
    try {
      const res = await apiClient.post('/subscribers/unsubscribe', { email });
      return res.data;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      throw err;
    }
  },
};

// Product Views API
export const productViews = {
  async trackView(productId: number, userId?: number, sessionId?: string) {
    try {
      const res = await apiClient.post('/product-views/track', {
        productId,
        userId,
        sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      return res.data;
    } catch (err) {
      console.error('Error tracking product view:', err);
      return { success: false };
    }
  },
  async getRecentlyViewed(userId?: number, sessionId?: string, limit: number = 8) {
    try {
      let url = `/product-views/recent?limit=${limit}`;
      if (userId) url += `&userId=${userId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      const res = await apiClient.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(transformProduct);
    } catch (err) {
      console.error('Error fetching recently viewed:', err);
      return [];
    }
  },
};

// Warehouse API
export const warehouses = {
  async list() {
    const res = await apiClient.get('/warehouses');
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/warehouses/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/warehouses', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/warehouses/${id}`, data);
    return res.data;
  },
  async remove(id: number) {
    const res = await apiClient.delete(`/warehouses/${id}`);
    return res.data;
  },
  // Zones
  async listZones(warehouseId: number) {
    const res = await apiClient.get(`/warehouses/${warehouseId}/zones`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async createZone(warehouseId: number, data: any) {
    const res = await apiClient.post(`/warehouses/zones`, data);
    return res.data;
  },
  async updateZone(warehouseId: number, zoneId: number, data: any) {
    const res = await apiClient.put(`/warehouses/zones/${zoneId}`, data);
    return res.data;
  },
  async removeZone(warehouseId: number, zoneId: number) {
    const res = await apiClient.delete(`/warehouses/zones/${zoneId}`);
    return res.data;
  },
  // Locations
  async listLocations(warehouseId: number) {
    const res = await apiClient.get(`/warehouses/${warehouseId}/locations`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async createLocation(warehouseId: number, data: any) {
    const res = await apiClient.post(`/warehouses/locations`, data);
    return res.data;
  },
  async updateLocation(warehouseId: number, locationId: number, data: any) {
    const res = await apiClient.put(`/warehouses/locations/${locationId}`, data);
    return res.data;
  },
  async removeLocation(warehouseId: number, locationId: number) {
    const res = await apiClient.delete(`/warehouses/locations/${locationId}`);
    return res.data;
  },
};

// Supplier API
export const suppliers = {
  async list() {
    const res = await apiClient.get('/suppliers');
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/suppliers', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/suppliers/${id}`, data);
    return res.data;
  },
  async remove(id: number) {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data;
  },
  // Supplier Products
  async listProducts(supplierId: number) {
    const res = await apiClient.get(`/suppliers/${supplierId}/products`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async addProduct(supplierId: number, data: any) {
    const res = await apiClient.post(`/suppliers/${supplierId}/products`, data);
    return res.data;
  },
  async updateProduct(supplierId: number, productId: number, data: any) {
    const res = await apiClient.put(`/suppliers/${supplierId}/products/${productId}`, data);
    return res.data;
  },
  async removeProduct(supplierId: number, productId: number) {
    const res = await apiClient.delete(`/suppliers/${supplierId}/products/${productId}`);
    return res.data;
  },
};

// ── Purchase Orders ──────────────────────────────────
export const purchaseOrders = {
  async list(status?: string) {
    const params = status ? { status } : {};
    const res = await apiClient.get('/purchase/orders', { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/purchase/orders/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/purchase/orders', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/purchase/orders/${id}`, data);
    return res.data;
  },
  async remove(id: number) {
    const res = await apiClient.delete(`/purchase/orders/${id}`);
    return res.data;
  },
  async submit(id: number) {
    const res = await apiClient.post(`/purchase/orders/${id}/submit`);
    return res.data;
  },
  async approve(id: number) {
    const res = await apiClient.post(`/purchase/orders/${id}/approve`);
    return res.data;
  },
  async reject(id: number, reason?: string) {
    const res = await apiClient.post(`/purchase/orders/${id}/reject`, { reason });
    return res.data;
  },
  async cancel(id: number, reason: string) {
    const res = await apiClient.post(`/purchase/orders/${id}/cancel`, { reason });
    return res.data;
  },
  async duplicate(id: number) {
    const res = await apiClient.post(`/purchase/orders/${id}/duplicate`);
    return res.data;
  },
};

// ── Goods Received Notes ─────────────────────────────
export const grns = {
  async list(poId?: number) {
    const params = poId ? { po_id: poId } : {};
    const res = await apiClient.get('/purchase/grns', { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/purchase/grns/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/purchase/grns', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/purchase/grns/${id}`, data);
    return res.data;
  },
  async accept(id: number) {
    const res = await apiClient.post(`/purchase/grns/${id}/accept`);
    return res.data;
  },
  async reject(id: number, reason?: string) {
    const res = await apiClient.post(`/purchase/grns/${id}/reject`, { reason });
    return res.data;
  },
};

// ── Stock Adjustments ─────────────────────────────────

export const stockAdjustments = {
  async list(params?: { status?: string; warehouse_id?: number; adjustment_type?: string }) {
    const res = await apiClient.get('/inventory/adjustments', { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/inventory/adjustments/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/inventory/adjustments', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/inventory/adjustments/${id}`, data);
    return res.data;
  },
  async submit(id: number) {
    const res = await apiClient.post(`/inventory/adjustments/${id}/submit`);
    return res.data;
  },
  async approve(id: number) {
    const res = await apiClient.post(`/inventory/adjustments/${id}/approve`);
    return res.data;
  },
  async reject(id: number, reason?: string) {
    const res = await apiClient.post(`/inventory/adjustments/${id}/reject`, { reason });
    return res.data;
  },
};

// ── Stock Transfers ───────────────────────────────────

export const stockTransfers = {
  async list(params?: { status?: string; warehouse_id?: number }) {
    const res = await apiClient.get('/inventory/transfers', { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/inventory/transfers/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/inventory/transfers', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/inventory/transfers/${id}`, data);
    return res.data;
  },
  async approve(id: number) {
    const res = await apiClient.post(`/inventory/transfers/${id}/approve`);
    return res.data;
  },
  async ship(id: number, data?: any) {
    const res = await apiClient.post(`/inventory/transfers/${id}/ship`, data);
    return res.data;
  },
  async receive(id: number, data?: any) {
    const res = await apiClient.post(`/inventory/transfers/${id}/receive`, data);
    return res.data;
  },
  async cancel(id: number) {
    const res = await apiClient.post(`/inventory/transfers/${id}/cancel`);
    return res.data;
  },
};

// ── Inventory Counts ──────────────────────────────────

export const inventoryCounts = {
  async list(params?: { status?: string; warehouse_id?: number; count_type?: string }) {
    const res = await apiClient.get('/inventory/counts', { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  async get(id: number) {
    const res = await apiClient.get(`/inventory/counts/${id}`);
    return res.data;
  },
  async create(data: any) {
    const res = await apiClient.post('/inventory/counts', data);
    return res.data;
  },
  async start(id: number) {
    const res = await apiClient.post(`/inventory/counts/${id}/start`);
    return res.data;
  },
  async recordItems(id: number, items: any[]) {
    const res = await apiClient.post(`/inventory/counts/${id}/items`, { items });
    return res.data;
  },
  async complete(id: number) {
    const res = await apiClient.post(`/inventory/counts/${id}/complete`);
    return res.data;
  },
  async approve(id: number) {
    const res = await apiClient.post(`/inventory/counts/${id}/approve`);
    return res.data;
  },
};

export const stockAvailability = {
  async check(productId: number) {
    const res = await apiClient.get(`/inventory/availability/${productId}`);
    return res.data;
  },
  async bulkCheck(productIds: number[]) {
    const res = await apiClient.post('/inventory/availability/bulk', { product_ids: productIds });
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const stockAlerts = {
  async list(unreadOnly?: boolean) {
    const res = await apiClient.get('/inventory/alerts', { params: { unread: unreadOnly ? 'true' : undefined } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async unreadCount() {
    const res = await apiClient.get('/inventory/alerts/unread-count');
    return typeof res.data === 'number' ? res.data : 0;
  },
  async markRead(id: number) {
    const res = await apiClient.put(`/inventory/alerts/${id}/read`);
    return res.data;
  },
  async markAllRead() {
    const res = await apiClient.post('/inventory/alerts/read-all');
    return res.data;
  },
  async resolve(id: number, notes?: string) {
    const res = await apiClient.put(`/inventory/alerts/${id}/resolve`, { notes });
    return res.data;
  },
};

export const reorderRules = {
  async list(productId?: number) {
    const res = await apiClient.get('/inventory/reorder-rules', { params: { product_id: productId } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async create(data: any) {
    const res = await apiClient.post('/inventory/reorder-rules', data);
    return res.data;
  },
  async update(id: number, data: any) {
    const res = await apiClient.put(`/inventory/reorder-rules/${id}`, data);
    return res.data;
  },
  async remove(id: number) {
    const res = await apiClient.delete(`/inventory/reorder-rules/${id}`);
    return res.data;
  },
  async evaluate() {
    const res = await apiClient.post('/inventory/reorder-rules/evaluate');
    return res.data;
  },
};

export const inventoryDashboard = {
  async getKpis() {
    const res = await apiClient.get('/inventory/dashboard');
    return res.data;
  },
};

export const inventoryReports = {
  async valuation(warehouseId?: number) {
    const res = await apiClient.get('/inventory/reports/valuation', { params: { warehouse_id: warehouseId } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async movementLog(filters?: { date_from?: string; date_to?: string; product_id?: number; movement_type?: string; warehouse_id?: number }) {
    const res = await apiClient.get('/inventory/reports/movement-log', { params: filters });
    return Array.isArray(res.data) ? res.data : [];
  },
  async supplierPerformance(supplierId?: number) {
    const res = await apiClient.get('/inventory/reports/supplier-performance', { params: { supplier_id: supplierId } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async abcAnalysis() {
    const res = await apiClient.get('/inventory/reports/abc-analysis');
    return Array.isArray(res.data) ? res.data : [];
  },
  async deadStock(days?: number) {
    const res = await apiClient.get('/inventory/reports/dead-stock', { params: { days } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async fastSlowMovers(dateFrom?: string, dateTo?: string) {
    const res = await apiClient.get('/inventory/reports/fast-slow-movers', { params: { date_from: dateFrom, date_to: dateTo } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async countVariance(countId?: number) {
    const res = await apiClient.get('/inventory/reports/count-variance', { params: { count_id: countId } });
    return res.data;
  },
  exportUrl(type: string, params?: Record<string, string>) {
    const searchParams = new URLSearchParams({ type, ...params });
    return `/inventory/reports/export?${searchParams.toString()}`;
  },
};

export const stockLevels = {
  async list(query?: { product_id?: number; warehouse_id?: number }) {
    const res = await apiClient.get('/inventory/stock-levels', { params: query });
    return Array.isArray(res.data) ? res.data : [];
  },
  async summary() {
    const res = await apiClient.get('/inventory/stock-levels/summary');
    return Array.isArray(res.data) ? res.data : [];
  },
  async byProduct(productId: number) {
    const res = await apiClient.get(`/inventory/stock-levels/product/${productId}`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async byWarehouse(warehouseId: number) {
    const res = await apiClient.get(`/inventory/stock-levels/warehouse/${warehouseId}`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

// ── Phase 6: Supplier Portal ──────────────────────

export const supplierPortal = {
  async getProfile() {
    const res = await apiClient.get('/supplier-portal/profile');
    return res.data;
  },
  async updateProfile(data: any) {
    const res = await apiClient.put('/supplier-portal/profile', data);
    return res.data;
  },
  async getPurchaseOrders(params?: { status?: string; page?: number; limit?: number }) {
    const res = await apiClient.get('/supplier-portal/purchase-orders', { params });
    return res.data;
  },
  async getPurchaseOrder(id: number) {
    const res = await apiClient.get(`/supplier-portal/purchase-orders/${id}`);
    return res.data;
  },
  async confirmPurchaseOrder(id: number, data?: { expected_delivery_date?: string; notes?: string }) {
    const res = await apiClient.post(`/supplier-portal/purchase-orders/${id}/confirm`, data);
    return res.data;
  },
  async getCatalog() {
    const res = await apiClient.get('/supplier-portal/catalog');
    return Array.isArray(res.data) ? res.data : [];
  },
  async updateCatalogItem(id: number, data: any) {
    const res = await apiClient.put(`/supplier-portal/catalog/${id}`, data);
    return res.data;
  },
};

// ── Phase 6: Barcode ──────────────────────────────

export const inventoryBarcode = {
  async generateBlobUrl(text: string, type: string = 'code128'): Promise<string> {
    const res = await apiClient.get('/inventory/barcode/generate', {
      params: { text, type },
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },
  async getBatchLabel(batchId: number) {
    const res = await apiClient.get(`/inventory/barcode/label/batch/${batchId}`);
    return res.data;
  },
  async getLocationLabel(locationId: number) {
    const res = await apiClient.get(`/inventory/barcode/label/location/${locationId}`);
    return res.data;
  },
  async getPoLabel(poId: number) {
    const res = await apiClient.get(`/inventory/barcode/label/po/${poId}`);
    return res.data;
  },
  async lookup(code: string) {
    const res = await apiClient.get('/inventory/barcode/lookup', { params: { code } });
    return res.data;
  },
};

// ── Phase 6: Demand Forecasting ───────────────────

export const inventoryForecasts = {
  async list(warehouseId?: number) {
    const res = await apiClient.get('/inventory/forecasts', { params: { warehouse_id: warehouseId } });
    return Array.isArray(res.data) ? res.data : [];
  },
  async generate() {
    const res = await apiClient.post('/inventory/forecasts/generate');
    return res.data;
  },
  async accuracy() {
    const res = await apiClient.get('/inventory/forecasts/accuracy');
    return res.data;
  },
};

// ── Phase 6: Bulk Import ──────────────────────────

export const inventoryImport = {
  async validate(importType: string, rows: any[]) {
    const res = await apiClient.post('/inventory/import/validate', { import_type: importType, rows });
    return res.data;
  },
  async execute(importType: string, rows: any[]) {
    const res = await apiClient.post('/inventory/import/execute', { import_type: importType, rows });
    return res.data;
  },
};

// ── Phase 6: Audit Trail ──────────────────────────

export const inventoryAuditTrail = {
  async list(filters?: { product_id?: number; warehouse_id?: number; date_from?: string; date_to?: string; limit?: number }) {
    const res = await apiClient.get('/inventory/audit-trail', { params: filters });
    return Array.isArray(res.data) ? res.data : [];
  },
};

// ── Phase 6: Warehouse Map ────────────────────────

export const warehouseMap = {
  async get(warehouseId: number) {
    const res = await apiClient.get(`/inventory/warehouse-map/${warehouseId}`);
    return res.data;
  },
};

// ── Phase 6: Accounting Journals ──────────────────

export const accountingJournals = {
  async list(params?: { entry_type?: string; reference_type?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) {
    const res = await apiClient.get('/accounting/journals', { params });
    return res.data;
  },
  async get(id: number) {
    const res = await apiClient.get(`/accounting/journals/${id}`);
    return res.data;
  },
  async summary() {
    const res = await apiClient.get('/accounting/journals/summary');
    return res.data;
  },
};
