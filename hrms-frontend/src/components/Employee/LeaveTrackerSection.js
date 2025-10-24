import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlane,
  faCalendarAlt,
  faClock,
  faCheckCircle,
  faHourglassHalf,
  faTimesCircle,
  faCalendarCheck,
  faExclamationTriangle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const LeaveTrackerSection = () => {
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState({
    leaveBalance: {
      total_balance: 0,
      vacation_leave: 0,
      sick_leave: 0,
      personal_leave: 0,
      emergency_leave: 0
    },
    recentRequests: [],
    yearlyLimit: 3,
    remainingThisYear: 3,
    yearlyUsage: 0,
    nextAvailableDate: null,
    upcomingLeaves: []
  });

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      
      // Load leave balance and recent requests
      const [balanceRes, requestsRes] = await Promise.allSettled([
        axios.get('/leave-requests/my-balance', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/leave-requests/my-requests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const balanceData = balanceRes.status === 'fulfilled' ? balanceRes.value.data : {};
      const requestsData = requestsRes.status === 'fulfilled' ? requestsRes.value.data : {};

      const requests = requestsData.data || [];
      const leaveBalances = balanceData.leave_balances || {};
      const summary = balanceData.summary || {};

      // Calculate yearly remaining leaves (3 per year limit)
      // Use same logic as leave form: count ALL requests, not just approved ones
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      const currentYearRequestsAll = requests.filter(request => {
        const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
        return requestDate.getFullYear() === currentYear;
      });

      const remainingThisYear = Math.max(0, 3 - currentYearRequestsAll.length);

      // Calculate yearly usage
      // Use same logic as leave form: count ALL requests for yearly usage
      const currentYearRequests = requests.filter(request => {
        const requestDate = new Date(request.submitted_at || request.created_at || request.date_filed);
        return requestDate.getFullYear() === currentYear;
      });

      // Get upcoming approved leaves
      const upcomingLeaves = requests
        .filter(request => {
          const status = request.status?.toLowerCase();
          return (status === 'approved' || status === 'manager_approved') && 
                 new Date(request.from) > currentDate;
        })
        .sort((a, b) => new Date(a.from) - new Date(b.from))
        .slice(0, 3);

      // Calculate next available date (if yearly limit reached)
      let nextAvailableDate = null;
      if (remainingThisYear === 0) {
        const nextYear = new Date(currentYear + 1, 0, 1);
        nextAvailableDate = nextYear;
      }

      // Format leave balance data for display
      const formattedLeaveBalance = {
        total_balance: summary.total_remaining || 0,
        vacation_leave: leaveBalances.vacation_leave?.remaining || 0,
        sick_leave: leaveBalances.sick_leave?.remaining || 0,
        personal_leave: leaveBalances.personal_leave?.remaining || 0,
        emergency_leave: leaveBalances.emergency_leave?.remaining || 0,
        maternity_leave: leaveBalances.maternity_leave?.remaining || 0,
        paternity_leave: leaveBalances.paternity_leave?.remaining || 0,
        bereavement_leave: leaveBalances.bereavement_leave?.remaining || 0
      };

      setLeaveData({
        leaveBalance: formattedLeaveBalance,
        recentRequests: requests.slice(0, 3),
        yearlyLimit: 3,
        remainingThisYear,
        yearlyUsage: currentYearRequests.length,
        nextAvailableDate,
        upcomingLeaves
      });
    } catch (error) {
      console.error('Error loading leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'manager_approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return faCheckCircle;
      case 'manager_approved': return faCheckCircle;
      case 'pending': return faHourglassHalf;
      case 'rejected': return faTimesCircle;
      default: return faInfoCircle;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'APPROVED';
      case 'manager_approved': return 'MANAGER APPROVED';
      case 'pending': return 'PENDING';
      case 'rejected': return 'REJECTED';
      default: return status?.toUpperCase() || 'UNKNOWN';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <div className="mt-2 small text-muted">Loading leave data...</div>
      </div>
    );
  }

  return (
    <div className="leave-tracker-section">
      {/* Leave Balance Overview */}
      <Row className="mb-3">
        <Col md={6}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faPlane} className="text-primary me-2" />
                <h6 className="mb-0">Total Balance</h6>
              </div>
              <h4 className="text-primary mb-0">
                {leaveData.leaveBalance.total_balance || 0} days
              </h4>
              <small className="text-muted">Available for use</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 bg-light h-100">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-info me-2" />
                <h6 className="mb-0">This Year</h6>
              </div>
              <div className="d-flex align-items-center">
                <h4 className="text-info mb-0 me-2">{leaveData.remainingThisYear}</h4>
                <small className="text-muted">of {leaveData.yearlyLimit} remaining</small>
              </div>
              <ProgressBar 
                variant="info" 
                now={(leaveData.remainingThisYear / leaveData.yearlyLimit) * 100} 
                style={{ height: '6px' }}
                className="mt-1"
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Yearly Limit Warning */}
      {leaveData.remainingThisYear === 0 && (
        <Alert variant="warning" className="mb-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>Yearly limit reached!</strong>
          {leaveData.nextAvailableDate && (
            <div className="small mt-1">
              Next leave available: {formatDate(leaveData.nextAvailableDate)}
            </div>
          )}
        </Alert>
      )}

      {/* Leave Type Breakdown */}
      <div className="mb-3">
        <h6 className="text-secondary mb-2">
          <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
          Leave Types
        </h6>
        <Row>
          <Col md={6}>
            <div className="d-flex justify-content-between align-items-center py-1">
              <span className="small">Vacation Leave</span>
              <Badge bg="primary">{leaveData.leaveBalance.vacation_leave || 0}</Badge>
            </div>
            <div className="d-flex justify-content-between align-items-center py-1">
              <span className="small">Sick Leave</span>
              <Badge bg="success">{leaveData.leaveBalance.sick_leave || 0}</Badge>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex justify-content-between align-items-center py-1">
              <span className="small">Personal Leave</span>
              <Badge bg="info">{leaveData.leaveBalance.personal_leave || 0}</Badge>
            </div>
            <div className="d-flex justify-content-between align-items-center py-1">
              <span className="small">Emergency Leave</span>
              <Badge bg="warning">{leaveData.leaveBalance.emergency_leave || 0}</Badge>
            </div>
          </Col>
        </Row>
      </div>

      {/* Recent Requests */}
      <div className="mb-3">
        <h6 className="text-secondary mb-2">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          Recent Requests
        </h6>
        {leaveData.recentRequests.length > 0 ? (
          <div className="list-group list-group-flush">
            {leaveData.recentRequests.map((request) => (
              <div key={request.id} className="list-group-item border-0 px-0 py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <h6 className="mb-0 me-2">{request.leave_type}</h6>
                      <Badge bg={getStatusColor(request.status)}>
                        <FontAwesomeIcon icon={getStatusIcon(request.status)} className="me-1" size="sm" />
                        {getStatusText(request.status)}
                      </Badge>
                    </div>
                    <div className="small text-muted">
                      {formatDateRange(request.from, request.to)} • {request.total_days} day{request.total_days !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted py-2">
            <small>No recent requests</small>
          </div>
        )}
      </div>

      {/* Upcoming Leaves */}
      {leaveData.upcomingLeaves.length > 0 && (
        <div className="mb-3">
          <h6 className="text-success mb-2">
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            Upcoming Leaves
          </h6>
          <div className="list-group list-group-flush">
            {leaveData.upcomingLeaves.map((leave) => (
              <div key={leave.id} className="list-group-item border-0 px-0 py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <h6 className="mb-0 me-2">{leave.leave_type}</h6>
                      <Badge bg="success">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-1" size="sm" />
                        APPROVED
                      </Badge>
                    </div>
                    <div className="small text-muted">
                      {formatDateRange(leave.from, leave.to)} • {leave.total_days} day{leave.total_days !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yearly Usage Summary */}
      <div className="pt-3 border-top">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
            Yearly usage: {leaveData.yearlyUsage} leave{leaveData.yearlyUsage !== 1 ? 's' : ''}
          </small>
          <small className="text-muted">
            {leaveData.remainingThisYear > 0 && (
              <span className="text-success">
                {leaveData.remainingThisYear} more this year
              </span>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};

export default LeaveTrackerSection;
