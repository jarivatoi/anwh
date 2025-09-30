import React, { useState } from 'react';
import { Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { Settings, ShiftCombination } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateBasicSalary: (salary: number) => void;
  onUpdateShiftHours: (combinationId: string, hours: number) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateBasicSalary,
  onUpdateShiftHours
}) => {
  const [salaryDisplayValue, setSalaryDisplayValue] = useState('');
  const [shiftHoursInputs, setShiftHoursInputs] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatHourlyRate = (rate: number) => {
    return `Rs ${rate.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatSalaryWithCommas = (value: number) => {
    return value.toLocaleString('en-US');
  };

  const parseSalaryFromDisplay = (displayValue: string) => {
    return parseInt(displayValue.replace(/,/g, ''), 10) || 0;
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanValue = inputValue.replace(/[^\d,]/g, '');
    const numericValue = parseSalaryFromDisplay(cleanValue);
    const formattedValue = formatSalaryWithCommas(numericValue);
    setSalaryDisplayValue(formattedValue);
    onUpdateBasicSalary(numericValue);
  };

  const handleSalaryFocus = () => {
    setSalaryDisplayValue(formatSalaryWithCommas(settings.basicSalary || 0));
  };

  const handleSalaryBlur = () => {
    setSalaryDisplayValue('');
  };

  const getSalaryInputValue = () => {
    return salaryDisplayValue || `Rs ${formatSalaryWithCommas(settings.basicSalary || 0)}`;
  };

  const calculateAmount = (hours: number) => {
    return hours * (settings?.hourlyRate || 0);
  };

  // Handle shift hours input changes
  const handleShiftHoursChange = (combinationId: string, value: string) => {
    setShiftHoursInputs(prev => ({ ...prev, [combinationId]: value }));
  };

  // Validate and update shift hours on blur
  const handleShiftHoursBlur = (combinationId: string) => {
    const value = shiftHoursInputs[combinationId] || '';
    let numValue = 0;
    
    if (value !== '') {
      numValue = parseFloat(value) || 0;
      if (numValue < 0) numValue = 0;
    }

    onUpdateShiftHours(combinationId, numValue);
    setShiftHoursInputs(prev => {
      const newState = { ...prev };
      delete newState[combinationId];
      return newState;
    });
  };

  // Get display value for shift hours input
  const getShiftHoursValue = (combination: ShiftCombination) => {
    if (combination.id in shiftHoursInputs) {
      return shiftHoursInputs[combination.id];
    }
    return combination.hours === 0 ? '' : combination.hours.toString();
  };

  // Show error if settings are not properly loaded
  if (!settings) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-red-900 text-center">Settings Loading Error</h2>
        </div>
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <p className="text-red-700 mb-4">Settings data is not available. This may be due to:</p>
          <ul className="text-sm text-red-600 space-y-1">
            <li>• Database initialization issues</li>
            <li>• Import process incomplete</li>
            <li>• Browser storage problems</li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show warning if shift combinations are missing
  if (!settings.shiftCombinations || settings.shiftCombinations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-amber-900 text-center">Missing Shift Combinations</h2>
        </div>
        <div className="text-center p-6 bg-amber-50 rounded-lg">
          <p className="text-amber-700 mb-4">Shift combinations are missing from settings. This will prevent amount calculations.</p>
          <div className="text-sm text-amber-600 space-y-1 mb-4">
            <p><strong>Current Settings:</strong></p>
            <p>Basic Salary: Rs {settings.basicSalary?.toLocaleString() || 'Not set'}</p>
            <p>Hourly Rate: Rs {settings.hourlyRate?.toFixed(2) || 'Not set'}</p>
            <p>Shift Combinations: {settings.shiftCombinations?.length || 0}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: window.innerWidth >= 640 ? '24px' : '16px',
      paddingTop: window.innerWidth >= 640 ? '24px' : '16px'
    }}>
      <div className="flex items-center justify-center space-x-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">Settings & Configuration</h2>
      </div>

      {/* Basic Salary Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 text-center">Salary Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Basic Salary (Monthly)
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="text"
                value={getSalaryInputValue()}
                onChange={handleSalaryChange}
                onFocus={handleSalaryFocus}
                onBlur={handleSalaryBlur}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-base font-medium"
                placeholder="Rs 30,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Hourly Rate (Auto-calculated)
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="text"
                value={formatHourlyRate(settings.hourlyRate || 0)}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-center text-base font-medium"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Formula: Basic Salary × 12 ÷ 52 ÷ 40
            </p>
          </div>
        </div>
      </div>

      {/* Work Hours Configuration */}
      <div className="mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 text-center">Work Hours Configuration</h3>
        
        {/* Mobile Card Layout */}
        <div className="block sm:hidden space-y-3">
          {settings.shiftCombinations.map((combination) => (
            <div key={combination.id} className="p-4 rounded-lg border bg-white">
              <div className="text-center mb-3">
                <div className="font-semibold text-gray-800 text-sm mb-1">
                  {combination.combination}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 text-center">Hours</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getShiftHoursValue(combination)}
                    onChange={(e) => handleShiftHoursChange(combination.id, e.target.value)}
                    onBlur={() => handleShiftHoursBlur(combination.id)}
                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 text-center">Amount</label>
                  <span className="px-2 py-2 bg-gray-100 rounded text-center text-sm font-mono text-gray-700 block">
                    {formatCurrency(calculateAmount(combination.hours || 0))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                  Shift Combination
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                  Hours
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                  Amount (Rs)
                </th>
              </tr>
            </thead>
            <tbody>
              {settings.shiftCombinations.map((combination) => (
                <tr key={combination.id} className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800 text-center">
                    {combination.combination}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={getShiftHoursValue(combination)}
                      onChange={(e) => handleShiftHoursChange(combination.id, e.target.value)}
                      onBlur={() => handleShiftHoursBlur(combination.id)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 font-mono text-gray-700 text-center">
                    {formatCurrency(calculateAmount(combination.hours || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};