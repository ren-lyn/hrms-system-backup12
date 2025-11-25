import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Modal, Badge, InputGroup, Tabs, Tab, Alert, Dropdown } from 'react-bootstrap';
import { 
  FaDollarSign, FaEye, FaPrint, FaTrash, FaCheckCircle, FaTimesCircle, 
  FaFileAlt, FaUser, FaCalendarAlt, FaSearch, FaDownload, FaBan, FaHistory, FaInfoCircle,
  FaFilePdf, FaFileExcel, FaSpinner, FaChartLine
} from 'react-icons/fa';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function BenefitsManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [benefitClaims, setBenefitClaims] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetailsModal, setShowEmployeeDetailsModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetails, setClaimDetails] = useState(null);
  const [documentViewerUrl, setDocumentViewerUrl] = useState(null);
  const [documentViewerType, setDocumentViewerType] = useState(null);
  const [allDocuments, setAllDocuments] = useState([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClaimForRejection, setSelectedClaimForRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeContributionTab, setActiveContributionTab] = useState('sss');
  const [contributionHistory, setContributionHistory] = useState({
    sss: [],
    philhealth: [],
    pagibig: []
  });
  const [reportPeriod, setReportPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [reportFilters, setReportFilters] = useState({
    department: '',
    position: '',
    benefit_type: ''
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [contributionReportData, setContributionReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [claimForm, setClaimForm] = useState({
    employee_id: '',
    benefit_type: '',
    claim_type: '',
    amount: '',
    description: '',
    supporting_documents: null
  });

  const [completionEvidence, setCompletionEvidence] = useState(null);
  const [showCompletionUpload, setShowCompletionUpload] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [claimSearchTerm, setClaimSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
    if (activeTab === 'claims') {
      fetchBenefitClaims();
    }
    if (activeTab === 'reports') {
      fetchDepartmentsAndPositions();
    }
  }, [activeTab]);

  const fetchDepartmentsAndPositions = async () => {
    try {
      const response = await axios.get('/employees');
      let employeesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data.employees && Array.isArray(response.data.employees)) {
          employeesData = response.data.employees;
        }
      }
      
      const uniqueDepartments = [...new Set(employeesData.map(emp => {
        const profile = emp.employee_profile || emp;
        return profile.department;
      }).filter(Boolean))].sort();
      
      const uniquePositions = [...new Set(employeesData.map(emp => {
        const profile = emp.employee_profile || emp;
        return profile.position;
      }).filter(Boolean))].sort();
      
      setDepartments(uniqueDepartments);
      setPositions(uniquePositions);
    } catch (error) {
      console.error('Error fetching departments and positions:', error);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/employees');
      
      // Handle different response structures
      let employeesData = [];
      if (response.data) {
        // Handle case where data is directly an array
        if (Array.isArray(response.data)) {
          employeesData = response.data;
        } 
        // Handle case where data is nested under a data property
        else if (response.data.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        }
        // Handle case where data is an object with employees property
        else if (response.data.employees && Array.isArray(response.data.employees)) {
          employeesData = response.data.employees;
        }
      }
      
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchBenefitClaims = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/benefit-claims');
      
      // Handle different response structures
      let claimsData = [];
      if (response.data) {
        // Handle case where data is directly an array
        if (Array.isArray(response.data)) {
          claimsData = response.data;
        } 
        // Handle case where data is nested under a data property (API response: { success: true, data: [...] })
        else if (response.data.data && Array.isArray(response.data.data)) {
          claimsData = response.data.data;
        }
        // Handle case where data is an object with claims property
        else if (response.data.claims && Array.isArray(response.data.claims)) {
          claimsData = response.data.claims;
        }
      }
      
      setBenefitClaims(claimsData);
    } catch (error) {
      console.error('Error fetching benefit claims:', error);
      // If endpoint doesn't exist yet, use empty array
      setBenefitClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployeeDetails = async (employee) => {
    setSelectedEmployee(employee);
    
    // Fetch contribution history for this employee
    await fetchContributionHistory(employee.id);
    
    setShowEmployeeDetailsModal(true);
  };

  const fetchContributionHistory = async (employeeId) => {
    try {
      // Get employee profile to find the employee_profile id
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        setContributionHistory({ sss: [], philhealth: [], pagibig: [] });
        return;
      }

      const profile = employee.employee_profile || employee;
      const profileId = profile.id;

      // Fetch all payroll records (we'll filter by employee_id on frontend)
      // Using a large date range to get all payrolls
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const today = new Date();
      
      const response = await axios.get('/payroll', {
        params: {
          period_start: format(twoYearsAgo, 'yyyy-MM-dd'),
          period_end: format(today, 'yyyy-MM-dd'),
          per_page: 1000 // Get more records to ensure we get all payrolls
        }
      });

      const allPayrolls = response.data.data?.payrolls || response.data.data || response.data || [];
      
      // Filter payrolls for this specific employee
      const employeePayrolls = allPayrolls.filter((payroll) => {
        // Check if payroll belongs to this employee
        const payrollEmployeeId = payroll.employee_id || payroll.employee?.id || payroll.employee_profile?.id;
        return payrollEmployeeId === profileId;
      });
      
      // Extract contribution history from payroll records
      const sssHistory = [];
      const philhealthHistory = [];
      const pagibigHistory = [];

      employeePayrolls.forEach((payroll) => {
        // Use period_end as the contribution date (when the period ended)
        const contributionDate = payroll.period_end || payroll.period_start || payroll.created_at;
        
        if (payroll.sss_deduction && parseFloat(payroll.sss_deduction) > 0) {
          sssHistory.push({
            date: contributionDate,
            amount: parseFloat(payroll.sss_deduction)
          });
        }
        
        if (payroll.philhealth_deduction && parseFloat(payroll.philhealth_deduction) > 0) {
          philhealthHistory.push({
            date: contributionDate,
            amount: parseFloat(payroll.philhealth_deduction)
          });
        }
        
        if (payroll.pagibig_deduction && parseFloat(payroll.pagibig_deduction) > 0) {
          pagibigHistory.push({
            date: contributionDate,
            amount: parseFloat(payroll.pagibig_deduction)
          });
        }
      });

      // Sort by date (most recent first)
      const sortByDate = (a, b) => new Date(b.date) - new Date(a.date);
      
      setContributionHistory({
        sss: sssHistory.sort(sortByDate),
        philhealth: philhealthHistory.sort(sortByDate),
        pagibig: pagibigHistory.sort(sortByDate)
      });
    } catch (error) {
      console.error('Error fetching contribution history from payroll:', error);
      // Set empty history on error
      setContributionHistory({ sss: [], philhealth: [], pagibig: [] });
    }
  };


  const handleFileClaim = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('employee_id', claimForm.employee_id);
      formData.append('benefit_type', claimForm.benefit_type);
      formData.append('claim_type', claimForm.claim_type);
      formData.append('amount', claimForm.amount);
      formData.append('description', claimForm.description);
      if (claimForm.supporting_documents) {
        formData.append('supporting_documents', claimForm.supporting_documents);
      }

      // This endpoint would need to be created in the backend
      await axios.post('/benefit-claims', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Benefit claim filed successfully');
      setShowClaimModal(false);
      setClaimForm({
        employee_id: '',
        benefit_type: '',
        claim_type: '',
        amount: '',
        description: '',
        supporting_documents: null
      });
      fetchBenefitClaims();
    } catch (error) {
      console.error('Error filing claim:', error);
      toast.error('Failed to file benefit claim');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClaim = async (claimId) => {
    try {
      setLoading(true);
      const response = await axios.put(`/benefit-claims/${claimId}/approve`);
      toast.success('Benefit claim approved successfully');
      
      // Use the updated claim data from the response
      const updatedClaim = response.data.data || response.data;
      
      // Refresh the claims list
      fetchBenefitClaims();
      
      // If the modal is open and showing this claim, update the claim details with the response data
      if (claimDetails?.id === claimId || selectedClaim?.id === claimId) {
        setClaimDetails(updatedClaim);
        setSelectedClaim(updatedClaim);
      }
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Failed to approve benefit claim');
    } finally {
      setLoading(false);
    }
  };

  const loadDocument = async (index) => {
    try {
      setLoading(true);
      const doc = allDocuments[index];
      const docResponse = await axios.get(doc.download_url, {
        responseType: 'blob'
      });
      
      // Determine file type
      const contentType = docResponse.headers['content-type'] || '';
      const fileName = doc.name;
      const isPdf = contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
      const isImage = contentType.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(fileName);
      
      // Revoke previous URL
      if (documentViewerUrl) {
        window.URL.revokeObjectURL(documentViewerUrl);
      }
      
      // Create object URL for viewing
      const url = window.URL.createObjectURL(new Blob([docResponse.data], { type: contentType }));
      setDocumentViewerUrl(url);
      setDocumentViewerType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
      setCurrentDocumentIndex(index);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClaim = async (claimId, reason) => {
    if (!reason || reason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(`/benefit-claims/${claimId}/reject`, { rejection_reason: reason });
      
      if (response.data.success) {
        toast.success('Benefit claim rejected successfully');
        
        // Use the updated claim data from the response
        const updatedClaim = response.data.data || response.data;
        
        // Refresh the claims list
        await fetchBenefitClaims();
        
        // If the modal is open and showing this claim, update the claim details with the response data
        if (claimDetails?.id === claimId || selectedClaim?.id === claimId) {
          setClaimDetails(updatedClaim);
          setSelectedClaim(updatedClaim);
        }
        
        // Close reject modal and reset
        setShowRejectModal(false);
        setSelectedClaimForRejection(null);
        setRejectionReason('');
      } else {
        toast.error(response.data.message || 'Failed to reject benefit claim');
      }
    } catch (error) {
      console.error('Error rejecting claim:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.rejection_reason?.[0] ||
                           'Failed to reject benefit claim';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (claimId, newStatus) => {
    try {
      setLoading(true);
      const response = await axios.put(`/benefit-claims/${claimId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        toast.success('Status updated successfully');
        // Refresh claim details
        const claimResponse = await axios.get(`/benefit-claims/${claimId}`);
        setClaimDetails(claimResponse.data.data || claimResponse.data);
        await fetchBenefitClaims();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const openRejectModal = (claim) => {
    setSelectedClaimForRejection(claim);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters long');
      return;
    }
    if (selectedClaimForRejection) {
      handleRejectClaim(selectedClaimForRejection.id, rejectionReason);
    }
  };

  const handleTerminateEnrollment = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      // This endpoint would need to be created in the backend
      await axios.put(`/employees/${selectedEmployee.id}/benefits/terminate`, {
        termination_date: new Date().toISOString().split('T')[0],
        reason: 'Terminated by HR Assistant'
      });
      toast.success('Employee benefit enrollment terminated successfully');
      setShowTerminateModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error terminating enrollment:', error);
      toast.error('Failed to terminate benefit enrollment');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!reportPeriod.start || !reportPeriod.end) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    try {
      setReportLoading(true);
      const response = await axios.get('/benefit-contributions/report', {
        params: {
          start_date: reportPeriod.start,
          end_date: reportPeriod.end,
          benefit_type: reportFilters.benefit_type || null
        }
      });
      
      if (response.data.success && response.data.data) {
        let reportData = response.data.data;
        
        // Apply department and position filters if specified
        if (reportFilters.department || reportFilters.position) {
          const filteredDetails = reportData.details.filter(detail => {
            // We need to get employee profile to check department/position
            // For now, we'll filter based on available data
            // This might need backend support for better filtering
            return true; // Placeholder - backend should handle this
          });
          reportData = { ...reportData, details: filteredDetails };
        }
        
        setContributionReportData(reportData);
        toast.success('Report preview generated successfully');
      } else {
        toast.error('Failed to generate report preview');
      }
    } catch (error) {
      console.error('Error generating report preview:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report preview');
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateReport = async (format = 'excel') => {
    if (!reportPeriod.start || !reportPeriod.end) {
      toast.error('Please select both start and end dates');
      return;
    }

    // If no preview data exists, generate it first
    if (!contributionReportData) {
      toast.info('Generating preview first...');
      await handleGeneratePreview();
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      setReportLoading(true);

      if (format === 'csv') {
        // Generate CSV on frontend
        if (!contributionReportData || !contributionReportData.details) {
          toast.error('Please generate a preview first');
          return;
        }

        const headers = ['Employee ID', 'Employee Name', 'Period Start', 'Period End', 'SSS', 'PhilHealth', 'Pag-IBIG'];
        const rows = contributionReportData.details.map(detail => [
          detail.employee_id || 'N/A',
          detail.employee_name || 'N/A',
          detail.period_start || 'N/A',
          detail.period_end || 'N/A',
          detail.sss || 0,
          detail.philhealth || 0,
          detail.pagibig || 0
        ]);

        // Add summary row
        rows.push([]);
        rows.push(['SUMMARY', '', '', '', 
          contributionReportData.summary?.sss || 0,
          contributionReportData.summary?.philhealth || 0,
          contributionReportData.summary?.pagibig || 0
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `benefit-contributions-report-${reportPeriod.start}-${reportPeriod.end}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.success('Report exported as CSV successfully');
      } else {
        // For PDF and Excel, try backend endpoint
        const params = {
          start_date: reportPeriod.start,
          end_date: reportPeriod.end,
          benefit_type: reportFilters.benefit_type || null,
          format: format
        };

        try {
          const response = await axios.get('/benefit-contributions/report', {
            params: params,
            responseType: 'blob'
          });

          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;

          const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
          link.setAttribute('download', `benefit-contributions-report-${reportPeriod.start}-${reportPeriod.end}.${fileExtension}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          toast.success(`Report exported as ${format.toUpperCase()} successfully`);
        } catch (backendError) {
          // If backend doesn't support the format, show a helpful message
          if (format === 'pdf' || format === 'excel') {
            toast.warning(`${format.toUpperCase()} export is not yet supported by the backend. Please use CSV export or contact the administrator.`);
          } else {
            throw backendError;
          }
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numericValue = Number(value ?? 0);
    if (Number.isNaN(numericValue)) {
      return '₱0.00';
    }
    return `₱${numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredEmployees = employees.filter(emp => {
    const profile = emp.employee_profile || emp;
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const matchesSearch = 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.sss?.includes(searchTerm) ||
      profile.philhealth?.includes(searchTerm) ||
      profile.pagibig?.includes(searchTerm);
    return matchesSearch;
  });

  const formatClaimId = (id) => {
    if (!id) return 'N/A';
    // Format as CB-0001, CB-0002, etc.
    return `CB-${String(id).padStart(4, '0')}`;
  };

  const filteredClaims = (Array.isArray(benefitClaims) ? benefitClaims : []).filter(claim => {
    if (!claim) return false;
    
    // Filter by status
    if (filterStatus !== 'all' && claim.status !== filterStatus) {
      return false;
    }
    
    // Filter by search term (employee name)
    if (claimSearchTerm.trim()) {
      const searchLower = claimSearchTerm.toLowerCase();
      
      // Safely get employee name from various possible locations
      let employeeName = '';
      if (claim.employee?.name) {
        employeeName = claim.employee.name;
      } else if (claim.user?.name) {
        employeeName = claim.user.name;
      } else if (claim.user?.first_name || claim.user?.last_name) {
        employeeName = `${claim.user?.first_name || ''} ${claim.user?.last_name || ''}`.trim();
      } else if (claim.employeeProfile?.first_name || claim.employeeProfile?.last_name) {
        employeeName = `${claim.employeeProfile?.first_name || ''} ${claim.employeeProfile?.last_name || ''}`.trim();
      } else if (claim.employee?.first_name || claim.employee?.last_name) {
        employeeName = `${claim.employee?.first_name || ''} ${claim.employee?.last_name || ''}`.trim();
      }
      
      employeeName = employeeName.toLowerCase();
      const claimId = formatClaimId(claim.id || '').toLowerCase();
      const benefitType = (claim.benefit_type || '').toLowerCase();
      const claimType = (claim.claim_type || '').toLowerCase();
      
      if (
        !employeeName.includes(searchLower) &&
        !claimId.includes(searchLower) &&
        !benefitType.includes(searchLower) &&
        !claimType.includes(searchLower)
      ) {
        return false;
      }
    }
    
    return true;
  });

  const getStatusBadge = (status) => {
    const statusLabels = {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved_by_hr': 'Approved by HR',
      'for_submission_to_agency': 'For Submission to Agency',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'pending': 'Pending', // Legacy support
      'approved': 'Approved', // Legacy support
      'active': 'Active',
      'terminated': 'Terminated'
    };
    
    const variants = {
      'submitted': 'info',
      'under_review': 'warning',
      'approved_by_hr': 'success',
      'for_submission_to_agency': 'primary',
      'completed': 'success',
      'rejected': 'danger',
      'pending': 'warning', // Legacy
      'approved': 'success', // Legacy
      'active': 'success',
      'terminated': 'secondary'
    };
    
    const label = statusLabels[status] || status?.toUpperCase() || 'N/A';
    return <Badge bg={variants[status] || 'secondary'}>{label}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">
            <FaDollarSign className="me-2" />
            Benefits Management
          </h2>
          <p className="text-muted">Manage employee benefits, contributions, and claims</p>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Employee Benefits Overview Tab */}
        <Tab eventKey="overview" title="Employee Benefits Overview">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Employee Benefits</h5>
              <InputGroup style={{ width: '300px' }}>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Card.Header>
            <Card.Body>
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
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>SSS Number</th>
                      <th>PhilHealth</th>
                      <th>Pag-IBIG</th>
                      <th>Enrollment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const profile = employee.employee_profile || employee;
                        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                        return (
                          <tr key={employee.id}>
                            <td>{profile.employee_id || 'N/A'}</td>
                            <td>{fullName || 'N/A'}</td>
                            <td>{profile.sss || 'N/A'}</td>
                            <td>{profile.philhealth || 'N/A'}</td>
                            <td>{profile.pagibig || 'N/A'}</td>
                            <td>
                              {profile.benefits_enrollment_date 
                                ? format(new Date(profile.benefits_enrollment_date), 'MMM dd, yyyy')
                                : profile.hire_date
                                ? format(new Date(profile.hire_date), 'MMM dd, yyyy')
                                : profile.created_at
                                ? format(new Date(profile.created_at), 'MMM dd, yyyy')
                                : 'N/A'}
                            </td>
                            <td>{getStatusBadge(profile.benefits_status || profile.status || 'active')}</td>
                            <td>
                              <Button
                                variant="info"
                                size="sm"
                                className="me-2"
                                onClick={() => handleViewEmployeeDetails(employee)}
                              >
                                <FaEye /> View
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setShowTerminateModal(true);
                                }}
                              >
                                <FaBan /> Terminate
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

        {/* Benefit Claims Tab */}
        <Tab eventKey="claims" title="Benefit Claims">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <h5 className="mb-0">Benefit Claims</h5>
                <InputGroup style={{ width: '300px' }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by employee, claim ID, benefit type..."
                    value={claimSearchTerm}
                    onChange={(e) => setClaimSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Form.Select
                  style={{ width: '200px' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved_by_hr">Approved by HR</option>
                  <option value="for_submission_to_agency">For Submission to Agency</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </div>
            </Card.Header>
            <Card.Body>
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
                      <th>Claim ID</th>
                      <th>Employee</th>
                      <th>Benefit Type</th>
                      <th>Claim Type</th>
                      <th>Date Filed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          No benefit claims found
                        </td>
                      </tr>
                    ) : (
                      filteredClaims.map((claim) => {
                        // Get employee name from various possible locations
                        let employeeName = 'N/A';
                        if (claim.user?.name) {
                          employeeName = claim.user.name;
                        } else if (claim.user?.first_name || claim.user?.last_name) {
                          employeeName = `${claim.user?.first_name || ''} ${claim.user?.last_name || ''}`.trim();
                        } else if (claim.user?.employeeProfile?.first_name || claim.user?.employeeProfile?.last_name) {
                          employeeName = `${claim.user?.employeeProfile?.first_name || ''} ${claim.user?.employeeProfile?.last_name || ''}`.trim();
                        } else if (claim.employeeProfile?.first_name || claim.employeeProfile?.last_name) {
                          employeeName = `${claim.employeeProfile?.first_name || ''} ${claim.employeeProfile?.last_name || ''}`.trim();
                        } else if (claim.employee?.name) {
                          employeeName = claim.employee.name;
                        } else if (claim.employee?.first_name || claim.employee?.last_name) {
                          employeeName = `${claim.employee?.first_name || ''} ${claim.employee?.last_name || ''}`.trim();
                        }
                        
                        return (
                        <tr key={claim.id}>
                          <td>{formatClaimId(claim.id)}</td>
                          <td>{employeeName || 'N/A'}</td>
                          <td>{claim.benefit_type || 'N/A'}</td>
                          <td>{claim.claim_type || 'N/A'}</td>
                          <td>
                            {claim.created_at 
                              ? format(new Date(claim.created_at), 'MMM dd, yyyy')
                              : 'N/A'}
                          </td>
                          <td>{getStatusBadge(claim.status)}</td>
                          <td>
                            {claim.status === 'pending' && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => handleApproveClaim(claim.id)}
                                >
                                  <FaCheckCircle /> Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => openRejectModal(claim)}
                                >
                                  <FaTimesCircle /> Reject
                                </Button>
                              </>
                            )}
                            <Button
                              variant="info"
                              size="sm"
                              className="ms-2"
                              onClick={async () => {
                                setSelectedClaim(claim);
                                // Fetch full claim details
                                try {
                                  const response = await axios.get(`/benefit-claims/${claim.id}`);
                                  setClaimDetails(response.data.data || response.data);
                                  setShowClaimDetailsModal(true);
                                } catch (error) {
                                  console.error('Error fetching claim details:', error);
                                  // If fetch fails, use the claim data from the list
                                  setClaimDetails(claim);
                                  setShowClaimDetailsModal(true);
                                }
                              }}
                            >
                              <FaEye /> View
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

        {/* Reports Tab */}
        <Tab eventKey="reports" title="Reports">
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Report Criteria</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={reportPeriod.start}
                        onChange={(e) => setReportPeriod({ ...reportPeriod, start: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={reportPeriod.end}
                        onChange={(e) => setReportPeriod({ ...reportPeriod, end: e.target.value })}
                        min={reportPeriod.start}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Department</Form.Label>
                      <Form.Select
                        value={reportFilters.department}
                        onChange={(e) => setReportFilters({ ...reportFilters, department: e.target.value })}
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
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
                        value={reportFilters.position}
                        onChange={(e) => setReportFilters({ ...reportFilters, position: e.target.value })}
                      >
                        <option value="">All Positions</option>
                        {positions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Benefit Type</Form.Label>
                      <Form.Select
                        value={reportFilters.benefit_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, benefit_type: e.target.value })}
                      >
                        <option value="">All Benefits</option>
                        <option value="sss">SSS</option>
                        <option value="philhealth">PhilHealth</option>
                        <option value="pagibig">Pag-IBIG</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="mt-3 d-flex justify-content-between">
                  <Button
                    variant="primary"
                    className="me-2"
                    onClick={handleGeneratePreview}
                    disabled={reportLoading}
                  >
                    {reportLoading ? (
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

          {contributionReportData && (
            <>
              {/* Summary Statistics Card */}
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
                    Contribution Summary
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3 mb-4">
                    <Col xs={12} md={4}>
                      <Card className="h-100 border-0 shadow-sm bg-opacity-10 bg-info" style={{ borderRadius: '14px' }}>
                        <Card.Body className="d-flex flex-column">
                          <span className="text-uppercase small fw-semibold text-muted mb-1">SSS Contributions</span>
                          <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>
                            {formatCurrency(contributionReportData.summary?.sss || 0)}
                          </div>
                          <span className="small text-muted mt-auto">Total SSS contributions for the period</span>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={12} md={4}>
                      <Card className="h-100 border-0 shadow-sm bg-opacity-10 bg-success" style={{ borderRadius: '14px' }}>
                        <Card.Body className="d-flex flex-column">
                          <span className="text-uppercase small fw-semibold text-muted mb-1">PhilHealth Contributions</span>
                          <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>
                            {formatCurrency(contributionReportData.summary?.philhealth || 0)}
                          </div>
                          <span className="small text-muted mt-auto">Total PhilHealth contributions for the period</span>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={12} md={4}>
                      <Card className="h-100 border-0 shadow-sm bg-opacity-10 bg-warning" style={{ borderRadius: '14px' }}>
                        <Card.Body className="d-flex flex-column">
                          <span className="text-uppercase small fw-semibold text-muted mb-1">Pag-IBIG Contributions</span>
                          <div className="display-6 fw-bold mb-2" style={{ color: '#1f2937' }}>
                            {formatCurrency(contributionReportData.summary?.pagibig || 0)}
                          </div>
                          <span className="small text-muted mt-auto">Total Pag-IBIG contributions for the period</span>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12}>
                      <Card className="border-0 shadow-sm">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="text-uppercase text-muted fw-semibold mb-0">Total Contributions</h6>
                            <div className="display-5 fw-bold text-primary">
                              {formatCurrency(
                                (contributionReportData.summary?.sss || 0) +
                                (contributionReportData.summary?.philhealth || 0) +
                                (contributionReportData.summary?.pagibig || 0)
                              )}
                            </div>
                          </div>
                          <div className="text-muted small">
                            Period: {format(new Date(contributionReportData.period?.start), 'MMM dd, yyyy')} - {format(new Date(contributionReportData.period?.end), 'MMM dd, yyyy')}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Detailed Report Table */}
              <Card className="mb-4 shadow-sm" style={{ border: 'none', borderRadius: '12px' }}>
                <Card.Header style={{
                  background: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6',
                  borderRadius: '12px 12px 0 0',
                  padding: '1.25rem'
                }}>
                  <h5 className="mb-0" style={{ color: '#2c3e50', fontWeight: '600' }}>
                    Contribution Details
                  </h5>
                </Card.Header>
                <Card.Body style={{ padding: '1.5rem' }}>
                  {contributionReportData.details && contributionReportData.details.length > 0 ? (
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
                              Employee ID
                            </th>
                            <th style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                              Employee Name
                            </th>
                            <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                              Period Start
                            </th>
                            <th className="text-center" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                              Period End
                            </th>
                            <th className="text-end" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                              SSS
                            </th>
                            <th className="text-end" style={{ padding: '1rem', fontWeight: '600', border: 'none' }}>
                              PhilHealth
                            </th>
                            <th className="text-end" style={{
                              padding: '1rem',
                              fontWeight: '600',
                              borderTopRightRadius: '8px',
                              border: 'none'
                            }}>
                              Pag-IBIG
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionReportData.details.map((detail, idx) => (
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
                                {detail.employee_id || 'N/A'}
                              </td>
                              <td style={{
                                padding: '1rem',
                                color: '#495057'
                              }}>
                                {detail.employee_name || 'N/A'}
                              </td>
                              <td className="text-center" style={{ padding: '1rem', color: '#6c757d' }}>
                                {detail.period_start ? format(new Date(detail.period_start), 'MMM dd, yyyy') : 'N/A'}
                              </td>
                              <td className="text-center" style={{ padding: '1rem', color: '#6c757d' }}>
                                {detail.period_end ? format(new Date(detail.period_end), 'MMM dd, yyyy') : 'N/A'}
                              </td>
                              <td className="text-end" style={{
                                padding: '1rem',
                                fontWeight: '600',
                                color: '#667eea'
                              }}>
                                {formatCurrency(detail.sss || 0)}
                              </td>
                              <td className="text-end" style={{
                                padding: '1rem',
                                fontWeight: '600',
                                color: '#28a745'
                              }}>
                                {formatCurrency(detail.philhealth || 0)}
                              </td>
                              <td className="text-end" style={{
                                padding: '1rem',
                                fontWeight: '600',
                                color: '#ffc107'
                              }}>
                                {formatCurrency(detail.pagibig || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <Alert variant="info" className="mb-0">
                      <FaInfoCircle className="me-2" />
                      No contribution data found for the selected period and filters.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>
      </Tabs>

      {/* View Employee Details Modal */}
      <Modal
        show={showEmployeeDetailsModal}
        onHide={() => {
          setShowEmployeeDetailsModal(false);
          setActiveContributionTab('sss');
          setContributionHistory({ sss: [], philhealth: [], pagibig: [] });
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUser className="me-2" />
            Employee Benefits Details - {selectedEmployee ? (() => {
              const profile = selectedEmployee.employee_profile || selectedEmployee;
              return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Employee';
            })() : 'Employee'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmployee && (() => {
            const profile = selectedEmployee.employee_profile || selectedEmployee;
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            return (
              <Row>
                <Col md={6}>
                  <h6>Employee Information</h6>
                  <p><strong>Employee ID:</strong> {profile.employee_id || 'N/A'}</p>
                  <p><strong>Name:</strong> {fullName || 'N/A'}</p>
                  <p><strong>Department:</strong> {profile.department || 'N/A'}</p>
                  <p><strong>Position:</strong> {profile.position || 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <h6>Benefits Information</h6>
                  <p><strong>SSS Number:</strong> {profile.sss || 'N/A'}</p>
                  <p><strong>PhilHealth Number:</strong> {profile.philhealth || 'N/A'}</p>
                  <p><strong>Pag-IBIG Number:</strong> {profile.pagibig || 'N/A'}</p>
                  <p><strong>Enrollment Date:</strong> {
                    profile.benefits_enrollment_date 
                      ? format(new Date(profile.benefits_enrollment_date), 'MMM dd, yyyy')
                      : profile.hire_date
                      ? format(new Date(profile.hire_date), 'MMM dd, yyyy')
                      : profile.created_at
                      ? format(new Date(profile.created_at), 'MMM dd, yyyy')
                      : 'N/A'
                  }</p>
                  <p><strong>Status:</strong> {getStatusBadge(profile.benefits_status || profile.status || 'active')}</p>
                </Col>
                <Col md={12} className="mt-3">
                  <h6>Contributions</h6>
                  <Tabs
                    activeKey={activeContributionTab}
                    onSelect={(k) => setActiveContributionTab(k)}
                    className="mb-3"
                  >
                    <Tab eventKey="sss" title="SSS">
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionHistory.sss && contributionHistory.sss.length > 0 ? (
                            contributionHistory.sss.map((entry, index) => (
                              <tr key={index}>
                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                <td>₱{parseFloat(entry.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="text-center text-muted py-3">
                                No contribution history available
                                {profile.sss_contribution && parseFloat(profile.sss_contribution) > 0 && (
                                  <div className="mt-2">
                                    <small>Current Monthly Contribution: ₱{parseFloat(profile.sss_contribution).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Tab>
                    <Tab eventKey="philhealth" title="PhilHealth">
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionHistory.philhealth && contributionHistory.philhealth.length > 0 ? (
                            contributionHistory.philhealth.map((entry, index) => (
                              <tr key={index}>
                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                <td>₱{parseFloat(entry.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="text-center text-muted py-3">
                                No contribution history available
                                {profile.philhealth_contribution && parseFloat(profile.philhealth_contribution) > 0 && (
                                  <div className="mt-2">
                                    <small>Current Monthly Contribution: ₱{parseFloat(profile.philhealth_contribution).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Tab>
                    <Tab eventKey="pagibig" title="Pag-IBIG">
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionHistory.pagibig && contributionHistory.pagibig.length > 0 ? (
                            contributionHistory.pagibig.map((entry, index) => (
                              <tr key={index}>
                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                <td>₱{parseFloat(entry.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="text-center text-muted py-3">
                                No contribution history available
                                {profile.pagibig_contribution && parseFloat(profile.pagibig_contribution) > 0 && (
                                  <div className="mt-2">
                                    <small>Current Monthly Contribution: ₱{parseFloat(profile.pagibig_contribution).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </Tab>
                  </Tabs>
                </Col>
              </Row>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmployeeDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* File Claim Modal */}
      <Modal
        show={showClaimModal}
        onHide={() => setShowClaimModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileAlt className="me-2" />
            File Benefit Claim Assistance Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Employee</Form.Label>
              <Form.Select
                value={claimForm.employee_id}
                onChange={(e) => setClaimForm({ ...claimForm, employee_id: e.target.value })}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => {
                  const profile = emp.employee_profile || emp;
                  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                  return (
                    <option key={emp.id} value={emp.id}>
                      {fullName || 'Employee'} ({profile.employee_id || 'N/A'})
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Benefit Type</Form.Label>
                  <Form.Select
                    value={claimForm.benefit_type}
                    onChange={(e) => setClaimForm({ ...claimForm, benefit_type: e.target.value })}
                    required
                  >
                    <option value="">Select Benefit Type</option>
                    <option value="sss">SSS</option>
                    <option value="philhealth">PhilHealth</option>
                    <option value="pagibig">Pag-IBIG</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Claim Type</Form.Label>
                  <Form.Select
                    value={claimForm.claim_type}
                    onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
                    required
                  >
                    <option value="">Select Claim Type</option>
                    <option value="sickness">Sickness</option>
                    <option value="maternity">Maternity</option>
                    <option value="disability">Disability</option>
                    <option value="retirement">Retirement</option>
                    <option value="death">Death</option>
                    <option value="loan">Loan</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="0.00"
                value={claimForm.amount}
                onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter claim description..."
                value={claimForm.description}
                onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Supporting Documents</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setClaimForm({ ...claimForm, supporting_documents: e.target.files[0] })}
              />
              <Form.Text className="text-muted">
                Upload supporting documents (PDF, DOC, DOCX, JPG, PNG)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClaimModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleFileClaim} disabled={loading}>
            {loading ? 'Filing...' : 'File Claim'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Terminate Enrollment Modal */}
      <Modal
        show={showTerminateModal}
        onHide={() => setShowTerminateModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBan className="me-2" />
            Terminate Employee Benefit Enrollment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Are you sure you want to terminate the benefit enrollment for <strong>
              {selectedEmployee ? (() => {
                const profile = selectedEmployee.employee_profile || selectedEmployee;
                return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'this employee';
              })() : 'this employee'}
            </strong>?
            This action cannot be undone.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTerminateModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleTerminateEnrollment} disabled={loading}>
            {loading ? 'Terminating...' : 'Terminate Enrollment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Claim Details Modal */}
      <Modal
        show={showClaimDetailsModal}
        onHide={() => {
          setShowClaimDetailsModal(false);
          setSelectedClaim(null);
          setClaimDetails(null);
          setCompletionEvidence(null);
          setShowCompletionUpload(false);
          // Clean up document viewer URL
          if (documentViewerUrl) {
            window.URL.revokeObjectURL(documentViewerUrl);
            setDocumentViewerUrl(null);
            setDocumentViewerType(null);
          }
          setAllDocuments([]);
          setCurrentDocumentIndex(0);
        }}
        size="lg"
      >
        <Modal.Header closeButton className="border-bottom bg-light">
          <Modal.Title className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <FaFileAlt className="text-primary" />
            </div>
            <div>
              <h5 className="mb-0">Benefit Claim Details</h5>
              <small className="text-muted">Claim ID: {formatClaimId(claimDetails?.id || selectedClaim?.id)}</small>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {claimDetails || selectedClaim ? (() => {
            const claim = claimDetails || selectedClaim;
            const employee = claim.employee || claim.employeeProfile || claim.user;
            const employeeName = employee 
              ? (employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'N/A')
              : 'N/A';
            
            // Get employee ID from various possible locations
            const employeeId = claim.employeeProfile?.employee_id || 
                              claim.user?.employeeProfile?.employee_id ||
                              employee?.employee_id || 
                              employee?.employee_profile?.employee_id ||
                              claim.employee?.employee_id ||
                              (claim.user_id ? `User ID: ${claim.user_id}` : 'N/A');
            
            // Get submitted by name - check user relationship first, then employeeProfile
            let submittedBy = 'N/A';
            if (claim.user) {
              submittedBy = claim.user.name || 
                           `${claim.user.first_name || ''} ${claim.user.last_name || ''}`.trim() || 
                           claim.user.email || 
                           'N/A';
            } else if (claim.employeeProfile) {
              submittedBy = `${claim.employeeProfile.first_name || ''} ${claim.employeeProfile.last_name || ''}`.trim() || 
                           claim.employeeProfile.employee_id || 
                           'N/A';
            } else if (employeeName && employeeName !== 'N/A') {
              submittedBy = employeeName;
            }
            
            // Get reviewed by name (approved/rejected by)
            // Check if claim has been reviewed (has reviewed_at or reviewed_by)
            let reviewedByName = null;
            
            // First, try to get name from reviewedBy relationship
            if (claim.reviewedBy && typeof claim.reviewedBy === 'object' && claim.reviewedBy !== null) {
              // Try multiple ways to get the name
              const firstName = claim.reviewedBy.first_name || '';
              const lastName = claim.reviewedBy.last_name || '';
              const fullName = `${firstName} ${lastName}`.trim();
              
              // Use full name if available, otherwise try name attribute, then email
              if (fullName) {
                reviewedByName = fullName;
              } else if (claim.reviewedBy.name) {
                reviewedByName = claim.reviewedBy.name;
              } else if (claim.reviewedBy.email) {
                reviewedByName = claim.reviewedBy.email;
              }
            }
            
            // If we still don't have a name, check reviewed_by field
            // Handle case where reviewed_by might be an object (shouldn't happen, but handle it)
            if (!reviewedByName && claim.reviewed_by) {
              if (typeof claim.reviewed_by === 'number') {
                reviewedByName = `User ID: ${claim.reviewed_by}`;
              } else if (typeof claim.reviewed_by === 'object' && claim.reviewed_by !== null) {
                // If reviewed_by is an object, try to extract name from it
                const firstName = claim.reviewed_by.first_name || '';
                const lastName = claim.reviewed_by.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim();
                reviewedByName = fullName || claim.reviewed_by.name || claim.reviewed_by.email || (claim.reviewed_by.id ? `User ID: ${claim.reviewed_by.id}` : 'N/A');
              } else if (typeof claim.reviewed_by === 'string') {
                reviewedByName = `User ID: ${claim.reviewed_by}`;
              }
            }
            
            // Debug: Log to see what we're working with (remove after fixing)
            if ((claim.status === 'approved' || claim.status === 'rejected') && !reviewedByName) {
              console.log('DEBUG - Claim data:', {
                status: claim.status,
                reviewed_by: claim.reviewed_by,
                reviewedBy: claim.reviewedBy,
                reviewedByName: reviewedByName
              });
            }
            
            return (
              <div>
                {/* Status Banner */}
                <div className={`mb-4 p-3 rounded ${
                  claim.status === 'completed' || claim.status === 'approved_by_hr' ? 'bg-success bg-opacity-10 border border-success' : 
                  claim.status === 'rejected' ? 'bg-danger bg-opacity-10 border border-danger' : 
                  claim.status === 'for_submission_to_agency' ? 'bg-primary bg-opacity-10 border border-primary' :
                  claim.status === 'under_review' ? 'bg-warning bg-opacity-10 border border-warning' :
                  'bg-info bg-opacity-10 border border-info'
                }`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="mb-1 d-flex align-items-center">
                        {getStatusBadge(claim.status)}
                        <span className="ms-2 fw-normal">{formatClaimId(claim.id)}</span>
                      </h5>
                      <p className="mb-0 text-muted small">
                        {claim.benefit_type?.toUpperCase() || 'N/A'} - {claim.claim_type || 'N/A'}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="mb-0 small text-muted">Date Filed</p>
                      <p className="mb-0 fw-semibold">
                        {claim.created_at 
                          ? format(new Date(claim.created_at), 'MMM dd, yyyy hh:mm a')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <Row className="g-3">
                  {/* Employee Information Card */}
                  <Col md={6}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Header className="bg-primary bg-opacity-10 border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaUser className="me-2 text-primary" />
                          Employee Information
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Employee Name</p>
                          <p className="mb-0 fw-semibold">{employeeName}</p>
                        </div>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Employee ID</p>
                          <p className="mb-0 fw-semibold">{employeeId}</p>
                        </div>
                        {(employee?.employee_profile || claim.employeeProfile) && (() => {
                          const profile = employee?.employee_profile || claim.employeeProfile;
                          return (
                            <>
                              <hr className="my-3" />
                              <div className="mb-3">
                                <p className="text-muted small mb-1">Department</p>
                                <p className="mb-0 fw-semibold">{profile.department || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted small mb-1">Position</p>
                                <p className="mb-0 fw-semibold">{profile.position || 'N/A'}</p>
                              </div>
                            </>
                          );
                        })()}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Claim Information Card */}
                  <Col md={6}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Header className="bg-info bg-opacity-10 border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaFileAlt className="me-2 text-info" />
                          Claim Information
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Benefit Type</p>
                          <div className="mb-3">
                            <Badge bg="info" className="px-3 py-2">{claim.benefit_type?.toUpperCase() || 'N/A'}</Badge>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Claim Type</p>
                          <p className="mb-0 fw-semibold">{claim.claim_type || 'N/A'}</p>
                        </div>
                        <hr className="my-3" />
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Submitted by</p>
                          <p className="mb-0 fw-semibold">{submittedBy}</p>
                        </div>
                        {claim.reviewed_at && (
                          <div className="mb-3">
                            <p className="text-muted small mb-1">Reviewed At</p>
                            <p className="mb-0 fw-semibold">
                              {format(new Date(claim.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                            </p>
                          </div>
                        )}
                        {(claim.status === 'approved_by_hr' || claim.status === 'rejected' || claim.status === 'completed' || claim.status === 'for_submission_to_agency') && (
                          <div>
                            <p className="text-muted small mb-1">
                              {claim.status === 'approved_by_hr' ? 'Approved by' : 
                               claim.status === 'rejected' ? 'Rejected by' :
                               claim.status === 'completed' ? 'Completed by' :
                               'Updated by'}
                            </p>
                            <p className="mb-0 fw-semibold text-success">
                              {reviewedByName || 'N/A'}
                            </p>
                          </div>
                        )}
                        
                        {/* Status Update Section for HR Assistant */}
                        <hr className="my-3" />
                        <div className="mb-3">
                          <Form.Label className="fw-bold">
                            Update Status <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Select
                            value={showCompletionUpload ? 'completed' : claim.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'completed' && claim.status !== 'completed') {
                                // Show file upload field for completion evidence
                                setShowCompletionUpload(true);
                              } else if (newStatus === 'rejected') {
                                // Open reject modal if rejecting
                                setShowClaimDetailsModal(false);
                                openRejectModal(claim);
                              } else if (newStatus !== 'completed' && newStatus !== claim.status) {
                                // For other statuses, update immediately
                                handleStatusUpdate(claim.id, newStatus);
                              }
                            }}
                            disabled={loading || claim.status === 'completed'}
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved_by_hr">Approved by HR</option>
                            <option value="for_submission_to_agency">For Submission to Agency</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Select a status to update this claim. Employee will be notified of the status change.
                            {claim.status !== 'completed' && ' For "Completed" status, you must upload completion evidence.'}
                          </Form.Text>
                        </div>

                        {/* Completion Evidence Upload Field */}
                        {showCompletionUpload && claim.status !== 'completed' && (
                          <div className="mb-3 p-3 border rounded bg-light">
                            <Form.Label className="fw-bold">
                              Completion Evidence <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  // Validate file size (5MB max)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error('File size must be less than 5MB');
                                    e.target.value = '';
                                    return;
                                  }
                                  setCompletionEvidence(file);
                                }
                              }}
                            />
                            <Form.Text className="text-muted">
                              Upload evidence of completion (PDF, DOC, DOCX, JPG, JPEG, PNG - Max 5MB)
                            </Form.Text>
                            {completionEvidence && (
                              <div className="mt-2">
                                <Badge bg="info">
                                  <FaFileAlt className="me-1" />
                                  {completionEvidence.name}
                                </Badge>
                              </div>
                            )}
                            <div className="mt-3">
                              <Button
                                variant="success"
                                onClick={async () => {
                                  if (!completionEvidence) {
                                    toast.error('Please upload completion evidence file');
                                    return;
                                  }
                                  
                                  try {
                                    setLoading(true);
                                    const formData = new FormData();
                                    formData.append('status', 'completed');
                                    formData.append('completion_evidence', completionEvidence);
                                    formData.append('_method', 'PUT');
                                    
                                    // Use POST with _method=PUT for FormData compatibility (Laravel method spoofing)
                                    const response = await axios.post(`/benefit-claims/${claim.id}/status`, formData);
                                    
                                    if (response.data.success) {
                                      toast.success('Status updated to completed successfully');
                                      // Reset form
                                      setCompletionEvidence(null);
                                      setShowCompletionUpload(false);
                                      // Refresh claim details
                                      const claimResponse = await axios.get(`/benefit-claims/${claim.id}`);
                                      setClaimDetails(claimResponse.data.data || claimResponse.data);
                                      await fetchBenefitClaims();
                                    }
                                  } catch (error) {
                                    console.error('Error updating status:', error);
                                    toast.error(error.response?.data?.message || 'Failed to update status');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                disabled={loading || !completionEvidence}
                                className="me-2"
                              >
                                <FaCheckCircle className="me-1" />
                                Update to Completed
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setShowCompletionUpload(false);
                                  setCompletionEvidence(null);
                                }}
                                disabled={loading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Description Card */}
                  <Col md={12}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaInfoCircle className="me-2 text-primary" />
                          Description / Reason for Claim
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {claim.description || 'No description provided'}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  {claim.rejection_reason && (
                    <Col md={12}>
                      <Alert variant="danger" className="mb-0">
                        <Alert.Heading className="h6 mb-2 d-flex align-items-center">
                          <FaTimesCircle className="me-2" />
                          Rejection Reason
                        </Alert.Heading>
                        <p className="mb-0">{claim.rejection_reason}</p>
                      </Alert>
                    </Col>
                  )}
                  {(claim.supporting_documents_path || claim.supporting_documents_name) && (
                    <Col md={12}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaFileAlt className="me-2 text-primary" />
                          Documents
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <Alert variant="info" className="mb-3">
                          <small>
                            <strong>Document Types:</strong> Application Form (Employee) • Supporting Documents (Employee) • Evidence of Completion (HR Assistant)
                          </small>
                        </Alert>
                        <div className="d-flex gap-2 mb-3">
                        <Button
                          variant="primary"
                          size="sm"
                          className="px-4"
                          onClick={async () => {
                          try {
                            setLoading(true);
                            // Fetch all documents
                            const documentsResponse = await axios.get(`/benefit-claims/${claim.id}/documents`);
                            
                            console.log('Documents response:', documentsResponse.data);
                            
                            if (documentsResponse.data.success && documentsResponse.data.data.length > 0) {
                              console.log('Total documents found:', documentsResponse.data.data.length);
                              console.log('Document types:', documentsResponse.data.data.map(d => d.label));
                              setAllDocuments(documentsResponse.data.data);
                              setCurrentDocumentIndex(0);
                              
                              // Load the first document for preview
                              const firstDoc = documentsResponse.data.data[0];
                              if (firstDoc.preview_url) {
                                // Fetch document as blob using axios (includes auth headers)
                                try {
                                  const docResponse = await axios.get(firstDoc.preview_url, {
                                    responseType: 'blob'
                                  });
                                  
                                  // Determine file type
                                  const contentType = docResponse.headers['content-type'] || '';
                                  const fileName = firstDoc.name;
                                  const isPdf = contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
                                  const isImage = contentType.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(fileName);
                                  
                                  // Create blob URL for preview (iframe/img can use this)
                                  const blobUrl = window.URL.createObjectURL(new Blob([docResponse.data], { type: contentType }));
                                  setDocumentViewerUrl(blobUrl);
                                  setDocumentViewerType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
                                  
                                  toast.success(`${documentsResponse.data.data.length} document(s) loaded successfully`);
                                } catch (docError) {
                                  console.error('Error loading document for preview:', docError);
                                  toast.error('Failed to load document for preview');
                                }
                              } else {
                                toast.error('Document preview URL not available');
                              }
                            } else {
                              toast.error('No documents available');
                            }
                          } catch (error) {
                            console.error('Error loading documents:', error);
                            toast.error('Failed to load documents');
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <FaEye className="me-2" />
                        View Documents
                      </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="px-4"
                          onClick={async () => {
                          try {
                            const response = await axios.get(`/benefit-claims/${claim.id}/document`, {
                              responseType: 'blob'
                            });
                            
                            // Create download link
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', claim.supporting_documents_name || `benefit-claim-${claim.id}-documents.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                            
                            toast.success('Document downloaded successfully');
                          } catch (error) {
                            console.error('Error downloading document:', error);
                            toast.error('Failed to download document');
                          }
                        }}
                      >
                        <FaDownload className="me-2" />
                        Download Documents
                        </Button>
                        </div>
                        
                        {/* Document Viewer */}
                        {documentViewerUrl && allDocuments.length > 0 && (
                      <Card className="mt-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-3">
                            <span>
                              <FaFileAlt className="me-2" />
                              Document Preview
                            </span>
                            {allDocuments.length > 1 && (
                              <div className="d-flex align-items-center gap-2">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={async () => {
                                    if (currentDocumentIndex > 0) {
                                      const newIndex = currentDocumentIndex - 1;
                                      await loadDocument(newIndex);
                                    }
                                  }}
                                  disabled={currentDocumentIndex === 0 || loading}
                                >
                                  Previous
                                </Button>
                                <span className="text-muted">
                                  {currentDocumentIndex + 1} of {allDocuments.length}
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={async () => {
                                    if (currentDocumentIndex < allDocuments.length - 1) {
                                      const newIndex = currentDocumentIndex + 1;
                                      await loadDocument(newIndex);
                                    }
                                  }}
                                  disabled={currentDocumentIndex === allDocuments.length - 1 || loading}
                                >
                                  Next
                                </Button>
                              </div>
                            )}
                            <Badge bg={allDocuments[currentDocumentIndex]?.source === 'hr_assistant' ? 'success' : 'info'}>
                              {allDocuments[currentDocumentIndex]?.label || allDocuments[currentDocumentIndex]?.name || 'Document'}
                            </Badge>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              window.URL.revokeObjectURL(documentViewerUrl);
                              setDocumentViewerUrl(null);
                              setDocumentViewerType(null);
                              setAllDocuments([]);
                              setCurrentDocumentIndex(0);
                            }}
                          >
                            Close
                          </Button>
                        </Card.Header>
                        <Card.Body style={{ padding: 0, maxHeight: '500px', overflow: 'auto' }}>
                          {documentViewerType === 'pdf' && (
                            <iframe
                              src={`${documentViewerUrl}#toolbar=1`}
                              title="PDF Document"
                              style={{
                                width: '100%',
                                height: '500px',
                                border: 'none',
                                borderRadius: '0 0 0.375rem 0.375rem'
                              }}
                              onError={() => {
                                console.error('Failed to load PDF in iframe');
                                toast.error('Failed to load PDF document');
                              }}
                            />
                          )}
                          {documentViewerType === 'image' && (
                            <div className="text-center p-3">
                              <img
                                src={documentViewerUrl}
                                alt="Document"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '500px',
                                  height: 'auto',
                                  borderRadius: '8px',
                                  display: 'block',
                                  margin: '0 auto',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  console.error('Failed to load image');
                                  toast.error('Failed to load image document');
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {documentViewerType === 'other' && (
                            <div className="text-center p-5">
                              <FaFileAlt size={48} className="text-muted mb-3" />
                              <p className="text-muted">Preview not available for this file type</p>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = documentViewerUrl;
                                  link.download = claim.supporting_documents_name || `benefit-claim-${claim.id}-documents`;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <FaDownload className="me-2" />
                                Download to View
                              </Button>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    )}
                    </Card.Body>
                  </Card>
                </Col>
                )}
              </Row>
              </div>
            );
          })() : (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowClaimDetailsModal(false);
            setSelectedClaim(null);
            setClaimDetails(null);
          }}>
            Close
          </Button>
          {(claimDetails?.status === 'submitted' || claimDetails?.status === 'under_review') && (
            <>
              <Button
                variant="success"
                onClick={async () => {
                  await handleApproveClaim(claimDetails.id);
                  setShowClaimDetailsModal(false);
                }}
                disabled={loading}
              >
                <FaCheckCircle className="me-2" />
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setShowClaimDetailsModal(false);
                  openRejectModal(claimDetails);
                }}
                disabled={loading}
              >
                <FaTimesCircle className="me-2" />
                Reject
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Reject Claim Modal */}
      <Modal
        show={showRejectModal}
        onHide={() => {
          setShowRejectModal(false);
          setSelectedClaimForRejection(null);
          setRejectionReason('');
        }}
        size="lg"
      >
        <Modal.Header closeButton className="border-bottom bg-danger bg-opacity-10">
          <Modal.Title className="d-flex align-items-center">
            <FaTimesCircle className="me-2 text-danger" />
            Reject Benefit Claim
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClaimForRejection && (
            <>
              <Alert variant="warning">
                <strong>Warning:</strong> This action cannot be undone. Please provide a clear reason for rejecting this claim.
              </Alert>
              
              <div className="mb-3">
                <h6>Claim Information:</h6>
                <p className="mb-1"><strong>Claim ID:</strong> {formatClaimId(selectedClaimForRejection.id)}</p>
                <p className="mb-1"><strong>Benefit Type:</strong> {selectedClaimForRejection.benefit_type?.toUpperCase() || 'N/A'}</p>
                <p className="mb-0"><strong>Claim Type:</strong> {selectedClaimForRejection.claim_type || 'N/A'}</p>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  Rejection Reason <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Please provide a detailed reason for rejecting this claim (minimum 10 characters)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  isInvalid={rejectionReason.length > 0 && rejectionReason.trim().length < 10}
                />
                <Form.Control.Feedback type="invalid">
                  Rejection reason must be at least 10 characters long
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Minimum 10 characters required. This reason will be visible to the employee.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowRejectModal(false);
              setSelectedClaimForRejection(null);
              setRejectionReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectSubmit}
            disabled={loading || !rejectionReason || rejectionReason.trim().length < 10}
          >
            {loading ? 'Rejecting...' : 'Reject Claim'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default BenefitsManagement;

