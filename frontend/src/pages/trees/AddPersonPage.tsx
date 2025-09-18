import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treeService } from '@/services/treeService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CreatePersonData } from '@/services/familyTreeService';

export const AddPersonPage: React.FC = () => {
  const { id: treeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tree } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: () => treeService.getTree(treeId!),
    enabled: !!treeId,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['tree', treeId, 'people'],
    queryFn: () => treeService.getPeople(treeId!),
    enabled: !!treeId,
  });

  const createPersonMutation = useMutation({
    mutationFn: async (data: CreatePersonData) => {
      return treeService.createPerson(treeId!, data);
    },
    onSuccess: () => {
      // Invalidate and refetch related data
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      navigate(`/trees/${treeId}`);
    },
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    maiden_name: '',
    nickname: '',
    gender: '',
    birth_date: '',
    death_date: '',
    birth_place: '',
    death_place: '',
    notes: '',
    father_id: '',
    mother_id: '',
    is_deceased: false,
  });

  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeId || !formData.first_name.trim()) {
      setError('First name is required');
      return;
    }

    try {
      setError(null);

      const personData: Partial<CreatePersonData> = {};
      Object.entries(formData).forEach(([key, value]) => {
        // Skip empty values
        if (value === '' || value === null || value === undefined) {
          return;
        }
        (personData as any)[key] = value;
      });

      // If death_date is empty, ensure death_place is also empty
      if (!personData.death_date) {
        personData.death_place = '';
      }

      if (!personData.first_name) {
        setError('First name is required');
        return;
      }

      await createPersonMutation.mutateAsync(personData as CreatePersonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
            <Link to={`/trees/${treeId}`} className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              Add Person to {tree?.name}
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Add New Person
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Add a new family member to your tree
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
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

              {/* Parent Relationship Section */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Family Relationships</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="father_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Father
                    </label>
                    <select
                      id="father_id"
                      name="father_id"
                      value={formData.father_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select father (optional)</option>
                      {people
                        .filter(person => person.gender === 'M' || !person.gender)
                        .map(person => (
                          <option key={person.id} value={person.id}>
                            {person.first_name} {person.last_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="mother_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Mother
                    </label>
                    <select
                      id="mother_id"
                      name="mother_id"
                      value={formData.mother_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select mother (optional)</option>
                      {people
                        .filter(person => person.gender === 'F' || !person.gender)
                        .map(person => (
                          <option key={person.id} value={person.id}>
                            {person.first_name} {person.last_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6">
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

              <div className="mt-8 flex justify-end space-x-3">
                <Link to={`/trees/${treeId}`}>
                  <Button variant="outline" disabled={createPersonMutation.isPending}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createPersonMutation.isPending || !formData.first_name.trim()}>
                  {createPersonMutation.isPending ? 'Adding...' : 'Add Person'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};