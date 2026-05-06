import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const ROLE_TOKEN_KEYS = [
  'CUSTOMER',
  'ADMIN',
  'LEAD_TECHNICIAN',
  'JUNIOR_TECHNICIAN',
  'DELIVERY_MAN',
];

function tokenKeyForRole(role) {
  return role ? `crms_token_${role}` : 'crms_token';
}

export function getAuthToken(role) {
  if (role) return localStorage.getItem(tokenKeyForRole(role));
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/delivery')) {
    return localStorage.getItem(tokenKeyForRole('DELIVERY_MAN'));
  }
  for (const candidate of ROLE_TOKEN_KEYS) {
    const token = localStorage.getItem(tokenKeyForRole(candidate));
    if (token) return token;
  }
  return localStorage.getItem('crms_token');
}

export function setAuthToken(token, role) {
  const tokenKey = tokenKeyForRole(role);
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem(tokenKey, token);
    localStorage.removeItem('crms_token');
    sessionStorage.removeItem('crms_token');
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem('crms_token');
    if (!role) localStorage.removeItem('crms_token');
  }
}

const saved = getAuthToken();
if (saved) api.defaults.headers.common.Authorization = `Bearer ${saved}`;

export default api;
