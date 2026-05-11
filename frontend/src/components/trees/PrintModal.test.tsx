import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintModal } from '@/components/trees/PrintModal';
import { PrintService } from '@/services/printService';
import { treeService } from '@/services/treeService';
import type { FamilyTree, Person } from '@/types';

const { toastMock } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: toastMock,
}));

vi.mock('@/services/printService', () => ({
  DEFAULT_PRESS_OPTIONS: {
    paperSize: 'A2',
    orientation: 'landscape',
    includeLegend: true,
    bleedMm: 3,
    safeMarginMm: 10,
    cropMarks: false,
    exportMode: 'vector_pdf',
    tiled: false,
    tileOverlapMm: 5,
    scale: 2,
  },
  PrintService: {
    generate: vi.fn(),
    downloadArtifact: vi.fn(),
    printTree: vi.fn(),
  },
}));

vi.mock('@/services/treeService', () => ({
  treeService: {
    uploadExportArtifact: vi.fn(),
  },
}));

const mockedPrintService = vi.mocked(PrintService);
const mockedTreeService = vi.mocked(treeService);

const tree: FamilyTree = {
  id: 'tree-1',
  user_id: 1,
  name: 'Sample Family Tree',
  description: null,
  root_person_id: null,
  settings: {
    focus_person_id: undefined,
    display: { show_birth_dates: true, show_death_dates: true, show_marriage_dates: true, show_photos: false, theme: 'default' },
    layout: { direction: 'vertical', generation_spacing: 100, sibling_spacing: 40, auto_layout: true },
    collapsed_generations: [],
    print: { paper_size: 'A2', orientation: 'landscape', include_legend: true },
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const people: Person[] = [
  {
    id: 'person-1',
    family_tree_id: 'tree-1',
    owner_user_id: 1,
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
  },
];

function renderModal(onClose: () => void = vi.fn()): void {
  render(
    <PrintModal
      isOpen
      onClose={onClose}
      tree={tree}
      people={people}
      treeElement={document.createElement('div')}
    />
  );
}

describe('PrintModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation warning when safe margin is below 5 and disables generate action', async () => {
    renderModal();

    await userEvent.clear(screen.getByLabelText('Safe Margin (mm)'));
    await userEvent.type(screen.getByLabelText('Safe Margin (mm)'), '4');

    expect(screen.getByText('Safe margin must be at least 5 mm.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate & Download' })).toBeDisabled();
  });

  it('generates and downloads artifact and uploads it when store artifact remains enabled', async () => {
    const onClose = vi.fn();
    const artifact = {
      fileName: 'sample-family-tree_family_tree.pdf',
      mimeType: 'application/pdf',
      blob: new Blob(['pdf-content'], { type: 'application/pdf' }),
      renderMode: 'vector_pdf' as const,
    };

    mockedPrintService.generate.mockResolvedValue(artifact);
    mockedTreeService.uploadExportArtifact.mockResolvedValue({
      id: 'artifact-1',
      tree_id: tree.id,
      user_id: 1,
      file_name: artifact.fileName,
      file_path: '/exports/sample.pdf',
      mime_type: artifact.mimeType,
      file_size_bytes: artifact.blob.size,
      checksum_sha256: null,
      metadata: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    renderModal(onClose);

    await userEvent.click(screen.getByRole('button', { name: 'Generate & Download' }));

    await waitFor(() => {
      expect(mockedPrintService.generate).toHaveBeenCalledWith(
        tree,
        people,
        expect.any(HTMLDivElement),
        expect.objectContaining({
          paperSize: 'A2',
          orientation: 'landscape',
          includeLegend: true,
        })
      );
      expect(mockedPrintService.downloadArtifact).toHaveBeenCalledWith(artifact);
      expect(mockedTreeService.uploadExportArtifact).toHaveBeenCalledWith(
        tree.id,
        artifact.blob,
        artifact.fileName,
        expect.objectContaining({
          paper_size: 'A2',
          orientation: 'landscape',
          include_legend: true,
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
