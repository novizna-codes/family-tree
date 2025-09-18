import React from 'react';
import { Input, Select, Textarea } from '../ui';

interface RelationshipFormData {
  relationship_type: string;
  start_date?: string;
  end_date?: string;
  marriage_place?: string;
  notes?: string;
  relationship_notes?: string; // For backward compatibility
}

interface RelationshipFormProps {
  formData: RelationshipFormData;
  onChange: (field: keyof RelationshipFormData, value: string) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const RelationshipForm: React.FC<RelationshipFormProps> = ({
  formData,
  onChange,
  errors = {},
  disabled = false,
  className = '',
  title = 'Relationship Details',
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(name as keyof RelationshipFormData, value);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Relationship Type"
            name="relationship_type"
            value={formData.relationship_type}
            onChange={handleInputChange}
            required
            disabled={disabled}
            error={errors.relationship_type?.[0]}
            options={[
              { value: 'spouse', label: 'Spouse' },
              { value: 'partner', label: 'Partner' },
              { value: 'divorced', label: 'Divorced' },
              { value: 'separated', label: 'Separated' }
            ]}
          />

          <Input
            label="Marriage/Start Date"
            name="start_date"
            type="date"
            value={formData.start_date || ''}
            onChange={handleInputChange}
            disabled={disabled}
            error={errors.start_date?.[0]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="End Date"
            name="end_date"
            type="date"
            value={formData.end_date || ''}
            onChange={handleInputChange}
            disabled={disabled}
            error={errors.end_date?.[0]}
            helper="Leave empty if relationship is ongoing"
          />

          <Input
            label="Marriage/Ceremony Place"
            name="marriage_place"
            value={formData.marriage_place || ''}
            onChange={handleInputChange}
            disabled={disabled}
            error={errors.marriage_place?.[0]}
            placeholder="City, Country"
          />
        </div>

        <Textarea
          label="Relationship Notes"
          name={formData.relationship_notes !== undefined ? 'relationship_notes' : 'notes'}
          value={formData.relationship_notes || formData.notes || ''}
          onChange={handleInputChange}
          disabled={disabled}
          error={errors.relationship_notes?.[0] || errors.notes?.[0]}
          placeholder="Additional information about this relationship..."
          rows={2}
        />
      </div>
    </div>
  );
};