'use client';

import type { LoginResponse } from './api';

const TOKEN_KEY = 'smartshift.accessToken';
const USER_KEY = 'smartshift.user';

export function saveSession(session: LoginResponse) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getAccessToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) as LoginResponse['user'] : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
