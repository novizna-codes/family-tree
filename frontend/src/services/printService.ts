import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Person, FamilyTree } from '@/types';

export type ExportMode = 'vector_pdf' | 'svg' | 'raster_pdf';
export type PaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export type Orientation = 'portrait' | 'landscape';

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
}

export interface ExportArtifact {
  fileName: string;
  mimeType: string;
  blob: Blob;
  renderMode: 'vector_pdf' | 'raster_pdf' | 'svg';
}

export const DEFAULT_PRESS_OPTIONS: PressPrintOptions = {
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
};

const PAPER_DIMENSIONS_MM: Record<PaperSize, { width: number; height: number }> = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
};

type JsPdfWithOptionalSvg = jsPDF & {
  svg?: (
    element: SVGElement,
    options?: { x?: number; y?: number; width?: number; height?: number }
  ) => Promise<unknown>;
};

interface SvgExportPayload {
  svg: SVGElement;
  width: number;
  height: number;
}

export class PrintService {
  static async generate(
    tree: FamilyTree,
    _people: Person[],
    element: HTMLElement,
    options: Partial<PressPrintOptions> = {}
  ): Promise<ExportArtifact> {
    const mergedOptions: PressPrintOptions = { ...DEFAULT_PRESS_OPTIONS, ...options };
    const baseName = sanitizeFileName(tree.name || 'family_tree');

    if (mergedOptions.exportMode === 'svg') {
      const svgPayload = extractSvgFromElement(element);
      if (!svgPayload) {
        throw new Error('SVG export requested but no SVG element was found.');
      }

      const serialized = new XMLSerializer().serializeToString(svgPayload.svg);
      console.info('[PrintService] Export mode used: svg');
      return {
        fileName: `${baseName}_family_tree.svg`,
        mimeType: 'image/svg+xml',
        blob: new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
        renderMode: 'svg',
      };
    }

    const [pageWidth, pageHeight] = getPageDimensionsMm(
      mergedOptions.paperSize,
      mergedOptions.orientation
    );
    const pdf = new jsPDF({
      orientation: mergedOptions.orientation,
      unit: 'mm',
      format: [pageWidth, pageHeight],
    });

    const margin = Math.max(0, mergedOptions.safeMarginMm + mergedOptions.bleedMm);
    const contentWidth = Math.max(1, pageWidth - margin * 2);
    const contentHeight = Math.max(1, pageHeight - margin * 2);

    let renderModeUsed: ExportArtifact['renderMode'] = 'raster_pdf';

    if (mergedOptions.exportMode === 'vector_pdf') {
      const svgPayload = extractSvgFromElement(element);
      const pdfWithSvg = pdf as JsPdfWithOptionalSvg;
      if (svgPayload && typeof pdfWithSvg.svg === 'function') {
        const placement = calculateAspectFit(
          svgPayload.width,
          svgPayload.height,
          margin,
          margin,
          contentWidth,
          contentHeight
        );

        await pdfWithSvg.svg(svgPayload.svg, placement);
        renderModeUsed = 'vector_pdf';
      } else {
        console.warn('jsPDF svg plugin not available or SVG missing; falling back to raster PDF export.');
        await this.renderRasterIntoPdf(pdf, element, mergedOptions, margin, margin, contentWidth, contentHeight);
        renderModeUsed = 'raster_pdf';
      }
    } else {
      await this.renderRasterIntoPdf(pdf, element, mergedOptions, margin, margin, contentWidth, contentHeight);
      renderModeUsed = 'raster_pdf';
    }

    if (mergedOptions.cropMarks) {
      drawCropMarks(pdf, pageWidth, pageHeight, mergedOptions.bleedMm);
    }

    console.info(`[PrintService] Export mode used: ${renderModeUsed}`);
    return {
      fileName: `${baseName}_family_tree.pdf`,
      mimeType: 'application/pdf',
      blob: pdf.output('blob'),
      renderMode: renderModeUsed,
    };
  }

