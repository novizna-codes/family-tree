import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { FamilyTree } from '@/types';

export type ExportMode = 'vector_pdf' | 'svg' | 'raster_pdf';
export type PaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export type Orientation = 'portrait' | 'landscape';
export type DpiPreset = 150 | 300 | 600;

export interface PressPrintOptions {
  paperSize: PaperSize;
  orientation: Orientation;
  includeLegend: boolean;
  bleedMm: number;
  safeMarginMm: number;
  cropMarks: boolean;
  exportMode: ExportMode;
  tiled: boolean;
  tileOverlapMm: number;
  scale: number;
  dpi: DpiPreset;
}

export interface ExportArtifact {
  fileName: string;
  mimeType: string;
  blob: Blob;
  renderMode: 'vector_pdf' | 'raster_pdf' | 'svg' | 'tiled_pdf';
}

export const DEFAULT_PRESS_OPTIONS: PressPrintOptions = {
  paperSize: 'A2',
  orientation: 'landscape',
  includeLegend: true,
  bleedMm: 3,
  safeMarginMm: 10,
  cropMarks: false,
  exportMode: 'raster_pdf',
  tiled: false,
  tileOverlapMm: 5,
  scale: 2,
  dpi: 300,
};

const PAPER_DIMENSIONS_MM: Record<PaperSize, { width: number; height: number }> = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
};

interface SvgExportPayload {
  svg: SVGElement;
  width: number;
  height: number;
}

export class PrintService {
  static async generate(
    tree: FamilyTree,
    element: HTMLElement,
    options: Partial<PressPrintOptions> = {}
  ): Promise<ExportArtifact> {
    const mergedOptions: PressPrintOptions = { ...DEFAULT_PRESS_OPTIONS, ...options };
    const baseName = sanitizeFileName(tree.name || 'family_tree');

    if (mergedOptions.exportMode === 'svg') {
      return this.exportSvg(element, baseName, mergedOptions);
    }

    const [pageWidth, pageHeight] = getPageDimensionsMm(
      mergedOptions.paperSize,
      mergedOptions.orientation
    );

    const margin = Math.max(0, mergedOptions.safeMarginMm + mergedOptions.bleedMm);
    const contentWidth = Math.max(1, pageWidth - margin * 2);
    const contentHeight = Math.max(1, pageHeight - margin * 2);

    if (mergedOptions.tiled) {
      return this.exportTiledPdf(element, baseName, pageWidth, pageHeight, margin, contentWidth, contentHeight, mergedOptions);
    }

    const svgPayload = extractSvgFromElement(element);
    if (!svgPayload) {
      throw new Error('No tree visualization found. Please switch to tree view first.');
    }

    const svgString = new XMLSerializer().serializeToString(svgPayload.svg);

    const pdf = await this.embedSvgInPdf(
      svgString,
      svgPayload.width,
      svgPayload.height,
      mergedOptions,
      pageWidth,
      pageHeight,
      margin,
      contentWidth,
      contentHeight
    );

    if (mergedOptions.cropMarks) {
      drawCropMarks(pdf, pageWidth, pageHeight, mergedOptions.bleedMm);
    }

    return {
      fileName: `${baseName}_family_tree.pdf`,
      mimeType: 'application/pdf',
      blob: pdf.output('blob'),
      renderMode: mergedOptions.exportMode === 'vector_pdf' ? 'vector_pdf' : 'raster_pdf',
    };
  }

  static async generatePDF(
    tree: FamilyTree,
    element: HTMLElement
  ): Promise<void> {
    const artifact = await this.generate(tree, element, {
      exportMode: 'raster_pdf',
    });
    this.downloadArtifact(artifact);
  }

