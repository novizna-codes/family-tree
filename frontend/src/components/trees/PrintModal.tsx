import { useState } from 'react';
import { XMarkIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { PrintService, type PrintOptions } from '@/services/printService';
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
  const [options, setOptions] = useState<PrintOptions>({
    format: 'A4',
    orientation: 'landscape',
    includeDetails: true,
    includePhotos: false,
    includeNotes: false,
    fontSize: 'medium',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrintOptionsChange = (key: keyof PrintOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePDF = async () => {
    if (!treeElement) {
      toast.error('Tree visualization not available for export');
      return;
    }

    setIsGenerating(true);
    try {
      await PrintService.generatePDF(tree, people, treeElement, options);
      toast.success('PDF generated successfully!');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!treeElement) {
      toast.error('Tree visualization not available for printing');
      return;
    }

    try {
      await PrintService.printTree(treeElement);
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
            {/* Paper Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['A4', 'A3', 'Letter'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => handlePrintOptionsChange('format', format)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border ${
                      options.format === format
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as const).map((orientation) => (
                  <button
                    key={orientation}
                    onClick={() => handlePrintOptionsChange('orientation', orientation)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border capitalize ${
                      options.orientation === orientation
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {orientation}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePrintOptionsChange('fontSize', size)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border capitalize ${
                      options.fontSize === size
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Include in Export
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeDetails}
                    onChange={(e) => handlePrintOptionsChange('includeDetails', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Detailed person information
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includePhotos}
                    onChange={(e) => handlePrintOptionsChange('includePhotos', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Photos (when available)
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeNotes}
                    onChange={(e) => handlePrintOptionsChange('includeNotes', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Personal notes
                  </span>
                </label>
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Export Preview</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Format: {options.format} {options.orientation}</div>
                <div>Family Members: {people.length}</div>
                <div>Font Size: {options.fontSize}</div>
                <div>
                  Includes: {[
                    options.includeDetails && 'Details',
                    options.includePhotos && 'Photos',
                    options.includeNotes && 'Notes'
                  ].filter(Boolean).join(', ') || 'Tree visualization only'}
                </div>
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
              className="flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}