import { config } from '../config';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

class ApiService {
  private baseURL = config.API_URL + '/api';
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async initializeCSRF() {
    // Get CSRF cookie for SPA authentication
    await fetch(`${config.API_URL}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Request failed';
      const errors =
        typeof error === 'object' && error !== null && 'errors' in error && typeof error.errors === 'object'
          ? (error.errors as Record<string, string[]>)
          : undefined;

      throw new ApiError(message, response.status, errors);
    }

    const data = await response.json();
    return data;
  }

  async get<T>(endpoint: string, options?: { params?: Record<string, string | number | boolean | null | undefined> }): Promise<T> {
    let url = endpoint;
    if (options?.params) {
      const params = Object.entries(options.params).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {});
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();
export const apiService = api;
