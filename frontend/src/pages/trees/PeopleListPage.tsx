import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, UserPlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { treeService } from '@/services/treeService';
import { Button, Input, Select } from '@/components/ui';
import { DeletePersonModal } from '@/components/trees/DeletePersonModal';
import { MergePeopleModal } from '@/components/trees/MergePeopleModal';
import { PersonEditModal } from '@/components/trees/PersonEditModal';
import type { PaginatedApiResponse, Person } from '@/types';

type SortMode = 'name_asc' | 'created_desc';

interface DuplicateGroup {
  key: string;
  reason: 'same_name_birth' | 'same_name';
  people: Person[];
}

function personName(person: Person): string {
  return person.full_name?.trim() || `${person.first_name} ${person.last_name ?? ''}`.trim();
}

function normalizeName(person: Person): string {
  return personName(person)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function PeopleListPage() {
  const { id: treeId } = useParams<{ id: string }>();
  const isGlobalMode = !treeId;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [personForMerge, setPersonForMerge] = useState<Person | null>(null);
  const [personForDetails, setPersonForDetails] = useState<Person | null>(null);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, perPage]);

  const { data: tree, isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: () => treeService.getTree(treeId!),
    enabled: !!treeId,
  });

  const { data: peopleResponse, isLoading: peopleLoading, error: peopleError } = useQuery({
    queryKey: [isGlobalMode ? 'people' : 'tree', treeId, 'people', { search: debouncedSearch, sort, page, perPage, mode: isGlobalMode ? 'global' : 'tree' }],
    queryFn: () => {
      const params = {
        paginate: true as const,
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        sort,
      };

      if (treeId) {
        return treeService.getPeople(treeId, params) as Promise<PaginatedApiResponse<Person>>;
      }

      return treeService.getGlobalPeople(params) as Promise<PaginatedApiResponse<Person>>;
    },
  });

  const people = peopleResponse?.data ?? [];
  const totalPeople = peopleResponse?.meta.total ?? 0;
  const currentPage = peopleResponse?.meta.current_page ?? 1;
  const totalPages = peopleResponse?.meta.last_page ?? 1;

  const pageButtons = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  }, [currentPage, totalPages]);

  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const groupsByNameAndBirth = new Map<string, Person[]>();
    const groupsByName = new Map<string, Person[]>();

    for (const person of people) {
      const normalizedName = normalizeName(person);
      if (!normalizedName) {
        continue;
      }

      const sameNameGroup = groupsByName.get(normalizedName) ?? [];
      sameNameGroup.push(person);
      groupsByName.set(normalizedName, sameNameGroup);

      if (person.birth_date) {
        const nameBirthKey = `${normalizedName}|${person.birth_date}`;
        const sameNameBirthGroup = groupsByNameAndBirth.get(nameBirthKey) ?? [];
        sameNameBirthGroup.push(person);
        groupsByNameAndBirth.set(nameBirthKey, sameNameBirthGroup);
      }
    }

    const dedupedPersonIds = new Set<string>();
    const result: DuplicateGroup[] = [];

    groupsByNameAndBirth.forEach((groupPeople, key) => {
      if (groupPeople.length < 2) return;
      groupPeople.forEach((person) => dedupedPersonIds.add(person.id));
      result.push({ key, reason: 'same_name_birth', people: groupPeople });
    });

    groupsByName.forEach((groupPeople, key) => {
      if (groupPeople.length < 2) return;
      const unassigned = groupPeople.filter((person) => !dedupedPersonIds.has(person.id));
      if (unassigned.length < 2) return;
      result.push({ key, reason: 'same_name', people: unassigned });
    });

    return result;
  }, [people]);

  const isLoading = treeLoading || peopleLoading;
  const errorMessage = treeError instanceof Error ? treeError.message : peopleError instanceof Error ? peopleError.message : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{isGlobalMode ? 'People' : `People in ${tree?.name ?? '...'}`}</h1>
                <p className="text-sm text-gray-600 mt-1">{isGlobalMode ? 'Manage and browse everyone in your account' : 'Manage and browse everyone in this family tree'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {treeId && (
                <>
                  <Link to={`/trees/${treeId}`}>
                    <Button variant="outline">View Tree</Button>
                  </Link>
                  <Link to={`/trees/${treeId}/people/add`}>
                    <Button>
                      <UserPlusIcon className="h-4 w-4 mr-2" />
                      Add Person
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              id="people-search"
              label="Search people"
              placeholder="Search by name, maiden name, or nickname"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            id="people-sort"
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            options={[
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'created_desc', label: 'Newest added' },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <p>{totalPeople} people</p>
          <div className="flex items-center gap-3">
            <p>Page {currentPage} of {totalPages}</p>
            <Select
              id="people-per-page"
              label="Per page"
              value={String(perPage)}
              onChange={(e) => setPerPage(Number(e.target.value))}
              options={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
              ]}
            />
          </div>
        </div>

        {!isLoading && !errorMessage && duplicateGroups.length > 0 && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4" aria-label="Potential duplicates">
            <div className="mb-2 text-sm font-semibold text-amber-900">Potential duplicates on this page</div>
            <p className="mb-3 text-xs text-amber-800">
              Quick suggestions based on matching names in the current page data.
            </p>
            <div className="space-y-2">
              {duplicateGroups.map((group) => (
                <div key={group.key} className="rounded border border-amber-200 bg-white px-3 py-2">
                  <div className="text-xs font-medium text-gray-700">
                    {group.reason === 'same_name_birth' ? 'Same name + birth date' : 'Same normalized name'}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {group.people.map((person) => (
                      <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-900">
                          {personName(person)} {person.birth_date ? `(${person.birth_date})` : ''}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setPersonForMerge(person)}
                          >
                            Review &amp; Merge
                          </button>
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setPersonForDetails(person)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setPersonToDelete(person)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {isLoading && <div className="rounded-md bg-white p-8 text-center text-gray-600">Loading people...</div>}

        {!isLoading && errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">Failed to load people: {errorMessage}</div>
        )}

        {!isLoading && !errorMessage && people.length === 0 && (
          <div className="rounded-md bg-white p-8 text-center text-gray-600">
            {isGlobalMode ? 'No people found.' : 'No people found for this tree.'}
          </div>
        )}

        {!isLoading && !errorMessage && people.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Family Members ({people.length})</h3>
                <div className="text-sm text-gray-600">
                  <span className="bg-gray-50 px-2 py-1 rounded text-xs border mr-2">Click: Details</span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {people.map((person) => {
                const birthYear = person.birth_date ? new Date(person.birth_date).getFullYear() : null;

                const handlePersonClick = () => {
                  setPersonForDetails(person);
                };

                return (
                  <div key={person.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <button
                          type="button"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          onClick={handlePersonClick}
                        >
                          {personName(person)}
                        </button>
                        <div className="mt-1 text-sm text-gray-600">
                          {birthYear !== null && <span>Born {birthYear}</span>}
                          {person.birth_place && <span>{birthYear !== null ? ' • ' : ''}{person.birth_place}</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setPersonToEdit(person)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <PencilIcon className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonToDelete(person)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Delete
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
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
                  Prev
                </Button>
                {pageButtons.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? 'primary' : 'outline'}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {treeId && personToDelete && (
          <DeletePersonModal
            isOpen
            onClose={() => setPersonToDelete(null)}
            person={personToDelete}
            treeId={treeId}
          />
        )}

        {treeId && personForMerge && (
          <MergePeopleModal
            isOpen
            onClose={() => setPersonForMerge(null)}
            keepPerson={personForMerge}
            currentTreeId={treeId}
          />
        )}

        {treeId && personToEdit && (
          <PersonEditModal
            isOpen
            onClose={() => setPersonToEdit(null)}
            person={personToEdit}
            treeId={treeId}
          />
        )}

        {personForDetails && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{personForDetails.full_name}</h3>
                  <button
                    type="button"
                    onClick={() => setPersonForDetails(null)}
                    className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Full Name:</span>
                    <span className="ml-2 text-gray-900">{personForDetails.full_name}</span>
                  </div>

                  {personForDetails.maiden_name && (
                    <div>
                      <span className="font-medium text-gray-700">Maiden Name:</span>
                      <span className="ml-2 text-gray-900">{personForDetails.maiden_name}</span>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-gray-700">Gender:</span>
                    <span className="ml-2 text-gray-900">
                      {personForDetails.gender === 'M' ? 'Male' : personForDetails.gender === 'F' ? 'Female' : 'Other'}
                    </span>
                  </div>

                  {personForDetails.birth_date && (
                    <div>
                      <span className="font-medium text-gray-700">Birth Date:</span>
                      <span className="ml-2 text-gray-900">{new Date(personForDetails.birth_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {personForDetails.birth_place && (
                    <div>
                      <span className="font-medium text-gray-700">Birth Place:</span>
                      <span className="ml-2 text-gray-900">{personForDetails.birth_place}</span>
                    </div>
                  )}

                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${personForDetails.is_living
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {personForDetails.is_living ? 'Living' : 'Deceased'}
                    </span>
                  </div>

                  {personForDetails.notes && (
                    <div>
                      <span className="font-medium text-gray-700">Notes:</span>
                      <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">{personForDetails.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPersonToEdit(personForDetails);
                      setPersonForDetails(null);
                    }}
                    className="text-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setPersonToDelete(personForDetails);
                      setPersonForDetails(null);
                    }}
                    className="text-sm"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button variant="outline" onClick={() => setPersonForDetails(null)} className="text-sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
