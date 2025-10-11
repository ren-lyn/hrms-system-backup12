import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Form, Modal, Row, Col, Alert, ProgressBar } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const JobApplications = () => {
  const navigate = useNavigate();
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
  
  // Toast helpers
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  useEffect(() => {
    checkAuthStatus();
    fetchJobs();
    if (isLoggedIn && (userRole === 'Applicant' || userRole === 'HR Staff' || userRole === 'HR Assistant')) {
      fetchApplications();
    }
  }, [isLoggedIn, userRole]);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      console.log('User logged in with role:', role);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/public/job-postings');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      
      // Mock data for demonstration
      setJobs([
        {
          id: 1,
          title: 'Senior Software Engineer',
          department: 'IT Department',
          position: 'Full-time',
          description: 'We are looking for a skilled Senior Software Engineer to join our dynamic development team. You will be responsible for designing, developing, and maintaining high-quality software solutions.',
          requirements: '• Bachelor\'s degree in Computer Science or related field\n• 5+ years of experience in software development\n• Proficiency in React, Node.js, and databases\n• Strong problem-solving skills\n• Excellent communication abilities',
          salary_min: 80000,
          salary_max: 120000,
          salary_notes: 'Based on experience and qualifications',
          status: 'Open',
          created_at: new Date().toISOString(),
          posted_by: 'HR Department'
        },
        {
          id: 2,
          title: 'Marketing Manager',
          department: 'Marketing',
          position: 'Full-time',
          description: 'Join our marketing team as a Marketing Manager and lead our digital marketing initiatives. You will develop and execute marketing strategies to drive brand awareness and customer acquisition.',
          requirements: '• Bachelor\'s degree in Marketing, Business, or related field\n• 3+ years of marketing experience\n• Experience with digital marketing platforms\n• Strong analytical and creative skills\n• Leadership experience preferred',
          salary_min: 60000,
          salary_max: 85000,
          salary_notes: 'Competitive package with performance bonuses',
          status: 'Open',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          posted_by: 'HR Department'
        },
        {
          id: 3,
          title: 'HR Specialist',
          department: 'Human Resources',
          position: 'Full-time',
          description: 'We are seeking an experienced HR Specialist to support our growing team. You will handle recruitment, employee relations, and HR administrative tasks.',
          requirements: '• Bachelor\'s degree in HR, Psychology, or related field\n• 2+ years of HR experience\n• Knowledge of employment law\n• Strong interpersonal skills\n• HR certification preferred',
          salary_min: 50000,
          salary_max: 70000,
          salary_notes: 'Plus comprehensive benefits package',
          status: 'Open',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          posted_by: 'HR Department'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/my-applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      
      // Mock applications data
      setMyApplications([
        {
          id: 1,
          job_posting: {
            title: 'Senior Software Engineer',
            department: 'IT Department'
          },
          status: 'Applied',
          applied_at: new Date(Date.now() - 86400000).toISOString(),
          progress_percentage: 20
        },
        {
          id: 2,
          job_posting: {
            title: 'Marketing Manager',
            department: 'Marketing'
          },
          status: 'Interview',
          applied_at: new Date(Date.now() - 259200000).toISOString(),
          progress_percentage: 60
        },
        {
          id: 3,
          job_posting: {
            title: 'HR Specialist',
            department: 'Human Resources'
          },
          status: 'ShortListed',
          applied_at: new Date(Date.now() - 172800000).toISOString(),
          progress_percentage: 40
        },
        {
          id: 4,
          job_posting: {
            title: 'Financial Analyst',
            department: 'Finance'
          },
          status: 'Offered',
          applied_at: new Date(Date.now() - 345600000).toISOString(),
          progress_percentage: 80
        },
        {
          id: 5,
          job_posting: {
            title: 'Sales Representative',
            department: 'Sales'
          },
          status: 'Offered Accepted',
          applied_at: new Date(Date.now() - 432000000).toISOString(),
          progress_percentage: 90
        },
        {
          id: 6,
          job_posting: {
            title: 'Customer Support',
            department: 'Customer Service'
          },
          status: 'Onboarding',
          applied_at: new Date(Date.now() - 518400000).toISOString(),
          progress_percentage: 95
        },
        {
          id: 7,
          job_posting: {
            title: 'Data Analyst',
            department: 'IT Department'
          },
          status: 'Hired',
          applied_at: new Date(Date.now() - 604800000).toISOString(),
          progress_percentage: 100
        },
        {
          id: 8,
          job_posting: {
            title: 'Graphic Designer',
            department: 'Marketing'
          },
          status: 'Rejected',
          applied_at: new Date(Date.now() - 691200000).toISOString(),
          progress_percentage: 0
        },
        {
          id: 9,
          job_posting: {
            title: 'Project Manager',
            department: 'Operations'
          },
          status: 'Pending',
          applied_at: new Date(Date.now() - 777600000).toISOString(),
          progress_percentage: 10
        }
      ]);
      console.log('Mock applications loaded:', myApplications.length);
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
      
      // Refresh applications list
      fetchApplications();

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
      case 'Applied': return 'primary';
      case 'ShortListed': return 'info';
      case 'Interview': return 'warning';
      case 'Offer Sent': return 'success';
      case 'Offer Accepted': return 'success';
      case 'Rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusProgress = (status) => {
    const progressMap = {
      'Applied': 10,
      'ShortListed': 25,
      'Interview': 50,
      'Offer Sent': 75,
      'Offer Accepted': 100,
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
      pending: myApplications.filter(app => ['Applied', 'Pending'].includes(app.status)).length,
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
                              'Pending': 'Applied',
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
                        <option value="Applied">Applied</option>
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
                            <Badge bg={getStatusBadgeVariant(application.status)}>
                              {application.status}
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
      `}</style>
    </div>
  );
};

export default JobApplications;