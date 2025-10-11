import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Alert, Modal, Form } from 'react-bootstrap';
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
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import OrientationScheduling from './OrientationScheduling';
import StartingDateManagement from './StartingDateManagement';
import SalarySetup from './SalarySetup';
import BenefitsEnrollment from './BenefitsEnrollment';

const OnboardingDashboard = () => {
  const [onboardingRecords, setOnboardingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    fetchOnboardingRecords();
  }, []);

  const fetchOnboardingRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/onboarding-records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnboardingRecords(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching onboarding records:', error);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          employee_name: 'John Doe',
          employee_email: 'john.doe@company.com',
          position: 'Software Developer',
          department: 'IT Department',
          status: 'pending_documents',
          start_date: '2025-01-15',
          created_at: '2025-01-10T10:00:00Z',
          progress: 25
        },
        {
          id: 2,
          employee_name: 'Jane Smith',
          employee_email: 'jane.smith@company.com',
          position: 'HR Assistant',
          department: 'Human Resources',
          status: 'documents_approved',
          start_date: '2025-01-20',
          created_at: '2025-01-12T14:30:00Z',
          progress: 75
        }
      ];
      setOnboardingRecords(mockData);
      calculateStats(mockData);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const stats = {
      total: records.length,
      pending: records.filter(r => r.status === 'pending_documents').length,
      inProgress: records.filter(r => r.status === 'documents_approved').length,
      completed: records.filter(r => r.status === 'completed').length
    };
    setStats(stats);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_documents': { color: 'warning', icon: faClock, text: 'Pending Documents' },
      'documents_approved': { color: 'success', icon: faCheckCircle, text: 'Documents Approved' },
      'orientation_scheduled': { color: 'info', icon: faCalendarAlt, text: 'Orientation Scheduled' },
      'completed': { color: 'success', icon: faCheckCircle, text: 'Completed' }
    };
    
    const config = statusConfig[status] || statusConfig['pending_documents'];
    
    return (
      <Badge bg={config.color} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  const filteredRecords = onboardingRecords.filter(record => {
    if (filter === 'all') return true;
    return record.status === filter;
  });

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-primary mb-1 fw-bold">
                <FontAwesomeIcon icon={faRocket} className="me-2" />
                Onboarding Management
              </h2>
              <p className="text-muted mb-0">Manage new employee onboarding process</p>
            </div>
            <div className="d-flex gap-2">
              <div className="d-flex gap-2">
                <Button
                  variant={activeTab === 'overview' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('overview')}
                >
                  <FontAwesomeIcon icon={faUsers} className="me-2" />
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'orientation' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('orientation')}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Orientation Scheduling
                </Button>
                <Button
                  variant={activeTab === 'starting-date' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('starting-date')}
                >
                  <FontAwesomeIcon icon={faClock} className="me-2" />
                  Starting Date
                </Button>
                <Button
                  variant={activeTab === 'salary-setup' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('salary-setup')}
                >
                  <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                  Salary Setup
                </Button>
                <Button
                  variant={activeTab === 'benefits' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('benefits')}
                >
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Benefits Enrollment
                </Button>
              </div>
              {activeTab === 'overview' && (
                <select 
                  className="form-select" 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ width: '200px' }}
                >
                  <option value="all">All Status</option>
                  <option value="pending_documents">Pending Documents</option>
                  <option value="documents_approved">Documents Approved</option>
                  <option value="orientation_scheduled">Orientation Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="row mb-4">
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faUsers} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.total}</h3>
              <small className="opacity-75">Total Employees</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faClock} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.pending}</h3>
              <small className="opacity-75">Pending Documents</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faChartLine} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.inProgress}</h3>
              <small className="opacity-75">In Progress</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.completed}</h3>
              <small className="opacity-75">Completed</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Onboarding Records Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div>
                        <strong>{record.employee_name}</strong>
                        <br />
                        <small className="text-muted">{record.employee_email}</small>
                      </div>
                    </td>
                    <td>{record.position}</td>
                    <td>{record.department}</td>
                    <td>{new Date(record.start_date).toLocaleDateString()}</td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>
                      <div className="progress" style={{ width: '100px', height: '8px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{ width: `${record.progress || 0}%` }}
                        ></div>
                      </div>
                      <small className="text-muted">{record.progress || 0}%</small>
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewDetails(record)}
                      >
                        <FontAwesomeIcon icon={faEye} className="me-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Detail Modal */}
      {showModal && selectedRecord && (
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              Onboarding Details - {selectedRecord.employee_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <h6>Employee Information</h6>
                <p><strong>Name:</strong> {selectedRecord.employee_name}</p>
                <p><strong>Email:</strong> {selectedRecord.employee_email}</p>
                <p><strong>Position:</strong> {selectedRecord.position}</p>
                <p><strong>Department:</strong> {selectedRecord.department}</p>
                <p><strong>Start Date:</strong> {new Date(selectedRecord.start_date).toLocaleDateString()}</p>
              </div>
              <div className="col-md-6">
                <h6>Status & Progress</h6>
                {getStatusBadge(selectedRecord.status)}
                <div className="mt-3">
                  <h6>Progress</h6>
                  <div className="progress mb-2">
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${selectedRecord.progress || 0}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">{selectedRecord.progress || 0}% Complete</small>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary">
              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
              Schedule Orientation
            </Button>
          </Modal.Footer>
        </Modal>
      )}
        </>
      )}

      {activeTab === 'orientation' && (
        <OrientationScheduling />
      )}

      {activeTab === 'starting-date' && (
        <StartingDateManagement />
      )}

      {activeTab === 'salary-setup' && (
        <SalarySetup />
      )}

      {activeTab === 'benefits' && (
        <BenefitsEnrollment />
      )}
    </div>
  );
};

export default OnboardingDashboard;