import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, ProgressBar, Form, Button, Badge, Dropdown, Spinner, Alert, Modal, Tab, Tabs } from 'react-bootstrap';
import { 
  FaExclamationTriangle, 
  FaUserCheck, 
  FaUserTimes, 
  FaFilter, 
  FaDownload, 
  FaInfoCircle, 
  FaFilePdf, 
  FaFileExcel,
  FaClock,
  FaChartLine,
  FaExclamationCircle,
  FaLightbulb,
  FaCheckCircle,
  FaBullseye,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import axios from '../../../axios';

const PredictiveTurnoverAnalytics = () => {
  const [timeframe, setTimeframe] = useState('3months');
  const [department, setDepartment] = useState('all');
  const [riskLevel, setRiskLevel] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const timeframeLabels = {
    '1month': 'Last 30 Days',
    '3months': 'Last 3 Months',
    '6months': 'Last 6 Months',
    '1year': 'Last Year',
    'custom': 'Custom Range'
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCurrentRangeLabel = () => {
    if (dateRange.start && dateRange.end) {
      return `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(dateRange.end)}`;
    }
    return timeframeLabels[timeframe] || 'Selected period';
  };

  const handleTimeframeChange = (value) => {
    setTimeframe(value);
    if (value !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);
    if (timeframe !== 'custom') {
      setTimeframe('custom');
    }
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    if (timeframe !== 'custom') {
      setTimeframe('custom');
    }
  };

  const handleResetFilters = () => {
    setTimeframe('3months');
    setDepartment('all');
    setRiskLevel('all');
    setStartDate('');
    setEndDate('');
    setError('');
  };

  // Fetch data from API
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, department, startDate, endDate]);

  const fetchAnalytics = async () => {
    if (timeframe === 'custom') {
      if (!startDate || !endDate) {
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        setError('Start date cannot be after end date.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const params = {
          timeframe,
          department
      };

      if (timeframe === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        }

      const response = await axios.get('/predictive-analytics', { params });

      if (response.data.success) {
        setEmployees(response.data.data || []);
        setSummary(response.data.summary || {
          totalEmployees: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0
        });
        setDateRange(response.data.dateRange || { start: '', end: '' });
      } else {
        setError(response.data.message || 'Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on risk level filter
  const filteredEmployees = employees.filter(emp => {
    return (riskLevel === 'all' || emp.riskLevel === riskLevel);
  });

  // Calculate summary statistics from filtered data
  const totalEmployees = summary.totalEmployees;
  const highRiskCount = summary.highRisk;
  const mediumRiskCount = summary.mediumRisk;
  const lowRiskCount = summary.lowRisk;

  // Handle export
  const getExportLabel = () => {
    if (dateRange.start && dateRange.end) {
      return `${dateRange.start} to ${dateRange.end}`;
    }
    if (timeframe === 'custom' && startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }
    return timeframeLabels[timeframe] || timeframe;
  };

  const handleExport = (format) => {
    // In a real app, this would generate and download the report
    alert(`Exporting ${format} report for ${getExportLabel()} timeframe`);
  };

  const formatMetric = (value, decimals = 1) => {
    const numericValue = Number(value ?? 0);
    if (Number.isNaN(numericValue)) {
      return '0';
    }
    const fixed = numericValue.toFixed(decimals);
    return Number(fixed).toString();
  };

  const formatChange = (value, decimals = 1) => {
    const numericValue = Number(value ?? 0);
    if (Number.isNaN(numericValue) || numericValue === 0) {
      return '0';
    }
    const magnitude = formatMetric(Math.abs(numericValue), decimals);
    return `${numericValue >= 0 ? '+' : '-'}${magnitude}`;
  };

  const getPerformanceVariant = (rating) => {
    if (rating >= 8) {
      return 'success';
    }
    if (rating >= 7) {
      return 'warning';
    }
    return 'danger';
  };

  const getAttendanceInterpretation = (employee) => {
    if (!employee || !employee.attendanceMetrics) {
      return [];
    }

    const metrics = employee.attendanceMetrics;
    const attendanceRate = Number(employee.attendanceRate ?? metrics.attendanceRate ?? 0);
    const lateRate = Number(metrics.lateRate ?? 0);
    const absentRate = Number(metrics.absentRate ?? 0);
    const presentDays = Number(metrics.presentCount ?? 0);
    const onTimeDays = Number(metrics.purePresentCount ?? 0);
    const onTimeRatio = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0;
    const lateTrend = Number(metrics.lateTrend ?? 0);
    const absentTrend = Number(metrics.absentTrend ?? 0);

    const insights = [];

    if (attendanceRate >= 95) {
      insights.push({
        tone: 'positive',
        title: 'Attendance is steady',
        description: `Attendance rate is ${formatMetric(attendanceRate)}%. This stays above the 95% target.`
      });
    } else if (attendanceRate >= 85) {
      insights.push({
        tone: 'warning',
        title: 'Attendance needs support',
        description: `Attendance rate is ${formatMetric(attendanceRate)}%. It is slightly under the goal. Please check in with the employee.`
      });
    } else {
      insights.push({
        tone: 'negative',
        title: 'Attendance needs action',
        description: `Attendance rate is ${formatMetric(attendanceRate)}%. This means the employee is missing work almost one day each week, so please schedule a support meeting soon.`
      });
    }

    if (lateRate > 20) {
      insights.push({
        tone: 'negative',
        title: 'Late arrivals are very high',
        description: `Late rate is ${formatMetric(lateRate)}%. Our policy flag is 20% because teams report performance drops when lateness reaches one in five shifts. This level shows frequent late starts, so discuss punctuality immediately.`
      });
    } else if (lateRate > 10) {
      insights.push({
        tone: 'warning',
        title: 'Late arrivals rising',
        description: `Late rate is ${formatMetric(lateRate)}%. Remind the employee about start times.`
      });
    } else if (lateRate > 0) {
      insights.push({
        tone: 'positive',
        title: 'Late arrivals under control',
        description: `Late rate stays at ${formatMetric(lateRate)}%. Keep the current reminders working.`
      });
    }

    if (absentRate > 15) {
      insights.push({
        tone: 'negative',
        title: 'Absences are very high',
        description: `Absent rate is ${formatMetric(absentRate)}%. We mark 15% as critical because that equals almost one missed day each week on a six-day schedule. Please check on health or personal needs.`
      });
    } else if (absentRate > 8) {
      insights.push({
        tone: 'warning',
        title: 'Absences increasing',
        description: `Absent rate is ${formatMetric(absentRate)}%. Watch the schedule and offer support when needed.`
      });
    } else if (absentRate >= 0) {
      insights.push({
        tone: 'positive',
        title: 'Absences stay low',
        description: `Absent rate is ${formatMetric(absentRate)}%. Attendance days are steady.`
      });
    }

    if (presentDays > 0 && onTimeRatio < 60) {
      insights.push({
        tone: 'negative',
        title: 'On-time days are very low',
        description: `Only ${formatMetric(onTimeRatio)}% of present days were on time (${onTimeDays} of ${presentDays}). Create a punctuality plan.`
      });
    } else if (presentDays > 0 && onTimeRatio < 85) {
      insights.push({
        tone: 'warning',
        title: 'On-time days can improve',
        description: `${formatMetric(onTimeRatio)}% of present days were on time (${onTimeDays} of ${presentDays}). Give a quick reminder about start times.`
      });
    } else if (presentDays > 0) {
      insights.push({
        tone: 'positive',
        title: 'On-time days look strong',
        description: `${formatMetric(onTimeRatio)}% of present days were on time (${onTimeDays} of ${presentDays}).`
      });
    }

    const describeTrendChange = (type, isIncrease) => {
      const label = type === 'late' ? 'late arrivals' : 'absences';
      const firstRateKey = type === 'late' ? 'firstHalfLateRate' : 'firstHalfAbsentRate';
      const secondRateKey = type === 'late' ? 'secondHalfLateRate' : 'secondHalfAbsentRate';
      const firstCountKey = type === 'late' ? 'firstHalfLateCount' : 'firstHalfAbsentCount';
      const secondCountKey = type === 'late' ? 'secondHalfLateCount' : 'secondHalfAbsentCount';

      const firstRate = metrics[firstRateKey];
      const secondRate = metrics[secondRateKey];
      const firstCount = metrics[firstCountKey];
      const secondCount = metrics[secondCountKey];

      const hasDetailedData = [firstRate, secondRate, firstCount, secondCount].every(val => typeof val === 'number');
      const trendValue = type === 'late' ? lateTrend : absentTrend;

      if (!hasDetailedData) {
        return `${label} ${isIncrease ? 'went up' : 'went down'} by ${formatMetric(Math.abs(trendValue))}%`;
      }

      if (isIncrease) {
        if (firstCount === 0 && secondCount > 0) {
          return `${label} moved from 0 days to ${formatMetric(secondCount, 0)} days (0% → ${formatMetric(secondRate)}%).`;
        }
        if (firstCount === 0) {
          return `${label} increased to ${formatMetric(secondRate)}%.`;
        }
        const change = firstRate > 0 ? ((secondRate - firstRate) / firstRate) * 100 : null;
        const changeText = change !== null ? `${formatChange(change)}%` : 'increase';
        return `${label} went from ${formatMetric(firstRate)}% to ${formatMetric(secondRate)}%${change !== null ? ` (${changeText})` : ''}.`;
      }

      if (firstCount > 0 && secondCount === 0) {
        return `${label} went from ${formatMetric(firstCount, 0)} days to 0 days (${formatMetric(firstRate)}% → 0%).`;
      }
      if (firstCount === 0) {
        return `${label} stayed at 0 days.`;
      }
      const change = firstRate > 0 ? ((secondRate - firstRate) / firstRate) * 100 : null;
      const changeText = change !== null ? `${formatChange(change)}%` : 'change';
      return `${label} went from ${formatMetric(firstRate)}% to ${formatMetric(secondRate)}%${change !== null ? ` (${changeText})` : ''}.`;
    };

    const worseningParts = [];
    if (lateTrend > 0) {
      worseningParts.push(describeTrendChange('late', true));
    }
    if (absentTrend > 0) {
      worseningParts.push(describeTrendChange('absent', true));
    }
    if (worseningParts.length) {
      insights.push({
        tone: 'warning',
        title: 'Recent trend getting worse',
        description: `In the latest period, ${worseningParts.join(' and ')}. Act now to stop the rise.`
      });
    }

    const improvingParts = [];
    if (lateTrend < 0) {
      improvingParts.push(describeTrendChange('late', false));
    }
    if (absentTrend < 0) {
      improvingParts.push(describeTrendChange('absent', false));
    }
    if (improvingParts.length) {
      insights.push({
        tone: 'positive',
        title: 'Recent trend improving',
        description: `Compared with the last period, ${improvingParts.join(' and ')}. Keep doing what worked.`
      });
    }

    if (!insights.length) {
      insights.push({
        tone: 'positive',
        title: 'Attendance looks steady',
        description: 'All numbers stay in the healthy range for this period.'
      });
    }

    return insights;
  };

  const getAttendanceTrendMessages = (employee) => {
    if (!employee?.attendanceMetrics) {
      return [];
    }

    const metrics = employee.attendanceMetrics;
    const messages = [];

    const buildTrendMessage = (type, label) => {
      const firstRateKey = type === 'late' ? 'firstHalfLateRate' : 'firstHalfAbsentRate';
      const secondRateKey = type === 'late' ? 'secondHalfLateRate' : 'secondHalfAbsentRate';
      const firstCountKey = type === 'late' ? 'firstHalfLateCount' : 'firstHalfAbsentCount';
      const secondCountKey = type === 'late' ? 'secondHalfLateCount' : 'secondHalfAbsentCount';
      const trendKey = type === 'late' ? 'lateTrend' : 'absentTrend';

      const firstRate = typeof metrics[firstRateKey] === 'number' ? metrics[firstRateKey] : null;
      const secondRate = typeof metrics[secondRateKey] === 'number' ? metrics[secondRateKey] : null;
      const firstCount = typeof metrics[firstCountKey] === 'number' ? metrics[firstCountKey] : null;
      const secondCount = typeof metrics[secondCountKey] === 'number' ? metrics[secondCountKey] : null;
      const trendValue = typeof metrics[trendKey] === 'number' ? metrics[trendKey] : 0;

      const increaseTone = type === 'late' ? 'warning' : 'danger';
      const decreaseTone = 'success';

      const hasDetailedData = [firstRate, secondRate, firstCount, secondCount].every(val => val !== null);

      if (!hasDetailedData) {
        if (trendValue > 0) {
          messages.push({
            tone: increaseTone,
            Icon: FaExclamationTriangle,
            text: `${label} increased by ${formatMetric(trendValue)}%.`
          });
        } else if (trendValue < 0) {
          messages.push({
            tone: decreaseTone,
            Icon: FaUserCheck,
            text: `${label} decreased by ${formatMetric(Math.abs(trendValue))}%.`
          });
        }
        return;
      }

      const countDiff = (secondCount ?? 0) - (firstCount ?? 0);
      const rateDiff = (secondRate ?? 0) - (firstRate ?? 0);

      if ((firstCount ?? 0) === 0 && (secondCount ?? 0) === 0) {
        return;
      }

      if ((firstCount ?? 0) === 0 && (secondCount ?? 0) > 0) {
        messages.push({
          tone: increaseTone,
          Icon: FaExclamationTriangle,
          text: `${label} went from 0 days to ${formatMetric(secondCount, 0)} days (0% → ${formatMetric(secondRate)}%).`
        });
        return;
      }

      if ((firstCount ?? 0) > 0 && (secondCount ?? 0) === 0) {
        messages.push({
          tone: decreaseTone,
          Icon: FaUserCheck,
          text: `${label} dropped from ${formatMetric(firstCount, 0)} days to 0 days (${formatMetric(firstRate)}% → 0%).`
        });
        return;
      }

      const percentChange = (firstRate ?? 0) > 0
        ? ((secondRate - firstRate) / firstRate) * 100
        : null;

      if (percentChange !== null && percentChange > 0.5) {
        messages.push({
          tone: increaseTone,
          Icon: FaExclamationTriangle,
          text: `${label} rose from ${formatMetric(firstCount, 0)} days to ${formatMetric(secondCount, 0)} days (${formatMetric(firstRate)}% → ${formatMetric(secondRate)}%, ${formatChange(percentChange)}%).`
        });
        return;
      }

      if (percentChange !== null && percentChange < -0.5) {
        messages.push({
          tone: decreaseTone,
          Icon: FaUserCheck,
          text: `${label} fell from ${formatMetric(firstCount, 0)} days to ${formatMetric(secondCount, 0)} days (${formatMetric(firstRate)}% → ${formatMetric(secondRate)}%, ${formatChange(percentChange)}%).`
        });
        return;
      }

      if (countDiff > 0 || rateDiff > 0.5) {
        messages.push({
          tone: increaseTone,
          Icon: FaExclamationTriangle,
          text: `${label} rose from ${formatMetric(firstCount, 0)} days to ${formatMetric(secondCount, 0)} days (${formatMetric(firstRate)}% → ${formatMetric(secondRate)}%).`
        });
        return;
      }

      if (countDiff < 0 || rateDiff < -0.5) {
        messages.push({
          tone: decreaseTone,
          Icon: FaUserCheck,
          text: `${label} fell from ${formatMetric(firstCount, 0)} days to ${formatMetric(secondCount, 0)} days (${formatMetric(firstRate)}% → ${formatMetric(secondRate)}%).`
        });
      }
    };

    buildTrendMessage('late', 'Late arrivals');
    buildTrendMessage('absent', 'Absences');

    return messages;
  };

  // Get unique departments for filter dropdown
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort();

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const levelPriority = { high: 0, medium: 1, low: 2 };
    const levelA = levelPriority[a.riskLevel] ?? 3;
    const levelB = levelPriority[b.riskLevel] ?? 3;
    if (levelA !== levelB) {
      return levelA - levelB;
    }
    return (b.riskScore || 0) - (a.riskScore || 0);
  });

  const attendanceInsights = getAttendanceInterpretation(selectedEmployee);
  const attendanceTrendMessages = getAttendanceTrendMessages(selectedEmployee);
  const evaluationMetrics = selectedEmployee?.evaluationMetrics || {};
  const categoryBreakdown = evaluationMetrics.categoryBreakdown || [];
  const strengthCategories = evaluationMetrics.strengthCategories || [];
  const focusCategories = evaluationMetrics.focusCategories || [];
  const strengthHighlights = evaluationMetrics.strengthHighlights || [];
  const attentionHighlights = evaluationMetrics.attentionHighlights || [];
  const scoreHistory = evaluationMetrics.scoreHistory || [];
  const latestPerformanceSummary = evaluationMetrics.latestSummary || null;
  const categoryComparisons = evaluationMetrics.categoryComparisons || [];
  const improvedCategories = evaluationMetrics.improvedCategories || [];
  const declinedCategories = evaluationMetrics.declinedCategories || [];
  const performanceInsights = evaluationMetrics.performanceInsights || [];
  const riskInsights = selectedEmployee?.riskInsights || [];
  const riskBreakdown = selectedEmployee?.riskBreakdown || {};
  const riskComponents = riskBreakdown.components || {};
  const attendanceBreakdown = riskComponents.attendance || null;
  const performanceBreakdown = riskComponents.performance || null;
  const factorsBreakdown = riskComponents.factors || riskComponents.riskFactors || null;
  const riskComponentDefinitions = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'performance', label: 'Performance' },
    { key: 'factors', label: 'Risk Factors' },
  ];
  const totalRiskRaw = riskComponentDefinitions.reduce((sum, { key }) => {
    const component = riskComponents[key];
    return sum + (component?.raw || 0);
  }, 0);
  const attendanceRawValue = attendanceBreakdown?.raw ?? null;
  const attendanceWeightValue = attendanceBreakdown?.weight ?? null;
  const attendanceWeightedValue = attendanceBreakdown?.weighted ?? null;
  const performanceRawValue = performanceBreakdown?.raw ?? null;
  const performanceWeightValue = performanceBreakdown?.weight ?? null;
  const performanceWeightedValue = performanceBreakdown?.weighted ?? null;
  const factorsRawValue = factorsBreakdown?.raw ?? null;
  const factorsWeightValue = factorsBreakdown?.weight ?? null;
  const factorsWeightedValue = factorsBreakdown?.weighted ?? null;
  const averagePerformanceRating = typeof evaluationMetrics.averageRating === 'number'
    ? evaluationMetrics.averageRating
    : (typeof evaluationMetrics.averageScore === 'number'
        ? evaluationMetrics.averageScore / 10
        : (typeof selectedEmployee?.performanceScore === 'number' ? selectedEmployee.performanceScore / 10 : 0));
  const averagePerformancePercent = Math.min(Math.max(averagePerformanceRating * 10, 0), 100);
  const performanceTrendValue = typeof evaluationMetrics.performanceTrend === 'number'
    ? evaluationMetrics.performanceTrend
    : 0;

const tabStyles = `
.risk-tabs .nav-tabs {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 0.5rem;
  border-bottom: none;
  padding-bottom: 0.25rem;
}
.risk-tabs .nav-tabs::-webkit-scrollbar {
  height: 6px;
}
.risk-tabs .nav-tabs::-webkit-scrollbar-thumb {
  background-color: rgba(78, 115, 223, 0.35);
  border-radius: 3px;
}
.risk-tabs .nav-tabs .nav-item {
  flex: 1 1 auto;
}
.risk-tabs .nav-tabs .nav-link {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  text-align: center;
  padding: 0.5rem 0.75rem;
  white-space: nowrap;
}
.risk-tabs .nav-tabs .nav-link.active {
  background: linear-gradient(45deg, #4e73df, #224abe);
  color: #fff;
  border-color: #4e73df;
}
`;

  return (
    <>
      <style>{tabStyles}</style>
      <div className="p-4">
        <h2 className="mb-4">Predictive Turnover Analytics</h2>
        
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading analytics data...</p>
          </div>
        )}
        
        {!loading && (
        <>
      
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
                  onChange={(e) => handleTimeframeChange(e.target.value)}
                >
                  <option value="1month">Last 30 Days</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Form.Select>
                {timeframe === 'custom' && (
                  <Row className="mt-2 g-2">
                    <Col xs={12} md={6}>
                      <Form.Label className="small text-muted mb-1">Start Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={startDate}
                        max={endDate || ''}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small text-muted mb-1">End Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={endDate}
                        min={startDate || ''}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                      />
                    </Col>
                  </Row>
                )}
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
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
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
              onClick={handleResetFilters}
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
              <div className="small text-muted">
                Period: {getCurrentRangeLabel()}
              </div>
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
                {sortedEmployees.length > 0 ? (
                  sortedEmployees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <div className="avatar-sm bg-light rounded-circle">
                              <span className="avatar-title bg-soft-primary text-primary fw-semibold">
                                {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h6 className="mb-0">{employee.name}</h6>
                            <small className="text-muted">ID: {employee.employeeId || employee.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>{employee.department}</td>
                      <td>{employee.position}</td>
                      <td>
                        {employee.tenure || 0} months
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
                        <div className="fw-semibold text-nowrap">{employee.riskScore}%</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-nowrap">{employee.attendanceRate}%</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-nowrap">{employee.performanceScore}%</div>
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
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDetailsModal(true);
                          }}
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
              Showing {sortedEmployees.length} of {employees.length} employees
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
      </>
        )}

        {/* Employee Details Modal */}
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
          <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <Modal.Title>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                    <FaInfoCircle className="text-primary" size={20} />
                  </div>
                </div>
                <div>
                  <h5 className="mb-0">{selectedEmployee?.name || 'Employee Details'}</h5>
                  <small className="text-muted">Employee ID: {selectedEmployee?.employeeId || selectedEmployee?.id}</small>
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '24px' }}>
            {selectedEmployee && (
              <>
                {/* Risk Overview */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Risk Overview</h6>
                      <Badge bg={selectedEmployee.riskLevel === 'high' ? 'danger' : selectedEmployee.riskLevel === 'medium' ? 'warning' : 'success'}>
                        {selectedEmployee.riskLevel === 'high' ? 'High Risk' : selectedEmployee.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Risk Score</span>
                        <span className="fw-bold">{selectedEmployee.riskScore}%</span>
                      </div>
                      <ProgressBar 
                        variant={selectedEmployee.riskLevel === 'high' ? 'danger' : selectedEmployee.riskLevel === 'medium' ? 'warning' : 'success'}
                        now={selectedEmployee.riskScore} 
                        style={{ height: '8px' }} 
                      />
                    </div>
                    <Row className="mt-3">
                      <Col md={6}>
                        <div className="text-muted small">Department</div>
                        <div className="fw-semibold">{selectedEmployee.department}</div>
                      </Col>
                      <Col md={6}>
                        <div className="text-muted small">Position</div>
                        <div className="fw-semibold">{selectedEmployee.position}</div>
                      </Col>
                      <Col md={6} className="mt-2">
                        <div className="text-muted small">Tenure</div>
                        <div className="fw-semibold">{selectedEmployee.tenure || 0} months</div>
                      </Col>
                      <Col md={6} className="mt-2">
                        <div className="text-muted small">Hire Date</div>
                        <div className="fw-semibold">{selectedEmployee.hireDate || 'N/A'}</div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <div className="risk-tabs">
                <Tabs defaultActiveKey="overview" className="mb-3">
                  {/* Overview Tab */}
                  <Tab eventKey="overview" title={
                    <span>
                      <FaInfoCircle className="me-1" /> Overview
                    </span>
                  }>
                    <Card className="border-0 shadow-sm mt-3">
                      <Card.Body>
                        <h6 className="mb-3">How We Calculate Risk</h6>

                        <div className="overview-header border rounded overflow-hidden mb-3">
                          <div className="header-bar px-3 py-2 text-white">
                            Risk Calculation Cheatsheet
                          </div>
                          <div className="px-3 py-3">
                            <div className="d-flex align-items-center mb-2">
                              <span className="badge bg-primary-subtle text-primary fw-semibold me-2 px-3 py-2">Weights</span>
                              <span className="text-muted small">Attendance 40% &nbsp;• Performance 40% &nbsp;• Risk factors 20%</span>
                            </div>
                            <div className="callout callout-info mb-0">
                              <div className="fw-semibold">Formula</div>
                              <div className="small">
                                Final risk = (attendance raw × 0.40) + (performance raw × 0.40) + (risk flags × 5 × 0.20)
                              </div>
                              <div className="small mb-0">
                                {attendanceRawValue !== null && attendanceWeightValue !== null
                                  ? (
                                    <>
                                      Current employee: attendance raw {formatMetric(attendanceRawValue, 1)} × {formatMetric(attendanceWeightValue, 2)} = <span className="fw-semibold text-primary">{formatMetric(attendanceWeightedValue || 0, 1)} pts</span>.
                                    </>
                                  )
                                  : 'Example: attendance raw 64 × 0.40 = 25.6 pts.'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Row className="gy-3">
                          <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm overview-card">
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <span className="indicator-dot bg-primary me-2"></span>
                                  <h6 className="mb-0 text-primary">Attendance</h6>
                                </div>
                                <p className="text-muted small mb-2">
                                  Converts attendance metrics to a 0–100 penalty, then multiplies by 40%.
                                </p>
                                <ul className="text-muted small mb-3 ps-3">
                                  <li><span className="fw-semibold">Attendance rate gap:</span> (100 − attendance%) × 0.3</li>
                                  <li><span className="fw-semibold">Late frequency:</span> late% × 2 (cap 30)</li>
                                  <li><span className="fw-semibold">Absence frequency:</span> absence% × 3 (cap 30)</li>
                                  <li><span className="fw-semibold">Trend penalties:</span> lateTrend × 0.5 and absentTrend × 0.5 (each cap 10)</li>
                                </ul>
                                {attendanceBreakdown ? (
                                  <div className="callout callout-primary">
                                    <div className="small text-muted mb-1">Current employee</div>
                                    <div className="small mb-2">
                                      {attendanceBreakdown.items.map((item, idx) => (
                                        <div key={`attendance-example-${idx}`}>
                                          {item.label}: {formatMetric(item.raw || 0, 1)} raw → {formatMetric(item.weighted || 0, 1)} weighted
                                        </div>
                                      ))}
                                    </div>
                                    <div className="small mb-0">
                                      Total raw = <strong>{formatMetric(attendanceRawValue || 0, 1)}</strong> &nbsp;|&nbsp; Weighted = <span className="fw-semibold text-primary">{formatMetric(attendanceWeightedValue || 0, 1)} pts</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="callout callout-primary">
                                    <div className="small text-muted mb-1">Example</div>
                                    <div className="small mb-0">
                                      (100 − 91) × 0.3 = 2.7 pts, 18% late × 2 = 30 pts, 9% absent × 3 = 27 pts, trend +10% × 0.5 = 5 pts → total raw 64.7, weighted 25.9 pts.
                                    </div>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm overview-card">
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <span className="indicator-dot bg-warning me-2"></span>
                                  <h6 className="mb-0 text-warning">Performance</h6>
                                </div>
                                <p className="text-muted small mb-2">
                                  Measures the gap from perfect performance plus declines and stale reviews, then multiplies by 40%.
                                </p>
                                <ul className="text-muted small mb-3 ps-3">
                                  <li><span className="fw-semibold">Score gap:</span> max(100 − averageScore, 0)</li>
                                  <li><span className="fw-semibold">Trend decline:</span> max(−performanceTrend, 0) × 2 (cap 20)</li>
                                  <li><span className="fw-semibold">Recency:</span> no evaluation = +15; last &gt; 180 days = +10</li>
                                </ul>
                                {performanceBreakdown ? (
                                  <div className="callout callout-warning">
                                    <div className="small text-muted mb-1">Current employee</div>
                                    <div className="small mb-2">
                                      {performanceBreakdown.items.map((item, idx) => (
                                        <div key={`performance-example-${idx}`}>
                                          {item.label}: {formatMetric(item.raw || 0, 1)} raw → {formatMetric(item.weighted || 0, 1)} weighted
                                        </div>
                                      ))}
                                    </div>
                                    <div className="small mb-0">
                                      Total raw = <strong>{formatMetric(performanceRawValue || 0, 1)}</strong> &nbsp;|&nbsp; Weighted = <span className="fw-semibold text-warning">{formatMetric(performanceWeightedValue || 0, 1)} pts</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="callout callout-warning">
                                    <div className="small text-muted mb-1">Example</div>
                                    <div className="small mb-0">
                                      Average score 84% = 16 pts, trend −5% = 10 pts, last evaluation 200 days ago = 10 pts → total raw 36, weighted 14.4 pts.
                                    </div>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm overview-card">
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <span className="indicator-dot bg-danger me-2"></span>
                                  <h6 className="mb-0 text-danger">Risk Factors</h6>
                                </div>
                                <p className="text-muted small mb-2">
                                  Every active flag adds 5 raw points (capped 100); the total is multiplied by 20%.
                                </p>
                                <ul className="text-muted small mb-3 ps-3">
                                  <li>Common flags: frequent late arrivals, rapid absence growth, no evaluation in last 6 months.</li>
                                  <li>Flags listed in the Risk Factors tab correspond to these penalties.</li>
                                </ul>
                                {factorsBreakdown ? (
                                  <div className="callout callout-danger">
                                    <div className="small text-muted mb-1">Current employee</div>
                                    <div className="small mb-2">
                                      {factorsBreakdown.items && factorsBreakdown.items.length > 0 ? (
                                        factorsBreakdown.items.map((item, idx) => (
                                          <div key={`factors-example-${idx}`}>
                                            {item.label}: {formatMetric(item.raw || 0, 1)} raw → {formatMetric(item.weighted || 0, 1)} weighted
                                          </div>
                                        ))
                                      ) : (
                                        <div>No active risk flags.</div>
                                      )}
                                    </div>
                                    <div className="small mb-0">
                                      Total raw = <strong>{formatMetric(factorsRawValue || 0, 1)}</strong> &nbsp;|&nbsp; Weighted = <span className="fw-semibold text-danger">{formatMetric(factorsWeightedValue || 0, 1)} pts</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="callout callout-danger">
                                    <div className="small text-muted mb-1">Example</div>
                                    <div className="small mb-0">
                                      2 flags × 5 = 10 raw, weighted = 2 pts (0.20 weight). 3 flags → 15 raw → 3 weighted.
                                    </div>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Tab>
                  {/* Attendance Tab */}
                  <Tab eventKey="attendance" title={
                    <span>
                      <FaClock className="me-1" /> Attendance
                    </span>
                  }>
                    <Card className="border-0 shadow-sm mt-3">
                      <Card.Body>
                        <h6 className="mb-3">Attendance Breakdown</h6>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Overall Attendance Rate</span>
                            <span className="fw-bold">{selectedEmployee.attendanceRate}%</span>
                          </div>
                          <ProgressBar 
                            variant={selectedEmployee.attendanceRate > 90 ? 'success' : selectedEmployee.attendanceRate > 80 ? 'warning' : 'danger'}
                            now={selectedEmployee.attendanceRate} 
                            style={{ height: '8px' }} 
                          />
                        </div>

                        {selectedEmployee.attendanceMetrics && (
                          <>
                            <Row className="mb-3">
                              <Col md={6}>
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Total Days Tracked</div>
                                  <div className="h5 mb-0">{selectedEmployee.attendanceMetrics.totalDays || 0}</div>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Working Days</div>
                                  <div className="h5 mb-0 text-info">{selectedEmployee.attendanceMetrics.workingDays || selectedEmployee.attendanceMetrics.totalDays || 0}</div>
                                  <small className="text-muted">(Excluding On Leave)</small>
                                </div>
                              </Col>
                              <Col md={6} className="mt-2">
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Present Days</div>
                                  <div className="h5 mb-0 text-success">{selectedEmployee.attendanceMetrics.presentCount || 0}</div>
                                  <small className="text-muted">(Includes: Present, Late, Overtime, Undertime)</small>
                                </div>
                              </Col>
                              <Col md={6} className="mt-2">
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">On-Time Present</div>
                                  <div className="h5 mb-0 text-success">{selectedEmployee.attendanceMetrics.purePresentCount || 0}</div>
                                  <small className="text-muted">(Perfect attendance days)</small>
                                </div>
                              </Col>
                              <Col md={6} className="mt-2">
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Absent Days</div>
                                  <div className="h5 mb-0 text-danger">{selectedEmployee.attendanceMetrics.absentCount || 0}</div>
                                </div>
                              </Col>
                              <Col md={6} className="mt-2">
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">On Leave Days</div>
                                  <div className="h5 mb-0 text-info">{selectedEmployee.attendanceMetrics.onLeaveCount || 0}</div>
                                </div>
                              </Col>
                            </Row>

                            {/* Breakdown by Status Type */}
                            <div className="mb-3">
                              <h6 className="mb-2">Status Breakdown</h6>
                              <Row>
                                <Col md={4}>
                                  <div className="p-2 bg-light rounded mb-2">
                                    <div className="text-muted small mb-1">Late Arrivals</div>
                                    <div className="fw-semibold text-warning">{selectedEmployee.attendanceMetrics.lateCount || 0}</div>
                                    <small className="text-muted">(Included in Present)</small>
                                  </div>
                                </Col>
                                <Col md={4}>
                                  <div className="p-2 bg-light rounded mb-2">
                                    <div className="text-muted small mb-1">Overtime Days</div>
                                    <div className="fw-semibold text-primary">{selectedEmployee.attendanceMetrics.overtimeCount || 0}</div>
                                    <small className="text-muted">(Included in Present)</small>
                                  </div>
                                </Col>
                                <Col md={4}>
                                  <div className="p-2 bg-light rounded mb-2">
                                    <div className="text-muted small mb-1">Undertime Days</div>
                                    <div className="fw-semibold text-warning">{selectedEmployee.attendanceMetrics.undertimeCount || 0}</div>
                                    <small className="text-muted">(Included in Present)</small>
                                  </div>
                                </Col>
                              </Row>
                            </div>

                            <div className="mb-3">
                              <h6 className="mb-2">Attendance Metrics</h6>
                              <div className="mb-2">
                                <div className="d-flex justify-content-between">
                                  <span>Late Rate</span>
                                  <span className="fw-semibold">{(selectedEmployee.attendanceMetrics.lateRate || 0).toFixed(1)}%</span>
                                </div>
                                <ProgressBar 
                                  variant={selectedEmployee.attendanceMetrics.lateRate > 20 ? 'danger' : selectedEmployee.attendanceMetrics.lateRate > 10 ? 'warning' : 'success'}
                                  now={selectedEmployee.attendanceMetrics.lateRate || 0} 
                                  style={{ height: '6px' }} 
                                />
                              </div>
                              <div className="mb-2">
                                <div className="d-flex justify-content-between">
                                  <span>Absent Rate</span>
                                  <span className="fw-semibold">{(selectedEmployee.attendanceMetrics.absentRate || 0).toFixed(1)}%</span>
                                </div>
                                <ProgressBar 
                                  variant={selectedEmployee.attendanceMetrics.absentRate > 15 ? 'danger' : selectedEmployee.attendanceMetrics.absentRate > 5 ? 'warning' : 'success'}
                                  now={selectedEmployee.attendanceMetrics.absentRate || 0} 
                                  style={{ height: '6px' }} 
                                />
                              </div>
                            </div>

                            {attendanceTrendMessages.length > 0 && (
                              <div className="alert alert-info">
                                <h6 className="alert-heading">Trends</h6>
                                {attendanceTrendMessages.map((trend, idx) => {
                                  const Icon = trend.Icon;
                                  const toneColor = trend.tone === 'danger' ? 'danger' : trend.tone === 'warning' ? 'warning' : 'success';
                                  return (
                                    <div key={idx} className="d-flex align-items-center mb-1">
                                      <Icon className={`me-2 text-${toneColor}`} />
                                      <span className="small">{trend.text}</span>
                                    </div>
                                  );
                                })}
                                  </div>
                                )}
                          </>
                        )}

                        {attendanceInsights.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-3">Interpretation of Metrics</h6>
                            {attendanceInsights.map((insight, idx) => {
                              const toneColor = insight.tone === 'negative' ? 'danger' : insight.tone === 'warning' ? 'warning' : 'success';
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded mb-2 border border-${toneColor} bg-${toneColor} bg-opacity-10`}
                                >
                                  <div className="d-flex align-items-start">
                                    <FaLightbulb className={`me-2 mt-1 text-${toneColor}`} />
                                  <div>
                                      <h6 className="mb-1">{insight.title}</h6>
                                      <p className="mb-0 small text-muted">{insight.description}</p>
                                  </div>
                                  </div>
                                </div>
                              );
                            })}
                                  </div>
                                )}

                        {attendanceBreakdown && (
                          <Card className="mt-3 border-0 shadow-sm">
                            <Card.Body>
                              <h6 className="mb-3">Attendance Risk Calculation</h6>
                              <Row className="g-2 summary-row">
                                <Col md={6}>
                                  <div className="calc-summary-card border rounded-3 bg-white text-center h-100 py-2 px-2">
                                    <div className="text-muted small text-uppercase fw-semibold mb-1">Total Raw Penalty</div>
                                    <div className="fs-2 text-primary mb-1">{formatMetric(attendanceBreakdown.raw || 0, 1)}</div>
                                    <div className="text-muted small">0 – 100 scale</div>
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="calc-summary-card border rounded-3 bg-primary-subtle text-center h-100 py-2 px-2">
                                    <div className="text-muted small text-uppercase fw-semibold mb-1">Weighted Contribution</div>
                                    <div className="fs-2 text-primary mb-1">{formatMetric(attendanceBreakdown.weighted || 0, 1)} pts</div>
                                    <div className="text-muted small mb-0">
                                      Weight ({formatMetric((attendanceBreakdown.weight || 0) * 100, 0)}%) × raw<br />
                                      {formatMetric(attendanceBreakdown.raw || 0, 1)} × {formatMetric(attendanceBreakdown.weight || 0, 2)}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                              <Table bordered size="sm" className="mt-3 mb-0 table-custom">
                                <thead className="table-light">
                                  <tr>
                                    <th>Component</th>
                                    <th style={{ width: '18%' }}>Raw</th>
                                    <th style={{ width: '18%' }}>Weighted</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attendanceBreakdown.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <div className="fw-semibold">{item.label}</div>
                                        {item.detail && <div className="text-muted small">{item.detail}</div>}
                                      </td>
                                      <td className="text-end">{formatMetric(item.raw || 0, 1)}</td>
                                      <td className="text-end">{formatMetric(item.weighted || 0, 1)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="table-light">
                                  <tr>
                                    <td className="fw-semibold text-end">Total</td>
                                    <td className="fw-semibold text-end">{formatMetric(attendanceBreakdown.raw || 0, 1)}</td>
                                    <td className="fw-semibold text-end">{formatMetric(attendanceBreakdown.weighted || 0, 1)}</td>
                                  </tr>
                                </tfoot>
                              </Table>
                              <div className="text-muted small mt-2">
                                {`Sum: ${formatMetric(attendanceBreakdown.weighted || 0, 1)} pts contributes to the final risk score.`}
                              </div>
                              {(!attendanceBreakdown.items || attendanceBreakdown.items.length === 0) && (
                                <div className="text-muted small mt-2">
                                  No attendance penalties applied during this period.
                              </div>
                            )}
                            </Card.Body>
                          </Card>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab>

                  {/* Performance Tab */}
                  <Tab eventKey="performance" title={
                    <span>
                      <FaChartLine className="me-1" /> Performance
                    </span>
                  }>
                    <Card className="border-0 shadow-sm mt-3">
                      <Card.Body>
                        <h6 className="mb-3">Performance Overview</h6>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Average Rating</span>
                            <span className="fw-bold">{formatMetric(averagePerformanceRating, 1)} / 10</span>
                          </div>
                          <ProgressBar 
                            variant={getPerformanceVariant(averagePerformanceRating)}
                            now={averagePerformancePercent} 
                            style={{ height: '8px' }} 
                          />
                        </div>

                            <Row className="mb-3">
                          <Col md={4}>
                            <div className="p-3 bg-light rounded">
                              <div className="text-muted small mb-1">Average Percentage</div>
                              <div className="h5 mb-0">{formatMetric(averagePerformancePercent, 1)}%</div>
                            </div>
                          </Col>
                          <Col md={4}>
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Last Evaluation</div>
                                  <div className="fw-semibold">
                                {evaluationMetrics.lastEvaluationDate 
                                  ? formatDisplayDate(evaluationMetrics.lastEvaluationDate)
                                  : 'No evaluation recorded'}
                                  </div>
                                </div>
                              </Col>
                          <Col md={4}>
                                <div className="p-3 bg-light rounded">
                                  <div className="text-muted small mb-1">Total Evaluations</div>
                              <div className="fw-semibold">{evaluationMetrics.evaluationCount || 0}</div>
                                </div>
                              </Col>
                            </Row>

                        {performanceTrendValue !== 0 && (
                          <div className={`alert ${performanceTrendValue > 0 ? 'alert-success' : 'alert-warning'}`}>
                                <h6 className="alert-heading">Performance Trend</h6>
                            {performanceTrendValue > 0 ? (
                                  <div>
                                <FaArrowUp className="me-1" />
                                Performance improved by <strong>{formatMetric(Math.abs(performanceTrendValue))}%</strong>
                                  </div>
                                ) : (
                                  <div>
                                <FaArrowDown className="me-1" />
                                Performance declined by <strong>{formatMetric(Math.abs(performanceTrendValue))}%</strong>
                                  </div>
                                )}
                              </div>
                            )}

                        {performanceInsights.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-3">Performance Insights</h6>
                            {performanceInsights.map((insight, idx) => {
                              const toneColor = insight.tone === 'negative' ? 'danger' : insight.tone === 'warning' ? 'warning' : 'success';
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded mb-2 border border-${toneColor} bg-${toneColor} bg-opacity-10`}
                                >
                                  <div className="d-flex align-items-start">
                                    <FaLightbulb className={`me-2 mt-1 text-${toneColor}`} />
                                    <div>
                                      <h6 className="mb-1">{insight.title}</h6>
                                      <p className="mb-0 small text-muted">{insight.description}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                              </div>
                            )}

                        {performanceBreakdown && (
                          <Card className="mt-3 border-0 shadow-sm">
                            <Card.Body>
                              <h6 className="mb-3">Performance Risk Calculation</h6>
                              <Table bordered size="sm" className="mb-0 table-custom">
                                <thead className="table-light">
                                  <tr>
                                    <th>Component</th>
                                    <th>Raw Points</th>
                                    <th>Weighted Contribution</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {performanceBreakdown.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <div className="fw-semibold">{item.label}</div>
                                        {item.detail && <div className="text-muted small">{item.detail}</div>}
                                      </td>
                                      <td className="text-end">{formatMetric(item.raw || 0, 1)}</td>
                                      <td className="text-end">{formatMetric(item.weighted || 0, 1)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="table-light">
                                  <tr>
                                    <td className="fw-semibold">Total</td>
                                    <td className="fw-semibold text-end">{formatMetric(performanceBreakdown.raw || 0, 1)}</td>
                                    <td className="fw-semibold text-end">{formatMetric(performanceBreakdown.weighted || 0, 1)}</td>
                                  </tr>
                                </tfoot>
                              </Table>
                              <div className="text-muted small mt-2">
                                {performanceBreakdown.items && performanceBreakdown.items.length > 0
                                  ? `Total weighted performance penalty: ${formatMetric(performanceBreakdown.weighted || 0, 1)} pts`
                                  : 'No performance penalties applied during this period.'}
                              </div>
                            </Card.Body>
                          </Card>
                        )}

                        {latestPerformanceSummary && (
                          <Card className="mb-3 border-0 bg-light">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">Latest Evaluation</h6>
                                <Badge bg={latestPerformanceSummary.isPassed ? 'success' : 'danger'}>
                                  {latestPerformanceSummary.isPassed ? 'Passed' : 'Below Target'}
                                </Badge>
                              </div>
                              <Row className="mt-3">
                                <Col md={3} sm={6}>
                                  <div className="text-muted small mb-1">Submitted</div>
                                  <div className="fw-semibold">
                                    {latestPerformanceSummary.submittedAt ? formatDisplayDate(latestPerformanceSummary.submittedAt) : 'N/A'}
                                  </div>
                                </Col>
                                <Col md={3} sm={6}>
                                  <div className="text-muted small mb-1">Score</div>
                                  <div className="fw-semibold">
                                    {formatMetric(latestPerformanceSummary.averageRating ?? ((latestPerformanceSummary.averageScore ?? 0) / 10), 1)} / 10
                                  </div>
                                </Col>
                                <Col md={3} sm={6}>
                                  <div className="text-muted small mb-1">Percentage</div>
                                  <div className="fw-semibold">
                                    {latestPerformanceSummary.percentageScore !== null && latestPerformanceSummary.percentageScore !== undefined
                                      ? `${formatMetric(latestPerformanceSummary.percentageScore, 1)}%`
                                      : 'N/A'}
                                  </div>
                                </Col>
                                <Col md={3} sm={6}>
                                  <div className="text-muted small mb-1">Passing Threshold</div>
                                  <div className="fw-semibold">
                                    {latestPerformanceSummary.passingThreshold !== null && latestPerformanceSummary.passingThreshold !== undefined
                                      ? `${formatMetric(latestPerformanceSummary.passingThreshold, 0)}%`
                                      : 'N/A'}
                                  </div>
                                </Col>
                              </Row>
                              {latestPerformanceSummary.comments && (
                                <div className="mt-3 p-3 bg-white rounded border">
                                  <div className="text-muted small mb-1">Manager Comments</div>
                                  <div className="small">{latestPerformanceSummary.comments}</div>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        )}

                        {(improvedCategories.length > 0 || declinedCategories.length > 0) && (
                          <Row className="mb-3">
                            <Col md={6}>
                              <div className="p-3 bg-light rounded h-100">
                                <h6 className="mb-2">
                                  <FaArrowUp className="text-success me-2" />
                                  Recent Improvements
                                </h6>
                                {improvedCategories.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {improvedCategories.map((item, idx) => (
                                      <li key={idx}>
                                        {item.category} (+{formatMetric(item.change, 1)})
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No categories improved in the latest review.</div>
                                )}
                              </div>
                            </Col>
                            <Col md={6} className="mt-3 mt-md-0">
                              <div className="p-3 bg-light rounded h-100">
                                <h6 className="mb-2">
                                  <FaArrowDown className="text-danger me-2" />
                                  Areas Declining
                                </h6>
                                {declinedCategories.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {declinedCategories.map((item, idx) => (
                                      <li key={idx}>
                                        {item.category} ({formatMetric(item.change, 1)})
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No categories declined compared with the previous review.</div>
                                )}
                              </div>
                            </Col>
                          </Row>
                        )}

                        {(strengthCategories.length > 0 || focusCategories.length > 0) && (
                          <Row className="mb-3">
                            <Col md={6}>
                              <div className="p-3 bg-light rounded h-100">
                                <h6 className="mb-2">
                                  <FaCheckCircle className="text-success me-2" />
                                  Key Strengths
                                </h6>
                                {strengthCategories.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {strengthCategories.map((category) => (
                                      <li key={category}>{category}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No standout strengths recorded.</div>
                                )}
                              </div>
                            </Col>
                            <Col md={6} className="mt-3 mt-md-0">
                              <div className="p-3 bg-light rounded h-100">
                                <h6 className="mb-2">
                                  <FaBullseye className="text-warning me-2" />
                                  Focus Areas
                                </h6>
                                {focusCategories.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {focusCategories.map((category) => (
                                      <li key={category}>{category}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No urgent focus areas flagged.</div>
                                )}
                              </div>
                            </Col>
                          </Row>
                        )}

                        {(strengthHighlights.length > 0 || attentionHighlights.length > 0) && (
                          <Row className="mb-3">
                            <Col md={6}>
                              <div className="border rounded p-3 h-100">
                                <h6 className="mb-2">Top Strength Items</h6>
                                {strengthHighlights.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {strengthHighlights.map((item, idx) => (
                                      <li key={idx}>
                                        <span className="fw-semibold">{formatMetric(item.rating, 1)}</span> / 10 – {item.question}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No strength items recorded.</div>
                                )}
                              </div>
                            </Col>
                            <Col md={6} className="mt-3 mt-md-0">
                              <div className="border rounded p-3 h-100">
                                <h6 className="mb-2">Needs Attention</h6>
                                {attentionHighlights.length > 0 ? (
                                  <ul className="mb-0 ps-3 small">
                                    {attentionHighlights.map((item, idx) => (
                                      <li key={idx}>
                                        <span className="fw-semibold">{formatMetric(item.rating, 1)}</span> / 10 – {item.question}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted small">No concern items recorded.</div>
                                )}
                              </div>
                            </Col>
                          </Row>
                        )}

                        {categoryComparisons.length > 0 && (
                          <div className="mt-3">
                            <h6 className="mb-2">Category Comparison</h6>
                            <Table bordered size="sm" className="mb-3">
                              <thead>
                                <tr>
                                  <th>Category</th>
                                  <th>Latest Rating</th>
                                  <th>Previous Rating</th>
                                  <th>Change</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryComparisons.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>{item.category}</td>
                                    <td>{item.currentRating !== null && item.currentRating !== undefined ? `${formatMetric(item.currentRating, 1)} / 10` : 'N/A'}</td>
                                    <td>{item.previousRating !== null && item.previousRating !== undefined ? `${formatMetric(item.previousRating, 1)} / 10` : 'N/A'}</td>
                                    <td>
                                      {item.change !== null && item.change !== undefined
                                        ? `${item.change > 0 ? '+' : ''}${formatMetric(item.change, 1)}`
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}

                        {categoryBreakdown.length > 0 && (
                          <div className="mt-3">
                            <h6 className="mb-2">Category Breakdown</h6>
                            {categoryBreakdown.map((category) => (
                              <div key={category.category} className="mb-2">
                                <div className="d-flex justify-content-between mb-1 small">
                                  <span>{category.category}</span>
                                  <span>{formatMetric(category.averageRating, 1)} / 10</span>
                                </div>
                                <ProgressBar 
                                  variant={getPerformanceVariant(category.averageRating)}
                                  now={category.percentage}
                                  style={{ height: '6px' }} 
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {scoreHistory.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-2">Score History</h6>
                            <Table bordered size="sm" className="mb-0">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Score</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scoreHistory.map((entry, idx) => (
                                  <tr key={idx}>
                                    <td>{entry.date ? formatDisplayDate(entry.date) : 'N/A'}</td>
                                    <td>
                                      {`${formatMetric(entry.score, 1)} / 10`}
                                      {entry.percentage !== null && entry.percentage !== undefined
                                        ? ` (${formatMetric(entry.percentage, 1)}%)`
                                        : ''}
                                    </td>
                                    <td>
                                      <Badge bg={entry.isPassed ? 'success' : 'danger'}>
                                        {entry.isPassed ? 'Passed' : 'Below Target'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}

                        {!evaluationMetrics.lastEvaluationDate && scoreHistory.length === 0 && (
                          <div className="alert alert-warning mt-3">
                            <FaExclamationCircle className="me-1" />
                            No evaluation records found for this employee.
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab>

                  {/* Risk Factors Tab */}
                  <Tab eventKey="risk" title={
                    <span>
                      <FaExclamationCircle className="me-1" /> Risk Factors
                    </span>
                  }>
                    <Card className="border-0 shadow-sm mt-3">
                      <Card.Body>
                        <h6 className="mb-3">Key Risk Factors</h6>
                        {riskBreakdown?.score !== undefined && (
                          <Card className="mb-3 border-0 bg-light">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="mb-0">Risk Score Breakdown</h6>
                                <span className="fw-bold">{formatMetric(riskBreakdown.score || 0, 1)}%</span>
                              </div>
                              <Table bordered size="sm" className="mb-0">
                                <thead>
                                  <tr>
                                    <th>Component</th>
                                    <th>Raw Points</th>
                                    <th>Weighted Contribution</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {riskComponentDefinitions.map(({ key, label }) => {
                                    const componentData = riskComponents[key];
                                    if (!componentData) {
                                      return null;
                                    }
                                    return (
                                      <React.Fragment key={key}>
                                        <tr>
                                          <td>
                                            <div className="fw-semibold">
                                              {label} ({formatMetric((componentData.weight || 0) * 100, 0)}% weight)
                                            </div>
                                          </td>
                                          <td className="text-end">{formatMetric(componentData.raw || 0, 1)}</td>
                                          <td className="text-end">{formatMetric(componentData.weighted || 0, 1)}</td>
                                        </tr>
                                        {componentData.items && componentData.items.length > 0 && (
                                          <tr>
                                            <td colSpan={3} className="p-0">
                                              <Table bordered size="sm" className="mb-0">
                                                <thead>
                                                  <tr className="table-light">
                                                    <th style={{ width: '55%' }}>Item</th>
                                                    <th style={{ width: '22%' }}>Raw</th>
                                                    <th style={{ width: '23%' }}>Weighted</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {componentData.items.map((item, idx) => (
                                                    <tr key={`${key}-item-${idx}`}>
                                                      <td>
                                                        <div className="fw-semibold">{item.label}</div>
                                                        {item.detail && <div className="text-muted small">{item.detail}</div>}
                                                      </td>
                                                      <td className="text-end">{formatMetric(item.raw || 0, 1)}</td>
                                                      <td className="text-end">{formatMetric(item.weighted || 0, 1)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </Table>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="table-light">
                                  <tr>
                                    <td className="fw-semibold">Total</td>
                                    <td className="fw-semibold text-end">{formatMetric(totalRiskRaw || 0, 1)}</td>
                                    <td className="fw-semibold text-end">{formatMetric(riskBreakdown.score || 0, 1)}</td>
                                  </tr>
                                </tfoot>
                              </Table>
                              <div className="text-muted small mt-2">
                                Final risk score: {formatMetric(riskBreakdown.score || 0, 1)}%
                              </div>
                            </Card.Body>
                          </Card>
                        )}

                        {riskInsights.length > 0 && (
                          <div className="mb-3">
                            <h6 className="mb-2">Risk Insights</h6>
                            {riskInsights.map((insight, idx) => {
                              const toneColor = insight.tone === 'negative' ? 'danger' : insight.tone === 'warning' ? 'warning' : 'success';
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded mb-2 border border-${toneColor} bg-${toneColor} bg-opacity-10`}
                                >
                                  <div className="d-flex align-items-start">
                                    <FaLightbulb className={`me-2 mt-1 text-${toneColor}`} />
                                    <div>
                                      <h6 className="mb-1">{insight.title}</h6>
                                      <p className="mb-0 small text-muted">{insight.description}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {selectedEmployee.keyFactors && selectedEmployee.keyFactors.length > 0 ? (
                          <ul className="list-unstyled">
                            {selectedEmployee.keyFactors.map((factor, idx) => (
                              <li key={idx} className="mb-2 p-2 bg-light rounded">
                                <FaExclamationTriangle className="text-warning me-2" />
                                {factor}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="alert alert-success">
                            <FaUserCheck className="me-2" />
                            No significant risk factors identified
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab>

                  {/* Recommendations Tab */}
                  <Tab eventKey="recommendations" title={
                    <span>
                      <FaLightbulb className="me-1" /> Recommendations
                    </span>
                  }>
                    <Card className="border-0 shadow-sm mt-3">
                      <Card.Body>
                        <h6 className="mb-3">Recommended Actions</h6>
                        
                        {selectedEmployee.recommendations && selectedEmployee.recommendations.length > 0 ? (
                          <div>
                            {selectedEmployee.recommendations.map((rec, idx) => (
                              <Card key={idx} className="mb-3 border" style={{ borderLeft: `4px solid ${rec.priority === 'high' ? '#dc3545' : '#ffc107'}` }}>
                                <Card.Body>
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <Badge bg={rec.priority === 'high' ? 'danger' : 'warning'} className="mb-2">
                                      {rec.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                                    </Badge>
                                    <Badge bg="secondary">{rec.category}</Badge>
                                  </div>
                                  <h6 className="mb-2">{rec.action}</h6>
                                  <p className="text-muted mb-0 small">{rec.description}</p>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="alert alert-info">
                            <FaInfoCircle className="me-2" />
                            No specific recommendations at this time. Continue monitoring employee performance.
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab>
                </Tabs>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
};

export default PredictiveTurnoverAnalytics;
