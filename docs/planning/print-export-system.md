# Print and Export System Design

## Overview
The family tree application provides comprehensive print and export functionality, allowing users to generate high-quality PDFs, SVG files, and data exports in multiple formats and paper sizes.

## Print System Architecture

### 1. Print Engine Components

#### SVG-Based Rendering
- **Primary Format**: SVG for vector-based scalability
- **Layout Engine**: Custom algorithm for optimal family tree positioning
- **Rendering Pipeline**: React → SVG → PDF conversion
- **Quality**: Vector graphics ensure crisp output at any resolution

#### Print Preparation Pipeline
```typescript
// Print workflow
User selects print → Generate SVG → Apply print styles → Convert to PDF → Download/Print
```

### 2. Paper Size Support

#### Standard Sizes
- **A4**: 210 × 297 mm (8.27 × 11.69 inches)
- **A3**: 297 × 420 mm (11.69 × 16.53 inches)
- **A2**: 420 × 594 mm (16.53 × 23.39 inches)
- **A1**: 594 × 841 mm (23.39 × 33.11 inches)

#### Orientation Support
- **Portrait**: Standard vertical layout
- **Landscape**: Horizontal layout for wide trees

#### Custom Sizes
- **Letter**: 8.5 × 11 inches (US standard)
- **Legal**: 8.5 × 14 inches
- **Tabloid**: 11 × 17 inches

### 3. Layout Algorithms

#### Smart Fitting
```typescript
interface PrintLayout {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  scale: number;
  margins: Margins;
  multiPage: boolean;
}

const calculateOptimalLayout = (treeData: TreeData, paperSize: PaperSize): PrintLayout => {
  const treeBounds = calculateTreeBounds(treeData);
  const paperDimensions = getPaperDimensions(paperSize);
  
  // Try single page first
  const singlePageScale = calculateScaleToFit(treeBounds, paperDimensions);
  
  if (singlePageScale >= 0.7) {
    return {
      paperSize,
      orientation: 'portrait',
      scale: singlePageScale,
      margins: STANDARD_MARGINS,
      multiPage: false,
    };
  }
  
  // Try landscape orientation
  const landscapeScale = calculateScaleToFit(treeBounds, {
    width: paperDimensions.height,
    height: paperDimensions.width,
  });
  
  if (landscapeScale >= 0.7) {
    return {
      paperSize,
      orientation: 'landscape',
      scale: landscapeScale,
      margins: STANDARD_MARGINS,
      multiPage: false,
    };
  }
  
  // Multi-page layout
  return calculateMultiPageLayout(treeBounds, paperSize);
};
```

#### Multi-Page Tiling
```typescript
const calculateMultiPageLayout = (
  treeBounds: Bounds,
  paperSize: PaperSize
): PrintLayout => {
  const paperDims = getPaperDimensions(paperSize);
  const overlap = 20; // mm overlap between pages
  
  const pagesX = Math.ceil(treeBounds.width / (paperDims.width - overlap));
  const pagesY = Math.ceil(treeBounds.height / (paperDims.height - overlap));
  
  return {
    paperSize,
    orientation: 'portrait',
    scale: 1.0,
    margins: MINIMAL_MARGINS,
    multiPage: true,
    pageGrid: { x: pagesX, y: pagesY },
    overlap,
  };
};
```

## Export Formats

### 1. PDF Export

