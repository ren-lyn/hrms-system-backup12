import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faArrowTrendUp,
  faArrowTrendDown,
  faStar,
  faTriangleExclamation,
  faCalendarCheck,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../../axios';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CACHE_KEY = 'evaluationAnalyticsSummary';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_VERSION = 1;

const GRADE_MAP = [
  { min: 90, label: 'A', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { min: 80, label: 'B', color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  { min: 70, label: 'C', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  { min: 60, label: 'D', color: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  { min: 0, label: 'F', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' }
];

const getGrade = (percentage = 0) => {
  const normalized = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;
  return GRADE_MAP.find((grade) => normalized >= grade.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'Not available';
  }
};

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const EvaluationAnalyticsSection = ({ expanded = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const fetchEvaluationSummary = useMemo(() => async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: listResponse } = await api.get('/employee-evaluations/my-evaluations');
      const evaluationsArray = Array.isArray(listResponse)
        ? listResponse
        : Array.isArray(listResponse?.data)
          ? listResponse.data
          : [];

      if (evaluationsArray.length === 0) {
        setMetrics(null);
        return;
      }

      const sortedEvaluations = [...evaluationsArray].sort(
        (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
      );

      const latest = sortedEvaluations[0];
      const previous = sortedEvaluations[1] ?? null;

      let detailedAnalysis = null;
      try {
        const { data: detailResponse } = await api.get(`/employee-evaluations/${latest.id}`);
        detailedAnalysis = detailResponse?.data || detailResponse || null;
      } catch (detailError) {
        console.warn('Unable to load latest evaluation details', detailError);
      }

      const latestPercentage = safeNumber(latest?.percentage ?? latest?.percentage_score ?? latest?.average_score * 10);
      const previousPercentage = safeNumber(previous?.percentage ?? previous?.percentage_score ?? previous?.average_score * 10, null);
      const diff = previousPercentage !== null ? latestPercentage - previousPercentage : null;

      const gradeInfo = getGrade(latestPercentage);
      const statusPassed = Boolean(latest?.is_passed);
      const statusLabel = statusPassed ? 'Passed' : 'Needs Attention';
      const statusStyle = statusPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

      const strengths = Array.isArray(detailedAnalysis?.analysis?.strengths)
        ? detailedAnalysis.analysis.strengths
        : [];
      const weaknesses = Array.isArray(detailedAnalysis?.analysis?.weaknesses)
        ? detailedAnalysis.analysis.weaknesses
        : [];

      const topStrength = strengths.reduce((best, current) => {
        if (!current) return best;
        if (!best) return current;
        return safeNumber(current.rating, 0) > safeNumber(best.rating, 0) ? current : best;
      }, null);

      const topWeakness = weaknesses.reduce((worst, current) => {
        if (!current) return worst;
        if (!worst) return current;
        return safeNumber(current.rating, 10) < safeNumber(worst.rating, 10) ? current : worst;
      }, null);

      const changeText = diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : null;
      const recentEvaluations = [...sortedEvaluations]
        .slice(0, 3)
        .map((evaluation) => {
          const percentValue = safeNumber(
            evaluation?.percentage ?? evaluation?.percentage_score ?? evaluation?.average_score * 10,
            0
          );
          const roundedPercentage = Number(percentValue.toFixed(1));
          return {
            id: evaluation.id,
            date: formatDate(evaluation.submitted_at),
            percentage: roundedPercentage,
            status: evaluation.is_passed ? 'Passed' : 'Needs Attention',
            title: evaluation.form_title || 'Evaluation'
          };
        });

      const computedMetrics = {
        overall: {
          percentage: Number(latestPercentage.toFixed(1)),
          grade: gradeInfo.label,
          gradeColor: gradeInfo.color,
          badgeClass: gradeInfo.badge,
          status: statusLabel,
          statusClass: statusStyle,
          averageScore: safeNumber(latest?.average_score, 0).toFixed(1)
        },
        trend: {
          diff,
          text:
            diff === null
              ? 'Waiting for more evaluations to show a trend.'
              : diff > 0
                ? `Performance increased by ${diff.toFixed(1)}% since last evaluation.`
                : diff < 0
                  ? `Performance decreased by ${Math.abs(diff).toFixed(1)}% since last evaluation.`
                  : 'Performance is consistent with the previous evaluation.',
          direction: diff === null ? null : diff >= 0 ? 'up' : 'down'
        },
        latest: {
          percentage: Number(latestPercentage.toFixed(1)),
          changeValue: diff,
          changeText,
          strengthLabel: topStrength?.question?.category || null,
          improvementLabel: topWeakness?.question?.category || null
        },
        strength: {
          label: topStrength?.question?.category || 'No strengths recorded yet',
          score: topStrength ? `${safeNumber(topStrength.rating, 0)}/10` : null
        },
        improvement: {
          label: topWeakness?.question?.category || 'No priority improvements found',
          score: topWeakness ? `${safeNumber(topWeakness.rating, 0)}/10` : null
        },
        dates: {
          last: formatDate(latest?.submitted_at),
          next: formatDate(latest?.next_evaluation_date)
        },
        recent: recentEvaluations
      };

      setMetrics(computedMetrics);

      if (typeof window !== 'undefined') {
        try {
          const cachePayload = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            metrics: computedMetrics
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
        } catch (cacheError) {
          console.warn('Failed to cache evaluation analytics', cacheError);
        }
      }
    } catch (requestError) {
      console.error('Failed to load evaluation analytics', requestError);
      setError('Unable to load evaluation analytics right now.');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let warmCache = false;

    if (!cacheHydrated && typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const isFresh = cached?.timestamp && Date.now() - cached.timestamp < CACHE_TTL;
          const isCompatible = cached?.version === CACHE_VERSION;
          if (isFresh && isCompatible && cached.metrics) {
            setMetrics(cached.metrics);
            setLoading(false);
            warmCache = true;
          } else {
            localStorage.removeItem(CACHE_KEY);
          }
        }
      } catch (cacheError) {
        console.warn('Failed to read evaluation analytics cache', cacheError);
      }
      setCacheHydrated(true);
    }

    fetchEvaluationSummary({ silent: warmCache });
  }, [cacheHydrated, fetchEvaluationSummary]);

  // Render chart when metrics change
  useEffect(() => {
    if (!metrics || !metrics.recent || metrics.recent.length === 0) {
      // Clean up chart if no data
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    if (!chartRef.current) return;

    // Clean up existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Reverse recent evaluations to show chronological order (oldest to newest)
    const chronologicalEvaluations = [...metrics.recent].reverse();

    // Prepare chart data from recent evaluations
    const chartData = {
      labels: chronologicalEvaluations.map((evaluation) => {
        // Format date as short month/day
        try {
          // Try to parse the formatted date string
          const date = new Date(evaluation.date);
          if (isNaN(date.getTime())) {
            // If parsing fails, try to parse from submitted_at if available
            return evaluation.date;
          }
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
          return evaluation.date || 'N/A';
        }
      }),
      datasets: [
        {
          label: 'Evaluation Score (%)',
          data: chronologicalEvaluations.map((evaluation) => evaluation.percentage),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: expanded 
            ? 'rgba(59, 130, 246, 0.1)' 
            : 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: expanded ? 4 : 3,
          pointHoverRadius: expanded ? 6 : 5,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: expanded,
          position: 'top',
          labels: {
            font: {
              size: 12,
              weight: '500'
            },
            color: '#64748b',
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const evaluation = chronologicalEvaluations[context.dataIndex];
              return [
                `Score: ${context.parsed.y}%`,
                evaluation?.title ? `Form: ${evaluation.title}` : '',
                evaluation?.status ? `Status: ${evaluation.status}` : ''
              ].filter(Boolean);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: expanded,
            color: 'rgba(148, 163, 184, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
              weight: '500'
            }
          }
        },
        y: {
          beginAtZero: false,
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: {
              size: 11,
              weight: '500'
            },
            callback: function(value) {
              return value + '%';
            },
            stepSize: expanded ? 10 : 20
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      }
    };

    // Create new chart instance
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: chartOptions
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [metrics, expanded]);

  // Handle window resize for chart
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-md p-6 border border-blue-50">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-6 text-center">
        <p className="text-rose-600 font-semibold">{error}</p>
        <p className="text-slate-500 text-sm mt-2">
          Please try again later or view the full evaluation summary for more details.
        </p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
        <FontAwesomeIcon icon={faChartLine} className="text-slate-300 text-4xl mb-3" />
        <p className="text-slate-600 font-semibold">No evaluation data available yet</p>
        <p className="text-slate-500 text-sm mt-1">
          Once your first evaluation is completed, your performance summary will appear here.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white shadow-md w-full h-full">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-100/40 to-transparent pointer-events-none" />
        <div className="relative w-full h-full" style={{ minHeight: '26rem' }}>
          <canvas ref={chartRef} className="block w-full h-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Evaluation Analytics Summary</h2>
          <p className="text-sm text-slate-500">
            Your latest performance insights at a glance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 bg-white rounded-3xl border border-blue-100 shadow-md p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${metrics.overall.badgeClass}`}>
                Overall Grade
              </span>
              <h3 className="mt-4 text-3xl font-bold text-slate-800 flex items-baseline gap-3">
                {metrics.overall.percentage}%
                <span className={`text-2xl font-semibold ${metrics.overall.gradeColor}`}>
                  {metrics.overall.grade}
                </span>
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Average rating {metrics.overall.averageScore}/10
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${metrics.overall.statusClass}`}>
                <FontAwesomeIcon icon={faTrophy} />
                {metrics.overall.status}
              </div>
              <FontAwesomeIcon icon={faTrophy} className="text-blue-400 text-4xl drop-shadow-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 rounded-full p-3">
              <FontAwesomeIcon icon={faArrowTrendUp} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Performance Trend
              </p>
              <p className="text-sm text-slate-600">{metrics.trend.text}</p>
            </div>
              </div>
          {metrics.trend.diff !== null && (
            <span
              className={`inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full ${
                metrics.trend.direction === 'up'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
                <FontAwesomeIcon 
                icon={metrics.trend.direction === 'up' ? faArrowTrendUp : faArrowTrendDown}
                className="mr-2"
              />
              {metrics.trend.diff > 0 ? '+' : ''}{metrics.trend.diff.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 rounded-full p-3">
              <FontAwesomeIcon icon={faStar} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Top Strength
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {metrics.strength.label}
              </p>
            </div>
          </div>
          {metrics.strength.score && (
            <span className="inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              Score {metrics.strength.score}
            </span>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-rose-50 text-rose-600 rounded-full p-3">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Area for Improvement
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {metrics.improvement.label}
              </p>
            </div>
              </div>
          {metrics.improvement.score && (
            <span className="inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              Score {metrics.improvement.score}
            </span>
          )}
              </div>

        <div className="sm:col-span-2 bg-white rounded-3xl border border-blue-100 shadow-md p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-50 text-indigo-600 rounded-full p-3">
              <FontAwesomeIcon icon={faCalendarCheck} />
                  </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Evaluation
                </p>
                <p className="text-sm font-semibold text-slate-700">{metrics.dates.last}</p>
                </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next Scheduled
                </p>
                <p className="text-sm font-semibold text-slate-700">{metrics.dates.next}</p>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-100 via-violet-100 to-blue-100 rounded-3xl border border-pink-200 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Performance Trend
            </p>
            <h3 className="text-lg font-semibold text-slate-800">Recent Evaluation Scores</h3>
          </div>
          </div>
        <div className="h-60">
          <canvas ref={chartRef} />
        </div>
    </div>
    </section>
  );
};

export default EvaluationAnalyticsSection;
