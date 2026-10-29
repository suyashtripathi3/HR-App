// Auth feature: register -> verify email/phone -> login -> refresh/logout.
// Tokens are stored by the caller in Keychain/Keystore in the real app;
// these functions only call the API and return tokens.
import { apiPost } from '../services/api.js';
export const register = (body) => apiPost('/auth/register', body);
export const verifyEmail = (userId, code) => apiPost('/auth/verify-email', { userId, code });
export const verifyPhone = (userId, code) => apiPost('/auth/verify-phone', { userId, code });
export const login = (email, password) => apiPost('/auth/login', { email, password });
export const refresh = (refreshToken) => apiPost('/auth/refresh', { refreshToken });
export const logout = (refreshToken) => apiPost('/auth/logout', { refreshToken });
