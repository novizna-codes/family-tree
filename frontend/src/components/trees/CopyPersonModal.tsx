import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person, FamilyTree } from '@/types';

interface CopyPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: Person;
    currentTreeId: string;
}

export function CopyPersonModal({ isOpen, onClose, person, currentTreeId }: CopyPersonModalProps) {
    const [targetTreeId, setTargetTreeId] = useState<string>('');
    const queryClient = useQueryClient();

    const { data: trees, isLoading: treesLoading } = useQuery({
        queryKey: ['trees'],
        queryFn: () => treeService.getTrees(),
        enabled: isOpen,
    });

    const copyMutation = useMutation({
        mutationFn: (targetId: string) => treeService.copyPerson(currentTreeId, person.id, targetId),
        onSuccess: (data: any) => {
            toast.success(data.message || 'Person copied successfully!');
            queryClient.invalidateQueries({ queryKey: ['tree', targetTreeId] });
            onClose();
        },
        onError: (error: Error) => {
            toast.error(`Failed to copy person: ${error.message}`);
        },
    });

    if (!isOpen) return null;

    const otherTrees = trees?.filter((t: FamilyTree) => t.id !== currentTreeId) || [];

    const handleCopy = () => {
        if (!targetTreeId) {
            toast.error('Please select a target tree');
            return;
        }
        copyMutation.mutate(targetTreeId);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <ClipboardIcon className="h-5 w-5 mr-2 text-blue-600" />
                            Copy Person to Other Tree
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        Copy <strong>{person.first_name} {person.last_name}</strong> to another family tree.
                        Only basic information (name, dates, places, notes) will be copied.
                        Relationships and photos will not be preserved.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="target-tree" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Target Tree
                            </label>
                            <select
                                id="target-tree"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={targetTreeId}
                                onChange={(e) => setTargetTreeId(e.target.value)}
                                disabled={treesLoading || copyMutation.isPending}
                            >
                                <option value="">-- Choose a tree --</option>
                                {otherTrees.map((tree: FamilyTree) => (
                                    <option key={tree.id} value={tree.id}>
                                        {tree.name}
                                    </option>
                                ))}
                            </select>
                            {otherTrees.length === 0 && !treesLoading && (
                                <p className="mt-2 text-xs text-red-500">
                                    You don't have any other trees to copy to.
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button variant="secondary" onClick={onClose} disabled={copyMutation.isPending}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCopy}
                                disabled={!targetTreeId || copyMutation.isPending}
                            >
                                {copyMutation.isPending ? 'Copying...' : 'Copy Person'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
