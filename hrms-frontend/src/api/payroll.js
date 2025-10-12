import axios from '../axios';

const payrollAPI = {
  // Get payroll data with filters
  getPayroll: (params = {}) => {
    return axios.get('/api/payroll', { params });
  },

  // Get payroll statistics
  getPayrollStats: (params = {}) => {
    return axios.get('/api/payroll/stats', { params });
  },

  // Generate payroll for a period
  generatePayroll: (data) => {
    return axios.post('/api/payroll/generate', data);
  },

  // Get attendance summary for payroll
  getAttendanceSummary: (params = {}) => {
    return axios.get('/api/payroll/attendance-summary', { params });
  },

  // Export payroll data
  exportPayroll: (params = {}) => {
    return axios.get('/api/payroll/export', { 
      params,
      responseType: 'blob'
    });
  },

  // Get payroll details for specific employee
  getPayrollDetails: (id) => {
    return axios.get(`/api/payroll/${id}`);
  },

  // Update payroll record
  updatePayroll: (id, data) => {
    return axios.put(`/api/payroll/${id}`, data);
  },

  // Delete payroll record
  deletePayroll: (id) => {
    return axios.delete(`/api/payroll/${id}`);
  },

  // Get payroll history
  getPayrollHistory: (params = {}) => {
    return axios.get('/api/payroll/history', { params });
  },

  // Process payroll (mark as processed)
  processPayroll: (id) => {
    return axios.post(`/api/payroll/${id}/process`);
  },

  // Get employee salary information
  getEmployeeSalary: (employeeId) => {
    return axios.get(`/api/payroll/employee/${employeeId}/salary`);
  },

  // Calculate payroll for specific employee
  calculateEmployeePayroll: (employeeId, data) => {
    return axios.post(`/api/payroll/employee/${employeeId}/calculate`, data);
  },

  // Enhanced features API endpoints
  
  // Payroll Periods Management
  getPayrollPeriods: () => {
    return axios.get('/api/payroll/periods');
  },

  createPayrollPeriod: (data) => {
    return axios.post('/api/payroll/periods', data);
  },

  updatePayrollPeriod: (id, data) => {
    return axios.put(`/api/payroll/periods/${id}`, data);
  },

  deletePayrollPeriod: (id) => {
    return axios.delete(`/api/payroll/periods/${id}`);
  },

  // Tax Titles Management
  getTaxTitles: () => {
    return axios.get('/api/payroll/tax-titles');
  },

  createTaxTitle: (data) => {
    return axios.post('/api/payroll/tax-titles', data);
  },

  updateTaxTitle: (id, data) => {
    return axios.put(`/api/payroll/tax-titles/${id}`, data);
  },

  deleteTaxTitle: (id) => {
    return axios.delete(`/api/payroll/tax-titles/${id}`);
  },

  // Deduction Titles Management
  getDeductionTitles: () => {
    return axios.get('/api/payroll/deduction-titles');
  },

  createDeductionTitle: (data) => {
    return axios.post('/api/payroll/deduction-titles', data);
  },

  updateDeductionTitle: (id, data) => {
    return axios.put(`/api/payroll/deduction-titles/${id}`, data);
  },

  deleteDeductionTitle: (id) => {
    return axios.delete(`/api/payroll/deduction-titles/${id}`);
  },

  // Benefits Management
  getBenefits: () => {
    return axios.get('/api/payroll/benefits');
  },

  createBenefit: (data) => {
    return axios.post('/api/payroll/benefits', data);
  },

  updateBenefit: (id, data) => {
    return axios.put(`/api/payroll/benefits/${id}`, data);
  },

  deleteBenefit: (id) => {
    return axios.delete(`/api/payroll/benefits/${id}`);
  },

  // Employee Assignments
  getEmployeeTaxAssignments: () => {
    return axios.get('/api/payroll/employee-tax-assignments');
  },

  assignTaxToEmployee: (employeeId, taxId) => {
    return axios.post('/api/payroll/employee-tax-assignments', {
      employee_id: employeeId,
      tax_id: taxId
    });
  },

  removeTaxFromEmployee: (employeeId, taxId) => {
    return axios.delete(`/api/payroll/employee-tax-assignments/${employeeId}/${taxId}`);
  },

  getEmployeeDeductionAssignments: () => {
    return axios.get('/api/payroll/employee-deduction-assignments');
  },

  assignDeductionToEmployee: (employeeId, deductionId) => {
    return axios.post('/api/payroll/employee-deduction-assignments', {
      employee_id: employeeId,
      deduction_id: deductionId
    });
  },

  removeDeductionFromEmployee: (employeeId, deductionId) => {
    return axios.delete(`/api/payroll/employee-deduction-assignments/${employeeId}/${deductionId}`);
  },

  // Payroll Report Generation
  generatePayrollReport: (params) => {
    return axios.get('/api/payroll/reports/generate', {
      params,
      responseType: 'blob'
    });
  },

  // Employee Payslip Management
  getEmployeePayslip: (employeeId, periodId) => {
    return axios.get(`/api/payroll/employee/${employeeId}/payslip/${periodId}`);
  },

  exportEmployeePayslip: (employeeId, periodId) => {
    return axios.get(`/api/payroll/employee/${employeeId}/payslip/${periodId}/export`, {
      responseType: 'blob'
    });
  },

  // Get all employees for assignment
  getEmployees: () => {
    return axios.get('/api/employees');
  }
};

export default payrollAPI;
