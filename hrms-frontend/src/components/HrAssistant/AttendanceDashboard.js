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
  FaClipboardList
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';
import { useDebounce } from '../../utils/debounce';

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
    
    // Filter states
    const defaultDates = getCurrentMonthDates();
    const [dateFrom, setDateFrom] = useState(defaultDates.start);
    const [dateTo, setDateTo] = useState(defaultDates.end);
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
            alert('Failed to export attendance: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            alert('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
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
                alert(response.data.message || 'Validation failed');
                setSelectedFile(null);
            }
        } catch (error) {
            alert('Validation failed: ' + (error.response?.data?.message || error.message));
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
            formData.append('import_type', 'weekly');
            
            const response = await axios.post('/attendance/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                const absentMarked = response.data.data.absent_marked || 0;
                let message = `Import completed successfully!\n\nImported: ${response.data.data.imported}\nFailed: ${response.data.data.failed}\nSkipped: ${response.data.data.skipped}`;
                if (absentMarked > 0) {
                    message += `\nMarked as Absent: ${absentMarked}`;
                }
                alert(message);
                fetchAttendanceData();
                fetchAllAttendanceRecords(1); // Refresh the records table
                setShowImportModal(false);
                setSelectedFile(null);
                setDetectedPeriod(null);
                setValidationWarning('');
            } else {
                let errorMsg = 'Import failed: ' + (response.data.message || 'Unknown error');
                if (response.data.errors && response.data.errors.length > 0) {
                    errorMsg += '\n\nErrors:\n' + response.data.errors.slice(0, 5).join('\n');
                }
                alert(errorMsg);
            }
        } catch (error) {
            let errorMsg = 'Import failed: ' + (error.response?.data?.message || error.message);
            if (error.response?.data?.errors) {
                errorMsg += '\n\nErrors:\n' + JSON.stringify(error.response.data.errors);
            }
            alert(errorMsg);
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
            }
        } catch (error) {
            console.error('Failed to fetch import history:', error);
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
            alert('Failed to download template: ' + error.message);
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
                            <div className="display-6 fw-bold text-success mb-1">
                                {attendanceData.statistics?.attendance_rate || 0}%
                            </div>
                            <div className="text-muted small">Attendance Rate</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-danger mb-1">
                                {attendanceData.statistics?.absent_count || 0}
                            </div>
                            <div className="text-muted small">Absent</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={2} lg={4} md={6} className="mb-3">
                    <Card className="text-center" style={{ minHeight: '150px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="display-6 fw-bold text-info mb-1">
                                {new Date().toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="text-muted small">This Month</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filters Row */}
            <Row className="mb-3">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            <Row className="g-3">
                                {/* Date Range */}
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">
                                            <FaCalendarAlt className="me-1" size={12} />
                                            From Date
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            size="sm"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1">
                                            <FaCalendarAlt className="me-1" size={12} />
                                            To Date
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            size="sm"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                
                                {/* Search */}
                                <Col md={3}>
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
                        Import Weekly Attendance Data
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
                                    <strong>Total Days:</strong> {detectedPeriod.total_dates}
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
        </Container>
    );
};

export default AttendanceDashboard;
