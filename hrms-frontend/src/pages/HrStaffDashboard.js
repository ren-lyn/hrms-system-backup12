import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import useUserProfile from '../hooks/useUserProfile';
import JobPostings from "../components/JobPostings";
import EmployeeRecords from './HrAssistant/EmployeeRecords';
import EvaluationAdministration from '../components/EvaluationAdministration';
import ApplicationsDashboard from "../components/HrAssistant/Dashboard/ApplicationsDashboard";
import HrStaffProfile from '../components/HrStaff/HrStaffProfile';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  faBriefcase,
  faUsers,
  faChartBar,
  faExclamationTriangle,
  faCalendarAlt,
  faUserPlus,
  faClipboardList,
  faSignOutAlt,
  faFileAlt,
  faBars,
  faEnvelope,
  faBell,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const HrStaffDashboard = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [date, setDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const { userProfile, loading } = useUserProfile();

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
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

  // Toast notification helpers
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  // Logout functionality
  const handleLogout = async (e) => {
    e.preventDefault();
    
    // Show confirmation dialog
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) {
      return;
    }

    const loadingToast = toast.loading('Logging out...');

    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      
      if (token) {
        // Optional: Call logout API endpoint if your backend has one
        // This is useful for invalidating tokens on the server side
        try {
          // Uncomment and modify this if you have a logout API endpoint
          // await axios.post('http://localhost:8000/api/logout', {}, {
          //   headers: { Authorization: `Bearer ${token}` }
          // });
        } catch (apiError) {
          // Don't prevent logout if API call fails
          console.warn('Logout API call failed:', apiError);
        }
      }

      // Clear all authentication data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      
      // Clear any other stored user data
      sessionStorage.clear();

      toast.dismiss(loadingToast);
      showSuccess('Logged out successfully!');

      // Redirect to login page after a short delay
      setTimeout(() => {
        // Redirect based on your routing setup
        if (typeof window !== 'undefined') {
          // If using React Router, you might use navigate instead
          window.location.href = '/';
          // Alternative: window.location.replace('/login');
          
          // If you're using React Router with useNavigate:
          // navigate('/login', { replace: true });
        }
      }, 1000);

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Logout error:', error);
      showError('Logout failed. Please try again.');
    }
  };

  const getHeaderTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Dashboard";
      case "job-posting":
        return "Job Posting";
      case "job-applications":
        return "Job Applications";
      case "employee-record":
        return "Employee Record";
      case "evaluation":
        return "Evaluation";
      case "disciplinary":
        return "Disciplinary Action & Issuance";
      case "leave":
        return "Leave";
      case "recruitment":
        return "Recruitment";
      case "onboarding":
        return "Onboarding";
      case "profile":
        return "Profile";
      default:
        return "Dashboard";
    }
  };

  const renderContent = () => {
    if (activeView === "dashboard") {
      return (
        <>
          {/* Top Row */}
          <div className="row g-4">
            {/* Upcoming Evaluation */}
            <div className="col-md-8">
              <h6 className="text-secondary mb-3">Upcoming Evaluation</h6>
              <div className="row">
                {[1, 2, 3, 4].map((n) => (
                  <div className="col-md-6 mb-3" key={n}>
                    <div className="card shadow-sm rounded-4 p-3">
                      <h6 className="fw-bold">Evaluation {n}</h6>
                      <p className="small text-muted">
                        Evaluation details for employee {n}.
                      </p>
                      <button className="btn btn-primary btn-sm">View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="col-md-4">
              <div className="card shadow-sm p-3 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-secondary m-0">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="me-2 text-primary"
                    />
                    Calendar
                  </h6>
                  <span className="small text-muted">
                    <FontAwesomeIcon icon={faClock} className="me-1" />
                    {timeNow.toLocaleTimeString()}
                  </span>
                </div>
                <Calendar
                  onChange={setDate}
                  value={date}
                  className="w-100 border-0"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="row g-4 mt-2">
            <div className="col-md-6">
              <div className="card shadow-sm rounded-4 p-3">
                <h6 className="text-secondary mb-2">Leave</h6>
                <p className="small text-muted">
                  No leave requests at the moment.
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm rounded-4 p-3">
                <h6 className="text-secondary mb-2">Pending Onboarding</h6>
                <p className="small text-muted">
                  No pending onboarding tasks.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeView === "job-posting") {
      return <JobPostings />;
    }

    if (activeView === "job-applications") {
      return <ApplicationsDashboard />;
    }

    if (activeView === "employee-record") {
      return <EmployeeRecords />;
    }

    if (activeView === "evaluation") {
      return <EvaluationAdministration />;
    }

    if (activeView === "profile") {
      return <HrStaffProfile onBack={() => setActiveView('dashboard')} />;
    }

    return (
      <div className="card p-4">
        <h5>{getHeaderTitle()}</h5>
        <p>This is the {getHeaderTitle()} section.</p>
      </div>
    );
  };

  return (
    <>
      <div className="d-flex hrms-dashboard-wrapper responsive-container" style={{ minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
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
        
        {/* Sidebar Overlay */}
        <div 
          className={`hrms-sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        {/* Single Sidebar - Conditionally positioned */}
        <div className={`flex-column shadow-lg p-4 hrms-sidebar hrms-scrollable-sidebar hrms-unified-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
          <h5 className="mb-4 text-center fw-bold text-uppercase hrms-unified-logo">CCDC</h5>
          <ul className="nav flex-column gap-2">
            <li>
              <button
                onClick={() => setActiveView("dashboard")}
                className={`hrms-unified-nav-link ${activeView === 'dashboard' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("job-posting")}
                className={`hrms-unified-nav-link ${activeView === 'job-posting' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Job Posting
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("job-applications")}
                className={`hrms-unified-nav-link ${activeView === 'job-applications' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faFileAlt} className="me-2" /> Job Applications
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("employee-record")}
                className={`hrms-unified-nav-link ${activeView === 'employee-record' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Employee Record
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("evaluation")}
                className={`hrms-unified-nav-link ${activeView === 'evaluation' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Evaluation
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("disciplinary")}
                className={`hrms-unified-nav-link ${activeView === 'disciplinary' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Disciplinary Action
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("leave")}
                className={`hrms-unified-nav-link ${activeView === 'leave' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" /> Leave
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("recruitment")}
                className={`hrms-unified-nav-link ${activeView === 'recruitment' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Recruitment
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveView("onboarding")}
                className={`hrms-unified-nav-link ${activeView === 'onboarding' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faClipboardList} className="me-2" /> Onboarding
              </button>
            </li>
          </ul>
          <div className="mt-auto pt-3 border-top hrms-unified-profile">
            <button 
              onClick={handleLogout}
              className="hrms-unified-nav-link hrms-unified-logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow-1 hrms-main-content hrms-scrollable-main-content" style={{ background: "linear-gradient(to bottom right, #f0f4f8, #d9e2ec)" }}>
          {/* Header - hidden for job-posting, job-applications, and profile */}
          <div className="container-fluid py-3 px-3 px-md-5">
            {activeView !== "job-posting" && activeView !== "job-applications" && activeView !== "profile" && (
              <div className="d-flex justify-content-between align-items-center mb-4 bg-white rounded-4 shadow-sm p-3 flex-wrap">
                <h4 className="fw-bold text-primary mb-2 mb-md-0">
                  {getHeaderTitle()}
                </h4>
                <div className="d-flex align-items-center gap-3">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    size="lg"
                    className="text-primary"
                  />
                  <FontAwesomeIcon
                    icon={faBell}
                    size="lg"
                    className="text-primary"
                  />
                  <span className="fw-semibold text-dark">
                    {loading ? 'Loading...' : userProfile?.name || 'HR Staff'}
                  </span>
                  <img
                    src="https://i.pravatar.cc/40"
                    alt="Profile"
                    className="rounded-circle"
                    style={{
                      width: "36px",
                      height: "36px",
                      objectFit: "cover",
                      border: "2px solid #0d6efd",
                      cursor: "pointer"
                    }}
                    onClick={() => setActiveView('profile')}
                    title={`Go to Profile - ${userProfile?.name || 'HR Staff'}`}
                  />
                </div>
              </div>
            )}

            {/* Content Section */}
            {renderContent()}
          </div>
        </div>
        
        {/* Toast Container */}
        <ToastContainer 
          position="top-center" 
          autoClose={3000} 
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </>
  );
};

export default HrStaffDashboard;