import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPesoSign,
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

const LEAVE_TYPE_DISPLAY = [
  { key: 'sick_leave', label: 'Sick Leave', remainingVariant: 'success' },
  { key: 'emergency_leave', label: 'Emergency Leave', remainingVariant: 'warning' },
  { key: 'vacation_leave', label: 'Vacation Leave', remainingVariant: 'primary' }
];

const LeaveTrackerSection = () => {
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState({
    leaveBalance: {
      total_balance: 0,
      vacation_leave: { remaining: 0, used: 0, entitled: 0 },
      sick_leave: { remaining: 0, used: 0, entitled: 0 },
      emergency_leave: { remaining: 0, used: 0, entitled: 0 }
    },
    payBalance: {
      label: 'Without Pay',
      description: 'With pay eligibility starts after 1 year of service.',
      remainingWithPayDays: 0,
      eligible: false
    },
    recentRequests: [],
    yearlyLimit: 3,
    remainingThisYear: 3,
    yearlyUsage: 0,
    nextAvailableDate: null,
    upcomingLeaves: [],
    tenure: null
  });

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      
      // Load leave balance, recent requests, and payment summary
      const [balanceRes, requestsRes, summaryRes] = await Promise.allSettled([
        axios.get('/leave-requests/my-balance', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/leave-requests/my-requests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/leave-requests/my-summary', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const balanceData = balanceRes.status === 'fulfilled' ? balanceRes.value.data : {};
      const requestsData = requestsRes.status === 'fulfilled' ? requestsRes.value.data : {};
      const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;

      const requests = requestsData.data || [];
      const leaveBalances = balanceData.leave_balances || {};
      const summary = balanceData.summary || {};
      const tenureInfo = summaryData?.tenure || null;
      const tenureMonths = typeof tenureInfo?.months === 'number' ? tenureInfo.months : null;
      const isEligibleForWithPay = tenureMonths !== null && tenureMonths >= 12;

      // Calculate yearly remaining leaves (3 per year limit)
      // Use same logic as leave form: count ALL requests, not just approved ones
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      const extractRequestDate = (request) => {
        const rawDate = request.created_at || request.submitted_at || request.date_filed || request.from;
        return rawDate ? new Date(rawDate) : new Date(0);
      };

      const sortedRequests = [...requests].sort((a, b) => extractRequestDate(b) - extractRequestDate(a));

      const currentYearRequestsAll = sortedRequests.filter(request => {
        const requestDate = extractRequestDate(request);
        return requestDate.getFullYear() === currentYear;
      });

      const remainingThisYear = Math.max(0, 3 - currentYearRequestsAll.length);

      // Calculate yearly usage
      // Use same logic as leave form: count ALL requests for yearly usage
      const currentYearRequests = currentYearRequestsAll;

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
      const buildLeaveTypeBalance = (key) => ({
        remaining: leaveBalances[key]?.remaining ?? 0,
        used: leaveBalances[key]?.used ?? 0,
        entitled: leaveBalances[key]?.entitled ?? 0,
        note: leaveBalances[key]?.note
      });

      const formattedLeaveBalance = {
        total_balance: summary.total_remaining || 0,
        vacation_leave: buildLeaveTypeBalance('vacation_leave'),
        sick_leave: buildLeaveTypeBalance('sick_leave'),
        emergency_leave: buildLeaveTypeBalance('emergency_leave')
      };

      const requestsForPayStatus = [...currentYearRequestsAll].sort(
        (a, b) => extractRequestDate(a) - extractRequestDate(b)
      );

      const payStatusLabels = {};
      const remainingWithPayDays = summaryData?.sil_balance?.remaining_with_pay_days ?? 0;
      let payBalanceLabel = 'Without Pay';
      let payBalanceDescription = 'With pay eligibility starts after 1 year of service.';

      if (tenureMonths !== null && tenureMonths < 12) {
        const monthsRemaining = Math.max(0, 12 - tenureMonths);
        payBalanceDescription = `With pay eligibility starts after 12 months of service.${monthsRemaining > 0 ? ` ${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} to go.` : ''}`;
      }

      if (isEligibleForWithPay) {
        if (requestsForPayStatus.length === 0) {
          if (remainingWithPayDays > 0) {
            payBalanceLabel = 'With Pay';
            payBalanceDescription = 'Your first leave request this year is eligible for pay.';
          } else {
            payBalanceDescription = 'No paid leave days remain for this year.';
          }
        } else {
          requestsForPayStatus.forEach((request, index) => {
            const hasPay = (request.with_pay_days ?? 0) > 0 ||
              (request.terms && String(request.terms).toLowerCase().includes('with'));
            const label = index === 0 && hasPay ? 'With Pay' : 'Without Pay';
            payStatusLabels[request.id] = label;
          });

          const firstRequest = requestsForPayStatus[0];
          const firstLabel = payStatusLabels[firstRequest.id] || 'Without Pay';

          if (requestsForPayStatus.length > 1) {
            payBalanceLabel = 'Without Pay';
            payBalanceDescription = 'Subsequent leaves after the first are without pay.';
          } else {
            payBalanceLabel = firstLabel;
            payBalanceDescription = firstLabel === 'With Pay'
              ? 'Your first leave this year is covered with pay.'
              : 'Your first leave this year is without pay.';
          }
        }
      } else {
        requests.forEach((request) => {
          payStatusLabels[request.id] = 'Without Pay';
        });
      }

      sortedRequests.forEach((request) => {
        if (!payStatusLabels[request.id]) {
          const hasPay = (request.with_pay_days ?? 0) > 0 ||
            (request.terms && String(request.terms).toLowerCase().includes('with'));
          payStatusLabels[request.id] = hasPay && isEligibleForWithPay ? 'With Pay' : 'Without Pay';
        }
      });

      const enrichedRecentRequests = sortedRequests.slice(0, 1).map((request) => ({
        ...request,
        payStatusLabel: payStatusLabels[request.id] || 'Without Pay'
      }));

      const payBalanceData = {
        label: payBalanceLabel,
        description: payBalanceDescription,
        remainingWithPayDays: isEligibleForWithPay ? remainingWithPayDays : 0,
        eligible: isEligibleForWithPay
      };

      setLeaveData({
        leaveBalance: formattedLeaveBalance,
        payBalance: payBalanceData,
        recentRequests: enrichedRecentRequests,
        yearlyLimit: 3,
        remainingThisYear,
        yearlyUsage: currentYearRequests.length,
        nextAvailableDate,
        upcomingLeaves,
        tenure: tenureInfo
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

  const getUsedBalance = (typeKey) => leaveData.leaveBalance[typeKey]?.used ?? 0;

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
                <FontAwesomeIcon icon={faPesoSign} className="text-primary me-2" />
                <h6 className="mb-0">Pay Balance</h6>
              </div>
              <h4 className={`mb-0 ${leaveData.payBalance.label === 'With Pay' ? 'text-success' : 'text-primary'}`}>
                {leaveData.payBalance.label}
              </h4>
              <small className="text-muted">{leaveData.payBalance.description}</small>
              {leaveData.payBalance.eligible && (
                <div className="small text-muted mt-1">
                  Remaining paid days: {leaveData.payBalance.remainingWithPayDays}
                </div>
              )}
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
        <div>
          {LEAVE_TYPE_DISPLAY.map((type) => (
            <div key={type.key} className="d-flex justify-content-between align-items-center py-1">
              <span className="small">{type.label}</span>
              <div className="d-flex align-items-center">
                <Badge bg={type.remainingVariant}>
                  {getUsedBalance(type.key) || 1}
                </Badge>
            </div>
            </div>
          ))}
            </div>
      </div>

      {/* Recent Requests */}
      <div className="mb-3">
        {leaveData.recentRequests.length > 0 ? (
          <div className="recent-requests-table">
            <div className="row g-0 text-muted small fw-semibold pb-2 d-none d-md-flex">
              <div className="col-3">Leave Type</div>
              <div className="col-3">Status</div>
              <div className="col-2">Start Date</div>
              <div className="col-2">End Date</div>
              <div className="col-2 text-end">Total Days</div>
            </div>
            {leaveData.recentRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-3 px-3 py-3 mb-2"
              >
                <div className="row g-0 align-items-center">
                  <div className="col-12 col-md-3 mb-2 mb-md-0">
                    <strong className="d-block text-primary">{request.leave_type}</strong>
                  </div>
                  <div className="col-12 col-md-3 mb-2 mb-md-0">
                    <Badge bg={getStatusColor(request.status)} className="me-2">
                      <FontAwesomeIcon icon={getStatusIcon(request.status)} className="me-1" size="sm" />
                      {getStatusText(request.status)}
                    </Badge>
                    <Badge bg={request.payStatusLabel === 'With Pay' ? 'success' : 'secondary'}>
                      {request.payStatusLabel}
                    </Badge>
                  </div>
                  <div className="col-6 col-md-2 mb-2 mb-md-0">
                    <span className="small text-muted d-block d-md-none">Start Date</span>
                    <span className="fw-semibold">{formatDate(request.from)}</span>
                  </div>
                  <div className="col-6 col-md-2 mb-2 mb-md-0">
                    <span className="small text-muted d-block d-md-none">End Date</span>
                    <span className="fw-semibold">{formatDate(request.to)}</span>
                  </div>
                  <div className="col-12 col-md-2 text-md-end">
                    <span className="small text-muted d-block d-md-none">Total Days</span>
                    <span className="fw-semibold">{request.total_days} day{request.total_days !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
