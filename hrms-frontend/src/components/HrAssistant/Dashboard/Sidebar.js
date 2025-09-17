// src/components/HrAssistant/Dashboard/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaChartPie, FaTachometerAlt, FaUsers, FaMoneyCheckAlt, FaCalendarCheck,
  FaPlaneDeparture, FaDollarSign, FaStarHalfAlt, FaExclamationTriangle, FaUserPlus,
  FaChartLine, FaSignOutAlt
} from 'react-icons/fa';
import axios from 'axios'; // Optional: if you want to also clear Axios headers

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
            to="/hr-assistant/disciplinary"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FaExclamationTriangle /> Disciplinary Action
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
