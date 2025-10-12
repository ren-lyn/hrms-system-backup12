import React, { useState, useEffect } from 'react';
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
  Modal,
  Dropdown,
  ButtonGroup,
  Nav,
  Tab,
  Tabs
} from 'react-bootstrap';
import { 
  FaMoneyCheckAlt, 
  FaUsers, 
  FaCalendarAlt,
  FaDownload,
  FaCalculator,
  FaSearch,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaFileExport,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaFilter,
  FaReceipt,
  FaPercent,
  FaMinus,
  FaGift,
  FaFileInvoice,
  FaCog,
  FaUserCheck,
  FaClipboardList
} from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import axios from '../../axios';
import { toast } from 'react-toastify';
import payrollAPI from '../../api/payroll';
import './PayrollDashboard.css';

const PayrollDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [payrollData, setPayrollData] = useState({
    statistics: {
      total_employees: 0,
      processed_payrolls: 0,
      pending_payrolls: 0,
      total_gross_pay: 0,
      total_deductions: 0,
      total_net_pay: 0
    },
    payrolls: [],
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 50,
      total: 0
    }
  });

  // New state for enhanced features
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [taxTitles, setTaxTitles] = useState([]);
  const [deductionTitles, setDeductionTitles] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeTaxAssignments, setEmployeeTaxAssignments] = useState([]);
  const [employeeDeductionAssignments, setEmployeeDeductionAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attendanceData, setAttendanceData] = useState(null);

  // Modal states for new features
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showTaxAssignmentModal, setShowTaxAssignmentModal] = useState(false);
  const [showDeductionAssignmentModal, setShowDeductionAssignmentModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  
  // Form states
  const [newPeriod, setNewPeriod] = useState({ name: '', start_date: '', end_date: '', status: 'active' });
  const [newTaxTitle, setNewTaxTitle] = useState({ name: '', rate: '', type: 'percentage', description: '' });
  const [newDeductionTitle, setNewDeductionTitle] = useState({ name: '', amount: '', type: 'fixed', description: '' });
  const [newBenefit, setNewBenefit] = useState({ name: '', amount: '', type: 'fixed', description: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch payroll data
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch payroll statistics and list
      const [payrollResponse, attendanceResponse] = await Promise.all([
        payrollAPI.getPayroll({
          period_start: selectedPeriod.start,
          period_end: selectedPeriod.end,
          search: searchTerm,
          status: statusFilter,
          page: payrollData.pagination.current_page
        }),
        payrollAPI.getAttendanceSummary({
          period_start: selectedPeriod.start,
          period_end: selectedPeriod.end
        })
      ]);

      setPayrollData(payrollResponse.data.data);
      setAttendanceData(attendanceResponse.data.data);
    } catch (err) {
      console.error('Error fetching payroll data:', err);
      setError('Failed to load payroll data. Please try again.');
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  // Generate payroll for selected period
  const generatePayroll = async () => {
    try {
      setGenerating(true);
      const response = await payrollAPI.generatePayroll({
        period_start: selectedPeriod.start,
        period_end: selectedPeriod.end
      });
      
      toast.success('Payroll generated successfully!');
      setShowGenerateModal(false);
      fetchPayrollData();
    } catch (err) {
      console.error('Error generating payroll:', err);
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  // Export payroll data
  const exportPayroll = async (format = 'excel') => {
    try {
      const response = await payrollAPI.exportPayroll({
        period_start: selectedPeriod.start,
        period_end: selectedPeriod.end,
        format: format
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_${selectedPeriod.start}_to_${selectedPeriod.end}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payroll exported successfully!');
    } catch (err) {
      console.error('Error exporting payroll:', err);
      toast.error('Failed to export payroll');
    }
  };

  // View payroll details
  const viewPayrollDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailsModal(true);
  };

  // Handle period change
  const handlePeriodChange = (direction) => {
    const currentStart = new Date(selectedPeriod.start);
    const currentEnd = new Date(selectedPeriod.end);
    
    if (direction === 'prev') {
      const newStart = subMonths(currentStart, 1);
      const newEnd = endOfMonth(newStart);
      setSelectedPeriod({
        start: format(newStart, 'yyyy-MM-dd'),
        end: format(newEnd, 'yyyy-MM-dd')
      });
    } else {
      const newStart = addMonths(currentStart, 1);
      const newEnd = endOfMonth(newStart);
      setSelectedPeriod({
        start: format(newStart, 'yyyy-MM-dd'),
        end: format(newEnd, 'yyyy-MM-dd')
      });
    }
  };

  // New API functions for enhanced features
  const fetchPayrollPeriods = async () => {
    try {
      const response = await payrollAPI.getPayrollPeriods();
      setPayrollPeriods(response.data.data);
    } catch (err) {
      console.error('Error fetching payroll periods:', err);
    }
  };

  const fetchTaxTitles = async () => {
    try {
      const response = await payrollAPI.getTaxTitles();
      setTaxTitles(response.data.data);
    } catch (err) {
      console.error('Error fetching tax titles:', err);
    }
  };

  const fetchDeductionTitles = async () => {
    try {
      const response = await payrollAPI.getDeductionTitles();
      setDeductionTitles(response.data.data);
    } catch (err) {
      console.error('Error fetching deduction titles:', err);
    }
  };

  const fetchBenefits = async () => {
    try {
      const response = await payrollAPI.getBenefits();
      setBenefits(response.data.data);
    } catch (err) {
      console.error('Error fetching benefits:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await payrollAPI.getEmployees();
      setEmployees(response.data.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const createPayrollPeriod = async () => {
    try {
      await payrollAPI.createPayrollPeriod(newPeriod);
      toast.success('Payroll period created successfully!');
      setShowPeriodModal(false);
      setNewPeriod({ name: '', start_date: '', end_date: '', status: 'active' });
      fetchPayrollPeriods();
    } catch (err) {
      console.error('Error creating payroll period:', err);
      toast.error('Failed to create payroll period');
    }
  };

  const createTaxTitle = async () => {
    try {
      await payrollAPI.createTaxTitle(newTaxTitle);
      toast.success('Tax title created successfully!');
      setShowTaxModal(false);
      setNewTaxTitle({ name: '', rate: '', type: 'percentage', description: '' });
      fetchTaxTitles();
    } catch (err) {
      console.error('Error creating tax title:', err);
      toast.error('Failed to create tax title');
    }
  };

  const createDeductionTitle = async () => {
    try {
      await payrollAPI.createDeductionTitle(newDeductionTitle);
      toast.success('Deduction title created successfully!');
      setShowDeductionModal(false);
      setNewDeductionTitle({ name: '', amount: '', type: 'fixed', description: '' });
      fetchDeductionTitles();
    } catch (err) {
      console.error('Error creating deduction title:', err);
      toast.error('Failed to create deduction title');
    }
  };

  const updateBenefit = async (benefitId, updatedBenefit) => {
    try {
      await payrollAPI.updateBenefit(benefitId, updatedBenefit);
      toast.success('Benefit updated successfully!');
      fetchBenefits();
    } catch (err) {
      console.error('Error updating benefit:', err);
      toast.error('Failed to update benefit');
    }
  };

  const assignTaxToEmployee = async (employeeId, taxId) => {
    try {
      await payrollAPI.assignTaxToEmployee(employeeId, taxId);
      toast.success('Tax assigned to employee successfully!');
      setShowTaxAssignmentModal(false);
      fetchEmployeeTaxAssignments();
    } catch (err) {
      console.error('Error assigning tax to employee:', err);
      toast.error('Failed to assign tax to employee');
    }
  };

  const assignDeductionToEmployee = async (employeeId, deductionId) => {
    try {
      await payrollAPI.assignDeductionToEmployee(employeeId, deductionId);
      toast.success('Deduction assigned to employee successfully!');
      setShowDeductionAssignmentModal(false);
      fetchEmployeeDeductionAssignments();
    } catch (err) {
      console.error('Error assigning deduction to employee:', err);
      toast.error('Failed to assign deduction to employee');
    }
  };

  const generatePayrollReport = async () => {
    try {
      const response = await payrollAPI.generatePayrollReport({
        period_start: selectedPeriod.start,
        period_end: selectedPeriod.end
      });
      
      // Download the report
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_report_${selectedPeriod.start}_to_${selectedPeriod.end}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payroll report generated successfully!');
    } catch (err) {
      console.error('Error generating payroll report:', err);
      toast.error('Failed to generate payroll report');
    }
  };

  const viewEmployeePayslip = async (employeeId, periodId) => {
    try {
      const response = await payrollAPI.getEmployeePayslip(employeeId, periodId);
      setSelectedPayroll(response.data.data);
      setShowPayslipModal(true);
    } catch (err) {
      console.error('Error fetching payslip:', err);
      toast.error('Failed to fetch payslip');
    }
  };

  const exportEmployeePayslip = async (employeeId, periodId) => {
    try {
      const response = await payrollAPI.exportEmployeePayslip(employeeId, periodId);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${employeeId}_${periodId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payslip exported successfully!');
    } catch (err) {
      console.error('Error exporting payslip:', err);
      toast.error('Failed to export payslip');
    }
  };

  // Effects
  useEffect(() => {
    fetchPayrollData();
    fetchPayrollPeriods();
    fetchTaxTitles();
    fetchDeductionTitles();
    fetchBenefits();
    fetchEmployees();
  }, [selectedPeriod, searchTerm, statusFilter]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Get status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed': return 'success';
      case 'pending': return 'warning';
      case 'draft': return 'secondary';
      default: return 'light';
    }
  };

  if (loading && payrollData.payrolls.length === 0) {
    return (
      <Container fluid className="py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading payroll data...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 payroll-dashboard">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <FaMoneyCheckAlt className="me-2" />
                Payroll & Compensation Management
              </h2>
              <p className="text-muted mb-0">Comprehensive payroll and compensation management system</p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => exportPayroll('excel')}
                disabled={loading}
              >
                <FaFileExport className="me-1" />
                Export Excel
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => exportPayroll('pdf')}
                disabled={loading}
              >
                <FaFileExport className="me-1" />
                Export PDF
              </Button>
              <Button
                variant="success"
                onClick={generatePayrollReport}
                disabled={loading}
              >
                <FaFileInvoice className="me-1" />
                Generate Report
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowGenerateModal(true)}
                disabled={loading}
              >
                <FaCalculator className="me-1" />
                Generate Payroll
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Tabbed Interface */}
      <Row>
        <Col>
          <Card>
            <Card.Body className="p-0">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="payroll-tabs"
                fill
              >
                {/* Overview Tab */}
                <Tab eventKey="overview" title={
                  <span>
                    <FaTachometerAlt className="me-2" />
                    Overview
                  </span>
                }>
                  {renderOverviewTab()}
                </Tab>

                {/* Payroll Periods Tab */}
                <Tab eventKey="periods" title={
                  <span>
                    <FaCalendarAlt className="me-2" />
                    Payroll Periods
                  </span>
                }>
                  {renderPayrollPeriodsTab()}
                </Tab>

                {/* Tax Management Tab */}
                <Tab eventKey="taxes" title={
                  <span>
                    <FaPercent className="me-2" />
                    Tax Management
                  </span>
                }>
                  {renderTaxManagementTab()}
                </Tab>

                {/* Deduction Management Tab */}
                <Tab eventKey="deductions" title={
                  <span>
                    <FaMinus className="me-2" />
                    Deduction Management
                  </span>
                }>
                  {renderDeductionManagementTab()}
                </Tab>

                {/* Benefits Management Tab */}
                <Tab eventKey="benefits" title={
                  <span>
                    <FaGift className="me-2" />
                    Benefits Management
                  </span>
                }>
                  {renderBenefitsManagementTab()}
                </Tab>

                {/* Employee Assignments Tab */}
                <Tab eventKey="assignments" title={
                  <span>
                    <FaUserCheck className="me-2" />
                    Employee Assignments
                  </span>
                }>
                  {renderEmployeeAssignmentsTab()}
                </Tab>

                {/* Payslips Tab */}
                <Tab eventKey="payslips" title={
                  <span>
                    <FaReceipt className="me-2" />
                    Payslips
                  </span>
                }>
                  {renderPayslipsTab()}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Period Selection */}
      <Row className="mb-4">
        <Col>
          <Card className="payroll-period-selector">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <h5 className="mb-0">Payroll Period</h5>
                  <ButtonGroup>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handlePeriodChange('prev')}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handlePeriodChange('next')}
                    >
                      Next →
                    </Button>
                  </ButtonGroup>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Form.Control
                    type="date"
                    value={selectedPeriod.start}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
                    size="sm"
                  />
                  <span>to</span>
                  <Form.Control
                    type="date"
                    value={selectedPeriod.end}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
                    size="sm"
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={fetchPayrollData}
                    disabled={loading}
                  >
                    <FaSync className={loading ? 'fa-spin' : ''} />
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center payroll-stats-card">
            <Card.Body>
              <FaUsers className="text-primary mb-2" size={24} />
              <h4 className="mb-1">{payrollData.statistics.total_employees}</h4>
              <small className="text-muted">Total Employees</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center">
            <Card.Body>
              <FaCheckCircle className="text-success mb-2" size={24} />
              <h4 className="mb-1">{payrollData.statistics.processed_payrolls}</h4>
              <small className="text-muted">Processed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center">
            <Card.Body>
              <FaExclamationTriangle className="text-warning mb-2" size={24} />
              <h4 className="mb-1">{payrollData.statistics.pending_payrolls}</h4>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center">
            <Card.Body>
              <FaMoneyCheckAlt className="text-info mb-2" size={24} />
              <h4 className="mb-1">{formatCurrency(payrollData.statistics.total_gross_pay)}</h4>
              <small className="text-muted">Gross Pay</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center">
            <Card.Body>
              <FaTimesCircle className="text-danger mb-2" size={24} />
              <h4 className="mb-1">{formatCurrency(payrollData.statistics.total_deductions)}</h4>
              <small className="text-muted">Deductions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center">
            <Card.Body>
              <FaMoneyCheckAlt className="text-success mb-2" size={24} />
              <h4 className="mb-1">{formatCurrency(payrollData.statistics.total_net_pay)}</h4>
              <small className="text-muted">Net Pay</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="processed">Processed</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              <FaFilter className="me-1" />
              Clear Filters
            </Button>
          </div>
        </Col>
      </Row>

      {/* Payroll Table */}
      <Row>
        <Col>
          <Card className="payroll-table-card">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Employee Payroll</h5>
                <Badge bg="secondary">
                  {payrollData.pagination.total} records
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2">Loading payroll data...</span>
                </div>
              ) : (
                <Table responsive hover className="mb-0 payroll-table">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Position</th>
                      <th>Basic Salary</th>
                      <th>Overtime</th>
                      <th>Allowances</th>
                      <th>Gross Pay</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.payrolls.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4 text-muted">
                          No payroll data found for the selected period
                        </td>
                      </tr>
                    ) : (
                      payrollData.payrolls.map((payroll) => (
                        <tr key={payroll.id}>
                          <td>
                            <div>
                              <strong>{payroll.employee?.name || 'N/A'}</strong>
                              <br />
                              <small className="text-muted">{payroll.employee?.employee_id || 'N/A'}</small>
                            </div>
                          </td>
                          <td>{payroll.employee?.position || 'N/A'}</td>
                          <td>{formatCurrency(payroll.basic_salary || 0)}</td>
                          <td>{formatCurrency(payroll.overtime_pay || 0)}</td>
                          <td>{formatCurrency(payroll.allowances || 0)}</td>
                          <td>
                            <strong>{formatCurrency(payroll.gross_pay || 0)}</strong>
                          </td>
                          <td>{formatCurrency(payroll.total_deductions || 0)}</td>
                          <td>
                            <strong className="text-success">
                              {formatCurrency(payroll.net_pay || 0)}
                            </strong>
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(payroll.status)}>
                              {payroll.status || 'Draft'}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewPayrollDetails(payroll)}
                              >
                                <FaEye />
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                              >
                                <FaEdit />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Generate Payroll Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} size="lg" className="payroll-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalculator className="me-2" />
            Generate Payroll
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <FaExclamationTriangle className="me-2" />
            This will generate payroll for all active employees for the selected period.
          </Alert>
          
          <div className="mb-3">
            <strong>Period:</strong> {format(new Date(selectedPeriod.start), 'MMM dd, yyyy')} - {format(new Date(selectedPeriod.end), 'MMM dd, yyyy')}
          </div>
          
          {attendanceData && (
            <div className="mb-3">
              <strong>Attendance Summary:</strong>
              <ul className="mt-2">
                <li>Total Employees: {attendanceData.total_employees}</li>
                <li>Present Days: {attendanceData.total_present_days}</li>
                <li>Absent Days: {attendanceData.total_absent_days}</li>
                <li>Late Days: {attendanceData.total_late_days}</li>
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={generatePayroll}
            disabled={generating}
          >
            {generating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generating...
              </>
            ) : (
              <>
                <FaCalculator className="me-2" />
                Generate Payroll
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payroll Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" className="payroll-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEye className="me-2" />
            Payroll Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayroll && (
            <div>
              <Row>
                <Col md={6}>
                  <div className="payroll-details-section">
                    <h6>Employee Information</h6>
                  <p><strong>Name:</strong> {selectedPayroll.employee?.name || 'N/A'}</p>
                  <p><strong>ID:</strong> {selectedPayroll.employee?.employee_id || 'N/A'}</p>
                  <p><strong>Position:</strong> {selectedPayroll.employee?.position || 'N/A'}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="payroll-details-section">
                    <h6>Payroll Period</h6>
                  <p><strong>Start:</strong> {format(new Date(selectedPayroll.period_start), 'MMM dd, yyyy')}</p>
                  <p><strong>End:</strong> {format(new Date(selectedPayroll.period_end), 'MMM dd, yyyy')}</p>
                  <p><strong>Status:</strong> <Badge bg={getStatusBadge(selectedPayroll.status)}>{selectedPayroll.status}</Badge></p>
                  </div>
                </Col>
              </Row>
              
              <hr />
              
              <Row>
                <Col md={6}>
                  <div className="payroll-details-section">
                    <h6>Earnings</h6>
                  <p><strong>Basic Salary:</strong> {formatCurrency(selectedPayroll.basic_salary || 0)}</p>
                  <p><strong>Overtime Pay:</strong> {formatCurrency(selectedPayroll.overtime_pay || 0)}</p>
                  <p><strong>Allowances:</strong> {formatCurrency(selectedPayroll.allowances || 0)}</p>
                  <p><strong>Total Gross:</strong> {formatCurrency(selectedPayroll.gross_pay || 0)}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="payroll-details-section">
                    <h6>Deductions</h6>
                  <p><strong>SSS:</strong> {formatCurrency(selectedPayroll.sss_deduction || 0)}</p>
                  <p><strong>PhilHealth:</strong> {formatCurrency(selectedPayroll.philhealth_deduction || 0)}</p>
                  <p><strong>Pag-IBIG:</strong> {formatCurrency(selectedPayroll.pagibig_deduction || 0)}</p>
                  <p><strong>Tax:</strong> {formatCurrency(selectedPayroll.tax_deduction || 0)}</p>
                  <p><strong>Total Deductions:</strong> {formatCurrency(selectedPayroll.total_deductions || 0)}</p>
                  </div>
                </Col>
              </Row>
              
              <hr />
              
              <div className="payroll-net-pay">
                <h4>
                  Net Pay: {formatCurrency(selectedPayroll.net_pay || 0)}
                </h4>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          <Button variant="primary">
            <FaEdit className="me-2" />
            Edit Payroll
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PayrollDashboard;
