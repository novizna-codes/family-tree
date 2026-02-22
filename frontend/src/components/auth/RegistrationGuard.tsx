import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRegistrationStatus } from '@/hooks/useRegistrationStatus';

interface RegistrationGuardProps {
  children: React.ReactNode;
}

export const RegistrationGuard: React.FC<RegistrationGuardProps> = ({ children }) => {
  const { data: registrationStatus, isLoading } = useRegistrationStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!registrationStatus?.enabled) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};