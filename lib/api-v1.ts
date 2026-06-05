// teleCRM/lib/api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, clearAuth } from './auth';

/**
 * Base API URL
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Axios Instance
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

/**
 * 🔐 Attach JWT automatically
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * ❌ Global Response Error Handling
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Optional typed request helper
 */
export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
): Promise<T> {
  const response = await api.request<T>({
    method,
    url,
    data,
  });

  return response.data;
}

/**
 * 🔥 Backward-compatible apiFetch (for existing pages)
 * This mimics fetch-style usage but uses Axios internally
 */
export async function apiFetch(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {},
) {
  const method = options.method || 'GET';

  const response = await api.request({
    url: endpoint,
    method,
    data: options.body ? JSON.parse(options.body) : undefined,
    headers: options.headers,
  });

  return response.data;
}
