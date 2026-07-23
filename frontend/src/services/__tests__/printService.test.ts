import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrintService, DEFAULT_PRESS_OPTIONS } from '@/services/printService';
import type { FamilyTree } from '@/types';

// ---------------------------------------------------------------------------
// Blob helper – jsdom's Blob may not have .text() in this Node version
// ---------------------------------------------------------------------------

function blobToString(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => resolve(reader.result as string));
    reader.addEventListener('error', reject);
    reader.readAsText(blob);
  });
}

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const { mockPdfInstance, mockJsPdf } = vi.hoisted(
  () => {
    const output = vi.fn(() => new Blob(['mock-pdf-content'], { type: 'application/pdf' }));

    const instance = {
      output,
      addImage: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      internal: { pageSize: { width: 841, height: 594 } },
      getCurrentPageInfo: vi.fn(() => ({ pageNumber: 1 })),
    };

    const JsPdf = vi.fn(() => instance);

    return {
      mockPdfInstance: instance,
      mockJsPdf: JsPdf,
    };
  },
);

vi.mock('jspdf', () => ({ default: mockJsPdf }));

// Mock svg2pdf — returns a resolved promise with the pdf instance
vi.mock('svg2pdf.js', () => ({
  svg2pdf: vi.fn((_svgElement: Element, pdf: any) => Promise.resolve(pdf)),
}));

// Mock Image constructor for native SVG rendering (jsdom doesn't load images)
const originalImage = globalThis.Image;

// Mock HTMLCanvasElement.prototype.getContext for jsdom
const mockCanvasContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
};

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
  () => mockCanvasContext as unknown as CanvasRenderingContext2D,
);

// Also mock toDataURL on canvas instances
vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA=',
);

// Mock URL.createObjectURL / revokeObjectURL for jsdom
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

// Save original DOMParser for cleanup after tests
const originalDOMParser = globalThis.DOMParser;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function createTree(name = 'Test Family Tree'): FamilyTree {
  return {
    id: 'tree-1',
    user_id: 1,
    name,
    description: null,
    root_person_id: null,
    settings: {
      display: {
        show_birth_dates: true,
        show_death_dates: true,
        show_marriage_dates: true,
        show_photos: false,
        theme: 'default',
      },
      layout: {
        direction: 'vertical',
        generation_spacing: 100,
        sibling_spacing: 40,
        auto_layout: true,
      },
      collapsed_generations: [],
      print: { paper_size: 'A2', orientation: 'landscape', include_legend: true },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

/**
 * Create a <div> containing an <svg> child with the given attributes.
 * If `rectWidth` / `rectHeight` are provided, getBoundingClientRect is
 * mocked on the SVG element.
 */
function makeElementWithSvg(
  svgWidth?: number,
  svgHeight?: number,
  viewBox?: string,
  rectWidth?: number,
  rectHeight?: number,
): HTMLElement {
  const div = document.createElement('div');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (svgWidth != null) svg.setAttribute('width', String(svgWidth));
  if (svgHeight != null) svg.setAttribute('height', String(svgHeight));
  if (viewBox != null) svg.setAttribute('viewBox', viewBox);

  if (rectWidth != null || rectHeight != null) {
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: rectWidth ?? 0,
      bottom: rectHeight ?? 0,
      width: rectWidth ?? 0,
      height: rectHeight ?? 0,
      toJSON() {
        return {};
      },
    });
  }

  div.appendChild(svg);
  return div;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Mock Image to simulate SVG loading
  globalThis.Image = class MockImage {
    onload: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    src: string = '';
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload(new Event('load'));
      }, 0);
    }
  } as unknown as typeof Image;

  // Mock DOMParser so parseSvgString returns a valid SVG element in jsdom
  globalThis.DOMParser = class {
    parseFromString(): Document {
      return {
        querySelector: (sel: string) =>
          sel === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : null,
        documentElement: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      } as unknown as Document;
    }
  } as unknown as typeof DOMParser;
});

