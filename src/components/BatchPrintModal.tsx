import React, { useState } from 'react';
import { X, FileText, Download, Printer } from 'lucide-react';
import { batchPrintManager, BatchPrintOptions, BatchPrintProgress } from '../utils/pdf/batchPrintManager';
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
  const [selectAllStaff, setSelectAllStaff] = useState(true);
  const [progress, setProgress] = useState<BatchPrintProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

    return Array.from(staffSet).sort();
  };

  const availableStaff = getUniqueStaffMembers();

  const handleReportTypeChange = (type: 'individual' | 'annexure' | 'roster') => {
    setReportTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleStaffSelection = (staffName: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffName)
        ? prev.filter(s => s !== staffName)
        : [...prev, staffName]
    );
  };

  const handleSelectAllStaff = (selectAll: boolean) => {
    setSelectAllStaff(selectAll);
    if (selectAll) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(availableStaff);
    }
  };

  const handlePrintAll = async () => {
    if (reportTypes.length === 0) {
      alert('Please select at least one report type');
      return;
    }

    if (reportTypes.includes('individual') && !selectAllStaff && selectedStaff.length === 0) {
      alert('Please select at least one staff member for individual reports');
      return;
    }

    setIsProcessing(true);
    setProgress(null);

    const options: BatchPrintOptions = {
      month: selectedMonth,
      year: selectedYear,
      entries,
      basicSalary,
      hourlyRate,
      shiftCombinations,
      reportTypes,
      selectedStaff: selectAllStaff ? undefined : selectedStaff
    };

    try {
      await batchPrintManager.generateAndPrintBatch(options, setProgress);
    } catch (error) {
      console.error('Batch print failed:', error);
      setProgress({
        current: 0,
        total: 0,
        currentTask: 'Print failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (reportTypes.length === 0) {
      alert('Please select at least one report type');
      return;
    }

    if (reportTypes.includes('individual') && !selectAllStaff && selectedStaff.length === 0) {
      alert('Please select at least one staff member for individual reports');
      return;
    }

    setIsProcessing(true);
    setProgress(null);

    const options: BatchPrintOptions = {
      month: selectedMonth,
      year: selectedYear,
      entries,
      basicSalary,
      hourlyRate,
      shiftCombinations,
      reportTypes,
      selectedStaff: selectAllStaff ? undefined : selectedStaff
    };

    try {
      await batchPrintManager.generateAndDownloadBatch(options, setProgress);
    } catch (error) {
      console.error('Batch download failed:', error);
      setProgress({
        current: 0,
        total: 0,
        currentTask: 'Download failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Batch Print Reports
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Month/Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessing}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Types
            </label>
            <div className="space-y-2">
              {[
                { key: 'individual' as const, label: 'Individual Bills' },
                { key: 'annexure' as const, label: 'Annexure Summary' },
                { key: 'roster' as const, label: 'Roster List' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportTypes.includes(key)}
                    onChange={() => handleReportTypeChange(key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isProcessing}
                  />
                  <span className="ml-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Staff Selection (only show if individual reports selected) */}
          {reportTypes.includes('individual') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Staff Selection
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={selectAllStaff}
                    onChange={() => handleSelectAllStaff(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isProcessing}
                  />
                  <span className="ml-2 text-sm text-gray-700">All Staff ({availableStaff.length})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!selectAllStaff}
                    onChange={() => handleSelectAllStaff(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isProcessing}
                  />
                  <span className="ml-2 text-sm text-gray-700">Select Specific Staff</span>
                </label>
              </div>

              {!selectAllStaff && (
                <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  <div className="space-y-2">
                    {availableStaff.map(staffName => (
                      <label key={staffName} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(staffName)}
                          onChange={() => handleStaffSelection(staffName)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          disabled={isProcessing}
                        />
                        <span className="ml-2 text-sm text-gray-700">{staffName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {progress.currentTask}
                </span>
                <span className="text-sm text-gray-500">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.error ? 'bg-red-500' : progress.completed ? 'bg-green-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-sm text-red-600 mt-2">{progress.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePrintAll}
            disabled={isProcessing || reportTypes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Open Print Window'}
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={isProcessing || reportTypes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Download All'}
          </button>
        </div>
      </div>
    </div>
  );
};