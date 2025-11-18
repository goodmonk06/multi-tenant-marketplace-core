const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiOptions {
  tenantSlug: string;
  token?: string;
}

async function fetchApi(
  endpoint: string,
  options: ApiOptions & RequestInit = { tenantSlug: '' }
) {
  const { tenantSlug, token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': tenantSlug,
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Auth
export const auth = {
  register: (tenantSlug: string, data: { email: string; password: string; role?: string }) =>
    fetchApi('/auth/register', { tenantSlug, method: 'POST', body: JSON.stringify(data) }),

  login: (tenantSlug: string, data: { email: string; password: string }) =>
    fetchApi('/auth/login', { tenantSlug, method: 'POST', body: JSON.stringify(data) }),
};

// Shops
export const shops = {
  getAll: (tenantSlug: string) =>
    fetchApi('/shops', { tenantSlug }),

  getById: (tenantSlug: string, id: string) =>
    fetchApi(`/shops/${id}`, { tenantSlug }),

  create: (tenantSlug: string, token: string, data: { name: string; description?: string }) =>
    fetchApi('/shops', { tenantSlug, token, method: 'POST', body: JSON.stringify(data) }),

  getMyShops: (tenantSlug: string, token: string) =>
    fetchApi('/shops/my-shops', { tenantSlug, token }),
};

// Listings
export const listings = {
  getAll: (tenantSlug: string, params?: { shopId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi(`/listings${query ? `?${query}` : ''}`, { tenantSlug });
  },

  getById: (tenantSlug: string, id: string) =>
    fetchApi(`/listings/${id}`, { tenantSlug }),

  create: (tenantSlug: string, token: string, data: any) =>
    fetchApi('/listings', { tenantSlug, token, method: 'POST', body: JSON.stringify(data) }),

  update: (tenantSlug: string, token: string, id: string, data: any) =>
    fetchApi(`/listings/${id}`, { tenantSlug, token, method: 'PATCH', body: JSON.stringify(data) }),
};

// Cart
export const cart = {
  get: (tenantSlug: string, token: string) =>
    fetchApi('/cart', { tenantSlug, token }),

  addItem: (tenantSlug: string, token: string, data: { listingId: string; quantity: number }) =>
    fetchApi('/cart/items', { tenantSlug, token, method: 'POST', body: JSON.stringify(data) }),

  updateItem: (tenantSlug: string, token: string, id: string, data: { quantity: number }) =>
    fetchApi(`/cart/items/${id}`, { tenantSlug, token, method: 'PATCH', body: JSON.stringify(data) }),

  removeItem: (tenantSlug: string, token: string, id: string) =>
    fetchApi(`/cart/items/${id}`, { tenantSlug, token, method: 'DELETE' }),

  clear: (tenantSlug: string, token: string) =>
    fetchApi('/cart', { tenantSlug, token, method: 'DELETE' }),
};

// Orders
export const orders = {
  create: (tenantSlug: string, token: string, data: any) =>
    fetchApi('/orders', { tenantSlug, token, method: 'POST', body: JSON.stringify(data) }),

  createFromCart: (tenantSlug: string, token: string) =>
    fetchApi('/orders/from-cart', { tenantSlug, token, method: 'POST' }),

  getAll: (tenantSlug: string, token: string, params?: { status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi(`/orders${query ? `?${query}` : ''}`, { tenantSlug, token });
  },

  getMyOrders: (tenantSlug: string, token: string) =>
    fetchApi('/orders/my-orders', { tenantSlug, token }),

  getById: (tenantSlug: string, token: string, id: string) =>
    fetchApi(`/orders/${id}`, { tenantSlug, token }),
};

// Payments
export const payments = {
  createIntent: (tenantSlug: string, token: string, data: { orderId: string }) =>
    fetchApi('/payments/create-intent', { tenantSlug, token, method: 'POST', body: JSON.stringify(data) }),
};
