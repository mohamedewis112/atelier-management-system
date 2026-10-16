/**
 * API Client Module
 * 
 * Purpose: Provides a centralized API client for making requests to the backend.
 * Handles authentication tokens and error responses.
 */

// Use relative path client-side to go through Next.js proxy and avoid CORS cookie issues.
// Use environment variable only on server-side when running during build or SSR.
const API_BASE = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || '/api');

import { reportClientError } from './error-reporter';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_TOKEN, getDemoAccountByCredentials, handleDemoRequest, isDemoToken } from './demo-data';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);

        // Demo mode has no backend to create the HttpOnly auth cookie.
        // The Next.js middleware protects /dashboard by checking for the
        // existence of auth_token, so create a same-site demo cookie here.
        if (isDemoToken(token)) {
          document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax; secure`;
        }
      } else {
        localStorage.removeItem('auth_token');
        // Clear either the demo cookie or the real backend cookie on logout.
        document.cookie = 'auth_token=; path=/; max-age=0; samesite=lax; secure';

        // Also call the server-side logout endpoint to clear the HttpOnly cookie
        // when the real backend is enabled.
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
          .catch((err) => console.error('Failed to clear server-side auth cookie:', err));
      }
    }
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (isDemoToken(this.token)) {
      return handleDemoRequest(endpoint, options, this.token) as ApiResponse<T>;
    }

    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',  // Always send cookies (auth_token) with requests
      });

      // Handle non-JSON responses (e.g., Vercel's HTML error pages for
      // oversized payloads, gateway timeouts, or other proxy-level errors).
      const contentType = response.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Non-JSON response — likely a proxy/gateway error
        if (!response.ok) {
          if (response.status === 413) {
            throw new Error('الطلب كبير جدًا. حاول أن تجعل المرفق أصغر.');
          }
          if (response.status === 502 || response.status === 504) {
            throw new Error('الخادم غير متوفر حاليا. حاول مرة أخرى بعد قليل.');
          }
          throw new Error(`خطأ في الخادم (${response.status}). حاول ثانية.`);
        }
        // If response.ok but not JSON, try to parse anyway
        try {
          data = await response.json();
        } catch {
          throw new Error('استجابة غير متوقعة من الخادم. حاول ثانية.');
        }
      }

      if (!response.ok) {
        // Handle 401 - unauthorized
        if (response.status === 401) {
          this.setToken(null);
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'خطأ من فضلك');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Only report unexpected errors, not standard API errors (which we threw intentionally above)
        if (!error.message.includes('API') && !error.message.includes('خطأ') && !error.message.includes('اتصال')) {
          reportClientError({
            message: error.message,
            stack: error.stack,
            component: 'ApiClient',
            action: `API Request: ${options.method || 'GET'} ${endpoint}`
          });
        }
        throw error;
      }
      
      const genericMsg = 'خطأ في الشبكة - تحقق من اتصالك بالإنترنت.';
      reportClientError({
        message: genericMsg,
        component: 'ApiClient',
        action: `API Request: ${options.method || 'GET'} ${endpoint}`
      });
      throw new Error(genericMsg);
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    // Debug logging for order creation
    if (endpoint.includes('/orders')) {
      console.log('=== API POST /orders ===');
      console.log('Endpoint:', endpoint);
      console.log('Body before stringify:', body);
      console.log('Body stringified:', body instanceof FormData ? 'FormData' : JSON.stringify(body, null, 2));
    }
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  // PUT request
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const account = getDemoAccountByCredentials(email, password);
    if (account) {
      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
          token: account.token,
          user: account.user
        }
      };
    }

    throw new Error('بيانات الدخول غير صحيحة');
  },

  me: () => api.get<{ user: { id: number; email: string; name: string; role: string; is_active?: boolean } }>('/auth/me'),

  verify: () => api.post<{ user: { id: number; email: string; name: string; role: string; is_active?: boolean } }>('/auth/verify'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};


// Users & Roles API
export const usersApi = {
  list: () => api.get<{ users: Array<{ id: number; name: string; email: string; role: 'admin' | 'supervisor' | 'sales'; is_active: boolean; created_at?: string }> }>('/users'),

  create: (data: { name: string; email: string; role: 'admin' | 'supervisor' | 'sales'; is_active?: boolean }) =>
    api.post('/users', data),

  update: (id: number, data: { name?: string; email?: string; role?: 'admin' | 'supervisor' | 'sales'; is_active?: boolean }) =>
    api.put(`/users/${id}`, data),
};

// Customers API
export const customersApi = {
  list: (params?: { search?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api.get(`/customers?${searchParams.toString()}`);
  },

  get: (id: number) => api.get(`/customers/${id}`),

  create: (data: { name: string; phone?: string; email?: string; source?: string; notes?: string }) =>
    api.post('/customers', data),

  update: (id: number, data: { name: string; phone?: string; email?: string; source?: string; notes?: string }) =>
    api.put(`/customers/${id}`, data),

  quickSearch: (q: string) => api.get(`/customers/search/quick?q=${encodeURIComponent(q)}`),

  merge: (targetCustomerId: number, sourceCustomerId: number, updatedTargetData?: any) =>
    api.post('/customers/merge', { targetCustomerId, sourceCustomerId, updatedTargetData }),
};

// Dresses API
export const dressesApi = {
  list: (params?: { search?: string; status?: string; intended_use?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.intended_use) searchParams.set('intended_use', params.intended_use);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api.get(`/dresses?${searchParams.toString()}`);
  },

  get: (id: number) => api.get(`/dresses/${id}`),

  create: (data: { name: string; base_price?: number; status?: string; intended_use?: 'rental' | 'sale' | null; photo_url?: string; thumbnail_url?: string; notes?: string }) =>
    api.post('/dresses', data),

  update: (id: number, data: { name: string; base_price?: number; status?: string; intended_use?: 'rental' | 'sale' | null; photo_url?: string; thumbnail_url?: string; notes?: string }) =>
    api.put(`/dresses/${id}`, data),

  updateStatus: (id: number, status: string) =>
    api.patch(`/dresses/${id}/status`, { status }),

  addRental: (id: number, data: { wearer_name: string; amount: number; rental_type?: string; event_date?: string }) =>
    api.post(`/dresses/${id}/rental`, data),

  available: () => api.get('/dresses/available'),

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ imageUrl: string; thumbnailUrl: string }>('/dresses/upload', formData);
  },

  // Send image as base64 in a JSON body instead of multipart FormData.
  // Used by the direct file-picker path on Android: capture="environment" files are
  // reliably read by FileReader but the resulting binary becomes corrupt when passed
  // through FormData. Sending the raw base64 string in JSON avoids the binary round-trip.
  uploadImageBase64: async (base64: string) => {
    return api.post<{ imageUrl: string; thumbnailUrl: string }>('/dresses/upload', { imageBase64: base64 });
  },

  /**
   * Merge two dresses into one.
   * targetDressId — the dress that survives (keeps its ID).
   * sourceDressId — the dress that is deleted after the merge.
   * updatedDressData — optional fields to set on the target dress post-merge
   *   (name, photo_url, thumbnail_url, notes, status, intended_use, base_price).
   */
  merge: (
    targetDressId: number,
    sourceDressId: number,
    updatedDressData?: {
      name?: string;
      photo_url?: string | null;
      thumbnail_url?: string | null;
      notes?: string | null;
      status?: string;
      intended_use?: 'rental' | 'sale' | null;
      base_price?: number;
    }
  ) => api.post('/dresses/merge', { targetDressId, sourceDressId, updatedDressData }),
};

// Transactions API
export const transactionsApi = {
  list: (params?: { type?: string; category?: string; orderId?: number; customer_id?: number; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.orderId) searchParams.set('orderId', params.orderId.toString());
    if (params?.customer_id) searchParams.set('customer_id', params.customer_id.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api.get(`/transactions?${searchParams.toString()}`);
  },

  get: (id: number) => api.get(`/transactions/${id}`),

  summary: (startDate?: string, endDate?: string) => {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.set('startDate', startDate);
    if (endDate) searchParams.set('endDate', endDate);
    return api.get(`/transactions/summary?${searchParams.toString()}`);
  },

  create: (data: {
    date: string;
    type: 'income' | 'expense';
    category: string;
    customer_id?: number;
    customer_name?: string;
    supplier?: string;
    product?: string;
    amount: number;
    payment_method?: string;
    notes?: string;
    dress_id?: number;
    order_id?: number;
    customer_charge_amount?: number;
  }) => api.post('/transactions', data),

  update: (id: number, data: unknown) => api.put(`/transactions/${id}`, data),

  delete: (id: number) => api.delete(`/transactions/${id}`),
};

// Dashboard API
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  upcomingEvents: (days?: number) => api.get(`/dashboard/upcoming-events?days=${days || 7}`),
  recentTransactions: (limit?: number) => api.get(`/dashboard/recent-transactions?limit=${limit || 10}`),
  monthlyChart: (months?: number) => api.get(`/dashboard/monthly-chart?months=${months || 12}`),
  topDresses: (limit?: number) => api.get(`/dashboard/top-dresses?limit=${limit || 5}`),
  requiresAttention: () => api.get('/dashboard/requires-attention'),
};

// Agreements API (public)
export const agreementsApi = {
  config: () => api.get('/agreements/config'),
  terms: () => api.get('/agreements/content/terms'),
  prefill: (token: string) => api.get(`/agreements/prefill?token=${encodeURIComponent(token)}`),
  createSignLink: (orderId: number) => api.post<{
    orderId: number;
    link: string;
    expiresIn: string;
    customerPhone: string;
    whatsappLink?: string | null;
  }>(`/agreements/order/${orderId}/sign-link`),
  sign: (data: {
    full_name: string;
    phone: string;
    email?: string;
    event_date?: string;
    signature_data: string;
    order_id?: number;
    token?: string;
  }) => api.post('/agreements/sign', data),
  list: (page?: number, limit?: number) =>
    api.get(`/agreements?page=${page || 1}&limit=${limit || 50}`),
  get: (id: number) => api.get(`/agreements/${id}`),
};

// Orders API
export const ordersApi = {
  list: (params?: { search?: string; status?: string; customer_id?: number; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.customer_id) searchParams.set('customer_id', params.customer_id.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return api.get(`/orders?${searchParams.toString()}`);
  },
  get: (id: number) => api.get(`/orders/${id}`),
  upcoming: (days?: number) => api.get(`/orders/upcoming?days=${days || 14}`),
  create: (data: unknown) => api.post('/orders', data),
  update: (id: number, data: unknown) => api.put(`/orders/${id}`, data),
  updateStatus: (id: number, status: string) => api.patch(`/orders/${id}/status`, { status }),
  addPayment: (id: number, data: { amount: number; payment_method?: string; payment_date?: string; notes?: string }) =>
    api.post(`/orders/${id}/payment`, data),
  delete: (id: number) => api.delete(`/orders/${id}`),

  merge: (targetOrderId: number, sourceOrderId: number, updatedOrderData?: any) =>
    api.post('/orders/merge', { targetOrderId, sourceOrderId, updatedOrderData }),

  // --- Attachments ---
  getAttachments: (orderId: number) =>
    api.get(`/orders/${orderId}/attachments`),

  /**
   * Upload one or more files as attachments to an order.
   *
   * Strategy: When the total payload is small (under SINGLE_REQUEST_LIMIT),
   * send all files in one multipart request — fast, atomic. When the payload
   * is larger (or any single file is heavy), fall back to one-file-per-POST
   * sequentially so each request stays well under the Vercel rewrite proxy's
   * ~4.5MB body limit, regardless of how many files were selected.
   *
   * Returns a single ApiResponse with `attachments` aggregated from all
   * underlying requests, so callers see no difference from a one-shot call.
   */
  uploadAttachment: async (orderId: number, files: File[]) => {
    if (!files || files.length === 0) {
      return { success: true, message: 'لا توجد ملفات', data: { attachments: [] } } as any;
    }

    // Generous safety margin under Vercel's ~4.5MB proxy body cap. The number
    // is intentionally low: even after client-side compression, multipart
    // overhead and base64 metadata add ~5-10% per file.
    const SINGLE_REQUEST_LIMIT = 3 * 1024 * 1024;
    const PER_FILE_HEAVY_THRESHOLD = 2 * 1024 * 1024;

    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const anyHeavy = files.some((f) => (f.size || 0) > PER_FILE_HEAVY_THRESHOLD);
    const useSequential = files.length > 1 && (totalSize > SINGLE_REQUEST_LIMIT || anyHeavy);

    if (!useSequential) {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      return api.post(`/orders/${orderId}/attachments`, formData);
    }

    // Sequential per-file uploads — defense-in-depth against the Vercel
    // rewrite body limit when the user selects many heavy images at once.
    const aggregated: any[] = [];
    let lastMessage = '';
    for (const file of files) {
      const formData = new FormData();
      formData.append('files', file);
      const res: any = await api.post(`/orders/${orderId}/attachments`, formData);
      const items = res?.data?.attachments;
      if (Array.isArray(items)) aggregated.push(...items);
      if (typeof res?.message === 'string') lastMessage = res.message;
    }
    return {
      success: true,
      message: lastMessage || `${aggregated.length} تم تحميل الملفات بنجاح`,
      data: { attachments: aggregated },
    } as any;
  },

  updateAttachment: (orderId: number, attachmentId: number, data: { description?: string }) =>
    api.patch(`/orders/${orderId}/attachments/${attachmentId}`, data),

  deleteAttachment: (orderId: number, attachmentId: number) =>
    api.delete(`/orders/${orderId}/attachments/${attachmentId}`),

  attachmentDownloadUrl: (orderId: number, attachmentId: number) => {
    const base = process.env.NEXT_PUBLIC_API_URL || '/api';
    return `${base}/orders/${orderId}/attachments/${attachmentId}/download`;
  },
};

export interface ExportFilterOption {
  value: string;
  label: string;
}

export interface ExportFilterDefinition {
  key: string;
  label: string;
  inputType: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  placeholder: string | null;
  options: ExportFilterOption[];
}

export interface ExportDataset {
  id: string;
  label: string;
  description: string;
  totalRows: number;
  filters: ExportFilterDefinition[];
}

function extractFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/"/g, '').trim());
    } catch {
      return utf8Match[1].replace(/"/g, '').trim();
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] || null;
}

async function downloadCsvFile(endpoint: string): Promise<{ blob: Blob; fileName: string }> {
  const headers: HeadersInit = {};
  const token = api.getToken();

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers,
    credentials: 'include',  // Send auth_token cookie
  });

  if (response.status === 401) {
    api.setToken(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('انتهت صلاحية تسجيل الدخول - يرجى إعادة الاتصال');
  }

  if (!response.ok) {
    let message = 'حدث خطأ أثناء تصدير البيانات';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await response.json() as any;
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message when response is not JSON
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const fileName = extractFileName(response.headers.get('content-disposition')) ||
    `export-${new Date().toISOString().slice(0, 10)}.csv`;

  return { blob, fileName };
}

// Export API
export const exportApi = {
  datasets: () => api.get<{ datasets: ExportDataset[] }>('/export/datasets'),

  downloadCsv: (
    dataset: string,
    filters?: Record<string, string | number | boolean | null | undefined>
  ) => {
    const searchParams = new URLSearchParams();
    searchParams.set('dataset', dataset);

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      searchParams.set(key, normalized);
    });

    return downloadCsvFile(`/export/csv?${searchParams.toString()}`);
  },
};

export default api;
