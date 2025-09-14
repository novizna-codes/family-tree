import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CreateSpouseData, LinkSpouseData, Person } from '../../services/familyTreeService';

interface SpouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSpouse: (data: CreateSpouseData) => Promise<void>;
  onLinkSpouse: (data: LinkSpouseData) => Promise<void>;
  existingPeople: Person[];
  isLoading?: boolean;
}

export const SpouseModal: React.FC<SpouseModalProps> = ({
  isOpen,
  onClose,
  onAddSpouse,
  onLinkSpouse,
  existingPeople,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [formData, setFormData] = useState<CreateSpouseData>({
    first_name: '',
    last_name: '',
    maiden_name: '',
    nickname: '',
    gender: undefined,
    birth_date: '',
    death_date: '',
    birth_place: '',
    death_place: '',
    notes: '',
    is_deceased: false,
    relationship_type: 'spouse',
    start_date: '',
    end_date: '',
    marriage_place: '',
    relationship_notes: '',
  });
  const [linkData, setLinkData] = useState<LinkSpouseData>({
    spouse_id: '',
    relationship_type: 'spouse',
    start_date: '',
    end_date: '',
    marriage_place: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'create') {
        await onAddSpouse(formData);
      } else {
        await onLinkSpouse(linkData);
      }
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error managing spouse:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      maiden_name: '',
      nickname: '',
      gender: undefined,
      birth_date: '',
      death_date: '',
      birth_place: '',
      death_place: '',
      notes: '',
      is_deceased: false,
      relationship_type: 'spouse',
      start_date: '',
      end_date: '',
      marriage_place: '',
      relationship_notes: '',
    });
    setLinkData({
      spouse_id: '',
      relationship_type: 'spouse',
      start_date: '',
      end_date: '',
      marriage_place: '',
      notes: '',
    });
  };

  const updateFormData = (field: keyof CreateSpouseData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLinkData = (field: keyof LinkSpouseData, value: any) => {
    setLinkData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Spouse/Partner</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('create')}
              className={`px-3 py-1 rounded ${
                mode === 'create' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setMode('link')}
              className={`px-3 py-1 rounded ${
                mode === 'link' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Link Existing
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={formData.first_name}
                  onChange={(e) => updateFormData('first_name', e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.last_name || ''}
                  onChange={(e) => updateFormData('last_name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Maiden Name"
                  value={formData.maiden_name || ''}
                  onChange={(e) => updateFormData('maiden_name', e.target.value)}
                />
                <select
                  value={formData.gender || ''}
                  onChange={(e) => updateFormData('gender', e.target.value || undefined)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Birth Date"
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => updateFormData('birth_date', e.target.value)}
                />
                <Input
                  label="Birth Place"
                  value={formData.birth_place || ''}
                  onChange={(e) => updateFormData('birth_place', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_deceased"
                  checked={formData.is_deceased || false}
                  onChange={(e) => updateFormData('is_deceased', e.target.checked)}
                />
                <label htmlFor="is_deceased">Deceased</label>
              </div>

              {formData.is_deceased && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Death Date"
                    type="date"
                    value={formData.death_date || ''}
                    onChange={(e) => updateFormData('death_date', e.target.value)}
                  />
                  <Input
                    label="Death Place"
                    value={formData.death_place || ''}
                    onChange={(e) => updateFormData('death_place', e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Person *
              </label>
              <select
                value={linkData.spouse_id}
                onChange={(e) => updateLinkData('spouse_id', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">Choose a person...</option>
                {existingPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.first_name} {person.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Relationship Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type *
                </label>
                <select
                  value={mode === 'create' ? formData.relationship_type : linkData.relationship_type}
                  onChange={(e) => {
                    const value = e.target.value as 'spouse' | 'partner' | 'divorced' | 'separated';
                    if (mode === 'create') {
                      updateFormData('relationship_type', value);
                    } else {
                      updateLinkData('relationship_type', value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="spouse">Spouse</option>
                  <option value="partner">Partner</option>
                  <option value="divorced">Divorced</option>
                  <option value="separated">Separated</option>
                </select>
              </div>

              <Input
                label="Marriage Place"
                value={mode === 'create' ? formData.marriage_place || '' : linkData.marriage_place || ''}
                onChange={(e) => {
                  if (mode === 'create') {
                    updateFormData('marriage_place', e.target.value);
                  } else {
                    updateLinkData('marriage_place', e.target.value);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={mode === 'create' ? formData.start_date || '' : linkData.start_date || ''}
                onChange={(e) => {
                  if (mode === 'create') {
                    updateFormData('start_date', e.target.value);
                  } else {
                    updateLinkData('start_date', e.target.value);
                  }
                }}
              />
              <Input
                label="End Date"
                type="date"
                value={mode === 'create' ? formData.end_date || '' : linkData.end_date || ''}
                onChange={(e) => {
                  if (mode === 'create') {
                    updateFormData('end_date', e.target.value);
                  } else {
                    updateLinkData('end_date', e.target.value);
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={mode === 'create' ? formData.relationship_notes || '' : linkData.notes || ''}
                onChange={(e) => {
                  if (mode === 'create') {
                    updateFormData('relationship_notes', e.target.value);
                  } else {
                    updateLinkData('notes', e.target.value);
                  }
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Add Spouse' : 'Link Spouse'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};