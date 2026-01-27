import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Plus, Edit, Trash2, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStaffData } from '../hooks/useStaffData';
import { addStaffMember, updateStaffMember, deleteStaffMember, StaffMember } from '../utils/staffApi';

// Define the props interface
interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminAuthenticated: boolean;
  adminName: string | null;
}

// Define the form data interface
interface StaffFormData {
  code: string;
  title: string;
  salary: number;
  employeeId: string;
  firstName: string;
  surname: string;
  name: string;
}

export const StaffManagementModal = ({
  isOpen,
  onClose,
  isAdminAuthenticated,
  adminName
}: StaffManagementModalProps) => {
  const { staffMembers, loading, error, realtimeStatus, loadStaffMembers } = useStaffData();
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    code: '',
    title: 'MIT',
    salary: 0,
    employeeId: '',
    firstName: '',
    surname: '',
    name: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'save' | 'delete' | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add import function
  const handleImportLocalStaff = async () => {
    if (!isAdminAuthenticated) {
      alert('Admin authentication required');
      return;
    }

    setIsSaving(true);
    
    try {
      // Get the hardcoded staff data (excluding ADMIN)
      const localStaffData = [
        { code: 'B165', name: 'BHEKUR', title: 'MIT', salary: 47510, employeeId: 'B1604812300915', firstName: 'Yashdev', surname: 'BHEKUR' },
        { code: 'B196', name: 'BHOLLOORAM', title: 'MIT', salary: 47510, employeeId: 'B1911811805356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
        { code: 'D28B', name: 'DHUNNY', title: 'MIT', salary: 30060, employeeId: 'D280487461277B', firstName: 'Leelarvind', surname: 'DHUNNY' },
        { code: 'D07D', name: 'DOMUN', title: 'SMIT', salary: 59300, employeeId: 'D070273400031D', firstName: 'Sheik Ahmad Shamir', surname: 'DOMUN' },
        { code: 'H301', name: 'FOKEERCHAND', title: 'MIT', salary: 37185, employeeId: 'H3003861200061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
        { code: 'S069', name: 'GHOORAN', title: 'MIT', salary: 48810, employeeId: 'S0607814601039', firstName: 'Bibi Shafinaaz', surname: 'SAMTALLY-GHOORAN' },
        { code: 'H13D', name: 'HOSENBUX', title: 'MIT', salary: 48810, employeeId: 'H130381180129D', firstName: 'Zameer', surname: 'HOSENBUX' },
        { code: 'J149', name: 'JUMMUN', title: 'MIT', salary: 47510, employeeId: 'J1403792600909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
        { code: 'M17G', name: 'MAUDHOO', title: 'MIT', salary: 39470, employeeId: 'M170380260096G', firstName: 'Chandanee', surname: 'MAUDHOO' },
        { code: 'N28C', name: 'NARAYYA', title: 'MIT', salary: 39470, employeeId: 'N280881240162C', firstName: 'Viraj', surname: 'NARAYYA' },
        { code: 'P09A', name: 'PITTEA', title: 'SMIT', salary: 59300, employeeId: 'P091171190413A', firstName: 'Soubiraj', surname: 'PITTEA' },
        { code: 'R16G', name: 'RUNGADOO', title: 'SMIT', salary: 59300, employeeId: 'R210572400118G', firstName: 'Manee', surname: 'RUNGADOO' },
        { code: 'T16G', name: 'TEELUCK', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
        { code: 'V160', name: 'VEERASAWMY', title: 'SMIT', salary: 59300, employeeId: 'V1604664204410', firstName: 'Goindah', surname: 'VEERASAWMY' },
        
        // Radiographers (R) - Same person, different roster designation
        { code: 'B16R', name: 'BHEKUR(R)', title: 'MIT', salary: 47510, employeeId: 'B16048123000915', firstName: 'Yashdev', surname: 'BHEKUR' },
        { code: 'B19R', name: 'BHOLLOORAM(R)', title: 'MIT', salary: 47510, employeeId: 'B19118118005356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
        { code: 'D28R', name: 'DHUNNY(R)', title: 'MIT', salary: 30060, employeeId: '0280876127778', firstName: 'Leetarvind', surname: 'DHUNNY' },
        { code: 'D07R', name: 'DOMUN(R)', title: 'SMIT', salary: 59300, employeeId: 'D07027340003110', firstName: 'Shamir', surname: 'DOMUN' },
        { code: 'H30R', name: 'FOKEERCHAND(R)', title: 'MIT', salary: 37185, employeeId: 'H30038612000061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
        { code: 'H13R', name: 'HOSENBUX(R)', title: 'MIT', salary: 48810, employeeId: 'H13038118012901', firstName: 'Zameer', surname: 'HOSENBUX' },
        { code: 'S06R', name: 'GHOORAN(R)', title: 'MIT', salary: 48810, employeeId: 'S06781460103939', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
        { code: 'J14R', name: 'JUMMUN(R)', title: 'MIT', salary: 47510, employeeId: 'J14037926000909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
        { code: 'M17R', name: 'MAUDHOO(R)', title: 'MIT', salary: 39470, employeeId: 'M17038026006966', firstName: 'Chandanee', surname: 'MAUDHOO' },
        { code: 'N28R', name: 'NARAYYA(R)', title: 'MIT', salary: 39470, employeeId: 'N280881240162C', firstName: 'Viraj', surname: 'NARAYYA' },
        { code: 'P09R', name: 'PITTEA(R)', title: 'SMIT', salary: 59300, employeeId: 'P09117119004134', firstName: 'Subiraj', surname: 'PITTEA' },
        { code: 'R21R', name: 'RUNGADOO(R)', title: 'SMIT', salary: 59300, employeeId: 'R21057240011866', firstName: 'Manee', surname: 'RUNGADOO' },
        { code: 'T16R', name: 'TEELUCK(R)', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
        { code: 'V16R', name: 'VEERASAWMY(R)', title: 'SMIT', salary: 59300, employeeId: 'V16046642044100', firstName: 'Goindah', surname: 'VEERASAWMY' }
      ];
      
      // Filter out (R) variants - only import base names
      const filteredStaffData = localStaffData.filter(staff => !staff.name.includes('(R)'));
      
      // Check which staff members already exist in the database
      const existingStaffCodes = new Set(staffMembers.map(staff => staff.code));
      
      let importedCount = 0;
      let skippedCount = 0;
      
      for (const staff of filteredStaffData) {
        try {
          // Only import if staff member doesn't already exist
          if (!existingStaffCodes.has(staff.code)) {
            await addStaffMember({
              code: staff.code,
              name: staff.name,
              title: staff.title,
              salary: staff.salary,
              employee_id: staff.employeeId,
              first_name: staff.firstName,
              surname: staff.surname,
              is_active: true,
              last_updated_by: adminName || 'ADMIN'
            }, adminName || 'ADMIN');
            
            importedCount++;
          } else {
            // Skip existing staff members to preserve any manual updates
            skippedCount++;
            console.log(`Skipping existing staff member: ${staff.name} (${staff.code})`);
          }
        } catch (error) {
          console.error(`Error importing staff member ${staff.name}:`, error);
          // Continue with other staff members
        }
      }
      
      // Refresh staff data
      await loadStaffMembers();
      
      setSuccessMessage(`Imported ${importedCount} new staff members. Skipped ${skippedCount} existing members to preserve updates.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      alert(`Failed to import staff data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
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
      surname: '',
      name: ''
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
    } else if (staffMembers.some((staff: StaffMember) => staff.code === formData.code && staff.code !== editingStaff?.code)) {
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

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      code: staff.code,
      title: staff.title,
      salary: staff.salary,
      employeeId: staff.employee_id,
      firstName: staff.first_name,
      surname: staff.surname,
      name: staff.name
    });
    setShowForm(true);
  };

  const handleDelete = (staff: StaffMember) => {
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
        ? `Save changes to ${formData.name || formData.surname}?`
        : `Add new staff member ${formData.surname}?`
    );
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    setIsSaving(true);
    
    try {
      if (confirmationAction === 'save') {
        const staffData: Partial<StaffMember> = {
          code: formData.code,
          name: formData.name || formData.surname,
          title: formData.title,
          salary: formData.salary,
          employee_id: formData.employeeId,
          first_name: formData.firstName,
          surname: formData.surname,
          last_updated_by: adminName || 'ADMIN'
        };

        if (editingStaff) {
          // Update existing staff
          await updateStaffMember(editingStaff.id, staffData, adminName || 'ADMIN');
          
          setSuccessMessage(`${formData.name || formData.surname} updated successfully!`);
        } else {
          // Add new staff
          await addStaffMember({
            ...staffData,
            is_active: true,
            last_updated_by: adminName || 'ADMIN'
          } as Omit<StaffMember, 'id' | 'created_at' | 'updated_at'>, adminName || 'ADMIN');
          
          setSuccessMessage(`${formData.surname} added successfully!`);
        }
        
        // Refresh staff data
        await loadStaffMembers();
        
        resetForm();
      } else if (confirmationAction === 'delete' && editingStaff) {
        // Delete staff
        await deleteStaffMember(editingStaff.id, adminName || 'ADMIN');
        
        setSuccessMessage(`${editingStaff.name} deleted successfully!`);
        
        // Refresh staff data
        await loadStaffMembers();
        
        resetForm();
      }
      
      // Show success message
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
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

  const handleFormChange = (field: keyof StaffFormData, value: string | number | boolean) => {
    setFormData((prev: StaffFormData) => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  // Filter out ADMIN and (R) variants from the list for display
  const displayStaffList = staffMembers.filter((staff: StaffMember) => 
    staff.name !== 'ADMIN' && !staff.name.includes('(R)')
  );

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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 flex-shrink-0 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <User className={`w-6 h-6 ${
                  realtimeStatus === 'connected' ? 'text-green-600' : 
                  realtimeStatus === 'connecting' ? 'text-yellow-600' :
                  realtimeStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Staff Management</h3>
                <p className="text-sm text-gray-600">
                  Manage staff details and authentication codes
                  {realtimeStatus === 'connected' && <span className="text-green-600 ml-2">• Live sync active</span>}
                  {realtimeStatus === 'error' && <span className="text-red-600 ml-2" title="Real-time sync is not working. Data may not update automatically.">• Sync error</span>}
                  {realtimeStatus === 'connecting' && <span className="text-yellow-600 ml-2">• Connecting...</span>}
                </p>
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

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 font-medium">{error}</span>
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
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin" />
                  <span className="ml-3 text-gray-600">Loading staff data...</span>
                </div>
              )}

              {/* Add New Button */}
              {!loading && (
                <div className="flex justify-between items-center">
                <div className="w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Staff Members ({displayStaffList.length})
                    </h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddNew}
                        disabled={!isAdminAuthenticated}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Database Setup Instructions */}
                  {(error && typeof error === 'string' && error.includes('does not exist')) || staffMembers.length === 0 || true && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">
                            {error && typeof error === 'string' && error.includes('does not exist') ? 'Database Setup Required' : 
                             staffMembers.length === 0 ? 'Import Staff Data' : 'Re-import Staff Data'}
                          </h5>
                          <p className="text-sm text-blue-700 mb-3">
                            {error && typeof error === 'string' && error.includes('does not exist') ? 
                              'The staff_members table doesn\'t exist yet. Follow these steps to enable shared staff management:' :
                              staffMembers.length === 0 ? 
                                'Import the local staff data into the Supabase database to enable shared staff management:' :
                                'Re-import the latest staff data (including updated salaries) to refresh the database:'
                            }
                          </p>
                          
                          {error && typeof error === 'string' && error.includes('does not exist') && (
                            <>
                              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                                <li>Go to your Supabase dashboard</li>
                                <li>Open the SQL Editor</li>
                                <li>Copy and paste the SQL code below</li>
                                <li>Click "Run" to create the table</li>
                                <li>Come back here and click "Import Staff Data"</li>
                              </ol>
                              
                              <div className="mt-3 p-3 bg-white border border-blue-300 rounded font-mono text-xs overflow-x-auto">
                                <pre>{`-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  title text DEFAULT 'MIT',
  salary integer DEFAULT 0,
  employee_id text DEFAULT '',
  first_name text DEFAULT '',
  surname text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_updated_by text DEFAULT 'SYSTEM'
);

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations on staff members" 
ON staff_members FOR ALL USING (true);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_updated_at();`}</pre>
                              </div>
                            </>
                          )}
                          
                          <button
                            onClick={handleImportLocalStaff}
                            disabled={!isAdminAuthenticated || isSaving}
                            className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
                          >
                            {isSaving ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Import Staff Data to Database</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Staff List */}
              {!loading && (
                <div className="space-y-3">
                {displayStaffList.map((staff: StaffMember) => (
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
                            <span className="font-medium">Full Name:</span> {staff.first_name} {staff.surname}
                          </div>
                          <div>
                            <span className="font-medium">Salary:</span> Rs {staff.salary.toLocaleString()}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-medium">Employee ID:</span> {staff.employee_id || 'Not set'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Below staff info */}
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(staff)}
                          disabled={!isAdminAuthenticated}
                          className="w-full sm:flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(staff)}
                          disabled={!isAdminAuthenticated}
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
              )}
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
                    disabled={!isAdminAuthenticated}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                      formErrors.code ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter unique code"
                  />
                  {formErrors.code && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
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
                    disabled={!isAdminAuthenticated}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MIT">MIT</option>
                    <option value="SMIT">SMIT</option>
                    <option value="R">R</option>
                  </select>
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
                    disabled={!isAdminAuthenticated}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.surname ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter surname"
                  />
                  {formErrors.surname && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.surname}</p>
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
                    disabled={!isAdminAuthenticated}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleFormChange('employeeId', e.target.value)}
                    disabled={!isAdminAuthenticated}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="Enter employee ID"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Salary (Rs)
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleFormChange('salary', Number(e.target.value))}
                    disabled={!isAdminAuthenticated}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.salary ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter salary"
                    min="0"
                  />
                  {formErrors.salary && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.salary}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={resetForm}
                  disabled={!isAdminAuthenticated}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isAdminAuthenticated || isSaving}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
              </div>
              <p className="text-gray-700 mb-6">{confirmationMessage}</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelConfirmation}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {isSaving ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default StaffManagementModal;