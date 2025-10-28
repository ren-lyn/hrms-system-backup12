import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle,
  FaSync,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
  FaEye
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';

const ViewAttendanceRecords = () => {
  const getCurrentMonthDates = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState({
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    overtime_count: 0,
    undertime_count: 0,
    on_leave_count: 0,
    total_hours: 0,
    average_hours: 0
  });

  const defaultDates = getCurrentMonthDates();
  const [dateFrom, setDateFrom] = useState(defaultDates.start);
  const [dateTo, setDateTo] = useState(defaultDates.end);
  const [tempDateFrom, setTempDateFrom] = useState(defaultDates.start);
  const [tempDateTo, setTempDateTo] = useState(defaultDates.end);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    fetchAttendanceRecords();
  }, [dateFrom, dateTo]);

  const fetchAttendanceRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/attendance/my-records', {
        params: {
          date_from: dateFrom,
          date_to: dateTo
        }
      });

      if (response.data.success) {
        const data = response.data.data || [];
        setRecords(data);
        calculateStatistics(data);
      } else {
        setError(response.data.message || 'Failed to load attendance records');
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError(err.response?.data?.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const calculateStatistics = (data) => {
    const stats = {
      total_records: data.length,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      overtime_count: 0,
      undertime_count: 0,
      on_leave_count: 0,
      total_hours: 0
    };

    data.forEach(record => {
      if (record.status) {
        const status = record.status.toLowerCase();
        
        // Count specific statuses
        if (status === 'late') stats.late_count++;
        else if (status === 'overtime') stats.overtime_count++;
        else if (status === 'undertime') stats.undertime_count++;
        else if (status === 'absent') stats.absent_count++;
        else if (status === 'on leave') stats.on_leave_count++;
        
        // Count as "Present" if they were at work (Present, Late, Overtime, Undertime)
        if (status === 'present' || status === 'late' || status === 'overtime' || status === 'undertime') {
          stats.present_count++;
        }
      }

      if (record.total_hours) {
        stats.total_hours += parseFloat(record.total_hours);
      }
    });

    stats.average_hours = stats.total_records > 0 
      ? (stats.total_hours / stats.total_records).toFixed(2) 
      : 0;

    setStatistics(stats);
  };

  const applyDateRange = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setCurrentPage(1);
  };

  const applyDatePreset = (preset) => {
    const now = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = now;
        break;
      case 'this_week':
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6); // Sunday of the same week
        start = monday;
        end = sunday;
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    
    setDateFrom(startDate);
    setDateTo(endDate);
    setTempDateFrom(startDate);
    setTempDateTo(endDate);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Present': 'success',
      'Absent': 'danger',
      'Late': 'warning',
      'On Leave': 'info',
      'Overtime': 'primary',
      'Undertime': 'secondary',
      'Holiday (No Work)': 'dark',
      'Holiday (Worked)': 'info'
    };

    return (
      <Badge bg={statusMap[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatTime = (time) => {
    if (!time) return '--';
    try {
      return format(new Date(`2000-01-01 ${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const handleRefresh = () => {
    fetchAttendanceRecords();
  };

  const handleExport = async () => {
    try {
      // Create CSV content
      let csvContent = 'Date,Day,Time In,Time Out,Status,Total Hours,Remarks\n';
      
      records.forEach(record => {
        const date = record.date ? format(new Date(record.date), 'MMM dd, yyyy') : '--';
        const day = record.date ? format(new Date(record.date), 'EEEE') : '--';
        const timeIn = record.clock_in ? formatTime(record.clock_in) : '--';
        const timeOut = record.clock_out ? formatTime(record.clock_out) : '--';
        const status = record.status || '--';
        const hours = record.total_hours || '0';
        const remarks = record.remarks || '';
        
        csvContent += `"${date}","${day}","${timeIn}","${timeOut}","${status}","${hours}","${remarks}"\n`;
      });

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `my_attendance_${dateFrom}_to_${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export attendance records');
    }
  };

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(records.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading attendance records...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <FaEye className="text-primary me-2" size={24} />
          <h2 className="mb-0 text-primary">My Attendance Records</h2>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <FaSync className="me-1" size={14} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-primary mb-1">
                {statistics.total_records}
              </div>
              <div className="text-muted small">Total Records</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-success mb-1">
                {statistics.present_count}
              </div>
              <div className="text-muted small">Present</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-warning mb-1">
                {statistics.late_count}
              </div>
              <div className="text-muted small">Late</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-danger mb-1">
                {statistics.absent_count}
              </div>
              <div className="text-muted small">Absent</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-info mb-1">
                {statistics.total_hours.toFixed(1)}h
              </div>
              <div className="text-muted small">Total Hours</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={2} lg={4} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <div className="display-6 fw-bold text-secondary mb-1">
                {statistics.average_hours}h
              </div>
              <div className="text-muted small">Avg Hours/Day</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          {/* Quick Date Presets */}
          <Row className="mb-3">
            <Col>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="small fw-bold text-muted me-2">Quick Select:</span>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => applyDatePreset('today')}
                >
                  Today
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => applyDatePreset('this_week')}
                >
                  This Week
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => applyDatePreset('this_month')}
                >
                  This Month
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => applyDatePreset('last_month')}
                >
                  Last Month
                </Button>
              </div>
            </Col>
          </Row>

          <hr className="my-3" />

          {/* Custom Date Range */}
          <Row className="g-3 align-items-end">
            <Col md={3}>
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
                  value={tempDateTo}
                  onChange={(e) => setTempDateTo(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button 
                variant="primary"
                size="sm"
                onClick={applyDateRange}
                className="w-100"
              >
                Apply
              </Button>
            </Col>
            <Col md={4} className="text-end">
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={handleExport}
                disabled={records.length === 0}
              >
                <FaDownload className="me-1" size={14} />
                Export to CSV
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Attendance Records Table */}
      <Card>
        <Card.Body>
          {currentRecords.length > 0 ? (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((record, index) => (
                      <tr key={record.id || index}>
                        <td>
                          {record.date ? (
                            <div className="fw-medium">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </div>
                          ) : (
                            <div className="text-muted">--</div>
                          )}
                        </td>
                        <td>
                          {record.date ? (
                            <small className="text-muted">
                              {format(new Date(record.date), 'EEEE')}
                            </small>
                          ) : (
                            <div className="text-muted">--</div>
                          )}
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="font-monospace">
                            {formatTime(record.clock_in)}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="font-monospace">
                            {formatTime(record.clock_out)}
                          </Badge>
                        </td>
                        <td>
                          <span className="fw-medium">
                            {record.total_hours ? `${record.total_hours}h` : '--'}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(record.status)}
                        </td>
                        <td>
                          {record.remarks ? (
                            <small className="text-muted">{record.remarks}</small>
                          ) : (
                            <small className="text-muted">--</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="small text-muted">
                    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, records.length)} of {records.length} records
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <FaChevronLeft />
                    </Button>
                    <span className="align-self-center small">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <FaChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <FaClock size={48} className="text-muted mb-3" />
              <h6 className="text-muted">No Attendance Records Found</h6>
              <p className="text-muted small">
                No attendance records found for the selected date range.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Info Card */}
      <Card className="mt-4">
        <Card.Body>
          <h6 className="fw-bold mb-3">
            <FaExclamationTriangle className="text-warning me-2" />
            Important Information
          </h6>
          <ul className="mb-0 small">
            <li className="mb-2">Attendance records are updated daily after your clock-in and clock-out times are processed</li>
            <li className="mb-2">If you notice any discrepancies in your records, you can request corrections through "Request Edit Attendance"</li>
            <li className="mb-2">Total hours are automatically calculated based on your clock-in and clock-out times</li>
            <li>For questions about your attendance, please contact your HR department</li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ViewAttendanceRecords;

