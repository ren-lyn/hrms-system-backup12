import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Badge, 
  Modal, 
  Form, 
  Row, 
  Col, 
  InputGroup,
  Alert,
  Spinner,
  Dropdown,
  Pagination
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getSeverityColor,
  formatDateTime
} from '../../../api/disciplinary';

const DisciplinaryCategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity_level: 'minor',
    suggested_actions: [],
    is_active: true
  });

  const [formErrors, setFormErrors] = useState({});

  const suggestedActionOptions = [
    'verbal_warning',
    'written_warning', 
    'final_warning',
    'suspension',
    'demotion',
    'termination',
    'training',
    'counseling',
    'coaching',
    'performance_improvement_plan',
    'safety_training',
    'mandatory_training',
    'mandatory_counseling',
    'legal_action'
  ];

  useEffect(() => {
    loadCategories();
  }, [currentPage, searchTerm, statusFilter, severityFilter]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Build params object, excluding 'all' values
      const params = {
        page: currentPage,
        per_page: 100 // Increased to show more categories at once
      };
      
      // Only add filters if they're not 'all'
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (severityFilter && severityFilter !== 'all') {
        params.severity = severityFilter;
      }
      
      console.log('Frontend: Loading categories with filters:', {
        statusFilter,
        severityFilter,
        searchTerm,
        actualParams: params
      });

      const response = await getCategories(params);
      
      console.log('Frontend: Response received:', {
        dataStructure: {
          hasData: !!response.data,
          hasDataData: !!response.data.data,
          hasDataDataData: !!response.data.data?.data,
          dataType: typeof response.data.data,
          dataDataType: Array.isArray(response.data.data?.data) ? 'array' : typeof response.data.data?.data
        },
        categoriesCount: response.data.data?.data?.length || response.data.data?.length || 0,
        totalPages: response.data.data?.last_page || 1,
        filters: {
          statusFilter,
          severityFilter,
          searchTerm,
          actualParamsSent: params
        },
        rawResponse: response.data
      });
      
      // Extract categories from response - handle different response structures
      const responseData = response.data.data;
      const categoriesArray = responseData.data || responseData || [];
      const totalPagesCount = responseData.last_page || 1;
      
      console.log('Frontend: Extracted data:', {
        categoriesArrayType: Array.isArray(categoriesArray) ? 'array' : typeof categoriesArray,
        categoriesCount: Array.isArray(categoriesArray) ? categoriesArray.length : 0,
        totalPages: totalPagesCount
      });
      
      setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
      setTotalPages(totalPagesCount);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (category = null) => {
    setEditingCategory(category);
    setFormData(category ? {
      name: category.name,
      description: category.description || '',
      severity_level: category.severity_level,
      suggested_actions: category.suggested_actions || [],
      is_active: category.is_active
    } : {
      name: '',
      description: '',
      severity_level: 'minor',
      suggested_actions: [],
      is_active: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      severity_level: 'minor',
      suggested_actions: [],
      is_active: true
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSuggestedActionsChange = (action) => {
    setFormData(prev => ({
      ...prev,
      suggested_actions: prev.suggested_actions.includes(action)
        ? prev.suggested_actions.filter(a => a !== action)
        : [...prev.suggested_actions, action]
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    }
    
    if (!formData.severity_level) {
      errors.severity_level = 'Severity level is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      console.log('Submitting category:', formData);
      
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(formData);
        toast.success('Category created successfully');
      }
      
      handleCloseModal();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      
      // Handle specific error types
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        toast.error('Network error: Please check if the backend server is running');
      } else if (error.response?.status === 401) {
        toast.error('Authentication error: Please login again');
      } else if (error.response?.status === 403) {
        toast.error('Permission denied: You need HR Assistant role');
      } else if (error.response?.status === 422) {
        // Validation errors
        if (error.response.data?.errors) {
          setFormErrors(error.response.data.errors);
          toast.error('Please check the form for errors');
        } else {
          toast.error('Validation error: Please check your input');
        }
      } else {
        const message = error.response?.data?.message || error.message || 'Unknown error occurred';
        toast.error(`Failed to save category: ${message}`);
      }
    }
  };

  const handleToggleStatus = async (categoryId) => {
    try {
      await toggleCategoryStatus(categoryId);
      toast.success('Category status updated successfully');
      loadCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Failed to update category status');
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await deleteCategory(categoryId);
        toast.success('Category deleted successfully');
        loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        const message = error.response?.data?.message || 'Failed to delete category';
        toast.error(message);
      }
    }
  };

  const formatActionName = (action) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getActionBadgeClass = (action) => {
    const warningActions = ['verbal_warning', 'written_warning', 'final_warning'];
    const severeActions = ['suspension', 'termination', 'legal_action', 'demotion'];
    const trainingActions = ['training', 'coaching', 'performance_improvement_plan', 'mandatory_training', 'safety_training'];
    const supportActions = ['counseling', 'mandatory_counseling'];
    
    if (warningActions.includes(action)) return 'warning-action';
    if (severeActions.includes(action)) return 'severe-action';
    if (trainingActions.includes(action)) return 'training-action';
    if (supportActions.includes(action)) return 'support-action';
    
    return ''; // default styling
  };

  return (
    <div className="disciplinary-categories-tab">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 text-dark">
            <i className="fas fa-cogs text-primary me-2"></i>
            Category Administration
          </h4>
          <p className="text-muted mb-0 small">Configure disciplinary violation categories and their severity levels</p>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={() => handleShowModal()}
          className="shadow-sm px-4"
        >
          <i className="fas fa-plus me-2"></i>
          Add New Category
        </Button>
      </div>
      
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {/* Filters Section */}
          <div className="bg-light p-4 mb-4 rounded">
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label className="fw-semibold text-muted small mb-2">SEARCH CATEGORIES</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-white border-end-0">
                    <i className="fas fa-search text-muted"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Type to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0 ps-0"
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Label className="fw-semibold text-muted small mb-2">STATUS</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="fw-semibold text-muted small mb-2">SEVERITY LEVEL</Form.Label>
                <Form.Select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="severe">Severe</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSeverityFilter('all');
                    setCurrentPage(1);
                  }}
                  className="w-100 shadow-sm"
                >
                  <i className="fas fa-undo me-2"></i>
                  Reset Filters
                </Button>
              </Col>
              <Col md={1}>
                <div className="text-end">
                  <small className="text-muted d-block">Showing</small>
                  <Badge bg="info" className="fs-6">{categories.length}</Badge>
                  {totalPages > 1 && (
                    <div className="mt-1">
                      <small className="text-muted">Page {currentPage} of {totalPages}</small>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>

          {/* Legend for Suggested Actions */}
          <div className="bg-light border rounded p-3 mb-3">
            <div className="d-flex align-items-center mb-2">
              <i className="fas fa-info-circle text-info me-2"></i>
              <small className="fw-semibold text-muted">SUGGESTED ACTIONS LEGEND</small>
            </div>
            <div className="d-flex flex-wrap gap-3 align-items-center">
              <div className="d-flex align-items-center">
                <span className="badge action-badge warning-action me-1">Warning</span>
                <small className="text-muted">Progressive warnings</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge action-badge severe-action me-1">Severe</span>
                <small className="text-muted">Suspension/termination</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge action-badge training-action me-1">Training</span>
                <small className="text-muted">Development/coaching</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge action-badge support-action me-1">Support</span>
                <small className="text-muted">Counseling/guidance</small>
              </div>
            </div>
          </div>

          {/* Table Section */}
          {loading ? (
            <div className="text-center py-5">
              <div className="d-flex flex-column align-items-center">
                <Spinner animation="border" role="status" className="mb-3">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="text-muted mb-0">Loading categories...</p>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-4">
                <i className="fas fa-folder-open fa-3x text-muted opacity-50"></i>
              </div>
              <h5 className="text-muted mb-3">No Categories Found</h5>
              <p className="text-muted mb-4">Get started by creating your first disciplinary category</p>
              <Button variant="primary" onClick={() => handleShowModal()}>
                <i className="fas fa-plus me-2"></i>
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3">Category</th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3">Description</th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3">Severity</th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3">
                      <div className="d-flex flex-column">
                        <span>Suggested Actions</span>
                        <small className="text-muted fw-normal" style={{fontSize: '0.65rem'}}>Recommended responses</small>
                      </div>
                    </th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3 text-center">Usage</th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3 text-center">Status</th>
                    <th className="border-0 text-uppercase fw-semibold text-muted small py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id} className="border-bottom">
                      <td className="py-4">
                        <div>
                          <h6 className="mb-1 fw-semibold text-dark">{category.name}</h6>
                          <small className="text-muted">ID: {category.id}</small>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="mb-0 text-muted small" style={{maxWidth: '200px'}}>
                          {category.description || <em className="text-muted">No description provided</em>}
                        </p>
                      </td>
                      <td className="py-4">
                        <Badge 
                          bg={getSeverityColor(category.severity_level)} 
                          className="px-3 py-2 fw-semibold"
                        >
                          {category.severity_level.charAt(0).toUpperCase() + category.severity_level.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="d-flex flex-column">
                          <div className="suggested-actions-badges mb-1">
                            {category.suggested_actions && category.suggested_actions.length > 0 ? (
                              category.suggested_actions.map((action, index) => (
                                <span 
                                  key={index}
                                  className={`badge action-badge ${getActionBadgeClass(action)}`}
                                  title={`${formatActionName(action)} - Recommended disciplinary action`}
                                >
                                  {formatActionName(action)}
                                </span>
                              ))
                            ) : (
                              <em className="text-muted small">No actions suggested</em>
                            )}
                          </div>
                          {category.suggested_actions && category.suggested_actions.length > 0 && (
                            <small className="text-muted" style={{fontSize: '0.65rem'}}>
                              <i className="fas fa-list me-1"></i>
                              {category.suggested_actions.length} action{category.suggested_actions.length !== 1 ? 's' : ''} available
                            </small>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div>
                          <span className="fw-bold text-primary fs-5">{category.disciplinary_reports_count || 0}</span>
                          <small className="text-muted d-block">reports</small>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <Badge 
                          bg={category.is_active ? 'success' : 'secondary'} 
                          className="px-3 py-2 fw-semibold"
                        >
                          <i className={`fas ${category.is_active ? 'fa-check-circle' : 'fa-pause-circle'} me-1`}></i>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 text-center">
                        <Dropdown>
                          <Dropdown.Toggle variant="outline-primary" size="sm" className="shadow-sm">
                            <i className="fas fa-cog me-1"></i>
                            Manage
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="shadow">
                            <Dropdown.Item onClick={() => handleShowModal(category)}>
                              <i className="fas fa-edit me-2 text-primary"></i>
                              Edit Category
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleToggleStatus(category.id)}>
                              <i className={`fas ${category.is_active ? 'fa-pause' : 'fa-play'} me-2 text-warning`}></i>
                              {category.is_active ? 'Deactivate' : 'Activate'}
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item 
                              className="text-danger"
                              onClick={() => handleDelete(category.id)}
                              disabled={category.disciplinary_reports_count > 0}
                            >
                              <i className="fas fa-trash me-2"></i>
                              {category.disciplinary_reports_count > 0 ? 'Cannot Delete (In Use)' : 'Delete Category'}
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </Table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && categories.length > 0 && totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4 pb-3">
            <Pagination>
              <Pagination.First 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              />
              <Pagination.Prev 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              />
              
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + index;
                if (pageNum > totalPages) return null;
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === currentPage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              
              <Pagination.Next 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </div>
        )}
      </Card.Body>
      </Card>

      {/* Modal for Add/Edit Category */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Category Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  isInvalid={!!formErrors.name}
                  placeholder="Enter category name"
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Severity Level *</Form.Label>
                <Form.Select
                  name="severity_level"
                  value={formData.severity_level}
                  onChange={handleInputChange}
                  isInvalid={!!formErrors.severity_level}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="severe">Severe</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {formErrors.severity_level}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter category description (optional)"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Suggested Actions</Form.Label>
            <div className="suggested-actions-grid">
              {suggestedActionOptions.map(action => (
                <Form.Check
                  key={action}
                  type="checkbox"
                  id={`action-${action}`}
                  label={formatActionName(action)}
                  checked={formData.suggested_actions.includes(action)}
                  onChange={() => handleSuggestedActionsChange(action)}
                  className="mb-2"
                />
              ))}
            </div>
          </Form.Group>

          <Form.Group>
            <Form.Check
              type="checkbox"
              name="is_active"
              label="Active Category"
              checked={formData.is_active}
              onChange={handleInputChange}
            />
            <Form.Text className="text-muted">
              Only active categories will be available for new reports
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            <i className="fas fa-save me-2"></i>
            {editingCategory ? 'Update' : 'Create'} Category
          </Button>
        </Modal.Footer>
      </Form>
      </Modal>
    </div>
  );
};

export default DisciplinaryCategoriesTab;