import axios from 'axios';

// In production behind Nginx reverse proxy, an empty baseURL ("") routes requests to
// the same public origin (/api/ -> Nginx -> API Gateway).
// In local development, fall back to http://localhost:8088 when VITE_API_BASE_URL is not set.
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl !== undefined && envUrl !== null) {
    return envUrl;
  }
  return import.meta.env.DEV ? 'http://localhost:8088' : '';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nutrition_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('nutrition_token');
      localStorage.removeItem('nutrition_user');
      // Dispatch custom event to notify auth context without page reload
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
