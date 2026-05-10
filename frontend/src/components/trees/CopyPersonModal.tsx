import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PersonSearchSelect } from '@/components/ui/PersonSearchSelect';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Person, FamilyTree, CopyPersonResponse } from '@/types';

interface CopyPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: Person;
    currentTreeId: string;
}

export function CopyPersonModal({ isOpen, onClose, person, currentTreeId }: CopyPersonModalProps) {
    const navigate = useNavigate();
    const [targetTreeId, setTargetTreeId] = useState<string>('');
    const [targetParentId, setTargetParentId] = useState<string>('');
    const [targetParentRole, setTargetParentRole] = useState<'father' | 'mother'>('father');
    const [copyMode, setCopyMode] = useState<'clone' | 'reuse'>('clone');
    const [targetMode, setTargetMode] = useState<'existing' | 'create'>('existing');
    const [targetTreeName, setTargetTreeName] = useState<string>('');
    const [targetTreeDescription, setTargetTreeDescription] = useState<string>('');
    const [includeDescendants, setIncludeDescendants] = useState(true);
    const queryClient = useQueryClient();

    const resetFormState = (): void => {
        setTargetTreeId('');
        setTargetParentId('');
        setTargetParentRole('father');
        setTargetMode('existing');
        setTargetTreeName('');
        setTargetTreeDescription('');
        setIncludeDescendants(true);
        setCopyMode('clone');
    };

    const handleClose = (): void => {
        resetFormState();
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            resetFormState();
        }
    }, [isOpen]);

    const { data: trees, isLoading: treesLoading } = useQuery({
        queryKey: ['trees'],
        queryFn: () => treeService.getTrees(),
        enabled: isOpen,
    });

    const { data: targetTreePeople, isLoading: peopleLoading } = useQuery({
        queryKey: ['tree-people', targetTreeId],
        queryFn: () => treeService.getPeople(targetTreeId),
        enabled: isOpen && !!targetTreeId,
    });

    const copyMutation = useMutation({
        mutationFn: () => treeService.copyPerson(currentTreeId, person.id, targetMode === 'existing' ? targetTreeId : undefined, {
            include_descendants: includeDescendants,
            copy_mode: copyMode,
            target_parent_id: targetMode === 'existing' ? targetParentId || undefined : undefined,
            target_parent_role: targetMode === 'existing' && targetParentId ? targetParentRole : undefined,
            create_target_tree: targetMode === 'create',
            target_tree_name: targetMode === 'create' ? targetTreeName.trim() : undefined,
            target_tree_description: targetMode === 'create' ? targetTreeDescription.trim() || undefined : undefined,
        }),
        onSuccess: (data: CopyPersonResponse) => {
            const createdTreeName = data.meta.created_tree_name;
            toast.success(createdTreeName ? `Person copied to new tree "${createdTreeName}" successfully!` : (data.message || 'Person copied successfully!'));

            const invalidateTreeId = data.meta.created_tree_id || (targetMode === 'existing' ? targetTreeId : undefined);
            if (invalidateTreeId) {
                queryClient.invalidateQueries({ queryKey: ['tree', invalidateTreeId] });
                queryClient.invalidateQueries({ queryKey: ['tree', invalidateTreeId, 'visualization'] });
            }

            if (data.meta.created_tree_id) {
                navigate(`/trees/${data.meta.created_tree_id}`);
            }
            handleClose();
        },
        onError: (error: Error) => {
            toast.error(`Failed to copy person: ${error.message}`);
        },
    });

    if (!isOpen) return null;

    const otherTrees = trees?.filter((t: FamilyTree) => t.id !== currentTreeId) || [];

    const handleCopy = () => {
        if (targetMode === 'existing' && !targetTreeId) {
            toast.error('Please select a target tree');
            return;
        }

        if (targetMode === 'create' && !targetTreeName.trim()) {
            toast.error('Please enter a name for the new tree');
            return;
        }

        if (targetMode === 'existing' && targetParentId && !targetParentRole) {
            toast.error('Please select how to attach under the parent');
            return;
        }

        copyMutation.mutate();
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
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        Copy <strong>{person.full_name}</strong> to another family tree.
                        You can include descendants and optionally attach the copied root under a parent in the target tree.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <p className="block text-sm font-medium text-gray-700 mb-2">Target</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="target-mode"
                                        value="existing"
                                        checked={targetMode === 'existing'}
                                        onChange={() => setTargetMode('existing')}
                                        disabled={copyMutation.isPending}
                                    />
                                    <span>Use existing tree</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="target-mode"
                                        value="create"
                                        checked={targetMode === 'create'}
                                        onChange={() => {
                                            setTargetMode('create');
                                            setTargetParentId('');
                                        }}
                                        disabled={copyMutation.isPending}
                                    />
                                    <span>Create new tree</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="target-tree" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Target Tree
                            </label>
                             <select
                                 id="target-tree"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={targetTreeId}
                                 onChange={(e) => {
                                     setTargetTreeId(e.target.value);
                                     setTargetParentId('');
                                 }}
                                 disabled={targetMode === 'create' || treesLoading || copyMutation.isPending}
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

                        {targetMode === 'create' && (
                            <>
                                <div>
                                    <label htmlFor="new-target-tree-name" className="block text-sm font-medium text-gray-700 mb-1">
                                        New Tree Name
                                    </label>
                                    <input
                                        id="new-target-tree-name"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        value={targetTreeName}
                                        onChange={(e) => setTargetTreeName(e.target.value)}
                                        disabled={copyMutation.isPending}
                                        placeholder="Enter tree name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new-target-tree-description" className="block text-sm font-medium text-gray-700 mb-1">
                                        New Tree Description (optional)
                                    </label>
                                    <textarea
                                        id="new-target-tree-description"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        value={targetTreeDescription}
                                        onChange={(e) => setTargetTreeDescription(e.target.value)}
                                        disabled={copyMutation.isPending}
                                        rows={3}
                                        placeholder="Add a short description"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                id="include-descendants"
                                type="checkbox"
                                checked={includeDescendants}
                                onChange={(e) => setIncludeDescendants(e.target.checked)}
                                disabled={copyMutation.isPending}
                            />
                            <label htmlFor="include-descendants" className="text-sm text-gray-700">
                                Include descendants
                            </label>
                        </div>

                        <div>
                            <p className="block text-sm font-medium text-gray-700 mb-2">Copy mode</p>
                            <p className="text-xs text-gray-500 mb-3">
                                Choose whether the target tree should get brand-new person records, or reuse shared identity records when possible.
                            </p>
                            <div className="space-y-2">
                                <label className="flex items-start gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="copy-mode"
                                        value="clone"
                                        checked={copyMode === 'clone'}
                                        onChange={() => setCopyMode('clone')}
                                        disabled={copyMutation.isPending}
                                    />
                                    <span>
                                        <strong>Clone as new people</strong>
                                        <span className="block text-xs text-gray-500">Creates fully independent records in the target tree. Later edits stay local to that tree.</span>
                                    </span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="copy-mode"
                                        value="reuse"
                                        checked={copyMode === 'reuse'}
                                        onChange={() => setCopyMode('reuse')}
                                        disabled={copyMutation.isPending}
                                    />
                                    <span>
                                        <strong>Reuse existing shared people</strong>
                                        <span className="block text-xs text-gray-500">Reuses shared identity records when available, preserving one identity across multiple trees.</span>
                                    </span>
                                </label>
                            </div>

                            {copyMode === 'reuse' && (
                                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                    <p className="font-semibold">Shared identity warning</p>
                                    <p className="mt-1">
                                        Reuse mode can link this person across trees. Changes to shared identity details may affect other trees where this person is reused.
                                    </p>
                                </div>
                            )}
                        </div>

                        {targetMode === 'existing' && (
                            <PersonSearchSelect
                                id="target-parent"
                                label="Optional Parent in Target Tree"
                                value={targetParentId}
                                onChange={setTargetParentId}
                                people={targetTreePeople || []}
                                placeholder="No parent attachment"
                                disabled={!targetTreeId || peopleLoading || copyMutation.isPending}
                            />
                        )}

                        {targetMode === 'existing' && targetParentId && (
                            <div>
                                <label htmlFor="target-parent-role" className="block text-sm font-medium text-gray-700 mb-1">
                                    Attach copied person as
                                </label>
                                <select
                                    id="target-parent-role"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={targetParentRole}
                                    onChange={(e) => setTargetParentRole(e.target.value as 'father' | 'mother')}
                                    disabled={copyMutation.isPending}
                                >
                                    <option value="father">Father</option>
                                    <option value="mother">Mother</option>
                                </select>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button variant="secondary" onClick={handleClose} disabled={copyMutation.isPending}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCopy}
                                disabled={(targetMode === 'existing' ? !targetTreeId : !targetTreeName.trim()) || copyMutation.isPending}
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
