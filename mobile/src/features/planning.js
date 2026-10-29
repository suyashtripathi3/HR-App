// Budgets, goals, recurring rules, reports and export.
import { apiGet, apiPost, apiPatch } from '../services/api.js';
export const getBudgets = (token) => apiGet('/budgets', token);
export const createBudget = (token, body) => apiPost('/budgets', body, token);
export const getGoals = (token) => apiGet('/goals', token);
export const createGoal = (token, body) => apiPost('/goals', body, token);
export const contributeToGoal = (token, id, body) => apiPost(`/goals/${id}/contributions`, body, token);
export const getRecurringRules = (token) => apiGet('/recurring-rules', token);
export const createRecurringRule = (token, body) => apiPost('/recurring-rules', body, token);
export const processDueRecurring = (token) => apiPost('/recurring-rules/process-due', {}, token);
export const getReport = (token, query = '') => apiGet(`/reports/summary${query}`, token);
export const getNotifications = (token) => apiGet('/reports/notifications', token);
