// src/components/HrAssistant/Dashboard/HeaderBar.js
import React from 'react';
import { FaEnvelope, FaBell } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import useUserProfile from '../../../hooks/useUserProfile';
import profileImg from './profile.png';

const HeaderBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { userProfile, loading } = useUserProfile();

  let pageTitle = 'Dashboard';

  const handleProfileClick = () => {
    // Navigate to employee records or profile management section
    // Since this is HR Assistant, they might want to go to employee records
    navigate('/dashboard/hr-assistant/employee-records');
  };

  if (pathname.includes('employee-records')) pageTitle = 'Employee Records';
  else if (pathname.includes('payroll')) pageTitle = 'Payroll';
  else if (pathname.includes('attendance')) pageTitle = 'Attendance';
  else if (pathname.includes('leave')) pageTitle = 'Leave Management';
  else if (pathname.includes('evaluation')) pageTitle = 'Employee Evaluation';
  else if (pathname.includes('disciplinary')) pageTitle = 'Disciplinary Action';
  else if (pathname.includes('recruitment')) pageTitle = 'Recruitment';
  else if (pathname.includes('reports')) pageTitle = 'Report Generation';

  return (
    <div className="header-bar">
      <div className="header-left">
        <h2>{pageTitle}</h2>
      </div>
      <div className="header-right">
        <FaEnvelope />
        <FaBell />
        <div className="profile-tab" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="profile-name" style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
            {loading ? 'Loading...' : userProfile?.name || 'User'}
          </span>
          <img 
            src={profileImg} 
            alt="User Profile" 
            onClick={handleProfileClick}
            style={{ cursor: 'pointer' }}
            title={`Go to Profile - ${userProfile?.name || 'User'}`}
          />
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
