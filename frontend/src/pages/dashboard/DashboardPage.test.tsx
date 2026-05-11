import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { useAuthStore } from '@/store/authStore';
import { useFamilyTreeStore } from '@/store/familyTreeStore';
import type { FamilyTree, User } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div>Language Switcher</div>,
}));

vi.mock('@/components/trees/TreeList', () => ({
  TreeList: () => <div>Tree List</div>,
}));

vi.mock('@/components/trees/CreateTreeModal', () => ({
  CreateTreeModal: () => null,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/store/familyTreeStore', () => ({
  useFamilyTreeStore: vi.fn(),
}));

const mockedUseAuthStore = vi.mocked(useAuthStore);
const mockedUseFamilyTreeStore = vi.mocked(useFamilyTreeStore);

const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  email_verified_at: null,
  roles: [],
  preferred_language: 'en',
  timezone: 'UTC',
  date_format: 'Y-m-d',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockTree: FamilyTree = {
  id: 'tree-1',
  user_id: 1,
  name: 'Main Tree',
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

function renderPage(): void {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage header People link', () => {
  it('shows global People link when trees exist', () => {
    const loadTrees = vi.fn();

    mockedUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    mockedUseFamilyTreeStore.mockReturnValue({
      trees: [mockTree],
      loading: false,
      error: null,
      loadTrees,
      createTree: vi.fn(),
      deleteTree: vi.fn(),
      clearError: vi.fn(),
    } as ReturnType<typeof useFamilyTreeStore>);

    renderPage();

    const peopleLink = screen.getByRole('link', { name: 'People' });
    expect(peopleLink).toHaveAttribute('href', '/people');
    expect(loadTrees).toHaveBeenCalledTimes(1);
  });

  it('shows global People link when no trees exist', () => {
    mockedUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    } as ReturnType<typeof useAuthStore>);

    mockedUseFamilyTreeStore.mockReturnValue({
      trees: [],
      loading: false,
      error: null,
      loadTrees: vi.fn(),
      createTree: vi.fn(),
      deleteTree: vi.fn(),
      clearError: vi.fn(),
    } as ReturnType<typeof useFamilyTreeStore>);

    renderPage();

    const peopleLink = screen.getByRole('link', { name: 'People' });
    expect(peopleLink).toHaveAttribute('href', '/people');
  });
});
