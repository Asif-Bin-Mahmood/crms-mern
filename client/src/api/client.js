import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('crms_token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('crms_token');
  }
}

const saved = localStorage.getItem('crms_token');
if (saved) setAuthToken(saved);

export default api;
