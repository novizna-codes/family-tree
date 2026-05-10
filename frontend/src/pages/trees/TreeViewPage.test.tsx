import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TreeViewPage } from '@/pages/trees/TreeViewPage';
import { treeService } from '@/services/treeService';
import type { FamilyTree, Person } from '@/types';
import type { FamilyTreeVisualizationData } from '@/services/familyTreeService';

vi.mock('@/services/treeService', () => ({
  treeService: {
    getTree: vi.fn(),
    getVisualization: vi.fn(),
    removeRelationship: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { name: 'Tester' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/components/trees/TreeVisualization', () => ({
  TreeVisualization: () => <div data-testid="tree-visualization" />,
}));
vi.mock('@/components/trees/RelationshipModal', () => ({ RelationshipModal: () => null }));
vi.mock('@/components/trees/PersonEditModal', () => ({ PersonEditModal: () => null }));
vi.mock('@/components/trees/DeletePersonModal', () => ({ DeletePersonModal: () => null }));
vi.mock('@/components/trees/PrintModal', () => ({ PrintModal: () => null }));
vi.mock('@/components/trees/CopyPersonModal', () => ({ CopyPersonModal: () => null }));
vi.mock('@/components/trees/RelationshipEditModal', () => ({ RelationshipEditModal: () => null }));
vi.mock('@/components/trees/MergePeopleModal', () => ({ MergePeopleModal: () => null }));

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
];

const visualization: FamilyTreeVisualizationData = {
  tree,
  people,
  relationships: [],
};

function renderPage(route: string): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/trees/:id" element={<TreeViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TreeViewPage', () => {
  it('passes focusPersonId from URL query to visualization call', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getVisualization.mockResolvedValue(visualization);

    renderPage('/trees/tree-1?focusPersonId=p1');

    await waitFor(() => {
      expect(mockedTreeService.getVisualization).toHaveBeenCalledWith('tree-1', 'p1');
    });
  });

  it('shows a visible People header action linking to people list', async () => {
    mockedTreeService.getTree.mockResolvedValue(tree);
    mockedTreeService.getVisualization.mockResolvedValue(visualization);

    renderPage('/trees/tree-1');

    const peopleLink = await screen.findByRole('link', { name: /people/i });
    expect(peopleLink).toHaveAttribute('href', '/trees/tree-1/people');
  });
});
