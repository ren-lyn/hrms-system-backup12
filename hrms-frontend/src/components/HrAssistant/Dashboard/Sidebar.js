// src/components/HrAssistant/Dashboard/Sidebar.js
import axios from "axios";
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaChartPie, FaTachometerAlt, FaUsers, FaMoneyCheckAlt, FaCalendarCheck,
  FaPlaneDeparture, FaDollarSign, FaStarHalfAlt, FaExclamationTriangle, FaUserPlus,
  FaChartLine, FaSignOutAlt, FaBriefcase, FaClipboardList, FaCalendarAlt
} from "react-icons/fa";


const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove token
    localStorage.removeItem('token');
    // Optional: clear Axios auth header
    delete axios.defaults.headers.common['Authorization'];
    // Redirect to login
    navigate('/');
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <FaChartPie /> <span>Cabuyao Concrete Development Corporation</span>
      </div>
      <ul>
        <li>
          <NavLink
            to=""
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaTachometerAlt /> Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="employee-records"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaUsers /> Employee Records
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/hr-assistant/payroll"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaMoneyCheckAlt /> Payroll
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/hr-assistant/attendance"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaCalendarCheck /> Attendance
          </NavLink>
        </li>
        <li>
          <NavLink
            to="leave"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaPlaneDeparture /> Leave Management
          </NavLink>
        </li>
        <li>
          <NavLink
            to="my-calendar"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaCalendarAlt /> My Calendar
          </NavLink>
        </li>
        <li>
          <NavLink
            to="cash-advances"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaDollarSign /> Cash Advance
          </NavLink>
        </li>
        <li>
          <NavLink
            to="evaluation-administration"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaStarHalfAlt /> Employee Evaluation
          </NavLink>
        </li>
        <li>
          <NavLink
            to="disciplinary"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaExclamationTriangle /> Disciplinary Action
          </NavLink>
        </li>
        <li>
          <NavLink
            to="job-postings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaBriefcase /> Job Postings
          </NavLink>
        </li>
        <li>
          <NavLink
            to="applications"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaClipboardList /> Job Applications
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/hr-assistant/recruitment"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaUserPlus /> Recruitment
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/hr-assistant/reports"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaChartLine /> Report Generation
          </NavLink>
        </li>
        <li className="logout">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
  