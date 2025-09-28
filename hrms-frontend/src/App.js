import axios from 'axios';
import { useEffect } from 'react';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import RegisterApplicant from './pages/RegisterApplicant';
import JobPortal from './components/JobPortal'; // Add this import
import 'bootstrap/dist/css/bootstrap.min.css';

import HrStaffDashboard from './pages/HrStaffDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ApplicantDashboard from './pages/ApplicantDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';

import ProtectedRoute from './components/ProtectedRoute';
import HrAssistantLayout from './pages/HrAssistant/HrAssistantLayout';
import EmployeeRecords from './pages/HrAssistant/EmployeeRecords';

import LeaveManagement from './components/HrAssistant/LeaveManagement'; // ✅ New HR Assistant leave management

import CashAdvanceManagement from './components/HrAssistant/CashAdvanceManagement'; // ✅ New Cash Advance management
import LeaveApplicationForm from './components/Employee/LeaveApplicationForm'; // ✅ New Employee leave form
import MyCalendar from './components/HrAssistant/MyCalendar'; // ✅ New HR Calendar
import DisciplinaryManagement from './components/HrAssistant/DisciplinaryManagement'; // ✅ New Disciplinary Management


import EmployeeEvaluationList from './pages/HrAssistant/Evaluations/EmployeeEvaluationList';
import EvaluationForm from './pages/HrAssistant/Evaluations/EvaluationForm';
import EvaluationAdministration from './components/EvaluationAdministration';
import JobPostings from './components/JobPostings';
import ApplicationsDashboard from "./components/HrAssistant/Dashboard/ApplicationsDashboard";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StandaloneAssistantDashboard from './components/HrAssistant/Dashboard/StandaloneAssistantDashboard';

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
          <Route path="my-calendar" element={<MyCalendar />} />
          <Route path="cash-advances" element={<CashAdvanceManagement />} />
          <Route path="evaluation" element={<EmployeeEvaluationList />} />
          <Route path="evaluation/:id/form" element={<EvaluationForm />} />
          <Route path="evaluation-administration" element={<EvaluationAdministration />} />
          <Route path="job-postings" element={<JobPostings />} />
          <Route path="applications" element={<ApplicationsDashboard />} />
          <Route path="disciplinary" element={<DisciplinaryManagement />} />

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
        />

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
    </Router>
  );
}

export default App;
