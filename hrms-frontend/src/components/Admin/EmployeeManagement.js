import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faEdit, faTrash, faEye, faFilter,
  faTimes, faSave, faSpinner, faUser, faBuilding, faCalendar,
  faPhone, faEnvelope, faIdCard, faFileAlt, faUpload, faUserTie, faClock
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './EmployeeManagement.css';

// Scroll lock utility
const useScrollLock = () => {
  const lockScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollTop}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  };

  const unlockScroll = () => {
    const scrollTop = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, parseInt(scrollTop || '0') * -1);
  };

  return { lockScroll, unlockScroll };
};

// Completely uncontrolled input component that prevents any re-render interference and scrolling
const UncontrolledInput = ({ type, defaultValue, onBlur, required, placeholder, fieldName, ...props }) => {
  const inputRef = useRef(null);
  const isInitializedRef = useRef(false);
  const { lockScroll, unlockScroll } = useScrollLock();

  // Set initial value only once
  useEffect(() => {
    if (inputRef.current && !isInitializedRef.current) {
      inputRef.current.value = defaultValue || '';
      isInitializedRef.current = true;
    }
  }, [defaultValue]);

  const handleFocus = (e) => {
    // No scroll lock on input focus to avoid layout shift
  };

  const handleBlur = () => {
    // No scroll unlock needed here; managed at modal level
    
    if (onBlur && inputRef.current) {
      onBlur(fieldName, inputRef.current.value);
    }
  };

  const handleClick = (e) => {
    // No scroll lock on input click to keep layout steady
  };

  return (
    <input
      ref={inputRef}
      type={type}
      defaultValue={defaultValue}
      onFocus={handleFocus}
      onClick={handleClick}
      onBlur={handleBlur}
      required={required}
      placeholder={placeholder}
      {...props}
    />
  );
};

