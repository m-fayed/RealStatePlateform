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
  purchase: (pkg) => apiClient.post('/credits/purchase', { package: pkg }),
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
};
