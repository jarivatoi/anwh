import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { batchPrintManager, BatchPrintOptions, BatchPrintProgress } from '../utils/pdf/batchPrintManager';
import { RosterEntry } from '../types/roster';
import { getStaffInfo } from '../utils/rosterAuth';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchPrintProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get unique staff members for the selected month
  const getUniqueStaffMembers = (): string[] => {
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });

    const staffSet = new Set<string>();
    monthEntries.forEach(entry => {
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
      staffSet.add(baseName);
    });

    // Convert to array
    const staffArray = Array.from(staffSet);
    
    // Filter out staff members who don't exist in the current auth system
    // This prevents deleted staff from appearing in the selection list
    const validStaffArray = staffArray.filter(staffName => {
      const staffInfo = getStaffInfo(staffName);
      return !!staffInfo;
    });

    return validStaffArray.sort();
  };

  const availableStaff = getUniqueStaffMembers();

  const handleReportTypeChange = (type: 'individual' | 'annexure' | 'roster', checked: boolean) => {
    if (checked) {
      setReportTypes(prev => [...prev, type]);
    } else {
      setReportTypes(prev => prev.filter(t => t !== type));
    }
  };

  const handleStaffSelection = (staffName: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff(prev => [...prev, staffName]);
    } else {
      setSelectedStaff(prev => prev.filter(s => s !== staffName));
    }
  };

  const handleSelectAllStaff = () => {
    setSelectedStaff(availableStaff);
  };

  const handleDeselectAllStaff = () => {
    setSelectedStaff([]);
  };

  const handleGeneratePDF = async () => {
    if (reportTypes.length === 0) {
      setError('Please select at least one report type');
      return;
    }

    if (reportTypes.includes('individual') && selectedStaff.length === 0) {
      setError('Please select at least one staff member for individual reports');
      return;
    }


    setIsProcessing(true);
    setError(null);
    setProgress(null);

    const options: BatchPrintOptions = {
      month: selectedMonth,
      year: selectedYear,
      entries: entries,
      basicSalary: basicSalary,
      hourlyRate: hourlyRate,
      shiftCombinations: shiftCombinations,
      reportTypes: reportTypes,
      selectedStaff: reportTypes.includes('individual') ? selectedStaff : undefined,
      combineIntoSinglePDF: true
    };

    try {
      await batchPrintManager.generateCombinedPDF(options, setProgress);
    } catch (err) {
      console.error('Batch print failed:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to generate batch print';
      
      // Provide more specific guidance for popup blocker issues
      if (errorMessage.includes('Unable to open print window') || errorMessage.includes('popup')) {
        errorMessage = 'Browser blocked the print window popup. Please disable your browser\'s popup blocker for this site and try again. You can usually do this by clicking the popup blocker icon in your address bar.';
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleClose = () => {
    if (!isProcessing) {
      batchPrintManager.cleanup();
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Batch Print & Download</h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Month/Year Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Month & Year</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Types */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Report Types</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('individual')}
                  onChange={(e) => handleReportTypeChange('individual', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Individual Bills</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('annexure')}
                  onChange={(e) => handleReportTypeChange('annexure', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Annexure Summary</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('roster')}
                  onChange={(e) => handleReportTypeChange('roster', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Roster List</span>
              </label>
            </div>
          </div>

          {/* Print Mode */}

          {/* Staff Selection (only show if individual reports selected) */}
          {reportTypes.includes('individual') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Select Staff</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleSelectAllStaff}
                    disabled={isProcessing}
                    className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAllStaff}
                    disabled={isProcessing}
                    className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableStaff.length === 0 ? (
                  <p className="text-sm text-gray-500">No staff found for selected month</p>
                ) : (
                  <div className="space-y-2">
                    {availableStaff.map(staffName => (
                      <label key={staffName} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(staffName)}
                          onChange={(e) => handleStaffSelection(staffName, e.target.checked)}
                          disabled={isProcessing}
                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">{staffName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                {progress.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {progress.currentTask}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {progress.current} of {progress.total} tasks completed
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Cancel'}
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={isProcessing || reportTypes.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>
              Print PDF
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};