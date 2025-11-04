import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faUsers, faUserCog, faBuilding, faShieldAlt,
  faSignOutAlt, faBars, faTimes, faUser, faCog, faChartBar,
  faUserPlus, faEdit, faTrash, faEye, faKey, faToggleOn, faToggleOff
} from '@fortawesome/free-solid-svg-icons';
import useUserProfile from '../hooks/useUserProfile';
import axios from 'axios';
import UserAccountManagement from '../components/Admin/UserAccountManagement';
import EmployeeManagement from '../components/Admin/EmployeeManagement';
import DepartmentPositionManagement from '../components/Admin/DepartmentPositionManagement';
import DataPrivacySecurity from '../components/Admin/DataPrivacySecurity';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const { userProfile, loading } = useUserProfile();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  // Responsive sidebar management
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1023;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const adminModules = [
    { 
      id: 'user-management', 
      title: 'User Account Management', 
      icon: faUserCog, 
      description: 'Manage user accounts, roles, and permissions',
      color: '#4F46E5'
    },
    { 
      id: 'employee-management', 
      title: 'Employee Management', 
      icon: faUsers, 
      description: 'Manage employee profiles and information',
      color: '#059669'
    },
    { 
      id: 'department-position', 
      title: 'Department & Position Management', 
      icon: faBuilding, 
      description: 'Organize departments and positions',
      color: '#DC2626'
    },
    { 
      id: 'data-privacy', 
      title: 'Data Privacy & Security', 
      icon: faShieldAlt, 
      description: 'Configure security policies and monitor access',
      color: '#7C3AED'
    }
  ];

  // Fetch employee records for stats
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/employee-profiles');
        setEmployees(Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // (Security alerts removed)
  // Fetch password change requests (preferred) or fallback security alerts
  // Security Alerts feature removed

  const totalUsers = useMemo(() => employees.length, [employees]);
  const totalRoles = useMemo(() => {
    const normalizeRole = (value) => {
      if (value && typeof value === 'object' && value.name) value = value.name;
      if (typeof value === 'number') value = String(value);
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (lower === 'n/a' || lower === 'none' || lower === 'na') return null;
      return lower;
    };

    const unique = new Set();
    employees.forEach(emp => {
      if (!emp) return;
      // Support common role fields from HR Assistant records
      const candidates = [];
      if (Array.isArray(emp.roles)) {
        emp.roles.forEach(r => candidates.push(r));
      }
      candidates.push(
        emp.role,
        emp.user_role,
        emp.userRole,
        emp.position, // fallback to position if role not explicitly present
        emp.job_title
      );

      candidates.forEach(c => {
        const key = normalizeRole(c);
        if (key) unique.add(key);
      });
    });
    return unique.size;
  }, [employees]);

  // Helpers for displaying names/departments and deriving roles
  const getEmployeeDisplay = (e) => {
    const fullName = `${e?.first_name || ''} ${e?.last_name || ''}`.trim() || (e?.name || 'Unknown');
    const department = e?.department_name || e?.departmentName || e?.dept_name || e?.dept || e?.department || 'N/A';
    return { fullName, department };
  };

  const getEmployeeRoles = (emp) => {
    const roles = [];
    if (!emp) return roles;
    const pushVal = (v) => {
      if (!v) return;
      if (typeof v === 'object' && v.name) v = v.name;
      if (typeof v !== 'string') return;
      const t = v.trim();
      if (t) roles.push(t.toLowerCase());
    };
    if (Array.isArray(emp.roles)) emp.roles.forEach(r => pushVal(r));
    pushVal(emp.role);
    pushVal(emp.user_role);
    pushVal(emp.userRole);
    pushVal(emp.position);
    pushVal(emp.job_title);
    return roles;
  };

  const canonicalRoles = [
    'HR Assistant',
    'HR Staff',
    'Manager',
    'Employee',
    'Applicant'
  ];

  const employeesByRole = (roleName) => {
    const key = roleName.toLowerCase();
    return employees.filter(emp => {
      const roles = getEmployeeRoles(emp);
      if (key === 'manager') return roles.some(r => r === 'manager' || r.includes('manager'));
      if (key === 'hr assistant') return roles.some(r => r === 'hr assistant' || r.includes('assistant'));
      if (key === 'hr staff') return roles.some(r => r === 'hr staff' || r.includes('hr') && r.includes('staff'));
      if (key === 'employee') return roles.some(r => r === 'employee' || r.includes('staff') || r.includes('worker'));
      if (key === 'applicant') return roles.some(r => r === 'applicant' || r.includes('applicant'));
      return false;
    });
  };

  // (Security alerts removed)
  // Security Alerts feature removed

  const renderContent = () => {
    switch (activeView) {
      case 'user-management':
        return <UserAccountManagement />;
      case 'employee-management':
        return <EmployeeManagement />;
      case 'department-position':
        return <DepartmentPositionManagement />;
      case 'data-privacy':
        return <DataPrivacySecurity />;
      case 'dashboard':
      default:
        return (
          <div className="admin-dashboard-content">
            <div className="admin-stats">
              <button className="stat-card stat-card-button" onClick={() => setShowUsers(true)}>
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <p className="stat-number">{totalUsers}</p>
                </div>
              </button>
              <button className="stat-card stat-card-button" onClick={() => { setActiveRole(null); setShowRoles(true); }}>
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faUserCog} />
                </div>
                <div className="stat-content">
                  <h3>Roles</h3>
                  <p className="stat-number">{totalRoles}</p>
                </div>
              </button>
              {/* Security Alerts feature removed */}
            </div>

            <div className="admin-modules-grid">
              {adminModules.map((module) => (
                <div
                  key={module.id}
                  className="admin-module-card"
                  onClick={() => setActiveView(module.id)}
                  style={{ '--module-color': module.color }}
                >
                  <div className="module-icon">
                    <FontAwesomeIcon icon={module.icon} />
                  </div>
                  <div className="module-content">
                    <h3 className="module-title">{module.title}</h3>
                    <p className="module-description">{module.description}</p>
                  </div>
                  <div className="module-arrow">
                    <FontAwesomeIcon icon={faEdit} />
                  </div>
                </div>
              ))}
            </div>

            {/* Security Alerts feature removed */}

            {showUsers && (
              <div className="alerts-modal-overlay" onClick={() => setShowUsers(false)}>
                <div className="alerts-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="alerts-modal-header">
                    <h3><FontAwesomeIcon icon={faUsers} /> Users</h3>
                    <button className="alerts-close" onClick={() => setShowUsers(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <div className="alerts-modal-body">
                    <ul className="entity-list">
                      {employees.map((e, i) => {
                        const { fullName, department } = getEmployeeDisplay(e);
                        return (
                          <li key={i} className="entity-item">
                            <span className="entity-name">{fullName}</span>
                            <span className="entity-meta">{department}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {showRoles && (
              <div className="alerts-modal-overlay" onClick={() => setShowRoles(false)}>
                <div className="alerts-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="alerts-modal-header">
                    <h3><FontAwesomeIcon icon={faUserCog} /> Roles</h3>
                    <button className="alerts-close" onClick={() => setShowRoles(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <div className="alerts-modal-body roles-body">
                    <div className="roles-list">
                      {canonicalRoles.map((r) => {
                        const members = employeesByRole(r);
                        const isActive = activeRole && activeRole.toLowerCase() === r.toLowerCase();
                        return (
                          <button
                            key={r}
                            className={`role-pill ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveRole(r)}
                          >
                            {r} ({members.length})
                          </button>
                        );
                      })}
                    </div>
                    <div className="role-members">
                      {!activeRole ? (
                        <p className="no-selection">Select a role to view members.</p>
                      ) : (
                        <ul className="entity-list">
                          {employeesByRole(activeRole).map((e, i) => {
                            const { fullName } = getEmployeeDisplay(e);
                            return (
                              <li key={i} className="entity-item">
                                <span className="entity-name">{fullName}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Mobile Menu Button */}
      <button 
        className="admin-mobile-menu-btn"
        onClick={toggleSidebar}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* Sidebar Overlay */}
      <div 
        className={`admin-sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`}
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
        <div className="admin-sidebar-header">
          <h2 className="admin-logo">CCDC Admin</h2>
          <button 
            className="admin-close-btn"
            onClick={closeSidebar}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="admin-user-info">
          <div className="admin-user-avatar">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div className="admin-user-details">
            <h4>{userProfile?.first_name} {userProfile?.last_name}</h4>
            <p>System Administrator</p>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-link ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <FontAwesomeIcon icon={faTachometerAlt} />
            <span>Dashboard</span>
          </button>

          <button
            className={`admin-nav-link ${activeView === 'user-management' ? 'active' : ''}`}
            onClick={() => setActiveView('user-management')}
          >
            <FontAwesomeIcon icon={faUserCog} />
            <span>User Management</span>
          </button>

          <button
            className={`admin-nav-link ${activeView === 'employee-management' ? 'active' : ''}`}
            onClick={() => setActiveView('employee-management')}
          >
            <FontAwesomeIcon icon={faUsers} />
            <span>Employee Management</span>
          </button>

          <button
            className={`admin-nav-link ${activeView === 'department-position' ? 'active' : ''}`}
            onClick={() => setActiveView('department-position')}
          >
            <FontAwesomeIcon icon={faBuilding} />
            <span>Department & Position</span>
          </button>

          <button
            className={`admin-nav-link ${activeView === 'data-privacy' ? 'active' : ''}`}
            onClick={() => setActiveView('data-privacy')}
          >
            <FontAwesomeIcon icon={faShieldAlt} />
            <span>Data Privacy & Security</span>
          </button>

          {/* Moved Logout below Data Privacy & Security */}
          <button className="admin-logout-btn" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
