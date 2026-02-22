import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Person, FamilyTree } from '@/types';

export interface PrintOptions {
  format: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeDetails: boolean;
  includePhotos: boolean;
  includeNotes: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export class PrintService {
  private static defaultOptions: PrintOptions = {
    format: 'A4',
    orientation: 'landscape',
    includeDetails: true,
    includePhotos: false,
    includeNotes: false,
    fontSize: 'medium',
  };

  static async generatePDF(
    tree: FamilyTree,
    people: Person[],
    element: HTMLElement,
    options: Partial<PrintOptions> = {}
  ): Promise<void> {
    const finalOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Show loading indicator
      const loadingDiv = this.createLoadingIndicator();
      document.body.appendChild(loadingDiv);

      // Get dimensions based on format
      const dimensions = this.getDimensions(finalOptions.format, finalOptions.orientation);
      
      // Capture the tree visualization
      const canvas = await html2canvas(element, {
        width: element.scrollWidth,
        height: element.scrollHeight,
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: finalOptions.orientation,
        unit: 'mm',
        format: finalOptions.format.toLowerCase() as any,
      });

      // Calculate scaling to fit page
      const imgWidth = dimensions.width;
      const imgHeight = dimensions.height;
      const canvasAspectRatio = canvas.width / canvas.height;
      const pageAspectRatio = imgWidth / imgHeight;

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (canvasAspectRatio > pageAspectRatio) {
        // Canvas is wider, scale by width
        finalHeight = imgWidth / canvasAspectRatio;
      } else {
        // Canvas is taller, scale by height
        finalWidth = imgHeight * canvasAspectRatio;
      }

      // Add title page
      this.addTitlePage(pdf, tree, people, finalOptions);
      
      // Add tree visualization
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        (imgWidth - finalWidth) / 2,
        (imgHeight - finalHeight) / 2,
        finalWidth,
        finalHeight
      );

      // Add details page if requested
      if (finalOptions.includeDetails) {
        this.addDetailsPage(pdf, people, finalOptions);
      }

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

  private static getDimensions(format: string, orientation: string) {
    const dimensions: Record<string, { width: number; height: number }> = {
      A4: { width: 210, height: 297 },
      A3: { width: 297, height: 420 },
      Letter: { width: 216, height: 279 },
    };

    const base = dimensions[format] || dimensions.A4;
    
    if (orientation === 'landscape') {
      return { width: base.height, height: base.width };
    }
    
    return base;
  }

  private static addTitlePage(
    pdf: jsPDF,
    tree: FamilyTree,
    people: Person[],
    _options: PrintOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const title = tree.name || 'Family Tree';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, 40);

    // Description
    if (tree.description) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(tree.description, pageWidth - 40);
      pdf.text(lines, 20, 60);
    }

    // Statistics
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Family Tree Statistics', 20, 100);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const stats = [
      `Total Family Members: ${people.length}`,
      `Living Members: ${people.filter(p => p.is_living).length}`,
      `Deceased Members: ${people.filter(p => !p.is_living).length}`,
      `Male Members: ${people.filter(p => p.gender === 'M').length}`,
      `Female Members: ${people.filter(p => p.gender === 'F').length}`,
    ];
    
    stats.forEach((stat, index) => {
      pdf.text(stat, 25, 115 + (index * 8));
    });

    // Generation info
    pdf.text('Generated on: ' + new Date().toLocaleDateString(), 20, pageHeight - 30);
    pdf.text('Family Tree Builder Application', 20, pageHeight - 20);
  }

  private static addDetailsPage(
    pdf: jsPDF,
    people: Person[],
    options: PrintOptions
  ): void {
    pdf.addPage();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;
    
    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Family Members Details', 20, yPosition);
    yPosition += 15;
    
    // People list
    people.forEach((person, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Person name
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const fullName = `${person.full_name}`.trim();
      pdf.text(`${index + 1}. ${fullName}`, 20, yPosition);
      yPosition += 8;
      
      // Person details
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      const details = [];
      if (person.gender) details.push(`Gender: ${person.gender}`);
      if (person.birth_date) details.push(`Born: ${new Date(person.birth_date).toLocaleDateString()}`);
      if (person.birth_place) details.push(`Birth Place: ${person.birth_place}`);
      if (person.death_date) details.push(`Died: ${new Date(person.death_date).toLocaleDateString()}`);
      details.push(`Status: ${person.is_living ? 'Living' : 'Deceased'}`);
      
      details.forEach(detail => {
        pdf.text(`   ${detail}`, 25, yPosition);
        yPosition += 5;
      });
      
      // Notes if requested
      if (options.includeNotes && person.notes) {
        pdf.text('   Notes:', 25, yPosition);
        yPosition += 5;
        const noteLines = pdf.splitTextToSize(person.notes, pageWidth - 60);
        noteLines.forEach((line: string) => {
          pdf.text(`     ${line}`, 25, yPosition);
          yPosition += 5;
        });
      }
      
      yPosition += 5; // Extra space between people
    });
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
      
    } catch (error) {
      printWindow.close();
      throw new Error('Failed to prepare print document.');
    }
  }
}