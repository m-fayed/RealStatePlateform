import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data?.credits_remaining === 'number' || typeof response.data?.credits_added === 'number') {
      window.dispatchEvent(new Event('auth:refresh'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:expired'));
    }
    if (error.response?.status === 402) window.dispatchEvent(new Event('auth:refresh'));
    return Promise.reject(error);
  }
);

export default apiClient;
