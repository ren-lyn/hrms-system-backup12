import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, Check, X } from 'lucide-react';
import { fetchLeaveRequests, getLeaveStats, approveLeaveRequest, rejectLeaveRequest } from '../../api/leave';
import './LeaveManagement.css';

const LeaveManagement = () => {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, statsResponse] = await Promise.all([
        fetchLeaveRequests(),
        getLeaveStats()
      ]);
      
      setLeaveRequests(requestsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error loading leave requests', 'danger');
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
      if (actionType === 'approve') {
        await approveLeaveRequest(selectedLeave.id, remarks);
        showAlert('Leave request approved successfully', 'success');
      } else if (actionType === 'reject') {
        await rejectLeaveRequest(selectedLeave.id, remarks);
        showAlert('Leave request rejected successfully', 'success');
      }
      
      setShowModal(false);
      setRemarks('');
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error processing action:', error);
      showAlert('Error processing request', 'danger');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedPeriod === 'all') return matchesSearch;
    
    // Add period filtering logic here if needed
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
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
    <Container fluid className="leave-management">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Leave Management</h2>
        </Col>
      </Row>

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
                <h6 className="mb-0">Approval Status</h6>
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
          <Button variant="outline-danger" className="me-2">
            <Download size={16} className="me-1" />
            Export
          </Button>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          <Table responsive className="leave-table">
            <thead>
              <tr>
                <th>👤 Employee Name</th>
                <th>Department</th>
                <th>Type of Leave</th>
                <th>Terms</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="employee-info">
                      <strong>{request.employee?.name || 'Unknown Employee'}</strong>
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
                    <Badge bg={request.terms === 'with PAY' ? 'success' : 'warning'}>
                      {request.terms}
                    </Badge>
                  </td>
                  <td>{formatDate(request.from)}</td>
                  <td>{formatDate(request.to)}</td>
                  <td>
                    <span className="days-count">{request.total_days || '-'}</span>
                  </td>
                  <td>
                    <span className="reason-text">
                      {request.reason || 'No reason provided'}
                    </span>
                  </td>
                  <td>
                    {request.status === 'pending' ? (
                      <div className="action-buttons">
                        <Button
                          variant="success"
                          size="sm"
                          className="me-1"
                          onClick={() => handleAction(request, 'approve')}
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleAction(request, 'reject')}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      getStatusBadge(request.status)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          {filteredRequests.length === 0 && (
            <div className="text-center p-4">
              <p className="text-muted">No leave requests found.</p>
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
              <strong>Employee:</strong> {selectedLeave.employee?.name}<br />
              <strong>Leave Type:</strong> {selectedLeave.type}<br />
              <strong>Duration:</strong> {formatDate(selectedLeave.from)} - {formatDate(selectedLeave.to)}
            </div>
          )}
          <Form.Group>
            <Form.Label>Remarks (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any comments or remarks..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={actionType === 'approve' ? 'success' : 'danger'} 
            onClick={confirmAction}
          >
            {actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LeaveManagement;
