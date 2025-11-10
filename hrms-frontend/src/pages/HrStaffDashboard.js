import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import useUserProfile from '../hooks/useUserProfile';
import JobPostings from "../components/JobPostings";
import EmployeeRecords from './HrAssistant/EmployeeRecords';
import EvaluationAdministration from '../components/EvaluationAdministration';
import HrStaffProfile from '../components/HrStaff/HrStaffProfile';
import OnboardingDashboard from "../components/HrStaff/Onboarding";
import StaffCalendar from '../components/HrAssistant/StaffCalendar';
import DisciplinaryManagement from '../components/HrAssistant/DisciplinaryManagement';
import LeaveManagement from '../components/HrAssistant/LeaveManagement';
import LeaveForm from '../components/Admin/LeaveForm';
import LeaveTracker from '../components/HrAssistant/LeaveTracker';
import LeaveHistory from '../components/HrAssistant/LeaveHistory';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  faBriefcase,
  faUsers,
  faChartBar,
  faExclamationTriangle,
  faCalendarAlt,
  faUserPlus,
  faSignOutAlt,
  faFileAlt,
  faClipboardList,
  faHistory,
  faBars,
  faEnvelope,
  faBell as faBellIcon,
  faClock,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Bell from '../components/Notifications/Bell';

const HrStaffDashboard = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [isJobOnboardingDropdownOpen, setIsJobOnboardingDropdownOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const { userProfile, loading } = useUserProfile();
  const [isLeaveDropdownOpen, setIsLeaveDropdownOpen] = useState(false);
  const leaveViews = ['leave-overview', 'leave-form', 'leave-tracker', 'leave-history'];

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

  const toggleJobOnboardingDropdown = () => {
    setIsJobOnboardingDropdownOpen(!isJobOnboardingDropdownOpen);
  };

  const toggleLeaveDropdown = () => {
    setIsLeaveDropdownOpen((prev) => !prev);
  };

  const handleSetActiveView = (view) => {
    setActiveView(view);
    if (!leaveViews.includes(view)) {
      setIsLeaveDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (leaveViews.includes(activeView)) {
      setIsLeaveDropdownOpen(true);
    }
  }, [activeView]);

  // Toast notification helpers
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  // Notification handlers
  const handleOpenLeave = (leaveId, data) => {
    handleSetActiveView('leave-overview');
    // You can add additional logic to highlight specific leave request
  };

  const handleOpenCashAdvance = (cashAdvanceId, data) => {
    // Navigate to cash advance management if available
    console.log('Open cash advance:', cashAdvanceId, data);
  };

  const handleOpenEvaluation = (evaluationId, data) => {
    handleSetActiveView('evaluation');
    // You can add additional logic to highlight specific evaluation
  };

  const handleOpenDisciplinary = (disciplinaryId, data) => {
    handleSetActiveView('disciplinary');
    // You can add additional logic to highlight specific disciplinary case
  };

  const handleOpenCalendar = (eventId, data) => {
    handleSetActiveView('calendar');
    // You can add additional logic to highlight specific calendar event
  };

  const handleOpenJobApplications = (applicationId, data) => {
    handleSetActiveView('onboarding');
    // You can add additional logic to highlight specific application
  };

  const handleOpenJobPostings = (jobPostingId, data) => {
    handleSetActiveView('job-posting');
    // You can add additional logic to highlight specific job posting
  };

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
      case "onboarding":
        return "Onboarding";
      case "employee-record":
        return "Employee Record";
      case "evaluation":
        return "Evaluation";
      case "disciplinary":
        return "Disciplinary Action & Issuance";
      case "leave-overview":
        return "Leave Overview";
      case "leave-form":
        return "Leave Form";
      case "leave-tracker":
        return "Leave Tracker";
      case "leave-history":
        return "Leave History";
      case "calendar":
        return "My Calendar";
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


    if (activeView === "employee-record") {
      return <EmployeeRecords />;
    }

    if (activeView === "evaluation") {
      return <EvaluationAdministration />;
    }

    if (activeView === "calendar") {
      return <StaffCalendar />;
    }

    if (activeView === "disciplinary") {
      return <DisciplinaryManagement />;
    }

    if (activeView === "leave-overview") {
      return <LeaveManagement showPending={false} />;
    }

    if (activeView === "leave-form") {
      return <LeaveForm />;
    }

    if (activeView === "leave-tracker") {
      return <LeaveTracker />;
    }

    if (activeView === "leave-history") {
      return <LeaveHistory />;
    }

    if (activeView === "calendar") {
      return <StaffCalendar />;
    }

    if (activeView === "onboarding") {
      return <OnboardingDashboard />;
    }

    if (activeView === "profile") {
      return <HrStaffProfile onBack={() => handleSetActiveView('dashboard')} />;
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
                onClick={() => handleSetActiveView("dashboard")}
                className={`hrms-unified-nav-link ${activeView === 'dashboard' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Dashboard
              </button>
            </li>
            {/* Job Posting & Onboarding Dropdown */}
            <li className="hrms-dropdown-container">
              <button
                onClick={toggleJobOnboardingDropdown}
                className="hrms-unified-nav-link hrms-dropdown-toggle"
              >
                <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Job Posting & Onboarding
                <FontAwesomeIcon 
                  icon={isJobOnboardingDropdownOpen ? faChevronDown : faChevronRight} 
                  className="ms-auto" 
                  size="sm" 
                />
              </button>
              
              <div className={`hrms-dropdown-menu ${isJobOnboardingDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
                <button
                  onClick={() => {
                    handleSetActiveView("job-posting");
                    setIsJobOnboardingDropdownOpen(false);
                  }}
                  className={`hrms-dropdown-item ${activeView === 'job-posting' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Job Postings
                </button>
                <button
                  onClick={() => {
                    handleSetActiveView("onboarding");
                    setIsJobOnboardingDropdownOpen(false);
                  }}
                  className={`hrms-dropdown-item ${activeView === 'onboarding' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Onboarding
                </button>
              </div>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("employee-record")}
                className={`hrms-unified-nav-link ${activeView === 'employee-record' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Employee Record
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("evaluation")}
                className={`hrms-unified-nav-link ${activeView === 'evaluation' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Evaluation
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("disciplinary")}
                className={`hrms-unified-nav-link ${activeView === 'disciplinary' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Disciplinary Action
              </button>
            </li>
            <li className="hrms-dropdown-container">
              <button
                onClick={toggleLeaveDropdown}
                className={`hrms-unified-nav-link hrms-dropdown-toggle ${leaveViews.includes(activeView) ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" /> Leave
                <FontAwesomeIcon
                  icon={isLeaveDropdownOpen ? faChevronDown : faChevronRight}
                  className="ms-auto"
                  size="sm"
                />
              </button>
              <div className={`hrms-dropdown-menu ${isLeaveDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
                <button
                  onClick={() => handleSetActiveView("leave-overview")}
                  className={`hrms-dropdown-item ${activeView === 'leave-overview' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faChartBar} className="me-2" /> Leave Overview
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-form")}
                  className={`hrms-dropdown-item ${activeView === 'leave-form' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faFileAlt} className="me-2" /> Leave Form
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-tracker")}
                  className={`hrms-dropdown-item ${activeView === 'leave-tracker' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" /> Leave Tracker
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-history")}
                  className={`hrms-dropdown-item ${activeView === 'leave-history' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faHistory} className="me-2" /> Leave History
                </button>
              </div>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("calendar")}
                className={`hrms-unified-nav-link ${activeView === 'calendar' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" /> My Calendar
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("profile")}
                className={`hrms-unified-nav-link ${activeView === 'profile' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Profile
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
            {activeView !== "job-posting" && activeView !== "onboarding" && activeView !== "calendar" && activeView !== "profile" && (
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
                  <Bell 
                    onOpenLeave={handleOpenLeave}
                    onOpenCashAdvance={handleOpenCashAdvance}
                    onOpenEvaluation={handleOpenEvaluation}
                    onOpenDisciplinary={handleOpenDisciplinary}
                    onOpenCalendar={handleOpenCalendar}
                    onOpenJobApplications={handleOpenJobApplications}
                    onOpenJobPostings={handleOpenJobPostings}
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
                    onClick={() => handleSetActiveView('profile')}
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