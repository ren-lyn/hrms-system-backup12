import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Alert, 
  Spinner, 
  Button,
  Badge,
  Table,
  Form,
  Modal
} from 'react-bootstrap';
import { 
  FaUsers, 
  FaClock, 
  FaChartLine,
  FaDownload,
  FaUpload,
  FaSearch,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaClipboardList,
  FaEdit
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';
import { useDebounce } from '../../utils/debounce';
import { toast } from 'react-toastify';

const AttendanceDashboard = () => {
    // Get current month start and end dates
    const getCurrentMonthDates = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    };

    // Date range preset functions
    const getDateRangePreset = (preset) => {
        const now = new Date();
        let start, end;

        switch (preset) {
            case 'today':
                start = end = now;
                break;
            case 'yesterday':
                start = end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                break;
            case 'this_week':
                const dayOfWeek = now.getDay(); // 0 = Sunday
                const monday = new Date(now);
                monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Adjust to Monday
                start = monday;
                end = now;
                break;
            case 'last_week':
                const lastWeekEnd = new Date(now);
                lastWeekEnd.setDate(now.getDate() - now.getDay()); // Last Sunday
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Last Monday
                start = lastWeekStart;
                end = lastWeekEnd;
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last_7_days':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                end = now;
                break;
            case 'last_30_days':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
                end = now;
                break;
            default:
                return null;
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    };

    const [attendanceData, setAttendanceData] = useState({
        statistics: {
            total_employees: 0,
            total_records: 0,
            present_count: 0,
            absent_count: 0,
            late_count: 0,
            attendance_rate: 0
        },
        recent_attendance: [],
        pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 50,
            total: 0
        }
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [detectedPeriod, setDetectedPeriod] = useState(null);
    const [validationWarning, setValidationWarning] = useState('');
    const [importHistory, setImportHistory] = useState([]);
    const [importHistoryLoading, setImportHistoryLoading] = useState(false);
    
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editFormData, setEditFormData] = useState({
        clock_in: '',
        clock_out: '',
        status: '',
        remarks: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    
    // Filter states
    const defaultDates = getCurrentMonthDates();
    const [dateFrom, setDateFrom] = useState(defaultDates.start);
    const [dateTo, setDateTo] = useState(defaultDates.end);
    
    // Temporary date states for user input (not applied yet)
    const [tempDateFrom, setTempDateFrom] = useState(defaultDates.start);
    const [tempDateTo, setTempDateTo] = useState(defaultDates.end);
    
    const [searchInput, setSearchInput] = useState(''); // User's input
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Debounce search input for better performance
    const debouncedSearch = useDebounce(searchInput, 500);

    // All records state
    const [allRecords, setAllRecords] = useState([]);
    const [allTotal, setAllTotal] = useState(0);
    const [allPage, setAllPage] = useState(1);
    const [allPerPage, setAllPerPage] = useState(100);
    const [allLoading, setAllLoading] = useState(false);

    // Apply date preset (for quick select buttons)
    const applyDatePreset = (preset) => {
        const range = getDateRangePreset(preset);
        if (range) {
            // For quick presets, apply immediately
            setDateFrom(range.start);
            setDateTo(range.end);
            setTempDateFrom(range.start);
            setTempDateTo(range.end);
        }
    };

    // Apply manually selected date range
    const applyDateRange = () => {
        setDateFrom(tempDateFrom);
        setDateTo(tempDateTo);
    };

    // Check if dates have changed
    const datesChanged = tempDateFrom !== dateFrom || tempDateTo !== dateTo;

    // Handle Enter key press on date inputs
    const handleDateKeyPress = (e) => {
        if (e.key === 'Enter' && datesChanged) {
            applyDateRange();
        }
    };

    // Get human-readable date range text
    const getDateRangeText = () => {
        if (!dateFrom || !dateTo) return '';
        
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        
        // Check if it's today
        const today = new Date();
        if (dateFrom === dateTo && 
            from.toDateString() === today.toDateString()) {
            return 'Today';
        }
        
        // Check if same date but not today
        if (dateFrom === dateTo) {
            return format(from, 'MMM dd, yyyy');
        }
        
        // Different dates - always use the full date range with month abbreviations
        return `${format(from, 'MMM dd, yyyy')} - ${format(to, 'MMM dd, yyyy')}`;
    };

    // Fetch data when filters change
    useEffect(() => {
        fetchAttendanceData();
        fetchAllAttendanceRecords(1);
    }, [dateFrom, dateTo, debouncedSearch, statusFilter]);

    const fetchAttendanceData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                date_from: dateFrom,
                date_to: dateTo
            };
            
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            
            if (statusFilter && statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const response = await axios.get('/attendance/dashboard', { params });
            if (response.data && response.data.success) {
                setAttendanceData(response.data.data);
                setError('');
            } else {
                setError(response.data?.message || 'Failed to load attendance data');
            }
        } catch (err) {
            console.error('API Error:', err);
            setError(err.response?.data?.message || err.message || 'An error occurred while loading data');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, debouncedSearch, statusFilter]);

    // Handle edit button click
    const handleEditClick = (record) => {
        // Convert time format from HH:MM:SS to HH:MM for HTML time input
        const formatTimeForInput = (time) => {
            if (!time) return '';
            // If time has seconds (HH:MM:SS), strip them to get HH:MM
            const parts = time.split(':');
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}`;
            }
            return time;
        };
        
        setEditingRecord(record);
        setEditFormData({
            clock_in: formatTimeForInput(record.clock_in),
            clock_out: formatTimeForInput(record.clock_out),
            status: record.status || '',
            remarks: record.remarks || ''
        });
        setShowEditModal(true);
    };

    // Handle form input changes
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Save edited record
    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        
        setIsSaving(true);
        try {
            // Convert time format from HH:MM to HH:MM:SS for backend validation
            const formatTimeForBackend = (time) => {
                if (!time) return null;
                // If already includes seconds (HH:MM:SS), return as is
                if (time.split(':').length === 3) return time;
                // Otherwise add :00 for seconds
                return `${time}:00`;
            };
            
            const dataToSend = {
                ...editFormData,
                clock_in: formatTimeForBackend(editFormData.clock_in),
                clock_out: formatTimeForBackend(editFormData.clock_out)
            };
            
            const response = await axios.put(`/attendance/${editingRecord.id}`, dataToSend);
            if (response.data.success) {
                // Refresh the records
                fetchAllAttendanceRecords(allPage);
                fetchAttendanceData(); // Also refresh dashboard stats
                setShowEditModal(false);
                // Show success message
                toast.success('Attendance record updated successfully');
            } else {
                throw new Error(response.data.message || 'Failed to update record');
            }
        } catch (error) {
            console.error('Error updating attendance record:', error);
            toast.error(error.response?.data?.message || 'Failed to update attendance record');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchAllAttendanceRecords = useCallback(async (page = 1) => {
        setAllLoading(true);
        try {
            const params = {
                date_from: dateFrom,
                date_to: dateTo,
                per_page: allPerPage,
                page
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

            const res = await axios.get('/attendance', { params });
            if (res.data?.success) {
                const payload = res.data.data;
                // Laravel paginator
                if (payload?.data) {
                    setAllRecords(payload.data);
                    setAllTotal(payload.total || payload.data.length || 0);
                    setAllPage(payload.current_page || 1);
                    setAllPerPage(payload.per_page || allPerPage);
                } else if (Array.isArray(payload)) {
                    setAllRecords(payload);
                    setAllTotal(payload.length);
                    setAllPage(1);
                } else {
                    setAllRecords([]);
                    setAllTotal(0);
                    setAllPage(1);
                }
            }
        } catch (e) {
            console.error('Failed to fetch all attendance records:', e);
        } finally {
            setAllLoading(false);
        }
    }, [dateFrom, dateTo, debouncedSearch, statusFilter, allPerPage]);

    const handleResetFilters = useCallback(() => {
        const dates = getCurrentMonthDates();
        setDateFrom(dates.start);
        setDateTo(dates.end);
        setTempDateFrom(dates.start);
        setTempDateTo(dates.end);
        setSearchInput('');
        setStatusFilter('all');
    }, []);

    // Search is now handled by debounced value, no need for Enter key

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            params.append('date_from', dateFrom);
            params.append('date_to', dateTo);
            if (statusFilter && statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            const response = await axios.get(`/attendance/export?${params.toString()}`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = `attendance_${dateFrom}_to_${dateTo}.csv`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to export attendance: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            toast.warn('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
            return;
        }

        setSelectedFile(file);
        setUploadLoading(true);
        setValidationWarning('');
        setDetectedPeriod(null);

        try {
            // Validate file and detect period
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post('/attendance/import/validate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                setDetectedPeriod(response.data.data);
                if (response.data.data.has_overlap) {
                    setValidationWarning(response.data.data.warning);
                }
            } else {
                toast.error(response.data.message || 'Validation failed');
                setSelectedFile(null);
            }
        } catch (error) {
            toast.error('Validation failed: ' + (error.response?.data?.message || error.message));
            setSelectedFile(null);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleImportConfirm = async () => {
        if (!selectedFile || !detectedPeriod) return;

        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('period_start', detectedPeriod.period_start);
            formData.append('period_end', detectedPeriod.period_end);
            
            // Calculate the number of days between start and end dates
            const startDate = new Date(detectedPeriod.period_start);
            const endDate = new Date(detectedPeriod.period_end);
            const timeDiff = endDate - startDate;
            const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            // If the date range is more than 14 days, consider it a monthly import
            const importType = dayDiff > 14 ? 'monthly' : 'weekly';
            formData.append('import_type', importType);
            
            const response = await axios.post('/attendance/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                const { imported, failed, skipped, absent_marked: absentMarked = 0 } = response.data.data || {};
                toast.success(
                    (
                        <div>
                            <div className="fw-semibold">Import completed successfully</div>
                            <div className="small">Imported: {imported} | Failed: {failed} | Skipped: {skipped}{absentMarked > 0 ? ` | Marked as Absent: ${absentMarked}` : ''}</div>
                        </div>
                    ),
                    { autoClose: 7000 }
                );
                fetchAttendanceData();
                fetchAllAttendanceRecords(1); // Refresh the records table
                setShowImportModal(false);
                setSelectedFile(null);
                setDetectedPeriod(null);
                setValidationWarning('');
            } else {
                let errorMsg = 'Import failed: ' + (response.data.message || 'Unknown error');
                if (response.data.errors && response.data.errors.length > 0) {
                    errorMsg += ' | ' + response.data.errors.slice(0, 3).join(' | ');
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            let errorMsg = 'Import failed: ' + (error.response?.data?.message || error.message);
            if (error.response?.data?.errors) {
                errorMsg += ' | ' + JSON.stringify(error.response.data.errors);
            }
            toast.error(errorMsg);
        } finally {
            setUploadLoading(false);
        }
    };

    const fetchImportHistory = async () => {
        setImportHistoryLoading(true);
        try {
            const response = await axios.get('/attendance/import/history', {
                params: { per_page: 20 }
            });
            if (response.data.success) {
                // Backend now returns items array directly in data field
                const items = response.data.data || [];
                setImportHistory(items);
            } else {
                throw new Error(response.data?.message || 'Failed to load import history');
            }
        } catch (error) {
            console.error('Error fetching import history:', error);
            // You might want to show an error message to the user here
        } finally {
            setImportHistoryLoading(false);
        }
    };

    const handleShowImportHistory = () => {
        setShowImportHistoryModal(true);
        fetchImportHistory();
    };

    const downloadTemplate = async () => {
        try {
            const response = await axios.get('/attendance/import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'attendance_import_template.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error('Failed to download template: ' + error.message);
        }
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p className="mt-3">Loading attendance data...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center">
                    <FaClipboardList className="text-primary me-2" size={24} />
                    <h2 className="mb-0 text-primary">Attendance Dashboard</h2>
                </div>
                <Button 
                    variant="primary" 
                    onClick={fetchAttendanceData}
                    disabled={loading}
                >
                    <FaSync className="me-1" size={14} />
                    Refresh
                </Button>
            </div>

            {/* Error Display */}
            {error && (
                <Alert variant="danger" className="mb-4">
                    <FaExclamationTriangle className="me-2" />
                    {error}
                </Alert>
            )}

            {/* Statistics Cards */}
            <Row className="mb-4">
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-primary mb-1">
                                {attendanceData.statistics?.total_employees || 0}
                            </div>
                            <div className="text-muted small">Total Employees</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-success mb-1">
                                {attendanceData.statistics?.present_count || 0}
                            </div>
                            <div className="text-muted small">Present</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-warning mb-1">
                                {attendanceData.statistics?.late_count || 0}
                            </div>
                            <div className="text-muted small">Late</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-info mb-1">
                                {attendanceData.statistics?.overtime_count || 0}
                            </div>
                            <div className="text-muted small">Overtime</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-primary mb-1">
                                {attendanceData.statistics?.undertime_count || 0}
                            </div>
                            <div className="text-muted small">Undertime</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-primary mb-1">
                                {attendanceData.statistics?.on_leave_count || 0}
                            </div>
                            <div className="text-muted small">On Leave</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Row className="mb-4">
                <Col xl={3} lg={6} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '120px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-success mb-1">
                                {attendanceData.statistics?.attendance_rate || 0}%
                            </div>
                            <div className="text-muted small">Attendance Rate</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} lg={6} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '120px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-danger mb-1">
                                {attendanceData.statistics?.absent_count || 0}
                            </div>
                            <div className="text-muted small">Absent</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} lg={6} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '120px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-info mb-1">
                                {new Date().toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="text-muted small">This Month</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} lg={6} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '120px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-secondary mb-1">
                                {attendanceData.statistics?.total_records || 0}
                            </div>
                            <div className="text-muted small">Total Records</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filters Row */}
            <Row className="mb-3">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            {/* Current Date Range Display */}
                            <div className="mb-2 d-flex align-items-center">
                                <FaCalendarAlt className="text-primary me-2" />
                                <span className="fw-bold text-primary">{getDateRangeText()}</span>
                            </div>

                            {/* Quick Date Range Presets */}
                            <Row className="mb-3">
                                <Col>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <span className="small fw-bold text-muted me-2">Quick Select:</span>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('today')}
                                            className="px-3"
                                        >
                                            Today
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('yesterday')}
                                            className="px-3"
                                        >
                                            Yesterday
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('this_week')}
                                            className="px-3"
                                        >
                                            This Week
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('last_week')}
                                            className="px-3"
                                        >
                                            Last Week
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('this_month')}
                                            className="px-3"
                                        >
                                            This Month
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('last_month')}
                                            className="px-3"
                                        >
                                            Last Month
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('last_7_days')}
                                            className="px-3"
                                        >
                                            Last 7 Days
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm"
                                            onClick={() => applyDatePreset('last_30_days')}
                                            className="px-3"
                                        >
                                            Last 30 Days
                                        </Button>
                                    </div>
                                </Col>
                            </Row>

                            <hr className="my-3" />

                            <Row className="g-3">
                                {/* Date Range */}
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">
                                            <FaCalendarAlt className="me-1" size={12} />
                                            From Date
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            size="sm"
                                            value={tempDateFrom}
                                            onChange={(e) => setTempDateFrom(e.target.value)}
                                            onKeyPress={handleDateKeyPress}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">
                                            <FaCalendarAlt className="me-1" size={12} />
                                            To Date
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            size="sm"
                                            value={tempDateTo}
                                            onChange={(e) => setTempDateTo(e.target.value)}
                                            onKeyPress={handleDateKeyPress}
                                        />
                                    </Form.Group>
                                </Col>
                                
                                {/* Apply Button */}
                                <Col md={1} className="d-flex align-items-end">
                                    <Button 
                                        variant={datesChanged ? "primary" : "outline-secondary"}
                                        size="sm"
                                        onClick={applyDateRange}
                                        disabled={!datesChanged}
                                        className="w-100"
                                        title="Apply date range"
                                    >
                                        Apply
                                    </Button>
                                </Col>
                                
                                {/* Search */}
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">
                                            <FaSearch className="me-1" size={12} />
                                            Search Employee
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            size="sm"
                                            placeholder="Name, position, department..."
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                
                                {/* Status Filter */}
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">Status</Form.Label>
                                        <Form.Select
                                            size="sm"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="Present">Present</option>
                                            <option value="Absent">Absent</option>
                                            <option value="Late">Late</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Undertime">Undertime</option>
                                            <option value="Overtime">Overtime</option>
                                            <option value="Holiday (No Work)">Holiday (No Work)</option>
                                            <option value="Holiday (Worked)">Holiday (Worked)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                
                                {/* Reset Button */}
                                <Col md={1} className="d-flex align-items-end">
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="w-100"
                                        title="Reset Filters"
                                    >
                                        <FaSync size={14} />
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Controls Row */}
            <Row className="mb-3">
                <Col>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="text-muted small">
                            Showing {attendanceData.pagination?.total || 0} records
                            {dateFrom && dateTo && ` from ${dateFrom} to ${dateTo}`}
                        </div>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={handleExport}
                            >
                                <FaDownload className="me-1" size={14} />
                                Export CSV
                            </Button>
                            <Button 
                                variant="outline-info" 
                                size="sm"
                                onClick={handleShowImportHistory}
                            >
                                <FaClock className="me-1" size={14} />
                                Import History
                            </Button>
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={downloadTemplate}
                            >
                                <FaDownload className="me-1" size={14} />
                                Download Template
                            </Button>
                            <Button 
                                variant="success" 
                                size="sm"
                                onClick={() => setShowImportModal(true)}
                                disabled={uploadLoading}
                            >
                                {uploadLoading ? (
                                    <Spinner as="span" animation="border" size="sm" className="me-1" />
                                ) : (
                                    <FaUpload className="me-1" size={14} />
                                )}
                                {uploadLoading ? 'Importing...' : 'Import Data'}
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Main Content - All Attendance Records */}
            <Row>
                <Col>
                    <Card>
                        <Card.Body>
            {allLoading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                </div>
            ) : allRecords.length > 0 ? (
                <div className="table-responsive">
                    <Table hover>
                        <thead className="table-light">
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Time-in</th>
                                <th>Time-out</th>
                                <th>Status</th>
                                <th>Holiday Type</th>
                                <th>Total Hours</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allRecords.map((row) => (
                                <tr key={`${row.employee?.id || row.employee_id}-${row.date}-${row.clock_in || ''}`}>
                                    <td>
                                        <Badge bg="info" className="font-monospace">
                                            {row.employee?.employee_id || row.employee_biometric_id || '--'}
                                        </Badge>
                                    </td>
                                    <td>
                                        <div className="fw-medium">
                                            {(row.employee?.first_name || '')} {(row.employee?.last_name || '')}
                                        </div>
                                        <small className="text-muted">
                                            {row.employee?.position || ''}
                                        </small>
                                    </td>
                                    <td>
                                        {row.date ? (
                                            <div className="fw-medium">{format(new Date(row.date), 'MMM dd, yyyy')}</div>
                                        ) : (
                                            <div className="text-muted">--</div>
                                        )}
                                    </td>
                                    <td>
                                        {row.date ? (
                                            <small className="text-muted">{format(new Date(row.date), 'EEEE')}</small>
                                        ) : (
                                            <div className="text-muted">--</div>
                                        )}
                                    </td>
                                    <td>
                                        <Badge bg="light" text="dark" className="font-monospace">
                                            {row.clock_in ? format(new Date(`2000-01-01 ${row.clock_in}`), 'h:mm a') : '--'}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg="light" text="dark" className="font-monospace">
                                            {row.clock_out ? format(new Date(`2000-01-01 ${row.clock_out}`), 'h:mm a') : '--'}
                                        </Badge>
                                    </td>
                                    <td>
                                        <span className="fw-medium">
                                            {row.status || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        {row.remarks && row.remarks !== 'Auto-marked during import' ? (
                                            <small className="text-muted fst-italic">{row.remarks}</small>
                                        ) : (
                                            <small className="text-muted">--</small>
                                        )}
                                    </td>
                                    <td>
                                        <span className="fw-medium">{row.total_hours ? `${row.total_hours}h` : '--'}</span>
                                    </td>
                                    <td>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm" 
                                            onClick={() => handleEditClick(row)}
                                            title="Edit record"
                                        >
                                            <FaEdit size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    {/* Simple pagination controls */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="small text-muted">Total: {allTotal}</div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-secondary" size="sm" disabled={allPage <= 1} onClick={() => fetchAllAttendanceRecords(allPage - 1)}>Prev</Button>
                            <span className="small align-self-center">Page {allPage}</span>
                            <Button variant="outline-secondary" size="sm" disabled={allRecords.length < allPerPage} onClick={() => fetchAllAttendanceRecords(allPage + 1)}>Next</Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-5">
                    <div className="mb-3">
                        <FaClipboardList size={48} className="text-muted" />
                    </div>
                    <h6 className="text-muted">No attendance records in the selected period</h6>
                    <p className="text-muted small mb-4">Try adjusting filters or import new data.</p>
                    <Button variant="primary" onClick={() => setShowImportModal(true)}>
                        <FaUpload className="me-1" /> Import Attendance Data
                    </Button>
                </div>
            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Import Modal */}
            <Modal show={showImportModal} onHide={() => {
                setShowImportModal(false);
                setSelectedFile(null);
                setDetectedPeriod(null);
                setValidationWarning('');
            }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaUpload className="me-2" />
                        Import Attendance Data
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Biometric Export File</Form.Label>
                        <Form.Control
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            disabled={uploadLoading}
                        />
                        <Form.Text className="text-muted">
                            Upload the Excel/CSV file exported from your biometric system
                        </Form.Text>
                    </Form.Group>

                    {uploadLoading && !detectedPeriod && (
                        <div className="text-center py-3">
                            <Spinner animation="border" size="sm" className="me-2" />
                            <span>Validating file and detecting period...</span>
                        </div>
                    )}

                    {detectedPeriod && (
                        <>
                            <Alert variant="success" className="mb-3">
                                <div className="fw-bold mb-2">
                                    <FaCheckCircle className="me-2" />
                                    Period Detected
                                </div>
                                <div className="small">
                                    <strong>From:</strong> {format(new Date(detectedPeriod.period_start), 'MMM dd, yyyy')}<br />
                                    <strong>To:</strong> {format(new Date(detectedPeriod.period_end), 'MMM dd, yyyy')}<br />
                                    <strong>Total Records:</strong> {detectedPeriod.total_dates}
                                </div>
                            </Alert>

                            {validationWarning && (
                                <Alert variant="warning" className="mb-3">
                                    <FaExclamationTriangle className="me-2" />
                                    {validationWarning}
                                </Alert>
                            )}
                        </>
                    )}
                    
                    <Alert variant="info" className="small mb-0">
                        <FaClipboardList className="me-2" />
                        <strong>Required columns:</strong> Person ID, Person Name, Punch Date, Attendance record<br />
                        <strong>Optional columns:</strong> Verify Type, TimeZone, Source
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => {
                        setShowImportModal(false);
                        setSelectedFile(null);
                        setDetectedPeriod(null);
                        setValidationWarning('');
                    }}>
                        Cancel
                    </Button>
                    <Button variant="outline-primary" onClick={downloadTemplate}>
                        <FaDownload className="me-1" size={14} />
                        Download Template
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleImportConfirm}
                        disabled={!detectedPeriod || uploadLoading}
                    >
                        {uploadLoading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-1" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <FaUpload className="me-1" />
                                Confirm Import
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Import History Modal */}
            <Modal show={showImportHistoryModal} onHide={() => setShowImportHistoryModal(false)} centered size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FaClock className="me-2" />
                        Import History
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {importHistoryLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" />
                            <p className="mt-3">Loading import history...</p>
                        </div>
                    ) : importHistory.length > 0 ? (
                        <Table hover responsive>
                            <thead className="table-light">
                                <tr>
                                    <th>Period</th>
                                    <th>Filename</th>
                                    <th>Type</th>
                                    <th>Records</th>
                                    <th>Status</th>
                                    <th>Imported By</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importHistory.map((record) => (
                                    <tr key={record.id}>
                                        <td>
                                            <div className="small">
                                                <strong>{format(new Date(record.period_start), 'MMM dd')}</strong>
                                                {' - '}
                                                <strong>{format(new Date(record.period_end), 'MMM dd, yyyy')}</strong>
                                            </div>
                                        </td>
                                        <td className="small">{record.filename || 'N/A'}</td>
                                        <td>
                                            <Badge bg="secondary" className="text-capitalize">
                                                {record.import_type}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="small">
                                                <span className="text-success fw-bold">{record.successful_rows}</span>
                                                {' / '}
                                                <span className="text-muted">{record.total_rows}</span>
                                                {record.failed_rows > 0 && (
                                                    <span className="text-danger ms-1">({record.failed_rows} failed)</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge bg={
                                                record.status === 'completed' ? 'success' :
                                                record.status === 'failed' ? 'danger' :
                                                record.status === 'processing' ? 'warning' : 'secondary'
                                            }>
                                                {record.status}
                                            </Badge>
                                        </td>
                                        <td className="small">{record.importer?.name || 'System'}</td>
                                        <td className="small">
                                            {format(new Date(record.created_at), 'MMM dd, yyyy h:mm a')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center py-5">
                            <FaClock size={48} className="text-muted mb-3" />
                            <h6 className="text-muted">No import history found</h6>
                            <p className="text-muted small">Import records will appear here once you start importing attendance data</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowImportHistoryModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Attendance Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Attendance Record</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editingRecord && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Employee</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={`${editingRecord.employee?.first_name || ''} ${editingRecord.employee?.last_name || ''}`}
                                    disabled 
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Date</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={format(new Date(editingRecord.date), 'MMM dd, yyyy (EEEE)')}
                                    disabled 
                                />
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Time In</Form.Label>
                                        <Form.Control
                                            type="time"
                                            name="clock_in"
                                            value={editFormData.clock_in || ''}
                                            onChange={handleEditFormChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Time Out</Form.Label>
                                        <Form.Control
                                            type="time"
                                            name="clock_out"
                                            value={editFormData.clock_out || ''}
                                            onChange={handleEditFormChange}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={editFormData.status}
                                    onChange={handleEditFormChange}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                    <option value="On Leave">On Leave</option>
                                    <option value="Undertime">Undertime</option>
                                    <option value="Overtime">Overtime</option>
                                    <option value="Holiday (No Work)">Holiday (No Work)</option>
                                    <option value="Holiday (Worked)">Holiday (Worked)</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Remarks</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="remarks"
                                    value={editFormData.remarks}
                                    onChange={handleEditFormChange}
                                    placeholder="Enter any additional remarks"
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AttendanceDashboard;
