import { api } from './api';

export const setupService = {
  checkSetup: async (): Promise<{ needs_setup: boolean; has_admin: boolean }> => {
    const response = await api.get<{ needs_setup: boolean; has_admin: boolean }>('/setup/check');
    return response;
  },

  createInitialAdmin: async (adminData: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    preferred_language?: string;
  }) => {
    const response = await api.post<any>('/setup/admin', adminData);
    return response;
  },
};