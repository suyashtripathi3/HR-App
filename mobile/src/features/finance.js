// Personal finance features: accounts, categories, transactions, dashboard.
import { apiGet, apiPost, apiPatch } from '../services/api.js';
export const getAccounts = (token) => apiGet('/accounts', token);
export const createAccount = (token, body) => apiPost('/accounts', body, token);
export const getCategories = (token, type) => apiGet(`/categories${type ? `?type=${type}` : ''}`, token);
export const getTransactions = (token, query = '') => apiGet(`/transactions${query}`, token);
export const createTransaction = (token, body) => apiPost('/transactions', body, token);
export const updateTransaction = (token, id, body) => apiPatch(`/transactions/${id}`, body, token);
export const getDashboard = (token) => apiGet('/dashboard/summary', token);
