import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Button, Form, Modal, Collapse, Badge } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "bootstrap-icons/font/bootstrap-icons.css";

const JobPostings = () => {
  const [jobPosts, setJobPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentJob, setCurrentJob] = useState({
    id: null,
    title: "",
    description: "",
    requirements: "",
    department: "",
    status: "Open",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  // New loading states to prevent multiple toasts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Toast notification helpers - same as EmployeeRecords
  const showError = (message) => toast.error(message);
  const showSuccess = (message) => toast.success(message);
  const showWarning = (message) => toast.warning(message);
  const showInfo = (message) => toast.info(message);

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
        // Handle duplicate job title or conflicts
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
    setCurrentJob({ ...currentJob, [e.target.name]: e.target.value });
  };

  // Add new job
  const handleAdd = () => {
    setCurrentJob({
      id: null,
      title: "",
      description: "",
      requirements: "",
      department: "",
      status: "Open",
    });
    setIsEditing(false);
    setShowModal(true);
  };

  // Edit job
  const handleEdit = (job) => {
    setCurrentJob(job);
    setIsEditing(true);
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
    if (!currentJob.requirements.trim()) {
      showError('Job requirements are required.');
      return false;
    }
    if (!currentJob.department.trim()) {
      showError('Department is required.');
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
    
    try {
      if (isEditing) {
        await axios.put(`http://localhost:8000/api/job-postings/${currentJob.id}`, currentJob, { headers });
        setJobPosts(
          jobPosts.map((job) =>
            job.id === currentJob.id ? currentJob : job
          )
        );
        toast.dismiss(loadingToast);
        showSuccess(`Job posting "${currentJob.title}" updated successfully!`);
      } else {
        const response = await axios.post("http://localhost:8000/api/job-postings", currentJob, { headers });
        setJobPosts([...jobPosts, response.data.job_posting || response.data]);
        toast.dismiss(loadingToast);
        showSuccess(`Job posting "${currentJob.title}" added successfully!`);
      }
      setShowModal(false);
      setCurrentJob({
        id: null,
        title: "",
        description: "",
        requirements: "",
        department: "",
        status: "Open",
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
      status: "Open",
    });
  };

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    setExpandedJob(expandedJob === id ? null : id);
  };

  return (
    <div
      className="p-4 min-vh-100"
      style={{
        background: "linear-gradient(135deg, #f8f9fc 0%, #e8ecf5 100%)",
      }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary d-flex align-items-center">
          <i className="bi bi-briefcase-fill me-2"></i> Job Postings
        </h2>
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
                <Card className="shadow border-0 h-100 rounded-4">
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
                      <div>
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
                          variant="outline-primary"
                          size="sm"
                          className="me-2 rounded-circle"
                          onClick={() => handleEdit(job)}
                        >
                          <i className="bi bi-pencil"></i>
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

                    {/* Expandable content */}
                    <Collapse in={expandedJob === job.id}>
                      <div className="mt-2 mb-2">
                        <Card.Text className="text-secondary small">
                          <strong>Description:</strong> {job.description}
                        </Card.Text>
                        <Card.Text className="text-secondary small">
                          <strong>Requirements:</strong> {job.requirements}
                        </Card.Text>
                        {job.department && (
                          <Card.Text className="text-secondary small">
                            <strong>Department:</strong> {job.department}
                          </Card.Text>
                        )}
                      </div>
                    </Collapse>

                    <div className="mt-auto">
                      <Button
                        variant="link"
                        className="p-0 mt-2 text-decoration-none fw-semibold"
                        onClick={() => toggleExpand(job.id)}
                      >
                        {expandedJob === job.id ? (
                          <>
                            Show Less <i className="bi bi-chevron-up"></i>
                          </>
                        ) : (
                          <>
                            Show More <i className="bi bi-chevron-down"></i>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal for Add/Edit */}
      <Modal show={showModal} onHide={closeModal} centered>
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
              />
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
              />
            </Form.Group>
            <Form.Group>
              <Form.Label className="fw-semibold">Department *</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={currentJob.department}
                onChange={handleChange}
                placeholder="Enter department (e.g., IT, HR, Sales)"
                className="rounded-3"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              onClick={closeModal}
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


    </div>
  );
};

export default JobPostings;