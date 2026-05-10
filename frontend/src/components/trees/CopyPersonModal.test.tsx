import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyPersonModal } from '@/components/trees/CopyPersonModal';
import { treeService } from '@/services/treeService';
import type { CopyPersonResponse, FamilyTree, Person } from '@/types';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/treeService', () => ({
  treeService: {
    getTrees: vi.fn(),
    getPeople: vi.fn(),
    copyPerson: vi.fn(),
  },
}));

const mockedTreeService = vi.mocked(treeService);

const person: Person = {
  id: 'person-1',
  family_tree_id: 'tree-1',
  first_name: 'Ali',
  last_name: 'Khan',
  maiden_name: null,
  nickname: null,
  gender: 'M',
  birth_date: null,
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
  full_name: 'Ali Khan',
};

const trees: FamilyTree[] = [
  {
    id: 'tree-1',
    user_id: 1,
    name: 'Current Tree',
    description: null,
    root_person_id: null,
    settings: {
      focus_person_id: undefined,
      display: { show_birth_dates: true, show_death_dates: true, show_marriage_dates: true, show_photos: false, theme: 'default' },
      layout: { direction: 'vertical', generation_spacing: 100, sibling_spacing: 40, auto_layout: true },
      collapsed_generations: [],
      print: { paper_size: 'A4', orientation: 'portrait', include_legend: false },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tree-2',
    user_id: 1,
    name: 'Other Tree',
    description: null,
    root_person_id: null,
    settings: {
      focus_person_id: undefined,
      display: { show_birth_dates: true, show_death_dates: true, show_marriage_dates: true, show_photos: false, theme: 'default' },
      layout: { direction: 'vertical', generation_spacing: 100, sibling_spacing: 40, auto_layout: true },
      collapsed_generations: [],
      print: { paper_size: 'A4', orientation: 'portrait', include_legend: false },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

function renderModal(): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CopyPersonModal isOpen onClose={vi.fn()} person={person} currentTreeId="tree-1" />
    </QueryClientProvider>
  );
}

describe('CopyPersonModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTreeService.getTrees.mockResolvedValue(trees);
    mockedTreeService.getPeople.mockResolvedValue([]);
    mockedTreeService.copyPerson.mockResolvedValue({
      data: person,
      meta: {
        copied_person_ids: ['person-1'],
        skipped_person_ids: [],
        copied_count: 1,
      },
      message: 'Copied',
    } as CopyPersonResponse);
  });

  it('supports toggling to create mode and requires new tree name', async () => {
    renderModal();

    await screen.findByText('Other Tree');
    await userEvent.click(screen.getByLabelText('Create new tree'));

    expect(screen.getByLabelText('New Tree Name')).toBeInTheDocument();
    expect(screen.getByLabelText('New Tree Description (optional)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Optional Parent in Target Tree')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Person' })).toBeDisabled();
  });

  it('submits existing tree mode payload unchanged', async () => {
    renderModal();

    await screen.findByText('Other Tree');
    await userEvent.selectOptions(screen.getByLabelText('Select Target Tree'), 'tree-2');
    await userEvent.click(screen.getByRole('button', { name: 'Copy Person' }));

    await waitFor(() => {
      expect(mockedTreeService.copyPerson).toHaveBeenCalledWith('tree-1', 'person-1', 'tree-2', {
        include_descendants: true,
        copy_mode: 'clone',
        target_parent_id: undefined,
        target_parent_role: undefined,
        create_target_tree: false,
        target_tree_name: undefined,
        target_tree_description: undefined,
      });
    });
  });

  it('submits create mode payload with tree fields', async () => {
    renderModal();

    await screen.findByText('Other Tree');
    await userEvent.click(screen.getByLabelText('Create new tree'));
    await userEvent.type(screen.getByLabelText('New Tree Name'), 'Brand New Tree');
    await userEvent.type(screen.getByLabelText('New Tree Description (optional)'), 'Fresh copied branch');
    await userEvent.click(screen.getByRole('button', { name: 'Copy Person' }));

    await waitFor(() => {
      expect(mockedTreeService.copyPerson).toHaveBeenCalledWith('tree-1', 'person-1', undefined, {
        include_descendants: true,
        copy_mode: 'clone',
        target_parent_id: undefined,
        target_parent_role: undefined,
        create_target_tree: true,
        target_tree_name: 'Brand New Tree',
        target_tree_description: 'Fresh copied branch',
      });
    });
  });

  it('navigates to created tree when response metadata contains created tree id', async () => {
    mockedTreeService.copyPerson.mockResolvedValue({
      data: person,
      meta: {
        copied_person_ids: ['person-1'],
        skipped_person_ids: [],
        copied_count: 1,
        created_tree_id: 'tree-999',
        created_tree_name: 'Copied Tree',
      },
      message: 'Copied',
    } as CopyPersonResponse);

    renderModal();
    await screen.findByText('Other Tree');
    await userEvent.click(screen.getByLabelText('Create new tree'));
    await userEvent.type(screen.getByLabelText('New Tree Name'), 'Copied Tree');
    await userEvent.click(screen.getByRole('button', { name: 'Copy Person' }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/trees/tree-999');
    });
  });

  it('resets local state when reopened', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <CopyPersonModal isOpen onClose={vi.fn()} person={person} currentTreeId="tree-1" />
      </QueryClientProvider>
    );

    await screen.findByText('Other Tree');

    await userEvent.click(screen.getByLabelText('Create new tree'));
    await userEvent.type(screen.getByLabelText('New Tree Name'), 'Temporary Name');

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CopyPersonModal isOpen={false} onClose={vi.fn()} person={person} currentTreeId="tree-1" />
      </QueryClientProvider>
    );

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <CopyPersonModal isOpen onClose={vi.fn()} person={person} currentTreeId="tree-1" />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('Use existing tree')).toBeChecked();
    expect(screen.getByLabelText('Select Target Tree')).toHaveValue('');
  });
});
