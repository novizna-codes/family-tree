import { useState } from 'react';
import { XMarkIcon, PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { PrintService } from '@/services/printService';
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


  const handleGeneratePDF = async () => {
    if (!treeElement) {
      toast.error('Tree visualization not available for export');
      return;
    }

    setIsGenerating(true);
    try {
      await PrintService.generatePDF(tree, people, treeElement);
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


            {/* Preview Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Export Preview</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Dimensions: Dynamic (adapts to tree size)</div>
                <div>Family Members: {people.length}</div>
                <div>
                  Includes: Tree visualization & legend (bottom)
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