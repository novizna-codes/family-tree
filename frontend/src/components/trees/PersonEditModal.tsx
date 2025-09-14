import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
      queryClient.invalidateQueries({ queryKey: ['people', treeId] });
      queryClient.invalidateQueries({ queryKey: ['person', treeId, person.id] });
      queryClient.invalidateQueries({ queryKey: ['tree-visualization', treeId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update person: ${error.message}`);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // If death_date is cleared, also clear death_place
      if (name === 'death_date' && !value) {
        updated.death_place = '';
      }
      return updated;
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: checked };
      // If setting is_deceased to false, clear death fields
      if (name === 'is_deceased' && !checked) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="maiden_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Maiden Name
                </label>
                <Input
                  id="maiden_name"
                  name="maiden_name"
                  type="text"
                  value={formData.maiden_name}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  Nickname
                </label>
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label htmlFor="birth_place" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Place
                </label>
                <Input
                  id="birth_place"
                  name="birth_place"
                  type="text"
                  value={formData.birth_place}
                  onChange={handleInputChange}
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="is_deceased"
                    name="is_deceased"
                    type="checkbox"
                    checked={formData.is_deceased}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_deceased" className="text-sm font-medium text-gray-700">
                    Person is deceased
                  </label>
                </div>
              </div>

              {formData.is_deceased && (
                <>
                  <div>
                    <label htmlFor="death_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Death Date
                    </label>
                    <Input
                      id="death_date"
                      name="death_date"
                      type="date"
                      value={formData.death_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="death_place" className="block text-sm font-medium text-gray-700 mb-1">
                      Death Place
                    </label>
                    <Input
                      id="death_place"
                      name="death_place"
                      type="text"
                      value={formData.death_place}
                      onChange={handleInputChange}
                      placeholder="Enter death place"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Additional notes about this person..."
              />
            </div>

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