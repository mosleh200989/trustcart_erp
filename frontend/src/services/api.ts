import axios from 'axios';

import { BACKEND_API_BASE_URL } from '@/config/backend';

console.log('API Base URL:', BACKEND_API_BASE_URL);

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

export const auth = {
  async login(identifier: string, password: string) {
    const res = await apiClient.post('/auth/login', { identifier, email: identifier, password });
    return res.data;
  },

  async getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      const res = await apiClient.get('/auth/me');
      const data = res.data as any;
      const user = data?.user as any;
      if (!user) return null;
      return {
        ...user,
        id: String(user?.id ?? ''),
        roles: data?.roles,
        permissions: data?.permissions,
      } as any;
    } catch (err) {
      console.error('Error loading current user:', err);
      return null;
    }
  },
};

// Transform snake_case API response to camelCase for frontend
const transformProduct = (p: any) => {
  console.log('Transforming product:', p);
  
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
    stock: 0, // No stock field in database
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
      console.log('Calling API:', `${BACKEND_API_BASE_URL}/products`);
      const res = await apiClient.get('/products');
      console.log('Raw API response:', res);
      console.log('Response data:', res.data);
      const data = Array.isArray(res.data) ? res.data : [];
      console.log('Products array length:', data.length);
      if (data.length > 0) {
        console.log('First product before transform:', data[0]);
        const transformed = data.map(transformProduct);
        console.log('First product after transform:', transformed[0]);
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
      console.log('Fetching product by slug:', slug);
      const res = await apiClient.get(`/products/by-slug/${slug}`);
      console.log('Product data received:', res.data);
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
  icon: '🗂'
});

export const categories = {
  async list() {
    const res = await apiClient.get('/categories');
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
  async listRoles() {
    const res = await apiClient.get('/rbac/roles');
    return Array.isArray(res.data) ? res.data : [];
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
