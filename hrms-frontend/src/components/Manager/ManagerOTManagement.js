import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Spinner, Alert, Image } from 'react-bootstrap';
import OTDetailsModal from '../OT/OTDetailsModal';
import { 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSync,
  FaCalendarAlt,
  FaUser,
  FaClipboardList,
  FaImage,
  FaEye
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';

const ManagerOTManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Image viewing states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/manager/ot-requests', {
        params: { status: statusFilter }
      });

      if (response.data.success) {
        setRequests(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load OT requests');
      }
    } catch (err) {
      console.error('Error fetching OT requests:', err);
      setError(err.response?.data?.message || 'Failed to load OT requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
    setShowModal(true);
  };

  const viewImage = (imagePath) => {
    // Convert storage path to public URL (same as attendance edit requests)
    const imageUrl = `http://localhost:8000/storage/${imagePath}`;
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleSubmitAction = async () => {
    if (actionType === 'reject' && !rejectionReason.trim()) {
      setMessage({ type: 'warning', text: 'Please provide a rejection reason' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const endpoint = `/manager/ot-requests/${selectedRequest.id}/${actionType}`;
      const data = actionType === 'reject' ? { rejection_reason: rejectionReason } : {};

      const response = await axios.post(endpoint, data);

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `OT request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully` 
        });
        fetchRequests();
        setShowModal(false);
      } else {
        setMessage({ type: 'danger', text: response.data.message || 'Action failed' });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to process request' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '—';
    try {
      let t = String(time).trim();
      const match = t.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (!match) return t;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      const hours12 = ((hours + 11) % 12) + 1;
      return `${hours12}:${String(minutes).padStart(2, '0')}`;
    } catch {
      return String(time);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      'manager_approved': 'info',
      'hr_approved': 'success',
      rejected: 'danger'
    };
    const labels = {
      pending: 'PENDING',
      'manager_approved': 'MANAGER APPROVED',
      'hr_approved': 'HR APPROVED',
      rejected: 'REJECTED'
    };
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status?.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-3">Loading OT requests...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1 fw-bold">
            <FaClock className="me-2 text-primary" />
            Overtime Request Management
          </h3>
          <p className="text-muted mb-0">Review and approve/reject employee overtime requests</p>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
          className="shadow-sm"
        >
          <FaSync className="me-1" size={14} />
          Refresh
        </Button>
      </div>

      {/* Message Display */}
      {message.text && (
        <Alert 
          variant={message.type} 
          dismissible 
          onClose={() => setMessage({ type: '', text: '' })}
          className="mb-4 shadow-sm"
        >
          {message.text}
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4 shadow-sm" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold mb-2 text-secondary">
                  <FaClock className="me-2" size={14} />
                  Filter by Status
                </Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="shadow-sm border-secondary"
                >
                  <option value="all">📋 All Requests</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="manager_approved">✅ Manager Approved</option>
                  <option value="hr_approved">✅ HR Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={9}>
              <Row className="g-3">
                <Col xs={6} md={3} className="text-center">
                  <div className="p-3 bg-light rounded">
                    <div className="small text-muted mb-1">Total Requests</div>
                    <div className="h4 mb-0 fw-bold text-primary">{requests.length}</div>
                  </div>
                </Col>
                <Col xs={6} md={3} className="text-center">
                  <div className="p-3 bg-warning bg-opacity-10 rounded">
                    <div className="small text-muted mb-1">Pending</div>
                    <div className="h4 mb-0 fw-bold text-warning">
                      {requests.filter(r => r.status === 'pending').length}
                    </div>
                  </div>
                </Col>
                <Col xs={6} md={3} className="text-center">
                  <div className="p-3 bg-info bg-opacity-10 rounded">
                    <div className="small text-muted mb-1">Approved</div>
                    <div className="h4 mb-0 fw-bold text-info">
                      {requests.filter(r => r.status === 'manager_approved' || r.status === 'hr_approved').length}
                    </div>
                  </div>
                </Col>
                <Col xs={6} md={3} className="text-center">
                  <div className="p-3 bg-danger bg-opacity-10 rounded">
                    <div className="small text-muted mb-1">Rejected</div>
                    <div className="h4 mb-0 fw-bold text-danger">
                      {requests.filter(r => r.status === 'rejected').length}
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Requests Table */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3">
          <h5 className="mb-0 fw-bold text-secondary">
            <FaClipboardList className="me-2" />
            Overtime Requests
            {statusFilter !== 'all' && (
              <Badge bg="secondary" className="ms-2">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')}</Badge>
            )}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {requests.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <tr>
                    <th className="py-3 px-3 fw-semibold text-secondary">Employee</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">OT Date</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Time</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">OT Hours</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Reason</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Proof Images</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Status</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Approved by</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Noted by</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Requested On</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      style={{ borderBottom: '1px solid #e9ecef', cursor: 'pointer' }}
                      onClick={() => { setSelectedRequest(request); setShowDetails(true); }}
                    >
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <FaUser className="text-primary" size={14} />
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </div>
                            <small className="text-muted">{request.employee?.employee_id}</small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {request.attendance?.clock_in || request.start_time ? (
                          <>
                            {formatTime(request.attendance?.clock_in || request.start_time)} - {formatTime(request.attendance?.clock_out || request.end_time)}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2" size={14} />
                          <div>
                            <div className="fw-medium text-dark">
                              {formatDate(request.ot_date)}
                            </div>
                            <small className="text-muted">
                              {request.ot_date && format(new Date(request.ot_date), 'EEEE')}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge bg="info" className="fw-normal px-3">
                          {request.ot_hours} {request.ot_hours === 1 ? 'hour' : 'hours'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-muted" style={{ maxWidth: '250px', fontSize: '0.9rem' }}>
                          {request.reason?.substring(0, 70)}
                          {request.reason?.length > 70 && '...'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {request.proof_images && request.proof_images.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1 justify-content-center">
                            {request.proof_images.map((imagePath, index) => (
                              <Button
                                key={index}
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewImage(imagePath)}
                                title={`View image ${index + 1}`}
                                className="p-1"
                              >
                                <FaImage size={12} className="me-1" />
                                {index + 1}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">No images</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(request.status)}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <div className="small text-muted mt-2" style={{ maxWidth: '150px' }}>
                            💬 {request.rejection_reason.substring(0, 30)}...
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {(request.manager_reviewer?.first_name && `${request.manager_reviewer.first_name} ${request.manager_reviewer.last_name}`)
                          || (request.managerReviewer?.first_name && `${request.managerReviewer.first_name} ${request.managerReviewer.last_name}`)
                          || <span className="text-muted">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        {(request.hr_reviewer?.first_name && `${request.hr_reviewer.first_name} ${request.hr_reviewer.last_name}`)
                          || (request.hrReviewer?.first_name && `${request.hrReviewer.first_name} ${request.hrReviewer.last_name}`)
                          || <span className="text-muted">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <FaClock className="text-muted me-2" size={12} />
                          <div>
                            <div className="small text-dark">
                              {formatDate(request.created_at)}
                            </div>
                            <small className="text-muted">
                              {request.created_at && format(new Date(request.created_at), 'h:mm a')}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {request.status === 'pending' ? (
                          <div className="d-flex gap-2 justify-content-center">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleAction(request, 'approve'); }}
                              title="Approve OT Request"
                              className="shadow-sm"
                            >
                              <FaCheckCircle className="me-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleAction(request, 'reject'); }}
                              title="Reject OT Request"
                              className="shadow-sm"
                            >
                              <FaTimesCircle className="me-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            bg={request.status === 'manager_approved' || request.status === 'hr_approved' ? 'success' : 'danger'}
                            className="bg-opacity-10 text-dark fw-normal px-3 py-2"
                          >
                            {request.status === 'manager_approved' ? '✓ Manager Approved' : 
                             request.status === 'hr_approved' ? '✓ HR Approved' : 
                             '✗ Rejected'}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 px-4">
              <div className="mb-4">
                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                  <FaClock size={48} className="text-muted" />
                </div>
              </div>
              <h5 className="text-secondary mb-2">No Overtime Requests Found</h5>
              <p className="text-muted mb-0">
                {statusFilter === 'pending' 
                  ? 'There are no pending OT requests at the moment. New requests will appear here.' 
                  : statusFilter === 'all'
                  ? 'No overtime requests have been submitted yet.'
                  : `No ${statusFilter.replace('_', ' ')} OT requests found. Try changing the filter.`}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Action Confirmation Modal */}
      <Modal show={showModal} onHide={() => !processing && setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="w-100">
            <div className="d-flex align-items-center">
              {actionType === 'approve' ? (
                <>
                  <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                    <FaCheckCircle className="text-success" size={24} />
                  </div>
                  <div>
                    <h5 className="mb-0">Approve OT Request</h5>
                    <small className="text-muted">Approve overtime request</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                    <FaTimesCircle className="text-danger" size={24} />
                  </div>
                  <div>
                    <h5 className="mb-0">Reject OT Request</h5>
                    <small className="text-muted">Provide a reason for rejection</small>
                  </div>
                </>
              )}
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4">
          {selectedRequest && (
            <>
              <div className="bg-light rounded p-3 mb-3">
                <Row>
                  <Col xs={6}>
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">Employee</small>
                      <div className="fw-semibold">
                        {selectedRequest.employee?.first_name} {selectedRequest.employee?.last_name}
                      </div>
                      <small className="text-muted">{selectedRequest.employee?.employee_id}</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1">OT Date</small>
                      <div className="fw-semibold">{formatDate(selectedRequest.ot_date)}</div>
                      <small className="text-muted">
                        {selectedRequest.ot_date && format(new Date(selectedRequest.ot_date), 'EEEE')}
                      </small>
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="mb-3">
                <label className="fw-semibold text-secondary mb-2">Overtime Hours</label>
                <div className="border rounded p-3 bg-light">
                  <p className="mb-0 text-dark fw-medium">
                    {selectedRequest.ot_hours} {selectedRequest.ot_hours === 1 ? 'hour' : 'hours'}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="fw-semibold text-secondary mb-2">Reason for OT Request</label>
                <div className="border rounded p-3 bg-light">
                  <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>

              {actionType === 'reject' && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold text-secondary">
                    Rejection Reason <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejecting this OT request..."
                    className="shadow-sm"
                    required
                  />
                  <Form.Text className="text-muted">
                    The employee will see this reason.
                  </Form.Text>
                </Form.Group>
              )}

              {actionType === 'approve' && (
                <Alert variant="info" className="mb-0 border-info">
                  <div className="d-flex align-items-center">
                    <div className="me-3">ℹ️</div>
                    <div>
                      <strong>Manager Approval</strong>
                      <p className="mb-0 small">
                        Approving this request will forward it to HR Assistant for final approval and processing.
                      </p>
                    </div>
                  </div>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'approve' ? 'success' : 'danger'}
            onClick={handleSubmitAction}
            disabled={processing}
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                {actionType === 'approve' ? <FaCheckCircle className="me-2" /> : <FaTimesCircle className="me-2" />}
                Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image View Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                <FaImage className="text-info" size={20} />
              </div>
              <div>
                <h5 className="mb-0">Proof of Overtime</h5>
                <small className="text-muted">Employee submitted evidence</small>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
          <img 
            src={selectedImage} 
            alt="Proof" 
            className="img-fluid rounded shadow" 
            style={{ maxHeight: '70vh', maxWidth: '100%' }} 
          />
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* OT Details Modal */}
      <OTDetailsModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        request={selectedRequest}
      />
    </Container>
  );
};

export default ManagerOTManagement;





