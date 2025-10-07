import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert } from 'react-bootstrap';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { 
  employeeCalendarApi,
  getEventTypeColor,
  getEventTypeIcon,
  getInvitationStatusColor,
  getInvitationStatusText
} from '../../api/calendar';
import './EmployeeCalendar.css';

const EmployeeCalendar = () => {
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
      const cacheKey = `calendar_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
      
      // Check cache first
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();
      const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
      const isCacheValid = cacheAge < 10 * 60 * 1000; // 10 minutes for calendar data
      
      if (cachedData && isCacheValid) {
        try {
          const events = JSON.parse(cachedData);
          setEvents(events);
          if (showLoadingIndicator) {
            setLoading(false);
          }
          
          // Still fetch fresh data in background
          fetchFreshCalendarData(startDate, endDate, cacheKey);
          return;
        } catch (e) {
          console.error('Error parsing cached calendar data:', e);
        }
      }
      
      // Fetch fresh data
      await fetchFreshCalendarData(startDate, endDate, cacheKey, showLoadingIndicator);
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

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  // Removed invitation response functionality - employees can only view

  const getEventTypeColor = (eventType) => {
    const colors = {
      meeting: '#3b82f6',
      training: '#10b981',
      interview: '#f59e0b',
      break: '#6b7280',
      unavailable: '#ef4444',
      other: '#8b5cf6'
    };
    return colors[eventType] || colors.other;
  };

  const getEventTypeIcon = (eventType) => {
    const icons = {
      meeting: '👥',
      training: '📚',
      interview: '💼',
      break: '☕',
      unavailable: '🚫',
      other: '📅'
    };
    return icons[eventType] || icons.other;
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
                onClick={() => handleViewEvent(event)}
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
    <Container fluid className="employee-calendar responsive-container">
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}
      
      {/* Calendar Header */}
      <div className="calendar-header responsive-header">
        <div className="calendar-navigation">
          <Button variant="outline-secondary" size="sm" onClick={goToPreviousMonth} className="responsive-btn">
            <ChevronLeft size={16} />
          </Button>
          <h2 className="month-year text-responsive-lg">{formatMonthYear(currentDate)}</h2>
          <Button variant="outline-secondary" size="sm" onClick={goToNextMonth} className="responsive-btn">
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="calendar-actions">
          <Button variant="outline-primary" size="sm" onClick={goToToday} className="me-2 responsive-btn">
            Today
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="calendar-container responsive-calendar">
        {/* Week day headers */}
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday-header text-responsive-sm">{day}</div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="calendar-grid">
          {generateCalendarGrid()}
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" className="responsive-modal">
        <Modal.Header closeButton>
          <Modal.Title className="text-responsive-lg">
            <span className="me-2 hide-on-mobile">{getEventTypeIcon(selectedEvent?.event_type)}</span>
            Event Details
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="responsive-modal">
          {selectedEvent && (
            <div>
              <div className="responsive-form-row">
                <div className="responsive-form-col">
                  <h5 className="text-responsive-lg" style={{ color: getEventTypeColor(selectedEvent.event_type) }}>
                    {selectedEvent.title}
                  </h5>
                  <p className="text-muted mb-3 text-responsive-md">{selectedEvent.description || 'No description provided.'}</p>
                </div>
                <div className="responsive-form-col text-end">
                  <Badge style={{ backgroundColor: getEventTypeColor(selectedEvent.event_type) }} className="text-responsive-sm">
                    {selectedEvent.event_type}
                  </Badge>
                </div>
              </div>
              
              <div className="responsive-form-row mb-3">
                <div className="responsive-form-col">
                  <strong className="text-responsive-md">Start Time:</strong>
                  <div className="text-responsive-sm">{formatDateTime(selectedEvent.start_datetime)}</div>
                </div>
                <div className="responsive-form-col">
                  <strong className="text-responsive-md">End Time:</strong>
                  <div className="text-responsive-sm">{formatDateTime(selectedEvent.end_datetime)}</div>
                </div>
              </div>

              <div className="responsive-form-row mb-3">
                <div className="responsive-form-col">
                  <strong className="text-responsive-md">Created by:</strong>
                  <div className="text-responsive-sm">{selectedEvent.created_by}</div>
                </div>
                <div className="responsive-form-col">
                  <strong className="text-responsive-md">Event Type:</strong>
                  <div>
                    <Badge style={{ backgroundColor: getEventTypeColor(selectedEvent.event_type) }} className="text-responsive-sm">
                      {selectedEvent.event_type}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Invitation Status - View Only */}
              {selectedEvent.my_invitation_status && (
                <Row className="mb-3">
                  <Col>
                    <strong>Your Invitation Status:</strong>
                    <div className="mt-2">
                      <Badge bg={getInvitationStatusColor(selectedEvent.my_invitation_status)}>
                        {getInvitationStatusText(selectedEvent.my_invitation_status)}
                      </Badge>
                      {selectedEvent.my_responded_at && (
                        <small className="text-muted ms-2">
                          Responded on {new Date(selectedEvent.my_responded_at).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  </Col>
                </Row>
              )}

              {selectedEvent.location && (
                <Row className="mb-3">
                  <Col>
                    <h6 className="text-muted mb-1">Location</h6>
                    <p className="mb-0">{selectedEvent.location}</p>
                  </Col>
                </Row>
              )}

              <hr />
              
              <Row>
                <Col md={12}>
                  <small className="text-muted">
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

export default EmployeeCalendar;
