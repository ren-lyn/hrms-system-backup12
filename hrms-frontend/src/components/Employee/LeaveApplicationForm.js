import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Modal } from 'react-bootstrap';
import { ArrowLeft, Calendar } from 'lucide-react';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest, checkLeaveEligibility, getLeaveTypes, getLeaveSummary } from '../../api/leave';
import { checkLeaveSubmissionAvailability } from '../../api/calendar';
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
  const [hrAvailability, setHrAvailability] = useState({ available: true, message: '', endTime: null });
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [loadingLeaveSummary, setLoadingLeaveSummary] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);

  // Auto-fill user info and check eligibility on component mount
  useEffect(() => {
    fetchEmployeeProfile();
    checkEligibilityStatus();
    fetchLeaveTypesData();
    checkHrAvailability();
    fetchLeaveSummaryData();
  }, []);

  const fetchLeaveSummaryData = async () => {
    try {
      setLoadingLeaveSummary(true);
      const response = await getLeaveSummary();
      const data = response.data;
      
      setLeaveSummary(data);
      console.log('Leave summary loaded:', data);
    } catch (error) {
      console.error('Error fetching leave summary:', error);
      // Set default values if API fails
      setLeaveSummary({
        leave_instances: { total_allowed: null, used: 0, remaining: null, is_unlimited: true },
        payment_status: {
          next_leave_will_be: 'with PAY (up to 7 days)',
          message: 'Your first leave of the year will be paid (up to 7 days).',
          can_file_leave: true
        },
        rules: {}
      });
    } finally {
      setLoadingLeaveSummary(false);
    }
  };

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
        { type: 'Sick Leave', entitled_days: 8 },
        { type: 'Emergency Leave', entitled_days: 8 },
        { type: 'Personal Leave', entitled_days: 5 },
        { type: 'Bereavement Leave', entitled_days: 5 },
        { type: 'Maternity Leave', entitled_days: 105 },
        { type: 'Paternity Leave', entitled_days: 7 },
        { type: 'Leave for Victims of Violence Against Women and Their Children (VAWC)', entitled_days: 10 },
        { type: "Women's Special Leave", entitled_days: 60 },
        { type: 'Parental Leave', entitled_days: 7 }
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

  const checkHrAvailability = async () => {
    try {
      const response = await checkLeaveSubmissionAvailability();
      const data = response.data;
      
      setHrAvailability({
        available: data.available,
        message: data.message || '',
        endTime: data.end_time || null
      });
      
      if (!data.available) {
        showAlert(data.message, 'warning');
      }
    } catch (error) {
      console.error('Error checking HR availability:', error);
      setHrAvailability({
        available: true, // Default to allowing submissions if check fails
        message: 'Unable to check HR availability at this time.',
        endTime: null
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
    
    // Special handling for these leave types: allow exceeding limit with paid/unpaid split
    const specialLeaveTypes = [
      'Sick Leave',
      'Emergency Leave',
      'Vacation Leave',
      'Maternity Leave',
      'Paternity Leave',
      'Leave for Victims of Violence Against Women and Their Children (VAWC)',
      "Women's Special Leave",
      'Parental Leave'
    ];
    
    if (specialLeaveTypes.includes(currentLeaveType) && maxDays && days > maxDays) {
      const paidDays = maxDays;
      const unpaidDays = days - maxDays;
      return {
        days: days > 0 ? days : 0,
        hours: hours > 0 ? hours : 0,
        valid: true,
        warning: true,
        message: `For ${currentLeaveType}: First ${paidDays} days will be paid, remaining ${unpaidDays} days will be unpaid. You can still submit this request.`,
        paidDays: paidDays,
        unpaidDays: unpaidDays
      };
    }
    
    // For other leave types, maintain strict limit
    if (maxDays && days > maxDays) {
      return {
        days: days > 0 ? days : 0,
        hours: hours > 0 ? hours : 0,
        valid: false,
        message: `You can only file up to ${maxDays} days for ${currentLeaveType}.`
      };
    }
    
    return { 
      days: days > 0 ? days : 0, 
      hours: hours > 0 ? hours : 0, 
      valid: true, 
      message: days > 0 ? `✅ Valid selection: ${days} days (within ${maxDays}-day limit)` : '' 
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
        message: result.message,
        warning: result.warning || false,
        paidDays: result.paidDays,
        unpaidDays: result.unpaidDays
      });
      
      // Show alert if invalid or warning
      if (!result.valid && result.message) {
        showAlert(result.message, 'warning');
      } else if (result.warning && result.message) {
        showAlert(result.message, 'info');
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
      message: result.message,
      warning: result.warning || false,
      paidDays: result.paidDays,
      unpaidDays: result.unpaidDays
    });
    
    // Show alert if invalid or warning
    if (!result.valid && result.message) {
      showAlert(result.message, 'warning');
    } else if (result.warning && result.message) {
      showAlert(result.message, 'info');
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
    
    // Basic validation first
    if (!formData.dateRange || !formData.signatureFile) {
      showAlert('Please fill in all required fields including signature', 'danger');
      return;
    }
    
    // Check for active leave
    if (leaveSummary && leaveSummary.active_leave?.exists) {
      showAlert(leaveSummary.payment_status?.restriction_message || 'You have an active leave. Please wait until it ends.', 'danger');
      return;
    }
    
    // Calculate and show payment breakdown modal
    await calculateAndShowPaymentBreakdown();
  };

  const formatTenureDisplay = (tenure) => {
    // Ensure tenure is always displayed as a whole number (no decimals)
    if (!tenure) return 'Unknown';
    
    // If display is already formatted, check if it contains decimals
    if (tenure.display) {
      // If display contains a decimal, reformat it
      if (tenure.display.includes('.') || !isNaN(parseFloat(tenure.display))) {
        const months = parseFloat(tenure.display) || tenure.months || 0;
        const monthsRounded = Math.round(months);
        const years = Math.floor(monthsRounded / 12);
        const remainingMonths = monthsRounded % 12;
        
        if (monthsRounded === 0) {
          return 'Less than 1 month';
        } else if (years > 0) {
          return years + (years > 1 ? ' years' : ' year') + 
                 (remainingMonths > 0 ? ' and ' + remainingMonths + (remainingMonths > 1 ? ' months' : ' month') : '');
        } else {
          return monthsRounded + (monthsRounded > 1 ? ' months' : ' month');
        }
      }
      return tenure.display;
    }
    
    // Fallback: format from months value
    const months = tenure.months || 0;
    const monthsRounded = Math.round(months);
    const years = Math.floor(monthsRounded / 12);
    const remainingMonths = monthsRounded % 12;
    
    if (monthsRounded === 0) {
      return 'Less than 1 month';
    } else if (years > 0) {
      return years + (years > 1 ? ' years' : ' year') + 
             (remainingMonths > 0 ? ' and ' + remainingMonths + (remainingMonths > 1 ? ' months' : ' month') : '');
    } else {
      return monthsRounded + (monthsRounded > 1 ? ' months' : ' month');
    }
  };

  const calculateAndShowPaymentBreakdown = async () => {
    try {
      // Get the tenure-based leave balance
      if (!leaveSummary || !leaveSummary.tenure) {
        // If no summary, proceed with submission
        await handleActualSubmit();
        return;
      }
      
      const tenure = leaveSummary.tenure;
      const tenureDisplay = formatTenureDisplay(tenure);
      const requestedDays = formData.totalDays;
      // SIL only applies to Sick/Emergency Leave for employees with 1+ year tenure
      const isSIL = (formData.leaveType === 'Sick Leave' || formData.leaveType === 'Emergency Leave') && 
                    (tenure.months >= 12);
      
      let maxWithPayDays = 0;
      let usedWithPayDays = 0;
      let remainingWithPayDays = 0;
      
      if (isSIL) {
        // For SIL (Sick Leave and Emergency Leave)
        maxWithPayDays = leaveSummary.sil_balance.max_with_pay_days;
        usedWithPayDays = leaveSummary.sil_balance.used_with_pay_days;
        remainingWithPayDays = leaveSummary.sil_balance.remaining_with_pay_days;
      } else {
        // For other leave types
        if (leaveSummary.other_leaves_paid) {
          // 1 year or more: other leaves are paid based on config
          const withPayDaysConfig = {
            'Vacation Leave': 5,
            'Maternity Leave': 105,
            'Paternity Leave': 7,
            'Personal Leave': 5,
            'Bereavement Leave': 5,
            'Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days': 10,
            "Women's Special Leave – 60 days": 60,
            'Parental Leave': 7
          };
          maxWithPayDays = withPayDaysConfig[formData.leaveType] || requestedDays;
          // Calculate used days for this specific leave type
          const thisYearLeaves = leaveSummary.leaves_this_year || [];
          usedWithPayDays = thisYearLeaves
            .filter(leave => leave.type === formData.leaveType && leave.terms === 'with PAY' && leave.status === 'approved')
            .reduce((sum, leave) => sum + (leave.total_days || 0), 0);
          remainingWithPayDays = Math.max(0, maxWithPayDays - usedWithPayDays);
        } else {
          // Less than 1 year: other leaves are unpaid
          maxWithPayDays = 0;
          usedWithPayDays = 0;
          remainingWithPayDays = 0;
        }
      }
      
      // Calculate breakdown
      let breakdown = {
        leaveType: formData.leaveType,
        requestedDays: requestedDays,
        maxWithPayDays: maxWithPayDays,
        usedWithPayDays: usedWithPayDays,
        remainingWithPayDays: remainingWithPayDays,
        withPayDays: 0,
        withoutPayDays: 0,
        isSplit: false,
        message: '',
        tenure: tenureDisplay,
        isSIL: isSIL
      };
      
      if (maxWithPayDays === 0) {
        // No paid days available
        breakdown.withPayDays = 0;
        breakdown.withoutPayDays = requestedDays;
        breakdown.message = `Based on your tenure (${tenureDisplay}), all ${requestedDays} days will be WITHOUT PAY.`;
      } else if (remainingWithPayDays >= requestedDays) {
        // All days with pay
        breakdown.withPayDays = requestedDays;
        breakdown.withoutPayDays = 0;
        breakdown.message = `All ${requestedDays} days will be WITH PAY.`;
      } else if (remainingWithPayDays > 0) {
        // Split payment
        breakdown.withPayDays = remainingWithPayDays;
        breakdown.withoutPayDays = requestedDays - remainingWithPayDays;
        breakdown.isSplit = true;
        breakdown.message = `Only ${remainingWithPayDays} days are with pay. The remaining ${breakdown.withoutPayDays} days will be without pay.`;
      } else {
        // All days without pay
        breakdown.withPayDays = 0;
        breakdown.withoutPayDays = requestedDays;
        breakdown.message = `All ${requestedDays} days will be WITHOUT PAY. You have already used all ${maxWithPayDays} paid days for ${isSIL ? 'SIL' : formData.leaveType} this year.`;
      }
      
      setPaymentBreakdown(breakdown);
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Error calculating payment breakdown:', error);
      await handleActualSubmit();
    }
  };

  const handlePaymentConfirm = async () => {
    setShowPaymentModal(false);
    await handleActualSubmit();
  };
  
  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPaymentBreakdown(null);
  };

  const handleActualSubmit = async () => {
    setLoading(true);

    try {
      // Check HR availability before submitting
      await checkHrAvailability();
      
      // If HR is not available, block submission
      if (!hrAvailability.available) {
        showAlert(hrAvailability.message, 'warning');
        setLoading(false);
        return;
      }
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

      {/* Active Leave Note (if exists) */}
      {leaveSummary && leaveSummary.active_leave?.exists && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{ 
            fontSize: '20px', 
            lineHeight: '1',
            marginTop: '2px',
            flexShrink: 0
          }}>⚠️</div>
          <div style={{ 
            fontSize: '14px', 
            color: '#856404',
            lineHeight: '1.5'
          }}>
            <strong>Note:</strong> You have an active {leaveSummary.active_leave.type} until {new Date(leaveSummary.active_leave.to).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. 
            You can file your next leave on {new Date(leaveSummary.active_leave.can_file_from).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </div>
        </div>
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
                        <option value="Sick Leave">Sick Leave (8 days)</option>
                        <option value="Emergency Leave">Emergency Leave (8 days)</option>
                        <option value="Personal Leave">Personal Leave (5 days)</option>
                        <option value="Bereavement Leave">Bereavement Leave (5 days)</option>
                        <option value="Maternity Leave">Maternity Leave (105 days)</option>
                        <option value="Paternity Leave">Paternity Leave (7 days)</option>
                        <option value="Leave for Victims of Violence Against Women and Their Children (VAWC)">VAWC Leave (10 days)</option>
                        <option value="Women's Special Leave">Women's Special Leave (60 days)</option>
                        <option value="Parental Leave">Parental Leave (7 days)</option>
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
                    <div className={`mt-2 p-2 rounded ${dateValidation.valid ? 'bg-light-success text-success border border-success' : 'bg-light-danger text-danger border border-danger'}`}>
                      <small className="d-block">
                        <strong>{dateValidation.valid ? '✅' : '⚠️'}</strong> {dateValidation.message}
                      </small>
                    </div>
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
                  disabled={loading || !formData.signatureFile || !eligibilityCheck.eligible || !dateValidation.valid || (leaveSummary && !leaveSummary.payment_status?.can_file_leave)}
                  title={leaveSummary && !leaveSummary.payment_status?.can_file_leave ? 
                    leaveSummary.payment_status?.restriction_message : 
                    'Submit your leave request'}
                >
                  {loading ? 'Submitting...' : 
                   (leaveSummary && !leaveSummary.payment_status?.can_file_leave) ? 'Cannot Submit - Active Leave' :
                   !eligibilityCheck.eligible ? 'Cannot Submit - Check Requirements Above' : 
                   !dateValidation.valid ? 'Cannot Submit - Invalid Date Range' :
                   'Submit Leave Request'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Payment Validation Modal */}
      <Modal show={showPaymentModal} onHide={handlePaymentCancel} centered size="lg">
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ color: '#1971c2', fontWeight: '600' }}>
            💰 Leave Payment Information
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {paymentBreakdown && (
            <div>
              {/* Leave Details */}
              <div style={{
                background: '#e7f5ff',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #1971c2'
              }}>
                <h6 style={{ color: '#1971c2', marginBottom: '12px', fontWeight: '600' }}>
                  📋 Your Leave Request
                </h6>
                <p style={{ margin: '5px 0' }}><strong>Leave Type:</strong> {paymentBreakdown.leaveType}</p>
                <p style={{ margin: '5px 0' }}><strong>Requested Days:</strong> {paymentBreakdown.requestedDays} days</p>
                <p style={{ margin: '5px 0' }}><strong>Date Range:</strong> {formData.dateRange}</p>
              </div>

              {/* Payment Breakdown */}
              <div style={{
                background: paymentBreakdown.isSplit ? '#fff3cd' : (paymentBreakdown.withoutPayDays > 0 ? '#f8d7da' : '#d4edda'),
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: `2px solid ${paymentBreakdown.isSplit ? '#ffc107' : (paymentBreakdown.withoutPayDays > 0 ? '#dc3545' : '#28a745')}`
              }}>
                <h5 style={{ 
                  color: paymentBreakdown.isSplit ? '#856404' : (paymentBreakdown.withoutPayDays > 0 ? '#721c24' : '#155724'),
                  marginBottom: '15px',
                  fontWeight: '600'
                }}>
                  💵 Payment Breakdown
                </h5>
                
                {paymentBreakdown.withPayDays > 0 && (
                  <div style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    border: '2px solid #28a745'
                  }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                      ✅ {paymentBreakdown.withPayDays} days WITH PAY
                    </p>
                  </div>
                )}
                
                {paymentBreakdown.withoutPayDays > 0 && (
                  <div style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '2px solid #dc3545'
                  }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#dc3545' }}>
                      ⚠️ {paymentBreakdown.withoutPayDays} days WITHOUT PAY
                    </p>
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px solid #dee2e6'
              }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                  <strong>ℹ️ Explanation:</strong><br/>
                  {paymentBreakdown.message}
                </p>
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                  <strong>Your Tenure:</strong> {paymentBreakdown.tenure}<br/>
                  {paymentBreakdown.isSIL ? (
                    <span>
                      <strong>Category:</strong> SIL (Sick & Emergency Leave Combined)<br/>
                      Used <strong>{paymentBreakdown.usedWithPayDays} of {paymentBreakdown.maxWithPayDays}</strong> paid SIL days this year.
                    </span>
                  ) : (
                    <span>
                      <strong>Category:</strong> Emergency Leave<br/>
                      Used <strong>{paymentBreakdown.usedWithPayDays} of {paymentBreakdown.maxWithPayDays}</strong> paid days for {paymentBreakdown.leaveType} this year.
                    </span>
                  )}
                </p>
              </div>

              {/* Confirmation Question */}
              <div style={{ 
                textAlign: 'center', 
                padding: '15px',
                background: '#fff',
                borderRadius: '8px',
                border: '2px solid #1971c2'
              }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1971c2' }}>
                  Do you want to proceed with this leave request?
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ background: '#f8f9fa' }}>
          <Button variant="secondary" onClick={handlePaymentCancel} size="lg">
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePaymentConfirm} size="lg">
            Yes, Submit Leave Request
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LeaveApplicationForm;
