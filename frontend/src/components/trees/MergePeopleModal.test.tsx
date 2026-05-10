import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MergePeopleModal } from '@/components/trees/MergePeopleModal';
import { treeService } from '@/services/treeService';
import type { MergePeoplePreview, MergePeopleResult, Person } from '@/types';

vi.mock('@/services/treeService', () => ({
  treeService: {
    searchPeople: vi.fn(),
    previewMergePeople: vi.fn(),
    mergePeople: vi.fn(),
  },
}));

const mockedTreeService = vi.mocked(treeService);

const keepPerson: Person = {
  id: 'keep-1',
  family_tree_id: 'tree-1',
  owner_user_id: 1,
  first_name: 'Kept',
  last_name: 'Person',
  maiden_name: null,
  nickname: null,
  gender: 'M',
  birth_date: '1980-01-01',
  death_date: null,
  birth_place: null,
  death_place: null,
  is_living: true,
  father_id: null,
  mother_id: null,
  photo_path: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  full_name: 'Kept Person',
};

const mergeCandidate: Person = {
  ...keepPerson,
  id: 'merge-1',
  first_name: 'Merge',
  full_name: 'Merge Candidate',
};

const defaultPreview: MergePeoplePreview = {
  merge_people_count: 1,
  legacy_parent_links_count: 2,
  legacy_relationship_rows_count: 1,
  tree_memberships_count: 1,
  tree_edges_count: 1,
  tree_root_refs_count: 0,
  impacted_tree_count: 1,
  impacted_relationship_tree_count: 0,
  has_cross_tree_impact: false,
};

function renderModal(): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MergePeopleModal isOpen onClose={vi.fn()} keepPerson={keepPerson} currentTreeId="tree-1" />
    </QueryClientProvider>
  );
}

async function selectMergeCandidate(): Promise<void> {
  await screen.findByText('Merge Candidate');
  const candidateCheckbox = screen.getAllByRole('checkbox')[0];
  await userEvent.click(candidateCheckbox);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedTreeService.searchPeople.mockResolvedValue([keepPerson, mergeCandidate]);
  mockedTreeService.mergePeople.mockResolvedValue({
    kept_person_id: keepPerson.id,
    merged_person_ids: [mergeCandidate.id],
  } as MergePeopleResult);
});

describe('MergePeopleModal', () => {
  it('renders preview loading state', async () => {
    mockedTreeService.previewMergePeople.mockImplementation(
      () => new Promise<MergePeoplePreview>(() => {})
    );

    renderModal();
    await selectMergeCandidate();

    expect(await screen.findByText('Calculating preview...')).toBeInTheDocument();
  });

  it('renders preview error state', async () => {
    mockedTreeService.previewMergePeople.mockRejectedValue(new Error('Preview unavailable'));

    renderModal();
    await selectMergeCandidate();

    expect(await screen.findByText('Merge preview failed: Preview unavailable')).toBeInTheDocument();
  });

  it('renders preview success state', async () => {
    mockedTreeService.previewMergePeople.mockResolvedValue(defaultPreview);

    renderModal();
    await selectMergeCandidate();

    expect(await screen.findByText('Merge preview')).toBeInTheDocument();
    expect(screen.getByText('People to merge: 1')).toBeInTheDocument();
    expect(mockedTreeService.searchPeople).toHaveBeenCalledWith('', { treeId: 'tree-1', mergeableOnly: true });
    expect(mockedTreeService.previewMergePeople).toHaveBeenCalledWith({
      keep_person_id: 'keep-1',
      merge_person_ids: ['merge-1'],
    });
  });

  it('exposes an accessible name for close button', async () => {
    mockedTreeService.previewMergePeople.mockResolvedValue(defaultPreview);

    renderModal();

    expect(screen.getByRole('button', { name: 'Close merge modal' })).toBeInTheDocument();
  });

  it('renders additional impacted tree breakdown fields when present', async () => {
    mockedTreeService.previewMergePeople.mockResolvedValue({
      ...defaultPreview,
      impacted_legacy_tree_count: 2,
      impacted_membership_tree_count: 1,
      impacted_edge_tree_count: 3,
      impacted_root_tree_count: 1,
    });

    renderModal();
    await selectMergeCandidate();

    expect(await screen.findByText('Trees with legacy rewires: 2')).toBeInTheDocument();
    expect(screen.getByText('Trees with membership updates: 1')).toBeInTheDocument();
    expect(screen.getByText('Trees with edge updates: 3')).toBeInTheDocument();
    expect(screen.getByText('Trees with root updates: 1')).toBeInTheDocument();
  });

  it('requires confirmation checkbox before enabling merge action', async () => {
    mockedTreeService.previewMergePeople.mockResolvedValue(defaultPreview);

    renderModal();
    await selectMergeCandidate();
    await screen.findByText('Merge preview');

    const mergeButton = screen.getByRole('button', { name: 'Merge 1 Selected' });
    expect(mergeButton).toBeDisabled();

    const confirmationCheckbox = screen.getAllByRole('checkbox')[1];
    await userEvent.click(confirmationCheckbox);

    await waitFor(() => expect(mergeButton).toBeEnabled());
  });

  it('shows cross-tree warning when preview indicates cross-tree impact', async () => {
    mockedTreeService.previewMergePeople.mockResolvedValue({
      ...defaultPreview,
      has_cross_tree_impact: true,
      impacted_tree_count: 3,
    });

    renderModal();
    await selectMergeCandidate();

    expect(await screen.findByText('Cross-tree impact warning')).toBeInTheDocument();
    expect(screen.getByText(/3 impacted/)).toBeInTheDocument();
  });
});
