import React, { useState, useEffect, useRef } from 'react';
import { FaFilePdf, FaFileExcel, FaSearch, FaFilter, FaDownload, FaSpinner, FaTrophy, FaExclamationTriangle, FaChartLine, FaUsers, FaAward, FaTimesCircle } from 'react-icons/fa';
import { Card, Button, Row, Col, Form, Table, Dropdown, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import Chart from 'chart.js/auto';

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
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  
  // Chart refs
  const passFailChartRef = useRef(null);
  const departmentChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const passFailChartInstanceRef = useRef(null);
  const departmentChartInstanceRef = useRef(null);
  const trendChartInstanceRef = useRef(null);

  useEffect(() => {
    if (reportType === 'performance') {
      fetchDepartments();
      fetchPositions();
    }
  }, [reportType]);

  // Create charts when analytics data changes
  useEffect(() => {
    if (analytics && reportType === 'performance' && statistics) {
      // Create Pass/Fail Chart
      if (passFailChartRef.current) {
        if (passFailChartInstanceRef.current) {
          passFailChartInstanceRef.current.destroy();
        }
        const ctx = passFailChartRef.current.getContext('2d');
        passFailChartInstanceRef.current = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Passed', 'Failed'],
            datasets: [{
              data: [statistics.passed_count, statistics.failed_count],
              backgroundColor: ['#28a745', '#dc3545'],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  font: { size: 12, weight: 'bold' }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      }

      // Create Department Chart
      if (departmentChartRef.current && analytics.by_department && analytics.by_department.length > 1) {
        if (departmentChartInstanceRef.current) {
          departmentChartInstanceRef.current.destroy();
        }
        const ctx = departmentChartRef.current.getContext('2d');
        departmentChartInstanceRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: analytics.by_department.map(dept => dept.department),
            datasets: [
              {
                label: 'Average Score',
                data: analytics.by_department.map(dept => dept.average_score),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: function(value) {
                    return value + '%';
                  }
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Avg Score: ${context.parsed.y.toFixed(1)}%`;
                  }
                }
              }
            }
          }
        });
      }

      // Create Trend Chart
      if (trendChartRef.current && analytics.by_month && analytics.by_month.length > 1) {
        if (trendChartInstanceRef.current) {
          trendChartInstanceRef.current.destroy();
        }
        const ctx = trendChartRef.current.getContext('2d');
        trendChartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: analytics.by_month.map(month => month.month),
            datasets: [
              {
                label: 'Average Score',
                data: analytics.by_month.map(month => month.average_score),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Pass Rate',
                data: analytics.by_month.map(month => month.pass_rate),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: function(value) {
                    return value + '%';
                  }
                }
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            }
          }
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (passFailChartInstanceRef.current) {
        passFailChartInstanceRef.current.destroy();
        passFailChartInstanceRef.current = null;
      }
      if (departmentChartInstanceRef.current) {
        departmentChartInstanceRef.current.destroy();
        departmentChartInstanceRef.current = null;
      }
      if (trendChartInstanceRef.current) {
        trendChartInstanceRef.current.destroy();
        trendChartInstanceRef.current = null;
      }
    };
  }, [analytics, reportType, statistics]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/reports/departments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/reports/positions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPositions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
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

  const handleGeneratePreview = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select a date range');
      return;
    }

    if (reportType === 'performance') {
      await generatePerformancePreview();
    } else {
      toast.info('Other report types coming soon');
    }
  };

  const generatePerformancePreview = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        department: filters.department || undefined,
        position: filters.position || undefined,
        status: filters.status || 'all'
      };

      const response = await axios.get('http://localhost:8000/api/reports/performance', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPerformanceData(response.data.data.evaluations);
      setStatistics(response.data.data.statistics);
      setAnalytics(response.data.data.analytics);
      setInsights(response.data.data.insights);
      toast.success('Performance report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      setPerformanceData([]);
      setStatistics(null);
      setAnalytics(null);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select a date range');
      return;
    }

    if (reportType === 'performance') {
      await downloadPerformancePDF();
    } else {
      toast.info('Other report types coming soon');
    }
  };

  const downloadPerformancePDF = async () => {
    try {
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        department: filters.department || undefined,
        position: filters.position || undefined,
        status: filters.status || 'all'
      };

      const response = await axios.get('http://localhost:8000/api/reports/performance/download', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleGenerateReport = (format) => {
    if (format === 'pdf') {
      handleDownloadPDF();
    } else {
      toast.info(`${format.toUpperCase()} export coming soon`);
    }
  };

  const renderPerformanceReport = () => {
    if (!performanceData) {
      return (
        <tr>
          <td colSpan="9" className="text-center text-muted py-4">
            No data available. Click "Generate Preview" to see results.
          </td>
        </tr>
      );
    }

    if (performanceData.length === 0) {
      return (
        <tr>
          <td colSpan="9" className="text-center text-muted py-4">
            No evaluation data found for the selected criteria.
          </td>
        </tr>
      );
    }

    return performanceData.map((evaluation, index) => (
      <tr 
        key={evaluation.id}
        style={{
          background: index % 2 === 0 ? '#fff' : '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e3f2fd';
          e.currentTarget.style.transform = 'scale(1.005)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#f8f9fa';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <td style={{ 
          padding: '1rem',
          fontWeight: '600',
          color: '#667eea'
        }}>
          {index + 1}
        </td>
        <td style={{ 
          padding: '1rem',
          fontWeight: '500',
          color: '#2c3e50'
        }}>
          {evaluation.employee_name}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {evaluation.employee_id_number}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#495057'
        }}>
          {evaluation.department}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#495057'
        }}>
          {evaluation.position}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {new Date(evaluation.evaluation_period_start).toLocaleDateString()}
        </td>
        <td style={{ 
          padding: '1rem',
          fontWeight: '600',
          color: evaluation.percentage_score >= 70 ? '#28a745' : evaluation.percentage_score >= 50 ? '#ffc107' : '#dc3545',
          fontSize: '1rem'
        }}>
          {evaluation.percentage_score}%
        </td>
        <td style={{ padding: '1rem' }}>
          <Badge 
            bg={evaluation.is_passed ? 'success' : 'danger'}
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '20px',
              fontWeight: '600'
            }}
          >
            {evaluation.is_passed ? 'PASSED' : 'FAILED'}
          </Badge>
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {new Date(evaluation.submitted_at).toLocaleDateString()}
        </td>
      </tr>
    ));
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
                    {reportType === 'performance' 
                      ? departments.map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))
                      : (
                        <>
                          <option value="hr">Human Resources</option>
                          <option value="it">Information Technology</option>
                          <option value="finance">Finance</option>
                          <option value="operations">Operations</option>
                        </>
                      )
                    }
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
                    {reportType === 'performance' 
                      ? positions.map((pos, idx) => (
                          <option key={idx} value={pos}>{pos}</option>
                        ))
                      : (
                        <>
                          <option value="manager">Manager</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="staff">Staff</option>
                        </>
                      )
                    }
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
                    {reportType === 'performance' ? (
                      <>
                        <option value="all">All Status</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                      </>
                    ) : (
                      <>
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on-leave">On Leave</option>
                      </>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <div className="mt-3 d-flex justify-content-between">
              <Button 
                variant="primary" 
                className="me-2" 
                onClick={handleGeneratePreview}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="me-2 fa-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaSearch className="me-2" />
                    Generate Preview
                  </>
                )}
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
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {statistics && reportType === 'performance' && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header className="text-white" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0 d-flex align-items-center">
              <FaChartLine className="me-2" />
              Summary Statistics
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '2rem' }}>
            <Row className="g-4">
              <Col md={6}>
                <Row className="g-4">
                  <Col md={6}>
                    <div className="text-center p-4" style={{ 
                      background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className="mb-3">
                        <FaUsers style={{ fontSize: '2.5rem', color: '#667eea' }} />
                      </div>
                      <h2 className="mb-2" style={{ color: '#667eea', fontWeight: '700', fontSize: '2.5rem' }}>
                        {statistics.total_evaluations}
                      </h2>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        Total Evaluations
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="text-center p-4" style={{ 
                      background: 'linear-gradient(135deg, #56ab2f15 0%, #a8e06315 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className="mb-3">
                        <FaAward style={{ fontSize: '2.5rem', color: '#28a745' }} />
                      </div>
                      <h2 className="mb-2" style={{ color: '#28a745', fontWeight: '700', fontSize: '2.5rem' }}>
                        {statistics.passed_count}
                      </h2>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        Passed
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="text-center p-4" style={{ 
                      background: 'linear-gradient(135deg, #eb334915 0%, #f45c4315 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className="mb-3">
                        <FaTimesCircle style={{ fontSize: '2.5rem', color: '#dc3545' }} />
                      </div>
                      <h2 className="mb-2" style={{ color: '#dc3545', fontWeight: '700', fontSize: '2.5rem' }}>
                        {statistics.failed_count}
                      </h2>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        Failed
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="text-center p-4" style={{ 
                      background: 'linear-gradient(135deg, #f0981915 0%, #edde5d15 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className="mb-3">
                        <FaChartLine style={{ fontSize: '2.5rem', color: '#ffc107' }} />
                      </div>
                      <h2 className="mb-2" style={{ color: '#ffc107', fontWeight: '700', fontSize: '2.5rem' }}>
                        {statistics.average_percentage}%
                      </h2>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        Average Score
                      </p>
                    </div>
                  </Col>
                </Row>
              </Col>
              <Col md={6}>
                <div style={{ 
                  height: '350px',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <canvas ref={passFailChartRef}></canvas>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {insights && reportType === 'performance' && insights.length > 0 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header className="text-white" style={{ 
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0 d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              Key Insights & Recommendations
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '1.5rem' }}>
            <Row className="g-3">
              {insights.map((insight, idx) => {
                let bgColor, borderColor, iconColor;
                if (insight.type === 'success') {
                  bgColor = '#d4edda';
                  borderColor = '#c3e6cb';
                  iconColor = '#155724';
                } else if (insight.type === 'danger') {
                  bgColor = '#f8d7da';
                  borderColor = '#f5c6cb';
                  iconColor = '#721c24';
                } else if (insight.type === 'warning') {
                  bgColor = '#fff3cd';
                  borderColor = '#ffeaa7';
                  iconColor = '#856404';
                } else {
                  bgColor = '#d1ecf1';
                  borderColor = '#bee5eb';
                  iconColor = '#0c5460';
                }
                
                return (
                  <Col key={idx} md={12}>
                    <div className="p-4" style={{
                      background: bgColor,
                      borderRadius: '12px',
                      border: `2px solid ${borderColor}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <h6 className="mb-3 d-flex align-items-center" style={{ 
                        color: iconColor,
                        fontWeight: '700',
                        fontSize: '1.1rem'
                      }}>
                        {insight.type === 'success' && <FaAward className="me-2" />}
                        {insight.type === 'warning' && <FaExclamationTriangle className="me-2" />}
                        {insight.type === 'danger' && <FaTimesCircle className="me-2" />}
                        {(!insight.type || insight.type === 'info') && <FaChartLine className="me-2" />}
                        {insight.title}
                      </h6>
                      <p className="mb-3" style={{ 
                        color: '#333',
                        lineHeight: '1.6',
                        fontSize: '0.95rem'
                      }}>
                        {insight.description}
                      </p>
                      <div style={{
                        background: 'rgba(255,255,255,0.6)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${iconColor}`
                      }}>
                        <strong style={{ color: iconColor }}>Recommendation:</strong>{' '}
                        <span style={{ color: '#555' }}>{insight.recommendation}</span>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card.Body>
        </Card>
      )}

      {analytics && reportType === 'performance' && analytics.by_department && analytics.by_department.length > 1 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header style={{
            background: '#f8f9fa',
            borderBottom: '2px solid #dee2e6',
            borderRadius: '12px 12px 0 0',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
              Performance by Department
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '2rem' }}>
            <Row>
              <Col md={8}>
                <div style={{ 
                  height: '350px',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <canvas ref={departmentChartRef}></canvas>
                </div>
              </Col>
              <Col md={4}>
                <div style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: '100%'
                }}>
                  <h6 className="mb-3" style={{ 
                    color: '#2c3e50',
                    fontWeight: '600',
                    borderBottom: '2px solid #dee2e6',
                    paddingBottom: '0.5rem'
                  }}>
                    Department Averages
                  </h6>
                  <Table borderless hover size="sm" className="mb-0">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ color: '#6c757d', fontWeight: '600', fontSize: '0.9rem' }}>Dept</th>
                        <th className="text-center" style={{ color: '#6c757d', fontWeight: '600', fontSize: '0.9rem' }}>Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.by_department.map((dept, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ 
                            color: '#2c3e50',
                            fontWeight: '500',
                            padding: '0.75rem 0'
                          }}>
                            {dept.department}
                          </td>
                          <td className="text-center" style={{ 
                            color: '#667eea',
                            fontWeight: '700',
                            fontSize: '1rem',
                            padding: '0.75rem 0'
                          }}>
                            {dept.average_score}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {analytics && reportType === 'performance' && analytics.by_position && analytics.by_position.length > 1 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header style={{
            background: '#f8f9fa',
            borderBottom: '2px solid #dee2e6',
            borderRadius: '12px 12px 0 0',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
              Performance by Position
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '1.5rem' }}>
            <div className="table-responsive">
              <Table hover className="mb-0" style={{ 
                borderCollapse: 'separate',
                borderSpacing: '0'
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      borderTopLeftRadius: '8px',
                      border: 'none'
                    }}>
                      Position
                    </th>
                    <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                      Total
                    </th>
                    <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                      Passed
                    </th>
                    <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                      Failed
                    </th>
                    <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                      Avg Score
                    </th>
                    <th className="text-center" style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      borderTopRightRadius: '8px',
                      border: 'none'
                    }}>
                      Pass Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.by_position.map((pos, idx) => (
                    <tr 
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                        transition: 'all 0.2s ease',
                        borderBottom: '1px solid #e9ecef'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e3f2fd';
                        e.currentTarget.style.transform = 'scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f8f9fa';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <td style={{ 
                        padding: '1rem',
                        fontWeight: '500',
                        color: '#2c3e50'
                      }}>
                        {pos.position}
                      </td>
                      <td className="text-center" style={{ padding: '1rem', color: '#495057' }}>
                        {pos.total}
                      </td>
                      <td className="text-center" style={{ padding: '1rem' }}>
                        <Badge bg="success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                          {pos.passed}
                        </Badge>
                      </td>
                      <td className="text-center" style={{ padding: '1rem' }}>
                        <Badge bg="danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                          {pos.failed}
                        </Badge>
                      </td>
                      <td className="text-center" style={{ 
                        padding: '1rem',
                        fontWeight: '600',
                        color: '#667eea',
                        fontSize: '1rem'
                      }}>
                        {pos.average_score}%
                      </td>
                      <td className="text-center" style={{ 
                        padding: '1rem',
                        fontWeight: '600',
                        color: pos.pass_rate >= 80 ? '#28a745' : pos.pass_rate >= 60 ? '#ffc107' : '#dc3545'
                      }}>
                        {pos.pass_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {analytics && reportType === 'performance' && analytics.by_month && analytics.by_month.length > 1 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header style={{
            background: '#f8f9fa',
            borderBottom: '2px solid #dee2e6',
            borderRadius: '12px 12px 0 0',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
              Performance Trends Over Time
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '2rem' }}>
            <Row>
              <Col md={12}>
                <div style={{ 
                  height: '350px',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <canvas ref={trendChartRef}></canvas>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {analytics && reportType === 'performance' && analytics.top_performers && analytics.top_performers.length > 0 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header className="text-white" style={{ 
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0 d-flex align-items-center">
              <FaTrophy className="me-2" />
              Top 5 Performers
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '1.5rem' }}>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #28a74515 0%, #20c99715 100%)'
                  }}>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#155724',
                      border: 'none'
                    }}>
                      Employee Name
                    </th>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#155724',
                      border: 'none'
                    }}>
                      Department
                    </th>
                    <th className="text-center" style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#155724',
                      border: 'none'
                    }}>
                      Score
                    </th>
                    <th className="text-center" style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#155724',
                      border: 'none'
                    }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_performers.map((perf, idx) => (
                    <tr 
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#fff' : '#f8fff9',
                        borderBottom: '1px solid #e9ecef',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d4edda';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f8fff9';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <td style={{ 
                        padding: '1rem',
                        fontWeight: '500',
                        color: '#2c3e50'
                      }}>
                        {perf.employee_name}
                      </td>
                      <td style={{ 
                        padding: '1rem',
                        color: '#6c757d'
                      }}>
                        {perf.department}
                      </td>
                      <td className="text-center" style={{ 
                        padding: '1rem',
                        fontWeight: '700',
                        color: '#28a745',
                        fontSize: '1.1rem'
                      }}>
                        {perf.percentage_score}%
                      </td>
                      <td className="text-center" style={{ padding: '1rem' }}>
                        <Badge 
                          bg="success" 
                          style={{ 
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            borderRadius: '20px',
                            fontWeight: '600'
                          }}
                        >
                          PASSED
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {analytics && reportType === 'performance' && analytics.bottom_performers && analytics.bottom_performers.length > 0 && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header className="text-white" style={{ 
            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            borderRadius: '12px 12px 0 0',
            border: 'none',
            padding: '1.25rem'
          }}>
            <h5 className="mb-0 d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              Bottom 5 Performers (Need Attention)
            </h5>
          </Card.Header>
          <Card.Body style={{ padding: '1.5rem' }}>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #dc354515 0%, #c8233315 100%)'
                  }}>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#721c24',
                      border: 'none'
                    }}>
                      Employee Name
                    </th>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#721c24',
                      border: 'none'
                    }}>
                      Department
                    </th>
                    <th className="text-center" style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#721c24',
                      border: 'none'
                    }}>
                      Score
                    </th>
                    <th className="text-center" style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#721c24',
                      border: 'none'
                    }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.bottom_performers.map((perf, idx) => (
                    <tr 
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#fff' : '#fff5f5',
                        borderBottom: '1px solid #e9ecef',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8d7da';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fff5f5';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <td style={{ 
                        padding: '1rem',
                        fontWeight: '500',
                        color: '#2c3e50'
                      }}>
                        {perf.employee_name}
                      </td>
                      <td style={{ 
                        padding: '1rem',
                        color: '#6c757d'
                      }}>
                        {perf.department}
                      </td>
                      <td className="text-center" style={{ 
                        padding: '1rem',
                        fontWeight: '700',
                        color: '#dc3545',
                        fontSize: '1.1rem'
                      }}>
                        {perf.percentage_score}%
                      </td>
                      <td className="text-center" style={{ padding: '1rem' }}>
                        <Badge 
                          bg="danger" 
                          style={{ 
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            borderRadius: '20px',
                            fontWeight: '600'
                          }}
                        >
                          FAILED
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      <Card className="shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
        <Card.Header style={{
          background: '#f8f9fa',
          borderBottom: '2px solid #dee2e6',
          borderRadius: '12px 12px 0 0',
          padding: '1.25rem'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
              Report Preview
            </h5>
            <small className="text-muted" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              Showing results for: <strong>{reportType.replace(/^./, str => str.toUpperCase())} Report</strong>
            </small>
          </div>
        </Card.Header>
        <Card.Body style={{ padding: '1.5rem' }}>
          <div className="table-responsive">
            <Table hover className="mb-0" style={{ 
              borderCollapse: 'separate',
              borderSpacing: '0'
            }}>
              <thead>
                {reportType === 'performance' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      borderTopLeftRadius: '8px',
                      border: 'none'
                    }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee Name</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee ID</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Department</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Position</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Period</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Score</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Status</th>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      borderTopRightRadius: '8px',
                      border: 'none'
                    }}>Submitted</th>
                  </tr>
                )}
                {reportType === 'attendance' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Time In</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Time Out</th>
                  </tr>
                )}
                {reportType === 'payroll' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Basic Salary</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Allowances</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Deductions</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Net Pay</th>
                  </tr>
                )}
                {reportType === 'leave' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Leave Type</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Start Date</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>End Date</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Status</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {reportType === 'performance' && renderPerformanceReport()}
                {reportType !== 'performance' && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-5" style={{ 
                      background: '#f8f9fa',
                      fontSize: '1rem'
                    }}>
                      This report type is coming soon.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {performanceData && (
            <div className="d-flex justify-content-between align-items-center mt-4" style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div className="text-muted" style={{ fontWeight: '500' }}>
                Showing <strong>1</strong> to <strong>{performanceData.length}</strong> of <strong>{performanceData.length}</strong> entries
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ReportGeneration;
