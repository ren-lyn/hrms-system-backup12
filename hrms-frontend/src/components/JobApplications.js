import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Form, Modal, Row, Col, Alert, ProgressBar } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const JobApplications = () => {
  const navigate = useNavigate();
  
  // Helper function to handle authentication errors
  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      console.log('[JobApplications] Authentication failed - token may be invalid or expired');
      showError('Authentication failed. Please log in again.');
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userRole');
      setIsLoggedIn(false);
      setUserRole(null);
      navigate('/login');
      return true;
    } else if (error.response?.status === 403) {
      console.log('[JobApplications] Access denied - insufficient permissions');
      showError('Access denied. You do not have permission to perform this action.');
      return true;
    } else if (error.response?.status === 404) {
      console.log('[JobApplications] API endpoint not found');
      showError('API endpoint not found. Please contact support.');
      return true;
    }
    return false;
  };

  // Toast notification functions
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Application modal states
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  
  // View states
  const [activeTab, setActiveTab] = useState('browse'); // browse, my-applications
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(null); // Track which application is being updated
  
  // Verify that status change was persisted in the database
  const verifyStatusPersistence = async (applicationId, expectedStatus) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = 'http://localhost:8000/api/my-applications';
      
      if (userRole === 'HR Staff' || userRole === 'HR Assistant') {
        endpoint = 'http://localhost:8000/api/applications';
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const application = response.data.find(app => app.id === applicationId);
      if (application) {
        console.log(`🔍 [JobApplications] Status verification for app ${applicationId}: Expected=${expectedStatus}, Actual=${application.status}`);
        if (application.status === expectedStatus) {
          console.log(`✅ [JobApplications] Status persistence verified successfully!`);
          return true;
        } else {
          console.error(`❌ [JobApplications] Status persistence failed! Expected ${expectedStatus}, got ${application.status}`);
          showError(`Status update may not have been saved properly. Expected: ${expectedStatus}, Found: ${application.status}`);
          return false;
        }
      } else {
        console.error(`❌ [JobApplications] Application ${applicationId} not found in verification`);
        return false;
      }
    } catch (error) {
      console.error('[JobApplications] Error verifying status persistence:', error);
      return false;
    }
  };

  // Function to update application status
  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      // Set loading state for this specific application
      setUpdatingStatus(applicationId);
      
      console.log(`🔄 [JobApplications] Updating application ${applicationId} status to: ${newStatus}`);
      console.log(`🔗 [JobApplications] API URL: http://localhost:8000/api/applications/${applicationId}/status`);
      console.log(`📤 [JobApplications] Request payload:`, { status: newStatus });
      console.log(`👤 [JobApplications] User role: ${userRole}`);
      
      // Only HR Staff and HR Assistant should be able to update status
      if (userRole !== 'HR Staff' && userRole !== 'HR Assistant') {
        showError('Only HR Staff and HR Assistant can update application status');
        return;
      }
      
      const response = await axios.put(`http://localhost:8000/api/applications/${applicationId}/status`, {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📥 [JobApplications] Response received:`, response);
      console.log(`📊 [JobApplications] Response status:`, response.status);
      console.log(`📋 [JobApplications] Response data:`, response.data);

      // Check if the response indicates success (backend returns message and application)
      if (response.status === 200 && response.data && response.data.message) {
        showSuccess(`Application status updated to: ${newStatus}`);
        
        // Update the local state immediately with the updated application data from server
        if (response.data.application) {
          setMyApplications(prev => prev.map(app => 
            app.id === applicationId 
              ? { ...app, ...response.data.application, status: newStatus, updated_at: new Date().toISOString() }
              : app
          ));
        } else {
          // Fallback: update with local data
          setMyApplications(prev => prev.map(app => 
            app.id === applicationId 
              ? { ...app, status: newStatus, updated_at: new Date().toISOString() }
              : app
          ));
        }
        
        // Force a re-render to ensure UI updates
        console.log(`✅ [JobApplications] Status updated successfully in local state: ${newStatus}`);
        
        // If status is changed to ShortListed, notify onboarding dashboards to refresh
        if (newStatus === 'ShortListed') {
          console.log(`🎯 [JobApplications] Applicant marked as ShortListed, notifying onboarding dashboards`);
          
          // Dispatch custom event for onboarding dashboard refresh
          window.dispatchEvent(new CustomEvent('onboardingDashboardRefresh', {
            detail: { 
              applicationId, 
              status: newStatus,
              source: 'JobApplications',
              timestamp: new Date().toISOString()
            }
          }));
          
          // Set localStorage trigger for cross-tab communication
          localStorage.setItem('onboarding_dashboard_refresh', JSON.stringify({
            applicationId,
            status: newStatus,
            source: 'JobApplications',
            timestamp: new Date().toISOString()
          }));
          
          console.log(`🚀 [JobApplications] Onboarding dashboard refresh notifications sent`);
        }
        
        console.log(`✅ Status updated successfully: ${newStatus}`);
        console.log(`📋 Updated application data:`, response.data.application);
        
        // Refresh applications from server to ensure data consistency
        setTimeout(async () => {
          console.log('🔄 Refreshing applications list from server to verify persistence...');
          await fetchApplications();
          
          // Verify the status was actually saved
          const isPersisted = await verifyStatusPersistence(applicationId, newStatus);
          if (!isPersisted) {
            console.error('❌ Status persistence verification failed!');
          }
        }, 1000);
        
      } else {
        showError('Failed to update application status');
        console.error('[JobApplications] Unexpected response structure:', response.data);
      }
    } catch (error) {
      console.error('[JobApplications] Error updating application status:', error);
      
      // Handle authentication errors
      if (handleAuthError(error)) {
        return;
      }
      
      // Provide specific error messages
      if (error.response?.data?.message) {
        showError(`Failed to update status: ${error.response.data.message}`);
      } else {
        showError(`Failed to update status: ${error.message}`);
      }
      
      // If it was a ShortListed status update that failed, log specifically
      if (newStatus === 'ShortListed') {
        console.error('⚠️ [JobApplications] Failed to mark applicant as ShortListed - onboarding dashboard will not be updated');
      }
    } finally {
      // Clear loading state
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    fetchJobs();
  }, []);
  
  // Separate useEffect for fetching applications when auth state or role changes
  useEffect(() => {
    if (isLoggedIn && (userRole === 'Applicant' || userRole === 'HR Staff' || userRole === 'HR Assistant')) {
      console.log(`[JobApplications] Auth state changed - fetching applications for role: ${userRole}`);
      fetchApplications();
    }
  }, [isLoggedIn, userRole]);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole') || localStorage.getItem('role');
    
    console.log('[JobApplications] Checking auth status:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      role: role,
      userRole: localStorage.getItem('userRole'),
      roleAlt: localStorage.getItem('role')
    });
    
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      console.log('[JobApplications] User logged in with role:', role);
    } else {
      console.log('[JobApplications] No authentication found');
      setIsLoggedIn(false);
      setUserRole(null);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/public/job-postings');
      
      setJobs(response.data);
      console.log('Job postings loaded:', response.data.length, 'jobs');
    } catch (error) {
      console.error('Error fetching jobs:', error);
      
      setJobs([]);
      console.log('No job postings found');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        console.log('[JobApplications] No token found, skipping applications fetch');
        setMyApplications([]);
        return;
      }
      
      // Use different endpoints based on user role
      let endpoint = 'http://localhost:8000/api/my-applications'; // Default for applicants
      
      if (userRole === 'HR Staff' || userRole === 'HR Assistant') {
        // HR Staff and HR Assistant should see all applications
        endpoint = 'http://localhost:8000/api/applications';
      }
      
      console.log(`[JobApplications] Fetching applications for role: ${userRole} from endpoint: ${endpoint}`);
      console.log(`[JobApplications] Token exists: ${!!token}`);
      
      const response = await axios.get(endpoint, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`[JobApplications] Raw response data:`, response.data);
      
      // Log each application's status for debugging
      if (Array.isArray(response.data)) {
        response.data.forEach((app, index) => {
          console.log(`[JobApplications] Application ${index + 1}: ID=${app.id}, Status=${app.status}, Updated=${app.updated_at}`);
        });
      }
      
      setMyApplications(response.data || []);
      console.log(`[JobApplications] Applications loaded for ${userRole}:`, (response.data || []).length, 'applications');
    } catch (error) {
      console.error('[JobApplications] Error fetching applications:', error);
      
      // Handle authentication errors
      if (handleAuthError(error)) {
        return;
      }
      
      setMyApplications([]);
      console.log('[JobApplications] No applications found or error occurred');
    }
  };

  const handleApplyClick = (job) => {
    if (!isLoggedIn) {
      showInfo('Please log in to apply for jobs.');
      navigate('/login');
      return;
    }

    if (userRole !== 'Applicant') {
      showError('Only applicants can apply for jobs. Please log in with an applicant account.');
      return;
    }

    // Check if already applied
    const alreadyApplied = myApplications.some(app => 
      app.job_posting.title === job.title && 
      !['Rejected'].includes(app.status)
    );

    if (alreadyApplied) {
      showInfo('You have already applied for this position.');
      return;
    }

    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        showError('Please upload a PDF or Word document.');
        e.target.value = '';
        return;
      }

      if (file.size > maxSize) {
        showError('File size must be less than 5MB.');
        e.target.value = '';
        return;
      }

      setResumeFile(file);
    }
  };

  const handleSubmitApplication = async () => {
    if (!resumeFile) {
      showError('Please upload your resume.');
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('job_posting_id', selectedJob.id);
      formData.append('resume', resumeFile);
      formData.append('cover_letter', coverLetter);

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/applications', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      showSuccess('Application submitted successfully! You will be notified of any updates.');
      setShowApplicationModal(false);
      resetApplicationForm();
      
      // Refresh applications list to show the new submission
      await fetchApplications();
      console.log('Applications refreshed after submission');

    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response?.status === 409) {
        showError('You have already applied for this position.');
      } else {
        showError('Failed to submit application. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  const resetApplicationForm = () => {
    setSelectedJob(null);
    setResumeFile(null);
    setCoverLetter('');
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Pending': 
      case 'Applied': // Backward compatibility
        return 'warning';
      case 'ShortListed': return 'info';
      case 'Interview': return 'warning';
      case 'Offered': return 'success';
      case 'Offered Accepted': return 'success';
      case 'Onboarding': return 'dark';
      case 'Hired': return 'success';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusProgress = (status) => {
    const progressMap = {
      'Pending': 10,
      'Applied': 10, // Backward compatibility
      'ShortListed': 25,
      'Interview': 50,
      'Offered': 75,
      'Offered Accepted': 90,
      'Onboarding': 95,
      'Hired': 100,
      'Rejected': 0
    };
    return progressMap[status] || 0;
  };

  const getDepartments = () => {
    const departments = [...new Set(jobs.map(job => job.department))];
    return departments.sort();
  };

  const getApplicationStats = () => {
    const stats = {
      total: myApplications.length,
      pending: myApplications.filter(app => app.status === 'Pending' || app.status === 'Applied').length,
      shortlisted: myApplications.filter(app => app.status === 'ShortListed').length,
      interview: myApplications.filter(app => app.status === 'Interview').length,
      offered: myApplications.filter(app => app.status === 'Offered').length,
      offeredAccepted: myApplications.filter(app => app.status === 'Offered Accepted').length,
      onboarding: myApplications.filter(app => app.status === 'Onboarding').length,
      hired: myApplications.filter(app => app.status === 'Hired').length,
      rejected: myApplications.filter(app => app.status === 'Rejected').length
    };
    console.log('Application stats:', stats);
    return stats;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter;
    
    return matchesSearch && matchesDepartment && job.status === 'Open';
  });

  const filteredApplications = myApplications.filter(application => {
    const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
    return matchesStatus;
  });

  // Debug logging
  console.log('JobApplications render - isLoggedIn:', isLoggedIn, 'userRole:', userRole, 'activeTab:', activeTab, 'myApplications.length:', myApplications.length);

  if (loading) {
    return (
      <div className="container-fluid p-4 min-vh-100" style={{
        background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)"
      }}>
        <div className="d-flex justify-content-center align-items-center min-vh-75">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading job opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 min-vh-100" style={{
      background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)"
    }}>
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="fw-bold text-primary d-flex align-items-center mb-1">
              <i className="bi bi-briefcase me-2"></i>
              Career Opportunities
            </h2>
            <p className="text-muted">
              {isLoggedIn && userRole === 'Applicant' 
                ? 'Explore job opportunities and track your application progress' 
                : 'Discover your next career opportunity with us'
              }
            </p>
          </div>
          {isLoggedIn && (userRole === 'Applicant' || userRole === 'HR Staff' || userRole === 'HR Assistant') && (
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={fetchApplications}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh Applications
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex gap-2">
            <Button
              variant={activeTab === 'browse' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('browse')}
            >
              <i className="bi bi-search me-2"></i>
              Browse Jobs ({jobs.filter(j => j.status === 'Open').length})
            </Button>
            {isLoggedIn && (userRole === 'Applicant' || userRole === 'HR Staff' || userRole === 'HR Assistant') && (
              <Button
                variant={activeTab === 'my-applications' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('my-applications')}
              >
                <i className="bi bi-person-check me-2"></i>
                {userRole === 'Applicant' ? 'My Applications' : 'All Applications'} ({myApplications.length})
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Application Statistics Cards - Only for HR Staff and HR Assistant */}
      {isLoggedIn && (userRole === 'HR Staff' || userRole === 'HR Assistant') && activeTab === 'my-applications' && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-gradient text-white">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-bar-chart me-2"></i>
                  Application Statistics
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {(() => {
                    const stats = getApplicationStats();
                    return [
                      { label: 'Total Applicants', value: stats.total, color: 'primary', icon: 'bi-people' },
                      { label: 'Pending', value: stats.pending, color: 'warning', icon: 'bi-clock' },
                      { label: 'Shortlisted', value: stats.shortlisted, color: 'info', icon: 'bi-star' },
                      { label: 'Interview', value: stats.interview, color: 'secondary', icon: 'bi-person-video3' },
                      { label: 'Offered', value: stats.offered, color: 'success', icon: 'bi-gift' },
                      { label: 'Offer Accepted', value: stats.offeredAccepted, color: 'success', icon: 'bi-check-circle' },
                      { label: 'Onboarding', value: stats.onboarding, color: 'dark', icon: 'bi-person-workspace' },
                      { label: 'Hired', value: stats.hired, color: 'success', icon: 'bi-person-check' },
                      { label: 'Rejected', value: stats.rejected, color: 'danger', icon: 'bi-x-circle' }
                    ].map((stat, index) => (
                      <Col key={index} className="col">
                        <div 
                          className={`card border-0 shadow-sm h-100 text-center p-3 stats-card ${stat.color === 'primary' ? 'stats-card-featured' : 'stats-card'}`}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: stat.color === 'primary' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                            color: stat.color === 'primary' ? 'white' : 'inherit'
                          }}
                          onClick={() => {
                            const statusMap = {
                              'Total Applicants': 'all',
                              'Pending': 'Pending',
                              'Shortlisted': 'ShortListed',
                              'Interview': 'Interview',
                              'Offered': 'Offered',
                              'Offer Accepted': 'Offered Accepted',
                              'Onboarding': 'Onboarding',
                              'Hired': 'Hired',
                              'Rejected': 'Rejected'
                            };
                            setStatusFilter(statusMap[stat.label] || 'all');
                          }}
                        >
                          <div className={`stats-icon-wrapper ${stat.color === 'primary' ? 'stats-icon-wrapper-featured' : 'stats-icon-wrapper-sm'}`} 
                               style={{ 
                                 width: stat.color === 'primary' ? '50px' : '40px', 
                                 height: stat.color === 'primary' ? '50px' : '40px',
                                 backgroundColor: stat.color === 'primary' ? 'rgba(255,255,255,0.2)' : `var(--bs-${stat.color})`,
                                 borderRadius: '50%',
                                 margin: '0 auto 10px',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center'
                               }}>
                            <i className={`${stat.icon} ${stat.color === 'primary' ? 'text-white' : `text-white`}`} 
                               style={{ fontSize: stat.color === 'primary' ? '1.5rem' : '1.2rem' }}></i>
                          </div>
                          <h6 className={`mb-1 ${stat.color === 'primary' ? 'text-white' : ''}`} style={{ fontSize: '1rem' }}>
                            {stat.value}
                          </h6>
                          <small className={`${stat.color === 'primary' ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                            {stat.label}
                          </small>
                        </div>
                      </Col>
                    ));
                  })()}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Browse Jobs Tab */}
      {activeTab === 'browse' && (
        <div>
          {/* Search and Filter */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Search Jobs</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by title, department, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">Department</Form.Label>
                    <Form.Select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {getDepartments().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Job Cards Grid */}
          <Row>
            {filteredJobs.length === 0 ? (
              <Col>
                <Card className="border-0 shadow-sm text-center py-5">
                  <Card.Body>
                    <i className="bi bi-briefcase display-4 text-secondary mb-3"></i>
                    <h5 className="text-muted">No jobs found</h5>
                    <p className="text-muted">Try adjusting your search criteria</p>
                  </Card.Body>
                </Card>
              </Col>
            ) : (
              filteredJobs.map((job) => (
                <Col lg={6} xl={4} key={job.id} className="mb-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-0 shadow-sm h-100 job-card">
                      <Card.Header className="bg-white border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h5 className="fw-bold text-primary mb-1">{job.title}</h5>
                            <div className="text-muted small">
                              <i className="bi bi-building me-1"></i>
                              {job.department}
                            </div>
                          </div>
                          <Badge bg="success" className="ms-2">Open</Badge>
                        </div>
                      </Card.Header>
                      
                      <Card.Body className="d-flex flex-column">
                        <div className="mb-3">
                          <p className="text-muted small mb-2">
                            {job.description.substring(0, 150)}...
                          </p>
                        </div>

                        {job.salary_min && job.salary_max && (
                          <div className="mb-3">
                            <div className="d-flex align-items-center text-success">
                              <i className="bi bi-currency-dollar me-1"></i>
                              <span className="fw-semibold">
                                ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                              </span>
                            </div>
                            {job.salary_notes && (
                              <div className="text-muted small">{job.salary_notes}</div>
                            )}
                          </div>
                        )}

                        <div className="mb-3 flex-grow-1">
                          <div className="small text-muted">
                            <div className="mb-1">
                              <i className="bi bi-clock me-1"></i>
                              Posted {new Date(job.created_at).toLocaleDateString()}
                            </div>
                            <div>
                              <i className="bi bi-person me-1"></i>
                              {job.position}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="flex-grow-1"
                            onClick={() => {
                              // Show job details modal or navigate to details page
                              showInfo('Job details modal would open here');
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>
                            View Details
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-grow-1"
                            onClick={() => handleApplyClick(job)}
                            disabled={!isLoggedIn || userRole !== 'Applicant'}
                          >
                            <i className="bi bi-send me-1"></i>
                            Apply Now
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))
            )}
          </Row>
        </div>
      )}

      {/* My Applications Tab */}
      {activeTab === 'my-applications' && isLoggedIn && (userRole === 'Applicant' || userRole === 'HR Staff' || userRole === 'HR Assistant') && (
        <div>
          {/* Status Filter - Only for HR Staff and HR Assistant */}
          {(userRole === 'HR Staff' || userRole === 'HR Assistant') && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-muted">Filter by Status</Form.Label>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="Pending">Pending Applications</option>
                        <option value="Applied">Applied (Legacy)</option>
                        <option value="ShortListed">Shortlisted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Interview">Interview</option>
                        <option value="Offered">Offered</option>
                        <option value="Offered Accepted">Offered Accepted</option>
                        <option value="Onboarding">Onboarding</option>
                        <option value="Hired">Hired</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="text-end">
                    <small className="text-muted">
                      Showing {filteredApplications.length} of {myApplications.length} applications
                    </small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-list-check me-2"></i>
                {userRole === 'Applicant' ? 'My Applications' : 'All Applications'}
              </h5>
            </Card.Header>
            <Card.Body>
              {(userRole === 'Applicant' ? myApplications : filteredApplications).length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-4 text-secondary mb-3"></i>
                  <h5 className="text-muted">
                    {userRole === 'Applicant' ? 'No applications yet' : 'No applications found'}
                  </h5>
                  <p className="text-muted">
                    {userRole === 'Applicant' ? 'Start by browsing and applying for jobs' : 'Try adjusting your filter criteria'}
                  </p>
                  {userRole === 'Applicant' && (
                  <Button variant="primary" onClick={() => setActiveTab('browse')}>
                    Browse Jobs
                  </Button>
                  )}
                </div>
              ) : (
                <Row>
                  {(userRole === 'Applicant' ? myApplications : filteredApplications).map((application) => (
                    <Col lg={6} key={application.id} className="mb-4">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="border-0 shadow-sm">
                          <Card.Header className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="fw-bold mb-1">{application.job_posting.title}</h6>
                              <div className="small text-muted">
                                {application.job_posting.department}
                              </div>
                            </div>
                            <Badge 
                              bg={getStatusBadgeVariant(application.status)}
                              className={updatingStatus === application.id ? 'pulse-animation' : ''}
                            >
                              {application.status}
                              {updatingStatus === application.id && (
                                <span className="ms-1">
                                  <span className="spinner-border spinner-border-sm" role="status">
                                    <span className="visually-hidden">Updating...</span>
                                  </span>
                                </span>
                              )}
                            </Badge>
                          </Card.Header>
                          
                          <Card.Body>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="small fw-semibold">Progress</span>
                                <span className="small text-primary fw-bold">
                                  {getStatusProgress(application.status)}%
                                </span>
                              </div>
                              <ProgressBar 
                                now={getStatusProgress(application.status)} 
                                className="mb-2"
                                style={{ height: '6px' }}
                              />
                            </div>

                            <div className="small text-muted mb-3">
                              <div>
                                <i className="bi bi-calendar me-1"></i>
                                Applied: {new Date(application.applied_at).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Status Update Dropdown for HR */}
                            {(userRole === 'HR Staff' || userRole === 'HR Assistant') && (
                              <div className="mb-3">
                                <Form.Group>
                                  <Form.Label className="small fw-bold text-muted mb-2">
                                    <i className="bi bi-gear me-1"></i>
                                    Update Status
                                    {updatingStatus === application.id && (
                                      <span className="ms-2">
                                        <span className="spinner-border spinner-border-sm text-primary" role="status">
                                          <span className="visually-hidden">Updating...</span>
                                        </span>
                                      </span>
                                    )}
                                  </Form.Label>
                                  <Form.Select
                                    value={application.status}
                                    onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                                    size="sm"
                                    className="border-primary"
                                    disabled={updatingStatus === application.id}
                                  >
                                    {/* Show current status */}
                                    <option value={application.status}>{application.status}</option>
                                    
                                    {/* Show different options based on current status */}
                                    {(application.status === 'Pending' || application.status === 'Applied') ? (
                                      <>
                                        <option value="ShortListed">ShortListed</option>
                                        <option value="Rejected">Rejected</option>
                                      </>
                                    ) : application.status === 'ShortListed' ? (
                                      <>
                                        <option value="Interview">Interview</option>
                                        <option value="Rejected">Rejected</option>
                                      </>
                                    ) : application.status === 'Interview' ? (
                                      <>
                                        <option value="Offered">Offered</option>
                                        <option value="Rejected">Rejected</option>
                                      </>
                                    ) : application.status === 'Offered' ? (
                                      <>
                                        <option value="Offered Accepted">Offered Accepted</option>
                                        <option value="Rejected">Rejected</option>
                                      </>
                                    ) : application.status === 'Offered Accepted' ? (
                                      <>
                                        <option value="Onboarding">Onboarding</option>
                                        <option value="Hired">Hired</option>
                                      </>
                                    ) : application.status === 'Onboarding' ? (
                                      <>
                                        <option value="Hired">Hired</option>
                                      </>
                                    ) : (
                                      /* For Rejected and Hired - no further changes allowed */
                                      <option disabled>No further changes allowed</option>
                                    )}
                                  </Form.Select>
                                  
                                  {/* Helper text showing next possible statuses */}
                                  <Form.Text className="text-muted small">
                                    {application.status === 'Pending' || application.status === 'Applied' ? 
                                      'Next: ShortListed or Rejected' :
                                    application.status === 'ShortListed' ? 
                                      'Next: Interview or Rejected' :
                                    application.status === 'Interview' ? 
                                      'Next: Offered or Rejected' :
                                    application.status === 'Offered' ? 
                                      'Next: Offer Accepted or Rejected' :
                                    application.status === 'Offered Accepted' ? 
                                      'Next: Onboarding or Hired' :
                                    application.status === 'Onboarding' ? 
                                      'Next: Hired' :
                                    application.status === 'Rejected' || application.status === 'Hired' ? 
                                      'Final status - no changes allowed' :
                                      'Select next status'
                                    }
                                  </Form.Text>
                                </Form.Group>
                              </div>
                            )}

                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  showInfo('Application details would be shown here');
                                }}
                              >
                                <i className="bi bi-eye me-1"></i>
                                View Details
                              </Button>
                              
                            </div>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Application Modal */}
      <Modal show={showApplicationModal} onHide={() => setShowApplicationModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-send me-2"></i>
            Apply for {selectedJob?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJob && (
            <div>
              {/* Job Summary */}
              <Card className="bg-light mb-4">
                <Card.Body>
                  <Row>
                    <Col md={8}>
                      <h6 className="fw-bold">{selectedJob.title}</h6>
                      <p className="text-muted mb-2">{selectedJob.department}</p>
                      <p className="small mb-0">{selectedJob.description.substring(0, 200)}...</p>
                    </Col>
                    <Col md={4}>
                      {selectedJob.salary_min && selectedJob.salary_max && (
                        <div className="text-success fw-semibold">
                          ${selectedJob.salary_min.toLocaleString()} - ${selectedJob.salary_max.toLocaleString()}
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Application Form */}
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Resume/CV *</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Upload your resume in PDF or Word format (max 5MB)
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Cover Letter</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Optional but recommended
                  </Form.Text>
                </Form.Group>
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowApplicationModal(false);
              resetApplicationForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitApplication}
            disabled={applying || !resumeFile}
          >
            {applying ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="bi bi-send me-2"></i>
                Submit Application
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .job-card {
          transition: all 0.3s ease;
        }
        
        .job-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }

        .stats-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .stats-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }

        .stats-card-featured {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
        }

        .stats-icon-wrapper {
          transition: all 0.3s ease;
        }

        .stats-card:hover .stats-icon-wrapper {
          transform: scale(1.1);
        }

        .pulse-animation {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default JobApplications;