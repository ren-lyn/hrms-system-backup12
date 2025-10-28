import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Table, Tabs, Tab } from 'react-bootstrap';
import { 
  FaClock, 
  FaCalendarAlt, 
  FaFileAlt, 
  FaCheckCircle, 
  FaImage,
  FaTrash,
  FaPaperPlane,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if validation passed
    if (validationError) {
      setMessage({ 
        type: 'danger', 
        text: 'Please correct the validation errors before submitting' 
      });
      return;
    }

    // Check if proof images are uploaded
    if (formData.proof_images.length === 0) {
      setMessage({ 
        type: 'danger', 
        text: 'Please upload at least one proof image' 
      });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('ot_date', formData.ot_date);
      formDataToSend.append('ot_hours', formData.ot_hours);
      formDataToSend.append('reason', formData.reason);
      
      // Append images
      formData.proof_images.forEach((image, index) => {
        formDataToSend.append(`images[${index}]`, image);
      });

      await axios.post('/ot-requests', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Overtime request submitted successfully!' 
      });
      
      // Refresh the OT requests list
      fetchOTRequests();
      
      // Reset form
      setFormData({
        ot_date: '',
        ot_hours: '',
        reason: '',
        proof_images: []
      });
      setImagePreviews([]);
      setValidationError('');
      setActualOTHours(null);
      
      // Switch to pending tab after 2 seconds
      setTimeout(() => {
        setActiveTab('pending');
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (error) {
      console.error('Error submitting OT request:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to submit overtime request' 
      });
    } finally {
      setIsSubmitting(false);
    }
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
                          <th>OT Hours</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                        {pendingRequests.map((request) => (
                          <tr key={request.id}>
                            <td>{formatDate(request.ot_date || request.date)}</td>
                            <td>
                              <Badge bg="info">{request.ot_hours || 'N/A'} hrs</Badge>
                        </td>
                            <td style={{ maxWidth: '300px' }}>
                              {request.reason?.substring(0, 60)}
                              {request.reason?.length > 60 && '...'}
                        </td>
                        <td>{getStatusBadge(request.status)}</td>
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
                          <th>OT Hours</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Submitted On</th>
                          <th>Reviewed On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedRequests.map((request) => (
                          <tr key={request.id}>
                            <td>{formatDate(request.ot_date || request.date)}</td>
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
                            <td>{getStatusBadge(request.status)}</td>
                            <td>{formatDate(request.created_at)}</td>
                            <td>
                              {formatDate(request.hr_reviewed_at || request.manager_reviewed_at)}
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
    </Container>
  );
};

export default OTForm;
