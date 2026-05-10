import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { treeService } from '@/services/treeService';
import { Button, Input, Select } from '@/components/ui';
import { DeletePersonModal } from '@/components/trees/DeletePersonModal';
import { MergePeopleModal } from '@/components/trees/MergePeopleModal';
import { PersonDetailsModal } from '@/components/trees/PersonDetailsModal';
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [personForMerge, setPersonForMerge] = useState<Person | null>(null);
  const [personForDetails, setPersonForDetails] = useState<Person | null>(null);

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
    queryKey: ['tree', treeId, 'people', { search: debouncedSearch, sort, page, perPage }],
    queryFn: () => treeService.getPeople(treeId!, {
      paginate: true,
      page,
      per_page: perPage,
      search: debouncedSearch || undefined,
      sort,
    }) as Promise<PaginatedApiResponse<Person>>,
    enabled: !!treeId,
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
                <h1 className="text-2xl font-bold text-gray-900">People in {tree?.name ?? '...'}</h1>
                <p className="text-sm text-gray-600 mt-1">Manage and browse everyone in this family tree</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to={`/trees/${treeId}`}>
                <Button variant="outline">View Tree</Button>
              </Link>
              <Link to={`/trees/${treeId}/people/add`}>
                <Button>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </Link>
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
              Quick suggestions based on matching names in the current page data. Review in tree view before merging.
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
          <div className="rounded-md bg-white p-8 text-center text-gray-600">No people found for this tree.</div>
        )}

        {!isLoading && !errorMessage && people.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Birth</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Father</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mother</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {people.map((person) => (
                  <tr key={person.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{personName(person)}</p>
                      {person.nickname && <p className="text-xs text-gray-500">Nickname: {person.nickname}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{person.gender ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{person.birth_date ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{person.father ? personName(person.father) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{person.mother ? personName(person.mother) : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Link to={`/trees/${treeId}?focusPersonId=${person.id}`} className="text-blue-600 hover:text-blue-700">
                          View in Tree
                        </Link>
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
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {personForDetails && (
          <PersonDetailsModal
            isOpen
            onClose={() => setPersonForDetails(null)}
            person={personForDetails}
          />
        )}
      </main>
    </div>
  );
}
