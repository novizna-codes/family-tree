import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/authService';

export const useRegistrationStatus = () => {
  return useQuery({
    queryKey: ['registrationStatus'],
    queryFn: () => authService.getRegistrationStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};