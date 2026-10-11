import type { Product, Category, Cart, User, Order, AdminMetrics, StoreConfig } from './types';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

function getSessionId(): string {
  let sid = localStorage.getItem('shopease_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('shopease_session_id', sid);
  }
  return sid;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('shopease_token');
  const headers: Record<string, string> = {
    'X-Session-ID': getSessionId(),
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Store Config
  getConfig: async (): Promise<StoreConfig> => {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
  },

  // Products
  getProducts: async (params: {
    q?: string;
    category?: string;
    department?: string;
    min_price?: number;
    max_price?: number;
    is_organic?: boolean;
    min_rating?: number;
    sort_by?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; total: number; page: number; total_pages: number }> => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.department && params.department !== 'all') query.set('department', params.department);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.min_price !== undefined) query.set('min_price', params.min_price.toString());
    if (params.max_price !== undefined) query.set('max_price', params.max_price.toString());
    if (params.is_organic !== undefined) query.set('is_organic', params.is_organic.toString());
    if (params.min_rating) query.set('min_rating', params.min_rating.toString());
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    return res.json();
  },

  getProduct: async (id: number): Promise<Product & { reviews: any[] }> => {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Product not found');
    return res.json();
  },

  addReview: async (productId: number, payload: { rating: number; reviewer_name: string; review_text: string }) => {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit review');
    return res.json();
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_BASE}/products/categories`);
    return res.json();
  },

  visualSearch: async (formData: FormData): Promise<any> => {
    const sid = getSessionId();
    const token = localStorage.getItem('shopease_token');
    const headers: Record<string, string> = {
      'X-Session-ID': sid,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/products/visual-search`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Visual search failed');
    return res.json();
  },

  // Cart
  getCart: async (couponCode?: string): Promise<Cart> => {
    const query = couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : '';
    const res = await fetch(`${API_BASE}/cart${query}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  addToCart: async (productId: number, quantity = 1, couponCode?: string): Promise<Cart> => {
    const query = couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : '';
    const res = await fetch(`${API_BASE}/cart/items${query}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not add to cart');
    }
    return res.json();
  },

  updateCartItem: async (itemId: number, quantity: number, couponCode?: string): Promise<Cart> => {
    const query = couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : '';
    const res = await fetch(`${API_BASE}/cart/items/${itemId}${query}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ quantity }),
    });
    return res.json();
  },

  removeCartItem: async (itemId: number, couponCode?: string): Promise<Cart> => {
    const query = couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : '';
    const res = await fetch(`${API_BASE}/cart/items/${itemId}${query}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  applyCoupon: async (code: string): Promise<Cart> => {
    const res = await fetch(`${API_BASE}/cart/coupon`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid coupon code');
    }
    return res.json();
  },

  // Checkout & Orders
  checkout: async (data: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: string;
    payment_method: string;
    coupon_code?: string;
    notes?: string;
  }): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Checkout failed');
    }
    return res.json();
  },

  getMyOrders: async (): Promise<Order[]> => {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Could not fetch orders');
    return res.json();
  },

  trackOrder: async (orderNumber: string): Promise<Order> => {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Order not found');
    }
    return res.json();
  },

  // Auth
  register: async (email: string, password: string, fullName: string): Promise<{ access_token: string; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('shopease_token', data.access_token);
    return data;
  },

  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid email or password');
    }
    const data = await res.json();
    localStorage.setItem('shopease_token', data.access_token);
    return data;
  },

  getMe: async (): Promise<User | null> => {
    const token = localStorage.getItem('shopease_token');
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      localStorage.removeItem('shopease_token');
      return null;
    }
    return res.json();
  },

  logout: () => {
    localStorage.removeItem('shopease_token');
  },

  updateProfile: async (data: { full_name?: string; email?: string }): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update profile');
    }
    return res.json();
  },

  // AI Agent
  agentChat: async (message: string, provider?: string, model?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        message,
        session_id: getSessionId(),
        provider,
        model,
      }),
    });
    return res.json();
  },

  // Admin
  getAdminMetrics: async (): Promise<AdminMetrics> => {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Admin authorization required');
    return res.json();
  },

  getAdminProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  createProduct: async (productData: any): Promise<Product> => {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(productData),
    });
    return res.json();
  },

  updateProduct: async (productId: number, updates: any): Promise<Product> => {
    const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  deleteProduct: async (productId: number): Promise<void> => {
    await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  getAdminOrders: async (statusFilter?: string): Promise<Order[]> => {
    const query = statusFilter ? `?status_filter=${statusFilter}` : '';
    const res = await fetch(`${API_BASE}/admin/orders${query}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  updateOrderStatus: async (orderId: number, data: { fulfillment_status?: string; payment_status?: string; tracking_number?: string }): Promise<Order> => {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not update status');
    }
    return res.json();
  },

  getAdminCoupons: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/admin/coupons`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  createAdminCoupon: async (code: string, discount_value: number, min_order_value: number): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/coupons?code=${encodeURIComponent(code)}&discount_value=${discount_value}&min_order_value=${min_order_value}`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res.json();
  },
};
