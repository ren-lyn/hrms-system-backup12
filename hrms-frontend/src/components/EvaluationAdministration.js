import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, Button, Form, Modal, Collapse, Badge, Row, Col, Alert } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ValidationModal from './common/ValidationModal';
import useValidationModal from '../hooks/useValidationModal';
import "bootstrap-icons/font/bootstrap-icons.css";
import './EvaluationAdministration.css';

const EvaluationAdministration = () => {
  const { modalState, showSuccess, showError, showWarning, showInfo, hideModal } = useValidationModal();
  const [evaluationForms, setEvaluationForms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentForm, setCurrentForm] = useState({
    id: null,
    title: "",
    description: "",
    status: "Active",
    questions: [
      {
        id: null,
        category: "",
        question_text: "",
        description: "",
      }
    ],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [expandedForm, setExpandedForm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasShownEmptyMessage, setHasShownEmptyMessage] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const hasFetchedRef = useRef(false);

  // Predefined categories based on the form design
  const categories = [
    "Punctuality & Attendance",
    "Attitude towards co-workers", 
    "Quality of work",
    "Initiative",
    "Teamwork",
    "Trustworthy and Reliable"
  ];


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
      } else if (error.response.status === 409) {
        const message = error.response.data?.message || '';
        if (message.toLowerCase().includes('title')) {
          showError('Evaluation form title already exists. Please use a different title.');
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

  // Fetch evaluation forms from backend
  useEffect(() => {
    console.log('useEffect running, hasFetchedRef.current:', hasFetchedRef.current);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      console.log('Calling fetchEvaluationForms');
      fetchEvaluationForms();
    } else {
      console.log('Skipping fetchEvaluationForms, already fetched');
    }
  }, []);

  const fetchEvaluationForms = async () => {
    try {
      console.log('fetchEvaluationForms called');
      const response = await axios.get("http://localhost:8000/api/evaluation-administration");
      console.log('Response data length:', response.data.length);
      console.log('hasShownEmptyMessage:', hasShownEmptyMessage);
      setEvaluationForms(response.data);

      if (response.data.length === 0 && !hasShownEmptyMessage) {
        console.log('Showing empty message');
        showInfo('No evaluation forms found.');
        setHasShownEmptyMessage(true);
      } else if (response.data.length > 0) {
        console.log('Resetting hasShownEmptyMessage');
        setHasShownEmptyMessage(false); // Reset when forms are available
      } else {
        console.log('Not showing message - either already shown or has forms');
      }
    } catch (error) {
      handleAxiosError(error, 'Failed to load evaluation forms. Please try again.');
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    setCurrentForm({ ...currentForm, [e.target.name]: e.target.value });
  };

  // Handle question input changes
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...currentForm.questions];
    updatedQuestions[index][field] = value;
    setCurrentForm({ ...currentForm, questions: updatedQuestions });
  };

  // Add new question
  const addQuestion = () => {
    setCurrentForm({
      ...currentForm,
      questions: [
        ...currentForm.questions,
        {
          id: null,
          category: "",
          question_text: "",
          description: "",
        }
      ]
    });
  };

  // Remove question
  const removeQuestion = (index) => {
    if (currentForm.questions.length > 1) {
      const updatedQuestions = currentForm.questions.filter((_, i) => i !== index);
      setCurrentForm({ ...currentForm, questions: updatedQuestions });
    } else {
      showWarning('At least one question is required.');
    }
  };

  // Add new evaluation form
  const handleAdd = () => {
    setCurrentForm({
      id: null,
      title: "",
      description: "",
      status: "Active",
      questions: [
        {
          id: null,
          category: "",
          question_text: "",
          description: "",
        }
      ],
    });
    setIsEditing(false);
    setShowModal(true);
  };

  // Edit evaluation form
  const handleEdit = (form) => {
    setCurrentForm({
      id: form.id,
      title: form.title,
      description: form.description || "",
      status: form.status,
      questions: form.questions.length > 0 ? form.questions : [
        {
          id: null,
          category: "",
          question_text: "",
          description: "",
        }
      ],
    });
    setIsEditing(true);
    setShowModal(true);
    showInfo(`Editing evaluation form: ${form.title}`);
  };

  // Delete evaluation form
  const handleDelete = async (id, formTitle = 'this evaluation form', usedCount = 0) => {
    if (isDeleting) return; // Prevent multiple clicks
    const baseMessage = usedCount > 0 
      ? `"${formTitle}" has ${usedCount} linked evaluation${usedCount > 1 ? 's' : ''}. Deleting the form will NOT delete past results, but you will no longer be able to use or edit this form.\n\nDo you want to continue?`
      : `Are you sure you want to delete "${formTitle}"?`;
    if (window.confirm(baseMessage)) {
      setIsDeleting(true);
      const loadingToast = toast.loading('Deleting evaluation form...');
      try {
        await axios.delete(`http://localhost:8000/api/evaluation-administration/${id}`);

        toast.dismiss(loadingToast);
        setEvaluationForms(evaluationForms.filter((form) => form.id !== id));
        showSuccess(`"${formTitle}" deleted successfully!`);
      } catch (error) {
        toast.dismiss(loadingToast);
        handleAxiosError(error, 'Failed to delete evaluation form. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Toggle form status (Active/Inactive)
  const handleToggleStatus = async (id) => {
    if (isToggling) return; // Prevent multiple clicks
    const form = evaluationForms.find((f) => f.id === id);
    const updatedStatus = form.status === "Active" ? "Inactive" : "Active";

    setIsToggling(true);
    const loadingToast = toast.loading(`${updatedStatus === "Active" ? "Activating" : "Deactivating"} evaluation form...`);
    try {
      await axios.put(`http://localhost:8000/api/evaluation-administration/${id}/toggle-status`);

      toast.dismiss(loadingToast);
      // Update local state: if we activated this form, set all others to Inactive
      setEvaluationForms(
        evaluationForms.map((f) => {
          if (f.id === id) return { ...f, status: updatedStatus };
          if (updatedStatus === "Active" && f.status === "Active") {
            return { ...f, status: "Inactive" };
          }
          return f;
        })
      );
      showSuccess(`"${form.title}" ${updatedStatus.toLowerCase()} successfully!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      handleAxiosError(error, 'Failed to update form status. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  // Duplicate/Reuse evaluation form
  const handleDuplicate = async (id) => {
    if (isDuplicating) return; // Prevent multiple clicks
    const form = evaluationForms.find((f) => f.id === id);
    setIsDuplicating(true);
    const loadingToast = toast.loading('Duplicating evaluation form...');

    try {
      const response = await axios.post(`http://localhost:8000/api/evaluation-administration/${id}/duplicate`);

      toast.dismiss(loadingToast);
      setEvaluationForms([response.data.data, ...evaluationForms]);
      showSuccess(`"${form.title}" duplicated successfully!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      handleAxiosError(error, 'Failed to duplicate evaluation form. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!currentForm.title.trim()) {
      showError('Evaluation form title is required.');
      return false;
    }
    
    for (let i = 0; i < currentForm.questions.length; i++) {
      const question = currentForm.questions[i];
      if (!question.category.trim()) {
        showError(`Category is required for question ${i + 1}.`);
        return false;
      }
      if (!question.question_text.trim()) {
        showError(`Question text is required for question ${i + 1}.`);
        return false;
      }
    }
    return true;
  };

  // Save evaluation form
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const loadingToast = toast.loading(isEditing ? 'Updating evaluation form...' : 'Creating evaluation form...');

    try {
      if (isEditing) {
        await axios.put(`http://localhost:8000/api/evaluation-administration/${currentForm.id}`, currentForm);
        setEvaluationForms(
          evaluationForms.map((form) =>
            form.id === currentForm.id ? { ...form, ...currentForm } : form
          )
        );
        toast.dismiss(loadingToast);
        showSuccess(`Evaluation form "${currentForm.title}" updated successfully!`);
      } else {
        const response = await axios.post("http://localhost:8000/api/evaluation-administration", currentForm);
        setEvaluationForms([response.data.data, ...evaluationForms]);
        toast.dismiss(loadingToast);
        showSuccess(`Evaluation form "${currentForm.title}" created successfully!`);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.dismiss(loadingToast);
      handleAxiosError(error, isEditing ? 'Failed to update evaluation form. Please try again.' : 'Failed to create evaluation form. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setCurrentForm({
      id: null,
      title: "",
      description: "",
      status: "Active",
      questions: [
        {
          id: null,
          category: "",
          question_text: "",
          description: "",
        }
      ],
    });
    setIsEditing(false);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    setExpandedForm(expandedForm === id ? null : id);
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
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2 className="fw-bold text-primary d-flex align-items-center mb-2 mb-md-0">
          <i className="bi bi-clipboard2-check-fill me-2"></i> Evaluation Administration
        </h2>
        <div className="d-flex align-items-center gap-2">
          <Form.Select size="sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-pill" style={{ width: 180 }}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Form.Select>
          <Button
            variant="primary"
            className="shadow-sm rounded-pill btn-create-eval"
            onClick={handleAdd}
            title="Create Evaluation Form"
          >
            <i className="bi bi-plus-circle me-2"></i>
            <span>Create Evaluation Form</span>
          </Button>
        </div>
      </div>

      {/* Evaluation Forms */}
      {evaluationForms.length === 0 ? (
        <motion.div
          className="text-center text-muted mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <i className="bi bi-clipboard2-x display-1 text-secondary mb-3"></i>
          <p className="fs-4 fw-semibold">No evaluation forms available</p>
          <p className="small fst-italic">
            Click <strong>Create Evaluation Form</strong> to get started.
          </p>
        </motion.div>
      ) : (
        <div className="row">
          <AnimatePresence>
            {evaluationForms
              .filter((form) => filterStatus === 'All' || form.status === filterStatus)
              .sort((a, b) => (a.status === 'Active' ? -1 : 1) - (b.status === 'Active' ? -1 : 1))
              .map((form) => (
              <motion.div
                key={form.id}
                className="col-md-6 col-lg-4 mb-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow border-0 h-100 rounded-4" style={{ border: form.status === 'Active' ? '2px solid #22c55e' : undefined, boxShadow: form.status === 'Active' ? '0 0 0 2px #22c55e33 inset, 0 2px 4px rgba(0,0,0,0.1)' : undefined }}>
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <Card.Title className="fw-bold text-dark">
                          {form.title}
                        </Card.Title>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Badge
                            bg={form.status === "Active" ? "success" : "secondary"}
                            className="rounded-pill px-3 py-1"
                          >
                            {form.status}
                          </Badge>
                          <Badge bg="info" className="rounded-pill px-2">
                            {form.questions_count} Questions
                          </Badge>
                          <Badge bg="warning" className="rounded-pill px-2">
                            {form.evaluations_count} Uses
                          </Badge>
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-1">
                        <div>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-1 rounded-circle"
                            onClick={() => handleToggleStatus(form.id)}
                            title={`${form.status === "Active" ? "Deactivate" : "Activate"} Form`}
                            disabled={isToggling}
                          >
                            <i
                              className={
                                form.status === "Active"
                                  ? "bi bi-toggle-on"
                                  : "bi bi-toggle-off"
                              }
                            ></i>
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-1 rounded-circle"
                            onClick={() => handleDuplicate(form.id)}
                            title="Reuse Form"
                            disabled={isDuplicating}
                          >
                            <i className="bi bi-files"></i>
                          </Button>
                        </div>
                        <div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1 rounded-circle"
                            onClick={() => handleEdit(form)}
                            title="Edit Form"
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-circle"
                            onClick={() => handleDelete(form.id, form.title, form.evaluations_count || 0)}
                            title="Delete Form"
                            disabled={isDeleting}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Form description */}
                    {form.description && (
                      <Card.Text className="text-secondary small mb-2">
                        {form.description}
                      </Card.Text>
                    )}

                    {/* Expandable questions */}
                    <Collapse in={expandedForm === form.id}>
                      <div className="mt-2 mb-2">
                        <strong className="text-primary">Questions:</strong>
                        {form.questions?.map((question, index) => (
                          <div key={question.id} className="border-start border-3 border-primary ps-3 mt-2">
                            <div className="small">
                              <Badge bg="outline-primary" className="mb-1">{question.category}</Badge>
                              <p className="mb-1 fw-semibold">{question.question_text}</p>
                              {question.description && (
                                <p className="text-muted small mb-0">{question.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Collapse>

                    <div className="mt-auto">
                      <Button
                        variant="link"
                        className="p-0 mt-2 text-decoration-none fw-semibold"
                        onClick={() => toggleExpand(form.id)}
                      >
                        {expandedForm === form.id ? (
                          <>
                            Show Less <i className="bi bi-chevron-up"></i>
                          </>
                        ) : (
                          <>
                            View Questions <i className="bi bi-chevron-down"></i>
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

      {/* Modal for Add/Edit Evaluation Form */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #0d6efd, #4e9bff)",
            color: "white",
          }}
        >
          <Modal.Title className="fw-bold">
            {isEditing ? "Edit Evaluation Form" : "Create Evaluation Form"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Form Details */}
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Form Title *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={currentForm.title}
                    onChange={handleFormChange}
                    placeholder="Enter evaluation form title"
                    className="rounded-3"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={currentForm.status}
                    onChange={handleFormChange}
                    className="rounded-3"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                rows={2}
                value={currentForm.description}
                onChange={handleFormChange}
                placeholder="Enter form description (optional)"
                className="rounded-3"
              />
            </Form.Group>

            {/* Questions Section */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-primary mb-0">
                  <i className="bi bi-question-circle me-2"></i>Evaluation Questions
                </h5>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="rounded-pill"
                  onClick={addQuestion}
                >
                  <i className="bi bi-plus me-1"></i> Add Question
                </Button>
              </div>

              {currentForm.questions.map((question, index) => (
                <Card key={index} className="mb-3 border-1">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-semibold text-secondary mb-0">
                        Question {index + 1}
                      </h6>
                      {currentForm.questions.length > 1 && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-circle"
                          onClick={() => removeQuestion(index)}
                        >
                          <i className="bi bi-x"></i>
                        </Button>
                      )}
                    </div>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Category *</Form.Label>
                          <Form.Select
                            value={question.category}
                            onChange={(e) => handleQuestionChange(index, 'category', e.target.value)}
                            className="rounded-3"
                            required
                          >
                            <option value="">Select Category</option>
                            {categories.map((category, catIndex) => (
                              <option key={catIndex} value={category}>
                                {category}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Question Text *</Form.Label>
                          <Form.Control
                            type="text"
                            value={question.question_text}
                            onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                            placeholder="Enter the evaluation question"
                            className="rounded-3"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group>
                      <Form.Label className="fw-semibold">Description/Details</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={question.description}
                        onChange={(e) => handleQuestionChange(index, 'description', e.target.value)}
                        placeholder="Additional details about what this question evaluates (optional)"
                        className="rounded-3"
                      />
                    </Form.Group>

                    <Alert variant="info" className="mt-3 mb-0 small">
                      <i className="bi bi-info-circle me-1"></i>
                      This question will be rated on a scale of 1-10 (10 being the highest). 
                      Managers will provide comments for ratings below 7 (weaknesses) and above 8 (strengths).
                    </Alert>
                  </Card.Body>
                </Card>
              ))}
            </div>
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
            >
              {isEditing ? (
                <>
                  <i className="bi bi-check-circle me-1"></i> Save Changes
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-1"></i> Create Form
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Toast Container */}
      <ToastContainer 
        position="top-center" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default EvaluationAdministration;