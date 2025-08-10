import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, Users, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { batchPrintManager, BatchPrintOptions, BatchPrintProgress } from '../utils/pdf/batchPrintManager';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchPrintProgress | null>(null);
  const [availableStaff, setAvailableStaff] = useState<string[]>([]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get available staff for selected month
  useEffect(() => {
    if (!isOpen) return;

    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
    });

    const staffSet = new Set<string>();
    monthEntries.forEach(entry => {
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
      staffSet.add(baseName);
    });

    const staffList = Array.from(staffSet).sort();
    setAvailableStaff(staffList);
    
    if (selectAllStaff) {
      setSelectedStaff(staffList);
    }
  }, [selectedMonth, selectedYear, entries, isOpen, selectAllStaff]);

  const handleReportTypeChange = (type: 'individual' | 'annexure' | 'roster', checked: boolean) => {
    if (checked) {
      setReportTypes(prev => [...prev, type]);
    } else {
      setReportTypes(prev => prev.filter(t => t !== type));
    }
  };

  const handleStaffChange = (staffName: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff(prev => [...prev, staffName]);
    } else {
      setSelectedStaff(prev => prev.filter(s => s !== staffName));
      setSelectAllStaff(false);
    }
  };

  const handleSelectAllStaff = (checked: boolean) => {
    setSelectAllStaff(checked);
    if (checked) {
      setSelectedStaff(availableStaff);
    } else {
      setSelectedStaff([]);
    }
  };

  const handlePrintAll = async () => {
    if (reportTypes.length === 0) {
      alert('Please select at least one report type');
      return;
    }

    if (reportTypes.includes('individual') && selectedStaff.length === 0) {
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
      selectedStaff: reportTypes.includes('individual') ? selectedStaff : undefined
    };

    try {
      await batchPrintManager.generateAndPrintBatch(options, setProgress);
    } catch (error) {
      console.error('Batch print failed:', error);
      alert(`Batch print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownloadAll = async () => {
    if (reportTypes.length === 0) {
      alert('Please select at least one report type');
      return;
    }

    if (reportTypes.includes('individual') && selectedStaff.length === 0) {
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
      selectedStaff: reportTypes.includes('individual') ? selectedStaff : undefined
    };

    try {
      await batchPrintManager.generateAndDownloadBatch(options, setProgress);
    } catch (error) {
      console.error('Batch download failed:', error);
      alert(`Batch download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      batchPrintManager.cleanup();
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Printer className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Batch Print Reports</h3>
                <p className="text-sm text-gray-600">Generate and print multiple reports at once</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                {progress.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : progress.error ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <span className="font-medium text-gray-900">
                  {progress.completed ? 'Completed!' : progress.error ? 'Error' : 'Processing...'}
                </span>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{progress.currentTask}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress.error ? 'bg-red-500' : progress.completed ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
              {progress.error && (
                <p className="text-sm text-red-600 mt-2">{progress.error}</p>
              )}
            </div>
          )}

          {/* Month/Year Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Month & Year
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={isProcessing}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={isProcessing}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Types */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Report Types
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('individual')}
                  onChange={(e) => handleReportTypeChange('individual', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Individual Bills</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('annexure')}
                  onChange={(e) => handleReportTypeChange('annexure', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Annexure Summary</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportTypes.includes('roster')}
                  onChange={(e) => handleReportTypeChange('roster', e.target.checked)}
                  disabled={isProcessing}
                  className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Roster List</span>
              </label>
            </div>
          </div>

          {/* Staff Selection - Only show if individual reports selected */}
          {reportTypes.includes('individual') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Select Staff ({availableStaff.length} available)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                <label className="flex items-center mb-2 font-medium">
                  <input
                    type="checkbox"
                    checked={selectAllStaff}
                    onChange={(e) => handleSelectAllStaff(e.target.checked)}
                    disabled={isProcessing}
                    className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900">Select All</span>
                </label>
                <div className="space-y-1">
                  {availableStaff.map(staffName => (
                    <label key={staffName} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(staffName)}
                        onChange={(e) => handleStaffChange(staffName, e.target.checked)}
                        disabled={isProcessing}
                        className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{staffName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              {isProcessing ? 'Processing...' : 'Cancel'}
            </button>
            <button
              onClick={handlePrintAll}
              disabled={isProcessing || reportTypes.length === 0}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Open Print Window</span>
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={isProcessing || reportTypes.length === 0}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};