  static downloadArtifact(artifact: ExportArtifact): void {
    const objectUrl = URL.createObjectURL(artifact.blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = artifact.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  static async printTree(
    element: HTMLElement,
    options: Partial<PressPrintOptions> = {}
  ): Promise<void> {
    const mergedOptions = { ...DEFAULT_PRESS_OPTIONS, ...options };
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blockers.');
    }

    try {
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // Remove UI overlays that should not appear in print
      const ignoreSelectors = '[data-html2canvas-ignore], [data-export-ignore]';
      const elementsToRemove = clonedElement.querySelectorAll(ignoreSelectors);
      elementsToRemove.forEach(el => el.remove());

      const [pageWidth, pageHeight] = getPageDimensionsMm(
        mergedOptions.paperSize,
        mergedOptions.orientation
      );

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Family Tree</title>
          <style>
            @page {
              size: ${pageWidth}mm ${pageHeight}mm;
              margin: ${mergedOptions.safeMarginMm}mm;
            }
            @media print {
              body { margin: 0; padding: 0; }
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            }
            body { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body></body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      // Use DOM importNode instead of innerHTML to prevent XSS
      // from person names containing malicious HTML/script tags
      const importedNode = printWindow.document.importNode(clonedElement, true);
      printWindow.document.body.appendChild(importedNode);

      setTimeout(() => {
        printWindow.print();
      }, 300);

      printWindow.onafterprint = () => {
        printWindow.close();
      };
    } catch {
      printWindow.close();
      throw new Error('Failed to prepare print document.');
    }
  }

  // ── Vector PDF via svg2pdf ────────────────────────────────────────────
  // Converts SVG paths/curves to native PDF vector operators.
  // Produces infinitely scalable output — identical quality to Canva's
  // "PDF Print" export.
  private static async embedVectorSvg(
    svgString: string,
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    const svgElement = parseSvgString(svgString);
    await svg2pdf(svgElement, pdf, { x, y, width, height });
  }

  // ── Raster SVG-to-canvas renderer (fallback) ──────────────────────────
  // Uses the browser's native SVG renderer (Image + Blob URL + canvas).
  // Falls back to this when vector_pdf mode fails.
  private static renderSvgToCanvas(
    svgString: string,
    targetWidthMm: number,
    targetHeightMm: number,
    dpi: number
  ): Promise<HTMLCanvasElement> {
    const pxPerMm = dpi / 25.4;
    const canvasWidth = Math.round(targetWidthMm * pxPerMm);
    const canvasHeight = Math.round(targetHeightMm * pxPerMm);

    const maxPx = 16_384;
    const clampW = Math.min(canvasWidth, maxPx);
    const clampH = Math.min(canvasHeight, maxPx);

    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = clampW;
      canvas.height = clampH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context for PDF rendering.'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, clampW, clampH);

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = (): void => {
        ctx.drawImage(img, 0, 0, clampW, clampH);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = (): void => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to render SVG to canvas (Image load error).'));
      };

      img.src = url;
    });
  }

  private static async exportSvg(
    element: HTMLElement,
    baseName: string,
    options: PressPrintOptions
  ): Promise<ExportArtifact> {
    const svgPayload = extractSvgFromElement(element);
    if (!svgPayload) {
      throw new Error('Tree visualization not available for SVG export. Please switch to tree view first.');
    }

    const [pageWidth, pageHeight] = getPageDimensionsMm(options.paperSize, options.orientation);
    const margin = options.safeMarginMm + options.bleedMm;

    const printSvg = createPrintOptimizedSvg(
      svgPayload,
      pageWidth,
      pageHeight,
      margin
    );

    const serialized = new XMLSerializer().serializeToString(printSvg);
    return {
      fileName: `${baseName}_family_tree.svg`,
      mimeType: 'image/svg+xml',
      blob: new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
      renderMode: 'svg',
    };
  }

