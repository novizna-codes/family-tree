import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { adminService, type RoleResponse } from '../../services/adminService';
import type { UserFormData } from '../../types';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { Input, Select, Button } from '../ui';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    preferred_language: 'en',
    timezone: 'UTC',
    date_format: 'Y-m-d',
  });
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  const loadRoles = async () => {
    try {
      const rolesData = await adminService.getRoles();
      setRoles(rolesData);
    } catch {
      showErrorToast('Failed to load roles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await adminService.createUser(formData);
      showSuccessToast('User created successfully');
      onUserCreated();
      onClose();
      resetForm();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]> } } };
        if (errorResponse.response?.data?.errors) {
          setErrors(errorResponse.response.data.errors);
          showErrorToast('Please fix the validation errors');
        } else {
          showErrorToast('Failed to create user');
        }
      } else {
        showErrorToast('Failed to create user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      preferred_language: 'en',
      timezone: 'UTC',
      date_format: 'Y-m-d',
    });
    setErrors({});
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: [] }));
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Enter full name"
            disabled={isSubmitting}
            error={errors.name?.[0]}
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="Enter email address"
            disabled={isSubmitting}
            error={errors.email?.[0]}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="Enter password"
            disabled={isSubmitting}
            minLength={8}
            error={errors.password?.[0]}
            helper="Password must be at least 8 characters long"
          />

          <Select
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
            error={errors.role?.[0]}
            options={roles.map(role => ({
              value: role.value,
              label: role.name
            }))}
          />

          <Select
            label="Preferred Language"
            name="preferred_language"
            value={formData.preferred_language || 'en'}
            onChange={handleInputChange}
            disabled={isSubmitting}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ur', label: 'Urdu' }
            ]}
          />

          <Select
            label="Timezone"
            name="timezone"
            value={formData.timezone || 'UTC'}
            onChange={handleInputChange}
            disabled={isSubmitting}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'Asia/Karachi', label: 'Asia/Karachi' },
              { value: 'America/New_York', label: 'America/New_York' },
              { value: 'Europe/London', label: 'Europe/London' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai' }
            ]}
          />

          <Select
            label="Date Format"
            name="date_format"
            value={formData.date_format || 'Y-m-d'}
            onChange={handleInputChange}
            disabled={isSubmitting}
            options={[
              { value: 'Y-m-d', label: 'YYYY-MM-DD (2024-03-15)' },
              { value: 'd/m/Y', label: 'DD/MM/YYYY (15/03/2024)' },
              { value: 'm/d/Y', label: 'MM/DD/YYYY (03/15/2024)' },
              { value: 'd-M-Y', label: 'DD-Mon-YYYY (15-Mar-2024)' }
            ]}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};