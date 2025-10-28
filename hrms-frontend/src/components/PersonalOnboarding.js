import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, ProgressBar, Alert, Form, InputGroup, Modal } from 'react-bootstrap';
import { validateDocumentUpload, formatFileSize } from '../utils/OnboardingValidation';
import OnboardingToast from './OnboardingToast';
import OnboardingLoading from './OnboardingLoading';
import OnboardingStatusBadge from './OnboardingStatusBadge';
import OnboardingProgressBar from './OnboardingProgressBar';
import '../styles/OnboardingStyles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, 
  faCheckCircle, 
  faClock, 
  faExclamationTriangle,
  faUpload,
  faDownload,
  faCalendarAlt,
  faUser,
  faBuilding,
  faRocket,
  faStar,
  faGem,
  faAward,
  faIdCard,
  faGraduationCap,
  faStethoscope,
  faFileContract,
  faCamera,
  faSignature,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faMagic,
  faLightbulb,
  faChartLine,
  faTimesCircle,
  faFilePdf,
  faImage,
  faFileImage,
  faUserCheck,
  faClipboardCheck,
  faBriefcase,
  faUserTie,
  faGift,
  faTrophy,
  faTimes,
  faEye,
  faShieldAlt,
  faDollarSign,
  faHome,
  faEdit,
  faHeartbeat,
  faBell,
  faUsers,
  faCalendarCheck,
  faListAlt,
  faSave,
  faMoneyBillWave,
  faCreditCard,
  faFileMedical,
  faUserMd,
  faHospital,
  faAmbulance,
  faPills,
  faInfoCircle,
  faSearch,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';

