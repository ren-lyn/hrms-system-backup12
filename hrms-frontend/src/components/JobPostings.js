import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Form, Modal, Badge } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAdvancedModalConfirmation } from '../hooks/useModalConfirmation';
import '../styles/ModalConfirmation.css';
import ValidationModal from './common/ValidationModal';
import useValidationModal from '../hooks/useValidationModal';
import "bootstrap-icons/font/bootstrap-icons.css";

const JobPostings = () => {
  const [jobPosts, setJobPosts] = useState([]);
  const { modalState, showSuccess, showError, showWarning, showInfo, hideModal } = useValidationModal();
  const [showModal, setShowModal] = useState(false);
  const [currentJob, setCurrentJob] = useState({
    id: null,
    title: "",
    description: "",
    requirements: "",
    department: "",
    position: "",
    status: "Open",
    salary_min: "",
    salary_max: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);
  const [requirementsCharCount, setRequirementsCharCount] = useState(0);

  // Department-Position mapping as specified by user
  const departmentPositions = {
    "HR Department": ["HR Staff", "HR Assistant", "Hr Head"],
    "Production Department": ["Foreman", "Assistant Foreman", "Production Worker", "Production Manager"],
    "Logistics Department": ["Driver", "Helper", "Maintenance Foreman", "Maintenance Assistant", "Logistics Manager"],
    "Accounting Department": ["Accounting Staff", "Accounting Assistant", "Accountant Manager"],
    "IT Department": ["System Administrator", "IT support"]
  };

  // Position-Salary mapping (monthly salary in PHP)
  const positionSalary = {
    "HR Staff": 13520,
    "HR Assistant": 15000,
    "Hr Head": 25000,
    "Foreman": 18000,
    "Assistant Foreman": 15000,
    "Production Worker": 13520,
    "Production Manager": 28000,
    "Driver": 13520,
    "Helper": 13520,
    "Maintenance Foreman": 18000,
    "Maintenance Assistant": 16000,
    "Logistics Manager": 30000,
    "Accounting Staff": 15000,
    "Accounting Assistant": 13520,
    "Accountant Manager": 30000,
    "System Administrator": 25000,
    "IT support": 15000
  };

  // New loading states to prevent multiple toasts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  
  // Duplicate job posting detection states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateJobInfo, setDuplicateJobInfo] = useState(null);

  // Modal confirmation hook
  const jobModalConfirmation = useAdvancedModalConfirmation(
    'Job Posting Form',
    () => {
      setShowModal(false);
      setCurrentJob({
        id: null,
        title: "",
        description: "",
        requirements: "",
        department: "",
        position: "",
        status: "Open",
        salary_min: "",
        salary_max: "",
      });
      setIsEditing(false);
    },
    null,
    {
      title: 'Confirm Close Job Form',
      message: 'Are you sure you want to close the job posting form? Any unsaved changes will be lost.',
      icon: '💼'
    }
  );

  // Simple close function for immediate modal closure
  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentJob({
      id: null,
      title: "",
      description: "",
      requirements: "",
      department: "",
      position: "",
      status: "Open",
    });
    setIsEditing(false);
    setDescriptionCharCount(0);
    setRequirementsCharCount(0);
  };



  // Get current Philippines time
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

  // Helper function to count characters (excluding spaces)
  const countCharacters = (text) => {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
  };

  // Helper function to validate character limit
  const validateCharacterLimit = (text, fieldName, maxChars = 300) => {
    const charCount = countCharacters(text);
    if (charCount > maxChars) {
      showError(`${fieldName} exceeds the maximum limit of ${maxChars} characters (spaces not counted). Current: ${charCount} characters.`);
      return false;
    }
    return true;
  };

  // ✅ Common error handler - same pattern as EmployeeRecords
  const handleAxiosError = (error, defaultMessage) => {
    console.error('Axios error:', error);

    if (error.response) {
      if (error.response.status === 401) {
        showError('Authentication failed. Please log in again.');
      } else if (error.response.status === 403) {
        showError('Access denied. You don\'t have permission to perform this action.');
      } else if (error.response.status === 404) {
        showWarning('Resource not found.');
      } else if (error.response.status === 409) {
        // Handle duplicate job posting detection
        if (error.response.data?.duplicate_detected) {
          setDuplicateJobInfo(error.response.data);
          setShowDuplicateModal(true);
          return; // Don't show error toast for duplicate detection
        }
        
        // Handle other conflicts
        const message = error.response.data?.message || '';
        if (message.toLowerCase().includes('title')) {
          showError('Job title already exists. Please use a different title.');
        } else {
          showError(message || 'Conflict error. Please check your input.');
        }
      } else if (error.response.status === 422) {
        const validationErrors = error.response.data.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat();
          showError(`Validation error: ${errorMessages.join(', ')}`);
        } else {
          showError('Validation failed. Please check your input.');
        }
      } else if (error.response.status >= 500) {
        showError('Server error occurred. Please try again later.');
      } else {
        showError(error.response.data?.message || defaultMessage);
      }
    } else if (error.request) {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ERR_NETWORK') {
      showError('Network error. Please check your internet connection.');
    } else if (error.code === 'ECONNABORTED') {
      showError('Request timed out. Please try again.');
    } else {
      showError(defaultMessage);
    }
  };


  // Fetch job postings from backend
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get("http://localhost:8000/api/job-postings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobPosts(response.data);

      if (response.data.length === 0) {
        toast.info('No job postings found.', { toastId: 'no-job-postings' });
      }
    } catch (error) {
      handleAxiosError(error, 'Failed to load job postings. Please try again.');
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'department') {
      // Reset position and salary when department changes
      setCurrentJob({ ...currentJob, department: value, position: "", salary_min: "", salary_max: "" });
    } else if (name === 'position') {
      // Auto-populate salary when position is selected
      const salary = positionSalary[value] || null;
      if (salary) {
        setCurrentJob({ ...currentJob, position: value, salary_min: salary, salary_max: salary });
      } else {
        setCurrentJob({ ...currentJob, position: value });
      }
    } else {
      setCurrentJob({ ...currentJob, [name]: value });
      
      // Update character counts for description and requirements
      if (name === 'description') {
        setDescriptionCharCount(countCharacters(value));
      } else if (name === 'requirements') {
        setRequirementsCharCount(countCharacters(value));
      }
    }
  };

  // Add new job
  const handleAdd = () => {
    setCurrentJob({
      id: null,
      title: "",
      description: "",
      requirements: "",
      department: "",
      position: "",
      status: "Open",
      salary_min: "",
      salary_max: "",
    });
    setIsEditing(false);
    setDescriptionCharCount(0);
    setRequirementsCharCount(0);
    setShowModal(true);
  };

  // Edit job
  const handleEdit = (job) => {
    setCurrentJob(job);
    setIsEditing(true);
    setDescriptionCharCount(countCharacters(job.description));
    setRequirementsCharCount(countCharacters(job.requirements));
    setShowModal(true);
    showInfo(`Editing job posting: ${job.title}`);
  };

  // Delete job (API + UI)
  const handleDelete = async (id, jobTitle = 'this job posting') => {
    if (window.confirm(`Are you sure you want to delete "${jobTitle}"?`)) {
      setDeletingId(id);
      const loadingToast = toast.loading('Deleting job posting...');
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:8000/api/job-postings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.dismiss(loadingToast);
        setJobPosts(jobPosts.filter((job) => job.id !== id));
        showSuccess(`"${jobTitle}" deleted successfully!`);
      } catch (error) {
        toast.dismiss(loadingToast);
        handleAxiosError(error, 'Failed to delete job posting. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Toggle job status (Open/Closed)
  const handleToggleStatus = async (jobId) => {
    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:8000/api/job-postings/${jobId}/toggle`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchJobs(); // Refresh job list
  };

  // Form validation - same pattern as EmployeeRecords
  const validateForm = () => {
    if (!currentJob.title.trim()) {
      showError('Job title is required.');
      return false;
    }
    if (!currentJob.description.trim()) {
      showError('Job description is required.');
      return false;
    }
    if (!validateCharacterLimit(currentJob.description, 'Job description', 300)) {
      return false;
    }
    if (!currentJob.requirements.trim()) {
      showError('Job requirements are required.');
      return false;
    }
    if (!validateCharacterLimit(currentJob.requirements, 'Job requirements', 300)) {
      return false;
    }
    if (!currentJob.department.trim()) {
      showError('Department is required.');
      return false;
    }
    if (!currentJob.position.trim()) {
      showError('Position is required.');
      return false;
    }
    return true;
  };

  // Save job (add or edit)
  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(isEditing ? 'Updating job posting...' : 'Adding job posting...');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    
    // Add Philippines timezone timestamp for new job postings
    const now = new Date();
    const philippinesTime = now.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const jobData = {
      ...currentJob,
      // Ensure salary values are sent as numbers
      salary_min: currentJob.salary_min ? Number(currentJob.salary_min) : null,
      salary_max: currentJob.salary_max ? Number(currentJob.salary_max) : null,
      created_at: now.toISOString(), // Current time in UTC
      ph_timezone: 'Asia/Manila',
      ph_created_at: philippinesTime,
      // Add additional timestamp fields for backend processing
      timestamp_utc: now.toISOString(),
      timestamp_ph: now.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
    
    try {
      if (isEditing) {
        // Ensure salary values are sent as numbers for edit
        const updateData = {
          ...currentJob,
          salary_min: currentJob.salary_min ? Number(currentJob.salary_min) : null,
          salary_max: currentJob.salary_max ? Number(currentJob.salary_max) : null,
        };
        const response = await axios.put(`http://localhost:8000/api/job-postings/${currentJob.id}`, updateData, { headers });
        // Refresh the job list to get the updated data from the backend
        fetchJobs();
        toast.dismiss(loadingToast);
        showSuccess(`Job posting "${currentJob.title}" updated successfully!`);
      } else {
        const response = await axios.post("http://localhost:8000/api/job-postings", jobData, { headers });
        setJobPosts([...jobPosts, response.data.job_posting || response.data]);
        toast.dismiss(loadingToast);
        showSuccess(`Job posting "${currentJob.title}" added successfully at ${philippinesTime}!`);
      }
      setShowModal(false);
      setCurrentJob({
        id: null,
        title: "",
        description: "",
        requirements: "",
        department: "",
        position: "",
        status: "Open",
        salary_min: "",
        salary_max: "",
      });
      setIsEditing(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      handleAxiosError(error, isEditing ? 'Failed to update job posting. Please try again.' : 'Failed to add job posting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentJob({
      id: null,
      title: "",
      description: "",
      requirements: "",
      department: "",
      position: "",
      status: "Open",
      salary_min: "",
      salary_max: "",
    });
  };

  // Handle job details view
  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  // Close details modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedJob(null);
  };

  // Handle updating existing job posting
  const handleUpdateExisting = () => {
    setShowDuplicateModal(false);
    const existingJob = duplicateJobInfo.existing_job;
    // Auto-set salary if position has a defined salary
    const positionSal = existingJob.position && positionSalary[existingJob.position] ? positionSalary[existingJob.position] : (existingJob.salary_min || "");
    setCurrentJob({
      id: existingJob.id,
      title: existingJob.title,
      description: currentJob.description,
      requirements: currentJob.requirements,
      department: existingJob.department,
      position: existingJob.position,
      status: "Open",
      salary_min: positionSal,
      salary_max: positionSal,
    });
    setIsEditing(true);
    setDuplicateJobInfo(null);
    showInfo('Editing the existing job posting. You can update the details as needed.');
  };

  // Handle closing duplicate modal
  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateJobInfo(null);
  };

  return (
    <div
      className="p-4 min-vh-100"
      style={{
        background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)",
      }}
    >

      {/* Validation Modal */}
      <ValidationModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
      />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-primary d-flex align-items-center">
            <i className="bi bi-briefcase-fill me-2"></i> Job Postings
          </h2>
          <small className="text-muted">
            <i className="bi bi-clock me-1"></i>
            Current Philippines Time: {getCurrentPhilippinesTime()}
          </small>
        </div>
        <Button
          variant="primary"
          className="shadow-sm rounded-pill px-4"
          onClick={handleAdd}
        >
          <i className="bi bi-plus-circle me-2"></i> Add Job
        </Button>
      </div>

      {/* Job Posts */}
      {jobPosts.length === 0 ? (
        <motion.div
          className="text-center text-muted mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <i className="bi bi-clipboard2-x display-1 text-secondary mb-3"></i>
          <p className="fs-4 fw-semibold">No job postings available</p>
          <p className="small fst-italic">
            Click <strong>Add Job</strong> to create your first posting.
          </p>
        </motion.div>
      ) : (
        <div className="row">
          <AnimatePresence>
            {jobPosts.map((job) => (
              <motion.div
                key={job.id}
                className="col-md-6 col-lg-4 mb-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="shadow border-0 h-100 rounded-4" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewDetails(job)}
                >
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <Card.Title className="fw-bold text-dark">
                          {job.title}
                        </Card.Title>
                        <Badge
                          bg={job.status === "Open" ? "success" : "danger"}
                          className="rounded-pill px-3 py-1"
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="me-2 rounded-circle"
                          onClick={() => handleToggleStatus(job.id)}
                          title="Toggle Open/Close"
                          disabled={togglingId === job.id}
                        >
                          <i
                            className={
                              job.status === "Open"
                                ? "bi bi-toggle-on"
                                : "bi bi-toggle-off"
                            }
                          ></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-circle"
                          onClick={() => handleDelete(job.id, job.title)}
                          disabled={deletingId === job.id}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </div>

                    {/* Brief preview */}
                    <div className="mt-2 mb-2">
                      <Card.Text className="text-secondary small">
                        <strong>Description:</strong> {job.description?.substring(0, 100)}...
                      </Card.Text>
                      {job.department && (
                        <Card.Text className="text-secondary small">
                          <strong>Department:</strong> {job.department}
                        </Card.Text>
                      )}
                      <Card.Text className="text-secondary small">
                        <strong>Posted:</strong> {job.ph_created_at || new Date(job.created_at).toLocaleString('en-PH', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Card.Text>
                    </div>

                    <div className="mt-auto">
                      <small className="text-primary fw-semibold">
                        <i className="bi bi-eye me-1"></i>
                        Click to view full details
                      </small>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal for Add/Edit */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #0d6efd, #4e9bff)",
            color: "white",
          }}
        >
          <Modal.Title className="fw-bold">
            {isEditing ? "Edit Job Posting" : "Add Job Posting"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Job Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={currentJob.title}
                onChange={handleChange}
                placeholder="Enter job title"
                className="rounded-3"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Description *</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                rows={3}
                value={currentJob.description}
                onChange={handleChange}
                placeholder="Enter job description"
                className="rounded-3"
                required
                maxLength={300}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <Form.Text className={`text-muted ${descriptionCharCount > 300 ? 'text-danger' : descriptionCharCount > 250 ? 'text-warning' : ''}`}>
                  {descriptionCharCount} / 300 characters (spaces not counted)
                </Form.Text>
                {descriptionCharCount > 300 && (
                  <small className="text-danger fw-semibold">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Exceeds character limit
                  </small>
                )}
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Requirements *</Form.Label>
              <Form.Control
                as="textarea"
                name="requirements"
                rows={2}
                value={currentJob.requirements}
                onChange={handleChange}
                placeholder="Enter job requirements"
                className="rounded-3"
                required
                maxLength={300}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <Form.Text className={`text-muted ${requirementsCharCount > 300 ? 'text-danger' : requirementsCharCount > 250 ? 'text-warning' : ''}`}>
                  {requirementsCharCount} / 300 characters (spaces not counted)
                </Form.Text>
                {requirementsCharCount > 300 && (
                  <small className="text-danger fw-semibold">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Exceeds character limit
                  </small>
                )}
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Department *</Form.Label>
              <Form.Select
                name="department"
                value={currentJob.department}
                onChange={handleChange}
                className="rounded-3"
                required
              >
                <option value="">Select Department</option>
                <option value="HR Department">HR Department</option>
                <option value="Production Department">Production Department</option>
                <option value="Logistics Department">Logistics Department</option>
                <option value="Accounting Department">Accounting Department</option>
                <option value="IT Department">IT Department</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label className="fw-semibold">Position *</Form.Label>
              <Form.Select
                name="position"
                value={currentJob.position}
                onChange={handleChange}
                className="rounded-3"
                required
                disabled={!currentJob.department}
              >
                <option value="">Select Position</option>
                {currentJob.department && departmentPositions[currentJob.department] && 
                  departmentPositions[currentJob.department].map((position, index) => (
                    <option key={index} value={position}>{position}</option>
                  ))
                }
              </Form.Select>
              {!currentJob.department && (
                <Form.Text className="text-muted">
                  Please select a department first to view available positions.
                </Form.Text>
              )}
              {currentJob.position && positionSalary[currentJob.position] && (
                <Form.Text className="text-success mt-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Salary automatically set: ₱{Number(positionSalary[currentJob.position]).toLocaleString()} per month
                </Form.Text>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="rounded-pill px-4"
              type="submit"
              disabled={isSubmitting}
            >
              {isEditing ? (
                <>
                  <i className="bi bi-check-circle me-1"></i> Save Changes
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-1"></i> Add Job
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Duplicate Job Posting Detection Modal */}
      <Modal show={showDuplicateModal} onHide={handleCloseDuplicateModal} centered size="lg">
        <Modal.Header closeButton style={{
          background: "linear-gradient(135deg, #dc3545, #c82333)",
          color: "white",
        }}>
          <Modal.Title className="fw-bold">
            <i className="bi bi-x-circle me-2"></i>
            Duplicate Job Posting Not Allowed
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {duplicateJobInfo && (
            <>
              <div className="alert alert-danger border-0" style={{ backgroundColor: '#f8d7da' }}>
                <h6 className="fw-bold text-danger mb-2">
                  <i className="bi bi-x-circle me-2"></i>
                  Cannot Create Duplicate Job Posting
                </h6>
                <p className="mb-0 text-danger">
                  {duplicateJobInfo.message}
                </p>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="card border-primary">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Existing Job Posting</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Title:</strong> {duplicateJobInfo.existing_job.title}</p>
                      <p><strong>Department:</strong> {duplicateJobInfo.existing_job.department}</p>
                      <p><strong>Position:</strong> {duplicateJobInfo.existing_job.position}</p>
                      <p><strong>Salary Range:</strong> ₱{Number(duplicateJobInfo.existing_job.salary_range.min).toLocaleString()} - ₱{Number(duplicateJobInfo.existing_job.salary_range.max).toLocaleString()}</p>
                      <p className="mb-0"><strong>Posted:</strong> {new Date(duplicateJobInfo.existing_job.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-warning">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">Attempted New Posting</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Title:</strong> {currentJob.title}</p>
                      <p><strong>Department:</strong> {currentJob.department}</p>
                      <p><strong>Position:</strong> {currentJob.position}</p>
                      <p><strong>Description:</strong> {currentJob.description?.substring(0, 100)}...</p>
                      <p className="mb-0"><strong>Requirements:</strong> {currentJob.requirements?.substring(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <div className="alert alert-info border-0">
                  <p className="mb-0">
                    <strong>Suggestion:</strong> {duplicateJobInfo.suggestion}
                  </p>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex gap-3 w-100">
            <Button
              variant="outline-secondary"
              onClick={handleCloseDuplicateModal}
              className="flex-fill"
            >
              <i className="bi bi-x-lg me-1"></i>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateExisting}
              className="flex-fill"
            >
              <i className="bi bi-pencil-square me-1"></i>
              Update Existing Post
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Job Details Modal */}
      <Modal show={showDetailsModal} onHide={handleCloseDetailsModal} centered size="lg" scrollable>
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #28a745, #20c997)",
            color: "white",
          }}
        >
          <Modal.Title className="fw-bold">
            <i className="bi bi-briefcase me-2"></i>
            Job Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedJob && (
            <div className="p-3">
              {/* Job Title and Status */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-dark mb-0">{selectedJob.title}</h4>
                <Badge
                  bg={selectedJob.status === "Open" ? "success" : "danger"}
                  className="rounded-pill px-3 py-2"
                  style={{ fontSize: '0.9rem' }}
                >
                  {selectedJob.status}
                </Badge>
              </div>

              {/* Job Information Grid */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="bg-light rounded-3 p-3 h-100">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-building me-2"></i>
                      Department Information
                    </h6>
                    {selectedJob.department && (
                      <p className="mb-2">
                        <strong>Department:</strong> {selectedJob.department}
                      </p>
                    )}
                    {selectedJob.position && (
                      <p className="mb-2">
                        <strong>Position:</strong> {selectedJob.position}
                      </p>
                    )}
                    <p className="mb-0">
                      <strong>Employment Type:</strong> Full-time
                    </p>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="bg-light rounded-3 p-3 h-100">
                    <h6 className="fw-bold text-success mb-3">
                      <i className="bi bi-currency-dollar me-2"></i>
                      Compensation
                    </h6>
                    {selectedJob.salary_min && selectedJob.salary_max ? (
                      <>
                        <p className="mb-2">
                          <strong>Salary Range:</strong>
                        </p>
                        <p className="mb-2 text-success fw-semibold fs-5">
                          ₱{Number(selectedJob.salary_min).toLocaleString()} – ₱{Number(selectedJob.salary_max).toLocaleString()}
                        </p>
                        {selectedJob.salary_notes && (
                          <p className="mb-0 text-muted small">
                            <em>{selectedJob.salary_notes}</em>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mb-0 text-muted">
                        Salary to be discussed during interview
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-3 pb-2 border-bottom border-primary border-opacity-25">
                  <i className="bi bi-file-text me-2"></i>
                  Job Description
                </h6>
                <div className="bg-white border rounded-3 p-3" style={{ minHeight: 'auto', maxHeight: 'none' }}>
                  <p className="mb-0 lh-lg" style={{ 
                    whiteSpace: 'pre-wrap', 
                    color: '#495057',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto'
                  }}>
                    {selectedJob.description}
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-3 pb-2 border-bottom border-success border-opacity-25">
                  <i className="bi bi-list-check me-2"></i>
                  Requirements & Qualifications
                </h6>
                <div className="bg-white border rounded-3 p-3" style={{ minHeight: 'auto', maxHeight: 'none' }}>
                  <p className="mb-0 lh-lg" style={{ 
                    whiteSpace: 'pre-wrap', 
                    color: '#495057',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto'
                  }}>
                    {selectedJob.requirements}
                  </p>
                </div>
              </div>

              {/* Posted Date */}
              <div className="bg-light rounded-3 p-3">
                <h6 className="fw-bold text-info mb-2">
                  <i className="bi bi-calendar-event me-2"></i>
                  Posting Information
                </h6>
                <p className="mb-0">
                  <strong>Posted:</strong> {selectedJob.ph_created_at || new Date(selectedJob.created_at).toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedJob && (
            <Button
              variant="primary"
              onClick={() => {
                handleCloseDetailsModal();
                handleEdit(selectedJob);
              }}
              className="rounded-pill px-4"
            >
              <i className="bi bi-pencil me-1"></i>
              Edit Job
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-right" />
    </div>
  );
};

export default JobPostings;