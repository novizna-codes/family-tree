import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Person, FamilyTree } from '@/types';

export interface PrintOptions {
  includeDetails: boolean;
  includePhotos: boolean;
  includeNotes: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export class PrintService {
  // The defaultOptions property was removed as it was not being used in the current implementation.
  // The handlePrintOptionsChange function was also removed as it's typically used in UI components for state management,
  // not directly within a static service class like this, and was not called anywhere.

  static async generatePDF(
    tree: FamilyTree,
    _people: Person[],
    element: HTMLElement
  ): Promise<void> {
    try {
      // Show loading indicator
      const loadingDiv = this.createLoadingIndicator();
      document.body.appendChild(loadingDiv);

      // Capture the tree visualization
      // We use a high scale for quality, but the PDF internal dimensions will be 1:1 with pixels (initially)
      const canvas = await html2canvas(element, {
        width: element.scrollWidth,
        height: element.scrollHeight,
        scale: 2, // High resolution for quality
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Convert pixels to mm (approx 0.264583 mm per pixel at 96 DPI)
      // However, jsPDF can take pixels directly if we specify 'pt' or just use the pixel values as mm for simplicity
      // and let the user scale it during print if needed. 
      // A better approach is to keep the aspect ratio and use a reasonable base width.
      
      const pxToMm = 0.264583;
      const pdfWidth = canvas.width * pxToMm / 2; // adjust for scale 2
      const pdfHeight = canvas.height * pxToMm / 2;

      // Create PDF with dynamic size
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      // Add tree visualization as the only page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      // Save PDF
      const filename = `${tree.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_family_tree.pdf`;
      pdf.save(filename);

      // Remove loading indicator
      document.body.removeChild(loadingDiv);

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  private static createLoadingIndicator(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    div.innerHTML = `
      <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="text-gray-900">Generating PDF...</span>
      </div>
    `;
    return div;
  }


  static async printTree(element: HTMLElement): Promise<void> {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blockers.');
    }

    try {
      // Clone the element and optimize for printing
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Create print document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Family Tree</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
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
      
      // Wait for content to load, then print
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
}