import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Form, Button, Modal } from 'react-bootstrap';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createLeaveRequest, getEmployeeProfile, getEmployeeProfileTest, getMyLeaveRequests, downloadLeavePdf, getLeaveSummary, getLeaveRequest } from '../../api/leave';
import axios from '../../axios';
import ValidationModal from '../common/ValidationModal';
import useValidationModal from '../../hooks/useValidationModal';
import './EmbeddedLeaveForm.css';

const EmbeddedLeaveForm = () => {
  const SIL_LEAVE_TYPES = ['Sick Leave', 'Emergency Leave'];
  const pluralizeDays = (value) => `${value} day${value === 1 ? '' : 's'}`;

  const [activeTab, setActiveTab] = useState('form'); // 'form', 'details', 'history'
  const { modalState, showSuccess, showError, showWarning, hideModal } = useValidationModal();
  const [formData, setFormData] = useState({
    company: 'Cabuyao Concrete Development Corporation',
    name: '',
    dateFiled: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: '', // Will be set after gender is loaded and filtered
    startDate: null,
    endDate: null,
    leaveDuration: 'whole_day', // 'whole_day' or 'half_day'
    halfDayPeriod: null, // 'am' or 'pm' - only when leaveDuration is 'half_day'
    totalDays: 0,
    totalHours: 0,
    reason: '',
    applicantName: '',
    attachment: null,
    attachmentPreview: null
  });

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [attachmentImageUrl, setAttachmentImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [paidLeaveStatus, setPaidLeaveStatus] = useState({ hasPaidLeave: true, paidLeavesUsed: 0 });
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [loadingLeaveSummary, setLoadingLeaveSummary] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);
  const [employeeGender, setEmployeeGender] = useState(null);

  const storedRole = useMemo(() => {
    const roleFromStorage = localStorage.getItem('role');
    if (roleFromStorage) {
      return roleFromStorage;
    }
    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const userData = JSON.parse(userRaw);
        if (typeof userData.role === 'string') {
          return userData.role;
        }
        if (userData.role && typeof userData.role.name === 'string') {
          return userData.role.name;
        }
      }
    } catch (error) {
      console.error('Failed to read stored user role:', error);
    }
    return '';
  }, []);

  const isManagerUser = (storedRole || '').toLowerCase() === 'manager';

  const paidLeaveIndicator = useMemo(() => {
    const leaveType = formData.leaveType;

    if (!leaveSummary || !leaveType) {
      return {
        statusClass: 'status-yellow',
        icon: '⏳',
        headline: 'Loading paid leave info',
        segments: ['Please wait while we calculate your remaining paid days.']
      };
    }

    const tenureMonthsRaw = leaveSummary.tenure?.months;
    const tenureMonths = typeof tenureMonthsRaw === 'number' ? tenureMonthsRaw : null;
    const withPaySummary = leaveSummary.with_pay_summary;
    const tenureDisplay = leaveSummary?.tenure ? formatTenureDisplay(leaveSummary.tenure) : null;

    if (tenureMonths === null || !withPaySummary) {
      return {
        statusClass: 'status-yellow',
        icon: 'ℹ',
        headline: 'Paid leave unavailable',
        segments: ['We could not determine your paid leave balance. Please contact HR for assistance.']
      };
    }

    if (tenureMonths < 12 || !withPaySummary.is_eligible) {
      const monthsRemaining = Math.max(0, Math.ceil(12 - tenureMonths));
      const segments = ['Your leave request is without pay until you complete 12 months of service.'];

      if (monthsRemaining > 0) {
        segments.push(`Complete ${monthsRemaining} more month${monthsRemaining === 1 ? '' : 's'} to unlock paid leave days.`);
      }

      if (tenureDisplay) {
        segments.push(`Current tenure: ${tenureDisplay}.`);
      }

      return {
        statusClass: 'status-yellow',
        icon: 'ℹ',
        headline: 'Without Pay',
        segments
      };
    }

    const typeSummary = SIL_LEAVE_TYPES.includes(leaveType)
      ? (withPaySummary.sil ?? withPaySummary.by_type?.[leaveType])
      : withPaySummary.by_type?.[leaveType];

    if (!typeSummary) {
      return {
        statusClass: 'status-yellow',
        icon: 'ℹ',
        headline: 'Paid days not configured',
        segments: [`No paid allowance configured for ${leaveType}. This request will be without pay.`]
      };
    }

    const entitled = Number(typeSummary.entitled ?? 0);
    const used = Number(typeSummary.used ?? 0);
    const remaining = Number(
      typeSummary.remaining ?? Math.max(0, entitled - used)
    );

    if (entitled <= 0) {
      return {
        statusClass: 'status-red',
        icon: '✕',
        headline: 'Without Pay',
        segments: [`Paid days are not available for ${leaveType}.`]
      };
    }

    const lowThreshold = Math.max(1, Math.ceil(entitled * 0.25));
    let statusClass = 'status-green';
    let icon = '✓';

    if (remaining === 0) {
      statusClass = 'status-red';
      icon = '✕';
    } else if (remaining <= lowThreshold) {
      statusClass = 'status-yellow';
      icon = '⚠';
    }

    const segments = [];
    const isSilType = SIL_LEAVE_TYPES.includes(leaveType);

    if (remaining > 0) {
      if (!isSilType) {
        segments.push(`for ${leaveType}.`);
      }
    } else {
      segments.push('Your next leave request will be without pay.');
    }

    if (!isSilType) {
      segments.push(`Used ${pluralizeDays(used)} of ${pluralizeDays(entitled)}.`);

      if (remaining === 0 && withPaySummary.next_reset_date) {
        segments.push(`Paid leave resets on ${withPaySummary.next_reset_date}.`);
      }
    } else if (remaining === 0 && withPaySummary.next_reset_date) {
      segments.push(`Paid leave resets on ${withPaySummary.next_reset_date}.`);
    }

    return {
      statusClass,
      icon,
      headline: remaining > 0 ? `${pluralizeDays(remaining)} with pay remaining` : 'No paid days remaining',
      segments
    };
  }, [leaveSummary, formData.leaveType]);

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
        
        // Store employee gender from cache for filtering leave types
        if (profile.gender) {
          setEmployeeGender(profile.gender);
        }
        
        setFormData(prev => ({
          ...prev,
          name: fullName,
          department: profile.department || 'Not Set',
          applicantName: fullName,
          company: 'Cabuyao Concrete Development Corporation'
        }));
        
        console.log('Form data loaded from cache:', { name: fullName, department: profile.department, gender: profile.gender });
        
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
        
        // Store employee gender for filtering leave types
        if (profileData.gender) {
          setEmployeeGender(profileData.gender);
        }
        
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

  // Get filtered leave type options based on gender
  const getFilteredLeaveTypeOptions = useMemo(() => {
    const allLeaveTypes = [
      { value: 'Sick Leave', label: 'Sick Leave' },
      { value: 'Vacation Leave', label: 'Vacation Leave' },
      { value: 'Emergency Leave', label: 'Emergency Leave' },
      { value: 'Maternity Leave', label: 'Maternity Leave' },
      { value: 'Paternity Leave', label: 'Paternity Leave' },
      { value: 'Leave for Victims of Violence Against Women and Their Children (VAWC)', label: 'Leave for Victims of Violence Against Women and Their Children (VAWC)' },
      { value: 'Parental Leave', label: 'Parental Leave' },
      { value: "Women's Special Leave", label: "Women's Special Leave" },
      { value: 'Personal Leave', label: 'Personal Leave' },
      { value: 'Bereavement Leave', label: 'Bereavement Leave' }
    ];

    if (employeeGender === 'Female') {
      // Hide paternity leave for females
      return allLeaveTypes.filter(lt => lt.value !== 'Paternity Leave');
    } else if (employeeGender === 'Male') {
      // Hide maternity, VAWC, and women's special leave for males
      return allLeaveTypes.filter(lt => 
        lt.value !== 'Maternity Leave' && 
        lt.value !== 'Leave for Victims of Violence Against Women and Their Children (VAWC)' &&
        lt.value !== "Women's Special Leave"
      );
    }
    
    // If gender is not set, return all types (will be filtered by backend API)
    return allLeaveTypes;
  }, [employeeGender]);

  // Load data on component initialization
  useEffect(() => {
    loadEmployeeData();
    loadLeaveData();
    fetchLeaveSummary();
  }, []);

  // Set default leave type when gender is loaded and options are filtered
  useEffect(() => {
    if (getFilteredLeaveTypeOptions.length > 0 && !formData.leaveType) {
      // Set to first available leave type after filtering
      setFormData(prev => ({
        ...prev,
        leaveType: getFilteredLeaveTypeOptions[0].value
      }));
    } else if (getFilteredLeaveTypeOptions.length > 0 && formData.leaveType) {
      // If current leave type is not in filtered options, reset to first available
      const isCurrentTypeAvailable = getFilteredLeaveTypeOptions.some(opt => opt.value === formData.leaveType);
      if (!isCurrentTypeAvailable) {
        setFormData(prev => ({
          ...prev,
          leaveType: getFilteredLeaveTypeOptions[0].value
        }));
      }
    }
  }, [getFilteredLeaveTypeOptions, formData.leaveType]);

  // Fetch leave summary with automatic payment status
  const fetchLeaveSummary = async () => {
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
        with_pay_summary: {
          is_eligible: false,
          sil: {
            entitled: 0,
            used: 0,
            remaining: 0,
            shared_types: SIL_LEAVE_TYPES
          },
          by_type: {},
          next_reset_date: null
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
      // Cleanup attachment preview URL if exists
      if (formData.attachmentPreview) {
        URL.revokeObjectURL(formData.attachmentPreview);
      }
      // Cleanup blob URL for attachment image if exists
      if (attachmentImageUrl && attachmentImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(attachmentImageUrl);
      }
    };
  }, [formData.attachmentPreview, attachmentImageUrl]);

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


  const calculateDaysAndHours = (startDate, endDate, leaveDuration, halfDayPeriod) => {
    if (!startDate || !endDate) return { days: 0, hours: 0 };

    // Calculate the difference in milliseconds
    const timeDiff = endDate.getTime() - startDate.getTime();
    
    // Calculate total days (inclusive of both start and end dates)
    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Ensure minimum 1 day if same date is selected
    if (days < 1) days = 1;
    
    // Handle half-day leave
    if (leaveDuration === 'half_day') {
      // If it's a single day (startDate === endDate), it's 0.5 days
      if (days === 1) {
        days = 0.5;
      } else {
        // For multi-day leave with half-day:
        // Full days = (total days - 1) + 0.5 (for the half-day)
        // Example: Jan 1-3 with half-day = 2 full days + 0.5 = 2.5 days
        days = (days - 1) + 0.5;
      }
    }
    
    // Calculate total working hours (8 hours per full day, 4 hours per half day)
    const totalWorkingHours = days * 8;

    return { 
      days: days, 
      hours: totalWorkingHours
    };
  };

  const handleStartDateChange = (date) => {
    const { days, hours } = calculateDaysAndHours(date, formData.endDate, formData.leaveDuration, formData.halfDayPeriod);
    setFormData(prev => ({
      ...prev,
      startDate: date,
      totalDays: days,
      totalHours: hours
    }));
  };

  const handleEndDateChange = (date) => {
    const { days, hours } = calculateDaysAndHours(formData.startDate, date, formData.leaveDuration, formData.halfDayPeriod);
    setFormData(prev => ({
      ...prev,
      endDate: date,
      totalDays: days,
      totalHours: hours
    }));
  };

  const handleLeaveDurationChange = (duration) => {
    const { days, hours } = calculateDaysAndHours(formData.startDate, formData.endDate, duration, formData.halfDayPeriod);
    setFormData(prev => ({
      ...prev,
      leaveDuration: duration,
      halfDayPeriod: duration === 'half_day' ? (prev.halfDayPeriod || 'am') : null,
      totalDays: days,
      totalHours: hours
    }));
  };

  const handleHalfDayPeriodChange = (period) => {
    setFormData(prev => ({
      ...prev,
      halfDayPeriod: period
    }));
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showAlert('Please upload an image file (JPEG, PNG) or PDF as proof.', 'danger');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        showAlert('File size must be less than 2MB. Please choose a smaller file.', 'danger');
        e.target.value = '';
        return;
      }
      
      // Create preview for images
      let preview = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      setFormData(prev => ({
        ...prev,
        attachment: file,
        attachmentPreview: preview
      }));
    }
  };

  const handleRemoveAttachment = () => {
    if (formData.attachmentPreview) {
      URL.revokeObjectURL(formData.attachmentPreview);
    }
    setFormData(prev => ({
      ...prev,
      attachment: null,
      attachmentPreview: null
    }));
    // Reset file input
    const fileInput = document.getElementById('attachment-input');
    if (fileInput) {
      fileInput.value = '';
    }
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

  function formatTenureDisplay(tenure) {
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
  }

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
          // Calculate used days for this specific leave type - use with_pay_days from summary
          if (leaveSummary.with_pay_summary?.by_type?.[formData.leaveType]) {
            const typeSummary = leaveSummary.with_pay_summary.by_type[formData.leaveType];
            usedWithPayDays = typeSummary.used || 0;
            remainingWithPayDays = typeSummary.remaining || 0;
          } else {
            // Fallback: calculate from leaves_this_year using with_pay_days (not total_days)
            const thisYearLeaves = leaveSummary.leaves_this_year || [];
            usedWithPayDays = thisYearLeaves
              .filter(leave => leave.type === formData.leaveType && leave.terms === 'with PAY' && leave.status === 'approved')
              .reduce((sum, leave) => sum + (leave.with_pay_days || 0), 0);
            remainingWithPayDays = Math.max(0, maxWithPayDays - usedWithPayDays);
          }
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
      submitData.append('leave_duration', formData.leaveDuration || 'whole_day');
      if (formData.leaveDuration === 'half_day' && formData.halfDayPeriod) {
        submitData.append('half_day_period', formData.halfDayPeriod);
      }
      submitData.append('total_days', formData.totalDays || 1);
      // Calculate total hours based on actual days (including fractional)
      const calculatedHours = formData.totalDays * 8;
      submitData.append('total_hours', calculatedHours);
      submitData.append('reason', formData.reason || 'Leave request');
      
      // Add attachment file if provided
      if (formData.attachment) {
        submitData.append('attachment', formData.attachment);
      }
      
      // Debug the form data being sent
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Form data object:', formData);
      console.log('Formatted start date:', formatDateForAPI(formData.startDate));
      console.log('Formatted end date:', formatDateForAPI(formData.endDate));
      console.log('Total days:', formData.totalDays);
      console.log('Total hours:', formData.totalHours);
      console.log('Reason length:', formData.reason.length);
      console.log('Has attachment file:', !!formData.attachment);
      if (formData.attachment) {
        console.log('Attachment file name:', formData.attachment.name);
        console.log('Attachment file size:', formData.attachment.size);
        console.log('Attachment file type:', formData.attachment.type);
      }
      
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
      
      // Reset form after successful submission
      // Clean up attachment preview URL if exists
      if (formData.attachmentPreview) {
        URL.revokeObjectURL(formData.attachmentPreview);
      }
      setFormData(prev => ({
        ...prev,
        leaveType: 'Sick Leave',
        startDate: null,
        endDate: null,
        leaveDuration: 'whole_day',
        halfDayPeriod: null,
        totalDays: 0,
        totalHours: 0,
        reason: '',
        attachment: null,
        attachmentPreview: null
      }));
      
      // Reset file input
      const fileInput = document.getElementById('attachment-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
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
        if (isManagerUser) {
          displayStatus = 'For Approval (HR Assistant)';
          severity = 'info';
        } else {
          displayStatus = 'For Approval (Manager)';
          severity = 'warning';
        }
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
        totalDays: parseFloat(request.total_days) || 0,
        leaveDuration: request.leave_duration || 'whole_day',
        halfDayPeriod: request.half_day_period || null,
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
                      <span className="days-count text-responsive-sm">
                        {(() => {
                          const days = parseFloat(row.totalDays) || 0;
                          return days % 1 === 0 ? days : days.toFixed(1);
                        })()}
                      </span>
                      <span className="days-label text-responsive-sm">
                        {(() => {
                          const days = parseFloat(row.totalDays) || 0;
                          return `day${days % 1 === 0 ? (days > 1 ? 's' : '') : 's'}`;
                        })()}
                      </span>
                      {row.leaveDuration === 'half_day' && (
                        <span className="half-day-indicator text-responsive-xs" style={{ 
                          display: 'block', 
                          fontSize: '0.75em', 
                          color: '#6c757d',
                          marginTop: '2px'
                        }}>
                          (Half-day: {row.halfDayPeriod?.toUpperCase() || 'AM/PM'})
                        </span>
                      )}
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
    const historyTableData = leaveHistory.map((request, index) => {
      const totalDays = parseFloat(request.total_days) || 0;
      return {
      department: request.department || currentDepartment,
      name: request.employee_name || currentUser,
      leaveType: request.type,
      payTerms: request.terms || 'With Pay',
      status: request.status === 'approved' ? 'Approved' :
              request.status === 'rejected' ? 'Rejected' :
              request.status === 'completed' ? 'Approved' : 'Completed',
      startDate: request.from ? new Date(request.from).toLocaleDateString() : 'N/A',
      endDate: request.to ? new Date(request.to).toLocaleDateString() : 'N/A', 
        totalDays: totalDays,
        totalHours: parseFloat(request.total_hours) || (totalDays * 8),
        leaveDuration: request.leave_duration || 'whole_day',
        halfDayPeriod: request.half_day_period || null,
      requestId: request.id,
      reason: request.reason,
      approvedDate: request.approved_at ? new Date(request.approved_at).toLocaleDateString() : 'N/A',
      severity: request.status === 'approved' || request.status === 'completed' ? 'success' : 
               request.status === 'rejected' ? 'danger' : 'info'
      };
    });

    const handleViewRequest = async (requestId) => {
      // Find the request in the history
      const request = leaveHistory.find(req => req.id === requestId);
      if (request) {
        // Reset image states
        setAttachmentImageUrl(null);
        setImageLoading(false);
        setImageError(false);
        
        // Fetch full request details to ensure attachment is loaded
        try {
          const response = await getLeaveRequest(requestId);
          const fullRequest = response.data;
          setSelectedRequest(fullRequest);
          
          // Fetch attachment image if it exists and is an image
          if (fullRequest.attachment) {
            const attachmentPath = fullRequest.attachment;
            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(attachmentPath);
            
            if (isImage) {
              setImageLoading(true);
              setImageError(false);
              
              try {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                const apiUrl = `http://localhost:8000/api/leave-requests/${requestId}/attachment`;
                
                const imageResponse = await fetch(apiUrl, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'image/*'
                  }
                });
                
                if (imageResponse.ok) {
                  const blob = await imageResponse.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  setAttachmentImageUrl(blobUrl);
                  setImageError(false);
                  setImageLoading(false);
                } else {
                  console.error('Failed to fetch image via API:', imageResponse.status);
                  // Generate fallback URL
                  const cleanPath = attachmentPath.replace(/^\/+|\/+$/g, '');
                  const filename = cleanPath.split('/').pop();
                  const fallbackUrl = `http://localhost:8000/storage/leave_attachments/${encodeURIComponent(filename)}`;
                  setAttachmentImageUrl(fallbackUrl);
                  setImageLoading(false);
                }
              } catch (error) {
                console.error('Error fetching attachment image:', error);
                // Try fallback URL
                const cleanPath = attachmentPath.replace(/^\/+|\/+$/g, '');
                const filename = cleanPath.split('/').pop();
                const fallbackUrl = `http://localhost:8000/storage/leave_attachments/${encodeURIComponent(filename)}`;
                setAttachmentImageUrl(fallbackUrl);
                setImageLoading(false);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching full leave request details:', error);
          // Fallback to using request from history if fetch fails
          setSelectedRequest(request);
        }
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
                      <span className="days-count">
                        {(() => {
                          const days = parseFloat(row.totalDays) || 0;
                          return days % 1 === 0 ? days : days.toFixed(1);
                        })()}
                      </span>
                      <span className="days-label">
                        {(() => {
                          const days = parseFloat(row.totalDays) || 0;
                          return `day${days % 1 === 0 ? (days > 1 ? 's' : '') : 's'}`;
                        })()}
                      </span>
                      {row.leaveDuration === 'half_day' && (
                        <span className="half-day-indicator" style={{ 
                          display: 'block', 
                          fontSize: '0.75em', 
                          color: '#6c757d',
                          marginTop: '2px'
                        }}>
                          (Half-day: {row.halfDayPeriod?.toUpperCase() || 'AM/PM'})
                        </span>
                      )}
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
          {/* Paid Leave Indicator */}
          <div className={`leave-usage-indicator ${paidLeaveIndicator.statusClass}`}>
            <div className="usage-icon-minimal">
              {paidLeaveIndicator.icon}
            </div>
            <div className="usage-info-minimal">
              <span className="usage-count-minimal">
                <strong>{paidLeaveIndicator.headline}</strong>
              </span>
              {paidLeaveIndicator.segments && paidLeaveIndicator.segments.length > 0 && paidLeaveIndicator.segments.map((text, index) => (
                <React.Fragment key={index}>
                  <span className="usage-divider">•</span>
                  <span className="status-text-minimal">{text}</span>
                </React.Fragment>
              ))}
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
                      value={formData.leaveType || (getFilteredLeaveTypeOptions.length > 0 ? getFilteredLeaveTypeOptions[0].value : '')}
                      onChange={(e) => {
                        setFormData({ ...formData, leaveType: e.target.value });
                        // No need to refresh summary - it shows all types
                      }}
                      className="form-select responsive-form-control"
                      required
                      disabled={getFilteredLeaveTypeOptions.length === 0}
                    >
                      {getFilteredLeaveTypeOptions.length === 0 ? (
                        <option value="">Loading leave types...</option>
                      ) : (
                        getFilteredLeaveTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </Form.Select>
                  </Form.Group>
                </div>
              </div>

              {/* Active Leave Note (if exists) */}
              {leaveSummary && leaveSummary.active_leave?.exists && (
                <Row className="form-row">
                  <Col md={12}>
                    <div style={{
                      background: '#fff3cd',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #ffc107',
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
              </div>

              {/* Leave Duration Row */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">
                      Leave Duration <span className="required">*</span>
                    </Form.Label>
                    <Form.Select
                      value={formData.leaveDuration}
                      onChange={(e) => handleLeaveDurationChange(e.target.value)}
                      className="form-select responsive-form-control"
                      required
                    >
                      <option value="whole_day">Whole Day</option>
                      <option value="half_day">Half Day (0.5 day deduction)</option>
                    </Form.Select>
                    <Form.Text className="text-muted" style={{ fontSize: '0.85em', display: 'block', marginTop: '6px' }}>
                      <strong>ℹ️ What is Leave Duration?</strong><br/>
                      • <strong>Whole Day:</strong> Full day leave (1.0 day deduction). You'll be absent for the entire working day.<br/>
                      • <strong>Half Day:</strong> Partial day leave (0.5 day deduction). You'll be absent for either the morning (AM) or afternoon (PM) only. 
                      {formData.leaveDuration === 'half_day' && formData.startDate && formData.endDate && 
                        formData.startDate.getTime() === formData.endDate.getTime() && 
                        ' For single-day half-day leave, you can choose AM or PM below.'}
                      {formData.leaveDuration === 'half_day' && formData.startDate && formData.endDate && 
                        formData.startDate.getTime() !== formData.endDate.getTime() && 
                        ' For multi-day leave with half-day, the half-day will be applied to your start or end date based on your selection below.'}
                    </Form.Text>
                  </Form.Group>
                </div>
                {formData.leaveDuration === 'half_day' && (
                  <div className="responsive-form-col">
                    <Form.Group className="form-group">
                      <Form.Label className="form-label text-responsive-md">
                        Half-Day Period <span className="required">*</span>
                      </Form.Label>
                      <Form.Select
                        value={formData.halfDayPeriod || 'am'}
                        onChange={(e) => handleHalfDayPeriodChange(e.target.value)}
                        className="form-select responsive-form-control"
                        required
                      >
                        <option value="am">AM (Morning - 8:00 AM to 12:00 PM)</option>
                        <option value="pm">PM (Afternoon - 1:00 PM to 5:00 PM)</option>
                      </Form.Select>
                      <Form.Text className="text-muted" style={{ fontSize: '0.85em', display: 'block', marginTop: '6px' }}>
                        <strong>ℹ️ Half-Day Period Selection:</strong><br/>
                        • <strong>AM (Morning):</strong> You'll be absent from 8:00 AM to 12:00 PM. You're expected to report in the afternoon (1:00 PM onwards).<br/>
                        • <strong>PM (Afternoon):</strong> You'll be absent from 1:00 PM to 5:00 PM. You're expected to report in the morning (8:00 AM to 12:00 PM).
                        {formData.startDate && formData.endDate && formData.startDate.getTime() !== formData.endDate.getTime() && 
                          ' For multi-day leave, this half-day period applies to the start date of your leave.'}
                      </Form.Text>
                    </Form.Group>
                  </div>
                )}
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">Total Days Deduction</Form.Label>
                    <div className="total-days-display">
                      <span className="days-number text-responsive-lg">
                        {(() => {
                          const days = parseFloat(formData.totalDays) || 0;
                          return days % 1 === 0 ? days : days.toFixed(1);
                        })()}
                      </span>
                      <span className="total-hours-text text-responsive-sm">
                        {(() => {
                          const days = parseFloat(formData.totalDays) || 0;
                          if (days === 0) return '0 total hours';
                          const hours = days * 8;
                          return days % 1 === 0 ? `${hours} total hours` : `${hours.toFixed(1)} total hours`;
                        })()}
                      </span>
                      {formData.leaveDuration === 'half_day' && (
                        <div style={{ fontSize: '0.75em', color: '#6c757d', marginTop: '4px' }}>
                          (Half-day: {parseFloat(formData.totalDays) || 0} day deduction)
                        </div>
                      )}
                    </div>
                  </Form.Group>
                </div>
              </div>

              {/* Attachment Section */}
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <Form.Group className="form-group">
                    <Form.Label className="form-label text-responsive-md">
                      Attachment (Proof)
                      <span className="text-muted" style={{ fontSize: '0.85em', fontWeight: 'normal', marginLeft: '8px' }}>
                        (Optional)
                      </span>
                    </Form.Label>
                    {!formData.attachment && (
                      <Form.Control
                        id="attachment-input"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleAttachmentChange}
                        className="form-input responsive-form-control"
                      />
                    )}
                    {formData.attachment && (
                      <div style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '12px',
                        background: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          {formData.attachmentPreview && (
                            <img
                              src={formData.attachmentPreview}
                              alt="Preview"
                              style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                              }}
                            />
                          )}
                          {formData.attachment.type === 'application/pdf' && (
                            <div style={{
                              width: '60px',
                              height: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#dc3545',
                              color: 'white',
                              borderRadius: '6px',
                              fontSize: '24px',
                              fontWeight: 'bold'
                            }}>
                              PDF
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                              {formData.attachment.name}
                            </div>
                            <div style={{ fontSize: '0.85em', color: '#6c757d' }}>
                              {(formData.attachment.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={handleRemoveAttachment}
                          style={{ flexShrink: 0 }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <Form.Text className="text-muted" style={{ fontSize: '0.85em', display: 'block', marginTop: '6px' }}>
                      Upload an image (JPEG, PNG) or PDF as proof. Maximum file size: 2MB.
                    </Form.Text>
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
      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        // Cleanup blob URL when modal closes
        if (attachmentImageUrl && attachmentImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(attachmentImageUrl);
        }
        setAttachmentImageUrl(null);
        setImageLoading(false);
        setImageError(false);
      }} size="lg" centered className="responsive-modal">
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
              {selectedRequest.attachment && (
                <Row>
                  <Col md={12}>
                    <div className="summary-field">
                      <label>PROOF PICTURE:</label>
                      <div style={{ marginTop: '10px' }}>
                        {(() => {
                          const attachmentPath = selectedRequest.attachment;
                          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(attachmentPath);
                          const isPdf = /\.pdf$/i.test(attachmentPath);
                          const leaveRequestId = selectedRequest.id;
                          const apiAttachmentUrl = `http://localhost:8000/api/leave-requests/${leaveRequestId}/attachment`;
                          
                          // Clean the path
                          const cleanPath = attachmentPath.replace(/^\/+|\/+$/g, '');
                          const filename = cleanPath.split('/').pop();
                          const encodedFilename = encodeURIComponent(filename);
                          
                          // Generate possible URLs
                          const possibleUrls = [
                            apiAttachmentUrl,
                            `http://localhost:8000/storage/leave_attachments/${encodedFilename}`,
                            `http://localhost:8000/storage/leave_attachments/${filename}`,
                            cleanPath.startsWith('leave_attachments/') 
                              ? `http://localhost:8000/storage/${encodeURIComponent(cleanPath)}` 
                              : null,
                            `http://localhost:8000/storage/${encodeURIComponent(cleanPath)}`,
                            cleanPath.startsWith('storage/') 
                              ? `http://localhost:8000/${encodeURIComponent(cleanPath)}` 
                              : null,
                            cleanPath.startsWith('http') ? cleanPath : null,
                          ].filter(Boolean);
                          
                          const imageUrl = possibleUrls[0];
                          
                          if (isImage) {
                            // Prioritize blob URL from authenticated fetch, then use other URLs
                            let finalImageUrl;
                            if (attachmentImageUrl) {
                              finalImageUrl = attachmentImageUrl;
                            } else {
                              // Use the API endpoint first, then fallbacks
                              finalImageUrl = apiAttachmentUrl;
                            }
                            
                            return (
                              <div style={{ 
                                maxWidth: '100%', 
                                textAlign: 'left',
                                marginTop: '10px'
                              }}>
                                {imageLoading && !attachmentImageUrl ? (
                                  <div style={{ 
                                    padding: '40px', 
                                    textAlign: 'left',
                                    color: '#6c757d'
                                  }}>
                                    <div className="spinner-border spinner-border-sm me-2" role="status">
                                      <span className="visually-hidden">Loading...</span>
                                    </div>
                                    Loading image...
                                  </div>
                                ) : imageError && !attachmentImageUrl ? (
                                  <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'left',
                                    color: '#dc3545',
                                    border: '1px solid #dc3545',
                                    borderRadius: '8px',
                                    background: '#f8d7da'
                                  }}>
                                    Failed to load image
                                  </div>
                                ) : (
                                  <img
                                    key={finalImageUrl} // Force re-render when URL changes
                                    src={finalImageUrl}
                                    alt="Leave proof attachment"
                                    style={{
                                      maxWidth: '300px',
                                      maxHeight: '250px',
                                      width: 'auto',
                                      height: 'auto',
                                      borderRadius: '8px',
                                      border: '1px solid #dee2e6',
                                      objectFit: 'contain',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                      backgroundColor: '#f8f9fa',
                                      display: 'block',
                                      margin: '0'
                                    }}
                                    onLoad={() => {
                                      setImageError(false);
                                      setImageLoading(false);
                                    }}
                                    onError={(e) => {
                                      // Only show error if we've tried all possible URLs
                                      const currentSrc = e.target.src;
                                      
                                      // Find current URL index in possibleUrls array
                                      let currentIndex = -1;
                                      for (let i = 0; i < possibleUrls.length; i++) {
                                        if (currentSrc.includes(possibleUrls[i].replace('http://localhost:8000', '')) || 
                                            currentSrc === possibleUrls[i]) {
                                          currentIndex = i;
                                          break;
                                        }
                                      }
                                      
                                      // If we can't find it or it's a blob URL, check if blob failed
                                      if (currentIndex === -1 && currentSrc.startsWith('blob:')) {
                                        // Blob URL failed, try fallback URLs
                                        e.target.src = possibleUrls[0];
                                        return;
                                      }
                                      
                                      // Try next fallback URL
                                      if (currentIndex >= 0 && currentIndex < possibleUrls.length - 1) {
                                        const nextUrl = possibleUrls[currentIndex + 1];
                                        e.target.src = nextUrl;
                                      } else {
                                        // All URLs exhausted, show error
                                        setImageError(true);
                                        setImageLoading(false);
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            );
                          } else if (isPdf) {
                            return (
                              <div style={{ marginTop: '10px' }}>
                                <div className="d-flex align-items-center mb-2 p-3 bg-light rounded border">
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#dc3545',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginRight: '12px'
                                  }}>
                                    PDF
                                  </div>
                                  <div className="flex-grow-1">
                                    <div style={{ fontWeight: '500' }}>PDF Document</div>
                                    <small className="text-muted">{filename}</small>
                                  </div>
                                </div>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View PDF
                                </Button>
                              </div>
                            );
                          } else {
                            return (
                              <div style={{ marginTop: '10px' }}>
                                <div className="d-flex align-items-center mb-2 p-3 bg-light rounded border">
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#6c757d',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginRight: '12px'
                                  }}>
                                    📎
                                  </div>
                                  <div className="flex-grow-1">
                                    <div style={{ fontWeight: '500' }}>Attachment File</div>
                                    <small className="text-muted">{filename}</small>
                                  </div>
                                </div>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  href={imageUrl}
                                  download
                                >
                                  Download Attachment
                                </Button>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
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