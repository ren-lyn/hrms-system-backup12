import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Modal, Badge, InputGroup, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { 
  FaCoins, FaEye, FaCheckCircle, FaTimesCircle, 
  FaUser, FaCalendarAlt, FaSearch, FaInfoCircle,
  FaSpinner, FaClock
} from 'react-icons/fa';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

function LeaveMonetizationManagement() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, filterStatus, filterYear]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/leave-monetization');
      
      let requestsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          requestsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          requestsData = response.data.data;
        }
      }
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching monetization requests:', error);
      toast.error('Failed to load monetization requests');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Filter by year
    if (filterYear !== 'all') {
      filtered = filtered.filter(req => req.leave_year.toString() === filterYear);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(req => {
        const employee = req.employee || {};
        const profile = employee.employee_profile || employee;
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
        return name.includes(searchLower) || 
               (employee.email && employee.email.toLowerCase().includes(searchLower));
      });
    }

    setFilteredRequests(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', icon: FaClock, text: 'Pending' },
      approved: { variant: 'success', icon: FaCheckCircle, text: 'Approved' },
      rejected: { variant: 'danger', icon: FaTimesCircle, text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        <Icon size={12} />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setActionType('approve');
    setRemarks('');
    setShowActionModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setActionType('reject');
    setRemarks('');
    setShowActionModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const response = await axios.put(`/leave-monetization/${selectedRequest.id}/status`, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        remarks: remarks || null
      });

      if (response.data.success) {
        toast.success(`Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setShowActionModal(false);
        setSelectedRequest(null);
        setRemarks('');
        fetchRequests();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      const errorMessage = error.response?.data?.message || `Failed to ${actionType} request`;
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getUniqueYears = () => {
    const years = [...new Set(requests.map(req => req.leave_year))].sort((a, b) => b - a);
    return years;
  };

  const getStats = () => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalAmount = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + parseFloat(r.estimated_amount || 0), 0);

    return { total, pending, approved, rejected, totalAmount };
  };

  const stats = getStats();

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h3 className="mb-0">
            <FaCoins className="me-2" />
            Monetization Management
          </h3>
          <p className="text-muted">Manage employee leave monetization requests</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-muted mb-2">Total Requests</h5>
              <h2 className="mb-0">{stats.total}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning">
            <Card.Body>
              <h5 className="text-warning mb-2">Pending</h5>
              <h2 className="mb-0 text-warning">{stats.pending}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <h5 className="text-success mb-2">Approved</h5>
              <h2 className="mb-0 text-success">{stats.approved}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-danger">
            <Card.Body>
              <h5 className="text-danger mb-2">Rejected</h5>
              <h2 className="mb-0 text-danger">{stats.rejected}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by employee name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="all">All Years</option>
                {getUniqueYears().map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={fetchRequests} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Loading...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Requests Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Leave Monetization Requests</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Alert variant="info">
              <FaInfoCircle className="me-2" />
              No monetization requests found.
            </Alert>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Date Requested</th>
                  <th>Employee</th>
                  <th>Year</th>
                  <th>Days Requested</th>
                  <th>Daily Rate</th>
                  <th>Estimated Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const employee = request.employee || {};
                  const profile = employee.employee_profile || employee;
                  const employeeName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || employee.name || 'N/A';
                  
                  return (
                    <tr key={request.id}>
                      <td>{format(new Date(request.created_at), 'MMM dd, yyyy')}</td>
                      <td>
                        <div>
                          <strong>{employeeName}</strong>
                          {employee.email && (
                            <div className="text-muted small">{employee.email}</div>
                          )}
                        </div>
                      </td>
                      <td>{request.leave_year}</td>
                      <td>{request.requested_days} days</td>
                      <td>{formatCurrency(request.daily_rate)}</td>
                      <td><strong>{formatCurrency(request.estimated_amount)}</strong></td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                          >
                            <FaEye /> View
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleApprove(request)}
                              >
                                <FaCheckCircle /> Approve
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleReject(request)}
                              >
                                <FaTimesCircle /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Employee:</strong>
                  <div>
                    {(() => {
                      const employee = selectedRequest.employee || {};
                      const profile = employee.employee_profile || employee;
                      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || employee.name || 'N/A';
                    })()}
                  </div>
                  {selectedRequest.employee?.email && (
                    <div className="text-muted small">{selectedRequest.employee.email}</div>
                  )}
                </Col>
                <Col md={6}>
                  <strong>Date Requested:</strong>
                  <div>{format(new Date(selectedRequest.created_at), 'MMMM dd, yyyy hh:mm a')}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Leave Year:</strong>
                  <div>{selectedRequest.leave_year}</div>
                </Col>
                <Col md={6}>
                  <strong>Days Requested:</strong>
                  <div>{selectedRequest.requested_days} days</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Daily Rate:</strong>
                  <div>{formatCurrency(selectedRequest.daily_rate)}</div>
                </Col>
                <Col md={6}>
                  <strong>Estimated Amount:</strong>
                  <div><strong>{formatCurrency(selectedRequest.estimated_amount)}</strong></div>
                </Col>
              </Row>
              {selectedRequest.reason && (
                <Row className="mb-3">
                  <Col>
                    <strong>Reason:</strong>
                    <div>{selectedRequest.reason}</div>
                  </Col>
                </Row>
              )}
              <Row className="mb-3">
                <Col>
                  <strong>Status:</strong>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </Col>
              </Row>
              {selectedRequest.remarks && (
                <Row className="mb-3">
                  <Col>
                    <strong>HR Remarks:</strong>
                    <div>{selectedRequest.remarks}</div>
                  </Col>
                </Row>
              )}
              {selectedRequest.approved_at && (
                <Row>
                  <Col>
                    <strong>Processed Date:</strong>
                    <div>{format(new Date(selectedRequest.approved_at), 'MMMM dd, yyyy hh:mm a')}</div>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Action Modal (Approve/Reject) */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <Alert variant={actionType === 'approve' ? 'success' : 'warning'}>
                <strong>Employee:</strong>{' '}
                {(() => {
                  const employee = selectedRequest.employee || {};
                  const profile = employee.employee_profile || employee;
                  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || employee.name || 'N/A';
                })()}
                <br />
                <strong>Days Requested:</strong> {selectedRequest.requested_days} days
                <br />
                <strong>Estimated Amount:</strong> {formatCurrency(selectedRequest.estimated_amount)}
              </Alert>
              <Form.Group className="mb-3">
                <Form.Label>
                  Remarks {actionType === 'reject' && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Optional remarks...' : 'Please provide reason for rejection...'}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'approve' ? 'success' : 'danger'}
            onClick={handleSubmitAction}
            disabled={processing || (actionType === 'reject' && !remarks.trim())}
          >
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                {actionType === 'approve' ? <FaCheckCircle /> : <FaTimesCircle />}{' '}
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default LeaveMonetizationManagement;

