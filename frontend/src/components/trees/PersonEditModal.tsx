import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { PersonForm } from '../forms';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person, PersonFormData } from '@/types';

interface PersonEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  treeId: string;
}

export function PersonEditModal({ isOpen, onClose, person, treeId }: PersonEditModalProps) {
  const [formData, setFormData] = useState<PersonFormData>({
    first_name: '',
    last_name: '',
    maiden_name: '',
    nickname: '',
    gender: 'M',
    birth_date: '',
    death_date: '',
    birth_place: '',
    death_place: '',
    notes: '',
    is_deceased: false,
  });

  const queryClient = useQueryClient();

  // Initialize form data when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name,
        last_name: person.last_name || '',
        maiden_name: person.maiden_name || '',
        nickname: person.nickname || '',
        gender: person.gender || 'M',
        birth_date: person.birth_date ? person.birth_date.split('T')[0] : '',
        death_date: person.death_date ? person.death_date.split('T')[0] : '',
        birth_place: person.birth_place || '',
        death_place: person.death_place || '',
        notes: person.notes || '',
        is_deceased: !person.is_living,
      });
    }
  }, [person]);

  const updatePersonMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const updateData = { ...data };
      // If death_date is empty, also clear death_place
      if (!updateData.death_date) {
        updateData.death_place = '';
      }
      return treeService.updatePerson(treeId, person.id, updateData);
    },
    onSuccess: () => {
      toast.success('Person updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update person: ${error.message}`);
    },
  });

  const updateFormData = (field: keyof PersonFormData, value: string | boolean | undefined) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // If death_date is cleared, also clear death_place
      if (field === 'death_date' && !value) {
        updated.death_place = '';
      }
      // If setting is_deceased to false, clear death fields
      if (field === 'is_deceased' && !value) {
        updated.death_date = '';
        updated.death_place = '';
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    updatePersonMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Edit {person.first_name} {person.last_name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <PersonForm
              formData={formData}
              onChange={updateFormData}
              disabled={updatePersonMutation.isPending}
              showNotes={true}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updatePersonMutation.isPending || !formData.first_name.trim()}
              >
                {updatePersonMutation.isPending ? 'Updating...' : 'Update Person'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}