// src/pages/HrAssistant/HrAssistantLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/HrAssistant/Dashboard/Sidebar';
import HeaderBar from '../../components/HrAssistant/Dashboard/Headerbar';
import './Dashboard.css';

const HrAssistantLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);

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

  return (
    <>
      <div className="dashboard-layout hrms-dashboard-wrapper responsive-container">
        {/* HR Assistant Unified Scroll Container */}
        <div className="hrms-unified-scroll-container">
          {/* Sidebar Overlay for mobile/tablet */}
          <div 
            className={`hrms-sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`}
            onClick={closeSidebar}
          ></div>
          
          {/* HR Assistant Sidebar */}
          <div className={`sidebar hrms-sidebar hrms-scrollable-sidebar hrms-unified-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
            <Sidebar />
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
          <div className="main-content hrms-main-content hrms-scrollable-main-content hrms-assistant-main-content">
            <section className="main-section">
              <HeaderBar />
              <div className="hrms-scrollable-content">
                <Outlet /> {/* Renders child routes like Dashboard or EmployeeRecords */}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default HrAssistantLayout;
