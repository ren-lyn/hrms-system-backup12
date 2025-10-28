import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { 
  FaClock, 
  FaSync, 
  FaCalendarAlt,
  FaUser,
  FaSearch,
  FaFileExport
} from 'react-icons/fa';
import { format } from 'date-fns';
import axios from '../../axios';

const ManagerViewAttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    overtime_count: 0
  });

  useEffect(() => {
    fetchAttendanceRecords();
  }, [dateFrom, dateTo, statusFilter]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/manager/attendance/records', {
        params: {
          date_from: dateFrom,
          date_to: dateTo,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });

      if (response.data.success) {
        setRecords(response.data.data || []);
        calculateStats(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load attendance records');
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      setError(err.response?.data?.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const newStats = {
      total_records: data.length,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      overtime_count: 0
    };

    data.forEach(record => {
      const status = record.status?.toLowerCase() || '';
      if (status === 'present' || status === 'late' || status === 'overtime' || status === 'undertime') {
        newStats.present_count++;
      }
      if (status === 'absent') newStats.absent_count++;
      if (status === 'late') newStats.late_count++;
      if (status === 'overtime') newStats.overtime_count++;
    });

    setStats(newStats);
  };

  const formatTime = (time) => {
    if (!time) return '-';
    try {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return time;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      overtime: 'info',
      undertime: 'secondary',
      'on leave': 'primary'
    };
    return <Badge bg={variants[status?.toLowerCase()] || 'secondary'}>{status?.toUpperCase() || 'N/A'}</Badge>;
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    return (
      record.employee?.first_name?.toLowerCase().includes(searchLower) ||
      record.employee?.last_name?.toLowerCase().includes(searchLower) ||
      record.employee?.employee_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="mb-1 fw-bold">
                <FaClock className="me-2 text-primary" />
                Attendance Records
              </h3>
              <p className="text-muted mb-0">View employee attendance records (Read-only)</p>
            </div>
            <Button variant="primary" size="sm" onClick={fetchAttendanceRecords} className="shadow-sm">
              <FaSync className="me-2" />
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="shadow-sm">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center">
              <div className="text-muted small mb-1">Total Records</div>
              <div className="h4 mb-0 fw-bold text-primary">{stats.total_records}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center">
              <div className="text-muted small mb-1">Present</div>
              <div className="h4 mb-0 fw-bold text-success">{stats.present_count}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center">
              <div className="text-muted small mb-1">Absent</div>
              <div className="h4 mb-0 fw-bold text-danger">{stats.absent_count}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center">
              <div className="text-muted small mb-1">Late</div>
              <div className="h4 mb-0 fw-bold text-warning">{stats.late_count}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-secondary">Date From</Form.Label>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-secondary">Date To</Form.Label>
                <Form.Control
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-secondary">Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="overtime">Overtime</option>
                  <option value="undertime">Undertime</option>
                  <option value="on leave">On Leave</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold text-secondary">Search Employee</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Records Table */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3">
          <h5 className="mb-0 fw-bold text-secondary">
            <FaUser className="me-2" />
            Employee Attendance Records
            <Badge bg="secondary" className="ms-2">{filteredRecords.length} records</Badge>
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-3">Loading attendance records...</p>
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <tr>
                    <th className="py-3 px-3 fw-semibold text-secondary">Employee</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Date</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Time In</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Time Out</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Total Hours</th>
                    <th className="py-3 px-3 fw-semibold text-secondary text-center">Status</th>
                    <th className="py-3 px-3 fw-semibold text-secondary">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <FaUser className="text-primary" size={14} />
                          </div>
                          <div>
                            <div className="fw-semibold text-dark">
                              {record.employee?.first_name} {record.employee?.last_name}
                            </div>
                            <small className="text-muted">{record.employee?.employee_id}</small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2" size={14} />
                          <div>
                            <div className="fw-medium text-dark">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </div>
                            <small className="text-muted">{format(new Date(record.date), 'EEEE')}</small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal">
                          {formatTime(record.clock_in)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal">
                          {formatTime(record.clock_out)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="fw-medium">{record.total_hours || '-'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-muted small">{record.remarks || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 px-4">
              <div className="mb-4">
                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                  <FaClock size={48} className="text-muted" />
                </div>
              </div>
              <h5 className="text-secondary mb-2">No Attendance Records Found</h5>
              <p className="text-muted mb-0">
                {searchTerm 
                  ? 'No records match your search criteria. Try adjusting the filters.' 
                  : 'No attendance records found for the selected date range.'}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ManagerViewAttendanceRecords;



