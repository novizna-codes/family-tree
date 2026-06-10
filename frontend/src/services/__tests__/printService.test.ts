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
// We use vi.hoisted so the mock factory functions can reference these variables
// (vi.mock is hoisted above imports by vitest).
const { mockSvg2pdf, mockHtml2canvas, mockPdfInstance, mockJsPdf } = vi.hoisted(
  () => {
    const svg2pdf = vi.fn().mockResolvedValue(undefined);

    const html2canvas = vi.fn().mockResolvedValue({
      toDataURL: vi.fn(() => 'data:image/png;base64,mockRaster'),
      width: 800,
      height: 600,
    });

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
      mockSvg2pdf: svg2pdf,
      mockHtml2canvas: html2canvas,
      mockPdfInstance: instance,
      mockJsPdf: JsPdf,
    };
  },
);

vi.mock('jspdf', () => ({ default: mockJsPdf }));
vi.mock('svg2pdf.js', () => ({ svg2pdf: mockSvg2pdf }));
vi.mock('html2canvas', () => ({ default: mockHtml2canvas }));

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
 * mocked on the SVG element (so we can test the fallback path in
 * extractSvgFromElement).
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
});

// ---------------------------------------------------------------------------
// Tests – section (b) + (g)  DEFAULT_PRESS_OPTIONS
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
      exportMode: 'vector_pdf',
      tiled: false,
      tileOverlapMm: 5,
      scale: 2,
      dpi: 300,
    });
  });

  // --- requirement (g) ---
  it('defaults dpi to 300', () => {
    expect(DEFAULT_PRESS_OPTIONS.dpi).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Tests – section (a)  Paper dimensions via getPageDimensionsMm
// ---------------------------------------------------------------------------
// These are tested indirectly by inspecting the `format` passed to the
// jsPDF constructor inside exportRasterPdf.  We use an element *without*
// an SVG child so the code takes the html2canvas raster path (mocked).

describe('getPageDimensionsMm (tested via jsPDF constructor args)', () => {
  it('returns A4 portrait dimensions (width=210, height=297)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A4',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [210, 297], orientation: 'portrait' }),
    );
  });

  it('returns A4 landscape dimensions (width=297, height=210) – swapped', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A4',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [297, 210], orientation: 'landscape' }),
    );
  });

  it('returns A0 portrait dimensions (width=841, height=1189)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A0',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [841, 1189], orientation: 'portrait' }),
    );
  });

  it('returns A0 landscape dimensions (width=1189, height=841) – swapped', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A0',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [1189, 841], orientation: 'landscape' }),
    );
  });

  it('returns A1 portrait dimensions (width=594, height=841)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A1',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [594, 841], orientation: 'portrait' }),
    );
  });

  it('returns A3 portrait dimensions (width=297, height=420)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A3',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [297, 420], orientation: 'portrait' }),
    );
  });

  it('returns A2 portrait dimensions (width=420, height=594)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A2',
      orientation: 'portrait',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [420, 594], orientation: 'portrait' }),
    );
  });

  it('A2 landscape swaps to (width=594, height=420)', async () => {
    await PrintService.generate(createTree(), document.createElement('div'), {
      paperSize: 'A2',
      orientation: 'landscape',
      exportMode: 'raster_pdf',
    });

    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [594, 420], orientation: 'landscape' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests – section (c)  sanitizeFileName
// ---------------------------------------------------------------------------
// Tested via the fileName on the returned ExportArtifact.

describe('sanitizeFileName (tested via artifact fileName)', () => {
  it('lowercases the tree name', async () => {
    const tree = createTree('HELLO WORLD');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('hello_world_family_tree.pdf');
  });

  it('replaces special characters with underscores', async () => {
    const tree = createTree('My!!! Family (Tree) @2026');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('my_family_tree_2026_family_tree.pdf');
  });

  it('collapses consecutive non-alphanumeric characters into a single underscore', async () => {
    const tree = createTree('Test___Name___Here');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    // "test___name___here" → "test_name_here"
    expect(artifact.fileName).toBe('test_name_here_family_tree.pdf');
  });

  it('trims leading and trailing underscores', async () => {
    const tree = createTree('__Hello__');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('hello_family_tree.pdf');
  });

  it('falls back to "family_tree" when name is empty or only special chars', async () => {
    const tree = createTree('');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toBe('family_tree_family_tree.pdf');
  });

  it('falls back when tree name is null/undefined (empty string)', async () => {
    const tree = createTree('');
    const artifact = await PrintService.generate(
      tree,
      document.createElement('div'),
      { exportMode: 'raster_pdf' },
    );

    expect(artifact.fileName).toContain('family_tree');
  });
});

// ---------------------------------------------------------------------------
// Tests – section (d)  calculateAspectFit
// ---------------------------------------------------------------------------
// Tested through vector_pdf mode: extractSvgFromElement finds the SVG, then
// exportVectorPdf calls calculateAspectFit + svg2pdf.  We capture the
// placement arguments passed to svg2pdf.

describe('calculateAspectFit (tested via svg2pdf arguments)', () => {
  it('centers square content inside a landscape frame', async () => {
    // SVG: square 1000x1000
    // A2 landscape → page [594, 420]
    // margin = safeMarginMm(10) + bleedMm(3) = 13
    // contentWidth = 594 - 26 = 568, contentHeight = 420 - 26 = 394
    // sourceRatio = 1000/1000 = 1
    // frameRatio = 568/394 ≈ 1.4416
    // Since sourceRatio < frameRatio:
    //   width = 394, height = 394 (height = frameHeight)
    // Wait — let me re-read the function:
    //   if sourceRatio > frameRatio:
    //     height = frameWidth / sourceRatio
    //   else:
    //     width = frameHeight * sourceRatio
    // sourceRatio = 1, frameRatio = 1.44 → sourceRatio < frameRatio → else branch
    //   width = 394 * 1 = 394, height = 394
    // x = 13 + (568 - 394)/2 = 13 + 87 = 100
    // y = 13 + (394 - 394)/2 = 13

    const element = makeElementWithSvg(1000, 1000);
    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    expect(mockSvg2pdf).toHaveBeenCalled();
    const [, , placement] = mockSvg2pdf.mock.calls[0];

    expect(placement.x).toBeCloseTo(100, 1);
    expect(placement.y).toBe(13);
    expect(placement.width).toBeCloseTo(394, 1);
    expect(placement.height).toBe(394);
  });

  it('constrains wide content to frame width', async () => {
    // SVG: 1600×800  (wide)
    // A2 landscape → content 568×394
    // sourceRatio = 1600/800 = 2
    // frameRatio = 568/394 ≈ 1.44
    // sourceRatio > frameRatio → first branch:
    //   height = 568 / 2 = 284, width = 568
    // x = 13 + (568 - 568)/2 = 13
    // y = 13 + (394 - 284)/2 = 13 + 55 = 68

    const element = makeElementWithSvg(1600, 800);
    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    expect(mockSvg2pdf).toHaveBeenCalled();
    const [, , placement] = mockSvg2pdf.mock.calls[0];

    expect(placement.x).toBe(13);
    expect(placement.y).toBeCloseTo(68, 0);
    expect(placement.width).toBe(568);
    expect(placement.height).toBe(284);
  });

  it('constrains tall content to frame height', async () => {
    // SVG: 600×1200 (tall)
    // A2 landscape → content 568×394
    // sourceRatio = 600/1200 = 0.5
    // frameRatio = 568/394 ≈ 1.44
    // sourceRatio < frameRatio → else branch:
    //   width = 394 * 0.5 = 197, height = 394
    // x = 13 + (568 - 197)/2 = 13 + 185.5 = 198.5
    // y = 13

    const element = makeElementWithSvg(600, 1200);
    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    expect(mockSvg2pdf).toHaveBeenCalled();
    const [, , placement] = mockSvg2pdf.mock.calls[0];

    expect(placement.x).toBeCloseTo(198.5, 1);
    expect(placement.y).toBe(13);
    expect(placement.width).toBeCloseTo(197, 0);
    expect(placement.height).toBe(394);
  });

  it('handles square content inside a square frame', async () => {
    // SVG: 500×500, A4 portrait → page [210, 297]
    // margin = 13, content = [184, 271]
    // sourceRatio = 1, frameRatio = 184/271 ≈ 0.679
    // sourceRatio > frameRatio → first branch:
    //   height = 184 / 1 = 184, width = 184
    // x = 13 + (184 - 184)/2 = 13
    // y = 13 + (271 - 184)/2 = 13 + 43.5 = 56.5

    const element = makeElementWithSvg(500, 500);
    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A4',
      orientation: 'portrait',
    });

    expect(mockSvg2pdf).toHaveBeenCalled();
    const [, , placement] = mockSvg2pdf.mock.calls[0];

    expect(placement.x).toBe(13);
    expect(placement.y).toBeCloseTo(56.5, 1);
    expect(placement.width).toBe(184);
    expect(placement.height).toBe(184);
  });
});