afterEach(() => {
  globalThis.Image = originalImage;
  globalThis.DOMParser = originalDOMParser;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DEFAULT_PRESS_OPTIONS', () => {
  it('contains every required field with the expected default values', () => {
    expect(DEFAULT_PRESS_OPTIONS).toEqual({
      paperSize: 'A2',
      orientation: 'landscape',
      includeLegend: true,
      bleedMm: 3,
      safeMarginMm: 10,
      cropMarks: false,
      exportMode: 'raster_pdf',
      tiled: false,
      tileOverlapMm: 5,
      scale: 1,
      dpi: 300,
    });
  });

  it('defaults dpi to 300', () => {
    expect(DEFAULT_PRESS_OPTIONS.dpi).toBe(300);
  });
});

describe('getPageDimensionsMm (tested via jsPDF constructor args)', () => {
  it('returns A4 portrait dimensions (width=210, height=297)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A4',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [210, 297], orientation: 'portrait' }),
    );
  });

  it('returns A4 landscape dimensions (width=297, height=210)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A4',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [297, 210], orientation: 'landscape' }),
    );
  });

  it('returns A0 portrait dimensions (width=841, height=1189)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A0',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [841, 1189], orientation: 'portrait' }),
    );
  });

  it('returns A0 landscape dimensions (width=1189, height=841)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A0',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [1189, 841], orientation: 'landscape' }),
    );
  });

  it('returns A1 portrait dimensions (width=594, height=841)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A1',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [594, 841], orientation: 'portrait' }),
    );
  });

  it('returns A3 portrait dimensions (width=297, height=420)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A3',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [297, 420], orientation: 'portrait' }),
    );
  });

  it('returns A2 portrait dimensions (width=420, height=594)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A2',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [420, 594], orientation: 'portrait' }),
    );
  });

  it('A2 landscape swaps to (width=594, height=420)', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A2',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [594, 420], orientation: 'landscape' }),
    );
  });
});

