import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import useUserProfile from '../hooks/useUserProfile';
import JobPostings from "../components/JobPostings";
import EmployeeRecords from './HrAssistant/EmployeeRecords';
import EvaluationAdministration from '../components/EvaluationAdministration';
import HrStaffProfile from '../components/HrStaff/HrStaffProfile';
import Onboarding from "../components/HrStaff/Onboarding";
import StaffCalendar from '../components/HrAssistant/StaffCalendar';
import DisciplinaryManagement from '../components/HrAssistant/DisciplinaryManagement';
import LeaveManagement from '../components/HrAssistant/LeaveManagement';
import LeaveForm from '../components/Admin/LeaveForm';
import LeaveTracker from '../components/HrAssistant/LeaveTracker';
import LeaveHistory from '../components/HrAssistant/LeaveHistory';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  faBriefcase,
  faUsers,
  faChartBar,
  faExclamationTriangle,
  faCalendarAlt,
  faUserPlus,
  faSignOutAlt,
  faFileAlt,
  faClipboardList,
  faHistory,
  faBars,
  faEnvelope,
  faBell as faBellIcon,
  faClock,
  faChevronDown,
  faChevronRight,
  faCheckCircle,
  faTimesCircle,
  faSun,
  faCloudSun,
  faCloud,
  faCloudRain,
  faSnowflake,
  faSmog,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Bell from '../components/Notifications/Bell';
