import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faUsers, faUserCog, faBuilding, faShieldAlt,
  faCalendar, faSignOutAlt, faBars, faTimes, faUser, faCog, faChartBar,
  faUserPlus, faEdit, faTrash, faEye, faKey, faToggleOn, faToggleOff, faBell
} from '@fortawesome/free-solid-svg-icons';
import useUserProfile from '../hooks/useUserProfile';
import axios from 'axios';
import UserAccountManagement from '../components/Admin/UserAccountManagement';
import EmployeeManagement from '../components/Admin/EmployeeManagement';
import LeaveForm from '../components/Admin/LeaveForm';
import DepartmentPositionManagement from '../components/Admin/DepartmentPositionManagement';
import DataPrivacySecurity from '../components/Admin/DataPrivacySecurity';
import PasswordResetRequests from '../components/Admin/PasswordResetRequests';
import './AdminDashboard.css';
import { fetchNotifications } from '../api/notifications';

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
  const [passwordRequestCounts, setPasswordRequestCounts] = useState({ total: 0, pending: 0 });
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [showNewEmployees, setShowNewEmployees] = useState(false);
  const [showPasswordRequests, setShowPasswordRequests] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [roleChangeRequests, setRoleChangeRequests] = useState([]);
  const [passwordResetNotifs, setPasswordResetNotifs] = useState([]);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const bellAnchorRef = React.useRef(null);

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
      id: 'leave-form', 
      title: 'Leave Form', 
      icon: faCalendar, 
      description: 'Submit leave applications directly from admin view',
      color: '#2563EB'
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
    },
    {
      id: 'password-reset-requests',
      title: 'Password Reset Requests',
      icon: faKey,
      description: 'Review identity verifications and send reset links',
      color: '#FB923C'
    }
  ];

  // Fetch employee records for stats
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get('http://localhost:8000/api/employee-profiles', { headers });
        setEmployees(Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch notifications (used to surface role change requests in New Employees section)
  useEffect(() => {
    let eventSource;
    let pollTimer;

    const loadNotifications = async () => {
      try {
        const res = await fetchNotifications();
        const list = res.data?.data || [];
        setNotifications(list);
        setRoleChangeRequests(list.filter(n => n.type === 'role_change_requested'));
        setPasswordResetNotifs(list.filter(n => n.type === 'password_change_request_submitted'));
      } catch (_e) {
        // keep previous state
      }
    };

    // Initial load
    loadNotifications();
    // Seed from last HR ping (in case it happened before this tab mounted)
    try {
      const seedRaw = localStorage.getItem('role_change_request_ping');
      if (seedRaw) {
        const seed = JSON.parse(seedRaw);
        if (seed && seed.type === 'role_change_requested') {
          setRoleChangeRequests((prev) => [
            {
              id: `local-${seed.at}`,
              type: 'role_change_requested',
              applicant_name: seed.applicant_name || 'Applicant',
              applicant_email: seed.applicant_email || '',
              created_at: new Date(seed.at || Date.now()).toISOString(),
            },
            ...prev,
          ]);
        }
      }
    } catch (_e) {}

    // SSE stream for near-real-time updates if available
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token && typeof EventSource !== 'undefined') {
        const url = `http://localhost:8000/api/notifications/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);
        eventSource.onmessage = () => {
          loadNotifications();
        };
        eventSource.onerror = () => {
          // Fallback to polling if SSE fails
          if (!pollTimer) {
            pollTimer = setInterval(loadNotifications, 15000);
          }
        };
      } else {
        pollTimer = setInterval(loadNotifications, 15000);
      }
    } catch (_e) {
      pollTimer = setInterval(loadNotifications, 15000);
    }

    // Also refresh when tab becomes visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Refresh when HR pings via localStorage
    const onStorage = (e) => {
      if (e.key === 'role_change_request_ping') {
        try {
          const payload = JSON.parse(e.newValue || '{}');
          if (payload && payload.type === 'role_change_requested') {
            // Optimistically show in UI
            setRoleChangeRequests((prev) => {
              const exists = prev.some(
                (n) =>
                  (n.applicant_email && n.applicant_email === payload.applicant_email) &&
                  Math.abs(new Date(n.created_at || 0).getTime() - (payload.at || 0)) < 60000
              );
              if (exists) return prev;
              return [
                {
                  id: `local-${payload.at}`,
                  type: 'role_change_requested',
                  applicant_name: payload.applicant_name || 'Applicant',
                  applicant_email: payload.applicant_email || '',
                  created_at: new Date(payload.at || Date.now()).toISOString(),
                },
                ...prev,
              ];
            });
          }
        } catch (_e) {
          // ignore parse errors
        }
        // Also refresh from backend
        loadNotifications();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      if (eventSource) eventSource.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // (Security alerts removed)
  // Fetch password change requests (preferred) or fallback security alerts
  // Security Alerts feature removed
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const fetchPasswordRequests = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/password-change-requests', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!isMounted) return;
        const items = Array.isArray(res.data) ? res.data : [];
        const pending = items.filter(it => (it.status || '').toLowerCase() === 'pending').length;
        setPasswordRequests(items);
        setPasswordRequestCounts({ total: items.length, pending });
      } catch (_e) {
        if (!isMounted) return;
        setPasswordRequestCounts({ total: 0, pending: 0 });
        setPasswordRequests([]);
      }
    };
    fetchPasswordRequests();
    const interval = setInterval(fetchPasswordRequests, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

  const recentNewEmployeesCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const isRecent = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return now.getTime() - d.getTime() <= sevenDaysMs;
    };
    const getCreatedDate = (e) => {
      return (
        e?.created_at ||
        e?.createdAt ||
        e?.date_hired ||
        e?.hire_date ||
        e?.joined_at ||
        e?.date_created ||
        null
      );
    };
    const employeeCount = employees.filter((e) => isRecent(getCreatedDate(e))).length;
    // Include role change requests as actionable items for onboarding
    const requestsCount = roleChangeRequests.length;
    return employeeCount + requestsCount;
  }, [employees, roleChangeRequests]);

  // Notification count for header bell (currently role change requests)
  const headerNotificationCount = useMemo(() => {
    const a = (roleChangeRequests || []).length;
    const b = (passwordResetNotifs || []).length;
    return a + b;
  }, [roleChangeRequests, passwordResetNotifs]);

  // Close header notifications on outside click
  useEffect(() => {
    if (!showHeaderNotifications) return;
    const onDocClick = (e) => {
      if (!bellAnchorRef.current) return;
      if (bellAnchorRef.current.contains(e.target)) return;
      setShowHeaderNotifications(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showHeaderNotifications]);

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

  const currentEmployeeRecord = useMemo(() => {
    if (!userProfile || !employees.length) return null;

    const normalize = (value) =>
      (value || '').toString().trim().toLowerCase();

    return (
      employees.find((emp) => {
        if (!emp) return false;

        const employeeEmail = normalize(
          emp.email || emp.user_email || emp.userEmail
        );
        const profileEmail = normalize(userProfile.email);
        if (employeeEmail && profileEmail && employeeEmail === profileEmail) {
          return true;
        }

        const employeeId = normalize(
          emp.user_id || emp.userId || emp.id
        );
        const profileId = normalize(userProfile.id);
        if (employeeId && profileId && employeeId === profileId) {
          return true;
        }

        const employeeFullName = normalize(
          `${emp.first_name || ''} ${emp.last_name || ''}`.trim() ||
            emp.name ||
            ''
        );
        const profileName = normalize(userProfile.name);
        return (
          employeeFullName &&
          profileName &&
          employeeFullName === profileName
        );
      }) || null
    );
  }, [employees, userProfile]);

  const currentRoleTitle = useMemo(() => {
    const candidates = [];

    const pushCandidate = (value) => {
      if (!value) return;
      if (typeof value === 'object' && value.name) {
        value = value.name;
      }
      if (typeof value !== 'string') return;
      const trimmed = value.trim();
      if (trimmed) {
        candidates.push(trimmed);
      }
    };

    if (currentEmployeeRecord) {
      pushCandidate(currentEmployeeRecord.system_role);
      pushCandidate(currentEmployeeRecord.role);
      pushCandidate(currentEmployeeRecord.user_role);
      pushCandidate(currentEmployeeRecord.userRole);
      pushCandidate(currentEmployeeRecord.position);
      pushCandidate(currentEmployeeRecord.job_title);
      pushCandidate(currentEmployeeRecord.title);
    }

    pushCandidate(userProfile?.role);
    pushCandidate(userProfile?.rawRole);

    const adminCandidate = candidates.find((candidate) =>
      candidate.toLowerCase().includes('admin')
    );

    if (adminCandidate) {
      return 'System Administration';
    }

    return candidates[0] || 'Employee';
  }, [currentEmployeeRecord, userProfile]);

  const renderContent = () => {
    switch (activeView) {
      case 'user-management':
        return <UserAccountManagement />;
      case 'employee-management':
        return <EmployeeManagement />;
      case 'leave-form':
        return <LeaveForm />;
      case 'department-position':
        return <DepartmentPositionManagement />;
      case 'data-privacy':
        return <DataPrivacySecurity />;
      case 'password-reset-requests':
        return <PasswordResetRequests />;
      case 'dashboard':
      default:
        return (
          <div className="admin-dashboard-content">
            {/* Header with notification bell */}
            <div className="admin-header">
              <div className="admin-header-title">Dashboard</div>
              <div className="admin-header-actions" ref={bellAnchorRef}>
                <button
                  className="admin-header-bell"
                  title="Notifications"
                  onClick={() => setShowHeaderNotifications((v) => !v)}
                >
                  <FontAwesomeIcon icon={faBell} />
                  {headerNotificationCount > 0 && (
                    <span className="admin-bell-badge">{headerNotificationCount}</span>
                  )}
                </button>
                {showHeaderNotifications && (
                  <div className="admin-notif-dropdown">
                    <div className="admin-notif-header">Notifications</div>
                    <div className="admin-notif-body">
                      {((roleChangeRequests && roleChangeRequests.length > 0) || (passwordResetNotifs && passwordResetNotifs.length > 0)) ? (
                        <ul className="admin-notif-list">
                          {[...roleChangeRequests, ...passwordResetNotifs].map((n, i) => {
                            const name = n.applicant_name || n.applicant_email || 'Applicant';
                            const isPwd = n.type === 'password_change_request_submitted';
                            const displayName = isPwd ? (n.full_name || n.email || 'User') : name;
                            const meta = isPwd ? (n.email || '') : (n.applicant_email || '');
                            const body = isPwd ? (n.message || 'Password reset requested') : (n.hr_message || 'Role needs to be updated');
                            return (
                              <li key={`hdr-${i}`} className="admin-notif-item">
                                <div className="admin-notif-item-title">{displayName}</div>
                                <div className="admin-notif-item-meta">{body}</div>
                                {meta ? <div className="admin-notif-item-meta">{meta}</div> : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="admin-notif-empty">No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
              <button
                className="stat-card stat-card-button"
                onClick={() => setShowNewEmployees(true)}
                title="View recently added employees"
              >
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faUserPlus} />
                </div>
                <div className="stat-content">
                  <h3>New Employees</h3>
                  <p className="stat-number">{recentNewEmployeesCount}</p>
                </div>
              </button>
              <button
                className="stat-card stat-card-button"
                onClick={() => setShowPasswordRequests(true)}
                title="View pending password change requests"
              >
                <div className="stat-icon">
                  <FontAwesomeIcon icon={faKey} />
                </div>
                <div className="stat-content">
                  <h3>New Password Resets</h3>
                  <p className="stat-number">{passwordRequestCounts.pending}</p>
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

            {showNewEmployees && (
              <div className="alerts-modal-overlay" onClick={() => setShowNewEmployees(false)}>
                <div className="alerts-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="alerts-modal-header">
                    <h3><FontAwesomeIcon icon={faUserPlus} /> New Employees</h3>
                    <button className="alerts-close" onClick={() => setShowNewEmployees(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <div className="alerts-modal-body">
                    <ul className="entity-list">
                      {employees
                        .filter((e) => {
                          const created =
                            e?.created_at ||
                            e?.createdAt ||
                            e?.date_hired ||
                            e?.hire_date ||
                            e?.joined_at ||
                            e?.date_created ||
                            null;
                          if (!created) return false;
                          const d = new Date(created);
                          if (isNaN(d.getTime())) return false;
                          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                          return Date.now() - d.getTime() <= sevenDaysMs;
                        })
                        .map((e, i) => {
                          const { fullName, department } = getEmployeeDisplay(e);
                          return (
                            <li key={i} className="entity-item">
                              <span className="entity-name">{fullName}</span>
                              <span className="entity-meta">{department}</span>
                            </li>
                          );
                        })}
                      {roleChangeRequests.map((n, i) => {
                        const name = n.applicant_name || n.applicant_email || 'Applicant';
                        const meta = n.applicant_email || '';
                        return (
                          <li key={`req-${i}`} className="entity-item">
                            <span className="entity-name">{name}</span>
                            <span className="entity-meta">Role change requested {meta ? `• ${meta}` : ''}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        className="admin-logout-btn"
                        onClick={() => {
                          setShowNewEmployees(false);
                          setActiveView('user-management');
                        }}
                        style={{ width: 'auto', padding: '8px 14px', background: '#4F46E5' }}
                      >
                        View in User Management
                      </button>
                    </div>
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

            {showPasswordRequests && (
              <div className="alerts-modal-overlay" onClick={() => setShowPasswordRequests(false)}>
                <div className="alerts-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="alerts-modal-header">
                    <h3><FontAwesomeIcon icon={faKey} /> Password Reset Requests</h3>
                    <button className="alerts-close" onClick={() => setShowPasswordRequests(false)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                  <div className="alerts-modal-body">
                    <ul className="entity-list">
                      {passwordRequests
                        .filter((r) => (r.status || '').toLowerCase() === 'pending')
                        .map((r, i) => {
                          const name = r.full_name || r.name || r.email || `Request #${r.id}`;
                          const meta = r.department || r.email || '';
                          return (
                            <li key={i} className="entity-item">
                              <span className="entity-name">{name}</span>
                              <span className="entity-meta">{meta}</span>
                            </li>
                          );
                        })}
                    </ul>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        className="admin-logout-btn"
                        onClick={() => {
                          setShowPasswordRequests(false);
                          setActiveView('password-reset-requests');
                        }}
                        style={{ width: 'auto', padding: '8px 14px', background: '#FB923C' }}
                      >
                        View in Password Requests
                      </button>
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
            <h4>
              {userProfile?.name || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'User'}
            </h4>
            <p>{currentRoleTitle}</p>
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
            className={`admin-nav-link ${activeView === 'leave-form' ? 'active' : ''}`}
            onClick={() => setActiveView('leave-form')}
          >
            <FontAwesomeIcon icon={faCalendar} />
            <span>Leave Form</span>
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
