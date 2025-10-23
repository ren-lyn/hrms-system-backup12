import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, ProgressBar, Form, Button, Badge, Dropdown } from 'react-bootstrap';
import { 
  FaExclamationTriangle, 
  FaUserCheck, 
  FaUserTimes, 
  FaFilter, 
  FaDownload, 
  FaInfoCircle, 
  FaFilePdf, 
  FaFileExcel 
} from 'react-icons/fa';

const PredictiveTurnoverAnalytics = () => {
  const [timeframe, setTimeframe] = useState('3months');
  const [department, setDepartment] = useState('all');
  const [riskLevel, setRiskLevel] = useState('all');
  
  // Sample data - in a real app, this would come from an API
  const [employees, setEmployees] = useState([
    {
      id: 1002,
      name: 'Crystal Anne Barayang',
      department: 'HR Department',
      position: 'HR Staff',
      hireDate: '2022-01-15',
      riskScore: 78,
      riskLevel: 'high',
      lastEvaluation: '2025-09-15',
      attendanceRate: 92,
      performanceScore: 85,
      keyFactors: ['Late arrivals increased by 40%', 'Declining performance trend']
    },
    {
      id: 1003,
      name: 'Shariel Osias',
      department: 'HR Department',
      position: 'Manager',
      hireDate: '2021-05-10',
      riskScore: 45,
      riskLevel: 'medium',
      lastEvaluation: '2025-10-01',
      attendanceRate: 95,
      performanceScore: 78,
      keyFactors: ['Decreased engagement in meetings']
    },
    {
      id: 1004,
      name: 'Donna Mae Cabuyao',
      department: 'HR Department',
      position: 'Employee',
      hireDate: '2023-03-22',
      riskScore: 25,
      riskLevel: 'low',
      lastEvaluation: '2025-10-10',
      attendanceRate: 98,
      performanceScore: 92,
      keyFactors: []
    },
  ]);

  // Filter employees based on filters
  const filteredEmployees = employees.filter(emp => {
    return (department === 'all' || emp.department === department) &&
           (riskLevel === 'all' || emp.riskLevel === riskLevel);
  });

  // Calculate summary statistics
  const totalEmployees = employees.length;
  const highRiskCount = employees.filter(e => e.riskLevel === 'high').length;
  const mediumRiskCount = employees.filter(e => e.riskLevel === 'medium').length;
  const lowRiskCount = employees.filter(e => e.riskLevel === 'low').length;

  // Handle export
  const handleExport = (format) => {
    // In a real app, this would generate and download the report
    alert(`Exporting ${format} report for ${timeframe} timeframe`);
  };

  return (
    <>
      <div className="p-4">
        <h2 className="mb-4">Predictive Turnover Analytics</h2>
      
      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Total Employees</h6>
                  <h3 className="mb-0">{totalEmployees}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <FaUserCheck className="text-primary" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">High Risk</h6>
                  <h3 className="mb-0 text-danger">{highRiskCount}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                  <FaExclamationTriangle className="text-danger" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Medium Risk</h6>
                  <h3 className="mb-0 text-warning">{mediumRiskCount}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                  <FaExclamationTriangle className="text-warning" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <h5 className="mb-3">
            <FaFilter className="me-2" />
            Filters
          </h5>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Timeframe</Form.Label>
                <Form.Select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  <option value="1month">Last 30 Days</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Department</Form.Label>
                <Form.Select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">Human Resources</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Risk Level</Form.Label>
                <Form.Select 
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-secondary" 
              className="me-2 px-3 py-2 fw-medium d-flex align-items-center"
              style={{
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                border: '1px solid #dee2e6',
                background: '#fff',
                color: '#6c757d'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.background = '#fff'}
            >
              <span>Reset Filters</span>
            </Button>
            <Dropdown className="d-inline">
              <Dropdown.Toggle 
                variant="primary" 
                id="dropdown-export"
                className="px-3 py-2 fw-medium d-flex align-items-center"
                style={{
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  background: 'linear-gradient(45deg, #4e73df, #224abe)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                <FaDownload className="me-2" />
                <span>Export</span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow-sm" style={{ minWidth: '180px' }}>
                <Dropdown.Item 
                  onClick={() => handleExport('pdf')}
                  className="d-flex align-items-center py-2"
                >
                  <FaFilePdf className="text-danger me-2" />
                  <span>Export as PDF</span>
                </Dropdown.Item>
                <Dropdown.Item 
                  onClick={() => handleExport('excel')}
                  className="d-flex align-items-center py-2"
                >
                  <FaFileExcel className="text-success me-2" />
                  <span>Export as Excel</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Card.Body>
      </Card>

      {/* Employee Risk Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Employee Turnover Risk Assessment</h5>
            <div>
              <small className="text-muted">
                <FaInfoCircle className="me-1" />
                Last updated: {new Date().toLocaleString()}
              </small>
            </div>
          </div>
          
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Tenure</th>
                  <th>Risk Level</th>
                  <th>Risk Score</th>
                  <th>Attendance</th>
                  <th>Performance</th>
                  <th>Key Risk Factors</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <div className="avatar-sm bg-light rounded-circle">
                              <span className="avatar-title bg-soft-primary text-primary fw-semibold">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h6 className="mb-0">{employee.name}</h6>
                            <small className="text-muted">ID: {employee.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>{employee.department}</td>
                      <td>{employee.position}</td>
                      <td>
                        {Math.floor((new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 30))} months
                      </td>
                      <td>
                        {employee.riskLevel === 'high' && (
                          <Badge bg="danger">High Risk</Badge>
                        )}
                        {employee.riskLevel === 'medium' && (
                          <Badge bg="warning" text="dark">Medium Risk</Badge>
                        )}
                        {employee.riskLevel === 'low' && (
                          <Badge bg="success">Low Risk</Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <ProgressBar 
                              variant={
                                employee.riskLevel === 'high' ? 'danger' : 
                                employee.riskLevel === 'medium' ? 'warning' : 'success'
                              } 
                              now={employee.riskScore} 
                              style={{ height: '5px' }} 
                            />
                          </div>
                          <div className="fw-semibold">{employee.riskScore}%</div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <ProgressBar 
                              variant={employee.attendanceRate > 90 ? 'success' : employee.attendanceRate > 80 ? 'warning' : 'danger'} 
                              now={employee.attendanceRate} 
                              style={{ height: '5px' }} 
                            />
                          </div>
                          <div className="fw-semibold">{employee.attendanceRate}%</div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <ProgressBar 
                              variant={employee.performanceScore > 80 ? 'success' : employee.performanceScore > 65 ? 'warning' : 'danger'} 
                              now={employee.performanceScore} 
                              style={{ height: '5px' }} 
                            />
                          </div>
                          <div className="fw-semibold">{employee.performanceScore}%</div>
                        </div>
                      </td>
                      <td>
                        {employee.keyFactors.length > 0 ? (
                          <ul className="mb-0 ps-3">
                            {employee.keyFactors.map((factor, idx) => (
                              <li key={idx} className="small">{factor}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted small">No significant risk factors</span>
                        )}
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          className="px-3"
                          style={{
                            borderRadius: '4px',
                            borderWidth: '1.5px',
                            transition: 'all 0.2s ease',
                            fontWeight: '500',
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.75rem'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#4e73df';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#4e73df';
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <div className="text-muted">
                        <FaUserTimes size={48} className="mb-2" />
                        <p>No employees match the selected filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
            <div className="d-flex">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="me-2 px-3"
                disabled
                style={{
                  borderRadius: '4px',
                  borderWidth: '1.5px',
                  transition: 'all 0.2s ease',
                  fontWeight: '500',
                  opacity: '0.6',
                  cursor: 'not-allowed'
                }}
              >
                Previous
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm"
                className="px-3"
                style={{
                  borderRadius: '4px',
                  borderWidth: '1.5px',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#4e73df';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#4e73df';
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Risk Explanation */}
      <Card className="mt-4 border-0 shadow-sm">
        <Card.Body>
          <h5>Understanding Turnover Risk</h5>
          <p className="text-muted">
            This dashboard helps identify employees who may be at risk of leaving the company based on various factors 
            including attendance patterns, performance metrics, and engagement levels. Use this information to take 
            proactive steps to improve employee retention.
          </p>
          
          <div className="row mt-3">
            <div className="col-md-4">
              <div className="d-flex align-items-center mb-2">
                <div className="bg-danger bg-opacity-10 p-2 rounded-circle me-2">
                  <FaExclamationTriangle className="text-danger" />
                </div>
                <div>
                  <h6 className="mb-0">High Risk</h6>
                  <small className="text-muted">Immediate action recommended</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-center mb-2">
                <div className="bg-warning bg-opacity-10 p-2 rounded-circle me-2">
                  <FaExclamationTriangle className="text-warning" />
                </div>
                <div>
                  <h6 className="mb-0">Medium Risk</h6>
                  <small className="text-muted">Monitor closely</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex align-items-center mb-2">
                <div className="bg-success bg-opacity-10 p-2 rounded-circle me-2">
                  <FaUserCheck className="text-success" />
                </div>
                <div>
                  <h6 className="mb-0">Low Risk</h6>
                  <small className="text-muted">Stable</small>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
      </div>
    </>
  );
};

export default PredictiveTurnoverAnalytics;
