import React, { useEffect, useState, Suspense, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import { Button, Form, Spinner } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EvaluationResult from '../components/Manager/EvaluationResult';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Bell from '../components/Notifications/Bell';
import EvaluationAnalyticsSection from '../components/Employee/EvaluationAnalyticsSection';
import DisciplinaryNoticesSection from '../components/Employee/DisciplinaryNoticesSection';
import LeaveTrackerSection from '../components/Employee/LeaveTrackerSection';
import '../components/Employee/MonitoringDashboard.css';
import {
  faTachometerAlt,
  faUser,
  faMoneyBillWave,
  faCalendarAlt,
  faHandHoldingUsd,
  faSignOutAlt,
  faEnvelope,
  faBell,
  faChartBar,
  faClock,
  faBars,
  faExclamationTriangle,
  faPlane
} from '@fortawesome/free-solid-svg-icons';

// Lazy load components for better performance
const EmbeddedLeaveForm = React.lazy(() => import('../components/Employee/EmbeddedLeaveForm'));
const EmployeeProfile = React.lazy(() => import('../components/Employee/EmployeeProfile'));
const LeaveRequestView = React.lazy(() => import('../components/Employee/LeaveRequestView'));
const CashAdvanceForm = React.lazy(() => import('../components/Employee/CashAdvanceForm'));
const EmployeeDisciplinaryNotice = React.lazy(() => import('../components/Employee/EmployeeDisciplinaryNotice'));
const EmployeeCalendar = React.lazy(() => import('../components/Employee/EmployeeCalendar'));
const CashAdvanceView = React.lazy(() => import('../components/Employee/CashAdvanceView'));
const CashAdvanceHistory = React.lazy(() => import('../components/Employee/CashAdvanceHistory'));


const EmployeeDashboard = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [activeView, setActiveView] = useState('dashboard'); // default view
  const [isCashAdvanceDropdownOpen, setIsCashAdvanceDropdownOpen] = useState(false);

  // Evaluation summary state
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResults, setEvalResults] = useState([]);
  const [selectedEvalId, setSelectedEvalId] = useState(null);
  const [evalDetail, setEvalDetail] = useState(null);
  const [userId, setUserId] = useState(null);

  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [selectedCashAdvanceId, setSelectedCashAdvanceId] = useState(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const [evaluationNotificationData, setEvaluationNotificationData] = useState(null);
  const [calendarNotificationData, setCalendarNotificationData] = useState(null);

  // Data cache for faster loading
  const [dataCache, setDataCache] = useState({
    profile: null,
    evaluations: null,
    lastFetch: null
  });


  // Preload data for faster navigation
  const preloadData = useMemo(() => {
    return async (userId) => {
      if (!userId) return;
      
      try {
        // Preload evaluations in background
        const evalRes = await axios.get(`http://localhost:8000/api/manager-evaluations/employee/${userId}/results`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        setDataCache(prev => ({
          ...prev,
          evaluations: evalRes.data?.data || [],
          lastFetch: Date.now()
        }));
      } catch (e) {
        console.error('Failed to preload evaluations', e);
      }
    };
  }, []);

   // Preload cash advance data in background for instant loading
  const preloadCashAdvanceData = useMemo(() => {
    return async () => {
      try {
        // Check cache first
        const cacheKey = 'cashAdvanceCache';
        const cacheTimeKey = 'cashAdvanceCacheTime';
        
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        const now = Date.now();
        const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
        const isCacheValid = cacheAge < 2 * 60 * 1000; // 2 minutes cache
        
        if (!cachedData || !isCacheValid) {
          // Fetch fresh data in background
          const statsPromise = axios.get('http://localhost:8000/api/cash-advances/my-stats', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const historyPromise = axios.get('http://localhost:8000/api/cash-advances/my-requests', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          const [statsRes, historyRes] = await Promise.all([statsPromise, historyPromise]);
          
          const cacheData = {
            stats: statsRes.data,
            history: historyRes.data.data || historyRes.data || []
          };
          
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        }
      } catch (err) {
        console.error('Failed to preload cash advance data:', err);
      }
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/auth/user', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setEmployeeName(res.data.name);
        setUserId(res.data.id);
        
        // Preload data in background
        preloadData(res.data.id);
        preloadCashAdvanceData();
      } catch (err) {
        console.error('Failed to fetch user info', err);
      }
    };

    fetchUser();
   }, [preloadData, preloadCashAdvanceData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    try {
      // Clear token and any user data
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      // Redirect to landing/login
      window.location.href = '/';
    } catch (e) {
      console.error('Logout failed', e);
      window.location.href = '/';
    }
  };

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'profile': return 'Profile';
      case 'payroll-summary': return 'Payslip Summary';
      case 'timesheet': return 'Timesheet';
      case 'leave-request': return selectedLeaveId ? 'Leave Request Details' : 'Leave Application Form';
      case 'my-calendar': return 'My Calendar';
      case 'cash-advance': return selectedCashAdvanceId ? 'Cash Advance Details' : 'Cash Advance';
      case 'cash-advance-history': return 'Cash Advance History';
      case 'evaluation-summary': return selectedEvaluationId ? 'Evaluation Result' : 'Evaluation Summary';
      case 'disciplinary-notice': return 'Disciplinary Notice';
      default: return 'Dashboard';
    }
  };

    const toggleCashAdvanceDropdown = () => {
    setIsCashAdvanceDropdownOpen(!isCashAdvanceDropdownOpen);
  };

  // Fetch evaluations for the logged-in employee (optimized with cache)
  const loadEmployeeEvaluations = async (empId) => {
    try {
      setEvalLoading(true);
      setEvalResults([]);
      setEvalDetail(null);
      
      // Check cache first
      const cacheAge = Date.now() - (dataCache.lastFetch || 0);
      const isCacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes
      
      let results = [];
      if (dataCache.evaluations && isCacheValid) {
        results = dataCache.evaluations;
        setEvalResults(results);
      } else {
        const res = await axios.get(`http://localhost:8000/api/manager-evaluations/employee/${empId}/results`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        results = res.data?.data || [];
        setEvalResults(results);
        
        // Update cache
        setDataCache(prev => ({
          ...prev,
          evaluations: results,
          lastFetch: Date.now()
        }));
      }
      
      if (results.length > 0) {
        setSelectedEvalId(results[0].id);
        await loadEvaluationDetail(results[0].id);
      }
    } catch (e) {
      console.error('Failed to load evaluation results', e);
    } finally {
      setEvalLoading(false);
    }
  };

  const loadEvaluationDetail = async (evaluationId) => {
    try {
      setEvalLoading(true);
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/result/${evaluationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEvalDetail(res.data?.data || null);
    } catch (e) {
      console.error('Failed to load evaluation detail', e);
    } finally {
      setEvalLoading(false);
    }
  };

  const downloadEvaluationPDF = async (evaluationId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/result/${evaluationId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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
    } catch (e) {
      console.error('Failed to download evaluation PDF', e);
    }
  };

  useEffect(() => {
    if (activeView === 'evaluation-summary' && userId) {
      if (selectedEvaluationId) {
        // Load specific evaluation if coming from notification
        loadEvaluationDetail(selectedEvaluationId);
      } else {
        // Load all evaluations for selection
        loadEmployeeEvaluations(userId);
      }
    }
  }, [activeView, userId, selectedEvaluationId]);

  // Loading fallback component
  const LoadingFallback = ({ message = "Loading..." }) => (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
      <div className="text-center">
        <Spinner animation="border" role="status" className="mb-3">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="text-muted">{message}</div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="responsive-dashboard-grid monitoring-dashboard">
            {/* Top Row - Evaluation Analytics and Calendar */}
            <div className="dashboard-top-row">
              {/* Evaluation Analytics Section */}
              <div className="responsive-card monitoring-card">
                <div className="responsive-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 responsive-header">
                    <h6 className="text-secondary m-0 text-responsive-md">
                      <FontAwesomeIcon icon={faChartBar} className="me-2 text-success" /> Evaluation Analytics
                    </h6>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="responsive-btn"
                      onClick={() => setActiveView('evaluation-summary')}
                    >
                      View All
                    </Button>
                  </div>
                  <EvaluationAnalyticsSection />
                </div>
              </div>

              {/* Calendar Section */}
              <div className="responsive-card calendar-section">
                <div className="responsive-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 responsive-header">
                    <h6 className="text-secondary m-0 text-responsive-md">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" /> Calendar
                    </h6>
                    <span className="small text-muted text-responsive-sm">
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {timeNow.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="responsive-calendar">
                    <Calendar onChange={setCalendarDate} value={calendarDate} className="w-100 border-0" />
                    <div className="calendar-header-info">
                      <div className="calendar-date-info">
                        {calendarDate.toLocaleDateString('en-US', { 
                          month: 'numeric', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="calendar-weather-info">
                        {new Date().toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} • 27.2°C Overcast
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Disciplinary Notices and Leave Tracker */}
            <div className="dashboard-bottom-row">
              {/* Disciplinary Notices Section */}
              <div className="responsive-card monitoring-card">
                <div className="responsive-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 responsive-header">
                    <h6 className="text-secondary m-0 text-responsive-md">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 text-warning" /> Disciplinary Notices
                    </h6>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="responsive-btn"
                      onClick={() => setActiveView('disciplinary-notice')}
                    >
                      View All
                    </Button>
                  </div>
                  <DisciplinaryNoticesSection />
                </div>
              </div>

              {/* Leave Tracker Section */}
              <div className="responsive-card monitoring-card">
                <div className="responsive-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 responsive-header">
                    <h6 className="text-secondary m-0 text-responsive-md">
                      <FontAwesomeIcon icon={faPlane} className="me-2 text-info" /> Leave Tracker
                    </h6>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="responsive-btn"
                      onClick={() => setActiveView('leave-request')}
                    >
                      Request Leave
                    </Button>
                  </div>
                  <LeaveTrackerSection />
                </div>
              </div>
            </div>
          </div>
        );
      case 'leave-request':
        if (selectedLeaveId) {
          return (
            <Suspense fallback={<LoadingFallback message="Loading leave request details..." />}>
              <LeaveRequestView leaveId={selectedLeaveId} onBack={() => { setSelectedLeaveId(null); setActiveView('dashboard'); }} />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<LoadingFallback message="Loading leave form..." />}>
            <EmbeddedLeaveForm />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<LoadingFallback message="Loading profile..." />}>
            <EmployeeProfile />
          </Suspense>
        );
      case 'cash-advance':
        if (selectedCashAdvanceId) {
          return (
            <Suspense fallback={<LoadingFallback message="Loading cash advance details..." />}>
              <CashAdvanceView 
                cashAdvanceId={selectedCashAdvanceId} 
                 onBack={() => { setSelectedCashAdvanceId(null); setActiveView('cash-advance-history'); }} 
              />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={null}>
            <CashAdvanceForm />
          </Suspense>
        );

        case 'cash-advance-history':
        return (
          <Suspense fallback={<LoadingFallback message="Loading cash advance history..." />}>
            <CashAdvanceHistory 
              onViewRequest={(id) => {
                setSelectedCashAdvanceId(id);
                setActiveView('cash-advance');
              }}
              onRequestNew={() => {
                setActiveView('cash-advance');
                setSelectedCashAdvanceId(null);
              }}
            />
          </Suspense>
        );

      case 'evaluation-summary':
        return (
          <div className="responsive-card">
            <div className="responsive-card-body">
              <div className="d-flex align-items-center gap-2 mb-3 responsive-header">
                <span className="fw-semibold text-responsive-lg">
                  {selectedEvaluationId ? 'Evaluation Result' : 'Evaluation Results'}
                </span>
                {evalLoading && <Spinner animation="border" size="sm" />}
                {selectedEvaluationId && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="responsive-btn"
                    onClick={() => {
                      setSelectedEvaluationId(null);
                      setEvaluationNotificationData(null);
                      setEvalDetail(null);
                    }}
                  >
                    ← Back to All Evaluations
                  </Button>
                )}
              </div>

              {/* Show notification alert if opened from notification */}
              {evaluationNotificationData && (
                <div className="alert alert-info mb-3">
                  <i className="fas fa-bell me-2"></i>
                  <strong>Notification:</strong> {evaluationNotificationData.message || 'New evaluation result available'}
                </div>
              )}

              {/* Show evaluation selector only when not viewing specific evaluation */}
              {!selectedEvaluationId && evalResults.length > 0 && (
                <div className="responsive-form-row mb-3">
                  <div className="responsive-form-col">
                    <Form.Label className="mb-2 text-responsive-md">Select Evaluation:</Form.Label>
                    <Form.Select
                      value={selectedEvalId || ''}
                      onChange={async (e) => {
                        const id = parseInt(e.target.value, 10);
                        setSelectedEvalId(id);
                        await loadEvaluationDetail(id);
                      }}
                      className="responsive-form-control"
                    >
                      {evalResults.map(ev => (
                        <option key={ev.id} value={ev.id}>{new Date(ev.submitted_at).toLocaleString()} — {ev.form_title || 'Form'}</option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              )}

              {(!evalLoading && evalResults.length === 0 && !selectedEvaluationId) && (
                <div className="text-muted text-responsive-md">No evaluation results found.</div>
              )}

              {evalDetail && (
                <div className="responsive-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <EvaluationResult 
                    result={evalDetail} 
                    onBack={() => {
                      if (selectedEvaluationId) {
                        // If opened from notification, go back to dashboard
                        setSelectedEvaluationId(null);
                        setEvaluationNotificationData(null);
                        setActiveView('dashboard');
                      } else {
                        // Otherwise go back to dashboard
                        setActiveView('dashboard');
                      }
                    }} 
                    showBackButton={true}
                    backButtonText={selectedEvaluationId ? 'Back to Dashboard' : 'Back to Dashboard'}
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 'disciplinary-notice':
        return (
          <Suspense fallback={<LoadingFallback message="Loading disciplinary notices..." />}>
            <EmployeeDisciplinaryNotice />
          </Suspense>
        );
      case 'my-calendar':
        return (
          <Suspense fallback={<LoadingFallback message="Loading calendar..." />}>
            <EmployeeCalendar />
          </Suspense>
        );
      default:
        return (
          <div className="card p-4">
            This is the <strong>{getHeaderTitle()}</strong> section.
          </div>
        );
    }
  };

  return (
    <>
      <div className="d-flex employee-dashboard hrms-dashboard-wrapper responsive-container" style={{ minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        {/* Mobile Menu Button */}
        {/* Sidebar Overlay */}
        <div 
          className={`hrms-sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        {/* Sidebar */}
        <div className={`hrms-sidebar hrms-scrollable-sidebar hrms-unified-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
          <div>
            <h2 className="hrms-unified-logo">CCDC</h2>
            <button
              className={`hrms-unified-nav-link ${activeView === 'dashboard' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <FontAwesomeIcon icon={faTachometerAlt} />
              <span>Dashboard</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'profile' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('profile')}
            >
              <FontAwesomeIcon icon={faUser} />
              <span>Profile</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'leave-request' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('leave-request')}
            >
              <FontAwesomeIcon icon={faPlane} />
              <span>Leave Request</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'my-calendar' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('my-calendar')}
            >
              <FontAwesomeIcon icon={faCalendarAlt} />
              <span>My Calendar</span>
            </button>
            
            {/* Cash Advance with Dropdown */}
            <div className="hrms-dropdown-container">

            <button
              className={`hrms-unified-nav-link hrms-dropdown-toggle ${activeView === 'cash-advance' || activeView === 'cash-advance-history' ? 'hrms-unified-active' : ''}`}
                onClick={() => {
                  toggleCashAdvanceDropdown();
                }}

            >
              <FontAwesomeIcon icon={faHandHoldingUsd} />
              <span>Cash Advance</span>
            </button>

            <div className={`hrms-dropdown-menu ${isCashAdvanceDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
                <button
                  className={`hrms-dropdown-item ${activeView === 'cash-advance' ? 'hrms-dropdown-active' : ''}`}
                  onClick={() => { 
                    setActiveView('cash-advance'); 
                    setSelectedCashAdvanceId(null);
                    setIsCashAdvanceDropdownOpen(false); 
                  }}
                >
                  <span>📝 Cash Advance Form</span>
                </button>
                <button
                  className={`hrms-dropdown-item ${activeView === 'cash-advance-history' ? 'hrms-dropdown-active' : ''}`}
                  onClick={() => { 
                    setActiveView('cash-advance-history'); 
                    setIsCashAdvanceDropdownOpen(false); 
                  }}
                >
                  <span>📊 History & Balance</span>
                </button>
              </div>
            </div>

            <button
              className={`hrms-unified-nav-link ${activeView === 'evaluation-summary' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('evaluation-summary')}
            >
              <FontAwesomeIcon icon={faChartBar} />
              <span>Evaluation Summary</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'disciplinary-notice' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('disciplinary-notice')}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>Disciplinary Notice</span>
            </button>
            <button
              className="hrms-unified-nav-link"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Logout</span>
            </button>
          </div>
          <div className="hrms-unified-profile" onClick={() => setActiveView('profile')} style={{ cursor: 'pointer' }} title="Go to Profile">
            <img src="https://i.pravatar.cc/40" alt="profile" style={{ width: '40px', borderRadius: '50%' }} />
            <div>
              <div>{employeeName || 'Employee'}</div>
              <small>Employee</small>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        {isMobile && (
          <button 
            className="hrms-mobile-menu-btn responsive-mobile-menu"
            onClick={toggleSidebar}
            aria-label="Toggle Navigation Menu"
            style={{
              position: 'fixed',
              top: '15px',
              left: '15px',
              zIndex: 1001,
              backgroundColor: '#204176',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '1.2rem',
              lineHeight: '1',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1a3660';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#204176';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
        )}

        {/* Main Content */}
        <div className="hrms-main-content hrms-scrollable-main-content flex-grow-1" style={{ background: 'linear-gradient(to bottom right, #f0f4f8, #d9e2ec)' }}>
          {/* Mobile header */}
          <div className="d-md-none d-flex justify-content-between align-items-center p-2 bg-dark text-white">
            <span className="fw-bold">CCDC</span>
            <FontAwesomeIcon icon={faBars} size="lg" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ cursor: 'pointer' }} />
          </div>

          {/* Header */}
          <div className="container-fluid padding-responsive">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white rounded-4 shadow-sm p-3 responsive-header">
              <h4 className="fw-bold text-primary mb-2 mb-md-0 text-responsive-lg">{getHeaderTitle()}</h4>
              <div className="d-flex align-items-center gap-3 responsive-actions">
                <FontAwesomeIcon icon={faEnvelope} size="lg" className="text-primary hide-on-mobile" />
                <Bell 
                  onOpenLeave={(leaveId) => { setSelectedLeaveId(leaveId); setActiveView('leave-request'); }}
                  onOpenDisciplinary={() => { setActiveView('disciplinary-notice'); }}
                  onOpenCashAdvance={(cashAdvanceId) => { setSelectedCashAdvanceId(cashAdvanceId); setActiveView('cash-advance'); }}
                  onOpenEvaluation={(evaluationId, notificationData) => { 
                    setSelectedEvaluationId(evaluationId);
                    setEvaluationNotificationData(notificationData);
                    setActiveView('evaluation-summary'); 
                  }}
                  onOpenCalendar={(eventId, notificationData) => {
                    setCalendarNotificationData(notificationData);
                    setActiveView('my-calendar');
                  }}
                />
                <span className="fw-semibold text-dark text-responsive-md hide-on-mobile">{employeeName || 'Employee'}</span>
                <img 
                  src="https://i.pravatar.cc/40" 
                  alt="Profile" 
                  className="rounded-circle" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    objectFit: 'cover', 
                    border: '2px solid #0d6efd',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveView('profile')}
                  title="Go to Profile"
                />
              </div>
            </div>

            {/* Content Section */}
            <div className="responsive-container">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

export default EmployeeDashboard;