  private static async embedSvgInPdf(
    svgString: string,
    svgPixelWidth: number,
    svgPixelHeight: number,
    options: PressPrintOptions,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number,
    contentHeight: number
  ): Promise<jsPDF> {
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: [pageWidth, pageHeight],
    });

    const placement = calculateAspectFit(
      svgPixelWidth,
      svgPixelHeight,
      margin,
      margin,
      contentWidth,
      contentHeight
    );

    // Vector PDF mode: try svg2pdf first for true vector output
    // NOTE: svg2pdf uses built-in PDF fonts (Helvetica) which only support Latin-1 characters.
    // For non-Latin text (Arabic, Cyrillic, CJK, etc.), we skip vector mode and use raster instead.
    if (options.exportMode === 'vector_pdf') {
      const hasNonAsciiText = /[\x80-\uFFFF]/.test(svgString);
      if (!hasNonAsciiText) {
        try {
          await this.embedVectorSvg(
            svgString,
            pdf,
            placement.x,
            placement.y,
            placement.width,
            placement.height
          );
          return pdf;
        } catch (err) {
          console.warn('[PrintService] svg2pdf failed, falling back to raster renderer:', err);
          // Fall through to raster fallback
        }
      } else {
        console.info(
          '[PrintService] SVG contains non-ASCII text — svg2pdf cannot render these characters correctly. ' +
          'Falling back to raster renderer for proper text rendering.'
        );
      }
    }

    // Raster fallback (for both vector_pdf fallback and raster_pdf mode)
    const canvas = await PrintService.renderSvgToCanvas(
      svgString,
      placement.width,
      placement.height,
      options.dpi
    );

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 1.0),
      'JPEG',
      placement.x,
      placement.y,
      placement.width,
      placement.height
    );

    return pdf;
  }

  private static async exportTiledPdf(
    element: HTMLElement,
    baseName: string,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number,
    contentHeight: number,
    options: PressPrintOptions
  ): Promise<ExportArtifact> {
    const svgPayload = extractSvgFromElement(element);
    if (!svgPayload) {
      throw new Error('Tree visualization not found for tiled export. Please switch to tree view first.');
    }

    const overlap = options.tileOverlapMm;
    const tileW = contentWidth + overlap;
    const tileH = contentHeight + overlap;

    // Full rendered size at the user's scale, in mm
    // 1 CSS pixel = 25.4/96 mm at standard 96 DPI
    const pxToMm = 25.4 / 96;
    const contentWidthMm = svgPayload.width * pxToMm * options.scale;
    const contentHeightMm = svgPayload.height * pxToMm * options.scale;

    const cols = Math.max(1, Math.ceil(contentWidthMm / tileW));
    const rows = Math.max(1, Math.ceil(contentHeightMm / tileH));

    const pdf = new jsPDF({
      orientation: cols > rows ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
    });

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (row > 0 || col > 0) {
          pdf.addPage([pageWidth, pageHeight], cols > rows ? 'l' : 'p');
        }

        const isLastCol = col === cols - 1;
        const isLastRow = row === rows - 1;

        const tileLeftMm = col * tileW;
        const tileTopMm = row * tileH;
        const tileWidthMm = Math.min(
          contentWidthMm - tileLeftMm + (isLastCol ? 0 : overlap),
          contentWidthMm - tileLeftMm + overlap
        );
        const tileHeightMm = Math.min(
          contentHeightMm - tileTopMm + (isLastRow ? 0 : overlap),
          contentHeightMm - tileTopMm + overlap
        );

        const svgPortionLeft = tileLeftMm / contentWidthMm;
        const svgPortionTop = tileTopMm / contentHeightMm;
        const svgPortionWidth = tileWidthMm / contentWidthMm;
        const svgPortionHeight = tileHeightMm / contentHeightMm;

        const tileViewBox = `${svgPortionLeft * svgPayload.width} ${svgPortionTop * svgPayload.height} ${svgPortionWidth * svgPayload.width} ${svgPortionHeight * svgPayload.height}`;

        const tileSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tileSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tileSvg.setAttribute('viewBox', tileViewBox);
        tileSvg.setAttribute('width', `${svgPortionWidth * svgPayload.width}`);
        tileSvg.setAttribute('height', `${svgPortionHeight * svgPayload.height}`);

        for (let i = 0; i < svgPayload.svg.childNodes.length; i++) {
          const child = svgPayload.svg.childNodes[i].cloneNode(true);
          tileSvg.appendChild(child);
        }

        const tileSvgString = new XMLSerializer().serializeToString(tileSvg);

        const targetX = margin - (col > 0 ? overlap : 0);
        const targetY = margin - (row > 0 ? overlap : 0);

        // Try vector path for tiled SVG, fall back to raster
        if (options.exportMode === 'vector_pdf') {
          try {
            await this.embedVectorSvg(
              tileSvgString,
              pdf,
              targetX,
              targetY,
              tileWidthMm,
              tileHeightMm
            );
          } catch {
            // Fall through to raster
            const canvas = await PrintService.renderSvgToCanvas(
              tileSvgString,
              tileWidthMm,
              tileHeightMm,
              options.dpi
            );
            pdf.addImage(
              canvas.toDataURL('image/jpeg', 1.0),
              'JPEG',
              targetX,
              targetY,
              tileWidthMm,
              tileHeightMm
            );
          }
        } else {
          const canvas = await PrintService.renderSvgToCanvas(
            tileSvgString,
            tileWidthMm,
            tileHeightMm,
            options.dpi
          );
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 1.0),
            'JPEG',
            targetX,
            targetY,
            tileWidthMm,
            tileHeightMm
          );
        }

        if (options.cropMarks) {
          drawCropMarks(pdf, pageWidth, pageHeight, options.bleedMm);
        }
      }
    }

    return {
      fileName: `${baseName}_tiled_${cols}x${rows}.pdf`,
      mimeType: 'application/pdf',
      blob: pdf.output('blob'),
      renderMode: 'tiled_pdf',
    };
  }
}