import axios from "../axios";
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const dashboardStyles = `
  .hr-dashboard-hero {
    background: linear-gradient(135deg, #d9ecff 0%, #f6f9ff 45%, #ffffff 100%);
    border-radius: 24px;
    padding: 1.7rem 2rem;
    box-shadow: 0 16px 32px rgba(25, 87, 169, 0.1);
    position: relative;
    overflow: hidden;
  }
  .hr-dashboard-hero::after {
    content: "";
    position: absolute;
    inset: -60% 40% 10%;
    background: radial-gradient(circle at center, rgba(79, 159, 255, 0.22) 0%, rgba(79, 159, 255, 0) 70%);
    transform: rotate(12deg);
  }
  .hr-dashboard-hero-content {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1.2rem;
    z-index: 1;
  }
  .hr-dashboard-hero h1 {
    font-size: clamp(1.55rem, 2vw, 2rem);
    font-weight: 700;
    color: #0a2540;
    margin-bottom: 0.25rem;
  }
  .hr-dashboard-hero p {
    margin: 0;
    font-size: 1rem;
    color: #29527a;
  }
  .hr-dashboard-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    margin-top: 0.45rem;
  }
  .hr-dashboard-hero-tag {
    background: rgba(255, 255, 255, 0.7);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    color: #2f5aa8;
    font-weight: 600;
    backdrop-filter: blur(6px);
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .hr-dashboard-metrics-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.1rem;
    margin-top: 1.6rem;
  }
  .hr-dashboard-metric-card {
    background: #ffffff;
    border-radius: 22px;
    padding: 1.35rem;
    box-shadow: 0 22px 36px rgba(14, 35, 58, 0.1);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .hr-dashboard-metric-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 28px 44px rgba(14, 35, 58, 0.12);
  }
  .hr-dashboard-metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #1f4c8f;
    background: linear-gradient(135deg, rgba(56, 132, 255, 0.16), rgba(56, 132, 255, 0.05));
  }
  .hr-dashboard-metric-icon.secondary {
    color: #2b8a5d;
    background: linear-gradient(135deg, rgba(43, 138, 93, 0.16), rgba(43, 138, 93, 0.05));
  }
  .hr-dashboard-metric-icon.tertiary {
    color: #8a4bff;
    background: linear-gradient(135deg, rgba(138, 75, 255, 0.16), rgba(138, 75, 255, 0.05));
  }
  .hr-dashboard-metric-icon.quaternary {
    color: #f2994a;
    background: linear-gradient(135deg, rgba(242, 153, 74, 0.18), rgba(242, 153, 74, 0.08));
  }
  .hr-dashboard-metric-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #516a8f;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  .hr-dashboard-metric-value {
    font-size: clamp(1.7rem, 2.2vw, 2.1rem);
    font-weight: 700;
    color: #0c2440;
    line-height: 1.1;
  }
  .hr-dashboard-metric-footnote {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .hr-dashboard-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: rgba(12, 173, 101, 0.12);
    color: #148957;
  }
  .hr-dashboard-badge.rejected {
    background: rgba(230, 95, 95, 0.12);
    color: #d64545;
  }
  .hr-dashboard-weather-meta {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: #576b8a;
    font-size: 0.95rem;
  }
  .hr-dashboard-weather-temp {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(1.8rem, 2.3vw, 2.2rem);
    font-weight: 700;
    color: #0d2c54;
  }
  .hr-dashboard-weather-temp small {
    font-size: 1rem;
    font-weight: 500;
    color: #6580a5;
  }
  .hr-dashboard-analytics-card {
    background: #ffffff;
    border-radius: 22px;
    box-shadow: 0 16px 28px rgba(21, 35, 58, 0.12);
    padding: 1.35rem 1.5rem;
    height: 100%;
    min-height: 330px;
    max-height: 370px;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .hr-dashboard-analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .hr-dashboard-analytics-header h3 {
    font-size: 1.35rem;
    font-weight: 700;
    color: #0c2545;
    margin: 0;
  }
  .hr-dashboard-analytics-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .hr-dashboard-analytics-filters .form-select {
    background-position: right 0.75rem center;
    border-radius: 12px;
    padding-right: 2.25rem;
    border-color: rgba(12, 37, 69, 0.12);
    box-shadow: none;
    font-weight: 500;
  }
  .hr-dashboard-chart-container {
    position: relative;
    height: 250px;
  }
  .hr-dashboard-timeline-card {
    background: #ffffff;
    border-radius: 22px;
    box-shadow: 0 16px 28px rgba(15, 35, 61, 0.12);
    padding: 1.35rem 1.5rem;
    height: 100%;
    min-height: 330px;
    max-height: 370px;
    display: flex;
    flex-direction: column;
  }
  .hr-dashboard-timeline-card h4 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f2749;
    margin-bottom: 1.25rem;
  }
  .hr-dashboard-timeline {
    position: relative;
    margin-left: 0.85rem;
    padding-left: 1.5rem;
    flex: 1;
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .hr-dashboard-timeline::before {
    content: "";
    position: absolute;
    left: 0.2rem;
    top: 0.25rem;
    width: 2px;
    height: calc(100% - 0.5rem);
    background: linear-gradient(180deg, rgba(12,37,69,0.12) 0%, rgba(12,37,69,0.04) 100%);
  }
  .hr-dashboard-timeline-item {
    position: relative;
    padding: 0.65rem 0 0.65rem 0.25rem;
  }
  .hr-dashboard-timeline-node {
    position: absolute;
    left: -1.1rem;
    top: 1.05rem;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 0 4px rgba(12,37,69,0.08);
  }
  .timeline-node-hire { background: #3379ff; }
  .timeline-node-evaluation { background: #8a4bff; }
  .timeline-node-leave { background: #0fae6e; }
  .timeline-node-disciplinary { background: #f06548; }
  .hr-dashboard-timeline-button {
    display: flex;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.35rem 0 0.35rem 0.5rem;
    border-radius: 16px;
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .hr-dashboard-timeline-button:hover,
  .hr-dashboard-timeline-button:focus-visible {
    background: rgba(12, 37, 69, 0.05);
    outline: none;
    transform: translateX(4px);
  }
  .hr-dashboard-timeline-content {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
  }
  .hr-dashboard-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(12, 37, 69, 0.85), rgba(12, 37, 69, 0.65));
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.95rem;
    flex-shrink: 0;
  }
  .hr-dashboard-timeline-text {
    flex: 1;
  }
  .hr-dashboard-timeline-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    color: #6c7d97;
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
    font-weight: 500;
  }
  .hr-dashboard-timeline-title {
    font-weight: 600;
    color: #0d2342;
    margin-bottom: 0.35rem;
    font-size: 1rem;
  }
  .hr-dashboard-timeline-description {
    color: #3e4f66;
    font-size: 0.92rem;
    margin: 0;
  }
  .hr-dashboard-timeline-details {
    margin-top: 0.7rem;
    padding: 0.75rem 1rem;
    border-left: 3px solid rgba(12,37,69,0.12);
    background: rgba(12,37,69,0.04);
    border-radius: 0 16px 16px 0;
    color: #3a4f6b;
    font-size: 0.9rem;
  }
  .hr-dashboard-timeline-empty {
    padding: 1.75rem;
    text-align: center;
    color: #6c7d97;
    font-size: 0.95rem;
    background: rgba(12,37,69,0.02);
    border-radius: 18px;
  }
  .hr-dashboard-sidebar-stack > * {
    width: 100%;
  }
  .hr-dashboard-sidebar-stack .card {
    border-radius: 20px;
    box-shadow: 0 15px 28px rgba(15, 35, 61, 0.08);
  }
  @media (max-width: 991px) {
    .hr-dashboard-hero {
      padding: 1.75rem;
    }
    .hr-dashboard-metric-card {
      border-radius: 20px;
    }
  }
  @media (max-width: 575px) {
    .hr-dashboard-hero {
      border-radius: 20px;
    }
    .hr-dashboard-hero-content {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

const HrStaffDashboard = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);
  const [isJobOnboardingDropdownOpen, setIsJobOnboardingDropdownOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [timeNow, setTimeNow] = useState(new Date());
  const { userProfile, loading } = useUserProfile();
  const [isLeaveDropdownOpen, setIsLeaveDropdownOpen] = useState(false);
  const leaveViews = ['leave-overview', 'leave-form', 'leave-tracker', 'leave-history'];
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    leaveApproved: 0,
    leaveRejected: 0,
    pendingEvaluations: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [employeesData, setEmployeesData] = useState([]);
  const [leavesData, setLeavesData] = useState([]);
  const [evaluationsData, setEvaluationsData] = useState([]);
  const [disciplinaryReports, setDisciplinaryReports] = useState([]);
  const [weather, setWeather] = useState({
    temp: null,
    description: 'Loading weather…',
    location: 'Fetching location…',
    icon: faCloudSun,
  });
  const [analyticsFilters, setAnalyticsFilters] = useState({
    range: "90",
    department: "all",
  });
  const analyticsCanvasRef = useRef(null);
  const analyticsChartRef = useRef(null);
  const [expandedTimelineItems, setExpandedTimelineItems] = useState({});

  const resolveGreeting = () => {
    const hour = timeNow.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const mapWeatherDescription = useCallback((code) => {
    const descriptions = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Heavy drizzle",
      56: "Freezing drizzle",
      57: "Freezing drizzle",
      61: "Light rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Freezing rain",
      67: "Freezing rain",
      71: "Light snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Rain showers",
      81: "Rain showers",
      82: "Heavy showers",
      85: "Snow showers",
      86: "Snow showers",
      95: "Thunderstorm",
      96: "Thunder w/ hail",
      99: "Severe thunderstorm",
    };
    return descriptions[code] || "Current weather";
  }, []);

  const mapWeatherIcon = useCallback((code) => {
    if ([0].includes(code)) return faSun;
    if ([1, 2].includes(code)) return faCloudSun;
    if ([3, 45, 48].includes(code)) return faCloud;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return faCloudRain;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return faSnowflake;
    if ([95, 96, 99].includes(code)) return faBolt;
    if ([56, 57, 66, 67].includes(code)) return faSmog;
    return faCloudSun;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async () => {
      if (!isMounted) return;
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const results = await Promise.allSettled([
          axios.get("/employees"),
          axios.get("/leave-requests"),
          axios.get("/evaluations"),
          axios.get("/hr/disciplinary/reports", { params: { per_page: 5 } }),
        ]);

        if (!isMounted) return;

        let nextMetrics = {
          totalEmployees: 0,
          leaveApproved: 0,
          leaveRejected: 0,
          pendingEvaluations: 0,
        };
        const errors = [];

        const [employeesResult, leaveResult, evaluationResult, disciplinaryResult] = results;

        if (employeesResult.status === "fulfilled") {
          const payload = employeesResult.value?.data;
          const employees = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
          nextMetrics.totalEmployees = employees.length;
          setEmployeesData(employees);
        } else {
          errors.push("employees");
        }

        if (leaveResult.status === "fulfilled") {
          const payload = leaveResult.value?.data;
          const leaves = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
          nextMetrics.leaveApproved = leaves.filter(
            (request) =>
              (request.status || "").toLowerCase() === "approved" ||
              (request.status || "").toLowerCase() === "manager_approved"
          ).length;
          nextMetrics.leaveRejected = leaves.filter(
            (request) =>
              (request.status || "").toLowerCase() === "rejected" ||
              (request.status || "").toLowerCase() === "manager_rejected"
          ).length;
          setLeavesData(leaves);
        } else {
          errors.push("leave requests");
        }

        if (evaluationResult.status === "fulfilled") {
          const payload = evaluationResult.value?.data;
          const evaluations = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : [];
          nextMetrics.pendingEvaluations = evaluations.filter((evaluation) => {
            const status = (evaluation.status || "").toLowerCase();
            return status !== "final" && status !== "completed";
          }).length;
          setEvaluationsData(evaluations);
        } else {
          console.warn("Unable to refresh evaluations data at this time.");
        }

        if (disciplinaryResult.status === "fulfilled") {
          const payload = disciplinaryResult.value?.data;
          const reports = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
            ? payload
            : [];
          setDisciplinaryReports(reports);
        } else {
          errors.push("disciplinary reports");
        }

        setMetrics(nextMetrics);
        if (errors.length) {
          setMetricsError(
            `Unable to refresh ${errors.join(", ")} data right now.`
          );
        } else {
          setMetricsError(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load dashboard metrics:", error);
        setMetricsError("We couldn't load dashboard metrics right now.");
      } finally {
        if (isMounted) {
          setMetricsLoading(false);
        }
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchWeather = (latitude, longitude, locationLabel) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
      fetch(url, { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => {
          if (!isMounted) return;
          const current = data?.current_weather;
          if (!current) return;
          setWeather({
            temp: Math.round(current.temperature),
            description: mapWeatherDescription(current.weathercode),
            location: locationLabel,
            icon: mapWeatherIcon(current.weathercode),
          });
        })
        .catch(() => {
          if (!isMounted) return;
          setWeather((prev) => ({
            ...prev,
            description: "Weather unavailable",
            location: locationLabel,
          }));
        });
    };

    const fallbackLocation = () => {
      fetchWeather(14.5995, 120.9842, "Manila, PH");
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude, "Your area");
        },
        () => fallbackLocation(),
        { timeout: 8000 }
      );
    } else {
      fallbackLocation();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [mapWeatherDescription, mapWeatherIcon]);

  const employeesStatusData = useMemo(() => {
    return (employeesData || []).map((employee) => {
      const profile = employee.employeeProfile || employee.employee_profile || {};
      const statusSource = `${profile.employment_status || employee.employment_status || ""}`.toLowerCase();
      let status = "active";
      if (statusSource.includes("resign")) {
        status = "resigned";
      } else if (statusSource.includes("term") || statusSource.includes("dismiss")) {
        status = "terminated";
      }
      const department = profile.department || "";
      const hireDate = profile.hire_date || employee.hire_date || employee.created_at || employee.updated_at;
      const terminationDate = profile.termination_date || profile.terminated_at || employee.terminated_at || null;
      const updatedAt = employee.updated_at || profile.updated_at || null;
      const activityDate = status === "active"
        ? hireDate || updatedAt
        : terminationDate || updatedAt || hireDate;

      const firstName = profile.first_name || employee.first_name || employee.name || "";
      const lastName = profile.last_name || employee.last_name || "";

      return {
        id: employee.id,
        status,
        department,
        activityDate,
        hireDate,
        terminationDate,
        firstName,
        lastName,
        profile,
      };
    });
  }, [employeesData]);

  const departmentOptions = useMemo(() => {
    const deps = new Set();
    employeesStatusData.forEach(({ department }) => {
      if (department) {
        deps.add(department);
      }
    });
    return Array.from(deps).sort((a, b) => a.localeCompare(b));
  }, [employeesStatusData]);

  const filteredStatusData = useMemo(() => {
    if (!employeesStatusData.length) return [];
    const { range, department } = analyticsFilters;
    const now = new Date();
    const limitDate = range === "all" ? null : new Date(now.getTime() - Number(range) * 24 * 60 * 60 * 1000);

    return employeesStatusData.filter((item) => {
      if (department !== "all" && `${item.department || ""}`.toLowerCase() !== department.toLowerCase()) {
        return false;
      }
      if (!limitDate) return true;
      if (!item.activityDate) return true;
      const activity = new Date(item.activityDate);
      if (Number.isNaN(activity.getTime())) return true;
      return activity >= limitDate;
    });
  }, [employeesStatusData, analyticsFilters]);

  const statusCounts = useMemo(() => {
    return filteredStatusData.reduce(
      (acc, item) => {
        if (item.status === "resigned") {
          acc.resigned += 1;
        } else if (item.status === "terminated") {
          acc.terminated += 1;
        } else {
          acc.active += 1;
        }
        return acc;
      },
      { active: 0, resigned: 0, terminated: 0 }
    );
  }, [filteredStatusData]);

  const buildTimelineItems = useMemo(() => {
    const items = [];

    employeesStatusData.forEach((emp) => {
      const eventDate = emp.hireDate || emp.activityDate;
      if (!eventDate) return;
      const timestamp = new Date(eventDate);
      if (Number.isNaN(timestamp.getTime())) return;
      items.push({
        id: `hire-${emp.id}`,
        type: "hire",
        timestamp,
        title: `${emp.firstName || "New"} ${emp.lastName || "Hire"}`.trim(),
        description: emp.department
          ? `Joined the ${emp.department} department as ${emp.profile?.position || "team member"}.`
          : `Added to the workforce as ${emp.profile?.position || "staff"}.`,
        details: emp.profile?.present_address
          ? `Address on file: ${emp.profile.present_address}`
          : `Hired on ${timestamp.toLocaleDateString()}.`,
        department: emp.department || "General",
        initials: `${(emp.firstName || "N")[0] || ""}${(emp.lastName || "H")[0] || ""}`.toUpperCase(),
      });
    });

    evaluationsData.forEach((evaluation) => {
      const status = (evaluation.status || "").toLowerCase();
      if (!["final", "completed", "approved"].includes(status)) return;
      const timestamp = new Date(evaluation.updated_at || evaluation.evaluation_date || evaluation.created_at);
      if (Number.isNaN(timestamp.getTime())) return;
      const employee = evaluation.employee || evaluation.user || {};
      const firstName = employee.first_name || evaluation.employee_first_name || "";
      const lastName = employee.last_name || evaluation.employee_last_name || "";
      items.push({
        id: `evaluation-${evaluation.id}`,
        type: "evaluation",
        timestamp,
        title: `${firstName || "Employee"} ${lastName}`.trim() || "Evaluation Completed",
        description: evaluation.form_title
          ? `Completed the ${evaluation.form_title} evaluation.`
          : "Evaluation finalized and archived.",
        details: evaluation.total_score
          ? `Total score recorded: ${evaluation.total_score}.`
          : `Evaluation finalized on ${timestamp.toLocaleDateString()}.`,
        department: evaluation.department || evaluation.job_title || "Company-wide",
        initials: `${(firstName || "E")[0] || ""}${(lastName || "C")[0] || ""}`.toUpperCase(),
      });
    });

    leavesData.forEach((leave) => {
      const status = (leave.status || "").toLowerCase();
      if (!["approved", "manager_approved"].includes(status)) return;
      const timestamp = new Date(leave.updated_at || leave.approved_at || leave.to || leave.from || leave.created_at);
      if (Number.isNaN(timestamp.getTime())) return;
      const employee = leave.employee || {};
      const firstName = employee.first_name || leave.name || "";
      const lastName = employee.last_name || "";
      items.push({
        id: `leave-${leave.id}`,
        type: "leave",
        timestamp,
        title: `${firstName || "Employee"} ${lastName}`.trim() || "Leave Approved",
        description: leave.type
          ? `Leave request (${leave.type}) was approved.`
          : "Leave request received final approval.",
        details: leave.reason
          ? `Reason: ${leave.reason}`
          : `Leave period: ${leave.from ? new Date(leave.from).toLocaleDateString() : "N/A"} to ${leave.to ? new Date(leave.to).toLocaleDateString() : "N/A"}.`,
        department: employee.department || "HR",
        initials: `${(firstName || "L")[0] || ""}${(lastName || "A")[0] || ""}`.toUpperCase(),
      });
    });

    disciplinaryReports.forEach((report) => {
      const timestamp = new Date(report.created_at || report.incident_date || report.updated_at);
      if (Number.isNaN(timestamp.getTime())) return;
      const employee = report.employee || {};
      const firstName = employee.first_name || "";
      const lastName = employee.last_name || "";
      items.push({
        id: `disciplinary-${report.id}`,
        type: "disciplinary",
        timestamp,
        title: report.disciplinary_category?.name
          ? `${report.disciplinary_category.name} Report`
          : "Disciplinary Report Logged",
        description: `${firstName || "Employee"} ${lastName}`.trim()
          ? `${firstName || "Employee"} ${lastName}`.trim()
          : "Employee disciplinary case recorded.",
        details: report.incident_description
          ? report.incident_description
          : `Reported on ${timestamp.toLocaleDateString()} with status ${(report.status || "pending").toUpperCase()}.`,
        department: employee.department || "Cross-Department",
        initials: `${(firstName || "D")[0] || ""}${(lastName || "R")[0] || ""}`.toUpperCase(),
      });
    });

    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 12);
  }, [employeesStatusData, evaluationsData, leavesData, disciplinaryReports]);

  const handleFilterChange = (key, value) => {
    setAnalyticsFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleTimelineItem = (id) => {
    setExpandedTimelineItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatTimestampDescriptor = useCallback((date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Unknown date";
    const today = new Date();
    const diffMs = today.getTime() - date.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `About ${Math.round(diffDays / 7)} week(s) ago`;
    if (diffDays < 365) return `About ${Math.round(diffDays / 30)} month(s) ago`;
    return date.toLocaleDateString();
  }, []);

  useEffect(() => {
    const canvas = analyticsCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const activeGradient = context.createLinearGradient(0, 0, canvas.width, 0);
    activeGradient.addColorStop(0, "rgba(45, 119, 253, 0.9)");
    activeGradient.addColorStop(1, "rgba(45, 119, 253, 0.65)");

    const resignedGradient = context.createLinearGradient(0, 0, canvas.width, 0);
    resignedGradient.addColorStop(0, "rgba(246, 190, 82, 0.95)");
    resignedGradient.addColorStop(1, "rgba(246, 190, 82, 0.6)");

    const terminatedGradient = context.createLinearGradient(0, 0, canvas.width, 0);
    terminatedGradient.addColorStop(0, "rgba(240, 101, 72, 0.9)");
    terminatedGradient.addColorStop(1, "rgba(240, 101, 72, 0.65)");

    const data = {
      labels: ["Active", "Resigned", "Terminated"],
      datasets: [
        {
          data: [statusCounts.active, statusCounts.resigned, statusCounts.terminated],
          backgroundColor: [activeGradient, resignedGradient, terminatedGradient],
          hoverBackgroundColor: ["#2d77fd", "#f6be52", "#f06548"],
          borderRadius: 18,
          borderSkipped: false,
          barThickness: 32,
        },
      ],
    };

    const options = {
      indexAxis: "y",
      animation: {
        duration: 800,
        easing: "easeOutQuart",
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#0b1c34",
          titleColor: "#ffffff",
          bodyColor: "#eef2fa",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            drawBorder: false,
            color: "rgba(12, 37, 69, 0.08)",
          },
          ticks: {
            color: "#44546d",
            font: { size: 12, weight: "600" },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#0c2545",
            font: { size: 13, weight: "600" },
          },
        },
      },
    };

    if (analyticsChartRef.current) {
      analyticsChartRef.current.data = data;
      analyticsChartRef.current.options = options;
      analyticsChartRef.current.update();
      return;
    }

    const chartInstance = new ChartJS(context, {
      type: "bar",
      data,
      options,
    });
    analyticsChartRef.current = chartInstance;

    const handleResize = () => {
      if (analyticsChartRef.current) {
        analyticsChartRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.destroy();
      analyticsChartRef.current = null;
    };
  }, [statusCounts]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleJobOnboardingDropdown = () => {
    setIsJobOnboardingDropdownOpen(!isJobOnboardingDropdownOpen);
  };

  const toggleLeaveDropdown = () => {
    setIsLeaveDropdownOpen((prev) => !prev);
  };

  const handleSetActiveView = (view) => {
    setActiveView(view);
    if (!leaveViews.includes(view)) {
      setIsLeaveDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (leaveViews.includes(activeView)) {
      setIsLeaveDropdownOpen(true);
    }
  }, [activeView]);

  // Toast notification helpers
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  // Notification handlers
  const handleOpenLeave = (leaveId, data) => {
    handleSetActiveView('leave-overview');
    // You can add additional logic to highlight specific leave request
  };

  const handleOpenCashAdvance = (cashAdvanceId, data) => {
    // Navigate to cash advance management if available
    console.log('Open cash advance:', cashAdvanceId, data);
  };

  const handleOpenEvaluation = (evaluationId, data) => {
    handleSetActiveView('evaluation');
    // You can add additional logic to highlight specific evaluation
  };

  const handleOpenDisciplinary = (disciplinaryId, data) => {
    handleSetActiveView('disciplinary');
    // You can add additional logic to highlight specific disciplinary case
  };

  const handleOpenCalendar = (eventId, data) => {
    handleSetActiveView('calendar');
    // You can add additional logic to highlight specific calendar event
  };

  const handleOpenJobApplications = (applicationId, data) => {
    handleSetActiveView('onboarding');
    // You can add additional logic to highlight specific application
  };

  const handleOpenJobPostings = (jobPostingId, data) => {
    handleSetActiveView('job-posting');
    // You can add additional logic to highlight specific job posting
  };

  // Logout functionality
  const handleLogout = async (e) => {
    e.preventDefault();
    
    // Show confirmation dialog
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) {
      return;
    }

    const loadingToast = toast.loading('Logging out...');

    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      
      if (token) {
        // Optional: Call logout API endpoint if your backend has one
        // This is useful for invalidating tokens on the server side
        try {
          // Uncomment and modify this if you have a logout API endpoint
          // await axios.post('http://localhost:8000/api/logout', {}, {
          //   headers: { Authorization: `Bearer ${token}` }
          // });
        } catch (apiError) {
          // Don't prevent logout if API call fails
          console.warn('Logout API call failed:', apiError);
        }
      }

      // Clear all authentication data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      
      // Clear any other stored user data
      sessionStorage.clear();

      toast.dismiss(loadingToast);
      showSuccess('Logged out successfully!');

      // Redirect to login page after a short delay
      setTimeout(() => {
        // Redirect based on your routing setup
        if (typeof window !== 'undefined') {
          // If using React Router, you might use navigate instead
          window.location.href = '/';
          // Alternative: window.location.replace('/login');
          
          // If you're using React Router with useNavigate:
          // navigate('/login', { replace: true });
        }
      }, 1000);

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Logout error:', error);
      showError('Logout failed. Please try again.');
    }
  };

  const getHeaderTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Dashboard";
      case "job-posting":
        return "Job Posting";
      case "onboarding":
        return "Onboarding";
      case "employee-record":
        return "Employee Record";
      case "evaluation":
        return "Evaluation";
      case "disciplinary":
        return "Disciplinary Action & Issuance";
      case "leave-overview":
        return "Leave Overview";
      case "leave-form":
        return "Leave Form";
      case "leave-tracker":
        return "Leave Tracker";
      case "leave-history":
        return "Leave History";
      case "calendar":
        return "My Calendar";
      case "onboarding":
        return "Onboarding";
      case "profile":
        return "Profile";
      default:
        return "Dashboard";
    }
  };

  const renderContent = () => {
    if (activeView === "dashboard") {
      const formattedDate = timeNow.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const formattedTime = timeNow.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const heroName = userProfile?.firstName
        ? userProfile.firstName
        : userProfile?.name || "HR Team";

      return (
        <>
          <div className="hr-dashboard-hero">
            <div className="hr-dashboard-hero-content">
              <div>
                <p className="text-uppercase fw-semibold text-muted mb-1">
                  {resolveGreeting()}
                  {", "}
                  {heroName}
                  {!loading && "!"}
                </p>
                <h1>Here’s what’s happening today</h1>
                <div className="hr-dashboard-hero-meta">
                  <span>{formattedDate}</span>
                  <span>•</span>
                  <span>{formattedTime}</span>
                    </div>
                  </div>
              <div className="hr-dashboard-hero-tag">
                <FontAwesomeIcon icon={faBriefcase} />
                {userProfile?.position || userProfile?.role || "HR Staff"}
              </div>
              </div>
            </div>

          <div className="hr-dashboard-metrics-row">
            <div className="hr-dashboard-metric-card" aria-live="polite">
              <div className="hr-dashboard-metric-icon">
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div>
                <div className="hr-dashboard-metric-label">Total Employees</div>
                <div className="hr-dashboard-metric-value">
                  {metricsLoading ? "—" : metrics.totalEmployees.toLocaleString()}
                </div>
                <div className="hr-dashboard-metric-footnote text-muted">
                  Active company-wide profiles
                </div>
              </div>
            </div>

            <div className="hr-dashboard-metric-card">
              <div className="hr-dashboard-metric-icon secondary">
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <div>
                <div className="hr-dashboard-metric-label">Leave Notifications</div>
                <div className="hr-dashboard-metric-footnote">
                  <span className="hr-dashboard-badge">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    {metricsLoading ? "—" : metrics.leaveApproved}
                    <span className="visually-hidden">
                      {" "}
                      approved leave requests
                    </span>
                  </span>
                  <span className="hr-dashboard-badge rejected">
                    <FontAwesomeIcon icon={faTimesCircle} />
                    {metricsLoading ? "—" : metrics.leaveRejected}
                    <span className="visually-hidden">
                      {" "}
                      rejected leave requests
                    </span>
                  </span>
                </div>
                <div className="text-muted small mt-2">
                  Manager-reviewed approvals and rejections
              </div>
            </div>
          </div>

            <div className="hr-dashboard-metric-card">
              <div className="hr-dashboard-metric-icon tertiary">
                <FontAwesomeIcon icon={faClipboardList} />
              </div>
              <div>
                <div className="hr-dashboard-metric-label">
                  Pending Evaluations
                </div>
                <div className="hr-dashboard-metric-value">
                  {metricsLoading ? "—" : metrics.pendingEvaluations}
                </div>
                <div className="text-muted small">
                  Draft forms awaiting HR finalization
                </div>
              </div>
            </div>

            <div className="hr-dashboard-metric-card">
              <div className="hr-dashboard-metric-icon quaternary">
                <FontAwesomeIcon icon={weather.icon} />
              </div>
              <div className="hr-dashboard-weather-meta">
                <div className="hr-dashboard-metric-label">Live Weather</div>
                <div className="hr-dashboard-weather-temp">
                  {weather.temp !== null ? `${weather.temp}°C` : "—"}
                  <small>{weather.description}</small>
                </div>
                <span className="text-muted">{weather.location}</span>
              </div>
            </div>
          </div>

          {metricsError && (
            <div className="alert alert-warning mt-3 mb-0" role="alert">
              {metricsError}
            </div>
          )}

          {/* Top Row */}
          <div className="row g-4 mt-4">
            <div className="col-12 col-xl-6">
              <div className="hr-dashboard-analytics-card h-100">
                <div className="hr-dashboard-analytics-header">
                  <div>
                    <h3>Employee Status Analytics</h3>
                    <p className="text-muted mb-0">
                      Track workforce health across departments and timelines.
                </p>
              </div>
                  <div className="hr-dashboard-analytics-filters">
                    <select
                      className="form-select form-select-sm"
                      value={analyticsFilters.range}
                      onChange={(event) => handleFilterChange("range", event.target.value)}
                    >
                      <option value="30">Last 30 days</option>
                      <option value="180">Last 6 months</option>
                      <option value="365">Last year</option>
                      <option value="all">All time</option>
                    </select>
                    <select
                      className="form-select form-select-sm"
                      value={analyticsFilters.department}
                      onChange={(event) => handleFilterChange("department", event.target.value)}
                    >
                      <option value="all">All departments</option>
                      {departmentOptions.map((department) => (
                        <option key={department} value={department.toLowerCase()}>
                          {department}
                        </option>
                      ))}
                    </select>
            </div>
                </div>
                <div className="hr-dashboard-chart-container">
                  <canvas ref={analyticsCanvasRef} aria-label="Employee status distribution chart" role="img" />
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="hr-dashboard-timeline-card h-100">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h4 className="mb-0">Recent Activity Timeline</h4>
                  <span className="text-muted small">
                    Last updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-muted mb-3">
                  Live feed of workforce moments, evaluation milestones, approved leaves, and disciplinary updates.
                </p>
                <div className="hr-dashboard-timeline" role="list">
                  {buildTimelineItems.length === 0 && (
                    <div className="hr-dashboard-timeline-empty">
                      Timeline updates will appear here once new activity is recorded.
              </div>
                  )}
                  {buildTimelineItems.map((item) => {
                    const expanded = !!expandedTimelineItems[item.id];
                    return (
                      <div className="hr-dashboard-timeline-item" key={item.id} role="listitem">
                        <span
                          className={`hr-dashboard-timeline-node timeline-node-${item.type}`}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          className="hr-dashboard-timeline-button"
                          onClick={() => handleToggleTimelineItem(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleToggleTimelineItem(item.id);
                            }
                          }}
                          aria-expanded={expanded}
                        >
                          <div className="hr-dashboard-timeline-content">
                            <span className="hr-dashboard-avatar" aria-hidden="true">
                              {item.initials || "•"}
                            </span>
                            <div className="hr-dashboard-timeline-text">
                              <div className="hr-dashboard-timeline-meta">
                                <span>{formatTimestampDescriptor(item.timestamp)}</span>
                                <span>{item.timestamp.toLocaleString()}</span>
                                {item.department && <span>{item.department}</span>}
            </div>
                              <div className="hr-dashboard-timeline-title">{item.title}</div>
                              <p className="hr-dashboard-timeline-description mb-0">
                                {item.description}
                              </p>
                              {expanded && (
                                <div className="hr-dashboard-timeline-details">
                                  {item.details}
          </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeView === "job-posting") {
      return <JobPostings />;
    }


    if (activeView === "employee-record") {
      return <EmployeeRecords />;
    }

    if (activeView === "evaluation") {
      return <EvaluationAdministration />;
    }

    if (activeView === "calendar") {
      return <StaffCalendar />;
    }

    if (activeView === "disciplinary") {
      return <DisciplinaryManagement />;
    }

    if (activeView === "leave-overview") {
      return <LeaveManagement showPending={false} />;
    }

    if (activeView === "leave-form") {
      return <LeaveForm />;
    }

    if (activeView === "leave-tracker") {
      return <LeaveTracker />;
    }

    if (activeView === "leave-history") {
      return <LeaveHistory />;
    }

    if (activeView === "calendar") {
      return <StaffCalendar />;
    }

    if (activeView === "onboarding") {
      return <Onboarding />;
    }

    if (activeView === "profile") {
      return <HrStaffProfile onBack={() => handleSetActiveView('dashboard')} />;
    }

    return (
      <div className="card p-4">
        <h5>{getHeaderTitle()}</h5>
        <p>This is the {getHeaderTitle()} section.</p>
      </div>
    );
  };

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="d-flex hrms-dashboard-wrapper responsive-container" style={{ minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
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
        <div className={`flex-column shadow-lg p-4 hrms-sidebar hrms-scrollable-sidebar hrms-unified-sidebar ${isMobile ? (sidebarOpen ? 'open' : '') : ''}`}>
          <h5 className="mb-4 text-center fw-bold text-uppercase hrms-unified-logo">CCDC</h5>
          <ul className="nav flex-column gap-2">
            <li>
              <button
                onClick={() => handleSetActiveView("dashboard")}
                className={`hrms-unified-nav-link ${activeView === 'dashboard' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Dashboard
              </button>
            </li>
            {/* Job Posting & Onboarding Dropdown */}
            <li className="hrms-dropdown-container">
              <button
                onClick={toggleJobOnboardingDropdown}
                className="hrms-unified-nav-link hrms-dropdown-toggle"
              >
                <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Job Posting & Onboarding
                <FontAwesomeIcon 
                  icon={isJobOnboardingDropdownOpen ? faChevronDown : faChevronRight} 
                  className="ms-auto" 
                  size="sm" 
                />
              </button>
              
              <div className={`hrms-dropdown-menu ${isJobOnboardingDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
                <button
                  onClick={() => {
                    handleSetActiveView("job-posting");
                    setIsJobOnboardingDropdownOpen(false);
                  }}
                  className={`hrms-dropdown-item ${activeView === 'job-posting' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faBriefcase} className="me-2" /> Job Postings
                </button>
                <button
                  onClick={() => {
                    handleSetActiveView("onboarding");
                    setIsJobOnboardingDropdownOpen(false);
                  }}
                  className={`hrms-dropdown-item ${activeView === 'onboarding' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Onboarding
                </button>
              </div>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("employee-record")}
                className={`hrms-unified-nav-link ${activeView === 'employee-record' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Employee Record
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("evaluation")}
                className={`hrms-unified-nav-link ${activeView === 'evaluation' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faChartBar} className="me-2" /> Evaluation
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("disciplinary")}
                className={`hrms-unified-nav-link ${activeView === 'disciplinary' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Disciplinary Action
              </button>
            </li>
            <li className="hrms-dropdown-container">
              <button
                onClick={toggleLeaveDropdown}
                className={`hrms-unified-nav-link hrms-dropdown-toggle ${leaveViews.includes(activeView) ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" /> Leave
                <FontAwesomeIcon
                  icon={isLeaveDropdownOpen ? faChevronDown : faChevronRight}
                  className="ms-auto"
                  size="sm"
                />
              </button>
              <div className={`hrms-dropdown-menu ${isLeaveDropdownOpen ? 'hrms-dropdown-open' : ''}`}>
                <button
                  onClick={() => handleSetActiveView("leave-overview")}
                  className={`hrms-dropdown-item ${activeView === 'leave-overview' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faChartBar} className="me-2" /> Leave Overview
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-form")}
                  className={`hrms-dropdown-item ${activeView === 'leave-form' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faFileAlt} className="me-2" /> Leave Form
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-tracker")}
                  className={`hrms-dropdown-item ${activeView === 'leave-tracker' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="me-2" /> Leave Tracker
                </button>
                <button
                  onClick={() => handleSetActiveView("leave-history")}
                  className={`hrms-dropdown-item ${activeView === 'leave-history' ? 'hrms-dropdown-active' : ''}`}
                >
                  <FontAwesomeIcon icon={faHistory} className="me-2" /> Leave History
                </button>
              </div>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("calendar")}
                className={`hrms-unified-nav-link ${activeView === 'calendar' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" /> My Calendar
              </button>
            </li>
            <li>
              <button
                onClick={() => handleSetActiveView("profile")}
                className={`hrms-unified-nav-link ${activeView === 'profile' ? 'hrms-unified-active' : ''}`}
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Profile
              </button>
            </li>
          </ul>
          <div className="mt-auto pt-3 border-top hrms-unified-profile">
            <button 
              onClick={handleLogout}
              className="hrms-unified-nav-link hrms-unified-logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow-1 hrms-main-content hrms-scrollable-main-content" style={{ background: "linear-gradient(to bottom right, #f0f4f8, #d9e2ec)" }}>
          {/* Header - hidden for job-posting, job-applications, and profile */}
          <div className="container-fluid py-3 px-3 px-md-5">
            {activeView !== "job-posting" && activeView !== "onboarding" && activeView !== "calendar" && activeView !== "profile" && (
              <div className="d-flex justify-content-between align-items-center mb-4 bg-white rounded-4 shadow-sm p-3 flex-wrap">
                <h4 className="fw-bold text-primary mb-2 mb-md-0">
                  {getHeaderTitle()}
                </h4>
                <div className="d-flex align-items-center gap-3">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    size="lg"
                    className="text-primary"
                  />
                  <Bell 
                    onOpenLeave={handleOpenLeave}
                    onOpenCashAdvance={handleOpenCashAdvance}
                    onOpenEvaluation={handleOpenEvaluation}
                    onOpenDisciplinary={handleOpenDisciplinary}
                    onOpenCalendar={handleOpenCalendar}
                    onOpenJobApplications={handleOpenJobApplications}
                    onOpenJobPostings={handleOpenJobPostings}
                  />
                  <span className="fw-semibold text-dark">
                    {loading ? 'Loading...' : userProfile?.name || 'HR Staff'}
                  </span>
                  <img
                    src="https://i.pravatar.cc/40"
                    alt="Profile"
                    className="rounded-circle"
                    style={{
                      width: "36px",
                      height: "36px",
                      objectFit: "cover",
                      border: "2px solid #0d6efd",
                      cursor: "pointer"
                    }}
                    onClick={() => handleSetActiveView('profile')}
                    title={`Go to Profile - ${userProfile?.name || 'HR Staff'}`}
                  />
                </div>
              </div>
            )}

            {/* Content Section */}
            {renderContent()}
          </div>
        </div>
        
        {/* Toast Container */}
        <ToastContainer 
          position="top-center" 
          autoClose={3000} 
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </>
  );
};

export default HrStaffDashboard;