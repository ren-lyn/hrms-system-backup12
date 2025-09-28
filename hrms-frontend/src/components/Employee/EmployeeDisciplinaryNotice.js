import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Badge, 
  Alert, 
  Spinner, 
  Modal,
  Button,
  Form,
  Row,
  Col,
  InputGroup,
  Pagination
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  getMyActions,
  getMyAction,
  submitExplanation,
  getDashboardStats,
  formatStatus,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  formatDate,
  formatDateTime
} from '../../api/disciplinary';

const EmployeeDisciplinaryNotice = () => {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedAction, setSelectedAction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submittingExplanation, setSubmittingExplanation] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [statusFilter, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActions(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading disciplinary data:', error);
      toast.error('Failed to load disciplinary information');
    } finally {
      setLoading(false);
    }
  };

  const loadActions = async () => {
    try {
      const params = {
        page: currentPage
      };
      
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await getMyActions(params);
      setActions(response.data.data || []);
    } catch (error) {
      console.error('Error loading disciplinary actions:', error);
      toast.error('Failed to load disciplinary actions');
    }
  };

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const handleViewDetails = async (action) => {
    try {
      const response = await getMyAction(action.id);
      setSelectedAction(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading action details:', error);
      toast.error('Failed to load action details');
    }
  };

  const handleSubmitExplanation = (action) => {
    setSelectedAction(action);
    // Pre-populate with existing explanation if available (for updates)
    setExplanation(action.employee_explanation || '');
    setShowExplanationModal(true);
  };

  const submitEmployeeExplanation = async () => {
    if (!explanation.trim()) {
      toast.error('Please provide an explanation');
      return;
    }

    try {
      setSubmittingExplanation(true);
      const response = await submitExplanation(selectedAction.id, { explanation: explanation.trim() });
      
      if (response.data.success) {
        toast.success('Explanation submitted successfully');
        setShowExplanationModal(false);
        setExplanation('');
        
        // Update the local action state immediately to prevent UI lag
        setActions(prevActions => 
          prevActions.map(action => 
            action.id === selectedAction.id 
              ? { ...action, employee_explanation: explanation.trim(), status: 'explanation_submitted' }
              : action
          )
        );
        
        // Also update selected action if it's in detail view
        if (selectedAction) {
          setSelectedAction(prev => ({
            ...prev,
            employee_explanation: explanation.trim(),
            status: 'explanation_submitted'
          }));
        }
        
        // Reload data to get server state
        loadData();
      }
    } catch (error) {
      console.error('Error submitting explanation:', error);
      
      // Better error handling with more specific messages
      if (error.response?.status === 400) {
        const message = error.response.data.message || 'Cannot submit explanation at this time';
        toast.error(message);
      } else if (error.response?.status === 422) {
        // Show validation errors if available
        const errors = error.response.data?.errors;
        if (errors && errors.explanation) {
          toast.error('Explanation error: ' + errors.explanation[0]);
        } else {
          toast.error('Please check your explanation and try again');
        }
      } else if (error.response?.status === 500) {
        const message = error.response.data.message || 'Server error occurred';
        toast.error('Server Error: ' + message);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to submit explanation. Please try again.');
      }
    } finally {
      setSubmittingExplanation(false);
    }
  };

  const getActionTypeDisplay = (actionType) => {
    return actionType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading disciplinary information...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header and Stats */}
      <div className="mb-4">
        <h4 className="fw-bold text-primary mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          My Disciplinary Actions
        </h4>
        
        {Object.keys(stats).length > 0 && (
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center border-warning">
                <Card.Body>
                  <h3 className="text-warning">{stats.pending_explanations || 0}</h3>
                  <p className="mb-0 small">Pending Explanations</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-info">
                <Card.Body>
                  <h3 className="text-info">{stats.under_investigation || 0}</h3>
                  <p className="mb-0 small">Under Investigation</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-success">
                <Card.Body>
                  <h3 className="text-success">{stats.completed_actions || 0}</h3>
                  <p className="mb-0 small">Completed Actions</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-danger">
                <Card.Body>
                  <h3 className="text-danger">{stats.overdue_explanations || 0}</h3>
                  <p className="mb-0 small">Overdue Explanations</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {stats.overdue_explanations > 0 && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Urgent:</strong> You have {stats.overdue_explanations} overdue explanation(s) that require immediate attention.
          </Alert>
        )}
      </div>

      <Card className="shadow-sm">
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Disciplinary Actions
              </h5>
            </Col>
            <Col xs="auto">
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '200px' }}
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
          </Row>
        </Card.Header>
        
        <Card.Body>
          {actions.length === 0 ? (
            <Alert variant="info" className="text-center py-4">
              <i className="fas fa-info-circle me-2"></i>
              {statusFilter === 'all' 
                ? 'No disciplinary actions found. You currently have a clean record!'
                : `No disciplinary actions found with status "${formatStatus(statusFilter)}".`
              }
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Action ID</th>
                    <th>Action Type</th>
                    <th>Violation</th>
                    <th>Status</th>
                    <th>Effective Date</th>
                    <th>Issued Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(action => (
                    <tr key={action.id}>
                      <td>
                        <strong>DA-{action.id}</strong>
                      </td>
                      <td>
                        <Badge bg="primary">
                          {getActionTypeDisplay(action.action_type)}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          {action.disciplinary_report?.disciplinary_category ? (
                            <Badge bg={getSeverityColor(action.disciplinary_report.disciplinary_category.severity_level)}>
                              {action.disciplinary_report.disciplinary_category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                          {action.is_repeat_violation && (
                            <Badge bg="warning" size="sm" className="mt-1">
                              <i className="fas fa-exclamation-triangle me-1"></i>
                              Repeat ({action.violation_ordinal})
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg={getStatusColor(action.status)}>
                          {formatStatus(action.status)}
                        </Badge>
                      </td>
                      <td>{formatDate(action.effective_date)}</td>
                      <td>{formatDate(action.created_at)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleViewDetails(action)}
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </Button>
                          
                          {/* Show Explain button for actions that can accept explanations */}
                          {(['explanation_requested', 'action_issued', 'under_investigation'].includes(action.status) && 
                           (!action.employee_explanation || action.status === 'explanation_requested')) && (
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => handleSubmitExplanation(action)}
                              title={action.employee_explanation ? 'Update your explanation' : 'Submit your explanation'}
                            >
                              <i className="fas fa-edit me-1"></i>
                              {action.employee_explanation ? 'Update' : 'Explain'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Disciplinary Action Details - DA-{selectedAction?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAction && (
            <div>
              <Row>
                <Col md={6}>
                  <h6><i className="fas fa-gavel me-2"></i>Action Information</h6>
                  <p><strong>Type:</strong> {getActionTypeDisplay(selectedAction.action_type)}</p>
                  <p><strong>Status:</strong> 
                    <Badge bg={getStatusColor(selectedAction.status)} className="ms-2">
                      {formatStatus(selectedAction.status)}
                    </Badge>
                  </p>
                  <p><strong>Effective Date:</strong> {formatDate(selectedAction.effective_date)}</p>
                  <p><strong>Issued Date:</strong> {formatDate(selectedAction.created_at)}</p>
                </Col>
                <Col md={6}>
                  <h6><i className="fas fa-user-tie me-2"></i>Issued By</h6>
                  <p><strong>Name:</strong> {selectedAction.issued_by?.first_name} {selectedAction.issued_by?.last_name}</p>
                  <p><strong>Position:</strong> {selectedAction.issued_by?.position}</p>
                  
                  {selectedAction.investigator && (
                    <div className="mt-3">
                      <h6><i className="fas fa-search me-2"></i>Investigator</h6>
                      <p><strong>Name:</strong> {selectedAction.investigator.first_name} {selectedAction.investigator.last_name}</p>
                      <p><strong>Position:</strong> {selectedAction.investigator.position}</p>
                    </div>
                  )}
                </Col>
              </Row>

              <hr />

              <h6><i className="fas fa-file-alt me-2"></i>Action Details</h6>
              <div className="bg-light p-3 rounded">
                <p className="mb-0">{selectedAction.action_details || 'No additional details provided.'}</p>
              </div>

              {selectedAction.disciplinary_report && (
                <div className="mt-4">
                  <h6><i className="fas fa-exclamation-triangle me-2"></i>Related Violation</h6>
                  <p><strong>Category:</strong> {selectedAction.disciplinary_report.disciplinary_category?.name}</p>
                  <p><strong>Incident Date:</strong> {formatDate(selectedAction.incident_date)}</p>
                  <div className="bg-light p-3 rounded">
                    <strong>Violation Description:</strong>
                    <p className="mb-0 mt-1">{selectedAction.violation}</p>
                  </div>
                  
                  {/* Repeated Violation Notice */}
                  {selectedAction.is_repeat_violation && (
                    <Alert variant="warning" className="mt-3">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                        <div>
                          <strong>Repeat Violation Notice</strong>
                          <p className="mb-2">{selectedAction.violation_warning_message}</p>
                          <div className="mt-2">
                            <strong>Your previous violations in this category:</strong>
                            <ul className="mb-0 mt-1">
                              {selectedAction.previous_violations?.slice(0, 3).map((violation, index) => (
                                <li key={violation.id}>
                                  Report #{violation.report_number} - {formatDate(violation.incident_date)} 
                                  ({formatStatus(violation.status)})
                                </li>
                              ))}
                              {selectedAction.previous_violations?.length > 3 && (
                                <li>...and {selectedAction.previous_violations.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}
                </div>
              )}

              {selectedAction.employee_explanation && (
                <div className="mt-4">
                  <h6><i className="fas fa-comment me-2"></i>Your Explanation</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-1">{selectedAction.employee_explanation}</p>
                    <small className="text-muted">
                      Submitted on: {formatDateTime(selectedAction.explanation_submitted_at)}
                    </small>
                  </div>
                </div>
              )}

              {selectedAction.investigation_notes && (
                <div className="mt-4">
                  <h6><i className="fas fa-clipboard-check me-2"></i>Investigation Notes</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-0">{selectedAction.investigation_notes}</p>
                  </div>
                </div>
              )}

              {selectedAction.hr_verdict && (
                <div className="mt-4">
                  <h6><i className="fas fa-balance-scale me-2"></i>Final Verdict</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-1">{selectedAction.hr_verdict}</p>
                    <small className="text-muted">
                      Issued on: {formatDateTime(selectedAction.verdict_date)}
                    </small>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
          
          {/* Show explanation button for actions that can accept explanations */}
          {(['explanation_requested', 'action_issued', 'under_investigation'].includes(selectedAction?.status) && 
           (!selectedAction?.employee_explanation || selectedAction?.status === 'explanation_requested')) && (
            <Button 
              variant="warning" 
              onClick={() => {
                setShowDetailModal(false);
                handleSubmitExplanation(selectedAction);
              }}
            >
              <i className="fas fa-edit me-1"></i>
              {selectedAction?.employee_explanation ? 'Update Explanation' : 'Submit Explanation'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Explanation Modal */}
      <Modal show={showExplanationModal} onHide={() => setShowExplanationModal(false)} size="lg">
        <Modal.Header closeButton>
        <Modal.Title>
            {selectedAction?.employee_explanation ? 'Update' : 'Submit'} Explanation - DA-{selectedAction?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAction && (
            <div>
              <Alert variant="warning">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Important:</strong> You are required to provide {selectedAction?.employee_explanation ? 'an updated' : 'an'} explanation for this disciplinary action. 
                Please be thorough and honest in your response.
              </Alert>

              <div className="mb-4">
                <h6>Action Details:</h6>
                <p><strong>Type:</strong> {getActionTypeDisplay(selectedAction.action_type)}</p>
                <p><strong>Violation:</strong> {selectedAction.violation}</p>
              </div>

              <Form.Group>
                <Form.Label><strong>Your Explanation *</strong></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Please provide a detailed explanation of the incident from your perspective. Include any relevant context, circumstances, or factors that should be considered..."
                />
                <Form.Text className="text-muted">
                  This explanation will be reviewed as part of the disciplinary process. 
                  Take your time to provide a complete and accurate response.
                </Form.Text>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExplanationModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={submitEmployeeExplanation}
            disabled={submittingExplanation || !explanation.trim()}
          >
            {submittingExplanation ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane me-2"></i>
                {selectedAction?.employee_explanation ? 'Update Explanation' : 'Submit Explanation'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeDisciplinaryNotice;