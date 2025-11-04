// src/components/HrAssistant/Dashboard/Sidebar.js
import axios from "axios";
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useUserProfile from '../../../hooks/useUserProfile';
import {
  FaChartPie, FaTachometerAlt, FaUsers, FaMoneyCheckAlt, FaCalendarCheck,
  FaPlaneDeparture, FaDollarSign, FaStarHalfAlt, FaExclamationTriangle, FaUserPlus,
  FaChartLine, FaSignOutAlt, FaBriefcase, FaClipboardList, FaCalendarAlt,
  FaEye, FaChartBar, FaFileAlt, FaClock, FaChevronDown, FaChevronRight, FaEdit,
  FaCheckCircle
  
} from "react-icons/fa";


const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, loading } = useUserProfile();
  const [isLeaveDropdownOpen, setIsLeaveDropdownOpen] = useState(false);
  const [isAttendanceDropdownOpen, setIsAttendanceDropdownOpen] = useState(false);
  const [isJobOnboardingDropdownOpen, setIsJobOnboardingDropdownOpen] = useState(false);
  const [isCashAdvanceDropdownOpen, setIsCashAdvanceDropdownOpen] = useState(false);

   // Keep dropdowns open when on child routes
  useEffect(() => {
    if (location.pathname.includes('/cash-advances')) {
      setIsCashAdvanceDropdownOpen(true);
    }
    if (location.pathname.includes('/leave')) {
      setIsLeaveDropdownOpen(true);
    }
    if (location.pathname.includes('/attendance')) {
      setIsAttendanceDropdownOpen(true);
    }
    if (location.pathname.includes('/job-postings') || location.pathname.includes('/onboarding')) {
      setIsJobOnboardingDropdownOpen(true);
    }
  }, [location.pathname]);



  const handleLogout = () => {
    // Remove token
    localStorage.removeItem('token');
    // Optional: clear Axios auth header
    delete axios.defaults.headers.common['Authorization'];
    // Redirect to login
    navigate('/');
  };

  const toggleLeaveDropdown = () => {
    setIsLeaveDropdownOpen(!isLeaveDropdownOpen);
  };

  const toggleAttendanceDropdown = () => {
    setIsAttendanceDropdownOpen(!isAttendanceDropdownOpen);
  };

  const toggleJobOnboardingDropdown = () => {
    setIsJobOnboardingDropdownOpen(!isJobOnboardingDropdownOpen);
  };

  const toggleCashAdvanceDropdown = () => {
    setIsCashAdvanceDropdownOpen(!isCashAdvanceDropdownOpen);
  };

  return (
    <>
      <div>
        <h2 className="hrms-unified-logo">
          <FaChartPie style={{ marginRight: '8px' }} />CCDC
        </h2>
        <NavLink
          to=""
          end
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaTachometerAlt /> <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="employee-records"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaUsers /> <span>Employee Records</span>
        </NavLink>
        <NavLink
          to="payroll"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaMoneyCheckAlt /> <span>Payroll</span>
        </NavLink>
        {/* Attendance Management Dropdown */}
        <div className="hrms-dropdown-container">
          <button
            className="hrms-unified-nav-link hrms-dropdown-toggle"
            onClick={toggleAttendanceDropdown}
          >
            <FaCalendarCheck />
            <span>Attendance Management</span>
            {isAttendanceDropdownOpen ? <FaChevronDown className="ms-auto" size={12} /> : <FaChevronRight className="ms-auto" size={12} />}
          </button>
          
          <div className={`hrms-dropdown-menu ${isAttendanceDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
            <NavLink
              to="attendance"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsAttendanceDropdownOpen(false)}
            >
              <FaClipboardList /> <span>Attendance Records</span>
            </NavLink>
            <NavLink
              to="attendance-edit-requests"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsAttendanceDropdownOpen(false)}
            >
              <FaEdit /> <span>Edit Requests</span>
            </NavLink>
            <NavLink
              to="ot-management"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsAttendanceDropdownOpen(false)}
            >
              <FaClock /> <span>OT Management</span>
            </NavLink>
          </div>
        </div>
        {/* Leave Management Dropdown */}
        <div className="hrms-dropdown-container">
          <button
            className="hrms-unified-nav-link hrms-dropdown-toggle"
            onClick={toggleLeaveDropdown}
          >
            <FaPlaneDeparture /> 
            <span>Leave Management</span>
            {isLeaveDropdownOpen ? <FaChevronDown className="ms-auto" size={12} /> : <FaChevronRight className="ms-auto" size={12} />}
          </button>
          
          <div className={`hrms-dropdown-menu ${isLeaveDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
            <NavLink
              to="leave"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsLeaveDropdownOpen(false)}
            >
              <FaEye /> <span>Leave Overview</span>
            </NavLink>
            
            <NavLink
              to="leave/settings"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsLeaveDropdownOpen(false)}
            >
              <FaCog /> <span>Leave Settings</span>
            </NavLink>
          </div>
        </div>
        <NavLink
          to="my-calendar"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaCalendarAlt /> <span>My Calendar</span>
        </NavLink>
        {/* Cash Advance Dropdown */}
        <div className="hrms-dropdown-container">
          <button
            className={`hrms-unified-nav-link hrms-dropdown-toggle ${
              location.pathname.includes('/cash-advances') ? 'hrms-unified-active' : ''
            }`}
            onClick={toggleCashAdvanceDropdown}
          >
            <FaDollarSign />
            <span>Cash Advance</span>
            {isCashAdvanceDropdownOpen ? <FaChevronDown className="ms-auto" size={12} /> : <FaChevronRight className="ms-auto" size={12} />}
          </button>
          
          <div className={`hrms-dropdown-menu ${isCashAdvanceDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
            <NavLink
              to="cash-advances"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsCashAdvanceDropdownOpen(false)}
            >
              <FaEye /> <span>Cash Advance Overview</span>
            </NavLink>
            <NavLink
              to="cash-advances/receiving-cash"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsCashAdvanceDropdownOpen(false)}
            >
              <FaCheckCircle /> <span>Receiving Cash</span>
            </NavLink>
          </div>
        </div>
        <NavLink
          to="evaluation-administration"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaStarHalfAlt /> <span>Employee Evaluation</span>
        </NavLink>
        <NavLink
          to="disciplinary"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaExclamationTriangle /> <span>Disciplinary Action</span>
        </NavLink>
        {/* Job Posting & Onboarding Dropdown */}
        <div className="hrms-dropdown-container">
          <button
            className="hrms-unified-nav-link hrms-dropdown-toggle"
            onClick={toggleJobOnboardingDropdown}
          >
            <FaBriefcase />
            <span>Job Posting & Onboarding</span>
            {isJobOnboardingDropdownOpen ? <FaChevronDown className="ms-auto" size={12} /> : <FaChevronRight className="ms-auto" size={12} />}
          </button>
          
          <div className={`hrms-dropdown-menu ${isJobOnboardingDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
            <NavLink
              to="job-postings"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsJobOnboardingDropdownOpen(false)}
            >
              <FaBriefcase /> <span>Job Postings</span>
            </NavLink>
            <NavLink
              to="onboarding"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsJobOnboardingDropdownOpen(false)}
            >
              <FaUserPlus /> <span>Onboarding</span>
            </NavLink>
          </div>
        </div>
        <NavLink
          
          to="report-generation"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaFileAlt /> <span>Report Generation</span>
        </NavLink>
        <NavLink
          to="predictive-turnover-analytics"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaChartBar /> <span>Predictive Turnover Analytics</span>
        </NavLink>
        <button onClick={handleLogout} className="hrms-unified-nav-link hrms-unified-logout">
          <FaSignOutAlt /> <span>Logout</span>
        </button>
      </div>
      <div className="hrms-unified-profile">
        <img src="https://i.pravatar.cc/40" alt="profile" style={{ width: '40px', borderRadius: '50%' }} />
        <div>
          <div>{loading ? 'Loading...' : userProfile?.name || 'HR Assistant'}</div>
          <small>{loading ? 'Please wait...' : userProfile?.role || 'HRMS System'}</small>
        </div>
      </div>
    </>
  );
};

export default Sidebar;