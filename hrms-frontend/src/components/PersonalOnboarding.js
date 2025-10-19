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
  faSpinner,
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
  faInfoCircle,
  faFileUpload,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';

const PersonalOnboarding = () => {
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({});
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });
  
  // New state for multi-page system
  const [currentPage, setCurrentPage] = useState('application-status');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Tab visibility logic based on application status
  const getAvailableTabs = () => {
    const tabs = ['application-status'];
    
    // Check if applicant has been offered a job or rejected
    const hasOffer = onboardingData?.status_history?.some(s => s.status === 'Offered');
    const hasRejection = onboardingData?.status_history?.some(s => s.status === 'Rejected');
    
    if (hasOffer || hasRejection) {
      tabs.push('offer');
    }
    
    // Check if applicant has accepted offer and HR has set interview schedule
    const hasAcceptedOffer = onboardingData?.status_history?.some(s => s.status === 'Accepted');
    const hasInterviewScheduled = onboardingData?.interview;
    
    if (hasAcceptedOffer && hasInterviewScheduled) {
      tabs.push('interview');
    }
    
    // Check if HR has accepted the applicant (moved to onboarding)
    const hasOnboarding = onboardingData?.status_history?.some(s => s.status === 'Onboarding' || s.status === 'Hired');
    
    if (hasOnboarding) {
      tabs.push('onboarding');
    }
    
    return tabs;
  };
  
  const availableTabs = getAvailableTabs();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [profileData, setProfileData] = useState({
    address: '',
    contactNo: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

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

  const confirmAcceptOffer = () => {
    // Update local state to reflect accepted offer
    setOnboardingData(prev => ({
      ...prev,
      offer: {
        ...prev.offer,
        status: 'accepted',
        accepted_date: new Date().toISOString()
      },
      status_history: prev.status_history.map(step => 
        step.status === 'Offered' ? { ...step, status: 'Accepted', date: new Date().toISOString(), completed: true } : step
      )
    }));
    
    setShowOfferModal(false);
    showToast('success', 'Offer Accepted', 'You have successfully accepted the job offer!');
  };

  const confirmDeclineOffer = () => {
    // Update local state to reflect declined offer
    setOnboardingData(prev => ({
      ...prev,
      offer: {
        ...prev.offer,
        status: 'declined',
        declined_date: new Date().toISOString()
      },
      status_history: prev.status_history.map(step => 
        step.status === 'Offered' ? { ...step, status: 'Declined', date: new Date().toISOString(), completed: true } : step
      )
    }));
    
    setShowDeclineModal(false);
    showToast('info', 'Offer Declined', 'You have declined the job offer.');
  };

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const response = await axios.get(`http://localhost:8000/api/onboarding-records/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnboardingData(response.data);
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      // Mock data with comprehensive application and onboarding information
      setOnboardingData({
        id: 1,
        employee_name: 'John Doe',
        employee_email: 'john.doe@company.com',
        position: 'Senior Software Developer',
        department: 'Engineering',
        status: 'onboarding',
        application_status: 'Onboarding',
        application_id: 'APP-2025-001',
        date_applied: '2025-01-05',
        start_date: '2025-01-15',
        official_starting_date: '2025-01-20',
        orientation_date: '2025-01-18',
        orientation_time: '09:00 AM',
        orientation_location: 'Main Conference Room',
        
        // Application Status History
        status_history: [
          { status: 'Pending', date: '2025-01-05', completed: true },
          { status: 'Shortlisted', date: '2025-01-08', completed: true },
          { status: 'Interview', date: '2025-01-12', completed: true },
          { status: 'Offered', date: '2025-01-15', completed: true },
          { status: 'Accepted', date: '2025-01-16', completed: true },
          { status: 'Onboarding', date: '2025-01-17', completed: false, current: true },
          { status: 'Hired', date: null, completed: false }
        ],
        
        // Interview Details
        interview: {
          date: '2025-01-12',
          time: '2:00 PM',
          interviewer: 'Sarah Johnson',
          mode: 'In-person',
          location: 'Conference Room A',
          status: 'completed',
          notes: 'Interview went well. Strong technical skills demonstrated.'
        },
        
        // Offer Details
        offer: {
          position: 'Senior Software Developer',
          salary: '$75,000',
          start_date: '2025-01-20',
          benefits: 'Health Insurance, 401k, PTO',
          status: 'accepted',
          accepted_date: '2025-01-16'
        },
        
        // HR Notes/Messages
        hr_messages: [
          {
            date: '2025-01-08',
            message: 'Congratulations! You have been shortlisted for the Senior Software Developer position.',
            type: 'info'
          },
          {
            date: '2025-01-10',
            message: 'Your interview is scheduled for January 12, 2025, at 2:00 PM in Conference Room A.',
            type: 'info'
          },
          {
            date: '2025-01-15',
            message: 'We are pleased to offer you the Senior Software Developer position. Please review the offer details.',
            type: 'success'
          },
          {
            date: '2025-01-17',
            message: 'Welcome to the team! Please complete your onboarding documents to get started.',
            type: 'success'
          }
        ],
        
        // Compensation Details
        compensation: {
          rate_type: 'Monthly',
          rate_amount: '$75,000',
          pay_schedule: 'Bi-monthly',
          payment_mode: 'Bank Transfer',
          bank_details: {
            bank_name: 'Chase Bank',
            account_number: '****1234',
            routing_number: '021000021',
            account_holder: 'John Doe'
          }
        },
        
        // Benefits Enrollment
        benefits: {
          sss: {
            enrolled: true,
            registration_number: 'SSS-123456789',
            status: 'Active',
            effective_date: '2025-01-20'
          },
          philhealth: {
            enrolled: true,
            registration_number: 'PH-987654321',
            status: 'Active',
            effective_date: '2025-01-20'
          },
          pagibig: {
            enrolled: true,
            registration_number: 'PAG-456789123',
            status: 'Active',
            effective_date: '2025-01-20'
          },
          hmo: {
            enrolled: false,
            registration_number: null,
            status: 'Pending HR',
            effective_date: null,
            notes: 'HMO enrollment will be processed after first month of employment'
          }
        },
        
        // Profile Completion
        profile_completion: {
          personal_info: 100,
          contact_details: 100,
          emergency_contact: 100,
          bank_details: 100,
          documents: 85,
          benefits: 75,
          overall: 90
        },
        
        // Notifications History
        notifications_history: [
          {
            id: 1,
            type: 'success',
            title: 'Document Approved',
            message: 'Your Educational Certificate has been approved by HR.',
            date: '2025-01-12T14:30:00Z',
            read: true,
            icon: faCheckCircle
          },
          {
            id: 2,
            type: 'warning',
            title: 'Document Rejected',
            message: 'Your Employment Contract needs to be resubmitted. Please ensure all signatures are clear.',
            date: '2025-01-13T10:20:00Z',
            read: true,
            icon: faExclamationTriangle
          },
          {
            id: 3,
            type: 'info',
            title: 'Benefits Enrollment',
            message: 'Your SSS, PhilHealth, and Pag-IBIG enrollment has been processed successfully.',
            date: '2025-01-15T09:15:00Z',
            read: true,
            icon: faShieldAlt
          },
          {
            id: 4,
            type: 'success',
            title: 'Onboarding Complete',
            message: 'Congratulations! You have completed all onboarding requirements.',
            date: '2025-01-18T16:45:00Z',
            read: false,
            icon: faTrophy
          }
        ],
        documents: [
          { 
            id: 1,
            name: 'Government ID Copy', 
            status: 'not_submitted', 
            required: true,
            description: 'Valid government-issued ID (Driver\'s License, Passport, etc.)',
            uploaded_at: null,
            icon: faIdCard,
            rejection_reason: null
          },
          { 
            id: 2,
            name: 'Educational Certificate', 
            status: 'approved', 
            required: true,
            description: 'Copy of highest educational attainment',
            uploaded_at: '2025-01-10T10:00:00Z',
            approved_at: '2025-01-12T14:30:00Z',
            icon: faGraduationCap,
            rejection_reason: null
          },
          { 
            id: 3,
            name: 'Medical Certificate', 
            status: 'pending_review', 
            required: true,
            description: 'Medical clearance from company-approved clinic',
            uploaded_at: '2025-01-11T09:15:00Z',
            icon: faStethoscope,
            rejection_reason: null
          },
          { 
            id: 4,
            name: 'Employment Contract', 
            status: 'rejected', 
            required: true,
            description: 'Signed employment contract',
            uploaded_at: '2025-01-09T16:45:00Z',
            rejected_at: '2025-01-13T10:20:00Z',
            icon: faFileContract,
            rejection_reason: 'Contract signature is not clear. Please ensure all signatures are legible and dated.'
          },
          { 
            id: 5,
            name: 'NBI Clearance', 
            status: 'not_submitted', 
            required: true,
            description: 'Valid NBI Clearance (not more than 6 months old)',
            uploaded_at: null,
            icon: faShieldAlt,
            rejection_reason: null
          },
          { 
            id: 6,
            name: 'SSS ID/UMID', 
            status: 'not_submitted', 
            required: true,
            description: 'SSS ID or UMID card copy',
            uploaded_at: null,
            icon: faIdCard,
            rejection_reason: null
          }
        ],
        progress: {
          documents_completed: 1,
          total_documents: 6
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event, documentId) => {
    const file = event.target.files[0];
    if (file) {
    const validation = validateDocumentUpload(file);
      if (validation.isValid) {
        setSelectedFile(file);
        setSelectedDocument(documentId);
      setUploadErrors({});
      } else {
        setUploadErrors({ [documentId]: validation.error });
        showToast('error', 'Upload Error', validation.error);
      }
    }
  };

  const handleFileUpload = (event, documentName) => {
    const file = event.target.files[0];
    if (file) {
      const validation = validateDocumentUpload(file);
      if (validation.isValid) {
        setSelectedFile(file);
        setSelectedDocument(documentName);
        setUploadErrors({});
      } else {
        setUploadErrors({ [documentName]: validation.error });
        showToast('error', 'Upload Error', validation.error);
      }
    }
  };

  const handleDocumentUpload = async (documentId) => {
    if (!selectedFile) {
      showToast('error', 'No File Selected', 'Please select a file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('document_id', documentId);

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/onboarding/documents/upload', formData, {
          headers: { 
          'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
      });

      if (response.data.success) {
        showToast('success', 'Upload Successful', 'Document uploaded successfully and is under review.');
      setSelectedFile(null);
      setSelectedDocument(null);
        fetchOnboardingData(); // Refresh data
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Upload Failed', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };


  if (loading) {
    return <OnboardingLoading />;
  }

  if (!onboardingData) {
    return (
      <div className="container-fluid p-4">
        <div className="row">
          <div className="col-12">
            <Alert variant="danger">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Failed to load onboarding data. Please try again later.
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Navigation component
  const NavigationTabs = () => (
    <div className="row mb-4" style={{ position: 'sticky', top: '0', zIndex: '1001' }}>
      <div className="col-12">
        <div className="modern-tab-container">
          <div className="tab-navigation">
            <button 
              className={`modern-tab ${currentPage === 'application-status' ? 'active' : ''}`}
              onClick={() => setCurrentPage('application-status')}
            >
              <FontAwesomeIcon icon={faChartLine} className="tab-icon" />
              <span className="tab-label">Application Status</span>
              <div className="tab-indicator"></div>
            </button>
            {availableTabs.includes('interview') && (
              <button 
                className={`modern-tab ${currentPage === 'interview' ? 'active' : ''}`}
                onClick={() => setCurrentPage('interview')}
              >
                <FontAwesomeIcon icon={faUserTie} className="tab-icon" />
                <span className="tab-label">Interview Schedule</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('offer') && (
              <button 
                className={`modern-tab ${currentPage === 'offer' ? 'active' : ''}`}
                onClick={() => setCurrentPage('offer')}
              >
                <FontAwesomeIcon icon={faGift} className="tab-icon" />
                <span className="tab-label">Offer Letter</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('onboarding') && (
              <button 
                className={`modern-tab ${currentPage === 'onboarding' ? 'active' : ''}`}
                onClick={() => setCurrentPage('onboarding')}
              >
                <FontAwesomeIcon icon={faRocket} className="tab-icon" />
                <span className="tab-label">Onboarding</span>
                <div className="tab-indicator"></div>
              </button>
            )}
            {availableTabs.includes('onboarding') && (
              <button 
                className={`modern-tab ${currentPage === 'progress' ? 'active' : ''}`}
                onClick={() => setCurrentPage('progress')}
              >
                <FontAwesomeIcon icon={faTrophy} className="tab-icon" />
                <span className="tab-label">Progress Tracker</span>
                <div className="tab-indicator"></div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

   // Application Status Page
   const ApplicationStatusPage = () => (
     <div className="container-fluid p-0">

       {/* Congratulations Message */}
       <div className="container-fluid px-4 mb-4">
         <div className="onboarding-gradient-bg p-4 rounded-4 onboarding-fade-in-up">
           <div className="row align-items-center">
             <div className="col-md-8">
               <div className="d-flex align-items-center mb-3">
                 <div className="onboarding-icon-wrapper me-4" style={{ 
                   width: '80px', 
                   height: '80px',
                   backgroundColor: 'rgba(255, 255, 255, 0.2)',
                   backdropFilter: 'blur(10px)'
                 }}>
                   <FontAwesomeIcon icon={faGift} size="2x" style={{ color: 'white' }} />
                 </div>
                 <div>
                   <h2 className="onboarding-welcome-title mb-2" style={{ 
                     fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                     fontWeight: '700',
                     marginLeft: '-10px'
                   }}>
                     {onboardingData?.status_history?.find(s => s.status === 'Pending') 
                       ? 'Application Submitted Successfully!'
                       : 'Congratulations! You\'ve been moved to the Onboarding Stage.'
                     }
                   </h2>
                   <p className="onboarding-welcome-subtitle mb-0" style={{ 
                     fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                     marginLeft: '-10px'
                   }}>
                     {onboardingData?.status_history?.find(s => s.status === 'Pending') 
                       ? 'Your application is now under review. We will notify you of any updates or next steps.'
                       : 'Please complete the steps below to start your employment process at <strong>CCDC</strong>.'
                     }
                   </p>
                 </div>
               </div>
               
               {/* HR Message */}
               <div className="onboarding-glass-card p-3 mb-3">
                 <div className="d-flex align-items-start">
                   <FontAwesomeIcon icon={faUserTie} className="me-3 mt-1 text-white" />
                   <div>
                     <h6 className="text-white mb-2">Message from HR</h6>
                     <p className="text-white-50 mb-2">
                       {onboardingData?.status_history?.find(s => s.status === 'Pending') 
                         ? 'Thank you for your application! Our HR team is currently reviewing your submission. We will notify you of any updates or next steps.'
                         : 'Welcome to CCDC! We\'re excited to have you join our team. Please complete all required documents and steps to finalize your employment.'
                       }
                     </p>
                     <small className="text-white-50">
                       {onboardingData?.status_history?.find(s => s.status === 'Pending') 
                         ? `Application submitted: ${onboardingData?.date_applied ? new Date(onboardingData.date_applied).toLocaleDateString() : 'N/A'}`
                         : 'Date moved to onboarding: January 15, 2025'
                       }
                     </small>
                   </div>
                 </div>
               </div>
               
               <div className="d-flex gap-3">
                 {onboardingData?.status_history?.find(s => s.status === 'Pending') ? (
                   <>
                     <button className="btn btn-outline-light btn-lg px-4" onClick={() => setShowApplicationModal(true)}>
                       <FontAwesomeIcon icon={faEye} className="me-2" />
                       View Application
                     </button>
                     <button className="btn btn-outline-light btn-lg px-4">
                       <FontAwesomeIcon icon={faClock} className="me-2" />
                       Check Status
                     </button>
                   </>
                 ) : (
                   <>
                     <button className="btn btn-success btn-lg px-4">
                       <FontAwesomeIcon icon={faEye} className="me-2" />
                       View Requirements
                     </button>
                     <button className="btn btn-outline-light btn-lg px-4">
                       <FontAwesomeIcon icon={faClipboardCheck} className="me-2" />
                       Start Onboarding
                     </button>
                   </>
                 )}
               </div>
             </div>
             <div className="col-md-4 text-center">
               <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
                 width: '120px', 
                 height: '120px', 
                 margin: '0 auto',
                 backgroundColor: 'rgba(255, 255, 255, 0.2)'
               }}>
                 <FontAwesomeIcon icon={faTrophy} size="3x" style={{ color: 'white' }} />
               </div>
             </div>
           </div>
         </div>
       </div>

       <div className="container-fluid px-4">
         {/* Application Overview Cards */}
         <div className="row mb-4">
           <div className="col-lg-4 col-md-6 mb-3">
             <div className="onboarding-modern-card h-100">
               <div className="p-4">
                 <div className="d-flex align-items-center mb-3">
                   <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
                     <FontAwesomeIcon icon={faBriefcase} />
                   </div>
                   <div>
                     <h6 className="mb-1 fw-bold">Position Applied</h6>
                     <p className="text-muted mb-0 small">Job Title & Department</p>
                   </div>
                 </div>
                 <h5 className="fw-bold mb-2" style={{ color: 'var(--onboarding-primary)' }}>
                   {onboardingData.position}
                 </h5>
                 <p className="text-muted mb-0">{onboardingData.department} Department</p>
               </div>
             </div>
           </div>
           
           <div className="col-lg-4 col-md-6 mb-3">
             <div className="onboarding-modern-card h-100">
               <div className="p-4">
                 <div className="d-flex align-items-center mb-3">
                   <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                     <FontAwesomeIcon icon={faCalendarAlt} />
                   </div>
                   <div>
                     <h6 className="mb-1 fw-bold">Application Date</h6>
                     <p className="text-muted mb-0 small">When you applied</p>
                   </div>
                 </div>
                 <h5 className="fw-bold mb-2" style={{ color: 'var(--onboarding-success)' }}>
                   {new Date(onboardingData.date_applied).toLocaleDateString('en-US', { 
                     weekday: 'long', 
                     year: 'numeric', 
                     month: 'long', 
                     day: 'numeric' 
                   })}
                 </h5>
                 <p className="text-muted mb-0">Application ID: #{onboardingData.application_id}</p>
               </div>
             </div>
           </div>
           
           <div className="col-lg-4 col-md-6 mb-3">
             <div className="onboarding-modern-card h-100">
               <div className="p-4">
                 <div className="d-flex align-items-center mb-3">
                   <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                     <FontAwesomeIcon icon={faUser} />
                   </div>
                   <div>
                     <h6 className="mb-1 fw-bold">Current Status</h6>
                     <p className="text-muted mb-0 small">Latest update</p>
                   </div>
                 </div>
                 <h5 className="fw-bold mb-2" style={{ color: 'var(--onboarding-primary)' }}>
                   {onboardingData.status_history.find(s => s.current)?.status || onboardingData.status_history[onboardingData.status_history.length - 1]?.status}
                 </h5>
                 <p className="text-muted mb-0">
                   {onboardingData.status_history.find(s => s.current) ? 'In Progress' : 'Completed'}
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Status Progress Tracker */}
         <div className="onboarding-modern-card mb-4">
           <div className="p-4">
             <div className="d-flex align-items-center mb-4">
               <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
                 <FontAwesomeIcon icon={faChartLine} />
               </div>
               <div>
                 <h4 className="onboarding-section-title mb-1">Application Progress Tracker</h4>
                 <p className="text-muted mb-0">Visual timeline of your application journey</p>
               </div>
             </div>
             
             <div className="status-tracker">
               {onboardingData.status_history.map((step, index) => (
                 <div key={index} className={`status-step ${step.completed ? 'completed' : step.current ? 'current' : 'pending'}`}>
                   <div className="status-icon">
                     <FontAwesomeIcon icon={
                       step.status === 'Pending' ? faClock :
                       step.status === 'Applied' ? faClock :
                       step.status === 'Shortlisted' ? faStar :
                       step.status === 'Interview' ? faUserTie :
                       step.status === 'Offered' ? faGift :
                       step.status === 'Accepted' ? faCheckCircle :
                       step.status === 'Onboarding' ? faRocket :
                       faTrophy
                     } />
                   </div>
                   <div className="status-label">{step.status}</div>
                   <div className="status-date">
                     {step.completed ? new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                      step.current ? 'In Progress' : 'Pending'}
                   </div>
                 </div>
               ))}
             </div>
           </div>
         </div>

         {/* HR Messages & Feedback */}
         {onboardingData.hr_messages && onboardingData.hr_messages.length > 0 && (
           <div className="onboarding-modern-card mb-4">
             <div className="p-4">
               <div className="d-flex align-items-center mb-4">
                 <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                   <FontAwesomeIcon icon={faEnvelope} />
                 </div>
                 <div>
                   <h4 className="onboarding-section-title mb-1">HR Messages & Feedback</h4>
                   <p className="text-muted mb-0">Important updates and communications from HR</p>
                 </div>
               </div>
               
               <div className="row">
                 {onboardingData.hr_messages.map((message, index) => (
                   <div key={index} className="col-12 mb-3">
                     <div className={`onboarding-glass-card p-3 ${message.type === 'success' ? 'border-success' : message.type === 'info' ? 'border-info' : 'border-warning'}`} 
                          style={{ borderLeft: `4px solid ${message.type === 'success' ? 'var(--onboarding-success)' : message.type === 'info' ? '#17a2b8' : 'var(--onboarding-warning)'}` }}>
                       <div className="d-flex align-items-start">
                         <div className="onboarding-icon-wrapper me-3" style={{ 
                           width: '32px', 
                           height: '32px',
                           backgroundColor: message.type === 'success' ? 'var(--onboarding-success)' : message.type === 'info' ? '#17a2b8' : 'var(--onboarding-warning)'
                         }}>
                           <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '0.8rem' }} />
                         </div>
                         <div className="flex-grow-1">
                           <p className="mb-2 fw-semibold">{message.message}</p>
                           <small className="text-muted">
                             <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                             {new Date(message.date).toLocaleDateString('en-US', { 
                               weekday: 'short', 
                               year: 'numeric', 
                               month: 'short', 
                               day: 'numeric' 
                             })}
                           </small>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         )}

         {/* Action Buttons */}
         <div className="onboarding-modern-card">
           <div className="p-4">
             <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
               <button className="btn btn-primary btn-lg px-5 py-3">
                 <FontAwesomeIcon icon={faEye} className="me-2" />
                 <span className="d-none d-sm-inline">View Application Details</span>
                 <span className="d-sm-none">View Details</span>
               </button>
               <button className="btn btn-outline-danger btn-lg px-5 py-3">
                 <FontAwesomeIcon icon={faTimes} className="me-2" />
                 <span className="d-none d-sm-inline">Withdraw Application</span>
                 <span className="d-sm-none">Withdraw</span>
               </button>
             </div>
           </div>
         </div>
       </div>
     </div>
   );

  // Interview Schedule Page
  const InterviewSchedulePage = () => (
    <div className="row mb-5">
      <div className="col-12">
        <div className="onboarding-modern-card">
          <div className="p-4">
            <div className="d-flex align-items-center mb-4">
              <div className="onboarding-icon-wrapper onboarding-info-gradient me-3">
                <FontAwesomeIcon icon={faUserTie} />
              </div>
              <div>
                <h3 className="onboarding-section-title mb-1">Interview Schedule</h3>
                <p className="text-muted mb-0">Your interview details and confirmation</p>
              </div>
            </div>

          {onboardingData.interview && (
      <div className="row">
              <div className="col-md-8">
                <div className="onboarding-glass-card p-4 mb-4">
                  <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Interview Details
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Date:</strong></p>
                      <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {new Date(onboardingData.interview.date).toLocaleDateString()}
                      </p>
                      <p className="mb-2"><strong>Time:</strong></p>
                      <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {onboardingData.interview.time}
                      </p>
                      <p className="mb-2"><strong>Interviewer:</strong></p>
                      <p className="mb-0 text-muted">{onboardingData.interview.interviewer}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Mode:</strong></p>
                      <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {onboardingData.interview.mode}
                      </p>
                      <p className="mb-2"><strong>Location:</strong></p>
                      <p className="mb-3 text-muted">{onboardingData.interview.location}</p>
                      <p className="mb-2"><strong>Status:</strong></p>
                      <span className={`badge ${onboardingData.interview.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                        {onboardingData.interview.status === 'completed' ? 'Completed' : 'Scheduled'}
                      </span>
                    </div>
                  </div>
                  {onboardingData.interview.notes && (
                    <div className="mt-3">
                      <p className="mb-2"><strong>Notes:</strong></p>
                      <p className="text-muted mb-0">{onboardingData.interview.notes}</p>
                    </div>
                  )}
                </div>

                {onboardingData.interview.status !== 'completed' && (
                  <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3">
                    <button className="btn btn-success btn-lg px-4 py-2" onClick={() => setShowInterviewModal(true)}>
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      <span className="d-none d-sm-inline">Confirm Attendance</span>
                      <span className="d-sm-none">Confirm</span>
                    </button>
                    <button className="btn btn-outline-secondary btn-lg px-4 py-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      <span className="d-none d-sm-inline">Reschedule Request</span>
                      <span className="d-sm-none">Reschedule</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="col-md-4">
                <div className="bg-primary text-white p-4 rounded-3">
                  <h5 className="mb-3 text-white">
                    <FontAwesomeIcon icon={faLightbulb} className="me-2" style={{ color: 'white' }} />
                    Interview Tips
                  </h5>
                  <ul className="list-unstyled text-white">
                    <li className="mb-2 text-white">� Arrive 10-15 minutes early</li>
                    <li className="mb-2 text-white">� Bring a copy of your resume</li>
                    <li className="mb-2 text-white">� Prepare questions about the role</li>
                    <li className="mb-2 text-white">� Dress professionally</li>
                    <li className="text-white">� Follow up with a thank you email</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );

  // Offer Letter Page
  const OfferLetterPage = () => {
    const hasOffer = onboardingData?.status_history?.some(s => s.status === 'Offered');
    const hasRejection = onboardingData?.status_history?.some(s => s.status === 'Rejected');
    
    return (
      <div className="row mb-5">
        <div className="col-12">
          <div className="onboarding-modern-card">
            <div className="p-4">
              <div className="d-flex align-items-center mb-4">
                <div className="onboarding-icon-wrapper onboarding-success-gradient me-3">
                  <FontAwesomeIcon icon={faGift} />
                </div>
                <div>
                  <h3 className="onboarding-section-title mb-1">Job Offer</h3>
                  <p className="text-muted mb-0">Review and respond to your job offer</p>
                </div>
              </div>

            {/* HR Notification */}
            {hasOffer && (
              <div className="alert alert-success mb-4">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faBell} className="me-3" />
                  <div>
                    <h6 className="mb-1">?? Congratulations! You've been offered the position!</h6>
                    <p className="mb-0">HR has reviewed your application and would like to offer you the position. Please review the details below and respond accordingly.</p>
                  </div>
                </div>
              </div>
            )}

            {hasRejection && (
              <div className="alert alert-danger mb-4">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faTimes} className="me-3" />
                  <div>
                    <h6 className="mb-1">Application Update</h6>
                    <p className="mb-0">Thank you for your interest. Unfortunately, we have decided to move forward with other candidates at this time.</p>
                  </div>
                </div>
              </div>
            )}

          {onboardingData.offer && (
            <div className="row">
              <div className="col-md-8">
                <div className="onboarding-glass-card p-4 mb-4">
                  <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Offer Letter Preview
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Position:</strong></p>
                      <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {onboardingData.offer.position}
                      </p>
                      <p className="mb-2"><strong>Salary:</strong></p>
                      <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {onboardingData.offer.salary}
                      </p>
                      <p className="mb-2"><strong>Start Date:</strong></p>
                      <p className="mb-0 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                        {new Date(onboardingData.offer.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Benefits:</strong></p>
                      <p className="mb-3 text-muted">{onboardingData.offer.benefits}</p>
                      <p className="mb-2"><strong>Status:</strong></p>
                      <span className={`badge ${onboardingData.offer.status === 'accepted' ? 'bg-success' : 'bg-warning'}`}>
                        {onboardingData.offer.status === 'accepted' ? 'Accepted' : 'Pending Response'}
                      </span>
                      {onboardingData.offer.accepted_date && (
                        <div className="mt-3">
                          <p className="mb-0"><strong>Accepted:</strong> {new Date(onboardingData.offer.accepted_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {onboardingData.offer.status !== 'accepted' && onboardingData.offer.status !== 'declined' && (
                  <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3">
                    <button className="btn btn-success btn-lg px-4 py-2" onClick={handleAcceptOffer}>
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Accept Offer
                    </button>
                    <button className="btn btn-outline-danger btn-lg px-4 py-2" onClick={handleDeclineOffer}>
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Decline Offer
                    </button>
                  </div>
                )}
              </div>
              <div className="col-md-4">
                <div className="bg-success text-white p-4 rounded-3">
                  <h5 className="mb-3 text-white">
                    <FontAwesomeIcon icon={faTrophy} className="me-2" style={{ color: 'white' }} />
                    Congratulations!
                  </h5>
                  <p className="text-white">We're excited to have you join our team. Please review the offer details carefully before responding.</p>
                  <div className="mt-3">
                    <small className="text-white">
                      <strong className="text-white">Next Steps:</strong><br/>
                      � Accept the offer to begin onboarding<br/>
                      � Complete required documents<br/>
                      � Attend orientation session
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Document Upload Page
  const DocumentUploadPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faFileUpload} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Document Upload
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Upload required documents to complete your onboarding process
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faFileAlt} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Required Documents List */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faClipboardList} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Required Documents</h4>
                    <p className="text-muted mb-0">Upload the following documents to proceed with your onboarding</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="onboarding-glass-card p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0 fw-semibold">Document Completion Progress</h6>
                        <span className="onboarding-badge onboarding-badge-info">5 of 9 Completed</span>
                      </div>
                      <div className="progress mb-2" style={{ height: '12px', borderRadius: '6px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          role="progressbar" 
                          style={{ width: '55%' }}
                          aria-valuenow="55" 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        >
                          55%
                        </div>
                      </div>
                      <small className="text-muted">5 documents approved, 2 under review, 2 pending submission</small>
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    { name: 'Valid ID', description: 'Government-issued identification', required: true, status: 'pending' },
                    { name: 'Birth Certificate', description: 'Official birth certificate', required: true, status: 'submitted' },
                    { name: 'NBI Clearance', description: 'National Bureau of Investigation clearance', required: true, status: 'approved' },
                    { name: 'Medical Certificate', description: 'Health clearance certificate', required: true, status: 'rejected' },
                    { name: 'Educational Transcript', description: 'Official transcript of records', required: true, status: 'pending' },
                    { name: 'SSS Number', description: 'Social Security System number', required: true, status: 'submitted' },
                    { name: 'PhilHealth Number', description: 'Philippine Health Insurance Corporation number', required: true, status: 'approved' },
                    { name: 'Pag-IBIG Number', description: 'Home Development Mutual Fund number', required: true, status: 'pending' },
                    { name: 'TIN Number', description: 'Tax Identification Number', required: true, status: 'submitted' }
                  ].map((doc, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-4">
                      <div className="onboarding-document-card">
                        <div className="d-flex align-items-center mb-3">
                          <div className="onboarding-icon-wrapper me-3" style={{ 
                            width: '50px', 
                            height: '50px',
                            backgroundColor: 'var(--onboarding-primary)'
                          }}>
                            <FontAwesomeIcon icon={faFileAlt} style={{ color: 'white', fontSize: '1.2rem' }} />
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-semibold">{doc.name}</h6>
                            <p className="text-muted small mb-0">{doc.description}</p>
                            {doc.required && (
                              <span className="onboarding-badge onboarding-badge-danger">Required</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">Status:</label>
                          <div className="d-flex align-items-center">
                            <span className={`onboarding-badge me-2 ${
                              doc.status === 'approved' ? 'onboarding-badge-success' :
                              doc.status === 'rejected' ? 'onboarding-badge-danger' :
                              doc.status === 'submitted' ? 'onboarding-badge-info' : 'onboarding-badge-warning'
                            }`}>
                              {doc.status === 'approved' ? 'Approved' :
                               doc.status === 'rejected' ? 'Rejected' :
                               doc.status === 'submitted' ? 'Submitted' : 'Pending'}
                            </span>
                            <small className="text-muted">
                              {doc.status === 'approved' ? 'Document approved' :
                               doc.status === 'rejected' ? 'Please resubmit' :
                               doc.status === 'submitted' ? 'Under review' : 'Not uploaded'}
                            </small>
                          </div>
                        </div>
                        
                        {doc.status === 'pending' && (
                          <div className="mb-3">
                            <input 
                              type="file" 
                              className="form-control form-control-sm" 
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.name)}
                            />
                            <small className="text-muted">Accepted formats: PDF, JPG, PNG (Max 5MB)</small>
                          </div>
                        )}
                        
                        {doc.status === 'rejected' && (
                          <div className="mb-3">
                            <div className="alert alert-danger alert-sm p-2 mb-2">
                              <small><strong>Rejection Reason:</strong> Please upload a clearer copy of your document.</small>
                            </div>
                            <input 
                              type="file" 
                              className="form-control form-control-sm" 
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(e, doc.name)}
                            />
                            <small className="text-muted">Accepted formats: PDF, JPG, PNG (Max 5MB)</small>
                          </div>
                        )}
                        
                        <button 
                          className={`btn btn-sm w-100 ${
                            doc.status === 'approved' ? 'btn-success' :
                            doc.status === 'rejected' ? 'btn-warning' :
                            doc.status === 'submitted' ? 'btn-info' : 'btn-primary'
                          }`}
                          onClick={() => handleDocumentUpload(doc.name)}
                          disabled={doc.status === 'approved' || (doc.status !== 'rejected' && !selectedFile)}
                        >
                          <FontAwesomeIcon 
                            icon={
                              doc.status === 'approved' ? faCheckCircle :
                              doc.status === 'rejected' ? faUpload :
                              doc.status === 'submitted' ? faClock : faUpload
                            } 
                            className="me-1" 
                          />
                          {doc.status === 'approved' ? 'Document Approved' :
                           doc.status === 'rejected' ? 'Resubmit Document' :
                           doc.status === 'submitted' ? 'Under Review' : 'Upload Document'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-4">
                  <button className="btn btn-success btn-lg px-5">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Submit All Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Status Tracker */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faChartLine} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Document Status Tracker</h4>
                    <p className="text-muted mb-0">Track the approval status of your uploaded documents</p>
                  </div>
                </div>
                
                {/* Card List View */}
                <div className="row">
                  {[
                    { name: 'NBI Clearance', status: 'approved', uploadDate: '2025-01-15', remarks: '—' },
                    { name: 'Birth Certificate', status: 'rejected', uploadDate: '2025-01-14', remarks: 'Please upload a clearer copy' },
                    { name: 'Valid ID', status: 'submitted', uploadDate: '2025-01-13', remarks: 'Under review' },
                    { name: 'Educational Transcript', status: 'approved', uploadDate: '2025-01-12', remarks: '—' },
                    { name: 'SSS Number', status: 'submitted', uploadDate: '2025-01-11', remarks: 'Under review' },
                    { name: 'PhilHealth Number', status: 'approved', uploadDate: '2025-01-10', remarks: '—' },
                    { name: 'Pag-IBIG Number', status: 'pending', uploadDate: null, remarks: 'Not uploaded' },
                    { name: 'TIN Number', status: 'submitted', uploadDate: '2025-01-09', remarks: 'Under review' },
                    { name: 'Medical Certificate', status: 'rejected', uploadDate: '2025-01-08', remarks: 'Please upload a clearer copy' }
                  ].map((doc, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-3">
                      <div className="onboarding-glass-card p-3 onboarding-hover-lift">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon 
                              icon={faFileAlt} 
                              className={`me-2 ${
                                doc.status === 'approved' ? 'text-success' :
                                doc.status === 'rejected' ? 'text-danger' :
                                doc.status === 'submitted' ? 'text-info' : 'text-muted'
                              }`} 
                            />
                            <h6 className="mb-0 fw-semibold">{doc.name}</h6>
                          </div>
                          <span className={`onboarding-badge ${
                            doc.status === 'approved' ? 'onboarding-badge-success' :
                            doc.status === 'rejected' ? 'onboarding-badge-danger' :
                            doc.status === 'submitted' ? 'onboarding-badge-info' : 'onboarding-badge-warning'
                          }`}>
                            {doc.status === 'approved' ? 'Approved' :
                             doc.status === 'rejected' ? 'Rejected' :
                             doc.status === 'submitted' ? 'Under Review' : 'Pending'}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <small className="text-muted">
                            <strong>Upload Date:</strong> {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'Not uploaded'}
                          </small>
                        </div>
                        
                        <div className="mb-3">
                          <small className="text-muted">
                            <strong>Remarks:</strong> {doc.remarks}
                          </small>
                        </div>
                        
                        <div className="d-flex gap-1">
                          <button className="btn btn-outline-primary btn-sm flex-grow-1">
                            <FontAwesomeIcon icon={faEye} className="me-1" />
                            View
                          </button>
                          {doc.status === 'rejected' && (
                            <button className="btn btn-outline-warning btn-sm flex-grow-1">
                              <FontAwesomeIcon icon={faEdit} className="me-1" />
                              Resubmit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Orientation Details Page
  const OrientationDetailsPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faCalendarAlt} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Orientation Details
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Welcome to your company orientation session
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faUsers} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Orientation Information */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Orientation Schedule</h4>
                    <p className="text-muted mb-0">Your scheduled orientation session details</p>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                        Date & Time
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Date:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            Monday, January 20, 2025
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Time:</strong></p>
                          <p className="mb-0 text-muted">9:00 AM - 5:00 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                        Location
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Venue:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            CCDC Main Office
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Address:</strong></p>
                          <p className="mb-0 text-muted">123 Business District, Makati City, Metro Manila</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Topics Covered */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faListAlt} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Topics to be Covered</h4>
                    <p className="text-muted mb-0">What you'll learn during the orientation</p>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    'Company Overview & History',
                    'Mission, Vision & Values',
                    'Organizational Structure',
                    'Employee Handbook & Policies',
                    'Benefits & Compensation',
                    'Safety & Security Procedures',
                    'IT Systems & Tools',
                    'Q&A Session'
                  ].map((topic, index) => (
                    <div key={index} className="col-md-6 col-lg-4 mb-3">
                      <div className="onboarding-glass-card p-3">
                        <div className="d-flex align-items-center">
                          <div className="onboarding-icon-wrapper me-3" style={{ 
                            width: '32px', 
                            height: '32px',
                            backgroundColor: 'var(--onboarding-primary)'
                          }}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'white', fontSize: '0.8rem' }} />
                          </div>
                          <div>
                            <p className="mb-0 fw-semibold small">{topic}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="text-center">
                  <h5 className="mb-3">Confirm Your Attendance</h5>
                  <p className="text-muted mb-4">Please confirm your attendance for the orientation session</p>
                  
                  <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                    <button className="btn btn-success btn-lg px-5">
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Confirm Attendance
                    </button>
                    <button className="btn btn-outline-secondary btn-lg px-5">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Request Reschedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Profile Verification Page
  const ProfileVerificationPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faUser} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Profile Verification
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Verify and update your personal information
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faUserCheck} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Profile Information Form */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faEdit} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Personal Information</h4>
                    <p className="text-muted mb-0">Update your contact details and emergency information</p>
                  </div>
                </div>
                
                <form>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        defaultValue="John Michael Doe"
                        readOnly
                      />
                      <small className="text-muted">This information cannot be changed</small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        defaultValue="john.doe@email.com"
                        readOnly
                      />
                      <small className="text-muted">This information cannot be changed</small>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-12 mb-3">
                      <label className="form-label fw-semibold">Address</label>
                      <textarea 
                        className="form-control" 
                        rows="3" 
                        placeholder="Enter your complete address"
                        defaultValue="123 Main Street, Barangay San Antonio, Makati City, Metro Manila 1234"
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Contact Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        placeholder="Enter your contact number"
                        defaultValue="+63 912 345 6789"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Emergency Contact</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter emergency contact name"
                        defaultValue="Jane Doe (Mother)"
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Emergency Contact Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        placeholder="Enter emergency contact number"
                        defaultValue="+63 917 123 4567"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Relationship</label>
                      <select className="form-select">
                        <option value="mother">Mother</option>
                        <option value="father">Father</option>
                        <option value="spouse">Spouse</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="text-center mt-4">
                    <button type="submit" className="btn btn-success btn-lg px-5">
                      <FontAwesomeIcon icon={faSave} className="me-2" />
                      Confirm and Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Start Date Confirmation Page
  const StartDateConfirmationPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faCalendarCheck} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Start Date Confirmation
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Your official start date and work assignment details
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faBriefcase} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Start Date Information */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faCalendarCheck} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Official Start Date</h4>
                    <p className="text-muted mb-0">Your confirmed employment start date</p>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                        Start Date
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Date:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.2rem' }}>
                            Monday, January 27, 2025
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Time:</strong></p>
                          <p className="mb-0 text-muted">8:00 AM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                        Location
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Office:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            CCDC Main Office
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Address:</strong></p>
                          <p className="mb-0 text-muted">123 Business District, Makati City, Metro Manila</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Work Assignment */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faBriefcase} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Work Assignment</h4>
                    <p className="text-muted mb-0">Your assigned department and supervisor</p>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faBuilding} className="me-2" />
                        Department
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Department:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            Information Technology
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Position:</strong></p>
                          <p className="mb-0 text-muted">Software Developer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faUserTie} className="me-2" />
                        Supervisor
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Name:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            Maria Santos
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Title:</strong></p>
                          <p className="mb-0 text-muted">IT Manager</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Reminders */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-warning-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Important Reminders</h4>
                    <p className="text-muted mb-0">Please take note of these important details</p>
                  </div>
                </div>
                
                <div className="alert alert-warning border-0">
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon icon={faClock} className="me-3 mt-1" />
                    <div>
                      <h6 className="fw-semibold mb-2">Arrival Time</h6>
                      <p className="mb-2">Please arrive by <strong>8:00 AM</strong> at the main reception area.</p>
                      <p className="mb-2">Late arrivals may result in rescheduling your first day.</p>
                      <p className="mb-0">Bring a valid ID for security clearance.</p>
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-info border-0">
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-3 mt-1" />
                    <div>
                      <h6 className="fw-semibold mb-2">What to Bring</h6>
                      <ul className="mb-0">
                        <li>Valid government-issued ID</li>
                        <li>Completed onboarding documents</li>
                        <li>Emergency contact information</li>
                        <li>Bank account details for payroll setup</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Benefits & Payroll Info Page
  const BenefitsPayrollPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faHeartbeat} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Benefits & Payroll Info
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Your enrolled benefits and payroll information
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faDollarSign} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Government Benefits */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faShieldAlt} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Government Benefits</h4>
                    <p className="text-muted mb-0">Your enrolled government-mandated benefits</p>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    { name: 'SSS', description: 'Social Security System', status: 'enrolled', number: 'SSS-123456789' },
                    { name: 'PhilHealth', description: 'Philippine Health Insurance Corporation', status: 'enrolled', number: 'PH-987654321' },
                    { name: 'Pag-IBIG', description: 'Home Development Mutual Fund', status: 'enrolled', number: 'PAG-456789123' },
                    { name: 'TIN', description: 'Tax Identification Number', status: 'enrolled', number: 'TIN-123456789' }
                  ].map((benefit, index) => (
                    <div key={index} className="col-md-6 col-lg-3 mb-3">
                      <div className="onboarding-glass-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="mb-0 fw-semibold">{benefit.name}</h6>
                          <span className="onboarding-badge onboarding-badge-success">Enrolled</span>
                        </div>
                        <p className="text-muted small mb-2">{benefit.description}</p>
                        <p className="small mb-2"><strong>Number:</strong> {benefit.number}</p>
                        <button className="btn btn-outline-primary btn-sm w-100">
                          <FontAwesomeIcon icon={faEye} className="me-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Benefits */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faHeartbeat} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Company Benefits</h4>
                    <p className="text-muted mb-0">Your enrolled company-provided benefits</p>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    { name: 'HMO', description: 'Health Maintenance Organization', status: 'enrolled', provider: 'Maxicare' },
                    { name: 'Life Insurance', description: 'Group Life Insurance Coverage', status: 'enrolled', provider: 'Sun Life' },
                    { name: 'Retirement Plan', description: 'Company Retirement Savings Plan', status: 'enrolled', provider: 'BDO' },
                    { name: 'Transportation Allowance', description: 'Monthly Transportation Allowance', status: 'enrolled', amount: '₱3,000' }
                  ].map((benefit, index) => (
                    <div key={index} className="col-md-6 col-lg-3 mb-3">
                      <div className="onboarding-glass-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="mb-0 fw-semibold">{benefit.name}</h6>
                          <span className="onboarding-badge onboarding-badge-success">Enrolled</span>
                        </div>
                        <p className="text-muted small mb-2">{benefit.description}</p>
                        <p className="small mb-2"><strong>Provider:</strong> {benefit.provider || benefit.amount}</p>
                        <button className="btn btn-outline-primary btn-sm w-100">
                          <FontAwesomeIcon icon={faEye} className="me-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Information */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faDollarSign} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Compensation Details</h4>
                    <p className="text-muted mb-0">Your salary and payment setup (read-only)</p>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        Salary Information
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Monthly Rate:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.2rem' }}>
                            ₱45,000.00
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Pay Schedule:</strong></p>
                          <p className="mb-0 text-muted">Bi-monthly (15th and 30th)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="onboarding-glass-card p-3">
                      <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                        Payment Details
                      </h6>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Mode of Payment:</strong></p>
                          <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                            Bank Transfer
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-12">
                          <p className="mb-2"><strong>Bank Details:</strong></p>
                          <div className="mb-2">
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              defaultValue="BDO - 1234567890"
                              placeholder="Enter bank account details"
                            />
                          </div>
                          <small className="text-muted">Editable if needed</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Benefits Enrollment Status */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faHeartbeat} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Benefits Enrollment Status</h4>
                    <p className="text-muted mb-0">Your enrolled benefits status</p>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    { name: 'SSS', status: 'enrolled', icon: '✅' },
                    { name: 'PhilHealth', status: 'enrolled', icon: '✅' },
                    { name: 'Pag-IBIG', status: 'enrolled', icon: '✅' },
                    { name: 'HMO', status: 'pending', icon: '❌', note: '(Pending HR)' }
                  ].map((benefit, index) => (
                    <div key={index} className="col-md-6 col-lg-3 mb-3">
                      <div className="onboarding-glass-card p-3 text-center">
                        <div className="mb-2">
                          <span style={{ fontSize: '1.5rem' }}>{benefit.icon}</span>
                        </div>
                        <h6 className="fw-semibold mb-1">{benefit.name}</h6>
                        <p className="text-muted small mb-2">
                          {benefit.status === 'enrolled' ? 'Enrolled' : 'Pending HR'}
                        </p>
                        {benefit.note && (
                          <small className="text-muted">{benefit.note}</small>
                        )}
                        <button className="btn btn-outline-primary btn-sm w-100 mt-2">
                          <FontAwesomeIcon icon={faEye} className="me-1" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Progress Tracker / Completion Page
  const ProgressTrackerPage = () => (
    <div className="container-fluid p-0">
      {/* Hero Section */}
      <div className="onboarding-gradient-bg p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center mb-3">
              <div className="onboarding-icon-wrapper me-4" style={{ 
                width: '80px', 
                height: '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faTrophy} size="2x" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="onboarding-welcome-title mb-2" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
                  fontWeight: '700',
                  marginLeft: '-10px'
                }}>
                  Progress Tracker
                </h1>
                <p className="onboarding-welcome-subtitle mb-0" style={{ 
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  marginLeft: '-10px'
                }}>
                  Track your onboarding progress and completion status
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 text-center">
            <div className="onboarding-icon-wrapper onboarding-pulse-animation" style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }}>
              <FontAwesomeIcon icon={faChartLine} size="3x" style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-4">
        {/* Progress Overview */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Overall Progress</h4>
                    <p className="text-muted mb-0">Your onboarding completion status</p>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <div className="onboarding-glass-card p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-semibold mb-0">Completion Progress</h6>
                        <span className="onboarding-badge onboarding-badge-success">75% Complete</span>
                      </div>
                      <div className="progress mb-3" style={{ height: '20px', borderRadius: '10px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          role="progressbar" 
                          style={{ width: '75%' }}
                          aria-valuenow="75" 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        >
                          75%
                        </div>
                      </div>
                      <p className="text-muted small mb-0">3 of 4 steps completed</p>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="onboarding-glass-card p-3 text-center">
                      <FontAwesomeIcon icon={faTrophy} size="2x" className="text-warning mb-2" />
                      <h6 className="fw-semibold mb-1">Almost There!</h6>
                      <p className="text-muted small mb-0">Complete remaining steps to finish onboarding</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Status Tracker */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
                    <FontAwesomeIcon icon={faClipboardCheck} />
                  </div>
                  <div>
                    <h4 className="onboarding-section-title mb-1">Step Status Tracker</h4>
                    <p className="text-muted mb-0">Current status of each onboarding step</p>
                  </div>
                </div>
                
                <div className="row">
                  {[
                    { step: 'Document Upload', status: 'completed', description: 'All required documents uploaded and approved' },
                    { step: 'Profile Verification', status: 'completed', description: 'Personal information verified and saved' },
                    { step: 'Orientation', status: 'completed', description: 'Orientation session completed successfully' },
                    { step: 'Benefits Enrollment', status: 'in-progress', description: 'Benefits enrollment in progress' }
                  ].map((item, index) => (
                    <div key={index} className="col-md-6 col-lg-3 mb-3">
                      <div className="onboarding-glass-card p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="mb-0 fw-semibold">{item.step}</h6>
                          <span className={`onboarding-badge ${
                            item.status === 'completed' ? 'onboarding-badge-success' :
                            item.status === 'in-progress' ? 'onboarding-badge-warning' : 'onboarding-badge-danger'
                          }`}>
                            {item.status === 'completed' ? 'Completed' :
                             item.status === 'in-progress' ? 'In Progress' : 'Pending Documents'}
                          </span>
                        </div>
                        <p className="text-muted small mb-2">{item.description}</p>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon 
                            icon={item.status === 'completed' ? faCheckCircle : 
                                  item.status === 'in-progress' ? faClock : faExclamationTriangle} 
                            className={`me-2 ${
                              item.status === 'completed' ? 'text-success' :
                              item.status === 'in-progress' ? 'text-warning' : 'text-danger'
                            }`} 
                          />
                          <small className={`${
                            item.status === 'completed' ? 'text-success' :
                            item.status === 'in-progress' ? 'text-warning' : 'text-danger'
                          }`}>
                            {item.status === 'completed' ? 'Step Completed' :
                             item.status === 'in-progress' ? 'In Progress' : 'Pending Documents'}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="onboarding-modern-card">
              <div className="p-4">
                <div className="text-center">
                  <h5 className="mb-3">Onboarding Summary</h5>
                  <p className="text-muted mb-4">View your complete onboarding summary and download documents</p>
                  
                  <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                    <button className="btn btn-success btn-lg px-5">
                      <FontAwesomeIcon icon={faEye} className="me-2" />
                      View Full Onboarding Summary
                    </button>
                    <button className="btn btn-outline-primary btn-lg px-5">
                      <FontAwesomeIcon icon={faDownload} className="me-2" />
                      Download Summary PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // UI Add-ons Components
  const NotificationsTab = () => (
    <div className="onboarding-modern-card">
      <div className="p-4">
        <div className="d-flex align-items-center mb-4">
          <div className="onboarding-icon-wrapper onboarding-info-gradient me-3" style={{ width: '50px', height: '50px' }}>
            <FontAwesomeIcon icon={faBell} />
          </div>
          <div>
            <h4 className="onboarding-section-title mb-1">Notifications</h4>
            <p className="text-muted mb-0">HR updates and status alerts</p>
          </div>
        </div>
        
        <div className="notifications-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {[
            { type: 'success', title: 'Document Approved', message: 'Your NBI Clearance has been approved', time: '2 hours ago' },
            { type: 'info', title: 'Orientation Scheduled', message: 'Your orientation is scheduled for January 20, 2025', time: '1 day ago' },
            { type: 'warning', title: 'Document Required', message: 'Please upload your Medical Certificate', time: '2 days ago' },
            { type: 'success', title: 'Profile Updated', message: 'Your profile information has been verified', time: '3 days ago' }
          ].map((notification, index) => (
            <div key={index} className={`alert alert-${notification.type} border-0 mb-3`}>
              <div className="d-flex align-items-start">
                <FontAwesomeIcon 
                  icon={notification.type === 'success' ? faCheckCircle : 
                        notification.type === 'info' ? faInfoCircle : faExclamationTriangle} 
                  className="me-3 mt-1" 
                />
                <div className="flex-grow-1">
                  <h6 className="fw-semibold mb-1">{notification.title}</h6>
                  <p className="mb-1">{notification.message}</p>
                  <small className="text-muted">{notification.time}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ContactHRWidget = () => (
    <div className="onboarding-modern-card">
      <div className="p-4">
        <div className="d-flex align-items-center mb-4">
          <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3" style={{ width: '50px', height: '50px' }}>
            <FontAwesomeIcon icon={faUserTie} />
          </div>
          <div>
            <h4 className="onboarding-section-title mb-1">Contact HR</h4>
            <p className="text-muted mb-0">Get help with your onboarding</p>
          </div>
        </div>
        
        <div className="text-center">
          <p className="mb-4">Need assistance? Contact our HR team for support.</p>
          
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-primary">
              <FontAwesomeIcon icon={faPhone} className="me-2" />
              Call HR Team
            </button>
            <button className="btn btn-outline-primary">
              <FontAwesomeIcon icon={faEnvelope} className="me-2" />
              Send Email
            </button>
            <button className="btn btn-outline-success">
              <FontAwesomeIcon icon={faUserTie} className="me-2" />
              Chat with HR
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const GuidedStepsWidget = () => (
    <div className="onboarding-modern-card">
      <div className="p-4">
        <div className="d-flex align-items-center mb-4">
          <div className="onboarding-icon-wrapper onboarding-success-gradient me-3" style={{ width: '50px', height: '50px' }}>
            <FontAwesomeIcon icon={faRocket} />
          </div>
          <div>
            <h4 className="onboarding-section-title mb-1">Guided Steps</h4>
            <p className="text-muted mb-0">Your current step and next task</p>
          </div>
        </div>
        
        <div className="onboarding-glass-card p-3 mb-3">
          <div className="d-flex align-items-center mb-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-success me-2" />
            <h6 className="mb-0 fw-semibold">Current Step</h6>
          </div>
          <p className="mb-0 text-muted">Benefits Enrollment</p>
        </div>
        
        <div className="onboarding-glass-card p-3">
          <div className="d-flex align-items-center mb-2">
            <FontAwesomeIcon icon={faClock} className="text-warning me-2" />
            <h6 className="mb-0 fw-semibold">Next Task</h6>
          </div>
          <p className="mb-0 text-muted">Complete benefits enrollment and wait for HR approval</p>
        </div>
      </div>
    </div>
  );

  const DownloadSection = () => (
    <div className="onboarding-modern-card">
      <div className="p-4">
        <div className="d-flex align-items-center mb-4">
          <div className="onboarding-icon-wrapper onboarding-warning-gradient me-3" style={{ width: '50px', height: '50px' }}>
            <FontAwesomeIcon icon={faDownload} />
          </div>
          <div>
            <h4 className="onboarding-section-title mb-1">Downloads</h4>
            <p className="text-muted mb-0">Company handbook and policy documents</p>
          </div>
        </div>
        
        <div className="row">
          {[
            { name: 'Employee Handbook', description: 'Complete company policies and procedures', size: '2.5 MB' },
            { name: 'Benefits Guide', description: 'Detailed benefits information and enrollment', size: '1.8 MB' },
            { name: 'Safety Manual', description: 'Workplace safety guidelines and procedures', size: '3.2 MB' },
            { name: 'IT Policy', description: 'Technology usage and security policies', size: '1.5 MB' }
          ].map((doc, index) => (
            <div key={index} className="col-md-6 mb-3">
              <div className="onboarding-glass-card p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <FontAwesomeIcon icon={faFilePdf} className="text-danger me-2" />
                  <span className="onboarding-badge onboarding-badge-info">{doc.size}</span>
                </div>
                <h6 className="fw-semibold mb-1">{doc.name}</h6>
                <p className="text-muted small mb-2">{doc.description}</p>
                <button className="btn btn-outline-primary btn-sm w-100">
                  <FontAwesomeIcon icon={faDownload} className="me-1" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Main return structure
  return (
    <div className="onboarding-container">
      {/* Home Button */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex justify-content-start">
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
          </div>
        </div>
      </div>
      
      <NavigationTabs />
      
      <div className="scrollable-content">
        {currentPage === 'application-status' && <ApplicationStatusPage />}
        {currentPage === 'interview' && <InterviewSchedulePage />}
        {currentPage === 'offer' && <OfferLetterPage />}
        {currentPage === 'progress' && <ProgressTrackerPage />}
        {currentPage === 'onboarding' && (
        <>

          {/* PROFESSIONAL TABS NAVIGATION */}
          <div className="onboarding-modern-card p-0 mb-4" style={{ position: 'sticky', top: '0', zIndex: '1000' }}>
            <div className="row g-0">
              <div className="col-12">
                <div className="d-flex flex-wrap border-bottom">
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                    style={{
                      backgroundColor: activeTab === 'overview' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'overview' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'overview' ? '600' : '500',
                      borderBottom: activeTab === 'overview' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faHome} className="me-2" />
                    Overview
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                    style={{
                      backgroundColor: activeTab === 'documents' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'documents' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'documents' ? '600' : '500',
                      borderBottom: activeTab === 'documents' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                    Documents
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'orientation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orientation')}
                    style={{
                      backgroundColor: activeTab === 'orientation' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'orientation' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'orientation' ? '600' : '500',
                      borderBottom: activeTab === 'orientation' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Orientation
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                    style={{
                      backgroundColor: activeTab === 'profile' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'profile' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'profile' ? '600' : '500',
                      borderBottom: activeTab === 'profile' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Profile
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'start-date' ? 'active' : ''}`}
                    onClick={() => setActiveTab('start-date')}
                    style={{
                      backgroundColor: activeTab === 'start-date' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'start-date' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'start-date' ? '600' : '500',
                      borderBottom: activeTab === 'start-date' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
                    Start Date
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'compensation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('compensation')}
                    style={{
                      backgroundColor: activeTab === 'compensation' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'compensation' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'compensation' ? '600' : '500',
                      borderBottom: activeTab === 'compensation' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                    Compensation
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'benefits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('benefits')}
                    style={{
                      backgroundColor: activeTab === 'benefits' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'benefits' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'benefits' ? '600' : '500',
                      borderBottom: activeTab === 'benefits' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                    Benefits
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'completion' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completion')}
                    style={{
                      backgroundColor: activeTab === 'completion' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'completion' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'completion' ? '600' : '500',
                      borderBottom: activeTab === 'completion' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Completion
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                    style={{
                      backgroundColor: activeTab === 'notifications' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'notifications' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'notifications' ? '600' : '500',
                      borderBottom: activeTab === 'notifications' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faBell} className="me-2" />
                    Notifications
                  </button>
                  <button 
                    className={`btn btn-link text-decoration-none px-4 py-3 border-0 rounded-0 ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                    style={{
                      backgroundColor: activeTab === 'profile' ? 'var(--onboarding-primary)' : 'transparent',
                      color: activeTab === 'profile' ? 'white' : 'var(--onboarding-text)',
                      fontWeight: activeTab === 'profile' ? '600' : '500',
                      borderBottom: activeTab === 'profile' ? '3px solid var(--onboarding-primary)' : '3px solid transparent'
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="tab-content">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="row">
                <div className="col-12">

                  {/* Quick Stats Cards */}
                  <div className="row mb-4">
                    <div className="col-md-3 col-sm-6 mb-3">
                      <div className="onboarding-stats-card text-center p-3">
                        <div className="onboarding-icon-wrapper onboarding-primary-gradient mb-3" style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                          <FontAwesomeIcon icon={faFileAlt} size="lg" />
                        </div>
                        <h5 className="mb-1">{onboardingData.progress.documents_completed}</h5>
                        <p className="text-muted mb-0 small">Documents Uploaded</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                      <div className="onboarding-stats-card text-center p-3">
                        <div className="onboarding-icon-wrapper onboarding-success-gradient mb-3" style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                          <FontAwesomeIcon icon={faCheckCircle} size="lg" />
                        </div>
                        <h5 className="mb-1">{onboardingData.progress.total_documents - onboardingData.progress.documents_completed}</h5>
                        <p className="text-muted mb-0 small">Pending Documents</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                      <div className="onboarding-stats-card text-center p-3">
                        <div className="onboarding-icon-wrapper onboarding-info-gradient mb-3" style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                          <FontAwesomeIcon icon={faUser} size="lg" />
                        </div>
                        <h5 className="mb-1">{onboardingData.profile_completion?.overall || 0}%</h5>
                        <p className="text-muted mb-0 small">Profile Complete</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                      <div className="onboarding-stats-card text-center p-3">
                        <div className="onboarding-icon-wrapper onboarding-warning-gradient mb-3" style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                          <FontAwesomeIcon icon={faBell} size="lg" />
                        </div>
                        <h5 className="mb-1">{onboardingData.notifications_history?.filter(n => !n.read).length || 0}</h5>
                        <p className="text-muted mb-0 small">New Notifications</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && <DocumentUploadPage />}
            {activeTab === 'orientation' && <OrientationDetailsPage />}
            {activeTab === 'profile' && <ProfileVerificationPage />}
            {activeTab === 'start-date' && <StartDateConfirmationPage />}
            {activeTab === 'benefits' && <BenefitsPayrollPage />}
            {activeTab === 'documents-old' && (
              <div className="row">
                <div className="col-12">
                  <div className="onboarding-modern-card">
                    <div className="p-4">
                      <div className="d-flex align-items-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3">
                <FontAwesomeIcon icon={faClipboardCheck} />
              </div>
              <div>
                          <h4 className="onboarding-section-title mb-1">Required Documents Upload</h4>
                          <p className="text-muted mb-0">Submit all required documents to complete your onboarding process</p>
              </div>
            </div>
                      
                      {/* Progress Summary */}
                      <div className="bg-light p-3 rounded-3 mb-4">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <h6 className="mb-1">Document Submission Progress</h6>
                            <small className="text-muted">
                              {onboardingData.progress.documents_completed} of {onboardingData.progress.total_documents} documents completed
                            </small>
                          </div>
                          <div className="col-md-4">
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ 
                                  width: `${(onboardingData.progress.documents_completed / onboardingData.progress.total_documents) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <small className="text-muted">
                              {Math.round((onboardingData.progress.documents_completed / onboardingData.progress.total_documents) * 100)}% Complete
                            </small>
                          </div>
                        </div>
                      </div>
                      
            <div className="onboarding-grid onboarding-grid-2">
              {onboardingData.documents.map((doc) => (
                          <div key={doc.id} className="onboarding-document-card">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex align-items-center">
                                <div className="onboarding-icon-wrapper me-3" style={{ width: '40px', height: '40px' }}>
                                  <FontAwesomeIcon icon={doc.icon} />
                              </div>
                              <div>
                                    <h6 className="mb-1 fw-semibold">{doc.name}</h6>
                                    <p className="text-muted mb-0 small">{doc.description}</p>
                              </div>
                            </div>
                            <div>
                              <OnboardingStatusBadge status={doc.status} />
                            </div>
                          </div>

                          {/* Document Status Messages */}
                          {doc.status === 'approved' && (
                            <div className="onboarding-alert onboarding-alert-success d-flex align-items-center">
                              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                              <div>
                                <strong>Document approved!</strong>
                                <br />
                                <small>Approved on {new Date(doc.approved_at).toLocaleDateString()}</small>
                              </div>
                            </div>
                          )}

                          {doc.status === 'pending_review' && (
                            <div className="onboarding-alert onboarding-alert-warning d-flex align-items-center">
                              <FontAwesomeIcon icon={faClock} className="me-2" />
                              <div>
                                    <strong>Under review</strong>
                                <br />
                                    <small>Submitted on {new Date(doc.uploaded_at).toLocaleDateString()}</small>
                              </div>
                            </div>
                          )}

                          {doc.status === 'rejected' && (
                            <div className="onboarding-alert onboarding-alert-danger">
                              <div className="d-flex align-items-start">
                                <FontAwesomeIcon icon={faTimesCircle} className="me-2 mt-1" />
                                <div>
                                  <strong>Document rejected</strong>
                                  <br />
                                      <small className="text-muted">{doc.rejection_reason}</small>
                                  <br />
                                  <small className="text-muted">Rejected on {new Date(doc.rejected_at).toLocaleDateString()}</small>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Upload Section */}
                              {doc.status === 'not_submitted' && (
                            <div className="mt-3">
                                  <div className="mb-2">
                                    <label htmlFor={`file-${doc.id}`} className="form-label small fw-semibold">
                                      Upload {doc.name}
                                    </label>
                                    <input
                                  type="file"
                                      className="form-control form-control-sm"
                                      id={`file-${doc.id}`}
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => handleFileSelect(e, doc.id)}
                                    />
                                {uploadErrors[doc.id] && (
                                      <div className="text-danger small mt-1">{uploadErrors[doc.id]}</div>
                                    )}
                                  </div>
                                  <button
                                    className="btn btn-primary btn-sm w-100"
                                    onClick={() => handleDocumentUpload(doc.id)}
                                    disabled={!selectedFile || selectedDocument !== doc.id || uploading}
                              >
                                {uploading && selectedDocument === doc.id ? (
                                  <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <FontAwesomeIcon icon={faUpload} className="me-2" />
                                        Upload Document
                                  </>
                                )}
                                  </button>
                            </div>
                          )}

                              {doc.status === 'rejected' && (
                                <div className="mt-3">
                                  <div className="mb-2">
                                    <label htmlFor={`file-${doc.id}`} className="form-label small fw-semibold">
                                      Re-upload {doc.name}
                                    </label>
                                    <input
                                      type="file"
                                      className="form-control form-control-sm"
                                      id={`file-${doc.id}`}
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => handleFileSelect(e, doc.id)}
                                    />
                                    {uploadErrors[doc.id] && (
                                      <div className="text-danger small mt-1">{uploadErrors[doc.id]}</div>
                                    )}
                            </div>
                                  <button
                                    className="btn btn-warning btn-sm w-100"
                                    onClick={() => handleDocumentUpload(doc.id)}
                                    disabled={!selectedFile || selectedDocument !== doc.id || uploading}
                                  >
                                    {uploading && selectedDocument === doc.id ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <FontAwesomeIcon icon={faUpload} className="me-2" />
                                        Re-upload Document
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                    </div>
                  ))}
                </div>
        </div>
      </div>
                  </div>
                </div>
              )}

              {/* COMPENSATION TAB */}
              {activeTab === 'compensation' && (
                <div className="row">
          <div className="col-12">
                    <div className="onboarding-modern-card">
                      <div className="p-4">
                        <div className="d-flex align-items-center mb-4">
                          <div className="onboarding-icon-wrapper onboarding-success-gradient me-3">
                            <FontAwesomeIcon icon={faDollarSign} />
                          </div>
                          <div>
                              <h4 className="onboarding-section-title mb-1">Compensation Details</h4>
                              <p className="text-muted mb-0">Your salary and payment information</p>
                          </div>
                        </div>
                        
                        <div className="row">
                            <div className="col-md-6">
                              <div className="onboarding-glass-card p-3 mb-3">
                                <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                                  <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                                  Salary Information
                                </h6>
                                <div className="row">
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Rate Type:</strong></p>
                                    <p className="mb-3 text-muted">{onboardingData.compensation?.rate_type || 'N/A'}</p>
                            </div>
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Rate Amount:</strong></p>
                                    <p className="mb-3 fw-bold" style={{ color: 'var(--onboarding-success)', fontSize: '1.1rem' }}>
                                      {onboardingData.compensation?.rate_amount || 'N/A'}
                                    </p>
                      </div>
                            </div>
                                <div className="row">
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Pay Schedule:</strong></p>
                                    <p className="mb-0 text-muted">{onboardingData.compensation?.pay_schedule || 'N/A'}</p>
                      </div>
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Payment Mode:</strong></p>
                                    <p className="mb-0 text-muted">{onboardingData.compensation?.payment_mode || 'N/A'}</p>
                    </div>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="onboarding-glass-card p-3 mb-3">
                                <h6 className="fw-semibold mb-3" style={{ color: 'var(--onboarding-primary)' }}>
                                  <FontAwesomeIcon icon={faBuilding} className="me-2" />
                                  Bank Details
                                </h6>
                                <div className="row">
                                  <div className="col-12">
                                    <p className="mb-2"><strong>Bank Name:</strong></p>
                                    <p className="mb-3 text-muted">{onboardingData.compensation?.bank_details?.bank_name || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="row">
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Account Number:</strong></p>
                                    <p className="mb-3 text-muted">{onboardingData.compensation?.bank_details?.account_number || 'N/A'}</p>
                                  </div>
                                  <div className="col-6">
                                    <p className="mb-2"><strong>Routing Number:</strong></p>
                                    <p className="mb-3 text-muted">{onboardingData.compensation?.bank_details?.routing_number || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="row">
                                  <div className="col-12">
                                    <p className="mb-2"><strong>Account Holder:</strong></p>
                                    <p className="mb-0 text-muted">{onboardingData.compensation?.bank_details?.account_holder || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <button className="btn btn-outline-primary btn-sm">
                                    <FontAwesomeIcon icon={faEdit} className="me-2" />
                                    Update Bank Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                          </div>
                        )}
                        
            {/* BENEFITS TAB */}
            {activeTab === 'benefits' && (
              <div className="row">
                <div className="col-12">
                  <div className="onboarding-modern-card">
                    <div className="p-4">
                      <div className="d-flex align-items-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-info-gradient me-3">
                          <FontAwesomeIcon icon={faShieldAlt} />
                    </div>
                        <div>
                          <h4 className="onboarding-section-title mb-1">Benefits Enrollment Status</h4>
                          <p className="text-muted mb-0">Your enrolled benefits and coverage details</p>
                        </div>
                      </div>
                      
                      <div className="row">
                        {/* SSS */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="onboarding-glass-card p-3 h-100">
                            <div className="d-flex align-items-center mb-3">
                              <div className="onboarding-icon-wrapper me-3" style={{ width: '32px', height: '32px', backgroundColor: onboardingData.benefits?.sss?.enrolled ? 'var(--onboarding-success)' : '#f59e0b' }}>
                                <FontAwesomeIcon icon={faShieldAlt} />
                              </div>
                              <div>
                                <h6 className="mb-0 fw-semibold">SSS</h6>
                                <small className="text-muted">Social Security</small>
                              </div>
                            </div>
                    <div className="mb-3">
                              <span className={`badge ${onboardingData.benefits?.sss?.enrolled ? 'bg-success' : 'bg-secondary'}`}>
                                {onboardingData.benefits?.sss?.enrolled ? '? Enrolled' : '? Not Enrolled'}
                              </span>
                      </div>
                            {onboardingData.benefits?.sss?.enrolled && (
                              <div>
                                <p className="mb-1 small"><strong>Registration:</strong> {onboardingData.benefits.sss.registration_number}</p>
                                <p className="mb-1 small"><strong>Status:</strong> {onboardingData.benefits.sss.status}</p>
                                <p className="mb-0 small"><strong>Effective:</strong> {new Date(onboardingData.benefits.sss.effective_date).toLocaleDateString()}</p>
                    </div>
                            )}
                            <div className="mt-3">
                              <button className="btn btn-outline-primary btn-sm w-100">
                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                View Details
                              </button>
                            </div>
        </div>
      </div>

                        {/* PhilHealth */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="onboarding-glass-card p-3 h-100">
                            <div className="d-flex align-items-center mb-3">
                              <div className="onboarding-icon-wrapper me-3" style={{ width: '32px', height: '32px', backgroundColor: onboardingData.benefits?.philhealth?.enrolled ? 'var(--onboarding-success)' : '#f59e0b' }}>
                                <FontAwesomeIcon icon={faHeartbeat} />
                      </div>
                              <div>
                                <h6 className="mb-0 fw-semibold">PhilHealth</h6>
                                <small className="text-muted">Health Insurance</small>
                    </div>
                    </div>
                    <div className="mb-3">
                              <span className={`badge ${onboardingData.benefits?.philhealth?.enrolled ? 'bg-success' : 'bg-secondary'}`}>
                                {onboardingData.benefits?.philhealth?.enrolled ? '? Enrolled' : '? Not Enrolled'}
                              </span>
                      </div>
                            {onboardingData.benefits?.philhealth?.enrolled && (
                              <div>
                                <p className="mb-1 small"><strong>Registration:</strong> {onboardingData.benefits.philhealth.registration_number}</p>
                                <p className="mb-1 small"><strong>Status:</strong> {onboardingData.benefits.philhealth.status}</p>
                                <p className="mb-0 small"><strong>Effective:</strong> {new Date(onboardingData.benefits.philhealth.effective_date).toLocaleDateString()}</p>
                    </div>
                            )}
                            <div className="mt-3">
                              <button className="btn btn-outline-primary btn-sm w-100">
                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                View Details
                              </button>
                            </div>
        </div>
      </div>

                        {/* Pag-IBIG */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="onboarding-glass-card p-3 h-100">
                    <div className="d-flex align-items-center mb-3">
                              <div className="onboarding-icon-wrapper me-3" style={{ width: '32px', height: '32px', backgroundColor: onboardingData.benefits?.pagibig?.enrolled ? 'var(--onboarding-success)' : '#f59e0b' }}>
                                <FontAwesomeIcon icon={faHome} />
                      </div>
                      <div>
                                <h6 className="mb-0 fw-semibold">Pag-IBIG</h6>
                                <small className="text-muted">Housing Fund</small>
                      </div>
                    </div>
                            <div className="mb-3">
                              <span className={`badge ${onboardingData.benefits?.pagibig?.enrolled ? 'bg-success' : 'bg-secondary'}`}>
                                {onboardingData.benefits?.pagibig?.enrolled ? '? Enrolled' : '? Not Enrolled'}
                              </span>
                    </div>
                            {onboardingData.benefits?.pagibig?.enrolled && (
                              <div>
                                <p className="mb-1 small"><strong>Registration:</strong> {onboardingData.benefits.pagibig.registration_number}</p>
                                <p className="mb-1 small"><strong>Status:</strong> {onboardingData.benefits.pagibig.status}</p>
                                <p className="mb-0 small"><strong>Effective:</strong> {new Date(onboardingData.benefits.pagibig.effective_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            <div className="mt-3">
                              <button className="btn btn-outline-primary btn-sm w-100">
                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* HMO */}
                        <div className="col-md-6 col-lg-3 mb-3">
                          <div className="onboarding-glass-card p-3 h-100">
                    <div className="d-flex align-items-center mb-3">
                              <div className="onboarding-icon-wrapper me-3" style={{ width: '32px', height: '32px', backgroundColor: onboardingData.benefits?.hmo?.enrolled ? 'var(--onboarding-success)' : '#f59e0b' }}>
                                <FontAwesomeIcon icon={faStethoscope} />
                      </div>
                      <div>
                                <h6 className="mb-0 fw-semibold">HMO</h6>
                                <small className="text-muted">Health Maintenance</small>
                      </div>
                    </div>
                            <div className="mb-3">
                              <span className={`badge ${onboardingData.benefits?.hmo?.enrolled ? 'bg-success' : 'bg-warning'}`}>
                                {onboardingData.benefits?.hmo?.enrolled ? '? Enrolled' : '? Pending HR'}
                              </span>
                            </div>
                            {onboardingData.benefits?.hmo?.enrolled ? (
                              <div>
                                <p className="mb-1 small"><strong>Registration:</strong> {onboardingData.benefits.hmo.registration_number}</p>
                                <p className="mb-1 small"><strong>Status:</strong> {onboardingData.benefits.hmo.status}</p>
                                <p className="mb-0 small"><strong>Effective:</strong> {new Date(onboardingData.benefits.hmo.effective_date).toLocaleDateString()}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="mb-0 small text-muted">{onboardingData.benefits?.hmo?.notes || 'HMO enrollment pending'}</p>
                              </div>
                            )}
                            <div className="mt-3">
                              <button className="btn btn-outline-primary btn-sm w-100" disabled={!onboardingData.benefits?.hmo?.enrolled}>
                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                {onboardingData.benefits?.hmo?.enrolled ? 'View Details' : 'Pending'}
                              </button>
        </div>
      </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COMPLETION TAB */}
            {activeTab === 'completion' && (
              <div className="row">
                <div className="col-12">
                  <div className="onboarding-modern-card">
                    <div className="p-4">
                      <div className="d-flex align-items-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-success-gradient me-3">
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </div>
                        <div>
                          <h4 className="onboarding-section-title mb-1">Completion & Confirmation</h4>
                          <p className="text-muted mb-0">Finalize your onboarding process</p>
                        </div>
                      </div>
                      
                      {/* Completion Message */}
                      <div className="text-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-success-gradient mb-3" style={{ width: '80px', height: '80px', margin: '0 auto' }}>
                          <FontAwesomeIcon icon={faTrophy} size="2x" />
                        </div>
                        <h3 className="onboarding-text-gradient mb-3">Congratulations!</h3>
                        <p className="text-muted mb-4">
                          You've completed all onboarding steps! Welcome to <strong>CCDC</strong>. 
                          Your HR representative will contact you for your first day.
                        </p>
                        
                        {/* 100% Progress Bar */}
                        <div className="mb-4">
                          <div className="progress" style={{ height: '12px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: '100%' }}
                            ></div>
                          </div>
                          <small className="text-muted">100% Complete</small>
                        </div>
                        
                        <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3 justify-content-center">
                          <button className="btn btn-success btn-lg px-4 py-2">
                            <FontAwesomeIcon icon={faDownload} className="me-2" />
                            Download Summary
                          </button>
                          <button className="btn btn-outline-primary btn-lg px-4 py-2">
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

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="row">
                <div className="col-12">
                  <div className="onboarding-modern-card">
                    <div className="p-4">
                      <div className="d-flex align-items-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-info-gradient me-3">
                          <FontAwesomeIcon icon={faBell} />
                        </div>
                        <div>
                          <h4 className="onboarding-section-title mb-1">Notifications History</h4>
                          <p className="text-muted mb-0">Track your approvals, rejections, and updates</p>
                        </div>
                      </div>

                      <div className="notifications-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {onboardingData.notifications_history && onboardingData.notifications_history.map((notification, index) => (
                          <div key={notification.id} className={`d-flex align-items-start p-3 mb-3 rounded-3 onboarding-hover-lift ${notification.read ? 'bg-light' : 'bg-primary bg-opacity-10'}`}>
                            <div className="me-3">
                              <div className="onboarding-icon-wrapper" style={{ 
                                width: '32px', 
                                height: '32px',
                                backgroundColor: notification.type === 'success' ? 'var(--onboarding-success)' :
                                                notification.type === 'warning' ? '#f59e0b' :
                                                notification.type === 'info' ? 'var(--onboarding-primary)' : '#ef4444'
                              }}>
                                <FontAwesomeIcon icon={notification.icon} />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <h6 className="mb-0 fw-semibold">{notification.title}</h6>
                                <small className="text-muted">
                                  {new Date(notification.date).toLocaleDateString()}
                                </small>
                              </div>
                              <p className="mb-0 small text-muted">{notification.message}</p>
                              {!notification.read && (
                                <span className="onboarding-badge onboarding-badge-info mt-2">New</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="row">
                <div className="col-12">
                  <div className="onboarding-modern-card">
                    <div className="p-4">
                      <div className="d-flex align-items-center mb-4">
                        <div className="onboarding-icon-wrapper onboarding-primary-gradient me-3">
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                        <div>
                          <h4 className="onboarding-section-title mb-1">Profile Completion Tracker</h4>
                          <p className="text-muted mb-0">Track your profile completion progress</p>
                        </div>
                      </div>

                      {/* Overall Progress */}
                      <div className="onboarding-glass-card p-3 mb-4 onboarding-hover-lift">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-semibold">Overall Profile</span>
                          <span className="fw-bold" style={{ color: 'var(--onboarding-primary)' }}>
                            {onboardingData.profile_completion?.overall || 0}%
                          </span>
                        </div>
                        <div className="progress mb-2" style={{ height: '8px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${onboardingData.profile_completion?.overall || 0}%`,
                              backgroundColor: 'var(--onboarding-primary)'
                            }}
                          ></div>
                        </div>
                        <small className="text-muted">Almost there! Complete remaining sections to reach 100%</small>
                      </div>

                      {/* Individual Sections */}
                      <div className="profile-sections">
                        {[
                          { name: 'Personal Information', progress: onboardingData.profile_completion?.personal_info || 0, icon: faUser },
                          { name: 'Contact Details', progress: onboardingData.profile_completion?.contact_details || 0, icon: faPhone },
                          { name: 'Emergency Contact', progress: onboardingData.profile_completion?.emergency_contact || 0, icon: faUserCheck },
                          { name: 'Bank Details', progress: onboardingData.profile_completion?.bank_details || 0, icon: faBuilding },
                          { name: 'Documents', progress: onboardingData.profile_completion?.documents || 0, icon: faFileAlt },
                          { name: 'Benefits', progress: onboardingData.profile_completion?.benefits || 0, icon: faShieldAlt }
                        ].map((section, index) => (
                          <div key={index} className="d-flex align-items-center mb-3 onboarding-hover-lift">
                            <div className="me-3">
                              <div className="onboarding-icon-wrapper" style={{ 
                                width: '24px', 
                                height: '24px',
                                backgroundColor: section.progress === 100 ? 'var(--onboarding-success)' : 'var(--onboarding-neutral)'
                              }}>
                                <FontAwesomeIcon icon={section.icon} style={{ fontSize: '0.8rem' }} />
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small fw-semibold">{section.name}</span>
                                <span className="small fw-bold" style={{ color: 'var(--onboarding-primary)' }}>
                                  {section.progress}%
                                </span>
                              </div>
                              <div className="progress" style={{ height: '4px' }}>
                                <div 
                                  className="progress-bar" 
                                  style={{ 
                                    width: `${section.progress}%`,
                                    backgroundColor: section.progress === 100 ? 'var(--onboarding-success)' : 'var(--onboarding-primary)'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* UI ADD-ONS SECTION */}
          <div className="row mt-4">
            <div className="col-lg-8 mb-4">
              <NotificationsTab />
            </div>
            <div className="col-lg-4 mb-4">
              <ContactHRWidget />
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6 mb-4">
              <GuidedStepsWidget />
            </div>
            <div className="col-lg-6 mb-4">
              <DownloadSection />
            </div>
          </div>

        </>
        )}
      </div>

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
          <div className="bg-light p-3 rounded">
            <h6>Offer Details:</h6>
            <p className="mb-1"><strong>Position:</strong> {onboardingData.offer?.position}</p>
            <p className="mb-1"><strong>Salary:</strong> {onboardingData.offer?.salary}</p>
            <p className="mb-0"><strong>Start Date:</strong> {onboardingData.offer?.start_date && new Date(onboardingData.offer.start_date).toLocaleDateString()}</p>
          </div>
          <p className="mt-3 mb-0">By accepting this offer, you agree to the terms and conditions of employment.</p>
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
          <div className="bg-light p-3 rounded">
            <h6>Offer Details:</h6>
            <p className="mb-1"><strong>Position:</strong> {onboardingData.offer?.position}</p>
            <p className="mb-1"><strong>Salary:</strong> {onboardingData.offer?.salary}</p>
            <p className="mb-0"><strong>Start Date:</strong> {onboardingData.offer?.start_date && new Date(onboardingData.offer.start_date).toLocaleDateString()}</p>
          </div>
          <p className="mt-3 mb-0 text-muted">This action cannot be undone. You will need to reapply if you change your mind later.</p>
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

      {/* Application Details Modal */}
      <Modal show={showApplicationModal} onHide={() => setShowApplicationModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
            Application Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {onboardingData && (
            <div>
              {/* Job Information */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <FontAwesomeIcon icon={faBriefcase} className="me-2" />
                  Position Applied For
                </h5>
                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Job Title:</strong></p>
                      <p className="text-primary fw-semibold">{onboardingData.position}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Department:</strong></p>
                      <p className="text-muted">{onboardingData.department}</p>
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Application ID:</strong></p>
                      <p className="text-muted">#{onboardingData.application_id}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2"><strong>Applied Date:</strong></p>
                      <p className="text-muted">
                        {onboardingData.date_applied && new Date(onboardingData.date_applied).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Status */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <FontAwesomeIcon icon={faChartLine} className="me-2" />
                  Current Status
                </h5>
                <div className="bg-light p-3 rounded">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <FontAwesomeIcon 
                        icon={faClock} 
                        className="text-warning" 
                        style={{ fontSize: '1.5rem' }} 
                      />
                    </div>
                    <div>
                      <h6 className="mb-1">Application Under Review</h6>
                      <p className="text-muted mb-0">Your application is currently being reviewed by our HR team.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resume Information */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                  Submitted Documents
                </h5>
                <div className="bg-light p-3 rounded">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faFileAlt} className="text-primary me-3" style={{ fontSize: '1.5rem' }} />
                      <div>
                        <h6 className="mb-1">Resume/CV</h6>
                        <p className="text-muted mb-0">Successfully submitted</p>
                      </div>
                    </div>
                    <div>
                      <span className="badge bg-success">Submitted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Timeline */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Application Timeline
                </h5>
                <div className="bg-light p-3 rounded">
                  {onboardingData.status_history && onboardingData.status_history.length > 0 ? (
                    <div className="timeline">
                      {onboardingData.status_history.map((step, index) => (
                        <div key={index} className="d-flex align-items-center mb-2">
                          <div className="me-3">
                            <FontAwesomeIcon 
                              icon={step.status === 'Pending' ? faClock : faCheckCircle}
                              className={step.completed ? 'text-success' : 'text-warning'}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <span className="fw-semibold">{step.status}</span>
                            {step.date && (
                              <span className="text-muted ms-2">
                                - {new Date(step.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No timeline available</p>
                  )}
                </div>
              </div>

              {/* Next Steps */}
              <div className="mb-4">
                <h5 className="fw-bold text-primary mb-3">
                  <FontAwesomeIcon icon={faRocket} className="me-2" />
                  What's Next?
                </h5>
                <div className="bg-light p-3 rounded">
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-info me-3 mt-1" />
                    <div>
                      <h6 className="mb-2">Review Process</h6>
                      <p className="mb-2">Our HR team is currently reviewing your application and qualifications.</p>
                      <ul className="mb-0">
                        <li>We will notify you via email of any updates</li>
                        <li>If shortlisted, you may be invited for an interview</li>
                        <li>You can check your application status anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowApplicationModal(false)}>
            <FontAwesomeIcon icon={faTimes} className="me-2" />
            Close
          </button>
          <button className="btn btn-primary" onClick={() => setShowApplicationModal(false)}>
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            Understood
          </button>
        </Modal.Footer>
      </Modal>

      {/* Enhanced Modern Tab Styling */}
      <style>{`
        /* Enhanced Tab Navigation */
        .modern-tab-container {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .modern-tab {
          position: relative;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          min-width: 120px;
          height: 60px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          font-weight: 500;
          color: #6c757d;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          cursor: pointer;
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

        .tab-icon {
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }

        .modern-tab:hover .tab-icon {
          transform: scale(1.1);
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
          
          .tab-icon {
            font-size: 1.1rem;
          }
        }

        @media (max-width: 576px) {
          .tab-navigation {
            flex-direction: column;
            align-items: stretch;
          }
          
          .modern-tab {
            min-width: auto;
            width: 100%;
            height: 45px;
            flex-direction: row;
            justify-content: flex-start;
            padding: 0.5rem 0.8rem;
          }
          
          .tab-icon {
            margin-right: 0.5rem;
            font-size: 1rem;
          }
        }

        /* Smooth Animations */
        .modern-tab,
        .tab-icon,
        .tab-indicator {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default PersonalOnboarding;