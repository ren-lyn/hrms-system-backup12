import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Alert, Modal, Form, Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faFileAlt, 
  faCheckCircle, 
  faClock, 
  faExclamationTriangle,
  faEye,
  faCalendarAlt,
  faUsers,
  faChartLine,
  faRocket,
  faDollarSign,
  faShieldAlt,
  faUserTie,
  faInfoCircle,
  faEdit,
  faRefresh,
  faSave,
  faBuilding,
  faEllipsisV,
  faUser,
  faBriefcase,
  faCog,
  faDownload,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Data refreshed successfully!');
    } catch (error) {
      showError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const showSuccess = (message) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const showError = (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                <FontAwesomeIcon icon={faUserPlus} className="me-2 text-primary" />
                {activeTab === 'Overview' ? 'All Applications' : `${activeTab} Applications`}
                <Badge bg="secondary" className="ms-2">{filteredApplicants.length}</Badge>
              </h2>
              {activeTab === 'Overview' && (
                <p className="text-muted mb-0">
                  Summary view - Click on specific status tabs to view details, Pending Applications{applicants.filter(a => a.status === 'Pending').length}, Shortlisted Applications{applicants.filter(a => a.status === 'ShortListed' || a.status === 'Shortlisted').length}, Interview Applications{applicants.filter(a => a.status === 'On going Interview' || a.status === 'Interview').length}, Offered Applications{applicants.filter(a => a.status === 'Offered').length}, Accepted Offer Applications{applicants.filter(a => a.status === 'Accepted').length}, Onboarding Applications{applicants.filter(a => a.status === 'Onboarding').length}, Hired Applications{applicants.filter(a => a.status === 'Hired').length}, Rejected Applications{applicants.filter(a => a.status === 'Rejected').length}
                </p>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Enhanced Modern Styling */}
      <style>{`
        /* Enhanced Breadcrumb Styling */
        .modern-breadcrumb {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }

        .modern-breadcrumb .breadcrumb {
          margin: 0;
          background: transparent;
          padding: 0;
        }

        .modern-breadcrumb .breadcrumb-item {
          font-weight: 500;
          color: #495057;
        }

        .modern-breadcrumb .breadcrumb-item.active {
          color: #4a90e2;
          font-weight: 600;
        }

        .modern-breadcrumb .breadcrumb-item + .breadcrumb-item::before {
          content: "›";
          color: #6c757d;
          font-weight: bold;
        }

        /* Enhanced Tab Navigation */
        .modern-tab-container {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .modern-tab {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          border: 2px solid transparent;
          background: white;
          color: #495057;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          text-decoration: none;
          position: relative;
          min-width: 140px;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modern-tab:hover {
          background: #f8f9fa;
          border-color: #4a90e2;
          color: #4a90e2;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.2);
        }

        .modern-tab.active {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-color: #4a90e2;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 144, 226, 0.3);
        }

        .modern-tab.active:hover {
          background: linear-gradient(135deg, #357abd 0%, #2c5aa0 100%);
          color: white;
        }

        .tab-icon {
          margin-right: 0.5rem;
          font-size: 1rem;
        }

        .tab-label {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .tab-indicator {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 3px;
          background: #4a90e2;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .modern-tab.active .tab-indicator {
          width: 80%;
        }

        /* Enhanced Card Styling */
        .modern-card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .modern-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .modern-card-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #dee2e6;
          padding: 1rem 1.5rem;
          font-weight: 600;
          color: #495057;
        }

        /* Enhanced Button Styling */
        .modern-primary-btn {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }

        .modern-primary-btn:hover {
          background: linear-gradient(135deg, #357abd 0%, #2c5aa0 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
          color: white;
        }

        .modern-refresh-btn {
          border: 2px solid #4a90e2;
          color: #4a90e2;
          background: white;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .modern-refresh-btn:hover {
          background: #4a90e2;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }

        /* Enhanced Table Styling */
        .modern-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #dee2e6;
        }

        .modern-onboarding-table {
          margin: 0;
        }

        .modern-table-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .modern-table-th {
          border: none;
          padding: 1rem;
          font-weight: 600;
          color: #495057;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .modern-onboarding-row {
          transition: all 0.3s ease;
        }

        .modern-onboarding-row:hover {
          background: #f8f9fa;
          transform: scale(1.01);
        }

        .modern-onboarding-td {
          border: none;
          padding: 1rem;
          vertical-align: middle;
          border-bottom: 1px solid #f1f3f4;
        }

        /* Enhanced Progress Bar */
        .modern-progress-container {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .modern-progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.7rem;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .modern-progress-container-compact {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .modern-progress-bar-compact {
          height: 100%;
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-text-compact {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.6rem;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Enhanced Employee Avatar */
        .employee-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }

        .employee-avatar-compact {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1rem;
          box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
        }

        /* Enhanced Dropdown */
        .actions-dropdown-container {
          position: relative;
          display: inline-block;
        }

        .dropdown-toggle-btn {
          border: 2px solid #dee2e6;
          background: white;
          color: #6c757d;
          border-radius: 6px;
          padding: 0.5rem;
          transition: all 0.3s ease;
        }

        .dropdown-toggle-btn:hover,
        .dropdown-toggle-btn.active {
          border-color: #4a90e2;
          background: #4a90e2;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .actions-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 200px;
          padding: 0.5rem 0;
          margin-top: 0.25rem;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          color: #495057;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .dropdown-item:hover {
          background: #f8f9fa;
          color: #4a90e2;
        }

        /* Enhanced Filter Controls */
        .modern-filter-container {
          position: relative;
        }

        .modern-status-select {
          border: 2px solid #dee2e6;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          background: white;
          color: #495057;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 200px;
        }

        .modern-status-select:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          outline: none;
        }

        /* Enhanced Content Section */
        .modern-content-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .tab-navigation {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .modern-tab {
            width: 100%;
            min-width: auto;
          }
          
          .modern-table-container {
            overflow-x: auto;
          }
          
          .modern-onboarding-table {
            min-width: 800px;
          }
        }

        @media (max-width: 576px) {
          .modern-tab-container {
            padding: 0.75rem;
          }
          
          .modern-tab {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
          }
          
          .tab-icon {
            font-size: 0.9rem;
          }
          
          .tab-label {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </Container>
  );
};

export default Onboarding;