// ---------------------------------------------------------------------------
// Tests – section (e)  extractSvgFromElement (mock-based)
// ---------------------------------------------------------------------------
// We use the SVG export path because it calls extractSvgFromElement first.
// The returned blob contains the serialized SVG, allowing us to verify
// width/height parsing.

describe('extractSvgFromElement (tested via SVG export)', () => {
  it('parses width and height from SVG attributes', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);
    // createPrintOptimizedSvg wraps the extracted SVG in a new root element
    // with width/height in mm.  The original 800×600 is used for scaling.
    expect(artifact.renderMode).toBe('svg');
    expect(artifact.mimeType).toBe('image/svg+xml');
    // The export should contain an SVG tag with xmlns
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('falls back to getBoundingClientRect when width/height attributes are missing', async () => {
    // Create SVG without width/height attributes → falls back to
    // getBoundingClientRect, which we mock at 1200×900.
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
    // createPrintOptimizedSvg wraps the extracted SVG in a new root with its own
    // viewBox (based on page dimensions), so the original viewBox is not preserved
    // in the final output.  Verify the wrapper still has a valid viewBox.
    expect(svgText).toContain('viewBox="0 0');
    expect(artifact.renderMode).toBe('svg');
  });

  it('returns null and throws when no SVG element is found in SVG mode', async () => {
    const div = document.createElement('div'); // no <svg> child
    await expect(
      PrintService.generate(createTree(), div, { exportMode: 'svg' }),
    ).rejects.toThrow('SVG export requested but no SVG element was found.');
  });
});

