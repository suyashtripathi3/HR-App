// Group Hisab: groups, members, shared expenses, settlements, balances.
import { apiGet, apiPost } from '../services/api.js';
export const getGroups = (token) => apiGet('/groups', token);
export const createGroup = (token, body) => apiPost('/groups', body, token);
export const addGroupMember = (token, groupId, body) => apiPost(`/groups/${groupId}/members`, body, token);
export const getGroup = (token, groupId) => apiGet(`/groups/${groupId}`, token);
export const createGroupExpense = (token, groupId, body) => apiPost(`/groups/${groupId}/expenses`, body, token);
export const createSettlement = (token, groupId, body) => apiPost(`/groups/${groupId}/settlements`, body, token);
export const getGroupBalances = (token, groupId) => apiGet(`/groups/${groupId}/balances`, token);
