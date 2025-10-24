import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Modal } from 'react-bootstrap';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest, getMyLeaveRequests, downloadLeavePdf, getLeaveSummary } from '../../api/leave';
import axios from '../../axios';
import ValidationModal from '../common/ValidationModal';
import useValidationModal from '../../hooks/useValidationModal';
import './EmbeddedLeaveForm.css';

const EmbeddedLeaveForm = () => {
  const [activeTab, setActiveTab] = useState('form'); // 'form', 'details', 'history'
  const { modalState, showSuccess, showError, showWarning, hideModal } = useValidationModal();
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

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remainingLeaves, setRemainingLeaves] = useState(3);
  const [paidLeaveStatus, setPaidLeaveStatus] = useState({ hasPaidLeave: true, paidLeavesUsed: 0 });
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [loadingLeaveSummary, setLoadingLeaveSummary] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);

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
    fetchLeaveSummary();
  }, []);

  // Fetch leave summary with automatic payment status
  const fetchLeaveSummary = async () => {
    try {
      setLoadingLeaveSummary(true);
      const response = await getLeaveSummary();
      const data = response.data;
      
      setLeaveSummary(data);
      
      // Update remaining leaves based on summary
      if (data.leave_instances) {
        setRemainingLeaves(data.leave_instances.remaining);
      }
      
      console.log('Leave summary loaded:', data);
    } catch (error) {
      console.error('Error fetching leave summary:', error);
      // Set default values if API fails
      setLeaveSummary({
        leave_instances: { total_allowed: 3, used: 0, remaining: 3 },
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
      
      // Get current date for comparison
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      
      // Separate requests based on new logic:
      // My Leave: All requests EXCEPT those that are approved/rejected/completed AND past their end date
      const myLeaveRequests = allRequests.filter(request => {
        // If request is approved, rejected, or completed, check if end date has passed
        if (request.status === 'approved' || request.status === 'rejected' || request.status === 'completed') {
          const endDate = new Date(request.to);
          endDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
          
          // If end date has NOT passed, keep in My Leave
          if (endDate >= currentDate) {
            return true;
          }
          // If end date has passed, move to History
          return false;
        }
        
        // For all other statuses (pending, manager_approved, etc.), keep in My Leave
        return true;
      });
      
      // Leave History: Only approved/rejected/completed requests where end date has passed
      const historyRequests = allRequests.filter(request => {
        if (request.status === 'approved' || request.status === 'rejected' || request.status === 'completed') {
          const endDate = new Date(request.to);
          endDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
          
          // Only include in history if end date has passed
          return endDate < currentDate;
        }
        
        // All other statuses never go to history
        return false;
      });
      
      setLeaveRequests(myLeaveRequests);
      setLeaveHistory(historyRequests);
      
      // Calculate remaining leaves for current month
      calculateRemainingLeaves(allRequests);
      
      // Calculate paid leave status for current year
      calculatePaidLeaveStatus(allRequests);
      
      console.log('Leave requests fetched with new logic:', {
        myLeave: myLeaveRequests.length,
        history: historyRequests.length,
        total: allRequests.length,
        currentDate: currentDate.toISOString().split('T')[0]
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

  // Calculate remaining leaves for current year
  const calculateRemainingLeaves = (allRequests) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Count leaves filed in current year
    const currentYearLeaves = allRequests.filter(request => {
      const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
      return requestDate.getFullYear() === currentYear;
    }).length;
    
    const remaining = Math.max(0, 3 - currentYearLeaves);
    setRemainingLeaves(remaining);
    return remaining;
  };

  // Calculate paid leave status for current year
  const calculatePaidLeaveStatus = (allRequests) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Count all leaves used in current year (assume all are paid unless specified otherwise)
    const currentYearLeaves = allRequests.filter(request => {
      const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
      return requestDate.getFullYear() === currentYear;
    }).length;
    
    // Employee gets 1 paid leave per year
    const hasPaidLeave = currentYearLeaves < 1;
    const paidLeavesUsed = currentYearLeaves;
    
    setPaidLeaveStatus({ hasPaidLeave, paidLeavesUsed });
    return { hasPaidLeave, paidLeavesUsed };
  };

  // Get maximum allowed days for each leave type
  const getMaxDaysForLeaveType = (leaveType) => {
    const leaveLimits = {
      'Sick Leave': 8,
      'Vacation Leave': 5,
      'Emergency Leave': 8,
      'Maternity Leave': 105,
      'Paternity Leave': 7,
      'Leave for Victims of Violence Against Women and Their Children (VAWC)': 10,
      'Parental Leave': 7,
      "Women's Special Leave": 60,
      'Personal Leave': 5,
      'Bereavement Leave': 5
    };
    return leaveLimits[leaveType] || 0;
  };

  // Check if leave type allows extended days with paid/unpaid differentiation
  const checkExtendedLeaveValidation = (leaveType, totalDays) => {
    const maxDays = getMaxDaysForLeaveType(leaveType);
    
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
    
    if (specialLeaveTypes.includes(leaveType) && totalDays > maxDays) {
      const paidDays = maxDays;
      const unpaidDays = totalDays - maxDays;
      return {
        isValid: true,
        warning: true,
        message: `For ${leaveType}: First ${paidDays} days will be paid, remaining ${unpaidDays} days will be unpaid. You can still submit this request.`,
        paidDays: paidDays,
        unpaidDays: unpaidDays,
        totalDays: totalDays
      };
    }
    
    // For other leave types, maintain strict limit
    if (totalDays > maxDays) {
      return {
        isValid: false,
        error: `You can only file up to ${maxDays} days for ${leaveType}.`
      };
    }
    
    return { isValid: true };
  };

  
  const showAlert = (message, type) => {
    if (type === 'success') {
      showSuccess(message);
    } else if (type === 'danger') {
      showError(message);
    } else if (type === 'warning') {
      showWarning(message);
    } else {
      showSuccess(message);
    }
  };

  // Scroll to top of the form container
  const scrollToTop = () => {
    const formContainer = document.querySelector('.leave-request-container');
    if (formContainer) {
      formContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
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
      showAlert('Please select start and end dates for your leave request.', 'danger');
      return;
    }
    
    if (!formData.reason.trim()) {
      showAlert('Please provide a reason for your leave.', 'danger');
      return;
    }
    
    // Check for active leave
    if (leaveSummary && leaveSummary.active_leave?.exists) {
      showAlert(leaveSummary.payment_status?.restriction_message || 'You have an active leave. Please wait until it ends.', 'danger');
      return;
    }
    
    // Calculate payment breakdown for the modal
    await calculateAndShowPaymentBreakdown();
  };


  // Check for overlapping leaves and waiting period violations
  const checkLeaveValidation = (startDate, endDate, existingRequests) => {
    if (!startDate || !endDate || !existingRequests || existingRequests.length === 0) {
      return null; // No validation needed if no dates or no existing requests
    }

    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);
    
    // Check for overlapping leaves
    for (const request of existingRequests) {
      // Only check approved or pending requests (not rejected ones)
      if (request.status === 'approved' || request.status === 'pending' || request.status === 'manager_approved') {
        const existingStartDate = new Date(request.from);
        const existingEndDate = new Date(request.to);
        
        // Check if dates overlap
        if ((newStartDate <= existingEndDate) && (newEndDate >= existingStartDate)) {
          return `You have an overlapping leave request. Please choose different dates.`;
        }
      }
    }

    // Check waiting period (7 days after last leave ends)
    const approvedRequests = existingRequests.filter(req => 
      req.status === 'approved' || req.status === 'completed'
    );
    
    if (approvedRequests.length > 0) {
      // Find the most recent approved leave
      const mostRecentLeave = approvedRequests.reduce((latest, current) => {
        const latestEndDate = new Date(latest.to);
        const currentEndDate = new Date(current.to);
        return currentEndDate > latestEndDate ? current : latest;
      });

      const lastLeaveEndDate = new Date(mostRecentLeave.to);
      const waitUntilDate = new Date(lastLeaveEndDate);
      waitUntilDate.setDate(waitUntilDate.getDate() + 7); // Add 7 days

      if (newStartDate < waitUntilDate) {
        return `You need to wait until ${waitUntilDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} before submitting a new leave.`;
      }
    }

    return null; // No validation errors
  };

  const handleFormSubmit = async () => {
    
    // Validate required fields
    if (!formData.startDate || !formData.endDate) {
      showAlert('Please select start and end dates for your leave request.', 'danger');
      return;
    }
    
    // Check if start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      showAlert('Leave start date cannot be in the past. Please select a future date.', 'danger');
      return;
    }
    
    if (!formData.name.trim()) {
      showAlert('Please enter your name.', 'danger');
      return;
    }
    
    if (!formData.reason.trim()) {
      showAlert('Please provide a reason for your leave.', 'danger');
      return;
    }
    
    // Check for overlapping leaves and waiting period violations
    const validationError = checkLeaveValidation(formData.startDate, formData.endDate, leaveRequests);
    if (validationError) {
      showAlert(validationError, 'danger');
      return;
    }
    
    if (formData.totalHours > 8) {
      showAlert('Total hours cannot be more than 8 hours per day.', 'danger');
      return;
    }
    
    // Check if total days exceed the limit for the selected leave type
    const validationResult = checkExtendedLeaveValidation(formData.leaveType, formData.totalDays);
    if (!validationResult.isValid) {
      showAlert(validationResult.error, 'danger');
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
    console.log('Calculating payment breakdown...');
    
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
        startDate: formData.startDate,
        endDate: formData.endDate,
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
      
      // Simple success message (payment info already shown in modal)
      showSuccess('Leave application submitted successfully! Your request has been sent to your manager for approval.');
      
      // Decrease remaining leaves counter
      setRemainingLeaves(prev => Math.max(0, prev - 1));
      
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
      
      // Refresh leave summary to get updated payment status
      await fetchLeaveSummary();
      
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
      
      showAlert(errorMessage, 'danger');
    }
  };

  // Render My Leave component with organized table design
  const renderLeaveDetails = () => {
    if (leaveRequests.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Leave Requests Found</h3>
          <p>You don't have any leave requests at the moment. Go to the "Leave Request Form" tab to submit a new leave request, and it will appear here. Approved requests will remain here until their end date passes.</p>
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
          <span className="text-responsive-md">My Leave</span>
        </div>
        <div 
          className={`tab responsive-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabClick('history')}
        >
          <span className="tab-icon hide-on-mobile">🕐</span>
          <span className="text-responsive-md">Leave History</span>
        </div>
      </div>

      {/* Validation Modal */}
      <ValidationModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
      />


      {/* Content based on active tab */}
      {activeTab === 'form' && (
        <>
          {/* Leave Usage Indicator */}
          <div className={`leave-usage-indicator ${
            leaveSummary?.leave_instances?.used === 0 || leaveSummary?.leave_instances?.used === 1 
              ? 'status-green' 
              : leaveSummary?.leave_instances?.used === 2 
              ? 'status-yellow' 
              : 'status-red'
          }`}>
            <div className="usage-icon-minimal">
              {leaveSummary?.leave_instances?.used === 0 || leaveSummary?.leave_instances?.used === 1 ? '✓' : 
               leaveSummary?.leave_instances?.used === 2 ? '⚠' : '✕'}
            </div>
            <div className="usage-info-minimal">
              <span className="usage-count-minimal">
                <strong>{leaveSummary?.leave_instances?.used || 0}/{leaveSummary?.leave_instances?.total_allowed || 3}</strong> Leave Requests Used
              </span>
              {leaveSummary?.leave_instances?.remaining > 1 && (
                <>
                  <span className="usage-divider">•</span>
                  <span className="status-text-minimal">{leaveSummary.leave_instances.remaining} remaining</span>
                </>
              )}
              {leaveSummary?.leave_instances?.remaining === 1 && (
                <>
                  <span className="usage-divider">•</span>
                  <span className="status-text-minimal">1 remaining</span>
                </>
              )}
              {leaveSummary?.leave_instances?.remaining === 0 && leaveSummary?.leave_instances?.next_available_date && (
                <>
                  <span className="usage-divider">•</span>
                  <span className="status-text-minimal">Try again on <strong>{leaveSummary.leave_instances.next_available_date}</strong></span>
                </>
              )}
              {leaveSummary?.leave_instances?.remaining === 0 && !leaveSummary?.leave_instances?.next_available_date && (
                <>
                  <span className="usage-divider">•</span>
                  <span className="status-text-minimal">All used</span>
                </>
              )}
            </div>
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
                      onChange={(e) => {
                        setFormData({ ...formData, leaveType: e.target.value });
                        // No need to refresh summary - it shows all types
                      }}
                      className="form-select responsive-form-control"
                      required
                    >
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Vacation Leave">Vacation Leave</option>
                      <option value="Emergency Leave">Emergency Leave</option>
                      <option value="Maternity Leave">Maternity Leave</option>
                      <option value="Paternity Leave">Paternity Leave</option>
                      <option value="Leave for Victims of Violence Against Women and Their Children (VAWC)">Leave for Victims of Violence Against Women and Their Children (VAWC)</option>
                      <option value="Parental Leave">Parental Leave</option>
                      <option value="Women's Special Leave">Women's Special Leave</option>
                      <option value="Personal Leave">Personal Leave</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              </div>

              {/* Active Leave Warning (if exists) */}
              {leaveSummary && leaveSummary.active_leave?.exists && (
                <Row className="form-row">
                  <Col md={12}>
                    <div style={{
                      background: '#fff3cd',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #ffc107',
                      marginBottom: '16px'
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#856404', lineHeight: '1.6' }}>
                        ⚠️ <strong>Active Leave:</strong> You have an active {leaveSummary.active_leave.type} until {new Date(leaveSummary.active_leave.to).toLocaleDateString()}. 
                        You can file your next leave on {new Date(leaveSummary.active_leave.can_file_from).toLocaleDateString()}.
                      </p>
                    </div>
                  </Col>
                </Row>
              )}

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
              disabled={leaveSummary && !leaveSummary.payment_status?.can_file_leave}
              title={leaveSummary && !leaveSummary.payment_status?.can_file_leave ? 
                leaveSummary.payment_status?.restriction_message : 
                'Submit your leave request'}
            >
              {leaveSummary && !leaveSummary.payment_status?.can_file_leave ? 
                'Cannot Submit - Active Leave' : 
                'Submit Leave Request'}
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
                <p style={{ margin: '5px 0' }}><strong>Start Date:</strong> {formData.startDate ? formData.startDate.toLocaleDateString() : 'Not selected'}</p>
                <p style={{ margin: '5px 0' }}><strong>End Date:</strong> {formData.endDate ? formData.endDate.toLocaleDateString() : 'Not selected'}</p>
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

    </div>
  );
};

export default EmbeddedLeaveForm;