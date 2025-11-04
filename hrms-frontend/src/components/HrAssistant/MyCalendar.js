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
  clearAllCalendarCaches,
  holidaysApi
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
  // Removed custom time picker overlay – using native inputs only
  // no custom picker UI

  const [formErrors, setFormErrors] = useState({});
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tooltipState, setTooltipState] = useState({ visible: false, text: '', x: 0, y: 0 });

  // Custom picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [allDayEvent, setAllDayEvent] = useState(false);
  
  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-date-picker-wrapper')) {
        setShowDatePicker(false);
      }
      if (!event.target.closest('.custom-time-picker-wrapper')) {
        setShowStartTimePicker(false);
        setShowEndTimePicker(false);
      }
    };
    
    if (showDatePicker || showStartTimePicker || showEndTimePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDatePicker, showStartTimePicker, showEndTimePicker]);
  
  // Initialize date picker month when form data changes
  useEffect(() => {
    if (formData.date) {
      const date = new Date(formData.date + 'T00:00:00');
      setDatePickerMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    } else if (selectedDate) {
      setDatePickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [formData.date, selectedDate]);

  const eventTypes = [
    { value: 'meeting', label: 'Meeting', color: '#007bff' },
    { value: 'training', label: 'Training', color: '#28a745' },
    { value: 'interview', label: 'Interview', color: '#ffc107' },
    { value: 'break', label: 'Break', color: '#fd7e14' },
    { value: 'unavailable', label: 'Unavailable', color: '#dc3545' },
    { value: 'holiday_regular', label: 'Holiday (Regular)', color: '#0ea5e9' },
    { value: 'holiday_special', label: 'Holiday (Special)', color: '#ef4444' },
    { value: 'other', label: 'Other', color: '#6c757d' }
  ];

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Local fallback: 2025 PH holidays (used only if API returns none)
  const getFallbackPH2025Holidays = (startDate, endDate) => {
    const withinRange = (d) => d >= startDate.toISOString().split('T')[0] && d <= endDate.toISOString().split('T')[0];
    const list = [
      { name: "New Year's Day", date: '2025-01-01', type: 'Regular' },
      { name: 'Chinese New Year', date: '2025-01-29', type: 'Special' },
      { name: 'EDSA People Power Revolution Anniversary', date: '2025-02-25', type: 'Special' },
      { name: 'Eid al-Fitr', date: '2025-04-01', type: 'Regular' },
      { name: 'Araw ng Kagitingan (Day of Valor)', date: '2025-04-09', type: 'Regular' },
      { name: 'Maundy Thursday', date: '2025-04-17', type: 'Regular' },
      { name: 'Good Friday', date: '2025-04-18', type: 'Regular' },
      { name: 'Black Saturday', date: '2025-04-19', type: 'Special' },
      { name: 'Labor Day', date: '2025-05-01', type: 'Regular' },
      { name: 'Eid al-Adha', date: '2025-06-06', type: 'Regular' },
      { name: 'Independence Day', date: '2025-06-12', type: 'Regular' },
      { name: 'Ninoy Aquino Day', date: '2025-08-21', type: 'Special' },
      { name: "National Heroes' Day", date: '2025-08-25', type: 'Regular' },
      { name: "All Saints' Day", date: '2025-11-01', type: 'Special' },
      { name: "All Souls' Day", date: '2025-11-02', type: 'Special' },
      { name: 'Bonifacio Day', date: '2025-11-30', type: 'Regular' },
      { name: 'Feast of the Immaculate Conception of the Blessed Virgin Mary', date: '2025-12-08', type: 'Special' },
      { name: 'Christmas Eve', date: '2025-12-24', type: 'Special' },
      { name: 'Christmas Day', date: '2025-12-25', type: 'Regular' },
      { name: 'Rizal Day', date: '2025-12-30', type: 'Regular' },
      { name: "New Year's Eve", date: '2025-12-31', type: 'Special' }
    ];
    return list
      .filter(h => withinRange(h.date))
      .map((h, idx) => ({
        id: `manual_holiday_static_${h.date}_${idx}`,
        title: h.name,
        description: h.type ? `${h.type} Holiday` : 'Official Holiday',
        event_type: h.type && h.type.toLowerCase() === 'special' ? 'holiday_special' : 'holiday_regular',
        status: 'active',
        start_datetime: `${h.date}T00:00:00+08:00`,
        end_datetime: `${h.date}T23:59:59+08:00`,
        start_date_manila: h.date,
        start_time_formatted: 'All day',
        end_time_formatted: '',
        created_by: 'System',
        blocks_leave_submissions: false
      }));
  };

  // Extended fallback for 2025-2030 (fixed-date holidays and Chinese New Year dates)
  const getFallbackPHHolidays = (startDate, endDate) => {
    const withinRange = (d) => d >= startDate.toISOString().split('T')[0] && d <= endDate.toISOString().split('T')[0];
    const fixedForYear = (year) => ([
      { name: "New Year's Day", date: `${year}-01-01`, type: 'Regular' },
      { name: 'EDSA People Power Revolution Anniversary', date: `${year}-02-25`, type: 'Special' },
      { name: 'Araw ng Kagitingan (Day of Valor)', date: `${year}-04-09`, type: 'Regular' },
      { name: 'Labor Day', date: `${year}-05-01`, type: 'Regular' },
      { name: 'Independence Day', date: `${year}-06-12`, type: 'Regular' },
      { name: 'Ninoy Aquino Day', date: `${year}-08-21`, type: 'Special' },
      { name: "National Heroes' Day", date: `${year}-08-25`, type: 'Regular' },
      { name: "All Saints' Day", date: `${year}-11-01`, type: 'Special' },
      { name: "All Souls' Day", date: `${year}-11-02`, type: 'Special' },
      { name: 'Bonifacio Day', date: `${year}-11-30`, type: 'Regular' },
      { name: 'Feast of the Immaculate Conception of the Blessed Virgin Mary', date: `${year}-12-08`, type: 'Special' },
      { name: 'Christmas Eve', date: `${year}-12-24`, type: 'Special' },
      { name: 'Christmas Day', date: `${year}-12-25`, type: 'Regular' },
      { name: 'Rizal Day', date: `${year}-12-30`, type: 'Regular' },
      { name: "New Year's Eve", date: `${year}-12-31`, type: 'Special' },
    ]);
    const cnyByYear = {
      2025: '2025-01-29',
      2026: '2026-02-17',
      2027: '2027-02-06',
      2028: '2028-01-26',
      2029: '2029-02-13',
      2030: '2030-02-03'
    };
    const years = [2025, 2026, 2027, 2028, 2029, 2030];
    const list = years.flatMap(y => [
      { name: 'Chinese New Year', date: cnyByYear[y], type: 'Special' },
      ...fixedForYear(y)
    ]);
    return list
      .filter(h => withinRange(h.date))
      .map((h, idx) => ({
        id: `manual_holiday_ext_${h.date}_${idx}`,
        title: h.name,
        description: h.type ? `${h.type} Holiday` : 'Official Holiday',
        event_type: h.type && h.type.toLowerCase() === 'special' ? 'holiday_special' : 'holiday_regular',
        status: 'active',
        start_datetime: `${h.date}T00:00:00+08:00`,
        end_datetime: `${h.date}T23:59:59+08:00`,
        start_date_manila: h.date,
        start_time_formatted: 'All day',
        end_time_formatted: '',
        created_by: 'System',
        blocks_leave_submissions: false
      }));
  };

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
    const handleGlobalClick = () => setTooltipState({ visible: false, text: '', x: 0, y: 0 });
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleGlobalClick);
      clearInterval(refreshInterval);
    };
  }, [currentDate]);
  const showHolidayTooltip = (event, text) => {
    const x = event.clientX + 8;
    const y = event.clientY + 8;
    setTooltipState({ visible: true, text, x, y });
  };


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

      const baseEvents = eventsResponse.data || [];
      let holidays = [];
      try {
        const holidaysResponse = await holidaysApi.getManualHolidaysCalendar({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });
        holidays = holidaysResponse?.data || [];
      } catch (e) {
        // Non-blocking: fall back to local list
        holidays = [];
      }
      if (!holidays || holidays.length === 0) {
        // Use safe local fallback for 2025-2030 if backend has no data
        holidays = getFallbackPHHolidays(startDate, endDate);
      }
      // Merge and de-duplicate by id
      const merged = [...baseEvents, ...holidays].filter((event, index, arr) =>
        arr.findIndex(e => e.id === event.id) === index
      );

      setEvents(merged);
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
    return events.filter(event => {
      const eventDate = event.start_date_manila || '';
      // Use exact match for precision (dates are formatted as Y-m-d strings from backend)
      return eventDate === dateStr || eventDate.split('T')[0] === dateStr;
    });
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  // no custom picker helpers

  // Time selection helpers - enforce 5-minute steps and disallow past times for today
  // (restored) native time inputs; helpers below retained minimal

  const pad2 = (n) => String(n).padStart(2, '0');

  const roundToFiveMinutes = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr || '0', 10);
    const rounded = Math.round(m / 5) * 5;
    if (rounded === 60) {
      h = (h + 1) % 24;
    }
    const finalMin = rounded === 60 ? 0 : rounded;
    return `${pad2(h)}:${pad2(finalMin)}`;
  };

  const ceilNowToFiveMinutes = () => {
    const now = new Date();
    const mins = now.getMinutes();
    const ceilMin = Math.ceil(mins / 5) * 5;
    const h = ceilMin === 60 ? now.getHours() + 1 : now.getHours();
    const m = ceilMin === 60 ? 0 : ceilMin;
    return `${pad2(h % 24)}:${pad2(m)}`;
  };

  // removed custom popover time selector to restore original inputs

  const getSelectedDateISO = () => {
    let d = null;
    if (formData.date) {
      d = new Date(`${formData.date}T00:00:00`);
    } else if (selectedDate) {
      d = selectedDate;
    }
    return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
  };

  const isSelectedDateToday = () => {
    const selectedISO = getSelectedDateISO();
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    return selectedISO && selectedISO === todayISO;
  };

  // 12h/24h utilities for AM/PM selectors
  // no AM/PM helpers needed in restored mode

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
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setAllDayEvent(false);
    if (selectedDate) {
      setDatePickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    } else {
      setDatePickerMonth(new Date());
    }
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
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setAllDayEvent(false);
    setDatePickerMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    
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

  // Custom picker helper functions
  const formatDateForPicker = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatTimeForPicker = (timeStr) => {
    if (!timeStr || allDayEvent) return '00:00 AM';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const parseTimeFromPicker = (timeStr) => {
    if (!timeStr || timeStr === '00:00 AM') return '';
    const [time, ampm] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours, 10);
    if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm === 'AM' && hour24 === 12) hour24 = 0;
    return `${String(hour24).padStart(2, '0')}:${minutes}`;
  };

  // Generate time slots (every 15 minutes) - shows 12-hour format with both AM/PM options
  const generateTimeSlots = () => {
    const slots = [];
    // Generate for 12-hour format (1-12) with both AM and PM options
    for (let hour12 = 1; hour12 <= 12; hour12++) {
      for (let m = 0; m < 60; m += 15) {
        const timeDisplay = `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        // Create AM variant
        let hour24AM = hour12 === 12 ? 0 : hour12;
        slots.push({
          hour24: hour24AM,
          minute: m,
          display: timeDisplay,
          ampm: 'AM',
          value: `${String(hour24AM).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          isAM: true
        });
        
        // Create PM variant
        let hour24PM = hour12 === 12 ? 12 : hour12 + 12;
        slots.push({
          hour24: hour24PM,
          minute: m,
          display: timeDisplay,
          ampm: 'PM',
          value: `${String(hour24PM).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          isAM: false
        });
      }
    }
    return slots;
  };

  const handleDateSelect = (day, month, year) => {
    const selected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData({ ...formData, date: selected });
    setShowDatePicker(false);
  };

  const handleTimeSelect = (timeValue, field) => {
    setFormData({ ...formData, [field]: timeValue });
    if (field === 'start_time') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
  };

  // Calendar helper for date picker
  const getDaysInMonthForPicker = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonthForPicker = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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
            {dayEvents.slice(0, 3).map((event, index) => {
              const isHoliday = event.event_type === 'holiday_regular' || event.event_type === 'holiday_special';
              const displayTitle = isHoliday
                ? (event.title && event.title.length > 16 ? `${event.title.slice(0, 16)}…` : event.title)
                : event.title;
              return (
                <div
                  key={event.id}
                  className={`event-item event-${event.event_type} ${event.status === 'cancelled' ? 'event-cancelled' : ''}`}
                  style={{ 
                    backgroundColor: event.status === 'cancelled' ? '#6c757d' : getEventTypeColor(event.event_type),
                    opacity: event.status === 'cancelled' ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isHoliday) {
                      showHolidayTooltip(e, event.title);
                    } else {
                      handleViewEvent(event);
                    }
                  }}
                  title={isHoliday ? event.title : `${event.title} - ${event.start_time_formatted}${event.status === 'cancelled' ? ' (Cancelled)' : ''}`}
                  role="button"
                >
                  {!isHoliday && (
                    <span className="event-time">
                      {event.start_time_formatted}
                    </span>
                  )}
                  <span className="event-title">{displayTitle}</span>
                </div>
              );
            })}
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
        {tooltipState.visible && (
          <div
            style={{
              position: 'fixed',
              top: tooltipState.y,
              left: tooltipState.x,
              background: 'rgba(17, 24, 39, 0.95)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 10000,
              maxWidth: 260,
              fontSize: 12,
              lineHeight: 1.25,
              pointerEvents: 'none'
            }}
          >
            {tooltipState.text}
          </div>
        )}
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
                      <span className="box-value">
                        {selectedEvent.start_time_formatted ? 
                          `${selectedEvent.date_formatted || new Date(selectedEvent.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${selectedEvent.start_time_formatted}` :
                          formatDateTime(selectedEvent.start_datetime)
                        }
                      </span>
                    </div>
                    <div className="box-row">
                      <span className="box-label">End Time</span>
                      <span className="box-value">
                        {selectedEvent.end_time_formatted ? 
                          `${selectedEvent.date_formatted || new Date(selectedEvent.end_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${selectedEvent.end_time_formatted}` :
                          formatDateTime(selectedEvent.end_datetime)
                        }
                      </span>
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
              
              {/* Custom Date and Time Pickers */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date *</Form.Label>
                    <div className="custom-date-picker-wrapper" style={{ position: 'relative' }}>
                      <div 
                        className="custom-date-input"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                      >
                        <Calendar size={20} className="date-picker-icon" />
                        <div className="date-input-content">
                          <div className="date-input-label">Select a day</div>
                          <div className="date-input-value">
                            {formData.date ? formatDateForPicker(formData.date) : 
                             selectedDate ? formatDateForPicker(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`) :
                             'Select a day'}
                          </div>
                        </div>
                        <ChevronRight 
                          size={20} 
                          className={`date-picker-chevron ${showDatePicker ? 'rotated' : ''}`}
                        />
                      </div>
                      
                      {showDatePicker && (
                        <div className="custom-date-picker-dropdown">
                          <div className="date-picker-header">
                            <ChevronLeft 
                              size={16} 
                              onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                              style={{ cursor: 'pointer' }}
                            />
                            <span className="date-picker-month-year">
                              {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <ChevronRight 
                              size={16} 
                              onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                          <div className="date-picker-weekdays">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                              <div key={idx} className="date-picker-weekday">{day}</div>
                            ))}
                          </div>
                          <div className="date-picker-grid">
                            {(() => {
                              const daysInMonth = getDaysInMonthForPicker(datePickerMonth);
                              const firstDay = getFirstDayOfMonthForPicker(datePickerMonth);
                              const days = [];
                              
                              // Empty cells for days before month starts
                              for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`empty-${i}`} className="date-picker-day empty"></div>);
                              }
                              
                              // Days of the month
                              for (let day = 1; day <= daysInMonth; day++) {
                                const isSelected = formData.date && (() => {
                                  const selected = new Date(formData.date + 'T00:00:00');
                                  return selected.getDate() === day && 
                                         selected.getMonth() === datePickerMonth.getMonth() &&
                                         selected.getFullYear() === datePickerMonth.getFullYear();
                                })();
                                days.push(
                                  <div
                                    key={day}
                                    className={`date-picker-day ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleDateSelect(day, datePickerMonth.getMonth() + 1, datePickerMonth.getFullYear())}
                                  >
                                    {day}
                                  </div>
                                );
                              }
                              return days;
                            })()}
                          </div>
                          <div className="date-picker-actions">
                            <button 
                              type="button"
                              className="date-picker-remove-btn"
                              onClick={() => {
                                setFormData({ ...formData, date: '' });
                                setShowDatePicker(false);
                              }}
                            >
                              Remove
                            </button>
                            <button 
                              type="button"
                              className="date-picker-done-btn"
                              onClick={() => setShowDatePicker(false)}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Time *</Form.Label>
                    <div className="custom-time-picker-wrapper">
                      {/* Start Time */}
                      <div 
                        className={`custom-time-input ${showStartTimePicker ? 'active' : ''}`}
                        onClick={() => {
                          setShowStartTimePicker(!showStartTimePicker);
                          setShowEndTimePicker(false);
                        }}
                      >
                        <Clock size={20} className="time-picker-icon" />
                        <div className="time-input-content">
                          <div className="time-input-label">Start with</div>
                          <div className="time-input-value">
                            {allDayEvent ? 'All day' : (formData.start_time ? formatTimeForPicker(formData.start_time) : '00:00 AM')}
                          </div>
                        </div>
                        <ChevronRight 
                          size={20} 
                          className={`time-picker-chevron ${showStartTimePicker ? 'rotated' : ''}`}
                        />
                      </div>
                      
                      {/* Time Picker Dropdown for Start Time */}
                      {showStartTimePicker && (
                        <div className="custom-time-picker-dropdown">
                          <div className="time-picker-all-day">
                            <input
                              type="radio"
                              id="all-day-start"
                              checked={allDayEvent}
                              onChange={(e) => {
                                setAllDayEvent(e.target.checked);
                                if (e.target.checked) {
                                  setFormData({ ...formData, start_time: '00:00', end_time: '23:59' });
                                }
                              }}
                            />
                            <label htmlFor="all-day-start">All day</label>
                          </div>
                          <div className="time-picker-slots">
                            {(() => {
                              // Group slots by display time (e.g., "12:00" groups AM and PM together)
                              const slots = generateTimeSlots();
                              const grouped = {};
                              slots.forEach(slot => {
                                if (!grouped[slot.display]) {
                                  grouped[slot.display] = { am: null, pm: null };
                                }
                                if (slot.isAM) {
                                  grouped[slot.display].am = slot;
                                } else {
                                  grouped[slot.display].pm = slot;
                                }
                              });
                              
                              return Object.keys(grouped).map((displayTime, idx) => {
                                const group = grouped[displayTime];
                                const amSelected = formData.start_time === group.am?.value;
                                const pmSelected = formData.start_time === group.pm?.value;
                                const isSelected = amSelected || pmSelected;
                                
                                return (
                                  <div 
                                    key={idx}
                                    className={`time-picker-slot ${isSelected ? 'selected' : ''}`}
                                  >
                                    <span className="time-slot-time">{displayTime}</span>
                                    <div className="time-slot-ampm">
                                      <button
                                        type="button"
                                        className={`ampm-btn ${amSelected ? 'active' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (group.am) {
                                            handleTimeSelect(group.am.value, 'start_time');
                                          }
                                        }}
                                      >
                                        AM
                                      </button>
                                      <button
                                        type="button"
                                        className={`ampm-btn ${pmSelected ? 'active' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (group.pm) {
                                            handleTimeSelect(group.pm.value, 'start_time');
                                          }
                                        }}
                                      >
                                        PM
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* End Time */}
                      <div 
                        className={`custom-time-input ${showEndTimePicker ? 'active' : ''}`}
                        onClick={() => {
                          setShowEndTimePicker(!showEndTimePicker);
                          setShowStartTimePicker(false);
                        }}
                      >
                        <Clock size={20} className="time-picker-icon" />
                        <div className="time-input-content">
                          <div className="time-input-label">End with</div>
                          <div className="time-input-value">
                            {allDayEvent ? '' : (formData.end_time ? formatTimeForPicker(formData.end_time) : '')}
                          </div>
                        </div>
                        <ChevronRight 
                          size={20} 
                          className={`time-picker-chevron ${showEndTimePicker ? 'rotated' : ''}`}
                        />
                      </div>
                      
                      {/* Time Picker Dropdown for End Time */}
                      {showEndTimePicker && (
                        <div className="custom-time-picker-dropdown">
                          <div className="time-picker-all-day">
                            <input
                              type="radio"
                              id="all-day-end"
                              checked={allDayEvent}
                              onChange={(e) => {
                                setAllDayEvent(e.target.checked);
                                if (e.target.checked) {
                                  setFormData({ ...formData, start_time: '00:00', end_time: '23:59' });
                                }
                              }}
                            />
                            <label htmlFor="all-day-end">All day</label>
                          </div>
                          <div className="time-picker-slots">
                            {(() => {
                              // Group slots by display time (e.g., "12:00" groups AM and PM together)
                              const slots = generateTimeSlots();
                              const grouped = {};
                              slots.forEach(slot => {
                                if (!grouped[slot.display]) {
                                  grouped[slot.display] = { am: null, pm: null };
                                }
                                if (slot.isAM) {
                                  grouped[slot.display].am = slot;
                                } else {
                                  grouped[slot.display].pm = slot;
                                }
                              });
                              
                              return Object.keys(grouped).map((displayTime, idx) => {
                                const group = grouped[displayTime];
                                const amSelected = formData.end_time === group.am?.value;
                                const pmSelected = formData.end_time === group.pm?.value;
                                const isSelected = amSelected || pmSelected;
                                
                                return (
                                  <div 
                                    key={idx}
                                    className={`time-picker-slot ${isSelected ? 'selected' : ''}`}
                                  >
                                    <span className="time-slot-time">{displayTime}</span>
                                    <div className="time-slot-ampm">
                                      <button
                                        type="button"
                                        className={`ampm-btn ${amSelected ? 'active' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (group.am) {
                                            handleTimeSelect(group.am.value, 'end_time');
                                          }
                                        }}
                                      >
                                        AM
                                      </button>
                                      <button
                                        type="button"
                                        className={`ampm-btn ${pmSelected ? 'active' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (group.pm) {
                                            handleTimeSelect(group.pm.value, 'end_time');
                                          }
                                        }}
                                      >
                                        PM
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
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
