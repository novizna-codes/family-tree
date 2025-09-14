import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person } from '@/types';

interface DeletePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  treeId: string;
}

export function DeletePersonModal({ isOpen, onClose, person, treeId }: DeletePersonModalProps) {
  const queryClient = useQueryClient();

  const deletePersonMutation = useMutation({
    mutationFn: () => treeService.deletePerson(treeId, person.id),
    onSuccess: () => {
      toast.success('Person deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['people', treeId] });
      queryClient.invalidateQueries({ queryKey: ['tree-visualization', treeId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete person: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deletePersonMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Person
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete <strong>{person.first_name} {person.last_name}</strong>? 
              This will remove them from the family tree and cannot be undone.
            </p>
            
            {(person.children && person.children.length > 0) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This person has {person.children.length} child(ren). 
                  Deleting them will remove the parent relationship but keep the children in the tree.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePersonMutation.isPending}
            >
              {deletePersonMutation.isPending ? 'Deleting...' : 'Delete Person'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}