describe('sanitizeFileName (tested via artifact fileName)', () => {
  it('lowercases the tree name', async () => {
    const tree = createTree('HELLO WORLD');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('hello_world_family_tree.pdf');
  });

  it('replaces special characters with underscores', async () => {
    const tree = createTree('My!!! Family (Tree) @2026');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('my_family_tree_2026_family_tree.pdf');
  });

  it('collapses consecutive non-alphanumeric characters into a single underscore', async () => {
    const tree = createTree('Test___Name___Here');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('test_name_here_family_tree.pdf');
  });

  it('trims leading and trailing underscores', async () => {
    const tree = createTree('__Hello__');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('hello_family_tree.pdf');
  });

  it('falls back to "family_tree" when name is empty or only special chars', async () => {
    const tree = createTree('');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('family_tree_family_tree.pdf');
  });

  it('falls back when tree name is null/undefined (empty string)', async () => {
    const tree = createTree('');
    const artifact = await PrintService.generate(
      tree,
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toContain('family_tree');
  });
});

describe('calculateAspectFit (tested via addImage arguments in raster mode)', () => {
  it('centers 800x600 default inside a landscape frame', async () => {
    const element = makeElementWithSvg(1000, 1000);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf', // raster → addImage is called
      paperSize: 'A2',
      orientation: 'landscape',
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    const [, , x, y, w, h] = mockPdfInstance.addImage.mock.calls[0];

    expect(x).toBeCloseTo(34.333, 1);
    expect(y).toBe(13);
    expect(w).toBeCloseTo(525.333, 1);
    expect(h).toBe(394);
  });

  it('uses same fit for any SVG attribute values (800x600 default)', async () => {
    const element = makeElementWithSvg(1600, 800);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    const [, , x, y, w, h] = mockPdfInstance.addImage.mock.calls[0];

    expect(x).toBeCloseTo(34.333, 1);
    expect(y).toBe(13);
    expect(w).toBeCloseTo(525.333, 1);
    expect(h).toBe(394);
  });

  it('handles 800x600 inside a portrait frame', async () => {
    const element = makeElementWithSvg(500, 500);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf',
      paperSize: 'A4',
      orientation: 'portrait',
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    const [, , x, y, w, h] = mockPdfInstance.addImage.mock.calls[0];

    expect(x).toBe(13);
    expect(y).toBeCloseTo(79.5, 1);
    expect(w).toBe(184);
    expect(h).toBe(138);
  });
});

describe('extractSvgFromElement (tested via SVG export)', () => {
  it('parses width and height from SVG attributes', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    expect(artifact.renderMode).toBe('svg');
    expect(artifact.mimeType).toBe('image/svg+xml');
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('falls back to getBoundingClientRect when width/height attributes are missing', async () => {
    const element = makeElementWithSvg(undefined, undefined, undefined, 1200, 900);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('handles an SVG that has a viewBox attribute without error', async () => {
    const element = makeElementWithSvg(500, 400, '0 0 100 200');
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('viewBox="0 0');
    expect(artifact.renderMode).toBe('svg');
  });

  it('returns null and throws when no SVG element is found in SVG mode', async () => {
    const div = document.createElement('div');
    await expect(
      PrintService.generate(createTree(), div, { exportMode: 'svg' }),
    ).rejects.toThrow('Tree visualization not available for SVG export. Please switch to tree view first.');
  });
});

describe('ExportArtifact (generate output structure)', () => {
  it('returns correct structure for SVG mode', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    expect(artifact).toMatchObject({
      fileName: expect.stringMatching(/\.svg$/),
      mimeType: 'image/svg+xml',
      renderMode: 'svg',
    });
    expect(artifact.blob).toBeInstanceOf(Blob);
    expect(artifact.blob.type).toBe('image/svg+xml;charset=utf-8');
  });

  it('returns correct structure for raster_pdf mode', async () => {
    const artifact = await PrintService.generate(
      createTree(),
      makeElementWithSvg(800, 600),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact).toMatchObject({
      fileName: expect.stringMatching(/\.pdf$/),
      mimeType: 'application/pdf',
      renderMode: 'raster_pdf',
    });
    expect(artifact.blob).toBeInstanceOf(Blob);
    expect(artifact.blob.type).toBe('application/pdf');
  });

  it('returns correct structure for vector_pdf mode', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
    });

    expect(artifact).toMatchObject({
      fileName: expect.stringMatching(/\.pdf$/),
      mimeType: 'application/pdf',
      renderMode: 'vector_pdf',
    });
    expect(artifact.blob).toBeInstanceOf(Blob);
  });

  it('throws when no SVG element is found in PDF mode', async () => {
    await expect(
      PrintService.generate(
        createTree(),
        document.createElement('div'),
        { exportMode: 'vector_pdf' },
      ),
    ).rejects.toThrow('No tree visualization found. Please switch to tree view first.');
  });

  it('throws when no SVG element is found in raster_pdf mode', async () => {
    await expect(
      PrintService.generate(
        createTree(),
        document.createElement('div'),
        { exportMode: 'raster_pdf' },
      ),
    ).rejects.toThrow('No tree visualization found. Please switch to tree view first.');
  });
});

