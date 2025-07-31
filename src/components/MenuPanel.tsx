import React, { useState, useEffect } from 'react';
import { Download, Upload, Database as DataIcon, FileText, Database, HardDrive, Smartphone } from 'lucide-react';

interface MenuPanelProps {
  onImportData: (data: any) => void;
  onExportData: () => void;
}

export const MenuPanel: React.FC<MenuPanelProps> = ({
  onImportData,
  onExportData
}) => {
  const [storageInfo, setStorageInfo] = useState<{ used: number; available: number } | null>(null);

  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
      } catch (error) {
        console.error('Failed to get storage info:', error);
      }
    };

    loadStorageInfo();
  }, []);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          onImportData(data);
        } catch (error) {
          alert('Invalid file format. Please select a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
    // Clear the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleExportClick = async () => {
    try {
      // Show loading state
      const button = document.querySelector('.export-button') as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = 'Exporting...';
      }
      
      // Call the onExportData function which will handle the export
      await onExportData();
      
      // Show success notification
      alert('✅ Data exported successfully! Check your downloads folder.');
      
      // Reset button
      if (button) {
        button.disabled = false;
        button.textContent = 'Export Schedule';
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again.');
      
      // Reset button on error
      const button = document.querySelector('.export-button') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.textContent = 'Export Schedule';
      }
    }
  };

  const performExport = async (data: any, filename: string) => {
    const dataStr = JSON.stringify(data, null, 2);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 (window.navigator as any).standalone === true;
    
    // Try Web Share API first (works well on iPhone)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([dataStr], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'ANWH Schedule Export',
            text: 'Your work schedule data export'
          });
          return;
        }
      } catch (error) {
        console.log('Web Share API failed, trying fallback');
      }
    }
    
    // PWA-specific handling
    if (isPWA) {
      try {
        // Try clipboard copy for PWA
        await navigator.clipboard.writeText(dataStr);
        alert(`📋 Data copied to clipboard!\n\nTo save as file:\n1. Open Notes app\n2. Paste the data\n3. Tap Share → Save to Files\n4. Name it: ${filename}`);
        return;
      } catch (error) {
        console.log('Clipboard failed in PWA');
      }
    }
    
    // Fallback: Create download link
    try {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Last resort: Open in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<pre>${dataStr}</pre>`);
        alert(`File opened in new tab. To save:\n1. Right-click → Save As\n2. Name it: ${filename}`);
      }
    }
  };
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!storageInfo || storageInfo.available === 0) return 0;
    return (storageInfo.used / storageInfo.available) * 100;
  };

  const getStorageDisplayInfo = () => {
    if (!storageInfo) return null;
    
    // If we got the fallback 50MB estimate, show more realistic info
    if (storageInfo.available === 50 * 1024 * 1024) {
      return {
        isEstimate: true,
        actualAvailable: "Several GB", // Modern iPhones have much more
        note: "Actual storage is much larger - this is a browser limitation"
      };
    }
    
    return {
      isEstimate: false,
      actualAvailable: formatBytes(storageInfo.available),
      note: null
    };
  };

  const storageDisplay = getStorageDisplayInfo();
  return (
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '24px',
      paddingTop: '24px'
    }}>
      <div className="flex items-center justify-center space-x-3 mb-8">
        <DataIcon className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900 text-center">Data Management</h2>
      </div>


      <div className="max-w-2xl mx-auto space-y-6">
        {/* Data Management Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Database className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800 text-center">Import & Export</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Data */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Export Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Download your schedule, settings, and configurations as a backup file
                </p>
              </div>
              <button
                onClick={handleExportClick}
                className="export-button w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export Schedule</span>
              </button>
            </div>

            {/* Import Data */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Import Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Restore your schedule from a previously exported backup file
                </p>
              </div>
              <label className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors duration-200 font-medium">
                <Upload className="w-4 h-4" />
                <span>Import Schedule</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-indigo-800 text-center">File Information</h3>
          </div>
          
          <div className="space-y-3 text-sm text-indigo-700">
            <div className="text-center">
              <p><strong>Export Format:</strong> JSON (.json)</p>
              <p><strong>File Name:</strong> Roster_dd-mm-yyyy.json</p>
              <p><strong>Current Version:</strong> 3.0 (IndexedDB powered)</p>
            </div>
            
            <div className="border-t border-indigo-200 pt-3">
              <p className="text-center font-medium mb-2">Exported Data Includes:</p>
              <ul className="space-y-1 text-center">
                <li>• All scheduled shifts and dates</li>
                <li>• Special date markings</li>
                <li>• Salary and hourly rate settings</li>
                <li>• Work hours configuration</li>
                <li>• Custom schedule title</li>
                <li>• Export timestamp and version</li>
              </ul>
            </div>
            
            <div className="border-t border-indigo-200 pt-3">
              <p className="text-center font-medium mb-2">Import Compatibility:</p>
              <ul className="space-y-1 text-center">
                <li>• Version 3.0+: Full IndexedDB compatibility</li>
                <li>• Version 2.0+: Full compatibility with special dates</li>
                <li>• Version 1.0: Basic compatibility (special dates reset)</li>
              </ul>
            </div>
            
            {/* PWA-specific information */}
            {(() => {
              const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              
              if (isPWA && isIOS) {
                return (
                  <div className="border-t border-indigo-200 pt-3">
                    <p className="text-center font-medium mb-2 text-amber-700">📱 PWA Mode (Installed App):</p>
                    <ul className="space-y-1 text-center text-amber-600">
                      <li>• Data will be copied to clipboard</li>
                      <li>• Use Notes app to save as file</li>
                      <li>• Or use browser version for direct download</li>
                    </ul>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Warning Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Importing data will replace your current schedule and settings. 
              Make sure to export your current data first if you want to keep it as a backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};