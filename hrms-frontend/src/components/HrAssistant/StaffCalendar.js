import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert } from 'react-bootstrap';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Check, X } from 'lucide-react';
import { 
  employeeCalendarApi,
  getEventTypeColor,
  getEventTypeIcon,
  getInvitationStatusColor,
  getInvitationStatusText
} from '../../api/calendar';
import './StaffCalendar.css';

const StaffCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }
      
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Check for cached data first
      const cacheKey = `staff_calendar_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cached data if it's less than 5 minutes old
      if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
        setEvents(JSON.parse(cachedData));
        if (showLoadingIndicator) {
          setLoading(false);
        }
        
        // Still fetch fresh data in background
        fetchFreshCalendarData(startDate, endDate, cacheKey, false);
      } else {
        await fetchFreshCalendarData(startDate, endDate, cacheKey, showLoadingIndicator);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      if (showLoadingIndicator) {
        showAlert('Error loading calendar events. Please try again.', 'danger');
        setLoading(false);
      }
    }
  };

  const fetchFreshCalendarData = async (startDate, endDate, cacheKey, showLoadingIndicator = false) => {
    try {
      const response = await employeeCalendarApi.getMyCalendar({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      const events = response.data || [];
      setEvents(events);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(events));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
    } catch (error) {
      console.error('Error fetching fresh calendar data:', error);
      if (showLoadingIndicator) {
        showAlert('Error loading calendar events. Please try again.', 'danger');
      }
      throw error;
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    // Compare using precomputed Manila date from API to avoid timezone shifts
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(event => (event.start_date_manila || '').startsWith(dateStr));
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleRespondToInvitation = async (eventId, status) => {
    try {
      await employeeCalendarApi.respondToInvitation(eventId, status);
      showAlert(`Invitation ${status} successfully!`, 'success');
      loadData(false); // Refresh data without loading indicator
    } catch (error) {
      console.error('Error responding to invitation:', error);
      showAlert('Error responding to invitation. Please try again.', 'danger');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
      const prevDay = prevMonth.getDate() - (firstDayOfMonth - 1 - i);
      days.push(
        <div key={`prev-${prevDay}`} className="calendar-day prev-month">
          <span className="day-number">{prevDay}</span>
        </div>
      );
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day current-month ${isToday ? 'today' : ''}`}
        >
          <span className="day-number">{day}</span>
          <div className="events-container">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={`event-item event-${event.event_type}`}
                style={{ backgroundColor: getEventTypeColor(event.event_type) }}
                onClick={() => handleEventClick(event)}
                title={`${event.title} - ${event.start_time_formatted}`}
              >
                <span className="event-time">
                  {event.start_time_formatted}
                </span>
                <span className="event-title">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="staff-calendar">
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}
      
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-navigation">
          <Button variant="outline-secondary" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft size={16} />
          </Button>
          <h2 className="month-year">{formatMonthYear(currentDate)}</h2>
          <Button variant="outline-secondary" size="sm" onClick={goToNextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="calendar-actions">
          <Button variant="outline-primary" size="sm" onClick={goToToday} className="me-2">
            Today
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="calendar-container">
        {/* Week day headers */}
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="calendar-grid">
          {generateCalendarGrid()}
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2">{getEventTypeIcon(selectedEvent?.event_type)}</span>
              {selectedEvent?.title}
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {selectedEvent && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="text-muted mb-1">Event Type</h6>
                  <Badge 
                    style={{ backgroundColor: getEventTypeColor(selectedEvent.event_type) }}
                    className="mb-2"
                  >
                    {selectedEvent.event_type}
                  </Badge>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-1">Status</h6>
                  <Badge bg={selectedEvent.status === 'active' ? 'success' : 'secondary'}>
                    {selectedEvent.status}
                  </Badge>
                </Col>
              </Row>
              
              {selectedEvent.description && (
                <Row className="mb-3">
                  <Col>
                    <h6 className="text-muted mb-1">Description</h6>
                    <p>{selectedEvent.description}</p>
                  </Col>
                </Row>
              )}
              
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="text-muted mb-1">
                    <Clock size={16} className="me-1" />
                    Start Time
                  </h6>
                  <p className="mb-0">{formatDateTime(selectedEvent.start_datetime)}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-1">
                    <Clock size={16} className="me-1" />
                    End Time
                  </h6>
                  <p className="mb-0">{formatDateTime(selectedEvent.end_datetime)}</p>
                </Col>
              </Row>
              
              {selectedEvent.location && (
                <Row className="mb-3">
                  <Col>
                    <h6 className="text-muted mb-1">Location</h6>
                    <p className="mb-0">{selectedEvent.location}</p>
                  </Col>
                </Row>
              )}
              
              {/* Show invitation response buttons if user has pending invitation */}
              {selectedEvent.user_invitation_status === 'pending' && (
                <Row className="mb-3">
                  <Col>
                    <h6 className="text-muted mb-2">Your Response</h6>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleRespondToInvitation(selectedEvent.id, 'accepted')}
                      >
                        <Check size={16} className="me-1" />
                        Accept
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRespondToInvitation(selectedEvent.id, 'declined')}
                      >
                        <X size={16} className="me-1" />
                        Decline
                      </Button>
                    </div>
                  </Col>
                </Row>
              )}
              
              <hr />
              
              <Row>
                <Col>
                  <small className="text-muted">
                    Created by: {selectedEvent.created_by}<br />
                    Created at: {formatDateTime(selectedEvent.created_at)}
                  </small>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StaffCalendar;
