import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person } from '@/types';

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
  const [newPersonData, setNewPersonData] = useState({
    first_name: '',
    last_name: '',
    gender: '' as 'M' | 'F' | 'O' | '',
    birth_date: '',
    death_date: '',
    death_place: '',
    is_deceased: false,
  });
  const [spouseData, setSpouseData] = useState({
    relationship_type: 'spouse' as 'spouse' | 'partner' | 'divorced' | 'separated',
    start_date: '',
    end_date: '',
    marriage_place: '',
    relationship_notes: '',
  });
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery({
    queryKey: ['people', treeId],
    queryFn: () => treeService.getPeople(treeId),
    enabled: isOpen,
  });

  // Helper function to check if person2 is a descendant of person1
  const isDescendant = (person1: any, person2: any): boolean => {
    if (!person1.children) return false;
    return person1.children.some((child: any) =>
      child.id === person2.id || isDescendant(child, person2)
    );
  };

  // Helper function to check if person2 is an ancestor of person1
  const isAncestor = (person1: any, person2: any): boolean => {
    return !!(person1.father_id === person2.id || person1.mother_id === person2.id) ||
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
          // Create new parent
          const parentType = newPersonData.gender === 'F' ? 'mother' : 'father';
          const personData = { ...newPersonData };
          // If death_date is empty, also clear death_place
          if (!personData.death_date) {
            personData.death_place = '';
          }
          return treeService.addParent(treeId, person.id, {
            ...personData,
            parent_type: parentType
          });
        } else {
          // Link existing parent
          const selectedPerson = people.find(p => p.id === relatedPersonId);
          const parentType = selectedPerson?.gender === 'F' ? 'mother' : 'father';

          return treeService.linkParent(treeId, person.id, {
            parent_id: relatedPersonId!,
            parent_type: parentType
          });
        }
      } else if (type === 'child') {
        if (isCreatingNew) {
          // Create new child
          const personData = { ...newPersonData };
          // If death_date is empty, also clear death_place
          if (!personData.death_date) {
            personData.death_place = '';
          }
          return treeService.addChild(treeId, person.id, personData);
        } else {
          // Link existing child
          return treeService.linkChild(treeId, person.id, { child_id: relatedPersonId! });
        }
        } else if (type === 'spouse') {
          if (isCreatingNew) {
            // Create new spouse
            const personData = { ...newPersonData };
            // If death_date is empty, also clear death_place
            if (!personData.death_date) {
              personData.death_place = '';
            }
            return treeService.addSpouse(treeId, person.id, {
              ...personData,
              ...spouseData
            });
          } else {
            // Link existing spouse
            return treeService.linkSpouse(treeId, person.id, {
              spouse_id: relatedPersonId!,
              ...spouseData
            });
          }
        }
    },
    onSuccess: () => {
      toast.success('Relationship added successfully!');
      queryClient.invalidateQueries({ queryKey: ['people', treeId] });
      queryClient.invalidateQueries({ queryKey: ['person', treeId, person.id] });
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
      gender: '',
      birth_date: '',
      death_date: '',
      death_place: '',
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
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                activeTab === 'parent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Add Parent
            </button>
            <button
              onClick={() => handleTabChange('child')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                activeTab === 'child'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Add Child
            </button>
            <button
              onClick={() => handleTabChange('spouse')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                activeTab === 'spouse'
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
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    !isCreatingNew
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Link Existing Person
                </button>
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    isCreatingNew
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={newPersonData.first_name}
                      onChange={(e) => setNewPersonData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newPersonData.last_name}
                      onChange={(e) => setNewPersonData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter last name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={newPersonData.gender}
                      onChange={(e) => setNewPersonData(prev => ({ ...prev, gender: e.target.value as 'M' | 'F' | 'O' }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={newPersonData.birth_date}
                      onChange={(e) => setNewPersonData(prev => ({ ...prev, birth_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        id="is_deceased_spouse"
                        type="checkbox"
                        checked={newPersonData.is_deceased}
                        onChange={(e) => {
                          const isDeceased = e.target.checked;
                          setNewPersonData(prev => ({ 
                            ...prev, 
                            is_deceased: isDeceased,
                            death_date: isDeceased ? prev.death_date : '',
                            death_place: isDeceased ? prev.death_place : ''
                          }));
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_deceased_spouse" className="text-sm font-medium text-gray-700">
                        Person is deceased
                      </label>
                    </div>

                    {newPersonData.is_deceased && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Death Date
                          </label>
                          <input
                            type="date"
                            value={newPersonData.death_date}
                            onChange={(e) => setNewPersonData(prev => ({ ...prev, death_date: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Death Place
                          </label>
                          <input
                            type="text"
                            value={newPersonData.death_place}
                            onChange={(e) => setNewPersonData(prev => ({ ...prev, death_place: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter place of death"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Relationship details */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Relationship Details</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Relationship Type
                        </label>
                        <select
                          value={spouseData.relationship_type}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, relationship_type: e.target.value as 'spouse' | 'partner' | 'divorced' | 'separated' }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="spouse">Spouse</option>
                          <option value="partner">Partner</option>
                          <option value="divorced">Divorced</option>
                          <option value="separated">Separated</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {spouseData.relationship_type === 'spouse' ? 'Marriage Date' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={spouseData.start_date}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {(spouseData.relationship_type === 'divorced' || spouseData.relationship_type === 'separated') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {spouseData.relationship_type === 'divorced' ? 'Divorce Date' : 'Separation Date'}
                          </label>
                          <input
                            type="date"
                            value={spouseData.end_date}
                            onChange={(e) => setSpouseData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}

                      {spouseData.relationship_type === 'spouse' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marriage Place
                          </label>
                          <input
                            type="text"
                            value={spouseData.marriage_place}
                            onChange={(e) => setSpouseData(prev => ({ ...prev, marriage_place: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter marriage location"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={spouseData.relationship_notes}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, relationship_notes: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="Enter any additional notes about the relationship"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Dropdown for selecting existing person + relationship details
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Spouse:
                    </label>
                    <select
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a person...</option>
                      {availablePeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                          {p.birth_date && ` (${new Date(p.birth_date).getFullYear()})`}
                        </option>
                      ))}
                    </select>

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
                  </div>

                  {/* Relationship details for linking existing person */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Relationship Details</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Relationship Type
                        </label>
                        <select
                          value={spouseData.relationship_type}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, relationship_type: e.target.value as 'spouse' | 'partner' | 'divorced' | 'separated' }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="spouse">Spouse</option>
                          <option value="partner">Partner</option>
                          <option value="divorced">Divorced</option>
                          <option value="separated">Separated</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {spouseData.relationship_type === 'spouse' ? 'Marriage Date' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          value={spouseData.start_date}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {(spouseData.relationship_type === 'divorced' || spouseData.relationship_type === 'separated') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {spouseData.relationship_type === 'divorced' ? 'Divorce Date' : 'Separation Date'}
                          </label>
                          <input
                            type="date"
                            value={spouseData.end_date}
                            onChange={(e) => setSpouseData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}

                      {spouseData.relationship_type === 'spouse' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marriage Place
                          </label>
                          <input
                            type="text"
                            value={spouseData.marriage_place}
                            onChange={(e) => setSpouseData(prev => ({ ...prev, marriage_place: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter marriage location"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={spouseData.relationship_notes}
                          onChange={(e) => setSpouseData(prev => ({ ...prev, relationship_notes: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          placeholder="Enter any additional notes about the relationship"
                        />
                      </div>
                    </div>
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
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      !isCreatingNew
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Link Existing Person
                  </button>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      isCreatingNew
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Create New Person
                  </button>
                </div>

                {isCreatingNew ? (
                  // Form for creating new person
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newPersonData.first_name}
                        onChange={(e) => setNewPersonData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newPersonData.last_name}
                        onChange={(e) => setNewPersonData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={newPersonData.gender}
                        onChange={(e) => setNewPersonData(prev => ({ ...prev, gender: e.target.value as 'M' | 'F' | 'O' }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        value={newPersonData.birth_date}
                        onChange={(e) => setNewPersonData(prev => ({ ...prev, birth_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          id="is_deceased_modal"
                          type="checkbox"
                          checked={newPersonData.is_deceased}
                          onChange={(e) => {
                            const isDeceased = e.target.checked;
                            setNewPersonData(prev => ({ 
                              ...prev, 
                              is_deceased: isDeceased,
                              death_date: isDeceased ? prev.death_date : '',
                              death_place: isDeceased ? prev.death_place : ''
                            }));
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_deceased_modal" className="text-sm font-medium text-gray-700">
                          Person is deceased
                        </label>
                      </div>

                      {newPersonData.is_deceased && (
                        <>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Death Date
                            </label>
                            <input
                              type="date"
                              value={newPersonData.death_date}
                              onChange={(e) => setNewPersonData(prev => ({ ...prev, death_date: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Death Place
                            </label>
                            <input
                              type="text"
                              value={newPersonData.death_place}
                              onChange={(e) => setNewPersonData(prev => ({ ...prev, death_place: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter place of death"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  // Dropdown for selecting existing person
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select {activeTab === 'parent' ? 'Parent' : 'Child'}:
                    </label>
                    <select
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a person...</option>
                      {availablePeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                          {p.birth_date && ` (${new Date(p.birth_date).getFullYear()})`}
                        </option>
                      ))}
                    </select>

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
                          `${s.first_name} ${s.last_name} (${s.relationship.type})`
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