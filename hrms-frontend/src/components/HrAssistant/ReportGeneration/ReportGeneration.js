import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaFilePdf, FaFileExcel, FaSearch, FaFilter, FaDownload, FaSpinner, FaTrophy, FaExclamationTriangle, FaChartLine, FaUsers, FaAward, FaTimesCircle, FaIdBadge, FaBuilding, FaBriefcase, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import { Card, Button, Row, Col, Form, Table, Dropdown, Badge, Alert, Modal, Spinner, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import Chart from 'chart.js/auto';

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
        const allowances = Number(payroll.allowances ?? 0);
        const deductions = Number(payroll.total_deductions ?? 0);
        const net = Number(payroll.net_pay ?? 0);

        acc.basic += basic;
        acc.allowances += allowances;
        acc.deductions += deductions;
        acc.net += net;

        return acc;
      },
      { basic: 0, allowances: 0, deductions: 0, net: 0 }
    );

    const gross = totals.basic + totals.allowances;
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
    const allowanceRate = gross > 0 ? (totals.allowances / gross) * 100 : 0;

    return {
      totals: {
        ...totals,
        gross,
      },
      netDistribution,
      deductionRate,
      allowanceRate,
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

    const { totals, deductionRate, allowanceRate } = payrollAggregates;
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

    if (allowanceRate > 25) {
      insights.push(
        `Allowances represent ${allowanceRate.toFixed(1)}% of gross pay. Ensure allowance policies are aligned with budgeting goals.`
      );
    } else if (allowanceRate < 10) {
      insights.push(
        `Allowances are modest at ${allowanceRate.toFixed(1)}% of gross pay. Consider whether additional incentives are needed for retention.`
      );
    }

    const averageNet = totals.net / (payrollData?.length || 1);
    if (averageNet < 20000) {
      insights.push(
        `Average net pay sits at ${formatCurrency(averageNet)}. Evaluate compensation bands to stay competitive.`
      );
    }

    if (insights.length === 0) {
      insights.push('Payroll metrics are stable. Continue monitoring for variance in deductions or allowances.');
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
          {formatCurrency(payroll.allowances)}
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
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            Generating attendance insights...
          </td>
        </tr>
      );
    }

    if (!attendanceData || attendanceData.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
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
        <tr key={record.id || `${employee.employee_id}-${record.date}-${index}`}>
          <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{index + 1}</td>
          <td style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{employeeName}</div>
            <div className="text-muted small">
              {(employee.employee_id || employee.id || '—')}{' '}
              {(employee.department || employee.position) && (
                <>
                  • {employee.department || 'No Department'}
                  {employee.position ? ` • ${employee.position}` : ''}
                </>
              )}
            </div>
          </td>
          <td style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{formatDate(record.date)}</div>
            {record.remarks && <div className="text-muted small">Remarks: {record.remarks}</div>}
          </td>
          <td className="text-center" style={{ padding: '1rem' }}>
            <Badge
              bg={getAttendanceBadgeVariant(record.status)}
              className="fw-semibold text-uppercase"
              style={{ fontSize: '0.75rem', letterSpacing: '0.03em' }}
            >
              {record.status || 'No Record'}
            </Badge>
          </td>
          <td className="text-center" style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{formatTime(record.clock_in)}</div>
            {record.break_out && <div className="text-muted small">Break Out: {formatTime(record.break_out)}</div>}
          </td>
          <td className="text-center" style={{ padding: '1rem' }}>
            <div className="fw-semibold text-dark">{formatTime(record.clock_out)}</div>
            {record.break_in && <div className="text-muted small">Break In: {formatTime(record.break_in)}</div>}
            <div className="text-muted small">Total: {netHours}</div>
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
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>Basic Salary</th>
                    <th style={{ padding: '1rem', fontWeight: '600', border: 'none', textAlign: 'right' }}>Allowances</th>
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
                              <div key={`payroll-dist-${idx}`} className="d-flex align-items-center mb-2">
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
                              <div className="text-muted small fw-semibold mb-1">Allowances Total</div>
                              <div className="h5 mb-0 text-info fw-bold">{formatCurrency(payrollAggregates.totals.allowances)}</div>
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
                        <li key={`payroll-insight-${idx}`} className="mb-2 text-muted">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card.Body>
            </Card>
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