function getPageDimensionsMm(paperSize: PaperSize, orientation: Orientation): [number, number] {
  const paper = PAPER_DIMENSIONS_MM[paperSize];
  if (orientation === 'landscape') {
    return [paper.height, paper.width];
  }
  return [paper.width, paper.height];
}

function sanitizeFileName(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'family_tree';
}

function extractSvgFromElement(element: HTMLElement): SvgExportPayload | null {
  // Prefer the SVG marked as the main tree visualization
  let original = element.querySelector<SVGElement>('svg[data-tree-svg]');

  // Fallback: find the largest SVG by area (avoids picking icon SVGs like PencilIcon)
  if (!original) {
    const allSvgs = element.querySelectorAll<SVGElement>('svg');

    if (allSvgs.length === 0) {
      console.warn('[PrintService] No SVG elements found in the tree element.');
      return null;
    }

    // Find the largest SVG by effective area.
    // Uses getBoundingClientRect in real browsers; falls back to width/height
    // attributes in test environments (JSDOM returns 0×0 for unlaid-out elements).
    let maxArea = 0;
    let largestSvg: SVGElement | null = null;
    allSvgs.forEach(svg => {
      const rect = svg.getBoundingClientRect();
      let svgWidth = rect.width;
      let svgHeight = rect.height;

      // Fallback for JSDOM / detached elements where getBoundingClientRect is 0
      if (svgWidth === 0 && svgHeight === 0) {
        const attrW = parseFloat(svg.getAttribute('width') || '');
        const attrH = parseFloat(svg.getAttribute('height') || '');
        if (attrW > 0 && attrH > 0) {
          svgWidth = attrW;
          svgHeight = attrH;
        } else {
          const vb = svg.getAttribute('viewBox');
          if (vb) {
            const parts = vb.trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4 && parts.every(isFinite)) {
              svgWidth = parts[2];
              svgHeight = parts[3];
            }
          }
        }
      }

      const area = svgWidth * svgHeight;
      if (area > maxArea) {
        maxArea = area;
        largestSvg = svg;
      }
    });

    // Area threshold: typical icon SVGs (e.g., Heroicons) are ~200-500 px².
    // A real tree visualization is always > 5000 px² because it fills the container.
    // If the largest SVG is below this threshold, it's an icon, not the tree.
    if (!largestSvg || maxArea < 5000) {
      console.warn(
        '[PrintService] Only icon-sized SVGs found (largest:',
        Math.round(maxArea), 'px²). Switch to tree view to export the visualization.',
      );
      return null;
    }

    original = largestSvg;
  }

  if (!original) {
    return null;
  }

  const clone = original.cloneNode(true) as SVGElement;

  const viewBox = original.getAttribute('viewBox');
  const rect = original.getBoundingClientRect();

  const pixelWidth = rect.width;
  const pixelHeight = rect.height;

  let viewBoxWidth = 0;
  let viewBoxHeight = 0;
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(isFinite)) {
      viewBoxWidth = parts[2];
      viewBoxHeight = parts[3];
    }
  }

  const width = pixelWidth > 0 ? pixelWidth : (viewBoxWidth > 0 ? viewBoxWidth : 800);
  const height = pixelHeight > 0 ? pixelHeight : (viewBoxHeight > 0 ? viewBoxHeight : 600);

  clone.setAttribute('width', `${width}`);
  clone.setAttribute('height', `${height}`);
  if (viewBox) {
    clone.setAttribute('viewBox', viewBox);
  }
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return { svg: clone, width, height };
}

