import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import { Button, Form, Spinner } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EvaluationResult from '../components/Manager/EvaluationResult';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Bell from '../components/Notifications/Bell';
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
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import EmbeddedLeaveForm from '../components/Employee/EmbeddedLeaveForm';
import EmployeeProfile from '../components/Employee/EmployeeProfile';
import LeaveRequestView from '../components/Employee/LeaveRequestView';
import CashAdvanceForm from '../components/Employee/CashAdvanceForm';
import EmployeeDisciplinaryNotice from '../components/Employee/EmployeeDisciplinaryNotice';

const EmployeeDashboard = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [activeView, setActiveView] = useState('dashboard'); // default view

  // Evaluation summary state
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResults, setEvalResults] = useState([]);
  const [selectedEvalId, setSelectedEvalId] = useState(null);
  const [evalDetail, setEvalDetail] = useState(null);
  const [userId, setUserId] = useState(null);

  const [selectedLeaveId, setSelectedLeaveId] = useState(null);


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
      } catch (err) {
        console.error('Failed to fetch user info', err);
      }
    };

    fetchUser();
  }, []);

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
      case 'cash-advance': return 'Cash Advance';
      case 'evaluation-summary': return 'Evaluation Summary';
      case 'disciplinary-notice': return 'Disciplinary Notice';
      default: return 'Dashboard';
    }
  };

  // Fetch evaluations for the logged-in employee
  const loadEmployeeEvaluations = async (empId) => {
    try {
      setEvalLoading(true);
      setEvalResults([]);
      setEvalDetail(null);
      const res = await axios.get(`http://localhost:8000/api/manager-evaluations/employee/${empId}/results`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const results = res.data?.data || [];
      setEvalResults(results);
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
      loadEmployeeEvaluations(userId);
    }
  }, [activeView, userId]);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm p-3 rounded-4">
                <h6 className="text-secondary mb-3">
                  <FontAwesomeIcon icon={faBell} className="me-2 text-warning" /> Notifications
                </h6>
                <ul className="list-unstyled small ps-2">
                  <li>• New company policy update</li>
                  <li>• 1 pending leave request</li>
                  <li>• Company event on Friday</li>
                </ul>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm p-3 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-secondary m-0">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" /> Calendar
                  </h6>
                  <span className="small text-muted">
                    <FontAwesomeIcon icon={faClock} className="me-1" />
                    {timeNow.toLocaleTimeString()}
                  </span>
                </div>
                <Calendar onChange={setCalendarDate} value={calendarDate} className="w-100 border-0" />
              </div>
            </div>
          </div>
        );
      case 'leave-request':
        if (selectedLeaveId) {
          return <LeaveRequestView leaveId={selectedLeaveId} onBack={() => { setSelectedLeaveId(null); setActiveView('dashboard'); }} />;
        }
        return (
          <div>
            <EmbeddedLeaveForm />
          </div>
        );
      case 'profile':
        return <EmployeeProfile />;
      case 'cash-advance':
        return <CashAdvanceForm />;
      case 'evaluation-summary':
        return (
          <div className="card p-3">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="fw-semibold">Evaluation Results</span>
              {evalLoading && <Spinner animation="border" size="sm" />}
            </div>

            {evalResults.length > 0 && (
              <div className="d-flex gap-2 align-items-center mb-3">
                <Form.Label className="mb-0">Select Evaluation:</Form.Label>
                <Form.Select
                  value={selectedEvalId || ''}
                  onChange={async (e) => {
                    const id = parseInt(e.target.value, 10);
                    setSelectedEvalId(id);
                    await loadEvaluationDetail(id);
                  }}
                  style={{ maxWidth: 320 }}
                >
                  {evalResults.map(ev => (
                    <option key={ev.id} value={ev.id}>{new Date(ev.submitted_at).toLocaleString()} — {ev.form_title || 'Form'}</option>
                  ))}
                </Form.Select>
              </div>
            )}

            {(!evalLoading && evalResults.length === 0) && (
              <div className="text-muted">No evaluation results found.</div>
            )}

            {evalDetail && (
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <EvaluationResult 
                  result={evalDetail} 
                  onBack={() => setActiveView('dashboard')} 
                  showBackButton={false}
                />
              </div>
            )}
          </div>
        );
      case 'disciplinary-notice':
        return <EmployeeDisciplinaryNotice />;
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
              <FontAwesomeIcon icon={faCalendarAlt} />
              <span>Leave Request</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'cash-advance' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('cash-advance')}
            >
              <FontAwesomeIcon icon={faHandHoldingUsd} />
              <span>Cash Advance</span>
            </button>
            <button
              className={`hrms-unified-nav-link ${activeView === 'evaluation-summary' ? 'hrms-unified-active' : ''}`}
              onClick={() => setActiveView('evaluation-summary')}
            >
              <FontAwesomeIcon icon={faChartBar} />
              <span>Evaluation Summary</span>
            </button>
            <button
              className="hrms-unified-nav-link"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Logout</span>
            </button>
          </div>
          <div className="hrms-unified-profile">
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
          <div className="container-fluid py-3 px-3 px-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white rounded-4 shadow-sm p-3 flex-wrap">
              <h4 className="fw-bold text-primary mb-2 mb-md-0">{getHeaderTitle()}</h4>
              <div className="d-flex align-items-center gap-3">
                <FontAwesomeIcon icon={faEnvelope} size="lg" className="text-primary" />
                <Bell 
                  onOpenLeave={(leaveId) => { setSelectedLeaveId(leaveId); setActiveView('leave-request'); }}
                  onOpenDisciplinary={() => { setActiveView('disciplinary-notice'); }}
                />
                <span className="fw-semibold text-dark">{employeeName || 'Employee'}</span>
                <img src="https://i.pravatar.cc/40" alt="Profile" className="rounded-circle" style={{ width: '36px', height: '36px', objectFit: 'cover', border: '2px solid #0d6efd' }} />
              </div>
            </div>

            {/* Content Section */}
            {renderContent()}
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
