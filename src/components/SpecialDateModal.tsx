import React, { useState, useEffect } from 'react';
import { X, Star, Calendar, AlertTriangle } from 'lucide-react';

interface SpecialDateModalProps {
  isOpen: boolean;
  date: string | null;
  currentSpecialInfo: {
    isSpecial: boolean;
    info: string;
  };
  onSave: (isSpecial: boolean, info: string) => Promise<void>;
  onClose: () => void;
  authCode: string;
}

export const SpecialDateModal: React.FC<SpecialDateModalProps> = ({
  isOpen,
  date,
  currentSpecialInfo,
  onSave,
  onClose,
  authCode
}) => {
  const [isSpecial, setIsSpecial] = useState(false);
  const [specialInfo, setSpecialInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen && document.body) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    }

    return () => {
      if (document.body) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.bottom = '';
      }
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isLoading, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && currentSpecialInfo) {
      setIsSpecial(currentSpecialInfo.isSpecial);
      setSpecialInfo(currentSpecialInfo.info);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, currentSpecialInfo]);

  if (!isOpen || !date) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${monthName} ${year}`;
  };

  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(isSpecial, specialInfo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save special date');
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full select-none"
        style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200">
          {!isLoading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Special Date
          </h3>
          
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatDate(date)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Special Date Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mark as Special Date
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Special dates allow different shift combinations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpecial}
                  onChange={(e) => setIsSpecial(e.target.checked)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  isSpecial ? 'bg-yellow-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    isSpecial ? 'translate-x-5' : 'translate-x-0'
                  } mt-0.5 ml-0.5`} />
                </div>
              </label>
            </div>

            {/* Special Date Info */}
            {isSpecial && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Special Date Information
                </label>
                <textarea
                  value={specialInfo}
                  onChange={(e) => setSpecialInfo(e.target.value)}
                  placeholder="Enter reason for special date (e.g., Public Holiday, Emergency, etc.)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                  rows={3}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  This information will appear in reports and exports
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};