#### Client-Side PDF Generation
```typescript
// services/pdfExportService.ts
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

export class PDFExportService {
  async exportToPDF(
    svgElement: SVGElement,
    layout: PrintLayout,
    options: PDFExportOptions
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: layout.orientation,
      unit: 'mm',
      format: layout.paperSize.toLowerCase(),
    });
    
    // Convert SVG to PDF
    await svg2pdf(svgElement, pdf, {
      x: layout.margins.left,
      y: layout.margins.top,
      width: layout.paperSize.width - layout.margins.left - layout.margins.right,
      height: layout.paperSize.height - layout.margins.top - layout.margins.bottom,
    });
    
    // Add metadata
    this.addPDFMetadata(pdf, options);
    
    // Add headers/footers if needed
    if (options.includeHeader || options.includeFooter) {
      this.addHeaderFooter(pdf, layout, options);
    }
    
    return pdf.output('blob');
  }
  
  private addPDFMetadata(pdf: jsPDF, options: PDFExportOptions) {
    pdf.setProperties({
      title: options.title || 'Family Tree',
      subject: 'Family Tree Chart',
      author: options.author || 'Family Tree App',
      creator: 'Family Tree Application',
      creationDate: new Date(),
    });
  }
  
  private addHeaderFooter(
    pdf: jsPDF,
    layout: PrintLayout,
    options: PDFExportOptions
  ) {
    const pageHeight = layout.paperSize.height;
    const pageWidth = layout.paperSize.width;
    
    if (options.includeHeader) {
      pdf.setFontSize(12);
      pdf.text(
        options.title || 'Family Tree',
        pageWidth / 2,
        layout.margins.top / 2,
        { align: 'center' }
      );
    }
    
    if (options.includeFooter) {
      pdf.setFontSize(10);
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - layout.margins.bottom / 2,
        { align: 'center' }
      );
    }
  }
}
```

#### Multi-Page PDF Support
```typescript
const exportMultiPagePDF = async (
  treeData: TreeData,
  layout: PrintLayout
): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: layout.orientation,
    unit: 'mm',
    format: layout.paperSize.toLowerCase(),
  });
  
  const { pageGrid, overlap } = layout;
  const pageWidth = layout.paperSize.width - layout.margins.left - layout.margins.right;
  const pageHeight = layout.paperSize.height - layout.margins.top - layout.margins.bottom;
  
  for (let y = 0; y < pageGrid.y; y++) {
    for (let x = 0; x < pageGrid.x; x++) {
      if (x > 0 || y > 0) {
        pdf.addPage();
      }
      
      // Calculate viewport for this page
      const viewport = {
        x: x * (pageWidth - overlap),
        y: y * (pageHeight - overlap),
        width: pageWidth,
        height: pageHeight,
      };
      
      // Generate SVG for this viewport
      const svgElement = generateTreeSVG(treeData, viewport);
      
      // Add to PDF
      await svg2pdf(svgElement, pdf, {
        x: layout.margins.left,
        y: layout.margins.top,
        width: pageWidth,
        height: pageHeight,
      });
      
      // Add page indicators
      pdf.setFontSize(8);
      pdf.text(
        `Page ${y * pageGrid.x + x + 1} of ${pageGrid.x * pageGrid.y}`,
        pageWidth - 20,
        pageHeight - 5
      );
    }
  }
  
  return pdf.output('blob');
};
```

### 2. SVG Export

#### Clean SVG Generation
```typescript
// services/svgExportService.ts
export class SVGExportService {
  exportToSVG(treeData: TreeData, options: SVGExportOptions): string {
    const svgElement = this.generateCleanSVG(treeData, options);
    return this.svgToString(svgElement);
  }
  
  private generateCleanSVG(
    treeData: TreeData,
    options: SVGExportOptions
  ): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Set dimensions
    svg.setAttribute('width', options.width.toString());
    svg.setAttribute('height', options.height.toString());
    svg.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);
    
    // Add styling
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = this.generateSVGStyles(options);
    defs.appendChild(style);
    svg.appendChild(defs);
    
    // Render tree elements
    this.renderTreeElements(svg, treeData, options);
    
    return svg;
  }
  
  private generateSVGStyles(options: SVGExportOptions): string {
    return `
      .person-card {
        fill: white;
        stroke: #e5e7eb;
        stroke-width: 1;
      }
      
      .person-name {
        font-family: ${options.fontFamily || "'Inter', sans-serif"};
        font-size: 14px;
        font-weight: 600;
        fill: #1f2937;
      }
      
      .person-dates {
        font-family: ${options.fontFamily || "'Inter', sans-serif"};
        font-size: 12px;
        fill: #6b7280;
      }
      
      .relationship-line {
        stroke: #374151;
        stroke-width: 2;
        fill: none;
      }
      
      .generation-line {
        stroke: #d1d5db;
        stroke-width: 1;
        stroke-dasharray: 5,5;
      }
    `;
  }
}
```

