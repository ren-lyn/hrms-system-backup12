import React, { useState } from 'react';
import axios from 'axios';
import managerApi from '../axios';
import { fetchLeaveRequests, getManagerPendingRequests } from '../api/leave';
import {
  Home,
  CalendarDays,
  ClipboardList,
  AlertCircle,
  Bell as BellIcon,
  LogOut,
  FileText,
  CalendarCheck,
  Eye,
  BarChart2,
  CheckCircle,
  Clock,
  History,
  Users,
  ClipboardCheck as ClipboardCheckIcon
} from 'lucide-react';
import useUserProfile from '../hooks/useUserProfile';
import useEmployeeCount from '../hooks/useEmployeeCount';
import ManagerLeaveManagement from '../components/Manager/ManagerLeaveManagement';
import ManagerEmployeeEvaluations from '../components/Manager/ManagerEmployeeEvaluations';
import ManagerDisciplinaryManagement from '../components/Manager/ManagerDisciplinaryManagement';
import ManagerProfile from '../components/Manager/ManagerProfile';
import ManagerCalendar from '../components/Manager/ManagerCalendar';
import ManagerViewAttendanceRecords from '../components/Manager/ManagerViewAttendanceRecords';
import ManagerOTManagement from '../components/Manager/ManagerOTManagement';
import Bell from '../components/Notifications/Bell';
import EmbeddedLeaveForm from '../components/Employee/EmbeddedLeaveForm';
import LeaveHistory from '../components/HrAssistant/LeaveHistory';



const ManagerDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(false);
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const [showEmployeeDrawer, setShowEmployeeDrawer] = useState(false);
  const [employeeDrawerLoading, setEmployeeDrawerLoading] = useState(false);
  const [employeeDrawerError, setEmployeeDrawerError] = useState('');
  const [employeeDrawerData, setEmployeeDrawerData] = useState([]);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState(false);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [pendingOtRequests, setPendingOtRequests] = useState([]);
  const [requestDrawerLoading, setRequestDrawerLoading] = useState(false);
  const [requestDrawerError, setRequestDrawerError] = useState('');
  const [requestMetricsState, setRequestMetricsState] = useState({
    leaveCount: 0,
    leavePercent: 0,
    otCount: 0,
    otPercent: 0,
    budgetUtilization: 72
  });
  const [activeRequestTab, setActiveRequestTab] = useState('leave');
  const [requestCacheTimestamp, setRequestCacheTimestamp] = useState(0);
  const [showDisciplinaryDrawer, setShowDisciplinaryDrawer] = useState(false);
  const [disciplinaryDrawerLoading, setDisciplinaryDrawerLoading] = useState(false);
  const [disciplinaryDrawerError, setDisciplinaryDrawerError] = useState('');
  const [activeDisciplinaryTab, setActiveDisciplinaryTab] = useState('ongoing');
  const [ongoingInvestigations, setOngoingInvestigations] = useState([]);
  const [completedInvestigations, setCompletedInvestigations] = useState([]);
  const [disciplinaryCacheTimestamp, setDisciplinaryCacheTimestamp] = useState(0);
  const [showEvaluationDrawer, setShowEvaluationDrawer] = useState(false);
  const [evaluationDrawerLoading, setEvaluationDrawerLoading] = useState(false);
  const [evaluationDrawerError, setEvaluationDrawerError] = useState('');
  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [completedEvaluations, setCompletedEvaluations] = useState([]);
  const [evaluationCacheTimestamp, setEvaluationCacheTimestamp] = useState(0);
  const [activeEvaluationTab, setActiveEvaluationTab] = useState('pending');
  const [evaluationProgressPercent, setEvaluationProgressPercent] = useState(0);
  const [nextEvaluationDate, setNextEvaluationDate] = useState(null);
  const { userProfile, loading } = useUserProfile();
  const { total: employeeTotal, loading: employeeCountLoading, error: employeeCountError } = useEmployeeCount();

  const links = [
    { icon: <Home size={18} />, label: 'Dashboard', view: 'dashboard' },
    { icon: <CalendarCheck size={18} />, label: 'Leave Request', view: 'leave-request' },
    { icon: <Clock size={18} />, label: 'Attendance Management', view: 'attendance-management' },
    { icon: <CalendarDays size={18} />, label: 'My Calendar', view: 'calendar' },
    { icon: <ClipboardList size={18} />, label: 'Evaluations', view: 'evaluations' },
    { icon: <AlertCircle size={18} />, label: 'Disciplinary Cases', view: 'disciplinary' },
    { icon: <FileText size={18} />, label: 'Reports', view: 'reports' },
    { icon: <LogOut size={18} />, label: 'Logout', view: 'logout' },
  ];

  // Responsive sidebar management
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1023;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      // remove axios header if set elsewhere
      try { delete require('axios').default.defaults.headers.common['Authorization']; } catch (e) {}
      window.location.href = '/';
    } catch (e) {
      window.location.href = '/';
    }
  };

  const handleNavigation = (view, label) => {
    if (view === 'logout') {
      handleLogout();
      return;
    }
    if (view === 'leave-request') {
      setLeaveMenuOpen(!leaveMenuOpen);
      return;
    }
    if (view === 'attendance-management') {
      setAttendanceMenuOpen(!attendanceMenuOpen);
      return;
    }
    setActiveView(view);
    if (isMobile) {
      closeSidebar();
    }
  };

  // Notification handlers
  const handleOpenLeave = (leaveId, data) => {
    setLeaveMenuOpen(true);
    setActiveView('leave-overview');
    // You can add additional logic to highlight specific leave request
  };

  const handleOpenCashAdvance = (cashAdvanceId, data) => {
    // Navigate to cash advance management if available
    console.log('Open cash advance:', cashAdvanceId, data);
  };

  const handleOpenEvaluation = (evaluationId, data) => {
    setActiveView('evaluations');
    // You can add additional logic to highlight specific evaluation
  };

  const handleOpenDisciplinary = (disciplinaryId, data) => {
    setActiveView('disciplinary');
    // You can add additional logic to highlight specific disciplinary case
  };

  const handleOpenCalendar = (eventId, data) => {
    setActiveView('calendar');
    // You can add additional logic to highlight specific calendar event
  };

  const closeEmployeeDrawer = () => setShowEmployeeDrawer(false);
  const closeRequestsDrawer = () => setShowRequestsDrawer(false);
  const closeEvaluationDrawer = () => setShowEvaluationDrawer(false);
  const closeDisciplinaryDrawer = () => setShowDisciplinaryDrawer(false);

  const getEmployeeProfile = (employee) => employee?.employee_profile || employee?.profile || employee || {};
  const getEmployeeName = (employee) => {
    const profile = getEmployeeProfile(employee);
    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    const middle = profile?.middle_name || '';
    const combined = [first, middle, last].filter(Boolean).join(' ').trim();
    const fallback = employee?.name || profile?.full_name || profile?.nickname;
    return combined || fallback || 'Unnamed Employee';
  };

  const getEmployeeDepartment = (employee) => {
    const profile = getEmployeeProfile(employee);
    return profile?.department || employee?.department || '—';
  };

  const getEmployeeStatus = (employee) => {
    const profile = getEmployeeProfile(employee);
    return profile?.employment_status || employee?.employment_status || 'Active';
  };

  const [employeeCacheTimestamp, setEmployeeCacheTimestamp] = useState(0);

  const dateFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }),
    []
  );

  const timeFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      }),
    []
  );

  const formatDateDisplay = (value) => {
    if (!value) return '';
    try {
      return dateFormatter.format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatDateRange = (start, end) => {
    const from = formatDateDisplay(start);
    const to = formatDateDisplay(end);
    if (from && to && from !== to) {
      return `${from} – ${to}`;
    }
    return from || to || 'Pending';
  };

  const extractTime = (value) => {
    if (!value) return '';
    const match = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return '';
    const hours = match[1].padStart(2, '0');
    const minutes = match[2].padStart(2, '0');
    const seconds = (match[3] || '00').padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatTimeRange = (start, end) => {
    if (!start && !end) return '';
    try {
      const startTime = extractTime(start);
      const endTime = extractTime(end);
      const formattedStart = startTime ? timeFormatter.format(new Date(`1970-01-01T${startTime}`)) : '';
      const formattedEnd = endTime ? timeFormatter.format(new Date(`1970-01-01T${endTime}`)) : '';
      if (formattedStart && formattedEnd) {
        return `${formattedStart} – ${formattedEnd}`;
      }
      return formattedStart || formattedEnd;
    } catch {
      return [start, end].filter(Boolean).join(' - ');
    }
  };

  const describeLeaveRequest = (request) => {
    if (!request) {
      return {
        employee: 'Unknown Employee',
        detail: '',
        period: ''
      };
    }
    const employeeName = getEmployeeName(request.employee || request.employee_profile || request);
    const leaveType = request.leave_type?.name || request.leave_type || request.type || 'Leave';
    const period = formatDateRange(request.start_date || request.startDate, request.end_date || request.endDate);
    return {
      employee: employeeName,
      detail: leaveType,
      period
    };
  };

  const describeOtRequest = (request) => {
    if (!request) {
      return {
        employee: 'Unknown Employee',
        detail: '',
        period: ''
      };
    }
    const employeeName =
      (request.employee?.first_name || request.employee?.last_name)
        ? `${request.employee.first_name || ''} ${request.employee.last_name || ''}`.trim()
        : request.employee_name || getEmployeeName(request.employee);
    const date = formatDateDisplay(request.ot_date || request.date || request.created_at);
    const timeRange = formatTimeRange(
      request.attendance?.clock_in || request.start_time,
      request.attendance?.clock_out || request.end_time
    );
    const hours = request.ot_hours ? `${request.ot_hours} ${request.ot_hours === 1 ? 'hour' : 'hours'}` : '';
    return {
      employee: employeeName || 'Unknown Employee',
      detail: hours || 'Pending review',
      period: timeRange ? `${date} • ${timeRange}` : date || 'Pending'
    };
  };

  const fetchEmployeeDrawerData = React.useCallback(async (options = { silent: false }) => {
    const silent = options?.silent;
    try {
      if (!silent) {
        setEmployeeDrawerLoading(true);
        setEmployeeDrawerError('');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setEmployeeDrawerError('Please sign in to view employee records.');
        if (!silent) {
          setEmployeeDrawerLoading(false);
        }
        return;
      }

      const response = await axios.get('http://localhost:8000/api/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      let payload = [];
      if (Array.isArray(response.data)) {
        payload = response.data;
      } else if (Array.isArray(response.data?.data)) {
        payload = response.data.data;
      } else if (Array.isArray(response.data?.employees)) {
        payload = response.data.employees;
      }

      setEmployeeDrawerData(payload);
      setEmployeeCacheTimestamp(Date.now());
    } catch (error) {
      console.error('Unable to load employee records for manager dashboard.', error);
      setEmployeeDrawerError('Unable to load employee records right now.');
    } finally {
      if (!silent) {
        setEmployeeDrawerLoading(false);
      }
    }
  }, []);

  const fetchEvaluationSummary = React.useCallback(async (options = { silent: false }) => {
    const silent = options?.silent;
    try {
      if (!silent) {
        setEvaluationDrawerLoading(true);
        setEvaluationDrawerError('');
      }

      const response = await managerApi.get('/manager-evaluations/employees');
      const employees = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      const pending = employees.filter((employee) => employee.can_evaluate !== false);
      const completed = employees.filter((employee) => employee.can_evaluate === false);
      const total = pending.length + completed.length;
      const percent = total === 0 ? 0 : Math.round((completed.length / total) * 100);

      const upcomingDates = employees
        .map((employee) => employee.next_evaluation_date)
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      setPendingEvaluations(pending);
      setCompletedEvaluations(completed);
      setEvaluationProgressPercent(percent);
      setNextEvaluationDate(upcomingDates.length > 0 ? upcomingDates[0] : null);
      setEvaluationCacheTimestamp(Date.now());
    } catch (error) {
      console.error('Unable to load evaluation summary.', error);
      setEvaluationDrawerError('Unable to load evaluation summary right now.');
    } finally {
      if (!silent) {
        setEvaluationDrawerLoading(false);
      }
    }
  }, []);

  const fetchDisciplinarySummary = React.useCallback(
    async (options = { silent: false }) => {
      const silent = options?.silent;
      try {
        if (!silent) {
          setDisciplinaryDrawerLoading(true);
          setDisciplinaryDrawerError('');
        }

        const params = {
          page: 1,
          status: 'all',
          per_page: 100
        };

        const response = await managerApi.get('/manager/disciplinary/investigations', {
          params
        });

        const investigations = Array.isArray(response.data?.data?.data)
          ? response.data.data.data
          : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

        const ongoing = investigations.filter(
          (item) =>
            (item.status || '').toLowerCase() !== 'completed' &&
            (item.status || '').toLowerCase() !== 'closed'
        );
        const completed = investigations.filter((item) =>
          ['completed', 'closed', 'resolved'].includes((item.status || '').toLowerCase())
        );

        setOngoingInvestigations(ongoing);
        setCompletedInvestigations(completed);
        setDisciplinaryCacheTimestamp(Date.now());
      } catch (error) {
        console.error('Unable to load disciplinary summary.', error);
        setDisciplinaryDrawerError('Unable to load disciplinary cases right now.');
      } finally {
        if (!silent) {
          setDisciplinaryDrawerLoading(false);
        }
      }
    },
    []
  );

  const loadPendingRequestSummary = React.useCallback(
    async (silent = false) => {
      const shouldShowDrawerLoader = !silent && showRequestsDrawer;
      try {
        if (shouldShowDrawerLoader) {
          setRequestDrawerLoading(true);
        }
        if (!silent) {
          setRequestDrawerError('');
        }
        const pendingStatuses = new Set(['pending', 'manager_pending']);

        const parseResponseArray = (response) => {
          if (!response) return [];
          if (Array.isArray(response.data)) return response.data;
          if (Array.isArray(response?.data?.data)) return response.data.data;
          if (Array.isArray(response?.data?.requests)) return response.data.requests;
          return [];
        };

        const parsePendingLeaves = (items) =>
          (items || []).filter((item) =>
            pendingStatuses.has((item?.status || '').toLowerCase())
          );

        const managerLeavePromise = getManagerPendingRequests()
          .then(parseResponseArray)
          .then(parsePendingLeaves)
          .catch((error) => {
            throw error;
          });

        // Swallow unhandled rejections when we stop awaiting the manager promise (after timeout).
        managerLeavePromise.catch(() => {});

        let leaves = [];
        try {
          leaves = await Promise.race([
            managerLeavePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('manager-leave-timeout')), 1200))
          ]);
        } catch {
          const fallbackResponse = await fetchLeaveRequests();
          const fallbackLeaves = parsePendingLeaves(parseResponseArray(fallbackResponse));
          leaves = fallbackLeaves;
        }

        const otPromise = managerApi
          .get('/manager/ot-requests', { params: { status: 'pending' } })
          .then(parseResponseArray)
          .catch((error) => {
            throw error;
          });

        otPromise.catch(() => {});

        let otRequests = [];
        try {
          otRequests = await Promise.race([
            otPromise,
            new Promise((resolve) => setTimeout(() => resolve([]), 1200))
          ]);
        } catch (otError) {
          console.error('Unable to load pending OT requests.', otError);
          otRequests = [];
        }

        setPendingLeaveRequests(leaves);
        setPendingOtRequests(otRequests);

        const totalActivity = Math.max(leaves.length + otRequests.length, 1);
        const leavePercent = Math.round((leaves.length / totalActivity) * 100);
        const otPercent = Math.round((otRequests.length / totalActivity) * 100);

        setRequestMetricsState((prev) => ({
          ...prev,
          leaveCount: leaves.length,
          leavePercent,
          otCount: otRequests.length,
          otPercent
        }));
        setRequestCacheTimestamp(Date.now());
        setRequestDrawerError('');
      } catch (error) {
        console.error('Unable to load pending leave/OT requests.', error);
        setRequestDrawerError('Unable to load pending requests right now.');
      } finally {
        if (shouldShowDrawerLoader) {
          setRequestDrawerLoading(false);
        }
      }
    },
    [showRequestsDrawer]
  );

  React.useEffect(() => {
    if (showEmployeeDrawer) {
      const cacheIsStale = Date.now() - employeeCacheTimestamp > 15000 || employeeCacheTimestamp === 0;
      if (cacheIsStale) {
        fetchEmployeeDrawerData();
      } else {
        setEmployeeDrawerLoading(false);
        fetchEmployeeDrawerData({ silent: true });
      }
    }
  }, [showEmployeeDrawer, fetchEmployeeDrawerData, employeeCacheTimestamp]);

  React.useEffect(() => {
    loadPendingRequestSummary();
    const interval = setInterval(() => loadPendingRequestSummary(true), 30000);
    return () => clearInterval(interval);
  }, [loadPendingRequestSummary]);

React.useEffect(() => {
  fetchEvaluationSummary();
  const interval = setInterval(() => fetchEvaluationSummary({ silent: true }), 45000);
  return () => clearInterval(interval);
}, [fetchEvaluationSummary]);

  React.useEffect(() => {
    fetchDisciplinarySummary();
    const interval = setInterval(() => fetchDisciplinarySummary({ silent: true }), 45000);
    return () => clearInterval(interval);
  }, [fetchDisciplinarySummary]);

  React.useEffect(() => {
    if (showRequestsDrawer) {
      setActiveRequestTab('leave');
      const cacheIsStale = Date.now() - requestCacheTimestamp > 15000 || requestCacheTimestamp === 0;
      if (cacheIsStale) {
        loadPendingRequestSummary();
      } else {
        setRequestDrawerLoading(false);
        loadPendingRequestSummary(true);
      }
    }
  }, [showRequestsDrawer, loadPendingRequestSummary, requestCacheTimestamp]);

  React.useEffect(() => {
    if (showEvaluationDrawer) {
      const cacheIsStale = Date.now() - evaluationCacheTimestamp > 15000 || evaluationCacheTimestamp === 0;
      if (cacheIsStale) {
        fetchEvaluationSummary();
      } else {
        setEvaluationDrawerLoading(false);
        fetchEvaluationSummary({ silent: true });
      }
    }
  }, [showEvaluationDrawer, fetchEvaluationSummary, evaluationCacheTimestamp]);

  React.useEffect(() => {
    if (showDisciplinaryDrawer) {
      const cacheIsStale = Date.now() - disciplinaryCacheTimestamp > 15000 || disciplinaryCacheTimestamp === 0;
      if (cacheIsStale) {
        fetchDisciplinarySummary();
      } else {
        setDisciplinaryDrawerLoading(false);
        fetchDisciplinarySummary({ silent: true });
      }

      if (ongoingInvestigations.length > 0) {
        setActiveDisciplinaryTab('ongoing');
      } else if (completedInvestigations.length > 0) {
        setActiveDisciplinaryTab('completed');
      }
    }
  }, [
    showDisciplinaryDrawer,
    fetchDisciplinarySummary,
    disciplinaryCacheTimestamp,
    ongoingInvestigations.length,
    completedInvestigations.length
  ]);

  React.useEffect(() => {
    if (!showEmployeeDrawer && !showRequestsDrawer && !showEvaluationDrawer && !showDisciplinaryDrawer) {
      return;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showEmployeeDrawer) {
          setShowEmployeeDrawer(false);
        }
        if (showRequestsDrawer) {
          setShowRequestsDrawer(false);
        }
        if (showEvaluationDrawer) {
          setShowEvaluationDrawer(false);
        }
        if (showDisciplinaryDrawer) {
          setShowDisciplinaryDrawer(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEmployeeDrawer, showRequestsDrawer, showEvaluationDrawer, showDisciplinaryDrawer]);

  React.useEffect(() => {
    if (!showEmployeeDrawer && !showRequestsDrawer && !showEvaluationDrawer && !showDisciplinaryDrawer) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showEmployeeDrawer, showRequestsDrawer, showEvaluationDrawer, showDisciplinaryDrawer]);

  const renderContent = () => {
    switch (activeView) {
      case 'leave-overview':
        return <ManagerLeaveManagement viewType="overview" />;
      case 'leave-status':
        return <ManagerLeaveManagement viewType="status" />;
      case 'leave-tracker':
        return <ManagerLeaveManagement viewType="tracker" />;
      case 'leave-history':
        return <LeaveHistory />;
      case 'leave-form':
        return <EmbeddedLeaveForm />;
      case 'attendance-records':
        return <ManagerViewAttendanceRecords />;
      case 'ot-management':
        return <ManagerOTManagement />;
      case 'calendar':
        return <ManagerCalendar />;
      case 'evaluations':
        return <ManagerEmployeeEvaluations />;
      case 'disciplinary':
        return <ManagerDisciplinaryManagement />;
      case 'profile':
        return <ManagerProfile onBack={() => setActiveView('dashboard')} />;
      case 'dashboard':
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => {
    const { leaveCount, leavePercent, otCount, otPercent, budgetUtilization } = requestMetricsState;

    const headcountUnavailable = !employeeCountLoading && (!employeeTotal || employeeTotal === 0);

    const overviewCards = [
      {
        title: 'Team Headcount',
        value: employeeCountLoading ? '...' : headcountUnavailable ? '—' : employeeTotal.toString(),
        subtitle: employeeCountLoading
          ? 'Syncing headcount'
          : headcountUnavailable
            ? 'Unable to load total'
            : 'Active members',
        trend: employeeCountLoading
          ? ''
          : headcountUnavailable
            ? 'Check connection'
            : 'Updated moments ago',
        icon: Users,
        accent: '#6366f1',
        accentBg: 'rgba(99, 102, 241, 0.12)',
        onClick: () => setShowEmployeeDrawer(true)
      },
      {
        title: 'Leave & OT Approvals',
        value: (leaveCount + otCount).toString(),
        subtitle: `${leaveCount} leave · ${otCount} OT pending`,
        trend: 'Live updates enabled',
        icon: ClipboardCheckIcon,
        accent: '#0ea5e9',
        accentBg: 'rgba(14, 165, 233, 0.12)',
        onClick: () => setShowRequestsDrawer(true)
      },
      {
        title: 'Evaluation Progress',
        value: `${evaluationProgressPercent}%`,
        subtitle: `${completedEvaluations.length} completed · ${pendingEvaluations.length} pending`,
        trend: nextEvaluationDate ? `Next: ${formatDateDisplay(nextEvaluationDate)}` : 'No upcoming evaluation',
        icon: ClipboardList,
        accent: '#f97316',
        accentBg: 'rgba(249, 115, 22, 0.12)',
        onClick: () => setShowEvaluationDrawer(true)
      },
      {
        title: 'Disciplinary Updates',
        value: (ongoingInvestigations.length + completedInvestigations.length).toString(),
        subtitle: `${ongoingInvestigations.length} ongoing · ${completedInvestigations.length} completed`,
        trend:
          ongoingInvestigations.length > 0
            ? 'Compliance review ongoing'
            : 'All clear',
        icon: AlertCircle,
        accent: '#ef4444',
        accentBg: 'rgba(239, 68, 68, 0.12)',
        onClick: () => setShowDisciplinaryDrawer(true)
      }
    ];

    const evaluationTrendData = [
      { date: 'Jan', score: 62 },
      { date: 'Apr', score: 71 },
      { date: 'Jul', score: 83 },
      { date: 'Oct', score: 88 }
    ];

    const chartWidth = 260;
    const chartHeight = 140;

    const computePoints = () =>
      evaluationTrendData.map((point, idx) => {
        const x =
          evaluationTrendData.length === 1
            ? chartWidth / 2
            : (chartWidth / (evaluationTrendData.length - 1)) * idx;
        const y = chartHeight - ((point.score - 50) / 40) * chartHeight;
        return { x, y };
      });

    const buildLinePath = (points) =>
      points
        .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');

    const buildAreaPath = (points) =>
      `M 0 ${chartHeight} ${points
        .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ')} L ${chartWidth} ${chartHeight} Z`;

    const performancePoints = computePoints();
    const performancePath = buildLinePath(performancePoints);
    const performanceAreaPath = buildAreaPath(performancePoints);
    const latestScore = evaluationTrendData[evaluationTrendData.length - 1].score;
    const startingScore = evaluationTrendData[0].score;
    const scoreChange = latestScore - startingScore;
    const formatChange = (value) =>
      `${value > 0 ? '+' : ''}${value.toFixed(0)} pts vs ${evaluationTrendData[0].date}`;

    const requestMetrics = [
      {
        label: 'Leave Approvals',
        value: leavePercent,
        meta: `${leaveCount} pending`,
        color: '#38bdf8'
      },
      {
        label: 'OT Requests',
        value: otPercent,
        meta: `${otCount} pending`,
        color: '#f97316'
      },
      {
        label: 'Disciplinary Updates',
        value: ongoingInvestigations.length,
        meta: `${ongoingInvestigations.length} ongoing · ${completedInvestigations.length} completed`,
        color: '#ef4444'
      }
    ];

    return (
      <div style={styles.dashboardContent}>
        <div style={styles.overviewGrid}>
          {overviewCards.map((card, idx) => {
            const isInteractive = typeof card.onClick === 'function';
            return (
              <div
                key={idx}
                style={{
                  ...styles.overviewCard,
                  ...(isInteractive ? styles.overviewCardInteractive : {})
                }}
                onClick={isInteractive ? card.onClick : undefined}
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onKeyDown={
                  isInteractive
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          card.onClick();
                        }
                      }
                    : undefined
                }
                aria-label={isInteractive ? `${card.title} – view employee records` : undefined}
              >
              <div style={styles.overviewHeader}>
                <div style={{ ...styles.overviewIconWrapper, backgroundColor: card.accentBg, color: card.accent }}>
                  <card.icon size={22} />
            </div>
                <span style={{ ...styles.overviewTrend, color: card.accent }}>{card.trend}</span>
        </div>
              <div>
                <div style={styles.overviewTitle}>{card.title}</div>
                <div style={styles.overviewValue}>{card.value}</div>
                <div style={styles.overviewSubtitle}>{card.subtitle}</div>
          </div>
            </div>
            );
          })}
          </div>

        <div style={styles.sectionGridTwoColumn}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Evaluation Summary</div>
              <span style={{ ...styles.badge, backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#15803d' }}>
                On Track
              </span>
            </div>
            <div style={styles.analyticsSummaryRow}>
              <div style={styles.analyticsSummaryMetric}>
                <span style={styles.analyticsSummaryLabel}>Latest score</span>
                <div style={styles.analyticsSummaryValue}>{latestScore}</div>
                <span style={{ ...styles.analyticsSummaryChange, color: '#2563eb' }}>
                  {formatChange(scoreChange)}
                </span>
              </div>
              <div style={styles.analyticsSummaryMetric}>
                <span style={styles.analyticsSummaryLabel}>3-month peak</span>
                <div style={styles.analyticsSummaryValue}>
                  {Math.max(...evaluationTrendData.map((point) => point.score))}
                </div>
                <span
                  style={{
                    ...styles.analyticsSummaryChange,
                    color: '#2563eb'
                  }}
                >
                  {`Reached on ${evaluationTrendData.reduce(
                    (prev, current) => (current.score > prev.score ? current : prev)
                  ).date}`}
                </span>
              </div>
            </div>
            <div style={styles.analyticsChartWrapper}>
              <svg
                width="100%"
                height="160"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(37, 99, 235, 0.2)" />
                    <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
                  </linearGradient>
                </defs>
                <path d={performanceAreaPath} fill="url(#performanceGradient)" />
                <path
                  d={performancePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {performancePoints.map((point, idx) => (
                  <circle
                    key={`performance-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r="4.2"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
            <div style={styles.analyticsLegend}>
              <div style={styles.analyticsLegendItem}>
                <span style={{ ...styles.analyticsLegendDot, backgroundColor: '#2563eb' }} />
                <span>Overall evaluation score</span>
              </div>
            </div>
            <div style={styles.analyticsMonthRow}>
              {evaluationTrendData.map((point) => (
                <span key={point.date} style={styles.analyticsMonthLabel}>
                  {point.date}
                </span>
              ))}
            </div>
          </div>

          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Request Overview</div>
              <span style={{ ...styles.badge, backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0369a1' }}>
                Today
              </span>
          </div>
            <div style={styles.metricList}>
              {requestMetrics.map((metric, idx) => (
                <div key={idx} style={styles.requestRow}>
                  <div style={styles.metricTop}>
                    <div style={styles.metricLabel}>{metric.label}</div>
                    <div style={styles.metricValue}>{metric.value}%</div>
        </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, backgroundColor: metric.color, width: `${metric.value}%` }} />
                  </div>
                  <div style={styles.metricDetail}>{metric.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="manager-dashboard hrms-dashboard-wrapper responsive-container" style={styles.app}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <button 
            className="hrms-mobile-menu-btn responsive-mobile-menu"
            onClick={toggleSidebar}
            aria-label="Toggle Navigation Menu"
            style={{
              position: 'fixed',
              top: '15px',
              left: '15px',
              zIndex: 1001,
              backgroundColor: '#204176',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '1.2rem',
              lineHeight: '1',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1a3660';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#204176';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
        )}
        
        {/* Sidebar Overlay */}
        <div 
          className={`hrms-sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`}
          onClick={closeSidebar}
        ></div>
        
        {/* Single Sidebar - Conditionally positioned */}
        <div className={`hrms-sidebar hrms-scrollable-sidebar hrms-unified-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
          <div>
            <h2 className="hrms-unified-logo">CCDC</h2>
            {links.map((link, idx) => (
              <div key={idx}>
                <button
                  className={`hrms-unified-nav-link ${
                    (link.view === 'leave-request' && (activeView === 'leave-overview' || activeView === 'leave-tracker' || activeView === 'leave-form' || activeView === 'leave-history')) ||
                    (link.view === 'attendance-management' && (activeView === 'attendance-records' || activeView === 'ot-management')) ||
                    activeView === link.view ? 'hrms-unified-active' : ''
                  }`}
                    onClick={() => handleNavigation(link.view, link.label)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {link.view === 'leave-request' && (
                    <span style={{ 
                      marginLeft: 'auto', 
                      transition: 'transform 0.3s ease',
                      transform: leaveMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  )}
                  {link.view === 'attendance-management' && (
                    <span style={{ 
                      marginLeft: 'auto', 
                      transition: 'transform 0.3s ease',
                      transform: attendanceMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  )}
                </button>
                
                {/* Dropdown Menu for Leave Request */}
                {link.view === 'leave-request' && leaveMenuOpen && (
                  <div style={{
                    paddingLeft: '40px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderLeft: '3px solid rgba(255, 255, 255, 0.2)',
                    marginLeft: '20px',
                    marginTop: '4px',
                    marginBottom: '4px'
                  }}>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'leave-form' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('leave-form');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <FileText size={16} />
                      <span>Leave Form</span>
                    </button>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'leave-overview' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('leave-overview');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <Eye size={16} />
                      <span>Leave Overview</span>
                    </button>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'leave-tracker' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('leave-tracker');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <BarChart2 size={16} />
                      <span>Leave Tracker</span>
                    </button>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'leave-history' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('leave-history');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <History size={16} />
                      <span>Leave History</span>
                    </button>
                  </div>
                )}
                
                {/* Dropdown Menu for Attendance Management */}
                {link.view === 'attendance-management' && attendanceMenuOpen && (
                  <div style={{
                    paddingLeft: '40px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderLeft: '3px solid rgba(255, 255, 255, 0.2)',
                    marginLeft: '20px',
                    marginTop: '4px',
                    marginBottom: '4px'
                  }}>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'attendance-records' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('attendance-records');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <Eye size={16} />
                      <span>View Attendance Records</span>
                    </button>
                    <button
                      className={`hrms-unified-nav-link ${activeView === 'ot-management' ? 'hrms-unified-active' : ''}`}
                      onClick={() => {
                        setActiveView('ot-management');
                        if (isMobile) closeSidebar();
                      }}
                      style={{
                        fontSize: '0.9rem',
                        padding: '10px 15px',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <CheckCircle size={16} />
                      <span>OT Management</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="hrms-unified-profile" onClick={() => setActiveView('profile')} style={{ cursor: 'pointer' }} title="Go to Profile">
            <img src="https://i.pravatar.cc/40" alt="profile" style={styles.avatar} />
            <div>
              <div>{loading ? 'Loading...' : userProfile?.name || 'Manager'}</div>
              <small>{loading ? 'Please wait...' : userProfile?.rawRole || 'Manager'}</small>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="hrms-main-content hrms-scrollable-main-content" style={(activeView === 'leave-request' || activeView === 'leave-overview' || activeView === 'leave-tracker' || activeView === 'leave-form' || activeView === 'leave-history' || activeView === 'attendance-records' || activeView === 'ot-management' || activeView === 'calendar' || activeView === 'evaluations' || activeView === 'disciplinary' || activeView === 'profile') ? {...styles.main, backgroundColor: '#f8f9fa', padding: '0'} : styles.main}>
          {activeView !== 'leave-request' && activeView !== 'leave-overview' && activeView !== 'leave-tracker' && activeView !== 'leave-form' && activeView !== 'leave-history' && activeView !== 'attendance-records' && activeView !== 'ot-management' && activeView !== 'calendar' && activeView !== 'evaluations' && activeView !== 'disciplinary' && activeView !== 'profile' && (
            <>
              {/* Header */}
              <div style={styles.header}>
                <h1 style={styles.headerTitle}>
                  {activeView === 'leave-request' ? 'Leave Management' : 
                   activeView === 'leave-history' ? 'Leave History' :
                   activeView === 'calendar' ? 'My Calendar' :
                   activeView === 'evaluations' ? 'Employee Evaluations' :
                   activeView === 'disciplinary' ? 'Disciplinary Management' :
                   activeView === 'profile' ? 'Profile' : 'Manager Dashboard'}
                </h1>
                <div style={styles.headerIcons}>
                  <Bell 
                    onOpenLeave={handleOpenLeave}
                    onOpenCashAdvance={handleOpenCashAdvance}
                    onOpenEvaluation={handleOpenEvaluation}
                    onOpenDisciplinary={handleOpenDisciplinary}
                    onOpenCalendar={handleOpenCalendar}
                  />
                  <span style={{ color: '#fff', marginRight: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {loading ? 'Loading...' : userProfile?.name || 'Manager'}
                  </span>
                  <img 
                    src="https://i.pravatar.cc/30" 
                    alt="profile" 
                    style={{...styles.headerAvatar, cursor: 'pointer'}} 
                    onClick={() => setActiveView('profile')}
                    title={`Go to Profile - ${userProfile?.name || 'Manager'}`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Dynamic Content */}
          {renderContent()}
          {showEmployeeDrawer && (
            <div
              style={styles.employeeDrawerOverlay}
              onClick={closeEmployeeDrawer}
              role="presentation"
            >
              <div
                style={styles.employeeDrawerCard}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Employee records"
              >
                <div style={styles.employeeDrawerHeader}>
                  <div>
                    <div style={styles.employeeDrawerTitle}>Employee Records</div>
                    <div style={styles.employeeDrawerSubtitle}>Snapshot of active team members</div>
        </div>
                  <button
                    type="button"
                    aria-label="Close employee records"
                    onClick={closeEmployeeDrawer}
                    style={styles.employeeDrawerClose}
                  >
                    ×
                  </button>
                </div>
                <div style={styles.employeeDrawerBody}>
                  {employeeDrawerLoading && (
                    <div style={styles.employeeDrawerMessage}>Loading employee records…</div>
                  )}
                  {!employeeDrawerLoading && employeeDrawerError && (
                    <div style={styles.employeeDrawerMessage}>{employeeDrawerError}</div>
                  )}
                  {!employeeDrawerLoading && !employeeDrawerError && (
                    <div style={styles.employeeDrawerList}>
                      {employeeDrawerData.length === 0 ? (
                        <div style={styles.employeeDrawerMessage}>No employee records available.</div>
                      ) : (
                        employeeDrawerData.map((employee, index) => (
                          <div
                            key={employee.id || `${getEmployeeName(employee)}-${index}`}
                            style={styles.employeeDrawerItem}
                          >
                            <div>
                              <div style={styles.employeeDrawerName}>{getEmployeeName(employee)}</div>
                              <div style={styles.employeeDrawerMeta}>{getEmployeeDepartment(employee)}</div>
                            </div>
                            <span style={styles.employeeDrawerBadge}>{getEmployeeStatus(employee)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {showRequestsDrawer && (
            <div
              style={styles.employeeDrawerOverlay}
              onClick={closeRequestsDrawer}
              role="presentation"
            >
              <div
                style={styles.employeeDrawerCard}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Pending leave and overtime requests"
              >
                <div style={styles.employeeDrawerHeader}>
                  <div>
                    <div style={styles.employeeDrawerTitle}>Leave & OT Approvals</div>
                    <div style={styles.employeeDrawerSubtitle}>Live list of pending employee requests</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close leave and OT approvals"
                    onClick={closeRequestsDrawer}
                    style={styles.employeeDrawerClose}
                  >
                    ×
                  </button>
                </div>
                <div style={styles.employeeDrawerBody}>
                  {requestDrawerLoading && (
                    <div style={styles.employeeDrawerMessage}>Loading pending requests…</div>
                  )}
                  {!requestDrawerLoading && requestDrawerError && (
                    <div style={styles.employeeDrawerMessage}>{requestDrawerError}</div>
                  )}
                  {!requestDrawerLoading && !requestDrawerError && (
                    <>
                      <div style={styles.requestTabs}>
                        <button
                          type="button"
                          onClick={() => setActiveRequestTab('leave')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeRequestTab === 'leave' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          Leave
                          <span style={styles.requestTabCount}>{pendingLeaveRequests.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRequestTab('ot')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeRequestTab === 'ot' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          OT
                          <span style={styles.requestTabCount}>{pendingOtRequests.length}</span>
                        </button>
                      </div>

                      <div style={styles.drawerSection}>
                        {activeRequestTab === 'leave' ? (
                          pendingLeaveRequests.length === 0 ? (
                            <div style={styles.employeeDrawerMessage}>No pending leave requests.</div>
                          ) : (
                            <div style={styles.employeeDrawerList}>
                              {pendingLeaveRequests.map((request, index) => {
                                const summary = describeLeaveRequest(request);
                                return (
                                  <div
                                    key={request.id || `${summary.employee}-${index}`}
                                    style={styles.employeeDrawerItem}
                                  >
                                    <div>
                                      <div style={styles.employeeDrawerName}>{summary.employee}</div>
                                      <div style={styles.employeeDrawerMeta}>{summary.detail}</div>
                                      <div style={styles.employeeDrawerDetail}>{summary.period}</div>
                                    </div>
                                    <span style={{ ...styles.employeeDrawerBadge, ...styles.requestTagLeave }}>
                                      Leave
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : pendingOtRequests.length === 0 ? (
                          <div style={styles.employeeDrawerMessage}>No pending overtime requests.</div>
                        ) : (
                          <div style={styles.employeeDrawerList}>
                            {pendingOtRequests.map((request, index) => {
                              const summary = describeOtRequest(request);
                              return (
                                <div
                                  key={request.id || `${summary.employee}-${index}`}
                                  style={styles.employeeDrawerItem}
                                >
                                  <div>
                                    <div style={styles.employeeDrawerName}>{summary.employee}</div>
                                    <div style={styles.employeeDrawerMeta}>{summary.detail}</div>
                                    <div style={styles.employeeDrawerDetail}>{summary.period}</div>
                                  </div>
                                  <span style={{ ...styles.employeeDrawerBadge, ...styles.requestTagOt }}>
                                    OT
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={styles.drawerReviewRow}>
                        <button
                          type="button"
                          style={styles.drawerReviewButton}
                          onClick={() => {
                            setShowRequestsDrawer(false);
                            setActiveView(activeRequestTab === 'leave' ? 'leave-overview' : 'ot-management');
                          }}
                        >
                          Review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {showEvaluationDrawer && (
            <div
              style={styles.employeeDrawerOverlay}
              onClick={closeEvaluationDrawer}
              role="presentation"
            >
              <div
                style={styles.employeeDrawerCard}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Evaluation progress"
              >
                <div style={styles.employeeDrawerHeader}>
                  <div>
                    <div style={styles.employeeDrawerTitle}>Evaluation Progress</div>
                    <div style={styles.employeeDrawerSubtitle}>Track pending and completed evaluations</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close evaluation progress"
                    onClick={closeEvaluationDrawer}
                    style={styles.employeeDrawerClose}
                  >
                    ×
                  </button>
                </div>
                <div style={styles.employeeDrawerBody}>
                  {evaluationDrawerLoading && (
                    <div style={styles.employeeDrawerMessage}>Loading evaluation summary…</div>
                  )}
                  {!evaluationDrawerLoading && evaluationDrawerError && (
                    <div style={styles.employeeDrawerMessage}>{evaluationDrawerError}</div>
                  )}
                  {!evaluationDrawerLoading && !evaluationDrawerError && (
                    <>
                      <div style={styles.requestTabs}>
                        <button
                          type="button"
                          onClick={() => setActiveEvaluationTab('pending')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeEvaluationTab === 'pending' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          Pending
                          <span style={styles.requestTabCount}>{pendingEvaluations.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveEvaluationTab('completed')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeEvaluationTab === 'completed' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          Completed
                          <span style={styles.requestTabCount}>{completedEvaluations.length}</span>
                        </button>
                      </div>

                      <div style={styles.drawerSection}>
                        {activeEvaluationTab === 'pending' ? (
                          pendingEvaluations.length === 0 ? (
                            <div style={styles.employeeDrawerMessage}>All employees have been evaluated.</div>
                          ) : (
                            <div style={styles.employeeDrawerList}>
                              {pendingEvaluations.map((employee, index) => (
                                <div
                                  key={employee.id || `${employee.name}-${index}`}
                                  style={styles.employeeDrawerItem}
                                >
                                  <div>
                                    <div style={styles.employeeDrawerName}>{employee.name || getEmployeeName(employee)}</div>
                                    <div style={styles.employeeDrawerMeta}>
                                      {[employee.department, employee.position].filter(Boolean).join(' • ') || '—'}
                                    </div>
                                    <div style={styles.employeeDrawerDetail}>
                                      {employee.next_evaluation_date
                                        ? `Due ${formatDateDisplay(employee.next_evaluation_date)}`
                                        : 'Awaiting scheduling'}
                                    </div>
                                  </div>
                                  <span style={{ ...styles.employeeDrawerBadge, ...styles.evaluationTagPending }}>
                                    Pending
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        ) : completedEvaluations.length === 0 ? (
                          <div style={styles.employeeDrawerMessage}>No completed evaluations yet.</div>
                        ) : (
                          <div style={styles.employeeDrawerList}>
                            {completedEvaluations.map((employee, index) => (
                              <div
                                key={employee.id || `${employee.name}-${index}`}
                                style={styles.employeeDrawerItem}
                              >
                                <div>
                                  <div style={styles.employeeDrawerName}>{employee.name || getEmployeeName(employee)}</div>
                                  <div style={styles.employeeDrawerMeta}>
                                    {[employee.department, employee.position].filter(Boolean).join(' • ') || '—'}
                                  </div>
                                  <div style={styles.employeeDrawerDetail}>
                                    {employee.last_evaluation?.submitted_at
                                      ? `Completed ${formatDateDisplay(employee.last_evaluation.submitted_at)}`
                                      : 'Completed'}
                                  </div>
                                </div>
                                <span style={{ ...styles.employeeDrawerBadge, ...styles.evaluationTagCompleted }}>
                                  Completed
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {activeEvaluationTab === 'pending' ? (
                        <div style={styles.drawerActionRow}>
                          <button
                            type="button"
                            style={{
                              ...styles.drawerReviewButton,
                              ...(pendingEvaluations.length === 0 ? styles.drawerReviewButtonDisabled : {})
                            }}
                            onClick={() => {
                              if (pendingEvaluations.length === 0) return;
                              setShowEvaluationDrawer(false);
                              setActiveView('evaluations');
                            }}
                            disabled={pendingEvaluations.length === 0}
                          >
                            Evaluate Now
                          </button>
                        </div>
                      ) : (
                        <div style={styles.drawerActionRow}>
                          <button
                            type="button"
                            style={{ ...styles.drawerSecondaryButton }}
                            onClick={() => {
                              setShowEvaluationDrawer(false);
                              setActiveView('evaluations');
                            }}
                          >
                            View Evaluations
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {showDisciplinaryDrawer && (
            <div
              style={styles.employeeDrawerOverlay}
              onClick={closeDisciplinaryDrawer}
              role="presentation"
            >
              <div
                style={styles.employeeDrawerCard}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Disciplinary case progress"
              >
                <div style={styles.employeeDrawerHeader}>
                  <div>
                    <div style={styles.employeeDrawerTitle}>Disciplinary Progress</div>
                    <div style={styles.employeeDrawerSubtitle}>Monitor ongoing investigations and resolved cases</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close disciplinary progress"
                    onClick={closeDisciplinaryDrawer}
                    style={styles.employeeDrawerClose}
                  >
                    ×
                  </button>
                </div>
                <div style={styles.employeeDrawerBody}>
                  {disciplinaryDrawerLoading && (
                    <div style={styles.employeeDrawerMessage}>Loading disciplinary summary…</div>
                  )}
                  {!disciplinaryDrawerLoading && disciplinaryDrawerError && (
                    <div style={styles.employeeDrawerMessage}>{disciplinaryDrawerError}</div>
                  )}
                  {!disciplinaryDrawerLoading && !disciplinaryDrawerError && (
                    <>
                      <div style={styles.requestTabs}>
                        <button
                          type="button"
                          onClick={() => setActiveDisciplinaryTab('ongoing')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeDisciplinaryTab === 'ongoing' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          Ongoing
                          <span style={styles.requestTabCount}>{ongoingInvestigations.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDisciplinaryTab('completed')}
                          style={{
                            ...styles.requestTabButton,
                            ...(activeDisciplinaryTab === 'completed' ? styles.requestTabButtonActive : {})
                          }}
                        >
                          Completed
                          <span style={styles.requestTabCount}>{completedInvestigations.length}</span>
                        </button>
                      </div>

                      <div style={styles.drawerSection}>
                        {activeDisciplinaryTab === 'ongoing' ? (
                          ongoingInvestigations.length === 0 ? (
                            <div style={styles.employeeDrawerMessage}>No ongoing investigations.</div>
                          ) : (
                            <div style={styles.employeeDrawerList}>
                              {ongoingInvestigations.map((investigation, index) => (
                                <div
                                  key={investigation.id || index}
                                  style={styles.employeeDrawerItem}
                                >
                                  <div>
                                    <div style={styles.employeeDrawerName}>
                                      {investigation.subject_employee?.name || getEmployeeName(investigation.employee)}
                                    </div>
                                    <div style={styles.employeeDrawerMeta}>
                                      {[
                                        investigation.category?.name,
                                        investigation.priority ? `Priority ${investigation.priority}` : null
                                      ]
                                        .filter(Boolean)
                                        .join(' • ') || '—'}
                                    </div>
                                    <div style={styles.employeeDrawerDetail}>
                                      {investigation.status ? `Status: ${investigation.status}` : 'Status pending'}
                                    </div>
                                  </div>
                                  <span style={{ ...styles.employeeDrawerBadge, ...styles.disciplinaryTagOngoing }}>
                                    In Progress
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        ) : completedInvestigations.length === 0 ? (
                          <div style={styles.employeeDrawerMessage}>No completed investigations yet.</div>
                        ) : (
                          <div style={styles.employeeDrawerList}>
                            {completedInvestigations.map((investigation, index) => (
                              <div
                                key={investigation.id || index}
                                style={styles.employeeDrawerItem}
                              >
                                <div>
                                  <div style={styles.employeeDrawerName}>
                                    {investigation.subject_employee?.name || getEmployeeName(investigation.employee)}
                                  </div>
                                  <div style={styles.employeeDrawerMeta}>
                                    {[
                                      investigation.category?.name,
                                      investigation.priority ? `Priority ${investigation.priority}` : null
                                    ]
                                      .filter(Boolean)
                                      .join(' • ') || '—'}
                                  </div>
                                  <div style={styles.employeeDrawerDetail}>
                                    {investigation.updated_at
                                      ? `Closed ${formatDateDisplay(investigation.updated_at)}`
                                      : 'Resolved'}
                                  </div>
                                </div>
                                <span style={{ ...styles.employeeDrawerBadge, ...styles.disciplinaryTagResolved }}>
                                  Resolved
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ height: '4px' }} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
    app: {
      display: 'flex',
      height: '100vh',
      fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#e9eff6',
    color: '#1f2937'
    },
    avatar: {
      width: '40px',
    borderRadius: '50%'
    },
    main: {
      flex: 1,
    padding: '32px',
      overflowY: 'auto',
    backgroundColor: '#f5f7fb'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    marginBottom: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, #0d6efd 0%, #2563eb 100%)',
    borderRadius: '16px',
      color: '#ffffff',
    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25)'
    },
    headerTitle: {
    fontSize: '26px',
    fontWeight: '600',
    color: '#ffffff'
    },
    headerIcons: {
      display: 'flex',
    alignItems: 'center'
    },
    headerAvatar: {
      width: '30px',
      borderRadius: '50%',
    cursor: 'pointer'
  },
  dashboardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px'
  },
  overviewGrid: {
      display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px'
    },
  overviewCard: {
      backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '22px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '160px'
  },
  overviewCardInteractive: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  overviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  overviewIconWrapper: {
    height: '44px',
    width: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  overviewTrend: {
    fontSize: '12px',
    fontWeight: '600'
  },
  overviewTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b'
  },
  overviewValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0f172a'
  },
  overviewSubtitle: {
    fontSize: '13px',
    color: '#64748b'
  },
  sectionGridTwoColumn: {
      display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
    },
    sectionCard: {
      backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
      display: 'flex',
      flexDirection: 'column',
    gap: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '6px 10px',
    borderRadius: '999px',
    letterSpacing: '0.02em'
  },
  evaluationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  evaluationItem: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: '14px',
    alignItems: 'center'
  },
  evaluationContent: {
      display: 'flex',
      flexDirection: 'column',
    gap: '4px'
  },
  metricIcon: {
    height: '40px',
    width: '40px',
    borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
    justifyContent: 'center'
  },
  metricLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  metricDetail: {
    fontSize: '13px',
    color: '#6b7280'
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a'
  },
  analyticsSummaryRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  analyticsSummaryMetric: {
    flex: '1',
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  analyticsSummaryLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#94a3b8'
  },
  analyticsSummaryValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a'
  },
  analyticsSummaryChange: {
    fontSize: '12px',
    fontWeight: '600'
  },
  analyticsChartWrapper: {
    marginTop: '18px',
    marginBottom: '12px',
    height: '160px'
  },
  analyticsLegend: {
    display: 'flex',
    gap: '18px',
    marginBottom: '8px'
  },
  analyticsLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b'
  },
  analyticsLegendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  analyticsMonthRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  analyticsMonthLabel: {
    minWidth: '32px',
    textAlign: 'center'
  },
  metricList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  requestRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  metricTop: {
      display: 'flex',
      justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px'
  },
  employeeDrawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    padding: '24px',
    zIndex: 1200
  },
  employeeDrawerCard: {
    backgroundColor: '#ffffff',
    width: 'min(640px, 90vw)',
    maxHeight: '80vh',
    borderRadius: '18px',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  employeeDrawerHeader: {
      display: 'flex',
    alignItems: 'center',
      justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
  },
  employeeDrawerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a'
  },
  employeeDrawerSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px'
  },
  employeeDrawerClose: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    lineHeight: 1,
    cursor: 'pointer',
    color: '#64748b'
  },
  employeeDrawerBody: {
    padding: '20px 24px',
    overflowY: 'auto'
  },
  employeeDrawerMessage: {
    padding: '36px 0',
    textAlign: 'center',
      fontSize: '14px',
    color: '#64748b'
  },
  employeeDrawerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  employeeDrawerItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    backgroundColor: '#f8fafc'
  },
  employeeDrawerName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a'
  },
  employeeDrawerMeta: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px'
  },
  employeeDrawerDetail: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  employeeDrawerBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: '#4338ca'
  },
  drawerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  drawerSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a'
  },
  drawerSectionBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '999px',
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    color: '#475569'
  },
  requestTagLeave: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    color: '#0369a1'
  },
  requestTagOt: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    color: '#c2410c'
  },
  evaluationTagPending: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#1d4ed8'
  },
  evaluationTagCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: '#15803d'
  },
  disciplinaryTagOngoing: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    color: '#c2410c'
  },
  disciplinaryTagResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#0f766e'
  },
  requestTabs: {
    display: 'inline-flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '999px',
    padding: '4px',
    marginBottom: '18px'
  },
  requestTabButton: {
    border: 'none',
    background: 'transparent',
    padding: '8px 16px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  requestTabButtonActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)'
  },
  requestTabCount: {
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '999px'
  },
  drawerReviewButton: {
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '10px 22px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease'
  },
  drawerReviewButtonDisabled: {
    backgroundColor: '#cbd5f5',
    color: '#94a3b8',
    cursor: 'not-allowed',
    transform: 'none'
  },
  drawerActionRow: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  drawerSecondaryButton: {
    border: 'none',
    backgroundColor: '#e2e8f0',
    color: '#1f2937',
    padding: '10px 22px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease'
  }
  };

  export default ManagerDashboard;
