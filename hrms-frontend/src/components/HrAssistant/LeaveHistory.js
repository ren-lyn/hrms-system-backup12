import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { Search, Calendar, User, Clock, CheckCircle, XCircle, ArrowLeft, FileText } from 'lucide-react';
import { fetchLeaveRequests } from '../../api/leave';
import './LeaveTracker.css';

const LeaveHistory = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeList, setEmployeeList] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    loadLeaveData();
  }, []);

  useEffect(() => {
    // Filter leave requests when month/year/department changes
    if (allLeaveRequests.length > 0) {
      filterLeaveRequestsByMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedDepartment]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const response = await fetchLeaveRequests();
      const allRequests = response.data || [];
      
      // Filter only approved and rejected leaves
      const historyRequests = allRequests.filter(request => 
        request.status === 'approved' || request.status === 'rejected'
      );
      
      setAllLeaveRequests(historyRequests);
      filterLeaveRequestsByMonth(historyRequests);
    } catch (error) {
      console.error('Error loading leave history:', error);
      setAlert({
        show: true,
        message: 'Failed to load leave history. Please try again.',
        type: 'danger'
      });
      setLeaveRequests([]);
      setAllLeaveRequests([]);
      setEmployeeList([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLeaveRequestsByMonth = (requestsToFilter = null) => {
    const requests = requestsToFilter || allLeaveRequests;
    
    if (!requests || requests.length === 0) {
      setLeaveRequests([]);
      setEmployeeList([]);
      return;
    }
    
    let filteredRequests = requests;
    
    // Filter by department if selected
    if (selectedDepartment) {
      filteredRequests = filteredRequests.filter(request => {
        const requestDepartment = request.department || '-';
        return requestDepartment === selectedDepartment;
      });
    }
    
    // Filter by month/year if selected
    if (selectedMonth && selectedYear) {
      const [year, month] = selectedMonth.split('-');
      filteredRequests = filteredRequests.filter(request => {
        if (!request.from && !request.created_at) return false;
        const requestDate = new Date(request.from || request.created_at);
        return requestDate.getMonth() === parseInt(month) - 1 && 
               requestDate.getFullYear() === parseInt(year);
      });
    } else if (selectedYear) {
      filteredRequests = filteredRequests.filter(request => {
        if (!request.from && !request.created_at) return false;
        const requestDate = new Date(request.from || request.created_at);
        return requestDate.getFullYear() === selectedYear;
      });
    }
    
    setLeaveRequests(filteredRequests);
    
    // Update employee list based on filtered requests
    const employeesMap = new Map();
    filteredRequests.forEach(request => {
      const employeeId = request.employee_id || 
                        request.employee?.id || 
                        getEmployeeName(request.employee, request.employee_name);
      const employeeName = getEmployeeName(request.employee, request.employee_name);
      
      const key = employeeId;
      
      if (!employeesMap.has(key)) {
        employeesMap.set(key, {
          id: key,
          name: employeeName,
          department: request.department || '-',
          leaveCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        });
      }
      
      const employee = employeesMap.get(key);
      employee.leaveCount++;
      if (request.status === 'approved') {
        employee.approvedCount++;
      } else if (request.status === 'rejected') {
        employee.rejectedCount++;
      }
    });
    
    const employees = Array.from(employeesMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    setEmployeeList(employees);
  };

  const getEmployeeName = (employee, employeeName) => {
    try {
      if (employeeName && typeof employeeName === 'string') {
        return employeeName;
      }
      
      if (employee && typeof employee === 'object' && employee !== null) {
        if (employee.name && typeof employee.name === 'string') {
          return employee.name;
        }
        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          return fullName;
        }
      }
      
      return 'Unknown Employee';
    } catch (error) {
      console.error('Error in getEmployeeName:', error);
      return 'Unknown Employee';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: 'success',
      rejected: 'danger',
      pending: 'warning'
    };
    const labels = {
      approved: 'Approved',
      rejected: 'Rejected',
      pending: 'Pending'
    };
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
  };

  const getEmployeeLeaves = (employeeId) => {
    return leaveRequests.filter(request => {
      const reqEmployeeId = request.employee_id || 
                           request.employee?.id || 
                           getEmployeeName(request.employee, request.employee_name);
      return reqEmployeeId === employeeId;
    }).sort((a, b) => {
      // Sort by date, most recent first
      const dateA = new Date(a.from || a.created_at);
      const dateB = new Date(b.from || b.created_at);
      return dateB - dateA;
    });
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Generate years from current year to 5 years ago
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  // Get unique departments from all leave requests
  const departments = Array.from(new Set(
    allLeaveRequests
      .filter(request => request.department && request.department !== '-')
      .map(request => request.department)
  )).sort();

  const filteredEmployees = employeeList.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    return employee.name.toLowerCase().includes(searchLower) ||
           employee.department.toLowerCase().includes(searchLower);
  });

  // If viewing employee details
  if (selectedEmployee) {
    const employeeLeaves = getEmployeeLeaves(selectedEmployee.id);
    
    return (
      <Container fluid className="leave-history">
        <div className="page-header mb-4">
          <div className="d-flex align-items-center mb-3">
            <Button
              variant="outline-secondary"
              onClick={handleBackToList}
              className="me-3"
              style={{ 
                border: '1px solid #e1e8ed',
                background: '#ffffff',
                color: '#475569'
              }}
            >
              <ArrowLeft size={16} className="me-2" />
              Back to List
            </Button>
            <div>
              <h2 className="page-title mb-0">{selectedEmployee.name}</h2>
              <p className="page-subtitle mb-0">{selectedEmployee.department}</p>
            </div>
          </div>
        </div>

        {alert.show && (
          <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
            {alert.message}
          </Alert>
        )}

        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={4}>
            <Card className="stats-card">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="stats-icon me-3">
                    <FileText size={24} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-value">{employeeLeaves.length}</div>
                    <div className="stat-label">Total Leaves</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="stats-card">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="me-3" style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#28a745', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={24} style={{ color: '#ffffff' }} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-value">{selectedEmployee.approvedCount}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="stats-card">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="me-3" style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#dc3545', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <XCircle size={24} style={{ color: '#ffffff' }} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-value">{selectedEmployee.rejectedCount}</div>
                    <div className="stat-label">Rejected</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Leave History Table */}
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c' }}>
                Leave History
              </h5>
              <span style={{ 
                fontSize: '0.875rem', 
                color: '#64748b', 
                fontWeight: '500',
                background: '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '6px'
              }}>
                {employeeLeaves.length} {employeeLeaves.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center p-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading leave history...</p>
              </div>
            ) : employeeLeaves.length === 0 ? (
              <div className="text-center p-4">
                <Calendar size={48} className="text-muted mb-3" />
                <p className="text-muted">No leave history found for this employee.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="leave-tracker-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Start Date</th>
                      <th style={{ textAlign: 'center' }}>End Date</th>
                      <th style={{ textAlign: 'center' }}>Days</th>
                      <th style={{ textAlign: 'center' }}>Payment</th>
                      <th style={{ textAlign: 'center' }}>Category</th>
                      <th style={{ textAlign: 'center' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <td>
                          <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#1a202c' }}>
                            {leave.type || '-'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {getStatusBadge(leave.status)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9375rem', color: '#475569' }}>
                            {formatDate(leave.from)}
                          </div>
                          <small className="text-muted" style={{ fontSize: '0.8125rem' }}>
                            {leave.from ? new Date(leave.from).toLocaleDateString('en-US', { month: 'long' }) : '-'}
                          </small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9375rem', color: '#475569' }}>
                            {formatDate(leave.to)}
                          </div>
                          <small className="text-muted" style={{ fontSize: '0.8125rem' }}>
                            {leave.to ? new Date(leave.to).toLocaleDateString('en-US', { month: 'long' }) : '-'}
                          </small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                            {leave.total_days || '-'} {leave.total_days === 1 ? 'day' : 'days'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="d-flex align-items-center justify-content-center">
                            {leave.terms === 'with PAY' ? (
                              <span style={{ 
                                color: '#28a745', 
                                fontWeight: '500',
                                fontSize: '0.9375rem'
                              }}>
                                With Pay
                              </span>
                            ) : leave.terms === 'without PAY' ? (
                              <span style={{ 
                                color: '#dc3545', 
                                fontWeight: '500',
                                fontSize: '0.9375rem'
                              }}>
                                Without Pay
                              </span>
                            ) : (
                              <span style={{ 
                                color: '#64748b', 
                                fontSize: '0.9375rem'
                              }}>
                                -
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                            {leave.leave_category ? (
                              leave.leave_category === 'Service Incentive Leave (SIL)' ? 'SIL' : 'EL'
                            ) : '-'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '200px' }}>
                            {leave.reason || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Employee list view
  return (
    <Container fluid className="leave-history">
      <div className="page-header mb-4">
        <h2 className="page-title">Leave History</h2>
        <p className="page-subtitle">View detailed leave history for all employees</p>
      </div>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Search and Filter */}
      <Card className="mb-3" style={{ boxShadow: 'none', border: '1px solid #e1e8ed' }}>
        <Card.Body style={{ padding: '24px' }}>
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
                  Search Employee
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={{ background: '#f8fafc', border: '1px solid #e1e8ed', borderRight: 'none' }}>
                    <Search size={16} style={{ color: '#64748b' }} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderLeft: 'none' }}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
                  Department
                </Form.Label>
                <Form.Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
                  Month
                </Form.Label>
                <Form.Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">All Months</option>
                  {generateMonthOptions().map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
                  Year
                </Form.Label>
                <Form.Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {generateYearOptions().map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={1}>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSelectedMonth('');
                  setSelectedYear(new Date().getFullYear());
                  setSelectedDepartment('');
                }}
                style={{ width: '100%', marginTop: '28px' }}
                title="Clear all filters"
              >
                Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Employee List */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c' }}>
              Employees with Leave History
            </h5>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#64748b', 
              fontWeight: '500',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
            </span>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center p-4">
              <User size={48} className="text-muted mb-3" />
              <p className="text-muted">No employees found.</p>
              <small className="text-muted">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Employees with leave history will appear here.'}
              </small>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="leave-tracker-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th style={{ textAlign: 'center' }}>Department</th>
                    <th style={{ textAlign: 'center' }}>Total Leaves</th>
                    <th style={{ textAlign: 'center' }}>Approved</th>
                    <th style={{ textAlign: 'center' }}>Rejected</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr 
                      key={employee.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <td>
                        <div className="employee-info">
                          <strong>{employee.name}</strong>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="department-text">{employee.department}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                          {employee.leaveCount}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge bg="success">{employee.approvedCount}</Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge bg="danger">{employee.rejectedCount}</Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeClick(employee);
                          }}
                        >
                          View History
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaveHistory;