// Completely isolated form component that prevents any re-render interference
const IsolatedEmployeeForm = ({ formData, onFormDataChange, onSubmit, saving, showAddModal, showEditModal, onClose, photoPreview, onPhotoUpload, onRemovePhoto, departments, positions }) => {
  const formRef = useRef(null);
  const { lockScroll, unlockScroll } = useScrollLock();

  const handleInputBlur = (field, value) => {
    onFormDataChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectChange = (field, value) => {
    onFormDataChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextareaChange = (field, value) => {
    onFormDataChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  // Use formData directly to prevent memoization issues

  const handleFormClick = (e) => {
    // Avoid scroll lock on general form clicks to prevent layout shift
  };

  const handleFormFocus = (e) => {
    // Avoid scroll lock on form focus; modal manages scroll state
  };

  return (
    <form 
      key={`employee-form-${showAddModal ? 'add' : 'edit'}`} 
      onSubmit={handleSubmit} 
      className="employee-form"
      onClick={handleFormClick}
      onFocus={handleFormFocus}
    >
      <div className="form-section">
        <h4>Employee Photo</h4>
        <div className="form-group">
          <div className="photo-upload-container">
            <div className="photo-preview">
              {photoPreview ? (
                <div className="photo-preview-wrapper">
                  <img src={photoPreview} alt="Employee preview" className="photo-preview-image" />
                  <button
                    type="button"
                    className="remove-photo-btn"
                    onClick={onRemovePhoto}
                    title="Remove photo"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ) : (
                <div className="photo-placeholder">
                  <FontAwesomeIcon icon={faUser} />
                  <span>No photo selected</span>
                </div>
              )}
            </div>
            <div className="photo-upload-actions">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={onPhotoUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="photo-upload" className="upload-photo-btn">
                <FontAwesomeIcon icon={faUpload} />
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </label>
              <span className="photo-upload-hint">JPG, PNG or GIF (Max 5MB)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Employee ID</label>
            <UncontrolledInput
              key="employee_id"
              type="text"
              defaultValue={formData.employee_id}
              onBlur={handleInputBlur}
              fieldName="employee_id"
              required
            />
          </div>
          <div className="form-group">
            <label>Employment Status</label>
            <select
              value={formData.employment_status}
              onChange={(e) => handleSelectChange('employment_status', e.target.value)}
              required
            >
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <UncontrolledInput
              key="first_name"
              type="text"
              defaultValue={formData.first_name}
              onBlur={handleInputBlur}
              fieldName="first_name"
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <UncontrolledInput
              key="last_name"
              type="text"
              defaultValue={formData.last_name}
              onBlur={handleInputBlur}
              fieldName="last_name"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Email</label>
          <UncontrolledInput
            key="email"
            type="email"
            defaultValue={formData.email}
            onBlur={handleInputBlur}
            fieldName="email"
            required
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Personal Information</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Nickname</label>
            <UncontrolledInput
              key="nickname"
              type="text"
              defaultValue={formData.nickname}
              onBlur={handleInputBlur}
              fieldName="nickname"
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => handleSelectChange('gender', e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Birth Date</label>
            <UncontrolledInput
              key="birth_date"
              type="date"
              defaultValue={formData.birth_date}
              onBlur={handleInputBlur}
              fieldName="birth_date"
            />
          </div>
          <div className="form-group">
            <label>Birth Place</label>
            <UncontrolledInput
              key="birth_place"
              type="text"
              defaultValue={formData.birth_place}
              onBlur={handleInputBlur}
              fieldName="birth_place"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Age</label>
            <UncontrolledInput
              key="age"
              type="number"
              defaultValue={formData.age}
              onBlur={handleInputBlur}
              fieldName="age"
            />
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <select
              value={formData.civil_status}
              onChange={(e) => handleSelectChange('civil_status', e.target.value)}
            >
              <option value="">Select Civil Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Present Address</label>
          <textarea
            value={formData.present_address}
            onChange={(e) => handleTextareaChange('present_address', e.target.value)}
            rows="3"
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Work Information</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Department</label>
            <select
              value={formData.department}
              onChange={(e) => handleSelectChange('department', e.target.value)}
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Position</label>
            <select
              value={formData.position}
              onChange={(e) => handleSelectChange('position', e.target.value)}
              required
            >
              <option value="">Select Position</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Job Title</label>
          <UncontrolledInput
            key="job_title"
            type="text"
            defaultValue={formData.job_title}
            onBlur={handleInputBlur}
            fieldName="job_title"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Salary</label>
            <UncontrolledInput
              key="salary"
              type="number"
              defaultValue={formData.salary}
              onBlur={handleInputBlur}
              fieldName="salary"
              required
            />
          </div>
          <div className="form-group">
            <label>Hire Date</label>
            <UncontrolledInput
              key="hire_date"
              type="date"
              defaultValue={formData.hire_date}
              onBlur={handleInputBlur}
              fieldName="hire_date"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Tenurity</label>
          <UncontrolledInput
            key="tenurity"
            type="text"
            defaultValue={formData.tenurity}
            onBlur={handleInputBlur}
            fieldName="tenurity"
            placeholder="e.g., 2 years, 6 months"
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Contact Information</h4>
        <div className="form-group">
          <label>Phone</label>
          <UncontrolledInput
            key="phone"
            type="tel"
            defaultValue={formData.phone}
            onBlur={handleInputBlur}
            fieldName="phone"
          />
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => handleTextareaChange('address', e.target.value)}
            rows="3"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Emergency Contact</label>
            <UncontrolledInput
              key="emergency_contact_name"
              type="text"
              defaultValue={formData.emergency_contact_name}
              onBlur={handleInputBlur}
              fieldName="emergency_contact_name"
            />
          </div>
          <div className="form-group">
            <label>Emergency Phone</label>
            <UncontrolledInput
              key="emergency_contact_phone"
              type="tel"
              defaultValue={formData.emergency_contact_phone}
              onBlur={handleInputBlur}
              fieldName="emergency_contact_phone"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Government IDs</h4>
        <div className="form-row">
          <div className="form-group">
            <label>SSS Number</label>
            <UncontrolledInput
              key="sss"
              type="text"
              defaultValue={formData.sss}
              onBlur={handleInputBlur}
              fieldName="sss"
            />
          </div>
          <div className="form-group">
            <label>PhilHealth Number</label>
            <UncontrolledInput
              key="philhealth"
              type="text"
              defaultValue={formData.philhealth}
              onBlur={handleInputBlur}
              fieldName="philhealth"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Pag-IBIG Number</label>
            <UncontrolledInput
              key="pagibig"
              type="text"
              defaultValue={formData.pagibig}
              onBlur={handleInputBlur}
              fieldName="pagibig"
            />
          </div>
          <div className="form-group">
            <label>TIN Number</label>
            <UncontrolledInput
              key="tin_no"
              type="text"
              defaultValue={formData.tin_no}
              onBlur={handleInputBlur}
              fieldName="tin_no"
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    // Basic Information
    employee_id: '',
    first_name: '',
    last_name: '',
    nickname: '',
    email: '',
    phone: '',
    birth_date: '',
    birth_place: '',
    age: '',
    civil_status: '',
    gender: '',
    present_address: '',
    
    // Employment Information
    job_title: '',
    position: '',
    department: '',
    manager_id: '',
    supervisor_id: '',
    employment_status: 'Full Time',
    salary: '',
    hire_date: '',
    tenurity: '',
    
    // Government IDs
    sss: '',
    philhealth: '',
    pagibig: '',
    tin_no: '',
    
    // Contact Information
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const [departments] = useState([
    'HR Department',
    'IT Department',
    'Operations',
    'Accounting Department',
    'Production Department',
    'Logistics Department',
    'Marketing Department',
    'Sales Department'
  ]);

  const [positions] = useState([
    'System Administrator',
    'HR Staff',
    'Manager',
    'Staff',
    'Developer',
    'Designer',
    'Accountant',
    'Production Manager',
    'Logistics Manager',
    'Accounting Manager'
  ]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/employee-profiles');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(employee => {
        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const email = employee.email || '';
        const employeeId = employee.employee_id || '';
        
        return `${firstName} ${lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
               email.toLowerCase().includes(searchTerm.toLowerCase()) ||
               employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(employee => employee.department === departmentFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(employee => employee.employment_status === statusFilter);
    }

    return filtered;
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleFormDataChange = useCallback((updater) => {
    setFormData(updater);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    try {
      setSaving(true);
      
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      if (photoFile) {
        formDataToSend.append('photo', photoFile);
      }
      
      if (showAddModal) {
        await axios.post('http://localhost:8000/api/employee-profiles', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (showEditModal) {
        await axios.post(`http://localhost:8000/api/employee-profiles/${selectedEmployee.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      await fetchEmployees();
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        // Reset form data
        employee_id: '',
        first_name: '',
        last_name: '',
        nickname: '',
        email: '',
        phone: '',
        birth_date: '',
        birth_place: '',
        age: '',
        civil_status: '',
        gender: '',
        present_address: '',
        job_title: '',
        position: '',
        department: '',
        manager_id: '',
        supervisor_id: '',
        employment_status: 'Full Time',
        salary: '',
        hire_date: '',
        tenurity: '',
        sss: '',
        philhealth: '',
        pagibig: '',
        tin_no: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setSaving(false);
    }
  }, [formData, photoFile, showAddModal, showEditModal, selectedEmployee]);

  const handleModalClose = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setPhotoPreview(null);
    setPhotoFile(null);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDepartmentFilterChange = useCallback((e) => {
    setDepartmentFilter(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const handleAddEmployee = () => {
    setFormData({
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      position: '',
      department: '',
      employment_status: 'Full Time',
      salary: '',
      hire_date: '',
      phone: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      sss_number: '',
      philhealth_number: '',
      pagibig_number: '',
      tin_number: ''
    });
    setPhotoPreview(null);
    setPhotoFile(null);
    setShowAddModal(true);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      // Basic Information
      employee_id: employee.employee_id || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      nickname: employee.nickname || '',
      email: employee.email || '',
      phone: employee.phone || '',
      birth_date: employee.birth_date || '',
      birth_place: employee.birth_place || '',
      age: employee.age || '',
      civil_status: employee.civil_status || '',
      gender: employee.gender || '',
      present_address: employee.present_address || '',
      
      // Employment Information
      job_title: employee.job_title || '',
      position: employee.position || '',
      department: employee.department || '',
      manager_id: employee.manager_id || '',
      supervisor_id: employee.supervisor_id || '',
      employment_status: employee.employment_status || 'Full Time',
      salary: employee.salary || '',
      hire_date: employee.hire_date || '',
      tenurity: employee.tenurity || '',
      
      // Government IDs
      sss: employee.sss || '',
      philhealth: employee.philhealth || '',
      pagibig: employee.pagibig || '',
      tin_no: employee.tin_no || '',
      
      // Contact Information
      address: employee.address || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || ''
    });
    setPhotoPreview(employee.photo_url || null);
    setPhotoFile(null);
    setShowEditModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };


  const handleDelete = async () => {
    try {
      setSaving(true);
      await axios.delete(`http://localhost:8000/api/employee-profiles/${selectedEmployee.id}`);
      await fetchEmployees();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setSaving(false);
    }
  };

  const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    const { lockScroll, unlockScroll } = useScrollLock();
    
    // Lock scroll when modal opens - must be before early return
    useEffect(() => {
      if (isOpen) {
        lockScroll();
      }
      return () => {
        if (isOpen) {
          unlockScroll();
        }
      };
    }, [isOpen, lockScroll, unlockScroll]);
    
    if (!isOpen) return null;

    const handleModalClick = (e) => {
      // No additional action needed; scroll already locked when open
    };

    const handleModalFocus = (e) => {
      // No additional action needed; scroll already locked when open
    };

    return (
      <div 
        className="modal-overlay" 
        onClick={onClose}
        onFocus={handleModalFocus}
      >
        <div 
          className={`modal-content ${size}`} 
          onClick={e => e.stopPropagation()}
          onFocus={handleModalFocus}
        >
          <div className="modal-header">
            <h3>{title}</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="employee-management-loading">
        <FontAwesomeIcon icon={faSpinner} spin />
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="employee-management-header">
        <div className="header-content">
          <h1>Employee Management</h1>
          <p>Manage employee profiles and information</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('cards')}
            >
              <FontAwesomeIcon icon={faUser} />
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('table')}
            >
              <FontAwesomeIcon icon={faFileAlt} />
            </button>
          </div>
          <button type="button" className="add-employee-btn" onClick={handleAddEmployee}>
            <FontAwesomeIcon icon={faPlus} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="employee-management-filters">
        <div className="search-container">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <select
            value={departmentFilter}
            onChange={handleDepartmentFilterChange}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
          </select>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="employee-cards-grid">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className="employee-card">
              <div className="employee-card-header">
                <div className="employee-avatar">
                  {employee.photo_url ? (
                    <img src={employee.photo_url} alt={`${employee.first_name} ${employee.last_name}`} className="employee-photo" />
                  ) : (
                    <span>{(employee.first_name || '').charAt(0)}{(employee.last_name || '').charAt(0)}</span>
                  )}
                </div>
                <div className="employee-info">
                  <h3>{employee.first_name || ''} {employee.last_name || ''}</h3>
                  <p className="employee-id">{employee.employee_id || 'N/A'}</p>
                </div>
              </div>
              
              <div className="employee-details">
                <div className="detail-item">
                  <FontAwesomeIcon icon={faBuilding} />
                  <span>{employee.department}</span>
                </div>
                <div className="detail-item">
                  <FontAwesomeIcon icon={faUser} />
                  <span>{employee.position}</span>
                </div>
                {employee.job_title && (
                  <div className="detail-item">
                    <FontAwesomeIcon icon={faUserTie} />
                    <span>{employee.job_title}</span>
                  </div>
                )}
                <div className="detail-item">
                  <FontAwesomeIcon icon={faCalendar} />
                  <span>{employee.employment_status}</span>
                </div>
                {employee.tenurity && (
                  <div className="detail-item">
                    <FontAwesomeIcon icon={faClock} />
                    <span>{employee.tenurity}</span>
                  </div>
                )}
                <div className="detail-item">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>{employee.email}</span>
                </div>
                {employee.phone && (
                  <div className="detail-item">
                    <FontAwesomeIcon icon={faPhone} />
                    <span>{employee.phone}</span>
                  </div>
                )}
              </div>

              <div className="employee-actions">
                <button
                  type="button"
                  className="action-btn view-btn"
                  onClick={() => handleViewEmployee(employee)}
                  title="View Profile"
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => handleEditEmployee(employee)}
                  title="Edit Employee"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteEmployee(employee)}
                  title="Delete Employee"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th>Department</th>
                <th>Position</th>
                <th>Job Title</th>
                <th>Status</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => (
                <tr key={employee.id}>
                  <td>
                  <div className="employee-info">
                    <div className="employee-avatar">
                      {employee.photo_url ? (
                        <img src={employee.photo_url} alt={`${employee.first_name} ${employee.last_name}`} className="employee-photo" />
                      ) : (
                        <span>{(employee.first_name || '').charAt(0)}{(employee.last_name || '').charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="employee-name">{employee.first_name || ''} {employee.last_name || ''}</div>
                    </div>
                  </div>
                  </td>
                  <td>{employee.employee_id}</td>
                  <td>{employee.department}</td>
                  <td>{employee.position}</td>
                  <td>{employee.job_title || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${(employee.employment_status || '').toLowerCase().replace(' ', '-')}`}>
                      {employee.employment_status || 'N/A'}
                    </span>
                  </td>
                  <td>{employee.email}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="action-btn view-btn"
                        onClick={() => handleViewEmployee(employee)}
                        title="View Profile"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        type="button"
                        className="action-btn edit-btn"
                        onClick={() => handleEditEmployee(employee)}
                        title="Edit Employee"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        type="button"
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteEmployee(employee)}
                        title="Delete Employee"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      <Modal
        key={showAddModal ? 'add-modal' : 'edit-modal'}
        isOpen={showAddModal || showEditModal}
        onClose={handleModalClose}
        title={showAddModal ? 'Add New Employee' : 'Edit Employee'}
        size="large"
      >
        <IsolatedEmployeeForm
          formData={formData}
          onFormDataChange={handleFormDataChange}
          onSubmit={handleFormSubmit}
          saving={saving}
          showAddModal={showAddModal}
          showEditModal={showEditModal}
          onClose={handleModalClose}
          photoPreview={photoPreview}
          onPhotoUpload={handlePhotoUpload}
          onRemovePhoto={removePhoto}
          departments={departments}
          positions={positions}
        />
      </Modal>

      {/* View Employee Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Employee Profile"
        size="large"
      >
        {selectedEmployee && (
          <div className="employee-profile">
            <div className="profile-header">
              <div className="profile-avatar">
                {selectedEmployee.photo_url ? (
                  <img src={selectedEmployee.photo_url} alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} className="profile-photo" />
                ) : (
                  <span>{(selectedEmployee.first_name || '').charAt(0)}{(selectedEmployee.last_name || '').charAt(0)}</span>
                )}
              </div>
              <div className="profile-info">
                <h2>{selectedEmployee.first_name || ''} {selectedEmployee.last_name || ''}</h2>
                <p className="profile-id">{selectedEmployee.employee_id || 'N/A'}</p>
                <p className="profile-position">{selectedEmployee.position || 'N/A'} - {selectedEmployee.department || 'N/A'}</p>
              </div>
            </div>

            <div className="profile-sections">
              <div className="profile-section">
                <h4>Personal Information</h4>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">Nickname:</span>
                    <span className="detail-value">{selectedEmployee.nickname || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gender:</span>
                    <span className="detail-value">{selectedEmployee.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Birth Date:</span>
                    <span className="detail-value">{selectedEmployee.birth_date || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Birth Place:</span>
                    <span className="detail-value">{selectedEmployee.birth_place || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Age:</span>
                    <span className="detail-value">{selectedEmployee.age || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Civil Status:</span>
                    <span className="detail-value">{selectedEmployee.civil_status || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Present Address:</span>
                    <span className="detail-value">{selectedEmployee.present_address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h4>Work Information</h4>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">Department:</span>
                    <span className="detail-value">{selectedEmployee.department}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Position:</span>
                    <span className="detail-value">{selectedEmployee.position}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Job Title:</span>
                    <span className="detail-value">{selectedEmployee.job_title || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedEmployee.employment_status}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tenurity:</span>
                    <span className="detail-value">{selectedEmployee.tenurity || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Salary:</span>
                    <span className="detail-value">₱{selectedEmployee.salary?.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Hire Date:</span>
                    <span className="detail-value">{selectedEmployee.hire_date}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h4>Contact Information</h4>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedEmployee.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedEmployee.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedEmployee.address || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Emergency Contact:</span>
                    <span className="detail-value">{selectedEmployee.emergency_contact_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Emergency Phone:</span>
                    <span className="detail-value">{selectedEmployee.emergency_contact_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h4>Government IDs</h4>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">SSS:</span>
                    <span className="detail-value">{selectedEmployee.sss || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">PhilHealth:</span>
                    <span className="detail-value">{selectedEmployee.philhealth || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Pag-IBIG:</span>
                    <span className="detail-value">{selectedEmployee.pagibig || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">TIN:</span>
                    <span className="detail-value">{selectedEmployee.tin_no || 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Employee"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>?</p>
          <p className="warning-text">This action cannot be undone.</p>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-btn"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
