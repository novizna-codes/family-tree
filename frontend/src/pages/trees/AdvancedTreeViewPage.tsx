import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ArrowLeftIcon, EyeIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { familyTreeService } from '@/services/familyTreeService';
import { AdvancedTreeVisualization } from '@/components/trees/AdvancedTreeVisualization';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import type { CompleteTreeResponse } from '@/types';

export const AdvancedTreeViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuthStore();
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  // Fetch tree details
  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', id],
    queryFn: () => familyTreeService.getFamilyTree(id!),
    enabled: !!id,
  });

  // Fetch complete tree structure from our new endpoint
  const { data: completeTree, isLoading: completeTreeLoading, error } = useQuery({
    queryKey: ['tree', id, 'complete', focusPersonId],
    queryFn: () => familyTreeService.getCompleteTree(id!, focusPersonId || undefined),
    enabled: !!id,
  });

  // Use real data from API
  const actualTree = tree;
  const actualCompleteTree = completeTree;
  const isLoading = treeLoading || completeTreeLoading;

  // Debug logging
  console.log('Advanced Tree View Debug:', {
    tree: !!actualTree,
    completeTree: !!actualCompleteTree,
    structure: !!actualCompleteTree?.structure,
    roots: actualCompleteTree?.structure?.roots?.length || 0,
    isLoading,
    error
  });

  const handlePersonClick = (personId: string) => {
    setSelectedPersonId(personId);
    // Optional: Show person details modal or sidebar
  };

  const resetView = () => {
    setSelectedPersonId(null);
  };

  const handleFocusPersonChange = (personId: string | null) => {
    setFocusPersonId(personId);
  };

  const clearPersonFilter = () => {
    setFocusPersonId(null);
  };

  // Get all people for the filter dropdown
  const allPeople = actualCompleteTree?.structure?.people_map ? Object.values(actualCompleteTree.structure.people_map) : [];

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Error loading tree</h2>
            <p className="text-gray-600 mt-2">
              {error instanceof Error ? error.message : 'Failed to load the advanced tree view.'}
            </p>
            <Link to={`/trees/${id}`} className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
              ← Back to Regular Tree View
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!actualTree || !actualCompleteTree) {
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
                to={`/trees/${id}`}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                Back to Tree View
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {actualTree.name} - Advanced Visualization
                </h1>
                {actualTree.description && (
                  <p className="text-gray-600 mt-1">{actualTree.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Person Filter */}
              {allPeople.length > 0 && (
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-4 w-4 text-gray-500" />
                  <div className="relative">
                    <select
                      value={focusPersonId || ''}
                      onChange={(e) => handleFocusPersonChange(e.target.value || null)}
                      className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-48"
                    >
                      <option value="">Show Complete Family Tree</option>
                      {allPeople
                        .sort((a, b) => {
                          const nameA = `${a.first_name} ${a.last_name || ''}`.trim();
                          const nameB = `${b.first_name} ${b.last_name || ''}`.trim();
                          return nameA.localeCompare(nameB);
                        })
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.first_name} {person.last_name || ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  {focusPersonId && (
                    <button
                      onClick={clearPersonFilter}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Clear filter"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border">
                <span className="font-medium">
                  {focusPersonId ? 'Filtered View:' : 'Complete View:'} 
                </span> 
                {focusPersonId 
                  ? `Showing ${allPeople.find(p => p.id === focusPersonId)?.first_name}'s lineage`
                  : 'All connected family members'
                }
              </div>
              
              <Link to={`/trees/${id}`}>
                <Button variant="outline">
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Standard View
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
      <div className="h-[calc(100vh-80px)]">
        {!actualCompleteTree?.structure?.roots || actualCompleteTree.structure.roots.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="h-12 w-12 text-gray-400 mx-auto mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No family members yet</h3>
              <p className="text-gray-600 mb-6">
                Start building your family tree by adding people in the standard view.
              </p>
              <Link to={`/trees/${id}`}>
                <Button>
                  <ChevronLeftIcon className="h-4 w-4 mr-2" />
                  Go to Standard View
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <AdvancedTreeVisualization
            treeData={actualCompleteTree}
            onPersonClick={handlePersonClick}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Selected Person Info Panel (if implemented) */}
      {selectedPersonId && (
        <div className="fixed top-20 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-900">Selected Person</h3>
            <button
              onClick={resetView}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <p>Person ID: {selectedPersonId}</p>
            <p className="mt-2 text-xs">
              Click on another person to view their details, or use the controls panel to adjust the visualization.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-40">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm">
            <span className="font-medium">Advanced Tree View</span> - 
            {actualCompleteTree?.stats?.unified_tree 
              ? ' Unified view connecting all family lines through marriages'
              : ' Multiple layouts, generation controls, and advanced filtering'
            }
            {actualCompleteTree?.stats && (
              <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                {actualCompleteTree.stats.total_people} people, {actualCompleteTree.stats.tree_count} tree{actualCompleteTree.stats.tree_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};