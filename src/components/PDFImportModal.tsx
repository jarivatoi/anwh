import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { pdfParser } from '../utils/pdfParser';
import { rosterApi } from '../utils/rosterApi';

interface PDFImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function PDFImportModal({ onClose, onImportComplete }: PDFImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setStatusMessage('Please select a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('processing');
    setStatusMessage('Processing PDF file...');

    try {
      // Parse the PDF file
      const entries = await pdfParser.parsePDF(file);
      
      if (entries.length === 0) {
        setUploadStatus('error');
        setStatusMessage('No roster entries found in the PDF file.');
        return;
      }

      setStatusMessage(`Found ${entries.length} entries. Importing to database...`);

      // Import entries to database
      let successCount = 0;
      for (const entry of entries) {
        try {
          await rosterApi.createEntry(entry);
          successCount++;
        } catch (error) {
          console.warn('Failed to import entry:', entry, error);
        }
      }

      setImportedCount(successCount);
      setUploadStatus('success');
      setStatusMessage(`Successfully imported ${successCount} out of ${entries.length} entries.`);

      // Notify parent component
      onImportComplete();

    } catch (error) {
      console.error('PDF import failed:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to process PDF file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import PDF Roster</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {uploadStatus === 'idle' && (
            <div className="text-center">
              <div className="mb-4">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Select a PDF roster file to import entries into the system.
                </p>
                <p className="text-sm text-gray-500">
                  The PDF will be parsed automatically to extract roster information.
                </p>
              </div>
              
              <button
                onClick={handleUploadClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Upload className="w-4 h-4" />
                Select PDF File
              </button>
            </div>
          )}

          {uploadStatus === 'processing' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{statusMessage}</p>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{statusMessage}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{statusMessage}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setUploadStatus('idle');
                    setStatusMessage('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}