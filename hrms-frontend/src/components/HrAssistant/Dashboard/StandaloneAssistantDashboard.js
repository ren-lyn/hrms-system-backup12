import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

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

    .hrasst-absent-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; overflow:hidden auto; }
    .hrasst-absent-item { display:grid; grid-template-columns:24px 1fr auto; align-items:center; gap:10px; padding:10px; border:1px solid var(--hrasst-border); border-radius:12px; background:#fafcff; }
    .hrasst-avatar { width:24px; height:24px; border-radius:50%; background: linear-gradient(135deg, #93c5fd, #1d4ed8); box-shadow: 0 2px 6px rgba(29,78,216,.25); }
    .hrasst-absent-meta { display:flex; flex-direction:column; line-height:1.15; }
    .hrasst-absent-name { font-weight:600; font-size:13px; }
    .hrasst-absent-date { font-size:12px; color:var(--hrasst-muted); }
    .hrasst-badge { font-size:11px; font-weight:700; letter-spacing:.3px; padding:6px 8px; border-radius:999px; white-space:nowrap; color:#0b4c24; background:#d1fae5; border:1px solid #bbf7d0; }

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
  const [revenue, setRevenue] = useState({
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    values: [12000, 15000, 10000, 17000, 14000, 20000]
  });
  const [absentees, setAbsentees] = useState([
    { name: 'Barayang, Crystal Anne A.', date: 'Feb 15', status: 'On Leave' },
    { name: 'Cabuyao, Donna Mae N.', date: 'Feb 15', status: 'On Leave' },
    { name: 'Concina, Renelyn S.', date: 'Feb 15–18', status: 'Sick Leave' },
    { name: 'Osias, Shariel D.', date: 'Feb 15–20', status: 'Vacation Leave' },
  ]);
  const [totals, setTotals] = useState({ total: 120, fullTime: 95, training: 25, trendText: '▲ +5%' });
  const [modalKind, setModalKind] = useState(null); // 'revenue' | 'calendar' | 'absent' | 'employees' | null

  // ---------- Chart refs ----------
  const revenueCanvasRef = useRef(null);
  const revenueChartRef = useRef(null);
  const revenueModalCanvasRef = useRef(null);
  const revenueModalChartRef = useRef(null);
  const empSparkRef = useRef(null);
  const empSparkChartRef = useRef(null);

  // ---------- Init revenue chart (no loop) ----------
  useEffect(() => {
    if (!revenueCanvasRef.current) return;
    // Clean-up if needed
    if (revenueChartRef.current) {
      revenueChartRef.current.destroy();
      revenueChartRef.current = null;
    }
    const ctx = revenueCanvasRef.current.getContext('2d');
    revenueChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: revenue.labels,
        datasets: [{
          label: 'Sales (₱)',
          data: revenue.values,
          backgroundColor: '#60a5fa',
          hoverBackgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, loop: false },
        scales: {
          x: { grid: { color: 'rgba(17,24,39,.06)' }, ticks: { color: '#1f2937', font: { weight: 600 } } },
          y: { grid: { color: 'rgba(17,24,39,.06)' }, ticks: { color: '#374151', callback: v => new Intl.NumberFormat('en-PH').format(v) } }
        },
        plugins: { legend: { display: false } }
      }
    });
    return () => { revenueChartRef.current?.destroy(); revenueChartRef.current = null; };
  }, [revenue.labels, revenue.values]);

  // When modal opens for revenue, create a separate chart instance (also non-looping)
  useEffect(() => {
    if (modalKind !== 'revenue') { // destroy if it exists
      revenueModalChartRef.current?.destroy();
      revenueModalChartRef.current = null;
      return;
    }
    if (!revenueModalCanvasRef.current) return;
    const ctx = revenueModalCanvasRef.current.getContext('2d');
    revenueModalChartRef.current?.destroy();
    revenueModalChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: revenue.labels,
        datasets: [{
          label: 'Sales (₱)',
          data: revenue.values,
          backgroundColor: '#93c5fd',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, loop: false },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(17,24,39,.06)' } },
          y: { grid: { color: 'rgba(17,24,39,.06)' }, ticks: { callback: v => '₱ ' + new Intl.NumberFormat('en-PH').format(v) } }
        }
      }
    });
  }, [modalKind, revenue.labels, revenue.values]);

  // Tiny headcount sparkline in Total Employees card
  useEffect(() => {
    if (!empSparkRef.current) return;
    if (empSparkChartRef.current) { empSparkChartRef.current.destroy(); empSparkChartRef.current = null; }
    const ctx = empSparkRef.current.getContext('2d');
    const labels = ['Jan','Feb','Mar','Apr','May','Jun'];
    const base = [100,105,108,110,114];
    const data = [...base, totals.total || 120];
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
      updateRevenue: (values, labels) => {
        if (!Array.isArray(values) || values.length === 0) return;
        setRevenue(r => ({ labels: Array.isArray(labels) && labels.length === values.length ? labels.slice() : r.labels, values: values.slice() }));
      },
      setAbsentList: (list) => { if (Array.isArray(list)) setAbsentees(list.slice()); },
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

      <div className="hrasst-header" role="region" aria-label="Header">
        <h1>Dashboard</h1>
        <span className="hrasst-status" title="Module is ready to connect">
          <span className="hrasst-dot" aria-hidden="true"></span>
          Ready to connect
        </span>
      </div>

      <section className="hrasst-grid" aria-label="Dashboard Grid">
        {/* Revenue Report */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('revenue')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('revenue'); } }} aria-label="Open Revenue Report details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Revenue Report</h2>
            <span className="hrasst-kicker">Sales (₱)</span>
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-revenue-canvas-wrap">
            <canvas ref={revenueCanvasRef} aria-label="Revenue chart" role="img" />
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

        {/* Absent Employees */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('absent')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('absent'); } }} aria-label="Open Absent Employees details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Absent Employees</h2>
            <span className="hrasst-kicker">Updated {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} / {new Date().toLocaleDateString()}</span>
          </div>
          <div className="hrasst-divider" />
          <ul className="hrasst-absent-list" aria-label="Absent employees list">
            {absentees.map((p, idx) => (
              <li key={idx} className="hrasst-absent-item">
                <span className="hrasst-avatar" aria-hidden="true"></span>
                <span className="hrasst-absent-meta">
                  <span className="hrasst-absent-name">{p.name}</span>
                  <span className="hrasst-absent-date">{p.date}</span>
                </span>
                <span className="hrasst-badge">{p.status}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Total Employees */}
        <article className="hrasst-card" tabIndex={0} role="button" onClick={() => setModalKind('employees')} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); setModalKind('employees'); } }} aria-label="Open Total Employees details">
          <div className="hrasst-card-header">
            <h2 className="hrasst-card-title">Total Employees</h2>
          </div>
          <div className="hrasst-divider" />
          <div className="hrasst-total-wrap">
            <div className="hrasst-total-num">{totals.total}</div>
            <div className="hrasst-trend" title="vs last month">{totals.trendText}</div>
          </div>
          <div className="hrasst-emp-spark"><canvas ref={empSparkRef} /></div>
          <div className="hrasst-breakdown">
            <div className="hrasst-kv"><span>Full-Time:</span> <strong>{totals.fullTime}</strong></div>
            <div className="hrasst-kv"><span>Training:</span> <strong>{totals.training}</strong></div>
          </div>
        </article>
      </section>

      {/* Modal */}
      <div className="hrasst-modal" role="dialog" aria-modal="true" aria-hidden={modalKind ? 'false' : 'true'} aria-labelledby="hrasst-modal-title" onClick={(e)=>{ if(e.target.classList.contains('hrasst-modal')) closeModal(); }}>
        <div className="hrasst-dialog">
          <header className="hrasst-dialog-hd">
            <h3 className="hrasst-dialog-title" id="hrasst-modal-title">
              {modalKind === 'revenue' && 'Revenue Report – Details'}
              {modalKind === 'calendar' && 'Calendar – Month View'}
              {modalKind === 'absent' && 'Absent Employees – Details'}
              {modalKind === 'employees' && 'Total Employees – Breakdown'}
            </h3>
            <button type="button" className="hrasst-close" onClick={closeModal}>Close</button>
          </header>
          <div className="hrasst-dialog-bd">
            {modalKind === 'revenue' && (
              <div style={{minHeight: 360}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,color:'var(--hrasst-primary-900)'}}>YTD Sales Overview</div>
                    <div style={{fontSize:12,color:'var(--hrasst-muted)'}}>Clean, non-looping visualization for clear decision-making</div>
                  </div>
                  <div style={{fontSize:12,color:'var(--hrasst-muted)'}}>Currency: PHP</div>
                </div>
                <div style={{position:'relative',height:340}}>
                  <canvas ref={revenueModalCanvasRef} />
                </div>
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
            {modalKind === 'absent' && (
              <ul className="hrasst-absent-list">
                {absentees.map((p, idx) => (
                  <li key={'m-'+idx} className="hrasst-absent-item">
                    <span className="hrasst-avatar"></span>
                    <span className="hrasst-absent-meta">
                      <span className="hrasst-absent-name">{p.name}</span>
                      <span className="hrasst-absent-date">{p.date}</span>
                    </span>
                    <span className="hrasst-badge">{p.status}</span>
                  </li>
                ))}
              </ul>
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
                  <div className="hrasst-kv" style={{fontSize:14}}><span>Total:</span> <strong>{totals.total}</strong></div>
                  <div className="hrasst-kv" style={{fontSize:14}}><span>Full-Time:</span> <strong>{totals.fullTime}</strong></div>
                  <div className="hrasst-kv" style={{fontSize:14}}><span>Training:</span> <strong>{totals.training}</strong></div>
                  <div className="hrasst-kv" style={{fontSize:14}}><span>Trend:</span> <strong>{totals.trendText}</strong></div>
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