const PersonalOnboarding = () => {
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({});
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [userApplications, setUserApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [orientationData, setOrientationData] = useState(null);
  const [orientationChecklist, setOrientationChecklist] = useState([
    { id: 1, task: 'Confirm Attendance', completed: false, icon: faCheckCircle },
    { id: 2, task: 'Prepare Valid Government ID', completed: false, icon: faIdCard },
    { id: 3, task: 'Review Company Handbook', completed: false, icon: faFileAlt },
    { id: 4, task: 'Prepare Questions for HR', completed: false, icon: faLightbulb },
    { id: 5, task: 'Ensure Stable Internet Connection (if online)', completed: false, icon: faBuilding }
  ]);
  const [attendanceStatus, setAttendanceStatus] = useState(null); // null, 'confirmed', 'declined'
  
  // Notification state management
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  // Interview data state
  const [interviewData, setInterviewData] = useState([]);
  const [loadingInterview, setLoadingInterview] = useState(false);
  
  // New state for multi-page system
  const [currentPage, setCurrentPage] = useState('status');
  const [activeTab, setActiveTab] = useState('overview');
  
  // All tabs are always available
  const availableTabs = ['status', 'interview', 'offer', 'onboarding', 'application-status'];

  const showToast = (type, title, message) => {
    setToast({ show: true, type, title, message });
  };

  const hideToast = () => {
    setToast({ show: false, type: 'success', title: '', message: '' });
  };

  const handleAcceptOffer = () => {
    setShowOfferModal(true);
  };

  const handleDeclineOffer = () => {
    setShowDeclineModal(true);
  };

  const confirmAcceptOffer = async () => {
    try {
      const token = localStorage.getItem('token');
      const applicationId = (userApplications && userApplications[0] && userApplications[0].id) ? userApplications[0].id : null;

      if (applicationId && token) {
        // Try dedicated endpoint first
        try {
          await axios.post(`http://localhost:8000/api/applications/${applicationId}/accept-offer`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          // Fallback to generic status update
          await axios.put(`http://localhost:8000/api/applications/${applicationId}/status`, { status: 'Accepted' }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }

      // Local UI feedback
      setShowOfferModal(false);
      showToast('success', 'Offer Accepted', 'Thank you for joining us! HR will contact you soon.');
      // Optimistically update local application status
      setUserApplications(prev => (prev && prev.length > 0) ? [{ ...prev[0], status: 'Accepted' }, ...prev.slice(1)] : prev);
    } catch (error) {
      console.error('Error accepting offer:', error);
      setShowOfferModal(false);
      showToast('error', 'Error', 'Failed to accept the offer. Please try again.');
    }
  };

  const confirmDeclineOffer = async () => {
    try {
      const token = localStorage.getItem('token');
      const applicationId = (userApplications && userApplications[0] && userApplications[0].id) ? userApplications[0].id : null;

      if (applicationId && token) {
        // Try dedicated endpoint first
        try {
          await axios.post(`http://localhost:8000/api/applications/${applicationId}/decline-offer`, { reason: declineReason }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          // Fallback to generic status update
          await axios.put(`http://localhost:8000/api/applications/${applicationId}/status`, { status: 'Declined', reason: declineReason }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }

      setShowDeclineModal(false);
      showToast('info', 'Offer Declined', 'Your response has been recorded.');
      // Optimistically update local application status
      setUserApplications(prev => (prev && prev.length > 0) ? [{ ...prev[0], status: 'Declined' }, ...prev.slice(1)] : prev);
      setDeclineReason('');
    } catch (error) {
      console.error('Error declining offer:', error);
      setShowDeclineModal(false);
      showToast('error', 'Error', 'Failed to decline the offer. Please try again.');
    }
  };


  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform backend notifications to match our format
      const transformedNotifications = response.data.data.map(notif => ({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        time: getRelativeTime(notif.created_at),
        read: notif.read_at !== null,
        selected: false,
        type: notif.type,
        application_id: notif.application_id,
        created_at: notif.created_at
      }));
      
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  // Helper function to get relative time
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  const handleBellIconClick = () => {
    setShowNotificationDropdown(!showNotificationDropdown);
    if (!showNotificationDropdown) {
      fetchNotifications();
    }
  };

  const handleViewApplication = () => {
    // Refresh user data from localStorage to get latest info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Refreshing user data for View Application:', user);
    
    fetchUserApplications(); // Refresh applications data
    setShowApplicationModal(true);
  };

  // Get current Philippines time
  const getCurrentPhilippinesTime = () => {
    return new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Fetch user's applications
  const fetchUserApplications = async () => {
    try {
      setLoadingApplications(true);
      
      // Check for latest application from localStorage first (from JobPortal.js)
      const latestApplication = JSON.parse(localStorage.getItem('latestApplication') || 'null');
      
      if (latestApplication && latestApplication.job_title && latestApplication.department && latestApplication.position && latestApplication.applied_at) {
        console.log('Found latest application from localStorage:', latestApplication);
        setUserApplications([latestApplication]);
        setLoadingApplications(false);
        return;
      } else if (latestApplication) {
        // Clear invalid application data from localStorage
        console.log('Clearing invalid application data from localStorage');
        localStorage.removeItem('latestApplication');
      }
      
      // If no latest application, fetch from API
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/my-applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Get user info from localStorage (from RegisterApplicant.js)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Debug: Log user data to console
      console.log('User data from localStorage:', user);
      
      // Build full name from first_name and last_name (from RegisterApplicant.js)
      const fullName = user.name || 
        (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : 'N/A');
      
      console.log('Full name constructed:', fullName);
      
      // Get email from user data
      const userEmail = user.email || 'N/A';
      
      console.log('User email:', userEmail);
      
      // If no name found in localStorage, try to get from the first application
      let finalName = fullName;
      let finalEmail = userEmail;
      
      if (fullName === 'N/A' && response.data.length > 0) {
        const firstApp = response.data[0];
        if (firstApp.applicant_name) {
          finalName = firstApp.applicant_name;
        }
        if (firstApp.applicant_email) {
          finalEmail = firstApp.applicant_email;
        }
      }
      
      // Filter out invalid applications and enhance application data with user info and proper timezone
      const validApplications = response.data.filter(app => 
        app.job_posting && 
        app.job_posting.title && 
        app.job_posting.department && 
        app.job_posting.position &&
        app.applied_at &&
        app.status
      );
      
      const enhancedApplications = validApplications.map(app => ({
        ...app,
        applicant_name: finalName,
        applicant_email: finalEmail,
        job_title: app.job_posting?.title,
        department: app.job_posting?.department,
        position: app.job_posting?.position,
        applied_at_ph: app.applied_at ? new Date(app.applied_at).toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'N/A',
        applied_date_ph: app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-PH', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'N/A',
        applied_time_ph: app.applied_at ? new Date(app.applied_at).toLocaleTimeString('en-PH', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'N/A'
      }));
      
      console.log('Enhanced applications:', enhancedApplications);
      setUserApplications(enhancedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setUserApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fetch interview data for the current user
  const fetchInterviewData = async () => {
    try {
      console.log('🔄 [PersonalOnboarding] Starting interview data fetch...');
      setLoadingInterview(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ [PersonalOnboarding] No token found for interview data fetch');
        setInterviewData([]);
        return;
      }

      // Get user info first
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('👤 [PersonalOnboarding] Current user:', user);

      // Try multiple approaches to get interviews
      let allInterviews = [];
      
      // Approach 1: Try to get user's applications first
      try {
        console.log('📋 [PersonalOnboarding] Approach 1: Getting user applications...');
        const applications = userApplications.length > 0 ? userApplications : await fetchUserApplications();
        
        console.log('📋 [PersonalOnboarding] User applications:', applications);
        console.log('📋 [PersonalOnboarding] User applications length:', applications.length);
        
        if (applications.length > 0) {
          const applicationIds = applications.map(app => app.id);
          console.log('📤 [PersonalOnboarding] Fetching interviews for application IDs:', applicationIds);
          
          const response = await axios.get('http://localhost:8000/api/user-interviews', {
            headers: { Authorization: `Bearer ${token}` },
            params: { application_ids: applicationIds }
          });
          
          allInterviews = response.data;
          console.log('📥 [PersonalOnboarding] Received interview data via application IDs:', allInterviews);
          
          if (allInterviews.length > 0) {
            console.log('✅ [PersonalOnboarding] Successfully found interviews via applications:', allInterviews.length);
            setInterviewData(allInterviews);
            return;
          }
        }
      } catch (error) {
        console.log('⚠️ [PersonalOnboarding] Approach 1 failed:', error.message);
      }
      
      // Approach 2: Try direct user ID lookup
      if (user.id) {
        try {
          console.log(`🌐 [PersonalOnboarding] Approach 2: Trying direct user API: http://localhost:8000/api/interviews/user/${user.id}`);
          const response = await axios.get(`http://localhost:8000/api/interviews/user/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          allInterviews = response.data;
          console.log('📥 [PersonalOnboarding] Received interview data via direct user ID:', allInterviews);
          
          if (allInterviews.length > 0) {
            console.log('✅ [PersonalOnboarding] Found interviews via direct user approach:', allInterviews.length);
            setInterviewData(allInterviews);
            return;
          }
        } catch (error) {
          console.log('⚠️ [PersonalOnboarding] Approach 2 failed:', error.message);
        }
      }
      
      // Approach 3: Try to get all interviews (for debugging - remove in production)
      try {
        console.log('🌐 [PersonalOnboarding] Approach 3: Trying to get all interviews (debug mode)');
        const response = await axios.get('http://localhost:8000/api/interviews', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        allInterviews = response.data;
        console.log('📥 [PersonalOnboarding] Received all interviews (debug):', allInterviews);
        
        if (allInterviews.length > 0) {
          console.log('✅ [PersonalOnboarding] Found interviews via debug approach:', allInterviews.length);
          setInterviewData(allInterviews);
          return;
        }
      } catch (error) {
        console.log('⚠️ [PersonalOnboarding] Approach 3 failed:', error.message);
      }
      
      // If all approaches failed
      console.log('❌ [PersonalOnboarding] All approaches failed to fetch interviews');
      console.log('💡 [PersonalOnboarding] This might be because:');
      console.log('   1. User has no applications');
      console.log('   2. User is not logged in as the correct user');
      console.log('   3. Interview was created for a different user');
      console.log('   4. Backend API is not working');
      
      setInterviewData([]);
      
    } catch (error) {
      console.error('❌ [PersonalOnboarding] Error fetching interview data:', error);
      setInterviewData([]);
    } finally {
      setLoadingInterview(false);
    }
  };

  // Notification handlers
  const handleNotificationClick = async (notificationId) => {
    // Find the notification to determine its type
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) return;
    
    const token = localStorage.getItem('token');
    
    // Perform associated actions when notification is clicked
    await performAssociatedActions(notification, token);
    
    // Mark notification as read via backend API
    await handleMarkRead(notificationId);
    
    // Mark notification as read in local state
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, read: true, selected: true }
          : { ...n, selected: false }
      )
    );
    
    // Navigate to related tab based on backend notification type
    let targetTab = 'status'; // default
    
    // Use notification type from backend to determine routing
    switch (notification.type) {
      case 'job_application_submitted':
          targetTab = 'status';
          break;
      
      case 'job_application_status_changed':
        // Navigate based on the status in the notification
          targetTab = 'status';
        // If offer-related status, go to offer tab
        if (notification.message?.toLowerCase().includes('offer')) {
          targetTab = 'offer';
        }
        // If interview-related, go to interview tab and refresh data
        else if (notification.message?.toLowerCase().includes('interview')) {
          targetTab = 'interview';
          // Immediately fetch fresh interview data when interview notification is clicked
          fetchInterviewData();
        }
          break;
      
      case 'interview_scheduled':
      case 'meeting_invitation':
          targetTab = 'interview';
          break;
      
      case 'job_offer_received':
      case 'offer_sent':
          targetTab = 'offer';
          break;
      
      case 'orientation_scheduled':
      case 'onboarding_update':
        targetTab = 'onboarding';
        break;
      
      case 'leave_status':
      case 'cash_advance_status':
      case 'evaluation_result':
        // These are for employees, default to status
        targetTab = 'status';
        break;
      
        default:
        // Check message content for hints
        const message = notification.message?.toLowerCase() || '';
        if (message.includes('onboarding') || message.includes('orientation')) {
          targetTab = 'onboarding';
        } else if (message.includes('interview')) {
          targetTab = 'interview';
        } else if (message.includes('offer')) {
          targetTab = 'offer';
        } else {
          targetTab = 'status';
        }
    }
    
    // Navigate to the target tab (within the same page, no new tab)
    setCurrentPage(targetTab);
    
    // Show toast confirmation
    const tabNames = {
      'status': 'Application Status',
      'interview': 'Interview Details',
      'offer': 'Job Offer',
      'onboarding': 'Onboarding'
    };
    
    showToast('info', 'Navigating', `Taking you to ${tabNames[targetTab] || 'your details'}...`);
    
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Also scroll the main content area
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(notification => !notification.read).length;
  };

  // Bulk operation handlers
  const handleSelectAll = () => {
    const allSelected = notifications.every(notification => notification.selected);
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, selected: !allSelected }))
    );
  };

  const handleReadAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const unreadNotifications = notifications.filter(notification => !notification.read);
      
      // Mark all unread notifications as read in backend
      const markReadPromises = unreadNotifications.map(notification => 
        axios.post(`http://localhost:8000/api/notifications/${notification.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(markReadPromises);
      
      // Update local state
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
      
      showToast('success', 'Notifications Updated', 'All notifications have been marked as read.');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('error', 'Error', 'Failed to mark all notifications as read. Please try again.');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const token = localStorage.getItem('token');
      const selectedNotifications = notifications.filter(notification => notification.selected);
      
      // Perform associated actions for each selected notification
      const associatedActionPromises = selectedNotifications.map(notification => 
        performAssociatedActions(notification, token)
      );
      await Promise.all(associatedActionPromises);
      
      // Delete selected notifications from backend
      const deletePromises = selectedNotifications.map(notification => 
        axios.delete(`http://localhost:8000/api/notifications/${notification.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(deletePromises);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => !notification.selected)
      );
      
      showToast('success', 'Notifications Deleted', `${selectedNotifications.length} notification(s) and associated actions have been completed.`);
    } catch (error) {
      console.error('Error deleting selected notifications:', error);
      showToast('error', 'Error', 'Failed to delete selected notifications. Please try again.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Perform associated actions for all notifications
      const associatedActionPromises = notifications.map(notification => 
        performAssociatedActions(notification, token)
      );
      await Promise.all(associatedActionPromises);
      
      // Delete all notifications from backend
      const deletePromises = notifications.map(notification => 
        axios.delete(`http://localhost:8000/api/notifications/${notification.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(deletePromises);
      
      // Update local state
      setNotifications([]);
      
      showToast('success', 'All Notifications Deleted', 'All notifications and associated actions have been completed.');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      showToast('error', 'Error', 'Failed to delete all notifications. Please try again.');
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8000/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
      
      showToast('success', 'Notification Read', 'Notification has been marked as read.');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('error', 'Error', 'Failed to mark notification as read. Please try again.');
    }
  };

  // Perform associated actions when deleting notifications
  const performAssociatedActions = async (notification, token) => {
    try {
      switch (notification.type) {
        case 'job_application_submitted':
          // Mark application as reviewed when notification is deleted
          if (notification.application_id) {
            await axios.put(`http://localhost:8000/api/applications/${notification.application_id}/reviewed`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ [PersonalOnboarding] Application marked as reviewed:', notification.application_id);
          }
          break;
          
        case 'job_application_status_changed':
          // Mark status change as acknowledged
          if (notification.application_id) {
            await axios.put(`http://localhost:8000/api/applications/${notification.application_id}/status-acknowledged`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ [PersonalOnboarding] Status change acknowledged:', notification.application_id);
          }
          break;
          
        case 'interview_scheduled':
        case 'meeting_invitation':
          // Mark interview/meeting as acknowledged
          if (notification.application_id) {
            await axios.put(`http://localhost:8000/api/applications/${notification.application_id}/interview-acknowledged`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ [PersonalOnboarding] Interview/meeting acknowledged:', notification.application_id);
          }
          break;
          
        case 'job_offer_received':
        case 'offer_sent':
          // Mark offer as acknowledged
          if (notification.application_id) {
            await axios.put(`http://localhost:8000/api/applications/${notification.application_id}/offer-acknowledged`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ [PersonalOnboarding] Job offer acknowledged:', notification.application_id);
          }
          break;
          
        case 'orientation_scheduled':
        case 'onboarding_started':
        case 'onboarding_update':
          // Mark onboarding notification as acknowledged
          if (notification.application_id) {
            await axios.put(`http://localhost:8000/api/onboarding-records/${notification.application_id}/notification-acknowledged`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ [PersonalOnboarding] Onboarding notification acknowledged:', notification.application_id);
          }
          break;
          
        case 'onboarding_profile_required':
          // Mark profile requirement as acknowledged
          await axios.put(`http://localhost:8000/api/onboarding-records/profile-requirement-acknowledged`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ [PersonalOnboarding] Profile requirement acknowledged');
          break;
          
        case 'onboarding_documents_required':
          // Mark document requirement as acknowledged
          await axios.put(`http://localhost:8000/api/onboarding-records/documents-requirement-acknowledged`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ [PersonalOnboarding] Documents requirement acknowledged');
          break;
          
        case 'onboarding_benefits_available':
          // Mark benefits notification as acknowledged
          await axios.put(`http://localhost:8000/api/onboarding-records/benefits-acknowledged`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ [PersonalOnboarding] Benefits notification acknowledged');
          break;
          
        case 'onboarding_starting_date_set':
          // Mark starting date notification as acknowledged
          await axios.put(`http://localhost:8000/api/onboarding-records/starting-date-acknowledged`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ [PersonalOnboarding] Starting date notification acknowledged');
          break;
          
        default:
          // For other notification types, just log that they were processed
          console.log('✅ [PersonalOnboarding] Notification processed:', notification.type);
          break;
      }
    } catch (error) {
      console.error('Error performing associated actions:', error);
      // Don't throw error here to prevent deletion failure
      // The notification will still be deleted even if associated actions fail
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Find the notification to get its type and associated data
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) {
        showToast('error', 'Error', 'Notification not found.');
        return;
      }
      
      // Perform associated actions based on notification type before deletion
      await performAssociatedActions(notification, token);
      
      // Delete notification from backend
      await axios.delete(`http://localhost:8000/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      showToast('success', 'Notification Deleted', 'Notification and associated actions have been completed.');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('error', 'Error', 'Failed to delete notification. Please try again.');
    }
  };

  const handleToggleSelection = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, selected: !notification.selected }
          : notification
      )
    );
  };

  const getSelectedCount = () => {
    return notifications.filter(notification => notification.selected).length;
  };

  const isAllSelected = () => {
    return notifications.length > 0 && notifications.every(notification => notification.selected);
  };

  const fetchOnboardingData = async () => {
    try {
      // Mock data instead of API call
      const mockData = {
        status_history: [
          { status: 'Pending' },
          { status: 'Interview Scheduled' },
          { status: 'Offer Sent' },
          { status: 'Offer Accepted' }
        ],
        offer: {
          position: 'Software Developer',
          salary: '₱25,000/month',
          start_date: '2024-01-15'
        }
      };
      
      setOnboardingData(mockData);
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      showToast('error', 'Error', 'Failed to load onboarding data');
    }
  };

  // Fetch orientation data for the logged-in user
  const fetchOrientationData = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      
      // Get scheduled orientations from localStorage
      const scheduledOrientations = JSON.parse(localStorage.getItem('scheduledOrientations') || '[]');
      
      // Find orientation for this user
      const userOrientation = scheduledOrientations.find(
        orientation => orientation.applicantEmail === userEmail
      );
      
      if (userOrientation) {
        console.log('📅 [PersonalOnboarding] Found orientation data for user:', userOrientation);
        
        // Check if orientation was updated (compare with previous data)
        const previousOrientation = orientationData;
        if (previousOrientation && JSON.stringify(previousOrientation) !== JSON.stringify(userOrientation)) {
          // Orientation was updated by HR
          showToast('info', 'Orientation Updated', 'Your orientation schedule has been updated by HR. Please review the changes.');
          console.log('🔔 [PersonalOnboarding] Orientation updated for user:', userEmail);
        }
        
        setOrientationData(userOrientation);
      } else {
        console.log('📅 [PersonalOnboarding] No orientation scheduled for user:', userEmail);
        setOrientationData(null);
      }
    } catch (error) {
      console.error('Error fetching orientation data:', error);
      setOrientationData(null);
    }
  };

  // Load checklist from localStorage
  const loadChecklist = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      const savedChecklists = JSON.parse(localStorage.getItem('orientationChecklists') || '{}');
      
      if (savedChecklists[userEmail]) {
        setOrientationChecklist(savedChecklists[userEmail]);
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
    }
  };

  // Handle checklist item toggle
  const handleChecklistToggle = (taskId) => {
    try {
      const updatedChecklist = orientationChecklist.map(item =>
        item.id === taskId ? { ...item, completed: !item.completed } : item
      );
      
      setOrientationChecklist(updatedChecklist);
      
      // Save to localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      const savedChecklists = JSON.parse(localStorage.getItem('orientationChecklists') || '{}');
      savedChecklists[userEmail] = updatedChecklist;
      localStorage.setItem('orientationChecklists', JSON.stringify(savedChecklists));
      
      console.log('✅ [PersonalOnboarding] Checklist updated for user:', userEmail);
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  // Calculate checklist completion percentage
  const getChecklistProgress = () => {
    const completed = orientationChecklist.filter(item => item.completed).length;
    const total = orientationChecklist.length;
    return Math.round((completed / total) * 100);
  };

  // Load attendance status from localStorage
  const loadAttendanceStatus = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      const savedAttendanceStatus = JSON.parse(localStorage.getItem('orientationAttendanceStatus') || '{}');
      
      if (savedAttendanceStatus[userEmail]) {
        setAttendanceStatus(savedAttendanceStatus[userEmail]);
      }
    } catch (error) {
      console.error('Error loading attendance status:', error);
    }
  };

  // Handle attendance confirmation
  const handleConfirmAttendance = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      
      // Update state
      setAttendanceStatus('confirmed');
      
      // Save to localStorage
      const savedAttendanceStatus = JSON.parse(localStorage.getItem('orientationAttendanceStatus') || '{}');
      savedAttendanceStatus[userEmail] = 'confirmed';
      localStorage.setItem('orientationAttendanceStatus', JSON.stringify(savedAttendanceStatus));
      
      // Auto-check the "Confirm Attendance" checklist item
      const updatedChecklist = orientationChecklist.map(item =>
        item.id === 1 ? { ...item, completed: true } : item
      );
      setOrientationChecklist(updatedChecklist);
      
      // Save updated checklist
      const savedChecklists = JSON.parse(localStorage.getItem('orientationChecklists') || '{}');
      savedChecklists[userEmail] = updatedChecklist;
      localStorage.setItem('orientationChecklists', JSON.stringify(savedChecklists));
      
      // Notify HR (store notification for HR to see)
      const hrNotification = {
        id: Date.now(),
        type: 'attendance_confirmed',
        applicantEmail: userEmail,
        applicantName: user.name || `${user.first_name} ${user.last_name}`,
        message: 'Applicant has confirmed attendance for orientation',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const hrNotifications = JSON.parse(localStorage.getItem('hrNotifications') || '[]');
      hrNotifications.push(hrNotification);
      localStorage.setItem('hrNotifications', JSON.stringify(hrNotifications));
      
      showToast('success', 'Attendance Confirmed', 'You have successfully confirmed your attendance for the orientation!');
      console.log('✅ [PersonalOnboarding] Attendance confirmed for user:', userEmail);
    } catch (error) {
      console.error('Error confirming attendance:', error);
      showToast('error', 'Error', 'Failed to confirm attendance. Please try again.');
    }
  };

  // Handle attendance decline
  const handleDeclineAttendance = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user.email || '';
      
      // Update state
      setAttendanceStatus('declined');
      
      // Save to localStorage
      const savedAttendanceStatus = JSON.parse(localStorage.getItem('orientationAttendanceStatus') || '{}');
      savedAttendanceStatus[userEmail] = 'declined';
      localStorage.setItem('orientationAttendanceStatus', JSON.stringify(savedAttendanceStatus));
      
      // Notify HR
      const hrNotification = {
        id: Date.now(),
        type: 'attendance_declined',
        applicantEmail: userEmail,
        applicantName: user.name || `${user.first_name} ${user.last_name}`,
        message: 'Applicant has declined attendance for orientation',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const hrNotifications = JSON.parse(localStorage.getItem('hrNotifications') || '[]');
      hrNotifications.push(hrNotification);
      localStorage.setItem('hrNotifications', JSON.stringify(hrNotifications));
      
      showToast('info', 'Attendance Declined', 'You have declined the orientation. HR will be notified.');
      console.log('ℹ️ [PersonalOnboarding] Attendance declined for user:', userEmail);
    } catch (error) {
      console.error('Error declining attendance:', error);
      showToast('error', 'Error', 'Failed to decline attendance. Please try again.');
    }
  };

  useEffect(() => {
    // Clear any invalid application data from localStorage on component mount
    const latestApplication = JSON.parse(localStorage.getItem('latestApplication') || 'null');
    if (latestApplication && (!latestApplication.job_title || !latestApplication.department || !latestApplication.position || !latestApplication.applied_at)) {
      console.log('Clearing invalid application data on mount');
      localStorage.removeItem('latestApplication');
    }
    
    fetchOnboardingData();
    fetchUserApplications();
    fetchOrientationData();
    loadChecklist();
    loadAttendanceStatus();
    fetchNotifications(); // Initial fetch of notifications
    fetchInterviewData(); // Fetch interview data
    
    // Set up interval to check for orientation updates
    const orientationInterval = setInterval(() => {
      fetchOrientationData();
    }, 30000); // Increased from 5s to 30s
    
    // Set up interval to check for new notifications
    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 120000); // Increased from 30s to 120s (2 minutes)
    
    // Set up interval to check for new interviews
    const interviewInterval = setInterval(() => {
      fetchInterviewData();
    }, 60000); // Increased from 10s to 60s
    
    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
      const notificationContainer = document.querySelector('.notification-container');
      if (notificationContainer && !notificationContainer.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };
    
    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      clearInterval(orientationInterval);
      clearInterval(notificationInterval);
      clearInterval(interviewInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Fetch interview data when userApplications change
  useEffect(() => {
    if (userApplications.length > 0) {
      fetchInterviewData();
    }
  }, [userApplications]);

  const NavigationTabs = () => (
    <div className="row mb-4" style={{ 
      position: 'sticky', 
      top: '0', 
      zIndex: '1001',
      backgroundColor: 'white',
      paddingTop: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div className="col-12">
        <div className="modern-tab-container">
          <div className="tab-navigation d-flex justify-content-between align-items-center">
            {/* Home Button on Left */}
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => window.location.href = '/'}
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '500'
              }}
            >
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Home
            </button>
            
            {/* Tabs and Notification Icon */}
            <div className="d-flex align-items-center">
              {/* Tabs */}
              <div className="d-flex me-3">
            {availableTabs.includes('status') && (
              <button 
                className={`modern-tab ${currentPage === 'status' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('status');
                  // Scroll to top when switching tabs
                  setTimeout(() => {
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                    <span className="tab-label">Status</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('interview') && (
              <button 
                className={`modern-tab ${currentPage === 'interview' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('interview');
                  // Immediately fetch fresh interview data when tab is clicked
                  fetchInterviewData();
                  // Scroll to top when switching tabs
                  setTimeout(() => {
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                    <span className="tab-label">Interview</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('offer') && (
              <button 
                className={`modern-tab ${currentPage === 'offer' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('offer');
                  // Scroll to top when switching tabs
                  setTimeout(() => {
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                    <span className="tab-label">Job Offer</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('onboarding') && (
              <button 
                className={`modern-tab ${currentPage === 'onboarding' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage('onboarding');
                  // Scroll to top when switching tabs
                  setTimeout(() => {
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }}
              >
                <span className="tab-label">Onboarding</span>
                <div className="tab-indicator"></div>
              </button>
            )}
          </div>
              
              {/* Notification Icon */}
              <div className="notification-container" style={{ position: 'relative' }}>
                <button 
                  className="btn btn-outline-secondary btn-sm notification-icon"
                  onClick={handleBellIconClick}
                  style={{
                     fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                    fontWeight: '500',
                    position: 'relative'
                  }}
                >
                  <FontAwesomeIcon icon={faBell} />
                  {getUnreadCount() > 0 && (
                    <span className="notification-badge">{getUnreadCount()}</span>
                  )}
               </button>
               
               {/* Notification Dropdown */}
               {showNotificationDropdown && (
                 <div className="notification-dropdown">
                   <div className="notification-dropdown-header">
                     <h6 className="mb-0 fw-bold">Notifications</h6>
                     {getUnreadCount() > 0 && (
                       <span className="notification-count-badge">{getUnreadCount()}</span>
                     )}
                  </div>
                   
                   <div className="notification-dropdown-content">
                     {loadingNotifications ? (
                       <div className="text-center py-3">
                         <div className="spinner-border spinner-border-sm text-primary" role="status">
                           <span className="visually-hidden">Loading...</span>
                </div>
          </div>
                     ) : notifications.length === 0 ? (
                       <div className="text-center py-4">
                         <FontAwesomeIcon icon={faBell} className="text-muted mb-2" size="2x" />
                         <p className="text-muted small mb-0">No notifications</p>
        </div>
                     ) : (
                       notifications.slice(0, 5).map((notification) => (
                         <div 
                           key={notification.id}
                           className={`notification-dropdown-item ${!notification.read ? 'unread' : ''}`}
                           onClick={() => {
                             handleNotificationClick(notification.id);
                             setShowNotificationDropdown(false);
                           }}
                         >
                           <div className="d-flex align-items-start">
                             <div className="notification-icon-small me-2">
                               <FontAwesomeIcon 
                                 icon={
                                   notification.type === 'job_application_submitted' ? faCheckCircle :
                                   notification.type === 'job_application_status_changed' ? faCalendarAlt :
                                   notification.type === 'interview_scheduled' ? faCalendarAlt :
                                   notification.type === 'job_offer_received' ? faGift :
                                   faBell
                                 } 
                                 className="text-primary" 
                                 size="sm"
                               />
                             </div>
                             <div className="flex-grow-1">
                               <p className={`mb-0 small ${!notification.read ? 'fw-bold' : ''}`}>
                                 {notification.title}
                               </p>
                               <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                                 {notification.message}
                               </p>
                               <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                 {notification.time}
                               </small>
                             </div>
                             {!notification.read && (
                               <div className="notification-dot"></div>
                             )}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                   
                   {notifications.length > 0 && (
                     <div className="notification-dropdown-footer">
                       <button 
                         className="btn btn-link btn-sm text-decoration-none w-100"
                         onClick={() => {
                           setCurrentPage('application-status');
                           setShowNotificationDropdown(false);
                         }}
                       >
                         View All Notifications
                       </button>
                     </div>
                   )}
                 </div>
               )}
                  </div>
                </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="onboarding-container">
        <NavigationTabs />
        
        <div className="main-content" style={{ 
          height: 'calc(100vh - 120px)', 
          overflowY: 'auto', 
          overflowX: 'hidden',
          paddingBottom: '2rem'
        }}>
        {currentPage === 'application-status' && (
          <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0">
                <FontAwesomeIcon icon={faBell} className="me-2 text-primary" />
                All Notifications
              </h4>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setCurrentPage('application-status')}
            >
              <FontAwesomeIcon icon={faTimes} className="me-1" />
              Close
                    </button>
                  </div>
          
          {/* Action Controls */}
          <div className="notification-controls mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="selectAll"
                  checked={isAllSelected()}
                  onChange={handleSelectAll}
                />
                <label className="form-check-label" htmlFor="selectAll">
                  Select All
                </label>
                </div>
              
            <button 
              className="btn btn-outline-primary btn-sm"
                onClick={handleReadAll}
                disabled={notifications.length === 0}
              >
                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                Read All
            </button>
              
                  <button 
                className="btn btn-outline-danger btn-sm"
                onClick={getSelectedCount() > 0 ? handleDeleteSelected : handleDeleteAll}
                disabled={notifications.length === 0}
              >
                <FontAwesomeIcon icon={faTimes} className="me-1" />
                {getSelectedCount() > 0 ? `Delete Selected (${getSelectedCount()})` : 'Delete All'}
                  </button>
            </div>
          </div>

          <div className="messages-list">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`message-item ${notification.selected ? 'selected' : ''} ${!notification.read ? 'unread' : ''}`}
              >
                <div className="d-flex align-items-start">
                  {/* Checkbox */}
                  <div className="form-check me-3 mt-1">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={notification.selected}
                      onChange={() => handleToggleSelection(notification.id)}
                    />
                      </div>
                      
                  {/* Notification Icon */}
                  <div className="message-icon me-3">
                    <FontAwesomeIcon 
                      icon={
                        notification.id === 1 ? faCheckCircle :
                        notification.id === 2 ? faClock :
                        notification.id === 3 ? faBuilding :
                        notification.id === 4 ? faCalendarAlt :
                        notification.id === 5 ? faGift :
                        faBell
                      } 
                      className={
                        notification.id === 1 ? "text-success" :
                        notification.id === 2 ? "text-warning" :
                        notification.id === 3 ? "text-info" :
                        notification.id === 4 ? "text-primary" :
                        notification.id === 5 ? "text-success" :
                        "text-secondary"
                      } 
                    />
                          </div>

                  {/* Notification Content */}
                  <div className="flex-grow-1">
                    <h6 className={`mb-1 ${!notification.read ? 'fw-bold' : ''}`}>
                      {notification.title}
                    </h6>
                    <p className="text-muted mb-1">{notification.message}</p>
                    <small className="text-muted">{notification.time}</small>
                              </div>
                  
                  {/* Action Buttons */}
                  <div className="notification-actions ms-3">
                    {!notification.read && (
                                  <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => handleMarkRead(notification.id)}
                        title="Mark as read"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                                  </button>
                    )}
                                  <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(notification.id)}
                      title="Delete notification"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                                  </button>
                                </div>
                    </div>
                </div>
            ))}
            
            {notifications.length === 0 && (
              <div className="text-center py-5">
                <FontAwesomeIcon icon={faBell} className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                <h5 className="text-muted">No notifications</h5>
                <p className="text-muted">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
        )}

        {currentPage === 'status' && (
          <div className="container-fluid p-4">
            <div className="row">
              <div className="col-md-8">
              {/* Current Status Panel */}
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title d-flex align-items-center">
                    <FontAwesomeIcon icon={faChartLine} className="me-2 text-primary" />
                    Current Status
                  </h5>
                  
                  {/* Status Display */}
                  <div className="status-display mb-4">
                    {userApplications.length > 0 ? (
                      <>
                        <div className="d-flex align-items-center mb-3">
                          <div className="status-icon me-3">
                            <FontAwesomeIcon 
                              icon={
                                userApplications[0].status === 'Pending' ? faClock :
                                userApplications[0].status === 'ShortListed' ? faCheckCircle :
                                userApplications[0].status === 'Interview' ? faCalendarAlt :
                                userApplications[0].status === 'Offered' ? faGift :
                                userApplications[0].status === 'Hired' ? faUser :
                                userApplications[0].status === 'Rejected' ? faTimes :
                                faClock
                              } 
                              className={
                                userApplications[0].status === 'Pending' ? 'text-warning' :
                                userApplications[0].status === 'ShortListed' ? 'text-primary' :
                                userApplications[0].status === 'Interview' ? 'text-info' :
                                userApplications[0].status === 'Offered' ? 'text-success' :
                                userApplications[0].status === 'Hired' ? 'text-success' :
                                userApplications[0].status === 'Rejected' ? 'text-danger' :
                                'text-warning'
                              }
                            />
                          </div>
                          <div>
                            <h4 className={`mb-1 fw-bold ${
                              userApplications[0].status === 'Pending' ? 'text-warning' :
                              userApplications[0].status === 'ShortListed' ? 'text-primary' :
                              userApplications[0].status === 'Interview' ? 'text-info' :
                              userApplications[0].status === 'Offered' ? 'text-success' :
                              userApplications[0].status === 'Hired' ? 'text-success' :
                              userApplications[0].status === 'Rejected' ? 'text-danger' :
                              'text-warning'
                            }`}>
                              {userApplications[0].status === 'Pending' ? 'Under Review' :
                               userApplications[0].status === 'ShortListed' ? 'Shortlisted' :
                               userApplications[0].status === 'Interview' ? 'Interview Scheduled' :
                               userApplications[0].status === 'Offered' ? 'Job Offer Extended' :
                               userApplications[0].status === 'Hired' ? 'Congratulations! Hired' :
                               userApplications[0].status === 'Rejected' ? 'Application Not Selected' :
                               'Under Review'}
                            </h4>
                            <small className="text-muted">
                              Applied: {userApplications[0].applied_at_ph || 'N/A'}
                            </small>
                          </div>
                        </div>
                        
                        {/* Status Message */}
                        <div className="status-message p-3 bg-light rounded">
                          <p className="mb-2 fw-medium">
                            {userApplications[0].status === 'Pending' ? 'Your application is being reviewed by our HR team.' :
                             userApplications[0].status === 'ShortListed' ? 'Congratulations! You have been shortlisted for the next phase.' :
                             userApplications[0].status === 'Interview' ? 'You have been selected for an interview. Please prepare accordingly.' :
                             userApplications[0].status === 'Offered' ? 'We are pleased to offer you the position. Please review the offer details.' :
                             userApplications[0].status === 'Hired' ? 'Welcome to the team! Your application has been successful.' :
                             userApplications[0].status === 'Rejected' ? 'We regret to inform you that your application was not selected at this time.' :
                             'Your application is being reviewed by our HR team.'}
                          </p>
                          <p className="text-muted mb-0">
                            {userApplications[0].status === 'Pending' ? 'We will notify you of any updates within 3-5 business days.' :
                             userApplications[0].status === 'ShortListed' ? 'You will be contacted for the next steps soon.' :
                             userApplications[0].status === 'Interview' ? 'Interview details will be shared with you shortly.' :
                             userApplications[0].status === 'Offered' ? 'Please respond to the offer within the specified timeframe.' :
                             userApplications[0].status === 'Hired' ? 'Welcome aboard! HR will contact you with onboarding details.' :
                             userApplications[0].status === 'Rejected' ? 'You may reapply for other positions in the future.' :
                             'We will notify you of any updates within 3-5 business days.'}
                          </p>
                        </div>
                        
                        {/* Next Step */}
                        <div className="next-step mt-3 p-3 border-start border-3 border-info bg-info bg-opacity-10">
                          <h6 className="text-info mb-2">
                            <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                            Next Step
                          </h6>
                          <p className="mb-0">
                            {userApplications[0].status === 'Pending' ? 'If selected, you will be contacted for an interview within the next week.' :
                             userApplications[0].status === 'ShortListed' ? 'Prepare for the interview and gather your documents.' :
                             userApplications[0].status === 'Interview' ? 'Attend the interview at the scheduled time and location.' :
                             userApplications[0].status === 'Offered' ? 'Review the offer details and respond within the deadline.' :
                             userApplications[0].status === 'Hired' ? 'Complete the onboarding process and prepare for your first day.' :
                             userApplications[0].status === 'Rejected' ? 'Consider applying for other available positions.' :
                             'If selected, you will be contacted for an interview within the next week.'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <FontAwesomeIcon icon={faFileAlt} className="text-muted mb-3" size="3x" />
                        <h5 className="text-muted mb-2">No Application Found</h5>
                        <p className="text-muted mb-3">You haven't submitted any job applications yet.</p>
                        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                          <FontAwesomeIcon icon={faSearch} className="me-2" />
                          Browse Jobs
                        </button>
                      </div>
                    )}
                  </div>
                    
                    {/* View Application Button */}
                    <div className="mt-4">
                      {userApplications.length > 0 ? (
                        <button className="btn btn-primary" onClick={handleViewApplication}>
                          <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                          View Application
                        </button>
                      ) : (
                        <div className="text-center p-3 bg-light rounded">
                          <FontAwesomeIcon icon={faFileAlt} className="text-muted mb-2" size="2x" />
                          <p className="text-muted mb-2 small">No applications yet</p>
                          <p className="text-muted small">Apply for a job to view your application details here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </div>
            
              <div className="col-md-4">
                <div className="card mb-4">
                  <div className="card-body">
                    <h5 className="card-title">Quick Actions</h5>
                    <div className="d-grid gap-2">
                      <button className="btn btn-outline-secondary">
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        Update Information
                      </button>
                      <button className="btn btn-outline-info">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        Contact HR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interview Tab */}
        {currentPage === 'interview' && (
          <div className="container-fluid p-4">
            
            {/* Loading State */}
            {loadingInterview && (
              <div className="interview-loading-container">
              <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                  <h5 className="text-muted">Loading interview information...</h5>
                  <p className="text-muted">Please wait while we fetch your interview details.</p>
              </div>
              </div>
            )}

            {/* Empty State */}
            {!loadingInterview && interviewData.length === 0 && (
              <div className="interview-empty-state">
              <div className="text-center py-5">
                  <div className="interview-empty-icon mb-4">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                </div>
                  <h4 className="text-muted mb-3">No interviews scheduled yet.</h4>
                  <p className="text-muted mb-4">
                    You don't have any interviews scheduled at the moment.<br />
                    Check back later or contact HR for updates.
                  </p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button 
                      className="btn btn-primary"
                      onClick={fetchInterviewData}
                    >
                      <FontAwesomeIcon icon={faRefresh} className="me-2" />
                      Check Again
                    </button>
                    <button 
                      className="btn btn-info"
                      onClick={() => {
                        console.log('🔍 [PersonalOnboarding] Debug Info:');
                        console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));
                        console.log('Applications:', userApplications);
                        console.log('Interview Data:', interviewData);
                        alert('Debug info logged to console. Check browser console for details.');
                      }}
                    >
                      <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                      Debug Info
                    </button>
              </div>
                </div>
              </div>
            )}

            {/* Interview Cards */}
            {!loadingInterview && interviewData.length > 0 && (
              <div className="row">
                {interviewData.map((interview, index) => (
                  <div key={interview.id || index} className="col-12 mb-4">
                    <div className="interview-card">
                      {/* Card Header */}
                      <div className="interview-card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <div className="interview-icon-wrapper">
                              <FontAwesomeIcon icon={faCalendarAlt} />
                            </div>
                            <div>
                              <h5 className="mb-1 text-white">Interview Invitation</h5>
                              <p className="mb-0 text-white-50 small">
                                {interview.application?.job_posting?.title || 'Position'}
                              </p>
                            </div>
                          </div>
                          <div className="interview-status-badge">
                            <FontAwesomeIcon icon={faClock} className="me-1" />
                            {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Body */}
                      <div className="interview-card-body">
                        {/* Interview Details Grid */}
                        <div className="interview-details-grid">
                          {/* Date & Time Section */}
                          <div className="interview-detail-section">
                            <h6 className="section-title">
                              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                              📅 Date & Time Information
                            </h6>
                            <div className="detail-items">
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faCalendarAlt} />
                                </div>
                                <div className="detail-content">
                                  <label>📅 Interview Date</label>
                                  <span>
                                    {new Date(interview.interview_date).toLocaleDateString('en-PH', {
                                      timeZone: 'Asia/Manila',
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faClock} />
                            </div>
                                <div className="detail-content">
                                  <label>🕐 Interview Time</label>
                                  <span>
                                    {new Date(`2000-01-01T${interview.interview_time}`).toLocaleTimeString('en-PH', {
                                      timeZone: 'Asia/Manila',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faClock} />
                            </div>
                                <div className="detail-content">
                                  <label>⏱️ Duration</label>
                                  <span>{interview.duration || 30} minutes</span>
                          </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Location & Contact Section */}
                          <div className="interview-detail-section">
                            <h6 className="section-title">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                              📍 Location & Contact Details
                            </h6>
                            <div className="detail-items">
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faBuilding} />
                                </div>
                                <div className="detail-content">
                                  <label>🏢 Interview Type</label>
                                  <span className="text-capitalize">{interview.interview_type || 'On-site'}</span>
                                </div>
                              </div>
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                            </div>
                                <div className="detail-content">
                                  <label>📍 Location</label>
                                  <span>{interview.location}</span>
                          </div>
                                </div>
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <FontAwesomeIcon icon={faUserTie} />
                                </div>
                                <div className="detail-content">
                                  <label>👤 Interviewer</label>
                                  <span>{interview.interviewer}</span>
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                        
                        {/* Notes Section */}
                        {interview.notes && (
                          <div className="interview-notes-section">
                            <h6 className="section-title">
                              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                              Additional Notes & Instructions
                            </h6>
                            <div className="notes-content">
                              <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                              {interview.notes}
                            </div>
                          </div>
                        )}
                        
                        {/* Feedback Section */}
                        {interview.feedback && (
                          <div className="interview-feedback-section">
                            <h6 className="section-title">
                              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                              Interview Feedback
                            </h6>
                            <div className="feedback-content">
                              {interview.feedback}
                            </div>
                          </div>
                        )}
                        
                        {/* Preparation Tips */}
                        <div className="interview-tips-section">
                          <h6 className="section-title">
                            <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                            Interview Preparation Tips
                          </h6>
                          <div className="tips-grid">
                            <div className="tip-item">
                              <FontAwesomeIcon icon={faCheckCircle} className="tip-icon" />
                              <span>Arrive 10-15 minutes early</span>
                              </div>
                            <div className="tip-item">
                              <FontAwesomeIcon icon={faCheckCircle} className="tip-icon" />
                              <span>Bring valid government ID</span>
                            </div>
                            <div className="tip-item">
                              <FontAwesomeIcon icon={faCheckCircle} className="tip-icon" />
                              <span>Dress professionally</span>
                              </div>
                            <div className="tip-item">
                              <FontAwesomeIcon icon={faCheckCircle} className="tip-icon" />
                              <span>Prepare questions for the interviewer</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentPage === 'offer' && (
          <div className="container-fluid p-4">
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="mb-0 offer-header-title">
                Job Offer for {onboardingData?.offer?.position || (userApplications[0]?.job_title) || 'Offered Position'}
              </h4>
            </div>

            <div className="card offer-card">
              <div className="card-body p-4">
                {/* Company Block */}
                <div className="mb-4">
                  <div>
                    <h5 className="mb-1 company-name">{onboardingData?.company?.name || 'Cabuyao Concrete Development Corporation'}</h5>
                    <p className="text-muted mb-0">
                      Congratulations! You've been offered the position of {onboardingData?.offer?.position || (userApplications[0]?.job_title) || 'Offered Position'}.
                      We are pleased to extend this offer as part of our growing team and believe that your skills and experience will make a valuable contribution to our organization. Please review the details of your offer carefully, including the position, compensation, work schedule, and start date provided below. We encourage you to take the time to consider this opportunity and make a decision that aligns with your goals. Once ready, you may confirm your decision by selecting either "Accept Offer" or "Decline Offer" at the bottom of this page. Should you have any questions or need further clarification, please don't hesitate to contact our HR department. We look forward to hearing from you soon and hopefully welcoming you aboard.
                    </p>
                  </div>
                </div>

                {/* Offer Details */}
                <div className="row g-3">
                  <div className="col-md-6 col-lg-4">
                    <div className="offer-detail">
                      <div className="label">Position</div>
                      <div className="value">
                        {onboardingData?.offer?.position || (userApplications[0]?.job_title) || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-4">
                    <div className="offer-detail">
                      <div className="label">Salary</div>
                      <div className="value">
                        {onboardingData?.offer?.salary || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-4">
                    <div className="offer-detail">
                      <div className="label">Department</div>
                      <div className="value">
                        {userApplications[0]?.department || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 d-flex flex-wrap gap-2">
                  <button className="btn btn-primary d-flex align-items-center" onClick={handleAcceptOffer}>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Accept Offer
                  </button>
                  <button className="btn btn-outline-secondary d-flex align-items-center" onClick={handleDeclineOffer}>
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Decline Offer
                  </button>
                </div>

                <div className="mt-3 text-muted small">
                  If you have any questions, please reach out to HR at <span className="fw-semibold">hr@company.com</span> or <span className="fw-semibold">(02) 1234-5678</span>.
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'onboarding' && (
          <div className="container-fluid p-4">
            {/* Onboarding Sub-Navigation */}
            <div className="onboarding-subnav mb-4">
              <button 
                className={`subnav-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Orientation Schedule
              </button>
              <button 
                className={`subnav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Create Profile
              </button>
              <button 
                className={`subnav-item ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                Documents
              </button>
              <button 
                className={`subnav-item ${activeTab === 'benefits' ? 'active' : ''}`}
                onClick={() => setActiveTab('benefits')}
              >
                Benefits
              </button>
              <button 
                className={`subnav-item ${activeTab === 'starting-date' ? 'active' : ''}`}
                onClick={() => setActiveTab('starting-date')}
              >
                Starting Date
              </button>
            </div>

            {/* Content based on activeTab */}
            {activeTab === 'overview' && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="mb-0">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" />
                    Orientation Schedule
            </h4>
                  {orientationData && orientationData.createdAt && (
                    <span className="badge bg-info">
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      Last Updated: {new Date(orientationData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  </div>
                
                {orientationData ? (
                  <>
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="row">
                        {/* Left Column - Date & Time Info */}
                        <div className="col-md-6">
                          <div className="orientation-info-section mb-4">
                            <h5 className="text-primary mb-3">
                              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                              Date & Time
                            </h5>
                            <div className="info-item d-flex align-items-start mb-3">
                              <div className="info-icon-wrapper me-3">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-info" />
                              </div>
                              <div>
                                <label className="text-muted small mb-1">Date</label>
                                <p className="mb-0 fw-medium">
                                  {new Date(orientationData.orientationDate).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="info-item d-flex align-items-start mb-3">
                              <div className="info-icon-wrapper me-3">
                                <FontAwesomeIcon icon={faClock} className="text-warning" />
                              </div>
                              <div>
                                <label className="text-muted small mb-1">Time</label>
                                <p className="mb-0 fw-medium">{orientationData.orientationTime}</p>
                  </div>
                </div>
              </div>
              
                          <div className="orientation-info-section mb-4">
                            <h5 className="text-primary mb-3">
                              <FontAwesomeIcon icon={faBuilding} className="me-2" />
                              Type & Location
                            </h5>
                            <div className="info-item d-flex align-items-start mb-3">
                              <div className="info-icon-wrapper me-3">
                                <FontAwesomeIcon icon={faBuilding} className="text-success" />
                              </div>
                              <div>
                                <label className="text-muted small mb-1">Type</label>
                                <p className="mb-0">
                                  <span className={`badge ${
                                    orientationData.orientationType === 'in-person' ? 'bg-primary' :
                                    orientationData.orientationType === 'online' ? 'bg-info' :
                                    'bg-success'
                                  }`}>
                                    {orientationData.orientationType === 'in-person' ? 'In-Person' :
                                     orientationData.orientationType === 'online' ? 'Online' :
                                     orientationData.orientationType}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="info-item d-flex align-items-start">
                              <div className="info-icon-wrapper me-3">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-danger" />
                  </div>
                  <div className="flex-grow-1">
                                <label className="text-muted small mb-1">
                                  {orientationData.orientationType === 'online' ? 'Meeting Link' : 'Venue'}
                                </label>
                                {orientationData.orientationType === 'online' ? (
                                  <a 
                                    href={orientationData.venue.startsWith('http') ? orientationData.venue : `https://${orientationData.venue}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary fw-medium text-decoration-none d-inline-flex align-items-center"
                                  >
                                    {orientationData.venue}
                                    <FontAwesomeIcon icon={faEye} className="ms-2" size="sm" />
                                  </a>
                                ) : (
                                  <p className="mb-0 fw-medium">{orientationData.venue}</p>
                                )}
                              </div>
                  </div>
                </div>
              </div>

                        {/* Right Column - Facilitator & Instructions */}
                        <div className="col-md-6">
                          <div className="orientation-info-section mb-4">
                            <h5 className="text-primary mb-3">
                              <FontAwesomeIcon icon={faUserTie} className="me-2" />
                              Facilitator
                            </h5>
                            <div className="info-item d-flex align-items-start">
                              <div className="info-icon-wrapper me-3">
                                <FontAwesomeIcon icon={faUserTie} className="text-primary" />
                              </div>
                              <div>
                                <label className="text-muted small mb-1">Facilitator Name</label>
                                <p className="mb-0 fw-medium">{orientationData.facilitator}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="orientation-info-section">
                            <h5 className="text-primary mb-3">
                              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                              Notes & Instructions
                            </h5>
                            <div className="alert alert-info mb-0">
                <div className="d-flex align-items-start">
                                <FontAwesomeIcon icon={faLightbulb} className="mt-1 me-2" />
                                <div>
                                  <p className="mb-0">{orientationData.notes || 'No additional notes provided.'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mt-4 pt-4 border-top">
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                          <div>
                            <label className="text-muted small mb-1">Status</label>
                            <div>
                              <span className={`badge ${
                                orientationData.status === 'scheduled' ? 'bg-primary' :
                                orientationData.status === 'rescheduled' ? 'bg-warning' :
                                orientationData.status === 'completed' ? 'bg-success' :
                                orientationData.status === 'cancelled' ? 'bg-danger' :
                                'bg-secondary'
                              } px-3 py-2`}>
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                {orientationData.status?.charAt(0).toUpperCase() + orientationData.status?.slice(1)}
                              </span>
                            </div>
                          </div>
                          {orientationData.attendees && (
                            <div className="text-end">
                              <label className="text-muted small mb-1">Other Attendees</label>
                              <p className="mb-0 small">{orientationData.attendees}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Attendance Confirmation Section */}
                      <div className="mt-4 pt-4 border-top">
                        <label className="text-muted small mb-3 d-block fw-bold">
                          <FontAwesomeIcon icon={faUserCheck} className="me-2" />
                          ATTENDANCE CONFIRMATION
                        </label>
                        
                        {attendanceStatus === null ? (
                          <div className="d-flex flex-column gap-2">
                            <div className="alert alert-warning mb-3">
                              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                              Please confirm your attendance for this orientation session.
                            </div>
                            <div className="d-flex gap-2 flex-wrap">
                              <button 
                                className="btn btn-success d-flex align-items-center"
                                onClick={handleConfirmAttendance}
                                style={{ flex: '1 1 auto' }}
                              >
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                Confirm Attendance
                              </button>
                              <button 
                                className="btn btn-outline-danger d-flex align-items-center"
                                onClick={handleDeclineAttendance}
                                style={{ flex: '1 1 auto' }}
                              >
                                <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                                Cannot Attend
                              </button>
                            </div>
                          </div>
                        ) : attendanceStatus === 'confirmed' ? (
                          <div className="alert alert-success mb-0">
                            <div className="d-flex align-items-center justify-content-between flex-wrap">
                              <div className="d-flex align-items-center">
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2" size="lg" />
                                <div>
                                  <strong>Attendance Confirmed</strong>
                                  <p className="mb-0 small">You have confirmed your attendance. We look forward to seeing you!</p>
                                </div>
                              </div>
                              <button 
                                className="btn btn-sm btn-outline-secondary mt-2 mt-md-0"
                                onClick={() => setAttendanceStatus(null)}
                              >
                                Change Response
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="alert alert-danger mb-0">
                            <div className="d-flex align-items-center justify-content-between flex-wrap">
                              <div className="d-flex align-items-center">
                                <FontAwesomeIcon icon={faTimesCircle} className="me-2" size="lg" />
                                <div>
                                  <strong>Attendance Declined</strong>
                                  <p className="mb-0 small">You have declined this orientation. HR has been notified.</p>
                                </div>
                              </div>
                              <button 
                                className="btn btn-sm btn-outline-secondary mt-2 mt-md-0"
                                onClick={() => setAttendanceStatus(null)}
                              >
                                Change Response
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Preparation Checklist */}
                  <div className="card border-0 shadow-sm mt-4">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="text-primary mb-0">
                          <FontAwesomeIcon icon={faClipboardCheck} className="me-2" />
                          Preparation Checklist
                        </h5>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-light text-dark me-2">
                            {orientationChecklist.filter(item => item.completed).length} / {orientationChecklist.length} completed
                          </span>
                          <span className={`badge ${
                            getChecklistProgress() === 100 ? 'bg-success' :
                            getChecklistProgress() >= 50 ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {getChecklistProgress()}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="progress mb-4" style={{ height: '8px' }}>
                        <div 
                          className={`progress-bar ${
                            getChecklistProgress() === 100 ? 'bg-success' :
                            getChecklistProgress() >= 50 ? 'bg-warning' :
                            'bg-primary'
                          }`}
                          role="progressbar" 
                          style={{ width: `${getChecklistProgress()}%` }}
                          aria-valuenow={getChecklistProgress()} 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        >
                        </div>
                      </div>
                      
                      {/* Checklist Items */}
                      <div className="checklist-items">
                        {orientationChecklist.map((item) => (
                          <div 
                            key={item.id} 
                            className={`checklist-item d-flex align-items-center p-3 mb-2 rounded ${
                              item.completed ? 'checklist-item-completed' : 'checklist-item-pending'
                            }`}
                            onClick={() => handleChecklistToggle(item.id)}
                            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                          >
                            <div className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                checked={item.completed}
                                onChange={() => handleChecklistToggle(item.id)}
                                style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                              />
                            </div>
                            <div className="checklist-icon ms-3 me-3">
                              <FontAwesomeIcon 
                                icon={item.icon} 
                                className={item.completed ? 'text-success' : 'text-muted'}
                              />
                  </div>
                  <div className="flex-grow-1">
                              <p className={`mb-0 ${
                                item.completed ? 'text-decoration-line-through text-muted' : 'fw-medium'
                              }`}>
                                {item.task}
                              </p>
                  </div>
                            {item.completed && (
                              <div className="checklist-badge">
                                <span className="badge bg-success">
                                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                                  Done
                                </span>
                </div>
                            )}
              </div>
                        ))}
                      </div>
                      
                      {/* Completion Message */}
                      {getChecklistProgress() === 100 && (
                        <div className="alert alert-success mt-3 mb-0">
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon icon={faTrophy} className="me-2" size="lg" />
                            <div>
                              <strong>Great job!</strong> You've completed all preparation tasks. You're ready for your orientation!
                            </div>
            </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                ) : (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-5 text-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-muted mb-3" size="3x" />
                      <h5 className="text-muted mb-2">No Orientation Scheduled</h5>
                      <p className="text-muted mb-0">
                        Your orientation has not been scheduled yet. You will be notified once HR schedules your orientation session.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'profile' && (
              <div>
                <h4 className="mb-4">
                  <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
                  Create Your Profile
                </h4>
                <div className="card">
                  <div className="card-body">
                    <p className="text-muted">Profile creation interface will be available here.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                <h4 className="mb-4">
                  <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary" />
                  Upload Documents
                </h4>
                <div className="card">
                  <div className="card-body">
                    <p className="text-muted">Document upload interface will be available here.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'benefits' && (
              <div>
                <h4 className="mb-4">
                  <FontAwesomeIcon icon={faGift} className="me-2 text-primary" />
                  Employee Benefits
                </h4>
                <div className="card">
                  <div className="card-body">
                    <p className="text-muted">Benefits information will be available here.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'starting-date' && (
              <div>
                <h4 className="mb-4">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" />
                  Starting Date
                </h4>
                <div className="card">
                  <div className="card-body">
                    <p className="text-muted">Starting date information will be available here.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toast Notifications */}
        <OnboardingToast
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={hideToast}
        />

        {/* Accept Offer Confirmation Modal */}
        <Modal show={showOfferModal} onHide={() => setShowOfferModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2 text-success" />
              Accept Job Offer
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to accept this job offer?</p>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-secondary" onClick={() => setShowOfferModal(false)}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={confirmAcceptOffer}>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Accept Offer
            </button>
          </Modal.Footer>
        </Modal>

        {/* Decline Offer Confirmation Modal */}
        <Modal show={showDeclineModal} onHide={() => setShowDeclineModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faTimes} className="me-2 text-danger" />
              Decline Job Offer
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to decline this job offer?</p>
            <div className="mt-3">
              <label className="form-label small text-muted">May we know why you’re declining? (optional)</label>
              <textarea 
                className="form-control" 
                rows="3"
                placeholder="Your reason..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button className="btn btn-secondary" onClick={() => setShowDeclineModal(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={confirmDeclineOffer}>
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Decline Offer
            </button>
          </Modal.Footer>
        </Modal>

        {/* Application Summary Modal */}
        <Modal show={showApplicationModal} onHide={() => setShowApplicationModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary" />
              Application Summary
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="application-summary">
              {loadingApplications ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Loading your applications...</p>
                </div>
              ) : userApplications.length === 0 ? (
                /* Empty State - No Application */
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faFileAlt} className="text-muted mb-3" style={{ fontSize: '4rem' }} />
                  <h5 className="text-muted mb-3">No Application Found</h5>
                  <p className="text-muted mb-4">
                    You haven't submitted any job applications yet. Browse available positions and apply to get started.
                  </p>
                  
                  <div className="d-flex justify-content-center gap-3 mt-4">
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                      <FontAwesomeIcon icon={faSearch} className="me-2" />
                      Browse Jobs
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setShowApplicationModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Show Application Data */
                <div>
                  {userApplications.map((application, index) => (
                    <div key={application.id || index} className="mb-4">
                      <div className="row">
                        <div className="col-md-6">
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td className="fw-bold text-muted">Name:</td>
                                <td>{application.applicant_name || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold text-muted">Email:</td>
                                <td>{application.applicant_email || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold text-muted">Department:</td>
                                <td>{application.department || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold text-muted">Position:</td>
                                <td>{application.position || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="col-md-6">
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td className="fw-bold text-muted">Date Applied:</td>
                                <td>{application.applied_date_ph || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold text-muted">Time Applied:</td>
                                <td>{application.applied_time_ph || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-bold text-muted">Status:</td>
                                <td>
                                  <span className={`badge ${
                                    application.status === 'Pending' ? 'bg-secondary' :
                                    application.status === 'Applied' ? 'bg-primary' :
                                    application.status === 'ShortListed' ? 'bg-primary' :
                                    application.status === 'Interview' ? 'bg-warning' :
                                    application.status === 'Offered' ? 'bg-success' :
                                    application.status === 'Hired' ? 'bg-success' :
                                    application.status === 'Rejected' ? 'bg-danger' :
                                    'bg-secondary'
                                  }`}>
                                    {application.status || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal.Body>
          {userApplications.length > 0 && (
            <Modal.Footer>
              <button className="btn btn-secondary" onClick={() => setShowApplicationModal(false)}>
                Close
              </button>
            </Modal.Footer>
          )}
        </Modal>

        <style jsx>{`
        .onboarding-container {
          min-height: 100vh;
          background: white;
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }

        .modern-tab-container {
          background: rgba(248, 249, 250, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .tab-navigation {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modern-tab {
          position: relative;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          min-width: 120px;
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .modern-tab:hover {
          background: rgba(74, 144, 226, 0.08);
          border-color: rgba(74, 144, 226, 0.2);
          color: #4a90e2;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(74, 144, 226, 0.15);
        }

        .modern-tab.active {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-color: #4a90e2;
          color: white;
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(74, 144, 226, 0.3);
        }

        .modern-tab.active:hover {
          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);
          transform: translateY(-4px);
          box-shadow: 0 16px 35px rgba(74, 144, 226, 0.4);
        }

        .tab-label {
          font-size: 0.9rem;
          font-weight: 600;
          text-align: center;
        }

        .tab-indicator {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 3px;
          background: linear-gradient(90deg, #4a90e2, #357abd);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .modern-tab.active .tab-indicator {
          width: 80%;
        }

        .onboarding-modern-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Formal Offer Styles */
        .offer-card {
          border: 1px solid #e9ecef;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }
        .offer-header-title {
          font-weight: 800;
          color: #1f2d3d;
          letter-spacing: 0.2px;
        }
        .offer-title {
          font-weight: 700;
          color: #2c3e50;
        }
        .offer-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f3f5;
          color: #0d6efd;
          border: 1px solid #e9ecef;
        }
        .offer-detail {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          padding: 14px;
          height: 100%;
        }
        .offer-detail .label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .offer-detail .value {
          font-size: 1rem;
          color: #212529;
          font-weight: 600;
        }
        .company-logo {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .company-logo img { width: 100%; height: 100%; object-fit: contain; }
        .company-name { font-weight: 700; color: #2c3e50; }

        .onboarding-section-title {
          color: #2c3e50;
          font-weight: 700;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .modern-tab {
            min-width: 110px;
            height: 55px;
            padding: 0.4rem 0.9rem;
          }
          
          .tab-label {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 768px) {
          .modern-tab {
            min-width: 100px;
            height: 50px;
            padding: 0.35rem 0.8rem;
          }
          
          .tab-label {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 576px) {
          .tab-navigation {
            flex-wrap: wrap;
          }
          
          .modern-tab {
            min-width: auto;
            height: 45px;
            flex-direction: row;
            justify-content: center;
            padding: 0.5rem 0.8rem;
          }
        }

        /* Notification Icon Styles */
        .notification-icon {
          position: relative;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          transition: all 0.3s ease;
        }

        .notification-icon:hover {
          background-color: rgba(108, 117, 125, 0.1);
          transform: translateY(-2px);
        }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          border: 2px solid white;
        }

        /* Notification Dropdown Styles */
        .notification-container {
          position: relative;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
          border-radius: 12px;
          z-index: 1050;
          margin-top: 0;
          animation: slideDown 0.14s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notification-dropdown-header {
          padding: 1rem 1.125rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(74, 144, 226, 0.02);
          border-radius: 12px 12px 0 0;
        }

        .notification-count-badge {
          background: #dc3545;
          color: white;
          border-radius: 12px;
          padding: 0.25rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
          line-height: 1;
        }

        .notification-dropdown-content {
          max-height: 360px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(74, 144, 226, 0.3) transparent;
        }
        
        .notification-dropdown-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .notification-dropdown-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .notification-dropdown-content::-webkit-scrollbar-thumb {
          background: rgba(74, 144, 226, 0.3);
          border-radius: 3px;
        }
        
        .notification-dropdown-content::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 144, 226, 0.5);
        }

        .notification-dropdown-item {
          padding: 0.875rem;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .notification-dropdown-item:hover {
          background: rgba(74, 144, 226, 0.04);
        }
        
        .notification-dropdown-item:last-child {
          border-bottom: none;
        }

        .notification-dropdown-item.unread {
          background: rgba(74, 144, 226, 0.03);
        }

        .notification-dropdown-item.unread:hover {
          background: rgba(74, 144, 226, 0.08);
        }
        
        .notification-dot {
          width: 8px;
          height: 8px;
          background: #4a90e2;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notification-icon-small {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .notification-dropdown-footer {
          padding: 0.625rem;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          text-align: center;
          background: rgba(0, 0, 0, 0.01);
          border-radius: 0 0 12px 12px;
        }


        /* Message List Styles */
        .messages-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .message-item {
          background: rgba(248, 249, 250, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .message-item:hover {
          background: rgba(248, 249, 250, 1);
          border-color: rgba(0, 123, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .message-item.selected {
          background: rgba(0, 123, 255, 0.05);
          border-color: rgba(0, 123, 255, 0.3);
        }

        .message-item.unread {
          border-left: 4px solid #007bff;
          background: rgba(0, 123, 255, 0.02);
        }

        .message-item.unread.selected {
          background: rgba(0, 123, 255, 0.08);
        }

        .notification-controls {
          background: rgba(248, 249, 250, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 1rem;
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Timeline Styles */
        .timeline {
          position: relative;
          padding-left: 2rem;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 1rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e9ecef;
        }

        .timeline-item {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .timeline-marker {
          position: absolute;
          left: -2rem;
          top: 0.25rem;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: white;
          border: 2px solid #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .timeline-item.completed .timeline-marker {
          border-color: #28a745;
          background: #28a745;
        }

        .timeline-item.active .timeline-marker {
          border-color: #ffc107;
          background: #ffc107;
        }

        .timeline-content {
          padding-left: 1rem;
        }

        .message-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        /* Notifications Container Styles */
        .notifications-container {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-item {
          background: rgba(248, 249, 250, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          transition: all 0.3s ease;
        }

        .notification-item:hover {
          background: rgba(248, 249, 250, 1);
          border-color: rgba(0, 123, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .notification-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        /* Status Display Styles */
        .status-display {
          background: rgba(248, 249, 250, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .status-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 193, 7, 0.1);
          border: 2px solid #ffc107;
        }

        .status-message {
          background: rgba(248, 249, 250, 0.9);
          border-left: 4px solid #ffc107;
        }

        .next-step {
          background: rgba(13, 202, 240, 0.05);
          border-left: 4px solid #0dcaf0;
        }

        .status-legend {
          font-size: 0.9rem;
        }

        .status-legend .fa-icon {
          width: 16px;
          text-align: center;
        }

        /* Enhanced Timeline Styles */
        .timeline-item.completed .timeline-marker {
          background: #28a745;
          border-color: #28a745;
          color: white;
        }

        .timeline-item.active .timeline-marker {
          background: #ffc107;
          border-color: #ffc107;
          color: white;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
          }
        }

        /* Application Summary Modal Styles */
        .application-summary .table td {
          padding: 0.5rem 0.75rem;
          vertical-align: middle;
        }

        .application-summary .table td:first-child {
          width: 40%;
          color: #6c757d;
        }

        .application-summary .table td:last-child {
          font-weight: 500;
        }

        .application-summary .badge {
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
        }

        /* Onboarding Sub-Navigation Styles */
        .onboarding-subnav {
          display: flex;
          gap: 0.5rem;
          background: rgba(248, 249, 250, 0.95);
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          flex-wrap: wrap;
        }

        .subnav-item {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #495057;
        }

        .subnav-item:hover {
          background: rgba(74, 144, 226, 0.08);
          border-color: rgba(74, 144, 226, 0.3);
          color: #4a90e2;
          transform: translateY(-2px);
        }

        .subnav-item.active {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-color: #4a90e2;
          color: white;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .subnav-item.active:hover {
          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);
          transform: translateY(-2px);
        }

        /* Orientation Info Styles */
        .orientation-info-section {
          position: relative;
        }

        .info-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(248, 249, 250, 0.8);
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 1.1rem;
        }

        .info-item {
          transition: all 0.3s ease;
        }

        .info-item:hover {
          transform: translateX(5px);
        }

        .info-item label {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Checklist Styles */
        .checklist-items {
          max-height: 400px;
          overflow-y: auto;
        }

        .checklist-item {
          background: rgba(248, 249, 250, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .checklist-item:hover {
          background: rgba(248, 249, 250, 0.9);
          border-color: rgba(74, 144, 226, 0.3);
          transform: translateX(5px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .checklist-item-completed {
          background: rgba(40, 167, 69, 0.05);
          border-color: rgba(40, 167, 69, 0.2);
        }

        .checklist-item-completed:hover {
          background: rgba(40, 167, 69, 0.1);
          border-color: rgba(40, 167, 69, 0.3);
        }

        .checklist-item-pending {
          background: rgba(248, 249, 250, 0.5);
          border-color: rgba(0, 0, 0, 0.05);
        }

        .checklist-icon {
          font-size: 1.2rem;
        }

        .checklist-badge {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Custom Checkbox Styling */
        .checklist-item .form-check-input {
          border-width: 2px;
          border-color: #6c757d;
        }

        .checklist-item .form-check-input:checked {
          background-color: #28a745;
          border-color: #28a745;
        }

        .checklist-item .form-check-input:hover {
          border-color: #4a90e2;
        }

        /* Smooth Animations */
        .modern-tab,
        .tab-indicator {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Scrolling Enhancements */
        .main-content {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .main-content::-webkit-scrollbar {
          width: 8px;
        }

        .main-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .main-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .main-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Ensure content doesn't get cut off */
        .container-fluid {
          min-height: 100%;
        }

        /* Mobile responsiveness for scrolling */
        @media (max-width: 768px) {
          .main-content {
            height: calc(100vh - 100px);
            padding-bottom: 1rem;
          }
        }
        `}</style>
        </div>
      </div>
    </>
  );
};

export default PersonalOnboarding;

// Interview Tab Styles
const interviewStyles = `
  /* Interview Header Card */
  .interview-header-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  /* Loading Container */
  .interview-loading-container {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #e9ecef;
  }

  /* Empty State */
  .interview-empty-state {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 3rem 2rem;
    border: 1px solid #e9ecef;
  }

  .interview-empty-icon {
    font-size: 4rem;
    color: #6c757d;
    opacity: 0.5;
  }

  /* Interview Card */
  .interview-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    border: 1px solid #e9ecef;
  }

  .interview-card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1.5rem;
    color: white;
  }

  .interview-icon-wrapper {
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;
    font-size: 1.2rem;
  }

  .interview-status-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .interview-card-body {
    padding: 2rem;
  }

  /* Interview Details Grid */
  .interview-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .interview-detail-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #e9ecef;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .section-title {
    color: #495057;
    font-weight: 700;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    border-bottom: 2px solid #667eea;
    padding-bottom: 0.5rem;
    display: flex;
    align-items: center;
  }

  .detail-items {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e9ecef;
    transition: all 0.2s ease;
  }

  .detail-item:hover {
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    border-color: #667eea;
  }

  .detail-icon {
    width: 45px;
    height: 45px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  }

  .detail-content {
    flex: 1;
    min-width: 0;
  }

  .detail-content label {
    display: block;
    font-size: 0.8rem;
    color: #6c757d;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.2;
  }

  .detail-content span {
    display: block;
    font-weight: 700;
    color: #2c3e50;
    font-size: 1rem;
    line-height: 1.4;
    word-wrap: break-word;
  }

  /* Notes Section */
  .interview-notes-section {
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .notes-content {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #bbdefb;
    color: #495057;
    font-style: italic;
  }

  /* Feedback Section */
  .interview-feedback-section {
    background: #e8f5e8;
    border-left: 4px solid #4caf50;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .feedback-content {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #c8e6c9;
    color: #495057;
  }

  /* Tips Section */
  .interview-tips-section {
    background: #fff3e0;
    border-left: 4px solid #ff9800;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .tips-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .tip-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #ffcc80;
    font-size: 0.9rem;
    color: #495057;
  }

  .tip-icon {
    color: #4caf50;
    font-size: 0.9rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .interview-details-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .tips-grid {
      grid-template-columns: 1fr;
    }

    .interview-header-card .d-flex {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start !important;
    }

    .interview-card-header .d-flex {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start !important;
    }

    .interview-status-badge {
      align-self: flex-start;
    }
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = interviewStyles;
  document.head.appendChild(styleSheet);
}
