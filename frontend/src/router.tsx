import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { GuestGuard } from '@/components/auth/GuestGuard';
import { SetupGuard } from '@/components/auth/SetupGuard';
import { RegistrationGuard } from '@/components/auth/RegistrationGuard';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { SetupPage } from '@/pages/auth/SetupPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { TreeViewPage } from '@/pages/trees/TreeViewPage';
import { AddPersonPage } from '@/pages/trees/AddPersonPage';

// Admin Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

export const router = createBrowserRouter([
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/',
    element: (
      <SetupGuard>
        <Navigate to="/dashboard" replace />
      </SetupGuard>
    ),
  },
  {
    path: '/login',
    element: (
      <SetupGuard>
        <GuestGuard>
          <LoginPage />
        </GuestGuard>
      </SetupGuard>
    ),
  },
  {
    path: '/register',
    element: (
      <SetupGuard>
        <RegistrationGuard>
          <GuestGuard>
            <RegisterPage />
          </GuestGuard>
        </RegistrationGuard>
      </SetupGuard>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <SetupGuard>
        <AuthGuard>
          <DashboardPage />
        </AuthGuard>
      </SetupGuard>
    ),
  },
  {
    path: '/trees/:id',
    element: (
      <SetupGuard>
        <AuthGuard>
          <TreeViewPage />
        </AuthGuard>
      </SetupGuard>
    ),
  },
  {
    path: '/trees/:id/people/add',
    element: (
      <SetupGuard>
        <AuthGuard>
          <AddPersonPage />
        </AuthGuard>
      </SetupGuard>
    ),
  },
  {
    path: '/admin',
    element: (
      <SetupGuard>
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      </SetupGuard>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />,
      },
    ],
  },
]);