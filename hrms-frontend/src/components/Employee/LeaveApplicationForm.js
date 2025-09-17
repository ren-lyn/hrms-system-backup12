import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createLeaveRequest } from '../../api/leave';
import './LeaveApplicationForm.css';

const LeaveApplicationForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    dateFiled: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: 'Vacation Leave',
    dateRange: '',
    totalDays: 0,
    totalHours: 0,
    reason: '',
    applicantName: '',
    signatureFile: null
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  // Auto-fill user info on component mount
  useEffect(() => {
    // You can fetch user info from localStorage or API
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    setFormData(prev => ({
      ...prev,
      name: userInfo.name || '',
      company: 'Cabuyao Concrete Development Corporation',
      department: userInfo.department || '',
      applicantName: userInfo.name || ''
    }));
  }, []);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const parseDate = (dateStr) => {
    // Handle various date formats
    if (dateStr.includes('/')) {
      // Handle dd/mm/yyyy or mm/dd/yyyy format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Assume dd/mm/yyyy format
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    return new Date(dateStr);
  };

  const calculateDaysAndHours = (dateRange) => {
    if (!dateRange || !dateRange.includes(' - ')) return { days: 0, hours: 0 };
    
    const [startStr, endStr] = dateRange.split(' - ');
    const startDate = parseDate(startStr.trim());
    const endDate = parseDate(endStr.trim());
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { days: 0, hours: 0 };
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
    const hours = days * 8; // Assuming 8 hours per day
    
    return { days: days > 0 ? days : 0, hours: hours > 0 ? hours : 0 };
  };

  const handleDateRangeChange = (value) => {
    const { days, hours } = calculateDaysAndHours(value);
    setFormData(prev => ({
      ...prev,
      dateRange: value,
      totalDays: days,
      totalHours: hours
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.type)) {
        setFormData({...formData, signatureFile: file});
      } else {
        showAlert('Please upload an image file (JPEG, PNG, GIF) or PDF for e-signature.', 'danger');
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Parse date range for API
      const [fromDateStr, toDateStr] = formData.dateRange.split(' - ');
      const fromDate = parseDate(fromDateStr.trim());
      const toDate = parseDate(toDateStr.trim());
      
      // Format dates as YYYY-MM-DD for API
      const formatDateForAPI = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const submitData = new FormData();
      submitData.append('company', formData.company);
      submitData.append('name', formData.applicantName);
      submitData.append('department', formData.department);
      submitData.append('type', formData.leaveType);
      submitData.append('from', formatDateForAPI(fromDate));
      submitData.append('to', formatDateForAPI(toDate));
      submitData.append('total_days', formData.totalDays);
      submitData.append('total_hours', formData.totalHours);
      submitData.append('reason', formData.reason);
      
      // Add signature file if provided
      if (formData.signatureFile) {
        submitData.append('signature', formData.signatureFile);
      }

      await createLeaveRequest(submitData);
      showAlert('Leave application submitted successfully!', 'success');
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        leaveType: 'Vacation Leave',
        dateRange: '',
        totalDays: 0,
        totalHours: 0,
        reason: '',
        signatureFile: null
      }));
      
      // Clear file input
      const fileInput = document.getElementById('signatureFile');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showAlert('Failed to submit leave application. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="leave-application-form">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            {onBack && (
              <Button variant="link" className="p-0 me-3" onClick={onBack}>
                <ArrowLeft size={24} />
              </Button>
            )}
            <h2 className="mb-0">Leave Application Form</h2>
          </div>
        </Col>
      </Row>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Card className="form-card">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* Top Section - Company, Name, Date, Department */}
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Company</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="underlined-input"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="underlined-input"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Date Filed</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dateFiled}
                    onChange={(e) => setFormData({...formData, dateFiled: e.target.value})}
                    className="underlined-input"
                    readOnly
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Department</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="underlined-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Leave Type Section */}
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Leave Type</Form.Label>
                  <Form.Select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                    className="form-select-custom"
                    required
                  >
                    <option value="Vacation Leave">Vacation Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <div className="bg-light p-3 rounded">
                  <small className="text-muted">
                    <strong>Note:</strong> Pay terms and leave category will be determined by HR during the approval process.
                  </small>
                </div>
              </Col>
            </Row>

            {/* Dates and Calculations Section */}
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Dates</Form.Label>
                  <div className="date-input-wrapper">
                    <Form.Control
                      type="text"
                      placeholder="dd/mm/yyyy - dd/mm/yyyy"
                      value={formData.dateRange}
                      onChange={(e) => handleDateRangeChange(e.target.value)}
                      className="date-range-input"
                      required
                    />
                    <Calendar className="calendar-icon" size={20} />
                  </div>
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Total Numbers of Days Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.totalDays}
                    readOnly
                    className="calculation-input"
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Total Numbers of Hours Leave</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.totalHours}
                    readOnly
                    className="calculation-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Reason and Signature Section */}
            <Row className="mb-4">
              <Col md={7}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Reason:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    className="reason-textarea"
                    placeholder="Please provide the reason for your leave request..."
                  />
                </Form.Group>
              </Col>
              
              <Col md={5}>
                <div className="signature-section">
                  <Form.Label className="form-label">Requested by</Form.Label>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Applicant Name"
                          value={formData.applicantName}
                          onChange={(e) => setFormData({...formData, applicantName: e.target.value})}
                          className="underlined-input text-center"
                        />
                        <div className="input-label">Applicant Name</div>
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="file"
                          id="signatureFile"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="form-control-file"
                          required
                        />
                        <div className="input-label">E-Signature (Upload Image/PDF)</div>
                        {formData.signatureFile && (
                          <div className="mt-2">
                            <small className="text-success">
                              ✓ File selected: {formData.signatureFile.name}
                            </small>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            {/* Submit Buttons */}
            <Row>
              <Col className="text-end">
                <Button variant="danger" className="me-3" type="button" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button variant="success" type="submit" disabled={loading || !formData.signatureFile}>
                  {loading ? 'Submitting...' : 'Submit'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaveApplicationForm;
