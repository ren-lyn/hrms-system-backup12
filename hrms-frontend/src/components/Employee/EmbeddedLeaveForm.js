import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest } from '../../api/leave';
import axios from '../../axios';
import './EmbeddedLeaveForm.css';

const EmbeddedLeaveForm = () => {
  const [formData, setFormData] = useState({
    company: 'Cabuyao Concrete Development Corporation',
    name: '',
    dateFiled: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: 'Vacation Leave',
    startDate: null,
    endDate: null,
    totalDays: 0,
    totalHours: 0,
    reason: '',
    applicantName: ''
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  // Auto-fill user info from multiple sources
  useEffect(() => {
    const loadEmployeeData = async () => {
      console.log('Loading employee profile data...');
      
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
          console.log('Trying main profile API...');
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
            name: 'Test Employee',
            department: 'IT Department',
            applicantName: 'Test Employee'
          }));
        }
      }
    };
    
    loadEmployeeData();
  }, []); // Load once on component mount

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const calculateDaysAndHours = (startDate, endDate) => {
    if (!startDate || !endDate) return { days: 0, hours: 0 };

    // Calculate the difference in milliseconds
    const timeDiff = endDate.getTime() - startDate.getTime();
    
    // Calculate total days (inclusive of both start and end dates)
    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Ensure minimum 1 day if same date is selected
    if (days < 1) days = 1;
    
    // Calculate total working hours (assuming 8 hours per working day)
    // This is just for reference - actual hours should be manually set for partial days
    const totalWorkingHours = days * 8;

    return { 
      days: days, 
      hours: totalWorkingHours
    };
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    const { days } = calculateDaysAndHours(start, end);

    setFormData(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      totalDays: days,
      totalHours: 0 // Default to 0 for full day leaves, user can manually enter for partial days
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.startDate || !formData.endDate) {
      showAlert('Please select start and end dates for your leave request.', 'warning');
      return;
    }
    
    // Check if start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      showAlert('Leave start date cannot be in the past. Please select a future date.', 'warning');
      return;
    }
    
    if (!formData.name.trim()) {
      showAlert('Please enter your name.', 'warning');
      return;
    }
    
    if (!formData.reason.trim()) {
      showAlert('Please provide a reason for your leave.', 'warning');
      return;
    }
    
    if (formData.totalHours > 8) {
      showAlert('Total hours cannot be more than 8 hours per day.', 'warning');
      return;
    }
    
    console.log('Form data before submission:', formData);
    setLoading(true);

    try {
      const formatDateForAPI = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Use FormData for file upload
      const submitData = new FormData();
      submitData.append('company', formData.company || 'Cabuyao Concrete Development Corporation');
      submitData.append('name', formData.applicantName || formData.name || 'Test Employee');
      submitData.append('department', formData.department || 'Test Department');
      submitData.append('type', formData.leaveType);
      submitData.append('from', formatDateForAPI(formData.startDate));
      submitData.append('to', formatDateForAPI(formData.endDate));
      submitData.append('total_days', formData.totalDays || 1);
      // Only send total_hours if it's greater than 0 (for partial day leaves)
      // For full day leaves, send 0
      if (formData.totalHours > 0 && formData.totalHours <= 8) {
        submitData.append('total_hours', formData.totalHours);
      } else {
        // For full day leaves, send 0
        submitData.append('total_hours', 0);
      }
      submitData.append('reason', formData.reason || 'Leave request');
      
      
      // Debug the form data being sent
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Form data object:', formData);
      console.log('Formatted start date:', formatDateForAPI(formData.startDate));
      console.log('Formatted end date:', formatDateForAPI(formData.endDate));
      console.log('Total days:', formData.totalDays);
      console.log('Total hours:', formData.totalHours);
      console.log('Reason length:', formData.reason.length);
      console.log('Has signature file:', !!formData.signatureFile);
      
      // Log FormData contents
      for (let pair of submitData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      // Check authentication
      const token = localStorage.getItem('auth_token');
      console.log('Auth token present:', !!token);
      if (token) {
        console.log('Token length:', token.length);
      }

      const response = await createLeaveRequest(submitData);
      console.log('Leave request submitted successfully:', response);
      
      showAlert('Leave application submitted successfully! HR will review your request shortly.', 'success');

      // Reset form
      setFormData(prev => ({
        ...prev,
        leaveType: 'Vacation Leave',
        startDate: null,
        endDate: null,
        totalDays: 0,
        totalHours: 0,
        reason: ''
      }));
    } catch (error) {
      console.error('Error submitting leave request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Failed to submit leave application. Please try again.';
      
      if (error.response?.data?.errors) {
        // Laravel validation errors
        const validationErrors = error.response.data.errors;
        const errorList = Object.values(validationErrors).flat();
        errorMessage = errorList.join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert(`Error: ${errorMessage}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="embedded-leave-form">
      {alert.show && (
        <Alert
          variant={alert.type}
          dismissible
          onClose={() => setAlert({ show: false, message: '', type: '' })}
        >
          {alert.message}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Top Section */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Company</Form.Label>
              <Form.Control
                type="text"
                value={formData.company}
                readOnly
                className="underlined-input bg-light"
                title="Company name is pre-filled"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                readOnly
                className="underlined-input bg-light"
                title="Auto-filled from your employee profile"
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Date Filed</Form.Label>
              <Form.Control
                type="date"
                value={formData.dateFiled}
                readOnly
                className="underlined-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Department</Form.Label>
              <Form.Control
                type="text"
                value={formData.department}
                readOnly
                className="underlined-input bg-light"
                title="Auto-filled from your employee profile"
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Leave Type Section */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="form-label">Leave Type</Form.Label>
              <Form.Select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                className="form-select-custom"
                required
              >
                <option value="Vacation Leave">Vacation Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Bereavement Leave">Bereavement Leave</option>
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

        {/* Dates Section */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="form-label">Dates</Form.Label>
              <div className="date-input-wrapper">
                <DatePicker
                  selected={formData.startDate}
                  onChange={handleDateChange}
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  selectsRange
                  minDate={new Date()}
                  placeholderText="Select date range"
                  className="date-range-input"
                  dateFormat="yyyy-MM-dd"
                />
                <CalendarIcon className="calendar-icon" size={20} />
              </div>
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label className="form-label">Total Days</Form.Label>
              <Form.Control
                type="number"
                value={formData.totalDays}
                readOnly
                className="calculation-input bg-light"
                title="Auto-calculated from selected dates"
              />
            
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label className="form-label">Total Hours</Form.Label>
              <Form.Control
                type="number"
                value={formData.totalHours === 0 ? '' : formData.totalHours}
                onChange={(e) => {
                  const hours = parseFloat(e.target.value) || 0;
                  if (hours <= 8) {
                    setFormData({ ...formData, totalHours: hours });
                  } else {
                    // Show warning if trying to enter more than 8 hours
                    showAlert('Maximum 8 hours allowed for partial day leaves', 'warning');
                  }
                }}
                min="0"
                max="8"
                step="0.5"
                className="calculation-input"
                placeholder={formData.totalDays * 8}
                title="Leave empty for full day leaves, or enter hours for partial day leaves (max 8 per day)"
              />
            
            </Form.Group>
          </Col>
        </Row>

        {/* Reason & Signature */}
        <Row className="mb-3">
          <Col md={8}>
            <Form.Group>
              <Form.Label className="form-label">Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="reason-textarea"
              />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Label className="form-label">Applicant Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.applicantName}
              onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
              className="underlined-input text-center mb-3"
            />

          </Col>
        </Row>

        {/* Submit Button */}
        <Row>
          <Col className="text-end">
            <Button variant="success" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default EmbeddedLeaveForm;
