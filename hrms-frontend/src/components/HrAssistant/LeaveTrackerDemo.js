import React from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';

const LeaveTrackerDemo = () => {
  // Sample data for demonstration
  const sampleData = [
    {
      id: 1,
      name: 'Emily Johnson',
      email: 'emily.johnson@ccdc.com',
      department: 'Human Resources',
      position: 'HR Specialist',
      totalLeaveDays: 5,
      paidLeaveDays: 3,
      unpaidLeaveDays: 2,
      remainingPaidLeave: 12,
      remainingUnpaidLeave: 8,
      leavePeriods: [
        {
          leaveType: 'Vacation Leave',
          startDate: '2024-06-15',
          endDate: '2024-06-20',
          days: 5,
          terms: 'with PAY'
        }
      ]
    },
    {
      id: 2,
      name: 'John Smith',
      email: 'john.smith@ccdc.com',
      department: 'IT Department',
      position: 'Software Developer',
      totalLeaveDays: 3,
      paidLeaveDays: 3,
      unpaidLeaveDays: 0,
      remainingPaidLeave: 12,
      remainingUnpaidLeave: 10,
      leavePeriods: [
        {
          leaveType: 'Sick Leave',
          startDate: '2024-06-10',
          endDate: '2024-06-12',
          days: 3,
          terms: 'with PAY'
        }
      ]
    },
    {
      id: 3,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@ccdc.com',
      department: 'Finance',
      position: 'Accountant',
      totalLeaveDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      remainingPaidLeave: 15,
      remainingUnpaidLeave: 10,
      leavePeriods: []
    }
  ];

  const stats = {
    totalEmployees: sampleData.length,
    employeesWithLeave: sampleData.filter(emp => emp.totalLeaveDays > 0).length,
    totalLeaveDays: sampleData.reduce((sum, emp) => sum + emp.totalLeaveDays, 0),
    averageLeaveDays: (sampleData.reduce((sum, emp) => sum + emp.totalLeaveDays, 0) / sampleData.length).toFixed(1)
  };

  return (
    <Container fluid className="leave-tracker-demo">
      <div className="page-header mb-4">
        <h2 className="page-title">Leave Tracker - Demo</h2>
        <p className="page-subtitle">Monitor employee leave usage and remaining balances for June 2024</p>
      </div>

      <Alert variant="info" className="mb-4">
        <strong>Demo Mode:</strong> This is a demonstration of the Leave Tracker feature with sample data. 
        The actual implementation will connect to your HRMS database.
      </Alert>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <Users size={24} />
                </div>
                <div>
                  <div className="stat-value">{stats.totalEmployees}</div>
                  <div className="stat-label">Total Employees</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="stat-value">{stats.employeesWithLeave}</div>
                  <div className="stat-label">Employees with Leave</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="stat-value">{stats.totalLeaveDays}</div>
                  <div className="stat-label">Total Leave Days</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="stats-icon me-3">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <div className="stat-value">{stats.averageLeaveDays}</div>
                  <div className="stat-label">Average Days</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Employee Leave Summary */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Employee Leave Summary - June 2024</h5>
            <span className="badge bg-primary">{sampleData.length} employees</span>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            {sampleData.map((employee) => (
              <Col md={4} key={employee.id} className="mb-4">
                <Card className="employee-card">
                  <Card.Body>
                    <div className="employee-header mb-3">
                      <h6 className="employee-name">{employee.name}</h6>
                      <p className="employee-details text-muted mb-0">
                        {employee.position} • {employee.department}
                      </p>
                    </div>
                    
                    <div className="leave-summary">
                      <div className="row text-center mb-3">
                        <div className="col-4">
                          <div className="leave-stat">
                            <div className="stat-number text-primary">{employee.totalLeaveDays}</div>
                            <div className="stat-label">Total Days</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="leave-stat">
                            <div className="stat-number text-success">{employee.paidLeaveDays}</div>
                            <div className="stat-label">Paid</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="leave-stat">
                            <div className="stat-number text-warning">{employee.unpaidLeaveDays}</div>
                            <div className="stat-label">Unpaid</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="remaining-balance">
                        <div className="balance-item d-flex justify-content-between mb-2">
                          <span>Remaining Paid:</span>
                          <span className="badge bg-success">{employee.remainingPaidLeave} days</span>
                        </div>
                        <div className="balance-item d-flex justify-content-between">
                          <span>Remaining Unpaid:</span>
                          <span className="badge bg-warning">{employee.remainingUnpaidLeave} days</span>
                        </div>
                      </div>
                      
                      {employee.leavePeriods.length > 0 && (
                        <div className="leave-periods mt-3">
                          <h6 className="small mb-2">Leave Periods:</h6>
                          {employee.leavePeriods.map((period, index) => (
                            <div key={index} className="leave-period-item">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="badge bg-info">{period.leaveType}</span>
                                <small className="text-muted">{period.days} days</small>
                              </div>
                              <small className="text-muted">
                                {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                              </small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaveTrackerDemo;

