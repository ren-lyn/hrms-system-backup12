import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, Check, X, FileText, Image } from 'lucide-react';
import { fetchLeaveRequests, getLeaveStats, approveLeaveRequest, rejectLeaveRequest, updateLeaveTermsAndCategory } from '../../api/leave';
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [editTerms, setEditTerms] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadData();
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadData, 300000);
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
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
        response = await approveLeaveRequest(selectedLeave.id, remarks);
        showAlert(`Leave request for ${selectedLeave.employee?.name || 'employee'} has been approved successfully!`, 'success');
      } else if (actionType === 'reject') {
        response = await rejectLeaveRequest(selectedLeave.id, remarks);
        showAlert(`Leave request for ${selectedLeave.employee?.name || 'employee'} has been rejected.`, 'info');
      }
      
      console.log('Action response:', response);
      
      setShowModal(false);
      setSelectedLeave(null);
      setRemarks('');
      setActionType('');
      
      // Immediately reload data to show changes
      await loadData();
    } catch (error) {
      console.error('Error processing action:', error);
      const errorMessage = error.response?.data?.message || 'Error processing request. Please try again.';
      showAlert(errorMessage, 'danger');
    }
  };

  const handleEditTerms = (leave) => {
    setEditingLeave(leave);
    setEditTerms(leave.terms || '');
    setEditCategory(leave.leave_category || '');
    setShowTermsModal(true);
  };

  const saveTermsAndCategory = async () => {
    try {
      await updateLeaveTermsAndCategory(editingLeave.id, editTerms, editCategory);
      showAlert('Leave terms and category updated successfully!', 'success');
      setShowTermsModal(false);
      setEditingLeave(null);
      setEditTerms('');
      setEditCategory('');
      await loadData();
    } catch (error) {
      console.error('Error updating terms:', error);
      showAlert('Error updating leave terms. Please try again.', 'danger');
    }
  };

  const handleViewSignature = (request) => {
    if (request.signature_path) {
      setSelectedSignature({
        path: request.signature_path,
        employeeName: request.employee?.name || request.employee_name || 'Unknown Employee',
        leaveType: request.type,
        isImage: isImageFile(request.signature_path)
      });
      setShowSignatureModal(true);
    }
  };

  const isImageFile = (filePath) => {
    if (!filePath) return false;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = filePath.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension);
  };

  const getSignatureUrl = (path) => {
    return `http://localhost:8000/storage/${path}`;
  };

  const filteredRequests = leaveRequests.filter(request => {
    const employeeName = request.employee?.name || request.employee_name || '';
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    <div style={{ height: '100%' }}>
      <Container fluid className="leave-management" style={{ 
        height: 'auto', 
        overflowY: 'auto', 
        padding: isMobile ? '20px 8px' : '20px 20px'
      }}>

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
            <Button variant="outline-danger" size="sm">
              <Download size={16} className="me-1" />
              Export
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
            <Table responsive className="leave-table" style={{ minWidth: '1200px' }}>
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
                <th>E-Signature</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="employee-info">
                      <strong>{request.employee?.name || request.employee_name || 'Unknown Employee'}</strong>
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
                    <div className="terms-section">
                      <div className="mb-1">
                        <Badge 
                          bg={request.terms === 'with PAY' ? 'success' : 
                              request.terms === 'without PAY' ? 'warning' :
                              'secondary'}
                        >
                          {request.terms || 'TBD by HR'}
                        </Badge>
                      </div>
                      {request.status === 'pending' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditTerms(request)}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          Set Terms
                        </Button>
                      )}
                    </div>
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
                    <div className="signature-section">
                      {request.signature_path ? (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewSignature(request)}
                          title="View E-Signature"
                        >
                          {isImageFile(request.signature_path) ? (
                            <Image size={14} className="me-1" />
                          ) : (
                            <FileText size={14} className="me-1" />
                          )}
                          View
                        </Button>
                      ) : (
                        <span className="text-muted">No signature</span>
                      )}
                    </div>
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
          </div>
          
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
              <strong>Employee:</strong> {selectedLeave.employee?.name || selectedLeave.employee_name}<br />
              <strong>Leave Type:</strong> {selectedLeave.type}<br />
              <strong>Duration:</strong> {formatDate(selectedLeave.from)} - {formatDate(selectedLeave.to)}<br />
              <strong>E-Signature:</strong> {selectedLeave.signature_path ? (
                <Button
                  variant="outline-info"
                  size="sm"
                  className="ms-2"
                  onClick={() => handleViewSignature(selectedLeave)}
                >
                  <Eye size={12} className="me-1" />
                  View Signature
                </Button>
              ) : (
                <span className="text-muted">No signature uploaded</span>
              )}
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

      {/* Terms and Category Modal */}
      <Modal show={showTermsModal} onHide={() => setShowTermsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Set Pay Terms & Leave Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingLeave && (
            <div className="mb-3">
              <strong>Employee:</strong> {editingLeave.employee?.name || editingLeave.employee_name}<br />
              <strong>Leave Type:</strong> {editingLeave.type}<br />
              <strong>Duration:</strong> {formatDate(editingLeave.from)} - {formatDate(editingLeave.to)}
            </div>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Pay Terms *</Form.Label>
            <Form.Select
              value={editTerms}
              onChange={(e) => setEditTerms(e.target.value)}
              required
            >
              <option value="">Select pay terms...</option>
              <option value="with PAY">With PAY</option>
              <option value="without PAY">Without PAY</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Leave Category</Form.Label>
            <Form.Select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            >
              <option value="">Select category </option>
              <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL)</option>
              <option value="Emergency Leave (EL)">Emergency Leave (EL)</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTermsModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={saveTermsAndCategory}
            disabled={!editTerms}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Signature Viewing Modal */}
      <Modal show={showSignatureModal} onHide={() => setShowSignatureModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>E-Signature - {selectedSignature?.employeeName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSignature && (
            <div>
              <div className="mb-3">
                <strong>Employee:</strong> {selectedSignature.employeeName}<br />
                <strong>Leave Type:</strong> {selectedSignature.leaveType}<br />
              </div>
              
              <div className="text-center">
                {selectedSignature.isImage ? (
                  <div>
                    <img 
                      src={getSignatureUrl(selectedSignature.path)} 
                      alt="E-Signature"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '400px', 
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }} className="alert alert-warning">
                      <FileText size={48} className="mb-2" />
                      <p>Unable to load image. This might be a PDF or the file is not accessible.</p>
                      <Button 
                        variant="primary" 
                        href={getSignatureUrl(selectedSignature.path)} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={16} className="me-1" />
                        Download File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <FileText size={48} className="mb-3" />
                    <h5>PDF Document</h5>
                    <p>This signature is in PDF format. Click the button below to view or download.</p>
                    <div className="d-flex gap-2 justify-content-center">
                      <Button 
                        variant="primary" 
                        href={getSignatureUrl(selectedSignature.path)} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye size={16} className="me-1" />
                        View PDF
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        href={getSignatureUrl(selectedSignature.path)} 
                        download
                      >
                        <Download size={16} className="me-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSignatureModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      </Container>
    </div>
  );
};

export default LeaveManagement;
