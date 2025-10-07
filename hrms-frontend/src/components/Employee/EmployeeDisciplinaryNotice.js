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
  downloadActionPdf,
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
      
      // Check cache first
      const cachedActions = localStorage.getItem('disciplinaryActions');
      const cachedStats = localStorage.getItem('disciplinaryStats');
      const cacheTime = localStorage.getItem('disciplinaryCacheTime');
      const now = Date.now();
      const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
      const isCacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes
      
      if (cachedActions && cachedStats && isCacheValid) {
        try {
          setActions(JSON.parse(cachedActions));
          setStats(JSON.parse(cachedStats));
          setLoading(false);
          
          // Still fetch fresh data in background
          fetchFreshData();
          return;
        } catch (e) {
          console.error('Error parsing cached disciplinary data:', e);
        }
      }
      
      // Fetch fresh data
      await fetchFreshData();
    } catch (error) {
      console.error('Error loading disciplinary data:', error);
      toast.error('Failed to load disciplinary information');
      setLoading(false);
    }
  };

  const fetchFreshData = async () => {
    try {
      await Promise.all([
        loadActions(),
        loadStats()
      ]);
      
      // Cache the data
      localStorage.setItem('disciplinaryActions', JSON.stringify(actions));
      localStorage.setItem('disciplinaryStats', JSON.stringify(stats));
      localStorage.setItem('disciplinaryCacheTime', Date.now().toString());
    } catch (error) {
      console.error('Error fetching fresh disciplinary data:', error);
      throw error;
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

  const handleDownloadPDF = async (actionId) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating PDF...');
      
      const response = await downloadActionPdf(actionId);
      
      // Check if the response is actually a PDF
      if (response.data.type === 'application/json') {
        // This means we got an error response in JSON format
        const reader = new FileReader();
        reader.onload = function() {
          const errorResponse = JSON.parse(reader.result);
          console.error('PDF Generation Error:', errorResponse);
          toast.dismiss(loadingToast);
          toast.error(errorResponse.message || 'Failed to generate PDF');
        };
        reader.readAsText(response.data);
        return;
      }
      
      // Success - handle PDF download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disciplinary_action_DA-${actionId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToast);
      toast.success('PDF downloaded successfully');
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      
      let errorMessage = 'Failed to download PDF';
      
      if (error.response?.status === 404) {
        errorMessage = 'Disciplinary action not found or access denied';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error while generating PDF. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
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
    <div className="responsive-container" style={{ padding: '20px' }}>
      {/* Header and Stats */}
      <div className="mb-4">
        <h4 className="fw-bold text-primary mb-3 text-responsive-lg">
          <i className="fas fa-exclamation-triangle me-2 hide-on-mobile"></i>
          My Disciplinary Actions
        </h4>
        
        {Object.keys(stats).length > 0 && (
          <div className="responsive-dashboard-grid mb-4" style={{ gap: '20px' }}>
            <div className="responsive-card text-center border-warning" style={{ marginBottom: '15px' }}>
              <div className="responsive-card-body">
                <h3 className="text-warning text-responsive-lg">{stats.pending_explanations || 0}</h3>
                <p className="mb-0 text-responsive-sm">Pending Explanations</p>
              </div>
            </div>
            <div className="responsive-card text-center border-info" style={{ marginBottom: '15px' }}>
              <div className="responsive-card-body">
                <h3 className="text-info text-responsive-lg">{stats.under_investigation || 0}</h3>
                <p className="mb-0 text-responsive-sm">Under Investigation</p>
              </div>
            </div>
            <div className="responsive-card text-center border-success" style={{ marginBottom: '15px' }}>
              <div className="responsive-card-body">
                <h3 className="text-success text-responsive-lg">{stats.completed_actions || 0}</h3>
                <p className="mb-0 text-responsive-sm">Completed Actions</p>
              </div>
            </div>
            <div className="responsive-card text-center border-danger" style={{ marginBottom: '15px' }}>
              <div className="responsive-card-body">
                <h3 className="text-danger text-responsive-lg">{stats.overdue_explanations || 0}</h3>
                <p className="mb-0 text-responsive-sm">Overdue Explanations</p>
              </div>
            </div>
          </div>
        )}

        {stats.overdue_explanations > 0 && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Urgent:</strong> You have {stats.overdue_explanations} overdue explanation(s) that require immediate attention.
          </Alert>
        )}
      </div>

      <div className="responsive-card shadow-sm" style={{ marginTop: '20px' }}>
        <div className="responsive-header">
          <div className="responsive-form-row align-items-center">
            <div className="responsive-form-col">
              <h5 className="mb-0 text-responsive-lg">
                <i className="fas fa-list me-2 hide-on-mobile"></i>
                Disciplinary Actions
              </h5>
            </div>
            <div className="responsive-form-col">
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="responsive-form-control"
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
            </div>
          </div>
        </div>
        
        <div className="responsive-card-body">
          {actions.length === 0 ? (
            <Alert variant="info" className="text-center py-4">
              <i className="fas fa-info-circle me-2"></i>
              {statusFilter === 'all' 
                ? 'No disciplinary actions found. You currently have a clean record!'
                : `No disciplinary actions found with status "${formatStatus(statusFilter)}".`
              }
            </Alert>
          ) : (
            <div className="table-responsive responsive-table-container">
              <Table hover className="responsive-table">
                <thead>
                  <tr>
                    <th className="text-responsive-sm">Action ID</th>
                    <th className="text-responsive-sm">Action Type</th>
                    <th className="text-responsive-sm">Violation</th>
                    <th className="text-responsive-sm">Status</th>
                    <th className="text-responsive-sm">Effective Date</th>
                    <th className="text-responsive-sm">Issued Date</th>
                    <th className="text-responsive-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(action => (
                    <tr key={action.id}>
                      <td>
                        <strong className="text-responsive-sm">DA-{action.id}</strong>
                      </td>
                      <td>
                        <Badge bg="primary" className="text-responsive-sm">
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
                        <div className="d-flex gap-1 responsive-btn-group">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleViewDetails(action)}
                            className="responsive-btn"
                          >
                            <i className="fas fa-eye me-1 hide-on-mobile"></i>
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
                              className="responsive-btn"
                            >
                              <i className="fas fa-edit me-1 hide-on-mobile"></i>
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
        </div>
      </div>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" className="responsive-modal">
        <Modal.Header closeButton>
          <Modal.Title className="text-responsive-lg">
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
          
          {/* Download PDF button */}
          <Button 
            variant="success" 
            onClick={() => handleDownloadPDF(selectedAction?.id)}
          >
            <i className="fas fa-download me-1"></i>
            Download PDF
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
      <Modal show={showExplanationModal} onHide={() => setShowExplanationModal(false)} size="lg" className="responsive-modal">
        <Modal.Header closeButton>
        <Modal.Title className="text-responsive-lg">
            {selectedAction?.employee_explanation ? 'Update' : 'Submit'} Explanation - DA-{selectedAction?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="responsive-modal">
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