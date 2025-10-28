import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { 
  FaEdit, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaEye,
  FaSync,
  FaClock,
  FaCalendarAlt,
  FaUser,
  FaImage,
  FaClipboardList
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';

const AttendanceEditRequests = () => {
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

  // Image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/attendance/edit-requests', {
        params: { status: statusFilter }
      });

      if (response.data.success) {
        setRequests(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load requests');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.message || 'Failed to load edit requests');
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

  const handleSubmitAction = async () => {
    if (actionType === 'reject' && !rejectionReason.trim()) {
      setMessage({ type: 'warning', text: 'Please provide a rejection reason' });
      return;
    }

    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const endpoint = `/attendance/edit-requests/${selectedRequest.id}/${actionType}`;
      const data = actionType === 'reject' ? { rejection_reason: rejectionReason } : {};

      const response = await axios.post(endpoint, data);

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully` 
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
    if (!time) return '--';
    try {
      return format(new Date(`2000-01-01 ${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const viewImage = (imagePath) => {
    // Convert storage path to public URL
    const imageUrl = `http://localhost:8000/storage/${imagePath}`;
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading edit requests...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <FaEdit className="text-primary me-2" size={24} />
          <h2 className="mb-0 text-primary">Attendance Edit Requests</h2>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
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
          className="mb-4"
        >
          {message.text}
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError('')}>
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
                  style={{ fontSize: '0.95rem' }}
                >
                  <option value="all">📋 All Requests</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
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
                  <div className="p-3 bg-success bg-opacity-10 rounded">
                    <div className="small text-muted mb-1">Approved</div>
                    <div className="h4 mb-0 fw-bold text-success">
                      {requests.filter(r => r.status === 'approved').length}
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
            Edit Requests
            {statusFilter !== 'all' && (
              <Badge bg="secondary" className="ms-2">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</Badge>
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
                    <th className="py-3 px-3 fw-semibold text-secondary">Date</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Current Times</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Requested Times</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Reason</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Proof</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Status</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Requested On</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <FaUser className="text-primary" size={14} />
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </div>
                            <small className="text-muted">
                              {request.employee?.employee_id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2" size={14} />
                          <div>
                            <div className="fw-medium text-dark">
                              {format(new Date(request.date), 'MMM dd, yyyy')}
                            </div>
                            <small className="text-muted">
                              {format(new Date(request.date), 'EEEE')}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex flex-column gap-1">
                          <div>
                            <small className="text-muted me-1">In:</small>
                            <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal">
                              {formatTime(request.current_time_in)}
                            </Badge>
                          </div>
                          <div>
                            <small className="text-muted me-1">Out:</small>
                            <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal">
                              {formatTime(request.current_time_out)}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex flex-column gap-1">
                          <div>
                            <small className="text-muted me-1">In:</small>
                            <Badge bg="primary" className="fw-normal">
                              {formatTime(request.requested_time_in)}
                            </Badge>
                          </div>
                          <div>
                            <small className="text-muted me-1">Out:</small>
                            <Badge bg="primary" className="fw-normal">
                              {formatTime(request.requested_time_out)}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-muted" style={{ maxWidth: '200px', fontSize: '0.9rem' }}>
                          {request.reason?.substring(0, 60)}
                          {request.reason?.length > 60 && '...'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {request.proof_images && request.proof_images.length > 0 ? (
                          <div className="d-flex gap-1 justify-content-center">
                            {request.proof_images.map((img, idx) => (
                              <Button
                                key={idx}
                                variant="outline-info"
                                size="sm"
                                onClick={() => viewImage(img)}
                                title="View proof image"
                                className="shadow-sm"
                              >
                                <FaImage size={14} />
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">-</span>
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
                        <div className="d-flex align-items-center">
                          <FaClock className="text-muted me-2" size={12} />
                          <div>
                            <div className="small text-dark">
                              {format(new Date(request.created_at), 'MMM dd, yyyy')}
                            </div>
                            <small className="text-muted">
                              {format(new Date(request.created_at), 'h:mm a')}
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
                              onClick={() => handleAction(request, 'approve')}
                              title="Approve Request"
                              className="shadow-sm"
                            >
                              <FaCheckCircle className="me-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleAction(request, 'reject')}
                              title="Reject Request"
                              className="shadow-sm"
                            >
                              <FaTimesCircle className="me-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            bg={request.status === 'approved' ? 'success' : 'danger'}
                            className="bg-opacity-10 text-dark fw-normal px-3 py-2"
                          >
                            {request.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
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
                  <FaEdit size={48} className="text-muted" />
                </div>
              </div>
              <h5 className="text-secondary mb-2">No Edit Requests Found</h5>
              <p className="text-muted mb-0">
                {statusFilter === 'pending' 
                  ? 'There are no pending edit requests at the moment. New requests will appear here.' 
                  : statusFilter === 'all'
                  ? 'No attendance edit requests have been submitted yet.'
                  : `No ${statusFilter} edit requests found. Try changing the filter.`}
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
                    <h5 className="mb-0">Approve Edit Request</h5>
                    <small className="text-muted">Confirm attendance modification</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                    <FaTimesCircle className="text-danger" size={24} />
                  </div>
                  <div>
                    <h5 className="mb-0">Reject Edit Request</h5>
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
                      <small className="text-muted d-block mb-1">Date</small>
                      <div className="fw-semibold">
                        {format(new Date(selectedRequest.date), 'MMM dd, yyyy')}
                      </div>
                      <small className="text-muted">{format(new Date(selectedRequest.date), 'EEEE')}</small>
                    </div>
                  </Col>
                </Row>
              </div>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="border rounded p-3">
                    <h6 className="text-secondary mb-3 fw-semibold">
                      <FaClock className="me-2" size={14} />
                      Current Times
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      <div>
                        <small className="text-muted">Time In</small>
                        <div className="fw-medium">{formatTime(selectedRequest.current_time_in)}</div>
                      </div>
                      <div>
                        <small className="text-muted">Time Out</small>
                        <div className="fw-medium">{formatTime(selectedRequest.current_time_out)}</div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="border border-primary rounded p-3 bg-primary bg-opacity-10">
                    <h6 className="text-primary mb-3 fw-semibold">
                      <FaClock className="me-2" size={14} />
                      Requested Times
                    </h6>
                    <div className="d-flex flex-column gap-2">
                      <div>
                        <small className="text-muted">Time In</small>
                        <div className="fw-medium text-primary">{formatTime(selectedRequest.requested_time_in)}</div>
                      </div>
                      <div>
                        <small className="text-muted">Time Out</small>
                        <div className="fw-medium text-primary">{formatTime(selectedRequest.requested_time_out)}</div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              <div className="mb-3">
                <label className="fw-semibold text-secondary mb-2">Reason for Request</label>
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
                    placeholder="Please provide a clear reason for rejecting this request..."
                    className="shadow-sm"
                    required
                  />
                  <Form.Text className="text-muted">
                    The employee will see this reason.
                  </Form.Text>
                </Form.Group>
              )}

              {actionType === 'approve' && (
                <Alert variant="warning" className="mb-0 border-warning">
                  <div className="d-flex align-items-center">
                    <div className="me-3">⚠️</div>
                    <div>
                      <strong>Confirm Action</strong>
                      <p className="mb-0 small">
                        Approving this request will permanently update the attendance record with the requested times.
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
                <h5 className="mb-0">Proof of Attendance</h5>
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
    </Container>
  );
};

export default AttendanceEditRequests;

