import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Form, Modal, Row, Col, Alert, ProgressBar, Table } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faEdit, 
  faDownload, 
  faCheckCircle, 
  faTimes, 
  faClock, 
  faUser, 
  faBriefcase, 
  faBuilding,
  faCalendarAlt,
  faFileAlt,
  faSearch,
  faFilter,
  faRefresh,
  faPlus,
  faTrash,
  faExclamationTriangle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/StatusCards.css';

const JobApplications = () => {
  const navigate = useNavigate();
  
  // Helper function to handle authentication errors
  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      console.log('[HrStaff-JobApplications] Authentication failed - token may be invalid or expired');
      showError('Authentication failed. Please log in again.');
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userRole');
      setIsLoggedIn(false);
      setUserRole(null);
      navigate('/login');
      return true;
    } else if (error.response?.status === 403) {
      console.log('[HrStaff-JobApplications] Access denied - insufficient permissions');
      showError('Access denied. You do not have permission to perform this action.');
      return true;
    } else if (error.response?.status === 404) {
      console.log('[HrStaff-JobApplications] API endpoint not found');
      showError('API endpoint not found. Please contact support.');
      return true;
    }
    return false;
  };

  // Toast notification functions
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Application management states
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Filter and search states
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({});
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      fetchApplications();
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
      navigate('/login');
    }
  }, [navigate]);

  // Fetch applications data
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        showError('Authentication required');
        navigate('/login');
        return;
      }

      console.log('🔍 [HrStaff-JobApplications] Fetching applications...');
      
      const response = await axios.get('http://localhost:8000/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 [HrStaff-JobApplications] Applications fetched:', response.data.length);
      setApplications(response.data);
      calculateStats(response.data);
      
    } catch (error) {
      console.error('❌ [HrStaff-JobApplications] Error fetching applications:', error);
      if (!handleAuthError(error)) {
        showError('Failed to load applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (apps) => {
    const stats = {
      total: apps.length,
      pending: apps.filter(app => app.status === 'Pending').length,
      shortlisted: apps.filter(app => app.status === 'ShortListed').length,
      interview: apps.filter(app => app.status === 'Interview').length,
      offered: apps.filter(app => app.status === 'Offered').length,
      hired: apps.filter(app => app.status === 'Hired').length,
      rejected: apps.filter(app => app.status === 'Rejected').length
    };
    setStats(stats);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'secondary', icon: faClock, text: 'Pending' },
      'Applied': { color: 'info', icon: faFileAlt, text: 'Applied' },
      'ShortListed': { color: 'primary', icon: faUser, text: 'ShortListed' },
      'Interview': { color: 'warning', icon: faCalendarAlt, text: 'Interview' },
      'On Interview': { color: 'info', icon: faCalendarAlt, text: 'On Interview' },
      'Offered': { color: 'success', icon: faCheckCircle, text: 'Offered' },
      'Onboarding': { color: 'info', icon: faBriefcase, text: 'Onboarding' },
      'Hired': { color: 'success', icon: faUser, text: 'Hired' },
      'Rejected': { color: 'danger', icon: faTimes, text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig['Pending'];
    
    return (
      <Badge bg={config.color} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  // Update application status
  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        showError('Authentication required');
        return;
      }

      console.log(`🔄 [HrStaff-JobApplications] Updating application ${applicationId} to: ${newStatus}`);
      
      const response = await axios.put(`http://localhost:8000/api/applications/${applicationId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        showSuccess(`Application status updated to: ${newStatus}`);
        
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus, updated_at: new Date().toISOString() }
            : app
        ));
        
        // Recalculate stats
        const updatedApps = applications.map(app => 
          app.id === applicationId ? { ...app, status: newStatus } : app
        );
        calculateStats(updatedApps);
        
        setShowStatusModal(false);
        setSelectedApplication(null);
        setNewStatus('');
        
        console.log(`✅ [HrStaff-JobApplications] Status updated successfully`);
      }
      
    } catch (error) {
      console.error('[HrStaff-JobApplications] Error updating status:', error);
      if (!handleAuthError(error)) {
        showError(`Failed to update status: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setUpdating(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = () => {
    if (selectedApplication && newStatus) {
      updateApplicationStatus(selectedApplication.id, newStatus);
    }
  };

  // Open status update modal
  const openStatusModal = (application) => {
    setSelectedApplication(application);
    setNewStatus(application.status);
    setShowStatusModal(true);
  };

  // Open details modal
  const openDetailsModal = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  // Download resume
  const downloadResume = async (applicationId, applicantName) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showError('Authentication required');
        return;
      }

      console.log('📄 [HrStaff-JobApplications] Downloading resume for application:', applicationId);
      
      const response = await axios.get(`http://localhost:8000/api/applications/${applicationId}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume_${applicantName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Resume downloaded successfully!');
      console.log('✅ [HrStaff-JobApplications] Resume downloaded successfully');
      
    } catch (error) {
      console.error('❌ [HrStaff-JobApplications] Error downloading resume:', error);
      if (!handleAuthError(error)) {
        showError('Failed to download resume. Please try again.');
      }
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = !searchTerm || 
      app.applicant?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_posting?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_posting?.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <FontAwesomeIcon icon={faBriefcase} className="me-2 text-primary" />
                Job Applications Management
              </h2>
              <p className="text-muted mb-0">Manage and review all job applications</p>
            </div>
            <Button
              variant="outline-primary"
              onClick={fetchApplications}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faRefresh} className="me-2" />
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards - Same UI as HR Assistant */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="status-card status-card-total">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faFileAlt} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.total}</h3>
              <small className="status-card-label">Total Applications</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="status-card status-card-pending">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faClock} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.pending}</h3>
              <small className="status-card-label">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="status-card status-card-shortlisted">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faUser} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.shortlisted}</h3>
              <small className="status-card-label">ShortListed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="status-card status-card-interview">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faCalendarAlt} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.interview}</h3>
              <small className="status-card-label">Interview</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="status-card status-card-offered">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.offered}</h3>
              <small className="status-card-label">Offered</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="status-card status-card-hired">
            <Card.Body className="status-card-body text-white">
              <FontAwesomeIcon icon={faUser} size="2x" className="status-card-icon" />
              <h3 className="status-card-number">{stats.hired}</h3>
              <small className="status-card-label">Hired</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Controls */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="input-group">
            <span className="input-group-text">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, position, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Col>
        <Col md={3}>
          <select 
            className="form-select" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="ShortListed">ShortListed</option>
            <option value="Interview">Interview</option>
            <option value="Offered">Offered</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
          </select>
        </Col>
        <Col md={3}>
          <Badge bg="light" text="dark" className="px-3 py-2 h-100 d-flex align-items-center">
            <FontAwesomeIcon icon={faFilter} className="me-2" />
            {filteredApplications.length} Results
          </Badge>
        </Col>
      </Row>

      {/* Applications Table */}
      <Card className="border-0 shadow-lg">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">
              <FontAwesomeIcon icon={faBriefcase} className="me-2" />
              Applications
            </h5>
            <Badge bg="light" text="dark" className="px-3 py-2">
              {filteredApplications.length} Total
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Applicant
                  </th>
                  <th>
                    <FontAwesomeIcon icon={faBriefcase} className="me-2" />
                    Position
                  </th>
                  <th>
                    <FontAwesomeIcon icon={faBuilding} className="me-2" />
                    Department
                  </th>
                  <th>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Applied Date
                  </th>
                  <th className="text-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Status
                  </th>
                  <th className="text-center">
                    <FontAwesomeIcon icon={faCog} className="me-2" />
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="d-flex flex-column align-items-center">
                        <FontAwesomeIcon icon={faFileAlt} size="3x" className="text-muted mb-3" />
                        <h5 className="text-muted mb-2">No Applications Found</h5>
                        <p className="text-muted mb-3">
                          {filter === 'all' && !searchTerm
                            ? 'No applications have been submitted yet.'
                            : 'No applications match your current search criteria.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((application, index) => (
                    <tr key={application.id} className={index % 2 === 0 ? 'table-light' : ''}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                 style={{ width: '40px', height: '40px' }}>
                              <FontAwesomeIcon icon={faUser} />
                            </div>
                          </div>
                          <div>
                            <h6 className="mb-1">
                              {application.applicant?.first_name} {application.applicant?.last_name}
                            </h6>
                            <small className="text-muted">{application.applicant?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <h6 className="mb-1">{application.job_posting?.title}</h6>
                          <small className="text-muted">{application.job_posting?.position}</small>
                        </div>
                      </td>
                      <td>
                        <Badge bg="info" className="d-flex align-items-center gap-1">
                          <FontAwesomeIcon icon={faBuilding} size="sm" />
                          {application.job_posting?.department}
                        </Badge>
                      </td>
                      <td>
                        <small>
                          {new Date(application.applied_at).toLocaleDateString()}
                        </small>
                      </td>
                      <td className="text-center">
                        {getStatusBadge(application.status)}
                      </td>
                      <td className="text-center">
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openDetailsModal(application)}
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => openStatusModal(application)}
                            title="Update Status"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          {application.resume_path && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => downloadResume(application.id, `${application.applicant?.first_name} ${application.applicant?.last_name}`)}
                              title="Download Resume"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Application Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faEye} className="me-2" />
            Application Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <Row>
              <Col md={6}>
                <h6>Applicant Information</h6>
                <p><strong>Name:</strong> {selectedApplication.applicant?.first_name} {selectedApplication.applicant?.last_name}</p>
                <p><strong>Email:</strong> {selectedApplication.applicant?.email}</p>
                <p><strong>Phone:</strong> {selectedApplication.applicant?.phone || 'Not provided'}</p>
                <p><strong>Applied Date:</strong> {new Date(selectedApplication.applied_at).toLocaleString()}</p>
              </Col>
              <Col md={6}>
                <h6>Job Information</h6>
                <p><strong>Position:</strong> {selectedApplication.job_posting?.title}</p>
                <p><strong>Department:</strong> {selectedApplication.job_posting?.department}</p>
                <p><strong>Status:</strong> {getStatusBadge(selectedApplication.status)}</p>
                <p><strong>Application ID:</strong> {selectedApplication.id}</p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faEdit} className="me-2" />
            Update Application Status
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <div>
              <p><strong>Applicant:</strong> {selectedApplication.applicant?.first_name} {selectedApplication.applicant?.last_name}</p>
              <p><strong>Position:</strong> {selectedApplication.job_posting?.title}</p>
              <Form.Group className="mb-3">
                <Form.Label>New Status</Form.Label>
                <Form.Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="ShortListed">ShortListed</option>
                  <option value="Interview">Interview</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusUpdate}
            disabled={updating || !newStatus}
          >
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Updating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                Update Status
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default JobApplications;
