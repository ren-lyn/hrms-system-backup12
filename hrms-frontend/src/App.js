import axios from 'axios';
import { useEffect, Suspense, lazy } from 'react';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './responsive.css'; // Import responsive CSS
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy load components for better performance
const Login = lazy(() => import('./pages/Login'));
const RegisterApplicant = lazy(() => import('./pages/RegisterApplicant'));
const JobPortal = lazy(() => import('./components/JobPortal'));
const HrStaffDashboard = lazy(() => import('./pages/HrStaffDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const ApplicantDashboard = lazy(() => import('./pages/ApplicantDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const HrAssistantLayout = lazy(() => import('./pages/HrAssistant/HrAssistantLayout'));
const EmployeeRecords = lazy(() => import('./pages/HrAssistant/EmployeeRecords'));
const LeaveManagement = lazy(() => import('./components/HrAssistant/LeaveManagement'));
const LeaveTracker = lazy(() => import('./components/HrAssistant/LeaveTracker'));
const CashAdvanceManagement = lazy(() => import('./components/HrAssistant/CashAdvanceManagement'));
const LeaveApplicationForm = lazy(() => import('./components/Employee/LeaveApplicationForm'));
const MyCalendar = lazy(() => import('./components/HrAssistant/MyCalendar'));
const DisciplinaryManagement = lazy(() => import('./components/HrAssistant/DisciplinaryManagement'));
const AttendanceDashboard = lazy(() => import('./components/HrAssistant/AttendanceDashboard'));
const AttendanceEditRequests = lazy(() => import('./components/HrAssistant/AttendanceEditRequests'));
const EnhancedPayrollDashboard = lazy(() => import('./components/HrAssistant/EnhancedPayrollDashboard'));
const EmployeeEvaluationList = lazy(() => import('./pages/HrAssistant/Evaluations/EmployeeEvaluationList'));
const EvaluationForm = lazy(() => import('./pages/HrAssistant/Evaluations/EvaluationForm'));
const EvaluationAdministration = lazy(() => import('./components/EvaluationAdministration'));
const JobPostings = lazy(() => import('./components/JobPostings'));
const StandaloneAssistantDashboard = lazy(() => import('./components/HrAssistant/Dashboard/StandaloneAssistantDashboard'));
const HrAssistantProfile = lazy(() => import('./components/HrAssistant/HrAssistantProfile'));
const PersonalOnboarding = lazy(() => import('./components/PersonalOnboarding'));
const OnboardingDashboard = lazy(() => import('./components/HrAssistant/OnboardingDashboard'));
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'));
const ReportGeneration = lazy(() => import('./components/HrAssistant/ReportGeneration/ReportGeneration'));
const PredictiveTurnoverAnalytics = lazy(() => import('./components/HrAssistant/PredictiveTurnoverAnalytics/PredictiveTurnoverAnalytics'));
const OTManagement = lazy(() => import('./components/HrAssistant/OTManagement/OTManagement'));

// Loading component
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  return (
    <Router>
      {/* ✅ Toast container goes here so it works globally */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      
      {/* Performance Monitor - disabled by default */}
      {false && process.env.NODE_ENV === 'development' && <PerformanceMonitor />}

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<JobPortal />} /> {/* Changed from Login to JobPortal */}
        <Route path="/login" element={<Login />} /> {/* Moved Login to /login route */}
        <Route path="/register" element={<RegisterApplicant />} />
        <Route path="/unauthorized" element={<h2>Unauthorized Access</h2>} />

        {/* Public preview route for the consolidated HR Assistant Dashboard */}
        <Route path="/standalone/hr-assistant-dashboard" element={<StandaloneAssistantDashboard />} />

        {/* HR Assistant Dashboard + Sidebar Layout */}
        <Route
          path="/dashboard/hr-assistant"
          element={
            <ProtectedRoute role="HR Assistant">
              <HrAssistantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StandaloneAssistantDashboard />} />
          <Route path="employee-records" element={<EmployeeRecords />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="leave/tracker" element={<LeaveTracker />} />
          <Route path="my-calendar" element={<MyCalendar />} />
          <Route path="cash-advances" element={<CashAdvanceManagement />} />
          <Route path="evaluation" element={<EmployeeEvaluationList />} />
          <Route path="evaluation/:id/form" element={<EvaluationForm />} />
          <Route path="evaluation-administration" element={<EvaluationAdministration />} />
          <Route path="job-postings" element={<JobPostings />} />
          <Route path="onboarding" element={<OnboardingDashboard />} />
          <Route path="disciplinary" element={<DisciplinaryManagement />} />
          <Route path="profile" element={<HrAssistantProfile />} />
          <Route path="attendance" element={<AttendanceDashboard />} /> 
          <Route path="attendance-edit-requests" element={<AttendanceEditRequests />} />
          <Route path="payroll" element={<EnhancedPayrollDashboard />} />
          <Route path="ot-management" element={<OTManagement />} />
          <Route path="report-generation" element={<ReportGeneration />} />
          <Route path="predictive-turnover-analytics" element={<PredictiveTurnoverAnalytics />} />


        </Route>

        {/* HR Staff */}
        <Route
          path="/dashboard/hr-staff"
          element={
            <ProtectedRoute role="HR Staff">
              <HrStaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Manager */}
        <Route
          path="/dashboard/manager"
          element={
            <ProtectedRoute role="Manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Applicant */}
        <Route
          path="/dashboard/applicant"
          element={
            <ProtectedRoute role="Applicant">
              <ApplicantDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<div>Welcome Applicant</div>} />
          <Route path="onboarding" element={<PersonalOnboarding />} />
        </Route>

        {/* ✅ Employee with nested routes (so sidebar layout is preserved) */}
        <Route
          path="/dashboard/employee"
          element={
            <ProtectedRoute role="Employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<div>Welcome Employee</div>} />
          <Route path="leave-request" element={<LeaveApplicationForm />} />
        </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;