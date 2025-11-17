import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import axios from 'axios';
import useEmployeeCount from '../../../hooks/useEmployeeCount';

export default function StandaloneAssistantDashboard() {
  // ---------- Styles (scoped) ----------
  const styles = useMemo(() => `
    :root {
      --hrasst-bg: #ffffff;
      --hrasst-surface: #ffffff;
      --hrasst-border: #e5e7eb;
      --hrasst-text: #111827;
      --hrasst-muted: #6b7280;
      --hrasst-primary: #2563eb;
      --hrasst-primary-600: #1d4ed8;
      --hrasst-primary-900: #1e3a8a;
      --hrasst-ring: rgba(37, 99, 235, 0.15);
      --hrasst-shadow: 0 8px 24px rgba(2, 6, 23, 0.06);
      --hrasst-radius-lg: 16px;
      --hrasst-radius-md: 12px;
      --hrasst-radius-sm: 10px;
    }
    .hrasst-wrapper { box-sizing: border-box; max-height: calc(100vh - 130px); overflow: auto; overflow-x: hidden; background: var(--hrasst-bg); color: var(--hrasst-text); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: clamp(14px, 2vw, 28px); }
    .hrasst-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding: clamp(12px,1.5vw,16px) clamp(14px,1.8vw,20px); background: var(--hrasst-surface); border:1px solid var(--hrasst-border); border-radius:16px; box-shadow: var(--hrasst-shadow); margin-bottom: clamp(16px,2.4vw,28px); }
    .hrasst-header h1 { font-size: clamp(18px,2.2vw,24px); font-weight: 700; color: var(--hrasst-primary-900); margin: 0; }
    .hrasst-status { display:inline-flex; align-items:center; gap:8px; font-size:12px; color:var(--hrasst-muted); background:#f3f6ff; border:1px solid #e6ecff; padding:6px 10px; border-radius:999px; }
    .hrasst-dot { width:8px; height:8px; border-radius:50%; background: var(--hrasst-primary); box-shadow: 0 0 0 4px var(--hrasst-ring); }

    /* Always keep a 2x2 layout like the current design */
    .hrasst-grid { display:grid; grid-template-columns: 1fr 1fr; gap: clamp(14px,1.8vw,22px); align-items: stretch; }

    .hrasst-card { background:var(--hrasst-surface); border:1px solid var(--hrasst-border); border-radius:16px; box-shadow:var(--hrasst-shadow); padding: clamp(14px,1.6vw,20px); cursor:pointer; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; min-height:260px; display:flex; flex-direction:column; gap:12px; }
    .hrasst-card:hover, .hrasst-card:focus-visible { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(2,6,23,0.08); border-color:#dbe5ff; }
    .hrasst-card-header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }
    .hrasst-card-title { font-weight:700; letter-spacing:.2px; color:var(--hrasst-primary-900); font-size: clamp(14px,1.6vw,16px); margin:0; }
    .hrasst-kicker { font-size:12px; color:var(--hrasst-muted); }
    .hrasst-divider { height:1px; background: var(--hrasst-border); margin: 4px 0 8px; }

    .hrasst-revenue-canvas-wrap { position:relative; flex:1 1 auto; min-height:180px; }
    .hrasst-performance-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; }
    .hrasst-performance-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border:1px solid var(--hrasst-border); border-radius:10px; background:#fafcff; }
    .hrasst-performance-name { font-weight:600; font-size:12px; color:var(--hrasst-primary-900); }
    .hrasst-performance-score { font-size:12px; font-weight:700; padding:4px 8px; border-radius:6px; }
    .hrasst-performance-score.top { color:#0b4c24; background:#d1fae5; border:1px solid #bbf7d0; }
    .hrasst-performance-score.bottom { color:#991b1b; background:#fee2e2; border:1px solid #fecaca; }
    .hrasst-performance-section { display:flex; flex-direction:column; gap:12px; }
    .hrasst-performance-section-title { font-size:11px; font-weight:700; color:var(--hrasst-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }

    .hrasst-calendar { display:grid; grid-template-rows:auto 1fr; row-gap:8px; flex:1 1 auto; }
    .hrasst-calendar-header { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border:1px solid var(--hrasst-border); border-radius:10px; background:#f8fbff; color:var(--hrasst-primary-900); font-weight:600; }
    .hrasst-cal-nav { display:flex; align-items:center; gap:6px; }
    .hrasst-btn { border:1px solid #c7d2fe; background:#eef2ff; color:var(--hrasst-primary-900); padding:4px 8px; border-radius:8px; font-weight:700; cursor:pointer; }
    .hrasst-meta { display:flex; align-items:center; gap:10px; font-size:12px; color:var(--hrasst-muted); }
    .hrasst-cal-grid { display:grid; grid-template-columns: repeat(7,1fr); gap:6px; font-size:12px; user-select:none; }
    .hrasst-cal-cell { border:1px solid var(--hrasst-border); border-radius:8px; min-height:34px; display:flex; align-items:center; justify-content:center; background:#fff; color:#1f2937; }
    .hrasst-cal-cell.is-dow { background:#f1f5ff; color:var(--hrasst-primary-900); font-weight:700; border-style:dashed; }
    .hrasst-cal-cell.is-today { border-color:var(--hrasst-primary); box-shadow: 0 0 0 3px var(--hrasst-ring) inset; font-weight:700; color:var(--hrasst-primary-900); }
    .hrasst-cal-cell.is-selected { border-color: var(--hrasst-primary-600); background: #eef2ff; font-weight:700; color:var(--hrasst-primary-900); }

    .hrasst-attendance-canvas-wrap { position:relative; flex:1 1 auto; min-height:180px; }

    .hrasst-total-wrap { display:grid; grid-template-columns:1fr auto; align-items:end; gap:8px; }
    .hrasst-total-num { font-size: clamp(36px, 4.8vw, 48px); font-weight:800; color:var(--hrasst-primary-900); line-height:1; }
    .hrasst-trend { display:inline-flex; align-items:center; gap:6px; color:#065f46; font-weight:700; font-size:12px; background:#ecfdf5; border:1px solid #a7f3d0; padding:6px 8px; border-radius:999px; }
    .hrasst-breakdown { margin-top:8px; display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; }
    .hrasst-kv { border:1px dashed var(--hrasst-border); background:#f9fbff; border-radius:10px; padding:8px 10px; display:grid; grid-template-columns:auto 1fr; gap:8px; font-size:12px; color:var(--hrasst-muted); }
    .hrasst-kv strong { color: var(--hrasst-primary-900); }
    .hrasst-emp-spark { position:relative; height:110px; margin-top:10px; border:1px dashed var(--hrasst-border); border-radius:10px; background:#fafcff; }

    /* Modal should sit above the app sidebar (sidebar uses z-index:1000) */
    .hrasst-modal { position:fixed; inset:0; z-index:3000; display:none; align-items:center; justify-content:center; background: rgba(2,6,23,.52); padding:18px; }
    .hrasst-modal[aria-hidden=\"false\"] { display:flex; }
    .hrasst-dialog { width:min(980px,96vw); max-height:88vh; overflow:hidden; background:#fff; border-radius:18px; border:1px solid var(--hrasst-border); box-shadow: 0 20px 60px rgba(2,6,23,.25); display:grid; grid-template-rows:auto 1fr auto; }
    .hrasst-dialog-hd { padding:14px 16px; border-bottom:1px solid var(--hrasst-border); display:flex; align-items:center; justify-content:space-between; gap:10px; background: linear-gradient(180deg,#f7faff 0%,#ffffff 100%); }
    .hrasst-dialog-title { margin:0; font-size:16px; font-weight:800; color:var(--hrasst-primary-900); }
    .hrasst-close { border:1px solid #c7d2fe; background:#eef2ff; color:var(--hrasst-primary-900); padding:8px 10px; border-radius:10px; font-weight:700; cursor:pointer; }
    .hrasst-dialog-bd { padding: clamp(14px,1.6vw,18px); overflow:auto; }
    .hrasst-dialog-ft { padding:12px 16px; border-top:1px solid var(--hrasst-border); display:flex; justify-content:flex-end; background:#fbfdff; }

    /* Avoid extra left offset on narrow screens */
    @media (max-width: 768px) {
      .hrasst-wrapper { margin-left: 0; }
      .hrasst-grid { grid-template-columns: 1fr; }
    }
  `, []);

  // ---------- State ----------
  const [performance, setPerformance] = useState({
    topPerformers: [],
    bottomPerformers: [],
    loading: false,
    error: null
  });
  const [attendanceTrend, setAttendanceTrend] = useState({
    labels: [],
    present: [],
    absent: [],
    late: [],
    onLeave: [],
    loading: false,
    error: null
  });
  // Use real employee count data
  const { total, fullTime, training, loading: employeeCountLoading, error: employeeCountError } = useEmployeeCount();
  const [totals, setTotals] = useState({ total: 0, fullTime: 0, training: 0, trendText: '▲ +5%' });
  const [modalKind, setModalKind] = useState(null); // 'performance' | 'calendar' | 'attendance' | 'employees' | null

  // Update totals when employee count data changes
  useEffect(() => {
    if (!employeeCountLoading && !employeeCountError) {
      setTotals(prev => ({
        ...prev,
        total,
        fullTime,
        training
      }));
    }
  }, [total, fullTime, training, employeeCountLoading, employeeCountError]);

  // ---------- Chart refs ----------
  const empSparkRef = useRef(null);
  const empSparkChartRef = useRef(null);
  const attendanceTrendCanvasRef = useRef(null);
  const attendanceTrendChartRef = useRef(null);
  const attendanceModalCanvasRef = useRef(null);
  const attendanceModalChartRef = useRef(null);

  // ---------- Fetch Performance Data ----------
  useEffect(() => {
    const fetchPerformanceData = async () => {
      setPerformance(prev => ({ ...prev, loading: true, error: null }));
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Get performance report data (last 6 months by default)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        
        const response = await axios.get('http://localhost:8000/api/reports/performance', {
          headers,
          params: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          }
        });

        if (response.data.success && response.data.data.analytics) {
          const analytics = response.data.data.analytics;
          setPerformance({
            topPerformers: analytics.top_performers || [],
            bottomPerformers: analytics.bottom_performers || [],
            loading: false,
            error: null
          });
        } else {
          setPerformance(prev => ({ ...prev, loading: false, error: 'No performance data available' }));
        }
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        setPerformance(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.response?.data?.message || 'Failed to load performance data' 
        }));
      }
    };

    fetchPerformanceData();
  }, []);

  // ---------- Fetch Attendance Trend Data ----------
  useEffect(() => {
    const fetchAttendanceTrend = async () => {
      setAttendanceTrend(prev => ({ ...prev, loading: true, error: null }));
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // First, get the latest attendance record date from the system
        let latestDate = new Date();
        let endDateStr = latestDate.toISOString().split('T')[0];
        
        try {
          // Fetch a small set of attendance records ordered by date descending to find the latest date
          const latestResponse = await axios.get('http://localhost:8000/api/attendance', {
            headers,
            params: {
              per_page: 1,
              sort_by: 'date',
              sort_order: 'desc'
            }
          });
          
          if (latestResponse.data.success && latestResponse.data.data.data && latestResponse.data.data.data.length > 0) {
            const latestRecord = latestResponse.data.data.data[0];
            if (latestRecord.date) {
              latestDate = new Date(latestRecord.date);
              endDateStr = latestDate.toISOString().split('T')[0];
              console.log('Latest attendance record date found:', endDateStr);
            }
          }
        } catch (error) {
          console.warn('Could not fetch latest attendance date, using today:', error);
          // If we can't get the latest date, use today as fallback
        }
        
        // Calculate 7 days back from the latest date (including the latest date itself)
        // This ensures we show the latest 7 days of recorded attendance records
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - 6); // Last 7 days including latest date
        
        // Format dates properly for API (YYYY-MM-DD)
        const startDateStr = startDate.toISOString().split('T')[0];
        
        console.log('Fetching attendance data from', startDateStr, 'to', endDateStr, '(latest 7 days with records)');
        
        const response = await axios.get('http://localhost:8000/api/attendance/dashboard', {
          headers,
          params: {
            date_from: startDateStr,
            date_to: endDateStr
          }
        });
        
        console.log('API Response:', response.data);
        
        // Use auto-adjusted date range if available (when API adjusts to latest import period)
        let actualStartDate = startDateStr;
        let actualEndDate = endDateStr;
        
        if (response.data.data?.auto_adjusted_to_latest_import && response.data.data?.date_range) {
          const adjustedRange = response.data.data.date_range;
          actualStartDate = adjustedRange.from;
          actualEndDate = adjustedRange.to;
          console.log('API auto-adjusted date range to:', actualStartDate, 'to', actualEndDate);
        }

        if (response.data.success && response.data.data.daily_summary) {
          const dailySummary = response.data.data.daily_summary;
          
          // Debug: log the daily_summary structure
          console.log('Daily Summary from API:', dailySummary);
          console.log('Daily Summary keys:', Object.keys(dailySummary));
          
          // Process daily summary using the same logic as report generation
          // This ensures consistency between dashboard and reports
          const buildAttendanceSummary = (dailySummary) => {
            if (!dailySummary) {
              return [];
            }

            const summaryEntries = Object.entries(dailySummary).map(([date, items]) => {
              // Normalize date key - Laravel might return dates in different formats
              let normalizedDate = date;
              
              // If date is an object or has a toString method, convert it
              if (date && typeof date === 'object') {
                normalizedDate = date.toString();
              }
              
              // Clean date string - remove time components if present
              if (typeof normalizedDate === 'string') {
                normalizedDate = normalizedDate.split(' ')[0].split('T')[0];
              }
              
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
                date: normalizedDate,
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

            return summaryEntries.sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateA - dateB;
            });
          };

          const attendanceSummary = buildAttendanceSummary(dailySummary);
          
          console.log('Processed attendance summary:', attendanceSummary);
          
          // Extract data for chart (matching report generation format)
          // Use the same formatDate logic as report generation
          const formatDate = (value) => {
            if (!value) return '—';
            
            const date = new Date(value);
            
            if (Number.isNaN(date.getTime())) {
              // If direct parsing fails, try cleaning the date string
              if (typeof value === 'string') {
                const cleanDate = value.split(' ')[0].split('T')[0];
                const cleanedDate = new Date(cleanDate);
                if (!Number.isNaN(cleanedDate.getTime())) {
                  return cleanedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
              }
              console.warn('Invalid date value:', value);
              return value; // Return original value if can't parse
            }
            
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          };
          
          const labels = attendanceSummary.map((item) => formatDate(item.date));
          const present = attendanceSummary.map((item) => item.present || 0);
          const absent = attendanceSummary.map((item) => item.absent || 0);
          const late = attendanceSummary.map((item) => item.late || 0);
          const onLeave = attendanceSummary.map((item) => item.onLeave || 0);
          
          // Debug: log processed data
          console.log('Processed attendance data:', { labels, present, absent, late, onLeave });
          
          setAttendanceTrend({
            labels,
            present,
            absent,
            late,
            onLeave,
            loading: false,
            error: null
          });
        } else {
          setAttendanceTrend(prev => ({ ...prev, loading: false, error: 'No attendance data available' }));
        }
      } catch (error) {
        console.error('Failed to fetch attendance trend:', error);
        setAttendanceTrend(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.response?.data?.message || 'Failed to load attendance data' 
        }));
      }
    };

    fetchAttendanceTrend();
  }, []);

  // ---------- Init Attendance Trend Chart ----------
  useEffect(() => {
    if (!attendanceTrendCanvasRef.current || attendanceTrend.loading) return;
    
    if (attendanceTrendChartRef.current) {
      attendanceTrendChartRef.current.destroy();
      attendanceTrendChartRef.current = null;
    }
    
    if (attendanceTrend.labels.length === 0) return;
    
    const ctx = attendanceTrendCanvasRef.current.getContext('2d');
    attendanceTrendChartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: attendanceTrend.labels,
        datasets: [
          {
            label: 'Present',
            data: attendanceTrend.present,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Absent',
            data: attendanceTrend.absent,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Late',
            data: attendanceTrend.late,
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'On Leave',
            data: attendanceTrend.onLeave,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, loop: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 8,
              font: { size: 11 }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(17,24,39,.06)' },
            ticks: { color: '#1f2937', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(17,24,39,.06)' },
            ticks: { 
              color: '#374151',
              stepSize: 5,
              font: { size: 10 }
            }
          }
        }
      }
    });
    
    return () => {
      if (attendanceTrendChartRef.current) {
        attendanceTrendChartRef.current.destroy();
        attendanceTrendChartRef.current = null;
      }
    };
  }, [attendanceTrend.labels, attendanceTrend.present, attendanceTrend.absent, attendanceTrend.late, attendanceTrend.onLeave, attendanceTrend.loading]);

  // ---------- Init Attendance Modal Chart ----------
  useEffect(() => {
    if (modalKind !== 'attendance') {
      if (attendanceModalChartRef.current) {
        attendanceModalChartRef.current.destroy();
        attendanceModalChartRef.current = null;
      }
      return;
    }
    
    if (!attendanceModalCanvasRef.current || attendanceTrend.loading || attendanceTrend.labels.length === 0) return;
    
    const ctx = attendanceModalCanvasRef.current.getContext('2d');
    if (attendanceModalChartRef.current) {
      attendanceModalChartRef.current.destroy();
    }
    
    attendanceModalChartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: attendanceTrend.labels,
        datasets: [
          {
            label: 'Present',
            data: attendanceTrend.present,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Absent',
            data: attendanceTrend.absent,
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Late',
            data: attendanceTrend.late,
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'On Leave',
            data: attendanceTrend.onLeave,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, loop: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 15,
              padding: 12,
              font: { size: 12, weight: '600' }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          },
          title: {
            display: true,
            text: 'DAILY TREND',
            font: { size: 16, weight: 'bold' },
            padding: { bottom: 10 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(17,24,39,.06)' },
            ticks: { color: '#1f2937', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(17,24,39,.06)' },
            ticks: { 
              color: '#374151',
              stepSize: 5,
              font: { size: 11 }
            }
          }
        }
      }
    });
    
    return () => {
      if (attendanceModalChartRef.current) {
        attendanceModalChartRef.current.destroy();
        attendanceModalChartRef.current = null;
      }
    };
  }, [modalKind, attendanceTrend.labels, attendanceTrend.present, attendanceTrend.absent, attendanceTrend.late, attendanceTrend.onLeave, attendanceTrend.loading]);

  // Tiny headcount sparkline in Total Employees card
  useEffect(() => {
    if (!empSparkRef.current) return;
    if (empSparkChartRef.current) { empSparkChartRef.current.destroy(); empSparkChartRef.current = null; }
    const ctx = empSparkRef.current.getContext('2d');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun'];
    const base = [100,105,108,110,114];
    const data = [...base, totals.total || 0];
    empSparkChartRef.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 400, loop: false }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
    return () => { empSparkChartRef.current?.destroy(); empSparkChartRef.current = null; };
  }, [totals.total]);

  // ---------- Calendar, Time, Weather ----------
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const [weather, setWeather] = useState({ temp: null, code: null, description: 'Loading weather…' });

  // live clock
  useEffect(() => {
    const t = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // weather by geolocation (no API key; uses Open-Meteo)
  useEffect(() => {
    function mapWeatherCode(code){
      const map = {
        0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
        45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',
        61:'Slight rain',63:'Moderate rain',65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',
        95:'Thunderstorm',96:'Thunderstorm w/ slight hail',99:'Thunderstorm w/ heavy hail'
      };
      return map[code] || 'Weather';
    }
    function fetchWeather(lat, lon){
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
      fetch(url)
        .then(r=>r.json())
        .then(d=>{
          const w=d.current_weather; if(!w) return;
          setWeather({ temp: w.temperature, code: w.weathercode, description: mapWeatherCode(w.weathercode) });
        })
        .catch(()=>setWeather(w=>({...w, description:'Weather unavailable'})));
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(14.5995, 120.9842) // fallback: Manila
      );
    } else {
      fetchWeather(14.5995, 120.9842);
    }
  }, []);

  const calendar = useMemo(() => {
    const base = calendarDate;
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstDow = first.getDay();
    const daysInMonth = last.getDate();
    const monthNameShort = base.toLocaleString(undefined, { month: 'short' });
    const header = `${monthNameShort} ${y}`;

    const dows = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const cells = [];
    dows.forEach((d, i) => cells.push({ key: `dow-${i}`, text: d, className: 'is-dow' }));
    for (let i = 0; i < firstDow; i++) { cells.push({ key: `empty-${i}`, text: '', className: '' }); }
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      const isSelected = d === calendarDate.getDate();
      const cls = (isToday ? 'is-today ' : '') + (isSelected ? 'is-selected' : '');
      cells.push({ key: `d-${d}`, text: String(d), className: cls.trim(), day: d });
    }
    return { header, cells };
  }, [calendarDate]);

  // ---------- Modal helpers ----------
  const closeModal = () => setModalKind(null);

  // ---------- Public API to integrate with HRMS later ----------
  // Optional: example wiring (uncomment and adapt endpoints)
  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   const headers = token ? { Authorization: `Bearer ${token}` } : {};
  //   async function load() {
  //     try {
  //       // Example revenue endpoint returning { labels: string[], values: number[] }
  //       // const rev = await axios.get('http://localhost:8000/api/revenue/summary', { headers });
  //       // setRevenue({ labels: rev.data.labels, values: rev.data.values });
  //
  //       // Example absentees endpoint returning [{ name, date, status }]
  //       // const abs = await axios.get('http://localhost:8000/api/attendance/absent/today', { headers });
  //       // setAbsentees(abs.data);
  //
  //       // Example totals endpoint returning { total, fullTime, training, trendText }
  //       // const tot = await axios.get('http://localhost:8000/api/employees/summary', { headers });
  //       // setTotals(tot.data);
  //     } catch (e) {
  //       console.error('Failed to load dashboard data', e);
  //     }
  //   }
  //   load();
  // }, []);

  useEffect(() => {
    window.hraDashboardReact = {
      setEmployeeTotals: (payload) => {
        if (!payload) return;
        setTotals(t => ({
          total: typeof payload.total === 'number' ? payload.total : t.total,
          fullTime: typeof payload.fullTime === 'number' ? payload.fullTime : t.fullTime,
          training: typeof payload.training === 'number' ? payload.training : t.training,
          trendText: typeof payload.trendText === 'string' ? payload.trendText : t.trendText,
        }));
      },
      refreshCalendar: () => {}, // calendar is auto-built from current month
    };
    return () => { delete window.hraDashboardReact; };
  }, []);

  // ---------- Render ----------
  return (
    <div className="hrasst-wrapper" aria-label="HR Assistant Dashboard">
      <style>{styles}</style>


      <section className="hrasst-grid" aria-label="Dashboard Grid">
        {/* Performance Report */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('performance')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('performance'); } }} aria-label="Open Performance Report details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Performance Report</h2>
            <span className="hrasst-kicker">Top & Least Performers</span>
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-performance-section">
            {performance.loading ? (
              <div style={{textAlign:'center',padding:'20px',color:'var(--hrasst-muted)',fontSize:'12px'}}>Loading performance data...</div>
            ) : performance.error ? (
              <div style={{textAlign:'center',padding:'20px',color:'#ef4444',fontSize:'12px'}}>{performance.error}</div>
            ) : (
              <>
                <div>
                  <div className="hrasst-performance-section-title">Top Performers</div>
                  <ul className="hrasst-performance-list">
                    {performance.topPerformers.slice(0, 3).map((performer, idx) => {
                      const score = typeof performer.percentage_score === 'number' ? performer.percentage_score : parseFloat(performer.percentage_score) || 0;
                      return (
                        <li key={idx} className="hrasst-performance-item">
                          <span className="hrasst-performance-name">{performer.employee_name || 'N/A'}</span>
                          <span className="hrasst-performance-score top">{score.toFixed(1)}%</span>
                        </li>
                      );
                    })}
                    {performance.topPerformers.length === 0 && (
                      <li style={{padding:'8px',color:'var(--hrasst-muted)',fontSize:'12px',textAlign:'center'}}>No data available</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="hrasst-performance-section-title">Least Performers</div>
                  <ul className="hrasst-performance-list">
                    {performance.bottomPerformers.slice(0, 3).map((performer, idx) => {
                      const score = typeof performer.percentage_score === 'number' ? performer.percentage_score : parseFloat(performer.percentage_score) || 0;
                      return (
                        <li key={idx} className="hrasst-performance-item">
                          <span className="hrasst-performance-name">{performer.employee_name || 'N/A'}</span>
                          <span className="hrasst-performance-score bottom">{score.toFixed(1)}%</span>
                        </li>
                      );
                    })}
                    {performance.bottomPerformers.length === 0 && (
                      <li style={{padding:'8px',color:'var(--hrasst-muted)',fontSize:'12px',textAlign:'center'}}>No data available</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </article>

        {/* Calendar */}
        <article
          className="hrasst-card"
          tabIndex={0}
          role="button"
          aria-label="Calendar container"
          onClick={() => setModalKind('calendar')}
          onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('calendar'); } }}
        >
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Calendar</h2>
            <span className="hrasst-kicker">{timeNow.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-calendar" aria-label="Monthly calendar" data-interactive="true">
            <div className="hrasst-calendar-header">
              <div className="hrasst-cal-nav">
                <button className="hrasst-btn" onClick={(e)=>{ e.stopPropagation(); setCalendarDate(d=>new Date(d.getFullYear(), d.getMonth()-1, 1)); }} aria-label="Previous month">◀</button>
                <div>{calendar.header}</div>
                <button className="hrasst-btn" onClick={(e)=>{ e.stopPropagation(); setCalendarDate(d=>new Date(d.getFullYear(), d.getMonth()+1, 1)); }} aria-label="Next month">▶</button>
              </div>
              <div className="hrasst-meta" title="Local time & weather">
                <span>{timeNow.toLocaleDateString()}</span>
                <span>•</span>
                <span>{weather.temp !== null ? `${weather.temp}°C` : '--'}</span>
                <span>{weather.description}</span>
              </div>
            </div>
            <div className="hrasst-cal-grid" aria-label="Calendar grid">
              {calendar.cells.map(c => (
                <div
                  key={c.key}
                  className={"hrasst-cal-cell " + c.className}
                  onClick={c.day ? (e)=>{ e.stopPropagation(); setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), c.day)); } : undefined}
                >
                  {c.text}
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Weekly Attendance Trend */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('attendance')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('attendance'); } }} aria-label="Open Weekly Attendance Trend details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Weekly Trend</h2>
            <span className="hrasst-kicker">Last 7 Days</span>
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-attendance-canvas-wrap">
            {attendanceTrend.loading ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--hrasst-muted)',fontSize:'12px'}}>Loading attendance data...</div>
            ) : attendanceTrend.error ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'#ef4444',fontSize:'12px'}}>{attendanceTrend.error}</div>
            ) : attendanceTrend.labels.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--hrasst-muted)',fontSize:'12px'}}>No attendance data available</div>
            ) : (
              <canvas ref={attendanceTrendCanvasRef} aria-label="Weekly attendance trend chart" role="img" />
            )}
          </div>
        </article>

        {/* Total Employees */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('employees')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('employees'); } }} aria-label="Open Total Employees details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Total Employees</h2>
            {employeeCountLoading && <span className="hrasst-kicker">Loading...</span>}
            {employeeCountError && <span className="hrasst-kicker" style={{color: '#ef4444'}}>Error</span>}
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-total-wrap">
            <div className="hrasst-total-num">
              {employeeCountLoading ? '...' : employeeCountError ? '--' : totals.total}
            </div>
            <div className="hrasst-trend" title="vs last month">{totals.trendText}</div>
          </div>
          <div className="hrasst-emp-spark"><canvas ref={empSparkRef} /></div>
          <div className="hrasst-breakdown">
            <div className="hrasst-kv">
              <span>Full-Time:</span> 
              <strong>{employeeCountLoading ? '...' : employeeCountError ? '--' : totals.fullTime}</strong>
            </div>
            <div className="hrasst-kv">
              <span>Training:</span> 
              <strong>{employeeCountLoading ? '...' : employeeCountError ? '--' : totals.training}</strong>
            </div>
          </div>
        </article>
      </section>

      {/* Modal */}
      <div className="hrasst-modal" role="dialog" aria-modal="true" aria-hidden={modalKind ? 'false' : 'true'} aria-labelledby="hrasst-modal-title" onClick={(e)=>{ if(e.target.classList.contains('hrasst-modal')) closeModal(); }}>
        <div className="hrasst-dialog">
          <header className="hrasst-dialog-hd">
            <h3 className="hrasst-dialog-title" id="hrasst-modal-title">
              {modalKind === 'performance' && 'Performance Report – Details'}
              {modalKind === 'calendar' && 'Calendar – Month View'}
              {modalKind === 'attendance' && 'Weekly Attendance Trend – Details'}
              {modalKind === 'employees' && 'Total Employees – Breakdown'}
            </h3>
            <button type="button" className="hrasst-close" onClick={closeModal}>Close</button>
          </header>
          <div className="hrasst-dialog-bd">
            {modalKind === 'performance' && (
              <div style={{minHeight: 360}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--hrasst-primary-900)'}}>Employee Performance Overview</div>
                    <div style={{fontSize:12,color:'var(--hrasst-muted)'}}>Top and least performers based on recent evaluations</div>
                  </div>
                </div>
                {performance.loading ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--hrasst-muted)'}}>Loading performance data...</div>
                ) : performance.error ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#ef4444'}}>{performance.error}</div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontWeight:700,color:'#0b4c24',marginBottom:12,fontSize:14}}>Top 5 Performers</div>
                      <ul className="hrasst-performance-list" style={{maxHeight:'none'}}>
                        {performance.topPerformers.length > 0 ? (
                          performance.topPerformers.map((performer, idx) => {
                            const score = typeof performer.percentage_score === 'number' ? performer.percentage_score : parseFloat(performer.percentage_score) || 0;
                            return (
                              <li key={idx} className="hrasst-performance-item" style={{padding:'12px'}}>
                                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                                  <span className="hrasst-performance-name" style={{fontSize:13}}>{performer.employee_name || 'N/A'}</span>
                                  <span style={{fontSize:11,color:'var(--hrasst-muted)'}}>{performer.department || 'N/A'} • {performer.position || 'N/A'}</span>
                                </div>
                                <span className="hrasst-performance-score top" style={{fontSize:14}}>{score.toFixed(1)}%</span>
                              </li>
                            );
                          })
                        ) : (
                          <li style={{padding:'20px',color:'var(--hrasst-muted)',fontSize:12,textAlign:'center'}}>No top performers data available</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div style={{fontWeight:700,color:'#991b1b',marginBottom:12,fontSize:14}}>Least 5 Performers</div>
                      <ul className="hrasst-performance-list" style={{maxHeight:'none'}}>
                        {performance.bottomPerformers.length > 0 ? (
                          performance.bottomPerformers.map((performer, idx) => {
                            const score = typeof performer.percentage_score === 'number' ? performer.percentage_score : parseFloat(performer.percentage_score) || 0;
                            return (
                              <li key={idx} className="hrasst-performance-item" style={{padding:'12px'}}>
                                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                                  <span className="hrasst-performance-name" style={{fontSize:13}}>{performer.employee_name || 'N/A'}</span>
                                  <span style={{fontSize:11,color:'var(--hrasst-muted)'}}>{performer.department || 'N/A'} • {performer.position || 'N/A'}</span>
                                </div>
                                <span className="hrasst-performance-score bottom" style={{fontSize:14}}>{score.toFixed(1)}%</span>
                              </li>
                            );
                          })
                        ) : (
                          <li style={{padding:'20px',color:'var(--hrasst-muted)',fontSize:12,textAlign:'center'}}>No least performers data available</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
            {modalKind === 'calendar' && (
              <div className="hrasst-calendar">
                <div className="hrasst-calendar-header">{new Date().toLocaleString(undefined,{month:'long'})} {new Date().getFullYear()}</div>
                <div className="hrasst-cal-grid">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=> <div key={'mod-dow-'+i} className="hrasst-cal-cell is-dow">{d}</div>)}
                  {(() => {
                    const y = new Date().getFullYear();
                    const m = new Date().getMonth();
                    const first = new Date(y,m,1).getDay();
                    const last = new Date(y,m+1,0).getDate();
                    const rows = [];
                    for (let i=0;i<first;i++) rows.push(<div key={'mod-empty-'+i} className="hrasst-cal-cell" />);
                    const today = new Date();
                    for (let d=1; d<=last; d++) {
                      const isToday = d===today.getDate() && m===today.getMonth() && y===today.getFullYear();
                      rows.push(<div key={'mod-day-'+d} className={"hrasst-cal-cell" + (isToday ? ' is-today' : '')}>{d}</div>);
                    }
                    return rows;
                  })()}
                </div>
              </div>
            )}
            {modalKind === 'attendance' && (
              <div style={{minHeight: 360}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--hrasst-primary-900)'}}>DAILY TREND</div>
                    <div style={{fontSize:12,color:'var(--hrasst-muted)'}}>Present vs Absent vs Late vs On Leave across the selected range</div>
                  </div>
                </div>
                {attendanceTrend.loading ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--hrasst-muted)'}}>Loading attendance data...</div>
                ) : attendanceTrend.error ? (
                  <div style={{textAlign:'center',padding:'40px',color:'#ef4444'}}>{attendanceTrend.error}</div>
                ) : attendanceTrend.labels.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px',color:'var(--hrasst-muted)'}}>No attendance data available</div>
                ) : (
                  <div style={{position:'relative',height:400}}>
                    <canvas ref={attendanceModalCanvasRef} />
                  </div>
                )}
              </div>
            )}
            {modalKind === 'employees' && (
              <div style={{display:'grid',gridTemplateColumns:'1.25fr 1fr',gap:16,alignItems:'stretch'}}>
                <div style={{position:'relative',border:'1px solid var(--hrasst-border)',borderRadius:14,padding:10}}>
                  <div style={{fontWeight:700,color:'var(--hrasst-primary-900)',margin:'6px 4px 8px'}}>Headcount Trend</div>
                  <div style={{position:'relative',height:280}}>
                    {/* Small sparkline using existing revenue data for placeholder trend */}
                    <canvas id="hrasst-emp-trend-react" />
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div className="hrasst-kv" style={{fontSize:14}}>
                    <span>Total:</span> 
                    <strong>{employeeCountLoading ? 'Loading...' : employeeCountError ? 'Error' : totals.total}</strong>
                  </div>
                  <div className="hrasst-kv" style={{fontSize:14}}>
                    <span>Full-Time:</span> 
                    <strong>{employeeCountLoading ? 'Loading...' : employeeCountError ? 'Error' : totals.fullTime}</strong>
                  </div>
                  <div className="hrasst-kv" style={{fontSize:14}}>
                    <span>Training:</span> 
                    <strong>{employeeCountLoading ? 'Loading...' : employeeCountError ? 'Error' : totals.training}</strong>
                  </div>
                  <div className="hrasst-kv" style={{fontSize:14}}><span>Trend:</span> <strong>{totals.trendText}</strong></div>
                  {employeeCountError && (
                    <div style={{fontSize:12,color:'#ef4444',marginTop:8}}>
                      Error loading employee data: {employeeCountError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <footer className="hrasst-dialog-ft">
            <button type="button" className="hrasst-close" onClick={closeModal}>Done</button>
          </footer>
        </div>
      </div>
    </div>
  );
}