describe('printTree error handling', () => {
  it('throws when no SVG element is found in the element', async () => {
    await expect(
      PrintService.printTree(document.createElement('div')),
    ).rejects.toThrow(
      'No tree visualization found for printing. Please switch to tree view first.',
    );
  });

  it('throws when window.open returns null (popup blocked) even with SVG present', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const element = makeElementWithSvg(800, 600);
    await expect(
      PrintService.printTree(element),
    ).rejects.toThrow('Unable to open print window');

    openSpy.mockRestore();
  });

  it('handles SVG extraction failure before window.open is called', async () => {
    const openSpy = vi.spyOn(window, 'open');

    await expect(
      PrintService.printTree(document.createElement('div'), {
        paperSize: 'A3',
        orientation: 'portrait',
        safeMarginMm: 5,
      }),
    ).rejects.toThrow(
      'No tree visualization found for printing. Please switch to tree view first.',
    );

    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});

describe('createPrintOptimizedSvg (tested via SVG export blob)', () => {
  it('returns an SVG element with the standard xmlns attribute', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('sets width and height in mm on the wrapper SVG', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('width="594mm"');
    expect(svgText).toContain('height="420mm"');
  });

  it('sets width and height in mm for portrait orientation', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A4',
      orientation: 'portrait',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('width="210mm"');
    expect(svgText).toContain('height="297mm"');
  });

  it('includes a viewBox on the wrapper SVG', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('viewBox="0 0 594 420"');
  });

  it('wraps original SVG content inside a <g> with transform', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('<g');
    expect(svgText).toContain('transform="translate(');
    expect(svgText).toContain('scale(');
  });
});

describe('PrintService – additional edge cases', () => {
  it('merges user-provided options with defaults', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A0',
      bleedMm: 5,
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [1189, 841] }),
    );

    expect(artifact).toBeDefined();
    expect(artifact.fileName).toMatch(/\.pdf$/);
  });

  it('calls svg2pdf for vector_pdf mode', async () => {
    const element = makeElementWithSvg(800, 600);
    const { svg2pdf } = await import('svg2pdf.js');

    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
    });

    expect(svg2pdf).toHaveBeenCalled();
    const [svgElementArg, pdfArg, optionsArg] = (svg2pdf as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(svgElementArg.tagName.toLowerCase()).toBe('svg');
    expect(pdfArg).toBe(mockPdfInstance);
    expect(optionsArg).toHaveProperty('x');
    expect(optionsArg).toHaveProperty('y');
    expect(optionsArg).toHaveProperty('width');
    expect(optionsArg).toHaveProperty('height');
  });

  it('calls addImage for raster_pdf mode', async () => {
    const element = makeElementWithSvg(800, 600);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf',
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    const [imageArg] = mockPdfInstance.addImage.mock.calls[0];
    expect(typeof imageArg).toBe('string');
    expect(imageArg).toContain('data:image/jpeg');

    const [, format] = mockPdfInstance.addImage.mock.calls[0];
    expect(format).toBe('JPEG');
  });
});

describe('PAPER_DIMENSIONS_MM', () => {
  it.each([
    ['A0', 841, 1189],
    ['A1', 594, 841],
    ['A2', 420, 594],
    ['A3', 297, 420],
    ['A4', 210, 297],
  ])('%s has %i x %i dimensions per ISO 216', async (size, w, h) => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: size as any,
      orientation: 'portrait' as any,
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [w, h], orientation: 'portrait' }),
    );
  });
});

describe('getPageDimensionsMm', () => {
  it('portrait orientation returns width < height', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A4',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [210, 297] }),
    );
  });

  it('landscape swaps width and height', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A4',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [297, 210] }),
    );
  });

  it('A0 landscape returns [1189, 841]', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A0',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [1189, 841] }),
    );
  });

  it('A4 portrait returns [210, 297]', async () => {
    await PrintService.generate(createTree(), makeElementWithSvg(800, 600), {
      paperSize: 'A4',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [210, 297] }),
    );
  });
});

