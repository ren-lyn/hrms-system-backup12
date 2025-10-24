import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Alert, Spinner, Modal } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, User, Clock, CheckCircle, XCircle, TrendingUp, TrendingDown, Users, UserCheck, BarChart3 } from 'lucide-react';
import { fetchEmployeeLeaveTracker, exportLeaveTrackerData } from '../../api/leave';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './LeaveTracker.css';

const LeaveTracker = () => {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [stats, setStats] = useState({
    totalEmployees: 0,
    employeesWithLeave: 0,
    totalLeaveDays: 0,
    averageLeaveDays: 0
  });
  const [showStatsModal, setShowStatsModal] = useState(null); // 'employees', 'withLeave', 'totalDays', 'average'

  useEffect(() => {
    loadLeaveTrackerData();
  }, [selectedYear]);

  const loadLeaveTrackerData = async () => {
    try {
      setLoading(true);
      
      // Fetch actual data from API
      const response = await fetchEmployeeLeaveTracker(selectedMonth, selectedYear);
      
      // Handle different response structures
      let data = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      
      setLeaveData(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading leave tracker data:', error);
      setAlert({
        show: true,
        message: 'Failed to load leave tracker data. Please try again.',
        type: 'danger'
      });
      // Set empty array on error to prevent filter errors
      setLeaveData([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    // Ensure data is an array
    const safeData = Array.isArray(data) ? data : [];
    
    const totalEmployees = safeData.length;
    const employeesWithLeave = safeData.filter(emp => emp && emp.totalLeaveDays > 0).length;
    const totalLeaveDays = safeData.reduce((sum, emp) => sum + (emp?.totalLeaveDays || 0), 0);
    const averageLeaveDays = totalEmployees > 0 ? (totalLeaveDays / totalEmployees).toFixed(1) : 0;

    setStats({
      totalEmployees,
      employeesWithLeave,
      totalLeaveDays,
      averageLeaveDays
    });
  };

  // Get unique departments from employee data
  const departments = Array.from(new Set(
    (Array.isArray(leaveData) ? leaveData : [])
      .filter(emp => emp && emp.department)
      .map(emp => emp.department)
  )).sort();

  const filteredData = (Array.isArray(leaveData) ? leaveData : []).filter(employee => {
    if (!employee) return false;
    
    const name = employee.name || '';
    const department = employee.department || '';
    const position = employee.position || '';
    const searchLower = searchTerm.toLowerCase();
    
    // Search filter
    const matchesSearch = name.toLowerCase().includes(searchLower) ||
           department.toLowerCase().includes(searchLower) ||
           position.toLowerCase().includes(searchLower);
    
    // Department filter
    const matchesDepartment = !selectedDepartment || department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Update stats based on filtered data
  useEffect(() => {
    if (filteredData.length > 0 || (searchTerm || selectedDepartment)) {
      const totalEmployees = filteredData.length;
      const employeesWithLeave = filteredData.filter(emp => emp && emp.totalLeaveDays > 0).length;
      const totalLeaveDays = filteredData.reduce((sum, emp) => sum + (emp?.totalLeaveDays || 0), 0);
      const averageLeaveDays = totalEmployees > 0 ? (totalLeaveDays / totalEmployees).toFixed(1) : 0;

      setStats({
        totalEmployees,
        employeesWithLeave,
        totalLeaveDays,
        averageLeaveDays
      });
    }
  }, [filteredData.length, searchTerm, selectedDepartment]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      'Vacation Leave': 'success',
      'Sick Leave': 'warning',
      'Emergency Leave': 'danger',
      'Maternity/Paternity': 'info',
      'Personal Leave': 'secondary',
      'LOA': 'primary'
    };
    return colors[leaveType] || 'secondary';
  };

  const getBalanceStatus = (remaining, total) => {
    const percentage = (remaining / total) * 100;
    if (percentage >= 70) return { color: 'success', icon: <CheckCircle size={16} /> };
    if (percentage >= 40) return { color: 'warning', icon: <Clock size={16} /> };
    return { color: 'danger', icon: <XCircle size={16} /> };
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('Leave Tracker Report', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Year: ${selectedYear}`, 20, 30);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      
      // Table data
      const tableData = filteredData.map(emp => {
        const totalLeaves = emp.leavePeriods ? emp.leavePeriods.length : 0;
        const remainingLeaves = Math.max(0, 3 - totalLeaves);
        
        return [
        emp.name,
        emp.department,
        emp.position,
          `${totalLeaves} / 3`,
          emp.paidLeaveDays || 0,
          emp.unpaidLeaveDays || 0,
          `${remainingLeaves} ${remainingLeaves === 1 ? 'leave' : 'leaves'} left`
        ];
      });
      
      pdf.autoTable({
        head: [['Employee', 'Department', 'Position', 'Total Leaves', 'Paid Days', 'Unpaid Days', 'Balance']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [32, 65, 118] }
      });
      
      pdf.save(`leave-tracker-${selectedMonth}-${selectedYear}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setAlert({
        show: true,
        message: 'Failed to export PDF',
        type: 'danger'
      });
    }
  };

  const exportToExcel = async () => {
    try {
      await exportLeaveTrackerData(selectedMonth, selectedYear, filteredData);
      setAlert({
        show: true,
        message: 'Data exported successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setAlert({
        show: true,
        message: 'Failed to export Excel file',
        type: 'danger'
      });
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Container fluid className="leave-tracker">
      <div className="page-header mb-4">
        <h2 className="page-title">Leave Tracker</h2>
        <p className="page-subtitle">Monitor employee leave usage and remaining balances</p>
      </div>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="stats-card" onClick={() => setShowStatsModal('employees')} style={{ cursor: 'pointer' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <Users size={24} />
                </div>
                <div className="flex-grow-1">
                  <div className="stat-value">{stats.totalEmployees}</div>
                  <div className="stat-label">Total Employees</div>
                </div>
                <Eye size={16} style={{ color: '#94a3b8', opacity: 0.7 }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stats-card" onClick={() => setShowStatsModal('withLeave')} style={{ cursor: 'pointer' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <UserCheck size={24} />
                </div>
                <div className="flex-grow-1">
                  <div className="stat-value">{stats.employeesWithLeave}</div>
                  <div className="stat-label">Employees with Leave</div>
                </div>
                <Eye size={16} style={{ color: '#94a3b8', opacity: 0.7 }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stats-card" onClick={() => setShowStatsModal('totalDays')} style={{ cursor: 'pointer' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <BarChart3 size={24} />
                </div>
                <div className="flex-grow-1">
                  <div className="stat-value">{stats.totalLeaveDays}</div>
                  <div className="stat-label">Total Leave Days</div>
                </div>
                <Eye size={16} style={{ color: '#94a3b8', opacity: 0.7 }} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters & Actions */}
      <Card className="mb-3" style={{ boxShadow: 'none', border: '1px solid #e1e8ed' }}>
        <Card.Body style={{ padding: '24px' }}>
          <Row className="align-items-end">
        <Col md={4}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Search Employee</Form.Label>
            <InputGroup>
                  <InputGroup.Text style={{ background: '#f8fafc', border: '1px solid #e1e8ed', borderRight: 'none' }}>
                    <Search size={16} style={{ color: '#64748b' }} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by name, department, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderLeft: 'none' }}
              />
            </InputGroup>
          </Form.Group>
        </Col>
            <Col md={2}>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Department</Form.Label>
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
                <Form.Label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Year</Form.Label>
            <Form.Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
            <Col md={4} className="d-flex gap-2">
              <Button variant="primary" onClick={loadLeaveTrackerData} style={{ flex: 1 }}>
            Refresh
          </Button>
              <Button variant="success" onClick={exportToPDF} style={{ flex: 1 }}>
                <Download size={16} className="me-1" />
                PDF
            </Button>
              <Button variant="info" onClick={exportToExcel} style={{ flex: 1 }}>
                <Download size={16} className="me-1" />
                Excel
            </Button>
        </Col>
      </Row>
        </Card.Body>
      </Card>

      {/* Leave Tracker Table */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c' }}>
              Employee Leave Summary - {selectedYear}
            </h5>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#64748b', 
              fontWeight: '500',
              background: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              {filteredData.length} employees
            </span>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading leave tracker data...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="leave-tracker-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'center' }}>Department</th>
                    <th style={{ textAlign: 'center' }}>Position</th>
                    <th style={{ textAlign: 'center' }}>Leave Periods</th>
                    <th style={{ textAlign: 'center' }}>Total Leaves</th>
                    <th style={{ textAlign: 'center' }}>Paid Days</th>
                    <th style={{ textAlign: 'center' }}>Unpaid Days</th>
                    <th style={{ textAlign: 'center' }}>Balance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-4">
                        <Calendar size={48} className="text-muted mb-3" />
                        <p className="text-muted">No leave data found for the selected period.</p>
                        <small className="text-muted">Employee leave records will appear here.</small>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((employee) => {
                      // Calculate total leaves (count of leave instances) - max 3
                      const totalLeaves = employee.leavePeriods ? employee.leavePeriods.length : 0;
                      const remainingLeaves = Math.max(0, 3 - totalLeaves);
                      
                      // Determine balance status based on remaining leave instances
                      let balanceStatus;
                      if (remainingLeaves >= 2) {
                        balanceStatus = { color: 'success', icon: <CheckCircle size={16} /> };
                      } else if (remainingLeaves === 1) {
                        balanceStatus = { color: 'warning', icon: <Clock size={16} /> };
                      } else {
                        balanceStatus = { color: 'danger', icon: <XCircle size={16} /> };
                      }
                      
                      return (
                        <tr key={employee.id}>
                          <td>
                            <div className="employee-info">
                              <strong>{employee.name}</strong>
                              {employee.email && (
                                <div className="text-muted small">{employee.email}</div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="department-text">{employee.department}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="position-text">{employee.position}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="leave-periods">
                              {employee.leavePeriods && employee.leavePeriods.length > 0 ? (
                                employee.leavePeriods.map((period, index) => (
                                  <div key={index} className="leave-period-item">
                                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a202c' }}>
                                      {period.leaveType}
                                    </span>
                                    <small className="text-muted d-block" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                      {formatDate(period.startDate)} - {formatDate(period.endDate)}
                                    </small>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">No leave taken</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                              {totalLeaves} / 3
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                              {employee.paidLeaveDays || 0}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                              {employee.unpaidLeaveDays || 0}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="d-flex align-items-center justify-content-center">
                              <span className={`me-2 text-${balanceStatus.color}`}>
                                {balanceStatus.icon}
                              </span>
                              <div style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#475569' }}>
                                {remainingLeaves} {remainingLeaves === 1 ? 'leave' : 'leaves'} left
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Stats Modals */}
      {renderStatsModal()}
    </Container>
  );

  // Render modals based on which stat was clicked
  function renderStatsModal() {
    if (!showStatsModal) return null;

    const modalConfig = {
      employees: {
        title: 'Total Employees Overview',
        icon: <Users size={24} />,
        content: renderEmployeesModal()
      },
      withLeave: {
        title: 'Employees Currently on Leave',
        icon: <UserCheck size={24} />,
        content: renderWithLeaveModal()
      },
      totalDays: {
        title: 'Total Leave Days Breakdown',
        icon: <BarChart3 size={24} />,
        content: renderTotalDaysModal()
      }
    };

    const config = modalConfig[showStatsModal];
    if (!config) return null;

    return (
      <Modal 
        show={true} 
        onHide={() => setShowStatsModal(null)} 
        size="lg"
        centered
      >
        <Modal.Header closeButton style={{ background: '#f8fafc', borderBottom: '1px solid #e1e8ed' }}>
          <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.125rem', fontWeight: '600', color: '#1a202c' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              background: '#f1f5f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              {config.icon}
            </div>
            {config.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          {config.content}
        </Modal.Body>
        <Modal.Footer style={{ background: '#f8fafc', borderTop: '1px solid #e1e8ed' }}>
          <Button variant="secondary" onClick={() => setShowStatsModal(null)} style={{ background: '#e2e8f0', color: '#475569', border: 'none' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  function renderEmployeesModal() {
    const departmentBreakdown = {};
    filteredData.forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = { count: 0, withLeave: 0 };
      }
      departmentBreakdown[dept].count++;
      if (emp.totalLeaveDays > 0) {
        departmentBreakdown[dept].withLeave++;
      }
    });

    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h6 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Department Breakdown</h6>
          <Table hover style={{ fontSize: '0.9375rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600' }}>Department</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Total Employees</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>With Leave</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(departmentBreakdown).map(([dept, data]) => (
                <tr key={dept}>
                  <td style={{ padding: '12px', color: '#1a202c', fontWeight: '500' }}>{dept}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{data.count}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{data.withLeave}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>
                    {((data.count / filteredData.length) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Tracked Employees:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>{stats.totalEmployees}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Departments:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>{Object.keys(departmentBreakdown).length}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderWithLeaveModal() {
    const employeesOnLeave = filteredData.filter(emp => emp.leavePeriods && emp.leavePeriods.length > 0);
    
    const leaveTypeBreakdown = {};
    employeesOnLeave.forEach(emp => {
      emp.leavePeriods.forEach(period => {
        const type = period.leaveType || 'Unknown';
        if (!leaveTypeBreakdown[type]) {
          leaveTypeBreakdown[type] = 0;
        }
        leaveTypeBreakdown[type]++;
      });
    });

    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h6 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Leave Type Distribution</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {Object.entries(leaveTypeBreakdown).map(([type, count]) => (
              <div key={type} style={{ 
                background: '#f8fafc', 
                padding: '12px 16px', 
                borderRadius: '6px', 
                border: '1px solid #e1e8ed',
                borderLeft: '3px solid #3b82f6'
              }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>{type}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c' }}>{count} {count === 1 ? 'employee' : 'employees'}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <h6 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Employees Currently on Leave</h6>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {employeesOnLeave.map(emp => (
              <div key={emp.id} style={{ 
                background: '#ffffff', 
                padding: '12px', 
                marginBottom: '8px', 
                borderRadius: '6px', 
                border: '1px solid #e1e8ed' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#1a202c' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{emp.department} • {emp.position}</div>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>
                    {emp.leavePeriods.length} {emp.leavePeriods.length === 1 ? 'leave' : 'leaves'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Employees with Active Leave:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>{employeesOnLeave.length} of {stats.totalEmployees}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderTotalDaysModal() {
    const leaveTypeStats = {};
    const departmentStats = {};
    
    filteredData.forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, paid: 0, unpaid: 0 };
      }
      departmentStats[dept].total += emp.totalLeaveDays || 0;
      departmentStats[dept].paid += emp.paidLeaveDays || 0;
      departmentStats[dept].unpaid += emp.unpaidLeaveDays || 0;

      if (emp.leavePeriods) {
        emp.leavePeriods.forEach(period => {
          const type = period.leaveType || 'Unknown';
          if (!leaveTypeStats[type]) {
            leaveTypeStats[type] = 0;
          }
          const days = Math.ceil((new Date(period.endDate) - new Date(period.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          leaveTypeStats[type] += days;
        });
      }
    });

    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h6 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Department Leave Days</h6>
          <Table hover style={{ fontSize: '0.9375rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600' }}>Department</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Total Days</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Paid Days</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e1e8ed', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Unpaid Days</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(departmentStats).map(([dept, data]) => (
                <tr key={dept}>
                  <td style={{ padding: '12px', color: '#1a202c', fontWeight: '500' }}>{dept}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{data.total}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '500' }}>{data.paid}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '500' }}>{data.unpaid}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <h6 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Leave Type Distribution</h6>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {Object.entries(leaveTypeStats).map(([type, days]) => (
              <div key={type} style={{ 
                background: '#f8fafc', 
                padding: '12px 16px', 
                borderRadius: '6px', 
                border: '1px solid #e1e8ed' 
              }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '4px' }}>{type}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c' }}>{days} days</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Leave Days ({selectedYear}):</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>{stats.totalLeaveDays} days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Paid Leave Days:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>
              {filteredData.reduce((sum, emp) => sum + (emp.paidLeaveDays || 0), 0)} days
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Unpaid Leave Days:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>
              {filteredData.reduce((sum, emp) => sum + (emp.unpaidLeaveDays || 0), 0)} days
            </span>
          </div>
        </div>
      </div>
    );
  }

};

export default LeaveTracker;
