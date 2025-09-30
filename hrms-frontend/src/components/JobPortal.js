import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

export default function JobPortal() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is logged in when component mounts and fetch jobs
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
    fetchJobs();
  }, []);

  // Fetch job postings from backend
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/public/job-postings");
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Fallback to static data if API fails
      setJobs([
        {
          id: 1,
          title: "SUPPLY CHAIN SUPERVISOR",
          department: "FDC HOME OFFICE - CEBU - NPI",
          description: "Manage supply chain operations and logistics",
          requirements: "Bachelor's degree in Business or related field, 3+ years experience",
          status: "Open",
          created_at: "2025-04-03T15:33:00.000Z"
        },
        {
          id: 2,
          title: "CIVIL ENGINEER",
          department: "Cabuyao Plant - Laguna",
          description: "Design and oversee construction projects",
          requirements: "Bachelor's degree in Civil Engineering, Licensed Engineer",
          status: "Open",
          created_at: "2025-03-28T10:15:00.000Z"
        },
        {
          id: 3,
          title: "ACCOUNTING STAFF",
          department: "Cebu Office - Finance Department",
          description: "Handle financial records and transactions",
          requirements: "Bachelor's degree in Accounting, CPA preferred",
          status: "Open",
          created_at: "2025-03-25T16:50:00.000Z"
        }
      ]);
    } finally {
      setLoading(false);
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
    setIsLoggedIn(false);
    setUserRole(null);
    // Optionally redirect to home or show a message
    window.location.reload(); // Refresh the page to reset any cached data
  };

  const handleApplyClick = (job) => {
    if (!isLoggedIn) {
      navigate("/login");
    } else if (userRole === 'Applicant') {
      setSelectedJob(job);
      setShowApplicationModal(true);
    } else {
      alert("Only applicants can apply for jobs. Please log in with an applicant account.");
    }
  };

  // Handle file selection for resume
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
    } else {
      alert('Please select a PDF file for your resume.');
    }
  };

  // Submit job application
  const handleSubmitApplication = async () => {
    if (!resumeFile) {
      alert('Please select a PDF resume file.');
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('job_posting_id', selectedJob.id);
      formData.append('resume', resumeFile);

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/applications', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Application submitted successfully!');
      setShowApplicationModal(false);
      setSelectedJob(null);
      setResumeFile(null);
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response?.status === 409) {
        alert('You have already applied for this job.');
      } else {
        alert('Failed to submit application. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto" }}>
      {/* Professional Clean Navbar */}
      <nav className="navbar navbar-dark sticky-top" style={{ 
        background: "linear-gradient(45deg, #0575E6, #021B79)",
        boxShadow: '0 2px 15px rgba(0,0,0,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0.75rem 0',
        position: 'relative'
      }}>
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center justify-content-between w-100">
            {/* Mobile Toggle Button - Left Side */}
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

            {/* CCDC Brand/Logo Section - Center */}
            <div className="navbar-brand d-flex align-items-center mx-auto mx-lg-0">
              <a className="d-flex align-items-center text-decoration-none" href="/">
                <img
                  src="https://i.imgur.com/4YkkuH4.png"
                  alt="CCDC Logo"
                  style={{ 
                    width: 50, 
                    height: 'auto',
                    marginRight: '12px'
                  }}
                />
                <span className="fw-bold fs-3" style={{
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.025em',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  CCDC
                </span>
              </a>
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
                    className="btn btn-outline-light btn-sm"
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#ef4444';
                      e.target.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLoginClick}
                  className="btn btn-outline-light btn-sm"
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.color = '#0575E6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#ffffff';
                  }}
                >
                  Log In
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="d-lg-none" style={{
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
                    transition: 'background-color 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '50px'
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🏠 Home
                </a>
                <button 
                  onClick={() => {
                    scrollToJobs();
                    setMobileMenuOpen(false);
                  }}
                  className="btn text-white text-start p-3 rounded border-0 d-flex align-items-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transition: 'background-color 0.3s',
                    minHeight: '50px'
                  }}
                >
                  💼 Browse Jobs
                </button>
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
                      className="btn text-white text-start p-3 rounded border-0 d-flex align-items-center"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        transition: 'background-color 0.3s',
                        minHeight: '50px'
                      }}
                    >
                      🚪 Log Out
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      handleLoginClick();
                      setMobileMenuOpen(false);
                    }}
                    className="btn text-white text-start p-3 rounded border-0 d-flex align-items-center"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      transition: 'background-color 0.3s',
                      minHeight: '50px'
                    }}
                  >
                    🔐 Log In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Custom Styles */}
        <style jsx>{`
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
        `}</style>
      </nav>

      {/* Intro Section */}
      <section
        style={{
          minHeight: "100vh",
          backgroundColor: "#1e2a38",
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
        {/* Light Circle Background */}
        <div className="light-circle"></div>
        <div className="light-circle2"></div>

        <div style={{ maxWidth: "650px", position: "relative", zIndex: 2 }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: "800",
              marginBottom: "1rem",
              lineHeight: "1.2",
              animation: "fadeInDown 1.2s ease-out",
            }}
          >
            Welcome, Applicant
          </h1>
          <h3
            style={{
              fontWeight: "500",
              fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
              marginBottom: "0.5rem",
              animation: "fadeIn 1.5s ease-out",
            }}
          >
            Are you ready to join our team?
          </h3>
          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
              color: "#dcdcdc",
              marginBottom: "1.5rem",
              animation: "fadeIn 1.8s ease-out",
            }}
          >
            Cabuyao Concrete Development Corporation is seeking talented and
            motivated individuals to contribute to our growing success. We
            value professionalism, dedication, and a passion for excellence.
          </p>
          <p
            style={{
              fontSize: "clamp(0.9rem, 2vw, 1rem)",
              color: "#c0c0c0",
              marginBottom: "2rem",
              animation: "fadeIn 2.1s ease-out",
            }}
          >
            Review the job details below and take the first step towards
            building your career with us.
          </p>
          <button
            onClick={scrollToJobs}
            style={{
              padding: "clamp(0.7rem, 2vw, 0.9rem) clamp(1.5rem, 4vw, 2rem)",
              fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
              fontWeight: "600",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
          >
            Job Details
          </button>
        </div>

        <style>
          {`
            .light-circle, .light-circle2 {
              position: absolute;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(173, 216, 230, 0.4) 0%, transparent 70%);
              filter: blur(50px);
              animation: moveCircle 10s ease-in-out infinite alternate;
            }

            .light-circle {
              width: 400px;
              height: 400px;
              top: -100px;
              left: -150px;
            }

            .light-circle2 {
              width: 300px;
              height: 300px;
              bottom: -100px;
              right: -150px;
              animation-delay: 3s;
            }

            @keyframes moveCircle {
              0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
              100% { transform: translate(50px, 30px) scale(1.2); opacity: 0.9; }
            }

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
      <section
        id="jobs-section"
        className="d-flex align-items-center text-white"
        style={{
          background: "linear-gradient(45deg, #0575E6, #021B79)",
          minHeight: "350px",
          padding: "2rem 1rem",
        }}
      >
        <div className="container row align-items-center mx-auto">
          <div className="col-md-6 mb-4 mb-md-0">
            <h1 className="fw-bold display-5">Find your Dream Job</h1>
            <p className="lead">
              Be a part of a company that invests in your growth and
              development.
            </p>
          <button 
            className="btn btn-light text-dark fw-bold px-4 py-2 mt-2"
            onClick={scrollToJobs}
          >
            Apply Now
          </button>
          </div>
          <div className="col-md-6 text-center">
            <img
              src="https://i.imgur.com/bflYFcF.png"
              alt="Job Illustration"
              className="img-fluid rounded"
              style={{ maxWidth: "100%" }}
            />
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="container my-5">
        <div className="row g-3">
          <div className="col-md-9">
            <input
              type="text"
              className="form-control"
              placeholder="Search keyword"
            />
          </div>
          <div className="col-md-3 d-grid">
            <button className="btn btn-success">Find Job</button>
          </div>
        </div>

      </section>

      {/* Job Listing */}
      <section className="bg-light py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold">Job Listings</h3>
            <button className="btn btn-outline-success">Browse More Jobs</button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading job postings...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-5">
              <h5 className="text-muted">No job postings available</h5>
              <p className="text-muted">Check back later for new opportunities!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center bg-white rounded shadow-sm p-4 mb-3"
              >
                <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                  <img
                    src="https://i.imgur.com/4YkkuH4.png"
                    alt="Company Logo"
                    style={{ width: 70 }}
                    className="border rounded"
                  />
                  <div>
                    <h6 className="mb-1 fw-bold">{job.title}</h6>
                    <small className="text-muted d-block">📍 {job.department}</small>
                    <small className="text-muted">🕒 Full-time</small>
                    <div className="mt-2">
                      <small className="text-muted">
                        <strong>Description:</strong> {job.description?.substring(0, 100)}...
                      </small>
                    </div>
                  </div>
                </div>
                <div className="text-md-end">
                  <button 
                    className="btn btn-success mb-2"
                    onClick={() => handleApplyClick(job)}
                  >
                    Apply Now
                  </button>
                  <div>
                    <small className="text-muted">{formatDate(job.created_at)}</small>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Apply for {selectedJob?.title}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                    setResumeFile(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {selectedJob && (
                  <div className="mb-4">
                    <h6 className="fw-bold">Job Details</h6>
                    <p><strong>Department:</strong> {selectedJob.department}</p>
                    <p><strong>Description:</strong></p>
                    <p className="text-muted">{selectedJob.description}</p>
                    <p><strong>Requirements:</strong></p>
                    <p className="text-muted">{selectedJob.requirements}</p>
                  </div>
                )}
                
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
                  {resumeFile && (
                    <div className="mt-2">
                      <small className="text-success">
                        ✓ Selected: {resumeFile.name}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}