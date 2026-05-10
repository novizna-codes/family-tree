import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { treeService } from '@/services/treeService';
import type { Person } from '@/types';
import toast from 'react-hot-toast';

interface MergePeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  keepPerson: Person;
  currentTreeId: string;
}

export function MergePeopleModal({ isOpen, onClose, keepPerson, currentTreeId }: MergePeopleModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMergeConfirmed, setIsMergeConfirmed] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setIsMergeConfirmed(false);
    }
  }, [isOpen]);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['people-search', currentTreeId, true, query],
    queryFn: () => treeService.searchPeople(query, { treeId: currentTreeId, mergeableOnly: true }),
    enabled: isOpen,
  });

  const visibleCandidates = useMemo(() => {
    return candidates.filter((p) => p.id !== keepPerson.id);
  }, [candidates, keepPerson.id]);

  const mergeMutation = useMutation({
    mutationFn: () => treeService.mergePeople({
      keep_person_id: keepPerson.id,
      merge_person_ids: selectedIds,
    }),
    onSuccess: (data) => {
      toast.success(`Merged ${data.merged_person_ids.length} people into ${keepPerson.full_name}`);
      queryClient.invalidateQueries({ queryKey: ['tree', currentTreeId] });
      queryClient.invalidateQueries({ queryKey: ['tree', currentTreeId, 'visualization'] });
      queryClient.removeQueries({ queryKey: ['people-search'] });
      queryClient.removeQueries({ queryKey: ['merge-preview'] });
      onClose();
      setSelectedIds([]);
      setQuery('');
    },
    onError: (error: Error) => {
      toast.error(`Merge failed: ${error.message}`);
    },
  });

  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
  } = useQuery({
    queryKey: ['merge-preview', keepPerson.id, selectedIds],
    queryFn: () => treeService.previewMergePeople({
      keep_person_id: keepPerson.id,
      merge_person_ids: selectedIds,
    }),
    enabled: isOpen && selectedIds.length > 0,
  });

  if (!isOpen) return null;

  const toggleSelection = (personId: string) => {
    setIsMergeConfirmed(false);
    setSelectedIds((prev) => prev.includes(personId)
      ? prev.filter((id) => id !== personId)
      : [...prev, personId]);
  };

  const mergePreviewRows: Array<{ label: string; value: number | undefined }> = [
    { label: 'People to merge', value: preview?.merge_people_count },
    { label: 'Parent links updated', value: preview?.legacy_parent_links_count },
    { label: 'Relationship rows updated', value: preview?.legacy_relationship_rows_count },
    { label: 'Tree memberships updated', value: preview?.tree_memberships_count },
    { label: 'Tree edges updated', value: preview?.tree_edges_count },
    { label: 'Tree roots updated', value: preview?.tree_root_refs_count },
    { label: 'Impacted trees', value: preview?.impacted_tree_count },
    { label: 'Trees with relationship updates', value: preview?.impacted_relationship_tree_count },
    { label: 'Trees with legacy rewires', value: preview?.impacted_legacy_tree_count },
    { label: 'Trees with membership updates', value: preview?.impacted_membership_tree_count },
    { label: 'Trees with edge updates', value: preview?.impacted_edge_tree_count },
    { label: 'Trees with root updates', value: preview?.impacted_root_tree_count },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Merge People</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close merge modal">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Keep <strong>{keepPerson.full_name}</strong> as canonical and merge selected people into it.
            All references to merged people will be rewired to the kept person.
          </p>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, maiden name, nickname"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-4"
          />

          <div className="max-h-72 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-500">Searching...</div>
            ) : visibleCandidates.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No matching people found.</div>
            ) : (
              visibleCandidates.map((candidate) => (
                <label key={candidate.id} className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candidate.id)}
                    onChange={() => toggleSelection(candidate.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{candidate.full_name || `${candidate.first_name} ${candidate.last_name || ''}`}</div>
                    <div className="text-xs text-gray-500">
                      DOB: {candidate.birth_date || 'Unknown'}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          {selectedIds.length > 0 && isPreviewLoading && (
            <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              Calculating preview...
            </div>
          )}

          {isPreviewError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Merge preview failed: {previewError instanceof Error ? previewError.message : 'Unknown error'}
            </div>
          )}

          {preview && !isPreviewLoading && !isPreviewError && (
            <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="font-medium mb-1">Merge preview</div>
              <div className="space-y-0.5">
                {mergePreviewRows
                  .filter((row) => typeof row.value === 'number')
                  .map((row) => (
                    <div key={row.label}>{row.label}: {row.value}</div>
                  ))}
              </div>

              {preview.has_cross_tree_impact && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="font-semibold">Cross-tree impact warning</div>
                  <p className="mt-1">
                    This merge will update references across multiple trees{typeof preview.impacted_tree_count === 'number' ? ` (${preview.impacted_tree_count} impacted)` : ''}.
                    Confirm only if this person identity should remain shared between those trees.
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedIds.length > 0 && (
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isMergeConfirmed}
                onChange={(e) => setIsMergeConfirmed(e.target.checked)}
                disabled={mergeMutation.isPending || isPreviewLoading || isPreviewError}
                className="mt-1"
              />
              <span>
                I understand this merge is permanent and will rewire references to <strong>{keepPerson.full_name}</strong>.
              </span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="secondary" onClick={onClose} disabled={mergeMutation.isPending}>Cancel</Button>
            <Button onClick={() => mergeMutation.mutate()} disabled={selectedIds.length === 0 || mergeMutation.isPending || isPreviewLoading || isPreviewError || !isMergeConfirmed}>
              {mergeMutation.isPending ? 'Merging...' : `Merge ${selectedIds.length} Selected`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
