import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Users, Badge, IdCard, DollarSign, Eye, EyeOff } from 'lucide-react';
import { authCodes, validateAuthCode, isAdminCode } from '../utils/rosterAuth';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminAuthenticated?: boolean;
  adminName?: string | null;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  isAdminAuthenticated = false,
  adminName = null
}) => {
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isAdminAuthenticated);
  const [authenticatedName, setAuthenticatedName] = useState(adminName);

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
      setAuthCode('');
      setAuthError('');
      setIsAuthenticated(isAdminAuthenticated);
      setAuthenticatedName(adminName);
    }
  }, [isOpen, isAdminAuthenticated, adminName]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleAuthSubmit = () => {
    if (!authCode || authCode.length < 4) {
      setAuthError('Please enter your authentication code');
      return;
    }

    const editorName = validateAuthCode(authCode);
    if (!editorName || !isAdminCode(authCode)) {
      setAuthError(!editorName ? 'Invalid authentication code' : 'Admin access required');
      return;
    }

    setIsAuthenticated(true);
    setAuthenticatedName(editorName);
    setAuthError('');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Filter out ADMIN from staff list
  const staffMembers = authCodes.filter(auth => auth.name !== 'ADMIN');

  // Group staff by title
  const smitStaff = staffMembers.filter(auth => auth.title === 'SMIT');
  const mitStaff = staffMembers.filter(auth => auth.title === 'MIT');
  const radiographers = staffMembers.filter(auth => auth.name.includes('(R)'));

  const formatSalary = (salary: number) => {
    return `Rs ${salary.toLocaleString('en-US')}`;
  };

  if (!isOpen) return null;

  const modalContent = (
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Staff Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {!isAuthenticated ? (
            /* Authentication Section */
            <div className="p-6">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  Authentication Required
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Authentication Code
                  </label>
                  <div className="flex justify-center space-x-3 mb-3">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type={showPassword ? "text" : "password"}
                        value={authCode[index] || ''}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          if (newValue.length <= 1) {
                            const newCode = authCode.split('');
                            newCode[index] = newValue;
                            setAuthCode(newCode.join(''));
                            
                            // Auto-focus next input
                            if (newValue && index < 3) {
                              const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                              if (nextInput) nextInput.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace to go to previous input
                          if (e.key === 'Backspace' && !authCode[index] && index > 0) {
                            const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        data-index={index}
                        className="w-12 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                        maxLength={1}
                        autoComplete="off"
                        autoFocus={index === 0}
                      />
                    ))}
                    <button
                      type="button"
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg ml-2"
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 text-center">{authError}</p>
                  </div>
                )}

                <button
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Access Staff Management
                </button>
              </div>
            </div>
          ) : (
            /* Staff Management Content */
            <div className="p-6">
              {/* Authentication Status */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-800 font-medium">
                      Authenticated as: <strong>{authenticatedName}</strong>
                    </p>
                    <p className="text-xs text-green-600">
                      Admin access granted for staff management
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{staffMembers.length}</div>
                  <div className="text-sm text-blue-700">Total Staff</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Badge className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">{smitStaff.length}</div>
                  <div className="text-sm text-green-700">SMIT Staff</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <IdCard className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900">{radiographers.length}</div>
                  <div className="text-sm text-purple-700">Radiographers</div>
                </div>
              </div>

              {/* Staff List */}
              <div className="space-y-6">
                {/* SMIT Staff Section */}
                {smitStaff.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Badge className="w-5 h-5 text-blue-600" />
                      <span>SMIT Staff ({smitStaff.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {smitStaff.map((staff) => (
                        <div key={staff.code} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-blue-600" />
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {staff.title}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{staff.code}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{staff.name}</div>
                              {staff.firstName && staff.surname && (
                                <div className="text-xs text-gray-600">
                                  {staff.firstName} {staff.surname}
                                </div>
                              )}
                            </div>
                            
                            {staff.employeeId && (
                              <div className="flex items-center space-x-2">
                                <IdCard className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600 font-mono">{staff.employeeId}</span>
                              </div>
                            )}
                            
                            {staff.salary && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600">{formatSalary(staff.salary)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MIT Staff Section */}
                {mitStaff.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <User className="w-5 h-5 text-green-600" />
                      <span>MIT Staff ({mitStaff.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mitStaff.map((staff) => (
                        <div key={staff.code} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <User className="w-5 h-5 text-green-600" />
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                {staff.title}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{staff.code}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{staff.name}</div>
                              {staff.firstName && staff.surname && (
                                <div className="text-xs text-gray-600">
                                  {staff.firstName} {staff.surname}
                                </div>
                              )}
                            </div>
                            
                            {staff.employeeId && (
                              <div className="flex items-center space-x-2">
                                <IdCard className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600 font-mono">{staff.employeeId}</span>
                              </div>
                            )}
                            
                            {staff.salary && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600">{formatSalary(staff.salary)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Radiographers Section */}
                {radiographers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <IdCard className="w-5 h-5 text-purple-600" />
                      <span>Radiographers ({radiographers.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {radiographers.map((staff) => (
                        <div key={staff.code} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <IdCard className="w-5 h-5 text-purple-600" />
                              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                Radiographer
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{staff.code}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{staff.name}</div>
                              {staff.firstName && staff.surname && (
                                <div className="text-xs text-gray-600">
                                  {staff.firstName} {staff.surname}
                                </div>
                              )}
                            </div>
                            
                            {staff.employeeId && (
                              <div className="flex items-center space-x-2">
                                <IdCard className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600 font-mono">{staff.employeeId}</span>
                              </div>
                            )}
                            
                            {staff.salary && (
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600">{formatSalary(staff.salary)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Helper function to format salary
const formatSalary = (salary: number) => {
  return `Rs ${salary.toLocaleString('en-US')}`;
};