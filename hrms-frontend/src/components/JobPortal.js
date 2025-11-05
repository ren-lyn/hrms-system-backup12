import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import NotificationSystem from './NotificationSystem';
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

export default function JobPortal() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userApplications, setUserApplications] = useState([]);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateApplicationModal, setShowDuplicateApplicationModal] = useState(false);
  const [duplicateApplicationInfo, setDuplicateApplicationInfo] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [hasOnboardingAccess, setHasOnboardingAccess] = useState(false);
  const [lastJobCount, setLastJobCount] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);
  const introSectionRef = useRef(null);
  
  // Smooth cursor tracking for glowing light
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { stiffness: 150, damping: 15 });
  const smoothY = useSpring(cursorY, { stiffness: 150, damping: 15 });

  // Handle mouse movement for interactive glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (introSectionRef.current) {
        const rect = introSectionRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        cursorX.set(x);
        cursorY.set(y);
        setMousePosition({ x: e.clientX, y: e.clientY });
        
        // Check if cursor is over text elements
        const textElements = introSectionRef.current.querySelectorAll('h1, h3, p');
        let hoveringAnyText = false;
        
        textElements.forEach((element) => {
          const elementRect = element.getBoundingClientRect();
          const elementLeft = elementRect.left;
          const elementTop = elementRect.top;
          const elementRight = elementRect.right;
          const elementBottom = elementRect.bottom;
          
          // Check if cursor is within element bounds with some padding for glow radius
          if (
            e.clientX >= elementLeft - 150 &&
            e.clientX <= elementRight + 150 &&
            e.clientY >= elementTop - 150 &&
            e.clientY <= elementBottom + 150
          ) {
            hoveringAnyText = true;
          }
        });
        
        setIsHoveringText(hoveringAnyText);
      }
    };
    
    const introSection = introSectionRef.current;
    if (introSection) {
      introSection.addEventListener('mousemove', handleMouseMove);
      return () => {
        introSection.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [cursorX, cursorY]);

  // Check if user is logged in when component mounts and fetch jobs
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      
      // Set user name from localStorage or API
      if (user.name) {
        setUserName(user.name);
      } else if (user.first_name && user.last_name) {
        setUserName(`${user.first_name} ${user.last_name}`);
      } else {
        setUserName('Applicant'); // Fallback
      }
      
      if (role === 'Applicant') {
        fetchUserApplications();
        checkOnboardingAccess();
      }
    }
    fetchJobs();
    
    // Set up automatic refresh every 30 seconds to get new job postings
    const refreshInterval = setInterval(() => {
      fetchJobs();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Refresh onboarding access when applications change
  useEffect(() => {
    if (isLoggedIn && userRole === 'Applicant') {
      checkOnboardingAccess();
    }
  }, [userApplications, isLoggedIn, userRole]);

  // Check if applicant has onboarding access
  const checkOnboardingAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      // For registered applicants, show onboarding access
      // This allows them to access onboarding even if they haven't been hired yet
      setHasOnboardingAccess(true);
      
      // Optional: Check if user has any applications with "Offer Accepted" or "Hired" status
      // This can be used for additional features or different button states
      try {
        const applicationsResponse = await axios.get(`http://localhost:8000/api/my-applications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const hasAcceptedApplication = applicationsResponse.data.some(app => 
          app.status === 'Offer Accepted' || app.status === 'Hired'
        );
        
        // Check if user has an onboarding record
        try {
          const onboardingResponse = await axios.get(`http://localhost:8000/api/onboarding-records/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // User has onboarding record - they can access onboarding
          setHasOnboardingAccess(true);
        } catch (error) {
          // No onboarding record found, but user is registered
          // Still show the button as they might be eligible
          setHasOnboardingAccess(true);
        }
      } catch (error) {
        // If applications API fails, still show onboarding for registered users
        setHasOnboardingAccess(true);
      }
    } catch (error) {
      console.error('Error checking onboarding access:', error);
      // Default to showing onboarding for registered applicants
      setHasOnboardingAccess(true);
    }
  };

  // Fetch job postings from backend
  const fetchJobs = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/public/job-postings");
      const newJobs = response.data;
      
      // Check if new jobs were added
      if (lastJobCount > 0 && newJobs.length > lastJobCount) {
        console.log(`New job posting detected! ${newJobs.length - lastJobCount} new job(s) added.`);
      }
      
      setJobs(newJobs);
      setLastJobCount(newJobs.length);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    }
  };

  const scrollToJobs = () => {
    document.getElementById("jobs-section").scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLogoutClick = () => {
    // Clear localStorage and update state
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName(null);
    setHasOnboardingAccess(false);
    // Optionally redirect to home or show a message
    window.location.reload(); // Refresh the page to reset any cached data
  };

  const handleOnboardingClick = () => {
    // Navigate to onboarding page
    navigate('/dashboard/applicant/onboarding');
  };

  const handleApplyClick = (job) => {
    if (!isLoggedIn) {
      navigate("/login");
    } else if (userRole === 'Applicant') {
      // Check if user already has an application
      if (userApplications.length > 0) {
        const existingApplication = userApplications[0]; // Get the first (and only) application
        alert(`You have already applied for a job!\n\nCurrent Application:\nJob: ${existingApplication.job_title}\nPosition: ${existingApplication.position}\nDepartment: ${existingApplication.department}\nStatus: ${existingApplication.status}\n\nYou can only apply for one job at a time. Please wait for your current application to be processed.`);
        return;
      }
      
      setSelectedJob(job);
      setShowApplicationModal(true);
    } else {
      alert("Only applicants can apply for jobs. Please log in with an applicant account.");
    }
  };

  const handleJobCardClick = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  // Fetch user's applications
  const fetchUserApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/my-applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      // Set empty array if error to prevent crashes
      setUserApplications([]);
    }
  };

  // Accept job offer
  const handleAcceptOffer = async (applicationId) => {
    if (!window.confirm('Are you sure you want to accept this job offer? This action cannot be undone.')) {
      return;
    }

    setAcceptingOffer(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:8000/api/applications/${applicationId}/accept-offer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message || 'Congratulations! You have accepted the job offer.');
      fetchUserApplications(); // Refresh applications
    } catch (error) {
      console.error('Error accepting offer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to accept offer. Please try again.';
      alert(errorMessage);
    } finally {
      setAcceptingOffer(false);
    }
  };

  // Decline job offer
  const handleDeclineOffer = async (applicationId) => {
    if (!window.confirm('Are you sure you want to decline this job offer?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:8000/api/applications/${applicationId}/decline-offer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message || 'You have declined the job offer.');
      fetchUserApplications(); // Refresh applications
    } catch (error) {
      console.error('Error declining offer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to decline offer. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle file selection for resume
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setResumeError(''); // Clear any existing errors
    } else {
      // Clear the invalid file and show error
      e.target.value = '';
      setResumeFile(null);
      setResumeError('Please select a PDF file for your resume.');
    }
  };

  // Submit job application
  const handleSubmitApplication = async () => {
    if (!resumeFile) {
      setResumeError('Please select a PDF resume file.');
      return;
    }
    setResumeError(''); // Clear any existing errors

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('job_posting_id', selectedJob.id);
      formData.append('resume', resumeFile);
      
      // Add job details to the application for better tracking
      formData.append('job_title', selectedJob.title);
      formData.append('department', selectedJob.department);
      formData.append('position', selectedJob.position);
      formData.append('applied_at_ph', new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/applications', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setShowApplicationModal(false);
      setSelectedJob(null);
      setResumeFile(null);
      setShowSuccessModal(true);
      
      // Immediately refresh user applications to show the new submission
      if (userRole === 'Applicant') {
        fetchUserApplications();
      }
      
      // Store application data in localStorage for immediate access
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const applicationData = {
        id: response.data.id || response.data.application?.id,
        job_title: selectedJob.title,
        department: selectedJob.department,
        position: selectedJob.position,
        applicant_name: user.name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : 'N/A'),
        applicant_email: user.email || 'N/A',
        applied_at: new Date().toISOString(),
        applied_at_ph: new Date().toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        applied_date_ph: new Date().toLocaleDateString('en-PH', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        applied_time_ph: new Date().toLocaleTimeString('en-PH', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        status: 'Pending'
      };
      
      // Store in localStorage for immediate access in PersonalOnboarding
      localStorage.setItem('latestApplication', JSON.stringify(applicationData));
    } catch (error) {
      // Only log detailed error info in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error submitting application:', error);
      }
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 409) {
          if (process.env.NODE_ENV === 'development') {
            console.log('409 Error data:', errorData);
          }
          if (errorData.details?.existing_application) {
            setDuplicateApplicationInfo({
              message: errorData.message,
              existing_application: errorData.details.existing_application,
              suggestion: errorData.suggestion
            });
            setShowDuplicateApplicationModal(true);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Duplicate application modal should be shown');
            }
            
            // Fallback: also show an alert in case modal doesn't appear
            setTimeout(() => {
              alert(`${errorData.message}\n\n${errorData.suggestion}`);
            }, 1000);
          } else {
            alert(errorData.message || 'You have already applied for this job.');
          }
        } else if (status === 401) {
          alert('Please log in to submit an application.');
        } else if (status === 422) {
          alert('Please check your application details and try again.');
        } else {
          alert(`Application submission failed. Please try again. (Error: ${status})`);
        }
      } else if (error.request) {
        // Request was made but no response received
        alert('Network error. Please check your internet connection and try again.');
      } else {
        // Something else happened
        alert('An unexpected error occurred. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  // Format date for display with Philippines timezone
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get current Philippines time for reference
  const getCurrentPhilippinesTime = () => {
    return new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto", paddingTop: "70px" }}>
      {/* Professional Clean Navbar */}
      <nav 
        className="navbar navbar-dark" 
        style={{ 
        backgroundColor: "#0033ff",
        boxShadow: '0 2px 15px rgba(0,0,0,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0.75rem 0',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1030
        }}
      >
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center justify-content-between w-100">
            {/* Left side - Menu button and Logo */}
            <div className="d-flex align-items-center">
              {/* Mobile Toggle Button - Left of Logo */}
                <button
                className="d-lg-none btn p-2 me-3"
                onClick={toggleMobileMenu}
                aria-label="Toggle navigation"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>☰</span>
              </button>

              {/* CCDC Brand/Logo Section - No Image */}
              <div className="navbar-brand d-flex align-items-center">
                <a className="d-flex align-items-center text-decoration-none" href="/">
                  <span 
                    className="fw-bold fs-3" 
                    style={{
                    color: '#ffffff',
                      fontFamily: "'Momo Trust Display', sans-serif",
                      letterSpacing: '1px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    CCDC
                  </span>
                </a>
              </div>
            </div>

            {/* Desktop Navigation - Right Side */}
            <div className="d-none d-lg-flex align-items-center gap-3">
              <a 
                href="/" 
                className="nav-link text-white px-3 py-2 rounded"
                style={{ transition: 'background-color 0.3s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Home
              </a>
              <button 
                onClick={scrollToJobs}
                className="btn nav-link text-white px-3 py-2 rounded border-0"
                style={{ transition: 'background-color 0.3s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Browse Jobs
              </button>
              {isLoggedIn && userRole === 'Applicant' && hasOnboardingAccess && (
                <button 
                  onClick={handleOnboardingClick}
                  className="btn nav-link text-white px-3 py-2 rounded border-0"
                  style={{ transition: 'background-color 0.3s' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <i className="bi bi-person-check me-1"></i>My Onboarding
                </button>
              )}
              <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>
              {isLoggedIn ? (
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center">
                    <div style={{
                      width: '8px', height: '8px', backgroundColor: '#48bb78',
                      borderRadius: '50%', marginRight: '8px', animation: 'pulse 2s infinite'
                    }}></div>
                    <span className="text-white small">{userRole || 'User'}</span>
                  </div>
                  <button 
                    onClick={handleLogoutClick}
                    className="btn btn-outline-light"
                    style={{
                      padding: '10px 20px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      borderWidth: '2px',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      minWidth: '100px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#ef4444';
                      e.target.style.borderColor = '#ef4444';
                      e.target.style.color = '#ffffff';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                      e.target.style.color = '#ffffff';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLoginClick}
                  className="btn btn-outline-light"
                  style={{
                    padding: '10px 20px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderWidth: '2px',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    minWidth: '100px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#0033ff';
                    e.target.style.borderColor = '#ffffff';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#ffffff';
                    e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  Log In
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          <AnimatePresence>
          {mobileMenuOpen && (
              <motion.div 
                className="d-lg-none" 
                style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              background: 'rgba(5, 117, 230, 0.98)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0 0 15px 15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div className="d-flex flex-column gap-3">
                 <a 
                   href="/" 
                   className="text-white text-decoration-none p-3 rounded"
                   style={{
                     backgroundColor: 'rgba(255,255,255,0.1)',
                     border: '2px solid transparent',
                     transition: 'all 0.3s ease',
                     display: 'flex',
                     alignItems: 'center',
                     minHeight: '50px',
                     fontSize: '1.1rem',
                     fontWeight: '500'
                   }}
                   onClick={() => setMobileMenuOpen(false)}
                   onMouseEnter={(e) => {
                     e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                     e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                     e.target.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                     e.target.style.borderColor = 'transparent';
                     e.target.style.transform = 'translateY(0)';
                   }}
                 >
                   Home
                 </a>
                 <button 
                   onClick={() => {
                     scrollToJobs();
                     setMobileMenuOpen(false);
                   }}
                   className="btn text-white text-start p-3 rounded border-0 d-flex align-items-center"
                   style={{
                     backgroundColor: 'rgba(255,255,255,0.1)',
                     border: '2px solid transparent',
                     transition: 'all 0.3s ease',
                     minHeight: '50px',
                     fontSize: '1.1rem',
                     fontWeight: '500'
                   }}
                   onMouseEnter={(e) => {
                     e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                     e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                     e.target.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                     e.target.style.borderColor = 'transparent';
                     e.target.style.transform = 'translateY(0)';
                   }}
                 >
                   Browse Jobs
                 </button>
                 {isLoggedIn && userRole === 'Applicant' && hasOnboardingAccess && (
                   <button 
                     onClick={() => {
                       handleOnboardingClick();
                       setMobileMenuOpen(false);
                     }}
                     className="btn text-white text-start p-3 rounded border-0 d-flex align-items-center"
                     style={{
                       backgroundColor: 'rgba(255,255,255,0.1)',
                       border: '2px solid transparent',
                       transition: 'all 0.3s ease',
                       minHeight: '50px',
                       fontSize: '1.1rem',
                       fontWeight: '500'
                     }}
                     onMouseEnter={(e) => {
                       e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                       e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                       e.target.style.transform = 'translateY(-1px)';
                     }}
                     onMouseLeave={(e) => {
                       e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                       e.target.style.borderColor = 'transparent';
                       e.target.style.transform = 'translateY(0)';
                     }}
                   >
                     <i className="bi bi-person-check me-2"></i>My Onboarding
                   </button>
                 )}
                 <hr style={{ borderColor: 'rgba(255,255,255,0.3)', margin: '10px 0' }} />
                 {isLoggedIn ? (
                   <div className="d-flex flex-column gap-2">
                     <div className="text-white p-2 d-flex align-items-center">
                       <div style={{
                         width: '8px', height: '8px', backgroundColor: '#48bb78',
                         borderRadius: '50%', marginRight: '10px'
                       }}></div>
                       Logged in as {userRole || 'User'}
                     </div>
                    <button 
                      onClick={() => {
                        handleLogoutClick();
                        setMobileMenuOpen(false);
                      }}
                      className="btn text-white text-start p-4 rounded border-0 d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: '#ef4444',
                        transition: 'all 0.3s ease',
                        minHeight: '55px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#dc2626';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ef4444';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      handleLoginClick();
                      setMobileMenuOpen(false);
                    }}
                     className="btn text-white text-start p-4 rounded border-0 d-flex align-items-center justify-content-center"
                     style={{
                       backgroundColor: '#0575E6',
                       border: '2px solid rgba(255,255,255,0.3)',
                       transition: 'all 0.3s ease',
                       minHeight: '55px',
                       fontSize: '1.1rem',
                       fontWeight: '600',
                       boxShadow: '0 2px 8px rgba(5, 117, 230, 0.3)'
                     }}
                     onMouseEnter={(e) => {
                       e.target.style.backgroundColor = '#ffffff';
                       e.target.style.color = '#0575E6';
                       e.target.style.transform = 'translateY(-1px)';
                     }}
                     onMouseLeave={(e) => {
                       e.target.style.backgroundColor = '#0575E6';
                       e.target.style.color = '#ffffff';
                       e.target.style.transform = 'translateY(0)';
                     }}
                   >
                     Log In
                   </button>
                )}
              </div>
              </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Custom Styles */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Momo+Trust+Display&display=swap');
          
          /* Default font for all text */
          body, .navbar, .nav-link, button, a, p, span, div, label, input, textarea, select {
            font-family: 'Noto Sans', sans-serif;
          }
          
          /* Job Portal Hamburger Override */
          .job-portal-hamburger {
            position: static !important;
            top: auto !important;
            left: auto !important;
            z-index: auto !important;
            transform: none !important;
            box-shadow: none !important;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .navbar-brand-container:hover img {
            transform: scale(1.05);
          }
          
          @media (max-width: 991.98px) {
            .navbar-collapse {
              background-color: rgba(5, 117, 230, 0.95);
              backdrop-filter: blur(10px);
              border-radius: 0 0 15px 15px;
              margin-top: 10px;
              padding: 15px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            
            .auth-section {
              border-top: 1px solid rgba(255,255,255,0.2);
              padding-top: 1rem;
              margin-top: 1rem;
              width: 100%;
              justify-content: center;
            }
            
            .navbar-nav {
              width: 100%;
              margin-bottom: 0.5rem;
            }
            
            .navbar-nav .nav-item {
              width: 100%;
              margin-bottom: 0.25rem;
            }
          }
          
          .nav-link::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 50%;
            width: 0;
            height: 2px;
            background-color: #4299e1;
            transition: all 0.3s ease;
            transform: translateX(-50%);
          }
          
          .nav-link:hover::after {
            width: 70%;
          }
          
          /* Job Dropdown Animation */
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
              max-height: 0;
            }
            to {
              opacity: 1;
              transform: translateY(0);
              max-height: 1000px;
            }
          }
          
          .expanded-content {
            overflow: hidden;
            transition: all 0.3s ease-out;
          }
          
          .job-listing-card {
            transition: all 0.3s ease;
          }
          
          .job-listing-card:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 8px 25px rgba(0,0,0,0.12) !important;
            border-color: #0575E6 !important;
          }
        `}</style>
      </nav>

      {/* Intro Section */}
      <section
        ref={introSectionRef}
        style={{
          minHeight: "100vh",
          backgroundColor: "#00033d",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem 1rem",
          position: "relative",
          overflow: "hidden",
        }}
        className="px-3 px-md-5"
      >
        {/* Interactive Glowing Light that follows cursor */}
        <motion.div
          style={{
            position: "absolute",
            left: smoothX,
            top: smoothY,
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "#0033ff",
            pointerEvents: "none",
            x: "-50%",
            y: "-50%",
            zIndex: 1,
            mixBlendMode: "difference",
          }}
          animate={{
            scale: isHoveringText ? 1.2 : 0.15,
            opacity: isHoveringText ? 0.8 : 0.8,
          }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
        />

        {/* Text Content with dynamic color based on cursor position */}
        <div style={{ maxWidth: "650px", position: "relative", zIndex: 2 }}>
          <motion.h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: "800",
              marginBottom: "1rem",
              lineHeight: "1.2",
              animation: "fadeInDown 1.2s ease-out",
              fontFamily: "'Momo Trust Display', sans-serif",
              letterSpacing: '1px',
              color: "#ffffff",
            }}
          >
            Welcome, <strong>{userName || 'Applicant'}</strong>
          </motion.h1>
          <motion.h3
            style={{
              fontWeight: "500",
              fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
              marginBottom: "0.5rem",
              animation: "fadeIn 1.5s ease-out",
              fontFamily: "'Noto Sans', sans-serif",
              letterSpacing: '0.5px',
              color: "#ffffff",
            }}
          >
            Are you ready to join our team?
          </motion.h3>
          <motion.p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
              color: "#ffffff",
              marginBottom: "1.5rem",
              animation: "fadeIn 1.8s ease-out",
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            Cabuyao Concrete Development Corporation is seeking talented and
            motivated individuals to contribute to our growing success. We
            value professionalism, dedication, and a passion for excellence.
          </motion.p>
          <motion.p
            style={{
              fontSize: "clamp(0.9rem, 2vw, 1rem)",
              color: "#ffffff",
              marginBottom: "2rem",
              animation: "fadeIn 2.1s ease-out",
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            Review the job details below and take the first step towards
            building your career with us.
          </motion.p>
        </div>

        <style>
          {`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
        </style>
      </section>

      {/* Hero Section */}
      <motion.section
        id="jobs-section"
        className="d-flex align-items-center text-white"
        style={{
          background: "#0033ff",
          minHeight: "350px",
          padding: "2rem 1rem",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="container d-flex justify-content-center align-items-center mx-auto"
          initial={{ y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div 
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.h1 
              className="fw-bold display-5" 
              style={{ fontFamily: "'Momo Trust Display', sans-serif", letterSpacing: '1px' }}
              animate={{ 
                textShadow: [
                  '0 0 0px rgba(255,255,255,0)',
                  '0 0 30px rgba(255,255,255,0.4)',
                  '0 0 0px rgba(255,255,255,0)'
                ]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              Find your Dream Job
            </motion.h1>
            <motion.p 
              className="lead" 
              style={{ fontFamily: "'Noto Sans', sans-serif" }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Be a part of a company that invests in your growth and
              development.
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.section>


      {/* Job Listing */}
      <section className="bg-light py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold" style={{ fontFamily: "'Momo Trust Display', sans-serif", letterSpacing: '1px', color: '#00033d' }}>Job Listings</h3>
          </div>

          {jobs.length === 0 ? (
            <motion.div 
              className="text-center py-5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h5 className="text-muted">No job postings available</h5>
              <p className="text-muted">Check back later for new opportunities!</p>
            </motion.div>
          ) : (
            jobs.map((job, index) => (
              <motion.div
                key={job.id}
                className="bg-white rounded-3 shadow-sm border-0 mb-4 job-listing-card overflow-hidden"
                style={{ 
                  cursor: 'pointer', 
                  border: '1px solid #e9ecef'
                }}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.5,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  boxShadow: '0 12px 40px rgba(5, 117, 230, 0.2)',
                  borderColor: '#0575E6',
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleJobCardClick(job.id)}
              >
                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-start p-4 pb-2">
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="mb-1 fw-bold text-dark" style={{ fontSize: '1.25rem' }}>
                        {job.title}
                      </h5>
                      <span className={`badge ${job.status === 'Open' ? 'bg-success' : 'bg-danger'} ms-3`} 
                            style={{ fontSize: '0.75rem' }}>
                        {job.status}
                      </span>
                    </div>
                    
                    {job.position && (
                      <div className="mb-2">
                        <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill" 
                              style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                          {job.position}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-muted small mb-2">
                      <span className="me-4">
                        <strong>Department:</strong> {job.department}
                      </span>
                      <span>
                        <strong>Type:</strong> Full-time
                      </span>
                    </div>
                    
                    {job.salary_min && job.salary_max && (
                      <div className="mb-2">
                        <span className="badge bg-success-subtle text-success px-2 py-1" style={{ fontSize: '0.8rem' }}>
                          ₱{Number(job.salary_min).toLocaleString()} - ₱{Number(job.salary_max).toLocaleString()}
                        </span>
                        {job.salary_notes && (
                          <div className="text-muted mt-1" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                            {job.salary_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Section */}
                <div className="px-4 pb-2">
                  <p className="text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
                    {job.description?.substring(0, 120)}...
                  </p>
                  <div className="mt-2">
                    <small className="text-primary fst-italic">
                      <i className="bi bi-hand-index me-1"></i>
                      Click anywhere on this card to view full details
                    </small>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="d-flex justify-content-between align-items-center p-4 pt-3 bg-light bg-opacity-50">
                  <div className="d-flex align-items-center">
                    <small className="text-muted me-3">
                      <strong>Posted:</strong> {job.ph_created_at || formatDate(job.created_at)}
                    </small>
                    <small className="text-primary fw-semibold">
                      <i className={`bi ${expandedJobId === job.id ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    {job.status === 'Open' && (
                      <button 
                        className={`btn btn-sm px-3 ${userApplications.length > 0 ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(job);
                        }}
                        disabled={userApplications.length > 0}
                        style={{ 
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          borderRadius: '6px',
                          transition: 'all 0.3s ease'
                        }}
                        title={userApplications.length > 0 ? 'You already have an active application' : 'Apply for this job'}
                      >
                        {userApplications.length > 0 ? 'Already Applied' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Content Section */}
                <AnimatePresence>
                {expandedJobId === job.id && (
                    <motion.div
          className="expanded-content"
          style={{
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            maxHeight: 'none',
            overflow: 'visible'
          }}
                      initial={{ 
                        opacity: 0, 
                        height: 0,
                        y: -20
                      }}
                      animate={{ 
                        opacity: 1, 
                        height: 'auto',
                        y: 0
                      }}
                      exit={{ 
                        opacity: 0, 
                        height: 0,
                        y: -20
                      }}
                      transition={{ 
                        duration: 0.4,
                        ease: "easeInOut"
          }}
        >
                    <div className="p-4">
                      {/* Job Description */}
                      <div className="mb-4">
                        <h6 className="fw-bold text-dark mb-3 pb-2 border-bottom border-primary border-opacity-25">
                          <i className="bi bi-file-text me-2"></i>
                          Job Description
                        </h6>
                        <div className="bg-white border rounded-3 p-3">
                <p className="mb-0 lh-lg" style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: '#495057', wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', hyphens: 'auto' }}>
                            {job.description}
                          </p>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="mb-4">
                        <h6 className="fw-bold text-dark mb-3 pb-2 border-bottom border-success border-opacity-25">
                          <i className="bi bi-list-check me-2"></i>
                          Requirements & Qualifications
                        </h6>
                        <div className="bg-white border rounded-3 p-3">
                <p className="mb-0 lh-lg" style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: '#495057', wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', hyphens: 'auto' }}>
                            {job.requirements}
                          </p>
                        </div>
                      </div>

                      {/* Department and Compensation sections removed as requested */}

                      {/* Action Buttons */}
                      <div className="d-flex gap-3 justify-content-center pt-3">
                        <button 
                          className="btn btn-outline-secondary px-4 py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedJobId(null);
                          }}
                          style={{ borderRadius: '8px', fontWeight: '500' }}
                        >
                          <i className="bi bi-chevron-up me-1"></i>
                        </button>
                        {/* Apply button removed from expanded dropdown */}
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Application Modal */}
      <AnimatePresence>
      {showApplicationModal && (
          <motion.div 
            className="modal show d-block" 
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              <motion.div 
                className="modal-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Job Application</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                    setResumeFile(null);
                    setResumeError('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <h6 className="fw-bold text-primary">Apply for {selectedJob?.title}</h6>
                  <p className="text-muted">Please upload your resume to apply for this position</p>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="resume" className="form-label fw-bold">
                    Upload Resume (PDF only) *
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="resume"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                  <div className="form-text">
                    Please upload your resume in PDF format (max 10MB)
                  </div>
                  {resumeError && (
                    <div className="mt-2">
                      <small className="text-danger">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {resumeError}
                      </small>
                    </div>
                  )}
                  {resumeFile && (
                    <div className="mt-2">
                      <small className="text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Selected: {resumeFile.name}
                      </small>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                    setResumeFile(null);
                    setResumeError('');
                  }}
                  disabled={applying}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSubmitApplication}
                  disabled={applying || !resumeFile}
                >
                  {applying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>


      {/* Job Details Modal */}
      {showJobDetailsModal && selectedJobForDetails && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0" style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '0.5rem 0.5rem 0 0'
              }}>
                <div className="w-100">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="modal-title fw-bold text-dark mb-1">
                        {selectedJobForDetails.title}
                      </h3>
                      {selectedJobForDetails.position && (
                        <span className="badge bg-primary px-3 py-1 rounded-pill" style={{ fontSize: '0.9rem' }}>
                          {selectedJobForDetails.position}
                        </span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => {
                        setShowJobDetailsModal(false);
                        setSelectedJobForDetails(null);
                      }}
                    ></button>
                  </div>
                </div>
              </div>
              
              <div className="modal-body p-4">
                {/* Job Overview */}
                <div className="row mb-4">
                  <div className="col-md-8">
                    <div className="bg-light rounded-3 p-3">
                      <div className="row text-center">
                        <div className="col-md-3 mb-3 mb-md-0">
                          <div className="text-muted small mb-1">Department</div>
                          <div className="fw-semibold">{selectedJobForDetails.department}</div>
                        </div>
                        <div className="col-md-3 mb-3 mb-md-0">
                          <div className="text-muted small mb-1">Position</div>
                          <div className="fw-semibold">{selectedJobForDetails.position || 'N/A'}</div>
                        </div>
                        <div className="col-md-3 mb-3 mb-md-0">
                          <div className="text-muted small mb-1">Salary Range</div>
                          <div className="fw-semibold text-success">
                            {selectedJobForDetails.salary_min && selectedJobForDetails.salary_max ? (
                              `₱${Number(selectedJobForDetails.salary_min).toLocaleString()} - ₱${Number(selectedJobForDetails.salary_max).toLocaleString()}`
                            ) : (
                              'To be discussed'
                            )}
                          </div>
                          {selectedJobForDetails.salary_notes && (
                            <div className="text-muted" style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                              {selectedJobForDetails.salary_notes}
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <div className="text-muted small mb-1">Posted Date (PH Time)</div>
                          <div className="fw-semibold">
                            {selectedJobForDetails.ph_created_at || formatDate(selectedJobForDetails.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 d-flex align-items-center justify-content-center">
                    <div className="text-center">
                      <span className={`badge ${selectedJobForDetails.status === 'Open' ? 'bg-success' : 'bg-danger'} px-4 py-2 rounded-pill`} 
                            style={{ fontSize: '1rem', fontWeight: '500' }}>
                        {selectedJobForDetails.status === 'Open' ? 'Accepting Applications' : 'Applications Closed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div className="mb-5">
                  <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom border-primary border-opacity-25">
                    Job Description
                  </h5>
                  <div className="bg-white border rounded-3 p-4">
                    <p className="mb-0 lh-lg" style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#495057' }}>
                      {selectedJobForDetails.description}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                <div className="mb-4">
                  <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom border-success border-opacity-25">
                    Requirements & Qualifications
                  </h5>
                  <div className="bg-white border rounded-3 p-4">
                    <p className="mb-0 lh-lg" style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#495057' }}>
                      {selectedJobForDetails.requirements}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer border-0 pt-0 pb-4 px-4">
                <div className="d-flex gap-3 w-100">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 py-2"
                    style={{ borderRadius: '8px', fontWeight: '500' }}
                    onClick={() => {
                      setShowJobDetailsModal(false);
                      setSelectedJobForDetails(null);
                    }}
                  >
                    Close
                  </button>
                  {selectedJobForDetails.status === 'Open' && (
                    <button 
                      type="button" 
                      className={`btn flex-fill px-4 py-2 ${userApplications.length > 0 ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ borderRadius: '8px', fontWeight: '600', fontSize: '1rem' }}
                      onClick={() => {
                        setShowJobDetailsModal(false);
                        setSelectedJobForDetails(null);
                        handleApplyClick(selectedJobForDetails);
                      }}
                      disabled={userApplications.length > 0}
                      title={userApplications.length > 0 ? 'You already have an active application' : 'Apply for this position'}
                    >
                      {userApplications.length > 0 ? 'Already Applied' : 'Apply for this Position'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Success Modal */}
      <AnimatePresence>
      {showSuccessModal && (
          <motion.div 
            className="modal show d-block" 
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-dialog modal-dialog-centered"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
            >
              <motion.div 
                className="modal-content border-0 shadow-lg"
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
              <div className="modal-header border-0 text-center" style={{
                background: '#0033ff',
                borderRadius: '0.5rem 0.5rem 0 0'
              }}>
                <div className="w-100 text-center">
                  <h4 className="modal-title fw-bold text-white mb-0">
                    Application Submitted Successfully!
                  </h4>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowSuccessModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="mb-4">
                  <div className="alert alert-success border-0" style={{ backgroundColor: '#d4edda' }}>
                    <h5 className="text-success mb-2">
                      Thank you for applying!
                    </h5>
                    <p className="mb-0 text-success-emphasis">
                      Your application has been received and is now under review by our HR team.
                    </p>
                  </div>
                </div>
                
                <div className="row text-center">
                  <div className="col-12">
                    <h6 className="fw-bold mb-3">What happens next?</h6>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <div className="p-3 bg-light rounded">
                          <h6 className="fw-semibold">Review</h6>
                          <small className="text-muted">HR will review your application</small>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="p-3 bg-light rounded">
                          <h6 className="fw-semibold">Contact</h6>
                          <small className="text-muted">We'll contact you if shortlisted</small>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="p-3 bg-light rounded">
                          <h6 className="fw-semibold">Interview</h6>
                          <small className="text-muted">Schedule interview if selected</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="alert alert-info border-0">
                    <p className="mb-0">
                      <strong>Track your application:</strong>                       You can check your application status anytime.
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <div className="d-flex gap-2 w-100">
                  <button 
                    type="button" 
                    className="btn flex-fill fw-semibold text-white"
                    style={{ backgroundColor: '#0033ff', borderColor: '#0033ff' }}
                    onClick={() => setShowSuccessModal(false)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#0028cc';
                      e.target.style.borderColor = '#0028cc';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#0033ff';
                      e.target.style.borderColor = '#0033ff';
                    }}
                  >
                    Okay
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setShowSuccessModal(false);
                    }}
                  >
                    View Status
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate Application Modal */}
      {showDuplicateApplicationModal && duplicateApplicationInfo && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0" style={{
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                borderRadius: '0.5rem 0.5rem 0 0'
              }}>
                <div className="w-100">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="text-white me-3" style={{ fontSize: '2.5rem' }}>🚫</div>
                      <div>
                        <h4 className="modal-title fw-bold text-white mb-1">
                          Application Not Allowed
                        </h4>
                        <p className="mb-0 text-white-50 small">
                          You already have an active application in progress
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white" 
                      onClick={() => {
                        setShowDuplicateApplicationModal(false);
                        setDuplicateApplicationInfo(null);
                      }}
                    ></button>
                  </div>
                </div>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-danger border-0" style={{ backgroundColor: '#f8d7da' }}>
                  <h6 className="fw-bold text-danger mb-2">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {duplicateApplicationInfo.message}
                  </h6>
                  <p className="mb-0 text-danger-emphasis">
                    {duplicateApplicationInfo.suggestion}
                  </p>
                </div>
                
                <div className="card border-primary">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-briefcase me-2"></i>
                      Your Current Application
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>Job Title:</strong><br/>
                          <span className="text-primary">{duplicateApplicationInfo.existing_application.job_title}</span>
                        </p>
                        <p className="mb-2">
                          <strong>Position:</strong><br/>
                          <span className="text-success">{duplicateApplicationInfo.existing_application.position}</span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-2">
                          <strong>Department:</strong><br/>
                          {duplicateApplicationInfo.existing_application.department}
                        </p>
                        <p className="mb-2">
                          <strong>Status:</strong><br/>
                          <span className={`badge ${
                            duplicateApplicationInfo.existing_application.status === 'Applied' ? 'bg-primary' :
                            duplicateApplicationInfo.existing_application.status === 'ShortListed' ? 'bg-success' :
                            duplicateApplicationInfo.existing_application.status === 'Interview' ? 'bg-info' :
                            duplicateApplicationInfo.existing_application.status === 'Offer Sent' ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {duplicateApplicationInfo.existing_application.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-light rounded">
                      <small className="text-muted">
                        <strong>Applied on:</strong> {new Date(duplicateApplicationInfo.existing_application.applied_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </small>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="alert alert-info border-0">
                    <h6 className="fw-bold text-info mb-2">
                      <i className="bi bi-lightbulb me-2"></i>
                      What you can do:
                    </h6>
                    <ul className="list-unstyled mb-0 text-info-emphasis">
                      <li>• Wait for your current application to be processed</li>
                      <li>• Check your application status regularly</li>
                      <li>• Apply to other positions once your current application is resolved</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <div className="d-flex gap-2 w-100">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowDuplicateApplicationModal(false);
                      setDuplicateApplicationInfo(null);
                    }}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Close
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary flex-fill"
                    onClick={() => {
                      setShowDuplicateApplicationModal(false);
                      setDuplicateApplicationInfo(null);
                    }}
                  >
                    <i className="bi bi-eye me-1"></i>
                    Check Application Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification System for Applicants */}
      {isLoggedIn && userRole === 'Applicant' && (
        <NotificationSystem 
          userId={localStorage.getItem('userId')} 
          userRole={userRole}
          onApplicationUpdate={(apps) => {
            // Check if there are status changes that would indicate new notifications
            const hasChanges = apps.some(app => {
              const lastStatus = localStorage.getItem(`app_${app.id}_last_status`);
              return lastStatus && lastStatus !== app.status;
            });
            setHasNewNotifications(hasChanges);
          }}
        />
      )}
    </div>
  );
}