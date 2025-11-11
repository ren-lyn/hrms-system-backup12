import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaFilePdf, FaFileExcel, FaSearch, FaFilter, FaDownload, FaSpinner, FaTrophy, FaExclamationTriangle, FaChartLine, FaUsers, FaAward, FaTimesCircle, FaIdBadge, FaBuilding, FaBriefcase, FaCheckCircle } from 'react-icons/fa';
import { Card, Button, Row, Col, Form, Table, Dropdown, Badge, Alert, Modal, Spinner, ProgressBar } from 'react-bootstrap';
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
  const [payrollData, setPayrollData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [payrollAnalytics, setPayrollAnalytics] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceDetailLoading, setPerformanceDetailLoading] = useState(false);
  const [selectedPerformanceDetail, setSelectedPerformanceDetail] = useState(null);

  const aggregatedPerformance = useMemo(() => {
    if (!performanceData) return null;

    const map = new Map();

    performanceData.forEach((evaluation) => {
      const key = evaluation.employee_id;
      if (!map.has(key)) {
        map.set(key, {
          employee_id: evaluation.employee_id,
          employee_name: evaluation.employee_name,
          employee_id_number: evaluation.employee_id_number,
          department: evaluation.department,
          position: evaluation.position,
          evaluation_count: 0,
          total_percentage: 0,
          latest_submission: null,
        });
      }

      const entry = map.get(key);
      entry.evaluation_count += 1;
      entry.total_percentage += Number(evaluation.percentage_score ?? 0);

      if (evaluation.submitted_at) {
        const submittedDate = new Date(evaluation.submitted_at);
        if (!entry.latest_submission || submittedDate > entry.latest_submission) {
          entry.latest_submission = submittedDate;
        }
      }
    });

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      average_percentage:
        entry.evaluation_count > 0
          ? entry.total_percentage / entry.evaluation_count
          : 0,
      latest_submission: entry.latest_submission
        ? entry.latest_submission.toISOString()
        : null,
    }));
  }, [performanceData]);

  const performanceInsightsData = useMemo(() => {
    if (!selectedPerformanceDetail) return null;

    const { summary, evaluations } = selectedPerformanceDetail;
    const evaluationCount = summary?.evaluation_count ?? evaluations?.length ?? 0;
    const averagePercentage = summary?.average_percentage ?? 0;
    const categorySummary = summary?.category_summary ?? [];

    const passCount = evaluations?.filter(
      (evaluation) => Number(evaluation.percentage_score ?? 0) >= 70
    ).length ?? 0;
    const passRate = evaluationCount > 0 ? (passCount / evaluationCount) * 100 : 0;

    let latestScore = null;
    let oldestScore = null;
    if (evaluations && evaluations.length > 0) {
      latestScore = Number(evaluations[0].percentage_score ?? 0);
      oldestScore = Number(evaluations[evaluations.length - 1].percentage_score ?? 0);
    }
    const trendChange = latestScore !== null && oldestScore !== null
      ? latestScore - oldestScore
      : null;

    let topCategory = null;
    let lowCategory = null;
    if (categorySummary.length > 0) {
      topCategory = [...categorySummary].sort(
        (a, b) => (b.average_percentage ?? 0) - (a.average_percentage ?? 0)
      )[0];
      lowCategory = [...categorySummary].sort(
        (a, b) => (a.average_percentage ?? 0) - (b.average_percentage ?? 0)
      )[0];
    }

    const analytics = [];
    analytics.push({
      label: 'Evaluations reviewed',
      value: evaluationCount,
    });
    analytics.push({
      label: 'Average percentage',
      value: `${averagePercentage?.toFixed?.(2) ?? Number(averagePercentage ?? 0).toFixed(2)}%`,
    });
    analytics.push({
      label: 'Pass rate',
      value: `${passRate.toFixed(1)}%`,
    });
    if (trendChange !== null) {
      analytics.push({
        label: 'Trend change',
        value: `${trendChange >= 0 ? '+' : ''}${trendChange.toFixed(1)} pts (latest vs oldest)`,
      });
    }
    if (topCategory) {
      analytics.push({
        label: 'Strongest category',
        value: `${topCategory.category} (${Number(topCategory.average_percentage ?? 0).toFixed(1)}%)`,
      });
    }
    if (lowCategory) {
      analytics.push({
        label: 'Focus category',
        value: `${lowCategory.category} (${Number(lowCategory.average_percentage ?? 0).toFixed(1)}%)`,
      });
    }

    const recommendations = [];
    if (lowCategory && Number(lowCategory.average_percentage ?? 0) < 80) {
      recommendations.push(
        `Prioritize coaching on ${lowCategory.category.toLowerCase()}—average score is ${Number(
          lowCategory.average_percentage ?? 0
        ).toFixed(1)}%.`
      );
    }
    if (trendChange !== null && trendChange < -3) {
      recommendations.push(
        `Overall performance slipped by ${Math.abs(trendChange).toFixed(
          1
        )} pts. Schedule a check-in to understand blockers.`
      );
    } else if (trendChange !== null && trendChange > 3) {
      recommendations.push(
        `Performance improved by ${trendChange.toFixed(
          1
        )} pts—recognize the progress to keep momentum.`
      );
    }
    if (passRate < 100) {
      recommendations.push(
        `Only ${passRate.toFixed(
          1
        )}% of evaluations passed. Align on expectations and support plans.`
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('Performance is stable—continue current development plan and recognition.');
    }

    return {
      analytics,
      recommendations,
    };
  }, [selectedPerformanceDetail]);
  
  // Chart refs
  const passFailChartRef = useRef(null);
  const departmentChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const passFailChartInstanceRef = useRef(null);
  const departmentChartInstanceRef = useRef(null);
  const trendChartInstanceRef = useRef(null);

  useEffect(() => {
    if (reportType === 'performance' || reportType === 'payroll') {
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
    } else if (reportType === 'payroll') {
      await generatePayrollPreview();
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
  const generatePayrollPreview = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        department: filters.department || undefined,
        position: filters.position || undefined,
      };

      const response = await axios.get('http://localhost:8000/api/reports/payroll', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setPayrollData(response.data?.data?.payrolls || []);
      setPayrollAnalytics(response.data?.data?.analytics || null);
      toast.success('Payroll report generated successfully');
    } catch (error) {
      console.error('Error generating payroll report:', error);
      toast.error('Failed to generate payroll report');
      setPayrollData([]);
      setPayrollAnalytics(null);
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

  const downloadPayrollPDF = async () => {
    toast.info('Payroll PDF export coming soon');
  };

  const handleGenerateReport = (format) => {
    if (format === 'pdf') {
      if (reportType === 'performance') {
        handleDownloadPDF();
      } else if (reportType === 'payroll') {
        downloadPayrollPDF();
      } else {
        toast.info('PDF export coming soon for this report type');
      }
    } else {
      toast.info(`${format.toUpperCase()} export coming soon`);
    }
  };

  const handlePerformanceRowClick = async (employeeSummary) => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;

    if (!start || !end) {
      toast.error('Please select a date range to load performance details.');
      return;
    }

    setShowPerformanceModal(true);
    setPerformanceDetailLoading(true);
    setSelectedPerformanceDetail(null);

    try {
      const params = {
        start_date: start,
        end_date: end,
      };

      const response = await axios.get(
        `http://localhost:8000/api/reports/performance/${employeeSummary.employee_id}/details`,
        {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSelectedPerformanceDetail(response.data.data);
    } catch (error) {
      console.error('Error loading performance details:', error);
      toast.error('Failed to load detailed performance report.');
    } finally {
      setPerformanceDetailLoading(false);
    }
  };

  const handleClosePerformanceModal = () => {
    setShowPerformanceModal(false);
    setSelectedPerformanceDetail(null);
    setPerformanceDetailLoading(false);
  };

  const renderPerformanceReport = () => {
    if (!aggregatedPerformance) {
      return (
        <tr>
          <td colSpan="9" className="text-center text-muted py-4">
            No data available. Click "Generate Preview" to see results.
          </td>
        </tr>
      );
    }

    if (aggregatedPerformance.length === 0) {
      return (
        <tr>
          <td colSpan="9" className="text-center text-muted py-4">
            No evaluation data found for the selected criteria.
          </td>
        </tr>
      );
    }

    return aggregatedPerformance.map((employeeSummary, index) => {
      const averageScore = Number(employeeSummary.average_percentage ?? 0);
      const isPassed = averageScore >= 70;

      return (
      <tr 
        key={employeeSummary.employee_id}
        style={{
          background: index % 2 === 0 ? '#fff' : '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        role="button"
        onClick={() => handlePerformanceRowClick(employeeSummary)}
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
          {employeeSummary.employee_name}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {employeeSummary.employee_id_number}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#495057'
        }}>
          {employeeSummary.department}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#495057'
        }}>
          {employeeSummary.position}
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {employeeSummary.latest_submission
            ? new Date(employeeSummary.latest_submission).toLocaleDateString()
            : 'N/A'}
        </td>
        <td style={{ 
          padding: '1rem',
          fontWeight: '600',
          color: averageScore >= 70 ? '#28a745' : averageScore >= 50 ? '#ffc107' : '#dc3545',
          fontSize: '1rem'
        }}>
          {averageScore.toFixed(2)}%
        </td>
        <td style={{ padding: '1rem' }}>
          <Badge 
            bg={isPassed ? 'success' : 'danger'}
            style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '20px',
              fontWeight: '600'
            }}
          >
            {isPassed ? 'PASSED' : 'FAILED'}
          </Badge>
        </td>
        <td style={{ 
          padding: '1rem',
          color: '#6c757d'
        }}>
          {employeeSummary.evaluation_count}
        </td>
      </tr>
    );
    });
  };

  const renderPayrollReport = () => {
    if (!payrollData) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            No data available. Click "Generate Preview" to see results.
          </td>
        </tr>
      );
    }

    if (payrollData.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            No payroll data found for the selected criteria.
          </td>
        </tr>
      );
    }

    return payrollData.map((payroll, index) => (
      <tr key={payroll.id || index}>
        <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{index + 1}</td>
        <td style={{ padding: '1rem' }}>
          <div className="fw-semibold text-dark">{payroll.employee_name}</div>
          <div className="text-muted small">
            {payroll.employee_id_number} • {payroll.department} • {payroll.position}
          </div>
          <div className="text-muted small">
            Period: {new Date(payroll.period_start).toLocaleDateString()} –{' '}
            {new Date(payroll.period_end).toLocaleDateString()}
          </div>
        </td>
        <td className="text-end" style={{ padding: '1rem' }}>₱{Number(payroll.basic_salary ?? 0).toFixed(2)}</td>
        <td className="text-end" style={{ padding: '1rem' }}>₱{Number(payroll.allowances ?? 0).toFixed(2)}</td>
        <td className="text-end" style={{ padding: '1rem' }}>₱{Number(payroll.total_deductions ?? 0).toFixed(2)}</td>
        <td className="text-end fw-semibold text-success" style={{ padding: '1rem' }}>
          ₱{Number(payroll.net_pay ?? 0).toFixed(2)}
        </td>
      </tr>
    ));
  };

  return (
    <>
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
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Latest Evaluation</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Average Score</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Status</th>
                    <th style={{ 
                      padding: '1rem',
                      fontWeight: '600',
                      borderTopRightRadius: '8px',
                      border: 'none'
                    }}>Evaluations</th>
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
                {reportType === 'payroll' && renderPayrollReport()}
                {reportType !== 'performance' && reportType !== 'payroll' && (
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
          
          {reportType === 'performance' && aggregatedPerformance && aggregatedPerformance.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-4" style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div className="text-muted" style={{ fontWeight: '500' }}>
                Showing <strong>1</strong> to <strong>{aggregatedPerformance.length}</strong> of <strong>{aggregatedPerformance.length}</strong> employees
              </div>
              <div className="text-muted small">
                Average score overall: <strong>{Number(statistics?.average_percentage ?? 0).toFixed(2)}%</strong> • Pass rate: <strong>{Number(statistics?.pass_rate ?? 0).toFixed(2)}%</strong>
              </div>
            </div>
          )}

          {reportType === 'payroll' && payrollData && payrollData.length > 0 && (
            <>
              <div className="d-flex justify-content-between align-items-center mt-4" style={{
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div className="text-muted" style={{ fontWeight: '500' }}>
                  Showing <strong>1</strong> to <strong>{payrollData.length}</strong> of <strong>{payrollData.length}</strong> employees
                </div>
                {payrollAnalytics && (
                  <div className="text-muted small">
                    Total gross: <strong>₱{Number(payrollAnalytics.total_gross ?? 0).toFixed(2)}</strong> • Total net: <strong>₱{Number(payrollAnalytics.total_net ?? 0).toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {payrollAnalytics && (
                <div className="mt-4">
                  <Row className="g-3">
                    <Col md={3}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <div className="text-muted text-uppercase small fw-semibold">Total Gross Pay</div>
                          <div className="h4 text-primary fw-bold mb-0">₱{Number(payrollAnalytics.total_gross ?? 0).toFixed(2)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <div className="text-muted text-uppercase small fw-semibold">Total Net Pay</div>
                          <div className="h4 text-success fw-bold mb-0">₱{Number(payrollAnalytics.total_net ?? 0).toFixed(2)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <div className="text-muted text-uppercase small fw-semibold">Total Deductions</div>
                          <div className="h4 text-danger fw-bold mb-0">₱{Number(payrollAnalytics.total_deductions ?? 0).toFixed(2)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <div className="text-muted text-uppercase small fw-semibold">Average Net Pay</div>
                          <div className="h4 text-primary fw-bold mb-0">₱{Number(payrollAnalytics.average_net_pay ?? 0).toFixed(2)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-3">
                    <Col md={6}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <h6 className="text-uppercase text-muted small fw-semibold mb-3">Deduction Breakdown</h6>
                          <Table bordered size="sm" className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Deduction</th>
                                <th className="text-end">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payrollAnalytics.deductions_breakdown &&
                                Object.entries(payrollAnalytics.deductions_breakdown).map(([key, value]) => (
                                  <tr key={key}>
                                    <td className="text-capitalize">{key.replace('_', ' ')}</td>
                                    <td className="text-end">₱{Number(value ?? 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                          <h6 className="text-uppercase text-muted small fw-semibold mb-3">Top Earners</h6>
                          <Table bordered size="sm" className="mb-3 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Name</th>
                                <th className="text-end">Net Pay</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payrollAnalytics.top_earners?.map((earner, idx) => (
                                <tr key={`top-earner-${idx}`}>
                                  <td>{earner.employee_name}</td>
                                  <td className="text-end text-success fw-semibold">₱{Number(earner.net_pay ?? 0).toFixed(2)}</td>
                                </tr>
                              ))}
                              {(!payrollAnalytics.top_earners || payrollAnalytics.top_earners.length === 0) && (
                                <tr>
                                  <td colSpan={2} className="text-center text-muted small">No data</td>
                                </tr>
                              )}
                            </tbody>
                          </Table>

                          <h6 className="text-uppercase text-muted small fw-semibold mb-3">Lowest Earners</h6>
                          <Table bordered size="sm" className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Name</th>
                                <th className="text-end">Net Pay</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payrollAnalytics.lowest_earners?.map((earner, idx) => (
                                <tr key={`low-earner-${idx}`}>
                                  <td>{earner.employee_name}</td>
                                  <td className="text-end text-danger fw-semibold">₱{Number(earner.net_pay ?? 0).toFixed(2)}</td>
                                </tr>
                              ))}
                              {(!payrollAnalytics.lowest_earners || payrollAnalytics.lowest_earners.length === 0) && (
                                <tr>
                                  <td colSpan={2} className="text-center text-muted small">No data</td>
                                </tr>
                              )}
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
      </div>
      <Modal
        size="xl"
        show={showPerformanceModal}
        onHide={handleClosePerformanceModal}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Employee Performance Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {performanceDetailLoading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : selectedPerformanceDetail ? (
            <>
              <div className="rounded-4 border-0 shadow-sm mb-4 p-4" style={{ background: 'linear-gradient(135deg, rgba(73, 97, 255, 0.22) 0%, rgba(168, 61, 255, 0.22) 100%)' }}>
                <Row className="align-items-center g-3">
                  <Col md={8}>
                    <div className="d-flex align-items-center">
                      <div className="bg-white rounded-circle text-primary fw-semibold d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '58px', height: '58px', fontSize: '1.4rem' }}>
                        {selectedPerformanceDetail.employee?.name?.split(' ').map((n) => n[0]).join('').substring(0, 2) || 'EM'}
                      </div>
                      <div>
                        <h4 className="mb-1 text-primary fw-bold">{selectedPerformanceDetail.employee?.name}</h4>
                        <div className="text-muted small d-flex flex-wrap align-items-center">
                          <span className="me-3 d-flex align-items-center">
                            <FaIdBadge className="me-1 text-primary" /> ID: {selectedPerformanceDetail.employee?.employee_id_number || 'N/A'}
                          </span>
                          <span className="me-3 d-flex align-items-center">
                            <FaBuilding className="me-1 text-primary" /> {selectedPerformanceDetail.employee?.department || 'N/A'}
                          </span>
                          <span className="d-flex align-items-center">
                            <FaBriefcase className="me-1 text-primary" /> {selectedPerformanceDetail.employee?.position || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md={4} className="text-md-end">
                    <div className="bg-white bg-opacity-75 rounded-3 py-3 px-4 d-inline-block shadow-sm">
                      <div className="text-uppercase text-muted small fw-semibold">Average Percentage</div>
                      <div className="display-6 text-primary mb-0 fw-bold">
                        {(selectedPerformanceDetail.summary?.average_percentage ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="bg-light rounded-3 p-3 h-100">
                        <div className="text-muted text-uppercase small fw-semibold">Evaluations Reviewed</div>
                        <div className="h4 mb-0 text-primary fw-bold">
                          {selectedPerformanceDetail.summary?.evaluation_count || 0}
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="bg-light rounded-3 p-3 h-100">
                        <div className="text-muted text-uppercase small fw-semibold">Average Percentage</div>
                        <div className="h4 mb-0 text-primary fw-bold">
                          {selectedPerformanceDetail.summary?.average_percentage?.toFixed?.(2) ?? Number(selectedPerformanceDetail.summary?.average_percentage ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="bg-light rounded-3 p-3 h-100">
                        <div className="text-muted text-uppercase small fw-semibold">Pass Rate</div>
                        <div className="h4 mb-0 text-success fw-bold">
                          {performanceInsightsData?.analytics?.find((item) => item.label === 'Pass rate')?.value || '—'}
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {selectedPerformanceDetail.summary?.category_summary?.length > 0 && (
                    <div className="mt-4">
                      <h6 className="mb-3">Category Averages</h6>
                      <Table bordered size="sm" className="align-middle mb-0">
                        <thead className="table-light text-muted text-uppercase small">
                          <tr>
                            <th>Category</th>
                            <th>Questions</th>
                            <th>Avg Rating</th>
                            <th style={{ width: '200px' }}>Avg %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPerformanceDetail.summary.category_summary.map((category) => {
                            const categoryPercent = Number(category.average_percentage ?? 0);
                            const categoryRating = Number(category.average_rating ?? 0);
                            const barVariant =
                              categoryPercent >= 90 ? 'success' : categoryPercent >= 75 ? 'warning' : 'danger';
                            const label =
                              categoryPercent >= 90 ? 'Excellent' : categoryPercent >= 75 ? 'Strong' : 'Needs support';
                            return (
                              <tr key={category.category}>
                                <td>{category.category}</td>
                                <td className="text-center">{category.question_count}</td>
                                <td className="text-end">{categoryRating.toFixed(2)}</td>
                                <td>
                                  <div className="d-flex flex-column">
                                    <div className="d-flex justify-content-between">
                                      <span className="fw-semibold">{categoryPercent.toFixed(1)}%</span>
                                      <span className="text-muted small">{label}</span>
                                    </div>
                                    <ProgressBar
                                      variant={barVariant}
                                      now={Math.min(100, Math.max(0, categoryPercent))}
                                      className="mt-2"
                                      style={{ height: '6px' }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {performanceInsightsData && (
                <Row className="mb-4 g-3">
                  <Col md={6}>
                    <div className="border-0 shadow-sm h-100 rounded-4 p-4 bg-white">
                      <div className="d-flex align-items-center mb-3">
                        <span className="badge rounded-circle bg-primary text-white fw-bold me-2" style={{ width: '36px', height: '36px' }}>
                          A
                        </span>
                        <h6 className="mb-0 text-primary text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>
                          Performance Analytics
                        </h6>
                      </div>
                      <ul className="list-unstyled mb-0">
                        {performanceInsightsData.analytics.map((item, idx) => (
                          <li key={`analytics-${idx}`} className="mb-3">
                            <div className="fw-semibold text-dark">{item.label}</div>
                            <div className="text-muted small">{item.value}</div>
                            {idx < performanceInsightsData.analytics.length - 1 && <hr className="my-2" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="border-0 shadow-sm h-100 rounded-4 p-4 bg-white">
                      <div className="d-flex align-items-center mb-3">
                        <span className="badge rounded-circle bg-success text-white fw-bold me-2" style={{ width: '36px', height: '36px' }}>
                          R
                        </span>
                        <h6 className="mb-0 text-success text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>
                          Recommendations
                        </h6>
                      </div>
                      <ul className="mb-0 ps-3">
                        {performanceInsightsData.recommendations.map((rec, idx) => (
                          <li key={`recommendation-${idx}`} className="text-muted mb-2 d-flex">
                            <FaCheckCircle className="text-success me-2 mt-1" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Col>
                </Row>
              )}

              {selectedPerformanceDetail.evaluations?.map((evaluation) => (
                <Card key={evaluation.id} className="mb-3 border-0 shadow-sm">
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-0">
                          {evaluation.form_title || 'Performance Evaluation'}
                        </h6>
                        <small className="text-muted">
                          Period:{' '}
                          {new Date(evaluation.evaluation_period_start).toLocaleDateString()} -
                          {new Date(evaluation.evaluation_period_end).toLocaleDateString()}
                        </small>
                      </div>
                      <div className="text-end">
                        <div className="h6 mb-0 text-primary">
                          {evaluation.percentage_score}% overall
                        </div>
                        <small className="text-muted">
                          Total Score: {evaluation.total_score} | Average Rating:{' '}
                          {evaluation.average_score}
                        </small>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {evaluation.categories?.length > 0 && (
                      <div className="mb-3">
                        <h6 className="mb-2">Category Breakdown</h6>
                        <Table bordered size="sm" className="align-middle">
                          <thead className="table-light text-muted text-uppercase small">
                            <tr>
                              <th>Category</th>
                              <th>Questions</th>
                              <th>Avg Rating</th>
                              <th style={{ width: '180px' }}>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evaluation.categories.map((category) => {
                              const categoryPercent = Number(category.percentage ?? 0);
                              const barVariant =
                                categoryPercent >= 90 ? 'success' : categoryPercent >= 75 ? 'warning' : 'danger';
                              return (
                                <tr key={category.category}>
                                  <td>{category.category}</td>
                                  <td className="text-center">{category.question_count}</td>
                                  <td className="text-end">
                                    {Number(category.average_rating ?? 0).toFixed(2)}
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <div className="d-flex justify-content-between">
                                        <span className="fw-semibold">{categoryPercent.toFixed(1)}%</span>
                                        <span className="text-muted small">
                                          {categoryPercent >= 90 ? 'Excellent' : categoryPercent >= 75 ? 'Good' : 'Watch'}
                                        </span>
                                      </div>
                                      <ProgressBar
                                        variant={barVariant}
                                        now={Math.min(100, Math.max(0, categoryPercent))}
                                        className="mt-1"
                                        style={{ height: '6px' }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    )}

                    {evaluation.questions?.length > 0 && (
                      <div>
                        <h6 className="mb-2">Question Scores</h6>
                        <Table bordered size="sm" responsive className="align-middle">
                          <thead className="table-light text-muted text-uppercase small">
                            <tr>
                              <th style={{ width: '45%' }}>Question</th>
                              <th style={{ width: '20%' }}>Category</th>
                              <th style={{ width: '15%' }}>Rating</th>
                              <th style={{ width: '15%' }}>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evaluation.questions.map((question) => (
                              (() => {
                                const questionPercent = Number(question.percentage ?? 0);
                                const barVariant =
                                  questionPercent >= 90 ? 'success' : questionPercent >= 75 ? 'warning' : 'danger';
                                return (
                                  <tr key={`${evaluation.id}-${question.question_id}`}>
                                    <td>{question.question}</td>
                                    <td>{question.category}</td>
                                    <td className="text-end">
                                      {question.rating}/{question.max_rating}
                                    </td>
                                    <td>
                                      {question.percentage !== null ? (
                                        <div className="d-flex flex-column" style={{ minWidth: '150px' }}>
                                          <div className="d-flex justify-content-between">
                                            <span className="fw-semibold">{questionPercent.toFixed(1)}%</span>
                                          </div>
                                          <ProgressBar
                                            variant={barVariant}
                                            now={Math.min(100, Math.max(0, questionPercent))}
                                            className="mt-1"
                                            style={{ height: '6px' }}
                                          />
                                        </div>
                                      ) : (
                                        'N/A'
                                      )}
                                    </td>
                                  </tr>
                                );
                              })()
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center text-muted py-4">
              No performance details available for the selected employee.
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ReportGeneration;
