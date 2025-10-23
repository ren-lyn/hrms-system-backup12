import React, { useState } from 'react';
import { FaFilePdf, FaFileExcel, FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import { Card, Button, Row, Col, Form, Table, Dropdown } from 'react-bootstrap';

const ReportGeneration = () => {
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState({
    department: '',
    position: '',
    status: ''
  });

  // Sample report data
  const reportData = {
    attendance: [
      { id: 1, employee: 'John Doe', date: '2025-10-01', status: 'Present', timeIn: '08:00', timeOut: '17:00' },
      { id: 2, employee: 'Jane Smith', date: '2025-10-01', status: 'Late', timeIn: '09:15', timeOut: '18:00' },
    ],
    payroll: [
      { id: 1, employee: 'John Doe', basicSalary: 50000, allowances: 5000, deductions: 2000, netPay: 53000 },
      { id: 2, employee: 'Jane Smith', basicSalary: 55000, allowances: 5000, deductions: 2500, netPay: 57500 },
    ],
    leave: [
      { id: 1, employee: 'John Doe', leaveType: 'Vacation', startDate: '2025-10-10', endDate: '2025-10-15', status: 'Approved' },
      { id: 2, employee: 'Jane Smith', leaveType: 'Sick Leave', startDate: '2025-10-05', endDate: '2025-10-06', status: 'Approved' },
    ]
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateReport = (format) => {
    // In a real app, this would generate and download the report
    alert(`Generating ${reportType} report in ${format} format`);
  };

  return (
    <div className="p-4">
      <h2 className="mb-4">Report Generation</h2>
      
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Report Criteria</h5>
        </Card.Header>
        <Card.Body>
          <Form>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Report Type</Form.Label>
                  <Form.Select 
                    value={reportType} 
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="attendance">Attendance Report</option>
                    <option value="payroll">Payroll Report</option>
                    <option value="leave">Leave Report</option>
                    <option value="employee">Employee List</option>
                    <option value="performance">Performance Report</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    min={dateRange.startDate}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Department</Form.Label>
                  <Form.Select 
                    name="department"
                    value={filters.department}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Departments</option>
                    <option value="hr">Human Resources</option>
                    <option value="it">Information Technology</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Position</Form.Label>
                  <Form.Select 
                    name="position"
                    value={filters.position}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Positions</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="staff">Staff</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <div className="mt-3 d-flex justify-content-between">
              <Button variant="primary" className="me-2">
                <FaSearch className="me-2" />
                Generate Preview
              </Button>
              
              <div>
                <Dropdown className="d-inline me-2">
                  <Dropdown.Toggle variant="success" id="dropdown-export">
                    <FaDownload className="me-2" />
                    Export
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleGenerateReport('pdf')}>
                      <FaFilePdf className="text-danger me-2" />
                      Export as PDF
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleGenerateReport('excel')}>
                      <FaFileExcel className="text-success me-2" />
                      Export as Excel
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleGenerateReport('csv')}>
                      <FaFileExcel className="text-success me-2" />
                      Export as CSV
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                
                <Button variant="outline-secondary" className="ms-2">
                  <FaFilter className="me-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Report Preview</h5>
          <small className="text-muted">
            Showing results for: {reportType.replace(/^./, str => str.toUpperCase())} Report
          </small>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  {reportType === 'attendance' && (
                    <>
                      <th>#</th>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                    </>
                  )}
                  {reportType === 'payroll' && (
                    <>
                      <th>#</th>
                      <th>Employee</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                    </>
                  )}
                  {reportType === 'leave' && (
                    <>
                      <th>#</th>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData[reportType]?.map((item, index) => (
                  <tr key={index}>
                    {Object.values(item).map((value, i) => (
                      <td key={i}>{value}</td>
                    ))}
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No data available. Generate a report to see the results.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Showing 1 to {Math.min(2, reportData[reportType]?.length || 0)} of {reportData[reportType]?.length || 0} entries
            </div>
            <div className="d-flex">
              <Button variant="outline-secondary" size="sm" className="me-2" disabled>
                Previous
              </Button>
              <Button variant="outline-primary" size="sm">
                Next
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ReportGeneration;
