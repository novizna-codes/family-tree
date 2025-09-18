import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeftIcon, UserPlusIcon, PresentationChartLineIcon, ListBulletIcon, HeartIcon } from '@heroicons/react/24/outline';
import { treeService } from '@/services/treeService';
import { TreeVisualization } from '@/components/trees/TreeVisualization';
import { SpouseModal } from '../../components/trees/SpouseModal';
import { Button } from '@/components/ui/Button';
import type { Person } from '@/types';
import type { CreateSpouseData, LinkSpouseData } from '@/services/familyTreeService';

type ViewMode = 'list' | 'tree';

export function TreeVisualizationPage() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isSpouseModalOpen, setIsSpouseModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', id],
    queryFn: () => treeService.getTree(id!),
    enabled: !!id,
  });

  const { data: visualization, isLoading: vizLoading } = useQuery({
    queryKey: ['visualization', id],
    queryFn: () => treeService.getVisualization(id!),
    enabled: !!id,
  });

  const people = visualization?.people || [];
  const isLoading = treeLoading || vizLoading;

  const addSpouseMutation = useMutation({
    mutationFn: (data: CreateSpouseData) => {
      const { relationship_type, ...personData } = data;
      return treeService.createRelationship(id!, selectedPerson!.id, {
        relationship_type: 'spouse',
        relationship_role: relationship_type,
        ...personData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualization', id] });
      setIsSpouseModalOpen(false);
    },
  });

  const linkSpouseMutation = useMutation({
    mutationFn: (data: LinkSpouseData) => 
      treeService.linkExistingRelationship(id!, selectedPerson!.id, {
        relationship_type: 'spouse',
        relationship_role: data.relationship_type,
        related_person_id: data.spouse_id,
        start_date: data.start_date,
        end_date: data.end_date,
        marriage_place: data.marriage_place,
        relationship_notes: data.notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualization', id] });
      setIsSpouseModalOpen(false);
    },
  });

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
  };

  const handleClosePersonDetails = () => {
    setSelectedPerson(null);
  };

  const handleAddSpouse = () => {
    setIsSpouseModalOpen(true);
  };

  const handleAddSpouseSubmit = async (data: CreateSpouseData) => {
    await addSpouseMutation.mutateAsync(data);
  };

  const handleLinkSpouseSubmit = async (data: LinkSpouseData) => {
    await linkSpouseMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Tree not found</h2>
            <p className="text-gray-600 mt-2">The family tree you're looking for doesn't exist.</p>
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tree.name}</h1>
                {tree.description && (
                  <p className="text-gray-600 mt-1">{tree.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'tree'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <PresentationChartLineIcon className="h-4 w-4 mr-1 inline" />
                  Tree View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4 mr-1 inline" />
                  List View
                </button>
              </div>

              <Link to={`/trees/${id}/people/add`}>
                <Button>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {people.length === 0 ? (
          <div className="text-center py-12">
            <PresentationChartLineIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No family members yet</h3>
            <p className="text-gray-600 mb-6">
              Start building your family tree by adding the first person.
            </p>
            <Link to={`/trees/${id}/people/add`}>
              <Button>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Add First Person
              </Button>
            </Link>
          </div>
        ) : (
          <div className="relative">
            {viewMode === 'tree' ? (
              <div className="h-[calc(100vh-200px)] relative">
                <TreeVisualization
                  people={people}
                  onPersonClick={handlePersonClick}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Family Members ({people.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePersonClick(person)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {person.first_name} {person.last_name}
                          </h4>
                          <div className="mt-1 text-sm text-gray-600">
                            {person.birth_date && (
                              <span>Born {new Date(person.birth_date).getFullYear()}</span>
                            )}
                            {person.birth_place && (
                              <span> • {person.birth_place}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            person.gender === 'M'
                              ? 'bg-blue-100 text-blue-800'
                              : person.gender === 'F'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {person.gender}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            person.is_living
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {person.is_living ? 'Living' : 'Deceased'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Person Details Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedPerson.first_name} {selectedPerson.last_name}
                </h3>
                <button
                  onClick={handleClosePersonDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
               <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Full Name:</span>
                  <span className="ml-2 text-gray-900">
                    {selectedPerson.first_name} {selectedPerson.last_name}
                  </span>
                </div>
                
                {selectedPerson.maiden_name && (
                  <div>
                    <span className="font-medium text-gray-700">Maiden Name:</span>
                    <span className="ml-2 text-gray-900">{selectedPerson.maiden_name}</span>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-700">Gender:</span>
                  <span className="ml-2 text-gray-900 capitalize">{selectedPerson.gender}</span>
                </div>
                
                {selectedPerson.birth_date && (
                  <div>
                    <span className="font-medium text-gray-700">Birth Date:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(selectedPerson.birth_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {selectedPerson.birth_place && (
                  <div>
                    <span className="font-medium text-gray-700">Birth Place:</span>
                    <span className="ml-2 text-gray-900">{selectedPerson.birth_place}</span>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-gray-900">
                    {selectedPerson.is_living ? 'Living' : 'Deceased'}
                  </span>
                </div>

                {selectedPerson.spouses && selectedPerson.spouses.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Spouses:</span>
                    <div className="mt-1 space-y-1">
                      {selectedPerson.spouses.map((spouse, index) => (
                        <div key={index} className="text-gray-900 text-sm">
                          {spouse.first_name} {spouse.last_name}
                          <span className="text-gray-600 ml-2">
                            ({spouse.relationship.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedPerson.notes && (
                  <div>
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="mt-1 text-gray-900">{selectedPerson.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-between">
                <Button
                  onClick={handleAddSpouse}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  <HeartIcon className="h-4 w-4 mr-2" />
                  Add Spouse
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClosePersonDetails}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spouse Modal */}
      {selectedPerson && (
        <SpouseModal
          isOpen={isSpouseModalOpen}
          onClose={() => setIsSpouseModalOpen(false)}
          onAddSpouse={handleAddSpouseSubmit}
          onLinkSpouse={handleLinkSpouseSubmit}
          existingPeople={people.filter(p => p.id !== selectedPerson.id)}
          isLoading={addSpouseMutation.isPending || linkSpouseMutation.isPending}
        />
      )}
    </div>
  );
}