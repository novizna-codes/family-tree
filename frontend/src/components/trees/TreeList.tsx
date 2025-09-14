import React from 'react';
import { Link } from 'react-router-dom';
import type { FamilyTree } from '@/services/familyTreeService';
import { Button } from '@/components/ui/Button';

interface TreeListProps {
  trees?: FamilyTree[];
  loading: boolean;
  onCreateTree: () => void;
  onDeleteTree: (id: string) => void;
}

export const TreeList: React.FC<TreeListProps> = ({
  trees,
  loading,
  onCreateTree,
  onDeleteTree,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trees || trees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No family trees</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first family tree.
        </p>
        <div className="mt-6">
          <Button onClick={onCreateTree}>
            Create your first tree
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(trees || []).map((tree) => (
        <div key={tree.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tree.name}
                </h3>
                {tree.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {tree.description}
                  </p>
                )}
                <div className="text-sm text-gray-500">
                  {tree.people_count || 0} people
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <button
                  onClick={() => onDeleteTree(tree.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete tree"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <Link
                to={`/trees/${tree.id}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  View Tree
                </Button>
              </Link>
              <Link
                to={`/trees/${tree.id}/edit`}
                className="flex-1"
              >
                <Button className="w-full">
                  Edit
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500">
            Created {new Date(tree.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};