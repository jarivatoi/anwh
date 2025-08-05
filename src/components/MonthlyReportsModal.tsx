import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, Users, List, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { monthlyReportGenerator } from '../utils/pdf/monthlyReportGenerator';
import { RosterEntry } from '../types/roster';

interface MonthlyReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: RosterEntry[];
  basicSalary: number;
  hourlyRate: number;
  shiftCombinations: Array<{
    id: string;
    combination: string;
    hours: number;
  }>;
}

export const MonthlyReportsModal: React.FC<MonthlyReportsModalProps> = ({
  isOpen,
  onClose,
  entries,
  basicSalary,
  hourlyRate,
  shiftCombinations
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    individualBills: number;
    annexureGenerated: boolean;
    rosterListGenerated: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    };
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
      setGenerationResult(null);
      setError(null);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isGenerating, onClose]);

  const handleGenerateReports = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);
    
    try {
      console.log('🚀 Starting monthly report generation...');
      
      const result = await monthlyReportGenerator.generateAllReports({
        month: selectedMonth,
        year: selectedYear,
        entries,
        basicSalary,
        hourlyRate,
        shiftCombinations
      });
      
      setGenerationResult(result);
      console.log('✅ Monthly reports generated successfully:', result);
      
    } catch (error) {
      console.error('❌ Monthly report generation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isGenerating) {
      onClose();
    }
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedMonth]} ${selectedYear}`;
  };

  // Get count of entries for selected month
  const getMonthEntryCount = () => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    }).length;
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
        style={{ 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          {!isGenerating && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Monthly Reports Generator
          </h3>
          
          <p className="text-sm text-gray-600 text-center">
            Generate end-of-month reports for all staff
          </p>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          {!generationResult && !error && (
            <div className="space-y-6">
              {/* Month/Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Month and Year
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600 text-center">
                  {getMonthEntryCount()} entries found for {formatMonthYear()}
                </div>
              </div>

              {/* Report Types */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Reports to Generate:</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Individual Staff Bills</div>
                      <div className="text-sm text-gray-600">One PDF per staff member with their work summary</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Annexure (All Staff Summary)</div>
                      <div className="text-sm text-gray-600">Combined summary for all staff members</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <List className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="font-medium text-gray-900">Roster List</div>
                      <div className="text-sm text-gray-600">Simple list showing name, date, and shift</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning if no entries */}
              {getMonthEntryCount() === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-800 font-medium">
                      No entries found for {formatMonthYear()}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Please select a different month or ensure roster data exists.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Generating Reports
              </h4>
              <p className="text-gray-600 mb-4">
                Creating PDFs for {formatMonthYear()}...
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Generating individual staff bills</p>
                <p>• Creating annexure summary</p>
                <p>• Preparing roster list</p>
              </div>
            </div>
          )}

          {/* Results */}
          {generationResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Reports Generated Successfully!
                </h4>
                <p className="text-gray-600">
                  All reports for {formatMonthYear()} have been created
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-800 mb-3">Generation Summary:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Individual Bills:</span>
                    <span className="text-green-800 font-medium">{generationResult.individualBills} files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Annexure:</span>
                    <span className="text-green-800 font-medium">
                      {generationResult.annexureGenerated ? '✅ Generated' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Roster List:</span>
                    <span className="text-green-800 font-medium">
                      {generationResult.rosterListGenerated ? '✅ Generated' : '❌ Failed'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Files Generated:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {generationResult.individualBills} individual staff bills</li>
                  <li>• 1 annexure summary (all staff)</li>
                  <li>• 1 roster list (name, date, shift)</li>
                </ul>
                <p className="text-sm text-blue-600 mt-2">
                  Check your downloads folder for all PDF files.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Generation Failed
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex-shrink-0">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {generationResult ? 'Close' : 'Cancel'}
            </button>
            
            {!generationResult && !error && (
              <button
                onClick={handleGenerateReports}
                disabled={isGenerating || getMonthEntryCount() === 0}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate All Reports</span>
                  </>
                )}
              </button>
            )}
            
            {(generationResult || error) && (
              <button
                onClick={() => {
                  setGenerationResult(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Generate Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};