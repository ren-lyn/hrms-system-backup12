// src/components/HrAssistant/Dashboard/Sidebar.js
import axios from "axios";
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useUserProfile from '../../../hooks/useUserProfile';
import {
  FaChartPie, FaTachometerAlt, FaUsers, FaMoneyCheckAlt, FaCalendarCheck,
  FaPlaneDeparture, FaDollarSign, FaStarHalfAlt, FaExclamationTriangle, FaUserPlus,
  FaChartLine, FaSignOutAlt, FaBriefcase, FaClipboardList, FaCalendarAlt
} from "react-icons/fa";


const Sidebar = () => {
  const navigate = useNavigate();
  const { userProfile, loading } = useUserProfile();

  const handleLogout = () => {
    // Remove token
    localStorage.removeItem('token');
    // Optional: clear Axios auth header
    delete axios.defaults.headers.common['Authorization'];
    // Redirect to login
    navigate('/');
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
          to="/hr-assistant/payroll"
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
        <NavLink
          to="leave"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaPlaneDeparture /> <span>Leave Management</span>
        </NavLink>
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
          to="applications"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaClipboardList /> <span>Job Applications</span>
        </NavLink>
        <NavLink
          to="onboarding"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaUserPlus /> <span>Onboarding</span>
        </NavLink>
        <NavLink
          to="/hr-assistant/reports"
          className={({ isActive }) => `hrms-unified-nav-link ${isActive ? 'hrms-unified-active' : ''}`}
        >
          <FaChartLine /> <span>Report Generation</span>
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
  