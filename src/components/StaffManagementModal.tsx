import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Plus, Edit, Trash2, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { authCodes, AuthCode, updateAuthCodes } from '../utils/rosterAuth';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminAuthenticated: boolean;
  adminName: string | null;
}

interface StaffFormData {
  code: string;
  title: string;
  salary: number;
  employeeId: string;
  firstName: string;
  surname: string;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  isAdminAuthenticated,
  adminName
}) => {
  const [staffList, setStaffList] = useState<AuthCode[]>([]);
  const [editingStaff, setEditingStaff] = useState<AuthCode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    code: '',
    title: 'MIT',
    salary: 0,
    employeeId: '',
    firstName: '',
    surname: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'save' | 'delete' | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load staff data when modal opens
  useEffect(() => {
    if (isOpen) {
      setStaffList([...authCodes]);
      resetForm();
    }
  }, [isOpen]);

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

  const resetForm = () => {
    setFormData({
      code: '',
      title: 'MIT',
      salary: 0,
      employeeId: '',
      firstName: '',
      surname: ''
    });
    setFormErrors({});
    setEditingStaff(null);
    setShowForm(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (formData.code.length < 3) {
      errors.code = 'Code must be at least 3 characters';
    } else if (staffList.some(staff => staff.code === formData.code && staff.code !== editingStaff?.code)) {
      errors.code = 'Code already exists';
    }

    if (!formData.surname.trim()) {
      errors.surname = 'Surname is required';
    }

    if (formData.salary < 0) {
      errors.salary = 'Salary must be positive';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (staff: AuthCode) => {
    setEditingStaff(staff);
    setFormData({
      code: staff.code,
      title: staff.title || 'MIT',
      salary: staff.salary || 0,
      employeeId: staff.employeeId || '',
      firstName: staff.firstName || '',
      surname: staff.surname || ''
    });
    setShowForm(true);
  };

  const handleDelete = (staff: AuthCode) => {
    if (staff.code === '5274') {
      alert('Cannot delete ADMIN account');
      return;
    }
    
    setConfirmationAction('delete');
    setConfirmationMessage(`Are you sure you want to delete ${staff.name}? This action cannot be undone.`);
    setEditingStaff(staff);
    setShowConfirmation(true);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    setConfirmationAction('save');
    setConfirmationMessage(
      editingStaff 
        ? `Save changes to ${formData.surname}?`
        : `Add new staff member ${formData.surname}?`
    );
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    setIsSaving(true);
    
    try {
      if (confirmationAction === 'save') {
        const newStaff: AuthCode = {
          code: formData.code,
          name: formData.surname, // Use surname as the name
          title: formData.title,
          salary: formData.salary,
          employeeId: formData.employeeId,
          firstName: formData.firstName,
          surname: formData.surname
        };

        if (editingStaff) {
          // Update existing staff
          const updatedList = staffList.map(staff => 
            staff.code === editingStaff.code ? newStaff : staff
          );
          setStaffList(updatedList);
          
          // Update the actual rosterAuth.ts file
          await updateAuthCodes(updatedList);
          
          setSuccessMessage(`${formData.surname} updated successfully!`);
        } else {
          // Add new staff
          const updatedList = [...staffList, newStaff];
          setStaffList(updatedList);
          
          // Update the actual rosterAuth.ts file
          await updateAuthCodes(updatedList);
          
          setSuccessMessage(`${formData.surname} added successfully!`);
        }
        
        resetForm();
      } else if (confirmationAction === 'delete' && editingStaff) {
        // Delete staff
        const updatedList = staffList.filter(staff => staff.code !== editingStaff.code);
        setStaffList(updatedList);
        
        // Update the actual rosterAuth.ts file
        await updateAuthCodes(updatedList);
        
        setSuccessMessage(`${editingStaff.name} deleted successfully!`);
        resetForm();
      }
      
      // Show success message
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Staff management error:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
      setShowConfirmation(false);
      setConfirmationAction(null);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setConfirmationAction(null);
    setConfirmationMessage('');
  };

  const handleFormChange = (field: keyof StaffFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  // Filter out ADMIN from the list for display
  const displayStaffList = staffList.filter(staff => staff.name !== 'ADMIN');

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px',
        paddingTop: '8px',
        overflow: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !showConfirmation) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: '90vw',
          maxHeight: '95vh',
          margin: '8px 0',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 flex-shrink-0 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Staff Management</h3>
                <p className="text-sm text-gray-600">Manage staff details and authentication codes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={showConfirmation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          {!showForm ? (
            /* Staff List View */
            <div className="space-y-4">
              {/* Add New Button */}
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-gray-900">
                  Staff Members ({displayStaffList.length})
                </h4>
                <button
                  onClick={handleAddNew}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New</span>
                </button>
              </div>

              {/* Staff List */}
              <div className="space-y-3">
                {displayStaffList.map((staff) => (
                  <div key={staff.code} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex flex-col space-y-3">
                      {/* Staff Information */}
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                            {staff.code}
                          </span>
                          <span className="font-semibold text-gray-900">{staff.name}</span>
                          <span className="text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded">
                            {staff.title}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Full Name:</span> {staff.firstName} {staff.surname}
                          </div>
                          <div>
                            <span className="font-medium">Salary:</span> Rs {(staff.salary || 0).toLocaleString()}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-medium">Employee ID:</span> {staff.employeeId || 'Not set'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Below staff info */}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="w-full sm:flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(staff)}
                          className="w-full sm:flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Add/Edit Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h4>
                <button
                  onClick={resetForm}
                  className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                      formErrors.code ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., B165"
                    maxLength={4}
                  />
                  {formErrors.code && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.code}</p>
                  )}
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Viraj"
                  />
                </div>

                {/* Surname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surname *
                  </label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => handleFormChange('surname', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.surname ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., NARAYYA"
                  />
                  {formErrors.surname && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.surname}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MIT">MIT</option>
                    <option value="SMIT">SMIT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary (Rs)
                  </label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => handleFormChange('salary', Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.salary ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 38010"
                    min="0"
                  />
                  {formErrors.salary && (
                    <p className="text-sm text-red-600 mt-1">{formErrors.salary}</p>
                  )}
                </div>

                {/* Employee ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleFormChange('employeeId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., N280881240162C"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingStaff ? 'Update' : 'Add'} Staff</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warning Note */}
        <div className="border-t border-gray-200 p-4 bg-amber-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Changes made here are temporary and will be lost on page refresh. 
              This is a preview feature for testing staff management functionality.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-[99999] flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  confirmationAction === 'delete' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {confirmationAction === 'delete' ? (
                    <Trash2 className="w-6 h-6 text-red-600" />
                  ) : (
                    <Save className="w-6 h-6 text-blue-600" />
                  )}
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Confirm Action
              </h4>
              
              <p className="text-gray-700 text-center mb-6">
                {confirmationMessage}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelConfirmation}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 ${
                    confirmationAction === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {confirmationAction === 'delete' ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};