  static async generatePDF(
    tree: FamilyTree,
    people: Person[],
    element: HTMLElement
  ): Promise<void> {
    const artifact = await this.generate(tree, people, element, {
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
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${clonedElement.outerHTML}
        </body>
        </html>
      `);

      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    } catch {
      printWindow.close();
      throw new Error('Failed to prepare print document.');
    }
  }

  private static async renderRasterIntoPdf(
    pdf: jsPDF,
    element: HTMLElement,
    options: PressPrintOptions,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    const svgPayload = extractSvgFromElement(element);
    const rasterScale = Math.max(3, options.scale * window.devicePixelRatio);
    const canvas = svgPayload
      ? await renderSvgToCanvas(svgPayload, rasterScale)
      : await html2canvas(element, {
          width: element.scrollWidth,
          height: element.scrollHeight,
          scale: rasterScale,
          useCORS: true,
          backgroundColor: '#ffffff',
          ignoreElements: (node: Element) => node.hasAttribute('data-export-ignore') || node.hasAttribute('data-html2canvas-ignore'),
        });

    const imageData = canvas.toDataURL('image/png');
    const imageRatio = canvas.width / canvas.height;
    const frameRatio = width / height;

    let targetWidth = width;
    let targetHeight = height;

    if (imageRatio > frameRatio) {
      targetHeight = width / imageRatio;
    } else {
      targetWidth = height * imageRatio;
    }

    const offsetX = x + (width - targetWidth) / 2;
    const offsetY = y + (height - targetHeight) / 2;
    pdf.addImage(imageData, 'PNG', offsetX, offsetY, targetWidth, targetHeight);
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
  const original = element.querySelector('svg');
  if (!original) {
    return null;
  }

  const clone = original.cloneNode(true) as SVGElement;
  inlineComputedSvgStyles(original, clone);

  const viewBox = clone.getAttribute('viewBox') ?? original.getAttribute('viewBox');
  const rect = original.getBoundingClientRect();
  const widthAttr = Number.parseFloat(original.getAttribute('width') ?? `${rect.width}`);
  const heightAttr = Number.parseFloat(original.getAttribute('height') ?? `${rect.height}`);
  const width = Number.isFinite(widthAttr) && widthAttr > 0 ? widthAttr : Math.max(1, rect.width);
  const height = Number.isFinite(heightAttr) && heightAttr > 0 ? heightAttr : Math.max(1, rect.height);

  if (!viewBox) {
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
  } else {
    clone.setAttribute('viewBox', viewBox);
  }

  clone.setAttribute('width', `${width}`);
  clone.setAttribute('height', `${height}`);
  clone.setAttribute('preserveAspectRatio', clone.getAttribute('preserveAspectRatio') ?? 'xMidYMid meet');

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  return { svg: clone, width, height };
}

function inlineComputedSvgStyles(source: SVGElement, target: SVGElement): void {
  applyInlineStyle(source, target);

  const sourceNodes = source.querySelectorAll('*');
  const targetNodes = target.querySelectorAll('*');
  const length = Math.min(sourceNodes.length, targetNodes.length);

  for (let index = 0; index < length; index += 1) {
    applyInlineStyle(sourceNodes[index], targetNodes[index]);
  }
}

function applyInlineStyle(sourceElement: Element, targetElement: Element): void {
  const computed = window.getComputedStyle(sourceElement);
  const cssText = Array.from(computed)
    .map((propertyName) => `${propertyName}:${computed.getPropertyValue(propertyName)};`)
    .join('');

  if (cssText) {
    targetElement.setAttribute('style', cssText);
  }
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

async function renderSvgToCanvas(payload: SvgExportPayload, scale: number): Promise<HTMLCanvasElement> {
  const svgString = new XMLSerializer().serializeToString(payload.svg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(payload.width * scale));
    canvas.height = Math.max(1, Math.round(payload.height * scale));
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create canvas rendering context for raster export.');
    }

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, payload.width, payload.height);
    context.drawImage(image, 0, 0, payload.width, payload.height);

    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load SVG into image for raster export.'));
    image.src = url;
  });
}

function drawCropMarks(pdf: jsPDF, pageWidth: number, pageHeight: number, bleedMm: number): void {
  const offset = Math.max(1, bleedMm);
  const markLength = 8;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);

  // top-left
  pdf.line(offset - markLength, offset, offset - 1, offset);
  pdf.line(offset, offset - markLength, offset, offset - 1);
  // top-right
  pdf.line(pageWidth - offset + 1, offset, pageWidth - offset + markLength, offset);
  pdf.line(pageWidth - offset, offset - markLength, pageWidth - offset, offset - 1);
  // bottom-left
  pdf.line(offset - markLength, pageHeight - offset, offset - 1, pageHeight - offset);
  pdf.line(offset, pageHeight - offset + 1, offset, pageHeight - offset + markLength);
  // bottom-right
  pdf.line(
    pageWidth - offset + 1,
    pageHeight - offset,
    pageWidth - offset + markLength,
    pageHeight - offset
  );
  pdf.line(
    pageWidth - offset,
    pageHeight - offset + 1,
    pageWidth - offset,
    pageHeight - offset + markLength
  );
}
