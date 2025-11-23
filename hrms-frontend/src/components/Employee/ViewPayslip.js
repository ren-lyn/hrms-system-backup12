import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Table, Spinner, Alert, Form, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFilePdf, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

const ViewPayslip = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    fetchEmployeePayrolls();
    fetchEmployeeProfile();
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/employee/profile', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setEmployeeProfile(response.data.profile || response.data);
    } catch (err) {
      console.error('Error fetching employee profile:', err);
    }
  };

  const fetchEmployeePayrolls = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payrolls for this employee using the my-payrolls endpoint
      const response = await axios.get(`http://localhost:8000/api/payrolls/my-payrolls`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const employeePayrolls = response.data?.data || [];
      setPayrolls(employeePayrolls);
    } catch (err) {
      console.error('Error fetching payrolls:', err);
      setError(err.response?.data?.message || 'Failed to load payslips. Please try again.');
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₱0.00';
    return `₱${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const downloadPayslip = async (payrollId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/payrolls/${payrollId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob',
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });

      // Check if response is an error JSON instead of PDF
      if (response.headers['content-type']?.includes('application/json')) {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || errorData.error || 'Failed to download payslip');
      }

      // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${payrollId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip downloaded successfully');
    } catch (err) {
      console.error('Error downloading payslip:', err);
      
      // Handle different error types
      let errorMessage = 'Failed to download payslip. Please try again.';
      
      if (err.response?.status === 404) {
        errorMessage = 'Payslip not found or you do not have permission to access it.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to download this payslip.';
      } else if (err.response?.data) {
        // Try to parse error message from blob response
        try {
          if (err.response.data instanceof Blob) {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else if (typeof err.response.data === 'object') {
            errorMessage = err.response.data.message || err.response.data.error || errorMessage;
          }
        } catch (parseErr) {
          // If parsing fails, use default message
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="container-fluid">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FontAwesomeIcon icon={faFilePdf} className="me-2" />
            My Payslips
          </h5>
        </Card.Header>
        <Card.Body>
          {payrolls.length === 0 ? (
            <Alert variant="info">
              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
              No payslips available yet. Payslips will appear here once payroll has been processed.
            </Alert>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Pay Period</th>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Gross Pay</th>
                  <th>Total Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.id}>
                    <td>
                      {payroll.payroll_period?.name || 
                       `${formatDate(payroll.period_start)} - ${formatDate(payroll.period_end)}`}
                    </td>
                    <td>{formatDate(payroll.period_start)}</td>
                    <td>{formatDate(payroll.period_end)}</td>
                    <td className="fw-bold text-success">{formatCurrency(payroll.gross_pay)}</td>
                    <td className="text-danger">{formatCurrency(payroll.total_deductions)}</td>
                    <td className="fw-bold text-primary">{formatCurrency(payroll.net_pay)}</td>
                    <td>
                      <Badge bg={payroll.status === 'paid' ? 'success' : payroll.status === 'processed' ? 'info' : 'warning'}>
                        {payroll.status || 'Pending'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedPayroll(payroll);
                          downloadPayslip(payroll.id);
                        }}
                      >
                        <FontAwesomeIcon icon={faDownload} className="me-1" />
                        Download PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {selectedPayroll && (
        <Card className="shadow-sm">
          <Card.Header>
            <h5 className="mb-0">Payslip Details</h5>
          </Card.Header>
          <Card.Body>
            <div className="row">
              <div className="col-md-6">
                <h6>Earnings</h6>
                <Table size="sm" borderless>
                  <tbody>
                    <tr>
                      <td>Basic Salary:</td>
                      <td className="text-end">{formatCurrency(selectedPayroll.basic_salary)}</td>
                    </tr>
                    <tr className="fw-bold">
                      <td>Gross Pay:</td>
                      <td className="text-end text-success">{formatCurrency(selectedPayroll.gross_pay)}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <div className="col-md-6">
                <h6>Deductions</h6>
                <Table size="sm" borderless>
                  <tbody>
                    {selectedPayroll.sss_deduction > 0 && (
                      <tr>
                        <td>SSS Contribution (Employee):</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.philhealth_deduction > 0 && (
                      <tr>
                        <td>PhilHealth (Employee):</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.philhealth_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.pagibig_deduction > 0 && (
                      <tr>
                        <td>Pag-IBIG (Employee):</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.pagibig_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.tax_deduction > 0 && (
                      <tr>
                        <td>Income Tax:</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.tax_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.late_deduction > 0 && (
                      <tr>
                        <td>Late Penalty:</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.late_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.undertime_deduction > 0 && (
                      <tr>
                        <td>Undertime Penalty:</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.undertime_deduction)}</td>
                      </tr>
                    )}
                    {selectedPayroll.cash_advance_deduction > 0 && (
                      <tr>
                        <td>Cash Advance:</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.cash_advance_deduction)}</td>
                      </tr>
                    )}
                    <tr className="fw-bold">
                      <td>Total Deductions:</td>
                      <td className="text-end text-danger">{formatCurrency(selectedPayroll.total_deductions)}</td>
                    </tr>
                    <tr className="fw-bold border-top">
                      <td>Net Pay:</td>
                      <td className="text-end text-primary fs-5">{formatCurrency(selectedPayroll.net_pay)}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default ViewPayslip;

