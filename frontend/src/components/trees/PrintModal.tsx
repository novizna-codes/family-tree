import { useMemo, useState } from 'react';
import { XMarkIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  DEFAULT_PRESS_OPTIONS,
  PrintService,
  type ExportMode,
  type Orientation,
  type PaperSize,
  type PressPrintOptions,
} from '@/services/printService';
import { treeService } from '@/services/treeService';
import type { Person, FamilyTree } from '@/types';
import toast from 'react-hot-toast';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTree;
  people: Person[];
  treeElement: HTMLElement | null;
}

export function PrintModal({ isOpen, onClose, tree, people, treeElement }: PrintModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const initialOptions = useMemo<PressPrintOptions>(() => {
    const printSettings = tree.settings?.print;

    return {
      ...DEFAULT_PRESS_OPTIONS,
      paperSize: printSettings?.paper_size ?? DEFAULT_PRESS_OPTIONS.paperSize,
      orientation: printSettings?.orientation ?? DEFAULT_PRESS_OPTIONS.orientation,
      exportMode: printSettings?.export_mode ?? DEFAULT_PRESS_OPTIONS.exportMode,
      bleedMm: printSettings?.bleed_mm ?? DEFAULT_PRESS_OPTIONS.bleedMm,
      safeMarginMm: printSettings?.safe_margin_mm ?? DEFAULT_PRESS_OPTIONS.safeMarginMm,
      cropMarks: printSettings?.crop_marks ?? DEFAULT_PRESS_OPTIONS.cropMarks,
      includeLegend: printSettings?.include_legend ?? DEFAULT_PRESS_OPTIONS.includeLegend,
      tiled: printSettings?.tiled ?? DEFAULT_PRESS_OPTIONS.tiled,
      tileOverlapMm: printSettings?.tile_overlap_mm ?? DEFAULT_PRESS_OPTIONS.tileOverlapMm,
      scale: printSettings?.scale ?? DEFAULT_PRESS_OPTIONS.scale,
    };
  }, [tree.settings]);

  const [paperSize, setPaperSize] = useState<PaperSize>(initialOptions.paperSize);
  const [orientation, setOrientation] = useState<Orientation>(initialOptions.orientation);
  const [exportMode, setExportMode] = useState<ExportMode>(initialOptions.exportMode);
  const [bleedMm, setBleedMm] = useState<number>(initialOptions.bleedMm);
  const [safeMarginMm, setSafeMarginMm] = useState<number>(initialOptions.safeMarginMm);
  const [cropMarks, setCropMarks] = useState<boolean>(initialOptions.cropMarks);
  const [includeLegend, setIncludeLegend] = useState<boolean>(initialOptions.includeLegend);
  const [tiled, setTiled] = useState<boolean>(initialOptions.tiled);
  const [tileOverlapMm, setTileOverlapMm] = useState<number>(initialOptions.tileOverlapMm);
  const [scale, setScale] = useState<number>(initialOptions.scale);
  const [storeDigitally, setStoreDigitally] = useState<boolean>(true);

  const options = useMemo<PressPrintOptions>(
    () => ({
      paperSize,
      orientation,
      exportMode,
      bleedMm,
      safeMarginMm,
      cropMarks,
      includeLegend,
      tiled,
      tileOverlapMm,
      scale,
    }),
    [paperSize, orientation, exportMode, bleedMm, safeMarginMm, cropMarks, includeLegend, tiled, tileOverlapMm, scale]
  );

  const validationWarnings = useMemo<string[]>(() => {
    const warnings: string[] = [];

    if (safeMarginMm < 5) warnings.push('Safe margin must be at least 5 mm.');
    if (bleedMm < 0 || bleedMm > 10) warnings.push('Bleed must be between 0 and 10 mm.');
    if (scale < 1 || scale > 4) warnings.push('Scale must be between 1 and 4.');
    if (tileOverlapMm < 0 || tileOverlapMm > 20) warnings.push('Tile overlap must be between 0 and 20 mm.');

    return warnings;
  }, [safeMarginMm, bleedMm, scale, tileOverlapMm]);

  const hasValidationErrors = validationWarnings.length > 0;


  const handleApplyPrintPressMode = (): void => {
    setPaperSize('A1');
    setOrientation('landscape');
    setExportMode('vector_pdf');
    setBleedMm(3);
    setSafeMarginMm(10);
    setCropMarks(true);
    setScale(2);
  };

  const handleGenerate = async () => {
    if (!treeElement) {
      toast.error('Tree visualization not available for export');
      return;
    }

    if (hasValidationErrors) {
      toast.error('Please fix print option validation warnings first.');
      return;
    }

    setIsGenerating(true);
    try {
      const artifact = await PrintService.generate(tree, people, treeElement, options);
      PrintService.downloadArtifact(artifact);
      console.info(`[PrintModal] Downloaded export using: ${artifact.renderMode}`);

      if (storeDigitally) {
        try {
          await treeService.uploadExportArtifact(tree.id, artifact.blob, artifact.fileName, {
            paper_size: options.paperSize,
            orientation: options.orientation,
            bleed_mm: options.bleedMm,
            safe_margin_mm: options.safeMarginMm,
            crop_marks: options.cropMarks,
            export_mode: options.exportMode,
            tiled: options.tiled,
            tile_overlap_mm: options.tileOverlapMm,
            scale: options.scale,
            include_legend: options.includeLegend,
          });
          toast.success('Export generated, downloaded, and saved digitally!');
        } catch {
          toast.success('Export generated and downloaded successfully!');
          toast('Downloaded successfully, but failed to save digitally.', { icon: '⚠️' });
        }
      } else {
        toast.success('Export generated and downloaded successfully!');
      }

      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate export');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!treeElement) {
      toast.error('Tree visualization not available for printing');
      return;
    }

    if (hasValidationErrors) {
      toast.error('Please fix print option validation warnings first.');
      return;
    }

    try {
      await PrintService.printTree(treeElement, options);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to print');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Print & Export Options
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Print Options */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">Press-ready options</h4>
              <Button variant="outline" onClick={handleApplyPrintPressMode}>
                Print Press Mode
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Paper Size"
                value={paperSize}
                onChange={(event) => setPaperSize(event.target.value as PaperSize)}
                options={[
                  { value: 'A0', label: 'A0' },
                  { value: 'A1', label: 'A1' },
                  { value: 'A2', label: 'A2' },
                  { value: 'A3', label: 'A3' },
                  { value: 'A4', label: 'A4' },
                ]}
              />

              <Select
                label="Orientation"
                value={orientation}
                onChange={(event) => setOrientation(event.target.value as Orientation)}
                options={[
                  { value: 'landscape', label: 'Landscape' },
                  { value: 'portrait', label: 'Portrait' },
                ]}
              />

              <Select
                label="Export Mode"
                value={exportMode}
                onChange={(event) => setExportMode(event.target.value as ExportMode)}
                options={[
                  { value: 'vector_pdf', label: 'Vector PDF (press)' },
                  { value: 'raster_pdf', label: 'Raster PDF' },
                  { value: 'svg', label: 'SVG' },
                ]}
              />

              <Input
                type="number"
                label="Scale"
                min={1}
                max={4}
                step={0.5}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              />

              <Input
                type="number"
                label="Bleed (mm)"
                min={0}
                max={10}
                value={bleedMm}
                onChange={(event) => setBleedMm(Number(event.target.value))}
              />

              <Input
                type="number"
                label="Safe Margin (mm)"
                min={5}
                value={safeMarginMm}
                onChange={(event) => setSafeMarginMm(Number(event.target.value))}
              />

              <Input
                type="number"
                label="Tile Overlap (mm)"
                min={0}
                max={20}
                value={tileOverlapMm}
                onChange={(event) => setTileOverlapMm(Number(event.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Checkbox
                label="Include legend"
                checked={includeLegend}
                onChange={(event) => setIncludeLegend(event.target.checked)}
              />
              <Checkbox
                label="Show crop marks"
                checked={cropMarks}
                onChange={(event) => setCropMarks(event.target.checked)}
              />
              <Checkbox
                label="Enable tiled output"
                checked={tiled}
                onChange={(event) => setTiled(event.target.checked)}
              />
              <Checkbox
                label="Store artifact digitally"
                checked={storeDigitally}
                onChange={(event) => setStoreDigitally(event.target.checked)}
              />
            </div>

            {hasValidationErrors && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Please correct these values:</p>
                <ul className="mt-1 list-disc list-inside text-sm text-amber-700">
                  {validationWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}


            {/* Preview Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Print Preview Summary</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  Format: {paperSize} ({orientation}) · {exportMode.replace('_', ' ')}
                </div>
                <div>
                  Press: bleed {bleedMm}mm · safe margin {safeMarginMm}mm · crop marks {cropMarks ? 'on' : 'off'}
                </div>
                <div>
                  Output: {tiled ? `tiled (${tileOverlapMm}mm overlap)` : 'single page'} · scale {scale}x
                </div>
                <div>Family Members: {people.length}</div>
                <div>Legend: {includeLegend ? 'included' : 'excluded'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={hasValidationErrors}
              className="flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || hasValidationErrors}
              className="flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate & Download'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
