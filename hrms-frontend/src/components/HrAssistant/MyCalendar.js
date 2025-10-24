import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Modal, Alert } from 'react-bootstrap';
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit3, Trash2, Eye, X, Check, AlertCircle, Clock } from 'lucide-react';
import { 
  hrCalendarApi,
  employeeCalendarApi,
  formatEventForForm,
  formatEventForDisplay,
  getEventTypeColor,
  getEventTypeIcon,
  getInvitationStatusColor,
  getInvitationStatusText,
  clearAllCalendarCaches
} from '../../api/calendar';
import ValidationModal from '../common/ValidationModal';
import ConfirmationModal from '../common/ConfirmationModal';
import useValidationModal from '../../hooks/useValidationModal';
import './MyCalendar.css';

const MyCalendar = () => {
  const { modalState, showSuccess, showError, showWarning, hideModal } = useValidationModal();
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'view'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'meeting',
    blocks_leave_submissions: true,
    location: '',
    date: '',
    invited_employees: []
  });

  const [formErrors, setFormErrors] = useState({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const eventTypes = [
    { value: 'meeting', label: 'Meeting', color: '#007bff' },
    { value: 'training', label: 'Training', color: '#28a745' },
    { value: 'interview', label: 'Interview', color: '#ffc107' },
    { value: 'break', label: 'Break', color: '#fd7e14' },
    { value: 'unavailable', label: 'Unavailable', color: '#dc3545' },
    { value: 'other', label: 'Other', color: '#6c757d' }
  ];

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
      
      const [eventsResponse, employeesResponse] = await Promise.all([
        hrCalendarApi.getEvents({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }),
        hrCalendarApi.getEmployees()
      ]);

      setEvents(eventsResponse.data || []);
      setEmployees(employeesResponse.data || []);
      setFilteredEmployees(employeesResponse.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading calendar data:', error);
      if (showLoadingIndicator) {
        showAlert('Error loading calendar events. Please try again.', 'danger');
      }
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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Event title is required';
    }
    
    if (!formData.event_type) {
      errors.event_type = 'Event type is required';
    }
    
    if (!formData.date && !selectedDate) {
      errors.date = 'Event date is required';
    }
    
    if (!formData.start_time) {
      errors.start_time = 'Start time is required';
    }
    
    if (!formData.end_time) {
      errors.end_time = 'End time is required';
    }
    
    if (formData.start_time && formData.end_time) {
      const startTime = new Date(`2000-01-01T${formData.start_time}`);
      const endTime = new Date(`2000-01-01T${formData.end_time}`);
      if (endTime <= startTime) {
        errors.end_time = 'End time must be after start time';
      }
    }

    // If there are validation errors, show them in a modal
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('\n');
      setValidationMessage(errorMessages);
      setShowValidationModal(true);
      return false;
    }

    setFormErrors({});
    return true;
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


  const resetForm = () => {
    let dateValue = '';
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      dateValue = `${year}-${month}-${day}`;
    }
    
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      event_type: 'meeting',
      blocks_leave_submissions: true,
      location: '',
      date: dateValue,
      invited_employees: []
    });
    setFormErrors({});
    setShowValidationModal(false);
    setValidationMessage('');
    setEmployeeSearchTerm('');
    setPositionFilter('all');
    setFilteredEmployees(employees);
  };

  const handleCreateEvent = async (date = null) => {
    setSelectedDate(date || new Date());
    resetForm();
    setModalType('create');
    setSelectedEvent(null);
    
    // Refresh employee list to ensure it's current
    try {
      const employeesResponse = await hrCalendarApi.getEmployees();
      setEmployees(employeesResponse.data || []);
      setFilteredEmployees(employeesResponse.data || []);
    } catch (error) {
      console.error('Error refreshing employee list:', error);
    }
    
    setShowModal(true);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    handleCreateEvent(date);
  };

  const handleEditEvent = async (event) => {
    const eventDate = new Date(event.start_datetime);
    const startTime = eventDate.toTimeString().slice(0, 5);
    const endDate = new Date(event.end_datetime);
    const endTime = endDate.toTimeString().slice(0, 5);
    
    // Format date in local timezone
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setFormData({
      title: event.title,
      description: event.description || '',
      start_time: startTime,
      end_time: endTime,
      event_type: event.event_type,
      blocks_leave_submissions: event.blocks_leave_submissions,
      location: event.location || '',
      date: formattedDate,
      invited_employees: event.invited_employees ? event.invited_employees.map(emp => emp.id) : []
    });
    setSelectedDate(eventDate);
    setModalType('edit');
    setSelectedEvent(event);
    setEmployeeSearchTerm('');
    
    // Refresh employee list to ensure it's current
    try {
      const employeesResponse = await hrCalendarApi.getEmployees();
      setEmployees(employeesResponse.data || []);
      setFilteredEmployees(employeesResponse.data || []);
    } catch (error) {
      console.error('Error refreshing employee list:', error);
      setFilteredEmployees(employees);
    }
    
    setShowModal(true);
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setModalType('view');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Combine date and time for datetime fields - ensure local date is used
      let eventDate;
      if (formData.date) {
        eventDate = formData.date;
      } else if (selectedDate) {
        // Format date in local timezone
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        eventDate = `${year}-${month}-${day}`;
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        eventDate = `${year}-${month}-${day}`;
      }
      
      // Create datetime strings in Asia/Manila timezone
      const startDateTime = `${eventDate}T${formData.start_time}:00+08:00`;
      const endDateTime = `${eventDate}T${formData.end_time}:00+08:00`;
      
      const eventData = {
        ...formData,
        start_datetime: startDateTime,
        end_datetime: endDateTime
      };
      
      // Remove the separate date, start_time, end_time fields
      delete eventData.date;
      delete eventData.start_time;
      delete eventData.end_time;
      
      if (modalType === 'create') {
        await hrCalendarApi.createEvent(eventData);
        showAlert('Event created successfully!', 'success');
      } else if (modalType === 'edit') {
        await hrCalendarApi.updateEvent(selectedEvent.id, eventData);
        showAlert('Event updated successfully!', 'success');
      }
      
      setShowModal(false);
      resetForm();
      // Refresh after successful operation
      loadData();
    } catch (error) {
      console.error('Error saving event:', error);
      const errorMessage = error.response?.data?.message || 'Error saving event. Please try again.';
      
      // Handle server-side validation errors
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).join('\n');
        setValidationMessage(errorMessages);
        setShowValidationModal(true);
      } else {
        // For general errors, show modal
        showAlert(errorMessage, 'danger');
      }
    }
  };

  const handleCancelEvent = async (eventId) => {
    const event = events.find(e => e.id === eventId);
    const employeeCount = event?.invited_employees?.length || 0;
    
    setConfirmationData({
      eventId,
      title: "Cancel Event",
      message: `Are you sure you want to cancel this event? This action cannot be undone${employeeCount > 0 ? ` and ${employeeCount} employee(s) will be notified` : ''}.`,
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await hrCalendarApi.cancelEvent(eventId);
          
          // Clear all calendar caches to ensure real-time updates across all user roles
          clearAllCalendarCaches();
          
          // Close modals first
          setShowModal(false);
          setShowConfirmationModal(false);
          
          // Reload data
          await loadData(false);
          
          // Show success modal after everything is updated
          showSuccess(
            employeeCount > 0 
              ? `Cancellation successful! ${employeeCount} employee(s) have been notified and all calendars have been updated.`
              : 'Cancellation successful! The event has been cancelled and all calendars have been updated.'
          );
        } catch (error) {
          console.error('Error cancelling event:', error);
          const errorMessage = error.response?.data?.message || 'Failed to cancel event. Please try again.';
          showError(errorMessage);
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmationModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await hrCalendarApi.deleteEvent(eventId);
        showAlert('Event deleted successfully!', 'success');
        loadData();
      } catch (error) {
        console.error('Error deleting event:', error);
        showAlert('Error deleting event. Please try again.', 'danger');
      }
    }
  };

  const handleCompleteEvent = async (eventId) => {
    try {
      await hrCalendarApi.completeEvent(eventId);
      showAlert('Event marked as completed!', 'success');
      loadData();
    } catch (error) {
      console.error('Error completing event:', error);
      showAlert('Error completing event. Please try again.', 'danger');
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      invited_employees: prev.invited_employees.includes(employeeId)
        ? prev.invited_employees.filter(id => id !== employeeId)
        : [...prev.invited_employees, employeeId]
    }));
  };

  const handleSelectAll = () => {
    const allFilteredEmployeeIds = filteredEmployees.map(emp => emp.id);
    const allSelected = allFilteredEmployeeIds.every(id => formData.invited_employees.includes(id));
    
    if (allSelected) {
      // Deselect all filtered employees
      setFormData(prev => ({
        ...prev,
        invited_employees: prev.invited_employees.filter(id => !allFilteredEmployeeIds.includes(id))
      }));
    } else {
      // Select all filtered employees
      setFormData(prev => ({
        ...prev,
        invited_employees: [...new Set([...prev.invited_employees, ...allFilteredEmployeeIds])]
      }));
    }
  };

  const handleEmployeeSearch = (searchTerm) => {
    setEmployeeSearchTerm(searchTerm);
    filterEmployees(searchTerm, positionFilter);
  };

  const handlePositionFilter = (position) => {
    setPositionFilter(position);
    filterEmployees(employeeSearchTerm, position);
  };

  const filterEmployees = (searchTerm, position) => {
    let filtered = employees;

    // Filter by position
    if (position !== 'all') {
      filtered = filtered.filter(employee => 
        employee.position && employee.position.toLowerCase() === position.toLowerCase()
      );
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  };

  const getUniquePositions = () => {
    const positions = employees
      .map(employee => employee.position)
      .filter(position => position && position.trim() !== '')
      .map(position => position.trim());
    
    // Remove duplicates and sort alphabetically
    return [...new Set(positions)].sort();
  };

  const getEventTypeColor = (eventType) => {
    const type = eventTypes.find(t => t.value === eventType);
    return type ? type.color : '#6c757d';
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
          onClick={() => handleDateClick(date)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewEvent(event);
                }}
                title={`${event.title} - ${event.start_time_formatted}${event.status === 'cancelled' ? ' (Cancelled)' : ''}`}
              >
                <span className="event-time">
                  {event.start_time_formatted}
                </span>
                <span className="event-title">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events" onClick={(e) => {
                e.stopPropagation();
                // Handle showing more events
              }}>
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
    <Container fluid className="my-calendar">
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
            <Button variant="primary" size="sm" onClick={() => handleCreateEvent()}>
              <Plus size={16} className="me-1" /> New Event
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

      {/* Event Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="lg"
        backdrop="static"
        keyboard={false}
        className="event-details-side-panel"
        style={{ zIndex: 9999 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === 'create' && `Create Event - ${selectedDate ? selectedDate.toLocaleDateString() : ''}`}
            {modalType === 'edit' && 'Edit Event'}
            {modalType === 'view' && 'Event Details'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="event-details-modal">
          {modalType === 'view' && selectedEvent ? (
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
                        {Math.round((new Date(selectedEvent.end_datetime) - new Date(selectedEvent.start_datetime)) / (1000 * 60 * 60))} hours
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              {selectedEvent.status === 'active' && (
                <div className="event-actions-wireframe">
                  <div className="cancel-info">
                    {selectedEvent.invited_employees && selectedEvent.invited_employees.length > 0 && (
                      <small className="text-muted mb-2 d-block">
                        <i className="fas fa-info-circle me-1"></i>
                        {selectedEvent.invited_employees.length} employee(s) will be notified of the cancellation
                      </small>
                    )}
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleCancelEvent(selectedEvent.id)}
                    className="cancel-event-btn"
                  >
                    Cancel Event
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Create/Edit Mode
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Event Title *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter event title"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Event Type *</Form.Label>
                    <Form.Select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      required
                    >
                      {eventTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter event description (optional)"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter meeting location (optional)"
                />
                <Form.Text className="text-muted">
                  Specify the meeting room, address, or virtual meeting link.
                </Form.Text>
              </Form.Group>
              
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.date || (selectedDate ? (() => {
                        const year = selectedDate.getFullYear();
                        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedDate.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })() : '')}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time *</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time *</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Block leave submissions during this event"
                  checked={formData.blocks_leave_submissions}
                  onChange={(e) => setFormData({ ...formData, blocks_leave_submissions: e.target.checked })}
                />
                <Form.Text className="text-muted">
                  When enabled, employees will not be able to submit leave requests during this event's time period.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Invite Employees (Optional)</Form.Label>
                <Form.Text className="text-muted d-block mb-2">
                  Select specific employees to invite. If no employees are selected, this will be a public event visible to all employees.
                </Form.Text>
                
                {/* Employee Search and Filter */}
                <Row className="mb-3">
                  <Col md={8}>
                    <Form.Control
                      type="text"
                      placeholder="Search employees by name or email..."
                      value={employeeSearchTerm}
                      onChange={(e) => handleEmployeeSearch(e.target.value)}
                      className="employee-search-input"
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Select
                      value={positionFilter}
                      onChange={(e) => handlePositionFilter(e.target.value)}
                    >
                      <option value="all">All Positions</option>
                      {getUniquePositions().map(position => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
                
                {/* Select All Option */}
                {filteredEmployees.length > 0 && (
                  <Form.Check
                    type="checkbox"
                    id="select-all-employees"
                    label={`Select All (${filteredEmployees.length} employees)`}
                    checked={filteredEmployees.every(emp => formData.invited_employees.includes(emp.id))}
                    onChange={handleSelectAll}
                    className="mb-3 select-all-checkbox"
                    style={{ fontWeight: 'bold', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}
                  />
                )}
                
                <div className="employee-selection">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(employee => (
                      <Form.Check
                        key={employee.id}
                        type="checkbox"
                        id={`employee-${employee.id}`}
                        label={`${employee.name} (${employee.email})`}
                        checked={formData.invited_employees.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="mb-2"
                      />
                    ))
                  ) : (
                    <div className="text-muted text-center py-3">
                      {employeeSearchTerm || positionFilter !== 'all' ? 'No employees found matching your search/filter.' : 'No employees available.'}
                    </div>
                  )}
                </div>
                
                {formData.invited_employees.length > 0 && (
                  <div className="mt-2">
                    <small className="employee-selection-count">
                      {formData.invited_employees.length} employee(s) selected
                    </small>
                  </div>
                )}
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            {modalType === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {modalType !== 'view' && (
            <Button variant="primary" onClick={handleSubmit}>
              {modalType === 'create' ? 'Create Event' : 'Update Event'}
            </Button>
          )}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmationModal}
        onHide={() => setShowConfirmationModal(false)}
        onConfirm={confirmationData?.onConfirm}
        title={confirmationData?.title}
        message={confirmationData?.message}
        confirmText="Cancel Event"
        cancelText="Keep Event"
        variant="danger"
        isLoading={loading}
      />
    </Container>
  );
};

export default MyCalendar;
