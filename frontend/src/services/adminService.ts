import { api } from './api';
import type { 
  User, 
  SystemSetting, 
  AdminDashboardData, 
  UserFormData,
  PaginatedResponse,
} from '../types';

export const adminService = {
  // Dashboard
  getDashboard: async (): Promise<AdminDashboardData> => {
    const response = await api.get<AdminDashboardData>('/admin/dashboard');
    return response;
  },

  // User Management
  getUsers: async (params?: {
    search?: string;
    role?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>('/admin/users', { params });
    return response;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/admin/users/${id}`);
    return response;
  },

  createUser: async (userData: UserFormData): Promise<User> => {
    const response = await api.post<User>('/admin/users', userData);
    return response;
  },

  updateUser: async (id: number, userData: Partial<UserFormData>): Promise<User> => {
    const response = await api.put<User>(`/admin/users/${id}`, userData);
    return response;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  // Settings Management
  getSettings: async (): Promise<Record<string, SystemSetting>> => {
    const response = await api.get<Record<string, SystemSetting>>('/admin/settings');
    return response;
  },

  updateSettings: async (settings: Array<{
    key: string;
    value: any;
    type: SystemSetting['type'];
  }>): Promise<void> => {
    await api.put('/admin/settings', { settings });
  },

  getSetting: async (key: string): Promise<any> => {
    const response = await api.get<{ value: any }>(`/admin/settings/${key}`);
    return response.value;
  },
};