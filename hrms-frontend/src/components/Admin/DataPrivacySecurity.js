import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldAlt, faToggleOn, faToggleOff, faEye, faEyeSlash,
  faLock, faUserLock, faClock, faExclamationTriangle, faCheckCircle,
  faSpinner, faDownload, faSearch, faFilter, faTimes
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import './DataPrivacySecurity.css';

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

const DataPrivacySecurity = () => {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordPolicy: true,
    accountLockout: true,
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    lockoutAttempts: 5,
    lockoutDuration: 15
  });
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFullAudit, setShowFullAudit] = useState(false);

  useEffect(() => {
    fetchSecuritySettings();
    fetchAuditLogs();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/security-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSecuritySettings(response.data);
    } catch (error) {
      console.error('Error fetching security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Mock data for demonstration
      setAuditLogs([
        {
          id: 1,
          user: 'John Doe',
          action: 'Login failed',
          timestamp: new Date().toISOString(),
          ip_address: '192.168.1.100',
          status: 'failed'
        },
        {
          id: 2,
          user: 'Jane Smith',
          action: 'Password changed',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ip_address: '192.168.1.101',
          status: 'success'
        },
        {
          id: 3,
          user: 'Admin User',
          action: 'Security settings updated',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ip_address: '192.168.1.102',
          status: 'success'
        }
      ]);
    }
  };

  const handleInputBlur = (field, value) => {
    if (field === 'searchTerm') {
      setSearchTerm(value);
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      setSaving(true);
      const newSettings = { ...securitySettings, [setting]: value };
      setSecuritySettings(newSettings);
      
      // Prepare the request data with proper field names
      const requestData = {
        twoFactorAuth: newSettings.twoFactorAuth,
        passwordPolicy: newSettings.passwordPolicy,
        accountLockout: newSettings.accountLockout,
        sessionTimeout: newSettings.sessionTimeout,
        passwordMinLength: newSettings.passwordMinLength,
        passwordRequireSpecial: newSettings.passwordRequireSpecial,
        passwordRequireNumbers: newSettings.passwordRequireNumbers,
        lockoutAttempts: newSettings.lockoutAttempts,
        lockoutDuration: newSettings.lockoutDuration
      };
      
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:8000/api/security-settings', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Show success notification
      showNotification('Security settings updated successfully', 'success');
    } catch (error) {
      console.error('Error updating security settings:', error);
      console.error('Error response:', error.response?.data);
      showNotification(`Failed to update security settings: ${error.response?.data?.message || error.message}`, 'error');
      // Revert the change
      setSecuritySettings(securitySettings);
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message, type) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `security-notification ${type}`;
    notification.innerHTML = `
      <FontAwesomeIcon icon={type === 'success' ? faCheckCircle : faExclamationTriangle} />
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || log.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const SecurityCard = ({ title, description, icon, children, color = '#7C3AED' }) => (
    <div className="security-card" style={{ '--card-color': color }}>
      <div className="card-header">
        <div className="card-icon">
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className="card-content">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );

  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      type="button"
      className={`toggle-switch ${enabled ? 'enabled' : 'disabled'} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange(!enabled)}
    >
      <div className="toggle-slider">
        <FontAwesomeIcon icon={enabled ? faToggleOn : faToggleOff} />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="security-loading">
        <FontAwesomeIcon icon={faSpinner} spin />
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="data-privacy-security">
      <div className="security-header">
        <div className="header-content">
          <h1>Data Privacy & Security</h1>
          <p>Configure security policies and monitor system access</p>
        </div>
      </div>

      <div className="security-settings">
        <SecurityCard
          title="Two-Factor Authentication"
          description="Require additional verification for user logins"
          icon={faShieldAlt}
          color="#7C3AED"
        >
          <div className="setting-item">
            <div className="setting-info">
              <h4>Enable 2FA</h4>
              <p>Users will need to verify their identity with a second factor</p>
            </div>
            <ToggleSwitch
              enabled={securitySettings.twoFactorAuth}
              onChange={(value) => handleSettingChange('twoFactorAuth', value)}
              disabled={saving}
            />
          </div>
        </SecurityCard>

        <SecurityCard
          title="Password Policy"
          description="Configure password requirements and complexity"
          icon={faLock}
          color="#059669"
        >
          <div className="setting-item">
            <div className="setting-info">
              <h4>Enforce Password Policy</h4>
              <p>Require strong passwords for all user accounts</p>
            </div>
            <ToggleSwitch
              enabled={securitySettings.passwordPolicy}
              onChange={(value) => handleSettingChange('passwordPolicy', value)}
              disabled={saving}
            />
          </div>
          
          {securitySettings.passwordPolicy && (
            <div className="policy-settings">
              <div className="policy-item">
                <label>Minimum Length</label>
                <input
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="32"
                />
              </div>
              <div className="policy-item">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordRequireSpecial}
                    onChange={(e) => handleSettingChange('passwordRequireSpecial', e.target.checked)}
                  />
                  Require Special Characters
                </label>
              </div>
              <div className="policy-item">
                <label>
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordRequireNumbers}
                    onChange={(e) => handleSettingChange('passwordRequireNumbers', e.target.checked)}
                  />
                  Require Numbers
                </label>
              </div>
            </div>
          )}
        </SecurityCard>

        <SecurityCard
          title="Account Lockout"
          description="Protect against brute force attacks"
          icon={faUserLock}
          color="#DC2626"
        >
          <div className="setting-item">
            <div className="setting-info">
              <h4>Enable Account Lockout</h4>
              <p>Lock accounts after multiple failed login attempts</p>
            </div>
            <ToggleSwitch
              enabled={securitySettings.accountLockout}
              onChange={(value) => handleSettingChange('accountLockout', value)}
              disabled={saving}
            />
          </div>
          
          {securitySettings.accountLockout && (
            <div className="policy-settings">
              <div className="policy-item">
                <label>Max Failed Attempts</label>
                <input
                  type="number"
                  value={securitySettings.lockoutAttempts}
                  onChange={(e) => handleSettingChange('lockoutAttempts', parseInt(e.target.value))}
                  min="3"
                  max="10"
                />
              </div>
              <div className="policy-item">
                <label>Lockout Duration (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => handleSettingChange('lockoutDuration', parseInt(e.target.value))}
                  min="5"
                  max="60"
                />
              </div>
            </div>
          )}
        </SecurityCard>

        <SecurityCard
          title="Session Management"
          description="Control user session timeouts and security"
          icon={faClock}
          color="#F59E0B"
        >
          <div className="policy-item">
            <label>Session Timeout (minutes)</label>
            <input
              type="number"
              value={securitySettings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              min="5"
              max="480"
            />
          </div>
        </SecurityCard>
      </div>

      <div className="security-logs">
        <div className="logs-header">
          <h2>Security Audit Log</h2>
          <div className="logs-actions">
            <div className="search-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <UncontrolledInput
                type="text"
                placeholder="Search logs..."
                defaultValue={searchTerm}
                onBlur={handleInputBlur}
                fieldName="searchTerm"
                className="search-input"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Events</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <button
              type="button"
              className="view-full-btn"
              onClick={() => setShowFullAudit(true)}
            >
              <FontAwesomeIcon icon={faEye} />
              View Full Audit
            </button>
          </div>
        </div>

        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 10).map(log => (
                <tr key={log.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {log.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td>{log.action}</td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      <FontAwesomeIcon icon={log.status === 'success' ? faCheckCircle : faExclamationTriangle} />
                      {log.status}
                    </span>
                  </td>
                  <td>{log.ip_address}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="no-logs">
            <FontAwesomeIcon icon={faShieldAlt} />
            <p>No security events found</p>
          </div>
        )}
      </div>

      {/* Full Audit Modal */}
      {showFullAudit && (
        <FullAuditModal onClose={() => setShowFullAudit(false)}>
          <div className="modal-header">
            <h3>Full Security Audit Log</h3>
            <button type="button" className="modal-close" onClick={() => setShowFullAudit(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
            <div className="audit-content">
              <div className="audit-filters">
                <div className="search-container">
                  <FontAwesomeIcon icon={faSearch} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search all logs..."
                    className="search-input"
                  />
                </div>
                <div className="date-range">
                  <input type="date" placeholder="From" />
                  <input type="date" placeholder="To" />
                </div>
                <button type="button" className="export-btn">
                  <FontAwesomeIcon icon={faDownload} />
                  Export Logs
                </button>
              </div>
              <div className="audit-table-container">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>IP Address</th>
                      <th>User Agent</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td>{log.user}</td>
                        <td>{log.action}</td>
                        <td>
                          <span className={`status-badge ${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.ip_address}</td>
                        <td>Mozilla/5.0...</td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </FullAuditModal>
      )}
    </div>
  );
};

const FullAuditModal = ({ onClose, children }) => {
  const { lockScroll, unlockScroll } = useScrollLock();

  useEffect(() => {
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default DataPrivacySecurity;
