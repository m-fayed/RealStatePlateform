import apiClient from './api';

export const authService = {
  registerBroker: (data) => apiClient.post('/auth/register/broker', data),
  registerSeeker: (data) => apiClient.post('/auth/register/seeker', data),
  login: (phone, password) => apiClient.post('/auth/login', { phone, password }),
  me: () => apiClient.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const listingsService = {
  getAll: (filters) => apiClient.get('/listings', { params: filters }),
  getById: (id) => apiClient.get(`/listings/${id}`),
  create: (data) => apiClient.post('/listings', data),
  update: (id, data) => apiClient.put(`/listings/${id}`, data),
  delete: (id) => apiClient.delete(`/listings/${id}`),
  boost: (id, payload) => apiClient.post(`/listings/${id}/boost`, payload),
};

export const creditsService = {
  // Pricing + payment config (packages, methods, Vodafone wallet number).
  getPackages: () => apiClient.get('/credits/packages'),
  // payload: { package, method, sender_number?, receipt_url? }
  purchase: (payload) => apiClient.post('/credits/purchase', payload),
  // The signed-in broker's own purchase history.
  myTransactions: () => apiClient.get('/credits/transactions'),
};

export const uploadsService = {
  // files: File[] (listing images, up to 10) — returns { urls: [...] }
  uploadListingImages: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return apiClient.post('/uploads/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // file: File (license image or PDF) — returns { url }
  uploadLicense: (file) => {
    const form = new FormData();
    form.append('license', file);
    return apiClient.post('/uploads/license', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // file: File (Vodafone Cash transfer screenshot, image or PDF) — returns { url }
  uploadReceipt: (file) => {
    const form = new FormData();
    form.append('receipt', file);
    return apiClient.post('/uploads/receipt', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const chatService = {
  listConversations: () => apiClient.get('/conversations'),
  createOrFetch: (listingId) => apiClient.post('/conversations', { listing_id: listingId }),
  getConversation: (id) => apiClient.get(`/conversations/${id}`),
  listMessages: (id) => apiClient.get(`/conversations/${id}/messages`),
  sendMessage: (id, body) => apiClient.post(`/conversations/${id}/messages`, { body }),
};

export const brokersService = {
  getAll: () => apiClient.get('/brokers'),
  getProfile: (id) => apiClient.get(`/brokers/${id}`),
};

export const adminService = {
  getRegistrations: () => apiClient.get('/admin/registrations'),
  approveRegistration: (id) => apiClient.post(`/admin/registrations/${id}/approve`),
  rejectRegistration: (id, reason) => apiClient.post(`/admin/registrations/${id}/reject`, { reason }),
  getStatistics: () => apiClient.get('/admin/statistics'),
  // Credit-purchase requests. status: optional 'pending' | 'completed' | 'rejected'.
  getTransactions: (status) =>
    apiClient.get('/admin/transactions', { params: status ? { status } : {} }),
  approveTransaction: (id) => apiClient.patch(`/admin/transactions/${id}/approve`),
  rejectTransaction: (id, reason) => apiClient.patch(`/admin/transactions/${id}/reject`, { reason }),
};
