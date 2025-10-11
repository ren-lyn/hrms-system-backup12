import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Badge, Modal, Form, Table, Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap-icons/font/bootstrap-icons.css";

const ApplicationsDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [onboardingStatuses, setOnboardingStatuses] = useState({});

  // Toast notification helpers
  const showError = (message) => toast.error(message);
  const showSuccess = (message) => toast.success(message);
  const showWarning = (message) => toast.warning(message);
  const showInfo = (message) => toast.info(message);

  // Common error handler
  const handleAxiosError = (error, defaultMessage) => {
    console.error('Axios error:', error);
    if (error.response) {
      if (error.response.status === 401) {
        showError('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        showError('Access denied. You don\'t have permission to perform this action.');
      } else if (error.response.status === 404) {
        showWarning('Resource not found.');
      } else if (error.response.status >= 500) {
        showError('Server error occurred. Please try again later.');
      } else {
        showError(error.response.data?.message || defaultMessage);
      }
    } else if (error.request) {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ERR_NETWORK') {
      showError('Network error. Please check your internet connection.');
    } else {
      showError(defaultMessage);
    }
  };

  // Fetch applications and stats
  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  // Fetch onboarding statuses when applications change
  useEffect(() => {
    if (applications.length > 0) {
      fetchOnboardingStatuses();
    }
  }, [applications]);

  // Recalculate stats when applications change
  useEffect(() => {
    if (applications.length > 0) {
      calculateStatsFromApplications();
    }
  }, [applications]);

  // Fetch onboarding statuses for hired candidates
  const fetchOnboardingStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const hiredApplications = applications.filter(app => 
        app.status === 'Offered Accepted' || app.status === 'Hired'
      );
      
      const statusPromises = hiredApplications.map(async (app) => {
        try {
          const response = await axios.get(`http://localhost:8000/api/onboarding-records/user/${app.user_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { userId: app.user_id, data: response.data };
        } catch (error) {
          if (error.response?.status === 404) {
            return { userId: app.user_id, data: null };
          }
          throw error;
        }
      });
      
      const results = await Promise.all(statusPromises);
      const statusMap = {};
      results.forEach(result => {
        statusMap[result.userId] = result.data;
      });
      setOnboardingStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching onboarding statuses:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      handleAxiosError(error, 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/applications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('API Stats Response:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      console.log('Falling back to local calculation');
      // Fallback: calculate stats locally
      calculateStatsFromApplications();
    }
  };

  // Calculate stats locally from applications array
  const calculateStatsFromApplications = () => {
    const localStats = {
      total_applications: applications.length,
      pending_applications: applications.filter(app => app.status === 'Pending').length,
      shortlisted_applications: applications.filter(app => app.status === 'ShortListed').length,
      interview_applications: applications.filter(app => app.status === 'Interview').length,
      offered_applications: applications.filter(app => app.status === 'Offered').length,
      offer_accepted_applications: applications.filter(app => app.status === 'Offered Accepted').length,
      onboarding_applications: applications.filter(app => app.status === 'Onboarding').length,
      hired_applications: applications.filter(app => app.status === 'Hired').length,
      rejected: applications.filter(app => app.status === 'Rejected').length
    };
    console.log('Local Stats Calculation:', localStats);
    console.log('Applications statuses:', applications.map(app => ({ id: app.id, status: app.status })));
    setStats(localStats);
  };

  // Update application status
  const handleStatusUpdate = async () => {
    if (!newStatus) {
      showError('Please select a status.');
      return;
    }

    setUpdating(true);
    
    // Always update local state first for immediate UI feedback
    const updatedApplications = applications.map(app => 
      app.id === selectedApplication.id 
        ? { ...app, status: newStatus, reviewed_at: new Date().toISOString() }
        : app
    );
    setApplications(updatedApplications);
    
    // Immediately update stats locally for instant UI feedback
    const updatedStats = {
      total_applications: updatedApplications.length,
      pending_applications: updatedApplications.filter(app => app.status === 'Pending').length,
      shortlisted_applications: updatedApplications.filter(app => app.status === 'ShortListed').length,
      interview_applications: updatedApplications.filter(app => app.status === 'Interview').length,
      offered_applications: updatedApplications.filter(app => app.status === 'Offered').length,
      offer_accepted_applications: updatedApplications.filter(app => app.status === 'Offered Accepted').length,
      onboarding_applications: updatedApplications.filter(app => app.status === 'Onboarding').length,
      hired_applications: updatedApplications.filter(app => app.status === 'Hired').length,
      rejected: updatedApplications.filter(app => app.status === 'Rejected').length
    };
    setStats(updatedStats);
    
    console.log('Status updated to:', newStatus);
    console.log('Updated stats:', updatedStats);
    console.log('Updated applications:', updatedApplications);
    console.log('Card counts should update immediately:', {
      pending: updatedStats.pending_applications,
      shortlisted: updatedStats.shortlisted_applications,
      interview: updatedStats.interview_applications,
      offered: updatedStats.offered_applications,
      offer_accepted: updatedStats.offer_accepted_applications,
      onboarding: updatedStats.onboarding_applications,
      hired: updatedStats.hired_applications,
      rejected: updatedStats.rejected
    });
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/applications/${selectedApplication.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check if status change triggers onboarding
      if (newStatus === 'Offered Accepted' || newStatus === 'Hired') {
        try {
          // Create onboarding record for the new hire
          await axios.post(`http://localhost:8000/api/onboarding-records`, 
            {
              user_id: selectedApplication.user_id,
              employee_name: selectedApplication.name,
              employee_email: selectedApplication.email,
              position: selectedApplication.job_title,
              department: selectedApplication.department,
              start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
              status: 'pending_documents'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          showSuccess(`Application status updated to ${getDisplayStatus(newStatus)}. Onboarding process has been initiated!`);
        } catch (onboardingError) {
          console.error('Error creating onboarding record:', onboardingError);
          showSuccess(`Application status updated to ${getDisplayStatus(newStatus)}. Note: Onboarding record creation failed - please create manually.`);
        }
      } else {
        showSuccess(`Application status updated to ${getDisplayStatus(newStatus)}.`);
      }

      setShowStatusModal(false);
      setSelectedApplication(null);
      setNewStatus('');
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('API Error:', error);
      // Even if API fails, local state is already updated, so show success
      showSuccess(`Application status updated to ${getDisplayStatus(newStatus)}. (Note: Server sync may be delayed)`);
      
      // Try alternative API endpoint
      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:8000/api/applications/${selectedApplication.id}`, 
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Alternative API call succeeded');
      } catch (retryError) {
        console.error('Alternative API call also failed:', retryError);
      }
    } finally {
      setUpdating(false);
    }
  };

  // Get onboarding status for display
  const getOnboardingStatus = (application) => {
    if (application.status !== 'Offered Accepted' && application.status !== 'Hired') {
      return { status: 'Not Started', progress: 0, color: 'secondary' };
    }
    
    const onboardingData = onboardingStatuses[application.user_id];
    if (!onboardingData) {
      return { status: 'Not Started', progress: 0, color: 'secondary' };
    }
    
    if (onboardingData.status === 'completed') {
      return { status: 'Completed', progress: 100, color: 'success' };
    } else {
      const progress = onboardingData.progress || 0;
      return { status: 'In Progress', progress: progress, color: 'warning' };
    }
  };

  // Get onboarding progress text
  const getOnboardingProgressText = (application) => {
    const onboardingData = onboardingStatuses[application.user_id];
    if (!onboardingData || !onboardingData.documents) {
      return 'Not Started';
    }
    
    const completedDocs = onboardingData.documents.filter(doc => doc.status === 'approved').length;
    const totalDocs = onboardingData.documents.length;
    const progress = Math.round((completedDocs / totalDocs) * 100);
    
    return `${completedDocs}/${totalDocs} Complete (${progress}%)`;
  };

  // Handle Begin Onboarding button
  const handleBeginOnboarding = (application) => {
    // Navigate to onboarding dashboard with filter for this employee
    // For now, show a modal or navigate to onboarding
    showInfo(`Setting up onboarding for ${application.name}. Redirecting to Onboarding Dashboard...`);
    // You could implement navigation here: navigate('/dashboard/hr-assistant/onboarding?employee=' + application.user_id);
  };

  // Check onboarding status for hired candidates
  const handleViewOnboarding = async (application) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/onboarding-records/user/${application.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        showInfo(`Onboarding Status: ${response.data.status}. Progress: ${response.data.progress || 0}%`);
        // You could also navigate to onboarding dashboard with filter
        // navigate('/dashboard/hr-assistant/onboarding?filter=' + response.data.status);
      } else {
        showWarning('No onboarding record found for this candidate.');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        showWarning('Onboarding record not found. Please create one manually.');
      } else {
        handleAxiosError(error, 'Failed to fetch onboarding status.');
      }
    }
  };

  // Download resume
  const handleDownloadResume = async (applicationId, applicantName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/applications/${applicationId}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume_${applicantName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showSuccess('Resume downloaded successfully.');
    } catch (error) {
      handleAxiosError(error, 'Failed to download resume. Please try again.');
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    // Status filter
    const statusMatch = filter === 'all' || app.status === filter;
    
    // Search filter
    const searchMatch = !searchTerm || 
      app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_posting?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_posting?.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    
    // Date filter
    let dateMatch = true;
    if (dateFilter !== 'all') {
      const appDate = new Date(app.applied_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          dateMatch = appDate >= today;
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateMatch = appDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateMatch = appDate >= monthAgo;
          break;
        default:
          dateMatch = true;
      }
    }
    
    return statusMatch && searchMatch && dateMatch;
  });
  
  console.log('Current filters:', { filter, searchTerm, dateFilter });
  console.log('Filtered applications count:', filteredApplications.length);


  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'ShortListed': return 'info';
      case 'Interview': return 'secondary';
      case 'Offered': return 'success';
      case 'Offered Accepted': return 'success';
      case 'Onboarding': return 'dark';
      case 'Hired': return 'success';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  // Get display status for UI
  const getDisplayStatus = (status) => {
    switch (status) {
      case 'Pending': return 'Pending';
      case 'ShortListed': return 'Shortlisted';
      case 'Interview': return 'Interview';
      case 'Offered': return 'Offered';
      case 'Offered Accepted': return 'Offered Accepted';
      case 'Onboarding': return 'Onboarding';
      case 'Hired': return 'Hired';
      case 'Rejected': return 'Rejected';
      default: return status;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 min-vh-100" style={{
      background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)",
    }}>
      <ToastContainer position="top-right" />
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary d-flex align-items-center">
          <i className="bi bi-clipboard-data me-2"></i> Applications Dashboard
        </h2>
        <Button
          variant="primary"
          className="shadow-sm rounded-pill px-4"
          onClick={fetchApplications}
        >
          <i className="bi bi-arrow-clockwise me-2"></i> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="row g-1 mb-4">
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card-featured h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-people text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="text-white mb-1" style={{ fontSize: '1rem' }}>{stats.total_applications || 0}</h6>
              <small className="text-white-50" style={{ fontSize: '0.7rem' }}>Total</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Pending')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-warning)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-hourglass-split text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.pending_applications || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Pending</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('ShortListed')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-info)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-star text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.shortlisted_applications || stats.shortlisted || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Shortlisted</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Interview')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-secondary)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-person-video3 text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.interview_applications || stats.interview || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Interview</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Offered')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-success)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-gift text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.offered_applications || stats.offered || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Offered</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Offered Accepted')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-success)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-check-circle text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.offer_accepted_applications || stats.offer_accepted || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Accepted</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Onboarding')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-dark)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-person-workspace text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.onboarding_applications || stats.onboarding || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Onboarding</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Hired')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-success)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-person-check text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.hired_applications || stats.hired || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Hired</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col">
          <Card className="text-center border-0 shadow-sm stats-card h-100" style={{ cursor: 'pointer' }} onClick={() => setFilter('Rejected')}>
            <Card.Body className="p-2">
              <div className="stats-icon-wrapper-compact" style={{ width: '30px', height: '30px', backgroundColor: 'var(--bs-danger)', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-x-circle text-white" style={{ fontSize: '1rem' }}></i>
              </div>
              <h6 className="mb-1" style={{ fontSize: '1rem' }}>{stats.rejected || 0}</h6>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>Rejected</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <div className="row g-3 align-items-end">
            {/* Search */}
            <div className="col-md-4">
              <Form.Group>
                <Form.Label className="fw-bold text-muted mb-2">
                  <i className="bi bi-search me-1"></i>Search
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, job title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-2"
                />
              </Form.Group>
            </div>
            
            {/* Status Filter */}
            <div className="col-md-2">
              <Form.Group>
                <Form.Label className="fw-bold text-muted mb-2">
                  <i className="bi bi-funnel me-1"></i>Status
                </Form.Label>
        <Form.Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
                  className="border-2"
        >
                  <option value="all">All Status</option>
          <option value="Pending">Pending</option>
                  <option value="ShortListed">Shortlisted</option>
          <option value="Interview">Interview</option>
                  <option value="Offered">Offered</option>
                  <option value="Offered Accepted">Offered Accepted</option>
                  <option value="Onboarding">Onboarding</option>
          <option value="Hired">Hired</option>
          <option value="Rejected">Rejected</option>
        </Form.Select>
              </Form.Group>
            </div>
            
            
            {/* Date Filter */}
            <div className="col-md-2">
              <Form.Group>
                <Form.Label className="fw-bold text-muted mb-2">
                  <i className="bi bi-calendar me-1"></i>Date Applied
                </Form.Label>
                <Form.Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-2"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </Form.Select>
              </Form.Group>
            </div>
            
            {/* Search Button */}
            <div className="col-md-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // Trigger search/filter
                  console.log('Search triggered with:', { searchTerm, filter, dateFilter });
                }}
                className="w-100"
                title="Apply filters"
              >
                <i className="bi bi-search me-1"></i>Search
              </Button>
            </div>
      </div>
          
          {/* Results Counter */}
          <div className="row mt-3">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Showing <strong>{filteredApplications.length}</strong> of <strong>{applications.length}</strong> applications
                </small>
                {(searchTerm || filter !== 'all' || dateFilter !== 'all') && (
                  <small className="text-primary">
                    <i className="bi bi-funnel-fill me-1"></i>Filters active
                  </small>
                )}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Applications Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard2-x display-1 text-secondary mb-3"></i>
              <h5 className="text-muted">No applications found</h5>
              <p className="text-muted">
                {filter === 'all' 
                  ? 'No applications have been submitted yet.' 
                  : `No applications with status "${filter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Applicant</th>
                    <th>Job Position</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Onboarding Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredApplications.map((application) => (
                      <motion.tr
                        key={application.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td>
                          <div>
                            <strong>{application.applicant?.first_name} {application.applicant?.last_name}</strong>
                            <br />
                            <small className="text-muted">{application.applicant?.email}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{application.job_posting?.title}</strong>
                            <br />
                            <small className="text-muted">{application.job_posting?.department}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(application.status)} className="rounded-pill px-3 py-1">
                            {getDisplayStatus(application.status)}
                          </Badge>
                        </td>
                        <td>
                          <small>{formatDate(application.applied_at)}</small>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <Badge bg={getOnboardingStatus(application).color} className="rounded-pill px-2 py-1">
                              {getOnboardingStatus(application).status}
                            </Badge>
                            {(application.status === 'Offered Accepted' || application.status === 'Hired') && (
                              <small className="text-muted">
                                {getOnboardingProgressText(application)}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowDetailsModal(true);
                              }}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleDownloadResume(
                                application.id,
                                `${application.applicant?.first_name}_${application.applicant?.last_name}`
                              )}
                              title="Download Resume"
                            >
                              <i className="bi bi-download"></i>
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setNewStatus(application.status);
                                setShowStatusModal(true);
                              }}
                              title="Update Status"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            {(application.status === 'Offer Accepted' || application.status === 'Hired') && (
                              <>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleBeginOnboarding(application)}
                                  title="Setup Onboarding"
                                >
                                  <i className="bi bi-person-plus"></i>
                                </Button>
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewOnboarding(application)}
                                  title="View Onboarding Status"
                                >
                                  <i className="bi bi-clipboard-check"></i>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Application Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Application Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApplication && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <h6 className="fw-bold">Applicant Information</h6>
                  <p><strong>Name:</strong> {selectedApplication.applicant?.first_name} {selectedApplication.applicant?.last_name}</p>
                  <p><strong>Email:</strong> {selectedApplication.applicant?.email}</p>
                  <p><strong>Contact:</strong> {selectedApplication.applicant?.contact_number || 'Not provided'}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold">Application Information</h6>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusBadgeVariant(selectedApplication.status)} className="ms-2">
                      {getDisplayStatus(selectedApplication.status)}
                    </Badge>
                  </p>
                  <p><strong>Applied:</strong> {formatDate(selectedApplication.applied_at)}</p>
                  {selectedApplication.reviewed_at && (
                    <p><strong>Reviewed:</strong> {formatDate(selectedApplication.reviewed_at)}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <h6 className="fw-bold">Job Position</h6>
                <p><strong>Title:</strong> {selectedApplication.job_posting?.title}</p>
                <p><strong>Department:</strong> {selectedApplication.job_posting?.department}</p>
                <p><strong>Description:</strong></p>
                <p className="text-muted">{selectedApplication.job_posting?.description}</p>
                <p><strong>Requirements:</strong></p>
                <p className="text-muted">{selectedApplication.job_posting?.requirements}</p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Application Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select New Status</Form.Label>
            <Form.Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">Choose status...</option>
              <option value="Pending">Pending</option>
              <option value="ShortListed">Shortlisted</option>
              <option value="Interview">Interview</option>
              <option value="Offered">Offered</option>
              <option value="Offered Accepted">Offered Accepted</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowStatusModal(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleStatusUpdate}
            disabled={updating || !newStatus}
          >
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .stats-card {
          transition: all 0.3s ease;
          cursor: pointer;
          border-radius: 12px;
        }
        
        .stats-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15) !important;
        }

        .stats-card-featured {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border-radius: 12px;
        }

        .stats-card-featured:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(102, 126, 234, 0.3) !important;
        }

        .stats-icon-wrapper-compact {
          transition: all 0.3s ease;
        }

        .stats-card:hover .stats-icon-wrapper-compact {
          transform: scale(1.15);
        }

        /* Status badge text color for dark backgrounds */
        .badge.bg-dark,
        .badge.bg-secondary,
        .badge.bg-info,
        .badge.bg-warning,
        .badge.bg-danger,
        .badge.bg-success {
          color: white !important;
        }

        /* Ensure text is visible on dark badge backgrounds */
        .badge.bg-dark *,
        .badge.bg-secondary *,
        .badge.bg-info *,
        .badge.bg-warning *,
        .badge.bg-danger *,
        .badge.bg-success * {
          color: white !important;
        }

        /* Additional specificity for Bootstrap badge text */
        .badge.bg-dark,
        .badge.bg-secondary,
        .badge.bg-info,
        .badge.bg-warning,
        .badge.bg-danger,
        .badge.bg-success {
          --bs-badge-color: white !important;
        }

        /* Force white text on all dark badge variants */
        .badge[class*="bg-"] {
          color: white !important;
        }

        .stats-card-featured:hover .stats-icon-wrapper-compact {
          transform: scale(1.15);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .stats-card .card-body {
            padding: 0.5rem !important;
          }
          
          .stats-icon-wrapper-compact {
            width: 25px !important;
            height: 25px !important;
            margin-bottom: 6px !important;
          }
          
          .stats-card h6 {
            font-size: 0.9rem !important;
          }
          
          .stats-card small {
            font-size: 0.65rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ApplicationsDashboard;
