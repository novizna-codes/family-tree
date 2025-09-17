import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { setupService } from '../../services/setupService';

interface SetupGuardProps {
  children: React.ReactNode;
}

export const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { needs_setup } = await setupService.checkSetup();
        setNeedsSetup(needs_setup);
      } catch (error) {
        console.error('Setup check failed:', error);
        setNeedsSetup(false); // Assume setup is not needed if check fails
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};