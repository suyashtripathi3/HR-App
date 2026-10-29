// API client for the Express backend. The app never talks to MongoDB
// directly — every call goes through /api/v1 with auth headers.
// Base URL comes from app config at build time, never a hardcoded secret.
// Default is the local Phase 1 backend.
const BASE_URL = 'http://10.0.2.2:8080';

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function apiGet(path, token) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `API error: ${res.status}`);
  return data;
}

export async function apiPatch(path, body, token) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `API error: ${res.status}`);
  return data;
}
