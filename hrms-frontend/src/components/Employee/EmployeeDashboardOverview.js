import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCalendarAlt,
  faPlane,
  faMoneyBillWave,
  faChartBar,
  faClock,
  faBell,
  faExclamationTriangle,
  faHandHoldingUsd,
  faFileAlt,
  faDownload,
  faEye,
  faPlus,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faCalendarCheck,
  faUsers,
  faGift,
  faTrophy,
  faArrowRight,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { getRelativeTime } from '../../utils/timeUtils';

const EmployeeDashboardOverview = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    user: null,
    leaveBalance: {},
    recentLeaveRequests: [],
    upcomingEvents: [],
    recentPayslips: [],
    evaluationResults: [],
    notifications: [],
    disciplinaryStats: {},
    cashAdvanceRequests: []
  });
  const [, setTimeUpdate] = useState(0); // Force re-render for time updates

  useEffect(() => {
    loadDashboardData();
    
    // Update relative times every minute
    const timeUpdateInterval = setInterval(() => {
      setTimeUpdate(prev => prev + 1);
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(timeUpdateInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [
        userRes,
        leaveBalanceRes,
        leaveRequestsRes,
        eventsRes,
        evaluationsRes,
        notificationsRes,
        disciplinaryRes,
        cashAdvanceRes
      ] = await Promise.allSettled([
        axios.get('/auth/user'),
        axios.get('/leave-requests/balance'),
        axios.get('/leave-requests/my-requests'),
        axios.get('/employee-calendar'),
        axios.get('/manager-evaluations/employee/me/results'),
        axios.get('/notifications'),
        axios.get('/employee/disciplinary/dashboard-stats'),
        axios.get('/cash-advances/my-requests')
      ]);

      setDashboardData({
        user: userRes.status === 'fulfilled' ? userRes.value.data : null,
        leaveBalance: leaveBalanceRes.status === 'fulfilled' ? leaveBalanceRes.value.data : {},
        recentLeaveRequests: leaveRequestsRes.status === 'fulfilled' ? leaveRequestsRes.value.data.slice(0, 3) : [],
        upcomingEvents: eventsRes.status === 'fulfilled' ? eventsRes.value.data.slice(0, 5) : [],
        evaluationResults: evaluationsRes.status === 'fulfilled' ? evaluationsRes.value.data.slice(0, 2) : [],
        notifications: notificationsRes.status === 'fulfilled' ? notificationsRes.value.data.data.slice(0, 5) : [],
        disciplinaryStats: disciplinaryRes.status === 'fulfilled' ? disciplinaryRes.value.data : {},
        cashAdvanceRequests: cashAdvanceRes.status === 'fulfilled' ? cashAdvanceRes.value.data.slice(0, 3) : []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'manager_approved': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return faCheckCircle;
      case 'pending': return faHourglassHalf;
      case 'rejected': return faTimesCircle;
      case 'manager_approved': return faCheckCircle;
      default: return faInfoCircle;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'manager_approved': return 'Manager approved';
      default: return status?.replace('_', ' ') || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard-overview">
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm bg-gradient-primary text-white">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h2 className="mb-2">
                    {getGreeting()}, {dashboardData.user?.name || 'Employee'}! 👋
                  </h2>
                  <p className="mb-0 opacity-75">
                    Welcome to your personal dashboard. Here's what's happening today.
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="d-flex flex-column align-items-end">
                    <div className="fs-6 opacity-75">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="fs-5 fw-bold">
                      {new Date().toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center p-3">
              <FontAwesomeIcon icon={faPlane} className="text-primary fs-2 mb-2" />
              <h5 className="mb-1">{dashboardData.leaveBalance?.total_balance || 0}</h5>
              <small className="text-muted">Leave Days Available</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center p-3">
              <FontAwesomeIcon icon={faBell} className="text-warning fs-2 mb-2" />
              <h5 className="mb-1">{dashboardData.notifications?.filter(n => !n.read_at).length || 0}</h5>
              <small className="text-muted">Unread Notifications</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center p-3">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-success fs-2 mb-2" />
              <h5 className="mb-1">{dashboardData.upcomingEvents?.length || 0}</h5>
              <small className="text-muted">Upcoming Events</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center p-3">
              <FontAwesomeIcon icon={faChartBar} className="text-info fs-2 mb-2" />
              <h5 className="mb-1">{dashboardData.evaluationResults?.length || 0}</h5>
              <small className="text-muted">Recent Evaluations</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Left Column */}
        <Col lg={8}>
          {/* Recent Notifications */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faBell} className="me-2 text-warning" />
                  Recent Notifications
                </h5>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => onNavigate('notifications')}
                >
                  View All
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData.notifications?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`list-group-item border-0 px-0 ${!notification.read_at ? 'bg-light' : ''}`}
                    >
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                               style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                            📢
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{notification.title}</h6>
                          <p className="mb-1 text-muted small">{notification.message}</p>
                          <small className="text-muted">
                            {getRelativeTime(notification.created_at)}
                          </small>
                        </div>
                        {!notification.read_at && (
                          <Badge bg="primary" className="ms-2">New</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FontAwesomeIcon icon={faBell} className="fs-1 mb-2 opacity-25" />
                  <p>No new notifications</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Leave Requests */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FontAwesomeIcon icon={faPlane} className="me-2 text-primary" />
                  Recent Leave Requests
                </h5>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => onNavigate('leave-request')}
                >
                  <FontAwesomeIcon icon={faPlus} className="me-1" />
                  New Request
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData.recentLeaveRequests?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.recentLeaveRequests.map((request) => (
                    <div key={request.id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{request.type} Leave</h6>
                          <p className="mb-1 text-muted small">
                            {new Date(request.from).toLocaleDateString()} - {new Date(request.to).toLocaleDateString()}
                          </p>
                          <small className="text-muted">
                            {request.days} day(s)
                          </small>
                        </div>
                        <div className="text-end">
                          <Badge bg={getStatusColor(request.status)} className="mb-1">
                            <FontAwesomeIcon icon={getStatusIcon(request.status)} className="me-1" />
                            {getStatusText(request.status)}
                          </Badge>
                          <div>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => onNavigate('leave-request', request.id)}
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FontAwesomeIcon icon={faPlane} className="fs-1 mb-2 opacity-25" />
                  <p>No recent leave requests</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => onNavigate('leave-request')}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                    Submit Leave Request
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col lg={4}>
          {/* Quick Actions */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faArrowRight} className="me-2 text-success" />
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-primary" 
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => onNavigate('leave-request')}
                >
                  <span>
                    <FontAwesomeIcon icon={faPlane} className="me-2" />
                    Submit Leave Request
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Button>
                <Button 
                  variant="outline-success" 
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => onNavigate('cash-advance')}
                >
                  <span>
                    <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2" />
                    Cash Advance
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Button>
                <Button 
                  variant="outline-info" 
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => onNavigate('profile')}
                >
                  <span>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Update Profile
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Button>
                <Button 
                  variant="outline-warning" 
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => onNavigate('my-calendar')}
                >
                  <span>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    View Calendar
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Upcoming Events */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-info" />
                Upcoming Events
              </h5>
            </Card.Header>
            <Card.Body>
              {dashboardData.upcomingEvents?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.upcomingEvents.map((event) => (
                    <div key={event.id} className="list-group-item border-0 px-0">
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center text-white" 
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              fontSize: '12px',
                              backgroundColor: event.event_type === 'meeting' ? '#007bff' : 
                                            event.event_type === 'training' ? '#28a745' : '#6c757d'
                            }}
                          >
                            {event.event_type === 'meeting' ? '👥' : 
                             event.event_type === 'training' ? '🎓' : '📅'}
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{event.title}</h6>
                          <p className="mb-1 text-muted small">{event.description}</p>
                          <small className="text-muted">
                            {new Date(event.start_time).toLocaleDateString()} at {new Date(event.start_time).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="fs-3 mb-2 opacity-25" />
                  <p className="mb-0">No upcoming events</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Performance Summary */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h5 className="mb-0">
                <FontAwesomeIcon icon={faTrophy} className="me-2 text-warning" />
                Performance Summary
              </h5>
            </Card.Header>
            <Card.Body>
              {dashboardData.evaluationResults?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.evaluationResults.map((evaluation) => (
                    <div key={evaluation.id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{evaluation.form_title || 'Performance Evaluation'}</h6>
                          <small className="text-muted">
                            {new Date(evaluation.submitted_at).toLocaleDateString()}
                          </small>
                        </div>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => onNavigate('evaluation-summary', evaluation.id)}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <FontAwesomeIcon icon={faTrophy} className="fs-3 mb-2 opacity-25" />
                  <p className="mb-0">No recent evaluations</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDashboardOverview;