### 3. Data Export Formats

#### JSON Export
```typescript
// services/dataExportService.ts
export interface FamilyTreeExport {
  version: string;
  exportDate: string;
  tree: {
    id: string;
    name: string;
    description?: string;
  };
  people: Person[];
  relationships: Relationship[];
  metadata: {
    totalPeople: number;
    generations: number;
    exportedBy: string;
  };
}

export const exportToJSON = (treeData: TreeData): FamilyTreeExport => {
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    tree: {
      id: treeData.id,
      name: treeData.name,
      description: treeData.description,
    },
    people: treeData.people.map(person => ({
      ...person,
      // Remove sensitive fields if needed
      photo_path: person.photo_path ? 'included' : null,
    })),
    relationships: treeData.relationships,
    metadata: {
      totalPeople: treeData.people.length,
      generations: calculateGenerationCount(treeData),
      exportedBy: getCurrentUser().name,
    },
  };
};
```

#### GEDCOM Export (Future)
```typescript
// services/gedcomExportService.ts
export class GEDCOMExportService {
  exportToGEDCOM(treeData: TreeData): string {
    const lines: string[] = [];
    
    // Header
    lines.push('0 HEAD');
    lines.push('1 SOUR Family Tree App');
    lines.push('1 GEDC');
    lines.push('2 VERS 5.5.1');
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR UTF-8');
    
    // Individuals
    treeData.people.forEach(person => {
      lines.push(`0 @I${person.id}@ INDI`);
      lines.push(`1 NAME ${person.first_name} /${person.last_name || ''}/`);
      
      if (person.gender) {
        lines.push(`1 SEX ${person.gender}`);
      }
      
      if (person.birth_date) {
        lines.push('1 BIRT');
        lines.push(`2 DATE ${this.formatGEDCOMDate(person.birth_date)}`);
        if (person.birth_place) {
          lines.push(`2 PLAC ${person.birth_place}`);
        }
      }
      
      if (person.death_date) {
        lines.push('1 DEAT');
        lines.push(`2 DATE ${this.formatGEDCOMDate(person.death_date)}`);
        if (person.death_place) {
          lines.push(`2 PLAC ${person.death_place}`);
        }
      }
    });
    
    // Families
    const families = this.extractFamilies(treeData);
    families.forEach((family, index) => {
      lines.push(`0 @F${index + 1}@ FAM`);
      if (family.husband) {
        lines.push(`1 HUSB @I${family.husband}@`);
      }
      if (family.wife) {
        lines.push(`1 WIFE @I${family.wife}@`);
      }
      family.children.forEach(child => {
        lines.push(`1 CHIL @I${child}@`);
      });
    });
    
    lines.push('0 TRLR');
    
    return lines.join('\n');
  }
  
  private formatGEDCOMDate(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}
```

## Print UI Components

