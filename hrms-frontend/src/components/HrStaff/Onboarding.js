import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Alert, Modal, Form, Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faFileAlt, 
  faCheckCircle, 
  faClock, 
  faExclamationTriangle,
  faEye,
  faCalendarAlt,
  faUsers,
  faChartLine,
  faRocket,
  faDollarSign,
  faShieldAlt,
  faUserTie,
  faInfoCircle,
  faEdit,
  faRefresh,
  faSave,
  faBuilding,
  faEllipsisV,
  faUser,
  faBriefcase,
  faCog,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const Onboarding = () => {
  const [onboardingRecords, setOnboardingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    interviewDate: '',
    interviewTime: '',
    interviewType: 'in-person',
    location: '',
    interviewer: '',
    notes: ''
  });

  // Toast helpers
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  // Dropdown handlers
  const toggleDropdown = (recordId) => {
    setActiveDropdown(activeDropdown === recordId ? null : recordId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  useEffect(() => {
    fetchOnboardingRecords();
    
    // Set up periodic refresh to check for new applicants
    const refreshInterval = setInterval(() => {
      console.log('🔄 [HrStaff-Onboarding] Auto-refreshing onboarding records for new applicants...');
      fetchOnboardingRecords(true);
    }, 10000); // Check every 10 seconds for new records
    
    // Listen for onboarding dashboard refresh events from other components
    const handleOnboardingRefresh = (event) => {
      console.log('🔄 [HrStaff-Onboarding] Received refresh event from', event.detail?.source || 'unknown');
      console.log('🔄 [HrStaff-Onboarding] Event details:', event.detail);
      fetchOnboardingRecords(true);
    };
    
    // Check for localStorage refresh trigger (for cross-tab communication)
    const checkRefreshTrigger = () => {
      const refreshTrigger = localStorage.getItem('onboarding_dashboard_refresh');
      if (refreshTrigger) {
        try {
          const trigger = JSON.parse(refreshTrigger);
          console.log('📱 [HrStaff-Onboarding] Found localStorage refresh trigger:', trigger);
          fetchOnboardingRecords(true);
          localStorage.removeItem('onboarding_dashboard_refresh'); // Clear the trigger after use
        } catch (error) {
          console.error('[HrStaff-Onboarding] Error parsing refresh trigger:', error);
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('onboardingDashboardRefresh', handleOnboardingRefresh);
    window.addEventListener('focus', checkRefreshTrigger); // Check when user switches back to this tab
    
    // Initial check for refresh trigger on mount
    checkRefreshTrigger();
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('onboardingDashboardRefresh', handleOnboardingRefresh);
      window.removeEventListener('focus', checkRefreshTrigger);
    };
  }, []);

  const fetchOnboardingRecords = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      console.log('🔍 [HrStaff-Onboarding] Fetching applicants with onboarding data...');
      console.log('🔍 [HrStaff-Onboarding] Token exists:', !!token);
      
      // Fetch onboarding records from the new dedicated API endpoint
      // This endpoint fetches applicants and joins with onboarding data
      const response = await axios.get('http://localhost:8000/api/onboarding-records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 [HrStaff-Onboarding] Onboarding API Response:', response.data);
      const onboardingRecords = Array.isArray(response.data) ? response.data : [];
        console.log('📊 [HrStaff-Onboarding] Total ShortListed and Interview applicants:', onboardingRecords.length);
      
      setOnboardingRecords(onboardingRecords);
      calculateStats(onboardingRecords);
      
      if (onboardingRecords.length > 0) {
        console.log('✅ [HrStaff-Onboarding] Successfully loaded', onboardingRecords.length, 'applicants');
        onboardingRecords.forEach((record, index) => {
          console.log(`📄 [HrStaff-Onboarding] Applicant ${index + 1}:`, {
            id: record.id,
            name: record.employee_name,
            email: record.employee_email,
            position: record.position,
            department: record.department,
            status: record.status,
            start_date: record.start_date,
            application_id: record.application_id,
            application_status: record.application_status
          });
        });
      } else {
        console.log('🔍 [HrStaff-Onboarding] No applicants found');
        console.log('📝 [HrStaff-Onboarding] To populate this list, mark applicants in Applications Dashboard');
      }
      
      if (isRefresh) {
        showSuccess('Data refreshed successfully!');
      }
      
    } catch (error) {
      console.error('❌ [HrStaff-Onboarding] Error fetching onboarding records:', error);
      console.error('❌ [HrStaff-Onboarding] Error details:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      });
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        console.log('📝 [HrStaff-Onboarding] Onboarding API endpoint not found');
        showError('Onboarding API endpoint not found. Please contact system administrator.');
      } else if (error.response?.status === 401) {
        console.log('🔒 [HrStaff-Onboarding] Authentication required');
        showError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        console.log('🚫 [HrStaff-Onboarding] Access denied - check user permissions');
        showError('Access denied. Please check your permissions.');
      } else {
        showError('Failed to load applicants. Please try again.');
      }
      
      // Set empty state on error
      setOnboardingRecords([]);
      calculateStats([]);
      console.log('🕰️ [HrStaff-Onboarding] Waiting for applicants to appear...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (records) => {
    const stats = {
      total: records.length,
      pending: records.filter(r => r.status === 'pending_documents').length,
      inProgress: records.filter(r => r.status === 'documents_approved' || r.status === 'orientation_scheduled').length,
      completed: records.filter(r => r.status === 'completed').length
    };
    setStats(stats);
  };

  const getApplicationStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'secondary', icon: faClock, text: 'Pending' },
      'Applied': { color: 'info', icon: faFileAlt, text: 'Applied' },
      'ShortListed': { color: 'primary', icon: faUser, text: 'ShortListed' },
      'Interview': { color: 'warning', icon: faCalendarAlt, text: 'Interview' },
      'On Interview': { color: 'info', icon: faCalendarAlt, text: 'On Interview' },
      'Offered': { color: 'success', icon: faCheckCircle, text: 'Offered' },
      'Offered Accepted': { color: 'success', icon: faCheckCircle, text: 'Offered Accepted' },
      'Onboarding': { color: 'info', icon: faRocket, text: 'Onboarding' },
      'Hired': { color: 'success', icon: faUserTie, text: 'Hired' },
      'Rejected': { color: 'danger', icon: faExclamationTriangle, text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig['Pending'];
    
    return (
      <Badge bg={config.color} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_documents': { color: 'warning', icon: faClock, text: 'Pending Documents' },
      'documents_approved': { color: 'primary', icon: faCheckCircle, text: 'Documents Approved' },
      'orientation_scheduled': { color: 'info', icon: faCalendarAlt, text: 'Orientation Scheduled' },
      'completed': { color: 'success', icon: faCheckCircle, text: 'Completed' }
    };
    
    const config = statusConfig[status] || statusConfig['pending_documents'];
    
    return (
      <Badge bg={config.color} className="d-flex align-items-center gap-1">
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  const handleStatusUpdate = async (recordId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      console.log(`🔄 [HrStaff-Onboarding] Updating onboarding status for application ${recordId} to: ${newStatus}`);
      
      // Update local state immediately for better UX
      setOnboardingRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, status: newStatus, updated_at: new Date().toISOString() }
          : record
      ));
      
      // Recalculate stats with updated records
      const updatedRecords = onboardingRecords.map(record => 
        record.id === recordId ? { ...record, status: newStatus } : record
      );
      calculateStats(updatedRecords);
      
      // Send update to backend API
      const response = await axios.put(`http://localhost:8000/api/onboarding-records/${recordId}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        showSuccess(`Onboarding status updated to: ${newStatus}`);
        console.log(`✅ [HrStaff-Onboarding] Onboarding status saved to database: ${newStatus}`);
        
        // Update with the actual data returned from the server
        if (response.data.data) {
          setOnboardingRecords(prev => prev.map(record => 
            record.id === recordId ? { ...record, ...response.data.data } : record
          ));
        }
      }
      
    } catch (error) {
      console.error('[HrStaff-Onboarding] Error updating onboarding status:', error);
      showError(`Failed to update status: ${error.response?.data?.message || error.message}`);
      
      // Revert local state on error
      fetchOnboardingRecords(true);
    }
  };


  const filteredRecords = onboardingRecords.filter(record => {
    const matchesOnboardingFilter = filter === 'all' || record.status === filter;
    const matchesStatusFilter = statusFilter === 'all' || record.application_status === statusFilter;
    const matchesSearch = !searchTerm || 
      record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesOnboardingFilter && matchesStatusFilter && matchesSearch;
  });

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setEditingRecord({ ...record });
  };

  const handleSetInterview = (record) => {
    setSelectedApplicant(record);
    setShowInterviewModal(true);
    // Pre-fill form with default values
    setInterviewForm({
      interviewDate: '',
      interviewTime: '',
      interviewType: 'in-person',
      location: 'Office Conference Room',
      interviewer: '',
      notes: `Interview for ${record.position} position`
    });
  };

  const handleInterviewFormChange = (field, value) => {
    setInterviewForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitInterview = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        showError('Authentication required. Please log in again.');
        window.location.href = '/login';
        return;
      }
      
      console.log('📅 [HrStaff-Onboarding] Scheduling interview for:', selectedApplicant.employee_name);
      console.log('📅 [HrStaff-Onboarding] Interview details:', interviewForm);

      // Create interview data
      const interviewData = {
        application_id: selectedApplicant.application_id,
        interview_date: interviewForm.interviewDate,
        interview_time: interviewForm.interviewTime,
        interview_type: interviewForm.interviewType,
        location: interviewForm.location,
        interviewer: interviewForm.interviewer,
        notes: interviewForm.notes,
        status: 'scheduled'
      };

      // Send to backend
      const response = await axios.post('http://localhost:8000/api/interviews', interviewData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ [HrStaff-Onboarding] Interview scheduled successfully:', response.data);

      // Update application status to Interview
      await axios.put(`http://localhost:8000/api/applications/${selectedApplicant.application_id}/status`, {
        status: 'Interview'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Close modal and refresh data
      setShowInterviewModal(false);
      setSelectedApplicant(null);
      setInterviewForm({
        interviewDate: '',
        interviewTime: '',
        interviewType: 'in-person',
        location: '',
        interviewer: '',
        notes: ''
      });

      // Refresh onboarding records
      await fetchOnboardingRecords(true);

      // Show success message
      showSuccess('Interview scheduled successfully! Applicant status updated to Interview.');

    } catch (error) {
      console.error('❌ [HrStaff-Onboarding] Error scheduling interview:', error);
      
      // Handle specific authentication errors
      if (error.response?.status === 401) {
        showError('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return;
      } else if (error.response?.status === 403) {
        showError('Access denied. You do not have permission to schedule interviews.');
        return;
      } else if (error.response?.status === 404) {
        showError('API endpoint not found. Please contact support.');
        return;
      }
      
      showError('Failed to schedule interview. Please try again.');
    }
  };

  const handleCancelInterview = () => {
    setShowInterviewModal(false);
    setSelectedApplicant(null);
    setInterviewForm({
      interviewDate: '',
      interviewTime: '',
      interviewType: 'in-person',
      location: '',
      interviewer: '',
      notes: ''
    });
  };

  const handleDownloadResume = async (applicationId, employeeName) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        return;
      }

      console.log('📄 [HrStaff-Onboarding] Downloading resume for application:', applicationId);
      
      // Create a temporary link to download the file
      const downloadUrl = `http://localhost:8000/api/applications/${applicationId}/resume`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.style.display = 'none';
      
      // Add authorization header by creating a fetch request first
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          showError('Resume file not found.');
        } else if (response.status === 401) {
          showError('Authentication failed. Please log in again.');
        } else {
          showError('Failed to download resume. Please try again.');
        }
        return;
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = `resume_${employeeName.replace(/\s+/g, '_')}.pdf`;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(url);
      
      showSuccess('Resume downloaded successfully!');
      console.log('✅ [HrStaff-Onboarding] Resume downloaded successfully');
      
    } catch (error) {
      console.error('❌ [HrStaff-Onboarding] Error downloading resume:', error);
      showError('Failed to download resume. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    try {
      const token = localStorage.getItem('token');
      console.log(`💾 [HrStaff-Onboarding] Saving changes for record ${editingRecord.id}`);
      
      const response = await axios.put(`http://localhost:8000/api/onboarding-records/${editingRecord.id}`, editingRecord, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        // Update local state
        setOnboardingRecords(prev => prev.map(record => 
          record.id === editingRecord.id ? editingRecord : record
        ));
        
        setEditingRecord(null);
        showSuccess('Onboarding record updated successfully');
        console.log(`✅ [HrStaff-Onboarding] Record updated successfully`);
      }
    } catch (error) {
      console.error('[HrStaff-Onboarding] Error saving record:', error);
      showError(`Failed to save changes: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  console.log('🔄 [HrStaff-Onboarding] Component rendering, records:', onboardingRecords.length, 'loading:', loading);
  
  return (
    <Container fluid className="p-4">

      {/* Enhanced Tab Navigation */}
      <Row className="mb-4">
        <Col>
          <div className="modern-tab-container">
            <div className="tab-navigation">
              <Button
                className={`modern-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <FontAwesomeIcon icon={faUsers} className="tab-icon" />
                <span className="tab-label">Overview</span>
                <div className="tab-indicator"></div>
              </Button>
              <Button
                className={`modern-tab ${activeTab === 'orientation' ? 'active' : ''}`}
                onClick={() => setActiveTab('orientation')}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="tab-icon" />
                <span className="tab-label">Orientation</span>
                <div className="tab-indicator"></div>
              </Button>
              <Button
                className={`modern-tab ${activeTab === 'starting-date' ? 'active' : ''}`}
                onClick={() => setActiveTab('starting-date')}
              >
                <FontAwesomeIcon icon={faClock} className="tab-icon" />
                <span className="tab-label">Start Date</span>
                <div className="tab-indicator"></div>
              </Button>
              <Button
                className={`modern-tab ${activeTab === 'salary-setup' ? 'active' : ''}`}
                onClick={() => setActiveTab('salary-setup')}
              >
                <FontAwesomeIcon icon={faDollarSign} className="tab-icon" />
                <span className="tab-label">Salary Setup</span>
                <div className="tab-indicator"></div>
              </Button>
              <Button
                className={`modern-tab ${activeTab === 'benefits' ? 'active' : ''}`}
                onClick={() => setActiveTab('benefits')}
              >
                <FontAwesomeIcon icon={faShieldAlt} className="tab-icon" />
                <span className="tab-label">Benefits</span>
                <div className="tab-indicator"></div>
              </Button>
              <Button
                className={`modern-tab ${activeTab === 'employee-profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('employee-profile')}
              >
                <FontAwesomeIcon icon={faUserTie} className="tab-icon" />
                <span className="tab-label">Profile</span>
                <div className="tab-indicator"></div>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faUsers} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.total}</h3>
              <small className="opacity-75">Total Shortlisted</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faClock} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.pending}</h3>
              <small className="opacity-75">Pending Documents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faChartLine} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.inProgress}</h3>
              <small className="opacity-75">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{stats.completed}</h3>
              <small className="opacity-75">Completed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Controls */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, position, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              variant="outline-primary"
              className="modern-refresh-btn"
              onClick={() => {
                console.log('🔄 [HrStaff-Onboarding] Manual refresh triggered');
                fetchOnboardingRecords(true);
              }}
              disabled={refreshing}
            >
              <FontAwesomeIcon 
                icon={faRefresh} 
                spin={refreshing}
                className={refreshing ? 'text-primary' : ''}
              />
            </Button>
          </div>
        </Col>
        <Col md={3}>
          <select 
            className="form-select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Application Status</option>
            <option value="ShortListed">ShortListed</option>
            <option value="Interview">Interview</option>
            <option value="On Interview">On Interview</option>
            <option value="Offered">Offered</option>
            <option value="Offered Accepted">Offered Accepted</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
          </select>
        </Col>
        <Col md={3}>
          <select 
            className="form-select" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Onboarding Status</option>
            <option value="pending_documents">Pending Documents</option>
            <option value="documents_approved">Documents Approved</option>
            <option value="orientation_scheduled">Orientation Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </Col>
      </Row>

      {/* Empty State Alert */}
      {stats.total === 0 && (
        <Alert variant="info" className="mb-4">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon icon={faInfoCircle} className="me-3" size="lg" />
            <div>
              <h6 className="mb-1">No Applicants in Onboarding Yet</h6>
              <p className="mb-0">
                Applicants will automatically appear here when they are marked as <strong>"ShortListed"</strong> or <strong>"Interview"</strong> in the Applications Dashboard.
                <br />
                <strong>How it works:</strong> Applications Dashboard → Update Status → Select "ShortListed" or "Interview" → Applicant appears here automatically!
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Modern Onboarding Records Table */}
      <Card className="border-0 shadow-lg modern-onboarding-card">
        <Card.Header className="modern-onboarding-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold text-white">
              <FontAwesomeIcon icon={faUsers} className="me-2 text-white" />
              Onboarding Applicants
            </h5>
            <Badge bg="light" text="dark" className="px-3 py-2">
              {filteredRecords.length} Total
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive" style={{ overflow: 'visible' }}>
            <Table hover className="modern-onboarding-table mb-0">
              <thead className="modern-onboarding-thead">
                <tr>
                  <th className="modern-onboarding-th">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Employee
                  </th>
                  <th className="modern-onboarding-th">
                    <FontAwesomeIcon icon={faBriefcase} className="me-2" />
                    Position
                  </th>
                  <th className="modern-onboarding-th">
                    <FontAwesomeIcon icon={faBuilding} className="me-2" />
                    Department
                  </th>
                  <th className="modern-onboarding-th">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Start Date
                  </th>
                  <th className="modern-onboarding-th text-center">
                    <FontAwesomeIcon icon={faUserTie} className="me-2" />
                    Application Status
                  </th>
                  <th className="modern-onboarding-th text-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Onboarding Status
                  </th>
                  <th className="modern-onboarding-th text-center">
                    <FontAwesomeIcon icon={faCog} className="me-2" />
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="d-flex flex-column align-items-center">
                        <FontAwesomeIcon icon={faUsers} size="3x" className="text-muted mb-3" />
                        <h5 className="text-muted mb-2">No Applicants Found</h5>
                        <p className="text-muted mb-3">
                          {filter === 'all' && statusFilter === 'all' && !searchTerm
                            ? 'No shortlisted or interview applicants in onboarding yet. When applicants are marked as "ShortListed" or "Interview" in the Applications Dashboard, they will automatically appear here.'
                            : 'No records match your current search criteria.'
                          }
                        </p>
                        {filter === 'all' && statusFilter === 'all' && !searchTerm && (
                          <div className="alert alert-light border border-primary text-center" style={{ maxWidth: '500px' }}>
                            <h6 className="text-primary mb-2">
                              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                              How to Add Applicants
                            </h6>
                            <small className="text-muted d-block">
                              1. Go to <strong>Applications Dashboard</strong><br />
                              2. Find any application<br />
                              3. Click <FontAwesomeIcon icon={faEdit} /> <strong>"Update Status"</strong><br />
                              4. Select <strong>"ShortListed"</strong> or <strong>"Interview"</strong><br />
                              5. Applicant appears here automatically!
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id} className={`modern-onboarding-row ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}>
                      <td className="modern-onboarding-td">
                        <div className="employee-info-compact">
                          <div className="employee-avatar-compact">
                            <FontAwesomeIcon icon={faUser} className="avatar-icon-compact" />
                          </div>
                          <div className="employee-details-compact">
                            <h6 className="employee-name-compact mb-1">{record.employee_name}</h6>
                            <p className="employee-email-compact mb-0">{record.employee_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="modern-onboarding-td">
                        <div className="position-info-compact">
                          <FontAwesomeIcon icon={faBriefcase} className="me-2 text-primary" />
                          <span className="fw-medium">{record.position}</span>
                        </div>
                      </td>
                      <td className="modern-onboarding-td">
                        <div className="department-info-compact">
                          <FontAwesomeIcon icon={faBuilding} className="me-2 text-info" />
                          <span>{record.department}</span>
                        </div>
                      </td>
                      <td className="modern-onboarding-td">
                        <div className="date-info-compact">
                          <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-success" />
                          <span className="fw-medium">{new Date(record.start_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="modern-onboarding-td text-center">
                        {getApplicationStatusBadge(record.application_status)}
                      </td>
                      <td className="modern-onboarding-td text-center">
                        <select
                          className="form-select form-select-sm modern-status-select"
                          value={record.status}
                          onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                        >
                          <option value="pending_documents">📄 Pending Documents</option>
                          <option value="documents_approved">✅ Documents Approved</option>
                          <option value="orientation_scheduled">📅 Orientation Scheduled</option>
                          <option value="completed">🎉 Completed</option>
                        </select>
                      </td>
                      <td className="modern-onboarding-td text-center">
                        <div className="actions-dropdown-container">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className={`dropdown-toggle-btn ${activeDropdown === record.id ? 'active' : ''}`}
                            onClick={() => toggleDropdown(record.id)}
                            onBlur={() => setTimeout(closeDropdown, 150)}
                            title="Actions menu"
                          >
                            <FontAwesomeIcon icon={faEllipsisV} />
                          </Button>
                          {activeDropdown === record.id && (
                            <div className="actions-dropdown-menu">
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  handleViewDetails(record);
                                  closeDropdown();
                                }}
                              >
                                <FontAwesomeIcon icon={faEye} className="me-2" />
                                View Details
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  handleSetInterview(record);
                                  closeDropdown();
                                }}
                              >
                                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                                Set Interview
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Detail Modal */}
      {showModal && selectedRecord && (
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              Onboarding Details - {selectedRecord.employee_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <h6>Employee Information</h6>
                <p><strong>Name:</strong> {selectedRecord.employee_name}</p>
                <p><strong>Email:</strong> {selectedRecord.employee_email}</p>
                <p><strong>Position:</strong> {selectedRecord.position}</p>
                <p><strong>Department:</strong> {selectedRecord.department}</p>
                <p><strong>Start Date:</strong> {new Date(selectedRecord.start_date).toLocaleDateString()}</p>
                {selectedRecord.application_id && (
                  <p><strong>Application ID:</strong> {selectedRecord.application_id}</p>
                )}
                <div className="mt-3">
                  <h6>Documents</h6>
                  {selectedRecord.resume_path ? (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleDownloadResume(selectedRecord.application_id, selectedRecord.employee_name)}
                      className="d-flex align-items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Download Resume
                    </Button>
                  ) : (
                    <p className="text-muted mb-0">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                      No resume available
                    </p>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <h6>Status Information</h6>
                <div className="mb-3">
                  <h6>Application Status</h6>
                  {getApplicationStatusBadge(selectedRecord.application_status)}
                </div>
                <div className="mb-3">
                  <h6>Onboarding Status</h6>
                  {getStatusBadge(selectedRecord.status)}
                </div>
                <div className="mt-3">
                  <h6>Timestamps</h6>
                  <p><small><strong>Created:</strong> {new Date(selectedRecord.created_at).toLocaleString()}</small></p>
                  <p><small><strong>Updated:</strong> {new Date(selectedRecord.updated_at).toLocaleString()}</small></p>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <Modal show={!!editingRecord} onHide={() => setEditingRecord(null)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faEdit} className="me-2" />
              Edit Onboarding Record - {editingRecord.employee_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Employee Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={editingRecord.employee_name || ''}
                    onChange={(e) => setEditingRecord(prev => ({...prev, employee_name: e.target.value}))}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={editingRecord.employee_email || ''}
                    onChange={(e) => setEditingRecord(prev => ({...prev, employee_email: e.target.value}))}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Position</Form.Label>
                  <Form.Control
                    type="text"
                    value={editingRecord.position || ''}
                    onChange={(e) => setEditingRecord(prev => ({...prev, position: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    value={editingRecord.department || ''}
                    onChange={(e) => setEditingRecord(prev => ({...prev, department: e.target.value}))}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={editingRecord.start_date || ''}
                    onChange={(e) => setEditingRecord(prev => ({...prev, start_date: e.target.value}))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditingRecord(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              <FontAwesomeIcon icon={faSave} className="me-2" />
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      )}
        </>
      )}

      {/* Interview Scheduling Modal */}
      {showInterviewModal && selectedApplicant && (
        <Modal show={showInterviewModal} onHide={handleCancelInterview} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
              Set Interview - {selectedApplicant.employee_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <h6>Applicant Information</h6>
                <p><strong>Name:</strong> {selectedApplicant.employee_name}</p>
                <p><strong>Email:</strong> {selectedApplicant.employee_email}</p>
                <p><strong>Position:</strong> {selectedApplicant.position}</p>
                <p><strong>Department:</strong> {selectedApplicant.department}</p>
              </div>
              <div className="col-md-6">
                <h6>Interview Details</h6>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Interview Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={interviewForm.interviewDate}
                      onChange={(e) => handleInterviewFormChange('interviewDate', e.target.value)}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Interview Time *</Form.Label>
                    <Form.Control
                      type="time"
                      value={interviewForm.interviewTime}
                      onChange={(e) => handleInterviewFormChange('interviewTime', e.target.value)}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Interview Type *</Form.Label>
                    <Form.Select
                      value={interviewForm.interviewType}
                      onChange={(e) => handleInterviewFormChange('interviewType', e.target.value)}
                    >
                      <option value="in-person">In-Person</option>
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Location/Meeting Link *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={interviewForm.interviewType === 'video' ? 'Zoom/Teams link' : 'Office location'}
                      value={interviewForm.location}
                      onChange={(e) => handleInterviewFormChange('location', e.target.value)}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Interviewer *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Interviewer name"
                      value={interviewForm.interviewer}
                      onChange={(e) => handleInterviewFormChange('interviewer', e.target.value)}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Additional notes or instructions"
                      value={interviewForm.notes}
                      onChange={(e) => handleInterviewFormChange('notes', e.target.value)}
                    />
                  </Form.Group>
                </Form>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              className="btn-professional btn-cancel"
              variant="secondary" 
              onClick={handleCancelInterview}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <span className="btn-text">Cancel</span>
            </Button>
            <Button 
              className="btn-professional btn-schedule"
              variant="primary" 
              onClick={handleSubmitInterview}
              disabled={!interviewForm.interviewDate || !interviewForm.interviewTime || !interviewForm.location || !interviewForm.interviewer}
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
              <span className="btn-text">Submit Interview</span>
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Enhanced Tab Contents */}
      {activeTab === 'orientation' && (
        <div className="modern-content-card">
          <div className="content-header">
            <div className="header-icon">
              <FontAwesomeIcon icon={faCalendarAlt} />
            </div>
            <div className="header-content">
              <h3 className="content-title">Orientation Scheduling</h3>
              <p className="content-subtitle">Plan and manage orientation sessions for new employees</p>
            </div>
          </div>
          <div className="content-body">
            <div className="feature-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faCalendarAlt} className="feature-icon" />
                <h6>Session Planning</h6>
                <p>Schedule orientation sessions with proper timing and resources</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faUsers} className="feature-icon" />
                <h6>Group Management</h6>
                <p>Organize employees into orientation groups based on roles</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faFileAlt} className="feature-icon" />
                <h6>Material Distribution</h6>
                <p>Distribute welcome packets and orientation materials</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'starting-date' && (
        <div className="modern-content-card">
          <div className="content-header">
            <div className="header-icon">
              <FontAwesomeIcon icon={faClock} />
            </div>
            <div className="header-content">
              <h3 className="content-title">Starting Date Management</h3>
              <p className="content-subtitle">Coordinate employee start dates and onboarding timeline</p>
            </div>
          </div>
          <div className="content-body">
            <div className="feature-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faCalendarAlt} className="feature-icon" />
                <h6>Date Coordination</h6>
                <p>Schedule optimal start dates based on business needs</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faChartLine} className="feature-icon" />
                <h6>Timeline Tracking</h6>
                <p>Monitor onboarding progress and milestone completion</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faCheckCircle} className="feature-icon" />
                <h6>Readiness Checklist</h6>
                <p>Ensure all prerequisites are met before start date</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'salary-setup' && (
        <div className="modern-content-card">
          <div className="content-header">
            <div className="header-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="header-content">
              <h3 className="content-title">Salary Setup</h3>
              <p className="content-subtitle">Configure compensation packages and payroll integration</p>
            </div>
          </div>
          <div className="content-body">
            <div className="feature-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faDollarSign} className="feature-icon" />
                <h6>Compensation Planning</h6>
                <p>Set up salary structures and benefit packages</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faFileAlt} className="feature-icon" />
                <h6>Contract Management</h6>
                <p>Generate employment contracts and agreements</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faChartLine} className="feature-icon" />
                <h6>Payroll Integration</h6>
                <p>Connect with payroll systems for seamless processing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'benefits' && (
        <div className="modern-content-card">
          <div className="content-header">
            <div className="header-icon">
              <FontAwesomeIcon icon={faShieldAlt} />
            </div>
            <div className="header-content">
              <h3 className="content-title">Benefits Enrollment</h3>
              <p className="content-subtitle">Manage employee benefits and insurance enrollment</p>
            </div>
          </div>
          <div className="content-body">
            <div className="feature-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faShieldAlt} className="feature-icon" />
                <h6>Insurance Setup</h6>
                <p>Enroll employees in health, dental, and life insurance</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faUsers} className="feature-icon" />
                <h6>Dependent Management</h6>
                <p>Add and manage dependent information for coverage</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faFileAlt} className="feature-icon" />
                <h6>Documentation</h6>
                <p>Process enrollment forms and required documentation</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employee-profile' && (
        <div className="modern-content-card">
          <div className="content-header">
            <div className="header-icon">
              <FontAwesomeIcon icon={faUserTie} />
            </div>
            <div className="header-content">
              <h3 className="content-title">Employee Profile Creation</h3>
              <p className="content-subtitle">Create and manage comprehensive employee profiles</p>
            </div>
          </div>
          <div className="content-body">
            <div className="feature-grid">
              <div className="feature-item">
                <FontAwesomeIcon icon={faUserTie} className="feature-icon" />
                <h6>Profile Setup</h6>
                <p>Create detailed employee profiles with personal information</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faBriefcase} className="feature-icon" />
                <h6>Role Assignment</h6>
                <p>Assign roles, permissions, and access levels</p>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faCog} className="feature-icon" />
                <h6>System Integration</h6>
                <p>Integrate with HR systems and create user accounts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modern Styling */}
      <style>{`
        /* Enhanced Breadcrumb Styling */
        .modern-breadcrumb {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .modern-breadcrumb .breadcrumb-item {
          color: #6c757d;
          font-weight: 500;
        }

        .modern-breadcrumb .breadcrumb-item.active {
          color: #495057;
          font-weight: 600;
        }

        /* Enhanced Title Styling */
        .modern-title {
          color: #2c3e50;
          font-weight: 700;
          font-size: 2.25rem;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }

        .modern-title svg {
          color: #6c757d;
          font-size: 2rem;
        }

        .modern-subtitle {
          color: #6c757d;
          font-size: 1.1rem;
          font-weight: 400;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        /* Summary Stats Styling */
        .summary-stats {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .summary-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 0.95rem;
          color: #495057;
          transition: all 0.3s ease;
        }

        .summary-item:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .summary-item svg {
          color: #4a90e2;
          font-size: 1.1rem;
        }

        .summary-item .fw-semibold {
          color: #2c3e50;
          font-weight: 600;
        }

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
          border-radius: 16px;
          padding: 1rem 1.5rem;
          min-width: 140px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #6c757d;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
          font-size: 1.5rem;
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

        /* Enhanced Content Cards */
        .modern-content-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 24px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .modern-content-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
        }

        .content-header {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header-icon svg {
          color: white;
          font-size: 2rem;
        }

        .content-title {
          color: white;
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .content-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        .content-body {
          padding: 2.5rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .feature-item {
          text-align: center;
          padding: 2rem 1.5rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        }

        .feature-icon {
          color: #4a90e2;
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .feature-item h6 {
          color: #2c3e50;
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
        }

        .feature-item p {
          color: #6c757d;
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }

        /* Enhanced Form Controls */
        .modern-select {
          border-radius: 12px;
          border: 2px solid #e9ecef;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .modern-select:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          outline: none;
        }

        .modern-refresh-btn {
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          font-weight: 500;
          border: 2px solid #4a90e2;
          color: #4a90e2;
          background: white;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .modern-refresh-btn:hover {
          background: #4a90e2;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
        }

        /* Modern Card Styling */
        .modern-onboarding-card {
          border-radius: 20px;
          overflow: visible;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 1;
        }

        .modern-onboarding-header {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          color: white;
          border: none;
          padding: 1.25rem 1.5rem;
        }

        .modern-onboarding-header h5 {
          color: white;
          font-weight: 600;
          margin: 0;
        }

        .modern-onboarding-header .badge {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-weight: 500;
        }

        /* Modern Table Styling */
        .modern-onboarding-table {
          border-radius: 0;
          margin-bottom: 0;
        }

        .modern-onboarding-thead {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .modern-onboarding-th {
          border: none;
          font-weight: 600;
          color: #495057;
          padding: 1rem 0.75rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          vertical-align: middle;
        }

        .modern-onboarding-th svg {
          color: #4a90e2;
          font-size: 0.75rem;
        }

        /* Alternating Row Colors */
        .modern-onboarding-row {
          transition: all 0.3s ease;
          border-bottom: 1px solid #f1f3f4;
          position: relative;
          z-index: 1;
        }

        .modern-onboarding-row.even-row {
          background-color: #ffffff;
        }

        .modern-onboarding-row.odd-row {
          background-color: #f8f9fa;
        }

        .modern-onboarding-row:hover {
          background: linear-gradient(135deg, rgba(74, 144, 226, 0.05) 0%, rgba(53, 122, 189, 0.05) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 2;
        }

        .modern-onboarding-td {
          padding: 0.75rem 0.75rem;
          border: none;
          vertical-align: middle;
          color: #2c3e50;
        }

        /* Actions column specific styling */
        .modern-onboarding-td:last-child {
          position: relative;
          z-index: 10;
        }

        .modern-onboarding-row:hover .modern-onboarding-td:last-child {
          z-index: 1000;
        }

        /* Compact Employee Info */
        .employee-info-compact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .employee-avatar-compact {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
          flex-shrink: 0;
        }

        .avatar-icon-compact {
          color: white;
          font-size: 0.8rem;
        }

        .employee-details-compact {
          flex: 1;
          min-width: 0;
        }

        .employee-name-compact {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.85rem;
          margin-bottom: 0.125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .employee-email-compact {
          color: #6c757d;
          font-size: 0.7rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Compact Info Columns */
        .position-info-compact,
        .department-info-compact,
        .date-info-compact {
          display: flex;
          align-items: center;
          font-size: 0.8rem;
        }

        .position-info-compact svg,
        .department-info-compact svg,
        .date-info-compact svg {
          font-size: 0.7rem;
        }

        /* Modern Status Select */
        .modern-status-select {
          border-radius: 6px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
          font-size: 0.75rem;
          padding: 0.375rem 0.5rem;
          background: white;
          min-width: 140px;
          color: #495057;
        }

        .modern-status-select:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          outline: none;
        }

        .modern-status-select:hover {
          border-color: #4a90e2;
        }

        /* Compact Progress Container */
        .progress-container-compact {
          width: 100%;
        }

        .progress-wrapper-compact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modern-progress-compact {
          flex: 1;
          height: 8px;
          border-radius: 8px;
          background-color: #e9ecef;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .modern-progress-bar-compact {
          background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
          transition: width 0.6s ease;
          border-radius: 8px;
          position: relative;
        }

        .modern-progress-bar-compact::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
          animation: shimmer-compact 2s infinite;
        }

        @keyframes shimmer-compact {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-input-group-compact {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }

        .modern-input-compact {
          width: 45px;
          border-radius: 4px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
          text-align: center;
          font-weight: 500;
          font-size: 0.7rem;
          padding: 0.25rem 0.125rem;
          color: #495057;
          background: white;
        }

        .modern-input-compact:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          outline: none;
        }

        .progress-percent-compact {
          font-size: 0.7rem;
          color: #6c757d;
          font-weight: 500;
        }

        /* Actions Dropdown */
        .actions-dropdown-container {
          position: relative;
          display: inline-block;
          z-index: 100;
        }

        .dropdown-toggle-btn {
          border-radius: 6px;
          border: 2px solid #e9ecef;
          background: white;
          color: #6c757d;
          padding: 0.375rem 0.5rem;
          transition: all 0.3s ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 101;
        }

        .dropdown-toggle-btn:hover {
          border-color: #4a90e2;
          color: #4a90e2;
          background: rgba(74, 144, 226, 0.05);
        }

        .dropdown-toggle-btn:focus {
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          outline: none;
        }

        .dropdown-toggle-btn.active {
          border-color: #4a90e2;
          color: #4a90e2;
          background: rgba(74, 144, 226, 0.1);
        }

        .actions-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
          z-index: 9999;
          min-width: 180px;
          padding: 0.5rem 0;
          margin: 0;
          opacity: 1;
          transform: translateY(0);
          transition: all 0.2s ease-in-out;
          pointer-events: auto;
        }

        .actions-dropdown-menu::before {
          content: '';
          position: absolute;
          top: -6px;
          right: 12px;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 6px solid #e9ecef;
        }

        .actions-dropdown-menu::after {
          content: '';
          position: absolute;
          top: -5px;
          right: 12px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 5px solid white;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          color: #495057;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }

        .dropdown-item:hover {
          background: rgba(74, 144, 226, 0.1);
          color: #4a90e2;
          transform: translateX(2px);
        }

        .dropdown-item:active {
          background: rgba(74, 144, 226, 0.15);
          transform: translateX(0);
        }

        .dropdown-item svg {
          font-size: 0.8rem;
          margin-right: 0.75rem;
          width: 16px;
          text-align: center;
        }

        /* Modal Button Styling */
        .btn-professional {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          position: relative;
          overflow: hidden;
        }

        .btn-professional:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .btn-professional:active {
          transform: translateY(0);
        }

        .btn-professional .btn-text {
          transition: all 0.3s ease;
        }

        .btn-professional svg {
          transition: transform 0.3s ease;
        }

        .btn-professional:hover svg {
          transform: scale(1.1);
        }

        .btn-cancel {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          border-color: #6c757d;
          color: white;
          box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
        }

        .btn-cancel:hover {
          background: linear-gradient(135deg, #5a6268 0%, #343a40 100%);
          color: white;
          box-shadow: 0 8px 25px rgba(108, 117, 125, 0.4);
        }

        .btn-schedule {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-color: #4a90e2;
          color: white;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .btn-schedule:hover {
          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);
          color: white;
          box-shadow: 0 8px 25px rgba(74, 144, 226, 0.4);
        }

        .btn-schedule:disabled {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #6c757d;
          box-shadow: none;
          transform: none;
        }

        .btn-schedule:disabled:hover {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #6c757d;
          box-shadow: none;
          transform: none;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .modern-onboarding-th,
          .modern-onboarding-td {
            padding: 0.5rem 0.375rem;
          }
          
          .employee-info-compact {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
          
          .employee-avatar-compact {
            width: 28px;
            height: 28px;
          }
          
          .progress-wrapper-compact {
            flex-direction: column;
            gap: 0.25rem;
            align-items: stretch;
          }
          
          .modern-progress-compact {
            height: 6px;
          }
        }

        @media (max-width: 768px) {
          .modern-onboarding-header {
            padding: 1rem;
          }
          
          .modern-onboarding-th,
          .modern-onboarding-td {
            padding: 0.375rem 0.25rem;
            font-size: 0.75rem;
          }
          
          .employee-name-compact {
            font-size: 0.8rem;
          }
          
          .employee-email-compact {
            font-size: 0.65rem;
          }
          
          .modern-status-select {
            font-size: 0.7rem;
            min-width: 120px;
          }
          
          .modern-input-compact {
            width: 40px;
            font-size: 0.65rem;
          }
        }

        /* Empty State Styling */
        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #6c757d;
        }

        .empty-state svg {
          font-size: 2.5rem;
          color: #dee2e6;
          margin-bottom: 1rem;
        }

        .empty-state h5 {
          color: #495057;
          font-weight: 500;
        }

        /* Enhanced Hover Effects */
        .modern-onboarding-row {
          cursor: pointer;
        }

        .modern-onboarding-row:hover .employee-avatar-compact {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
        }

        .modern-onboarding-row:hover .modern-progress-bar-compact {
          box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
        }

        /* Tab Button Styling */
        .btn-tab {
          position: relative;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          padding: 0.5rem 1rem;
          min-width: 100px;
          font-size: 0.875rem;
        }

        .btn-tab:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-tab.active {
          background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
          border-color: #4a90e2;
          color: white;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .btn-tab.active:hover {
          background: linear-gradient(135deg, #3d7bc8 0%, #2d5f9a 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
          color: white;
        }

        .btn-tab:not(.active) {
          background: transparent;
          border-color: #dee2e6;
          color: #6c757d;
        }

        .btn-tab:not(.active):hover {
          background: rgba(74, 144, 226, 0.1);
          border-color: #4a90e2;
          color: #4a90e2;
        }

        /* Tab Button Icon Animation */
        .btn-tab svg {
          transition: transform 0.3s ease;
        }

        .btn-tab:hover svg {
          transform: scale(1.1);
        }

        .btn-tab.active svg {
          color: white;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .modern-tab {
            min-width: 120px;
            padding: 0.8rem 1.2rem;
          }
          
          .tab-label {
            font-size: 0.85rem;
          }
          
          .feature-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .modern-title {
            font-size: 1.75rem;
          }
          
          .modern-tab {
            min-width: 100px;
            padding: 0.6rem 1rem;
          }
          
          .tab-label {
            font-size: 0.8rem;
          }
          
          .tab-icon {
            font-size: 1.2rem;
          }
          
          .summary-stats {
            padding: 1rem;
          }
          
          .summary-item {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }
          
          .feature-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .feature-item {
            padding: 1.5rem 1rem;
          }
          
          .content-header {
            padding: 1.5rem;
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .header-icon {
            width: 60px;
            height: 60px;
          }
          
          .content-body {
            padding: 1.5rem;
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
          }
          
          .summary-item {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }
        }

        /* Smooth Animations */
        * {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modern-onboarding-row,
        .employee-avatar-compact,
        .modern-progress-bar-compact,
        .dropdown-toggle-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </Container>
  );
};

export default Onboarding;