import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeftIcon, UserPlusIcon, PresentationChartLineIcon, ListBulletIcon, LinkIcon, PrinterIcon, PencilIcon, TrashIcon, XMarkIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import { TreeVisualization } from '@/components/trees/TreeVisualization';
import { RelationshipModal } from '@/components/trees/RelationshipModal';
import { PersonEditModal } from '@/components/trees/PersonEditModal';
import { DeletePersonModal } from '@/components/trees/DeletePersonModal';
import { PrintModal } from '@/components/trees/PrintModal';
import { CopyPersonModal } from '@/components/trees/CopyPersonModal';
import { RelationshipEditModal } from '@/components/trees/RelationshipEditModal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import type { Person, VisualizationPerson } from '@/types';
import type { Relationship } from '@/services/familyTreeService';

type ViewMode = 'list' | 'tree';

export const TreeViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [relationshipPerson, setRelationshipPerson] = useState<Person | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [personToCopy, setPersonToCopy] = useState<Person | null>(null);
  const [relationshipToEdit, setRelationshipToEdit] = useState<(Relationship & { personId?: string }) | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [relEditModalOpen, setRelEditModalOpen] = useState(false);
  const treeElementRef = useRef<HTMLDivElement>(null);

  const { data: tree, isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ['tree', id],
    queryFn: () => treeService.getTree(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: visualization, isLoading: visualizationLoading } = useQuery({
    queryKey: ['tree', id, 'visualization'],
    queryFn: () => treeService.getVisualization(id!),
    enabled: !!id,
  });

  const isLoading = treeLoading || visualizationLoading;
  const people = visualization?.people || [];

  if (treeError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <XMarkIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Tree</h2>
          <p className="text-gray-600 mb-6">
            {(treeError as Error & { response?: { status: number } })?.response?.status === 404
              ? "The family tree you're looking for doesn't exist or you don't have permission to view it."
              : "An unexpected error occurred while loading the family tree."}
          </p>
          <Button onClick={() => navigate('/dashboard')} variant="primary" className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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

  const handlePersonClick = (person: VisualizationPerson | Person, event?: React.MouseEvent | MouseEvent) => {
    // Check if user held Ctrl or Shift key to open relationship modal directly
    const isSpecialClick = event && (event.ctrlKey || event.shiftKey);

    if (isSpecialClick) {
      handleOpenRelationshipModal(person as Person);
    } else {
      setSelectedPerson(person as Person);
    }
  };

  const handleClosePersonDetails = () => {
    setSelectedPerson(null);
  };

  const handleOpenRelationshipModal = (person: Person) => {
    setRelationshipPerson(person);
    setRelationshipModalOpen(true);
    setSelectedPerson(null);
  };

  const handleCloseRelationshipModal = () => {
    setRelationshipModalOpen(false);
    setRelationshipPerson(null);
  };

  const handleOpenPrintModal = () => {
    setPrintModalOpen(true);
  };

  const handleClosePrintModal = () => {
    setPrintModalOpen(false);
  };

  const handleOpenEditModal = (person: Person) => {
    setPersonToEdit(person);
    setEditModalOpen(true);
    setSelectedPerson(null);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setPersonToEdit(null);
  };

  const handleOpenDeleteModal = (person: Person) => {
    setPersonToDelete(person);
    setDeleteModalOpen(true);
    setSelectedPerson(null);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setPersonToDelete(null);
  };

  const handleOpenCopyModal = (person: Person) => {
    setPersonToCopy(person);
    setCopyModalOpen(true);
  };

  const handleOpenRelEditModal = (relationship: any, personId: string) => {
    setRelationshipToEdit({ ...relationship, personId });
    setRelEditModalOpen(true);
  };

  const handleUnlinkParent = async (personId: string, parentType: 'father' | 'mother') => {
    if (window.confirm(`Are you sure you want to unlink this ${parentType}?`)) {
      try {
        await treeService.removeRelationship(id!, personId, parentType);
        toast.success(`${parentType === 'father' ? 'Father' : 'Mother'} unlinked successfully`);
        queryClient.invalidateQueries({ queryKey: ['tree', id] });
      } catch (error) {
        toast.error(`Failed to unlink: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
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
              {people.length > 0 && (
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm font-medium ${viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <ListBulletIcon className="h-4 w-4 mr-1 inline" />
                    List View
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`px-3 py-2 text-sm font-medium ${viewMode === 'tree'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <PresentationChartLineIcon className="h-4 w-4 mr-1 inline" />
                    Tree View
                  </button>
                </div>
              )}

              {/* Print Button */}
              {people.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleOpenPrintModal}
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print / Export
                </Button>
              )}

              <Link to={`/trees/${id}/people/add`}>
                <Button>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </Link>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.name}</span>
                <Button variant="outline" onClick={logout} className="text-sm">
                  Logout
                </Button>
              </div>
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
          <div className="relative" ref={treeElementRef}>
            {viewMode === 'tree' ? (
              <div className="h-[calc(100vh-200px)] relative">
                {/* Instruction tooltip */}
                <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 text-sm shadow-lg max-w-64">
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">💡</span>
                    <span className="font-semibold text-blue-900">Tree Navigation</span>
                  </div>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex items-center">
                      <span className="w-4 h-4 bg-blue-200 rounded-full mr-2"></span>
                      <span>Click → View details</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-4 h-4 bg-green-200 rounded-full mr-2"></span>
                      <span><kbd className="px-2 py-1 bg-white rounded text-xs border">Ctrl</kbd> + Click → Add relationships</span>
                    </div>
                  </div>
                </div>
                <TreeVisualization
                  people={people}
                  relationships={visualization?.relationships}
                  onPersonClick={handlePersonClick}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Family Members ({people.length})
                    </h3>
                    <div className="text-sm text-gray-600">
                      <span className="bg-gray-50 px-2 py-1 rounded text-xs border mr-2">
                        Click: Details
                      </span>
                      <span className="bg-green-50 px-2 py-1 rounded text-xs border">
                        <kbd className="bg-white px-1 rounded">Ctrl</kbd>+Click: Relationships
                      </span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={(e) => handlePersonClick(person, e)}
                        >
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
                          <button
                            onClick={() => handleOpenEditModal(person)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <PencilIcon className="h-3 w-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(person)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="h-3 w-3 mr-1" />
                            Delete
                          </button>
                          <button
                            onClick={() => handleOpenRelationshipModal(person)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Relationships
                          </button>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${person.gender === 'M'
                            ? 'bg-blue-100 text-blue-800'
                            : person.gender === 'F'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Other'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${person.is_living
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedPerson.first_name} {selectedPerson.last_name}
                </h3>
                <button
                  onClick={handleClosePersonDetails}
                  className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
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
                  <span className="ml-2 text-gray-900">
                    {selectedPerson.gender === 'M' ? 'Male' : selectedPerson.gender === 'F' ? 'Female' : 'Other'}
                  </span>
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
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedPerson.is_living
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedPerson.is_living ? 'Living' : 'Deceased'}
                  </span>
                </div>

                {selectedPerson.notes && (
                  <div>
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">{selectedPerson.notes}</p>
                  </div>
                )}

                {/* Relations Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <ListBulletIcon className="h-4 w-4 mr-2" />
                    Relations
                  </h4>

                  <ul className="divide-y divide-gray-100 border-t border-b border-gray-100 mb-6">
                    {/* Parents */}
                    <li className="py-3 flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-bold uppercase text-gray-400 w-16 tracking-wider">Father</span>
                        {selectedPerson.father ? (
                          <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedPerson(selectedPerson.father!)}>
                            {selectedPerson.father.first_name} {selectedPerson.father.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )}
                      </div>
                      {selectedPerson.father && (
                        <button
                          onClick={() => handleUnlinkParent(selectedPerson.id, 'father')}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Unlink Father"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </li>

                    <li className="py-3 flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-bold uppercase text-gray-400 w-16 tracking-wider">Mother</span>
                        {selectedPerson.mother ? (
                          <span className="text-sm font-medium text-pink-600 cursor-pointer hover:underline" onClick={() => setSelectedPerson(selectedPerson.mother!)}>
                            {selectedPerson.mother.first_name} {selectedPerson.mother.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )}
                      </div>
                      {selectedPerson.mother && (
                        <button
                          onClick={() => handleUnlinkParent(selectedPerson.id, 'mother')}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Unlink Mother"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </li>

                    {/* Spouses */}
                    {selectedPerson.spouses?.map((spouse) => (
                      <li key={spouse.id} className="py-3 flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-bold uppercase text-gray-400 w-16 tracking-wider">
                            {spouse.relationship?.type || 'Spouse'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {spouse.first_name} {spouse.last_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenRelEditModal(spouse.relationship, selectedPerson.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Relationship"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this relationship?')) {
                                treeService.removeRelationship(id!, selectedPerson.id, spouse.relationship.id)
                                  .then(() => {
                                    toast.success('Relationship deleted');
                                    queryClient.invalidateQueries({ queryKey: ['tree', id] });
                                  });
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Relationship"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}

                    {/* Children */}
                    {selectedPerson.children?.map((child) => (
                      <li key={child.id} className="py-3 flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-bold uppercase text-gray-400 w-16 tracking-wider">Child</span>
                          <span className="text-sm font-medium text-gray-900 cursor-pointer hover:underline hover:text-blue-600" onClick={() => setSelectedPerson(child)}>
                            {child.first_name} {child.last_name}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Unlink ${child.first_name} as a child?`)) {
                              // For children, we need to know if the current person is father or mother
                              const parentRole = selectedPerson.gender === 'F' ? 'mother' : 'father';
                              treeService.removeRelationship(id!, child.id, parentRole)
                                .then(() => {
                                  toast.success('Child unlinked');
                                  queryClient.invalidateQueries({ queryKey: ['tree', id] });
                                });
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Unlink Child"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenEditModal(selectedPerson)}
                    className="text-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleOpenDeleteModal(selectedPerson)}
                    className="text-sm"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenCopyModal(selectedPerson)}
                    className="text-sm"
                  >
                    <ClipboardIcon className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleOpenRelationshipModal(selectedPerson)}
                    className="flex-1 sm:flex-none"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Manage Relationships
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClosePersonDetails}
                    className="flex-1 sm:flex-none"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Management Modal */}
      {relationshipModalOpen && relationshipPerson && (
        <RelationshipModal
          isOpen={relationshipModalOpen}
          onClose={handleCloseRelationshipModal}
          person={relationshipPerson}
          treeId={id!}
        />
      )}

      {/* Print Modal */}
      {printModalOpen && tree && (
        <PrintModal
          isOpen={printModalOpen}
          onClose={handleClosePrintModal}
          tree={tree}
          people={people}
          treeElement={treeElementRef.current}
        />
      )}

      {/* Edit Person Modal */}
      {editModalOpen && personToEdit && (
        <PersonEditModal
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          person={personToEdit}
          treeId={id!}
        />
      )}

      {/* Delete Person Modal */}
      {deleteModalOpen && personToDelete && (
        <DeletePersonModal
          isOpen={deleteModalOpen}
          onClose={handleCloseDeleteModal}
          person={personToDelete}
          treeId={id!}
        />
      )}

      {/* Copy Person Modal */}
      {copyModalOpen && personToCopy && (
        <CopyPersonModal
          isOpen={copyModalOpen}
          onClose={() => setCopyModalOpen(false)}
          person={personToCopy}
          currentTreeId={id!}
        />
      )}

      {/* Relationship Edit Modal */}
      {relEditModalOpen && relationshipToEdit && (
        <RelationshipEditModal
          isOpen={relEditModalOpen}
          onClose={() => setRelEditModalOpen(false)}
          relationship={relationshipToEdit}
          personId={relationshipToEdit.personId || ''}
          treeId={id!}
        />
      )}
    </div>
  );
};