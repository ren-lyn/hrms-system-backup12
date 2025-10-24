import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Alert } from 'react-bootstrap';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, AlertCircle } from 'lucide-react';
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
import './EmployeeCalendar.css';

const EmployeeCalendar = () => {
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

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

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

  const getStatusBadge = (status, isOngoing) => {
    if (isOngoing) {
      return <Badge bg="success">Ongoing</Badge>;
    }
    
    const variants = {
      active: 'primary',
      cancelled: 'danger',
      completed: 'success'
    };
    
    const labels = {
      active: 'Active',
      cancelled: 'Cancelled',
      completed: 'Completed'
    };
    
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
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
                className={`event-item event-${event.event_type} ${event.status === 'cancelled' ? 'event-cancelled' : ''}`}
                style={{ 
                  backgroundColor: event.status === 'cancelled' ? '#6c757d' : getEventTypeColor(event.event_type),
                  opacity: event.status === 'cancelled' ? 0.6 : 1
                }}
                onClick={() => handleViewEvent(event)}
                title={`${event.title} - ${event.start_time_formatted}${event.status === 'cancelled' ? ' (Cancelled)' : ''}`}
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
      {/* Validation Modal */}
      <ValidationModal
        show={modalState.show}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
      />

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
        <div className="d-flex flex-column align-items-end">
          {lastUpdated && (
            <small className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
              <Clock size={12} className="me-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </small>
          )}
          <div className="calendar-actions">
            <Button variant="outline-primary" size="sm" onClick={goToToday} className="me-2 responsive-btn">
              Today
            </Button>
          </div>
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
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="md" 
        className="responsive-modal"
        backdrop="static"
        keyboard={false}
        centered
        style={{ zIndex: 9999 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="me-2">{getEventTypeIcon(selectedEvent?.event_type)}</span>
            Event Details
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="event-details-modal">
          {selectedEvent && (
            // View Mode - Wireframe Layout
            <div className="event-details-wireframe">
              {/* Top Section - Wide Rectangle */}
              <div className="event-top-section">
                <div className="event-header-wireframe">
                  <h4 className="event-title-wireframe" style={{ color: getEventTypeColor(selectedEvent.event_type) }}>
                    {selectedEvent.title}
                  </h4>
                  <div className="event-status-wireframe">
                    {getStatusBadge(selectedEvent.status, selectedEvent.is_ongoing)}
                  </div>
                </div>
                
                <div className="event-description-wireframe">
                  <p className="text-muted">{selectedEvent.description || 'No description provided.'}</p>
                </div>
                
                {/* Warning Message */}
                {selectedEvent.blocks_leave_submissions && (
                  <Alert variant="info" className="event-warning-wireframe">
                    <AlertCircle size={16} className="me-1" />
                    This event will block employee leave submissions during its duration.
                  </Alert>
                )}
              </div>
              
              {/* Bottom Section - 2x2 Grid */}
              <div className="event-grid-wireframe">
                <div className="event-box-wireframe">
                  <h6 className="box-title">Event Details</h6>
                  <div className="box-content">
                    <div className="box-row">
                      <span className="box-label">Event Type</span>
                      <Badge style={{ backgroundColor: getEventTypeColor(selectedEvent.event_type) }}>
                        {selectedEvent.event_type}
                      </Badge>
                    </div>
                    
                    <div className="box-row">
                      <span className="box-label">Location</span>
                      <span className="box-value">{selectedEvent.location || 'Not specified'}</span>
                    </div>
                    
                    <div className="box-row">
                      <span className="box-label">Blocks Leave</span>
                      {selectedEvent.blocks_leave_submissions ? (
                        <Badge bg="warning">Yes</Badge>
                      ) : (
                        <Badge bg="success">No</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="event-box-wireframe">
                  <h6 className="box-title">Schedule</h6>
                  <div className="box-content">
                    <div className="box-row">
                      <span className="box-label">Start Time</span>
                      <span className="box-value">{formatDateTime(selectedEvent.start_datetime)}</span>
                    </div>
                    <div className="box-row">
                      <span className="box-label">End Time</span>
                      <span className="box-value">{formatDateTime(selectedEvent.end_datetime)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="event-box-wireframe">
                  <h6 className="box-title">Created</h6>
                  <div className="box-content">
                    <div className="box-row">
                      <span className="box-label">By</span>
                      <span className="box-value">{selectedEvent.created_by}</span>
                    </div>
                    <div className="box-row">
                      <span className="box-label">At</span>
                      <span className="box-value">{formatDateTime(selectedEvent.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="event-box-wireframe">
                  <h6 className="box-title">Status</h6>
                  <div className="box-content">
                    <div className="box-row">
                      <span className="box-label">Current Status</span>
                      <Badge bg={selectedEvent.status === 'active' ? 'success' : selectedEvent.status === 'cancelled' ? 'danger' : 'secondary'}>
                        {selectedEvent.status}
                      </Badge>
                    </div>
                    <div className="box-row">
                      <span className="box-label">Duration</span>
                      <span className="box-value">
                        {(() => {
                          const start = new Date(selectedEvent.start_datetime);
                          const end = new Date(selectedEvent.end_datetime);
                          const diffMs = end.getTime() - start.getTime();
                          const diffMinutes = Math.round(diffMs / 60000);
                          
                          console.log('Duration Debug:', {
                            start: selectedEvent.start_datetime,
                            end: selectedEvent.end_datetime,
                            diffMs,
                            diffMinutes
                          });
                          
                          if (diffMinutes < 60) {
                            return `${diffMinutes} minutes`;
                          } else {
                            const hours = Math.floor(diffMinutes / 60);
                            const mins = diffMinutes % 60;
                            return mins === 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minutes`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer style={{ padding: '0.5rem 0.75rem' }}>
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

export default EmployeeCalendar;
