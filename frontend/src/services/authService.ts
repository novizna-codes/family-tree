import { apiService } from './api';
import type { User, LoginCredentials, RegisterData } from '@/types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
    // Initialize CSRF cookie first
    await apiService.initializeCSRF();
    
    const response = await apiService.post<{ data: { user: User; token: string } }>('/auth/login', credentials);
    apiService.setToken(response.data.token);
    return response.data;
  },

  register: async (data: RegisterData): Promise<{ user: User; token: string }> => {
    const response = await apiService.post<{ data: { user: User; token: string } }>('/auth/register', data);
    apiService.setToken(response.data.token);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiService.post('/auth/logout');
    apiService.setToken(null);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiService.get<{ data: User }>('/auth/user');
    return response.data;
  },

  refreshToken: async (): Promise<{ token: string }> => {
    return apiService.post<{ token: string }>('/auth/refresh');
  },
};