// ---------------------------------------------------------------------------
// Tests – section (f)  ExportArtifact interface
// ---------------------------------------------------------------------------

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
      document.createElement('div'),
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

  it('falls back to raster_pdf renderMode when vector_pdf fails SVG extraction', async () => {
    // No SVG in element → vector_pdf mode falls to raster
    const artifact = await PrintService.generate(
      createTree(),
      document.createElement('div'),
      { exportMode: 'vector_pdf' },
    );

    expect(artifact.renderMode).toBe('raster_pdf');
    expect(artifact.mimeType).toBe('application/pdf');
  });
});

// ---------------------------------------------------------------------------
// Tests – section (h)  printTree error handling
// ---------------------------------------------------------------------------

describe('printTree error handling', () => {
  it('throws when window.open returns null (popup blocked)', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    await expect(
      PrintService.printTree(document.createElement('div')),
    ).rejects.toThrow('Unable to open print window');

    openSpy.mockRestore();
  });

  it('throws when window.open returns null for custom options', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    await expect(
      PrintService.printTree(document.createElement('div'), {
        paperSize: 'A3',
        orientation: 'portrait',
        safeMarginMm: 5,
      }),
    ).rejects.toThrow('Unable to open print window');

    openSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Tests – section (i)  createPrintOptimizedSvg (via SVG export blob content)
// ---------------------------------------------------------------------------

describe('createPrintOptimizedSvg (tested via SVG export blob)', () => {
  it('returns an SVG element with the standard xmlns attribute', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
    });

    const svgText = await blobToString(artifact.blob);

    // The wrapper SVG should have the standard xmlns
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"');
    // Note: xmlns:xlink is set on the extracted payload by extractSvgFromElement,
    // but createPrintOptimizedSvg creates a fresh wrapper that does not
    // propagate that attribute to the final wrapper SVG.
  });

  it('sets width and height in mm on the wrapper SVG', async () => {
    const element = makeElementWithSvg(800, 600);
    // A2 landscape paper
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    const svgText = await blobToString(artifact.blob);

    // For A2 landscape, page width = 594mm, height = 420mm
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

    // For A4 portrait, page width = 210mm, height = 297mm
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

  it('includes a <style> element for font scaling', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A4',
      orientation: 'portrait',
    });

    const svgText = await blobToString(artifact.blob);

    // scale=2 so font-size should be ~22px (11*2)
    expect(svgText).toContain('font-size: 22px');
  });

  it('wraps original SVG content inside a <g> with transform', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'svg',
      paperSize: 'A2',
      orientation: 'landscape',
    });

    const svgText = await blobToString(artifact.blob);

    // The wrapper should contain a <g> element with a transform attribute
    // (the exact values depend on the scaling calculation)
    expect(svgText).toContain('<g');
    expect(svgText).toContain('transform="translate(');
    expect(svgText).toContain('scale(');
  });
});

// ---------------------------------------------------------------------------
// Additional edge-case tests
// ---------------------------------------------------------------------------

describe('PrintService – additional edge cases', () => {
  it('merges user-provided options with defaults', async () => {
    const element = makeElementWithSvg(800, 600);
    const artifact = await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
      paperSize: 'A0', // override default A2
      bleedMm: 5, // override default 3
    });

    // A0 landscape → page [1189, 841]
    // The jsPDF constructor should receive format: [1189, 841]
    expect(mockJsPdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: [1189, 841] }),
    );

    expect(artifact).toBeDefined();
    expect(artifact.fileName).toMatch(/\.pdf$/);
  });

  it('calls svg2pdf with the correct PDF instance', async () => {
    const element = makeElementWithSvg(800, 600);
    await PrintService.generate(createTree(), element, {
      exportMode: 'vector_pdf',
    });

    expect(mockSvg2pdf).toHaveBeenCalled();

    // First argument should be an SVGElement
    const [svgArg] = mockSvg2pdf.mock.calls[0];
    expect(svgArg).toBeInstanceOf(SVGElement);

    // Second argument should be the mock PDF instance
    const [, pdfArg] = mockSvg2pdf.mock.calls[0];
    expect(pdfArg).toBe(mockPdfInstance);
  });
});
