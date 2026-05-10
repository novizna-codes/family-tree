import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import type { Person } from '@/types';

interface PersonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
}

function getPersonName(person: Person): string {
  return person.full_name?.trim() || `${person.first_name} ${person.last_name ?? ''}`.trim();
}

function relationName(parent?: Person): string {
  if (!parent) {
    return '-';
  }

  return getPersonName(parent);
}

export function PersonDetailsModal({ isOpen, onClose, person }: PersonDetailsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Person Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close person details modal">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Name</dt>
              <dd className="text-gray-900">{getPersonName(person)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Gender</dt>
              <dd className="text-gray-900">{person.gender ?? '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Birth date</dt>
              <dd className="text-gray-900">{person.birth_date ?? '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Father</dt>
              <dd className="text-gray-900">{relationName(person.father)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Mother</dt>
              <dd className="text-gray-900">{relationName(person.mother)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex justify-end border-t pt-4">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
