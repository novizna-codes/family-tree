import React from 'react';
import { Input, Select, Checkbox, Textarea } from '../ui';
import type { PersonFormData } from '../../types';

interface PersonFormProps {
  formData: PersonFormData;
  onChange: (field: keyof PersonFormData, value: string | boolean | undefined) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
  showAllFields?: boolean;
  showNotes?: boolean;
  className?: string;
}

export const PersonForm: React.FC<PersonFormProps> = ({
  formData,
  onChange,
  errors = {},
  disabled = false,
  showAllFields = true,
  showNotes = true,
  className = '',
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(name as keyof PersonFormData, value);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onChange(name as keyof PersonFormData, checked);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          name="first_name"
          value={formData.first_name}
          onChange={handleInputChange}
          required
          disabled={disabled}
          error={errors.first_name?.[0]}
          placeholder="Enter first name"
        />

        <Input
          label="Last Name"
          name="last_name"
          value={formData.last_name || ''}
          onChange={handleInputChange}
          disabled={disabled}
          error={errors.last_name?.[0]}
          placeholder="Enter last name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Maiden Name"
          name="maiden_name"
          value={formData.maiden_name || ''}
          onChange={handleInputChange}
          disabled={disabled}
          error={errors.maiden_name?.[0]}
          placeholder="Enter maiden name"
          helper="Birth name (for married women)"
        />

        <Input
          label="Nickname"
          name="nickname"
          value={formData.nickname || ''}
          onChange={handleInputChange}
          disabled={disabled}
          error={errors.nickname?.[0]}
          placeholder="Enter nickname"
        />
      </div>

      {/* Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Gender"
          name="gender"
          value={formData.gender || ''}
          onChange={handleInputChange}
          disabled={disabled}
          error={errors.gender?.[0]}
          options={[
            { value: '', label: 'Select gender' },
            { value: 'M', label: 'Male' },
            { value: 'F', label: 'Female' },
            { value: 'O', label: 'Other' }
          ]}
        />

        {/* Deceased Status */}
        <div className="flex items-center pt-6">
          <Checkbox
            label="Deceased"
            name="is_deceased"
            checked={formData.is_deceased || false}
            onChange={handleCheckboxChange}
            disabled={disabled}
            error={errors.is_deceased?.[0]}
          />
        </div>
      </div>

      {showAllFields && (
        <>
          {/* Birth Information */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Birth Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Birth Date"
                name="birth_date"
                type="date"
                value={formData.birth_date || ''}
                onChange={handleInputChange}
                disabled={disabled}
                error={errors.birth_date?.[0]}
              />

              <Input
                label="Birth Place"
                name="birth_place"
                value={formData.birth_place || ''}
                onChange={handleInputChange}
                disabled={disabled}
                error={errors.birth_place?.[0]}
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Death Information - only show if deceased */}
          {formData.is_deceased && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Death Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Death Date"
                  name="death_date"
                  type="date"
                  value={formData.death_date || ''}
                  onChange={handleInputChange}
                  disabled={disabled}
                  error={errors.death_date?.[0]}
                />

                <Input
                  label="Death Place"
                  name="death_place"
                  value={formData.death_place || ''}
                  onChange={handleInputChange}
                  disabled={disabled}
                  error={errors.death_place?.[0]}
                  placeholder="City, Country"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {showNotes && (
            <div className="border-t pt-4">
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                disabled={disabled}
                error={errors.notes?.[0]}
                placeholder="Additional information about this person..."
                rows={3}
                helper="Personal notes, achievements, occupation, etc."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};