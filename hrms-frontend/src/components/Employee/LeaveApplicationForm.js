import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest, checkLeaveEligibility, getLeaveTypes } from '../../api/leave';
import axios from '../../axios';
import { fileToBase64 } from '../../utils/signatureUtils';
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
    signatureFile: null,
    signatureBase64: null
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [eligibilityCheck, setEligibilityCheck] = useState({ loading: true, eligible: true, message: '', restrictions: null });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveEntitlements, setLeaveEntitlements] = useState({});
  const [dateValidation, setDateValidation] = useState({ valid: true, message: '' });

  // Auto-fill user info and check eligibility on component mount
  useEffect(() => {
    fetchEmployeeProfile();
    checkEligibilityStatus();
    fetchLeaveTypesData();
  }, []);

  const fetchEmployeeProfile = async () => {
    console.log('Fetching employee profile...');
    
    // First, try localStorage for immediate display
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('User info from localStorage:', userInfo);
    
    if (userInfo.name || userInfo.first_name) {
      const fullName = userInfo.name || `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim();
      setFormData(prev => ({
        ...prev,
        name: fullName,
        department: userInfo.department || 'Not Set',
        applicantName: fullName,
        company: 'Cabuyao Concrete Development Corporation'
      }));
    }
    
    // Then try API to get more complete data
    try {
      let response;
      try {
        console.log('Trying authenticated API...');
        // Try the main profile API first (from EmployeeController)
        response = await axios.get('/employee/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Profile API response:', response.data);
      } catch (profileError) {
        console.log('Profile API failed, trying leave profile API:', profileError.message);
        try {
          // Try the leave profile API
          response = await getEmployeeProfile();
          console.log('Leave profile API response:', response.data);
        } catch (leaveError) {
          console.log('Leave profile API failed, trying test API:', leaveError.message);
          // Fallback to test API for development
          response = await getEmployeeProfileTest(6);
          console.log('Test API response:', response.data);
        }
      }
      
      let profileData = response.data;
      console.log('Profile data loaded from API:', profileData);
      
      // Handle different API response formats
      if (profileData.profile) {
        // EmployeeController response format
        profileData = profileData.profile;
      }
      
      if (profileData) {
        const employeeName = profileData.employee_name || 
                           profileData.name || 
                           `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
        
        setFormData(prev => ({
          ...prev,
          name: employeeName || prev.name,
          department: profileData.department || prev.department,
          applicantName: employeeName || prev.applicantName,
          company: profileData.company || 'Cabuyao Concrete Development Corporation'
        }));
      }
    } catch (error) {
      console.error('Failed to load employee profile from API:', error);
      // If API fails and we don't have localStorage data, set default values
      if (!userInfo.name && !userInfo.first_name) {
        setFormData(prev => ({
          ...prev,
          name: 'Employee Name',
          department: 'Department',
          applicantName: 'Employee Name'
        }));
      }
    }
  };

  const fetchLeaveTypesData = async () => {
    try {
      const response = await getLeaveTypes();
      const data = response.data;
      
      if (data.leave_types) {
        setLeaveTypes(data.leave_types);
        
        // Create entitlements mapping for quick lookup
        const entitlements = {};
        data.leave_types.forEach(leaveType => {
          entitlements[leaveType.type] = leaveType.entitled_days;
        });
        setLeaveEntitlements(entitlements);
        
        console.log('Leave types loaded:', data.leave_types);
        console.log('Leave entitlements:', entitlements);
      }
    } catch (error) {
      console.error('Error fetching leave types:', error);
      // Set default leave types if API fails
      const defaultTypes = [
        { type: 'Vacation Leave', entitled_days: 5 },
        { type: 'Sick Leave', entitled_days: 5 },
        { type: 'Emergency Leave', entitled_days: 5 },
        { type: 'Personal Leave', entitled_days: 5 },
        { type: 'Bereavement Leave', entitled_days: 5 },
        { type: 'Maternity Leave', entitled_days: 105 },
        { type: 'Paternity Leave', entitled_days: 7 }
      ];
      setLeaveTypes(defaultTypes);
      
      const entitlements = {};
      defaultTypes.forEach(leaveType => {
        entitlements[leaveType.type] = leaveType.entitled_days;
      });
      setLeaveEntitlements(entitlements);
    }
  };

  const checkEligibilityStatus = async () => {
    try {
      setEligibilityCheck(prev => ({ ...prev, loading: true }));
      const response = await checkLeaveEligibility();
      const data = response.data;
      
      setEligibilityCheck({
        loading: false,
        eligible: data.eligible,
        message: data.message,
        restrictions: data.restrictions
      });
      
      if (!data.eligible) {
        showAlert(data.message, 'warning');
      }
    } catch (error) {
      console.error('Error checking leave eligibility:', error);
      setEligibilityCheck({
        loading: false,
        eligible: true, // Default to allowing submissions if check fails
        message: 'Unable to check leave eligibility at this time.',
        restrictions: null
      });
    }
  };

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

  const calculateDaysAndHours = (dateRange, leaveType = null) => {
    if (!dateRange || !dateRange.includes(' - ')) return { days: 0, hours: 0, valid: true, message: '' };
    
    const [startStr, endStr] = dateRange.split(' - ');
    const startDate = parseDate(startStr.trim());
    const endDate = parseDate(endStr.trim());
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { days: 0, hours: 0, valid: false, message: 'Invalid date format' };
    }
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
    const hours = days * 8; // Assuming 8 hours per day
    
    // Validate against leave entitlements if leave type is provided
    const currentLeaveType = leaveType || formData.leaveType;
    const maxDays = leaveEntitlements[currentLeaveType];
    
    if (maxDays && days > maxDays) {
      return {
        days: days > 0 ? days : 0,
        hours: hours > 0 ? hours : 0,
        valid: false,
        message: `${currentLeaveType} allows maximum ${maxDays} days. You selected ${days} days.`
      };
    }
    
    return { 
      days: days > 0 ? days : 0, 
      hours: hours > 0 ? hours : 0, 
      valid: true, 
      message: days > 0 ? `Valid selection: ${days} days` : '' 
    };
  };

  const handleLeaveTypeChange = (newLeaveType) => {
    setFormData(prev => ({ ...prev, leaveType: newLeaveType }));
    
    // Re-validate existing date range with new leave type
    if (formData.dateRange) {
      const result = calculateDaysAndHours(formData.dateRange, newLeaveType);
      
      setFormData(prev => ({
        ...prev,
        leaveType: newLeaveType,
        totalDays: result.days,
        totalHours: result.hours
      }));
      
      setDateValidation({
        valid: result.valid,
        message: result.message
      });
      
      // Show alert if invalid
      if (!result.valid && result.message) {
        showAlert(result.message, 'warning');
      }
    }
  };

  const handleDateRangeChange = (value) => {
    const result = calculateDaysAndHours(value);
    
    setFormData(prev => ({
      ...prev,
      dateRange: value,
      totalDays: result.days,
      totalHours: result.hours
    }));
    
    setDateValidation({
      valid: result.valid,
      message: result.message
    });
    
    // Show alert if invalid
    if (!result.valid && result.message) {
      showAlert(result.message, 'warning');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.type)) {
        try {
          // Convert to base64 for offline storage (only for images)
          let base64Data = null;
          if (file.type.startsWith('image/')) {
            base64Data = await fileToBase64(file);
          }
          
          setFormData({
            ...formData, 
            signatureFile: file,
            signatureBase64: base64Data
          });
        } catch (error) {
          console.error('Error converting file to base64:', error);
          // Still allow the file upload even if base64 conversion fails
          setFormData({...formData, signatureFile: file});
        }
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
      
      // Add base64 signature for offline viewing (if available)
      if (formData.signatureBase64) {
        submitData.append('signature_base64', formData.signatureBase64);
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
        signatureFile: null,
        signatureBase64: null
      }));
      
      // Clear file input
      const fileInput = document.getElementById('signatureFile');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error submitting leave request:', error);
      
      // Handle specific validation errors from backend
      if (error.response && error.response.status === 422 && error.response.data.error) {
        showAlert(error.response.data.error, 'danger');
        // Refresh eligibility status after validation error
        checkEligibilityStatus();
      } else {
        showAlert('Failed to submit leave application. Please try again.', 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="leave-application-form dashboard-embedded">
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

      {/* Leave Request Limits Information */}
      {!eligibilityCheck.loading && eligibilityCheck.restrictions && (
        <Card className="mb-4" style={{ backgroundColor: eligibilityCheck.eligible ? '#f8f9fa' : '#fff3cd' }}>
          <Card.Body>
            <h6 className="mb-3" style={{ color: '#495057' }}>📋 Leave Request Status</h6>
            <Row>
              <Col md={6}>
                <div className="mb-2">
                  <strong>Monthly Limit:</strong> {eligibilityCheck.restrictions.monthly_limit.used}/{eligibilityCheck.restrictions.monthly_limit.limit} requests used in {eligibilityCheck.restrictions.monthly_limit.month}
                </div>
                {eligibilityCheck.restrictions.monthly_limit.remaining === 0 && (
                  <small className="text-warning">⚠️ Monthly limit reached</small>
                )}
              </Col>
              <Col md={6}>
                {eligibilityCheck.restrictions.waiting_period ? (
                  <div className="mb-2">
                    <strong>Last Leave:</strong> Ended on {eligibilityCheck.restrictions.waiting_period.last_leave_end_date}
                    <br />
                    {eligibilityCheck.restrictions.waiting_period.waiting_period_active ? (
                      <small className="text-warning">
                        ⏳ Can apply again from {eligibilityCheck.restrictions.waiting_period.can_apply_from} 
                        ({eligibilityCheck.restrictions.waiting_period.days_remaining} days remaining)
                      </small>
                    ) : (
                      <small className="text-success">✅ Waiting period completed</small>
                    )}
                  </div>
                ) : (
                  <div className="mb-2">
                    <strong>Waiting Period:</strong> <span className="text-success">✅ No restrictions</span>
                  </div>
                )}
              </Col>
            </Row>
            {!eligibilityCheck.eligible && (
              <Alert variant="warning" className="mt-3 mb-0">
                <small>{eligibilityCheck.message}</small>
              </Alert>
            )}
            <div className="text-end mt-2">
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={checkEligibilityStatus}
                disabled={eligibilityCheck.loading}
              >
                {eligibilityCheck.loading ? 'Checking...' : 'Refresh Status'}
              </Button>
            </div>
          </Card.Body>
        </Card>
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
                    readOnly
                    className="underlined-input auto-filled"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    readOnly
                    className="underlined-input auto-filled"
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
                    readOnly
                    className="underlined-input auto-filled"
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
                    onChange={(e) => handleLeaveTypeChange(e.target.value)}
                    className="form-select-custom"
                    required
                  >
                    {leaveTypes.length > 0 ? (
                      leaveTypes.map((leaveType) => (
                        <option key={leaveType.type} value={leaveType.type}>
                          {leaveType.type} ({leaveType.entitled_days} days)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Vacation Leave">Vacation Leave (5 days)</option>
                        <option value="Sick Leave">Sick Leave (5 days)</option>
                        <option value="Emergency Leave">Emergency Leave (5 days)</option>
                        <option value="Personal Leave">Personal Leave (5 days)</option>
                        <option value="Bereavement Leave">Bereavement Leave (5 days)</option>
                        <option value="Maternity Leave">Maternity Leave (105 days)</option>
                        <option value="Paternity Leave">Paternity Leave (7 days)</option>
                      </>
                    )}
                  </Form.Select>
                  {/* Show current leave type entitlement */}
                  {leaveEntitlements[formData.leaveType] && (
                    <small className="text-muted mt-1 d-block">
                      📅 Maximum allowed: <strong>{leaveEntitlements[formData.leaveType]} days</strong> for {formData.leaveType}
                    </small>
                  )}
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
                      className={`date-range-input ${!dateValidation.valid ? 'is-invalid' : dateValidation.valid && formData.dateRange ? 'is-valid' : ''}`}
                      required
                    />
                    <Calendar className="calendar-icon" size={20} />
                  </div>
                  {/* Validation feedback */}
                  {dateValidation.message && (
                    <small className={`mt-1 d-block ${dateValidation.valid ? 'text-success' : 'text-danger'}`}>
                      {dateValidation.valid ? '✅' : '⚠️'} {dateValidation.message}
                    </small>
                  )}
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
                          readOnly
                          className="underlined-input text-center auto-filled"
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
                <Button 
                  variant="success" 
                  type="submit" 
                  disabled={loading || !formData.signatureFile || !eligibilityCheck.eligible || !dateValidation.valid}
                >
                  {loading ? 'Submitting...' : 
                   !eligibilityCheck.eligible ? 'Cannot Submit - Check Requirements Above' : 
                   !dateValidation.valid ? 'Cannot Submit - Invalid Date Range' :
                   'Submit Leave Request'}
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
