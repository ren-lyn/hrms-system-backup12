import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Table, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faClock, 
  faCheckCircle, 
  faCalendarAlt,
  faFileAlt,
  faUserPlus,
  faUserTie,
  faTimesCircle,
  faInfoCircle,
  faEye,
  faEdit,
  faEllipsisV,
  faDownload,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const Onboarding = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRecordForStatus, setSelectedRecordForStatus] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicantForInterview, setSelectedApplicantForInterview] = useState(null);
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    duration: '30',
    interview_type: 'On-site',
    location: '',
    interviewer: '',
    notes: ''
  });
  
  // Batch interview functionality
  const [showBatchInterviewModal, setShowBatchInterviewModal] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [batchInterviewData, setBatchInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    duration: '30',
    interview_type: 'On-site',
    location: '',
    interviewer: '',
    notes: ''
  });

  // Fetch applicants from JobPortal applications
  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('🔍 [Onboarding] Fetching applicants with token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get('http://localhost:8000/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 [Onboarding] API Response:', response.data);
      console.log('📊 [Onboarding] Applications count:', response.data.length);
      
      // Handle both array and object responses
      const applications = Array.isArray(response.data) ? response.data : (response.data.data || []);
      
      // Debug: Log first application structure
      if (applications.length > 0) {
        console.log('🔍 [Onboarding] First application structure:', applications[0]);
        console.log('🔍 [Onboarding] Applicant data:', applications[0].applicant);
        console.log('🔍 [Onboarding] Job posting data:', applications[0].jobPosting);
        console.log('🔍 [Onboarding] Job title:', applications[0].jobPosting?.title);
        console.log('🔍 [Onboarding] Job department:', applications[0].jobPosting?.department);
        console.log('🔍 [Onboarding] Job position:', applications[0].jobPosting?.position);
      }
      
      setApplicants(applications);
      
      console.log('✅ [Onboarding] Applications loaded:', applications.length);
    } catch (error) {
      console.error('❌ [Onboarding] Error fetching applicants:', error);
      console.error('❌ [Onboarding] Error details:', error.response?.data);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Refresh data when tab changes
  useEffect(() => {
    console.log('🔄 [Onboarding] Tab changed to:', activeTab);
    const filtered = getFilteredApplicants();
    console.log('🔄 [Onboarding] Filtered applicants for', activeTab, ':', filtered.length);
  }, [activeTab, applicants]);

  // Filter applicants based on active tab
  const getFilteredApplicants = () => {
    if (activeTab === 'Overview') {
      return applicants;
    }
    
    console.log('🔍 [Onboarding] Filtering applicants for tab:', activeTab);
    console.log('🔍 [Onboarding] Total applicants before filtering:', applicants.length);
    
    const filtered = applicants.filter(applicant => {
      const status = applicant.status;
      console.log('🔍 [Onboarding] Checking applicant status:', status, 'for tab:', activeTab);
      
      switch (activeTab) {
        case 'Pending':
          return status === 'Pending';
        case 'Shortlisted':
          return status === 'ShortListed' || status === 'Shortlisted';
        case 'Interview':
          return status === 'On going Interview' || status === 'Interview';
        case 'Offered':
          return status === 'Offered';
        case 'Accepted Offer':
          return status === 'Accepted';
        case 'Onboarding':
          return status === 'Onboarding';
        case 'Hired':
          return status === 'Hired';
        case 'Rejected':
          return status === 'Rejected';
        default:
          return true;
      }
    });
    
    console.log('🔍 [Onboarding] Filtered applicants count:', filtered.length);
    return filtered;
  };

  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      total: applicants.length,
      pending: applicants.filter(a => a.status === 'Pending').length,
      shortlisted: applicants.filter(a => a.status === 'ShortListed').length,
      interview: applicants.filter(a => a.status === 'On going Interview').length,
      offered: applicants.filter(a => a.status === 'Offered').length,
      accepted: applicants.filter(a => a.status === 'Accepted').length,
      onboarding: applicants.filter(a => a.status === 'Onboarding').length,
      hired: applicants.filter(a => a.status === 'Hired').length,
      rejected: applicants.filter(a => a.status === 'Rejected').length
    };
    return stats;
  };

  const stats = calculateStats();

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'warning', icon: faClock, text: 'Pending', customClass: 'status-pending' },
      'ShortListed': { color: 'info', icon: faCheckCircle, text: 'Shortlisted', customClass: 'status-shortlisted' },
      'On going Interview': { color: 'primary', icon: faCalendarAlt, text: 'Interview', customClass: 'status-interview' },
      'Offered': { color: 'primary', icon: faFileAlt, text: 'Offered', customClass: 'status-offered' },
      'Accepted': { color: 'success', icon: faUserPlus, text: 'Accepted', customClass: 'status-accepted' },
      'Onboarding': { color: 'info', icon: faUserTie, text: 'Onboarding', customClass: 'status-onboarding' },
      'Hired': { color: 'success', icon: faCheckCircle, text: 'Hired', customClass: 'status-hired' },
      'Rejected': { color: 'danger', icon: faTimesCircle, text: 'Rejected', customClass: 'status-rejected' }
    };
    
    const config = statusConfig[status] || statusConfig['Pending'];
    
    return (
      <Badge bg={config.color} className={`d-flex align-items-center gap-1 status-badge ${config.customClass}`}>
        <FontAwesomeIcon icon={config.icon} size="sm" />
        {config.text}
      </Badge>
    );
  };

  // Handle dropdown toggle
  const toggleDropdown = (recordId) => {
    setActiveDropdown(activeDropdown === recordId ? null : recordId);
  };

  // Handle view details
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
    setActiveDropdown(null);
  };

  // Handle status change
  const handleChangeStatus = (record) => {
    if (record.status !== 'Pending') {
      alert('Status can only be changed from Pending to ShortListed or Rejected');
      setActiveDropdown(null);
      return;
    }
    setSelectedRecordForStatus(record);
    setShowStatusModal(true);
    setActiveDropdown(null);
  };

  // Handle status update
  const handleStatusUpdate = async (targetStatus) => {
    try {
      const applicantToUpdate = selectedRecord || selectedRecordForStatus;
      const response = await axios.put(
        `http://localhost:8000/api/applications/${applicantToUpdate.id}/status`,
        { status: targetStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        }
      );
      
      const applicantName = applicantToUpdate.applicant 
        ? `${applicantToUpdate.applicant.first_name} ${applicantToUpdate.applicant.last_name}` 
        : 'Applicant';
      
      alert(`Status updated to ${targetStatus} for ${applicantName}`);
      await fetchApplicants();
      setShowModal(false);
      setSelectedRecord(null);
      setShowStatusModal(false);
      setSelectedRecordForStatus(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle resume download
  const handleDownloadResume = (applicant) => {
    // Check multiple possible resume locations
    const resumeUrl = applicant.resume_path || applicant.applicant?.resume || applicant.resume;
    
    console.log('🔍 [Download Resume] Checking resume URL:', resumeUrl);
    console.log('🔍 [Download Resume] Full applicant data:', applicant);
    
    if (resumeUrl) {
      // Construct full URL if needed
      const fullUrl = resumeUrl.startsWith('http') 
        ? resumeUrl 
        : `http://localhost:8000/storage/${resumeUrl}`;
      
      console.log('✅ [Download Resume] Downloading from URL:', fullUrl);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = `Resume_${applicant.applicant?.first_name || 'Applicant'}_${applicant.applicant?.last_name || 'Resume'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('❌ [Download Resume] No resume URL found');
      alert('Resume not available for this applicant.');
    }
  };

  // Handle schedule interview
  const handleScheduleInterview = (applicant) => {
    setSelectedApplicantForInterview(applicant);
    setInterviewData({
      interview_date: '',
      interview_time: '',
      duration: '30',
      interview_type: 'On-site',
      location: '',
      interviewer: '',
      notes: ''
    });
    setShowInterviewModal(true);
  };

  // Handle send interview invite
  const handleSendInterviewInvite = async () => {
    try {
      // Validate required fields
      if (!interviewData.interview_date || !interviewData.interview_time || !interviewData.location || !interviewData.interviewer) {
        alert('Please fill in all required fields: Date, Time, Location, and Interviewer');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:8000/api/applications/${selectedApplicantForInterview.id}/schedule-interview`,
        {
          interview_date: interviewData.interview_date,
          interview_time: interviewData.interview_time,
          duration: parseInt(interviewData.duration),
          interview_type: interviewData.interview_type,
          location: interviewData.location,
          interviewer: interviewData.interviewer,
          notes: interviewData.notes
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      alert('Interview invitation sent successfully!');
      setShowInterviewModal(false);
      setSelectedApplicantForInterview(null);
      await fetchApplicants();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Failed to schedule interview. Please try again.');
    }
  };

  // Handle batch interview selection
  const handleBatchInterviewSelection = (applicant) => {
    setSelectedApplicants(prev => {
      const isSelected = prev.some(selected => selected.id === applicant.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== applicant.id);
      } else {
        return [...prev, applicant];
      }
    });
  };

  // Handle batch interview modal
  const handleBatchInterviewModal = () => {
    if (selectedApplicants.length === 0) {
      alert('Please select at least one applicant for batch interview scheduling.');
      return;
    }
    setShowBatchInterviewModal(true);
  };

  // Handle send batch interview invites
  const handleSendBatchInterviewInvites = async () => {
    try {
      // Validate required fields
      if (!batchInterviewData.interview_date || !batchInterviewData.interview_time || !batchInterviewData.location || !batchInterviewData.interviewer) {
        alert('Please fill in all required fields: Date, Time, Location, and Interviewer');
        return;
      }

      const token = localStorage.getItem('token');
      const applicationIds = selectedApplicants.map(applicant => applicant.id);
      
      const response = await axios.post(
        'http://localhost:8000/api/applications/schedule-batch-interviews',
        {
          application_ids: applicationIds,
          interview_date: batchInterviewData.interview_date,
          interview_time: batchInterviewData.interview_time,
          duration: parseInt(batchInterviewData.duration),
          interview_type: batchInterviewData.interview_type,
          location: batchInterviewData.location,
          interviewer: batchInterviewData.interviewer,
          notes: batchInterviewData.notes
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      const { successful_count, failed_count, successful_interviews, failed_interviews } = response.data;
      
      let message = `Batch interview scheduling completed!\n\n`;
      message += `✅ Successful: ${successful_count} interviews scheduled\n`;
      if (failed_count > 0) {
        message += `❌ Failed: ${failed_count} interviews\n\n`;
        message += `Failed applicants:\n`;
        failed_interviews.forEach(failed => {
          const applicant = selectedApplicants.find(app => app.id === failed.application_id);
          message += `• ${applicant ? applicant.first_name + ' ' + applicant.last_name : 'Unknown'}: ${failed.error}\n`;
        });
      }

      alert(message);
      setShowBatchInterviewModal(false);
      setSelectedApplicants([]);
      await fetchApplicants();
    } catch (error) {
      console.error('Error scheduling batch interviews:', error);
      alert('Failed to schedule batch interviews. Please try again.');
    }
  };

  // Handle resume view
  const handleViewResume = (applicant) => {
    // Check multiple possible resume locations
    const resumeUrl = applicant.resume_path || applicant.applicant?.resume || applicant.resume;
    
    console.log('🔍 [View Resume] Checking resume URL:', resumeUrl);
    console.log('🔍 [View Resume] Full applicant data:', applicant);
    
    if (resumeUrl) {
      // Construct full URL if needed
      const fullUrl = resumeUrl.startsWith('http') 
        ? resumeUrl 
        : `http://localhost:8000/storage/${resumeUrl}`;
      
      console.log('✅ [View Resume] Opening URL:', fullUrl);
      window.open(fullUrl, '_blank');
    } else {
      console.error('❌ [View Resume] No resume URL found');
      alert('Resume not available for this applicant.');
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

  const filteredApplicants = getFilteredApplicants();

  // Debug logging
  console.log('🔍 [Onboarding] Current state:');
  console.log('- Total applicants:', applicants.length);
  console.log('- Active tab:', activeTab);
  console.log('- Filtered applicants:', filteredApplicants.length);
  console.log('- Loading:', loading);

  return (
    <Container fluid className="p-4">
      {/* Professional Navigation Bar */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Onboarding Management</h4>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={fetchApplicants}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>

          {/* Batch Actions Bar */}
          {selectedApplicants.length > 0 && (
            <div className="alert alert-info d-flex justify-content-between align-items-center mb-4">
              <div>
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                <strong>{selectedApplicants.length}</strong> applicant(s) selected
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={handleBatchInterviewModal}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Schedule Batch Interview
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setSelectedApplicants([])}
                >
                  <FontAwesomeIcon icon={faTimes} className="me-2" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          <div className="professional-navbar">
            <Button
              className={`nav-tab ${activeTab === 'Overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('Overview')}
            >
              Overview
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('Pending')}
            >
              Pending
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Shortlisted' ? 'active' : ''}`}
              onClick={() => setActiveTab('Shortlisted')}
            >
              Shortlisted
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Interview' ? 'active' : ''}`}
              onClick={() => setActiveTab('Interview')}
            >
              Interview
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Offered' ? 'active' : ''}`}
              onClick={() => setActiveTab('Offered')}
            >
              Offered
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Accepted Offer' ? 'active' : ''}`}
              onClick={() => setActiveTab('Accepted Offer')}
            >
              Accepted Offer
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Onboarding' ? 'active' : ''}`}
              onClick={() => setActiveTab('Onboarding')}
            >
              Onboarding
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Hired' ? 'active' : ''}`}
              onClick={() => setActiveTab('Hired')}
            >
              Hired
            </Button>
            <Button
              className={`nav-tab ${activeTab === 'Rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('Rejected')}
            >
              Rejected
            </Button>
          </div>
        </Col>
      </Row>

      {/* Content Section */}
      <Row className="mt-3">
        <Col>
          <div className="content-section">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-0">
                  {activeTab === 'Overview' ? 'All Applications' : `${activeTab} Applications`}
                  <Badge bg="secondary" className="ms-2">{filteredApplicants.length}</Badge>
                </h4>
                {activeTab === 'Overview' && (
                  <small className="text-muted">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                    Summary view - Click on specific status tabs to view details
                  </small>
                )}
              </div>
            </div>

            {filteredApplicants.length === 0 ? (
              <div className="text-center py-5">
                <FontAwesomeIcon icon={faUsers} size="3x" className="text-muted mb-3" />
                <h5 className="text-muted mb-2">No Applications Found</h5>
                <p className="text-muted mb-3">
                  {activeTab === 'Overview' 
                    ? 'No applications available at the moment.'
                    : `No ${activeTab.toLowerCase()} applications found.`
                  }
                </p>
              </div>
            ) : (
              <div className="modern-table-container">
                <Table className="modern-onboarding-table">
                  <thead>
                    <tr>
                      {activeTab !== 'Overview' && (
                        <th className="text-center" style={{ width: '50px' }}>
                          <input 
                            type="checkbox" 
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedApplicants(filteredApplicants);
                              } else {
                                setSelectedApplicants([]);
                              }
                            }}
                            checked={selectedApplicants.length === filteredApplicants.length && filteredApplicants.length > 0}
                          />
                        </th>
                      )}
                      <th className="text-start">Applicant</th>
                      <th className="text-start">Position</th>
                      <th className="text-start">Department</th>
                      <th className="text-center">Applied Date</th>
                      <th className="text-end">Status</th>
                      {activeTab !== 'Overview' && <th className="text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((applicant) => (
                      <tr key={applicant.id}>
                        {activeTab !== 'Overview' && (
                          <td className="text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedApplicants.some(selected => selected.id === applicant.id)}
                              onChange={() => handleBatchInterviewSelection(applicant)}
                            />
                          </td>
                        )}
                        <td className="align-left">
                          <div className="applicant-cell">
                            <div className="avatar me-3">
                              {applicant.applicant?.first_name ? applicant.applicant.first_name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="applicant-info">
                              <div className="applicant-name">
                                {applicant.applicant ? `${applicant.applicant.first_name || ''} ${applicant.applicant.last_name || ''}`.trim() : 'N/A'}
                              </div>
                              <div className="applicant-email">
                                {applicant.applicant?.email || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="align-left" title={applicant.jobPosting?.position || applicant.job_posting?.position || 'N/A'}>
                          <div className="position-text">{applicant.jobPosting?.position || applicant.job_posting?.position || 'N/A'}</div>
                        </td>
                        <td className="align-left" title={applicant.jobPosting?.department || applicant.job_posting?.department || 'N/A'}>
                          <div className="department-text">{applicant.jobPosting?.department || applicant.job_posting?.department || 'N/A'}</div>
                        </td>
                        <td className="align-center">
                          <div className="date-container">
                            <div className="date-text">
                              {applicant.applied_at ? new Date(applicant.applied_at).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="time-text">
                              {applicant.applied_at ? new Date(applicant.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                        </td>
                        <td className="align-right">
                          <div className="status-container">
                            {getStatusBadge(applicant.status)}
                          </div>
                        </td>
                        {activeTab === 'Pending' && (
                          <td className="text-center">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleViewDetails(applicant)}
                              className="view-details-btn"
                            >
                              View Details
                            </Button>
                          </td>
                        )}
                        {activeTab === 'Shortlisted' && (
                          <td className="text-center">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleScheduleInterview(applicant)}
                              className="schedule-interview-btn"
                            >
                              Schedule Interview
                            </Button>
                          </td>
                        )}
                        {activeTab !== 'Overview' && activeTab !== 'Pending' && activeTab !== 'Shortlisted' && (
                          <td className="text-center">
                            <div className="position-relative d-flex justify-content-center align-items-center">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => toggleDropdown(applicant.id)}
                                className="dropdown-toggle-btn"
                              >
                                <FontAwesomeIcon icon={faEllipsisV} />
                              </Button>
                              {activeDropdown === applicant.id && (
                                <div className="dropdown-menu show">
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleViewDetails(applicant)}
                                  >
                                    <FontAwesomeIcon icon={faEye} className="me-2" />
                                    View Details
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleChangeStatus(applicant)}
                                  >
                                    <FontAwesomeIcon icon={faEdit} className="me-2" />
                                    Change Status
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Applicant Details Modal */}
      {showModal && selectedRecord && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content applicant-details-modal">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Applicant Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body px-4 py-3">
                <div className="applicant-details-content">
                  {/* Applicant Info */}
                  <div className="detail-section mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="avatar-large me-3">
                        {selectedRecord.applicant?.first_name ? selectedRecord.applicant.first_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <h4 className="mb-1 fw-bold">
                          {selectedRecord.applicant ? `${selectedRecord.applicant.first_name || ''} ${selectedRecord.applicant.last_name || ''}`.trim() : 'N/A'}
                        </h4>
                        <p className="text-muted mb-0">
                          <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                          {selectedRecord.applicant?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="detail-section mb-4">
                    <h6 className="section-title mb-3">Application Details</h6>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Position:</span>
                          <span className="value fw-semibold">{selectedRecord.jobPosting?.position || selectedRecord.job_posting?.position || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Department:</span>
                          <span className="value fw-semibold">{selectedRecord.jobPosting?.department || selectedRecord.job_posting?.department || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Applied Date:</span>
                          <span className="value">{selectedRecord.applied_at ? new Date(selectedRecord.applied_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-md-6 mb-2">
                        <div className="info-item">
                          <span className="label">Status:</span>
                          <span className="value">{getStatusBadge(selectedRecord.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resume Section */}
                  <div className="detail-section mb-4">
                    <h6 className="section-title mb-3">Resume</h6>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewResume(selectedRecord)}
                      className="view-resume-btn"
                    >
                      <FontAwesomeIcon icon={faEye} className="me-2" />
                      View Resume
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons - Only show for Pending status */}
              {selectedRecord.status === 'Pending' && (
                <div className="modal-footer border-0 pt-0 px-4 pb-4">
                  <div className="d-flex gap-3 w-100">
                    <Button
                      variant="success"
                      className="flex-fill action-btn"
                      onClick={() => handleStatusUpdate('ShortListed')}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                      Move to Shortlisted
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-fill action-btn"
                      onClick={() => handleStatusUpdate('Rejected')}
                    >
                      <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interview Schedule Modal */}
      {showInterviewModal && selectedApplicantForInterview && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Schedule Interview</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowInterviewModal(false);
                    setSelectedApplicantForInterview(null);
                  }}
                ></button>
              </div>
              <div className="modal-body px-4 py-3">
                {/* Applicant Info */}
                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="fw-bold mb-2">Applicant Information</h6>
                  <div className="d-flex align-items-center">
                    <div className="avatar me-3">
                      {selectedApplicantForInterview.applicant?.first_name ? selectedApplicantForInterview.applicant.first_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="fw-semibold">
                        {selectedApplicantForInterview.applicant ? `${selectedApplicantForInterview.applicant.first_name || ''} ${selectedApplicantForInterview.applicant.last_name || ''}`.trim() : 'N/A'}
                      </div>
                      <div className="text-muted small">
                        {selectedApplicantForInterview.applicant?.email || 'N/A'}
                      </div>
                      <div className="text-muted small">
                        Position: {selectedApplicantForInterview.jobPosting?.position || selectedApplicantForInterview.job_posting?.position || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interview Details Form */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Interview Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={interviewData.interview_date}
                      onChange={(e) => setInterviewData({...interviewData, interview_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Interview Time <span className="text-danger">*</span></label>
                    <input
                      type="time"
                      className="form-control"
                      value={interviewData.interview_time}
                      onChange={(e) => setInterviewData({...interviewData, interview_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Duration (minutes) <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={interviewData.duration}
                      onChange={(e) => setInterviewData({...interviewData, duration: e.target.value})}
                    >
                      <option value="10">10 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="40">40 minutes</option>
                      <option value="50">50 minutes</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Interview Type</label>
                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.interview_type}
                      disabled
                      style={{ backgroundColor: '#e9ecef' }}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Location <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.location}
                      onChange={(e) => setInterviewData({...interviewData, location: e.target.value})}
                      placeholder="Enter interview location"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Interviewer <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={interviewData.interviewer}
                      onChange={(e) => setInterviewData({...interviewData, interviewer: e.target.value})}
                      placeholder="Enter interviewer name"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Notes / What to Bring</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={interviewData.notes}
                      onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                      placeholder="Add any additional notes or requirements (e.g., documents to bring, dress code, etc.)"
                    ></textarea>
                  </div>

                  {/* View Resume Button */}
                  <div className="col-12">
                    <div className="border-top pt-3">
                      <label className="form-label fw-semibold">Applicant Resume</label>
                      <div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewResume(selectedApplicantForInterview)}
                          className="view-resume-btn"
                        >
                          <FontAwesomeIcon icon={faEye} className="me-2" />
                          View Resume
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowInterviewModal(false);
                    setSelectedApplicantForInterview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={handleSendInterviewInvite}
                  className="px-4"
                >
                  <i className="bi bi-send me-2"></i>
                  Send Invite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Application Status</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedRecordForStatus && (
                  <div>
                    <p className="mb-3">
                      <strong>Applicant:</strong> {selectedRecordForStatus.applicant_name}<br />
                      <strong>Position:</strong> {selectedRecordForStatus.position}<br />
                      <strong>Current Status:</strong> {selectedRecordForStatus.status}
                    </p>
                    <p className="text-muted mb-4">
                      Select the new status for this application:
                    </p>
                    <div className="d-grid gap-2">
                      <Button
                        variant="success"
                        size="lg"
                        onClick={() => handleStatusUpdate('ShortListed')}
                        className="d-flex align-items-center justify-content-center"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        Move to Shortlisted
                      </Button>
                      <Button
                        variant="danger"
                        size="lg"
                        onClick={() => handleStatusUpdate('Rejected')}
                        className="d-flex align-items-center justify-content-center"
                      >
                        <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                        Move to Rejected
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .professional-navbar {
          display: flex;
          flex-wrap: nowrap;
          gap: 0.4rem;
          justify-content: center;
          align-items: center;
          background: transparent;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
          border: none;
          overflow-x: auto;
          overflow-y: hidden;
          min-height: auto;
        }

        .nav-tab {
          display: flex;
          align-items: center;
          padding: 0.55rem 0.75rem;
          border: 2px solid #e9ecef;
          background: white;
          color: #495057;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.8rem;
          transition: all 0.3s ease;
          text-decoration: none;
          flex: 0 0 auto;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          min-width: 85px;
          white-space: nowrap;
          position: relative;
        }

        .nav-tab:hover {
          background: #e9ecef;
          border-color: #6c757d;
          color: #495057;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .nav-tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .nav-tab.active .badge {
          background: rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }

        .nav-tab .badge {
          margin-left: 0.5rem;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }

        .content-section {
          background: transparent;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
          border: none;
        }

        .modern-table-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e8e8e8;
          max-height: calc(100vh - 250px);
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          margin: 0;
        }
        
        /* Responsive design - Simplified */
        @media (max-width: 768px) {
          .modern-onboarding-table th,
          .modern-onboarding-table td {
            padding: 0.5rem 0.25rem;
            font-size: 0.85rem;
          }
        }

        .modern-onboarding-table {
          margin: 0;
          width: 100%;
          table-layout: fixed;
          max-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        
        /* Column Widths - Responsive and balanced */
        .modern-onboarding-table th:nth-child(1),
        .modern-onboarding-table td:nth-child(1) { width: 28%; }
        .modern-onboarding-table th:nth-child(2),
        .modern-onboarding-table td:nth-child(2) { width: 12%; }
        .modern-onboarding-table th:nth-child(3),
        .modern-onboarding-table td:nth-child(3) { width: 14%; }
        .modern-onboarding-table th:nth-child(4),
        .modern-onboarding-table td:nth-child(4) { width: 13%; }
        .modern-onboarding-table th:nth-child(5),
        .modern-onboarding-table td:nth-child(5) { width: 11%; }
        .modern-onboarding-table th:nth-child(6),
        .modern-onboarding-table td:nth-child(6) { width: 22%; }

        .modern-onboarding-table thead th {
          background: #fafbfc;
          color: #6c757d;
          font-weight: 600;
          padding: 0.875rem 0.75rem;
          border-bottom: 2px solid #e0e0e0;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modern-onboarding-table tbody td {
          padding: 0.875rem 0.75rem;
          vertical-align: middle;
          border-bottom: 1px solid #f0f0f0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          font-size: 0.85rem;
          background: #ffffff;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Alternating row colors */
        .modern-onboarding-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .modern-onboarding-table tbody tr:nth-child(even) td {
          background-color: #fafbfc;
        }
        
        /* Text Alignment */
        .align-left {
          text-align: left;
        }

        .align-center {
          text-align: center;
        }

        .align-right {
          text-align: right;
        }

        /* Applicant Cell */
        .applicant-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .applicant-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .applicant-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.85rem;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .applicant-email {
          color: #9ca3af;
          font-size: 0.8rem;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Position and Department */
        .position-text {
          font-weight: 500;
          color: #495057;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .department-text {
          font-weight: 500;
          color: #495057;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .modern-onboarding-table tbody tr {
          transition: all 0.15s ease;
        }

        .modern-onboarding-table tbody tr:hover {
          background-color: #f5f7fa !important;
          transform: scale(1.001);
        }

        .modern-onboarding-table tbody tr:hover td {
          background-color: #f5f7fa !important;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .date-container {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          align-items: center;
        }

        .date-text {
          font-size: 0.875rem;
          color: #495057;
          font-weight: 500;
          line-height: 1.3;
        }

        .time-text {
          font-size: 0.75rem;
          color: #9ca3af;
          line-height: 1.3;
        }

        .status-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .dropdown-toggle-btn {
          border: 1px solid #e9ecef;
          background: #f8f9fa;
          color: #6c757d;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          transition: all 0.2s ease;
        }

        .dropdown-toggle-btn:hover {
          background: #e9ecef;
          border-color: #6c757d;
          color: #495057;
        }

        .dropdown-menu {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          padding: 0.5rem 0;
          min-width: 180px;
          z-index: 9999;
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
        }

        .dropdown-item {
          padding: 0.75rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 500;
          gap: 0.75rem;
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa;
          padding-left: 1.5rem;
        }

        .position-relative {
          position: relative;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-weight: 600;
          border: none;
          display: inline-flex !important;
          align-items: center;
          gap: 0.375rem;
          white-space: nowrap;
        }

        .status-pending {
          background-color: #fff3cd !important;
          color: #856404 !important;
        }

        .status-shortlisted {
          background-color: #cfe2ff !important;
          color: #084298 !important;
        }

        .status-interview {
          background-color: #cfe2ff !important;
          color: #084298 !important;
        }

        .status-offered {
          background-color: #cfe2ff !important;
          color: #084298 !important;
        }

        .status-accepted {
          background-color: #d1e7dd !important;
          color: #0f5132 !important;
        }

        .status-onboarding {
          background-color: #cfe2ff !important;
          color: #084298 !important;
        }

        .status-hired {
          background-color: #d1e7dd !important;
          color: #0f5132 !important;
        }

        .status-rejected {
          background-color: #f8d7da !important;
          color: #842029 !important;
        }

        /* View Details Button */
        .view-details-btn {
          background-color: #ffffff !important;
          border: 1.5px solid #d1d5db !important;
          color: #4b5563 !important;
          font-size: 0.8125rem;
          padding: 0.65rem 1.5rem;
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
          line-height: 1.4;
          min-width: 110px;
        }

        .view-details-btn:hover {
          background-color: #f9fafb !important;
          border-color: #9ca3af !important;
          color: #374151 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .view-details-btn:active {
          background-color: #f3f4f6 !important;
          transform: translateY(0);
        }

        /* Schedule Interview Button */
        .schedule-interview-btn {
          background-color: #28a745 !important;
          border-color: #28a745 !important;
          color: white !important;
          font-size: 0.85rem;
          padding: 0.75rem 1.75rem;
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
          line-height: 1.4;
          min-width: 170px;
        }

        .schedule-interview-btn:hover {
          background-color: #218838 !important;
          border-color: #1e7e34 !important;
          box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
        }

        .schedule-interview-btn:active {
          background-color: #1e7e34 !important;
          transform: translateY(0);
        }

        /* Applicant Details Modal */
        .applicant-details-modal .modal-content {
          border-radius: 12px;
          border: none;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .applicant-details-content {
          font-size: 0.9rem;
        }

        .avatar-large {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.5rem;
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 0.5rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0;
        }

        .info-item .label {
          font-weight: 500;
          color: #6c757d;
          min-width: 80px;
        }

        .info-item .value {
          color: #495057;
        }

        .view-resume-btn {
          border-radius: 6px;
          font-weight: 500;
          padding: 0.5rem 1.25rem;
          transition: all 0.2s ease;
          background-color: #4a90e2 !important;
          border-color: #4a90e2 !important;
        }

        .view-resume-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
          background-color: #3a7bc8 !important;
          border-color: #3a7bc8 !important;
        }

        .download-resume-btn {
          border-radius: 6px;
          font-weight: 500;
          padding: 0.5rem 1.25rem;
          transition: all 0.2s ease;
        }

        .download-resume-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(74, 144, 226, 0.2);
        }

        .action-btn {
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          border: none;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .detail-section {
          padding: 0.5rem 0;
        }

        @media (max-width: 1200px) {
          .professional-navbar {
            gap: 0.3rem;
            padding: 1rem;
          }

          .nav-tab {
            min-width: 100px;
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 768px) {
          .professional-navbar {
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
          }

          .nav-tab {
            width: 100%;
            min-width: auto;
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
            justify-content: space-between;
          }
        }

        @media (max-width: 576px) {
          .nav-tab {
            font-size: 0.8rem;
            padding: 0.5rem 0.8rem;
          }

          .nav-tab .badge {
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
          }
        }
      `}</style>

      {/* Batch Interview Modal */}
      {showBatchInterviewModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Schedule Batch Interview
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowBatchInterviewModal(false);
                    setBatchInterviewData({
                      interview_date: '',
                      interview_time: '',
                      duration: '30',
                      interview_type: 'On-site',
                      location: '',
                      interviewer: '',
                      notes: ''
                    });
                  }}
                ></button>
              </div>
              <div className="modal-body px-4 py-3">
                <div className="alert alert-info mb-4">
                  <FontAwesomeIcon icon={faUsers} className="me-2" />
                  <strong>Selected Applicants ({selectedApplicants.length}):</strong>
                  <ul className="mb-0 mt-2">
                    {selectedApplicants.map(applicant => (
                      <li key={applicant.id}>
                        {applicant.applicant?.first_name} {applicant.applicant?.last_name} - {applicant.job_posting?.title}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Interview Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={batchInterviewData.interview_date}
                      onChange={(e) => setBatchInterviewData({...batchInterviewData, interview_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Interview Time *</label>
                    <input
                      type="time"
                      className="form-control"
                      value={batchInterviewData.interview_time}
                      onChange={(e) => setBatchInterviewData({...batchInterviewData, interview_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Duration (minutes)</label>
                    <select
                      className="form-select"
                      value={batchInterviewData.duration}
                      onChange={(e) => setBatchInterviewData({...batchInterviewData, duration: e.target.value})}
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Interview Type *</label>
                    <select
                      className="form-select"
                      value={batchInterviewData.interview_type}
                      onChange={(e) => setBatchInterviewData({...batchInterviewData, interview_type: e.target.value})}
                    >
                      <option value="On-site">On-site</option>
                      <option value="in-person">In-person</option>
                      <option value="video">Video Call</option>
                      <option value="phone">Phone Call</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter interview location"
                    value={batchInterviewData.location}
                    onChange={(e) => setBatchInterviewData({...batchInterviewData, location: e.target.value})}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Interviewer *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter interviewer name"
                    value={batchInterviewData.interviewer}
                    onChange={(e) => setBatchInterviewData({...batchInterviewData, interviewer: e.target.value})}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter any additional notes or instructions"
                    value={batchInterviewData.notes}
                    onChange={(e) => setBatchInterviewData({...batchInterviewData, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer border-0">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowBatchInterviewModal(false);
                    setBatchInterviewData({
                      interview_date: '',
                      interview_time: '',
                      duration: '30',
                      interview_type: 'On-site',
                      location: '',
                      interviewer: '',
                      notes: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={handleSendBatchInterviewInvites}
                  className="px-4"
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Send Batch Invites
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default Onboarding;