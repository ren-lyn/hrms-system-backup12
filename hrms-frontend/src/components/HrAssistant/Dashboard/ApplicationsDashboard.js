import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Badge, Modal, Form, Table, Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap-icons/font/bootstrap-icons.css";

const ApplicationsDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState('all');

  // Toast notification helpers
  const showError = (message) => toast.error(message);
  const showSuccess = (message) => toast.success(message);
  const showWarning = (message) => toast.warning(message);
  const showInfo = (message) => toast.info(message);

  // Common error handler
  const handleAxiosError = (error, defaultMessage) => {
    console.error('Axios error:', error);
    if (error.response) {
      if (error.response.status === 401) {
        showError('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        showError('Access denied. You don\'t have permission to perform this action.');
      } else if (error.response.status === 404) {
        showWarning('Resource not found.');
      } else if (error.response.status >= 500) {
        showError('Server error occurred. Please try again later.');
      } else {
        showError(error.response.data?.message || defaultMessage);
      }
    } else if (error.request) {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ERR_NETWORK') {
      showError('Network error. Please check your internet connection.');
    } else {
      showError(defaultMessage);
    }
  };

  // Fetch applications and stats
  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      handleAxiosError(error, 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/applications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Update application status
  const handleStatusUpdate = async () => {
    if (!newStatus) {
      showError('Please select a status.');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/applications/${selectedApplication.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setApplications(applications.map(app => 
        app.id === selectedApplication.id 
          ? { ...app, status: newStatus, reviewed_at: new Date().toISOString() }
          : app
      ));

      showSuccess(`Application status updated to ${newStatus}.`);
      setShowStatusModal(false);
      setSelectedApplication(null);
      setNewStatus('');
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      handleAxiosError(error, 'Failed to update application status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Download resume
  const handleDownloadResume = async (applicationId, applicantName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/applications/${applicationId}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume_${applicantName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showSuccess('Resume downloaded successfully.');
    } catch (error) {
      handleAxiosError(error, 'Failed to download resume. Please try again.');
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Applied': return 'primary';
      case 'Pending': return 'warning';
      case 'Under Review': return 'info';
      case 'Interview': return 'secondary';
      case 'Hired': return 'success';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 min-vh-100" style={{
      background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)",
    }}>
      <ToastContainer position="top-right" />
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary d-flex align-items-center">
          <i className="bi bi-clipboard-data me-2"></i> Applications Dashboard
        </h2>
        <Button
          variant="primary"
          className="shadow-sm rounded-pill px-4"
          onClick={fetchApplications}
        >
          <i className="bi bi-arrow-clockwise me-2"></i> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-primary">{stats.total_applications || 0}</h4>
              <small className="text-muted">Total Applications</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-warning">{stats.pending_applications || 0}</h4>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-info">{stats.under_review || 0}</h4>
              <small className="text-muted">Under Review</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-success">{stats.accepted || 0}</h4>
              <small className="text-muted">Accepted</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-danger">{stats.rejected || 0}</h4>
              <small className="text-muted">Rejected</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-2">
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <h4 className="text-secondary">{stats.applications_this_month || 0}</h4>
              <small className="text-muted">This Month</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <Form.Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-auto"
        >
          <option value="all">All Applications</option>
          <option value="Applied">Applied</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Interview">Interview</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
        </Form.Select>
      </div>

      {/* Applications Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard2-x display-1 text-secondary mb-3"></i>
              <h5 className="text-muted">No applications found</h5>
              <p className="text-muted">
                {filter === 'all' 
                  ? 'No applications have been submitted yet.' 
                  : `No applications with status "${filter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Applicant</th>
                    <th>Job Position</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredApplications.map((application) => (
                      <motion.tr
                        key={application.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td>
                          <div>
                            <strong>{application.applicant?.first_name} {application.applicant?.last_name}</strong>
                            <br />
                            <small className="text-muted">{application.applicant?.email}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{application.job_posting?.title}</strong>
                            <br />
                            <small className="text-muted">{application.job_posting?.department}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(application.status)} className="rounded-pill px-3 py-1">
                            {application.status}
                          </Badge>
                        </td>
                        <td>
                          <small>{formatDate(application.applied_at)}</small>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowDetailsModal(true);
                              }}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleDownloadResume(
                                application.id,
                                `${application.applicant?.first_name}_${application.applicant?.last_name}`
                              )}
                              title="Download Resume"
                            >
                              <i className="bi bi-download"></i>
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setNewStatus(application.status);
                                setShowStatusModal(true);
                              }}
                              title="Update Status"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Application Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Application Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="fw-bold">Applicant Information</h6>
                  <p><strong>Name:</strong> {selectedApplication.applicant?.first_name} {selectedApplication.applicant?.last_name}</p>
                  <p><strong>Email:</strong> {selectedApplication.applicant?.email}</p>
                  <p><strong>Contact:</strong> {selectedApplication.applicant?.contact_number || 'Not provided'}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold">Application Information</h6>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusBadgeVariant(selectedApplication.status)} className="ms-2">
                      {selectedApplication.status}
                    </Badge>
                  </p>
                  <p><strong>Applied:</strong> {formatDate(selectedApplication.applied_at)}</p>
                  {selectedApplication.reviewed_at && (
                    <p><strong>Reviewed:</strong> {formatDate(selectedApplication.reviewed_at)}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <h6 className="fw-bold">Job Position</h6>
                <p><strong>Title:</strong> {selectedApplication.job_posting?.title}</p>
                <p><strong>Department:</strong> {selectedApplication.job_posting?.department}</p>
                <p><strong>Description:</strong></p>
                <p className="text-muted">{selectedApplication.job_posting?.description}</p>
                <p><strong>Requirements:</strong></p>
                <p className="text-muted">{selectedApplication.job_posting?.requirements}</p>
              </div>
            </div>
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
          <Modal.Title>Update Application Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select New Status</Form.Label>
            <Form.Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">Choose status...</option>
              <option value="Applied">Applied</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Interview">Interview</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowStatusModal(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusUpdate}
            disabled={updating || !newStatus}
          >
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ApplicationsDashboard;
