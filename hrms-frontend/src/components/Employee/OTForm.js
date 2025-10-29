import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Table, Tabs, Tab, Modal, Image } from 'react-bootstrap';
import OTDetailsModal from '../OT/OTDetailsModal';
import { 
  FaClock, 
  FaCalendarAlt, 
  FaFileAlt, 
  FaCheckCircle, 
  FaImage,
  FaTrash,
  FaPaperPlane,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEye
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';
import { toast } from 'react-toastify';

const OTForm = () => {
  const [formData, setFormData] = useState({
    ot_date: '',
    ot_hours: '',
    reason: '',
    proof_images: []
  });

  const [otRequests, setOtRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('submit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [validationError, setValidationError] = useState('');
  const [actualOTHours, setActualOTHours] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  // Image viewing states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchOTRequests();
  }, []);

  // Validate OT hours when user inputs them
  useEffect(() => {
    // Only validate if user has entered both date and OT hours
    if (formData.ot_date && formData.ot_hours) {
      validateOTHours();
    } else {
      // Clear errors when fields are empty
      setValidationError('');
      setActualOTHours(null);
    }
  }, [formData.ot_date, formData.ot_hours]);

  const fetchOTRequests = async () => {
    try {
      const response = await axios.get('/ot-requests');
      console.log('OT Requests response:', response.data); // Debug log
      setOtRequests(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching OT requests:', error);
    }
  };

  const validateOTHours = async () => {
    if (!formData.ot_date || !formData.ot_hours) return;

    setValidating(true);
    setValidationError('');
    setActualOTHours(null);

    try {
      const response = await axios.post('/ot-requests/validate-hours', {
        ot_date: formData.ot_date,
        ot_hours: parseFloat(formData.ot_hours)
      });

      console.log('Validation response:', response.data); // Debug log

      if (response.data.success) {
        const actual = response.data.actual_ot_hours;
        const inputted = parseFloat(formData.ot_hours);
        
        setActualOTHours(actual);

        if (actual === 0) {
          setValidationError('No overtime hours available for this date. You must clock out after 6 PM to earn overtime.');
        } else if (inputted > actual) {
          // Only auto-correct if user entered MORE than they actually have
          setValidationError(
            `You only have ${actual} hour(s) of overtime for this date. Your input has been corrected to ${actual} hour(s).`
          );
          // Auto-correct the input
          setFormData(prev => ({
            ...prev,
            ot_hours: actual.toString()
          }));
        } else if (inputted <= actual && inputted > 0) {
          // Valid input - show success message
          setValidationError('');
        } else {
          setValidationError('Please enter a valid number of OT hours.');
        }
      } else {
        setValidationError(response.data.message || 'Unable to validate OT hours');
        setActualOTHours(null);
      }
    } catch (error) {
      console.error('Error validating OT hours:', error);
      console.error('Error response:', error.response?.data); // Debug log
      setValidationError(
        error.response?.data?.message || 
        'No attendance record found for this date. Please ensure you have a valid attendance record before submitting an OT request.'
      );
      setActualOTHours(null);
    } finally {
      setValidating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 2 images
    if (formData.proof_images.length + files.length > 2) {
      setMessage({ 
        type: 'warning', 
        text: 'You can only upload up to 2 proof images' 
      });
      return;
    }

    // Validate file size (5MB max per image)
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setMessage({ 
        type: 'danger', 
        text: 'Each image must be less than 5MB' 
      });
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);

    setFormData(prev => ({
      ...prev,
      proof_images: [...prev.proof_images, ...files]
    }));
  };

  const removeImage = (index) => {
    // Revoke the preview URL
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      proof_images: prev.proof_images.filter((_, i) => i !== index)
    }));
  };

  const viewImage = (imagePath) => {
    // Convert storage path to public URL (same as attendance edit requests)
    const imageUrl = `http://localhost:8000/storage/${imagePath}`;
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const submitOTToServer = async () => {
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('ot_date', formData.ot_date);
      formDataToSend.append('ot_hours', formData.ot_hours);
      formDataToSend.append('reason', formData.reason);
      formData.proof_images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });
      await axios.post('/ot-requests', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Overtime request submitted successfully');
      fetchOTRequests();
      setFormData({ ot_date: '', ot_hours: '', reason: '', proof_images: [] });
      setImagePreviews([]);
      setValidationError('');
      setActualOTHours(null);
      setShowConfirm(false);
      setActiveTab('pending');
    } catch (error) {
      console.error('Error submitting OT request:', error);
      const data = error.response?.data;
      // Prefer field-specific validation messages if present
      let message = data?.message || 'Failed to submit overtime request';
      if (data?.errors && typeof data.errors === 'object') {
        const firstField = Object.keys(data.errors)[0];
        const firstMsg = Array.isArray(data.errors[firstField]) ? data.errors[firstField][0] : data.errors[firstField];
        if (firstMsg) message = firstMsg;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (validationError) {
      toast.error('Please correct the validation errors before submitting');
      return;
    }
    if (formData.proof_images.length === 0) {
      toast.warn('Please upload at least one proof image');
      return;
    }
    if (!formData.ot_date || !formData.ot_hours || !formData.reason.trim()) {
      toast.warn('Please complete all required fields');
      return;
    }
    setShowConfirm(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      manager_approved: 'info',
      hr_approved: 'success',
      rejected: 'danger'
    };
    const labels = {
      pending: 'PENDING',
      manager_approved: 'MANAGER APPROVED',
      hr_approved: 'APPROVED',
      rejected: 'REJECTED'
    };
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status?.toUpperCase()}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (time) => {
    if (!time) return '—';
    try {
      let t = String(time).trim();
      // Extract HH:MM and optional AM/PM
      const match = t.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (!match) return t;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      const hours12 = ((hours + 11) % 12) + 1; // 0->12, 13->1
      return `${hours12}:${String(minutes).padStart(2, '0')}`;
    } catch {
      return String(time);
    }
  };

  const pendingRequests = otRequests.filter(r => r.status === 'pending' || r.status === 'manager_approved');
  const processedRequests = otRequests.filter(r => r.status === 'hr_approved' || r.status === 'rejected');

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-primary text-white py-3">
          <h4 className="mb-0">
            <FaClock className="me-2" />
            Overtime Request Management
          </h4>
        </Card.Header>
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="submit" title={<><FaPaperPlane className="me-2" />Submit Request</>}>
              <Card className="border-0">
                <Card.Body>
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

                  <Alert variant="info" className="mb-4">
                    <FaInfoCircle className="me-2" />
                    <strong>OT Hours Calculation:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Overtime starts at <strong>6:00 PM</strong> (one hour after the 5 PM shift)</li>
                      <li>Any time worked after 6 PM counts as <strong>1 hour</strong>, then rounds up per hour</li>
                      <li><strong>Examples:</strong></li>
                      <ul>
                        <li>Clock out at 6:01 PM - 6:59 PM = <strong>1 hour</strong> OT</li>
                        <li>Clock out at 7:01 PM - 7:59 PM = <strong>2 hours</strong> OT</li>
                        <li>Clock out at 8:30 PM = <strong>3 hours</strong> OT</li>
                      </ul>
                      <li>Please upload proof (screenshots, photos) to support your request</li>
                    </ul>
                  </Alert>
                  
                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <FaCalendarAlt className="me-2" />
                            OT Date <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                type="date"
                            name="ot_date"
                            value={formData.ot_date}
                onChange={handleChange}
                            max={format(new Date(), 'yyyy-MM-dd')}
                required
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <FaClock className="me-2" />
                            OT Hours <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="number"
                            name="ot_hours"
                            value={formData.ot_hours}
                  onChange={handleChange}
                            min="1"
                            max="12"
                            step="1"
                            placeholder="e.g., 2"
                  required
                            isInvalid={!!validationError}
                          />
                          {validating && (
                            <Form.Text className="text-muted">
                              <Spinner animation="border" size="sm" className="me-2" />
                              Validating against attendance records...
                            </Form.Text>
                          )}
                          {validationError && (
                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                              <FaExclamationTriangle className="me-2" />
                              {validationError}
                            </Form.Control.Feedback>
                          )}
                          {actualOTHours !== null && !validationError && formData.ot_hours && (
                            <Form.Text className="text-success">
                              <FaCheckCircle className="me-2" />
                              Valid! You have {actualOTHours} hour(s) of overtime available for this date.
                            </Form.Text>
                          )}
                        </Form.Group>
                      </Col>
                      {/* Show existing request for selected date - moved after inputs to avoid layout shift */}
                      {formData.ot_date && (
                        <Col md={12}>
                          {(() => {
                            const existingRequest = otRequests.find(req =>
                              req.ot_date === formData.ot_date || req.date === formData.ot_date
                            );

                            if (existingRequest) {
                              return (
                                <Alert variant="warning" className="mb-3">
                                  <div className="d-flex align-items-center">
                                    <FaExclamationTriangle className="me-2" />
                                    <div>
                                      <strong>You already have an OT request for this date!</strong>
                                      <br />
                                      <small>
                                        Status: <Badge bg={existingRequest.status === 'pending' ? 'warning' :
                                                         existingRequest.status === 'manager_approved' ? 'info' :
                                                         existingRequest.status === 'hr_approved' ? 'success' : 'danger'}>
                                          {existingRequest.status === 'pending' ? 'Pending Manager Approval' :
                                           existingRequest.status === 'manager_approved' ? 'Approved by Manager - Waiting for HR' :
                                           existingRequest.status === 'hr_approved' ? 'Approved by HR' : 'Rejected'}
                                        </Badge>
                                        {existingRequest.submitted_at && (
                                          <span className="ms-2">
                                            Submitted: {new Date(existingRequest.submitted_at).toLocaleDateString()}
                                          </span>
                                        )}
                                      </small>
                                    </div>
                                  </div>
                                </Alert>
                              );
                            }
                            return null;
                          })()}
                        </Col>
                      )}
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <FaFileAlt className="me-2" />
                        Reason for Overtime <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                        rows={4}
                        placeholder="Please provide a detailed reason for your overtime..."
                required
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        {formData.reason.length}/500 characters
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <FaImage className="me-2" />
                        Proof/Evidence <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        multiple
                        disabled={formData.proof_images.length >= 2}
                      />
                      <Form.Text className="text-muted">
                        Upload up to 2 images (max 5MB each). Supported formats: JPG, PNG, GIF
                      </Form.Text>

                      {imagePreviews.length > 0 && (
                        <div className="mt-3">
                          <Row className="g-3">
                            {imagePreviews.map((preview, index) => (
                              <Col xs={6} md={4} key={index}>
                                <div className="position-relative border rounded p-2">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '150px', width: '100%', objectFit: 'cover' }}
                                  />
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="position-absolute top-0 end-0 m-2"
                                    onClick={() => removeImage(index)}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                              </Col>
                            ))}
                          </Row>
            </div>
                      )}
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button
                type="submit" 
                        variant="primary"
                        disabled={isSubmitting || validating || !!validationError}
                        className="px-4"
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FaPaperPlane className="me-2" />
                            Submit OT Request
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        onClick={() => {
                          setFormData({
                            ot_date: '',
                            ot_hours: '',
                            reason: '',
                            proof_images: []
                          });
                          setImagePreviews([]);
                          setValidationError('');
                          setActualOTHours(null);
                        }}
                      >
                        Clear Form
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="pending" title={<><FaClock className="me-2" />Pending Requests ({pendingRequests.length})</>}>
              <Card className="border-0">
                <Card.Body>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-5">
                      <FaClock size={48} className="text-muted mb-3" />
                      <h5 className="text-muted">No Pending Requests</h5>
                      <p className="text-muted">You don't have any pending overtime requests at the moment.</p>
              </div>
            ) : (
                    <Table responsive hover>
                      <thead className="table-light">
                    <tr>
                          <th>OT Date</th>
                          <th>Time</th>
                          <th>OT Hours</th>
                      <th>Reason</th>
                      <th>Proof Images</th>
                      <th>Status</th>
                          <th>Approved by</th>
                          <th>Noted by</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                        {pendingRequests.map((request) => (
                          <tr
                            key={request.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setSelectedRequest(request); setShowDetails(true); }}
                          >
                            <td>{formatDate(request.ot_date || request.date)}</td>
                            <td>
                              {request.attendance?.clock_in || request.start_time ? (
                                <>
                                  {formatTime(request.attendance?.clock_in || request.start_time)} - {formatTime(request.attendance?.clock_out || request.end_time)}
                                </>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <Badge bg="info">{request.ot_hours || 'N/A'} hrs</Badge>
                        </td>
                            <td style={{ maxWidth: '300px' }}>
                              {request.reason?.substring(0, 60)}
                              {request.reason?.length > 60 && '...'}
                        </td>
                        <td>
                          {request.proof_images && request.proof_images.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
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
                            <td>{getStatusBadge(request.status)}</td>
                            <td>
                              {(request.manager_reviewer?.first_name && `${request.manager_reviewer.first_name} ${request.manager_reviewer.last_name}`)
                                || (request.managerReviewer?.first_name && `${request.managerReviewer.first_name} ${request.managerReviewer.last_name}`)
                                || '—'}
                            </td>
                            <td>
                              {(request.hr_reviewer?.first_name && `${request.hr_reviewer.first_name} ${request.hr_reviewer.last_name}`)
                                || (request.hrReviewer?.first_name && `${request.hrReviewer.first_name} ${request.hrReviewer.last_name}`)
                                || '—'}
                            </td>
                            <td>{formatDate(request.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="history" title={<><FaCheckCircle className="me-2" />History ({processedRequests.length})</>}>
              <Card className="border-0">
                <Card.Body>
                  {processedRequests.length === 0 ? (
                    <div className="text-center py-5">
                      <FaFileAlt size={48} className="text-muted mb-3" />
                      <h5 className="text-muted">No History</h5>
                      <p className="text-muted">Your processed overtime requests will appear here.</p>
                    </div>
                  ) : (
                    <Table responsive hover>
                      <thead className="table-light">
                        <tr>
                          <th>OT Date</th>
                          <th>Time</th>
                          <th>OT Hours</th>
                          <th>Reason</th>
                          <th>Proof Images</th>
                          <th>Status</th>
                          <th>Submitted On</th>
                          <th>Reviewed On</th>
                          <th>Approved by</th>
                          <th>Noted by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedRequests.map((request) => (
                          <tr
                            key={request.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setSelectedRequest(request); setShowDetails(true); }}
                          >
                            <td>{formatDate(request.ot_date || request.date)}</td>
                            <td>
                              {request.attendance?.clock_in || request.start_time ? (
                                <>
                                  {formatTime(request.attendance?.clock_in || request.start_time)} - {formatTime(request.attendance?.clock_out || request.end_time)}
                                </>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <Badge bg="info">{request.ot_hours || 'N/A'} hrs</Badge>
                            </td>
                            <td style={{ maxWidth: '300px' }}>
                              {request.reason?.substring(0, 60)}
                              {request.reason?.length > 60 && '...'}
                              {request.status === 'rejected' && request.rejection_reason && (
                                <div className="text-danger small mt-1">
                                  <strong>Rejection Reason:</strong> {request.rejection_reason}
              </div>
            )}
                            </td>
                            <td>
                              {request.proof_images && request.proof_images.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
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
                            <td>{getStatusBadge(request.status)}</td>
                            <td>{formatDate(request.created_at)}</td>
                            <td>
                              {formatDate(request.hr_reviewed_at || request.manager_reviewed_at)}
                            </td>
                            <td>
                              {(request.manager_reviewer?.first_name && `${request.manager_reviewer.first_name} ${request.manager_reviewer.last_name}`)
                                || (request.managerReviewer?.first_name && `${request.managerReviewer.first_name} ${request.managerReviewer.last_name}`)
                                || '—'}
                            </td>
                            <td>
                              {(request.hr_reviewer?.first_name && `${request.hr_reviewer.first_name} ${request.hr_reviewer.last_name}`)
                                || (request.hrReviewer?.first_name && `${request.hrReviewer.first_name} ${request.hrReviewer.last_name}`)
                                || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

  {/* Confirm Modal */}
  <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
    <Modal.Header closeButton className="border-0 pb-0">
      <Modal.Title className="d-flex align-items-center">
        <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
          <FaClock className="text-primary" />
        </div>
        <div>
          <div className="fw-semibold">Confirm OT Request</div>
          <small className="text-muted">Please review the details before submitting</small>
        </div>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="pt-3" style={{ backgroundColor: '#f8f9fa' }}>
      <Card className="shadow-sm border-0">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <div className="small text-muted">OT Date</div>
              <div className="fw-semibold">{formData.ot_date || '—'}</div>
            </Col>
            <Col md={6}>
              <div className="small text-muted">OT Hours</div>
              <div className="fw-semibold">{formData.ot_hours || '—'}</div>
            </Col>
            <Col md={12}>
              <div className="small text-muted">Reason</div>
              <div className="border rounded p-2 bg-light">{formData.reason || '—'}</div>
            </Col>
            <Col md={12}>
              <div className="small text-muted">Proof Images</div>
              <div className="fw-semibold">{formData.proof_images.length}</div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Modal.Body>
    <Modal.Footer className="border-0">
      <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>Back</Button>
      <Button variant="primary" onClick={submitOTToServer} disabled={isSubmitting} className="px-4">
        {isSubmitting ? <Spinner animation="border" size="sm" className="me-2" /> : null}
        Continue & Submit
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

export default OTForm;
