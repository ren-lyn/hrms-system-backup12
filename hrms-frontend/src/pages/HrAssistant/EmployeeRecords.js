import React, { useEffect, useState, useCallback, useReducer } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Spinner, Dropdown } from 'react-bootstrap';
import EvaluationResult from '../../components/Manager/EvaluationResult';
import { FaEye, FaUserSlash, FaUserTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ValidationModal from '../../components/common/ValidationModal';
import useValidationModal from '../../hooks/useValidationModal';
import './EmployeeRecords.css'; // Import custom styles

const EmployeeRecords = () => {
  const { modalState, showSuccess, showError, showWarning, showInfo, hideModal } = useValidationModal();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [terminatingEmployee, setTerminatingEmployee] = useState(null);
  const [terminationForm, setTerminationForm] = useState({
    termination_date: new Date().toISOString().split('T')[0],
    termination_reason: '',
    termination_notes: '',
    status: 'terminated' // default to 'terminated', can be changed to 'resigned'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [changedFields, setChangedFields] = useState([]);
  const [originalFormData, setOriginalFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'resigned', 'terminated'
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  // New state for View Employee Record modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  // Evaluation Results modal state
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResults, setEvalResults] = useState([]); // list of summaries
  const [selectedEvalId, setSelectedEvalId] = useState(null);
  const [evalDetail, setEvalDetail] = useState(null);
  
  // Session monitoring
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  
  // Track employees that were just saved to remove highlighting
  const [justSavedEmployees, setJustSavedEmployees] = useState(new Set());
  
  // Field edit restrictions
  const [fieldEditCounts, setFieldEditCounts] = useState({});
  const [isFirstSave, setIsFirstSave] = useState(true);
  
  // Define field categories for edit restrictions
  const nonEditableAfterSave = [
    'first_name', 'last_name', 'nickname', 'place_of_birth', 'birth_date',
    'position', 'department', 'employment_status', 'hire_date', 'salary', 'tenurity',
    'sss', 'philhealth', 'pagibig', 'tin_no'
  ];
  
  const limitedEditFields = [
    'civil_status', 'gender', 'email', 'contact_number', 'emergency_contact_name', 'emergency_contact_phone',
    'province', 'barangay', 'city', 'postal_code', 'present_address'
  ];
  
  const maxEditCount = 3;
  
  // Function to check if a field can be edited
  const canEditField = (fieldName) => {
    // If it's a new employee (not editing), all fields can be edited
    if (!editingEmployee) return true;
    
    // Non-editable fields after first save cannot be changed
    if (nonEditableAfterSave.includes(fieldName)) {
      return false;
    }
    
    // Limited edit fields can be changed up to 3 times
    if (limitedEditFields.includes(fieldName)) {
      const editCount = fieldEditCounts[fieldName] || 0;
      return editCount < maxEditCount;
    }
    
    // All other fields can be edited freely
    return true;
  };
  
  // Function to get remaining edit count for a field
  const getRemainingEdits = (fieldName) => {
    if (!limitedEditFields.includes(fieldName)) return null;
    const editCount = fieldEditCounts[fieldName] || 0;
    return Math.max(0, maxEditCount - editCount);
  };

  const roleMap = {
    'HR Assistant': 1,
    'HR Staff': 2,
    'Manager': 3,
    'Employee': 4,
  };

  const [formData, setFormData] = useState({
    // Personal Information
    email: '', password: '',
    first_name: '', last_name: '', nickname: '',
    civil_status: '', gender: '', place_of_birth: '', birth_date: '', age: '',
    
    // Contact Information
    contact_number: '', emergency_contact_name: '', emergency_contact_phone: '',
    
    // Address Information
    province: '', barangay: '', city: '', postal_code: '', present_address: '',
    
    // Employment Overview
    position: '', role_id: '', department: '', employment_status: '',
    tenurity: '', hire_date: '', salary: '', sss: '', philhealth: '', pagibig: '', tin_no: '',
    
    // Termination (optional)
    termination_date: '', termination_reason: '', termination_remarks: '',
  });


  // Function to validate if current token is valid
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSessionValid(false);
      return false;
    }
    
    try {
      // Test the token with a simple API call
      await axios.get('http://localhost:8000/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessionValid(true);
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setSessionValid(false);
        return false;
      }
      return true; // Other errors don't necessarily mean invalid token
    }
  };

  // ✅ Common error handler
  const handleAxiosError = (error, defaultMessage) => {
    console.error('Axios error:', error);

    if (error.response) {
      if (error.response.status === 401) {
        // Note: 401 errors in handleSubmit are handled separately
        // This handler is for other 401 errors (like in fetchEmployees)
        showError('Authentication failed. Please refresh the page and try again.');
        localStorage.removeItem('token');
      } else if (error.response.status === 403) {
        showError('Access denied. You don\'t have permission to perform this action.');
      } else if (error.response.status === 404) {
        showWarning('Resource not found.');
      } else if (error.response.status === 409) {
        // ✅ Handle duplicate email or name
        const message = error.response.data?.message || '';
        if (message.toLowerCase().includes('email')) {
          showError('Email already exists. Please use a different email address.');
        } else if (message.toLowerCase().includes('name')) {
          showError('An employee with the same first and last name already exists.');
        } else {
          showError(message || 'Conflict error. Please check your input.');
        }
      } else if (error.response.status === 422) {
        const validationErrors = error.response.data.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat();
          showError(`Validation error: ${errorMessages.join(', ')}`);
        } else {
          showError('Validation failed. Please check your input.');
        }
      } else if (error.response.status >= 500) {
        showError('Server error occurred. Please try again later.');
      } else {
        showError(error.response.data?.message || defaultMessage);
      }
    } else if (error.request) {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ERR_NETWORK') {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ECONNABORTED') {
      showError('Request timed out. Please try again.');
    } else {
      showError(defaultMessage);
    }
  };


  // Fetch employees
  const fetchEmployees = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        showError('Authentication token not found. Please log in again.');
        return;
      }

      console.log('Fetching employees from API...');
      const response = await axios.get('http://localhost:8000/api/employees', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      console.log('API Response:', response);
      
      // Handle different response structures
      let employeesData = [];
      if (response.data) {
        // Handle case where data is directly an array
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } 
        // Handle case where data is nested under a data property
        else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        }
        // Handle case where data is an object with employees property
        else if (response.data.employees && Array.isArray(response.data.employees)) {
          employeesData = response.data.employees;
        }
      }

      console.log('Processed employees data:', employeesData);
      
      // Check for recently updated profiles (within last 2 minutes for quick notification)
      const recentlyUpdated = employeesData.filter(emp => 
        emp && emp.employee_profile?.updated_at && 
        new Date(emp.employee_profile.updated_at) > new Date(Date.now() - 2 * 60 * 1000)
      );
      
      setEmployees(employeesData);
      setRecentUpdates(prevUpdates => {
        // Only keep updates from the last 5 minutes to prevent memory leaks
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return [
          ...prevUpdates.filter(update => 
            new Date(update.employee_profile?.updated_at) > fiveMinutesAgo
          ),
          ...recentlyUpdated
        ];
      });
      setLastRefresh(new Date());
      
      // Only notify about new updates (not already in recentUpdates) and not during silent refresh
      if (!silent && recentlyUpdated.length > 0) {
        const newUpdates = recentlyUpdated.filter(newEmp => 
          !recentUpdates.some(existing => existing.id === newEmp.id)
        );
        
        if (newUpdates.length > 0) {
          const employeeNames = newUpdates.slice(0, 2).map(emp => 
            `${emp.employee_profile?.first_name || ''} ${emp.employee_profile?.last_name || ''}`.trim() || 'An employee'
          ).join(', ');
          const moreText = newUpdates.length > 2 ? ` +${newUpdates.length - 2} more` : '';
          
          // Small delay to avoid conflicts with other notifications
          setTimeout(() => {
            showSuccess(`✨ ${employeeNames}${moreText} updated their profile`);
          }, 100);
        }
      }

      if (employeesData.length === 0) {
        console.warn('No employee data found in the response');
        showInfo('No employees found.');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.status === 401) {
          // Handle unauthorized (token expired/invalid)
          showError('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          // Redirect to login or refresh token if you have refresh token logic
          window.location.href = '/login';
          return;
        }
        
        showError(error.response.data.message || 'Failed to load employee records. Please try again.');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        showError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        showError('Failed to load employee records. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const handleNewEmployeeRecord = (event) => {
      const profile = event?.detail;

      if (!profile) {
        return;
      }

      fetchEmployees(true);

      const userId = profile.user?.id || profile.user_id;

      if (userId) {
        setJustSavedEmployees((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });

        setTimeout(() => {
          setJustSavedEmployees((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }, 3 * 60 * 1000);
      }

      const firstName =
        profile.first_name || profile.user?.first_name || "New";
      const lastName = profile.last_name || profile.user?.last_name || "Employee";

      if (showSuccess) {
        showSuccess(
          `Employee ${firstName} ${lastName}`.trim() +
            " has been added to Employee Records."
        );
      }
    };

    window.addEventListener(
      "employee-records:new-entry",
      handleNewEmployeeRecord
    );

    return () => {
      window.removeEventListener(
        "employee-records:new-entry",
        handleNewEmployeeRecord
      );
    };
  }, [fetchEmployees, showSuccess]);

  // Auto-clear notifications and highlighting after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      // Update recent updates list to remove expired ones
      setRecentUpdates(prev => 
        prev.filter(emp => 
          emp.employee_profile?.updated_at && 
          new Date(emp.employee_profile.updated_at) > new Date(Date.now() - 2 * 60 * 1000)
        )
      );
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Background refresh when page becomes visible (to catch employee updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchEmployees(true); // Silent refresh when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchEmployees]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Check if field can be edited
    if (!canEditField(name)) {
      if (nonEditableAfterSave.includes(name)) {
        showWarning(`${name.replace('_', ' ').toUpperCase()} cannot be changed once saved.`);
      } else if (limitedEditFields.includes(name)) {
        showWarning(`You have reached the maximum edit limit (${maxEditCount}) for ${name.replace('_', ' ').toUpperCase()}.`);
      }
      return; // Don't allow the change
    }
    
    let updates = { [name]: value };
    
    // Track changed fields and update edit counts for limited edit fields
    if (editingEmployee && originalFormData[name] !== value) {
      setChangedFields(prev => {
        const newChanged = [...prev];
        if (!newChanged.includes(name)) {
          newChanged.push(name);
        }
        return newChanged;
      });
      
      // Update edit count for limited edit fields
      if (limitedEditFields.includes(name)) {
        setFieldEditCounts(prev => ({
          ...prev,
          [name]: (prev[name] || 0) + 1
        }));
      }
    } else if (editingEmployee && originalFormData[name] === value) {
      // Remove from changed fields if reverted to original
      setChangedFields(prev => prev.filter(field => field !== name));
    }
    
    // Auto-set role_id when position changes
    if (name === 'position') {
      updates.role_id = roleMap[value] || null;
    }
    
    // Auto-calculate age when birth_date changes
    if (name === 'birth_date' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age >= 0) {
        updates.age = age;
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate token before proceeding
    const isTokenValid = await validateToken();
    if (!isTokenValid) {
      showError('Your session has expired. Please log in again.');
      setTimeout(() => {
        if (window.confirm('Your session has expired. Would you like to go to the login page?')) {
          window.location.href = '/login';
        }
      }, 2000);
      return;
    }
    
    const token = localStorage.getItem('token');

    if (!formData.email || !formData.first_name || !formData.last_name) {
      showError('Please fill in all required fields (Email, First Name, Last Name).');
      return;
    }

    if (!editingEmployee && !formData.password) {
      showError('Password is required for new employees.');
      return;
    }

    const loadingToast = toast.loading(editingEmployee ? 'Updating employee...' : 'Adding employee...');
    setIsSaving(true);

    try {
      // Clean formData: remove empty role_id or convert to integer
      const cleanedFormData = { ...formData };
      if (cleanedFormData.role_id === '' || cleanedFormData.role_id === null || cleanedFormData.role_id === undefined) {
        delete cleanedFormData.role_id;
      } else {
        // Ensure role_id is an integer
        cleanedFormData.role_id = parseInt(cleanedFormData.role_id, 10);
        if (isNaN(cleanedFormData.role_id)) {
          delete cleanedFormData.role_id;
        }
      }

      if (editingEmployee) {
        await axios.put(
          `http://localhost:8000/api/employees/${editingEmployee.id}`,
          cleanedFormData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.dismiss(loadingToast);
        
        // Show success message first
        showSuccess(`Employee ${formData.first_name} ${formData.last_name} updated successfully!`);
        
        // Add employee to just-saved list to remove highlighting immediately
        setJustSavedEmployees(prev => new Set([...prev, editingEmployee.id]));
        
        // Force immediate clearing of highlights by updating state
        setChangedFields([]);
        setOriginalFormData({});
        setIsSaving(false);
        
        // Force React to re-render immediately to clear highlights
        setTimeout(() => forceUpdate(), 10);
        
        // Clear the just-saved status after 3 minutes to prevent memory buildup
        setTimeout(() => {
          setJustSavedEmployees(prev => {
            const newSet = new Set(prev);
            newSet.delete(editingEmployee.id);
            return newSet;
          });
        }, 3 * 60 * 1000); // 3 minutes
        
        // Small delay to let user see the success message and cleared highlights
        setTimeout(() => {
          setShowModal(false);
          setEditingEmployee(null);
          fetchEmployees(true); // Silent refresh to avoid duplicate notifications
          // Reset form data after modal closes
          setFormData({
            // Personal Information
            email: '', password: '',
            first_name: '', last_name: '', nickname: '',
            civil_status: '', gender: '', place_of_birth: '', birth_date: '', age: '',
            
            // Contact Information
            contact_number: '', emergency_contact_name: '', emergency_contact_phone: '',
            
            // Address Information
            province: '', barangay: '', city: '', postal_code: '', present_address: '',
            
            // Employment Overview
            position: '', role_id: '', department: '', employment_status: '',
            tenurity: '', hire_date: '', salary: '', sss: '', philhealth: '', pagibig: '', tin_no: '',
            
            // Termination (optional)
            termination_date: '', termination_reason: '', termination_remarks: '',
          });
        }, 1500);
      } else {
        await axios.post(
          'http://localhost:8000/api/employees',
          cleanedFormData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.dismiss(loadingToast);
        showSuccess(`Employee ${formData.first_name} ${formData.last_name} added successfully!`);
        
        setShowModal(false);
        fetchEmployees(true); // Silent refresh to avoid duplicate notifications
        setEditingEmployee(null);
        setChangedFields([]);
        setOriginalFormData({});
        setIsSaving(false);
        setFormData({
          // Personal Information
          email: '', password: '',
          first_name: '', last_name: '', nickname: '',
          civil_status: '', gender: '', place_of_birth: '', birth_date: '', age: '',
          
          // Contact Information
          contact_number: '', emergency_contact_name: '', emergency_contact_phone: '',
          
          // Address Information
          province: '', barangay: '', city: '', postal_code: '', present_address: '',
          
          // Employment Overview
          position: '', role_id: '', department: '', employment_status: '',
          tenurity: '', hire_date: '', salary: '', sss: '', philhealth: '', pagibig: '', tin_no: '',
          
          // Termination (optional)
          termination_date: '', termination_reason: '', termination_remarks: '',
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      setIsSaving(false);
        
      // Immediate cleanup for authentication errors
      if (error.response?.status === 401) {
        // Clear invalid token immediately
        localStorage.removeItem('token');
        
        // Close modal and reset all state immediately
        setShowModal(false);
        setEditingEmployee(null);
        setChangedFields([]);
        setOriginalFormData({});
        setFormData({
          // Personal Information
          email: '', password: '',
          first_name: '', last_name: '', nickname: '',
          civil_status: '', gender: '', place_of_birth: '', birth_date: '', age: '',
          
          // Contact Information
          contact_number: '', emergency_contact_name: '', emergency_contact_phone: '',
          
          // Address Information
          province: '', barangay: '', city: '', postal_code: '', present_address: '',
          
          // Employment Overview
          position: '', role_id: '', department: '', employment_status: '',
          tenurity: '', hire_date: '', salary: '', sss: '', philhealth: '', pagibig: '', tin_no: '',
          
          // Termination (optional)
          termination_date: '', termination_reason: '', termination_remarks: '',
        });
        
        // Show authentication specific error message
        showError('Session expired. Please log in again.');
        
        // Offer to redirect to login after a short delay
        setTimeout(() => {
          if (window.confirm('Your session has expired. Would you like to go to the login page?')) {
            window.location.href = '/login';
          }
        }, 1500);
        
        return; // Exit early, don't call handleAxiosError
      }
        
      // Handle other types of errors
      handleAxiosError(error, editingEmployee ? 'Failed to update employee. Please try again.' : 'Failed to add employee. Please try again.');
      }
  };

  const handleEdit = async (emp) => {
    // Check if session is valid before opening edit modal
    const token = localStorage.getItem('token');
    if (!token) {
      showError('Please log in to edit employee records.');
      return;
    }
    
    // Validate token before proceeding
    const isTokenValid = await validateToken();
    if (!isTokenValid) {
      showError('Your session has expired. Please log in again.');
      return;
    }
    
    const position = emp.employee_profile?.position || '';
    const role_id = roleMap[position] || null;
    const profile = emp.employee_profile;

    const formDataObj = {
      // Personal Information
      email: emp.email || '',
      password: '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      nickname: profile?.nickname || '',
      civil_status: profile?.civil_status || '',
      gender: profile?.gender || '',
      place_of_birth: profile?.place_of_birth || '',
      birth_date: profile?.birth_date || '',
      age: profile?.age || '',
      
      // Contact Information
      contact_number: profile?.contact_number || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
      
      // Address Information
      province: profile?.province || '',
      barangay: profile?.barangay || '',
      city: profile?.city || '',
      postal_code: profile?.postal_code || '',
      present_address: profile?.present_address || '',
      
      // Employment Overview
      position: position,
      role_id: role_id,
      department: profile?.department || '',
      employment_status: profile?.employment_status || '',
      tenurity: profile?.tenurity || '',
      hire_date: profile?.hire_date || '',
      salary: profile?.salary || '',
      sss: profile?.sss || '',
      philhealth: profile?.philhealth || '',
      pagibig: profile?.pagibig || '',
      tin_no: profile?.tin_no || '',
      
      // Termination (optional)
      termination_date: profile?.termination_date || '',
      termination_reason: profile?.termination_reason || '',
      termination_remarks: profile?.termination_remarks || '',
    };

    setEditingEmployee(emp);
    setFormData(formDataObj);
    
    // Create a proper deep copy of the original data
    const originalData = JSON.parse(JSON.stringify(formDataObj));
    setOriginalFormData(originalData);
    setChangedFields([]);
    
    // Load field edit counts from employee profile
    const editCounts = profile?.field_edit_counts ? JSON.parse(profile.field_edit_counts) : {};
    setFieldEditCounts(editCounts);
    setIsFirstSave(false); // This is an existing employee
    
    setShowModal(true);
  };

  // Handle session expiration
  const handleSessionExpired = () => {
    localStorage.removeItem('token');
    setSessionValid(false);
    showError('Your session has expired. Please log in again.');
    // Redirect to login after a delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  };

  // Handle viewing employee record
  const handleViewEmployee = (emp) => {
    setViewingEmployee(emp);
    setShowViewModal(true);
    showInfo(`Viewing ${emp.employee_profile?.first_name} ${emp.employee_profile?.last_name}'s record`);
  };

  // Handle termination of an employee
  const handleTerminateEmployee = (emp, status = 'terminated') => {
    setTerminatingEmployee(emp);
    setTerminationForm({
      termination_date: new Date().toISOString().split('T')[0],
      termination_reason: '',
      termination_notes: '',
      status: status
    });
    setShowTerminationModal(true);
  };

  // Handle termination form changes
  const handleTerminationChange = (e) => {
    const { name, value } = e.target;
    setTerminationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle termination form submission
  const handleTerminationSubmit = async (e) => {
    e.preventDefault();
    if (!terminatingEmployee) return;

    const loadingToast = toast.loading('Updating employee status...');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.dismiss(loadingToast);
        handleSessionExpired();
        return;
      }

      // Prepare the data in the correct format (flat structure)
      const profile = terminatingEmployee.employee_profile;
      
      // Normalize gender to match backend validation (Female/Male or null)
      let normalizedGender = profile?.gender || null;
      if (normalizedGender) {
        const genderLower = normalizedGender.toLowerCase();
        if (genderLower === 'male') {
          normalizedGender = 'Male';
        } else if (genderLower === 'female') {
          normalizedGender = 'Female';
        } else {
          // If gender doesn't match expected values, set to null
          normalizedGender = null;
        }
      }
      
      // Normalize civil_status to match backend validation (Single,Married,Divorced,Widowed,Separated or null)
      let normalizedCivilStatus = profile?.civil_status || null;
      if (normalizedCivilStatus) {
        const civilStatusLower = normalizedCivilStatus.toLowerCase();
        const validStatuses = {
          'single': 'Single',
          'married': 'Married',
          'divorced': 'Divorced',
          'widowed': 'Widowed',
          'separated': 'Separated'
        };
        normalizedCivilStatus = validStatuses[civilStatusLower] || null;
      }
      
      const updateData = {
        // Keep existing employee data
        email: terminatingEmployee.email,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        nickname: profile?.nickname || '',
        civil_status: normalizedCivilStatus,
        gender: normalizedGender,
        place_of_birth: profile?.place_of_birth || '',
        birth_date: profile?.birth_date || '',
        age: profile?.age || '',
        contact_number: profile?.contact_number || '',
        emergency_contact_name: profile?.emergency_contact_name || '',
        emergency_contact_phone: profile?.emergency_contact_phone || '',
        province: profile?.province || '',
        barangay: profile?.barangay || '',
        city: profile?.city || '',
        postal_code: profile?.postal_code || '',
        present_address: profile?.present_address || '',
        position: profile?.position || '',
        department: profile?.department || '',
        employment_status: profile?.employment_status || '',
        tenurity: profile?.tenurity || '',
        hire_date: profile?.hire_date || '',
        salary: profile?.salary || '',
        sss: profile?.sss || '',
        philhealth: profile?.philhealth || '',
        pagibig: profile?.pagibig || '',
        tin_no: profile?.tin_no || '',
        
        // Update the status and termination fields
        status: terminationForm.status,
        termination_date: terminationForm.termination_date,
        termination_reason: terminationForm.termination_reason,
        termination_notes: terminationForm.termination_notes
      };

      // Update the employee's status
      await axios.put(
        `http://localhost:8000/api/employees/${terminatingEmployee.id}`,
        updateData,
        { 
          headers: { 
            'Authorization': `Bearer ${token}` 
          } 
        }
      );

      toast.dismiss(loadingToast);
      showSuccess(`Employee marked as ${terminationForm.status === 'resigned' ? 'resigned' : 'terminated'} successfully!`);
      setShowTerminationModal(false);
      setTerminatingEmployee(null);
      
      // Refresh the employee list and switch to the appropriate tab
      await fetchEmployees(true);
      setActiveTab(terminationForm.status === 'resigned' ? 'resigned' : 'terminated');
    } catch (error) {
      console.error('Error terminating employee:', error);
      toast.dismiss(loadingToast);
      handleAxiosError(error, 'Failed to update employee status. Please try again.');
    }
  };

  // Close view modal
  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingEmployee(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setChangedFields([]); // Clear changed fields when closing modal
    setOriginalFormData({}); // Clear original form data
    setFieldEditCounts({}); // Reset field edit counts
    setIsFirstSave(true); // Reset to first save state
    setFormData({
      // Personal Information
      email: '', password: '',
      first_name: '', last_name: '', nickname: '',
      civil_status: '', gender: '', place_of_birth: '', birth_date: '', age: '',
      
      // Contact Information
      contact_number: '', emergency_contact_name: '', emergency_contact_phone: '',
      
      // Address Information
      province: '', barangay: '', city: '', postal_code: '', present_address: '',
      
      // Employment Overview
      position: '', role_id: '', department: '', employment_status: '',
      tenurity: '', hire_date: '', salary: '', sss: '', philhealth: '', pagibig: '', tin_no: '',
      
      // Termination (optional)
      termination_date: '', termination_reason: '', termination_remarks: '',
    });
  };

  // Helper function to get highlighting styles for employee-editable fields only
  const getFieldHighlight = (fieldName) => {
    const isChanged = changedFields.includes(fieldName);
    return {
      className: isChanged ? 'border-warning shadow-sm' : '',
      style: isChanged ? { backgroundColor: '#fff3cd' } : {},
      badge: isChanged ? <span className="badge bg-warning ms-2">Changed</span> : null
    };
  };

  const exportCSV = () => {
    try {
      if (filteredEmployees.length === 0) {
        showWarning('No employee data to export.');
        return;
      }
      
      const csvData = filteredEmployees.map(emp => ({
        'Employee ID' : emp.employee_profile?.employee_id || 'N/A',
        'Name': `${emp.employee_profile?.first_name} ${emp.employee_profile?.last_name}`,
        'Email': emp.email,
        'Position': emp.employee_profile?.position,
        'Department': emp.employee_profile?.department,
        'Salary': emp.employee_profile?.salary,
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "employee_records.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`CSV file exported successfully! (${filteredEmployees.length} employees)`);
    } catch (error) {
      handleAxiosError(error, 'Failed to export CSV file. Please try again.');
    }
  };

  const exportPDF = () => {
    try {
      if (filteredEmployees.length === 0) {
        showWarning('No employee data to export.');
        return;
      }

      console.log('Starting PDF export for', filteredEmployees.length, 'employees');

      // Initialize jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = 30;

      console.log('PDF document initialized successfully');

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Records Report', pageWidth / 2, 20, { align: 'center' });
      
      // Date and time
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 30);
      doc.text(`Total Records: ${filteredEmployees.length}`, pageWidth - margin, 30, { align: 'right' });

      yPosition = 45;

      // Table headers
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const headers = ['Name', 'Email', 'Position', 'Department', 'Salary'];
      const colWidths = [40, 50, 35, 35, 30];
      let xPosition = margin;

      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });

      yPosition += 5;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Table data
      doc.setFont('helvetica', 'normal');
      filteredEmployees.forEach((emp, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Format salary properly
        let salaryText = 'N/A';
        if (emp.employee_profile?.salary) {
          console.log('Raw salary data:', emp.employee_profile.salary, 'Type:', typeof emp.employee_profile.salary);
          const salaryValue = parseFloat(emp.employee_profile.salary);
          console.log('Parsed salary value:', salaryValue);
          if (!isNaN(salaryValue)) {
            salaryText = salaryValue.toFixed(2);
            console.log('Formatted salary:', salaryText);
          }
        }
        
        const rowData = [
          `${emp.employee_profile?.first_name || ''} ${emp.employee_profile?.last_name || ''}`.substring(0, 25),
          (emp.email || 'N/A').substring(0, 30),
          (emp.employee_profile?.position || 'N/A').substring(0, 20),
          (emp.employee_profile?.department || 'N/A').substring(0, 20),
          salaryText
        ];
        
        xPosition = margin;
        rowData.forEach((data, colIndex) => {
          doc.text(data, xPosition, yPosition);
          xPosition += colWidths[colIndex];
        });
        
        yPosition += 5;
      });

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Total Records: ${filteredEmployees.length}`, margin, pageHeight - 15);
      doc.text('Cabuyao Concrete Development Corporation', pageWidth - margin, pageHeight - 15, { align: 'right' });

      // Save the PDF
      const fileName = `Employee_Records_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Attempting to save PDF as:', fileName);
      
      doc.save(fileName);
      console.log('PDF saved successfully');

      showSuccess(`PDF file exported successfully! (${filteredEmployees.length} employees)`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Failed to export PDF file. Please try again.';
      if (error.message?.includes('jsPDF')) {
        errorMessage = 'PDF library error. Please refresh the page and try again.';
      } else if (error.message?.includes('save')) {
        errorMessage = 'Error saving PDF file. Please check your browser settings.';
      }
      
      showError(errorMessage);
    }
  };

  // Helper function to sanitize text for PDF
  const sanitizeForPDF = (text) => {
    if (!text || text === null || text === undefined) {
      return 'N/A';
    }
    // Convert to string and remove problematic characters
    return String(text)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u2000-\u206F]/g, ' ') // Replace unicode spaces with regular space
      .replace(/[\u2070-\u209F]/g, '') // Remove superscripts/subscripts
      .trim() || 'N/A';
  };


  // Export individual employee record as PDF
  const exportIndividualPDF = (emp) => {
    console.log('Starting PDF export for employee:', emp);
    
    try {
      // Validate employee data
      if (!emp) {
        console.error('Employee data is null or undefined');
        showError('Employee data is missing. Cannot export record.');
        return;
      }

      const profile = emp.employee_profile;
      const employeeName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : 'Unknown Employee';
      
      console.log('Employee profile:', profile);
      console.log('Employee name:', employeeName);
      
      // Initialize jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      console.log('jsPDF initialized successfully');
      
      // Employee name (header)
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text(sanitizeForPDF(employeeName), 20, 25);
      
      // Add a line
      doc.line(20, 30, 190, 30);
      
      // Personal Information
      let yPosition = 45;
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text('Personal Information', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      
      const personalInfo = [
        ['Employee ID:', profile?.employee_id || 'N/A'],
        ['Full Name:', employeeName],
        ['Nickname:', profile?.nickname || 'N/A'],
        ['Civil Status:', profile?.civil_status || 'N/A'],
        ['Gender:', profile?.gender || 'N/A'],
        ['Date of Birth:', profile?.birth_date || 'N/A'],
        ['Age:', profile?.age?.toString() || 'N/A'],
        ['Place of Birth:', profile?.place_of_birth || 'N/A']
      ];
      
      personalInfo.forEach(([label, value]) => {
        const safeValue = sanitizeForPDF(value);
        doc.text(sanitizeForPDF(label), 20, yPosition);
        doc.text(safeValue, 70, yPosition);
        yPosition += 7;
      });
      
      // Contact Information
      yPosition += 10;
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text('Contact Information', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      
      const contactInfo = [
        ['Email:', emp.email || 'N/A'],
        ['Phone Number:', profile?.contact_number || profile?.phone || 'N/A'],
        ['Emergency Contact Name:', profile?.emergency_contact_name || 'N/A'],
        ['Emergency Contact Phone:', profile?.emergency_contact_phone || 'N/A']
      ];
      
      contactInfo.forEach(([label, value]) => {
        const safeValue = sanitizeForPDF(value);
        doc.text(sanitizeForPDF(label), 20, yPosition);
        doc.text(safeValue, 70, yPosition);
        yPosition += 7;
      });
      
      // Address Information
      yPosition += 10;
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text('Address Information', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      
      const addressInfo = [
        ['Province:', profile?.province || 'N/A'],
        ['City/Municipality:', profile?.city || 'N/A'],
        ['Barangay:', profile?.barangay || 'N/A'],
        ['Postal Code:', profile?.postal_code || 'N/A'],
        ['Present Address:', profile?.present_address || 'N/A']
      ];
      
      addressInfo.forEach(([label, value]) => {
        const safeValue = sanitizeForPDF(value);
        doc.text(sanitizeForPDF(label), 20, yPosition);
        doc.text(safeValue, 70, yPosition);
        yPosition += 7;
      });
      
      // Employment Information
      yPosition += 10;
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text('Employment Information', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      
      // Format salary properly
      let salaryText = 'N/A';
      if (profile?.salary) {
        const salaryValue = parseFloat(profile.salary);
        if (!isNaN(salaryValue)) {
          salaryText = salaryValue.toFixed(2);
        }
      }
      
      const employmentInfo = [
        ['Position:', profile?.position || 'N/A'],
        ['Department:', profile?.department || 'N/A'],
        ['Employment Status:', profile?.employment_status || 'N/A'],
        ['Date Started:', profile?.hire_date || 'N/A'],
        ['Tenure:', profile?.tenurity || 'N/A'],
        ['Salary:', salaryText]
      ];
      
      employmentInfo.forEach(([label, value]) => {
        const safeValue = sanitizeForPDF(value);
        doc.text(sanitizeForPDF(label), 20, yPosition);
        doc.text(safeValue, 70, yPosition);
        yPosition += 7;
      });
      
      // Government IDs (if available)
      yPosition += 10;
      
      // Check if we need a new page (leave space for Government IDs section + footer)
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text('Government IDs', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      
      const govIds = [
        ['SSS:', profile?.sss || 'N/A'],
        ['PhilHealth:', profile?.philhealth || 'N/A'],
        ['Pag-IBIG:', profile?.pagibig || 'N/A'],
        ['TIN:', profile?.tin_no || 'N/A']
      ];
      
      console.log('Government IDs data:', {
        sss: profile?.sss,
        philhealth: profile?.philhealth,
        pagibig: profile?.pagibig,
        tin_no: profile?.tin_no,
        yPosition: yPosition
      });
      
      govIds.forEach(([label, value]) => {
        const safeValue = sanitizeForPDF(value);
        console.log(`Adding Government ID: ${label} ${safeValue} at position ${yPosition}`);
        doc.text(sanitizeForPDF(label), 20, yPosition);
        doc.text(safeValue, 70, yPosition);
        yPosition += 7;
      });
      
      // Footer (at bottom of current page)
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, pageHeight - 10);
      
      console.log('PDF content generated successfully');
      
      // Save the PDF
      const sanitizedName = sanitizeForPDF(employeeName).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      const fileName = `${sanitizedName}_record.pdf`;
      console.log('Attempting to save PDF as:', fileName);
      
      doc.save(fileName);
      console.log('PDF saved successfully');
      
      showSuccess(`${employeeName}'s record exported successfully!`);
    } catch (error) {
      console.error('Detailed error exporting individual PDF:', {
        error: error,
        message: error.message,
        stack: error.stack,
        employee: emp
      });
      
      // More specific error message
      let errorMessage = 'Failed to export employee record.';
      if (error.message?.includes('jsPDF')) {
        errorMessage = 'PDF library error. Please refresh the page and try again.';
      } else if (error.message?.includes('text')) {
        errorMessage = 'Error processing employee data for PDF. Some fields may contain invalid characters.';
      } else if (error.message?.includes('save')) {
        errorMessage = 'Error saving PDF file. Please check your browser settings.';
      }
      
      showError(errorMessage);
    }
  };

  // Fetch employee evaluation results and open modal
  const handleViewEvaluation = async (emp) => {
    try {
      setEvalLoading(true);
      setEvalResults([]);
      setEvalDetail(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/employee/${emp.id}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const results = res.data?.data || [];
      if (results.length === 0) {
        showInfo('No evaluation results found for this employee.');
        return;
      }
      setEvalResults(results);
      const latest = results[0];
      setSelectedEvalId(latest.id);
      await fetchEvaluationDetail(latest.id);
      setShowEvalModal(true);
    } catch (err) {
      handleAxiosError(err, 'Failed to load evaluation results.');
    } finally {
      setEvalLoading(false);
    }
  };

  const fetchEvaluationDetail = async (evaluationId) => {
    try {
      setEvalLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/result/${evaluationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvalDetail(res.data?.data || null);
    } catch (err) {
      handleAxiosError(err, 'Failed to load evaluation detail.');
    } finally {
      setEvalLoading(false);
    }
  };

  const downloadEvaluationPDF = async (evaluationId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/result/${evaluationId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_result_${evaluationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      handleAxiosError(err, 'Failed to download PDF.');
    }
  };

  // Filter employees based on active tab and search criteria
  const filteredEmployees = employees.filter(emp => {
    // Filter by status based on active tab
    let statusMatch = true;
    if (activeTab === 'active') {
      statusMatch = !emp.employee_profile?.status || emp.employee_profile?.status === 'active';
    } else if (activeTab === 'resigned') {
      statusMatch = emp.employee_profile?.status === 'resigned';
    } else if (activeTab === 'terminated') {
      statusMatch = emp.employee_profile?.status === 'terminated';
    }
    
    // Filter by search query (name, email, or employee ID)
    const searchLower = searchQuery.toLowerCase().trim();
    const searchMatch = 
      !searchLower ||
      emp.employee_profile?.first_name?.toLowerCase().includes(searchLower) ||
      emp.employee_profile?.last_name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.employee_profile?.employee_id?.toLowerCase().includes(searchLower);
    
    // Filter by department (exact match since we're using dropdown)
    const deptMatch = 
      !departmentFilter || 
      emp.employee_profile?.department === departmentFilter;
    
    return statusMatch && searchMatch && deptMatch;
  });

  return (
    <div className="employee-records-container">
      {/* Main Content */}
      <div className="employee-records-content">
        {/* Validation Modal */}
        <ValidationModal
          show={modalState.show}
          type={modalState.type}
          title={modalState.title}
          message={modalState.message}
          onClose={hideModal}
        />

        <div className="employee-records-header">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-3 w-100">
  {/* Search Bar */}
  <input
    type="text"
    className="form-control"
    placeholder="Search by name"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{ flex: '1 1 40%', minWidth: '200px' }}
  />

  {/* Department Filter */}
  <select
    className="form-select"
    value={departmentFilter}
    onChange={(e) => setDepartmentFilter(e.target.value)}
    style={{ flex: '1 1 30%', minWidth: '200px' }}
  >
    <option value="">Filter by department</option>
    <option value="HR Department">HR Department</option>
    <option value="Operations">Operations</option>
    <option value="Logistics Department">Logistics Department</option>
    <option value="Accounting Department">Accounting Department</option>
    <option value="IT Department">IT Department</option>
    <option value="Production Department">Production Department</option>
  </select>

  {/* Export Buttons */}
  <div className="d-flex align-items-center gap-2" style={{ flex: '0 0 auto' }}>
    <Button variant="outline-primary" size="sm" onClick={exportCSV}>
      Export CSV
    </Button>
    <Button variant="outline-danger" size="sm" onClick={exportPDF}>
      Export PDF
    </Button>
  </div>
</div>


        
        {/* Status Tabs + Actions Row */}
        <div className="d-flex justify-content-start align-items-center mb-3 mt-1 flex-wrap gap-2 w-100">
          <ul className="nav nav-tabs mb-0">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active Employees
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'resigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('resigned')}
              >
                Resigned
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'terminated' ? 'active' : ''}`}
                onClick={() => setActiveTab('terminated')}
              >
                Terminated
              </button>
            </li>
          </ul>
        </div>
        </div>
        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-muted">Loading employee records...</p>
          </div>
        ) : (

      <div className="table-responsive">
        <Table bordered hover>
          <thead className="table-light">
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Position</th>
              <th>Department</th>
              <th>Email</th>
              <th>Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              // Only show "New" badge if employee was recently updated AND not just saved by current user
              const isRecentlyUpdated = emp.employee_profile?.updated_at && 
                new Date(emp.employee_profile.updated_at) > new Date(Date.now() - 2 * 60 * 1000) && // Last 2 minutes
                !justSavedEmployees.has(emp.id); // Exclude just-saved employees - removes immediately
              
              return (
                <tr key={emp.id} className={isRecentlyUpdated ? 'table-info' : ''}>
                  <td>
                    <span className="badge bg-primary">{emp.employee_profile?.employee_id || 'N/A'}</span>
                  </td>
                  <td>
                    {emp.employee_profile?.first_name} {emp.employee_profile?.last_name}
                    {isRecentlyUpdated && <span className="badge bg-success ms-2" title="Recently updated">New</span>}
                  </td>
                  <td>{emp.employee_profile?.position}</td>
                  <td>{emp.employee_profile?.department}</td>
                  <td>{emp.email}</td>
                  <td>{emp.employee_profile?.salary}</td>
                  <td>
                    <Button size="sm" variant="warning" onClick={() => handleEdit(emp)}>Edit</Button>{' '}
                    <Button 
                      size="sm" 
                      variant="info" 
                      onClick={() => handleViewEmployee(emp)}
                      title="View employee record details"
                    >
                      View
                    </Button>{' '}
                    <Button 
                      size="sm"
                      className="btn-eval-result"
                      onClick={() => handleViewEvaluation(emp)}
                      title="View evaluation result"
                    >
                      <FaEye size={14} /> <span>View Result</span>
                    </Button>{' '}
                    
                    {/* Enhanced Terminate/Resign Button */}
                    {emp.employee_profile?.status === 'terminated' || emp.employee_profile?.status === 'resigned' ? (
                      <Button 
                        size="sm" 
                        variant={emp.employee_profile?.status === 'terminated' ? 'secondary' : 'dark'}
                        disabled
                        style={{ 
                          cursor: 'not-allowed', 
                          opacity: 0.6,
                          fontWeight: '500'
                        }}
                      >
                        <FaCheckCircle size={14} className="me-1" />
                        {emp.employee_profile?.status.charAt(0).toUpperCase() + emp.employee_profile?.status.slice(1)}
                      </Button>
                    ) : (
                      <Dropdown as="span" className="d-inline-block">
                        <Dropdown.Toggle 
                          variant="danger" 
                          size="sm"
                          id={`dropdown-status-${emp.id}`}
                          className="status-action-btn"
                          style={{
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minWidth: '140px',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FaExclamationTriangle size={13} />
                          <span>Status Action</span>
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                          <Dropdown.Item 
                            onClick={() => handleTerminateEmployee(emp, 'terminated')}
                            className="text-danger"
                            style={{ fontWeight: '500' }}
                          >
                            <FaUserSlash size={14} className="me-2" />
                            Terminate Employee
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item 
                            onClick={() => handleTerminateEmployee(emp, 'resigned')}
                            className="text-warning"
                            style={{ fontWeight: '500' }}
                          >
                            <FaUserTimes size={14} className="me-2" />
                            Mark as Resigned
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      )}

      {/* Evaluation Results Modal */}
      <Modal show={showEvalModal} onHide={() => setShowEvalModal(false)} size="xl" className="employee-eval-modal">
        <Modal.Header closeButton>
          <Modal.Title>Evaluation Result</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {evalLoading && (
            <div className="text-center my-3"><Spinner animation="border" size="sm" /> Loading...</div>
          )}

          {evalResults.length > 0 && (
            <div className="mb-3 d-flex gap-2 align-items-center">
              <Form.Label className="mb-0">Select Evaluation:</Form.Label>
              <Form.Select
                value={selectedEvalId || ''}
                onChange={async (e) => {
                  const id = parseInt(e.target.value, 10);
                  setSelectedEvalId(id);
                  await fetchEvaluationDetail(id);
                }}
                style={{ maxWidth: 320 }}
              >
                {evalResults.map(ev => (
                  <option key={ev.id} value={ev.id}>{new Date(ev.submitted_at).toLocaleString()} — {ev.form_title || 'Form'}</option>
                ))}
              </Form.Select>
            </div>
          )}

          {evalDetail && (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <EvaluationResult result={evalDetail} onBack={() => setShowEvalModal(false)} />
            </div>
          )}

          {!evalLoading && evalResults.length === 0 && (
            <div className="text-center text-muted">No evaluation results.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEvalModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Comprehensive Employee Form Modal */}
      <Modal show={showModal} onHide={closeModal} size="xl" className="employee-form-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            {editingEmployee && changedFields.length > 0 && (
              <span className="badge bg-warning ms-3">
                {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} modified
              </span>
            )}
            {editingEmployee && (
              <small className="text-muted ms-2">
                (Editing: {editingEmployee.employee_profile?.first_name} {editingEmployee.employee_profile?.last_name})
              </small>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="p-0" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            
            {/* Personal Information Section */}
            <div className="form-section border-bottom">
              <div className="section-header bg-light p-3 border-bottom">
                <h6 className="mb-0 fw-bold">👤 Personal Information</h6>
              </div>
              <div className="section-content p-3">
                <div className="row g-3">
                  
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control 
                        name="first_name" 
                        value={formData.first_name} 
                        onChange={handleInputChange} 
                        placeholder="First Name" 
                        required 
                        disabled={!canEditField('first_name')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control 
                        name="last_name" 
                        value={formData.last_name} 
                        onChange={handleInputChange} 
                        placeholder="Last Name" 
                        required 
                        disabled={!canEditField('last_name')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Nickname</Form.Label>
                      <Form.Control 
                        name="nickname" 
                        value={formData.nickname} 
                        onChange={handleInputChange} 
                        placeholder="Nickname" 
                        disabled={!canEditField('nickname')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Civil Status {getFieldHighlight('civil_status').badge}
                        {getRemainingEdits('civil_status') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('civil_status')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Select 
                        name="civil_status" 
                        value={formData.civil_status} 
                        onChange={handleInputChange}
                        className={`${getFieldHighlight('civil_status').className}`}
                        style={{...getFieldHighlight('civil_status').style}}
                        disabled={!canEditField('civil_status')}
                      >
                        <option value="">Select Civil Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Gender {getFieldHighlight('gender').badge}
                        {getRemainingEdits('gender') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('gender')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Select 
                        name="gender" 
                        value={formData.gender} 
                        onChange={handleInputChange}
                        className={`${getFieldHighlight('gender').className}`}
                        style={{...getFieldHighlight('gender').style}}
                        disabled={!canEditField('gender')}
                      >
                        <option value="">Select Gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Place of Birth</Form.Label>
                      <Form.Control 
                        name="place_of_birth" 
                        value={formData.place_of_birth} 
                        onChange={handleInputChange} 
                        placeholder="Place of Birth" 
                        disabled={!canEditField('place_of_birth')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control 
                        name="birth_date" 
                        type="date" 
                        value={formData.birth_date} 
                        onChange={handleInputChange} 
                        disabled={!canEditField('birth_date')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Age</Form.Label>
                      <Form.Control name="age" type="number" value={formData.age} onChange={handleInputChange} placeholder="Age" min="1" max="120" readOnly />
                    </Form.Group>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="form-section border-bottom">
              <div className="section-header bg-light p-3 border-bottom">
                <h6 className="mb-0 fw-bold">📧 Contact Information</h6>
              </div>
              <div className="section-content p-3">
                <h6 className="text-muted mb-3">Personal Contact</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Phone Number {getFieldHighlight('contact_number').badge}
                        {getRemainingEdits('contact_number') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('contact_number')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="contact_number" 
                        type="tel" 
                        value={formData.contact_number} 
                        onChange={handleInputChange} 
                        placeholder="Phone Number" 
                        className={getFieldHighlight('contact_number').className}
                        style={getFieldHighlight('contact_number').style}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Email <span className="text-danger">*</span> {getFieldHighlight('email').badge}
                        {getRemainingEdits('email') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('email')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        placeholder="Email Address" 
                        required 
                        className={getFieldHighlight('email').className}
                        style={getFieldHighlight('email').style}
                      />
                    </Form.Group>
                  </div>
                </div>
                
                <div className="alert alert-warning mt-3 p-2">
                  <h6 className="text-danger mb-2 fw-bold">🚨 In case of Emergency</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>
                          Full Name {getFieldHighlight('emergency_contact_name').badge}
                          {getRemainingEdits('emergency_contact_name') !== null && (
                            <small className="text-muted ms-2">({getRemainingEdits('emergency_contact_name')} edits remaining)</small>
                          )}
                        </Form.Label>
                        <Form.Control 
                          name="emergency_contact_name" 
                          value={formData.emergency_contact_name} 
                          onChange={handleInputChange} 
                          placeholder="Emergency Contact Name" 
                          className={getFieldHighlight('emergency_contact_name').className}
                          style={getFieldHighlight('emergency_contact_name').style}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label>
                          Phone Number {getFieldHighlight('emergency_contact_phone').badge}
                          {getRemainingEdits('emergency_contact_phone') !== null && (
                            <small className="text-muted ms-2">({getRemainingEdits('emergency_contact_phone')} edits remaining)</small>
                          )}
                        </Form.Label>
                        <Form.Control 
                          name="emergency_contact_phone" 
                          type="tel" 
                          value={formData.emergency_contact_phone} 
                          onChange={handleInputChange} 
                          placeholder="Emergency Contact Phone" 
                          className={getFieldHighlight('emergency_contact_phone').className}
                          style={getFieldHighlight('emergency_contact_phone').style}
                        />
                      </Form.Group>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="form-section border-bottom">
              <div className="section-header bg-light p-3 border-bottom">
                <h6 className="mb-0 fw-bold">📍 Address Information</h6>
              </div>
              <div className="section-content p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Province {getFieldHighlight('province').badge}
                        {getRemainingEdits('province') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('province')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="province" 
                        value={formData.province} 
                        onChange={handleInputChange} 
                        placeholder="Province" 
                        className={getFieldHighlight('province').className}
                        style={getFieldHighlight('province').style}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Barangay {getFieldHighlight('barangay').badge}
                        {getRemainingEdits('barangay') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('barangay')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="barangay" 
                        value={formData.barangay} 
                        onChange={handleInputChange} 
                        placeholder="Barangay" 
                        className={getFieldHighlight('barangay').className}
                        style={getFieldHighlight('barangay').style}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        City/Municipality {getFieldHighlight('city').badge}
                        {getRemainingEdits('city') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('city')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        placeholder="City/Municipality" 
                        className={getFieldHighlight('city').className}
                        style={getFieldHighlight('city').style}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>
                        Postal Code {getFieldHighlight('postal_code').badge}
                        {getRemainingEdits('postal_code') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('postal_code')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        name="postal_code" 
                        value={formData.postal_code} 
                        onChange={handleInputChange} 
                        placeholder="Postal Code" 
                        className={getFieldHighlight('postal_code').className}
                        style={getFieldHighlight('postal_code').style}
                      />
                    </Form.Group>
                  </div>
                </div>
                <div className="row g-3 mt-2">
                  <div className="col-md-12">
                    <Form.Group>
                      <Form.Label>
                        Present Address {getFieldHighlight('present_address').badge}
                        {getRemainingEdits('present_address') !== null && (
                          <small className="text-muted ms-2">({getRemainingEdits('present_address')} edits remaining)</small>
                        )}
                      </Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={2} 
                        name="present_address" 
                        value={formData.present_address} 
                        onChange={handleInputChange} 
                        placeholder="Complete present address" 
                        className={getFieldHighlight('present_address').className}
                        style={getFieldHighlight('present_address').style}
                      />
                    </Form.Group>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Overview Section */}
            <div className="form-section border-bottom">
              <div className="section-header bg-light p-3 border-bottom">
                <h6 className="mb-0 fw-bold">💼 Employment Overview</h6>
              </div>
              <div className="section-content p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Date Started</Form.Label>
                      <Form.Control 
                        name="hire_date" 
                        type="date" 
                        value={formData.hire_date} 
                        onChange={handleInputChange} 
                        disabled={!canEditField('hire_date')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Employment Status</Form.Label>
                      <Form.Control 
                        name="employment_status" 
                        value={formData.employment_status} 
                        onChange={handleInputChange} 
                        placeholder="Employment Status" 
                        disabled={!canEditField('employment_status')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Position</Form.Label>
                      <Form.Select 
                        name="position" 
                        value={formData.position} 
                        onChange={handleInputChange}
                        disabled={!canEditField('position')}
                      >
                        <option value="">Select Position</option>
                        <option value="HR Assistant">HR Assistant</option>
                        <option value="HR Staff">HR Staff</option>
                        <option value="Manager">Manager</option>
                        <option value="Employee">Employee</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Tenurity</Form.Label>
                      <Form.Control 
                        name="tenurity" 
                        value={formData.tenurity} 
                        onChange={handleInputChange} 
                        placeholder="Tenurity" 
                        disabled={!canEditField('tenurity')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Department</Form.Label>
                      <Form.Select 
                        name="department" 
                        value={formData.department} 
                        onChange={handleInputChange}
                        disabled={!canEditField('department')}
                      >
                        <option value="">Select Department</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Accounting">Accounting</option>
                        <option value="IT Department">IT Department</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Salary</Form.Label>
                      <Form.Control 
                        name="salary" 
                        type="number" 
                        value={formData.salary} 
                        onChange={handleInputChange} 
                        placeholder="Salary" 
                        disabled={!canEditField('salary')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>PhilHealth</Form.Label>
                      <Form.Control 
                        name="philhealth" 
                        value={formData.philhealth} 
                        onChange={handleInputChange} 
                        placeholder="PhilHealth Number" 
                        disabled={!canEditField('philhealth')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>Pag-IBIG</Form.Label>
                      <Form.Control 
                        name="pagibig" 
                        value={formData.pagibig} 
                        onChange={handleInputChange} 
                        placeholder="Pag-IBIG Number" 
                        disabled={!canEditField('pagibig')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>TIN No.</Form.Label>
                      <Form.Control 
                        name="tin_no" 
                        value={formData.tin_no} 
                        onChange={handleInputChange} 
                        placeholder="TIN Number" 
                        disabled={!canEditField('tin_no')}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group>
                      <Form.Label>SSS</Form.Label>
                      <Form.Control 
                        name="sss" 
                        value={formData.sss} 
                        onChange={handleInputChange} 
                        placeholder="SSS Number" 
                        disabled={!canEditField('sss')}
                      />
                    </Form.Group>
                  </div>
                </div>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="form-section border-bottom">
              <div className="section-header bg-light p-3 border-bottom">
                <h6 className="mb-0 fw-bold">🔐 Account Information</h6>
              </div>
              <div className="section-content p-3">
                <div className="row g-3">
                  <div className="col-md-12">
                    <Form.Group>
                      <Form.Label>Password {!editingEmployee && <span className="text-danger">*</span>}</Form.Label>
                      <Form.Control name="password" type="password" value={formData.password} onChange={handleInputChange} required={!editingEmployee} placeholder="Enter password" />
                      {editingEmployee && <Form.Text className="text-muted">Leave password blank if you don't want to change it.</Form.Text>}
                    </Form.Group>
                  </div>
                </div>
              </div>
            </div>

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving 
                ? 'Saving...' 
                : editingEmployee && changedFields.length > 0 
                  ? `Save ${changedFields.length} Change${changedFields.length !== 1 ? 's' : ''}` 
                  : editingEmployee 
                    ? 'Save Changes' 
                    : 'Save Employee Record'
              }
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Termination Modal */}
      <Modal show={showTerminationModal} onHide={() => setShowTerminationModal(false)} size="lg">
        <Modal.Header closeButton style={{ 
          backgroundColor: terminationForm.status === 'terminated' ? '#dc3545' : '#ffc107',
          color: 'white'
        }}>
          <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {terminationForm.status === 'terminated' ? (
              <><FaUserSlash size={20} /> Terminate Employee</>
            ) : (
              <><FaUserTimes size={20} /> Mark Employee as Resigned</>
            )}
            {terminatingEmployee && (
              <small style={{ fontWeight: 'normal', opacity: 0.9 }}>
                - {terminatingEmployee.employee_profile?.first_name} {terminatingEmployee.employee_profile?.last_name}
              </small>
            )}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleTerminationSubmit}>
          <Modal.Body>
            <div className="alert alert-warning d-flex align-items-center" role="alert">
              <FaExclamationTriangle size={20} className="me-2" />
              <div>
                <strong>Warning:</strong> This action will change the employee's status and move them to the {terminationForm.status === 'terminated' ? 'Terminated' : 'Resigned'} tab.
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-bold">Status</label>
              <select 
                className="form-select"
                name="status"
                value={terminationForm.status}
                onChange={handleTerminationChange}
                required
                style={{ fontWeight: '500' }}
              >
                <option value="terminated">🚫 Terminated</option>
                <option value="resigned">📤 Resigned</option>
              </select>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-bold">
                {terminationForm.status === 'terminated' ? 'Termination Date' : 'Resignation Date'} 
                <span className="text-danger"> *</span>
              </label>
              <input
                type="date"
                className="form-control"
                name="termination_date"
                value={terminationForm.termination_date}
                onChange={handleTerminationChange}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-bold">
                Reason <span className="text-danger"> *</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="termination_reason"
                value={terminationForm.termination_reason}
                onChange={handleTerminationChange}
                placeholder={terminationForm.status === 'terminated' 
                  ? "e.g., Poor performance, Misconduct, Budget cuts..." 
                  : "e.g., Better opportunity, Personal reasons, Relocation..."}
                required
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-bold">Additional Notes</label>
              <textarea
                className="form-control"
                name="termination_notes"
                value={terminationForm.termination_notes}
                onChange={handleTerminationChange}
                rows="4"
                placeholder="Add any additional information or details about this action (optional)"
                style={{ resize: 'vertical' }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowTerminationModal(false)}
              style={{ fontWeight: '500' }}
            >
              Cancel
            </Button>
            <Button 
              variant={terminationForm.status === 'terminated' ? 'danger' : 'warning'}
              type="submit"
              style={{ 
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {terminationForm.status === 'terminated' ? (
                <><FaUserSlash size={16} /> Confirm Termination</>
              ) : (
                <><FaUserTimes size={16} /> Confirm Resignation</>
              )}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* View Employee Record Modal */}
      <Modal show={showViewModal} onHide={closeViewModal} size="lg" className="employee-view-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {viewingEmployee?.employee_profile?.first_name} {viewingEmployee?.employee_profile?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {viewingEmployee && (
            <>
              {/* Personal Information Section */}
              <div className="form-section border-bottom">
                <div className="section-header bg-light p-3 border-bottom">
                  <h6 className="mb-0 fw-bold">👤 Personal Information</h6>
                </div>
                <div className="section-content p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Employee ID</label>
                        <div className="view-value">
                          <span className="badge bg-primary">{viewingEmployee.employee_profile?.employee_id || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Full Name</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.first_name} {viewingEmployee.employee_profile?.last_name}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Nickname</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.nickname || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Civil Status 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.civil_status || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.civil_status || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Gender</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.gender || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Date of Birth</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.birth_date || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Age</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.age || 'N/A'}</div>
                      </div>
                    </div>
                  <div className="col-md-6">
                    <div className="view-field">
                      <label className="fw-semibold text-muted">Place of Birth</label>
                      <div className="view-value">
                        {viewingEmployee.employee_profile?.place_of_birth || 'N/A'}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="form-section border-bottom">
                <div className="section-header bg-light p-3 border-bottom">
                  <h6 className="mb-0 fw-bold">📧 Contact Information</h6>
                </div>
                <div className="section-content p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Email 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.email || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.email || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Phone Number 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.contact_number || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.contact_number || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Emergency Contact Name 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.emergency_contact_name || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.emergency_contact_name || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Emergency Contact Phone 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.emergency_contact_phone || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.emergency_contact_phone || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="form-section border-bottom">
                <div className="section-header bg-light p-3 border-bottom">
                  <h6 className="mb-0 fw-bold">📍 Address Information</h6>
                </div>
                <div className="section-content p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Province 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.province || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.province || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Barangay 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.barangay || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.barangay || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          City/Municipality 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.city || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.city || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Postal Code 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.postal_code || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.postal_code || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">
                          Present Address 
                          <small className="text-muted ms-2">({Math.max(0, maxEditCount - (fieldEditCounts.present_address || 0))} edits remaining)</small>
                        </label>
                        <div className="view-value">{viewingEmployee.employee_profile?.present_address || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Information Section */}
              <div className="form-section border-bottom">
                <div className="section-header bg-light p-3 border-bottom">
                  <h6 className="mb-0 fw-bold">💼 Employment Information</h6>
                </div>
                <div className="section-content p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Position</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.position || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Department</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.department || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Employment Status</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.employment_status || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Date Started</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.hire_date || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Salary</label>
                        <div className="view-value">
                          {viewingEmployee.employee_profile?.salary ? `₱${parseFloat(viewingEmployee.employee_profile.salary).toFixed(2)}` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Tenure</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.tenurity || 'N/A'}</div>
                      </div>
                    </div>
                  <div className="col-md-6">
                    <div className="view-field">
                      <label className="fw-semibold text-muted">Manager</label>
                      <div className="view-value">
                        {
                          viewingEmployee.employee_profile?.manager_name ||
                          viewingEmployee.employee_profile?.manager ||
                          // If backend returns metadata as an object/stringified JSON
                          (() => {
                            const meta = viewingEmployee.employee_profile?.metadata;
                            if (!meta) return 'N/A';
                            try {
                              const obj = typeof meta === 'string' ? JSON.parse(meta) : meta;
                              return obj?.manager_name || obj?.manager || 'N/A';
                            } catch {
                              return 'N/A';
                            }
                          })()
                        }
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Government IDs Section */}
              <div className="form-section">
                <div className="section-header bg-light p-3 border-bottom">
                  <h6 className="mb-0 fw-bold">🏛️ Government IDs</h6>
                </div>
                <div className="section-content p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">SSS</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.sss || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">PhilHealth</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.philhealth || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">Pag-IBIG</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.pagibig || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="view-field">
                        <label className="fw-semibold text-muted">TIN</label>
                        <div className="view-value">{viewingEmployee.employee_profile?.tin_no || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeViewModal}>Close</Button>
          <Button 
            variant="info" 
            onClick={() => viewingEmployee && exportIndividualPDF(viewingEmployee)}
          >
            📄 Export as PDF
          </Button>
        </Modal.Footer>
      </Modal>

            {/* Toast container */}
      

      </div>
    </div>
  );
};

export default EmployeeRecords;