describe('extractSvgFromElement (data-tree-svg attribute)', () => {
  it('selects SVG with data-tree-svg attribute when present', async () => {
    const div = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-tree-svg', '');
    svg.setAttribute('width', '800');
    svg.setAttribute('height', '600');
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0,
      right: 800, bottom: 600,
      width: 800, height: 600,
      toJSON() { return {}; },
    });
    div.appendChild(svg);

    const artifact = await PrintService.generate(createTree(), div, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(artifact.renderMode).toBe('svg');
  });

  it('prefers data-tree-svg marked SVG over larger unmarked SVGs', async () => {
    const div = document.createElement('div');

    // Large SVG (2000x2000) without data-tree-svg
    const largeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    largeSvg.setAttribute('width', '2000');
    largeSvg.setAttribute('height', '2000');
    vi.spyOn(largeSvg, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0,
      right: 2000, bottom: 2000,
      width: 2000, height: 2000,
      toJSON() { return {}; },
    });
    div.appendChild(largeSvg);

    // Small SVG (100x100) with data-tree-svg — should be preferred
    const smallSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    smallSvg.setAttribute('data-tree-svg', '');
    smallSvg.setAttribute('width', '100');
    smallSvg.setAttribute('height', '100');
    vi.spyOn(smallSvg, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0,
      right: 100, bottom: 100,
      width: 100, height: 100,
      toJSON() { return {}; },
    });
    div.appendChild(smallSvg);

    const artifact = await PrintService.generate(createTree(), div, {
      exportMode: 'svg',
      paperSize: 'A4',
      orientation: 'portrait',
    });

    const svgText = await blobToString(artifact.blob);

    // The wrapper viewBox should still be A4 portrait
    expect(svgText).toContain('viewBox="0 0 210 297"');

    // Extract the scale from the <g> transform to verify the correct
    // SVG was selected. If the 2000x2000 one were picked, scale would
    // be ~0.092 (less than 1). The 100x100 data-tree-svg SVG yields
    // scale = Min(184/100, 271/100) = 1.84 (greater than 1).
    const match = svgText.match(/scale\(([\d.]+)\)/);
    expect(match).not.toBeNull();
    const scale = parseFloat(match![1]);
    expect(scale).toBeGreaterThan(1);
  });
});

describe('applyScaleToSvg (tested via raster_pdf blob)', () => {
  it('does not modify viewBox when scale is 1', async () => {
    const element = makeElementWithSvg(800, 600, '0 0 4000 3000', 1200, 900);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf',
      scale: 1,
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
  });

  it('zooms into center when scale > 1', async () => {
    const element = makeElementWithSvg(800, 600, '0 0 4000 3000', 1200, 900);
    await PrintService.generate(createTree(), element, {
      exportMode: 'raster_pdf',
      scale: 2,
    });

    expect(mockPdfInstance.addImage).toHaveBeenCalled();
  });
});

describe('printTree with SVG content', () => {
  it('opens print window and writes SVG image', async () => {
    const mockPrintFn = vi.fn();
    const mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
        querySelector: vi.fn(() => null),
      },
      focus: vi.fn(),
      print: mockPrintFn,
      close: vi.fn(),
      onafterprint: null as ((this: Window, ev: Event) => any) | null,
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

    const element = makeElementWithSvg(800, 600, '0 0 4000 3000', 1200, 900);
    PrintService.printTree(element, { paperSize: 'A4', scale: 1 });

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(mockWindow.document.write).toHaveBeenCalled();
    const writeCall = (mockWindow.document.write as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(writeCall).toContain('data:image/svg+xml');
    expect(writeCall).toContain('class="tree-print-image"');
    expect(mockWindow.focus).toHaveBeenCalled();

    openSpy.mockRestore();
  });

  it('applies scale to SVG viewBox in print window', async () => {
    const mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
        querySelector: vi.fn(() => null),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      onafterprint: null as ((this: Window, ev: Event) => any) | null,
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);

    const element = makeElementWithSvg(800, 600, '0 0 4000 3000', 1200, 900);

    PrintService.printTree(element, { scale: 1 });
    const unscaledCall = (mockWindow.document.write as ReturnType<typeof vi.fn>).mock.calls[0][0];
    (mockWindow.document.write as ReturnType<typeof vi.fn>).mockClear();

    PrintService.printTree(element, { scale: 2 });
    const scaledCall = (mockWindow.document.write as ReturnType<typeof vi.fn>).mock.calls[0][0];

    const encodedOriginalViewBox = encodeURIComponent('viewBox="0 0 4000 3000"');
    expect(unscaledCall).toContain(encodedOriginalViewBox);
    expect(scaledCall).not.toContain(encodedOriginalViewBox);

    openSpy.mockRestore();
  });
});
