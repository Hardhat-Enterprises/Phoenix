// src/services/phoenixApi.js
// PHOENIX shared API service layer
// All requests go through the Vite proxy — never use http://localhost:3001 directly.

const BASE = '/api';

// ── helper ──────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── public endpoints (no login required) ────────────────────────────────────

export async function getApiHealth() {
  return apiFetch('/users/health');
}

export async function getIngestionHealth() {
  return apiFetch('/ingestion/health');
}

export async function getStorageHealth() {
  return apiFetch('/storage/health');
}

export async function getThreats(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/users/threats${query ? `?${query}` : ''}`);
}

export async function getThreatById(id) {
  return apiFetch(`/users/threats/${id}`);
}

export async function getHazards(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/users/hazards${query ? `?${query}` : ''}`);
}

export async function getHazardById(id) {
  return apiFetch(`/users/hazards/${id}`);
}

export async function getRisks(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/users/risks${query ? `?${query}` : ''}`);
}

export async function getRiskById(id) {
  return apiFetch(`/users/risks/${id}`);
}

export async function getLocations() {
  return apiFetch('/users/meta/locations');
}

export async function getEventStatuses() {
  return apiFetch('/users/meta/event-statuses');
}

export async function getLinkedEventTypes() {
  return apiFetch('/users/meta/linked-event-types');
}

export async function getSeasons() {
  return apiFetch('/users/meta/seasons');
}

export async function getNotifications() {
  return apiFetch('/notifications');
}

// ── protected endpoints (login required) ────────────────────────────────────

export async function getDashboardOverview() {
  return apiFetch('/users/dashboard/overview');
}

export async function getDashboardCharts() {
  return apiFetch('/users/dashboard/charts');
}

export async function getDashboardActivity() {
  return apiFetch('/users/dashboard/activity');
}

export async function logout(userId) {
  return apiFetch(`/users/auth/logout/${userId}`, { method: 'POST' });
}
