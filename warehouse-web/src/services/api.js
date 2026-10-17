import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

// 请求拦截器：添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProducts = () => api.get('/products');
export const addProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getInventory = () => api.get('/inventory');
export const getInbound = () => api.get('/inbound');
export const addInbound = (data) => api.post('/inbound', data);
export const getOutbound = () => api.get('/outbound');
export const addOutbound = (data) => api.post('/outbound', data);
export const getLogs = () => api.get('/logs');
export const getStatistics = () => api.get('/statistics');
export const getPriceAnalysis = () => api.get('/statistics/price-analysis');
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

export default api; 