### 1. Print Settings Dialog
```typescript
// components/print/PrintSettingsDialog.tsx
interface PrintSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (settings: PrintSettings) => void;
  treeData: TreeData;
}

export const PrintSettingsDialog: React.FC<PrintSettingsDialogProps> = ({
  isOpen,
  onClose,
  onPrint,
  treeData,
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    paperSize: 'A4',
    orientation: 'portrait',
    includePhotos: true,
    includeDates: true,
    includeNotes: false,
    colorMode: 'color',
    scale: 'auto',
  });
  
  const [preview, setPreview] = useState<PrintPreview | null>(null);
  
  useEffect(() => {
    const generatePreview = async () => {
      const layout = calculateOptimalLayout(treeData, settings.paperSize);
      setPreview({
        layout,
        pageCount: layout.multiPage ? layout.pageGrid.x * layout.pageGrid.y : 1,
        estimatedSize: calculateEstimatedSize(treeData, layout),
      });
    };
    
    generatePreview();
  }, [settings, treeData]);
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Print Settings">
      <div className="space-y-6">
        {/* Paper Size Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paper Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAPER_SIZES.map(size => (
              <button
                key={size.name}
                onClick={() => setSettings(s => ({ ...s, paperSize: size.name }))}
                className={`p-3 border rounded-lg text-sm ${
                  settings.paperSize === size.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="font-medium">{size.name}</div>
                <div className="text-gray-500">{size.dimensions}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Orientation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orientation
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setSettings(s => ({ ...s, orientation: 'portrait' }))}
              className={`flex-1 p-3 border rounded-lg ${
                settings.orientation === 'portrait'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              Portrait
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, orientation: 'landscape' }))}
              className={`flex-1 p-3 border rounded-lg ${
                settings.orientation === 'landscape'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>
        
        {/* Content Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Include Content
          </label>
          <div className="space-y-2">
            {[
              { key: 'includePhotos', label: 'Photos' },
              { key: 'includeDates', label: 'Birth/Death Dates' },
              { key: 'includeNotes', label: 'Notes' },
            ].map(option => (
              <label key={option.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings[option.key as keyof PrintSettings] as boolean}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    [option.key]: e.target.checked
                  }))}
                  className="mr-2"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        
        {/* Preview */}
        {preview && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Pages: {preview.pageCount}</div>
              <div>Scale: {Math.round(preview.layout.scale * 100)}%</div>
              <div>Estimated file size: {preview.estimatedSize}</div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onPrint(settings)}>
            Print
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
```

### 2. Print Preview Component
```typescript
// components/print/PrintPreview.tsx
interface PrintPreviewProps {
  treeData: TreeData;
  settings: PrintSettings;
  layout: PrintLayout;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  treeData,
  settings,
  layout,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (previewRef.current) {
      renderPreview(previewRef.current, treeData, settings, layout);
    }
  }, [treeData, settings, layout]);
  
  return (
    <div className="print-preview-container">
      <div className="print-preview-toolbar">
        <button onClick={() => zoomIn()}>Zoom In</button>
        <button onClick={() => zoomOut()}>Zoom Out</button>
        <button onClick={() => fitToWindow()}>Fit to Window</button>
      </div>
      
      <div className="print-preview-pages">
        <div
          ref={previewRef}
          className="print-preview-content"
          style={{
            width: `${layout.paperSize.width}mm`,
            height: `${layout.paperSize.height}mm`,
            transform: `scale(${previewScale})`,
          }}
        />
      </div>
    </div>
  );
};
```

## Print Optimizations

### 1. Performance Optimizations
```typescript
// Lazy loading for large trees
const optimizeForPrint = (treeData: TreeData): TreeData => {
  return {
    ...treeData,
    people: treeData.people.map(person => ({
      ...person,
      // Only include essential fields for printing
      photo_path: settings.includePhotos ? person.photo_path : null,
      notes: settings.includeNotes ? person.notes : null,
    })),
  };
};

// Memory management for large exports
const exportWithMemoryManagement = async (
  treeData: TreeData,
  settings: PrintSettings
): Promise<Blob> => {
  const chunks: Blob[] = [];
  const chunkSize = 50; // Process 50 people at a time
  
  for (let i = 0; i < treeData.people.length; i += chunkSize) {
    const chunk = treeData.people.slice(i, i + chunkSize);
    const chunkBlob = await processChunk(chunk, settings);
    chunks.push(chunkBlob);
    
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return new Blob(chunks, { type: 'application/pdf' });
};
```

### 2. Quality Settings
```typescript
interface QualitySettings {
  dpi: number;
  vectorText: boolean;
  imageCompression: number;
  colorProfile: 'sRGB' | 'CMYK';
}

const QUALITY_PRESETS = {
  draft: { dpi: 150, vectorText: false, imageCompression: 0.7, colorProfile: 'sRGB' },
  standard: { dpi: 300, vectorText: true, imageCompression: 0.8, colorProfile: 'sRGB' },
  high: { dpi: 600, vectorText: true, imageCompression: 0.9, colorProfile: 'sRGB' },
  print: { dpi: 300, vectorText: true, imageCompression: 0.95, colorProfile: 'CMYK' },
};
```

This comprehensive print and export system provides professional-quality output with flexible options for different use cases and paper sizes.
