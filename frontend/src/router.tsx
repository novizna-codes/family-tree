import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { GuestGuard } from '@/components/auth/GuestGuard';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { TreeViewPage } from '@/pages/trees/TreeViewPage';
import { AddPersonPage } from '@/pages/trees/AddPersonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestGuard>
        <RegisterPage />
      </GuestGuard>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/trees/:id',
    element: (
      <AuthGuard>
        <TreeViewPage />
      </AuthGuard>
    ),
  },
  {
    path: '/trees/:id/people/add',
    element: (
      <AuthGuard>
        <AddPersonPage />
      </AuthGuard>
    ),
  },
]);