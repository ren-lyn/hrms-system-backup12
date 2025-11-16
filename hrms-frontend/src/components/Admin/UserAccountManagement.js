import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faEdit, faTrash, faKey, faToggleOn, faToggleOff,
  faFilter, faTimes, faEye, faEyeSlash, faSave, faSpinner, faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './UserAccountManagement.css';

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

// Uncontrolled input component using refs to prevent re-render issues
const UncontrolledInput = ({ type, defaultValue, onBlur, required, placeholder, fieldName, ...props }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (inputRef.current && inputRef.current.type !== type) {
      inputRef.current.type = type;
    }
  }, [type]);
  
  const handleBlur = () => {
    if (onBlur && inputRef.current) {
      onBlur(fieldName, inputRef.current.value);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      defaultValue={defaultValue}
      onBlur={handleBlur}
      required={required}
      placeholder={placeholder}
      {...props}
    />
  );
};

const UserAccountManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPasswordData, setSetPasswordData] = useState({
    password: '',
    password_confirmation: ''
  });

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role_id: '',
    password: '',
    is_active: true
  });

  const [roles, setRoles] = useState([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const filterUsers = useCallback(() => {
    // Start with all users
    let filtered = [...users];

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      filtered = filtered.filter(user => {
        const firstName = (user.first_name || '').trim();
        const lastName = (user.last_name || '').trim();
        const email = (user.email || '').trim();
        const searchLower = searchTerm.toLowerCase().trim();
        
        return `${firstName} ${lastName}`.toLowerCase().includes(searchLower) ||
               email.toLowerCase().includes(searchLower);
      });
    }

    // Apply role filter
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userRoleName = user.role?.name || '';
        return userRoleName === roleFilter;
      });
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => {
        // Handle both boolean and string representations
        const userActive = typeof user.is_active === 'boolean' 
          ? user.is_active 
          : user.is_active === 1 || user.is_active === '1' || user.is_active === true;
        return userActive === isActive;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleAddUser = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role_id: '',
      password: '',
      is_active: true
    });
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role_id: user.role_id,
      password: '',
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setFormData({
      password: '',
      confirmPassword: ''
    });
    setShowResetConfirmation(false);
    setShowResetSuccess(false);
    setShowResetPassword(false);
    setShowPasswordModal(true);
  };

  const handleSetPassword = (user) => {
    setSelectedUser(user);
    setSetPasswordData({
      password: '',
      password_confirmation: ''
    });
    setShowSetPasswordModal(true);
  };

  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (setPasswordData.password !== setPasswordData.password_confirmation) {
      alert('Passwords do not match');
      return;
    }

    if (setPasswordData.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      await axios.put(`http://localhost:8000/api/users/${selectedUser.id}/reset-password`, {
        password: setPasswordData.password,
        password_confirmation: setPasswordData.password_confirmation
      });
      await fetchUsers();
      setShowSetPasswordModal(false);
      setSetPasswordData({
        password: '',
        password_confirmation: ''
      });
      alert('Password has been successfully set.');
    } catch (error) {
      console.error('Error setting password:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.password?.[0] || 'Unable to set password. Please try again.';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputBlur = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleStatus = async (user) => {
    try {
      setSaving(true);
      await axios.put(`http://localhost:8000/api/users/${user.id}`, {
        is_active: !user.is_active
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      if (showAddModal) {
        await axios.post('http://localhost:8000/api/users', formData);
      } else if (showEditModal) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await axios.put(`http://localhost:8000/api/users/${selectedUser.id}`, updateData);
      }
      
      await fetchUsers();
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role_id: '',
        password: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await axios.delete(`http://localhost:8000/api/users/${selectedUser.id}`);
      await fetchUsers();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setShowResetConfirmation(true);
  };

  const confirmResetPassword = async () => {
    try {
      setSaving(true);
      await axios.put(`http://localhost:8000/api/users/${selectedUser.id}/reset-password`, {
        password: formData.password,
        password_confirmation: formData.confirmPassword
      });
      await fetchUsers();
      setShowResetConfirmation(false);
      setShowPasswordModal(false);
      setShowResetPassword(false);
      setFormData({ password: '', confirmPassword: '' });
      setShowResetSuccess(true);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Unable to reset password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const ResetPasswordForm = ({ onCancel, onSubmit }) => (
    <form onSubmit={onSubmit} className="user-form reset-form">
      <div className="form-group">
        <label>New Password</label>
        <div className="password-input-container">
          <input
            type={showResetPassword ? 'text' : 'password'}
            value={formData.password || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            required
            placeholder="Enter new password"
            autoFocus
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowResetPassword((prev) => !prev)}
            aria-label={showResetPassword ? 'Hide password' : 'Show password'}
          >
            <FontAwesomeIcon icon={showResetPassword ? faEyeSlash : faEye} />
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Confirm Password</label>
        <div className="password-input-container">
          <input
            type={showResetPassword ? 'text' : 'password'}
            value={formData.confirmPassword || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            required
            placeholder="Re-enter new password"
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faKey} />}
          {saving ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );

  const Modal = ({ isOpen, onClose, title, children, contentClassName = '', hideHeader = false }) => {
    const { lockScroll, unlockScroll } = useScrollLock();

    useEffect(() => {
      if (isOpen) {
        lockScroll();
      }
      return () => {
        if (isOpen) {
          unlockScroll();
        }
      };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className={`modal-content ${contentClassName}`} onClick={e => e.stopPropagation()}>
          {!hideHeader ? (
            <div className="modal-header">
              <h3>{title}</h3>
              <button type="button" className="modal-close" onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ) : (
            <button type="button" className="modal-close standalone" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
          {children}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="user-management-loading">
        <FontAwesomeIcon icon={faSpinner} spin />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div className="header-content">
          <h1>User Account Management</h1>
          <p>Manage user accounts, roles, and permissions</p>
        </div>
      </div>

      <div className="user-management-filters">
        <div className="search-container">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {(user.first_name || '').charAt(0)}{(user.last_name || '').charAt(0)}
                    </div>
                    <div>
                      <div className="user-name">{user.first_name || ''} {user.last_name || ''}</div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role?.name?.toLowerCase().replace(' ', '-')}`}>
                    {user.role?.name}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className={`status-toggle ${user.is_active ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleStatus(user)}
                    disabled={saving}
                  >
                    <FontAwesomeIcon icon={user.is_active ? faToggleOn : faToggleOff} />
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="action-btn edit-btn"
                      onClick={() => handleEditUser(user)}
                      title="Edit User"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      type="button"
                      className="action-btn password-btn"
                      onClick={() => handleSetPassword(user)}
                      title="Set Password"
                    >
                      <FontAwesomeIcon icon={faKey} />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteUser(user)}
                      title="Delete User"
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

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showAddModal ? 'Add New User' : 'Edit User'}
      >
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={formData.first_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.last_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.target.focus();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.target.focus();
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.role_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
              required
            >
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Password {showEditModal && '(leave blank to keep current)'}</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                required={showAddModal}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="checkmark"></span>
              Active Account
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?</p>
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

      {/* Reset Password Modal (new form) */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowResetPassword(false);
          setShowPasswordModal(false);
          setShowResetConfirmation(false);
        }}
        title="Reset Password"
        contentClassName="no-scroll"
      >
        <ResetPasswordForm
          onCancel={() => {
            setShowResetPassword(false);
            setShowPasswordModal(false);
            setShowResetConfirmation(false);
          }}
          onSubmit={handleResetPasswordSubmit}
        />
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        hideHeader
      >
        <div className="confirm-reset-content">
          <h3>Are you sure?</h3>
          <p>Are you sure you want to reset this employee&apos;s password? This action cannot be undone.</p>
          <div className="confirm-reset-actions">
            <button
              type="button"
              className="confirm-reset-cancel"
              onClick={() => setShowResetConfirmation(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="confirm-reset-confirm"
              onClick={confirmResetPassword}
              disabled={saving}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Success Modal */}
      <Modal
        isOpen={showResetSuccess}
        onClose={() => setShowResetSuccess(false)}
        contentClassName="success-reset-modal"
        hideHeader
      >
        <div className="success-reset-content">
          <div className="success-reset-icon">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
          <h3>Success!</h3>
          <p>Password has been successfully reset.</p>
          <button
            type="button"
            className="success-reset-button"
            onClick={() => setShowResetSuccess(false)}
          >
            Okay
          </button>
        </div>
      </Modal>

      {/* Set Password Modal */}
      <Modal
        isOpen={showSetPasswordModal}
        onClose={() => {
          setShowSetPasswordModal(false);
          setSetPasswordData({
            password: '',
            password_confirmation: ''
          });
        }}
        title="Set New Password"
        contentClassName="no-scroll"
      >
        <form onSubmit={handleSetPasswordSubmit} className="user-form">
          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-container">
              <input
                type={showSetPassword ? 'text' : 'password'}
                value={setPasswordData.password}
                onChange={(e) => setSetPasswordData(prev => ({ ...prev, password: e.target.value }))}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                required
                placeholder="Enter new password (min. 8 characters)"
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowSetPassword(!showSetPassword)}
                aria-label={showSetPassword ? 'Hide password' : 'Show password'}
              >
                <FontAwesomeIcon icon={showSetPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showSetPassword ? 'text' : 'password'}
                value={setPasswordData.password_confirmation}
                onChange={(e) => setSetPasswordData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.target.focus();
                }}
                required
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowSetPasswordModal(false);
                setSetPasswordData({
                  password: '',
                  password_confirmation: ''
                });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faKey} />}
              {saving ? 'Setting...' : 'Set Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserAccountManagement;
