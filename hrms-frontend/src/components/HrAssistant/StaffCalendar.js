import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert } from 'react-bootstrap';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Check, X } from 'lucide-react';
import { 
  employeeCalendarApi,
  getEventTypeColor,
  getEventTypeIcon,
  getInvitationStatusColor,
  getInvitationStatusText,
  clearAllCalendarCaches
} from '../../api/calendar';
import ValidationModal from '../common/ValidationModal';
import useValidationModal from '../../hooks/useValidationModal';
import './StaffCalendar.css';

const StaffCalendar = () => {
  const { modalState, showSuccess, showError, showWarning, hideModal } = useValidationModal();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Auto-refresh mechanism for real-time updates
  useEffect(() => {
    // Refresh data when window gains focus (user returns to tab)
    const handleFocus = () => {
      console.log('Window focused - checking for calendar updates...');
      loadData(false);
    };

    // Periodic refresh every 30 seconds to catch real-time updates
    const refreshInterval = setInterval(() => {
      console.log('Auto-refresh - checking for calendar updates...');
      loadData(false);
    }, 30000); // 30 seconds

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(refreshInterval);
    };
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
      setLastUpdated(new Date());
      
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
    if (type === 'success') {
      showSuccess(message);
    } else if (type === 'danger') {
      showError(message);
    } else if (type === 'info') {
      showWarning(message);
    } else {
      showSuccess(message);
    }
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
      {/* Validation Modal */}
      <ValidationModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
      />

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
        <div className="d-flex flex-column align-items-end">
          {lastUpdated && (
            <small className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
              <Clock size={12} className="me-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </small>
          )}
          <div className="calendar-actions">
            <Button variant="outline-primary" size="sm" onClick={goToToday} className="me-2">
              Today
            </Button>
          </div>
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
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="sm"
        backdrop="static"
        keyboard={false}
        centered
        style={{ zIndex: 9999 }}
      >
        <Modal.Header closeButton style={{ padding: '0.75rem 1rem' }}>
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            <span className="me-2">{getEventTypeIcon(selectedEvent?.event_type)}</span>
            {selectedEvent?.title}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ padding: '1rem' }}>
          {selectedEvent && (
            <div>
              <div className="mb-2">
                <Badge style={{ backgroundColor: getEventTypeColor(selectedEvent.event_type) }} className="mb-2">
                  {selectedEvent.event_type}
                </Badge>
                <Badge bg={selectedEvent.status === 'active' ? 'success' : 'secondary'} className="ms-2">
                  {selectedEvent.status}
                </Badge>
              </div>
              
              <div className="mb-2">
                <small className="text-muted">
                  <strong>Start:</strong> {formatDateTime(selectedEvent.start_datetime)}
                </small>
              </div>
              
              <div className="mb-2">
                <small className="text-muted">
                  <strong>End:</strong> {formatDateTime(selectedEvent.end_datetime)}
                </small>
              </div>

              <div className="mb-2">
                <small className="text-muted">
                  <strong>Created by:</strong> {selectedEvent.created_by}
                </small>
              </div>

              {selectedEvent.description && (
                <div className="mb-2">
                  <small className="text-muted">
                    <strong>Description:</strong> {selectedEvent.description}
                  </small>
                </div>
              )}

              {selectedEvent.location && (
                <div className="mb-2">
                  <small className="text-muted">
                    <strong>Location:</strong> {selectedEvent.location}
                  </small>
                </div>
              )}

              {/* Show invitation response buttons if user has pending invitation */}
              {selectedEvent.user_invitation_status === 'pending' && (
                <div className="mb-2">
                  <small className="text-muted mb-2 d-block">Your Response:</small>
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
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer style={{ padding: '0.75rem 1rem' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Validation Error Modal */}
      <Modal 
        show={showValidationModal} 
        onHide={() => setShowValidationModal(false)} 
        size="sm"
        backdrop="static"
        keyboard={false}
        centered
        style={{ zIndex: 10000 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: '#dc3545', color: 'white' }}>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Validation Error
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <i className="fas fa-exclamation-circle text-danger" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
              {validationMessage}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowValidationModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StaffCalendar;
