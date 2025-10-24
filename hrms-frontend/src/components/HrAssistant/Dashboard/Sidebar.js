// src/components/HrAssistant/Dashboard/Sidebar.js
import axios from "axios";
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useUserProfile from '../../../hooks/useUserProfile';
import {
  FaChartPie, FaTachometerAlt, FaUsers, FaMoneyCheckAlt, FaCalendarCheck,
  FaPlaneDeparture, FaDollarSign, FaStarHalfAlt, FaExclamationTriangle, FaUserPlus,
  FaChartLine, FaSignOutAlt, FaBriefcase, FaClipboardList, FaCalendarAlt,
  FaEye, FaChartBar, FaCog

} from "react-icons/fa";


const Sidebar = () => {
  const navigate = useNavigate();
  const { userProfile, loading } = useUserProfile();
  const [isLeaveDropdownOpen, setIsLeaveDropdownOpen] = useState(false);

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
        <NavLink
          to="attendance"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaCalendarCheck /> <span>Attendance</span>
        </NavLink>
        {/* Leave Management Dropdown */}
        <div className="hrms-dropdown-container">
          <button
            className="hrms-unified-nav-link hrms-dropdown-toggle"
            onClick={toggleLeaveDropdown}
          >
            <FaPlaneDeparture /> 
            <span>Leave Management</span>
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
              to="leave/tracker"
              className={({ isActive }) => `hrms-dropdown-item ${isActive ? 'hrms-dropdown-active' : ''}`}
              onClick={() => setIsLeaveDropdownOpen(false)}
            >
              <FaChartBar /> <span>Leave Tracker</span>
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
        <NavLink
          to="cash-advances"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaDollarSign /> <span>Cash Advance</span>
        </NavLink>
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
        <NavLink
          to="job-postings"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaBriefcase /> <span>Job Postings</span>
        </NavLink>
        <NavLink
          to="onboarding"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaUserPlus /> <span>Onboarding</span>
        </NavLink>
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