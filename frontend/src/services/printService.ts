import html2canvas from 'html2canvas';
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
  exportMode: 'vector_pdf',
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

    if (mergedOptions.exportMode === 'vector_pdf') {
      const svgPayload = extractSvgFromElement(element);
      if (svgPayload) {
        try {
          const pdf = await this.exportVectorPdf(svgPayload, mergedOptions, pageWidth, pageHeight, margin, contentWidth, contentHeight);
          console.info('[PrintService] Export mode used: vector_pdf');
          return {
            fileName: `${baseName}_family_tree.pdf`,
            mimeType: 'application/pdf',
            blob: pdf.output('blob'),
            renderMode: 'vector_pdf',
          };
        } catch (err) {
          console.warn('svg2pdf failed, falling back to high-res raster:', err);
        }
      }
    }

    const pdf = await this.exportRasterPdf(element, mergedOptions, pageWidth, pageHeight, margin, contentWidth, contentHeight);
    const renderMode = mergedOptions.exportMode === 'vector_pdf' ? 'raster_pdf' : 'raster_pdf';

    console.info(`[PrintService] Export mode used: ${renderMode}`);
    return {
      fileName: `${baseName}_family_tree.pdf`,
      mimeType: 'application/pdf',
      blob: pdf.output('blob'),
      renderMode,
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

      printWindow.focus();

      // Use a small delay to let the browser render the print layout
      setTimeout(() => {
        printWindow.print();
      }, 300);

      // Auto-close only after print completes (or user cancels)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    } catch {
      printWindow.close();
      throw new Error('Failed to prepare print document.');
    }
  }

  private static async exportSvg(
    element: HTMLElement,
    baseName: string,
    options: PressPrintOptions
  ): Promise<ExportArtifact> {
    const svgPayload = extractSvgFromElement(element);
    if (!svgPayload) {
      throw new Error('SVG export requested but no SVG element was found.');
    }

    const [pageWidth, pageHeight] = getPageDimensionsMm(options.paperSize, options.orientation);
    const margin = options.safeMarginMm + options.bleedMm;

    const printSvg = createPrintOptimizedSvg(
      svgPayload,
      pageWidth,
      pageHeight,
      margin,
      options.scale
    );

    const serialized = new XMLSerializer().serializeToString(printSvg);
    return {
      fileName: `${baseName}_family_tree.svg`,
      mimeType: 'image/svg+xml',
      blob: new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
      renderMode: 'svg',
    };
  }

  private static async exportVectorPdf(
    svgPayload: SvgExportPayload,
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
      svgPayload.width,
      svgPayload.height,
      margin,
      margin,
      contentWidth,
      contentHeight
    );

    await svg2pdf(svgPayload.svg, pdf, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });

    if (options.cropMarks) {
      drawCropMarks(pdf, pageWidth, pageHeight, options.bleedMm);
    }

    return pdf;
  }

  private static async exportRasterPdf(
    element: HTMLElement,
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

    await this.renderRasterIntoPdf(pdf, element, options, margin, margin, contentWidth, contentHeight);

    if (options.cropMarks) {
      drawCropMarks(pdf, pageWidth, pageHeight, options.bleedMm);
    }

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
      throw new Error('SVG not found for tiled export.');
    }

    const overlap = options.tileOverlapMm;
    const tileW = contentWidth + overlap;
    const tileH = contentHeight + overlap;

    const dpi = options.dpi;
    const svgPixelWidth = svgPayload.width;
    const svgPixelHeight = svgPayload.height;

    const scaleToFit = Math.min(
      contentWidth / (svgPixelWidth * 25.4 / dpi),
      contentHeight / (svgPixelHeight * 25.4 / dpi)
    );

    const contentWidthMm = (svgPixelWidth * 25.4 / dpi) * scaleToFit;
    const contentHeightMm = (svgPixelHeight * 25.4 / dpi) * scaleToFit;

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

        const tileLeftMm = col * tileW;
        const tileTopMm = row * tileH;
        const tileWidthMm = Math.min(contentWidthMm - tileLeftMm + (col > 0 ? overlap : 0), tileW);
        const tileHeightMm = Math.min(contentHeightMm - tileTopMm + (row > 0 ? overlap : 0), tileH);

        const leftPx = (tileLeftMm / contentWidthMm) * svgPixelWidth;
        const topPx = (tileTopMm / contentHeightMm) * svgPixelHeight;
        const tileWPx = (tileWidthMm / contentWidthMm) * svgPixelWidth;
        const tileHPx = (tileHeightMm / contentHeightMm) * svgPixelHeight;

        const canvas = await renderSvgRegionToCanvas(
          svgPayload,
          leftPx,
          topPx,
          tileWPx,
          tileHPx,
          dpi,
          tileWidthMm,
          tileHeightMm
        );

        const imageData = canvas.toDataURL('image/png');
        const targetX = margin - (col > 0 ? overlap : 0);
        const targetY = margin - (row > 0 ? overlap : 0);
        pdf.addImage(imageData, 'PNG', targetX, targetY, tileWidthMm, tileHeightMm);

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

    if (svgPayload) {
      const dpi = options.dpi;
      const targetWidthPx = Math.round((width * dpi) / 25.4);
      const targetHeightPx = Math.round((height * dpi) / 25.4);

      const canvas = await renderSvgToCanvasAtDpi(svgPayload, targetWidthPx, targetHeightPx);
      const imageData = canvas.toDataURL('image/png');
      pdf.addImage(imageData, 'PNG', x, y, width, height);
    } else {
      const rasterScale = Math.max(3, options.scale * window.devicePixelRatio);
      const canvas = await html2canvas(element, {
        width: element.scrollWidth,
        height: element.scrollHeight,
        scale: rasterScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        ignoreElements: (node: Element) =>
          node.hasAttribute('data-export-ignore') || node.hasAttribute('data-html2canvas-ignore'),
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

function createPrintOptimizedSvg(
  payload: SvgExportPayload,
  pageWidthMm: number,
  pageHeightMm: number,
  marginMm: number,
  fontScale: number
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

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text { font-size: ${Math.round(11 * fontScale)}px; }
    text[font-size="10px"], text[font-size="11px"] { font-size: ${Math.round(11 * fontScale)}px; }
  `;

  wrapper.appendChild(style);
  wrapper.appendChild(group);

  return wrapper;
}

async function renderSvgToCanvasAtDpi(
  payload: SvgExportPayload,
  targetWidthPx: number,
  targetHeightPx: number
): Promise<HTMLCanvasElement> {
  if (targetWidthPx > 16384 || targetHeightPx > 16384) {
    console.warn(`Target canvas size ${targetWidthPx}x${targetHeightPx} may exceed browser limits`);
  }

  const MAX_CANVAS_PIXELS = 268_435_456; // 16384 * 16384
  if (targetWidthPx * targetHeightPx > MAX_CANVAS_PIXELS) {
    throw new Error(
      `Export requires a ${targetWidthPx}×${targetHeightPx} pixel canvas which exceeds browser limits. Reduce DPI or paper size, or use SVG / Vector PDF export instead.`
    );
  }

  const svgClone = payload.svg.cloneNode(true) as SVGElement;

  const scaleX = targetWidthPx / payload.width;
  const scaleY = targetHeightPx / payload.height;

  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', `${targetWidthPx}`);
  wrapper.setAttribute('height', `${targetHeightPx}`);
  wrapper.setAttribute('viewBox', `0 0 ${targetWidthPx} ${targetHeightPx}`);

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `scale(${scaleX}, ${scaleY})`);

  while (svgClone.firstChild) {
    group.appendChild(svgClone.firstChild);
  }

  wrapper.appendChild(group);

  const svgString = new XMLSerializer().serializeToString(wrapper);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas rendering context for raster export.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidthPx, targetHeightPx);
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderSvgRegionToCanvas(
  payload: SvgExportPayload,
  leftPx: number,
  topPx: number,
  regionWidthPx: number,
  regionHeightPx: number,
  dpi: DpiPreset,
  outputWidthMm: number,
  outputHeightMm: number
): Promise<HTMLCanvasElement> {
  const targetWidthPx = Math.round((outputWidthMm * dpi) / 25.4);
  const targetHeightPx = Math.round((outputHeightMm * dpi) / 25.4);

  const MAX_CANVAS_PIXELS = 268_435_456; // 16384 * 16384
  if (targetWidthPx * targetHeightPx > MAX_CANVAS_PIXELS) {
    throw new Error(
      `Export requires a ${targetWidthPx}×${targetHeightPx} pixel canvas which exceeds browser limits. Reduce DPI or paper size, or use SVG / Vector PDF export instead.`
    );
  }

  const svgClone = payload.svg.cloneNode(true) as SVGElement;

  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', `${targetWidthPx}`);
  wrapper.setAttribute('height', `${targetHeightPx}`);
  wrapper.setAttribute('viewBox', `0 0 ${targetWidthPx} ${targetHeightPx}`);

  const scaleX = targetWidthPx / regionWidthPx;
  const scaleY = targetHeightPx / regionHeightPx;
  const translateX = -leftPx;
  const translateY = -topPx;

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${translateX * scaleX}, ${translateY * scaleY}) scale(${scaleX}, ${scaleY})`);

  while (svgClone.firstChild) {
    group.appendChild(svgClone.firstChild);
  }

  wrapper.appendChild(group);

  const svgString = new XMLSerializer().serializeToString(wrapper);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas rendering context for tiled export.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidthPx, targetHeightPx);
    context.drawImage(image, 0, 0);
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
  pdf.setLineWidth(0.25);

  pdf.line(offset - markLength, offset, offset - 1, offset);
  pdf.line(offset, offset - markLength, offset, offset - 1);

  pdf.line(pageWidth - offset + 1, offset, pageWidth - offset + markLength, offset);
  pdf.line(pageWidth - offset, offset - markLength, pageWidth - offset, offset - 1);

  pdf.line(offset - markLength, pageHeight - offset, offset - 1, pageHeight - offset);
  pdf.line(offset, pageHeight - offset + 1, offset, pageHeight - offset + markLength);

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
