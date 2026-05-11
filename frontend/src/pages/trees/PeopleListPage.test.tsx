import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeopleListPage } from '@/pages/trees/PeopleListPage';
import { treeService } from '@/services/treeService';
import type { FamilyTree, PaginatedApiResponse, Person } from '@/types';

vi.mock('@/services/treeService', () => ({
  treeService: {
    getTree: vi.fn(),
    getPeople: vi.fn(),
    getGlobalPeople: vi.fn(),
  },
}));

const mockedTreeService = vi.mocked(treeService);

const tree: FamilyTree = {
  id: 'tree-1',
  user_id: 1,
  name: 'Smith Tree',
  description: null,
  root_person_id: null,
  settings: {
    display: { show_birth_dates: true, show_death_dates: true, show_marriage_dates: true, show_photos: false, theme: 'default' },
    layout: { direction: 'vertical', generation_spacing: 100, sibling_spacing: 50, auto_layout: true },
    collapsed_generations: [],
    print: { paper_size: 'A4', orientation: 'portrait', include_legend: true },
  },
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const people: Person[] = [
  {
    id: 'p1', family_tree_id: 'tree-1', first_name: 'Alice', last_name: 'Smith', maiden_name: null, nickname: null,
    gender: 'F', birth_date: '1990-01-01', death_date: null, birth_place: null, death_place: null, is_living: true,
    father_id: null, mother_id: null, photo_path: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', full_name: 'Alice Smith'
  },
  {
    id: 'p2', family_tree_id: 'tree-1', first_name: 'Bob', last_name: 'Stone', maiden_name: null, nickname: 'Bobby',
    gender: 'M', birth_date: null, death_date: null, birth_place: null, death_place: null, is_living: true,
    father_id: 'p10', mother_id: 'p11', photo_path: null, notes: null, created_at: '2026-01-02', updated_at: '2026-01-02', full_name: 'Bob Stone',
    father: {
      id: 'p10', family_tree_id: 'tree-1', first_name: 'John', last_name: 'Stone', maiden_name: null, nickname: null,
      gender: 'M', birth_date: null, death_date: null, birth_place: null, death_place: null, is_living: true,
      father_id: null, mother_id: null, photo_path: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', full_name: 'John Stone'
    },
    mother: {
      id: 'p11', family_tree_id: 'tree-1', first_name: 'Mary', last_name: 'Stone', maiden_name: null, nickname: null,
      gender: 'F', birth_date: null, death_date: null, birth_place: null, death_place: null, is_living: true,
      father_id: null, mother_id: null, photo_path: null, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01', full_name: 'Mary Stone'
    }
  },
];

function paginatedResponse(data: Person[], page: number, perPage: number, total: number): PaginatedApiResponse<Person> {
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return {
    data,
    links: {
      first: null,
      last: null,
      prev: page > 1 ? 'prev' : null,
      next: page < lastPage ? 'next' : null,
    },
    meta: {
      current_page: page,
      from: data.length > 0 ? (page - 1) * perPage + 1 : null,
      last_page: lastPage,
      links: [],
      path: '/api/trees/tree-1/people',
      per_page: perPage,
      to: data.length > 0 ? (page - 1) * perPage + data.length : null,
      total,
    },
  };
}

function renderTreePage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trees/tree-1/people']}>
        <Routes>
          <Route path="/trees/:id/people" element={<PeopleListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderGlobalPage(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/people']}>
        <Routes>
          <Route path="/people" element={<PeopleListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PeopleListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then list', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderTreePage();
    expect(screen.getByText('Loading people...')).toBeInTheDocument();
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('2 people')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(mockedTreeService.getPeople).toHaveBeenCalledWith('tree-1', expect.objectContaining({ paginate: true, page: 1, per_page: 25, sort: 'name_asc' }));
  });

  it('sends paginated query when searching', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderTreePage();
    await screen.findByText('Alice Smith');
    await userEvent.type(screen.getByLabelText('Search people'), 'bobby');

    await waitFor(() => {
      expect(mockedTreeService.getPeople).toHaveBeenLastCalledWith(
        'tree-1',
        expect.objectContaining({ paginate: true, search: 'bobby' })
      );
    });
  });

  it('shows empty state', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse([], 1, 25, 0));

    renderTreePage();
    expect(await screen.findByText('No people found for this tree.')).toBeInTheDocument();
  });

  it('shows family members list header', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderTreePage();
    await screen.findByText('Alice Smith');

    expect(screen.getByText('Family Members (2)')).toBeInTheDocument();
  });

  it('renders edit and delete actions for each row', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderTreePage();
    await screen.findByText('Alice Smith');

    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Relationships' })).not.toBeInTheDocument();
  });

  it('shows gender and living badges', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderTreePage();
    await screen.findByText('Alice Smith');

    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getAllByText('Living').length).toBeGreaterThan(0);
  });

  it('navigates to next page and requests new page data', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockImplementation(async (_treeId, params) => {
      const page = params?.page ?? 1;
      if (page === 2) {
        return paginatedResponse([people[1]], 2, 1, 2);
      }
      return paginatedResponse([people[0]], 1, 1, 2);
    });

    renderTreePage();
    await screen.findByText('Alice Smith');

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '10');
    await waitFor(() => {
      expect(mockedTreeService.getPeople).toHaveBeenLastCalledWith('tree-1', expect.objectContaining({ per_page: 10, page: 1 }));
    });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockedTreeService.getPeople).toHaveBeenLastCalledWith('tree-1', expect.objectContaining({ page: 2 }));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });
  });

  it('shows potential duplicates section for same name matches', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getPeople.mockResolvedValue(
      paginatedResponse(
        [
          people[0],
          {
            ...people[0],
            id: 'p3',
            created_at: '2026-01-03',
            updated_at: '2026-01-03',
          },
        ],
        1,
        25,
        2
      )
    );

    renderTreePage();

    expect(await screen.findByText('Potential duplicates on this page')).toBeInTheDocument();
    expect(screen.getByText('Same name + birth date')).toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: 'Review & Merge' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Details' }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });

  it('supports global mode on /people using getGlobalPeople', async () => {
    mockedTreeService.getGlobalPeople.mockResolvedValue(paginatedResponse(people, 1, 25, 2));

    renderGlobalPage();

    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Tree' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Person' })).not.toBeInTheDocument();
    expect(mockedTreeService.getTree).not.toHaveBeenCalled();

    expect(mockedTreeService.getGlobalPeople).toHaveBeenCalledWith(
      expect.objectContaining({ paginate: true, page: 1, per_page: 25, sort: 'name_asc' })
    );
  });
});
