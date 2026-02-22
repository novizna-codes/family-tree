import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Button, Select } from '../ui';
import { PersonForm, RelationshipForm } from '../forms';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person, PersonFormData } from '@/types';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  treeId: string;
}

type RelationshipType = 'parent' | 'child' | 'spouse';

export function RelationshipModal({ isOpen, onClose, person, treeId }: RelationshipModalProps) {
  const [activeTab, setActiveTab] = useState<RelationshipType>('parent');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newPersonData, setNewPersonData] = useState<PersonFormData>({
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
  });
  const [spouseData, setSpouseData] = useState({
    relationship_type: 'spouse' as 'spouse' | 'partner' | 'divorced' | 'separated',
    start_date: '',
    end_date: '',
    marriage_place: '',
    relationship_notes: '',
  });
  const [parentRole, setParentRole] = useState<'father' | 'mother'>(
    person.gender === 'F' ? 'mother' : 'father'
  );
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery({
    queryKey: ['tree', treeId, 'people'],
    queryFn: () => treeService.getPeople(treeId),
    enabled: isOpen,
  });

  // Helper function to check if person2 is a descendant of person1
  const isDescendant = (person1: Person, person2: Person): boolean => {
    if (!person1.children) return false;
    return person1.children.some((child: Person) =>
      child.id === person2.id || isDescendant(child, person2)
    );
  };

  // Helper function to check if person2 is an ancestor of person1
  const isAncestor = (person1: Person, person2: Person): boolean => {
    return (person1.father_id === person2.id || person1.mother_id === person2.id) ||
      !!(person1.father && isAncestor(person1.father, person2)) ||
      !!(person1.mother && isAncestor(person1.mother, person2));
  };

  // Filter out current person and already related people
  const availablePeople = people.filter(p => {
    if (p.id === person.id) return false;

    if (activeTab === 'parent') {
      // Can't add someone as parent if they're already a child or descendant
      return !isDescendant(person, p) && p.id !== person.father_id && p.id !== person.mother_id;
    } else if (activeTab === 'child') {
      // Can't add someone as child if they're already a parent or ancestor
      return !isAncestor(person, p) && !person.children?.some(c => c.id === p.id);
    }

    return true;
  });

  const addRelationshipMutation = useMutation({
    mutationFn: async ({ type, relatedPersonId }: { type: RelationshipType; relatedPersonId?: string }) => {
      if (type === 'parent') {
        if (isCreatingNew) {
          // Create new parent using unified API
          const parentType = newPersonData.gender === 'F' ? 'mother' : 'father';
          const relationshipData = {
            relationship_type: 'parent' as const,
            relationship_role: parentType,
            ...newPersonData
          };
          // If death_date is empty, also clear death_place
          if (!relationshipData.death_date) {
            relationshipData.death_place = '';
          }
          return treeService.createRelationship(treeId, person.id, relationshipData);
        } else {
          // Link existing parent using unified API
          const selectedPerson = people.find(p => p.id === relatedPersonId);
          const parentType = selectedPerson?.gender === 'F' ? 'mother' : 'father';

          return treeService.linkExistingRelationship(treeId, person.id, {
            relationship_type: 'parent',
            relationship_role: parentType,
            related_person_id: relatedPersonId!
          });
        }
      } else if (type === 'child') {
        if (isCreatingNew) {
          // Create new child using unified API
          const relationshipData = {
            relationship_type: 'child' as const,
            parent_role: parentRole, // Re-use the same field for consistency
            ...newPersonData
          };
          // If death_date is empty, also clear death_place
          if (!relationshipData.death_date) {
            relationshipData.death_place = '';
          }
          return treeService.createRelationship(treeId, person.id, relationshipData);
        } else {
          // Link existing child using unified API
          return treeService.linkExistingRelationship(treeId, person.id, {
            relationship_type: 'child',
            related_person_id: relatedPersonId!,
            relationship_role: parentRole, // Pass the role of the current person
          });
        }
      } else if (type === 'spouse') {
        if (isCreatingNew) {
          // Create new spouse using unified API
          const relationshipData = {
            relationship_type: 'spouse' as const,
            relationship_role: spouseData.relationship_type,
            ...newPersonData,
            start_date: spouseData.start_date,
            end_date: spouseData.end_date,
            marriage_place: spouseData.marriage_place,
            relationship_notes: spouseData.relationship_notes
          };
          // If death_date is empty, also clear death_place
          if (!relationshipData.death_date) {
            relationshipData.death_place = '';
          }
          return treeService.createRelationship(treeId, person.id, relationshipData);
        } else {
          // Link existing spouse using unified API
          return treeService.linkExistingRelationship(treeId, person.id, {
            relationship_type: 'spouse',
            relationship_role: spouseData.relationship_type,
            related_person_id: relatedPersonId!,
            start_date: spouseData.start_date,
            end_date: spouseData.end_date,
            marriage_place: spouseData.marriage_place,
            relationship_notes: spouseData.relationship_notes
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Relationship added successfully!');
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add relationship: ${error.message}`);
    },
  });

  const handleAddRelationship = () => {
    if (!isCreatingNew && !selectedPersonId) {
      toast.error('Please select a person');
      return;
    }

    if (isCreatingNew && !newPersonData.first_name) {
      toast.error('First name is required');
      return;
    }

    addRelationshipMutation.mutate({
      type: activeTab,
      relatedPersonId: selectedPersonId,
    });
  };

  const resetForm = () => {
    setSelectedPersonId('');
    setIsCreatingNew(false);
    setNewPersonData({
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
    });
    setSpouseData({
      relationship_type: 'spouse',
      start_date: '',
      end_date: '',
      marriage_place: '',
      relationship_notes: '',
    });
  };

  const updatePersonData = (field: keyof PersonFormData, value: string | boolean | undefined) => {
    setNewPersonData(prev => {
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

  const updateSpouseData = (field: string, value: string) => {
    setSpouseData(prev => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (tab: RelationshipType) => {
    setActiveTab(tab);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Manage Relationships for {person.first_name} {person.last_name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-6">
            <button
              onClick={() => handleTabChange('parent')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === 'parent'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Add Parent
            </button>
            <button
              onClick={() => handleTabChange('child')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === 'child'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Add Child
            </button>
            <button
              onClick={() => handleTabChange('spouse')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === 'spouse'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Add Spouse
            </button>
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            {activeTab === 'spouse' ? (
              <>
                {/* Toggle between existing and new person */}
                <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-4">
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${!isCreatingNew
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Link Existing Person
                  </button>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${isCreatingNew
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Create New Person
                  </button>
                </div>

                {isCreatingNew ? (
                  // Form for creating new spouse
                  <div className="space-y-4">
                    <PersonForm
                      formData={newPersonData}
                      onChange={updatePersonData}
                      disabled={addRelationshipMutation.isPending}
                      showNotes={false}
                    />

                    {/* Relationship details */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Relationship Details</h4>
                      <RelationshipForm
                        formData={spouseData}
                        onChange={updateSpouseData}
                        disabled={addRelationshipMutation.isPending}
                      />
                    </div>
                  </div>
                ) : (
                  // Dropdown for selecting existing person + relationship details
                  <div className="space-y-4">
                    <Select
                      label="Select Spouse"
                      name="spouse_id"
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      disabled={addRelationshipMutation.isPending}
                      options={[
                        { value: '', label: 'Choose a person...' },
                        ...availablePeople.map((p) => ({
                          value: p.id,
                          label: `${p.first_name} ${p.last_name}${p.birth_date ? ` (${new Date(p.birth_date).getFullYear()})` : ''}`
                        }))
                      ]}
                    />

                    {availablePeople.length === 0 && (
                      <div className="text-center py-4 mt-4">
                        <UserPlusIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No other people in this family tree yet.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Create a new person or add more family members first.
                        </p>
                      </div>
                    )}

                    {/* Relationship details for linking existing person */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Relationship Details</h4>
                      <RelationshipForm
                        formData={spouseData}
                        onChange={updateSpouseData}
                        disabled={addRelationshipMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Toggle between existing and new person */}
                <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-4">
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${!isCreatingNew
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Link Existing Person
                  </button>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${isCreatingNew
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Create New Person
                  </button>
                </div>

                {isCreatingNew ? (
                  // Form for creating new person
                  <PersonForm
                    formData={newPersonData}
                    onChange={updatePersonData}
                    disabled={addRelationshipMutation.isPending}
                    showNotes={false}
                  />
                ) : (
                  // Dropdown for selecting existing person
                  <div>
                    <Select
                      label={`Select ${activeTab === 'parent' ? 'Parent' : 'Child'}`}
                      name="person_id"
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      disabled={addRelationshipMutation.isPending}
                      options={[
                        { value: '', label: 'Choose a person...' },
                        ...availablePeople.map((p) => ({
                          value: p.id,
                          label: `${p.first_name} ${p.last_name}${p.birth_date ? ` (${new Date(p.birth_date).getFullYear()})` : ''}`
                        }))
                      ]}
                    />

                    {availablePeople.length === 0 && (
                      <div className="text-center py-4 mt-4">
                        <UserPlusIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No other people in this family tree yet.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Create a new person or add more family members first.
                        </p>
                      </div>
                    )}

                    {activeTab === 'child' && (
                      <div className="mt-4">
                        <Select
                          label={`Your role as ${newPersonData.first_name || 'the child'}'s parent`}
                          name="parent_role"
                          value={parentRole}
                          onChange={(e) => setParentRole(e.target.value as 'father' | 'mother')}
                          disabled={addRelationshipMutation.isPending}
                          options={[
                            { value: 'father', label: 'Father' },
                            { value: 'mother', label: 'Mother' }
                          ]}
                        />
                        <p className="mt-1 text-xs text-gray-500 italic">
                          Specify if you are the father or mother of this child.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Current Relationships Display */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Relationships:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {person.father && (
                      <div>Father: {person.father.first_name} {person.father.last_name}</div>
                    )}
                    {person.mother && (
                      <div>Mother: {person.mother.first_name} {person.mother.last_name}</div>
                    )}
                    {person.children && person.children.length > 0 && (
                      <div>Children: {person.children.map(c => `${c.first_name} ${c.last_name}`).join(', ')}</div>
                    )}
                    {person.spouses && person.spouses.length > 0 && (
                      <div>
                        Spouses: {person.spouses.map(s =>
                          `${s.first_name} ${s.last_name} (${s.relationship?.type || 'spouse'})`
                        ).join(', ')}
                      </div>
                    )}
                    {!person.father && !person.mother && (!person.children || person.children.length === 0) && (!person.spouses || person.spouses.length === 0) && (
                      <div className="text-gray-400 italic">No relationships yet</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {(activeTab !== 'spouse' || (activeTab === 'spouse' && (isCreatingNew ? newPersonData.first_name.trim() : selectedPersonId))) && (
              <Button
                onClick={handleAddRelationship}
                disabled={addRelationshipMutation.isPending}
              >
                {addRelationshipMutation.isPending ? 'Adding...' : `Add ${activeTab}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}