function parseSvgString(svgString: string): SVGElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) {
    throw new Error('Parsed SVG document contains no <svg> element');
  }
  return svg;
}

function calculateAspectFit(
  sourceWidth: number,
  sourceHeight: number,
  frameX: number,
  frameY: number,
  frameWidth: number,
  frameHeight: number
): { x: number; y: number; width: number; height: number } {
  const sourceRatio = sourceWidth / sourceHeight;
  const frameRatio = frameWidth / frameHeight;

  let width = frameWidth;
  let height = frameHeight;

  if (sourceRatio > frameRatio) {
    height = frameWidth / sourceRatio;
  } else {
    width = frameHeight * sourceRatio;
  }

  const x = frameX + (frameWidth - width) / 2;
  const y = frameY + (frameHeight - height) / 2;

  return { x, y, width, height };
}

function createPrintOptimizedSvg(
  payload: SvgExportPayload,
  pageWidthMm: number,
  pageHeightMm: number,
  marginMm: number
): SVGElement {
  const svg = payload.svg.cloneNode(true) as SVGElement;

  const contentWidthMm = pageWidthMm - 2 * marginMm;
  const contentHeightMm = pageHeightMm - 2 * marginMm;

  const scaleX = contentWidthMm / payload.width;
  const scaleY = contentHeightMm / payload.height;
  const uniformScale = Math.min(scaleX, scaleY);

  const offsetX = (contentWidthMm - payload.width * uniformScale) / 2;
  const offsetY = (contentHeightMm - payload.height * uniformScale) / 2;

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${uniformScale})`);

  while (svg.firstChild) {
    group.appendChild(svg.firstChild);
  }

  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', `${pageWidthMm}mm`);
  wrapper.setAttribute('height', `${pageHeightMm}mm`);
  wrapper.setAttribute('viewBox', `0 0 ${pageWidthMm} ${pageHeightMm}`);

  wrapper.appendChild(group);

  return wrapper;
}

function drawCropMarks(pdf: jsPDF, pageWidth: number, pageHeight: number, bleedMm: number): void {
  const offset = Math.max(1, bleedMm);
  const markLength = 8;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.25);

  // Corner marks
  pdf.line(offset - markLength, offset, offset - 1, offset);
  pdf.line(offset, offset - markLength, offset, offset - 1);

  pdf.line(pageWidth - offset + 1, offset, pageWidth - offset + markLength, offset);
  pdf.line(pageWidth - offset, offset - markLength, pageWidth - offset, offset - 1);

  pdf.line(offset - markLength, pageHeight - offset, offset - 1, pageHeight - offset);
  pdf.line(offset, pageHeight - offset + 1, offset, pageHeight - offset + markLength);

  pdf.line(pageWidth - offset + 1, pageHeight - offset, pageWidth - offset + markLength, pageHeight - offset);
  pdf.line(pageWidth - offset, pageHeight - offset + 1, pageWidth - offset, pageHeight - offset + markLength);

  // Center alignment marks
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  pdf.line(centerX - markLength, offset, centerX - 1, offset);
  pdf.line(centerX + 1, offset, centerX + markLength, offset);
  pdf.line(centerX - markLength, pageHeight - offset, centerX - 1, pageHeight - offset);
  pdf.line(centerX + 1, pageHeight - offset, centerX + markLength, pageHeight - offset);

  pdf.line(offset, centerY - markLength, offset, centerY - 1);
  pdf.line(offset, centerY + 1, offset, centerY + markLength);
  pdf.line(pageWidth - offset, centerY - markLength, pageWidth - offset, centerY - 1);
  pdf.line(pageWidth - offset, centerY + 1, pageWidth - offset, centerY + markLength);
}
