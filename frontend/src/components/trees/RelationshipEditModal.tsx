import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { treeService } from '@/services/treeService';
import toast from 'react-hot-toast';
import type { Relationship } from '@/services/familyTreeService';

interface RelationshipEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    relationship: Relationship;
    personId: string;
    treeId: string;
}

export function RelationshipEditModal({ isOpen, onClose, relationship, personId, treeId }: RelationshipEditModalProps) {
    const [formData, setFormData] = useState({
        relationship_type: 'spouse',
        start_date: '',
        end_date: '',
        marriage_place: '',
        notes: '',
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (relationship) {
            setFormData({
                relationship_type: relationship.relationship_type || 'spouse',
                start_date: relationship.start_date ? relationship.start_date.split('T')[0] : '',
                end_date: relationship.end_date ? relationship.end_date.split('T')[0] : '',
                marriage_place: relationship.marriage_place || '',
                notes: relationship.notes || '',
            });
        }
    }, [relationship]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => treeService.updateRelationship(treeId, personId, relationship.id, data),
        onSuccess: () => {
            toast.success('Relationship updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
            onClose();
        },
        onError: (error: Error) => {
            toast.error(`Failed to update relationship: ${error.message}`);
        },
    });

    if (!isOpen) return null;

    const partner = relationship.person1_id === personId ? relationship.person2 : relationship.person1;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <HeartIcon className="h-5 w-5 mr-2 text-pink-600" />
                            Edit Relationship with {partner?.first_name}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="relationship_type" className="block text-sm font-medium text-gray-700">
                                Relationship Type
                            </label>
                            <select
                                id="relationship_type"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={formData.relationship_type}
                                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                            >
                                <option value="spouse">Spouse</option>
                                <option value="partner">Partner</option>
                                <option value="divorced">Divorced</option>
                                <option value="separated">Separated</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    id="start_date"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    id="end_date"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="marriage_place" className="block text-sm font-medium text-gray-700">
                                Marriage Place
                            </label>
                            <input
                                type="text"
                                id="marriage_place"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={formData.marriage_place}
                                onChange={(e) => setFormData({ ...formData, marriage_place: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="relationship_notes" className="block text-sm font-medium text-gray-700">
                                Notes
                            </label>
                            <textarea
                                id="relationship_notes"
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button variant="secondary" onClick={onClose} disabled={updateMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
