import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, Users, List, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { batchPrintManager, BatchPrintProgress } from '../utils/pdf/batchPrintManager';
import { monthlyReportGenerator } from '../utils/pdf/monthlyReportGenerator';
import { RosterEntry } from '../types/roster';

interface BatchPrintModalProps {
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

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
  isOpen,
  onClose,
  entries,
  basicSalary,
  hourlyRate,
  shiftCombinations
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportTypes, setReportTypes] = useState<('individual' | 'annexure' | 'roster')[]>(['individual', 'annexure', 'roster']);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BatchPrintProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

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
      setProgress(null);
      setError(null);
      setCompleted(false);
      setReportTypes(['individual', 'annexure', 'roster']);
      setSelectedStaff([]);
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

  // Get unique staff members for the selected month
  const getStaffForMonth = () => {
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });
    
    const staffSet = new Set<string>();
    monthEntries.forEach(entry => {
      // Remove (R) suffix to show only base names
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
      staffSet.add(baseName);
    });
    
    return Array.from(staffSet).sort();
  };

  const handleReportTypeToggle = (type: 'individual' | 'annexure' | 'roster') => {
    setReportTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleStaffToggle = (staffName: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffName) 
        ? prev.filter(name => name !== staffName)
        : [...prev, staffName]
    );
  };

  const handleSelectAllStaff = () => {
    const allStaff = getStaffForMonth();
    setSelectedStaff(selectedStaff.length === allStaff.length ? [] : allStaff);
  };

  const handleBatchPrint = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setCompleted(false);
    
    try {
      // Use regular generation method for now (we'll enhance this)
      const result = await monthlyReportGenerator.generateAllReports({
        month: selectedMonth,
        year: selectedYear,
        entries,
        basicSalary,
        hourlyRate,
        shiftCombinations
      });
      
      setCompleted(true);
      setProgress({
        current: 100,
        total: 100,
        currentTask: 'All reports generated and ready for printing',
        completed: true
      });
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Batch generation completed!\n\n• Individual Bills: ${result.individualBills}\n• Annexure: ${result.annexureGenerated ? 'Generated' : 'Failed'}\n• Roster List: ${result.rosterListGenerated ? 'Generated' : 'Failed'}\n\nCheck your downloads folder for all PDF files.`);
      }, 500);
      
    } catch (error) {
      console.error('❌ Batch print failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate all reports normally (they will auto-download)
      const result = await monthlyReportGenerator.generateAllReports({
        month: selectedMonth,
        year: selectedYear,
        entries,
        basicSalary,
        hourlyRate,
        shiftCombinations
      });
      
      alert(`✅ All reports downloaded!\n\n• Individual Bills: ${result.individualBills}\n• Annexure: ${result.annexureGenerated ? 'Generated' : 'Failed'}\n• Roster List: ${result.rosterListGenerated ? 'Generated' : 'Failed'}`);
      
    } catch (error) {
      console.error('❌ Download all failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to download reports');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose();
        }
      }}
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
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
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
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Batch Print Reports
          </h3>
          
          <p className="text-sm text-gray-600 text-center">
            Generate and print multiple reports at once
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
          {!completed && !error && (
            <div className="space-y-6">
              {/* Month/Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Month and Year
                </label>
                <div className="grid grid-cols-2 gap-3">
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
                
                <div className="mt-2 text-sm text-gray-600 text-center">
                  {getMonthEntryCount()} entries found for {formatMonthYear()}
                </div>
              </div>

              {/* Report Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Report Types to Print
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportTypes.includes('individual')}
                      onChange={() => handleReportTypeToggle('individual')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Individual Staff Bills</div>
                        <div className="text-sm text-gray-600">One bill per staff member ({getStaffForMonth().length} staff)</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportTypes.includes('annexure')}
                      onChange={() => handleReportTypeToggle('annexure')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">Annexure Summary</div>
                        <div className="text-sm text-gray-600">Combined summary for all staff</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportTypes.includes('roster')}
                      onChange={() => handleReportTypeToggle('roster')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-2">
                      <List className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900">Roster List</div>
                        <div className="text-sm text-gray-600">Simple list of shifts and assignments</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Staff Selection - Only show when Individual Bills is selected */}
              {reportTypes.includes('individual') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Select Staff for Individual Bills
                    </label>
                    <button
                      onClick={handleSelectAllStaff}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedStaff.length === getStaffForMonth().length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {getStaffForMonth().map(staffName => (
                      <label key={staffName} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(staffName)}
                          onChange={() => handleStaffToggle(staffName)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">{staffName}</span>
                      </label>
                    ))}
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600 text-center">
                    {selectedStaff.length} of {getStaffForMonth().length} staff selected
                  </div>
                </div>
              )}

              {/* Print Options Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Batch Print Options:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Print All:</strong> Opens print dialog for all selected reports</li>
                  <li>• <strong>Download All:</strong> Downloads all PDFs to your device</li>
                  <li>• Works best on desktop browsers</li>
                  <li>• Mobile users should use "Download All"</li>
                </ul>
              </div>

              {/* Warning if no entries or selections */}
              {(getMonthEntryCount() === 0 || reportTypes.length === 0 || (reportTypes.includes('individual') && selectedStaff.length === 0)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-800 font-medium">
                      {getMonthEntryCount() === 0 
                        ? `No entries found for ${formatMonthYear()}`
                        : reportTypes.length === 0
                        ? 'Please select at least one report type'
                        : 'Please select staff members for individual bills'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && progress && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Generating Reports
              </h4>
              <p className="text-gray-600 mb-4">
                {progress.currentTask}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {progress.current} of {progress.total} completed
              </div>
            </div>
          )}

          {/* Success */}
          {completed && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Reports Generated Successfully!
              </h4>
              <p className="text-gray-600 mb-4">
                All selected reports for {formatMonthYear()} have been created
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  Check your downloads folder for all PDF files. You can now print them individually or use your browser's print function.
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
              {completed ? 'Close' : 'Cancel'}
            </button>
            
            {!completed && !error && (
              <>
                <button
                  onClick={handleDownloadAll}
                  disabled={isGenerating || getMonthEntryCount() === 0 || reportTypes.length === 0 || (reportTypes.includes('individual') && selectedStaff.length === 0)}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All</span>
                </button>
                
                <button
                  onClick={handleBatchPrint}
                  disabled={isGenerating || getMonthEntryCount() === 0 || reportTypes.length === 0 || (reportTypes.includes('individual') && selectedStaff.length === 0)}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Print All</span>
                    </>
                  )}
                </button>
              </>
            )}
            
            {(completed || error) && (
              <button
                onClick={() => {
                  setCompleted(false);
                  setError(null);
                  setProgress(null);
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