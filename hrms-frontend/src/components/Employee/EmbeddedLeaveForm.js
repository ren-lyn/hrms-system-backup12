import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Alert, Modal } from 'react-bootstrap';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest, getMyLeaveRequests, downloadLeavePdf } from '../../api/leave';
import axios from '../../axios';
import './EmbeddedLeaveForm.css';

const EmbeddedLeaveForm = () => {
  const [activeTab, setActiveTab] = useState('form'); // 'form', 'details', 'history'
  const [formData, setFormData] = useState({
    company: 'Cabuyao Concrete Development Corporation',
    name: '',
    dateFiled: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: 'Sick Leave',
    startDate: null,
    endDate: null,
    totalDays: 0,
    totalHours: 0,
    reason: '',
    applicantName: ''
  });

  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remainingLeaves, setRemainingLeaves] = useState(3);
  const [paidLeaveStatus, setPaidLeaveStatus] = useState({ hasPaidLeave: true, paidLeavesUsed: 0 });

  // Load employee data function (optimized with caching)
  const loadEmployeeData = async () => {
    console.log('Loading employee profile data...');
    
    // Check cache first
    const cachedData = localStorage.getItem('employeeProfile');
    const cacheTime = localStorage.getItem('employeeProfileTime');
    const now = Date.now();
    const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
    const isCacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes
    
    if (cachedData && isCacheValid) {
      try {
        const profileData = JSON.parse(cachedData);
        const profile = profileData.profile;
        const fullName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        
        setFormData(prev => ({
          ...prev,
          name: fullName,
          department: profile.department || 'Not Set',
          applicantName: fullName,
          company: 'Cabuyao Concrete Development Corporation'
        }));
        
        console.log('Form data loaded from cache:', { name: fullName, department: profile.department });
        
        // Still fetch fresh data in background
        fetchFreshEmployeeData();
        return;
      } catch (e) {
        console.error('Error parsing cached data:', e);
      }
    }
    
    // Fallback to localStorage for immediate display
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
    
    // Fetch fresh data
    await fetchFreshEmployeeData();
  };

  const fetchFreshEmployeeData = async () => {
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
      // If API fails, check localStorage for fallback data
      const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
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

  // Instant data loading when switching tabs
  useEffect(() => {
    if (activeTab === 'details' || activeTab === 'history') {
      // Load data instantly when viewing details or history tabs
      loadLeaveData();
    }
  }, [activeTab]);

  // Load data on component initialization
  useEffect(() => {
    loadEmployeeData();
    loadLeaveData();
  }, []);

  // Monitor leaveRequests changes
  useEffect(() => {
    console.log('Leave requests updated - count:', leaveRequests.length);
  }, [leaveRequests]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup function - no intervals to clear
    };
  }, []);

  // Fetch leave requests from backend API
  const fetchLeaveRequests = async () => {
    try {
      const response = await getMyLeaveRequests();
      const allRequests = response.data.data || [];
      
      // Separate requests based on status for real-time categorization
      const pendingRequests = allRequests.filter(request => {
        // Keep in Details: anything NOT approved or rejected by HR Assistant
        return request.status !== 'approved' && 
               request.status !== 'rejected' &&
               request.status !== 'completed';
      });
      
      const historyRequests = allRequests.filter(request => {
        // Move to History: approved, rejected, or completed requests
        return request.status === 'approved' || 
               request.status === 'rejected' ||
               request.status === 'completed';
      });
      
      setLeaveRequests(pendingRequests);
      setLeaveHistory(historyRequests);
      
      // Calculate remaining leaves for current month
      calculateRemainingLeaves(allRequests);
      
      // Calculate paid leave status for current year
      calculatePaidLeaveStatus(allRequests);
      
      console.log('Leave requests fetched:', {
        pending: pendingRequests.length,
        history: historyRequests.length,
        total: allRequests.length
      });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  // Load leave requests data instantly
  const loadLeaveData = async () => {
    try {
      // Use the new fetchLeaveRequests function
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Failed to load leave data:', error);
    }
  };

  // Calculate remaining leaves for current month
  const calculateRemainingLeaves = (allRequests) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Count leaves filed in current month
    const currentMonthLeaves = allRequests.filter(request => {
      const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
      return requestDate.getMonth() === currentMonth && 
             requestDate.getFullYear() === currentYear;
    }).length;
    
    const remaining = Math.max(0, 3 - currentMonthLeaves);
    setRemainingLeaves(remaining);
    return remaining;
  };

  // Calculate paid leave status for current year
  const calculatePaidLeaveStatus = (allRequests) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Count paid leaves used in current year
    const paidLeavesUsed = allRequests.filter(request => {
      const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
      const isCurrentYear = requestDate.getFullYear() === currentYear;
      const isPaidLeave = request.terms === 'With Pay' || request.pay_terms === 'With Pay' || 
                         (request.status === 'approved' && !request.terms); // Default to paid if no terms specified
      return isCurrentYear && isPaidLeave;
    }).length;
    
    const hasPaidLeave = paidLeavesUsed < 1; // Employee gets 1 paid leave per year
    
    setPaidLeaveStatus({ hasPaidLeave, paidLeavesUsed });
    return { hasPaidLeave, paidLeavesUsed };
  };

  // Get maximum allowed days for each leave type
  const getMaxDaysForLeaveType = (leaveType) => {
    const leaveLimits = {
      'Sick Leave': 5,
      'Vacation Leave': 5,
      'Emergency Leave': 5,
      'Maternity Leave – 105 days': 105,
      'Paternity Leave – 7 days': 7,
      'Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days': 10,
      'Parental Leave – 7 days': 7,
      'Women\'s Special Leave – 60 days': 60
    };
    return leaveLimits[leaveType] || 0;
  };

  
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    // Remove auto-hide timeout for instant feedback
  };

  const handleDownloadPdf = (requestId) => {
    // Download PDF for the leave request
    downloadLeavePdf(requestId);
  };


  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'details' || tabName === 'history') {
      // Instant refresh when switching to details/history tabs
      loadLeaveData();
    }
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

  const handleStartDateChange = (date) => {
    const { days } = calculateDaysAndHours(date, formData.endDate);
    setFormData(prev => ({
      ...prev,
      startDate: date,
      totalDays: days,
      totalHours: 0
    }));
  };

  const handleEndDateChange = (date) => {
    const { days } = calculateDaysAndHours(formData.startDate, date);
    setFormData(prev => ({
      ...prev,
      endDate: date,
      totalDays: days,
      totalHours: 0
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
    
    // Check if there's already a leave request being processed
    if (leaveRequests.length > 0) {
      showAlert('You still have a leave request being processed.', 'warning');
      return;
    }
    
    if (formData.totalHours > 8) {
      showAlert('Total hours cannot be more than 8 hours per day.', 'warning');
      return;
    }
    
    // Check if total days exceed the limit for the selected leave type
    const maxDays = getMaxDaysForLeaveType(formData.leaveType);
    if (formData.totalDays > maxDays) {
      showAlert(`You can only file up to ${maxDays} days for ${formData.leaveType.split(' – ')[0]}.`, 'warning');
      return;
    }
    
    console.log('Form data before submission:', formData);

    // Create the request object first to ensure it shows in UI regardless of API success/failure
    const formatDateForAPI = (date) => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const newRequest = {
      id: Date.now(), // Use timestamp as temporary ID
      type: formData.leaveType,
      from: formatDateForAPI(formData.startDate),
      to: formatDateForAPI(formData.endDate),
      days: formData.totalDays,
      status: 'submitted',
      stage: 'manager', // Initially shows "Under Manager"
      submitted_at: new Date().toISOString(),
      reason: formData.reason
    };

    console.log('Creating new request object:', newRequest);

    try {

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
      
      // Decrease remaining leaves counter
      setRemainingLeaves(prev => Math.max(0, prev - 1));
      
      // Update paid leave status (assume new leave is paid if employee still has paid leave available)
      setPaidLeaveStatus(prev => {
        if (prev.hasPaidLeave) {
          return { hasPaidLeave: false, paidLeavesUsed: prev.paidLeavesUsed + 1 };
        }
        return prev;
      });
      
      // Reset form after successful submission
      setFormData(prev => ({
        ...prev,
        leaveType: 'Sick Leave',
        startDate: null,
        endDate: null,
        totalDays: 0,
        totalHours: 0,
        reason: ''
      }));
      
      // Switch to details tab to show the new request
      setActiveTab('details');
      
      // Fetch updated leave requests from backend
      await fetchLeaveRequests();
      
      console.log('Leave request submitted and details updated');
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
    }
  };

  // Render Leave Details component with organized table design
  const renderLeaveDetails = () => {
    if (leaveRequests.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Leave Currently Being Processed</h3>
          <p>You don't have any leave requests being processed at the moment. Go to the "Leave Request Form" tab to submit a new leave request, and it will appear here with real-time status updates.</p>
        </div>
      );
    }

    // Create table data from real backend leave requests
    const tableData = leaveRequests.map((request, index) => {
      // Map backend status to display status
      let displayStatus = 'For Approval (Manager)';
      let severity = 'warning';
      
      if (request.status === 'pending') {
        displayStatus = 'For Approval (Manager)';
        severity = 'warning';
      } else if (request.status === 'manager_approved') {
        displayStatus = 'For Approval (HR Assistant)';
        severity = 'info';
      } else if (request.status === 'manager_rejected') {
        displayStatus = 'Manager Rejected';
        severity = 'danger';
      } else if (request.status === 'approved') {
        displayStatus = 'Approved';
        severity = 'success';
      } else if (request.status === 'rejected') {
        displayStatus = 'Rejected';
        severity = 'danger';
      }
      
      return {
        department: request.department || 'N/A',
        name: request.employee_name || 'N/A',
        leaveType: request.type || 'N/A',
        status: displayStatus,
        startDate: request.from ? new Date(request.from).toLocaleDateString() : 'N/A',
        endDate: request.to ? new Date(request.to).toLocaleDateString() : 'N/A',
        totalDays: request.total_days || 0,
        reason: request.reason || 'N/A',
        severity: severity
      };
    });

    return (
      <div className="leave-details-container responsive-container">
        <div className="details-table-container responsive-table-container">
          <table className="details-table responsive-table">
            <thead>
              <tr>
                <th className="col-department text-responsive-sm">DEPARTMENT</th>
                <th className="col-name text-responsive-sm">NAME</th>
                <th className="col-leave-type text-responsive-sm">LEAVE TYPE</th>
                <th className="col-status text-responsive-sm">STATUS</th>
                <th className="col-start-date text-responsive-sm">START DATE</th>
                <th className="col-end-date text-responsive-sm">END DATE</th>
                <th className="col-total-days text-responsive-sm">TOTAL DAYS</th>
                <th className="col-reason text-responsive-sm">REASON</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                  <td className="department-cell">
                    <span className="department-text text-responsive-sm">{row.department}</span>
                  </td>
                  <td className="name-cell">
                    <span className="name-text text-responsive-sm">{row.name}</span>
                  </td>
                  <td className="leave-type-cell">
                    <span className="leave-type-text text-responsive-sm">{row.leaveType}</span>
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge-table ${row.severity} text-responsive-sm`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="start-date-cell">
                    <span className="start-date-text text-responsive-sm">{row.startDate}</span>
                  </td>
                  <td className="end-date-cell">
                    <span className="end-date-text text-responsive-sm">{row.endDate}</span>
                  </td>
                  <td className="total-days-cell">
                    <div className="total-days-badge">
                      <span className="days-count text-responsive-sm">{row.totalDays}</span>
                      <span className="days-label text-responsive-sm">day{row.totalDays > 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="reason-cell">
                    <span className="reason-text text-responsive-sm" title={row.reason}>
                      {row.reason && row.reason.length > 50 ? row.reason.substring(0, 50) + '...' : row.reason || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Leave History component with table format
  const renderLeaveHistory = () => {
    if (leaveHistory.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Leave History</h3>
          <p>There is no leave history available. Your completed leave requests will appear here once they are processed and approved or rejected.</p>
        </div>
      );
    }

    // Get current user info for display
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUser = userInfo.name || formData.name || 'N/A';
    const currentDepartment = userInfo.department || formData.department || 'N/A';
    
    // Create table data from leave history
    const historyTableData = leaveHistory.map((request, index) => ({
      department: request.department || currentDepartment,
      name: request.employee_name || currentUser,
      leaveType: request.type,
      payTerms: request.terms || 'With Pay',
      status: request.status === 'approved' ? 'Approved' :
              request.status === 'rejected' ? 'Rejected' :
              request.status === 'completed' ? 'Approved' : 'Completed',
      startDate: request.from ? new Date(request.from).toLocaleDateString() : 'N/A',
      endDate: request.to ? new Date(request.to).toLocaleDateString() : 'N/A', 
      totalDays: request.total_days || 0,
      totalHours: request.total_hours || (request.total_days ? request.total_days * 8 : 0),
      requestId: request.id,
      reason: request.reason,
      approvedDate: request.approved_at ? new Date(request.approved_at).toLocaleDateString() : 'N/A',
      severity: request.status === 'approved' || request.status === 'completed' ? 'success' : 
               request.status === 'rejected' ? 'danger' : 'info'
    }));

    const handleViewRequest = (requestId) => {
      // Find the request in the history
      const request = leaveHistory.find(req => req.id === requestId);
      if (request) {
        setSelectedRequest(request);
        setShowModal(true);
      }
    };

    return (
      <div className="leave-history-container">
        <div className="details-table-container">
          <table className="details-table">
            <thead>
              <tr>
                <th className="col-department">DEPARTMENT</th>
                <th className="col-name">NAME</th>
                <th className="col-leave-type">LEAVE TYPE</th>
                <th className="col-pay-terms">PAY TERMS</th>
                <th className="col-status">STATUS</th>
                <th className="col-start-date">START DATE</th>
                <th className="col-end-date">END DATE</th>
                <th className="col-total-days">TOTAL DAYS</th>
                <th className="col-actions">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {historyTableData.map((row, index) => (
                <tr key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                  <td className="department-cell">
                    <span className="department-text">{row.department}</span>
                  </td>
                  <td className="name-cell">
                    <span className="name-text">{row.name}</span>
                  </td>
                  <td className="leave-type-cell">
                    <span className="leave-type-text">{row.leaveType}</span>
                  </td>
                  <td className="pay-terms-cell">
                    <span className="pay-terms-text">{row.payTerms}</span>
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge-table ${row.severity}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="start-date-cell">
                    <span className="start-date-text">{row.startDate}</span>
                  </td>
                  <td className="end-date-cell">
                    <span className="end-date-text">{row.endDate}</span>
                  </td>
                  <td className="total-days-cell">
                    <div className="total-days-badge">
                      <span className="days-count">{row.totalDays}</span>
                      <span className="days-label">day{row.totalDays > 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-button view"
                      onClick={() => handleViewRequest(row.requestId)}
                      title={`View details for Leave Request #${row.requestId}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="leave-request-container responsive-container">
     
      {/* Navigation Tabs */}
      <div className="leave-tabs responsive-header">
        <div 
          className={`tab responsive-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => handleTabClick('form')}
        >
          <span className="tab-icon hide-on-mobile">📝</span>
          <span className="text-responsive-md">Leave Request Form</span>
        </div>
        <div 
          className={`tab responsive-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => handleTabClick('details')}
        >
          <span className="tab-icon hide-on-mobile">📋</span>
          <span className="text-responsive-md">Leave Details</span>
        </div>
        <div 
          className={`tab responsive-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabClick('history')}
        >
          <span className="tab-icon hide-on-mobile">🕐</span>
          <span className="text-responsive-md">Leave History</span>
        </div>
      </div>

      {/* Alert Section */}
      {alert.show && (
        <Alert
          variant={alert.type}
          dismissible
          onClose={() => setAlert({ show: false, message: '', type: '' })}
          className="custom-alert"
        >
          {alert.message}
        </Alert>
      )}

      {/* Content based on active tab */}
      {activeTab === 'form' && (
        <>
          {/* Info Message */}
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            Complete the form below to submit your leave request. Your request will go through the approval process.
          </div>

          {/* Form Section */}
          <div className="form-container responsive-form-container">
            <Form onSubmit={handleSubmit}>
              {/* Company and Date Filed Row */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Company</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.company}
                      readOnly
                      className="form-input readonly responsive-form-control"
                      title="Company name is pre-filled"
                    />
                  </Form.Group>
                </div>
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Date Filed</Form.Label>
                    <Form.Control
                      type="text"
                      value={new Date(formData.dateFiled).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/')}
                      readOnly
                      className="form-input readonly responsive-form-control"
                    />
                  </Form.Group>
                </div>
              </div>

              {/* Name and Department Row */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Name <span className="required">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      readOnly
                      className="form-input readonly responsive-form-control"
                      title="Auto-filled from your employee profile"
                    />
                  </Form.Group>
                </div>
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Department <span className="required">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.department}
                      readOnly
                      className="form-input readonly responsive-form-control"
                      title="Auto-filled from your employee profile"
                    />
                  </Form.Group>
                </div>
              </div>

              {/* Leave Type Row */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Leave Type <span className="required">*</span></Form.Label>
                    <Form.Select
                      value={formData.leaveType}
                      onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                      className="form-select responsive-form-control"
                      required
                    >
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Vacation Leave">Vacation Leave</option>
                      <option value="Emergency Leave">Emergency Leave</option>
                      <option value="Maternity Leave – 105 days">Maternity Leave</option>
                      <option value="Paternity Leave – 7 days">Paternity Leave</option>
                      <option value="Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days">Leave for Victims of Violence Against Women and Their Children (VAWC)</option>
                      <option value="Parental Leave – 7 days">Parental Leave – 7 days</option>
                      <option value="Women's Special Leave – 60 days">Women's Special Leave</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              </div>

              {/* Note Section */}
              <Row className="form-row">
                <Col md={12}>
                  <div className="note-section">
                    <span className="note-text">
                      <strong>Note:</strong> You have <strong>{remainingLeaves}</strong> more leave{remainingLeaves !== 1 ? 's' : ''} remaining this month. {paidLeaveStatus.hasPaidLeave ? 
                        `You have 1 leave request with pay.` : 
                        `Your next leave request is without pay. You will receive paid leave again next year.`
                      }
                    </span>
                  </div>
                </Col>
              </Row>

              {/* Dates Row */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Start Date <span className="required">*</span></Form.Label>
                    <div className="date-input-wrapper">
                      <Form.Control
                        type="date"
                        value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleStartDateChange(new Date(e.target.value))}
                        min={new Date().toISOString().split('T')[0]}
                        className="form-input date-input responsive-form-control"
                        placeholder="mm/dd/yyyy"
                        required
                      />
                      <CalendarIcon className="calendar-icon hide-on-mobile" size={16} />
                    </div>
                  </Form.Group>
                </div>
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">End Date <span className="required">*</span></Form.Label>
                    <div className="date-input-wrapper">
                      <Form.Control
                        type="date"
                        value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                        min={formData.startDate ? formData.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                        className="form-input date-input responsive-form-control"
                        placeholder="mm/dd/yyyy"
                        required
                      />
                      <CalendarIcon className="calendar-icon hide-on-mobile" size={16} />
                    </div>
                  </Form.Group>
                </div>
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Total Days</Form.Label>
                    <div className="total-days-display">
                      <span className="days-number text-responsive-lg">{formData.totalDays}</span>
                      <span className="total-hours-text text-responsive-sm">{formData.totalDays === 0 ? '0 total hours' : `${formData.totalDays * 8} total hours`}</span>
                    </div>
                  </Form.Group>
                </div>
              </div>

              {/* Reason Section */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Reason</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="form-textarea responsive-form-control"
                      placeholder="Please provide the reason for your leave request..."
                      required
                    />
                  </Form.Group>
                </div>
              </div>

          {/* Submit Button Row */}
          <div className="d-flex justify-content-end">
            <Button 
              type="submit"
              className="submit-button-form responsive-btn"
            >
              Submit Leave Request
            </Button>
          </div>
            </Form>
          </div>
        </>
      )}

      {activeTab === 'details' && (
        <div className="tab-content">
          {renderLeaveDetails()}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="tab-content">
          {renderLeaveHistory()}
        </div>
      )}

      {/* Leave Request Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered className="responsive-modal">
        <Modal.Header closeButton>
          <Modal.Title className="text-responsive-lg">Leave Request Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="responsive-modal">
          {selectedRequest && (
            <div className="leave-request-summary">
              <Row>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Employee Name:</label>
                    <span>{selectedRequest.employee_name || formData.name}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Department:</label>
                    <span>{selectedRequest.department || formData.department}</span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Leave Type:</label>
                    <span>{selectedRequest.type}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Status:</label>
                    <span className={`status-badge ${selectedRequest.status === 'approved' ? 'success' : selectedRequest.status === 'rejected' ? 'danger' : 'info'}`}>
                      {selectedRequest.status === 'approved' ? 'Approved' : 
                       selectedRequest.status === 'rejected' ? 'Rejected' : 
                       selectedRequest.status === 'completed' ? 'Approved' : 'Completed'}
                    </span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Start Date:</label>
                    <span>{selectedRequest.from ? new Date(selectedRequest.from).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="summary-field">
                    <label>End Date:</label>
                    <span>{selectedRequest.to ? new Date(selectedRequest.to).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Total Days:</label>
                    <span>{selectedRequest.total_days || 0} day{(selectedRequest.total_days || 0) > 1 ? 's' : ''}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Total Hours:</label>
                    <span>{selectedRequest.total_hours || ((selectedRequest.total_days || 0) * 8)} hours</span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Pay Terms:</label>
                    <span>{selectedRequest.terms || 'With Pay'}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="summary-field">
                    <label>Date Filed:</label>
                    <span>{selectedRequest.date_filed ? new Date(selectedRequest.date_filed).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <div className="summary-field">
                    <label>Reason:</label>
                    <span>{selectedRequest.reason || 'N/A'}</span>
                  </div>
                </Col>
              </Row>
              {selectedRequest.approved_at && (
                <Row>
                  <Col md={12}>
                    <div className="summary-field">
                      <label>Approved Date:</label>
                      <span>{new Date(selectedRequest.approved_at).toLocaleDateString()}</span>
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="danger" 
            onClick={() => handleDownloadPdf(selectedRequest.id)}
            className="me-2"
          >
            Download PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmbeddedLeaveForm;
