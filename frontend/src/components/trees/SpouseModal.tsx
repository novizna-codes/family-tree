import React, { useState } from 'react';
import { Button, Select } from '../ui';
import { PersonForm, RelationshipForm } from '../forms';
import type { CreateSpouseData, LinkSpouseData, Person } from '../../services/familyTreeService';
import type { PersonFormData } from '../../types';

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

  const updateFormData = (field: keyof PersonFormData, value: string | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateRelationshipData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLinkData = (field: keyof LinkSpouseData, value: string) => {
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
              <PersonForm
                formData={{
                  first_name: formData.first_name,
                  last_name: formData.last_name,
                  maiden_name: formData.maiden_name,
                  nickname: formData.nickname,
                  gender: formData.gender,
                  birth_date: formData.birth_date,
                  death_date: formData.death_date,
                  birth_place: formData.birth_place,
                  death_place: formData.death_place,
                  notes: formData.notes,
                  is_deceased: formData.is_deceased,
                }}
                onChange={updateFormData}
                disabled={isLoading}
                showNotes={false}
              />

              <RelationshipForm
                formData={{
                  relationship_type: formData.relationship_type,
                  start_date: formData.start_date,
                  end_date: formData.end_date,
                  marriage_place: formData.marriage_place,
                  relationship_notes: formData.relationship_notes,
                }}
                onChange={updateRelationshipData}
                disabled={isLoading}
              />
            </>
          ) : (
            <>
              <Select
                label="Select Person"
                name="spouse_id"
                value={linkData.spouse_id}
                onChange={(e) => updateLinkData('spouse_id', e.target.value)}
                required
                disabled={isLoading}
                options={[
                  { value: '', label: 'Choose a person...' },
                  ...existingPeople.map((person) => ({
                    value: person.id,
                    label: `${person.first_name} ${person.last_name}`
                  }))
                ]}
              />

              <RelationshipForm
                formData={{
                  relationship_type: linkData.relationship_type,
                  start_date: linkData.start_date,
                  end_date: linkData.end_date,
                  marriage_place: linkData.marriage_place,
                  notes: linkData.notes,
                }}
                onChange={(field, value) => updateLinkData(field as keyof LinkSpouseData, value)}
                disabled={isLoading}
              />
            </>
          )}

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