import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaFilePdf, FaFileExcel, FaSearch, FaFilter, FaDownload, FaSpinner, FaTrophy, FaExclamationTriangle, FaChartLine, FaUsers, FaAward, FaTimesCircle, FaIdBadge, FaBuilding, FaBriefcase, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import { Card, Button, Row, Col, Form, Table, Dropdown, Badge, Alert, Modal, Spinner, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import Chart from 'chart.js/auto';
// Import jspdf-autotable FIRST - must be imported as side-effect to extend jsPDF prototype
// This import statement extends the jsPDF class with the autoTable method
import 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function ReportGeneration() {
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
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [attendanceStatusTotals, setAttendanceStatusTotals] = useState({});
  const [attendanceInsights, setAttendanceInsights] = useState([]);
  const [attendanceAutoAdjusted, setAttendanceAutoAdjusted] = useState(false);
  // Employee attendance detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecords, setDetailRecords] = useState([]);
  const [detailAnalytics, setDetailAnalytics] = useState(null);
  const [employeeData, setEmployeeData] = useState([]);
  const [employeeAnalytics, setEmployeeAnalytics] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [leaveAnalytics, setLeaveAnalytics] = useState(null);

  const formatCurrency = (value) => {
    const numericValue = Number(value ?? 0);

    if (Number.isNaN(numericValue)) {
      return '₱0.00';
    }

    return `₱${numericValue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const buildEmployeeAttendanceAnalytics = (records = []) => {
    const parseHours = (value) => {
      if (value === null || value === undefined) return null;
      const n = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(n) ? n : null;
    };
    const totals = {
      count: 0,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      overtime: 0,
      undertime: 0,
      totalHours: 0,
      avgHours: 0,
      firstDate: null,
      lastDate: null,
      punctualityRate: 0,
    };
    if (!Array.isArray(records) || records.length === 0) {
      return totals;
    }
    records.forEach((r) => {
      totals.count += 1;
      const status = (r.status || '').toLowerCase();
      if (status.includes('present')) totals.present += 1;
      // Count any variant beginning with "late" (e.g., "Late", "Late (Overtime)", "Late (Undertime)")
      if (status.startsWith('late')) totals.late += 1;
      if (status === 'absent') totals.absent += 1;
      if (status === 'on leave') totals.onLeave += 1;
      if (status === 'overtime') totals.overtime += 1;
      if (status === 'undertime') totals.undertime += 1;
      const hours = parseHours(r.total_hours);
      if (hours !== null) totals.totalHours += hours;
      if (r.date) {
        const d = new Date(r.date);
        if (!totals.firstDate || d < totals.firstDate) totals.firstDate = d;
        if (!totals.lastDate || d > totals.lastDate) totals.lastDate = d;
      }
    });
    totals.avgHours = totals.count > 0 ? Number(totals.totalHours / totals.count) : 0;
    const worked = totals.present + totals.late + totals.overtime + totals.undertime;
    totals.punctualityRate = worked > 0 ? Number(((totals.present + totals.overtime) / worked) * 100) : 0;
    return totals;
  };

  const openEmployeeAttendanceDetail = async (employee) => {
    if (!employee?.id) return;
    setDetailEmployee(employee);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailRecords([]);
    setDetailAnalytics(null);
    try {
      const params = {
        employee_id: employee.id,
        date_from: dateRange.startDate || undefined,
        date_to: dateRange.endDate || undefined,
        per_page: 1000,
        sort_by: 'date',
        sort_order: 'asc',
      };
      const response = await axios.get('http://localhost:8000/api/attendance', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const payload = response.data?.data;
      let items = [];
      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.data && Array.isArray(payload.data)) {
        items = payload.data;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      }
      setDetailRecords(items);
      setDetailAnalytics(buildEmployeeAttendanceAnalytics(items));
    } catch (err) {
      console.error('Failed to load employee attendance detail', err);
      toast.error('Failed to load employee attendance');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (value) => {
    if (!value) return '—';

    const date = new Date(`1970-01-01T${value}`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTenure = (months) => {
    if (!months || Number.isNaN(months)) {
      return '—';
    }

    const totalMonths = Math.max(0, Math.round(months));
    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;

    const parts = [];
    if (years > 0) {
      parts.push(`${years} yr${years > 1 ? 's' : ''}`);
    }
    if (remainingMonths > 0) {
      parts.push(`${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 mo';
  };

  const getEmployeeStatusVariant = (status) => {
    const normalized = (status || '').toString().toLowerCase();

    if (normalized.includes('active')) return 'success';
    if (normalized.includes('probation')) return 'info';
    if (normalized.includes('leave')) return 'warning';
    if (normalized.includes('terminated')) return 'danger';
    if (normalized.includes('resigned')) return 'secondary';
    if (normalized.includes('inactive')) return 'secondary';
    return 'light';
  };

  const getLeaveStatusVariant = (status) => {
    const normalized = (status || '').toString().toLowerCase();

    if (normalized.includes('approved')) return 'success';
    if (normalized.includes('pending') || normalized.includes('waiting')) return 'warning';
    if (normalized.includes('manager')) {
      if (normalized.includes('approved')) return 'info';
      if (normalized.includes('rejected')) return 'secondary';
    }
    if (normalized.includes('rejected') || normalized.includes('cancel')) return 'danger';
    return 'light';
  };

  const buildAttendanceSummary = (dailySummary) => {
    if (!dailySummary) {
      return [];
    }

    const summaryEntries = Object.entries(dailySummary).map(([date, items]) => {
      const counts = Array.isArray(items)
        ? items.reduce((acc, item) => {
            const status = item.status || 'Unknown';
            acc[status] = (acc[status] || 0) + Number(item.count ?? 0);

            return acc;
          }, {})
        : {};

      const presentStatuses = ['Present', 'Late', 'Overtime', 'Undertime', 'Holiday (Worked)'];
      const presentTotal = presentStatuses.reduce((total, status) => total + (counts[status] || 0), 0);

      return {
        date,
        present: presentTotal,
        absent: counts['Absent'] || 0,
        late: counts['Late'] || 0,
        onLeave: counts['On Leave'] || 0,
        overtime: counts['Overtime'] || 0,
        undertime: counts['Undertime'] || 0,
        holiday: counts['Holiday (No Work)'] || 0,
        rawCounts: counts,
      };
    });

    return summaryEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const aggregateAttendanceStatuses = (dailySummary) => {
    const totals = {};

    if (!dailySummary) {
      return totals;
    }

    Object.values(dailySummary).forEach((items) => {
      if (!Array.isArray(items)) {
        return;
      }

      items.forEach((item) => {
        const status = item.status || 'Unknown';
        totals[status] = (totals[status] || 0) + Number(item.count ?? 0);
      });
    });

    return totals;
  };

  const buildAttendanceInsights = (stats, summary) => {
    if (!stats) {
      return [];
    }

    const insightsList = [];
    const totalRecords = stats.total_records || 0;
    const attendanceRate = Number(stats.attendance_rate ?? 0);
    const absentRate = totalRecords > 0 ? (Number(stats.absent_count ?? 0) / totalRecords) * 100 : 0;
    const lateRate = totalRecords > 0 ? (Number(stats.late_count ?? 0) / totalRecords) * 100 : 0;

    if (attendanceRate >= 95) {
      insightsList.push(`Attendance rate is healthy at ${attendanceRate.toFixed(1)}%. Keep the momentum with regular recognition.`);
    } else if (attendanceRate >= 85) {
      insightsList.push(`Attendance rate is ${attendanceRate.toFixed(1)}%. Focus coaching on teams trending below the target.`);
    } else {
      insightsList.push(`Attendance rate dipped to ${attendanceRate.toFixed(1)}%. Run root-cause interviews and reinforce policies.`);
    }

    if (absentRate >= 5) {
      insightsList.push(`Absence rate sits at ${absentRate.toFixed(1)}%. Review schedule flexibility or wellness support for affected teams.`);
    }

    if (lateRate >= 10) {
      insightsList.push(`Late arrivals account for ${lateRate.toFixed(1)}% of records. Consider a targeted communication on punctuality.`);
    } else if (stats.late_count > 0) {
      insightsList.push(`Late incidents are limited to ${stats.late_count}. Maintain follow-ups to keep it stable.`);
    }

    const highestAbsenceDay = summary.reduce((peak, current) => {
      if (!peak || current.absent > peak.absent) {
        return current;
      }
      return peak;
    }, null);

    if (highestAbsenceDay && highestAbsenceDay.absent > 0) {
      insightsList.push(
        `Absences peaked on ${formatDate(highestAbsenceDay.date)} with ${highestAbsenceDay.absent} record${
          highestAbsenceDay.absent > 1 ? 's' : ''
        }. Consider a follow-up with that department.`
      );
    }

    if (summary.length >= 4) {
      const midpoint = Math.floor(summary.length / 2);
      const firstHalf = summary.slice(0, midpoint);
      const secondHalf = summary.slice(midpoint);

      const averageLateFirstHalf =
        firstHalf.reduce((sum, day) => sum + (day.late || 0), 0) / Math.max(firstHalf.length, 1);
      const averageLateSecondHalf =
        secondHalf.reduce((sum, day) => sum + (day.late || 0), 0) / Math.max(secondHalf.length, 1);

      if (averageLateSecondHalf > averageLateFirstHalf * 1.25 && averageLateSecondHalf - averageLateFirstHalf >= 1) {
        insightsList.push(
          `Late arrivals increased by ${(averageLateSecondHalf - averageLateFirstHalf).toFixed(
            1
          )} on average in the recent period. Flag managers for action.`
        );
      } else if (averageLateFirstHalf > averageLateSecondHalf * 1.25) {
        insightsList.push(
          `Late arrivals improved by ${(averageLateFirstHalf - averageLateSecondHalf).toFixed(
            1
          )} on average—recognize teams sustaining punctuality.`
        );
      }
    }

    if ((stats.overtime_count ?? 0) > (stats.undertime_count ?? 0) * 1.5 && (stats.overtime_count ?? 0) > 0) {
      insightsList.push(
        `Overtime records (${stats.overtime_count}) greatly exceed undertime (${stats.undertime_count}). Review workload balance.`
      );
    }

    if (insightsList.length === 0) {
      insightsList.push('Attendance is stable across key metrics. Continue monitoring for early signals of change.');
    }

    return insightsList;
  };

  const fallbackDepartments = ['Human Resources', 'Information Technology', 'Finance', 'Operations', 'Sales'];
  const fallbackPositions = ['Chief Executive Officer', 'Manager', 'Supervisor', 'Specialist', 'Staff'];

  const attendanceMix = useMemo(() => {
    const entries = Object.entries(attendanceStatusTotals || {}).filter(
      ([, count]) => Number(count) > 0
    );

    if (entries.length === 0) {
      return [];
    }

    const palette = [
      '#4caf50',
      '#dc3545',
      '#ffc107',
      '#17a2b8',
      '#6c757d',
      '#6610f2',
      '#20c997',
      '#ff7f50',
      '#795548',
    ];

    const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);

    return entries.map(([status, count], index) => {
      const numericCount = Number(count || 0);
      const percentageValue =
        total > 0 ? (numericCount / total) * 100 : 0;
      const percentage =
        percentageValue === 100 || percentageValue === 0
          ? `${percentageValue.toFixed(0)}%`
          : `${percentageValue.toFixed(1)}%`;

      return {
        label: status,
        count: numericCount,
        percentage,
        color: palette[index % palette.length],
      };
    });
  }, [attendanceStatusTotals]);

  const payrollAggregates = useMemo(() => {
    if (!payrollData || payrollData.length === 0) {
      return null;
    }

    const totals = payrollData.reduce(
      (acc, payroll) => {
        const basic = Number(payroll.basic_salary ?? 0);
        const overtime = Number(payroll.overtime_pay ?? 0);
        const deductions = Number(payroll.total_deductions ?? 0);
        const net = Number(payroll.net_pay ?? 0);

        acc.basic += basic;
        acc.overtime += overtime;
        acc.deductions += deductions;
        acc.net += net;

        return acc;
      },
      { basic: 0, overtime: 0, deductions: 0, net: 0 }
    );

    const gross = totals.basic + totals.overtime;
    const netDistribution = [
      {
        label: 'Net Pay',
        value: totals.net,
        color: '#28a745',
      },
      {
        label: 'Total Deductions',
        value: totals.deductions,
        color: '#dc3545',
      },
    ];

    const deductionRate = gross > 0 ? (totals.deductions / gross) * 100 : 0;
    const overtimeRate = gross > 0 ? (totals.overtime / gross) * 100 : 0;

    return {
      totals: {
        ...totals,
        gross,
      },
      netDistribution,
      deductionRate,
      overtimeRate,
    };
  }, [payrollData]);

  const payrollSummaryMetrics = useMemo(() => {
    if (!payrollAggregates) {
      return [];
    }

    const totals = payrollAggregates.totals;

    return [
      {
        label: 'Total Gross Pay',
        value: formatCurrency(payrollAnalytics?.total_gross ?? totals.gross),
        variant: 'primary',
      },
      {
        label: 'Total Net Pay',
        value: formatCurrency(payrollAnalytics?.total_net ?? totals.net),
        variant: 'success',
      },
      {
        label: 'Total Deductions',
        value: formatCurrency(payrollAnalytics?.total_deductions ?? totals.deductions),
        variant: 'danger',
      },
      {
        label: 'Average Net Pay',
        value: formatCurrency(
          payrollAnalytics?.average_net_pay ?? (totals.net / (payrollData?.length || 1))
        ),
        variant: 'info',
      },
    ];
  }, [payrollAggregates, payrollAnalytics, payrollData?.length]);

  const payrollInsights = useMemo(() => {
    if (!payrollAggregates) {
      return [];
    }

    const { totals, deductionRate, overtimeRate } = payrollAggregates;
    const insights = [];

    if (deductionRate > 20) {
      insights.push(
        `Deductions consume ${deductionRate.toFixed(1)}% of gross pay. Review recurring deductions for possible optimizations.`
      );
    } else if (deductionRate > 10) {
      insights.push(
        `Deductions account for ${deductionRate.toFixed(1)}% of gross pay, which is within a manageable range.`
      );
    } else {
      insights.push(
        `Deductions remain lean at ${deductionRate.toFixed(1)}% of gross pay, keeping take-home pay healthy.`
      );
    }

    if (overtimeRate > 25) {
      insights.push(
        `Overtime represents ${overtimeRate.toFixed(1)}% of gross pay. Review staffing levels or workload distribution.`
      );
    } else if (overtimeRate < 5) {
      insights.push(
        `Overtime is modest at ${overtimeRate.toFixed(1)}% of gross pay.`
      );
    }

    const averageNet = totals.net / (payrollData?.length || 1);
    if (averageNet < 20000) {
      insights.push(
        `Average net pay sits at ${formatCurrency(averageNet)}. Evaluate compensation bands to stay competitive.`
      );
    }

    if (insights.length === 0) {
      insights.push('Payroll metrics are stable. Continue monitoring overtime and deductions for anomalies.');
    }

    return insights;
  }, [payrollAggregates, payrollData]);

  const performanceSummaryMetrics = useMemo(() => {
    if (!statistics) {
      return [];
    }

    const totalEvaluations = statistics.total_evaluations ?? 0;
    const passRate = Number(statistics.pass_rate ?? 0);
    const averageScore = Number(statistics.average_percentage ?? 0);
    const passedCount = Number(statistics.passed_count ?? 0);
    const failedCount = Number(statistics.failed_count ?? 0);

    return [
      {
        label: 'Total Evaluations',
        value: totalEvaluations,
        variant: 'primary',
      },
      {
        label: 'Pass Rate',
        value: `${passRate.toFixed(1)}%`,
        variant: passRate >= 85 ? 'success' : passRate >= 70 ? 'warning' : 'danger',
      },
      {
        label: 'Average Score',
        value: `${averageScore.toFixed(2)}%`,
        variant: averageScore >= 85 ? 'success' : 'warning',
      },
      {
        label: 'Failed Evaluations',
        value: failedCount,
        variant: failedCount > 0 ? 'danger' : 'success',
      },
    ];
  }, [statistics]);

  const performanceOverviewInsights = useMemo(() => {
    if (!insights || insights.length === 0) {
      return [];
    }

    return insights.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      const description = item.description ?? '';
      const recommendation = item.recommendation ? ` Recommendation: ${item.recommendation}` : '';

      if (description) {
        return `${description}${recommendation}`;
      }

      return recommendation.trim();
    }).filter(Boolean);
  }, [insights]);

  const getAttendanceBadgeVariant = (status) => {
    switch (status) {
      case 'Present':
      case 'Holiday (Worked)':
        return 'success';
      case 'Late':
        return 'warning';
      case 'Absent':
        return 'danger';
      case 'On Leave':
        return 'info';
      case 'Overtime':
        return 'primary';
      case 'Undertime':
        return 'secondary';
      case 'Holiday (No Work)':
        return 'dark';
      default:
        return 'secondary';
    }
  };

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

  const attendanceMetrics = useMemo(() => {
    if (!attendanceStats) {
      return [];
    }

    const totalRecords = attendanceStats.total_records || 0;
    const attendanceRate = Number(attendanceStats.attendance_rate ?? 0);
    const absentRate = totalRecords > 0 ? (Number(attendanceStats.absent_count ?? 0) / totalRecords) * 100 : 0;
    const lateRate = totalRecords > 0 ? (Number(attendanceStats.late_count ?? 0) / totalRecords) * 100 : 0;

    return [
      {
        label: 'Attendance Rate',
        value: `${attendanceRate.toFixed(1)}%`,
        details: `${attendanceStats.present_count ?? 0} of ${totalRecords} records marked present`,
        variant: attendanceRate >= 95 ? 'success' : attendanceRate >= 85 ? 'warning' : 'danger',
      },
      {
        label: 'Absences',
        value: attendanceStats.absent_count ?? 0,
        details: `${absentRate.toFixed(1)}% of records`,
        variant: absentRate <= 5 ? 'success' : absentRate <= 10 ? 'warning' : 'danger',
      },
      {
        label: 'Late Arrivals',
        value: attendanceStats.late_count ?? 0,
        details: `${lateRate.toFixed(1)}% of records`,
        variant: lateRate <= 5 ? 'success' : lateRate <= 12 ? 'warning' : 'danger',
      },
      {
        label: 'On Leave',
        value: attendanceStats.on_leave_count ?? 0,
        details: `${Number(attendanceStats.on_leave_count ?? 0) > 0 ? 'Approved leaves within range' : 'No leave records in range'}`,
        variant: 'info',
      },
    ];
  }, [attendanceStats]);
  
  // Chart refs
  const passFailChartRef = useRef(null);
  const departmentChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const passFailChartInstanceRef = useRef(null);
  const departmentChartInstanceRef = useRef(null);
  const trendChartInstanceRef = useRef(null);
  const attendanceDistributionChartRef = useRef(null);
  const attendanceTrendChartRef = useRef(null);
  const attendanceDistributionChartInstanceRef = useRef(null);
  const attendanceTrendChartInstanceRef = useRef(null);
  const payrollDistributionChartRef = useRef(null);
  const payrollDistributionChartInstanceRef = useRef(null);
  const employeeDepartmentChartRef = useRef(null);
  const employeeStatusChartRef = useRef(null);
  const employeeDepartmentChartInstanceRef = useRef(null);
  const employeeStatusChartInstanceRef = useRef(null);
  const leaveStatusChartRef = useRef(null);
  const leaveTypeChartRef = useRef(null);
  const leaveStatusChartInstanceRef = useRef(null);
  const leaveTypeChartInstanceRef = useRef(null);

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
  }, []);

  useEffect(() => {
    if (reportType === 'performance' || reportType === 'payroll' || reportType === 'employee') {
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
      if (payrollDistributionChartInstanceRef.current) {
        payrollDistributionChartInstanceRef.current.destroy();
        payrollDistributionChartInstanceRef.current = null;
      }
    };
  }, [analytics, reportType, statistics]);

  useEffect(() => {
    if (reportType !== 'attendance') {
      if (attendanceDistributionChartInstanceRef.current) {
        attendanceDistributionChartInstanceRef.current.destroy();
        attendanceDistributionChartInstanceRef.current = null;
      }

      if (attendanceTrendChartInstanceRef.current) {
        attendanceTrendChartInstanceRef.current.destroy();
        attendanceTrendChartInstanceRef.current = null;
      }

      return;
    }

    const statusEntries = attendanceMix;

    if (attendanceDistributionChartRef.current && statusEntries.length > 0) {
      if (attendanceDistributionChartInstanceRef.current) {
        attendanceDistributionChartInstanceRef.current.destroy();
      }

      const ctx = attendanceDistributionChartRef.current.getContext('2d');

      attendanceDistributionChartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: statusEntries.map((item) => item.label),
          datasets: [
            {
              label: 'Attendance Status Distribution',
              data: statusEntries.map((item) => item.count),
              backgroundColor: statusEntries.map((item) => item.color),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 36,
              right: 36,
              bottom: 36,
              left: 36,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    }

    if (attendanceTrendChartRef.current && attendanceSummary.length > 0) {
      if (attendanceTrendChartInstanceRef.current) {
        attendanceTrendChartInstanceRef.current.destroy();
      }

      const ctx = attendanceTrendChartRef.current.getContext('2d');
      const labels = attendanceSummary.map((item) => formatDate(item.date));
      const presentData = attendanceSummary.map((item) => item.present || 0);
      const absentData = attendanceSummary.map((item) => item.absent || 0);
      const lateData = attendanceSummary.map((item) => item.late || 0);
      const onLeaveData = attendanceSummary.map((item) => item.onLeave || 0);

      attendanceTrendChartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Present',
              data: presentData,
              borderColor: 'rgba(76, 175, 80, 1)',
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              tension: 0.35,
              fill: true,
            },
            {
              label: 'Absent',
              data: absentData,
              borderColor: 'rgba(220, 53, 69, 1)',
              backgroundColor: 'rgba(220, 53, 69, 0.15)',
              tension: 0.35,
              fill: true,
            },
            {
              label: 'Late',
              data: lateData,
              borderColor: 'rgba(255, 193, 7, 1)',
              backgroundColor: 'rgba(255, 193, 7, 0.2)',
              tension: 0.35,
              fill: true,
            },
            {
              label: 'On Leave',
              data: onLeaveData,
              borderColor: 'rgba(23, 162, 184, 1)',
              backgroundColor: 'rgba(23, 162, 184, 0.18)',
              tension: 0.35,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                title: (items) => items.map((item) => item.label).join(', '),
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
        },
      });
    }

    return () => {
      if (attendanceDistributionChartInstanceRef.current) {
        attendanceDistributionChartInstanceRef.current.destroy();
        attendanceDistributionChartInstanceRef.current = null;
      }

      if (attendanceTrendChartInstanceRef.current) {
        attendanceTrendChartInstanceRef.current.destroy();
        attendanceTrendChartInstanceRef.current = null;
      }
    };
  }, [reportType, attendanceMix, attendanceSummary]);

  useEffect(() => {
    if (reportType !== 'payroll') {
      if (payrollDistributionChartInstanceRef.current) {
        payrollDistributionChartInstanceRef.current.destroy();
        payrollDistributionChartInstanceRef.current = null;
      }

      return;
    }

    if (!payrollAggregates || !payrollDistributionChartRef.current) {
      if (payrollDistributionChartInstanceRef.current) {
        payrollDistributionChartInstanceRef.current.destroy();
        payrollDistributionChartInstanceRef.current = null;
      }

      return;
    }

    if (payrollDistributionChartInstanceRef.current) {
      payrollDistributionChartInstanceRef.current.destroy();
      payrollDistributionChartInstanceRef.current = null;
    }

    const ctx = payrollDistributionChartRef.current.getContext('2d');

    payrollDistributionChartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: payrollAggregates.netDistribution.map((item) => item.label),
        datasets: [
          {
            data: payrollAggregates.netDistribution.map((item) => item.value),
            backgroundColor: payrollAggregates.netDistribution.map((item) => item.color),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed || 0;
                const total = payrollAggregates.netDistribution.reduce((sum, item) => sum + item.value, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

                return `${formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }, [reportType, payrollAggregates]);

  useEffect(() => {
    if (reportType !== 'leave') {
      if (leaveStatusChartInstanceRef.current) {
        leaveStatusChartInstanceRef.current.destroy();
        leaveStatusChartInstanceRef.current = null;
      }
      if (leaveTypeChartInstanceRef.current) {
        leaveTypeChartInstanceRef.current.destroy();
        leaveTypeChartInstanceRef.current = null;
      }
      return;
    }

    if (!leaveAnalytics) {
      if (leaveStatusChartInstanceRef.current) {
        leaveStatusChartInstanceRef.current.destroy();
        leaveStatusChartInstanceRef.current = null;
      }
      if (leaveTypeChartInstanceRef.current) {
        leaveTypeChartInstanceRef.current.destroy();
        leaveTypeChartInstanceRef.current = null;
      }
      return;
    }

    if (leaveStatusChartRef.current) {
      if (leaveStatusChartInstanceRef.current) {
        leaveStatusChartInstanceRef.current.destroy();
      }

      const ctxStatus = leaveStatusChartRef.current.getContext('2d');
      leaveStatusChartInstanceRef.current = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: leaveAnalytics.statusDistribution.map((item) => item.label),
          datasets: [
            {
              data: leaveAnalytics.statusDistribution.map((item) => item.count),
              backgroundColor: leaveAnalytics.statusDistribution.map((item) => item.color),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    }

    if (leaveTypeChartRef.current) {
      if (leaveTypeChartInstanceRef.current) {
        leaveTypeChartInstanceRef.current.destroy();
      }

      const ctxType = leaveTypeChartRef.current.getContext('2d');
      leaveTypeChartInstanceRef.current = new Chart(ctxType, {
        type: 'bar',
        data: {
          labels: leaveAnalytics.typeDistribution.map((item) => item.label),
          datasets: [
            {
              label: 'Requests',
              data: leaveAnalytics.typeDistribution.map((item) => item.count),
              backgroundColor: 'rgba(255, 152, 150, 0.8)',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    }
  }, [reportType, leaveAnalytics]);

  useEffect(() => {
    if (reportType !== 'employee') {
      if (employeeDepartmentChartInstanceRef.current) {
        employeeDepartmentChartInstanceRef.current.destroy();
        employeeDepartmentChartInstanceRef.current = null;
      }
      if (employeeStatusChartInstanceRef.current) {
        employeeStatusChartInstanceRef.current.destroy();
        employeeStatusChartInstanceRef.current = null;
      }
      return;
    }

    if (!employeeAnalytics) {
      if (employeeDepartmentChartInstanceRef.current) {
        employeeDepartmentChartInstanceRef.current.destroy();
        employeeDepartmentChartInstanceRef.current = null;
      }
      if (employeeStatusChartInstanceRef.current) {
        employeeStatusChartInstanceRef.current.destroy();
        employeeStatusChartInstanceRef.current = null;
      }
      return;
    }

    if (employeeDepartmentChartRef.current) {
      if (employeeDepartmentChartInstanceRef.current) {
        employeeDepartmentChartInstanceRef.current.destroy();
      }

      if (employeeAnalytics.departments.length > 0) {
        const ctxDept = employeeDepartmentChartRef.current.getContext('2d');
        employeeDepartmentChartInstanceRef.current = new Chart(ctxDept, {
          type: 'bar',
          data: {
            labels: employeeAnalytics.departments.map((item) => item.label),
            datasets: [
              {
                label: 'Headcount',
                data: employeeAnalytics.departments.map((item) => item.count),
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
            },
          },
        });
      }
    }

    if (employeeStatusChartRef.current) {
      if (employeeStatusChartInstanceRef.current) {
        employeeStatusChartInstanceRef.current.destroy();
      }

      if (employeeAnalytics.statusDistribution.length > 0) {
        const ctxStatus = employeeStatusChartRef.current.getContext('2d');
        employeeStatusChartInstanceRef.current = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: employeeAnalytics.statusDistribution.map((item) => item.label),
            datasets: [
              {
                data: employeeAnalytics.statusDistribution.map((item) => item.count),
                backgroundColor: employeeAnalytics.statusDistribution.map((item) => item.color),
                borderWidth: 2,
                borderColor: '#fff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
              legend: {
                display: false,
              },
            },
          },
        });
      }
    }
  }, [reportType, employeeAnalytics]);

  useEffect(() => {
    if (reportType === 'leave' && leaveData && leaveData.length > 0 && leaveAnalytics && leaveStatusChartRef.current) {
      const statusDistribution = leaveAnalytics.statusDistribution.map(item => item.count);
      if (statusDistribution.length > 0) {
        if (leaveStatusChartInstanceRef.current) {
          leaveStatusChartInstanceRef.current.destroy();
        }
        const ctx = leaveStatusChartRef.current.getContext('2d');
        leaveStatusChartInstanceRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Pending', 'Approved', 'Rejected', 'Manager Approved', 'Manager Rejected'],
            datasets: [{
              data: statusDistribution,
              backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#20c997', '#795548'],
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
    }
  }, [reportType, leaveData, leaveAnalytics]);

  useEffect(() => {
    if (reportType === 'leave' && leaveData && leaveData.length > 0 && leaveAnalytics && leaveTypeChartRef.current) {
      const typeDistribution = leaveAnalytics.typeDistribution.map(item => item.count);
      if (typeDistribution.length > 0) {
        if (leaveTypeChartInstanceRef.current) {
          leaveTypeChartInstanceRef.current.destroy();
        }
        const ctx = leaveTypeChartRef.current.getContext('2d');
        leaveTypeChartInstanceRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Not Specified', 'Vacation', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Bereavement Leave', 'Other'],
            datasets: [{
              data: typeDistribution,
              backgroundColor: ['#6c757d', '#28a745', '#dc3545', '#ffc107', '#6610f2', '#c82333', '#795548'],
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
    }
  }, [reportType, leaveData, leaveAnalytics]);

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
    } else if (reportType === 'attendance') {
      await generateAttendancePreview();
    } else if (reportType === 'leave') {
      await generateLeavePreview();
    } else if (reportType === 'employee') {
      await generateEmployeePreview();
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

  const generateAttendancePreview = async () => {
    setLoading(true);

    try {
      const params = {
        date_from: dateRange.startDate,
        date_to: dateRange.endDate,
      };

      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        params.status = filters.status;
      }

      const searchTerms = [];

      if (filters.department) {
        searchTerms.push(filters.department);
      }

      if (filters.position) {
        searchTerms.push(filters.position);
      }

      if (searchTerms.length > 0) {
        params.search = searchTerms.join(' ');
      }

      const response = await axios.get('http://localhost:8000/api/attendance/dashboard', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to generate attendance report');
      }

      const payload = response.data.data || {};
      const dailySummary = payload.daily_summary || {};

      const summary = buildAttendanceSummary(dailySummary);
      const totals = aggregateAttendanceStatuses(dailySummary);
      const computedInsights = buildAttendanceInsights(payload.statistics || null, summary);

      setAttendanceData(payload.recent_attendance || []);
      setAttendanceStats(payload.statistics || null);
      setAttendanceSummary(summary);
      setAttendanceStatusTotals(totals);
      setAttendanceInsights(computedInsights);
      setAttendanceAutoAdjusted(Boolean(payload.auto_adjusted_to_latest_import));

      toast.success('Attendance report generated successfully');

      if (payload.auto_adjusted_to_latest_import) {
        toast.info('Date range automatically adjusted to the latest imported attendance period for richer insights.');
      }
    } catch (error) {
      console.error('Error generating attendance report:', error);
      toast.error(error.message || 'Failed to generate attendance report');
      setAttendanceData([]);
      setAttendanceStats(null);
      setAttendanceSummary([]);
      setAttendanceStatusTotals({});
      setAttendanceInsights([]);
      setAttendanceAutoAdjusted(false);
    } finally {
      setLoading(false);
    }
  };

  const generateEmployeePreview = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:8000/api/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      let employees = [];
      const payload = response.data;

      if (Array.isArray(payload)) {
        employees = payload;
      } else if (Array.isArray(payload?.data)) {
        employees = payload.data;
      } else if (Array.isArray(payload?.employees)) {
        employees = payload.employees;
      }

      const normalize = (value) => (value || '').toString().toLowerCase();
      const filterDepartment = normalize(filters.department);
      const filterPosition = normalize(filters.position);
      const filterStatus = normalize(filters.status);

      const filteredEmployees = employees.filter((employee) => {
        const profile = employee.employee_profile ?? employee;
        const department = normalize(profile?.department || profile?.dept);
        const position = normalize(profile?.position || employee.position);
        const status = normalize(profile?.status || employee.status);

        const matchesDepartment = filterDepartment ? department.includes(filterDepartment) : true;
        const matchesPosition = filterPosition ? position.includes(filterPosition) : true;
        const matchesStatus = filterStatus ? status.includes(filterStatus) : true;

        if (!matchesDepartment || !matchesPosition || !matchesStatus) {
          return false;
        }

        if (dateRange.startDate && dateRange.endDate) {
          const hireDateString = profile?.hire_date || profile?.date_hired || profile?.employment_date;
          if (hireDateString) {
            const hireDate = new Date(hireDateString);
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            if (!Number.isNaN(hireDate.getTime()) && (hireDate < start || hireDate > end)) {
              return false;
            }
          }
        }

        return true;
      });

      if (filteredEmployees.length === 0) {
        setEmployeeData([]);
        setEmployeeAnalytics(null);
        toast.info('No employees matched the selected filters.');
        return;
      }

      const analytics = buildEmployeeAnalytics(filteredEmployees);
      setEmployeeAnalytics(analytics);
      setEmployeeData(analytics.normalizedEmployees || filteredEmployees);

      toast.success('Employee report generated successfully');
    } catch (error) {
      console.error('Error generating employee report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate employee report');
      setEmployeeData([]);
      setEmployeeAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const generateLeavePreview = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const requestsResponse = await axios.get('http://localhost:8000/api/leave-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let leaves = [];
      const payload = requestsResponse.data;
      if (Array.isArray(payload)) {
        leaves = payload;
      } else if (Array.isArray(payload?.data)) {
        leaves = payload.data;
      }

      const normalize = (value) => (value || '').toString().toLowerCase();
      const filterDepartment = normalize(filters.department);
      const filterPosition = normalize(filters.position);
      const filterStatus = normalize(filters.status);

      const filteredLeaves = leaves.filter((leave) => {
        const employeeProfile = leave.employee?.employee_profile ?? leave.employee ?? {};
        const department = normalize(employeeProfile.department);
        const position = normalize(employeeProfile.position);
        const status = normalize(leave.status);

        const matchesDepartment = filterDepartment ? department.includes(filterDepartment) : true;
        const matchesPosition = filterPosition ? position.includes(filterPosition) : true;
        const matchesStatus = filterStatus ? status.includes(filterStatus) : true;

        if (!matchesDepartment || !matchesPosition || !matchesStatus) {
          return false;
        }

        if (dateRange.startDate && dateRange.endDate) {
          const fromDate = leave.from ? new Date(leave.from) : null;
          if (fromDate && (!Number.isNaN(fromDate.getTime()))) {
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            if (fromDate < start || fromDate > end) {
              return false;
            }
          }
        }

        return true;
      });

      if (filteredLeaves.length === 0) {
        setLeaveData([]);
        setLeaveAnalytics(null);
        toast.info('No leave requests matched the selected filters.');
        return;
      }

      const analytics = buildLeaveAnalytics(filteredLeaves);
      setLeaveAnalytics(analytics);
      setLeaveData(analytics.normalizedLeaves || filteredLeaves);

      toast.success('Leave report generated successfully');
    } catch (error) {
      console.error('Error generating leave report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate leave report');
      setLeaveData([]);
      setLeaveAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to download file
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Export Attendance Reports
  const exportAttendancePDF = async () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const leftMargin = margin;
      const rightMargin = pageWidth - margin;
      let currentY = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Enhanced Header Section with Background
      // Company Name Header - Professional Format (Centered with background)
      doc.setFillColor(44, 62, 80); // Dark blue-gray background
      doc.rect(0, 0, pageWidth, 25, 'F'); // Header background
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255); // White text
      const companyName = 'CABUYAO CONCRETE DEVELOPMENT CORPORATION';
      const companyNameWidth = doc.getTextWidth(companyName);
      doc.text(companyName, (pageWidth - companyNameWidth) / 2, 12);
      
      currentY = 30;
      
      // Report Title Section with accent
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 18, 'F');
      
      // Report Title (Left side)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 204); // Blue color
      const reportTitle = 'ATTENDANCE REPORT';
      doc.text(reportTitle, leftMargin + 3, currentY + 6);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Period Information (Right side of title box)
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const periodText = `Period: ${dateRange.startDate} to ${dateRange.endDate}`;
      const periodWidth = doc.getTextWidth(periodText);
      doc.text(periodText, rightMargin - periodWidth - 3, currentY + 6);
      
      // Generate Date (Right side of title box)
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const generatedText = `Generated: ${generatedDate}`;
      const generatedWidth = doc.getTextWidth(generatedText);
      doc.text(generatedText, rightMargin - generatedWidth - 3, currentY + 12);
      
      currentY += 22;

      // Prepare table data with proper formatting
      const tableData = attendanceData.map((item, index) => {
        const emp = item.employee || {};
        const dateStr = item.date ? formatDate(item.date) : 'N/A';
        const clockIn = item.clock_in ? formatTime(item.clock_in) : 'N/A';
        const clockOut = item.clock_out ? formatTime(item.clock_out) : 'N/A';
        const totalHours = item.total_hours !== undefined && item.total_hours !== null 
          ? `${Number(item.total_hours).toFixed(2)} hrs` 
          : 'N/A';
        
        return {
          index: index + 1,
          employeeId: emp.employee_id || emp.id || 'N/A',
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A',
          department: emp.department || 'N/A',
          position: emp.position || 'N/A',
          date: dateStr,
          clockIn: clockIn,
          clockOut: clockOut,
          totalHours: totalHours,
          status: item.status || 'N/A',
          remarks: item.remarks || ''
        };
      });

      // Summary Statistics Box (after tableData is created)
      const presentCount = tableData.filter(e => e.status.toLowerCase().includes('present')).length;
      const absentCount = tableData.filter(e => e.status.toLowerCase().includes('absent')).length;
      const lateCount = tableData.filter(e => e.status.toLowerCase().includes('late')).length;
      const onLeaveCount = tableData.filter(e => e.status.toLowerCase().includes('leave')).length;
      const totalRecords = tableData.length;
      const uniqueEmployees = new Set(tableData.map(e => e.employeeId)).size;
      
      doc.setFillColor(245, 247, 250); // Light gray background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 12, 'F');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SUMMARY:', leftMargin + 3, currentY + 5);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      const summaryText = `Total Records: ${totalRecords} | Employees: ${uniqueEmployees} | Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount} | On Leave: ${onLeaveCount}`;
      doc.text(summaryText, leftMargin + 35, currentY + 5);
      
      currentY += 16;

      // Draw header line
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.8);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      currentY += 6;

      // Table column definitions for landscape mode (total width: ~267mm to fit A4 landscape)
      // A4 landscape: 297mm wide, with 15mm margins = 267mm available
      const columns = [
        { header: '#', width: 10, align: 'center' },
        { header: 'Employee ID', width: 28, align: 'left' },
        { header: 'Employee Name', width: 45, align: 'left' },
        { header: 'Department', width: 32, align: 'left' },
        { header: 'Position', width: 32, align: 'left' },
        { header: 'Date', width: 25, align: 'left' },
        { header: 'Time In', width: 22, align: 'center' },
        { header: 'Time Out', width: 22, align: 'center' },
        { header: 'Total Hours', width: 20, align: 'center' },
        { header: 'Status', width: 35, align: 'center' }
      ];

      // Calculate column positions
      let colX = leftMargin;
      const colPositions = columns.map(col => {
        const pos = colX;
        colX += col.width;
        return pos;
      });
      
      // Ensure table fits within page width
      const totalTableWidth = colX - leftMargin;
      if (totalTableWidth > (rightMargin - leftMargin)) {
        // Adjust if needed - scale down proportionally
        const scaleFactor = (rightMargin - leftMargin) / totalTableWidth;
        columns.forEach(col => col.width *= scaleFactor);
        // Recalculate positions
        colX = leftMargin;
        columns.forEach((col, i) => {
          colPositions[i] = colX;
          colX += col.width;
        });
      }

      // Draw table header with solid black line
      const headerY = currentY;
      const headerTop = headerY - 6;
      const headerHeight = 10;
      const headerBottom = headerTop + headerHeight;
      const tableWidth = colPositions[colPositions.length - 1] + columns[columns.length - 1].width - leftMargin;
      
      doc.setFillColor(44, 62, 80); // Dark gray background
      doc.rect(leftMargin, headerTop, tableWidth, headerHeight, 'F');
      
      doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      
      // Draw header text
      columns.forEach((col, i) => {
        const cellX = colPositions[i];
        const textX = col.align === 'center' 
          ? cellX + (col.width / 2)
          : cellX + 3;
        const textY = headerY + 2;
        doc.text(col.header, textX, textY, { align: col.align === 'center' ? 'center' : 'left' });
      });
      
      // Draw vertical borders for header (will extend through rows later)
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, headerBottom);
        }
      });
      
      currentY = headerBottom;
      
      // Draw light gray line under header
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, currentY, leftMargin + tableWidth, currentY);
      currentY += 4;

      // Draw table rows with light gray dividers
        doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const rowHeight = 9;
      const cellPadding = 3;
      
      tableData.forEach((row, rowIndex) => {
        checkPageBreak(rowHeight + 2);
        
        const rowStartY = currentY;
        const rowEndY = currentY + rowHeight;
        
        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(leftMargin, rowStartY, tableWidth, rowHeight, 'F');
        }
        
        // Draw row data
        columns.forEach((col, colIndex) => {
          let cellValue = '';
          switch(col.header) {
            case '#':
              cellValue = String(row.index);
              break;
            case 'Employee ID':
              cellValue = String(row.employeeId);
              break;
            case 'Employee Name':
              cellValue = row.name;
              break;
            case 'Department':
              cellValue = row.department;
              break;
            case 'Position':
              cellValue = row.position;
              break;
            case 'Date':
              cellValue = row.date;
              break;
            case 'Time In':
              cellValue = row.clockIn;
              break;
            case 'Time Out':
              cellValue = row.clockOut;
              break;
            case 'Total Hours':
              cellValue = row.totalHours;
              break;
            case 'Status':
              cellValue = row.status;
              break;
          }
          
          // Truncate if too long (with more padding consideration)
          const maxWidth = col.width - (cellPadding * 2);
          const textWidth = doc.getTextWidth(cellValue);
          if (textWidth > maxWidth) {
            let truncated = cellValue;
            while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            cellValue = truncated + '...';
          }
          
          const cellX = colPositions[colIndex];
          const textX = col.align === 'center' 
            ? cellX + (col.width / 2)
            : cellX + cellPadding;
          const textY = currentY + 2;
          
          doc.text(cellValue, textX, textY, { 
            align: col.align === 'center' ? 'center' : 'left',
            maxWidth: col.width - (cellPadding * 2)
          });
        });
        
        // Draw vertical borders for this row (aligned with header borders)
        columns.forEach((col, colIndex) => {
          if (colIndex < columns.length - 1) {
            const borderX = colPositions[colIndex] + col.width;
            doc.setDrawColor(224, 224, 224);
            doc.setLineWidth(0.15);
            doc.line(borderX, rowStartY, borderX, rowEndY);
          }
        });
        
        // Draw horizontal divider line at bottom of row
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.2);
        doc.line(leftMargin, rowEndY, leftMargin + tableWidth, rowEndY);
        
        currentY = rowEndY;
      });
      
      const tableBottom = currentY;
      
      // Ensure vertical borders extend fully from header to table bottom
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(224, 224, 224);
          doc.setLineWidth(0.15);
          // Redraw vertical border from header top to table bottom
          doc.line(borderX, headerTop, borderX, tableBottom);
        }
      });

      // Footer with page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(128, 128, 128);
        const footerText = `Page ${i} of ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
      }

      const filename = `Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportAttendanceExcel = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Build professional Excel template structure
      const worksheetData = [
        // Header Section
        ['CABUYAO CONCRETE DEVELOPMENT CORPORATION'],
        [],
        ['ATTENDANCE REPORT'],
        [],
        ['Period:', `${dateRange.startDate} to ${dateRange.endDate}`],
        ['Generated on:', generatedDate],
        [],
        // Table Header
        ['#', 'Employee ID', 'Name', 'Department', 'Position', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Remarks']
      ];

      // Add data rows
      attendanceData.forEach((item, index) => {
        const emp = item.employee || {};
        const dateStr = item.date ? formatDate(item.date) : 'N/A';
        const clockIn = item.clock_in ? formatTime(item.clock_in) : 'N/A';
        const clockOut = item.clock_out ? formatTime(item.clock_out) : 'N/A';
        const totalHours = item.total_hours !== undefined && item.total_hours !== null 
          ? `${Number(item.total_hours).toFixed(2)} hrs` 
          : 'N/A';
        
        worksheetData.push([
          index + 1,
          emp.employee_id || emp.id || 'N/A',
          `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A',
          emp.department || 'N/A',
          emp.position || 'N/A',
          dateStr,
          clockIn,
          clockOut,
          totalHours,
          item.status || 'N/A',
          item.remarks || ''
        ]);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability - increased widths for all columns
      const colWidths = [
        { wch: 6 },   // #
        { wch: 18 },  // Employee ID (increased for visibility)
        { wch: 32 },  // Name (increased significantly for longer names)
        { wch: 22 },  // Department (increased for full visibility)
        { wch: 22 },  // Position (increased for full visibility)
        { wch: 14 },  // Date (increased for date format)
        { wch: 16 },  // Clock In (increased for time format)
        { wch: 16 },  // Clock Out (increased for time format)
        { wch: 14 },  // Total Hours (increased for "X.XX hrs" format)
        { wch: 18 },  // Status (increased for longer status text)
        { wch: 35 }   // Remarks (increased significantly for longer remarks)
      ];
      ws['!cols'] = colWidths;

      // Merge cells for header (company name and title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }); // Company name across all columns
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }); // Report title across all columns

      // Apply cell styles using XLSX's style support
      // Company name cell (A1) - larger font, pastel blue background
      const companyCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (!ws[companyCellRef]) ws[companyCellRef] = { t: 's', v: worksheetData[0][0] };
      ws[companyCellRef].s = {
        font: { name: 'Arial', sz: 18, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'B3D9FF' } }, // Soft pastel blue
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };

      // Report title cell (A3) - bold, slightly larger
      const titleCellRef = XLSX.utils.encode_cell({ r: 2, c: 0 });
      if (!ws[titleCellRef]) ws[titleCellRef] = { t: 's', v: worksheetData[2][0] };
      ws[titleCellRef].s = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0066CC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Table header row (row 7, index 7)
      const headerRowIndex = 7;
      const headerColumns = [
        { idx: 0, name: '#', bg: 'E8F4F8' },           // Light blue
        { idx: 1, name: 'Employee ID', bg: 'E8F4F8' }, // Light blue
        { idx: 2, name: 'Name', bg: 'E8F4F8' },        // Light blue
        { idx: 3, name: 'Department', bg: 'F0E8F8' },  // Light pastel purple
        { idx: 4, name: 'Position', bg: 'F0E8F8' },   // Light pastel purple
        { idx: 5, name: 'Date', bg: 'FFF8E8' },       // Light pastel yellow
        { idx: 6, name: 'Clock In', bg: 'FFF8E8' },    // Light pastel yellow
        { idx: 7, name: 'Clock Out', bg: 'FFF8E8' },   // Light pastel yellow
        { idx: 8, name: 'Total Hours', bg: 'E8F8E8' }, // Light pastel green
        { idx: 9, name: 'Status', bg: 'FFF8E8' },     // Light pastel yellow
        { idx: 10, name: 'Remarks', bg: 'FFE8E8' }    // Light pastel red
      ];

      headerColumns.forEach(col => {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col.idx });
        const cell = ws[cellRef];
        if (cell) {
          cell.s = {
            font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: col.bg } },
            alignment: { 
              horizontal: col.idx === 0 || col.idx === 8 ? 'center' : 'left', 
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } }
            }
          };
        }
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
      
      const filename = `Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const exportAttendanceCSV = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select a date range');
      return;
    }

    try {
      const params = {
        date_from: dateRange.startDate,
        date_to: dateRange.endDate,
      };

      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        params.status = filters.status;
      }

      const response = await axios.get('http://localhost:8000/api/attendance/export', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      const filename = `Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
      downloadFile(response.data, filename);
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    }
  };

  // Export Performance Reports
  const exportPerformancePDF = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select a date range');
      return;
    }

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

      const filename = `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      downloadFile(response.data, filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const exportPerformanceExcel = () => {
    if (!performanceData || performanceData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const worksheetData = [
        ['Employee ID', 'Name', 'Department', 'Position', 'Evaluation Period', 'Score', 'Status', 'Passed']
      ];

      performanceData.forEach(item => {
        const emp = item.employee?.employee_profile || item.employee || {};
        worksheetData.push([
          emp.employee_id || emp.id || 'N/A',
          `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A',
          emp.department || 'N/A',
          emp.position || 'N/A',
          item.evaluation_period_start ? `${item.evaluation_period_start} to ${item.evaluation_period_end || ''}` : 'N/A',
          (item.percentage_score || 0).toFixed(2) + '%',
          item.status || 'N/A',
          item.is_passed ? 'Yes' : 'No'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Performance Report');
      
      const filename = `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const exportPerformanceCSV = () => {
    if (!performanceData || performanceData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      let csv = 'Employee ID,Name,Department,Position,Evaluation Period,Score,Status,Passed\n';
      
      performanceData.forEach(item => {
        const emp = item.employee?.employee_profile || item.employee || {};
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A';
        const period = item.evaluation_period_start ? `${item.evaluation_period_start} to ${item.evaluation_period_end || ''}` : 'N/A';
        csv += `"${emp.employee_id || emp.id || 'N/A'}","${name}","${emp.department || 'N/A'}","${emp.position || 'N/A'}","${period}","${(item.percentage_score || 0).toFixed(2)}%","${item.status || 'N/A'}","${item.is_passed ? 'Yes' : 'No'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
      downloadFile(blob, filename);
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV');
    }
  };

  // Export Payroll Reports
  const exportPayrollPDF = async () => {
    if (!payrollData || payrollData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const leftMargin = margin;
      const rightMargin = pageWidth - margin;
      let currentY = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Enhanced Header Section with Background
      // Company Name Header - Professional Format (Centered with background)
      doc.setFillColor(44, 62, 80); // Dark blue-gray background
      doc.rect(0, 0, pageWidth, 25, 'F'); // Header background
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255); // White text
      const companyName = 'CABUYAO CONCRETE DEVELOPMENT CORPORATION';
      const companyNameWidth = doc.getTextWidth(companyName);
      doc.text(companyName, (pageWidth - companyNameWidth) / 2, 12);
      
      currentY = 30;
      
      // Report Title Section with accent
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 18, 'F');
      
      // Report Title (Left side)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 204); // Blue color
      const reportTitle = 'PAYROLL REPORT';
      doc.text(reportTitle, leftMargin + 3, currentY + 6);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Period Information (Right side of title box)
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const periodText = `Period: ${dateRange.startDate} to ${dateRange.endDate}`;
      const periodWidth = doc.getTextWidth(periodText);
      doc.text(periodText, rightMargin - periodWidth - 3, currentY + 6);
      
      // Generate Date (Right side of title box)
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const generatedText = `Generated: ${generatedDate}`;
      const generatedWidth = doc.getTextWidth(generatedText);
      doc.text(generatedText, rightMargin - generatedWidth - 3, currentY + 12);
      
      currentY += 22;

      // Helper function to format currency with comma separators
      const formatCurrency = (amount) => {
        return `PHP ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Prepare table data with proper formatting
      const tableData = payrollData.map((item, index) => {
        try {
          const employeeId = item.employee_id_number || item.employee_id || item.id || 'N/A';
          const employeeName = item.employee_name || 
            (item.employee ? `${item.employee.first_name || ''} ${item.employee.last_name || ''}`.trim() : '') ||
            'N/A';
          
          // Format status
          let statusText = item.status || 'Draft';
          if (statusText && typeof statusText === 'string') {
            statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
            const statusMap = {
              'draft': 'Draft',
              'pending': 'Pending',
              'processed': 'Processed',
              'paid': 'Paid'
            };
            statusText = statusMap[statusText.toLowerCase()] || statusText;
          }
          
          return {
            index: index + 1,
            employeeId: employeeId,
            name: employeeName,
            basicSalary: formatCurrency(item.basic_salary),
            overtimePay: formatCurrency(item.overtime_pay),
            grossPay: formatCurrency(item.gross_pay),
            deductions: formatCurrency(item.total_deductions),
            netPay: formatCurrency(item.net_pay),
            status: statusText || 'Draft'
          };
        } catch (err) {
          console.error(`Error processing row ${index}:`, err, item);
          return {
            index: index + 1,
            employeeId: 'Error',
            name: 'Error',
            basicSalary: 'Error',
            overtimePay: 'Error',
            grossPay: 'Error',
            deductions: 'Error',
            netPay: 'Error',
            status: 'Error'
          };
        }
      });

      // Summary Statistics Box (after tableData is created)
      const paidCount = tableData.filter(e => e.status.toLowerCase().includes('paid')).length;
      const processedCount = tableData.filter(e => e.status.toLowerCase().includes('processed')).length;
      const pendingCount = tableData.filter(e => e.status.toLowerCase().includes('pending')).length;
      const draftCount = tableData.filter(e => e.status.toLowerCase().includes('draft')).length;
      const totalEmployees = tableData.length;
      
      // Calculate totals
      const totalBasicSalary = tableData.reduce((sum, e) => {
        const val = parseFloat(String(e.basicSalary).replace('PHP ', '').replace(/,/g, '')) || 0;
        return sum + val;
      }, 0);
      const totalOvertimePay = tableData.reduce((sum, e) => {
        const val = parseFloat(String(e.overtimePay).replace('PHP ', '').replace(/,/g, '')) || 0;
        return sum + val;
      }, 0);
      const totalGrossPay = tableData.reduce((sum, e) => {
        const val = parseFloat(String(e.grossPay).replace('PHP ', '').replace(/,/g, '')) || 0;
        return sum + val;
      }, 0);
      const totalDeductions = tableData.reduce((sum, e) => {
        const val = parseFloat(String(e.deductions).replace('PHP ', '').replace(/,/g, '')) || 0;
        return sum + val;
      }, 0);
      const totalNetPay = tableData.reduce((sum, e) => {
        const val = parseFloat(String(e.netPay).replace('PHP ', '').replace(/,/g, '')) || 0;
        return sum + val;
      }, 0);
      
      // Summary box with better formatting
      const summaryBoxHeight = 24; // Increased height for better spacing
      doc.setFillColor(245, 247, 250); // Light gray background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), summaryBoxHeight, 'F');
      
      // Summary title
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SUMMARY', leftMargin + 3, currentY + 6);
      
      // Employee status summary (first line)
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      const statusSummary = `Total Employees: ${totalEmployees}  |  Paid: ${paidCount}  |  Processed: ${processedCount}  |  Pending: ${pendingCount}  |  Draft: ${draftCount}`;
      doc.text(statusSummary, leftMargin + 3, currentY + 12);
      
      // Financial summary (second line)
      const financialLine1 = `Gross Pay: ${formatCurrency(totalGrossPay)}  |  Net Pay: ${formatCurrency(totalNetPay)}`;
      doc.text(financialLine1, leftMargin + 3, currentY + 17);
      
      // Additional financial details (third line)
      const financialLine2 = `Basic Salary: ${formatCurrency(totalBasicSalary)}  |  OT Pay: ${formatCurrency(totalOvertimePay)}  |  Deductions: ${formatCurrency(totalDeductions)}`;
      doc.text(financialLine2, leftMargin + 3, currentY + 22);
      
      currentY += summaryBoxHeight + 4;

      // Draw header line
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.8);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      currentY += 6;

      // Table column definitions for landscape mode
      const columns = [
        { header: '#', width: 10, align: 'center' },
        { header: 'Employee ID', width: 28, align: 'left' },
        { header: 'Employee Name', width: 45, align: 'left' },
        { header: 'Basic Salary', width: 30, align: 'right' },
        { header: 'OT Pay', width: 28, align: 'right' },
        { header: 'Gross Pay', width: 30, align: 'right' },
        { header: 'Deductions', width: 30, align: 'right' },
        { header: 'Net Pay', width: 30, align: 'right' },
        { header: 'Status', width: 40, align: 'center' }
      ];

      // Calculate column positions
      let colX = leftMargin;
      const colPositions = columns.map(col => {
        const pos = colX;
        colX += col.width;
        return pos;
      });
      
      // Ensure table fits within page width
      const totalTableWidth = colX - leftMargin;
      if (totalTableWidth > (rightMargin - leftMargin)) {
        const scaleFactor = (rightMargin - leftMargin) / totalTableWidth;
        columns.forEach(col => col.width *= scaleFactor);
        colX = leftMargin;
        columns.forEach((col, i) => {
          colPositions[i] = colX;
          colX += col.width;
        });
      }

      // Draw table header with solid dark gray background
      const headerY = currentY;
      const headerTop = headerY - 6;
      const headerHeight = 10;
      const headerBottom = headerTop + headerHeight;
      const tableWidth = colPositions[colPositions.length - 1] + columns[columns.length - 1].width - leftMargin;
      
      doc.setFillColor(44, 62, 80); // Dark gray background
      doc.rect(leftMargin, headerTop, tableWidth, headerHeight, 'F');
      
      doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      
      // Draw header text
      columns.forEach((col, i) => {
        const cellX = colPositions[i];
        const textX = col.align === 'center' 
          ? cellX + (col.width / 2)
          : col.align === 'right'
          ? cellX + col.width - 3
          : cellX + 3;
        const textY = headerY + 2;
        doc.text(col.header, textX, textY, { align: col.align });
      });
      
      // Draw vertical borders for header
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, headerBottom);
        }
      });
      
      currentY = headerBottom;
      
      // Draw light gray line under header
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, currentY, leftMargin + tableWidth, currentY);
      currentY += 4;

      // Draw table rows with light gray dividers
        doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const rowHeight = 9;
      const cellPadding = 3;
      
      tableData.forEach((row, rowIndex) => {
        checkPageBreak(rowHeight + 2);
        
        const rowStartY = currentY;
        const rowEndY = currentY + rowHeight;
        
        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(leftMargin, rowStartY, tableWidth, rowHeight, 'F');
        }
        
        // Draw row data
        columns.forEach((col, colIndex) => {
          let cellValue = '';
          switch(col.header) {
            case '#':
              cellValue = String(row.index);
              break;
            case 'Employee ID':
              cellValue = String(row.employeeId);
              break;
            case 'Employee Name':
              cellValue = row.name;
              break;
            case 'Basic Salary':
              cellValue = row.basicSalary;
              break;
            case 'OT Pay':
              cellValue = row.overtimePay;
              break;
            case 'Gross Pay':
              cellValue = row.grossPay;
              break;
            case 'Deductions':
              cellValue = row.deductions;
              break;
            case 'Net Pay':
              cellValue = row.netPay;
              break;
            case 'Status':
              cellValue = row.status;
              break;
          }
          
          // Truncate if too long
          const maxWidth = col.width - (cellPadding * 2);
          const textWidth = doc.getTextWidth(cellValue);
          if (textWidth > maxWidth) {
            let truncated = cellValue;
            while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            cellValue = truncated + '...';
          }
          
          const cellX = colPositions[colIndex];
          const textX = col.align === 'center' 
            ? cellX + (col.width / 2)
            : col.align === 'right'
            ? cellX + col.width - cellPadding
            : cellX + cellPadding;
          const textY = currentY + 2;
          
          // Apply status color
          if (col.header === 'Status') {
            const statusLower = cellValue.toLowerCase();
            if (statusLower === 'paid') {
              doc.setTextColor(0, 128, 0); // Green
              doc.setFont(undefined, 'bold');
            } else if (statusLower === 'processed') {
              doc.setTextColor(0, 102, 204); // Blue
              doc.setFont(undefined, 'bold');
            } else if (statusLower === 'pending') {
              doc.setTextColor(255, 165, 0); // Orange
            } else if (statusLower === 'draft') {
              doc.setTextColor(128, 128, 128); // Gray
            }
          }
          
          doc.text(cellValue, textX, textY, { 
            align: col.align,
            maxWidth: col.width - (cellPadding * 2)
          });
          
          // Reset text color and font
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        });
        
        // Draw vertical borders for this row
        columns.forEach((col, colIndex) => {
          if (colIndex < columns.length - 1) {
            const borderX = colPositions[colIndex] + col.width;
            doc.setDrawColor(224, 224, 224);
            doc.setLineWidth(0.15);
            doc.line(borderX, rowStartY, borderX, rowEndY);
          }
        });
        
        // Draw horizontal divider line at bottom of row
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.2);
        doc.line(leftMargin, rowEndY, leftMargin + tableWidth, rowEndY);
        
        currentY = rowEndY;
      });
      
      const tableBottom = currentY;
      
      // Ensure vertical borders extend fully from header to table bottom
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(224, 224, 224);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, tableBottom);
        }
      });

      // Footer with page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(128, 128, 128);
        const footerText = `Page ${i} of ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
      }

      const filename = `Payroll_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportPayrollExcel = () => {
    if (!payrollData || payrollData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      // Calculate totals for summary
      const totals = payrollData.reduce((acc, item) => {
        acc.basicSalary += Number(item.basic_salary || 0);
        acc.overtimePay += Number(item.overtime_pay || 0);
        acc.grossPay += Number(item.gross_pay || 0);
        acc.deductions += Number(item.total_deductions || 0);
        acc.netPay += Number(item.net_pay || 0);
        return acc;
      }, { basicSalary: 0, overtimePay: 0, grossPay: 0, deductions: 0, netPay: 0 });

      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Build professional Excel template structure
      const worksheetData = [
        // Header Section
        ['CABUYAO CONCRETE DEVELOPMENT CORPORATION'],
        [],
        ['PAYROLL REPORT'],
        [],
        ['Period:', `${dateRange.startDate} to ${dateRange.endDate}`],
        ['Generated on:', generatedDate],
        [],
        // Table Header
        ['#', 'Employee ID', 'Employee Name', 'Department', 'Position', 'Period Start', 'Period End', 'Basic Salary', 'OT Pay', 'Gross Pay', 'Deductions', 'Net Pay', 'Status']
      ];

      // Add data rows
      payrollData.forEach((item, index) => {
        // Backend returns flat structure: employee_id_number, employee_name, department, position, etc.
        const employeeId = item.employee_id_number || item.employee_id || item.id || 'N/A';
        const employeeName = item.employee_name || 
          (item.employee ? `${item.employee.first_name || ''} ${item.employee.last_name || ''}`.trim() : '') ||
          'N/A';
        
        // Format status
        let statusText = item.status || 'Draft';
        if (statusText && typeof statusText === 'string') {
          statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
          const statusMap = {
            'draft': 'Draft',
            'pending': 'Pending',
            'processed': 'Processed',
            'paid': 'Paid'
          };
          statusText = statusMap[statusText.toLowerCase()] || statusText;
        }
        
        worksheetData.push([
          index + 1,
          employeeId,
          employeeName,
          item.department || 'N/A',
          item.position || 'N/A',
          item.period_start || 'N/A',
          item.period_end || 'N/A',
          Number(item.basic_salary || 0).toFixed(2),
          Number(item.overtime_pay || 0).toFixed(2),
          Number(item.gross_pay || 0).toFixed(2),
          Number(item.total_deductions || 0).toFixed(2),
          Number(item.net_pay || 0).toFixed(2),
          statusText || 'Draft'
        ]);
      });

      // Add summary section
      worksheetData.push([]);
      worksheetData.push(['SUMMARY']);
      worksheetData.push(['Total Basic Salary:', totals.basicSalary.toFixed(2)]);
      worksheetData.push(['Total OT Pay:', totals.overtimePay.toFixed(2)]);
      worksheetData.push(['Total Gross Pay:', totals.grossPay.toFixed(2)]);
      worksheetData.push(['Total Deductions:', totals.deductions.toFixed(2)]);
      worksheetData.push(['Total Net Pay:', totals.netPay.toFixed(2)]);
      worksheetData.push(['Total Employees:', payrollData.length]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability (increased widths for better text display)
      const colWidths = [
        { wch: 6 },   // # (slightly wider)
        { wch: 18 },  // Employee ID (increased from 15)
        { wch: 32 },  // Employee Name (increased from 25 for longer names)
        { wch: 22 },  // Department (increased from 20)
        { wch: 22 },  // Position (increased from 20)
        { wch: 14 },  // Period Start (increased from 12)
        { wch: 14 },  // Period End (increased from 12)
        { wch: 16 },  // Basic Salary (increased from 15)
        { wch: 14 },  // OT Pay (increased from 12)
        { wch: 16 },  // Gross Pay (increased from 15)
        { wch: 16 },  // Deductions (increased from 15)
        { wch: 16 },  // Net Pay (increased from 15)
        { wch: 14 }   // Status (increased from 12)
      ];
      ws['!cols'] = colWidths;

      // Merge cells for header (company name and title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }); // Company name across all columns
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 12 } }); // Report title across all columns

      // Apply cell styles using XLSX's style support
      // Note: XLSX has limited styling support, but we'll apply what's available
      
      // Company name cell (A1) - larger font, pastel blue background
      const companyCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (!ws[companyCellRef]) ws[companyCellRef] = { t: 's', v: worksheetData[0][0] };
      ws[companyCellRef].s = {
        font: { name: 'Arial', sz: 18, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'B3D9FF' } }, // Soft pastel blue
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };

      // Report title cell (A3) - bold, slightly larger
      const titleCellRef = XLSX.utils.encode_cell({ r: 2, c: 0 });
      if (!ws[titleCellRef]) ws[titleCellRef] = { t: 's', v: worksheetData[2][0] };
      ws[titleCellRef].s = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0066CC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Table header row (row 7, index 7)
      const headerRowIndex = 7;
      const headerColumns = [
        { idx: 0, name: '#', bg: 'E8F4F8' },           // Light blue
        { idx: 1, name: 'Employee ID', bg: 'E8F4F8' }, // Light blue
        { idx: 2, name: 'Employee Name', bg: 'E8F4F8' }, // Light blue
        { idx: 3, name: 'Department', bg: 'F0E8F8' }, // Light pastel purple
        { idx: 4, name: 'Position', bg: 'F0E8F8' },   // Light pastel purple
        { idx: 5, name: 'Period Start', bg: 'FFF8E8' }, // Light pastel yellow
        { idx: 6, name: 'Period End', bg: 'FFF8E8' },  // Light pastel yellow
        { idx: 7, name: 'Basic Salary', bg: 'E8F8E8' }, // Light pastel green
        { idx: 8, name: 'OT Pay', bg: 'E8F8E8' },      // Light pastel green
        { idx: 9, name: 'Gross Pay', bg: 'E8F8E8' },  // Light pastel green
        { idx: 10, name: 'Deductions', bg: 'FFE8E8' }, // Light pastel red
        { idx: 11, name: 'Net Pay', bg: 'E8F8E8' },    // Light pastel green
        { idx: 12, name: 'Status', bg: 'FFF8E8' }      // Light pastel yellow
      ];

      headerColumns.forEach(col => {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col.idx });
        const cell = ws[cellRef];
        if (cell) {
          cell.s = {
            font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: col.bg } },
            alignment: { 
              horizontal: col.idx === 0 ? 'center' : (col.idx >= 7 && col.idx <= 11 ? 'right' : 'left'), 
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } }
            }
          };
        }
      });

      // Style summary section
      const summaryStartRow = worksheetData.length - 7;
      const summaryLabelRef = XLSX.utils.encode_cell({ r: summaryStartRow, c: 0 });
      if (ws[summaryLabelRef]) {
        ws[summaryLabelRef].s = {
          font: { name: 'Arial', sz: 12, bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'FFE8E8' } }, // Light pastel red
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }

      // Style summary value rows
      for (let i = 1; i <= 6; i++) {
        const labelRef = XLSX.utils.encode_cell({ r: summaryStartRow + i, c: 0 });
        const valueRef = XLSX.utils.encode_cell({ r: summaryStartRow + i, c: 1 });
        
        if (ws[labelRef]) {
          ws[labelRef].s = {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'F8F8F8' } }, // Light gray
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        
        if (ws[valueRef]) {
          ws[valueRef].s = {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'F8F8F8' } }, // Light gray
            alignment: { horizontal: 'right', vertical: 'center' },
            numFmt: '#,##0.00' // Number format for currency
          };
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Report');
      
      const filename = `Payroll_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const exportPayrollCSV = () => {
    if (!payrollData || payrollData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      let csv = 'Employee ID,Name,Department,Position,Period Start,Period End,Basic Salary,OT Pay,Gross Pay,Deductions,Net Pay,Status\n';
      
      payrollData.forEach(item => {
        // Backend returns flat structure
        const employeeId = item.employee_id_number || item.employee_id || item.id || 'N/A';
        const employeeName = item.employee_name || 
          (item.employee ? `${item.employee.first_name || ''} ${item.employee.last_name || ''}`.trim() : '') ||
          'N/A';
        
        // Format status
        let statusText = item.status || 'Draft';
        if (statusText && typeof statusText === 'string') {
          statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
          const statusMap = {
            'draft': 'Draft',
            'pending': 'Pending',
            'processed': 'Processed',
            'paid': 'Paid'
          };
          statusText = statusMap[statusText.toLowerCase()] || statusText;
        }
        
        csv += `"${employeeId}","${employeeName}","${item.department || 'N/A'}","${item.position || 'N/A'}","${item.period_start || 'N/A'}","${item.period_end || 'N/A'}","${item.basic_salary || 0}","${item.overtime_pay || 0}","${item.gross_pay || 0}","${item.total_deductions || 0}","${item.net_pay || 0}","${statusText || 'Draft'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `Payroll_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
      downloadFile(blob, filename);
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV');
    }
  };

  // Export Employee Reports
  const exportEmployeePDF = async () => {
    if (!employeeData || employeeData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const leftMargin = margin;
      const rightMargin = pageWidth - margin;
      let currentY = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Enhanced Header Section with Background
      // Company Name Header - Professional Format (Centered with background)
      doc.setFillColor(44, 62, 80); // Dark blue-gray background
      doc.rect(0, 0, pageWidth, 25, 'F'); // Header background
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255); // White text
      const companyName = 'CABUYAO CONCRETE DEVELOPMENT CORPORATION';
      const companyNameWidth = doc.getTextWidth(companyName);
      doc.text(companyName, (pageWidth - companyNameWidth) / 2, 12);
      
      currentY = 30;
      
      // Report Title Section with accent
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 18, 'F');
      
      // Report Title (Left side)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 204); // Blue color
      const reportTitle = 'EMPLOYEE MASTER LIST';
      doc.text(reportTitle, leftMargin + 3, currentY + 6);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Period Information (Right side of title box)
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const periodText = dateRange.startDate && dateRange.endDate 
        ? `Period: ${dateRange.startDate} to ${dateRange.endDate}`
        : 'Period: All Records';
      const periodWidth = doc.getTextWidth(periodText);
      doc.text(periodText, rightMargin - periodWidth - 3, currentY + 6);
      
      // Generate Date (Right side of title box)
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const generatedText = `Generated: ${generatedDate}`;
      const generatedWidth = doc.getTextWidth(generatedText);
      doc.text(generatedText, rightMargin - generatedWidth - 3, currentY + 12);
      
      currentY += 22;

      // Helper function to format currency with comma separators
      const formatCurrency = (amount) => {
        return `PHP ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Prepare table data with proper formatting and correct data access
      const tableData = employeeData.map((item, index) => {
        // Access employee profile - handle both normalized and raw data
        const profile = item.employee_profile || item;
        
        // Employee ID: from employee_profile.employee_id (the actual employee ID like "EM1234")
        const employeeId = profile.employee_id || profile.id || 'N/A';
        
        // Name: from employee profile
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || 'N/A';
        
        // Department and Position
        const department = profile.department || 'N/A';
        const position = profile.position || 'N/A';
        
        // Email
        const email = profile.email || 'N/A';
        
        // Employment Status
        const employmentStatus = profile.employment_status || 'N/A';
        
        // Status
        let statusText = profile.status || 'Active';
        if (statusText && typeof statusText === 'string') {
          statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
        }
        
        // Hire Date
        const hireDate = profile.hire_date ? formatDate(profile.hire_date) : 'N/A';
        
        // Salary - format with comma separators for thousands
        const salary = profile.salary ? formatCurrency(profile.salary) : 'N/A';
        
        return {
          index: index + 1,
          employeeId: employeeId,
          name: name,
          department: department,
          position: position,
          email: email,
          employmentStatus: employmentStatus,
          status: statusText,
          hireDate: hireDate,
          salary: salary
        };
      });

      // Summary Statistics Box (after tableData is created)
      const activeCount = tableData.filter(e => e.status.toLowerCase().includes('active')).length;
      const totalCount = tableData.length;
      const departmentsCount = new Set(tableData.map(e => e.department)).size;
      
      doc.setFillColor(245, 247, 250); // Light gray background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 12, 'F');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SUMMARY:', leftMargin + 3, currentY + 5);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      const summaryText = `Total Employees: ${totalCount} | Active: ${activeCount} | Departments: ${departmentsCount}`;
      doc.text(summaryText, leftMargin + 35, currentY + 5);
      
      currentY += 16;

      // Draw header line
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.8);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      currentY += 6;

      // Table column definitions for landscape mode
      const columns = [
        { header: '#', width: 10, align: 'center' },
        { header: 'Employee ID', width: 22, align: 'left' },
        { header: 'Employee Name', width: 34, align: 'left' },
        { header: 'Department', width: 26, align: 'left' },
        { header: 'Position', width: 32, align: 'left' }, // Increased width for Position
        { header: 'Email', width: 45, align: 'left' }, // Increased width for Email
        { header: 'Employment Status', width: 30, align: 'left' },
        { header: 'Status', width: 18, align: 'center' },
        { header: 'Hire Date', width: 22, align: 'left' },
        { header: 'Salary', width: 32, align: 'right' }
      ];

      // Calculate column positions
      let colX = leftMargin;
      const colPositions = columns.map(col => {
        const pos = colX;
        colX += col.width;
        return pos;
      });
      
      // Ensure table fits within page width
      const totalTableWidth = colX - leftMargin;
      if (totalTableWidth > (rightMargin - leftMargin)) {
        // Adjust if needed - scale down proportionally
        const scaleFactor = (rightMargin - leftMargin) / totalTableWidth;
        columns.forEach(col => col.width *= scaleFactor);
        // Recalculate positions
        colX = leftMargin;
        columns.forEach((col, i) => {
          colPositions[i] = colX;
          colX += col.width;
        });
      }

      // Draw table header with solid dark gray background
      const headerY = currentY;
      const headerTop = headerY - 6;
      const headerHeight = 10;
      const headerBottom = headerTop + headerHeight;
      const tableWidth = colPositions[colPositions.length - 1] + columns[columns.length - 1].width - leftMargin;
      
      doc.setFillColor(44, 62, 80); // Dark gray background (#2c3e80)
      doc.rect(leftMargin, headerTop, tableWidth, headerHeight, 'F');
      
      doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      
      // Draw header text
      columns.forEach((col, i) => {
        const cellX = colPositions[i];
        const textX = col.align === 'center' 
          ? cellX + (col.width / 2)
          : col.align === 'right'
          ? cellX + col.width - 3
          : cellX + 3;
        const textY = headerY + 2;
        doc.text(col.header, textX, textY, { align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left' });
      });
      
      // Draw vertical borders for header
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, headerBottom);
        }
      });
      
      currentY = headerBottom;
      
      // Draw light gray line under header
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, currentY, leftMargin + tableWidth, currentY);
      currentY += 4;

      // Draw table rows with light gray dividers
        doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const rowHeight = 9;
      const cellPadding = 3;
      
      tableData.forEach((row, rowIndex) => {
        checkPageBreak(rowHeight + 2);
        
        const rowStartY = currentY;
        const rowEndY = currentY + rowHeight;
        
        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(leftMargin, rowStartY, tableWidth, rowHeight, 'F');
        }
        
        // Draw row data
        columns.forEach((col, colIndex) => {
          let cellValue = '';
          switch(col.header) {
            case '#':
              cellValue = String(row.index);
              break;
            case 'Employee ID':
              cellValue = String(row.employeeId);
              break;
            case 'Employee Name':
              cellValue = row.name;
              break;
            case 'Department':
              cellValue = row.department;
              break;
            case 'Position':
              cellValue = row.position;
              break;
            case 'Email':
              cellValue = row.email;
              break;
            case 'Employment Status':
              cellValue = row.employmentStatus;
              break;
            case 'Status':
              cellValue = row.status;
              break;
            case 'Hire Date':
              cellValue = row.hireDate;
              break;
            case 'Salary':
              cellValue = row.salary;
              break;
          }
          
          // Truncate if too long
          const maxWidth = col.width - (cellPadding * 2);
          const textWidth = doc.getTextWidth(cellValue);
          if (textWidth > maxWidth) {
            let truncated = cellValue;
            while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            cellValue = truncated + '...';
          }
          
          const cellX = colPositions[colIndex];
          const textX = col.align === 'center' 
            ? cellX + (col.width / 2)
            : col.align === 'right'
            ? cellX + col.width - cellPadding
            : cellX + cellPadding;
          const textY = currentY + 2;
          
          doc.text(cellValue, textX, textY, { 
            align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
            maxWidth: col.width - (cellPadding * 2)
          });
        });
        
        // Draw vertical borders for this row
        columns.forEach((col, colIndex) => {
          if (colIndex < columns.length - 1) {
            const borderX = colPositions[colIndex] + col.width;
            doc.setDrawColor(224, 224, 224);
            doc.setLineWidth(0.15);
            doc.line(borderX, rowStartY, borderX, rowEndY);
          }
        });
        
        // Draw horizontal divider line at bottom of row
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.2);
        doc.line(leftMargin, rowEndY, leftMargin + tableWidth, rowEndY);
        
        currentY = rowEndY;
      });
      
      const tableBottom = currentY;
      
      // Ensure vertical borders extend fully from header to table bottom
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(224, 224, 224);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, tableBottom);
        }
      });

      // Footer with page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(128, 128, 128);
        const footerText = `Page ${i} of ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
      }

      const filename = `Employee_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportEmployeeExcel = () => {
    if (!employeeData || employeeData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      // Header rows for formal template
      const worksheetData = [
        [], // Empty row for spacing
        ['CABUYAO CONCRETE DEVELOPMENT CORPORATION'], // Company name
        ['EMPLOYEE MASTER LIST'], // Report title
        [], // Empty row
        [
          `Period: ${dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} to ${dateRange.endDate}` : 'All Records'}`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
        ],
        [], // Empty row
        ['Employee ID', 'Name', 'Department', 'Position', 'Email', 'Employment Status', 'Status', 'Hire Date', 'Salary', 'Contact Number']
      ];

      employeeData.forEach(item => {
        const profile = item.employee_profile || item;
        worksheetData.push([
          profile.employee_id || profile.id || 'N/A',
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
          profile.department || 'N/A',
          profile.position || 'N/A',
          profile.email || 'N/A',
          profile.employment_status || 'N/A',
          profile.status || 'Active',
          profile.hire_date || 'N/A',
          profile.salary || 0,
          profile.contact_number || profile.phone || 'N/A' // Check both contact_number and phone
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability - increased widths for all columns
      const colWidths = [
        { wch: 18 },  // Employee ID (increased for visibility)
        { wch: 32 },  // Name (increased significantly for longer names)
        { wch: 22 },  // Department (increased for full visibility)
        { wch: 28 },  // Position (increased for full visibility)
        { wch: 35 },  // Email (increased for longer email addresses)
        { wch: 22 },  // Employment Status (increased for visibility)
        { wch: 15 },  // Status (increased slightly)
        { wch: 18 },  // Hire Date (increased for date format)
        { wch: 18 },  // Salary (increased for currency values)
        { wch: 20 }   // Contact Number (increased for phone numbers)
      ];
      ws['!cols'] = colWidths;

      // Style header rows (company name and title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }); // Company name across all columns
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }); // Report title across all columns
      ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }); // Period row
      ws['!merges'].push({ s: { r: 4, c: 8 }, e: { r: 4, c: 9 } }); // Generated date row

      // Apply styling to header cells
      const companyNameCell = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })];
      if (companyNameCell) {
        companyNameCell.s = {
          font: { name: 'Arial', sz: 18, bold: true },
          fill: { fgColor: { rgb: 'B3D9FF' } }, // Pastel blue background
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      const reportTitleCell = ws[XLSX.utils.encode_cell({ r: 2, c: 0 })];
      if (reportTitleCell) {
        reportTitleCell.s = {
          font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0066CC' } }, // Blue text
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Style table header row (row 6, index 6)
      for (let c = 0; c < 10; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 6, c });
        const cell = ws[cellRef];
        if (cell) {
          cell.s = {
            font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '2c3e80' } }, // Dark blue-gray background
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }

      // Apply category-based pastel backgrounds to data rows
      employeeData.forEach((item, index) => {
        const rowIndex = 7 + index; // Start from row 7 (after header row 6)
        
        for (let c = 0; c < 10; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
          const cell = ws[cellRef];
          if (cell) {
            let bgColor = 'FFFFFF'; // Default white
            
            // Category-based backgrounds
            if (c === 0 || c === 1) {
              // Employee ID and Name - Light blue
              bgColor = 'E6F3FF';
            } else if (c === 2 || c === 3) {
              // Department and Position - Pastel purple
              bgColor = 'E6E6FA';
            } else if (c === 4) {
              // Email - Pastel yellow
              bgColor = 'FFFACD';
            } else if (c === 5 || c === 6) {
              // Employment Status and Status - Pastel green
              bgColor = 'E6FFE6';
            } else if (c === 7) {
              // Hire Date - Pastel orange
              bgColor = 'FFE6CC';
            } else if (c === 8) {
              // Salary - Pastel blue
              bgColor = 'CCE5FF';
            } else if (c === 9) {
              // Contact Number - Pastel pink
              bgColor = 'FFE6F0';
            }
            
            cell.s = {
              fill: { fgColor: { rgb: bgColor } },
              border: {
                top: { style: 'thin', color: { rgb: 'E0E0E0' } },
                bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
                left: { style: 'thin', color: { rgb: 'E0E0E0' } },
                right: { style: 'thin', color: { rgb: 'E0E0E0' } }
              }
            };
          }
        }
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Report');
      
      const filename = `Employee_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const exportEmployeeCSV = () => {
    if (!employeeData || employeeData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      let csv = 'Employee ID,Name,Department,Position,Email,Employment Status,Status,Hire Date,Salary,Contact Number\n';
      
      employeeData.forEach(item => {
        const profile = item.employee_profile || item;
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A';
        csv += `"${profile.employee_id || profile.id || 'N/A'}","${name}","${profile.department || 'N/A'}","${profile.position || 'N/A'}","${profile.email || 'N/A'}","${profile.employment_status || 'N/A'}","${profile.status || 'Active'}","${profile.hire_date || 'N/A'}","${profile.salary || 0}","${profile.contact_number || 'N/A'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `Employee_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.csv`;
      downloadFile(blob, filename);
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV');
    }
  };

  // Export Leave Reports
  const exportLeavePDF = async () => {
    if (!leaveData || leaveData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const leftMargin = margin;
      const rightMargin = pageWidth - margin;
      let currentY = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Enhanced Header Section with Background
      // Company Name Header - Professional Format (Centered with background)
      doc.setFillColor(44, 62, 80); // Dark blue-gray background
      doc.rect(0, 0, pageWidth, 25, 'F'); // Header background
      
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255); // White text
      const companyName = 'CABUYAO CONCRETE DEVELOPMENT CORPORATION';
      const companyNameWidth = doc.getTextWidth(companyName);
      doc.text(companyName, (pageWidth - companyNameWidth) / 2, 12);
      
      currentY = 30;
      
      // Report Title Section with accent
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 18, 'F');
      
      // Report Title (Left side)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 102, 204); // Blue color
      const reportTitle = 'LEAVE REPORT';
      doc.text(reportTitle, leftMargin + 3, currentY + 6);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Period Information (Right side of title box)
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const periodText = dateRange.startDate && dateRange.endDate 
        ? `Period: ${dateRange.startDate} to ${dateRange.endDate}`
        : 'Period: All Records';
      const periodWidth = doc.getTextWidth(periodText);
      doc.text(periodText, rightMargin - periodWidth - 3, currentY + 6);
      
      // Generate Date (Right side of title box)
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const generatedText = `Generated: ${generatedDate}`;
      const generatedWidth = doc.getTextWidth(generatedText);
      doc.text(generatedText, rightMargin - generatedWidth - 3, currentY + 12);
      
      currentY += 22;

      // Helper function to format dates as MM/DD/YY
      const formatDateMMDDYY = (value) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return 'N/A';
        }
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}/${day}/${year}`;
      };

      // Prepare table data with proper formatting and correct data access
      const tableData = leaveData.map((item, index) => {
        // Access employee profile properly - handle both camelCase and snake_case
        // Laravel may serialize as employee_profile (snake_case) or employeeProfile (camelCase)
        const employeeProfile = item.employee?.employee_profile || item.employee?.employeeProfile || {};
        const employee = item.employee || {};
        
        // Employee ID: from employee_profile.employee_id (the actual employee ID like "EM1234")
        // This is the proper employee ID, not the user ID
        // Fallback to employee.id (user ID) if profile doesn't exist
        const employeeId = employeeProfile.employee_id || employee.id || item.employee_id || 'N/A';
        
        // Department: try item.department (direct on leave_requests), then employee profile, then employee
        const department = item.department || employeeProfile.department || employee.department || 'N/A';
        
        // Position: from employee profile (it's stored there)
        // This is the key field that was showing as N/A
        const position = employeeProfile.position || 'N/A';
        
        // Name: from employee profile first, then employee (User model)
        const firstName = employeeProfile.first_name || employee.first_name || '';
        const lastName = employeeProfile.last_name || employee.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || item.employee_name || 'N/A';
        
        // Leave Type: use item.type (not leave_type)
        const leaveType = item.type || item.leave_type || 'N/A';
        
        // Format dates as MM/DD/YY
        const fromDate = item.from ? formatDateMMDDYY(item.from) : 'N/A';
        const toDate = item.to ? formatDateMMDDYY(item.to) : 'N/A';
        
        // Format status (capitalize first letter)
        let statusText = item.status || 'N/A';
        if (statusText !== 'N/A' && typeof statusText === 'string') {
          statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
          // Map common status values
          const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'manager_approved': 'Manager Approved',
            'manager_rejected': 'Manager Rejected'
          };
          statusText = statusMap[statusText.toLowerCase()] || statusText;
        }
        
        return {
          index: index + 1,
          employeeId: employeeId,
          name: name,
          department: department,
          position: position,
          leaveType: leaveType,
          from: fromDate,
          to: toDate,
          days: item.total_days || 0,
          status: statusText,
          reason: item.reason || ''
        };
      });

      // Summary Statistics Box (after tableData is created) - Leave specific
      const approvedCount = tableData.filter(e => e.status.toLowerCase().includes('approved')).length;
      const pendingCount = tableData.filter(e => e.status.toLowerCase().includes('pending')).length;
      const rejectedCount = tableData.filter(e => e.status.toLowerCase().includes('rejected')).length;
      const managerApprovedCount = tableData.filter(e => e.status.toLowerCase().includes('manager approved')).length;
      const managerRejectedCount = tableData.filter(e => e.status.toLowerCase().includes('manager rejected')).length;
      const totalRequests = tableData.length;
      const uniqueEmployees = new Set(tableData.map(e => e.employeeId)).size;
      
      // Calculate total leave days
      const totalDays = tableData.reduce((sum, e) => {
        const days = Number(e.days) || 0;
        return sum + days;
      }, 0);
      
      // Get unique leave types
      const leaveTypes = new Set(tableData.map(e => e.leaveType).filter(t => t && t !== 'N/A'));
      
      doc.setFillColor(245, 247, 250); // Light gray background
      doc.rect(leftMargin, currentY, pageWidth - (margin * 2), 18, 'F');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SUMMARY:', leftMargin + 3, currentY + 5);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      const summaryText = `Total Requests: ${totalRequests} | Employees: ${uniqueEmployees} | Total Days: ${totalDays}`;
      doc.text(summaryText, leftMargin + 35, currentY + 5);
      
      // Status summary on second line
      const statusText = `Approved: ${approvedCount} | Manager Approved: ${managerApprovedCount} | Pending: ${pendingCount} | Rejected: ${rejectedCount} | Manager Rejected: ${managerRejectedCount}`;
      doc.text(statusText, leftMargin + 35, currentY + 10);
      
      // Leave types summary on third line
      const leaveTypesText = `Leave Types: ${leaveTypes.size > 0 ? Array.from(leaveTypes).join(', ') : 'N/A'}`;
      doc.text(leaveTypesText, leftMargin + 35, currentY + 15);
      
      currentY += 22;

      // Draw header line
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.8);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      currentY += 6;

      // Table column definitions for landscape mode
      const columns = [
        { header: '#', width: 10, align: 'center' },
        { header: 'Employee ID', width: 25, align: 'left' },
        { header: 'Employee Name', width: 35, align: 'left' },
        { header: 'Department', width: 28, align: 'left' },
        { header: 'Position', width: 28, align: 'left' },
        { header: 'Leave Type', width: 32, align: 'left' }, // Increased width for Leave Type
        { header: 'From', width: 22, align: 'left' },
        { header: 'To', width: 22, align: 'left' },
        { header: 'Days', width: 15, align: 'center' },
        { header: 'Status', width: 25, align: 'center' },
        { header: 'Reason', width: 48, align: 'left' } // Slightly reduced to accommodate Leave Type increase
      ];

      // Calculate column positions
      let colX = leftMargin;
      const colPositions = columns.map(col => {
        const pos = colX;
        colX += col.width;
        return pos;
      });
      
      // Ensure table fits within page width
      const totalTableWidth = colX - leftMargin;
      if (totalTableWidth > (rightMargin - leftMargin)) {
        // Adjust if needed - scale down proportionally
        const scaleFactor = (rightMargin - leftMargin) / totalTableWidth;
        columns.forEach(col => col.width *= scaleFactor);
        // Recalculate positions
        colX = leftMargin;
        columns.forEach((col, i) => {
          colPositions[i] = colX;
          colX += col.width;
        });
      }

      // Draw table header with solid dark gray background
      const headerY = currentY;
      const headerTop = headerY - 6;
      const headerHeight = 10;
      const headerBottom = headerTop + headerHeight;
      const tableWidth = colPositions[colPositions.length - 1] + columns[columns.length - 1].width - leftMargin;
      
      doc.setFillColor(44, 62, 80); // Dark gray background (#2c3e80)
      doc.rect(leftMargin, headerTop, tableWidth, headerHeight, 'F');
      
      doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      
      // Draw header text
      columns.forEach((col, i) => {
        const cellX = colPositions[i];
        const textX = col.align === 'center' 
          ? cellX + (col.width / 2)
          : cellX + 3;
        const textY = headerY + 2;
        doc.text(col.header, textX, textY, { align: col.align === 'center' ? 'center' : 'left' });
      });
      
      // Draw vertical borders for header
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, headerBottom);
        }
      });
      
      currentY = headerBottom;
      
      // Draw light gray line under header
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, currentY, leftMargin + tableWidth, currentY);
      currentY += 4;

      // Draw table rows with light gray dividers
        doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const rowHeight = 9;
      const cellPadding = 3;
      
      tableData.forEach((row, rowIndex) => {
        checkPageBreak(rowHeight + 2);
        
        const rowStartY = currentY;
        const rowEndY = currentY + rowHeight;
        
        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(leftMargin, rowStartY, tableWidth, rowHeight, 'F');
        }
        
        // Draw row data
        columns.forEach((col, colIndex) => {
          let cellValue = '';
          switch(col.header) {
            case '#':
              cellValue = String(row.index);
              break;
            case 'Employee ID':
              cellValue = String(row.employeeId);
              break;
            case 'Employee Name':
              cellValue = row.name;
              break;
            case 'Department':
              cellValue = row.department;
              break;
            case 'Position':
              cellValue = row.position;
              break;
            case 'Leave Type':
              cellValue = row.leaveType;
              break;
            case 'From':
              cellValue = row.from;
              break;
            case 'To':
              cellValue = row.to;
              break;
            case 'Days':
              cellValue = String(row.days);
              break;
            case 'Status':
              cellValue = row.status;
              break;
            case 'Reason':
              cellValue = row.reason;
              break;
          }
          
          // Truncate if too long
          const maxWidth = col.width - (cellPadding * 2);
          const textWidth = doc.getTextWidth(cellValue);
          if (textWidth > maxWidth) {
            let truncated = cellValue;
            while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1);
            }
            cellValue = truncated + '...';
          }
          
          const cellX = colPositions[colIndex];
          const textX = col.align === 'center' 
            ? cellX + (col.width / 2)
            : cellX + cellPadding;
          const textY = currentY + 2;
          
          // Apply status color coding
          if (col.header === 'Status') {
            const statusLower = cellValue.toLowerCase();
            if (statusLower.includes('approved')) {
              doc.setTextColor(34, 139, 34); // Green for approved
              doc.setFont(undefined, 'bold');
            } else if (statusLower.includes('rejected')) {
              doc.setTextColor(220, 53, 69); // Red for rejected
            } else if (statusLower.includes('pending')) {
              doc.setTextColor(255, 193, 7); // Orange for pending
            } else {
              doc.setTextColor(0, 0, 0); // Black for others
            }
          } else {
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
          }
          
          doc.text(cellValue, textX, textY, { 
            align: col.align === 'center' ? 'center' : 'left',
            maxWidth: col.width - (cellPadding * 2)
          });
          
          // Reset text color and font
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        });
        
        // Draw vertical borders for this row
        columns.forEach((col, colIndex) => {
          if (colIndex < columns.length - 1) {
            const borderX = colPositions[colIndex] + col.width;
            doc.setDrawColor(224, 224, 224);
            doc.setLineWidth(0.15);
            doc.line(borderX, rowStartY, borderX, rowEndY);
          }
        });
        
        // Draw horizontal divider line at bottom of row
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.2);
        doc.line(leftMargin, rowEndY, leftMargin + tableWidth, rowEndY);
        
        currentY = rowEndY;
      });
      
      const tableBottom = currentY;
      
      // Ensure vertical borders extend fully from header to table bottom
      columns.forEach((col, i) => {
        if (i < columns.length - 1) {
          const borderX = colPositions[i] + col.width;
          doc.setDrawColor(224, 224, 224);
          doc.setLineWidth(0.15);
          doc.line(borderX, headerTop, borderX, tableBottom);
        }
      });

      // Footer with page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(128, 128, 128);
        const footerText = `Page ${i} of ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
      }

      const filename = `Leave_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportLeaveExcel = () => {
    if (!leaveData || leaveData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      const generatedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Build professional Excel template structure
      const worksheetData = [
        // Header Section
        ['CABUYAO CONCRETE DEVELOPMENT CORPORATION'],
        [],
        ['LEAVE REPORT'],
        [],
        ['Period:', dateRange.startDate && dateRange.endDate 
          ? `${dateRange.startDate} to ${dateRange.endDate}`
          : 'All Records'],
        ['Generated on:', generatedDate],
        [],
        // Table Header
        ['#', 'Employee ID', 'Employee Name', 'Department', 'Position', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Reason', 'Terms']
      ];

      // Add data rows with proper data access
      leaveData.forEach((item, index) => {
        // Access employee profile properly - handle both camelCase and snake_case
        const employeeProfile = item.employee?.employee_profile || item.employee?.employeeProfile || {};
        const employee = item.employee || {};
        
        // Employee ID: from employee_profile.employee_id (the actual employee ID like "EM1234")
        const employeeId = employeeProfile.employee_id || employee.id || item.employee_id || 'N/A';
        
        // Department: try item.department (direct on leave_requests), then employee profile
        const department = item.department || employeeProfile.department || employee.department || 'N/A';
        
        // Position: from employee profile
        const position = employeeProfile.position || 'N/A';
        
        // Name: from employee profile first, then employee (User model)
        const firstName = employeeProfile.first_name || employee.first_name || '';
        const lastName = employeeProfile.last_name || employee.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || item.employee_name || 'N/A';
        
        // Leave Type: use item.type (not leave_type)
        const leaveType = item.type || item.leave_type || 'N/A';
        
        // Format dates
        const fromDate = item.from ? formatDate(item.from) : 'N/A';
        const toDate = item.to ? formatDate(item.to) : 'N/A';
        
        // Format status
        let statusText = item.status || 'N/A';
        if (statusText !== 'N/A' && typeof statusText === 'string') {
          statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
          const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'manager_approved': 'Manager Approved',
            'manager_rejected': 'Manager Rejected'
          };
          statusText = statusMap[statusText.toLowerCase()] || statusText;
        }
        
        // Terms
        const terms = item.terms || 'N/A';
        
        worksheetData.push([
          index + 1,
          employeeId,
          name,
          department,
          position,
          leaveType,
          fromDate,
          toDate,
          item.total_days || 0,
          statusText,
          item.reason || 'N/A',
          terms
        ]);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability - increased widths for all columns
      const colWidths = [
        { wch: 6 },   // #
        { wch: 18 },  // Employee ID (increased for visibility)
        { wch: 32 },  // Employee Name (increased significantly for longer names)
        { wch: 22 },  // Department (increased for full visibility)
        { wch: 22 },  // Position (increased for full visibility)
        { wch: 20 },  // Leave Type (increased for longer leave type names)
        { wch: 14 },  // From (increased for date format)
        { wch: 14 },  // To (increased for date format)
        { wch: 10 },  // Days (sufficient for numbers)
        { wch: 18 },  // Status (increased for longer status text)
        { wch: 40 },  // Reason (significantly increased for longer reasons)
        { wch: 16 }   // Terms (increased for "with PAY" / "without PAY")
      ];
      ws['!cols'] = colWidths;

      // Merge cells for header (company name and title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }); // Company name across all columns
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 11 } }); // Report title across all columns

      // Apply cell styles using XLSX's style support
      // Company name cell (A1) - larger font, pastel blue background
      const companyCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (!ws[companyCellRef]) ws[companyCellRef] = { t: 's', v: worksheetData[0][0] };
      ws[companyCellRef].s = {
        font: { name: 'Arial', sz: 18, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'B3D9FF' } }, // Soft pastel blue
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };

      // Report title cell (A3) - bold, slightly larger
      const titleCellRef = XLSX.utils.encode_cell({ r: 2, c: 0 });
      if (!ws[titleCellRef]) ws[titleCellRef] = { t: 's', v: worksheetData[2][0] };
      ws[titleCellRef].s = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0066CC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Table header row (row 7, index 7)
      const headerRowIndex = 7;
      const headerColumns = [
        { idx: 0, name: '#', bg: 'E8F4F8' },           // Light blue
        { idx: 1, name: 'Employee ID', bg: 'E8F4F8' }, // Light blue
        { idx: 2, name: 'Employee Name', bg: 'E8F4F8' }, // Light blue
        { idx: 3, name: 'Department', bg: 'F0E8F8' },  // Light pastel purple
        { idx: 4, name: 'Position', bg: 'F0E8F8' },   // Light pastel purple
        { idx: 5, name: 'Leave Type', bg: 'FFF8E8' },  // Light pastel yellow
        { idx: 6, name: 'From', bg: 'FFF8E8' },       // Light pastel yellow
        { idx: 7, name: 'To', bg: 'FFF8E8' },         // Light pastel yellow
        { idx: 8, name: 'Days', bg: 'E8F8E8' },       // Light pastel green
        { idx: 9, name: 'Status', bg: 'FFF8E8' },     // Light pastel yellow
        { idx: 10, name: 'Reason', bg: 'FFE8E8' },    // Light pastel red
        { idx: 11, name: 'Terms', bg: 'E8F8E8' }      // Light pastel green
      ];

      headerColumns.forEach(col => {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col.idx });
        const cell = ws[cellRef];
        if (cell) {
          cell.s = {
            font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: col.bg } },
            alignment: { 
              horizontal: col.idx === 0 || col.idx === 8 ? 'center' : 'left', 
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } }
            }
          };
        }
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leave Report');
      
      const filename = `Leave_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const exportLeaveCSV = () => {
    if (!leaveData || leaveData.length === 0) {
      toast.error('Please generate the report first');
      return;
    }

    try {
      let csv = 'Employee ID,Name,Department,Position,Leave Type,From,To,Total Days,Status,Reason,Terms\n';
      
      leaveData.forEach(item => {
        const emp = item.employee?.employee_profile || item.employee || {};
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A';
        csv += `"${emp.employee_id || emp.id || 'N/A'}","${name}","${emp.department || 'N/A'}","${emp.position || 'N/A'}","${item.leave_type || 'N/A'}","${item.from || 'N/A'}","${item.to || 'N/A'}","${item.total_days || 0}","${item.status || 'N/A'}","${(item.reason || 'N/A').replace(/"/g, '""')}","${item.terms || 'N/A'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `Leave_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.csv`;
      downloadFile(blob, filename);
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV');
    }
  };

  // Main export handler
  const handleGenerateReport = (format) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      if (reportType !== 'employee' && reportType !== 'leave') {
        toast.error('Please select a date range');
        return;
      }
    }

    switch (reportType) {
      case 'attendance':
        if (format === 'pdf') exportAttendancePDF();
        else if (format === 'excel') exportAttendanceExcel();
        else if (format === 'csv') exportAttendanceCSV();
        break;
      
      case 'performance':
        if (format === 'pdf') exportPerformancePDF();
        else if (format === 'excel') exportPerformanceExcel();
        else if (format === 'csv') exportPerformanceCSV();
        break;
      
      case 'payroll':
        if (format === 'pdf') exportPayrollPDF();
        else if (format === 'excel') exportPayrollExcel();
        else if (format === 'csv') exportPayrollCSV();
        break;
      
      case 'employee':
        if (format === 'pdf') exportEmployeePDF();
        else if (format === 'excel') exportEmployeeExcel();
        else if (format === 'csv') exportEmployeeCSV();
        break;
      
      case 'leave':
        if (format === 'pdf') exportLeavePDF();
        else if (format === 'excel') exportLeaveExcel();
        else if (format === 'csv') exportLeaveCSV();
        break;
      
      default:
        toast.info('Export not available for this report type');
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
        <td
          className="text-end"
          style={{ padding: '1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(payroll.basic_salary)}
        </td>
        <td
          className="text-end"
          style={{ padding: '1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(payroll.overtime_pay)}
        </td>
        <td
          className="text-end"
          style={{ padding: '1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(payroll.total_deductions)}
        </td>
        <td
          className="text-end fw-semibold text-success"
          style={{ padding: '1rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(payroll.net_pay)}
        </td>
      </tr>
    ));
  };

  const renderAttendanceReport = () => {
    if (loading) {
      return (
        <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
          <td colSpan="6" style={{ 
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '0.875rem',
            fontWeight: '500',
            borderRight: 'none'
          }}>
            Generating attendance insights...
          </td>
        </tr>
      );
    }

    if (!attendanceData || attendanceData.length === 0) {
      return (
        <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
          <td colSpan="6" style={{ 
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '0.875rem',
            fontWeight: '500',
            borderRight: 'none'
          }}>
            No attendance records found for the selected criteria.
          </td>
        </tr>
      );
    }

    return attendanceData.map((record, index) => {
      const employee = record.employee || {};
      const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_id || 'Employee';
      const netHours =
        record.total_hours !== undefined && record.total_hours !== null
          ? `${Number(record.total_hours).toFixed(2)} hrs`
          : '—';

      return (
        <tr
          key={record.id || `${employee.employee_id}-${record.date}-${index}`}
          style={{ 
            cursor: 'pointer',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
          }}
          title="View detailed attendance for this employee"
          onClick={() => openEmployeeAttendanceDetail(employee)}
        >
          <td style={{ 
            padding: '0.875rem 1rem', 
            fontWeight: '500', 
            color: '#495057',
            textAlign: 'left',
            fontSize: '0.875rem',
            borderRight: '1px solid #e0e0e0',
            verticalAlign: 'middle'
          }}>{index + 1}</td>
          <td style={{ 
            padding: '0.875rem 1rem',
            borderRight: '1px solid #e0e0e0',
            verticalAlign: 'middle'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: '#212529',
              fontSize: '0.875rem',
              marginBottom: '0.25rem',
              lineHeight: '1.4'
            }}>{employeeName}</div>
            <div style={{ 
              color: '#6c757d',
              fontSize: '0.75rem',
              lineHeight: '1.3'
            }}>
              <span style={{ fontWeight: '500' }}>ID: {(employee.employee_id || employee.id || '—')}</span>
              {(employee.department || employee.position) && (
                <span style={{ marginLeft: '0.5rem', color: '#adb5bd' }}>
                  • {employee.department || 'No Department'}
                  {employee.position ? ` • ${employee.position}` : ''}
                </span>
              )}
            </div>
          </td>
          <td style={{ 
            padding: '0.875rem 1rem',
            borderRight: '1px solid #e0e0e0',
            verticalAlign: 'middle'
          }}>
            <div style={{ 
              fontWeight: '500', 
              color: '#212529',
              fontSize: '0.875rem',
              lineHeight: '1.4'
            }}>{formatDate(record.date)}</div>
            {record.remarks && (
              <div style={{ 
                color: '#6c757d',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontStyle: 'italic',
                lineHeight: '1.3'
              }}>Note: {record.remarks}</div>
            )}
          </td>
          <td style={{ 
            padding: '0.875rem 1rem',
            textAlign: 'center',
            borderRight: '1px solid #e0e0e0',
            verticalAlign: 'middle'
          }}>
            <Badge
              bg={getAttendanceBadgeVariant(record.status)}
              className="fw-semibold text-uppercase"
              style={{ 
                fontSize: '0.6875rem', 
                letterSpacing: '0.03em',
                padding: '0.375rem 0.625rem',
                fontWeight: '600'
              }}
            >
              {record.status || 'No Record'}
            </Badge>
          </td>
          <td style={{ 
            padding: '0.875rem 1rem',
            textAlign: 'center',
            borderRight: '1px solid #e0e0e0',
            verticalAlign: 'middle'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: '#212529',
              fontSize: '0.875rem',
              marginBottom: '0.125rem',
              lineHeight: '1.4'
            }}>{formatTime(record.clock_in)}</div>
            {record.break_out && (
              <div style={{ 
                color: '#6c757d',
                fontSize: '0.75rem',
                lineHeight: '1.3'
              }}>Break: {formatTime(record.break_out)}</div>
            )}
          </td>
          <td style={{ 
            padding: '0.875rem 1rem',
            textAlign: 'center',
            verticalAlign: 'middle'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: '#212529',
              fontSize: '0.875rem',
              marginBottom: '0.125rem',
              lineHeight: '1.4'
            }}>{formatTime(record.clock_out)}</div>
            {record.break_in && (
              <div style={{ 
                color: '#6c757d',
                fontSize: '0.75rem',
                marginBottom: '0.125rem',
                lineHeight: '1.3'
              }}>Resume: {formatTime(record.break_in)}</div>
            )}
            <div style={{ 
              color: '#495057',
              fontSize: '0.75rem',
              fontWeight: '500',
              marginTop: '0.25rem',
              paddingTop: '0.25rem',
              borderTop: '1px solid #e9ecef',
              lineHeight: '1.3'
            }}>Total: {netHours}</div>
          </td>
        </tr>
      );
    });
  };

  const renderLeaveReport = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            Loading leave data...
          </td>
        </tr>
      );
    }

    if (!leaveData || leaveData.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            No leave requests found for the selected criteria.
          </td>
        </tr>
      );
    }

    return leaveData.map((leave, index) => {
      const normalized = leave.__normalized ?? {};
      const employeeProfile = leave.employee?.employee_profile ?? leave.employee ?? {};
      const name = `${employeeProfile.first_name || ''} ${employeeProfile.last_name || ''}`.trim() || leave.employee_name || 'Employee';
      const leaveType = normalized.leaveType || leave.type || 'Not Specified';
      const startDate = normalized.fromDate ? formatDate(normalized.fromDate) : formatDate(leave.from);
      const endDate = normalized.toDate ? formatDate(normalized.toDate) : formatDate(leave.to);
      const statusVariant = getLeaveStatusVariant(normalized.status || leave.status);

      return (
        <tr key={leave.id || index} style={{ borderBottom: '1px solid #e9ecef' }}>
          <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{index + 1}</td>
          <td style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{name}</div>
            <div className="text-muted small">{employeeProfile.employee_id || 'ID N/A'}</div>
          </td>
          <td style={{ padding: '1rem' }}>{leaveType}</td>
          <td style={{ padding: '1rem' }}>{startDate}</td>
          <td style={{ padding: '1rem' }}>{endDate}</td>
          <td style={{ padding: '1rem' }}>
            <Badge
              bg={statusVariant}
              text={statusVariant === 'light' ? 'dark' : 'light'}
              className="fw-semibold text-uppercase"
            >
              {leave.status || 'Unknown'}
            </Badge>
          </td>
        </tr>
      );
    });
  };

  const renderEmployeeReport = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="7" className="text-center text-muted py-4">
            Loading employee data...
          </td>
        </tr>
      );
    }

    if (!employeeData || employeeData.length === 0) {
      return (
        <tr>
          <td colSpan="7" className="text-center text-muted py-4">
            No employee data found for the selected criteria.
          </td>
        </tr>
      );
    }

    return employeeData.map((employee, index) => {
      const profile = employee.employee_profile ?? employee;
      const fullName = `${profile?.first_name || employee.first_name || ''} ${profile?.last_name || employee.last_name || ''}`.trim() || employee.name || 'Employee';
      const department = employee.__normalized?.department || profile?.department || profile?.dept || 'Unassigned';
      const position = employee.__normalized?.position || profile?.position || employee.position || 'Not Specified';
      const status = employee.__normalized?.statusLabel || profile?.status || employee.status || 'Unknown';
      const hireDate = profile?.hire_date || profile?.date_hired || profile?.employment_date || null;
      let tenureMonths = employee.__normalized?.tenureMonths;

      if ((tenureMonths === null || tenureMonths === undefined) && hireDate) {
        const hire = new Date(hireDate);
        if (!Number.isNaN(hire.getTime())) {
          const now = new Date();
          tenureMonths = Math.max(0, (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth()));
        }
      }

      const statusVariant = getEmployeeStatusVariant(status);

      return (
        <tr key={employee.id || profile?.id || index} style={{ borderBottom: '1px solid #e9ecef' }}>
          <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{index + 1}</td>
          <td style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{fullName}</div>
            <div className="text-muted small">{profile?.employee_id || employee.employee_id || 'ID N/A'}</div>
          </td>
          <td style={{ padding: '1rem' }}>{department}</td>
          <td style={{ padding: '1rem' }}>{position}</td>
          <td style={{ padding: '1rem' }}>
            <Badge
              bg={statusVariant}
              text={statusVariant === 'light' ? 'dark' : 'light'}
              className="fw-semibold text-uppercase"
            >
              {status}
            </Badge>
          </td>
          <td style={{ padding: '1rem' }}>{hireDate ? formatDate(hireDate) : 'N/A'}</td>
          <td style={{ padding: '1rem' }}>{formatTenure(tenureMonths)}</td>
        </tr>
      );
    });
  };

  const buildEmployeeAnalytics = (employees) => {
    const now = new Date();
    const totals = {
      total: employees.length,
      active: 0,
      inactive: 0,
      probation: 0,
      resigned: 0,
      terminated: 0,
      onLeave: 0,
      averageTenureMonths: 0,
      newHires: 0,
    };

    const departmentMap = new Map();
    const positionMap = new Map();
    const statusMap = new Map();
    const tenureBrackets = {
      '<1 year': 0,
      '1-3 years': 0,
      '3-5 years': 0,
      '5+ years': 0,
    };

    const normalizedEmployees = employees.map((employee) => {
      const profile = employee.employee_profile ?? employee;
      const department = (profile?.department || profile?.dept || 'Unassigned').trim() || 'Unassigned';
      const position = (profile?.position || employee.position || 'Not Specified').trim() || 'Not Specified';
      const rawStatus = (profile?.status || employee.status || '').toString().trim() || 'Unknown';
      const status = rawStatus.toLowerCase();

      const hireDateString = profile?.hire_date || profile?.date_hired || profile?.employment_date;
      const hireDate = hireDateString ? new Date(hireDateString) : null;
      let tenureMonths = 0;
      if (hireDate && !Number.isNaN(hireDate.getTime())) {
        tenureMonths = Math.max(0, (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth()));
      }

      // Update totals
      if (status.includes('active')) totals.active += 1;
      else if (status.includes('terminated')) totals.terminated += 1;
      else if (status.includes('resigned')) totals.resigned += 1;
      else if (status.includes('probation')) totals.probation += 1;
      else if (status.includes('leave')) totals.onLeave += 1;
      else totals.inactive += 1;

      if (hireDate && (now - hireDate) / (1000 * 60 * 60 * 24) <= 90) {
        totals.newHires += 1;
      }

      totals.averageTenureMonths += tenureMonths;

      const tenureYears = tenureMonths / 12;
      if (tenureYears < 1) tenureBrackets['<1 year'] += 1;
      else if (tenureYears < 3) tenureBrackets['1-3 years'] += 1;
      else if (tenureYears < 5) tenureBrackets['3-5 years'] += 1;
      else tenureBrackets['5+ years'] += 1;

      departmentMap.set(department, (departmentMap.get(department) || 0) + 1);
      positionMap.set(position, (positionMap.get(position) || 0) + 1);
      statusMap.set(rawStatus || 'Unknown', (statusMap.get(rawStatus || 'Unknown') || 0) + 1);

      return {
        ...employee,
        __normalized: {
          department,
          position,
          statusLabel: rawStatus || 'Unknown',
          tenureMonths,
          hireDate,
        },
      };
    });

    if (totals.total > 0) {
      totals.averageTenureMonths = totals.averageTenureMonths / totals.total;
    }

    const departments = Array.from(departmentMap.entries()).map(([label, count]) => ({ label, count }));
    const positions = Array.from(positionMap.entries()).map(([label, count]) => ({ label, count }));
    const statusDistribution = Array.from(statusMap.entries()).map(([label, count], index) => ({
      label,
      count,
      color: ['#4caf50', '#dc3545', '#ffc107', '#17a2b8', '#6c757d', '#6610f2'][index % 6],
    }));
    const tenureDistribution = Object.entries(tenureBrackets).map(([label, count]) => ({ label, count }));

    const sortedByTenure = [...normalizedEmployees]
      .filter((emp) => emp.__normalized.tenureMonths > 0)
      .sort((a, b) => b.__normalized.tenureMonths - a.__normalized.tenureMonths)
      .slice(0, 5);

    const recentHires = [...normalizedEmployees]
      .filter((emp) => emp.__normalized.hireDate)
      .sort((a, b) => b.__normalized.hireDate - a.__normalized.hireDate)
      .slice(0, 5);

    const insights = [];
    if (departments.length > 0) {
      const topDepartment = departments.reduce((prev, current) => (current.count > prev.count ? current : prev));
      insights.push(`${topDepartment.count} employees work in ${topDepartment.label}, making it the largest department.`);
    }

    if (totals.newHires > 0) {
      insights.push(`Welcomed ${totals.newHires} new hire${totals.newHires > 1 ? 's' : ''} in the last 90 days.`);
    }

    if (totals.terminated + totals.resigned > 0) {
      const attritionRate = ((totals.terminated + totals.resigned) / Math.max(totals.total, 1)) * 100;
      insights.push(`Attrition indicators: ${totals.resigned} resigned and ${totals.terminated} terminated employees (${attritionRate.toFixed(1)}% of headcount).`);
    }

    const tenureYearsAvg = totals.averageTenureMonths / 12;
    if (tenureYearsAvg) {
      insights.push(`Average tenure sits at ${tenureYearsAvg.toFixed(1)} years.`);
    }

    return {
      totals,
      departments,
      positions,
      statusDistribution,
      tenureDistribution,
      topTenureEmployees: sortedByTenure,
      recentHires,
      insights,
      normalizedEmployees,
    };
  };

  const employeeSummaryMetrics = useMemo(() => {
    if (!employeeAnalytics) {
      return [];
    }

    const { totals } = employeeAnalytics;
    const tenureYears = totals.averageTenureMonths / 12;

    return [
      {
        label: 'Total Employees',
        value: totals.total,
        variant: 'primary',
      },
      {
        label: 'Active Employees',
        value: totals.active,
        variant: 'success',
      },
      {
        label: 'Average Tenure',
        value: `${tenureYears.toFixed(1)} yrs`,
        variant: 'info',
      },
      {
        label: 'New Hires (90 days)',
        value: totals.newHires,
        variant: 'warning',
      },
    ];
  }, [employeeAnalytics]);

  const employeeOverviewInsights = useMemo(() => {
    if (!employeeAnalytics || !employeeAnalytics.insights) {
      return [];
    }

    return employeeAnalytics.insights;
  }, [employeeAnalytics]);

  const leaveSummaryMetrics = useMemo(() => {
    if (!leaveAnalytics) {
      return [];
    }

    const { totals, averageDuration, upcomingCount, approvalRate } = leaveAnalytics;

    return [
      {
        label: 'Total Requests',
        value: totals.total,
        variant: 'primary',
      },
      {
        label: 'Approval Rate',
        value: `${approvalRate.toFixed(1)}%`,
        variant: approvalRate >= 75 ? 'success' : approvalRate >= 50 ? 'warning' : 'danger',
      },
      {
        label: 'Average Duration',
        value: `${averageDuration.toFixed(1)} days`,
        variant: 'info',
      },
      {
        label: 'Upcoming Leaves',
        value: upcomingCount,
        variant: 'warning',
      },
    ];
  }, [leaveAnalytics]);

  const leaveOverviewInsights = useMemo(() => {
    if (!leaveAnalytics) {
      return [];
    }

    return leaveAnalytics.insights || [];
  }, [leaveAnalytics]);

  const attendanceOverviewInsights = useMemo(() => attendanceInsights || [], [attendanceInsights]);

  const buildLeaveAnalytics = (leaves) => {
    const now = new Date();
    const totals = {
      total: leaves.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      managerApproved: 0,
      managerRejected: 0,
    };

    const typeMap = new Map();
    const departmentMap = new Map();

    let totalDuration = 0;
    let longestLeave = null;
    let shortestLeave = null;

    const normalizedLeaves = leaves.map((leave) => {
      const employeeProfile = leave.employee?.employee_profile ?? leave.employee ?? {};
      const department = employeeProfile.department || 'Unassigned';
      const position = employeeProfile.position || 'Not Specified';
      const status = (leave.status || 'unknown').toLowerCase();
      const leaveType = leave.type || 'Not Specified';

      const fromDate = leave.from ? new Date(leave.from) : null;
      const toDate = leave.to ? new Date(leave.to) : null;

      let durationDays = Number(leave.total_days ?? 0);
      if ((!durationDays || durationDays <= 0) && fromDate && toDate) {
        durationDays = Math.max(1, Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
      }

      if (status.includes('pending')) totals.pending += 1;
      else if (status.includes('approved') && status.includes('manager')) totals.managerApproved += 1;
      else if (status.includes('manager') && status.includes('rejected')) totals.managerRejected += 1;
      else if (status.includes('approved')) totals.approved += 1;
      else if (status.includes('rejected')) totals.rejected += 1;

      typeMap.set(leaveType, (typeMap.get(leaveType) || 0) + 1);
      departmentMap.set(department, (departmentMap.get(department) || 0) + 1);

      totalDuration += durationDays;

      if (!longestLeave || durationDays > longestLeave.durationDays) {
        longestLeave = { leave, durationDays };
      }

      if (!shortestLeave || durationDays < shortestLeave.durationDays) {
        shortestLeave = { leave, durationDays };
      }

      const isUpcoming = fromDate && fromDate >= now;

      return {
        ...leave,
        __normalized: {
          department,
          position,
          status,
          leaveType,
          durationDays,
          fromDate,
          toDate,
          isUpcoming,
        },
      };
    });

    const typeDistribution = Array.from(typeMap.entries()).map(([label, count], index) => ({
      label,
      count,
      color: ['#4caf50', '#dc3545', '#ffc107', '#17a2b8', '#6c757d', '#6610f2', '#20c997'][index % 7],
    }));

    const departmentDistribution = Array.from(departmentMap.entries()).map(([label, count]) => ({
      label,
      count,
    }));

    const statusDistribution = [
      { label: 'Approved', count: totals.approved + totals.managerApproved, color: '#28a745' },
      { label: 'Pending', count: totals.pending, color: '#ffc107' },
      { label: 'Rejected', count: totals.rejected + totals.managerRejected, color: '#dc3545' },
    ];

    const upcomingLeaves = normalizedLeaves
      .filter((item) => item.__normalized.isUpcoming)
      .sort((a, b) => a.__normalized.fromDate - b.__normalized.fromDate)
      .slice(0, 6);

    const averageDuration = totals.total > 0 ? totalDuration / totals.total : 0;
    const approvalRate = totals.total > 0 ? ((totals.approved + totals.managerApproved) / totals.total) * 100 : 0;

    const insights = [];

    if (typeDistribution.length > 0) {
      const topType = typeDistribution.reduce((prev, current) => (current.count > prev.count ? current : prev));
      insights.push(`${topType.label} is the most requested leave type (${topType.count} requests).`);
    }

    if (approvalRate > 0) {
      insights.push(`Approval rate stands at ${approvalRate.toFixed(1)}%, with ${totals.pending} request${totals.pending === 1 ? '' : 's'} pending.`);
    }

    if (longestLeave) {
      const leave = longestLeave.leave;
      const name = leave.employee?.employee_profile?.first_name ? `${leave.employee.employee_profile.first_name} ${leave.employee.employee_profile.last_name}` : leave.employee_name || 'An employee';
      insights.push(`${name} filed the longest leave at ${longestLeave.durationDays} day${longestLeave.durationDays > 1 ? 's' : ''} (${leave.type}).`);
    }

    if (shortestLeave) {
      const leave = shortestLeave.leave;
      const name = leave.employee?.employee_profile?.first_name ? `${leave.employee.employee_profile.first_name} ${leave.employee.employee_profile.last_name}` : leave.employee_name || 'An employee';
      insights.push(`${name}'s ${leave.type} was the shortest at ${shortestLeave.durationDays} day${shortestLeave.durationDays > 1 ? 's' : ''}.`);
    }

    if (upcomingLeaves.length > 0) {
      insights.push(`${upcomingLeaves.length} upcoming leave${upcomingLeaves.length > 1 ? 's are' : ' is'} scheduled within the selected period.`);
    }

    return {
      totals: {
        ...totals,
      },
      averageDuration,
      approvalRate,
      upcomingCount: upcomingLeaves.length,
      typeDistribution,
      statusDistribution,
      departmentDistribution,
      upcomingLeaves,
      normalizedLeaves,
      insights,
    };
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
                    {(departments.length > 0 ? departments : fallbackDepartments).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
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
                    {(positions.length > 0 ? positions : fallbackPositions).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
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
                    {reportType === 'performance' && (
                      <>
                        <option value="all">All Status</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                      </>
                    )}
                    {reportType === 'attendance' && (
                      <>
                        <option value="">All Status</option>
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Absent">Absent</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Holiday (Worked)">Holiday (Worked)</option>
                        <option value="Holiday (No Work)">Holiday (No Work)</option>
                        <option value="Overtime">Overtime</option>
                        <option value="Undertime">Undertime</option>
                      </>
                    )}
                    {reportType === 'payroll' && (
                      <>
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on-leave">On Leave</option>
                      </>
                    )}
                    {reportType === 'leave' && (
                      <>
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="manager_approved">Manager Approved</option>
                        <option value="manager_rejected">Manager Rejected</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </>
                    )}
                    {reportType === 'employee' && (
                      <>
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="probation">Probationary</option>
                        <option value="resigned">Resigned</option>
                        <option value="terminated">Terminated</option>
                        <option value="leave">On Leave</option>
                      </>
                    )}
                    {reportType !== 'performance' &&
                      reportType !== 'attendance' &&
                      reportType !== 'payroll' &&
                      reportType !== 'employee' && <option value="">All Status</option>}
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
      
      {reportType === 'performance' && statistics && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header
            className="text-white"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              padding: '1.25rem',
            }}
          >
            <h5 className="mb-0 d-flex align-items-center">
              <FaChartLine className="me-2" />
              Performance Overview
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 mb-4">
              {performanceSummaryMetrics.map((metric) => (
                <Col key={metric.label} xs={12} md={6} lg={3}>
                  <Card className={`h-100 border-0 shadow-sm bg-opacity-10 bg-${metric.variant}`} style={{ borderRadius: '14px' }}>
                    <Card.Body className="d-flex flex-column">
                      <span className="text-uppercase small fw-semibold text-muted mb-1">{metric.label}</span>
                      <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>{metric.value}</div>
                      <span className="small text-muted mt-auto">Derived from current performance preview.</span>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-4">
              <Col xs={12} lg={5}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Pass vs Fail</h6>
                    <div className="d-flex justify-content-center">
                      <div style={{ height: '220px', width: '220px' }}>
                        <canvas ref={passFailChartRef}></canvas>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="badge bg-success bg-opacity-10 text-success me-2 fw-semibold">Passed: {statistics.passed_count}</span>
                      <span className="badge bg-danger bg-opacity-10 text-danger fw-semibold">Failed: {statistics.failed_count}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={7}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Snapshot</h6>
                    <Row className="g-2">
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">Evaluations Reviewed</div>
                          <div className="h5 mb-0 text-primary fw-bold">{statistics.total_evaluations ?? aggregatedPerformance?.length ?? 0}</div>
                        </div>
                      </Col>
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">Average Score</div>
                          <div className="h5 mb-0 text-warning fw-bold">{Number(statistics.average_percentage ?? 0).toFixed(2)}%</div>
                        </div>
                      </Col>
                    </Row>
                    {performanceOverviewInsights.length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-uppercase text-muted fw-semibold mb-2">Insights</h6>
                        <ul className="mb-0 ps-3">
                          {performanceOverviewInsights.map((item, idx) => (
                            <li key={`perf-overview-insight-${idx}`} className="mb-1 text-muted small">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
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

      {reportType === 'attendance' && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header
            className="text-white"
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              padding: '1.25rem',
            }}
          >
            <h5 className="mb-0 d-flex align-items-center">
              <FaChartLine className="me-2" />
              Attendance Overview
            </h5>
          </Card.Header>
          <Card.Body>
            {attendanceStats ? (
              <>
                <Row className="g-3 mb-4">
                  {attendanceMetrics.map((metric) => (
                    <Col key={metric.label} xs={12} md={6} lg={3}>
                      <Card className={`h-100 border-0 shadow-sm bg-opacity-10 bg-${metric.variant}`} style={{ borderRadius: '14px' }}>
                        <Card.Body className="d-flex flex-column">
                          <span className="text-uppercase small fw-semibold text-muted mb-1">{metric.label}</span>
                          <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>{metric.value}</div>
                          <span className="small text-muted mt-auto">{metric.details}</span>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Row className="g-4">
                  <Col xs={12} lg={4}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-uppercase text-muted fw-semibold mb-3">Attendance Mix</h6>
                        <div className="d-flex flex-column align-items-stretch">
                          <div className="d-flex justify-content-center">
                            {attendanceMix.length > 0 ? (
                              <div style={{ height: '200px', width: '200px' }}>
                                <canvas ref={attendanceDistributionChartRef}></canvas>
                              </div>
                            ) : (
                              <div className="text-muted small d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                                Generate a preview to visualize attendance mix.
                              </div>
                            )}
                          </div>
                          {attendanceMix.length > 0 && (
                            <div className="mt-3">
                              {attendanceMix.map((item, idx) => (
                                <div key={`attendance-mix-item-${idx}`} className="d-flex align-items-center mb-2">
                                  <span
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '3px',
                                      backgroundColor: item.color,
                                      marginRight: '8px',
                                      display: 'inline-block',
                                    }}
                                  ></span>
                                  <span className="text-muted small flex-grow-1">{item.label}</span>
                                  <span className="fw-semibold small" style={{ color: '#1f2937' }}>{item.percentage}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12} lg={8}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="text-uppercase text-muted fw-semibold mb-0">Daily Trend</h6>
                          <span className="small text-muted">
                            Present vs Absent vs Late across the selected range
                          </span>
                        </div>
                        <div style={{ height: '260px' }}>
                          {attendanceSummary.length > 0 ? (
                            <canvas ref={attendanceTrendChartRef}></canvas>
                          ) : (
                            <div className="text-muted small d-flex align-items-center justify-content-center h-100">
                              No daily summary data found for the selected window.
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {attendanceInsights.length > 0 && (
                  <div className="mt-4">
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Insights & Recommendations</h6>
                    <ul className="mb-0 ps-3">
                      {attendanceInsights.map((insight, idx) => (
                        <li key={`attendance-insight-${idx}`} className="mb-2 text-muted">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted py-5">
                Generate a preview to see attendance analytics and insights.
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {reportType === 'leave' && leaveData && leaveData.length > 0 && leaveAnalytics && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header
            className="text-white"
            style={{
              background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              padding: '1.25rem',
            }}
          >
            <h5 className="mb-0 d-flex align-items-center">
              <FaCalendarAlt className="me-2" />
              Leave Overview
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 mb-4">
              {leaveSummaryMetrics.map((metric) => (
                <Col key={metric.label} xs={12} md={6} lg={3}>
                  <Card className={`h-100 border-0 shadow-sm bg-opacity-10 bg-${metric.variant}`} style={{ borderRadius: '14px' }}>
                    <Card.Body className="d-flex flex-column">
                      <span className="text-uppercase small fw-semibold text-muted mb-1">{metric.label}</span>
                      <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>{metric.value}</div>
                      <span className="small text-muted mt-auto">Updated from current leave preview.</span>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-4">
              <Col xs={12} lg={5}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Status Distribution</h6>
                    <div className="d-flex justify-content-center">
                      <div style={{ height: '200px', width: '200px' }}>
                        <canvas ref={leaveStatusChartRef}></canvas>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={7}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Requests by Type</h6>
                    <div style={{ height: '260px' }}>
                      <canvas ref={leaveTypeChartRef}></canvas>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4 mt-1">
              <Col xs={12} lg={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Upcoming Leaves</h6>
                    <Table striped hover size="sm" className="align-middle mb-0">
                      <tbody>
                        {leaveAnalytics.upcomingLeaves.length > 0 ? (
                          leaveAnalytics.upcomingLeaves.map((leave, idx) => {
                            const profile = leave.employee?.employee_profile ?? leave.employee ?? {};
                            const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || leave.employee_name || 'Employee';
                            const from = leave.__normalized?.fromDate ? formatDate(leave.__normalized.fromDate) : formatDate(leave.from);
                            const to = leave.__normalized?.toDate ? formatDate(leave.__normalized.toDate) : formatDate(leave.to);
                            const duration = leave.__normalized?.durationDays ?? leave.total_days ?? 0;

                            return (
                              <tr key={`upcoming-leave-${idx}`}>
                                <td className="fw-semibold">{name}</td>
                                <td className="text-muted small">{leave.type}</td>
                                <td className="text-end small fw-semibold">{from} – {to} ({duration}d)</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center text-muted small">No upcoming leaves within the selected window.</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Department Hotspots</h6>
                    <Table striped hover size="sm" className="align-middle mb-0">
                      <tbody>
                        {leaveAnalytics.departmentDistribution?.length > 0 ? (
                          leaveAnalytics.departmentDistribution.map((dept, idx) => (
                            <tr key={`leave-dept-${idx}`}>
                              <td className="fw-semibold">{dept.label}</td>
                              <td className="text-end fw-semibold">{dept.count}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="text-center text-muted small">No department breakdown available.</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {leaveOverviewInsights.length > 0 && (
              <div className="mt-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-3">Insights & Recommendations</h6>
                <ul className="mb-0 ps-3">
                  {leaveOverviewInsights.map((insight, idx) => (
                    <li key={`leave-insight-${idx}`} className="mb-2 text-muted">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {reportType === 'employee' && employeeData && employeeData.length > 0 && employeeAnalytics && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header
            className="text-white"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              padding: '1.25rem',
            }}
          >
            <h5 className="mb-0 d-flex align-items-center">
              <FaUsers className="me-2" />
              Employee Overview
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 mb-4">
              {employeeSummaryMetrics.map((metric) => (
                <Col key={metric.label} xs={12} md={6} lg={3}>
                  <Card className={`h-100 border-0 shadow-sm bg-opacity-10 bg-${metric.variant}`} style={{ borderRadius: '14px' }}>
                    <Card.Body className="d-flex flex-column">
                      <span className="text-uppercase small fw-semibold text-muted mb-1">{metric.label}</span>
                      <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>{metric.value}</div>
                      <span className="small text-muted mt-auto">Updated from current employee data.</span>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-4">
              <Col xs={12} lg={5}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Employee Distribution</h6>
                    <div className="d-flex flex-column align-items-stretch">
                      <div className="d-flex justify-content-center">
                        {employeeAnalytics.departments.length > 0 ? (
                           <div style={{ height: '200px', width: '200px' }}>
                             <canvas ref={employeeDepartmentChartRef}></canvas>
                           </div>
                        ) : (
                          <div className="text-muted small d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                            Generate a preview to visualize employee distribution.
                          </div>
                        )}
                      </div>
                      {employeeAnalytics.departments.length > 0 && (
                        <div className="mt-3">
                          {employeeAnalytics.departments.map((item, idx) => {
                            const palette = ['#667eea', '#764ba2', '#28a745', '#ffc107', '#17a2b8', '#6f42c1'];
                            const color = palette[idx % palette.length];
                            const percentage = employeeAnalytics.totals.total > 0 ? ((item.count / employeeAnalytics.totals.total) * 100).toFixed(1) : '0.0';

                            return (
                              <div key={`employee-dist-item-${idx}`} className="d-flex align-items-center mb-2">
                                <span
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    backgroundColor: color,
                                    marginRight: '8px',
                                    display: 'inline-block',
                                  }}
                                ></span>
                                <span className="text-muted small flex-grow-1">{item.label}</span>
                                <span className="fw-semibold small" style={{ color: '#1f2937' }}>{item.count} ({percentage}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={7}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Status Distribution</h6>
                    <div className="d-flex flex-column align-items-stretch">
                      <div className="d-flex justify-content-center">
                        {employeeAnalytics.statusDistribution.length > 0 ? (
                          <div style={{ height: '200px', width: '200px' }}>
                            <canvas ref={employeeStatusChartRef}></canvas>
                          </div>
                        ) : (
                          <div className="text-muted small d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
                            Generate a preview to visualize status distribution.
                          </div>
                        )}
                      </div>
                      {employeeAnalytics.statusDistribution.length > 0 && (
                        <div className="mt-3">
                          {employeeAnalytics.statusDistribution.map((item, idx) => {
                            const percentage = employeeAnalytics.totals.total > 0 ? ((item.count / employeeAnalytics.totals.total) * 100).toFixed(1) : '0.0';

                            return (
                              <div key={`status-dist-item-${idx}`} className="d-flex align-items-center mb-2">
                                <span
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    backgroundColor: item.color,
                                    marginRight: '8px',
                                    display: 'inline-block',
                                  }}
                                ></span>
                                <span className="text-muted small flex-grow-1">{item.label}</span>
                                <span className="fw-semibold small" style={{ color: '#1f2937' }}>{item.count} ({percentage}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4 mt-1">
              <Col xs={12} lg={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Tenure Distribution</h6>
                    {employeeAnalytics.tenureDistribution.length > 0 ? (
                      <div>
                        {employeeAnalytics.tenureDistribution.map((item, idx) => (
                          <div key={`tenure-dist-item-${idx}`} className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted small">{item.label}</span>
                            <span className="fw-semibold" style={{ color: '#1f2937' }}>{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small">Generate a preview to view tenure distribution.</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Recent Hires</h6>
                    {employeeAnalytics.recentHires.length > 0 ? (
                      <div>
                        {employeeAnalytics.recentHires.map((emp, idx) => {
                          const profile = emp.employee_profile ?? emp;
                          const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || emp.name || 'Employee';
                          const hireDate = profile?.hire_date || profile?.date_hired || profile?.employment_date;

                          return (
                            <div key={`recent-hire-item-${idx}`} className="d-flex align-items-center justify-content-between mb-2">
                              <div>
                                <div className="fw-semibold" style={{ color: '#1f2937' }}>{name}</div>
                                <div className="text-muted small">{profile?.department || 'Unassigned'}</div>
                              </div>
                              <div className="text-end small">
                                <div>{hireDate ? formatDate(hireDate) : 'N/A'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted small">No recent hires within the selected window.</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {employeeOverviewInsights.length > 0 && (
              <div className="mt-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-3">Insights & Recommendations</h6>
                <ul className="mb-0 ps-3">
                  {employeeOverviewInsights.map((insight, idx) => (
                    <li key={`employee-insight-${idx}`} className="mb-2 text-muted">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {reportType === 'payroll' && payrollData && payrollData.length > 0 && payrollAggregates && (
        <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
          <Card.Header
            className="text-white"
            style={{
              background: 'linear-gradient(135deg, #3c8dbc 0%, #0fb9b1 100%)',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              padding: '1.25rem',
            }}
          >
            <h5 className="mb-0 d-flex align-items-center">
              <FaBriefcase className="me-2" />
              Payroll Overview
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 mb-4">
              {payrollSummaryMetrics.map((metric) => (
                <Col key={metric.label} xs={12} md={6} lg={3}>
                  <Card className={`h-100 border-0 shadow-sm bg-opacity-10 bg-${metric.variant}`} style={{ borderRadius: '14px' }}>
                    <Card.Body className="d-flex flex-column">
                      <span className="text-uppercase small fw-semibold text-muted mb-1">{metric.label}</span>
                      <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>{metric.value}</div>
                      <span className="small text-muted mt-auto">Updated from the latest payroll preview.</span>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <Row className="g-4">
              <Col xs={12} lg={5}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Net vs Deductions</h6>
                    <div className="d-flex flex-column align-items-stretch">
                          <div className="d-flex justify-content-center">
                            <div style={{ height: '200px', width: '200px' }}>
                              <canvas ref={payrollDistributionChartRef}></canvas>
                            </div>
                          </div>
                      <div className="mt-3">
                        {payrollAggregates.netDistribution.map((item, idx) => (
                          <div key={`payroll-dist-top-${idx}`} className="d-flex align-items-center mb-2">
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                backgroundColor: item.color,
                                marginRight: '8px',
                                display: 'inline-block',
                              }}
                            ></span>
                            <span className="text-muted small flex-grow-1">{item.label}</span>
                            <span className="fw-semibold small" style={{ color: '#1f2937' }}>
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} lg={7}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <h6 className="text-uppercase text-muted fw-semibold mb-3">Payroll Snapshot</h6>
                    <Row className="g-2">
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">Basic Salary Total</div>
                          <div className="h5 mb-0 text-primary fw-bold">{formatCurrency(payrollAggregates.totals.basic)}</div>
                        </div>
                      </Col>
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">OT Total</div>
                          <div className="h5 mb-0 text-info fw-bold">{formatCurrency(payrollAggregates.totals.overtime)}</div>
                        </div>
                      </Col>
                    </Row>
                    <Row className="g-2 mt-1">
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">Average Net per Employee</div>
                          <div className="h5 mb-0 text-success fw-bold">{formatCurrency(payrollAggregates.totals.net / payrollData.length || 0)}</div>
                        </div>
                      </Col>
                      <Col xs={12} md={6}>
                        <div className="p-3 bg-light rounded-3 h-100">
                          <div className="text-muted small fw-semibold mb-1">Deduction Rate</div>
                          <div className="h5 mb-0 text-danger fw-bold">{payrollAggregates.deductionRate.toFixed(1)}%</div>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {payrollInsights.length > 0 && (
              <div className="mt-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-3">Insights & Recommendations</h6>
                <ul className="mb-0 ps-3">
                  {payrollInsights.map((insight, idx) => (
                    <li key={`payroll-insight-top-${idx}`} className="mb-2 text-muted">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
          
          <div className="table-responsive" style={{ margin: '0', padding: '0' }}>
            <Table className="mb-0" style={{ 
              borderCollapse: 'collapse',
              borderSpacing: '0',
              width: '100%',
              fontSize: '0.875rem',
              fontFamily: 'Arial, sans-serif',
              margin: '0',
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'hidden'
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
                    backgroundColor: '#2c3e50',
                    color: '#ffffff',
                    borderBottom: '2px solid #000000'
                  }}>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'left',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '5%'
                    }}>#</th>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'left',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '25%'
                    }}>Employee</th>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'left',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '12%'
                    }}>Date</th>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'center',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '15%'
                    }}>Status</th>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'center',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '18%'
                    }}>Time In</th>
                    <th style={{ 
                      padding: '0.75rem 1rem', 
                      fontWeight: '700', 
                      border: 'none',
                      borderBottom: '2px solid #000000',
                      textAlign: 'center',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      width: '25%'
                    }}>Time Out</th>
                  </tr>
                )}
                {reportType === 'payroll' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>Basic Salary</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>OT</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>Deductions</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>Net Pay</th>
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
                {reportType === 'employee' && (
                  <tr style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>#</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Department</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Position</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Hire Date</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>Tenure</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {reportType === 'performance' && renderPerformanceReport()}
                {reportType === 'payroll' && renderPayrollReport()}
                {reportType === 'attendance' && renderAttendanceReport()}
                {reportType === 'leave' && renderLeaveReport()}
                {reportType === 'employee' && renderEmployeeReport()}
                {reportType !== 'performance' && reportType !== 'payroll' && reportType !== 'attendance' && reportType !== 'leave' && reportType !== 'employee' && (
                  <tr>
                    <td colSpan={reportType === 'employee' ? 7 : 6} className="text-center text-muted py-5" style={{ 
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
          
          {/* Employee Attendance Detail Modal */}
          <Modal
            size="xl"
            show={detailModalOpen}
            onHide={() => setDetailModalOpen(false)}
            centered
            scrollable
          >
            <Modal.Header closeButton>
              <Modal.Title>
                {detailEmployee
                  ? `${detailEmployee.first_name || ''} ${detailEmployee.last_name || ''}`.trim()
                  : 'Employee'}{' '}
                – Attendance Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {detailLoading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <>
                  <Row className="g-3 mb-3">
                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body>
                          <div className="text-muted small text-uppercase fw-semibold">Days Worked</div>
                          <div className="display-6 fw-bold text-primary mb-0">
                            {(detailAnalytics?.present ?? 0) + (detailAnalytics?.late ?? 0) + (detailAnalytics?.overtime ?? 0) + (detailAnalytics?.undertime ?? 0)}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body>
                          <div className="text-muted small text-uppercase fw-semibold">Avg Hours</div>
                          <div className="display-6 fw-bold text-success mb-0">
                            {Number(detailAnalytics?.avgHours ?? 0).toFixed(2)}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body>
                          <div className="text-muted small text-uppercase fw-semibold">Tardies</div>
                          <div className="display-6 fw-bold text-warning mb-0">
                            {detailAnalytics?.late ?? 0}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body>
                          <div className="text-muted small text-uppercase fw-semibold">Punctuality</div>
                          <div className="display-6 fw-bold text-info mb-0">
                            {Number(detailAnalytics?.punctualityRate ?? 0).toFixed(1)}%
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Table bordered hover responsive className="align-middle">
                    <thead className="table-light text-muted text-uppercase small">
                      <tr>
                        <th style={{ width: '120px' }}>Date</th>
                        <th>Status</th>
                        <th className="text-center">In</th>
                        <th className="text-center">Out</th>
                        <th className="text-end">Total Hours</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRecords.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No records found for the selected range.
                          </td>
                        </tr>
                      ) : (
                        detailRecords.map((r, idx) => (
                          <tr key={r.id || idx}>
                            <td>{formatDate(r.date)}</td>
                            <td>
                              <Badge bg={getAttendanceBadgeVariant(r.status)} className="text-uppercase">
                                {r.status}
                              </Badge>
                            </td>
                            <td className="text-center">{formatTime(r.clock_in)}</td>
                            <td className="text-center">{formatTime(r.clock_out)}</td>
                            <td className="text-end">
                              {Number.isFinite(parseFloat(r.total_hours))
                                ? parseFloat(r.total_hours).toFixed(2)
                                : '—'}
                            </td>
                            <td>{r.remarks || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </>
              )}
            </Modal.Body>
          </Modal>

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
                              <th style={{ width: '180px' }}>Avg %</th>
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
}
