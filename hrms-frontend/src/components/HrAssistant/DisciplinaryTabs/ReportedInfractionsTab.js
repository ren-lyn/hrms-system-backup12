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
  getAllReports,
  getReport,
  markReportAsReviewed,
  issueAction,
  issueVerdict,
  getAvailableInvestigators,
  formatStatus,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  formatDate,
  formatDateTime,
  formatVerdict,
  getDetailedStatus
} from '../../../api/disciplinary';

const ReportedInfractionsTab = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [investigators, setInvestigators] = useState([]);
  
  // Verdict form state
  const [verdictForm, setVerdictForm] = useState({
    verdict: 'uphold',
    verdict_details: ''
  });
  const [verdictFormErrors, setVerdictFormErrors] = useState({});
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Action form state
  const [actionForm, setActionForm] = useState({
    action_type: 'verbal_warning',
    action_details: '',
    effective_date: '',
    investigator_id: '',
    incident_date: '',
    violation: ''
  });

  const [actionFormErrors, setActionFormErrors] = useState({});

  const actionTypeOptions = [
    { value: 'verbal_warning', label: 'Verbal Warning' },
    { value: 'written_warning', label: 'Written Warning' },
    { value: 'final_warning', label: 'Final Warning' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'demotion', label: 'Demotion' },
    { value: 'termination', label: 'Termination' },
    { value: 'training', label: 'Mandatory Training' },
    { value: 'counseling', label: 'Counseling' }
  ];

  useEffect(() => {
    loadReports();
    loadInvestigators();
  }, [currentPage, searchTerm, statusFilter, priorityFilter, severityFilter, dateFrom, dateTo]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        severity: severityFilter,
        date_from: dateFrom,
        date_to: dateTo
      };

      const response = await getAllReports(params);
      setReports(response.data.data.data || []);
      setTotalPages(response.data.data.last_page || 1);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load disciplinary reports');
    } finally {
      setLoading(false);
    }
  };

  const loadInvestigators = async () => {
    try {
      const response = await getAvailableInvestigators();
      setInvestigators(response.data.data || []);
    } catch (error) {
      console.error('Error loading investigators:', error);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await getReport(reportId);
      console.log('Report details loaded:', response.data.data);
      console.log('Disciplinary Category:', response.data.data.disciplinary_category);
      console.log('Disciplinary Actions:', response.data.data.disciplinary_actions);
      setSelectedReport(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading report details:', error);
      toast.error('Failed to load report details');
    }
  };

  const handleIssueAction = (report) => {
    setSelectedReport(report);
    setActionForm({
      action_type: 'verbal_warning',
      action_details: '',
      effective_date: new Date().toISOString().split('T')[0],
      investigator_id: '',
      incident_date: report.incident_date,
      violation: report.incident_description
    });
    setActionFormErrors({});
    setShowActionModal(true);
  };

  const handleMarkAsReviewed = async (reportId) => {
    const notes = prompt('Add review notes (optional):');
    try {
      await markReportAsReviewed(reportId, { hr_notes: notes });
      toast.success('Report marked as reviewed');
      loadReports();
    } catch (error) {
      console.error('Error marking report as reviewed:', error);
      toast.error('Failed to mark report as reviewed');
    }
  };

  const validateActionForm = () => {
    const errors = {};
    
    if (!actionForm.action_type) {
      errors.action_type = 'Action type is required';
    }
    
    if (!actionForm.action_details.trim()) {
      errors.action_details = 'Action details are required';
    }
    
    if (!actionForm.effective_date) {
      errors.effective_date = 'Effective date is required';
    }
    
    if (!actionForm.incident_date) {
      errors.incident_date = 'Incident date is required';
    }
    
    if (!actionForm.violation.trim()) {
      errors.violation = 'Violation description is required';
    }

    setActionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    
    if (!validateActionForm()) return;

    try {
      const actionData = {
        disciplinary_report_id: selectedReport.id,
        employee_id: selectedReport.employee.id,
        ...actionForm
      };

      await issueAction(actionData);
      toast.success('Disciplinary action issued successfully');
      setShowActionModal(false);
      loadReports();
    } catch (error) {
      console.error('Error issuing disciplinary action:', error);
      if (error.response?.data?.errors) {
        setActionFormErrors(error.response.data.errors);
      } else {
        toast.error('Failed to issue disciplinary action');
      }
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };
  
  const handleIssueVerdict = (action, verdict) => {
    setSelectedAction(action);
    setVerdictForm({
      verdict: verdict,
      verdict_details: ''
    });
    setVerdictFormErrors({});
    setShowVerdictModal(true);
  };
  
  const validateVerdictForm = () => {
    const errors = {};
    
    if (!verdictForm.verdict) {
      errors.verdict = 'Verdict is required';
    }
    
    if (!verdictForm.verdict_details.trim()) {
      errors.verdict_details = 'Verdict details are required';
    }
    
    setVerdictFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmitVerdict = async (e) => {
    e.preventDefault();
    
    if (!validateVerdictForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setSubmittingVerdict(true);
      await issueVerdict(selectedAction.id, verdictForm);
      
      const verdictText = verdictForm.verdict === 'uphold' ? 'upheld' : 'dismissed';
      toast.success(`Disciplinary action ${verdictText} successfully`);
      
      setShowVerdictModal(false);
      
      // Refresh the current report to show updated data
      if (selectedReport) {
        const response = await getReport(selectedReport.id);
        setSelectedReport(response.data.data);
      }
      
      loadReports();
    } catch (error) {
      console.error('Error issuing verdict:', error);
      
      if (error.response?.data?.errors) {
        setVerdictFormErrors(error.response.data.errors);
        toast.error('Please check the form for errors');
      } else {
        toast.error('Failed to issue verdict');
      }
    } finally {
      setSubmittingVerdict(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Reported Employee Infractions & Violations
              </h5>
            </Col>
            <Col xs="auto">
              <Badge bg="info">
                Total Reports: {reports.length}
              </Badge>
            </Col>
          </Row>
        </Card.Header>
        
        <Card.Body>
          {/* Filters */}
          <Row className="mb-3">
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="severe">Severe</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                type="date"
                placeholder="Date From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Col>
            <Col md={1}>
              <Button variant="outline-secondary" onClick={resetFilters} size="sm">
                <i className="fas fa-undo"></i>
              </Button>
            </Col>
          </Row>

          {/* Date To Filter */}
          <Row className="mb-3">
            <Col md={2} className="offset-md-8">
              <Form.Control
                type="date"
                placeholder="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Col>
          </Row>

          {/* Table */}
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : reports.length === 0 ? (
            <Alert variant="info" className="text-center">
              <i className="fas fa-info-circle me-2"></i>
              No disciplinary reports found with the current filters.
            </Alert>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Report #</th>
                      <th>Employee</th>
                      <th>Violation</th>
                      <th>Severity</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Incident Date</th>
                      <th>Reported By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.report_number}</strong>
                        </td>
                        <td>
                          <div>
                            <strong>
                              {report.employee?.first_name} {report.employee?.last_name}
                            </strong>
                            <br />
                            <small className="text-muted">
                              ID: {report.employee?.employee_id}
                            </small>
                            <br />
                            <small className="text-muted">
                              {report.employee?.department}
                            </small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getSeverityColor(report.disciplinary_category?.severity_level)}>
                            {report.disciplinary_category?.name}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getSeverityColor(report.disciplinary_category?.severity_level)}>
                            {report.disciplinary_category?.severity_level}
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
                        <td>
                          <div>
                            <strong>
                              {report.reporter?.first_name} {report.reporter?.last_name}
                            </strong>
                            <br />
                            <small className="text-muted">
                              {report.reporter?.position}
                            </small>
                          </div>
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-primary" size="sm">
                              Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleViewReport(report.id)}>
                                <i className="fas fa-eye me-2"></i>
                                View Details
                              </Dropdown.Item>
                              {report.status === 'reported' && (
                                <Dropdown.Item onClick={() => handleMarkAsReviewed(report.id)}>
                                  <i className="fas fa-check me-2"></i>
                                  Mark as Reviewed
                                </Dropdown.Item>
                              )}
                              {['reported', 'under_review'].includes(report.status) && (
                                <Dropdown.Item onClick={() => handleIssueAction(report)}>
                                  <i className="fas fa-gavel me-2"></i>
                                  Issue Action
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

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
            </>
          )}
        </Card.Body>
      </Card>

      {/* Report Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Report Details - {selectedReport?.report_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <Row>
              <Col md={6}>
                <h6>Employee Information</h6>
                <p><strong>Name:</strong> {selectedReport.employee?.first_name} {selectedReport.employee?.last_name}</p>
                <p><strong>Employee ID:</strong> {selectedReport.employee?.employee_id}</p>
                <p><strong>Department:</strong> {selectedReport.employee?.department}</p>
                <p><strong>Position:</strong> {selectedReport.employee?.position}</p>
                
                <h6 className="mt-4">Reporter Information</h6>
                <p><strong>Name:</strong> {selectedReport.reporter?.first_name} {selectedReport.reporter?.last_name}</p>
                <p><strong>Position:</strong> {selectedReport.reporter?.position}</p>
              </Col>
              <Col md={6}>
                <h6>Incident Details</h6>
                <p><strong>Category:</strong> 
                  {selectedReport.disciplinary_category?.name || 
                   (selectedReport.disciplinary_actions && selectedReport.disciplinary_actions.length > 0 ? 
                     selectedReport.disciplinary_actions[0].disciplinaryReport?.disciplinaryCategory?.name : null) ||
                   'Attendance issues'}
                </p>
                <p><strong>Severity:</strong> 
                  <Badge bg={getSeverityColor(
                    selectedReport.disciplinary_category?.severity_level || 
                    (selectedReport.disciplinary_actions && selectedReport.disciplinary_actions.length > 0 ? 
                      selectedReport.disciplinary_actions[0].disciplinaryReport?.disciplinaryCategory?.severity_level : null) ||
                    'minor'
                  )} className="ms-2">
                    {selectedReport.disciplinary_category?.severity_level || 
                     (selectedReport.disciplinary_actions && selectedReport.disciplinary_actions.length > 0 ? 
                       selectedReport.disciplinary_actions[0].disciplinaryReport?.disciplinaryCategory?.severity_level : null) ||
                     'Not specified'}
                  </Badge>
                </p>
                <p><strong>Priority:</strong> 
                  <Badge bg={getPriorityColor(selectedReport.priority)} className="ms-2">
                    {selectedReport.priority || 'medium'}
                  </Badge>
                </p>
                <p><strong>Incident Date:</strong> {formatDate(selectedReport.incident_date)}</p>
                <p><strong>Status:</strong> 
                  <Badge bg={getStatusColor(selectedReport.status)} className="ms-2">
                    {formatStatus(selectedReport.status)}
                  </Badge>
                </p>
              </Col>
              <Col xs={12}>
                <h6>Incident Description</h6>
                <p>{selectedReport.incident_description}</p>
                
                {/* Repeated Violation Alert */}
                {selectedReport.is_repeat_violation && (
                  <Alert variant="warning" className="mb-4">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                      <div>
                        <strong>Repeat Violation Alert!</strong>
                        <p className="mb-2">{selectedReport.violation_warning_message}</p>
                        <div className="mt-2">
                          <strong>Previous violations for this category:</strong>
                          <ul className="mb-0 mt-1">
                            {selectedReport.previous_violations?.slice(0, 3).map((violation, index) => (
                              <li key={violation.id}>
                                Report #{violation.report_number} - {formatDate(violation.incident_date)} 
                                ({formatStatus(violation.status)})
                              </li>
                            ))}
                            {selectedReport.previous_violations?.length > 3 && (
                              <li>...and {selectedReport.previous_violations.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {selectedReport.evidence && (
                  <>
                    <h6>Evidence</h6>
                    <p>{selectedReport.evidence}</p>
                  </>
                )}
                
                {selectedReport.witnesses && selectedReport.witnesses.length > 0 && (
                  <>
                    <h6>Witnesses</h6>
                    <ul>
                      {selectedReport.witnesses.map((witness, index) => (
                        <li key={index}>
                          {witness.name} {witness.contact && `- ${witness.contact}`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                
                {selectedReport.hr_notes && (
                  <>
                    <h6>HR Notes</h6>
                    <p>{selectedReport.hr_notes}</p>
                  </>
                )}
                
                {/* Disciplinary Actions Section */}
                {selectedReport.disciplinary_actions && selectedReport.disciplinary_actions.length > 0 && (
                  <div className="mt-4">
                    <hr />
                    <h5><i className="fas fa-gavel me-2"></i>Disciplinary Actions Taken</h5>
                    {selectedReport.disciplinary_actions.map((action, index) => (
                      <Card key={action.id} className="mb-3 border-start border-primary border-3">
                        <Card.Header className="bg-light">
                          <Row className="align-items-center">
                            <Col>
                              <h6 className="mb-0">
                                <Badge bg="primary" className="me-2">DA-{action.id}</Badge>
                                {action.action_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h6>
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
                              <p><strong>Effective Date:</strong> {formatDate(action.effective_date)}</p>
                              <p><strong>Issued By:</strong> {action.issued_by?.first_name} {action.issued_by?.last_name}</p>
                              <p><strong>Issued Date:</strong> {formatDate(action.created_at)}</p>
                              {action.investigator && (
                                <p><strong>Investigator:</strong> {action.investigator.first_name} {action.investigator.last_name}</p>
                              )}
                              {action.due_date && (
                                <p><strong>Explanation Due:</strong> {formatDate(action.due_date)}</p>
                              )}
                            </Col>
                            <Col md={6}>
                              <h6>Action Details:</h6>
                              <div className="bg-light p-2 rounded">
                                <small>{action.action_details || 'No additional details provided.'}</small>
                              </div>
                              
                              {/* Violation Category Information */}
                              {(action.disciplinaryReport?.disciplinaryCategory || selectedReport?.disciplinary_category) && (
                                <div className="mt-3">
                                  <h6>Violation Category:</h6>
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge bg={getSeverityColor((action.disciplinaryReport?.disciplinaryCategory?.severity_level || selectedReport?.disciplinary_category?.severity_level))} className="me-2">
                                      {action.disciplinaryReport?.disciplinaryCategory?.name || selectedReport?.disciplinary_category?.name || 'Attendance issues'}
                                    </Badge>
                                    <Badge bg={getSeverityColor((action.disciplinaryReport?.disciplinaryCategory?.severity_level || selectedReport?.disciplinary_category?.severity_level))} variant="outline">
                                      Severity: {action.disciplinaryReport?.disciplinaryCategory?.severity_level || selectedReport?.disciplinary_category?.severity_level || 'Not specified'}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              
                              {/* Incident Description */}
                              <div className="mt-2">
                                <h6>Violation/Incident Description:</h6>
                                <div className="bg-light p-2 rounded">
                                  <small>
                                    {/* Prioritize proper incident description over debug strings */}
                                    {action.disciplinaryReport?.incident_description || 
                                     selectedReport?.incident_description || 
                                     (action.violation && !action.violation.includes('jkbasdfhdjfb') ? action.violation : 'No description available')}
                                  </small>
                                </div>
                              </div>
                            </Col>
                          </Row>
                          
                          {/* Repeated Violation Alert for Individual Actions */}
                          {action.is_repeat_violation && (
                            <Alert variant="warning" className="mt-3 mb-3">
                              <div className="d-flex align-items-start">
                                <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                                <div>
                                  <strong>Repeat Violation Detected!</strong>
                                  <p className="mb-2">{action.violation_warning_message}</p>
                                  <div className="mt-2">
                                    <strong>Previous violations for this category:</strong>
                                    <ul className="mb-0 mt-1">
                                      {action.previous_violations?.slice(0, 3).map((violation, index) => (
                                        <li key={violation.id}>
                                          Report #{violation.report_number} - {formatDate(violation.incident_date)} 
                                          ({formatStatus(violation.status)})
                                        </li>
                                      ))}
                                      {action.previous_violations?.length > 3 && (
                                        <li>...and {action.previous_violations.length - 3} more</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </Alert>
                          )}
                          
                          {/* Employee Explanation Section */}
                          {action.employee_explanation && (
                            <div className="mt-3">
                              <h6><i className="fas fa-comment text-info me-2"></i>Employee Explanation</h6>
                              <Alert variant="info" className="mb-2">
                                <div className="mb-2">
                                  <strong>Submitted:</strong> {formatDateTime(action.explanation_submitted_at)}
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  {action.employee_explanation}
                                </div>
                              </Alert>
                            </div>
                          )}
                          
                          {/* Investigation Details Section */}
                          {(action.investigation_notes || action.investigation_findings || action.investigation_recommendation) && (
                            <div className="mt-3">
                              <h6><i className="fas fa-search text-warning me-2"></i>Investigation Details</h6>
                              <Alert variant="warning" className="mb-2">
                                {action.investigation_completed_at && (
                                  <div className="mb-2">
                                    <strong>Completed:</strong> {formatDateTime(action.investigation_completed_at)}
                                  </div>
                                )}
                                
                                {action.investigation_notes && (
                                  <div className="mb-3">
                                    <strong>Investigation Notes:</strong>
                                    <div className="bg-white p-3 rounded border mt-1">
                                      {action.investigation_notes}
                                    </div>
                                  </div>
                                )}
                                
                                {action.investigation_findings && (
                                  <div className="mb-3">
                                    <strong>Findings:</strong>
                                    <div className="bg-white p-3 rounded border mt-1">
                                      {action.investigation_findings}
                                    </div>
                                  </div>
                                )}
                                
                                {action.investigation_recommendation && (
                                  <div className="mb-0">
                                    <strong>Recommendation:</strong>
                                    <div className="bg-white p-3 rounded border mt-1">
                                      {action.investigation_recommendation}
                                    </div>
                                  </div>
                                )}
                              </Alert>
                            </div>
                          )}
                          
                          {/* HR Verdict Decision Section */}
                          {action.status === 'awaiting_verdict' && action.investigation_notes && !action.verdict && (
                            <div className="mt-3">
                              <Card className="border-warning">
                                <Card.Header className="bg-warning text-dark">
                                  <h6 className="mb-0">
                                    <i className="fas fa-balance-scale me-2"></i>
                                    HR Verdict Required
                                  </h6>
                                </Card.Header>
                                <Card.Body>
                                  <Alert variant="warning" className="mb-3">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    This case is ready for your verdict. Both employee explanation and investigation have been completed.
                                  </Alert>
                                  
                                  <Button
                                    variant="success"
                                    className="me-2 mb-2"
                                    onClick={() => handleIssueVerdict(action, 'uphold')}
                                  >
                                    <i className="fas fa-gavel me-2"></i>
                                    Uphold Action
                                  </Button>
                                  
                                  <Button
                                    variant="secondary"
                                    className="mb-2"
                                    onClick={() => handleIssueVerdict(action, 'dismiss')}
                                  >
                                    <i className="fas fa-times me-2"></i>
                                    Dismiss Action
                                  </Button>
                                  
                                  <div className="mt-2">
                                    <small className="text-muted">
                                      <strong>Uphold:</strong> Confirm the disciplinary action stands as issued<br/>
                                      <strong>Dismiss:</strong> Cancel the disciplinary action due to insufficient evidence or procedural issues
                                    </small>
                                  </div>
                                </Card.Body>
                              </Card>
                            </div>
                          )}
                          
                          {/* Final Verdict Section */}
                          {action.verdict && (
                            <div className="mt-3">
                              <h6><i className="fas fa-balance-scale text-success me-2"></i>Final Verdict</h6>
                              <Alert variant="success" className="mb-0">
                                <div className="mb-2">
                                  <strong>Verdict:</strong> 
                                  <Badge bg="success" className="ms-2">
                                    {formatVerdict(action.verdict)}
                                  </Badge>
                                </div>
                                {action.verdict_issued_at && (
                                  <div className="mb-2">
                                    <strong>Issued:</strong> {formatDateTime(action.verdict_issued_at)}
                                  </div>
                                )}
                                {action.verdict_details && (
                                  <div>
                                    <strong>Details:</strong>
                                    <div className="bg-white p-3 rounded border mt-1">
                                      {action.verdict_details}
                                    </div>
                                  </div>
                                )}
                              </Alert>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
                
                {/* No Actions Message */}
                {(!selectedReport.disciplinary_actions || selectedReport.disciplinary_actions.length === 0) && (
                  <div className="mt-4">
                    <hr />
                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      No disciplinary actions have been issued for this report yet.
                    </Alert>
                  </div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
          {selectedReport && ['reported', 'under_review'].includes(selectedReport.status) && (
            <Button variant="primary" onClick={() => {
              setShowDetailModal(false);
              handleIssueAction(selectedReport);
            }}>
              Issue Disciplinary Action
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Issue Action Modal */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Issue Disciplinary Action
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitAction}>
          <Modal.Body>
            {selectedReport && (
              <>
                <Alert variant="info">
                  <strong>Employee:</strong> {selectedReport.employee?.first_name} {selectedReport.employee?.last_name} ({selectedReport.employee?.employee_id})
                  <br />
                  <strong>Report:</strong> {selectedReport.report_number} - {selectedReport.disciplinary_category?.name}
                </Alert>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Action Type *</Form.Label>
                      <Form.Select
                        value={actionForm.action_type}
                        onChange={(e) => setActionForm(prev => ({ ...prev, action_type: e.target.value }))}
                        isInvalid={!!actionFormErrors.action_type}
                      >
                        {actionTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {actionFormErrors.action_type}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Effective Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={actionForm.effective_date}
                        onChange={(e) => setActionForm(prev => ({ ...prev, effective_date: e.target.value }))}
                        isInvalid={!!actionFormErrors.effective_date}
                      />
                      <Form.Control.Feedback type="invalid">
                        {actionFormErrors.effective_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Assign Investigator (Optional)</Form.Label>
                  <Form.Select
                    value={actionForm.investigator_id}
                    onChange={(e) => setActionForm(prev => ({ ...prev, investigator_id: e.target.value }))}
                  >
                    <option value="">No investigator assigned</option>
                    {investigators.map(investigator => (
                      <option key={investigator.id} value={investigator.id}>
                        {investigator.first_name} {investigator.last_name} - {investigator.position}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Action Details *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={actionForm.action_details}
                    onChange={(e) => setActionForm(prev => ({ ...prev, action_details: e.target.value }))}
                    isInvalid={!!actionFormErrors.action_details}
                    placeholder="Provide detailed description of the disciplinary action..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {actionFormErrors.action_details}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Incident Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={actionForm.incident_date}
                        onChange={(e) => setActionForm(prev => ({ ...prev, incident_date: e.target.value }))}
                        isInvalid={!!actionFormErrors.incident_date}
                      />
                      <Form.Control.Feedback type="invalid">
                        {actionFormErrors.incident_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Violation Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={actionForm.violation}
                    onChange={(e) => setActionForm(prev => ({ ...prev, violation: e.target.value }))}
                    isInvalid={!!actionFormErrors.violation}
                    placeholder="Describe the violation in detail..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {actionFormErrors.violation}
                  </Form.Control.Feedback>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-gavel me-2"></i>
              Issue Disciplinary Action
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Verdict Modal */}
      <Modal show={showVerdictModal} onHide={() => setShowVerdictModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-balance-scale me-2"></i>
            Issue Final Verdict - DA-{selectedAction?.id}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitVerdict}>
          <Modal.Body>
            {selectedAction && (
              <>
                <Alert variant="info">
                  <strong>Employee:</strong> {selectedReport?.employee?.first_name} {selectedReport?.employee?.last_name} ({selectedReport?.employee?.employee_id})
                  <br />
                  <strong>Action Type:</strong> {selectedAction.action_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <br />
                  <strong>Current Status:</strong> <Badge bg={getStatusColor(selectedAction.status)}>{formatStatus(selectedAction.status)}</Badge>
                </Alert>

                <Alert variant="warning" className="mb-4">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Review Summary:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Employee explanation: {selectedAction.employee_explanation ? 'Submitted' : 'Not provided'}</li>
                    <li>Investigation: {selectedAction.investigation_notes ? 'Completed' : 'Not completed'}</li>
                    <li>Manager recommendation: {selectedAction.investigation_recommendation ? 'Provided' : 'None'}</li>
                  </ul>
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label><strong>Verdict Decision *</strong></Form.Label>
                  <div className="d-flex gap-3 mb-2">
                    <Form.Check
                      type="radio"
                      id="verdict-uphold"
                      name="verdict"
                      label="Uphold Action"
                      value="uphold"
                      checked={verdictForm.verdict === 'uphold'}
                      onChange={(e) => setVerdictForm(prev => ({ ...prev, verdict: e.target.value }))}
                      className="d-flex align-items-center"
                    />
                    <Form.Check
                      type="radio"
                      id="verdict-dismiss"
                      name="verdict"
                      label="Dismiss Action"
                      value="dismiss"
                      checked={verdictForm.verdict === 'dismiss'}
                      onChange={(e) => setVerdictForm(prev => ({ ...prev, verdict: e.target.value }))}
                      className="d-flex align-items-center"
                    />
                  </div>
                  {verdictFormErrors.verdict && (
                    <div className="text-danger small">{verdictFormErrors.verdict}</div>
                  )}
                  
                  <div className="small text-muted mt-2">
                    <strong>Uphold:</strong> The disciplinary action is confirmed and will remain on the employee's record.<br/>
                    <strong>Dismiss:</strong> The disciplinary action is cancelled and will not appear on the employee's record.
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label><strong>Verdict Details & Reasoning *</strong></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={verdictForm.verdict_details}
                    onChange={(e) => setVerdictForm(prev => ({ ...prev, verdict_details: e.target.value }))}
                    isInvalid={!!verdictFormErrors.verdict_details}
                    placeholder="Provide detailed explanation of your verdict decision, including reasoning based on the evidence, employee explanation, and investigation findings..."
                  />
                  <Form.Control.Feedback type="invalid">
                    {verdictFormErrors.verdict_details}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    This will be part of the official record and may be reviewed during appeals.
                  </Form.Text>
                </Form.Group>

                <Alert variant="warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Important:</strong> This verdict is final and will complete the disciplinary process. 
                  The employee and relevant managers will be notified of this decision.
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVerdictModal(false)}>
              Cancel
            </Button>
            <Button 
              variant={verdictForm.verdict === 'uphold' ? 'success' : 'warning'} 
              type="submit"
              disabled={submittingVerdict}
            >
              {submittingVerdict ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <i className={`fas ${verdictForm.verdict === 'uphold' ? 'fa-gavel' : 'fa-times'} me-2`}></i>
                  {verdictForm.verdict === 'uphold' ? 'Uphold Action' : 'Dismiss Action'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default ReportedInfractionsTab;
