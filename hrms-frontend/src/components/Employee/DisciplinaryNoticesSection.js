import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faEye,
  faFileAlt,
  faCalendarAlt,
  faShieldAlt,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const DisciplinaryNoticesSection = () => {
  const [loading, setLoading] = useState(true);
  const [disciplinaryData, setDisciplinaryData] = useState({
    recentActions: [],
    totalActions: 0,
    pendingActions: 0,
    resolvedActions: 0,
    severityBreakdown: {
      low: 0,
      medium: 0,
      high: 0
    },
    statusBreakdown: {
      pending: 0,
      acknowledged: 0,
      resolved: 0
    }
  });

  useEffect(() => {
    loadDisciplinaryData();
  }, []);

  const loadDisciplinaryData = async () => {
    try {
      setLoading(true);
      
      // Load disciplinary actions and stats
      const [actionsRes, statsRes] = await Promise.allSettled([
        axios.get('/employee/disciplinary/actions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/employee/disciplinary/dashboard/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const actions = actionsRes.status === 'fulfilled' ? actionsRes.value.data : [];
      const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : {};

      // Process recent actions
      const recentActions = actions.slice(0, 3).map(action => ({
        id: action.id,
        actionType: action.action_type,
        category: action.disciplinary_report?.disciplinary_category?.name || 'N/A',
        severity: action.disciplinary_report?.disciplinary_category?.severity_level || 'medium',
        status: action.status,
        effectiveDate: action.effective_date,
        createdAt: action.created_at,
        isRepeatViolation: action.is_repeat_violation,
        violationOrdinal: action.violation_ordinal
      }));

      // Calculate breakdowns
      const severityBreakdown = { low: 0, medium: 0, high: 0 };
      const statusBreakdown = { pending: 0, acknowledged: 0, resolved: 0 };

      actions.forEach(action => {
        const severity = action.disciplinary_report?.disciplinary_category?.severity_level || 'medium';
        const status = action.status?.toLowerCase() || 'pending';
        
        if (severityBreakdown[severity] !== undefined) {
          severityBreakdown[severity]++;
        }
        
        if (statusBreakdown[status] !== undefined) {
          statusBreakdown[status]++;
        }
      });

      setDisciplinaryData({
        recentActions,
        totalActions: actions.length,
        pendingActions: stats.pending_actions || statusBreakdown.pending,
        resolvedActions: stats.resolved_actions || statusBreakdown.resolved,
        severityBreakdown,
        statusBreakdown
      });
    } catch (error) {
      console.error('Error loading disciplinary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'acknowledged': return 'info';
      case 'resolved': return 'success';
      case 'closed': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return faClock;
      case 'acknowledged': return faCheckCircle;
      case 'resolved': return faCheckCircle;
      case 'closed': return faCheckCircle;
      default: return faExclamationTriangle;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <div className="mt-2 small text-muted">Loading disciplinary data...</div>
      </div>
    );
  }

  if (disciplinaryData.totalActions === 0) {
    return (
      <div className="text-center py-4">
        <FontAwesomeIcon icon={faShieldAlt} className="fs-1 text-success opacity-25" />
        <div className="mt-2 text-success">Clean Record</div>
        <small className="text-muted">No disciplinary actions on file</small>
      </div>
    );
  }

  return (
    <div className="disciplinary-notices-section">
      {/* Summary Stats */}
      <Row className="mb-3">
        <Col md={4}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3 text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning fs-4 mb-2" />
              <h6 className="mb-1">{disciplinaryData.totalActions}</h6>
              <small className="text-muted">Total Actions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3 text-center">
              <FontAwesomeIcon icon={faClock} className="text-warning fs-4 mb-2" />
              <h6 className="mb-1">{disciplinaryData.pendingActions}</h6>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3 text-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-success fs-4 mb-2" />
              <h6 className="mb-1">{disciplinaryData.resolvedActions}</h6>
              <small className="text-muted">Resolved</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Actions */}
      <div className="mb-3">
        <h6 className="text-secondary mb-2">
          <FontAwesomeIcon icon={faFileAlt} className="me-2" />
          Recent Actions
        </h6>
        <div className="list-group list-group-flush">
          {disciplinaryData.recentActions.map((action) => (
            <div key={action.id} className="list-group-item border-0 px-0 py-2">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-1">
                    <h6 className="mb-0 me-2">DA-{action.id}</h6>
                    <Badge bg={getSeverityColor(action.severity)} className="me-2">
                      {action.severity?.toUpperCase()}
                    </Badge>
                    <Badge bg={getStatusColor(action.status)}>
                      <FontAwesomeIcon icon={getStatusIcon(action.status)} className="me-1" size="sm" />
                      {action.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="small text-muted">
                    <div>{action.category}</div>
                    <div>
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {formatDate(action.effectiveDate)}
                    </div>
                    {action.isRepeatViolation && (
                      <div className="text-warning">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" size="sm" />
                        Repeat violation ({action.violationOrdinal})
                      </div>
                    )}
                  </div>
                </div>
                <FontAwesomeIcon icon={faEye} className="text-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="mb-3">
        <h6 className="text-secondary mb-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          Severity Breakdown
        </h6>
        <Row>
          <Col md={4}>
            <div className="text-center">
              <Badge bg="success" className="fs-6 mb-1">{disciplinaryData.severityBreakdown.low}</Badge>
              <div className="small text-muted">Low</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="text-center">
              <Badge bg="warning" className="fs-6 mb-1">{disciplinaryData.severityBreakdown.medium}</Badge>
              <div className="small text-muted">Medium</div>
            </div>
          </Col>
          <Col md={4}>
            <div className="text-center">
              <Badge bg="danger" className="fs-6 mb-1">{disciplinaryData.severityBreakdown.high}</Badge>
              <div className="small text-muted">High</div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Status Summary */}
      <div className="pt-3 border-top">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
            Monitor your disciplinary record
          </small>
          <small className="text-muted">
            {disciplinaryData.pendingActions > 0 && (
              <span className="text-warning">
                {disciplinaryData.pendingActions} action{disciplinaryData.pendingActions !== 1 ? 's' : ''} pending
              </span>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};

export default DisciplinaryNoticesSection;
