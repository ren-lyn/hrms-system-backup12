import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Modal, Badge, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { FaMoneyCheckAlt, FaCalculator, FaCalendarAlt, FaEye, FaPrint, FaDownload, FaPlus, FaTrash, FaEdit, FaChevronDown, FaChevronRight, FaUserCheck, FaMinusCircle, FaReceipt, FaSync, FaCheckDouble } from 'react-icons/fa';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const PayrollDashboard = () => {
  const [activeTab, setActiveTab] = useState('periods');
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [tempPeriod, setTempPeriod] = useState(selectedPeriod);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPayrollForStatus, setSelectedPayrollForStatus] = useState(null);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState('');
  const [bulkUpdateScope, setBulkUpdateScope] = useState('period'); // 'period' or 'all'
  const [selectedPeriodForBulk, setSelectedPeriodForBulk] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPeriod, setNewPeriod] = useState({ name: '', start_date: '', end_date: '', description: '' });
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState(null);
  
  // Deductions state
  const [deductionTitles, setDeductionTitles] = useState([]);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState(null);
  const [editingDeduction, setEditingDeduction] = useState(null);
  const [newDeduction, setNewDeduction] = useState({ name: '', amount: '', type: 'fixed', description: '', is_active: true });
  const [selectedEmployeesForAssignment, setSelectedEmployeesForAssignment] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [assignmentCustomAmount, setAssignmentCustomAmount] = useState('');
  const [expandedDeduction, setExpandedDeduction] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState({});
  const [deductionEmployeeSearch, setDeductionEmployeeSearch] = useState('');
  const [selectAllDeduction, setSelectAllDeduction] = useState(false);

  // Taxes state
  const [taxTitles, setTaxTitles] = useState([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showAssignTaxModal, setShowAssignTaxModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  const [editingTax, setEditingTax] = useState(null);
  const [newTax, setNewTax] = useState({ name: '', rate: '', type: 'fixed', description: '', is_active: true });
  const [selectedEmployeesForTaxAssignment, setSelectedEmployeesForTaxAssignment] = useState([]);
  const [availableEmployeesForTax, setAvailableEmployeesForTax] = useState([]);
  const [assignmentCustomRate, setAssignmentCustomRate] = useState('');
  const [expandedTax, setExpandedTax] = useState(null);
  const [assignedEmployeesTax, setAssignedEmployeesTax] = useState({});
  const [taxEmployeeSearch, setTaxEmployeeSearch] = useState('');
  const [selectAllTax, setSelectAllTax] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchPayrollPeriods();
  }, []);

  useEffect(() => {
    if (activeTab === 'payroll') {
      fetchPayrolls();
    } else if (activeTab === 'deductions') {
      fetchDeductionTitles();
    } else if (activeTab === 'taxes') {
      fetchTaxTitles();
    }
  }, [selectedPeriod, activeTab]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/payroll', {
        params: {
          period_start: selectedPeriod.start,
          period_end: selectedPeriod.end
        }
      });
      const payrollsData = response.data.data?.payrolls || response.data.data || [];
      
      // Debug: Log first payroll to check breakdown
      if (payrollsData.length > 0) {
        const samplePayroll = payrollsData[0];
        console.log('Sample payroll data:', samplePayroll);
        console.log('13th Month Pay:', samplePayroll.thirteenth_month_pay);
        console.log('Has Breakdown Key:', 'thirteenth_month_pay_breakdown' in samplePayroll);
        console.log('Breakdown:', samplePayroll?.thirteenth_month_pay_breakdown);
        console.log('All keys:', Object.keys(samplePayroll));
        
        // Check if breakdown exists for payrolls with 13th month pay
        payrollsData.forEach((p, idx) => {
          if (p.thirteenth_month_pay > 0) {
            console.log(`Payroll ${p.id} (index ${idx}):`, {
              has_breakdown: 'thirteenth_month_pay_breakdown' in p,
              breakdown_value: p.thirteenth_month_pay_breakdown,
              is_array: Array.isArray(p.thirteenth_month_pay_breakdown)
            });
          }
        });
      }
      
      setPayrolls(payrollsData);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchPayrollPeriods = async () => {
    try {
      const response = await axios.get('/payroll-periods');
      setPayrollPeriods(response.data.data || []);
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      const response = await axios.post('/payroll-periods', newPeriod);
      if (response.data.success) {
        toast.success('Payroll period created successfully');
        setShowPeriodModal(false);
        setNewPeriod({ name: '', start_date: '', end_date: '', description: '' });
        fetchPayrollPeriods();
      }
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error(error.response?.data?.message || 'Failed to create payroll period');
    }
  };

  const handleGeneratePayroll = async () => {
    if (!selectedPayrollPeriod) {
      toast.error('Please select a payroll period');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post('/payroll/generate', {
        period_start: selectedPayrollPeriod.start_date,
        period_end: selectedPayrollPeriod.end_date,
        payroll_period_id: selectedPayrollPeriod.id
      });

      if (response.data.success) {
        toast.success(`Successfully generated ${response.data.data.generated_count} payroll records`);
        setShowGenerateModal(false);
        fetchPayrollPeriods(); // Refresh to show new payrolls
        setExpandedPeriod(selectedPayrollPeriod.id); // Expand the period
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyDateRange = () => {
    setSelectedPeriod(tempPeriod);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getStatusBadge = (status, payroll = null) => {
    const variants = {
      processed: 'success',
      paid: 'primary',
      draft: 'secondary',
      pending: 'warning',
      active: 'success',
      closed: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status?.toUpperCase()}</Badge>;
  };

  const handleEditStatus = (payroll) => {
    if (payroll.status !== 'draft') {
      toast.info('Only draft payrolls can have their status updated.');
      return;
    }
    setSelectedPayrollForStatus(payroll);
    setNewStatus(payroll.status);
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayrollForStatus || !newStatus) {
      toast.error('Please select a status');
      return;
    }

    if (selectedPayrollForStatus.status === newStatus) {
      toast.info('Status is already set to ' + newStatus);
      setShowStatusModal(false);
      return;
    }

    try {
      const response = await axios.put(`/payroll/${selectedPayrollForStatus.id}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        toast.success('Payroll status updated successfully');
        // Update the payroll in the state
        setPayrolls(prevPayrolls => 
          prevPayrolls.map(p => 
            p.id === selectedPayrollForStatus.id 
              ? { ...p, status: newStatus }
              : p
          )
        );
        // Also update payrolls in periods if they exist
        setPayrollPeriods(prevPeriods =>
          prevPeriods.map(period => ({
            ...period,
            payrolls: period.payrolls?.map(p =>
              p.id === selectedPayrollForStatus.id
                ? { ...p, status: newStatus }
                : p
            ) || []
          }))
        );
        setShowStatusModal(false);
        setSelectedPayrollForStatus(null);
        setNewStatus('');
      }
    } catch (error) {
      console.error('Error updating payroll status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update payroll status';
      toast.error(errorMessage);
    }
  };

  const handleBulkUpdateStatus = async () => {
    if (!bulkNewStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      const payload = { status: bulkNewStatus };
      
      // Add period filter if scope is 'period' and a period is selected
      if (bulkUpdateScope === 'period') {
        if (selectedPeriodForBulk) {
          payload.payroll_period_id = selectedPeriodForBulk.id;
        } else if (selectedPeriod.start && selectedPeriod.end) {
          payload.period_start = selectedPeriod.start;
          payload.period_end = selectedPeriod.end;
        }
      } else if (bulkUpdateScope === 'current') {
        // Update all draft payrolls in current view
        if (selectedPeriod.start && selectedPeriod.end) {
          payload.period_start = selectedPeriod.start;
          payload.period_end = selectedPeriod.end;
        }
      }

      const response = await axios.put('/payroll/bulk-update-status', payload);

      if (response.data.success) {
        const updatedCount = response.data.data.updated_count;
        toast.success(`Successfully updated ${updatedCount} payroll status(es) to ${bulkNewStatus}`);
        
        // Refresh payrolls data
        await fetchPayrolls();
        await fetchPayrollPeriods();
        
        setShowBulkStatusModal(false);
        setBulkNewStatus('');
        setSelectedPeriodForBulk(null);
        setBulkUpdateScope('period');
      }
    } catch (error) {
      console.error('Error bulk updating payroll statuses:', error);
      const errorMessage = error.response?.data?.message || 'Failed to bulk update payroll statuses';
      toast.error(errorMessage);
    }
  };

  const handleOpenBulkStatusModal = (period = null) => {
    if (period) {
      setBulkUpdateScope('period');
      setSelectedPeriodForBulk(period);
    } else {
      setBulkUpdateScope('current');
      setSelectedPeriodForBulk(null);
    }
    setBulkNewStatus('');
    setShowBulkStatusModal(true);
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    const employee = employees.find(emp => emp.employee_profile?.id === payroll.employee_id);
    const fullName = employee?.employee_profile 
      ? `${employee.employee_profile.first_name} ${employee.employee_profile.last_name}`
      : '';
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Deduction management functions
  const fetchDeductionTitles = async () => {
    try {
      const response = await axios.get('/deduction-titles');
      if (response.data.success) {
        setDeductionTitles(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching deduction titles:', error);
      toast.error('Failed to load deduction titles');
    }
  };

  const handleCreateDeduction = async () => {
    try {
      const response = await axios.post('/deduction-titles', newDeduction);
      if (response.data.success) {
        toast.success('Deduction title created successfully');
        setShowDeductionModal(false);
        setNewDeduction({ name: '', amount: '', type: 'fixed', description: '', is_active: true });
        fetchDeductionTitles();
      }
    } catch (error) {
      console.error('Error creating deduction:', error);
      toast.error(error.response?.data?.message || 'Failed to create deduction title');
    }
  };

  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;
    
    try {
      const response = await axios.put(`/deduction-titles/${editingDeduction.id}`, editingDeduction);
      if (response.data.success) {
        toast.success('Deduction title updated successfully');
        setShowDeductionModal(false);
        setEditingDeduction(null);
        fetchDeductionTitles();
      }
    } catch (error) {
      console.error('Error updating deduction:', error);
      toast.error(error.response?.data?.message || 'Failed to update deduction title');
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deduction title?')) {
      return;
    }

    try {
      const response = await axios.delete(`/deduction-titles/${id}`);
      if (response.data.success) {
        toast.success('Deduction title deleted successfully');
        fetchDeductionTitles();
      }
    } catch (error) {
      console.error('Error deleting deduction:', error);
      toast.error(error.response?.data?.message || 'Failed to delete deduction title');
    }
  };

  const handleOpenAssignModal = async (deduction) => {
    setSelectedDeduction(deduction);
    setSelectedEmployeesForAssignment([]);
    setAssignmentCustomAmount('');
    setDeductionEmployeeSearch('');
    setSelectAllDeduction(false);
    
    try {
      // Fetch available employees
      const response = await axios.get(`/deduction-titles/${deduction.id}/available-employees`);
      if (response.data.success) {
        setAvailableEmployees(response.data.data || []);
      }
      setShowAssignModal(true);
    } catch (error) {
      console.error('Error fetching available employees:', error);
      toast.error('Failed to load available employees');
    }
  };

  const handleAssignToEmployees = async () => {
    if (!selectedDeduction || selectedEmployeesForAssignment.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    try {
      const response = await axios.post(`/deduction-titles/${selectedDeduction.id}/assign`, {
        employee_ids: selectedEmployeesForAssignment,
        custom_amount: assignmentCustomAmount || null
      });
      if (response.data.success) {
        toast.success(`Deduction assigned to ${selectedEmployeesForAssignment.length} employee(s)`);
        setShowAssignModal(false);
        setSelectedDeduction(null);
        setSelectedEmployeesForAssignment([]);
        setAssignmentCustomAmount('');
        setDeductionEmployeeSearch('');
        setSelectAllDeduction(false);
        fetchDeductionTitles();
        if (expandedDeduction === selectedDeduction.id) {
          fetchAssignedEmployees(selectedDeduction.id);
        }
      }
    } catch (error) {
      console.error('Error assigning deduction:', error);
      toast.error(error.response?.data?.message || 'Failed to assign deduction');
    }
  };

  const fetchAssignedEmployees = async (deductionId) => {
    try {
      const response = await axios.get(`/deduction-titles/${deductionId}/employees`);
      if (response.data.success) {
        setAssignedEmployees(prev => ({
          ...prev,
          [deductionId]: response.data.data || []
        }));
      }
    } catch (error) {
      console.error('Error fetching assigned employees:', error);
    }
  };

  const handleRemoveAssignment = async (deductionId, employeeId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const response = await axios.post(`/deduction-titles/${deductionId}/remove`, {
        employee_ids: [employeeId]
      });
      if (response.data.success) {
        toast.success('Assignment removed successfully');
        fetchAssignedEmployees(deductionId);
        fetchDeductionTitles();
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const handleToggleAssignmentStatus = async (deductionId, assignmentId, currentStatus) => {
    try {
      const response = await axios.put(`/deduction-titles/${deductionId}/assignments/${assignmentId}`, {
        is_active: !currentStatus
      });
      if (response.data.success) {
        toast.success('Assignment updated successfully');
        fetchAssignedEmployees(deductionId);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to update assignment');
    }
  };

  const handleEditDeduction = (deduction) => {
    setEditingDeduction({ ...deduction });
    setShowDeductionModal(true);
  };

  const toggleDeductionExpansion = async (deductionId) => {
    if (expandedDeduction === deductionId) {
      setExpandedDeduction(null);
    } else {
      setExpandedDeduction(deductionId);
      await fetchAssignedEmployees(deductionId);
    }
  };

  // Tax management functions
  const fetchTaxTitles = async () => {
    try {
      const response = await axios.get('/tax-titles');
      if (response.data.success) {
        setTaxTitles(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tax titles:', error);
      toast.error('Failed to load tax titles');
    }
  };

  const handleCreateTax = async () => {
    try {
      const taxData = { ...newTax, type: 'fixed' };
      const response = await axios.post('/tax-titles', taxData);
      if (response.data.success) {
        toast.success('Tax title created successfully');
        setShowTaxModal(false);
        setNewTax({ name: '', rate: '', type: 'fixed', description: '', is_active: true });
        fetchTaxTitles();
      }
    } catch (error) {
      console.error('Error creating tax:', error);
      toast.error(error.response?.data?.message || 'Failed to create tax title');
    }
  };

  const handleUpdateTax = async () => {
    if (!editingTax) return;
    
    try {
      const taxData = { ...editingTax, type: 'fixed' };
      const response = await axios.put(`/tax-titles/${editingTax.id}`, taxData);
      if (response.data.success) {
        toast.success('Tax title updated successfully');
        setShowTaxModal(false);
        setEditingTax(null);
        fetchTaxTitles();
      }
    } catch (error) {
      console.error('Error updating tax:', error);
      toast.error(error.response?.data?.message || 'Failed to update tax title');
    }
  };

  const handleDeleteTax = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax title?')) {
      return;
    }

    try {
      const response = await axios.delete(`/tax-titles/${id}`);
      if (response.data.success) {
        toast.success('Tax title deleted successfully');
        fetchTaxTitles();
      }
    } catch (error) {
      console.error('Error deleting tax:', error);
      toast.error(error.response?.data?.message || 'Failed to delete tax title');
    }
  };

  const handleOpenAssignTaxModal = async (tax) => {
    setSelectedTax(tax);
    setSelectedEmployeesForTaxAssignment([]);
    setAssignmentCustomRate('');
    setTaxEmployeeSearch('');
    setSelectAllTax(false);
    
    try {
      // Fetch available employees
      const response = await axios.get(`/tax-titles/${tax.id}/available-employees`);
      if (response.data.success) {
        setAvailableEmployeesForTax(response.data.data || []);
      }
      setShowAssignTaxModal(true);
    } catch (error) {
      console.error('Error fetching available employees:', error);
      toast.error('Failed to load available employees');
    }
  };

  const handleAssignTaxToEmployees = async () => {
    if (!selectedTax || selectedEmployeesForTaxAssignment.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    try {
      const response = await axios.post(`/tax-titles/${selectedTax.id}/assign`, {
        employee_ids: selectedEmployeesForTaxAssignment,
        custom_rate: assignmentCustomRate || null
      });
      if (response.data.success) {
        toast.success(`Tax assigned to ${selectedEmployeesForTaxAssignment.length} employee(s)`);
        setShowAssignTaxModal(false);
        setSelectedTax(null);
        setSelectedEmployeesForTaxAssignment([]);
        setAssignmentCustomRate('');
        setTaxEmployeeSearch('');
        setSelectAllTax(false);
        fetchTaxTitles();
        if (expandedTax === selectedTax.id) {
          fetchAssignedEmployeesTax(selectedTax.id);
        }
      }
    } catch (error) {
      console.error('Error assigning tax:', error);
      toast.error(error.response?.data?.message || 'Failed to assign tax');
    }
  };

  const fetchAssignedEmployeesTax = async (taxId) => {
    try {
      const response = await axios.get(`/tax-titles/${taxId}/employees`);
      if (response.data.success) {
        setAssignedEmployeesTax(prev => ({
          ...prev,
          [taxId]: response.data.data || []
        }));
      }
    } catch (error) {
      console.error('Error fetching assigned employees:', error);
    }
  };

  const handleRemoveTaxAssignment = async (taxId, employeeId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const response = await axios.post(`/tax-titles/${taxId}/remove`, {
        employee_ids: [employeeId]
      });
      if (response.data.success) {
        toast.success('Assignment removed successfully');
        fetchAssignedEmployeesTax(taxId);
        fetchTaxTitles();
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to remove assignment');
    }
  };

  const handleToggleTaxAssignmentStatus = async (taxId, assignmentId, currentStatus) => {
    try {
      const response = await axios.put(`/tax-titles/${taxId}/assignments/${assignmentId}`, {
        is_active: !currentStatus
      });
      if (response.data.success) {
        toast.success('Assignment updated successfully');
        fetchAssignedEmployeesTax(taxId);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to update assignment');
    }
  };

  const handleEditTax = (tax) => {
    setEditingTax({ ...tax });
    setShowTaxModal(true);
  };

  const toggleTaxExpansion = async (taxId) => {
    if (expandedTax === taxId) {
      setExpandedTax(null);
    } else {
      setExpandedTax(taxId);
      await fetchAssignedEmployeesTax(taxId);
    }
  };

  // Helper function to get employee name
  const getEmployeeName = (employee) => {
    if (employee?.user) {
      return `${employee.user.first_name || ''} ${employee.user.last_name || ''}`.trim();
    } else if (employee?.first_name && employee?.last_name) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    return employee?.employee_id || 'Unknown Employee';
  };

  // Filter employees based on search for deductions
  const filteredEmployeesForDeduction = availableEmployees.filter((employee) => {
    const name = getEmployeeName(employee).toLowerCase();
    return name.includes(deductionEmployeeSearch.toLowerCase());
  });

  // Filter employees based on search for taxes
  const filteredEmployeesForTax = availableEmployeesForTax.filter((employee) => {
    const name = getEmployeeName(employee).toLowerCase();
    return name.includes(taxEmployeeSearch.toLowerCase());
  });

  // Handle select all for deductions
  const handleSelectAllDeduction = (checked) => {
    setSelectAllDeduction(checked);
    if (checked) {
      const allIds = filteredEmployeesForDeduction.map(emp => emp.id);
      setSelectedEmployeesForAssignment(allIds);
    } else {
      setSelectedEmployeesForAssignment([]);
    }
  };

  // Handle select all for taxes
  const handleSelectAllTax = (checked) => {
    setSelectAllTax(checked);
    if (checked) {
      const allIds = filteredEmployeesForTax.map(emp => emp.id);
      setSelectedEmployeesForTaxAssignment(allIds);
    } else {
      setSelectedEmployeesForTaxAssignment([]);
    }
  };

  // Update select all state when individual selections change
  useEffect(() => {
    if (filteredEmployeesForDeduction.length > 0) {
      const allSelected = filteredEmployeesForDeduction.every(emp => 
        selectedEmployeesForAssignment.includes(emp.id)
      );
      setSelectAllDeduction(allSelected);
    }
  }, [selectedEmployeesForAssignment, filteredEmployeesForDeduction]);

  useEffect(() => {
    if (filteredEmployeesForTax.length > 0) {
      const allSelected = filteredEmployeesForTax.every(emp => 
        selectedEmployeesForTaxAssignment.includes(emp.id)
      );
      setSelectAllTax(allSelected);
    }
  }, [selectedEmployeesForTaxAssignment, filteredEmployeesForTax]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h4 className="mb-0">
            <FaMoneyCheckAlt className="me-2" />
            Payroll Management
          </h4>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Payroll Periods Tab */}
        <Tab eventKey="periods" title={
          <span>
            <FaCalendarAlt className="me-2" />
            Payroll Periods
          </span>
        }>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Manage Payroll Periods</h5>
                <Button 
                  variant="primary" 
                  onClick={() => setShowPeriodModal(true)}
                >
                  <FaPlus className="me-2" />
                  Create Period
                </Button>
              </div>

              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}></th>
                    <th>Period Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        No payroll periods found. Create a new one to get started.
                      </td>
                    </tr>
                  ) : (
                    payrollPeriods.map((period) => (
                      <React.Fragment key={period.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedPeriod(expandedPeriod === period.id ? null : period.id)}>
                          <td>
                            {expandedPeriod === period.id ? (
                              <FaChevronDown />
                            ) : (
                              <FaChevronRight />
                            )}
                          </td>
                          <td>
                            <strong>{period.name}</strong>
                            {period.payrolls && period.payrolls.length > 0 && (
                              <Badge bg="secondary" className="ms-2">{period.payrolls.length}</Badge>
                            )}
                          </td>
                          <td>{format(new Date(period.start_date), 'MMM dd, yyyy')}</td>
                          <td>{format(new Date(period.end_date), 'MMM dd, yyyy')}</td>
                          <td>{getStatusBadge(period.status)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                setSelectedPayrollPeriod(period);
                                setShowGenerateModal(true);
                              }}
                            >
                              <FaCalculator className="me-1" />
                              Generate
                            </Button>
                          </td>
                        </tr>
                        {expandedPeriod === period.id && period.payrolls && period.payrolls.length > 0 && (
                          <tr>
                            <td colSpan={6} style={{ backgroundColor: '#f8f9fa', padding: '20px' }}>
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="mb-0">Payroll Records ({period.payrolls.length})</h6>
                                {(() => {
                                  const draftCount = period.payrolls.filter(p => p.status === 'draft').length;
                                  return draftCount > 0 && (
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="warning"
                                        size="sm"
                                        onClick={() => handleOpenBulkStatusModal(period)}
                                        className="d-flex align-items-center"
                                        style={{
                                          fontWeight: '600',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }}
                                      >
                                        <FaSync className="me-2" style={{ fontSize: '0.9rem' }} />
                                        Change All Status
                                      </Button>
                                      <Badge 
                                        bg="dark" 
                                        text="light"
                                        style={{ 
                                          fontSize: '0.75rem',
                                          padding: '5px 12px',
                                          fontWeight: '500',
                                          color: '#fff',
                                          backgroundColor: '#212529'
                                        }}
                                      >
                                        {draftCount} {draftCount === 1 ? 'draft' : 'drafts'}
                                      </Badge>
                                    </div>
                                  );
                                })()}
                              </div>
                              <Table size="sm" hover>
                                <thead>
                                  <tr>
                                    <th>Employee</th>
                                    <th>Basic Salary</th>
                                    <th>OT Pay</th>
                                    <th>13th Month Pay</th>
                                    <th>Gross Pay</th>
                                    <th>Deductions</th>
                                    <th>Net Pay</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {period.payrolls.map((payroll) => {
                                    const employee = employees.find(emp => emp.employee_profile?.id === payroll.employee_id);
                                    const fullName = employee?.employee_profile 
                                      ? `${employee.employee_profile.first_name} ${employee.employee_profile.last_name}`
                                      : payroll.employee?.first_name && payroll.employee?.last_name
                                        ? `${payroll.employee.first_name} ${payroll.employee.last_name}`
                                        : 'Unknown Employee';
                                    
                                    return (
                                      <tr key={payroll.id}>
                                        <td>{fullName}</td>
                                        <td>{formatCurrency(payroll.basic_salary)}</td>
                                        <td>{formatCurrency(payroll.overtime_pay)}</td>
                                        <td>{formatCurrency(payroll.thirteenth_month_pay || 0)}</td>
                                        <td>{formatCurrency(payroll.gross_pay)}</td>
                                        <td>{formatCurrency(payroll.total_deductions)}</td>
                                        <td><strong>{formatCurrency(payroll.net_pay)}</strong></td>
                                        <td>
                                          <div className="d-flex align-items-center gap-2">
                                            {getStatusBadge(payroll.status, payroll)}
                                            {payroll.status === 'draft' && (
                                              <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => handleEditStatus(payroll)}
                                                title="Edit Status"
                                              >
                                                <FaEdit />
                                              </Button>
                                            )}
                                          </div>
                                        </td>
                                        <td>
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedPayroll(payroll);
                                              setShowDetailsModal(true);
                                            }}
                                          >
                                            <FaEye />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </td>
                          </tr>
                        )}
                        {expandedPeriod === period.id && (!period.payrolls || period.payrolls.length === 0) && (
                          <tr>
                            <td colSpan={6} style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center' }}>
                              No payroll records yet. Click "Generate" to create payroll for this period.
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Taxes Tab */}
        <Tab eventKey="taxes" title={
          <span>
            <FaReceipt className="me-2" />
            Taxes
          </span>
        }>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Manage Tax Titles</h5>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setEditingTax(null);
                    setNewTax({ name: '', rate: '', type: 'fixed', description: '', is_active: true });
                    setShowTaxModal(true);
                  }}
                >
                  <FaPlus className="me-2" />
                  Create Tax Title
                </Button>
              </div>

              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}></th>
                    <th>Tax Title</th>
                    <th>Type</th>
                    <th>Rate</th>
                    <th>Assigned Employees</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {taxTitles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        No tax titles found. Create a new one to get started.
                      </td>
                    </tr>
                  ) : (
                    taxTitles.map((tax) => (
                      <React.Fragment key={tax.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggleTaxExpansion(tax.id)}>
                          <td>
                            {expandedTax === tax.id ? (
                              <FaChevronDown />
                            ) : (
                              <FaChevronRight />
                            )}
                          </td>
                          <td>
                            <strong>{tax.name}</strong>
                            {tax.description && (
                              <small className="text-muted d-block">{tax.description}</small>
                            )}
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {tax.type}
                            </Badge>
                          </td>
                          <td>
                            {formatCurrency(tax.rate)}
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {tax.assigned_employees_count || 0}
                            </Badge>
                          </td>
                          <td>{getStatusBadge(tax.is_active ? 'active' : 'closed')}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenAssignTaxModal(tax)}
                            >
                              <FaUserCheck className="me-1" />
                              Assign
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditTax(tax)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteTax(tax.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                        {expandedTax === tax.id && assignedEmployeesTax[tax.id] && (
                          <tr>
                            <td colSpan={7} style={{ backgroundColor: '#f8f9fa', padding: '20px' }}>
                              <h6 className="mb-3">Assigned Employees ({assignedEmployeesTax[tax.id].length})</h6>
                              {assignedEmployeesTax[tax.id].length === 0 ? (
                                <p className="text-muted">No employees assigned to this tax.</p>
                              ) : (
                                <Table size="sm" hover>
                                  <thead>
                                    <tr>
                                      <th>Employee Name</th>
                                      <th>Custom Rate</th>
                                      <th>Effective Rate</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignedEmployeesTax[tax.id].map((assignment) => {
                                      const employee = assignment.employee;
                                      const employeeName = employee?.user
                                        ? `${employee.user.first_name || ''} ${employee.user.last_name || ''}`.trim()
                                        : employee?.first_name && employee?.last_name
                                          ? `${employee.first_name} ${employee.last_name}`
                                          : employee?.employee_id || 'Unknown Employee';
                                      const effectiveRate = assignment.custom_rate || tax.rate;
                                      
                                      return (
                                        <tr key={assignment.id}>
                                          <td>{employeeName}</td>
                                          <td>
                                            {assignment.custom_rate !== null && assignment.custom_rate !== undefined
                                              ? formatCurrency(assignment.custom_rate)
                                              : <span className="text-muted">Default</span>}
                                          </td>
                                          <td>
                                            {formatCurrency(effectiveRate)}
                                          </td>
                                          <td>{getStatusBadge(assignment.is_active ? 'active' : 'closed')}</td>
                                          <td>
                                            <Button
                                              variant="outline-warning"
                                              size="sm"
                                              className="me-2"
                                              onClick={() => handleToggleTaxAssignmentStatus(
                                                tax.id, 
                                                assignment.id, 
                                                assignment.is_active
                                              )}
                                            >
                                              {assignment.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              onClick={() => handleRemoveTaxAssignment(tax.id, assignment.employee_id)}
                                            >
                                              <FaTrash />
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Deductions Tab */}
        <Tab eventKey="deductions" title={
          <span>
            <FaMinusCircle className="me-2" />
            Deductions
          </span>
        }>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Manage Deduction Titles</h5>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setEditingDeduction(null);
                    setNewDeduction({ name: '', amount: '', type: 'fixed', description: '', is_active: true });
                    setShowDeductionModal(true);
                  }}
                >
                  <FaPlus className="me-2" />
                  Create Deduction Title
                </Button>
              </div>

              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}></th>
                    <th>Deduction Title</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Assigned Employees</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionTitles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        No deduction titles found. Create a new one to get started.
                      </td>
                    </tr>
                  ) : (
                    deductionTitles.map((deduction) => (
                      <React.Fragment key={deduction.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => toggleDeductionExpansion(deduction.id)}>
                          <td>
                            {expandedDeduction === deduction.id ? (
                              <FaChevronDown />
                            ) : (
                              <FaChevronRight />
                            )}
                          </td>
                          <td>
                            <strong>{deduction.name}</strong>
                            {deduction.description && (
                              <small className="text-muted d-block">{deduction.description}</small>
                            )}
                          </td>
                          <td>
                            <Badge bg={deduction.type === 'percentage' ? 'info' : 'secondary'}>
                              {deduction.type}
                            </Badge>
                          </td>
                          <td>
                            {deduction.type === 'percentage' 
                              ? `${deduction.amount}%` 
                              : formatCurrency(deduction.amount)}
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {deduction.assigned_employees_count || 0}
                            </Badge>
                          </td>
                          <td>{getStatusBadge(deduction.is_active ? 'active' : 'closed')}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenAssignModal(deduction)}
                            >
                              <FaUserCheck className="me-1" />
                              Assign
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditDeduction(deduction)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteDeduction(deduction.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                        {expandedDeduction === deduction.id && assignedEmployees[deduction.id] && (
                          <tr>
                            <td colSpan={7} style={{ backgroundColor: '#f8f9fa', padding: '20px' }}>
                              <h6 className="mb-3">Assigned Employees ({assignedEmployees[deduction.id].length})</h6>
                              {assignedEmployees[deduction.id].length === 0 ? (
                                <p className="text-muted">No employees assigned to this deduction.</p>
                              ) : (
                                <Table size="sm" hover>
                                  <thead>
                                    <tr>
                                      <th>Employee Name</th>
                                      <th>Custom Amount</th>
                                      <th>Effective Amount</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignedEmployees[deduction.id].map((assignment) => {
                                      const employee = assignment.employee;
                                      const employeeName = employee?.user
                                        ? `${employee.user.first_name || ''} ${employee.user.last_name || ''}`.trim()
                                        : employee?.first_name && employee?.last_name
                                          ? `${employee.first_name} ${employee.last_name}`
                                          : employee?.employee_id || 'Unknown Employee';
                                      const effectiveAmount = assignment.custom_amount || deduction.amount;
                                      
                                      return (
                                        <tr key={assignment.id}>
                                          <td>{employeeName}</td>
                                          <td>
                                            {assignment.custom_amount 
                                              ? formatCurrency(assignment.custom_amount)
                                              : <span className="text-muted">Default</span>}
                                          </td>
                                          <td>
                                            {deduction.type === 'percentage'
                                              ? `${effectiveAmount}%`
                                              : formatCurrency(effectiveAmount)}
                                          </td>
                                          <td>{getStatusBadge(assignment.is_active ? 'active' : 'closed')}</td>
                                          <td>
                                            <Button
                                              variant="outline-warning"
                                              size="sm"
                                              className="me-2"
                                              onClick={() => handleToggleAssignmentStatus(
                                                deduction.id, 
                                                assignment.id, 
                                                assignment.is_active
                                              )}
                                            >
                                              {assignment.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              onClick={() => handleRemoveAssignment(deduction.id, assignment.employee_id)}
                                            >
                                              <FaTrash />
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Payroll Tab */}
        <Tab eventKey="payroll" title={
          <span>
            <FaMoneyCheckAlt className="me-2" />
            Payroll Records
          </span>
        }>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Payroll Records</h5>
                {(() => {
                  const draftCount = filteredPayrolls.filter(p => p.status === 'draft').length;
                  return draftCount > 0 && (
                    <div className="d-flex align-items-center position-relative">
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleOpenBulkStatusModal(null)}
                        className="d-flex align-items-center"
                        style={{
                          fontWeight: '600',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      >
                        <FaSync className="me-2" style={{ fontSize: '0.9rem' }} />
                        <span>Change All Status</span>
                      </Button>
                      <Badge 
                        bg="dark" 
                        text="light"
                        className="ms-2" 
                        style={{ 
                          fontSize: '0.75rem',
                          padding: '5px 12px',
                          fontWeight: '500',
                          color: '#fff',
                          backgroundColor: '#212529'
                        }}
                      >
                        {draftCount} {draftCount === 1 ? 'draft' : 'drafts'}
                      </Badge>
                    </div>
                  );
                })()}
              </div>

              {/* Date Range Selector */}
              <Row className="align-items-center mb-3">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                    <Form.Control
                      type="date"
                      value={tempPeriod.start}
                      onChange={(e) => setTempPeriod(prev => ({ ...prev, start: e.target.value }))}
                      size="sm"
                    />
                    <Form.Control
                      type="date"
                      value={tempPeriod.end}
                      onChange={(e) => setTempPeriod(prev => ({ ...prev, end: e.target.value }))}
                      size="sm"
                    />
                    <Button variant="success" size="sm" onClick={handleApplyDateRange}>
                      Apply
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Search employee..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic Salary</th>
                      <th>OT Pay</th>
                      <th>13th Month Pay</th>
                      <th>Gross Pay</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrolls.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-4">
                          No payroll records found for this period
                        </td>
                      </tr>
                    ) : (
                      filteredPayrolls.map((payroll) => {
                        const employee = employees.find(emp => emp.employee_profile?.id === payroll.employee_id);
                        const fullName = employee?.employee_profile 
                          ? `${employee.employee_profile.first_name} ${employee.employee_profile.last_name}`
                          : 'Unknown Employee';
                        
                        return (
                          <tr key={payroll.id}>
                            <td>{fullName}</td>
                            <td>{formatCurrency(payroll.basic_salary)}</td>
                            <td>{formatCurrency(payroll.overtime_pay)}</td>
                            <td>{formatCurrency(payroll.thirteenth_month_pay || 0)}</td>
                            <td>{formatCurrency(payroll.gross_pay)}</td>
                            <td>{formatCurrency(payroll.total_deductions)}</td>
                            <td><strong>{formatCurrency(payroll.net_pay)}</strong></td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {getStatusBadge(payroll.status, payroll)}
                                {payroll.status === 'draft' && (
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    onClick={() => handleEditStatus(payroll)}
                                    title="Edit Status"
                                  >
                                    <FaEdit />
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayroll(payroll);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <FaEye />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Create Period Modal */}
      <Modal show={showPeriodModal} onHide={() => {
        setShowPeriodModal(false);
        setNewPeriod({ name: '', start_date: '', end_date: '', description: '' });
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Create Payroll Period</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Period Name</Form.Label>
              <Form.Control
                type="text"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., October 2024 First Half"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={newPeriod.start_date}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={newPeriod.end_date}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newPeriod.description}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowPeriodModal(false);
            setNewPeriod({ name: '', start_date: '', end_date: '', description: '' });
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreatePeriod} disabled={!newPeriod.name || !newPeriod.start_date || !newPeriod.end_date}>
            Create Period
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Generate Payroll Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Generate Payroll</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayrollPeriod && (
            <>
              <p>Generate payroll for period:</p>
              <p><strong>Period:</strong> {selectedPayrollPeriod.name}</p>
              <p><strong>From:</strong> {format(new Date(selectedPayrollPeriod.start_date), 'MMM dd, yyyy')}</p>
              <p><strong>To:</strong> {format(new Date(selectedPayrollPeriod.end_date), 'MMM dd, yyyy')}</p>
              <p className="text-muted mt-3">
                This will calculate payroll for all employees based on their attendance and leaves.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)} disabled={generating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleGeneratePayroll} disabled={generating || !selectedPayrollPeriod}>
            {generating ? 'Generating...' : 'Generate Payroll'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create/Edit Tax Modal */}
      <Modal show={showTaxModal} onHide={() => {
        setShowTaxModal(false);
        setEditingTax(null);
        setNewTax({ name: '', rate: '', type: 'fixed', description: '', is_active: true });
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingTax ? 'Edit Tax Title' : 'Create Tax Title'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tax Title <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                value={editingTax?.name || newTax.name}
                onChange={(e) => {
                  if (editingTax) {
                    setEditingTax({ ...editingTax, name: e.target.value });
                  } else {
                    setNewTax({ ...newTax, name: e.target.value });
                  }
                }}
                placeholder="e.g., Income Tax, Withholding Tax"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rate <span className="text-danger">*</span></Form.Label>
              <InputGroup>
                <InputGroup.Text>₱</InputGroup.Text>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingTax?.rate || newTax.rate}
                  onChange={(e) => {
                    if (editingTax) {
                      setEditingTax({ ...editingTax, rate: e.target.value });
                    } else {
                      setNewTax({ ...newTax, rate: e.target.value });
                    }
                  }}
                  placeholder="0.00"
                  required
                />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editingTax?.description || newTax.description}
                onChange={(e) => {
                  if (editingTax) {
                    setEditingTax({ ...editingTax, description: e.target.value });
                  } else {
                    setNewTax({ ...newTax, description: e.target.value });
                  }
                }}
                placeholder="Optional description for this tax"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={editingTax?.is_active !== undefined ? editingTax.is_active : newTax.is_active}
                onChange={(e) => {
                  if (editingTax) {
                    setEditingTax({ ...editingTax, is_active: e.target.checked });
                  } else {
                    setNewTax({ ...newTax, is_active: e.target.checked });
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowTaxModal(false);
            setEditingTax(null);
            setNewTax({ name: '', rate: '', type: 'fixed', description: '', is_active: true });
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={editingTax ? handleUpdateTax : handleCreateTax}
            disabled={
              !(editingTax?.name || newTax.name) || 
              !(editingTax?.rate || newTax.rate)
            }
          >
            {editingTax ? 'Update' : 'Create'} Tax
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Tax to Employees Modal */}
      <Modal show={showAssignTaxModal} onHide={() => {
        setShowAssignTaxModal(false);
        setSelectedTax(null);
        setSelectedEmployeesForTaxAssignment([]);
        setAssignmentCustomRate('');
        setTaxEmployeeSearch('');
        setSelectAllTax(false);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Assign Tax: {selectedTax?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTax && (
            <>
              <div className="mb-3">
                <p><strong>Tax Type:</strong> {selectedTax.type}</p>
                <p><strong>Default Rate:</strong> {formatCurrency(selectedTax.rate)}</p>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>Custom Rate (Optional)</Form.Label>
                <Form.Text className="d-block mb-2 text-muted">
                  Leave blank to use default rate. Set a custom rate to override for selected employees.
                </Form.Text>
                <InputGroup>
                  <InputGroup.Text>₱</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={assignmentCustomRate}
                    onChange={(e) => setAssignmentCustomRate(e.target.value)}
                    placeholder="Override rate"
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Select Employees <span className="text-danger">*</span></Form.Label>
                {availableEmployeesForTax.length === 0 ? (
                  <p className="text-muted">All employees are already assigned to this tax.</p>
                ) : (
                  <>
                    <Form.Control
                      type="text"
                      placeholder="Search employees by name..."
                      value={taxEmployeeSearch}
                      onChange={(e) => setTaxEmployeeSearch(e.target.value)}
                      className="mb-2"
                    />
                    {filteredEmployeesForTax.length > 0 && (
                      <Form.Check
                        type="checkbox"
                        id="select-all-tax"
                        label="Select All"
                        checked={selectAllTax}
                        onChange={(e) => handleSelectAllTax(e.target.checked)}
                        className="mb-2 fw-bold"
                      />
                    )}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.25rem', padding: '10px' }}>
                      {filteredEmployeesForTax.length === 0 ? (
                        <p className="text-muted text-center py-3">No employees found matching your search.</p>
                      ) : (
                        filteredEmployeesForTax.map((employee) => {
                          const employeeName = getEmployeeName(employee);
                          
                          return (
                            <Form.Check
                              key={employee.id}
                              type="checkbox"
                              id={`employee-tax-${employee.id}`}
                              label={employeeName}
                              checked={selectedEmployeesForTaxAssignment.includes(employee.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployeesForTaxAssignment([...selectedEmployeesForTaxAssignment, employee.id]);
                                } else {
                                  setSelectedEmployeesForTaxAssignment(selectedEmployeesForTaxAssignment.filter(id => id !== employee.id));
                                }
                              }}
                              className="mb-2"
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAssignTaxModal(false);
            setSelectedTax(null);
            setSelectedEmployeesForTaxAssignment([]);
            setAssignmentCustomRate('');
            setTaxEmployeeSearch('');
            setSelectAllTax(false);
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignTaxToEmployees}
            disabled={selectedEmployeesForTaxAssignment.length === 0 || availableEmployeesForTax.length === 0}
          >
            Assign to {selectedEmployeesForTaxAssignment.length} Employee(s)
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create/Edit Deduction Modal */}
      <Modal show={showDeductionModal} onHide={() => {
        setShowDeductionModal(false);
        setEditingDeduction(null);
        setNewDeduction({ name: '', amount: '', type: 'fixed', description: '', is_active: true });
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingDeduction ? 'Edit Deduction Title' : 'Create Deduction Title'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Deduction Title <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                value={editingDeduction?.name || newDeduction.name}
                onChange={(e) => {
                  if (editingDeduction) {
                    setEditingDeduction({ ...editingDeduction, name: e.target.value });
                  } else {
                    setNewDeduction({ ...newDeduction, name: e.target.value });
                  }
                }}
                placeholder="e.g., Loan Deduction, Uniform Deduction"
                required
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={editingDeduction?.type || newDeduction.type}
                    onChange={(e) => {
                      if (editingDeduction) {
                        setEditingDeduction({ ...editingDeduction, type: e.target.value });
                      } else {
                        setNewDeduction({ ...newDeduction, type: e.target.value });
                      }
                    }}
                    required
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    {editingDeduction?.type === 'percentage' || newDeduction.type === 'percentage' ? (
                      <>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editingDeduction?.amount || newDeduction.amount}
                          onChange={(e) => {
                            if (editingDeduction) {
                              setEditingDeduction({ ...editingDeduction, amount: e.target.value });
                            } else {
                              setNewDeduction({ ...newDeduction, amount: e.target.value });
                            }
                          }}
                          placeholder="0.00"
                          required
                        />
                        <InputGroup.Text>%</InputGroup.Text>
                      </>
                    ) : (
                      <>
                        <InputGroup.Text>₱</InputGroup.Text>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingDeduction?.amount || newDeduction.amount}
                          onChange={(e) => {
                            if (editingDeduction) {
                              setEditingDeduction({ ...editingDeduction, amount: e.target.value });
                            } else {
                              setNewDeduction({ ...newDeduction, amount: e.target.value });
                            }
                          }}
                          placeholder="0.00"
                          required
                        />
                      </>
                    )}
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editingDeduction?.description || newDeduction.description}
                onChange={(e) => {
                  if (editingDeduction) {
                    setEditingDeduction({ ...editingDeduction, description: e.target.value });
                  } else {
                    setNewDeduction({ ...newDeduction, description: e.target.value });
                  }
                }}
                placeholder="Optional description for this deduction"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={editingDeduction?.is_active !== undefined ? editingDeduction.is_active : newDeduction.is_active}
                onChange={(e) => {
                  if (editingDeduction) {
                    setEditingDeduction({ ...editingDeduction, is_active: e.target.checked });
                  } else {
                    setNewDeduction({ ...newDeduction, is_active: e.target.checked });
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowDeductionModal(false);
            setEditingDeduction(null);
            setNewDeduction({ name: '', amount: '', type: 'fixed', description: '', is_active: true });
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={editingDeduction ? handleUpdateDeduction : handleCreateDeduction}
            disabled={
              !(editingDeduction?.name || newDeduction.name) || 
              !(editingDeduction?.amount || newDeduction.amount)
            }
          >
            {editingDeduction ? 'Update' : 'Create'} Deduction
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Deduction to Employees Modal */}
      <Modal show={showAssignModal} onHide={() => {
        setShowAssignModal(false);
        setSelectedDeduction(null);
        setSelectedEmployeesForAssignment([]);
        setAssignmentCustomAmount('');
        setDeductionEmployeeSearch('');
        setSelectAllDeduction(false);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Assign Deduction: {selectedDeduction?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDeduction && (
            <>
              <div className="mb-3">
                <p><strong>Deduction Type:</strong> {selectedDeduction.type}</p>
                <p><strong>Default Amount:</strong> {
                  selectedDeduction.type === 'percentage' 
                    ? `${selectedDeduction.amount}%` 
                    : formatCurrency(selectedDeduction.amount)
                }</p>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>Custom Amount (Optional)</Form.Label>
                <Form.Text className="d-block mb-2 text-muted">
                  Leave blank to use default amount. Set a custom amount to override for selected employees.
                </Form.Text>
                {selectedDeduction.type === 'percentage' ? (
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={assignmentCustomAmount}
                      onChange={(e) => setAssignmentCustomAmount(e.target.value)}
                      placeholder="Override percentage"
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                ) : (
                  <InputGroup>
                    <InputGroup.Text>₱</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={assignmentCustomAmount}
                      onChange={(e) => setAssignmentCustomAmount(e.target.value)}
                      placeholder="Override amount"
                    />
                  </InputGroup>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Select Employees <span className="text-danger">*</span></Form.Label>
                {availableEmployees.length === 0 ? (
                  <p className="text-muted">All employees are already assigned to this deduction.</p>
                ) : (
                  <>
                    <Form.Control
                      type="text"
                      placeholder="Search employees by name..."
                      value={deductionEmployeeSearch}
                      onChange={(e) => setDeductionEmployeeSearch(e.target.value)}
                      className="mb-2"
                    />
                    {filteredEmployeesForDeduction.length > 0 && (
                      <Form.Check
                        type="checkbox"
                        id="select-all-deduction"
                        label="Select All"
                        checked={selectAllDeduction}
                        onChange={(e) => handleSelectAllDeduction(e.target.checked)}
                        className="mb-2 fw-bold"
                      />
                    )}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.25rem', padding: '10px' }}>
                      {filteredEmployeesForDeduction.length === 0 ? (
                        <p className="text-muted text-center py-3">No employees found matching your search.</p>
                      ) : (
                        filteredEmployeesForDeduction.map((employee) => {
                          const employeeName = getEmployeeName(employee);
                          
                          return (
                            <Form.Check
                              key={employee.id}
                              type="checkbox"
                              id={`employee-${employee.id}`}
                              label={employeeName}
                              checked={selectedEmployeesForAssignment.includes(employee.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployeesForAssignment([...selectedEmployeesForAssignment, employee.id]);
                                } else {
                                  setSelectedEmployeesForAssignment(selectedEmployeesForAssignment.filter(id => id !== employee.id));
                                }
                              }}
                              className="mb-2"
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAssignModal(false);
            setSelectedDeduction(null);
            setSelectedEmployeesForAssignment([]);
            setAssignmentCustomAmount('');
            setDeductionEmployeeSearch('');
            setSelectAllDeduction(false);
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignToEmployees}
            disabled={selectedEmployeesForAssignment.length === 0 || availableEmployees.length === 0}
          >
            Assign to {selectedEmployeesForAssignment.length} Employee(s)
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payroll Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Payroll Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayroll && (
            <div>
              {/* Basic Information Table */}
              <h6 className="mb-3">Basic Information</h6>
              <Table striped bordered hover size="sm" className="mb-4">
                <tbody>
                  <tr>
                    <td><strong>Days Worked</strong></td>
                    <td>{selectedPayroll.days_worked || 0}</td>
                    <td><strong>Absences</strong></td>
                    <td>{selectedPayroll.absences || 0}</td>
                  </tr>
                  <tr>
                    <td><strong>Status</strong></td>
                    <td colSpan="3">{getStatusBadge(selectedPayroll.status)}</td>
                  </tr>
                </tbody>
              </Table>

              {/* Earnings Table */}
              <h6 className="mb-3">Earnings</h6>
              <Table striped bordered hover size="sm" className="mb-4">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Salary</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.basic_salary)}</td>
                  </tr>
                  <tr>
                    <td>Overtime Pay</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.overtime_pay)}</td>
                  </tr>
                  <tr>
                    <td>Holiday Pay</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.holiday_pay || 0)}</td>
                  </tr>
                  {(selectedPayroll.leave_with_pay ?? 0) > 0 && (
                    <tr>
                      <td>Leave with Pay</td>
                      <td className="text-end">{formatCurrency(selectedPayroll.leave_with_pay || 0)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>13th Month Pay</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.thirteenth_month_pay || 0)}</td>
                  </tr>
                  <tr className="table-primary">
                    <td><strong>Gross Pay</strong></td>
                    <td className="text-end"><strong>{formatCurrency(selectedPayroll.gross_pay)}</strong></td>
                  </tr>
                </tbody>
              </Table>

              {/* 13th Month Pay Breakdown */}
              {selectedPayroll && selectedPayroll.thirteenth_month_pay !== undefined && selectedPayroll.thirteenth_month_pay !== null && selectedPayroll.thirteenth_month_pay > 0 && (
                <>
                  <h6 className="mb-3">
                    13th Month Pay Breakdown
                  </h6>
                  {selectedPayroll.thirteenth_month_pay_breakdown && 
                   Array.isArray(selectedPayroll.thirteenth_month_pay_breakdown) && 
                   selectedPayroll.thirteenth_month_pay_breakdown.length > 0 ? (
                    <Table striped bordered hover size="sm" className="mb-4">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th className="text-end">Calculation</th>
                          <th className="text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPayroll.thirteenth_month_pay_breakdown.map((item, index) => (
                          <tr 
                            key={index}
                            className={item.is_total ? 'table-primary' : ''}
                          >
                            <td>
                              {item.is_total ? <strong>{item.description}</strong> : item.description}
                            </td>
                            <td className="text-end text-muted">
                              {item.calculation || '-'}
                            </td>
                            <td className="text-end">
                              {item.is_total ? <strong>{formatCurrency(item.amount)}</strong> : formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="alert alert-info mb-4">
                      <strong>Breakdown calculation in progress.</strong> Please refresh the page or recalculate the payroll to see the detailed breakdown.
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-2" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          <div>Debug Info:</div>
                          <div>13th Month Pay: {selectedPayroll.thirteenth_month_pay}</div>
                          <div>Has Breakdown: {selectedPayroll.thirteenth_month_pay_breakdown ? 'Yes' : 'No'}</div>
                          <div>Breakdown Type: {typeof selectedPayroll.thirteenth_month_pay_breakdown}</div>
                          <div>Is Array: {Array.isArray(selectedPayroll.thirteenth_month_pay_breakdown) ? 'Yes' : 'No'}</div>
                          <div>Breakdown Value: {JSON.stringify(selectedPayroll.thirteenth_month_pay_breakdown)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* SSS Contributions Table */}
              {(selectedPayroll.sss_employer_contribution || selectedPayroll.sss_ec_contribution || selectedPayroll.sss_employer_total || selectedPayroll.sss_deduction) && (
                <>
                  <h6 className="mb-3">
                    SSS Contributions (2025 Rate - MSC: {formatCurrency(selectedPayroll.sss_msc || 0)})
                  </h6>
                  <Table striped bordered hover size="sm" className="mb-4">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Employee</th>
                        <th className="text-end">Employer</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Regular SS (5% / 10%)</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_regular_ss_employee || 0)}</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_regular_ss_employer || 0)}</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_regular_ss_total || 0)}</td>
                      </tr>
                      {(selectedPayroll.sss_mpf_employee > 0 || selectedPayroll.sss_mpf_employer > 0) && (
                        <tr>
                          <td>MPF (Member's Provident Fund) (5% / 10%)</td>
                          <td className="text-end">{formatCurrency(selectedPayroll.sss_mpf_employee || 0)}</td>
                          <td className="text-end">{formatCurrency(selectedPayroll.sss_mpf_employer || 0)}</td>
                          <td className="text-end">{formatCurrency(selectedPayroll.sss_mpf_total || 0)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>EC (Employees' Compensation)</td>
                        <td className="text-end">-</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_ec_contribution || 0)}</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.sss_ec_contribution || 0)}</td>
                      </tr>
                      <tr className="table-success">
                        <td><strong>Total Employer Share</strong></td>
                        <td className="text-end">-</td>
                        <td className="text-end"><strong>{formatCurrency(selectedPayroll.sss_employer_total || 0)}</strong></td>
                        <td className="text-end">-</td>
                      </tr>
                      <tr className="table-primary">
                        <td><strong>Total SSS Remittance</strong></td>
                        <td className="text-end">-</td>
                        <td className="text-end">-</td>
                        <td className="text-end"><strong>{formatCurrency(selectedPayroll.sss_total_remittance || 0)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </>
              )}

              {/* Pag-IBIG Contributions Table */}
              {(selectedPayroll.pagibig_employer_contribution || selectedPayroll.pagibig_deduction || selectedPayroll.pagibig_total_contribution) && (
                <>
                  <h6 className="mb-3">
                    Pag-IBIG Contributions (2025 Rate - Salary Base: {formatCurrency(selectedPayroll.pagibig_salary_base || 0)})
                  </h6>
                  <Table striped bordered hover size="sm" className="mb-4">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Employee</th>
                        <th className="text-end">Employer</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Regular Contribution (1% / 2% or 2% / 2%)</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.pagibig_deduction || 0)}</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.pagibig_employer_contribution || 0)}</td>
                        <td className="text-end">{formatCurrency(
                          (parseFloat(selectedPayroll.pagibig_deduction) || 0) + 
                          (parseFloat(selectedPayroll.pagibig_employer_contribution) || 0)
                        )}</td>
                      </tr>
                      <tr className="table-primary">
                        <td><strong>Total Pag-IBIG Contribution</strong></td>
                        <td className="text-end">-</td>
                        <td className="text-end">-</td>
                        <td className="text-end"><strong>{formatCurrency(selectedPayroll.pagibig_total_contribution || 0)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </>
              )}

              {/* PhilHealth Contributions Table */}
              {(selectedPayroll.philhealth_employer_contribution || selectedPayroll.philhealth_deduction || selectedPayroll.philhealth_total_contribution) && (
                <>
                  <h6 className="mb-3">
                    PhilHealth Contributions (2025 Rate - MBS: {formatCurrency(selectedPayroll.philhealth_mbs || 0)})
                  </h6>
                  <Table striped bordered hover size="sm" className="mb-4">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Employee</th>
                        <th className="text-end">Employer</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Regular Premium (5% of MBS, 50% / 50%)</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.philhealth_deduction || 0)}</td>
                        <td className="text-end">{formatCurrency(selectedPayroll.philhealth_employer_contribution || 0)}</td>
                        <td className="text-end">{formatCurrency(
                          (parseFloat(selectedPayroll.philhealth_deduction) || 0) + 
                          (parseFloat(selectedPayroll.philhealth_employer_contribution) || 0)
                        )}</td>
                      </tr>
                      <tr className="table-primary">
                        <td><strong>Total PhilHealth Premium</strong></td>
                        <td className="text-end">-</td>
                        <td className="text-end">-</td>
                        <td className="text-end"><strong>{formatCurrency(selectedPayroll.philhealth_total_contribution || 0)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </>
              )}

              {/* Deductions Table */}
              <h6 className="mb-3">Deductions</h6>
              <Table striped bordered hover size="sm" className="mb-4">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>SSS (Employee Contribution)</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.sss_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>PhilHealth</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.philhealth_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Pag-IBIG</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.pagibig_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Tax</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.tax_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Late Penalty</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.late_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Undertime Penalty</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.undertime_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Cash Advance</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.cash_advance_deduction || 0)}</td>
                  </tr>
                  <tr>
                    <td>Other Deductions</td>
                    <td className="text-end">{formatCurrency(selectedPayroll.other_deductions || 0)}</td>
                  </tr>
                  <tr className="table-danger">
                    <td><strong>Total Deductions</strong></td>
                    <td className="text-end"><strong>{formatCurrency(selectedPayroll.total_deductions)}</strong></td>
                  </tr>
                  <tr className="table-success">
                    <td><strong>Net Pay</strong></td>
                    <td className="text-end"><strong className="text-success">{formatCurrency(selectedPayroll.net_pay)}</strong></td>
                  </tr>
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={async () => {
              if (!selectedPayroll) return;
              
              try {
                const response = await axios.get(`http://localhost:8000/api/payrolls/${selectedPayroll.id}/download`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  },
                  responseType: 'blob',
                  validateStatus: function (status) {
                    return status >= 200 && status < 300;
                  }
                });

                // Check if response is an error JSON instead of PDF
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                  const text = await response.data.text();
                  const errorData = JSON.parse(text);
                  throw new Error(errorData.message || errorData.error || 'Failed to download payslip');
                }

                // Create blob from response data
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                
                // Create download link and trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `payslip_${selectedPayroll.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success('Payslip downloaded successfully');
              } catch (err) {
                console.error('Error downloading payslip:', err);
                let errorMessage = 'Failed to download payslip. Please try again.';
                
                if (err.response) {
                  // Handle error response
                  const status = err.response.status;
                  if (status === 404) {
                    errorMessage = 'Payslip not found or you do not have permission to access it.';
                  } else if (status === 401) {
                    errorMessage = 'Unauthorized. Please log in again.';
                  } else if (status === 403) {
                    errorMessage = 'You do not have permission to download this payslip.';
                  } else if (err.response.data) {
                    try {
                      // Try to parse error message from blob or JSON response
                      if (err.response.data instanceof Blob) {
                        const text = await err.response.data.text();
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.message || errorData.error || errorMessage;
                      } else if (typeof err.response.data === 'object') {
                        errorMessage = err.response.data.message || err.response.data.error || errorMessage;
                      }
                    } catch (parseErr) {
                      // If parsing fails, use default message
                      console.error('Error parsing error response:', parseErr);
                    }
                  }
                } else if (err.message) {
                  errorMessage = err.message;
                }
                
                toast.error(errorMessage);
              }
            }}
          >
            <FaDownload className="me-2" />
            Download PDF
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update Status Modal */}
      <Modal show={showStatusModal} onHide={() => {
        setShowStatusModal(false);
        setSelectedPayrollForStatus(null);
        setNewStatus('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Update Payroll Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayrollForStatus && (
            <div>
              <p><strong>Employee:</strong> {
                employees.find(emp => emp.employee_profile?.id === selectedPayrollForStatus.employee_id)?.employee_profile
                  ? `${employees.find(emp => emp.employee_profile?.id === selectedPayrollForStatus.employee_id).employee_profile.first_name} ${employees.find(emp => emp.employee_profile?.id === selectedPayrollForStatus.employee_id).employee_profile.last_name}`
                  : selectedPayrollForStatus.employee?.first_name && selectedPayrollForStatus.employee?.last_name
                    ? `${selectedPayrollForStatus.employee.first_name} ${selectedPayrollForStatus.employee.last_name}`
                    : 'Unknown Employee'
              }</p>
              <p><strong>Current Status:</strong> {getStatusBadge(selectedPayrollForStatus.status)}</p>
              <p><strong>Period:</strong> {format(new Date(selectedPayrollForStatus.period_start), 'MMM dd, yyyy')} - {format(new Date(selectedPayrollForStatus.period_end), 'MMM dd, yyyy')}</p>
              <hr />
              <Form.Group className="mb-3">
                <Form.Label>New Status</Form.Label>
                <Form.Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="draft">Draft</option>
                  <option value="processed">Processed</option>
                  <option value="paid">Paid</option>
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowStatusModal(false);
            setSelectedPayrollForStatus(null);
            setNewStatus('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateStatus}
            disabled={!newStatus || newStatus === selectedPayrollForStatus?.status}
          >
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Update Status Modal */}
      <Modal show={showBulkStatusModal} onHide={() => {
        setShowBulkStatusModal(false);
        setBulkNewStatus('');
        setSelectedPeriodForBulk(null);
        setBulkUpdateScope('period');
      }} size="lg">
        <Modal.Header closeButton style={{ borderBottom: '2px solid #f0f0f0' }}>
          <Modal.Title className="d-flex align-items-center">
            <FaSync className="me-2 text-warning" />
            Bulk Update Payroll Status
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            {bulkUpdateScope === 'period' && selectedPeriodForBulk && (() => {
              const draftCount = selectedPeriodForBulk.payrolls?.filter(p => p.status === 'draft').length || 0;
              return (
                <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="mb-1"><strong>Period:</strong> {selectedPeriodForBulk.name}</p>
                      <p className="mb-0"><strong>Date Range:</strong> {format(new Date(selectedPeriodForBulk.start_date), 'MMM dd, yyyy')} - {format(new Date(selectedPeriodForBulk.end_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <Badge bg="warning" text="dark" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                      {draftCount} {draftCount === 1 ? 'Draft Payroll' : 'Draft Payrolls'}
                    </Badge>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                    <FaCheckDouble className="me-1" />
                    This will update all draft payrolls in this period to the selected status.
                  </p>
                </div>
              );
            })()}
            {bulkUpdateScope === 'current' && (() => {
              const draftCount = filteredPayrolls.filter(p => p.status === 'draft').length;
              return (
                <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="mb-0"><strong>Date Range:</strong> {format(new Date(selectedPeriod.start), 'MMM dd, yyyy')} - {format(new Date(selectedPeriod.end), 'MMM dd, yyyy')}</p>
                    </div>
                    <Badge bg="warning" text="dark" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                      {draftCount} {draftCount === 1 ? 'Draft Payroll' : 'Draft Payrolls'}
                    </Badge>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                    <FaCheckDouble className="me-1" />
                    This will update all draft payrolls in the current date range to the selected status.
                  </p>
                </div>
              );
            })()}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">New Status</Form.Label>
              <Form.Select
                value={bulkNewStatus}
                onChange={(e) => setBulkNewStatus(e.target.value)}
                size="lg"
                style={{ border: '2px solid #dee2e6' }}
              >
                <option value="">Select Status</option>
                <option value="processed">Processed</option>
                <option value="paid">Paid</option>
              </Form.Select>
              <Form.Text className="text-muted d-block mt-2">
                <FaCheckDouble className="me-1" />
                Note: Only draft payrolls will be updated. Processed and paid payrolls will remain unchanged.
              </Form.Text>
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '2px solid #f0f0f0' }}>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowBulkStatusModal(false);
              setBulkNewStatus('');
              setSelectedPeriodForBulk(null);
              setBulkUpdateScope('period');
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleBulkUpdateStatus}
            disabled={!bulkNewStatus}
            className="d-flex align-items-center"
            style={{ fontWeight: '600' }}
          >
            <FaSync className="me-2" />
            Update All Statuses
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PayrollDashboard;
