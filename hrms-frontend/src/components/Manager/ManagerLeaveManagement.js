import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, Check, X, FileText } from 'lucide-react';
import { fetchLeaveRequests, getLeaveStats, getLeaveRequest, approveLeaveRequest, rejectLeaveRequest, approveLeaveRequestAsManager, rejectLeaveRequestAsManager } from '../../api/leave';
import jsPDF from 'jspdf';
import './ManagerLeaveManagement.css';

const ManagerLeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [stats, setStats] = useState({
    approval_stats: { requested: 0, approved: 0, rejected: 0, pending: 0 },
    type_stats: {}
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const [loadingLeaveDetails, setLoadingLeaveDetails] = useState(false);

  useEffect(() => {
    loadData();
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, statsResponse] = await Promise.all([
        fetchLeaveRequests(),
        getLeaveStats()
      ]);
      
      console.log('Loaded leave requests:', requestsResponse.data);
      console.log('Loaded stats:', statsResponse.data);
      
      // For now, show all requests (can be filtered later based on role)
      setLeaveRequests(requestsResponse.data || []);
      setStats(statsResponse.data || {
        approval_stats: { requested: 0, approved: 0, rejected: 0, pending: 0 },
        type_stats: {}
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error loading leave requests. Please refresh the page.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleAction = async (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setShowModal(true);
  };

  const confirmAction = async () => {
    try {
      let response;
      if (actionType === 'approve') {
        response = await approveLeaveRequestAsManager(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been approved and forwarded to HR!`, 'success');
      } else if (actionType === 'reject') {
        response = await rejectLeaveRequestAsManager(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been rejected.`, 'info');
      }
      
      console.log('Manager action response:', response);
      
      setShowModal(false);
      setSelectedLeave(null);
      setRemarks('');
      setActionType('');
      
      // Immediately reload data to show changes
      await loadData();
    } catch (error) {
      console.error('Error processing manager action:', error);
      const errorMessage = error.response?.data?.message || 'Error processing request. Please try again.';
      showAlert(errorMessage, 'danger');
    }
  };


  const handleViewLeave = async (request) => {
    try {
      setLoadingLeaveDetails(true);
      const response = await getLeaveRequest(request.id);
      console.log('Full leave request data:', response.data);
      setSelectedLeaveForView(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching leave details:', error);
      showAlert('Error loading leave details. Please try again.', 'danger');
    } finally {
      setLoadingLeaveDetails(false);
    }
  };

  const getEmployeeName = (employee, employeeName) => {
    try {
      if (employeeName && typeof employeeName === 'string') {
        return employeeName;
      }
      
      if (employee && typeof employee === 'object' && employee !== null) {
        if (employee.name && typeof employee.name === 'string') {
          return employee.name;
        }
        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          return fullName;
        }
      }
      
      return 'Unknown Employee';
    } catch (error) {
      console.error('Error in getEmployeeName:', error, { employee, employeeName });
      return 'Unknown Employee';
    }
  };

  // Helper function to calculate hours based on days (8 hours per day)
  const calculateHoursFromDays = (days) => {
    const totalDays = parseInt(days) || 0;
    return totalDays * 8;
  };

  const filteredRequests = leaveRequests.filter(request => {
    const employeeName = getEmployeeName(request.employee, request.employee_name);
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedPeriod === 'all') return matchesSearch;
    
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      manager_approved: 'info',
      manager_rejected: 'danger',
      approved: 'success',
      rejected: 'danger'
    };
    const labels = {
      pending: 'Pending Review',
      manager_approved: 'Forwarded to HR',
      manager_rejected: 'Rejected',
      approved: 'Approved by HR',
      rejected: 'Rejected'
    };
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  if (loading) {
    return <div className="d-flex justify-content-center p-4">Loading...</div>;
  }

  return (
    <div style={{ height: '100%', backgroundColor: '#f8f9fa' }}>
      <Container fluid className="manager-leave-management" style={{ 
        height: 'auto', 
        overflowY: 'auto', 
        padding: isMobile ? '20px 8px' : '20px 20px',
        backgroundColor: '#f8f9fa'
      }}>

      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderBottom: '1px solid #e9ecef',
        marginBottom: '20px',
        borderRadius: '8px 8px 0 0'
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Leave Management</h4>
          <div className="text-muted small">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="stats-icon me-3">
                  <Check size={20} />
                </div>
                <h6 className="mb-0">Manager Approval Status</h6>
              </div>
              <Row className="text-center">
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Requested</div>
                    <div className="stat-value">{stats.approval_stats.requested}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Approved</div>
                    <div className="stat-value">{stats.approval_stats.approved}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Rejected</div>
                    <div className="stat-value">{stats.approval_stats.rejected}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value">{stats.approval_stats.pending}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <h6 className="mb-3">Type of Request Leave</h6>
              <div className="leave-types">
                {Object.entries(stats.type_stats).map(([type, count]) => (
                  <div key={type} className="leave-type-item d-flex justify-content-between align-items-center mb-2">
                    <span>{type}</span>
                    <div className="d-flex align-items-center">
                      <div className="progress-bar me-2" style={{width: '100px', height: '4px', backgroundColor: '#e9ecef'}}>
                        <div 
                          className="progress-fill" 
                          style={{
                            width: `${Math.min((count / stats.approval_stats.requested) * 100, 100)}%`,
                            height: '100%',
                            backgroundColor: type === 'Sick Leave' ? '#007bff' : '#6c757d'
                          }}
                        ></div>
                      </div>
                      <Badge bg="secondary">{count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search Employee"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="all">All Periods</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </Form.Select>
        </Col>
        <Col md={5} className="text-end">
          <div className="d-flex align-items-center justify-content-end gap-3">
            <small className="text-muted">
              Showing {filteredRequests.length} of {leaveRequests.length} requests
            </small>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="leave-table-container" style={{ position: 'relative' }}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            <Table responsive className="leave-table" style={{ minWidth: '1300px' }}>
              <thead>
              <tr>
                <th>👤 Employee Name</th>
                <th>Department</th>
                <th>Type of Leave</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="employee-info">
                      <strong>{getEmployeeName(request.employee, request.employee_name)}</strong>
                      {request.company && <div className="company-text">{request.company}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="department-text">{request.department || '-'}</span>
                  </td>
                  <td>
                    <div className="leave-type-info">
                      <div>{request.type}</div>
                      {request.leave_category && (
                        <small className="text-muted">({request.leave_category})</small>
                      )}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge(request.status)}
                  </td>
                  <td>{formatDate(request.from)}</td>
                  <td>{formatDate(request.to)}</td>
                  <td>
                    <span className="days-count">{request.total_days || '-'}</span>
                  </td>
                  <td>
                    <span className="hours-count">{calculateHoursFromDays(request.total_days)} hrs</span>
                  </td>
                  <td>
                    <span className="reason-text">
                      {request.reason || 'No reason provided'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons d-flex align-items-center gap-1">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleViewLeave(request)}
                        disabled={loadingLeaveDetails}
                        title="View leave form details"
                      >
                        <Eye size={14} />
                      </Button>
                      {request.status === 'pending' ? (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleAction(request, 'approve')}
                            title="Approve and forward to HR"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleAction(request, 'reject')}
                            title="Reject leave request"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <div className="ms-2">
                          {getStatusBadge(request.status)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </Table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="text-center p-4">
              <p className="text-muted">No leave requests found for manager review.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <div className="mb-3">
              <strong>Employee:</strong> {getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)}<br />
              <strong>Leave Type:</strong> {selectedLeave.type}<br />
              <strong>Duration:</strong> {formatDate(selectedLeave.from)} - {formatDate(selectedLeave.to)}
            </div>
          )}
          <Form.Group>
            <Form.Label>Manager Remarks (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any comments or remarks..."
            />
          </Form.Group>
          {actionType === 'approve' && (
            <Alert variant="info" className="mt-3">
              <small>
                <strong>Note:</strong> Approving this request will forward it to HR for final processing and pay terms determination.
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={actionType === 'approve' ? 'success' : 'danger'} 
            onClick={confirmAction}
          >
            {actionType === 'approve' ? 'Approve & Forward to HR' : 'Reject Request'}
          </Button>
        </Modal.Footer>
      </Modal>


      {/* View Leave Form Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="d-flex align-items-center">
              <FileText size={24} className="me-2" />
              Leave Application Form - {getEmployeeName(selectedLeaveForView?.employee, selectedLeaveForView?.employee_name)}
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingLeaveDetails ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading leave details...</span>
              </div>
              <p className="mt-3 text-muted">Loading leave details...</p>
            </div>
          ) : selectedLeaveForView ? (
            <div id="leave-form-print">
              {/* Header Section */}
              <div className="border-bottom pb-3 mb-4">
                <Row>
                  <Col md={6}>
                    <h5 className="text-primary mb-3">👤 Employee Information</h5>
                    <div className="mb-2">
                      <strong>Company:</strong> 
                      <span className="ms-2">{selectedLeaveForView.company || 'Not specified'}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Name:</strong> 
                      <span className="ms-2">{getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name)}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Department:</strong> 
                      <span className="ms-2">{selectedLeaveForView.department || 'Not Set'}</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h5 className="text-primary mb-3">📅 Application Details</h5>
                    <div className="mb-2">
                      <strong>Date Filed:</strong> 
                      <span className="ms-2">{new Date(selectedLeaveForView.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong> 
                      <span className="ms-2">{getStatusBadge(selectedLeaveForView.status)}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Application ID:</strong> 
                      <span className="ms-2 font-monospace">#{selectedLeaveForView.id}</span>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Leave Details Section */}
              <div className="border-bottom pb-3 mb-4">
                <h5 className="text-primary mb-3">🏖️ Leave Details</h5>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Leave Type:</strong>
                      <div className="mt-1">
                        <Badge bg="info" className="me-2">{selectedLeaveForView.type}</Badge>
                        {selectedLeaveForView.leave_category && (
                          <Badge bg="secondary">({selectedLeaveForView.leave_category})</Badge>
                        )}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Duration:</strong>
                      <div className="mt-1">
                        <div>📅 <strong>From:</strong> {new Date(selectedLeaveForView.from).toLocaleDateString('en-US', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}</div>
                        <div>📅 <strong>To:</strong> {new Date(selectedLeaveForView.to).toLocaleDateString('en-US', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}</div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <Row>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Total Days:</strong>
                          </div>
                          <Badge bg="primary" style={{ fontSize: '16px', padding: '8px 12px' }}>
                            {selectedLeaveForView.total_days || 0} {(selectedLeaveForView.total_days || 0) === 1 ? 'Day' : 'Days'}
                          </Badge>
                        </Col>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Total Hours:</strong>
                          </div>
                          <Badge bg="info" style={{ fontSize: '16px', padding: '8px 12px' }}>
                            {calculateHoursFromDays(selectedLeaveForView.total_days)} Hours
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Reason Section */}
              <div className="border-bottom pb-3 mb-4">
                <h5 className="text-primary mb-3">📝 Reason for Leave</h5>
                <div className="bg-light p-3 rounded" style={{ minHeight: '80px' }}>
                  {selectedLeaveForView.reason || (
                    <em className="text-muted">No reason provided</em>
                  )}
                </div>
              </div>


            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">No leave details available.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <div>
            <small className="text-muted">
              Generated on {new Date().toLocaleString()}
            </small>
          </div>
          <div>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      </Container>
    </div>
  );
};

export default ManagerLeaveManagement;
