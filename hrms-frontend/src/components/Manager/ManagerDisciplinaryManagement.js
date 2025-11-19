import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  InputGroup,
  Dropdown,
  Pagination,
  Nav,
  Tab
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  getManagerCategories,
  getManagerReports,
  getManagerReport,
  createReport,
  getEmployeesForReporting,
  getAssignedInvestigations,
  getInvestigation,
  submitInvestigation,
  checkPreviousViolations,
  formatStatus,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  formatDate,
  formatDateTime,
  getDetailedStatus
} from '../../api/disciplinary';

const ManagerDisciplinaryManagement = () => {
  const [activeTab, setActiveTab] = useState('report');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Categories and employees
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Reports list
  const [reports, setReports] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Assigned investigations
  const [investigations, setInvestigations] = useState([]);
  const [investigationFilters, setInvestigationFilters] = useState({
    search: '',
    status: 'all',
    actionType: 'all'
  });
  const [investigationPage, setInvestigationPage] = useState(1);
  const [investigationTotalPages, setInvestigationTotalPages] = useState(1);

  // Investigation modal
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [selectedReportForDetails, setSelectedReportForDetails] = useState(null);
  const [investigationForm, setInvestigationForm] = useState({
    investigation_notes: '',
    recommendation: '',
    findings: ''
  });
  const [investigationFormErrors, setInvestigationFormErrors] = useState({});
  const [submittingInvestigation, setSubmittingInvestigation] = useState(false);

  // Report form
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    employee_id: '',
    disciplinary_category_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_description: '',
    priority: 'medium',
    evidence: '',
    witnesses: [{ name: '', contact: '' }],
    location: '',
    immediate_action_taken: ''
  });
  const [reportFormErrors, setReportFormErrors] = useState({});
  const [submittingReport, setSubmittingReport] = useState(false);
  const [previousViolations, setPreviousViolations] = useState(null);
  const [checkingViolations, setCheckingViolations] = useState(false);

  // Employee search
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedEmployeeDisplay, setSelectedEmployeeDisplay] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
  const [showEmployeeFilterDropdown, setShowEmployeeFilterDropdown] = useState(false);

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'investigations') {
      loadInvestigations();
    }
  }, [activeTab, currentPage, reportFilters, investigationPage, investigationFilters]);

  // Close employee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmployeeDropdown && !event.target.closest('.form-group')) {
        setShowEmployeeDropdown(false);
      }
      if (showEmployeeFilterDropdown && !event.target.closest('button') && !event.target.closest('[style*="zIndex: 1001"]') && !event.target.closest('[style*="maxHeight: \'300px\'"]')) {
        setShowEmployeeFilterDropdown(false);
      }
    };

    if (showEmployeeDropdown || showEmployeeFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmployeeDropdown, showEmployeeFilterDropdown]);

  // Handle department filter changes - clear selected employee if it doesn't match the new department
  useEffect(() => {
    if (employeeDepartmentFilter !== 'all' && reportForm.employee_id) {
      const selectedEmployee = employees.find(emp => emp.id === reportForm.employee_id);
      if (selectedEmployee && selectedEmployee.department?.toLowerCase() !== employeeDepartmentFilter.toLowerCase()) {
        // Clear selected employee if it doesn't match the department filter
        setReportForm(prev => ({ ...prev, employee_id: '' }));
        setSelectedEmployeeDisplay('');
        setEmployeeSearchQuery('');
      }
    }
    
    // Show dropdown when department is selected (and we're in the report modal)
    if (employeeDepartmentFilter !== 'all' && showReportModal) {
      setShowEmployeeDropdown(true);
    }
  }, [employeeDepartmentFilter, employees, reportForm.employee_id, showReportModal]);

  const initializeComponent = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadEmployees()
      ]);
    } catch (error) {
      console.error('Error initializing component:', error);
      setError('Failed to initialize disciplinary management');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await getManagerCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load disciplinary categories');
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await getEmployeesForReporting();
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const loadReports = async () => {
    try {
      const params = {
        page: currentPage,
        ...reportFilters
      };
      
      // Clean up 'all' values
      Object.keys(params).forEach(key => {
        if (params[key] === 'all' || params[key] === '') {
          delete params[key];
        }
      });

      const response = await getManagerReports(params);
      setReports(response.data.data.data || []);
      setTotalPages(response.data.data.last_page || 1);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    }
  };

  const loadInvestigations = async () => {
    try {
      const params = {
        page: investigationPage,
        ...investigationFilters
      };
      
      // Clean up 'all' values
      Object.keys(params).forEach(key => {
        if (params[key] === 'all' || params[key] === '') {
          delete params[key];
        }
      });

      const response = await getAssignedInvestigations(params);
      setInvestigations(response.data.data.data || []);
      setInvestigationTotalPages(response.data.data.last_page || 1);
    } catch (error) {
      console.error('Error loading investigations:', error);
      toast.error('Failed to load assigned investigations');
    }
  };

  const handleReportFormChange = (field, value) => {
    setReportForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (reportFormErrors[field]) {
      setReportFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Check for previous violations when both employee and category are selected
    const newForm = { ...reportForm, [field]: value };
    if ((field === 'employee_id' || field === 'disciplinary_category_id') &&
        newForm.employee_id && newForm.disciplinary_category_id) {
      checkForPreviousViolations(newForm.employee_id, newForm.disciplinary_category_id);
    }
    
    // Clear previous violations if employee or category changes
    if (field === 'employee_id' || field === 'disciplinary_category_id') {
      if (!value || (field === 'employee_id' && !newForm.disciplinary_category_id) ||
          (field === 'disciplinary_category_id' && !newForm.employee_id)) {
        setPreviousViolations(null);
      }
    }
  };

  const handleEmployeeSearch = (query) => {
    setEmployeeSearchQuery(query);
    
    // Show dropdown if there's a query or if a department is selected
    if (query || employeeDepartmentFilter !== 'all') {
      setShowEmployeeDropdown(true);
    } else {
      setShowEmployeeDropdown(false);
    }
    
    if (!query) {
      setReportForm(prev => ({ ...prev, employee_id: '' }));
      setSelectedEmployeeDisplay('');
    }
  };

  const handleEmployeeSelect = (employee) => {
    setReportForm(prev => ({ ...prev, employee_id: employee.id }));
    setSelectedEmployeeDisplay(`${employee.first_name} ${employee.last_name} (${employee.employee_id}) - ${employee.department}`);
    setEmployeeSearchQuery('');
    setShowEmployeeDropdown(false);
    
    // Clear error
    if (reportFormErrors.employee_id) {
      setReportFormErrors(prev => ({ ...prev, employee_id: '' }));
    }
    
    // Check for previous violations if category is also selected
    if (reportForm.disciplinary_category_id) {
      checkForPreviousViolations(employee.id, reportForm.disciplinary_category_id);
    }
  };

  // Get unique departments from employees
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(dept => dept))].sort();

  const filteredEmployees = employees.filter(employee => {
    // First, filter by department if one is selected
    if (employeeDepartmentFilter !== 'all') {
      const employeeDepartment = (employee.department || '').toLowerCase();
      const selectedDepartment = employeeDepartmentFilter.toLowerCase();
      
      // If department doesn't match, exclude this employee
      if (employeeDepartment !== selectedDepartment) {
        return false;
      }
    }
    
    // If a search query exists, filter by search query within the selected department
    if (employeeSearchQuery) {
      const searchLower = employeeSearchQuery.toLowerCase();
      const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
      const employeeId = (employee.employee_id || '').toLowerCase();
      const department = (employee.department || '').toLowerCase();
      
      // Return true if search matches name, ID, or department
      return fullName.includes(searchLower) || 
             employeeId.includes(searchLower) || 
             department.includes(searchLower);
    }
    
    // If no search query but department is selected, show all employees from that department
    // (The department filter above already ensured we only have employees from that department)
    if (employeeDepartmentFilter !== 'all') {
      return true;
    }
    
    // If no department selected and no search query, don't show any employees (wait for user to type or select department)
    return false;
  });
  
  const checkForPreviousViolations = async (employeeId, categoryId) => {
    try {
      setCheckingViolations(true);
      const response = await checkPreviousViolations({
        employee_id: employeeId,
        disciplinary_category_id: categoryId
      });
      
      if (response.data.success) {
        setPreviousViolations(response.data.data);
      }
    } catch (error) {
      console.error('Error checking previous violations:', error);
      setPreviousViolations(null);
    } finally {
      setCheckingViolations(false);
    }
  };

  const handleWitnessChange = (index, field, value) => {
    const newWitnesses = [...reportForm.witnesses];
    newWitnesses[index] = { ...newWitnesses[index], [field]: value };
    setReportForm(prev => ({ ...prev, witnesses: newWitnesses }));
  };

  const addWitness = () => {
    setReportForm(prev => ({
      ...prev,
      witnesses: [...prev.witnesses, { name: '', contact: '' }]
    }));
  };

  const removeWitness = (index) => {
    if (reportForm.witnesses.length > 1) {
      const newWitnesses = reportForm.witnesses.filter((_, i) => i !== index);
      setReportForm(prev => ({ ...prev, witnesses: newWitnesses }));
    }
  };

  const validateReportForm = () => {
    const errors = {};

    if (!reportForm.employee_id) {
      errors.employee_id = 'Please select an employee';
    }

    if (!reportForm.disciplinary_category_id) {
      errors.disciplinary_category_id = 'Please select a violation category';
    }

    if (!reportForm.incident_date) {
      errors.incident_date = 'Incident date is required';
    }

    if (!reportForm.incident_description.trim()) {
      errors.incident_description = 'Please provide a description of the incident';
    }

    if (!reportForm.priority) {
      errors.priority = 'Please select a priority level';
    }

    setReportFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    if (!validateReportForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setSubmittingReport(true);
      
      // Clean up witnesses - remove empty ones
      const cleanedWitnesses = reportForm.witnesses.filter(w => w.name.trim());
      
      const reportData = {
        ...reportForm,
        witnesses: cleanedWitnesses.length > 0 ? cleanedWitnesses : undefined
      };

      await createReport(reportData);
      
      toast.success('Disciplinary report submitted successfully');
      setShowReportModal(false);
      resetReportForm();
      
      // Switch to reports tab and refresh
      setActiveTab('reports');
      loadReports();
      
    } catch (error) {
      console.error('Error submitting report:', error);
      
      if (error.response?.status === 422 && error.response.data?.errors) {
        setReportFormErrors(error.response.data.errors);
        toast.error('Please check the form for errors');
      } else {
        const message = error.response?.data?.message || 'Failed to submit report';
        toast.error(message);
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const resetReportForm = () => {
    setReportForm({
      employee_id: '',
      disciplinary_category_id: '',
      incident_date: new Date().toISOString().split('T')[0],
      incident_description: '',
      priority: 'medium',
      evidence: '',
      witnesses: [{ name: '', contact: '' }],
      location: '',
      immediate_action_taken: ''
    });
    setReportFormErrors({});
    setPreviousViolations(null);
    setEmployeeSearchQuery('');
    setSelectedEmployeeDisplay('');
    setShowEmployeeDropdown(false);
    setEmployeeDepartmentFilter('all');
    setShowEmployeeFilterDropdown(false);
  };

  const handleFilterChange = (field, value) => {
    setReportFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setReportFilters({
      search: '',
      status: 'all',
      priority: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  const handleInvestigationFilterChange = (field, value) => {
    setInvestigationFilters(prev => ({ ...prev, [field]: value }));
    setInvestigationPage(1);
  };

  const resetInvestigationFilters = () => {
    setInvestigationFilters({
      search: '',
      status: 'all',
      actionType: 'all'
    });
    setInvestigationPage(1);
  };

  const handleStartInvestigation = (investigation) => {
    console.log('Investigation data:', investigation);
    console.log('Disciplinary Report:', investigation.disciplinaryReport);
    console.log('Violation field:', investigation.violation);
    
    setSelectedInvestigation(investigation);
    setInvestigationForm({
      investigation_notes: investigation.investigation_notes || '',
      recommendation: investigation.recommendation || '',
      findings: investigation.findings || ''
    });
    setInvestigationFormErrors({});
    setShowInvestigationModal(true);
  };

  const handleInvestigationFormChange = (field, value) => {
    setInvestigationForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (investigationFormErrors[field]) {
      setInvestigationFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateInvestigationForm = () => {
    const errors = {};

    if (!investigationForm.investigation_notes.trim()) {
      errors.investigation_notes = 'Investigation notes are required';
    }

    if (!investigationForm.findings.trim()) {
      errors.findings = 'Investigation findings are required';
    }

    setInvestigationFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitInvestigation = async (e) => {
    e.preventDefault();
    
    if (!validateInvestigationForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setSubmittingInvestigation(true);
      
      await submitInvestigation(selectedInvestigation.id, investigationForm);
      
      toast.success('Investigation completed successfully');
      setShowInvestigationModal(false);
      loadInvestigations();
      
    } catch (error) {
      console.error('Error submitting investigation:', error);
      
      if (error.response?.status === 422 && error.response.data?.errors) {
        setInvestigationFormErrors(error.response.data.errors);
        toast.error('Please check the form for errors');
      } else {
        const message = error.response?.data?.message || 'Failed to submit investigation';
        toast.error(message);
      }
    } finally {
      setSubmittingInvestigation(false);
    }
  };
  
  const handleViewReportDetails = async (report) => {
    try {
      // Fetch full report details with all related data
      const response = await getManagerReport(report.id);
      setSelectedReportForDetails(response.data.data);
      setShowReportDetailsModal(true);
    } catch (error) {
      console.error('Error loading report details:', error);
      toast.error('Failed to load report details');
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xs="auto">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Loading disciplinary management...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={initializeComponent}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-gavel text-warning me-2"></i>
                Disciplinary Management
              </h2>
              <p className="text-muted mb-0">Report infractions and manage disciplinary cases</p>
            </div>
          </div>

          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="report">
                  <i className="fas fa-plus-circle me-2"></i>
                  Report Infraction
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="reports">
                  <i className="fas fa-list me-2"></i>
                  My Reports
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="investigations">
                  <i className="fas fa-search me-2"></i>
                  Assigned Disciplinary Actions
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="report">
                <Card className="shadow-sm">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Report Employee Infraction
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Alert variant="info" className="mb-4">
                      <i className="fas fa-info-circle me-2"></i>
                      Use this form to report employee infractions and policy violations. 
                      All reports will be reviewed by HR and appropriate actions will be taken.
                    </Alert>

                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => setShowReportModal(true)}
                      className="d-block mx-auto"
                    >
                      <i className="fas fa-file-alt me-2"></i>
                      Create New Report
                    </Button>

                    {/* Quick Statistics */}
                    <Row className="mt-4">
                      <Col md={4}>
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <h3 className="text-primary">{categories.length}</h3>
                            <p className="mb-0">Available Categories</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <h3 className="text-info">{employees.length}</h3>
                            <p className="mb-0">Team Members</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <h3 className="text-warning">{reports.length}</h3>
                            <p className="mb-0">Reports Submitted</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="investigations">
                <Card className="shadow-sm">
                  <Card.Header>
                    <Row className="align-items-center">
                      <Col>
                        <h5 className="mb-0">
                          <i className="fas fa-search me-2"></i>
                          Assigned Disciplinary Actions
                        </h5>
                      </Col>
                      <Col xs="auto">
                        <Badge bg="warning">
                          Total: {investigations.length}
                        </Badge>
                      </Col>
                    </Row>
                  </Card.Header>
                  <Card.Body>
                    {/* Investigation Filters */}
                    <Row className="mb-3">
                      <Col md={4}>
                        <InputGroup>
                          <InputGroup.Text>
                            <i className="fas fa-search"></i>
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            placeholder="Search investigations..."
                            value={investigationFilters.search}
                            onChange={(e) => handleInvestigationFilterChange('search', e.target.value)}
                          />
                        </InputGroup>
                      </Col>
                      <Col md={3}>
                        <Form.Select
                          value={investigationFilters.status}
                          onChange={(e) => handleInvestigationFilterChange('status', e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="action_issued">Action Issued</option>
                          <option value="explanation_requested">Explanation Requested</option>
                          <option value="explanation_submitted">Explanation Submitted</option>
                          <option value="under_investigation">Under Investigation</option>
                          <option value="investigation_completed">Investigation Completed</option>
                          <option value="awaiting_verdict">Awaiting Verdict</option>
                          <option value="completed">Completed</option>
                        </Form.Select>
                      </Col>
                      <Col md={3}>
                        <Form.Select
                          value={investigationFilters.actionType}
                          onChange={(e) => handleInvestigationFilterChange('actionType', e.target.value)}
                        >
                          <option value="all">All Action Types</option>
                          <option value="verbal_warning">Verbal Warning</option>
                          <option value="written_warning">Written Warning</option>
                          <option value="final_warning">Final Warning</option>
                          <option value="suspension">Suspension</option>
                          <option value="demotion">Demotion</option>
                          <option value="termination">Termination</option>
                          <option value="training">Training</option>
                          <option value="counseling">Counseling</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Button variant="outline-secondary" onClick={resetInvestigationFilters}>
                          <i className="fas fa-undo me-1"></i>
                          Reset
                        </Button>
                      </Col>
                    </Row>

                    {investigations.length === 0 ? (
                      <Alert variant="info" className="text-center py-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No disciplinary actions assigned to you for investigation.
                      </Alert>
                    ) : (
                      <div className="table-responsive">
                        <Table hover>
                          <thead>
                            <tr>
                              <th>Action ID</th>
                              <th>Employee</th>
                              <th>Action Type</th>
                              <th>Category</th>
                              <th>Status</th>
                              <th>Effective Date</th>
                              <th>Assigned Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {investigations.map(investigation => (
                              <tr key={investigation.id}>
                                <td><strong>DA-{investigation.id}</strong></td>
                                <td>
                                  <div>
                                    <strong>
                                      {investigation.employee?.first_name} {investigation.employee?.last_name}
                                    </strong>
                                    <br />
                                    <small className="text-muted">
                                      {investigation.employee?.employee_id}
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  <Badge bg="primary">
                                    {investigation.action_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Badge>
                                </td>
                                <td>
                                  <div className="d-flex flex-column">
                                    <Badge bg={getSeverityColor(investigation.disciplinary_report?.disciplinary_category?.severity_level)}>
                                      {investigation.disciplinary_report?.disciplinary_category?.name || 'N/A'}
                                    </Badge>
                                    {investigation.is_repeat_violation && (
                                      <Badge bg="warning" size="sm" className="mt-1">
                                        <i className="fas fa-exclamation-triangle me-1"></i>
                                        Repeat ({investigation.violation_ordinal})
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <Badge bg={getStatusColor(investigation.status)}>
                                    {formatStatus(investigation.status)}
                                  </Badge>
                                </td>
                                <td>{formatDate(investigation.effective_date)}</td>
                                <td>{formatDate(investigation.created_at)}</td>
                                <td>
                                  {['action_issued', 'explanation_requested', 'explanation_submitted', 'under_investigation'].includes(investigation.status) && !investigation.investigation_notes ? (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleStartInvestigation(investigation)}
                                    >
                                      <i className="fas fa-search me-1"></i>
                                      Investigate
                                    </Button>
                                  ) : investigation.status === 'awaiting_verdict' || investigation.investigation_notes ? (
                                    <Button
                                      variant="info"
                                      size="sm"
                                      onClick={() => handleStartInvestigation(investigation)}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      View Details
                                    </Button>
                                  ) : investigation.status === 'completed' ? (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleStartInvestigation(investigation)}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      View Completed
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleStartInvestigation(investigation)}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      View
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                    {/* Investigation Pagination */}
                    {investigationTotalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <Pagination>
                          <Pagination.First 
                            onClick={() => setInvestigationPage(1)}
                            disabled={investigationPage === 1}
                          />
                          <Pagination.Prev 
                            onClick={() => setInvestigationPage(prev => Math.max(1, prev - 1))}
                            disabled={investigationPage === 1}
                          />
                          
                          {[...Array(Math.min(5, investigationTotalPages))].map((_, index) => {
                            const pageNum = Math.max(1, Math.min(investigationTotalPages - 4, investigationPage - 2)) + index;
                            return (
                              <Pagination.Item
                                key={pageNum}
                                active={pageNum === investigationPage}
                                onClick={() => setInvestigationPage(pageNum)}
                              >
                                {pageNum}
                              </Pagination.Item>
                            );
                          })}
                          
                          <Pagination.Next 
                            onClick={() => setInvestigationPage(prev => Math.min(investigationTotalPages, prev + 1))}
                            disabled={investigationPage === investigationTotalPages}
                          />
                          <Pagination.Last 
                            onClick={() => setInvestigationPage(investigationTotalPages)}
                            disabled={investigationPage === investigationTotalPages}
                          />
                        </Pagination>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="reports">
                <Card className="shadow-sm">
                  <Card.Header>
                    <Row className="align-items-center">
                      <Col>
                        <h5 className="mb-0">
                          <i className="fas fa-list me-2"></i>
                          My Submitted Reports
                        </h5>
                      </Col>
                      <Col xs="auto">
                        <Badge bg="info">
                          Total: {reports.length}
                        </Badge>
                      </Col>
                    </Row>
                  </Card.Header>
                  <Card.Body>
                    {/* Filters */}
                    <Row className="mb-3">
                      <Col md={4}>
                        <InputGroup>
                          <InputGroup.Text>
                            <i className="fas fa-search"></i>
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            placeholder="Search reports..."
                            value={reportFilters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                          />
                        </InputGroup>
                      </Col>
                      <Col md={2}>
                        <Form.Select
                          value={reportFilters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="reported">Reported</option>
                          <option value="under_review">Under Review</option>
                          <option value="action_issued">Action Issued</option>
                          <option value="explanation_requested">Explanation Requested</option>
                          <option value="explanation_submitted">Explanation Submitted</option>
                          <option value="under_investigation">Under Investigation</option>
                          <option value="awaiting_verdict">Awaiting Verdict</option>
                          <option value="completed">Completed</option>
                          <option value="dismissed">Dismissed</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Select
                          value={reportFilters.priority}
                          onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                          <option value="all">All Priorities</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Control
                          type="date"
                          value={reportFilters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                      </Col>
                      <Col md={2}>
                        <Button variant="outline-secondary" onClick={resetFilters}>
                          <i className="fas fa-undo me-1"></i>
                          Reset
                        </Button>
                      </Col>
                    </Row>

                    {reports.length === 0 ? (
                      <Alert variant="info" className="text-center py-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No reports found. Create your first report using the "Report Infraction" tab.
                      </Alert>
                    ) : (
                      <div className="table-responsive">
                        <Table hover>
                          <thead>
                            <tr>
                              <th>Report #</th>
                              <th>Employee</th>
                              <th>Category</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Incident Date</th>
                              <th>Submitted</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reports.map(report => (
                              <tr key={report.id}>
                                <td><strong>{report.report_number}</strong></td>
                                <td>
                                  <div>
                                    <strong>
                                      {report.employee?.first_name} {report.employee?.last_name}
                                    </strong>
                                    <br />
                                    <small className="text-muted">
                                      {report.employee?.employee_id}
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  <Badge bg={getSeverityColor(report.disciplinary_category?.severity_level)}>
                                    {report.disciplinary_category?.name || 'N/A'}
                                  </Badge>
                                </td>

                                <td>
                                  <Badge bg={getPriorityColor(report.priority)}>
                                    {report.priority}
                                  </Badge>
                                </td>
                                <td>
                                  <Badge bg={getStatusColor(report.overall_status || report.status)}>
                                    {getDetailedStatus(report)}
                                  </Badge>
                                </td>
                                <td>{formatDate(report.incident_date)}</td>
                                <td>{formatDate(report.created_at)}</td>
                                <td>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleViewReportDetails(report)}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
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
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Col>
      </Row>

      {/* Report Modal */}
      <Modal show={showReportModal} onHide={() => {
        setShowReportModal(false);
        setShowEmployeeDropdown(false);
      }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Report Employee Infraction
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitReport}>
          <Modal.Body onClick={(e) => {
            // Close dropdown when clicking outside the input
            if (!e.target.closest('.form-group') || !e.target.closest('input')) {
              setShowEmployeeDropdown(false);
            }
          }}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <Form.Label style={{ marginBottom: 0 }}>Employee *</Form.Label>
                    <div style={{ position: 'relative' }}>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowEmployeeFilterDropdown(!showEmployeeFilterDropdown);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <i className="fas fa-filter"></i>
                        {employeeDepartmentFilter !== 'all' && (
                          <span className="badge bg-primary" style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>
                            {employeeDepartmentFilter}
                          </span>
                        )}
                      </Button>
                      {showEmployeeFilterDropdown && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            zIndex: 1001,
                            backgroundColor: '#fff',
                            border: '1px solid #ced4da',
                            borderRadius: '0.375rem',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            minWidth: '150px',
                            marginTop: '0.25rem',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            onClick={() => {
                              setEmployeeDepartmentFilter('all');
                              setShowEmployeeFilterDropdown(false);
                              setShowEmployeeDropdown(false);
                              setEmployeeSearchQuery('');
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: employeeDepartmentFilter === 'all' ? '#f8f9fa' : '#fff',
                              fontWeight: employeeDepartmentFilter === 'all' ? '600' : '400'
                            }}
                            onMouseEnter={(e) => {
                              if (employeeDepartmentFilter !== 'all') {
                                e.target.style.backgroundColor = '#f8f9fa';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (employeeDepartmentFilter !== 'all') {
                                e.target.style.backgroundColor = '#fff';
                              }
                            }}
                          >
                            All Departments
                          </div>
                          {uniqueDepartments.map((dept, index) => (
                            <div
                              key={dept}
                              onClick={() => {
                                setEmployeeDepartmentFilter(dept);
                                setShowEmployeeFilterDropdown(false);
                                setShowEmployeeDropdown(true);
                                setEmployeeSearchQuery('');
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: index < uniqueDepartments.length - 1 ? '1px solid #f0f0f0' : 'none',
                                backgroundColor: employeeDepartmentFilter === dept ? '#f8f9fa' : '#fff',
                                fontWeight: employeeDepartmentFilter === dept ? '600' : '400'
                              }}
                              onMouseEnter={(e) => {
                                if (employeeDepartmentFilter !== dept) {
                                  e.target.style.backgroundColor = '#f8f9fa';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (employeeDepartmentFilter !== dept) {
                                  e.target.style.backgroundColor = '#fff';
                                }
                              }}
                            >
                              {dept}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Form.Control
                    type="text"
                    placeholder="Search employee by name, ID, or department..."
                    value={selectedEmployeeDisplay || employeeSearchQuery}
                    onChange={(e) => handleEmployeeSearch(e.target.value)}
                    onFocus={() => {
                      if (!selectedEmployeeDisplay) {
                        // Show dropdown if department is selected or if there's a search query
                        if (employeeDepartmentFilter !== 'all' || employeeSearchQuery) {
                          setShowEmployeeDropdown(true);
                        }
                      }
                    }}
                    isInvalid={!!reportFormErrors.employee_id}
                    autoComplete="off"
                  />
                  {showEmployeeDropdown && filteredEmployees.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        backgroundColor: '#fff',
                        border: '1px solid #ced4da',
                        borderTop: 'none',
                        borderRadius: '0 0 0.375rem 0.375rem',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {filteredEmployees.map(employee => (
                        <div
                          key={employee.id}
                          onClick={() => handleEmployeeSelect(employee)}
                          style={{
                            padding: '10px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                        >
                          <div style={{ fontWeight: '500', color: '#212529' }}>
                            {employee.first_name} {employee.last_name}
                          </div>
                          <small style={{ color: '#6c757d' }}>
                            {employee.employee_id} - {employee.department}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                  {showEmployeeDropdown && employeeSearchQuery && filteredEmployees.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        backgroundColor: '#fff',
                        border: '1px solid #ced4da',
                        borderTop: 'none',
                        borderRadius: '0 0 0.375rem 0.375rem',
                        padding: '15px',
                        textAlign: 'center',
                        color: '#6c757d',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      No employees found
                    </div>
                  )}
                  <Form.Control.Feedback type="invalid">
                    {reportFormErrors.employee_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Violation Category *</Form.Label>
                  <Form.Select
                    value={reportForm.disciplinary_category_id}
                    onChange={(e) => handleReportFormChange('disciplinary_category_id', e.target.value)}
                    isInvalid={!!reportFormErrors.disciplinary_category_id}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.severity_level})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {reportFormErrors.disciplinary_category_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Incident Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={reportForm.incident_date}
                    onChange={(e) => handleReportFormChange('incident_date', e.target.value)}
                    isInvalid={!!reportFormErrors.incident_date}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Form.Control.Feedback type="invalid">
                    {reportFormErrors.incident_date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority Level *</Form.Label>
                  <Form.Select
                    value={reportForm.priority}
                    onChange={(e) => handleReportFormChange('priority', e.target.value)}
                    isInvalid={!!reportFormErrors.priority}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {reportFormErrors.priority}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            {/* Previous Violations Alert */}
            {checkingViolations && (
              <Alert variant="info" className="mb-3">
                <i className="fas fa-spinner fa-spin me-2"></i>
                Checking for previous violations...
              </Alert>
            )}
            
            {previousViolations && previousViolations.is_repeat_violation && (
              <Alert variant="warning" className="mb-3">
                <div className="d-flex align-items-start">
                  <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                  <div>
                    <strong>Repeat Violation Detected!</strong>
                    <p className="mb-2">{previousViolations.warning_message}</p>
                    <div className="mt-2">
                      <strong>Previous violations for this category:</strong>
                      <ul className="mb-0 mt-1">
                        {previousViolations.previous_violations.slice(0, 3).map((violation, index) => (
                          <li key={violation.id}>
                            Report #{violation.report_number} - {formatDate(violation.incident_date)} 
                            ({formatStatus(violation.status)})
                          </li>
                        ))}
                        {previousViolations.previous_violations.length > 3 && (
                          <li>...and {previousViolations.previous_violations.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Incident Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reportForm.incident_description}
                onChange={(e) => handleReportFormChange('incident_description', e.target.value)}
                isInvalid={!!reportFormErrors.incident_description}
                placeholder="Provide a detailed description of what happened, when it occurred, and any relevant circumstances..."
              />
              <Form.Control.Feedback type="invalid">
                {reportFormErrors.incident_description}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Be as detailed as possible.
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={reportForm.location}
                    onChange={(e) => handleReportFormChange('location', e.target.value)}
                    placeholder="Where did the incident occur?"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Immediate Action Taken</Form.Label>
                  <Form.Control
                    type="text"
                    value={reportForm.immediate_action_taken}
                    onChange={(e) => handleReportFormChange('immediate_action_taken', e.target.value)}
                    placeholder="What immediate action was taken, if any?"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Evidence/Additional Details</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={reportForm.evidence}
                onChange={(e) => handleReportFormChange('evidence', e.target.value)}
                placeholder="Any supporting evidence, documents, or additional information..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Witnesses</Form.Label>
              {reportForm.witnesses.map((witness, index) => (
                <Row key={index} className="mb-2">
                  <Col md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Witness name"
                      value={witness.name}
                      onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Contact information"
                      value={witness.contact}
                      onChange={(e) => handleWitnessChange(index, 'contact', e.target.value)}
                    />
                  </Col>
                  <Col md={2}>
                    {reportForm.witnesses.length > 1 && (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => removeWitness(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    )}
                  </Col>
                </Row>
              ))}
              <Button variant="outline-primary" size="sm" onClick={addWitness}>
                <i className="fas fa-plus me-1"></i>
                Add Witness
              </Button>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submittingReport}
            >
              {submittingReport ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Submit Report
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Investigation Modal */}
      <Modal show={showInvestigationModal} onHide={() => setShowInvestigationModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${selectedInvestigation?.investigation_notes ? 'fa-eye' : 'fa-search'} me-2`}></i>
            {selectedInvestigation?.investigation_notes ? 'View Investigation:' : 'Investigation:'} {selectedInvestigation && `DA-${selectedInvestigation.id}`}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitInvestigation}>
          <Modal.Body>
            {selectedInvestigation && (
              <>
                {/* Investigation Case Summary */}
<Alert variant="info" className="mb-4">
  <Row>
    <Col md={6}>
      <h6><i className="fas fa-user me-2"></i>Employee</h6>
      <p>
        <strong>
          {selectedInvestigation.employee?.first_name} {selectedInvestigation.employee?.last_name}
        </strong>
      </p>
      <p>
        <small>
          ID: {selectedInvestigation.employee?.id || 'N/A'} | 
          Department: {selectedInvestigation.employee?.department || 'N/A'}
        </small>
      </p>
    </Col>
    <Col md={6}>
      <h6><i className="fas fa-gavel me-2"></i>Action Details</h6>
      <p>
        <strong>Type:</strong>{' '}
        {selectedInvestigation.action_type
          ? selectedInvestigation.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
          : 'N/A'}
      </p>
      <p>
        <strong>Status:</strong>{' '}
        <Badge bg={getStatusColor(selectedInvestigation.status)}>
          {formatStatus(selectedInvestigation.status)}
        </Badge>
      </p>
    </Col>
  </Row>

  <Row className="mt-3">
    <Col md={12}>
      <h6><i className="fas fa-file-alt me-2"></i>Violation Details</h6>

      <p>
        <strong>Category:</strong>{' '}
        {selectedInvestigation.disciplinary_report?.disciplinary_category?.name || 'N/A'}
      </p>

      <p>
        <strong>Severity:</strong>{' '}
        {selectedInvestigation.disciplinary_report?.disciplinary_category?.severity_level ? (
          <Badge
            bg={getSeverityColor(
              selectedInvestigation.disciplinary_report.disciplinary_category.severity_level
            )}
            className="ms-2"
          >
            {selectedInvestigation.disciplinary_report.disciplinary_category.severity_level}
          </Badge>
        ) : (
          'N/A'
        )}
      </p>

      <p><strong>Incident Date:</strong> {formatDate(selectedInvestigation.incident_date)}</p>

      <p><strong>Violation Description:</strong></p>
      <div className="bg-light p-3 rounded">
        {selectedInvestigation.violation ||
          selectedInvestigation.disciplinary_report?.incident_description ||
          'No violation description available'}
      </div>

      {selectedInvestigation.disciplinary_report?.incident_description &&
        selectedInvestigation.disciplinary_report.incident_description !== selectedInvestigation.violation && (
          <>
            <p className="mt-3"><strong>Original Incident Description:</strong></p>
            <div className="bg-light p-3 rounded">
              {selectedInvestigation.disciplinary_report.incident_description}
            </div>
          </>
        )}

      {selectedInvestigation.disciplinary_report?.location && (
        <p className="mt-2"><strong>Location:</strong> {selectedInvestigation.disciplinary_report.location}</p>
      )}

      {selectedInvestigation.disciplinary_report?.evidence && (
        <>
          <p className="mt-2"><strong>Evidence:</strong></p>
          <div className="bg-light p-2 rounded small">
            {selectedInvestigation.disciplinary_report.evidence}
          </div>
        </>
      )}

      {selectedInvestigation.disciplinary_report?.witnesses &&
        selectedInvestigation.disciplinary_report.witnesses.length > 0 && (
          <>
            <p className="mt-2"><strong>Witnesses:</strong></p>
            <ul className="small">
              {selectedInvestigation.disciplinary_report.witnesses.map((witness, index) => (
                <li key={index}>
                  {witness.name} {witness.contact && `- ${witness.contact}`}
                </li>
              ))}
            </ul>
          </>
        )}
    </Col>
  </Row>
</Alert>

                
                {/* Repeated Violation Alert */}
                {selectedInvestigation.is_repeat_violation && (
                  <Alert variant="warning" className="mb-4">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                      <div>
                        <strong>Repeat Violation Detected!</strong>
                        <p className="mb-2">{selectedInvestigation.violation_warning_message}</p>
                        <div className="mt-2">
                          <strong>Previous violations for this category:</strong>
                          <ul className="mb-0 mt-1">
                            {selectedInvestigation.previous_violations?.slice(0, 3).map((violation, index) => (
                              <li key={violation.id}>
                                Report #{violation.report_number} - {formatDate(violation.incident_date)} 
                                ({formatStatus(violation.status)})
                              </li>
                            ))}
                            {selectedInvestigation.previous_violations?.length > 3 && (
                              <li>...and {selectedInvestigation.previous_violations.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Employee Explanation Section */}
                {selectedInvestigation.employee_explanation && (
                  <Alert variant="info" className="mb-4">
                    <h6><i className="fas fa-comment text-primary me-2"></i>Employee Explanation</h6>
                    <div className="mb-2">
                      <strong>Submitted:</strong> {formatDateTime(selectedInvestigation.explanation_submitted_at)}
                    </div>
                    <div className="bg-white p-3 rounded border">
                      {selectedInvestigation.employee_explanation}
                    </div>
                  </Alert>
                )}

                {/* Existing Investigation Details (if any) */}
                {(selectedInvestigation.investigation_notes || selectedInvestigation.investigation_findings) && (
                  <Alert variant="warning" className="mb-4">
                    <h6><i className="fas fa-search text-warning me-2"></i>Existing Investigation Details</h6>
                    
                    {selectedInvestigation.investigation_completed_at && (
                      <div className="mb-2">
                        <strong>Completed:</strong> {formatDateTime(selectedInvestigation.investigation_completed_at)}
                      </div>
                    )}
                    
                    {selectedInvestigation.investigation_notes && (
                      <div className="mb-3">
                        <strong>Investigation Notes:</strong>
                        <div className="bg-white p-3 rounded border mt-1">
                          {selectedInvestigation.investigation_notes}
                        </div>
                      </div>
                    )}
                    
                    {selectedInvestigation.investigation_findings && (
                      <div className="mb-3">
                        <strong>Findings:</strong>
                        <div className="bg-white p-3 rounded border mt-1">
                          {selectedInvestigation.investigation_findings}
                        </div>
                      </div>
                    )}
                    
                    {selectedInvestigation.investigation_recommendation && (
                      <div className="mb-0">
                        <strong>Recommendation:</strong>
                        <div className="bg-white p-3 rounded border mt-1">
                          {selectedInvestigation.investigation_recommendation}
                        </div>
                      </div>
                    )}
                  </Alert>
                )}

                {/* Final Verdict Section - Only show if case is completed */}
                {selectedInvestigation.verdict && (
                  <Alert variant={selectedInvestigation.verdict === 'dismissed' ? 'secondary' : 'success'} className="mb-4">
                    <h6><i className="fas fa-balance-scale text-success me-2"></i>Final HR Verdict</h6>
                    
                    {selectedInvestigation.verdict_issued_at && (
                      <div className="mb-2">
                        <strong>Issued:</strong> {formatDateTime(selectedInvestigation.verdict_issued_at)}
                      </div>
                    )}
                    
                    <div className="mb-2">
                      <strong>Verdict:</strong> 
                      <Badge 
                        bg={selectedInvestigation.verdict === 'dismissed' ? 'secondary' : 'success'} 
                        className="ms-2"
                      >
                        {selectedInvestigation.verdict === 'guilty' ? 'Action Upheld' : 
                         selectedInvestigation.verdict === 'dismissed' ? 'Action Dismissed' :
                         formatStatus(selectedInvestigation.verdict)}
                      </Badge>
                    </div>
                    
                    {selectedInvestigation.verdict_details && (
                      <div>
                        <strong>Verdict Details:</strong>
                        <div className="bg-white p-3 rounded border mt-1">
                          {selectedInvestigation.verdict_details}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <Badge 
                        bg={selectedInvestigation.status === 'completed' ? 'success' : 'warning'} 
                        className="me-2"
                      >
                        <i className="fas fa-check-circle me-1"></i>
                        Case {selectedInvestigation.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                  </Alert>
                )}

                {/* Investigation Form */}
                {/* Only show form if case is not completed and investigation is not yet done */}
                {(selectedInvestigation.status !== 'completed' && 
                  selectedInvestigation.status !== 'awaiting_verdict' && 
                  !selectedInvestigation.investigation_notes) ? (
                  <div>
                    <hr className="my-4" />
                    <h5><i className="fas fa-pen me-2"></i>Investigation Form</h5>
                    
                <Form.Group className="mb-4">
                  <Form.Label><strong>Investigation Notes *</strong></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={investigationForm.investigation_notes}
                    onChange={(e) => handleInvestigationFormChange('investigation_notes', e.target.value)}
                    isInvalid={!!investigationFormErrors.investigation_notes}
                    placeholder="Document your investigation process, interviews conducted, evidence reviewed, and detailed notes about your findings..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {investigationFormErrors.investigation_notes}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Provide comprehensive documentation of your investigation process.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label><strong>Investigation Findings *</strong></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={investigationForm.findings}
                    onChange={(e) => handleInvestigationFormChange('findings', e.target.value)}
                    isInvalid={!!investigationFormErrors.findings}
                    placeholder="Summarize your key findings, facts established, and conclusions reached during the investigation..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {investigationFormErrors.findings}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Clearly state what you found during the investigation.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label><strong>Recommendation</strong></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={investigationForm.recommendation}
                    onChange={(e) => handleInvestigationFormChange('recommendation', e.target.value)}
                    placeholder="Provide your professional recommendation based on the investigation findings (optional)..."
                  />
                  <Form.Text className="text-muted">
                    Optional. Suggest next steps or recommended actions based on your investigation.
                  </Form.Text>
                </Form.Group>

                    <Alert variant="warning" className="mt-4">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Important:</strong> Once submitted, this investigation will be marked as completed and sent to HR for final review and verdict.
                    </Alert>
                  </div>
                ) : (
                  <Alert 
                    variant={
                      selectedInvestigation.status === 'completed' ? 'success' : 
                      selectedInvestigation.status === 'awaiting_verdict' ? 'info' : 
                      'warning'
                    } 
                    className="text-center py-4"
                  >
                    <i className={`fas ${
                      selectedInvestigation.status === 'completed' ? 'fa-check-circle' : 
                      selectedInvestigation.status === 'awaiting_verdict' ? 'fa-hourglass-half' : 
                      'fa-info-circle'
                    } fa-2x mb-3`}></i>
                    <h5>
                      {selectedInvestigation.status === 'completed' ? 'Case Completed' : 
                       selectedInvestigation.status === 'awaiting_verdict' ? 'Investigation Completed' : 
                       'Investigation Not Available'}
                    </h5>
                    <p className="mb-0">
                      {selectedInvestigation.status === 'completed' 
                        ? 'This case has been completed with a final HR verdict. No further investigation is needed.'
                        : selectedInvestigation.status === 'awaiting_verdict'
                        ? 'This investigation has been completed and is awaiting HR verdict.'
                        : 'Investigation form is not available for this case.'}
                    </p>
                  </Alert>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInvestigationModal(false)}>
              {(selectedInvestigation?.status !== 'completed' && 
                selectedInvestigation?.status !== 'awaiting_verdict' && 
                !selectedInvestigation?.investigation_notes) ? 'Cancel' : 'Close'}
            </Button>
            
            {/* Only show submit button if investigation is not completed and can still be investigated */}
            {(selectedInvestigation?.status !== 'completed' && 
              selectedInvestigation?.status !== 'awaiting_verdict' && 
              !selectedInvestigation?.investigation_notes) && (
              <Button 
                variant="success" 
                type="submit" 
                disabled={submittingInvestigation}
              >
                {submittingInvestigation ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle me-2"></i>
                    Complete Investigation
                  </>
                )}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
      
{/* Report Details Modal */}
<Modal show={showReportDetailsModal} onHide={() => setShowReportDetailsModal(false)} size="xl" scrollable>
  <Modal.Header closeButton>
    <Modal.Title>
      <i className="fas fa-file-alt me-2"></i>
      Report Details - {selectedReportForDetails?.report_number}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedReportForDetails && (
      <>
        {/* Report Information */}
        <Alert variant="primary" className="mb-4">
          <Row>
            <Col md={6}>
              <h6><i className="fas fa-user me-2"></i>Employee Information</h6>
              <p><strong>Name:</strong> {selectedReportForDetails.employee?.first_name} {selectedReportForDetails.employee?.last_name}</p>
              <p><strong>Employee ID:</strong> {selectedReportForDetails.employee?.employee_id || 'N/A'}</p>
              <p><strong>Department:</strong> {selectedReportForDetails.employee?.department || 'N/A'}</p>
              <p><strong>Position:</strong> {selectedReportForDetails.employee?.position || 'N/A'}</p>
            </Col>
            <Col md={6}>
              <h6><i className="fas fa-info-circle me-2"></i>Report Information</h6>
              <p><strong>Status:</strong> 
                <Badge bg={getStatusColor(selectedReportForDetails.overall_status || selectedReportForDetails.status)} className="ms-2">
                  {getDetailedStatus(selectedReportForDetails)}
                </Badge>
              </p>
              <p><strong>Priority:</strong> 
                <Badge bg={getPriorityColor(selectedReportForDetails.priority)} className="ms-2">
                  {selectedReportForDetails.priority || 'N/A'}
                </Badge>
              </p>
              <p><strong>Submitted:</strong> {formatDateTime(selectedReportForDetails.created_at)}</p>
            </Col>
          </Row>
        </Alert>
        
        {/* Incident Details */}
        <div className="mb-4">
          <h6><i className="fas fa-exclamation-triangle me-2"></i>Incident Details</h6>
          <Row>
            <Col md={6}>
              <p><strong>Category:</strong> {selectedReportForDetails.disciplinary_category?.name || 'N/A'}</p>
              <p><strong>Severity:</strong> 
                {selectedReportForDetails.disciplinary_category?.severity_level ? (
                  <Badge 
                    bg={getSeverityColor(selectedReportForDetails.disciplinary_category.severity_level)} 
                    className="ms-2"
                  >
                    {selectedReportForDetails.disciplinary_category.severity_level}
                  </Badge>
                ) : 'N/A'}
              </p>
              <p><strong>Incident Date:</strong> {formatDate(selectedReportForDetails.incident_date)}</p>
              <p><strong>Location:</strong> {selectedReportForDetails.location || 'Not specified'}</p>
            </Col>
            <Col md={6}>
              <p><strong>Immediate Action Taken:</strong></p>
              <div className="bg-light p-2 rounded">
                {selectedReportForDetails.immediate_action_taken || 'None specified'}
              </div>
            </Col>
          </Row>
          
          <div className="mt-3">
            <p><strong>Description:</strong></p>
            <div className="bg-light p-3 rounded">
              {selectedReportForDetails.incident_description || 'No description provided'}
            </div>
          </div>
          
          {selectedReportForDetails.evidence && (
            <div className="mt-3">
              <p><strong>Evidence:</strong></p>
              <div className="bg-light p-3 rounded">
                {selectedReportForDetails.evidence}
              </div>
            </div>
          )}
          
          {selectedReportForDetails.witnesses && selectedReportForDetails.witnesses.length > 0 && (
            <div className="mt-3">
              <p><strong>Witnesses:</strong></p>
              <div className="bg-light p-3 rounded">
                {selectedReportForDetails.witnesses.map((witness, index) => (
                  <div key={index} className="mb-2">
                    <strong>{witness.name}</strong>
                    {witness.contact && ` - ${witness.contact}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Disciplinary Actions */}
        {selectedReportForDetails.disciplinary_actions?.length > 0 ? (
          <div className="mb-4">
            <h6><i className="fas fa-gavel me-2"></i>Disciplinary Actions</h6>
            {selectedReportForDetails.disciplinary_actions.map((action) => (
              <Card key={action.id} className="mb-3">
                <Card.Header>
                  <Row className="align-items-center">
                    <Col>
                      <h6 className="mb-0">Action #{action.action_number || action.id}</h6>
                    </Col>
                    <Col xs="auto">
                      <Badge bg={getStatusColor(action.status)}>
                        {formatStatus(action.status)}
                      </Badge>
                    </Col>
                  </Row>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Action Type:</strong> {action.action_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p><strong>Effective Date:</strong> {formatDate(action.effective_date)}</p>
                      {action.investigator && (
                        <p><strong>Investigator:</strong> {action.investigator.first_name} {action.investigator.last_name}</p>
                      )}
                    </Col>
                    <Col md={6}>
                      <p><strong>Issued By:</strong> {action.issued_by?.first_name} {action.issued_by?.last_name}</p>
                      <p><strong>Issued Date:</strong> {formatDate(action.created_at)}</p>
                    </Col>
                  </Row>
                  
                  <div className="mt-3">
                    <p><strong>Action Details:</strong></p>
                    <div className="bg-light p-2 rounded">
                      {action.action_details}
                    </div>
                  </div>
                  
                  {action.employee_explanation && (
                    <div className="mt-3">
                      <p><strong>Employee Explanation:</strong></p>
                      <div className="bg-info bg-opacity-10 p-2 rounded">
                        {action.employee_explanation}
                      </div>
                    </div>
                  )}
                  
                  {action.investigation_notes && (
                    <div className="mt-3">
                      <p><strong>Investigation Notes:</strong></p>
                      <div className="bg-warning bg-opacity-10 p-2 rounded">
                        {action.investigation_notes}
                      </div>
                    </div>
                  )}
                  
                  {action.verdict && (
                    <div className="mt-3">
                      <Alert variant={action.verdict === 'dismissed' ? 'secondary' : 'success'}>
                        <h6><i className="fas fa-balance-scale me-2"></i>Final Verdict</h6>
                        <p><strong>Decision:</strong> 
                          <Badge bg={action.verdict === 'dismissed' ? 'secondary' : 'success'} className="ms-2">
                            {action.verdict === 'guilty' ? 'Action Upheld' :
                             action.verdict === 'dismissed' ? 'Action Dismissed' :
                             formatStatus(action.verdict)}
                          </Badge>
                        </p>
                        {action.verdict_details && (
                          <div>
                            <strong>Details:</strong>
                            <div className="bg-white p-2 rounded mt-1">
                              {action.verdict_details}
                            </div>
                          </div>
                        )}
                        {action.verdict_issued_at && (
                          <p><strong>Issued:</strong> {formatDateTime(action.verdict_issued_at)}</p>
                        )}
                      </Alert>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : (
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            No disciplinary actions have been issued for this report yet.
          </Alert>
        )}
      </>
    )}
  </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReportDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManagerDisciplinaryManagement;
