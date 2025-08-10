import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { pdfRosterParser } from '../utils/pdfParser';
import { rosterApi } from '../utils/rosterApi';

interface PDFImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function PDFImportModal({ onClose, onImportComplete }: PDFImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setStatus('idle');
      setStatusMessage('');
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStatus('processing');
    setStatusMessage('Reading PDF file...');

    try {
      // Parse PDF file
      setStatusMessage('Extracting roster entries from PDF...');
      const entries = await pdfRosterParser.parseRosterPDF(selectedFile);
      
      if (entries.length === 0) {
        throw new Error('No roster entries found in the PDF file');
      }

      setStatusMessage(`Found ${entries.length} entries. Saving to database...`);

      // Save entries to database
      let savedCount = 0;
      for (const entry of entries) {
        try {
          await rosterApi.createEntry(entry);
          savedCount++;
        } catch (error) {
          console.warn('Failed to save entry:', entry, error);
        }
      }

      setImportedCount(savedCount);
      setStatus('success');
      setStatusMessage(`Successfully imported ${savedCount} of ${entries.length} entries`);

      // Notify parent component
      onImportComplete();

    } catch (error) {
      console.error('PDF import failed:', error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to import PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import PDF Roster</h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 w-full p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                {selectedFile ? selectedFile.name : 'Choose PDF file'}
              </button>
            </div>
          </div>

          {/* Status Display */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status === 'processing' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                )}
                {status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                <span className={`text-sm ${
                  status === 'success' ? 'text-green-600' : 
                  status === 'error' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {statusMessage}
                </span>
              </div>
              
              {status === 'success' && importedCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      {importedCount} roster entries imported successfully
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {status === 'success' ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || isProcessing || status === 'success'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}