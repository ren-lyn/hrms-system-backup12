import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, Check, X, FileText } from 'lucide-react';
import { fetchLeaveRequests, getLeaveStats, approveLeaveRequest, rejectLeaveRequest, confirmManagerRejection, updateLeaveTermsAndCategory, getLeaveRequest } from '../../api/leave';
import jsPDF from 'jspdf';
import axios from '../../axios';
import './LeaveManagement.css';

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [stats, setStats] = useState({
    approval_stats: { requested: 0, approved: 0, rejected: 0, pending: 0 },
    type_stats: {}
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [editTerms, setEditTerms] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const [loadingLeaveDetails, setLoadingLeaveDetails] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
    fetchCurrentUser();
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadData, 300000);
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/auth/user');
      setCurrentUser(response.data);
      console.log('Current user:', response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, statsResponse] = await Promise.all([
        fetchLeaveRequests(),
        getLeaveStats()
      ]);
      
      console.log('Loaded leave requests:', requestsResponse.data);
      console.log('Loaded stats:', statsResponse.data);
      
      // Filter to show only manager-approved and manager-rejected requests for HR
      const hrRequests = requestsResponse.data.filter(request => 
        request.status === 'manager_approved' || request.status === 'manager_rejected' || request.status === 'approved' || request.status === 'rejected'
      );
      
      setLeaveRequests(hrRequests || []);
      setStats(statsResponse.data || {
        approval_stats: { requested: 0, approved: 0, rejected: 0, pending: 0 },
        type_stats: {}
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Error loading leave requests. Please refresh the page.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleAction = async (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setShowModal(true);
  };

  const confirmAction = async () => {
    try {
      let response;
      if (actionType === 'approve') {
        response = await approveLeaveRequest(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been approved successfully!`, 'success');
      } else if (actionType === 'reject') {
        response = await rejectLeaveRequest(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been rejected.`, 'info');
      } else if (actionType === 'confirm_rejection') {
        response = await confirmManagerRejection(selectedLeave.id, remarks);
        showAlert(`Manager rejection confirmed for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)}. Employee has been notified.`, 'info');
      }
      
      console.log('Action response:', response);
      
      setShowModal(false);
      setSelectedLeave(null);
      setRemarks('');
      setActionType('');
      
      // Immediately reload data to show changes
      await loadData();
    } catch (error) {
      console.error('Error processing action:', error);
      const errorMessage = error.response?.data?.message || 'Error processing request. Please try again.';
      showAlert(errorMessage, 'danger');
    }
  };

  const handleEditTerms = (leave) => {
    setEditingLeave(leave);
    setEditTerms(leave.terms || '');
    setEditCategory(leave.leave_category || '');
    setShowTermsModal(true);
  };

  const saveTermsAndCategory = async () => {
    try {
      await updateLeaveTermsAndCategory(editingLeave.id, editTerms, editCategory);
      showAlert('Leave terms and category updated successfully!', 'success');
      setShowTermsModal(false);
      setEditingLeave(null);
      setEditTerms('');
      setEditCategory('');
      await loadData();
    } catch (error) {
      console.error('Error updating terms:', error);
      showAlert('Error updating leave terms. Please try again.', 'danger');
    }
  };


  // isImageFile is now imported from utils

  const handleViewLeave = async (request) => {
    try {
      setLoadingLeaveDetails(true);
      const response = await getLeaveRequest(request.id);
      console.log('Full leave request data:', response.data);
      console.log('Total days:', response.data.total_days);
      console.log('Total hours:', response.data.total_hours);
      setSelectedLeaveForView(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching leave details:', error);
      showAlert('Error loading leave details. Please try again.', 'danger');
    } finally {
      setLoadingLeaveDetails(false);
    }
  };

  // getSignatureUrl is now imported from utils

  const getEmployeeName = (employee, employeeName) => {
    try {
      // If employeeName is provided and is a string, use it
      if (employeeName && typeof employeeName === 'string') {
        return employeeName;
      }
      
      // If employee is an object, try to construct name
      if (employee && typeof employee === 'object' && employee !== null) {
        // Try the name property first
        if (employee.name && typeof employee.name === 'string') {
          return employee.name;
        }
        // Try first_name and last_name
        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          return fullName;
        }
      }
      
      return 'Unknown Employee';
    } catch (error) {
      console.error('Error in getEmployeeName:', error, { employee, employeeName });
      return 'Unknown Employee';
    }
  };
  
  const safeRender = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      console.error('Attempting to render object as React child:', value);
      return '[Object]';
    }
    return String(value);
  };
  
  const calculateTotalHours = (totalDays, totalHours) => {
    // If hours are already provided, use them
    if (totalHours && totalHours > 0) {
      return totalHours;
    }
    
    // Otherwise, calculate hours from days (assuming 8 hours per day)
    const days = totalDays || 0;
    return days * 8;
  };

  const handleExportLeave = async () => {
    if (!selectedLeaveForView) return;
    
    try {
      // Show loading state
      const originalButtonText = 'Export PDF';
      const exportButton = document.querySelector('[title="Download as PDF"]');
      if (exportButton) {
        exportButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating PDF...';
        exportButton.disabled = true;
      }
    
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      // Helper function to draw underlined fields like in the form
      const drawField = (label, value, x, y, width = 50) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(label, x, y);
        
        // Calculate label width to position value correctly
        const labelWidth = pdf.getTextWidth(label);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '', x + labelWidth + 2, y);
        
        // Draw underline
        pdf.setLineWidth(0.3);
        pdf.line(x + labelWidth + 2, y + 1, x + width, y + 1);
      };
      
      // Title - centered
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Leave Application Form', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Draw a horizontal line under the title
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      
      // Two-column layout for Employee Information and Application Details
      const leftColX = margin;
      const rightColX = pageWidth / 2 + 10;
      
      // Section headers on the same line
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Employee Information', leftColX, yPosition);
      pdf.text('Application Details', rightColX, yPosition);
      
      // Move down for content
      yPosition += 10;
      
      // Left column content
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name:', leftColX, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name), leftColX + 18, yPosition);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Department:', leftColX, yPosition + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedLeaveForView.department || 'IT Department', leftColX + 22, yPosition + 6);
      
      // Right column content (aligned)
      pdf.setFont('helvetica', 'bold');
      pdf.text('Date Filed:', rightColX, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(selectedLeaveForView.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }), rightColX + 22, yPosition);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', rightColX, yPosition + 6);
      pdf.setFont('helvetica', 'normal');
      const statusText = selectedLeaveForView.status.charAt(0).toUpperCase() + selectedLeaveForView.status.slice(1);
      pdf.text(statusText, rightColX + 18, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Application ID:', rightColX, yPosition + 12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${selectedLeaveForView.id}`, rightColX + 26, yPosition + 12);
      
      yPosition += 25;
      
      // Leave Details Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Leave Details', margin, yPosition);
      yPosition += 10;
      
      // Leave Type
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Leave Type:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedLeaveForView.type || 'Vacation Leave', margin + 22, yPosition);
      
      // Pay Terms (if available)
      if (selectedLeaveForView.terms) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Pay Terms:', margin + 80, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(selectedLeaveForView.terms, margin + 100, yPosition);
      }
      
      yPosition += 12;
      
      // Duration section
      pdf.setFont('helvetica', 'bold');
      pdf.text('Duration:', margin, yPosition);
      yPosition += 8;
      
      // From date
      pdf.setFont('helvetica', 'bold');
      pdf.text('From:', margin + 5, yPosition);
      pdf.setFont('helvetica', 'normal');
      const fromDateFormatted = selectedLeaveForView.from ? new Date(selectedLeaveForView.from).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }) : 'Not set';
      pdf.text(fromDateFormatted, margin + 20, yPosition);
      
      // To date
      pdf.setFont('helvetica', 'bold');
      pdf.text('To:', margin + 5, yPosition + 6);
      pdf.setFont('helvetica', 'normal');
      const toDateFormatted = selectedLeaveForView.to ? new Date(selectedLeaveForView.to).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }) : 'Not set';
      pdf.text(toDateFormatted, margin + 20, yPosition + 6);
      
      yPosition += 18;
      
      // Total Days and Hours
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Days:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${selectedLeaveForView.total_days || 0}`, margin + 22, yPosition);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Hours:', margin + 60, yPosition);
      pdf.setFont('helvetica', 'normal');
      // Calculate hours with fallback if total_days is 0
      let calculatedHours;
      if (!selectedLeaveForView.total_days && selectedLeaveForView.from && selectedLeaveForView.to) {
        const fromDate = new Date(selectedLeaveForView.from);
        const toDate = new Date(selectedLeaveForView.to);
        const timeDiff = toDate.getTime() - fromDate.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        calculatedHours = days * 8;
      } else {
        calculatedHours = selectedLeaveForView.total_days * 8 || 0;
      }
      pdf.text(`${calculatedHours}`, margin + 82, yPosition);
      
      yPosition += 15;
      
      // Reason for Leave Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reason for Leave', margin, yPosition);
      yPosition += 10;
      
      // Reason text (no box)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const reason = selectedLeaveForView.reason || '';
      const reasonLines = pdf.splitTextToSize(reason, pageWidth - 2 * margin);
      pdf.text(reasonLines, margin, yPosition);
      
      yPosition += (reasonLines.length * 5) + 15;
      
      // Approval Information Section (only for PDF export)
      if (selectedLeaveForView.status === 'approved' || selectedLeaveForView.status === 'rejected') {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Approval Information', margin, yPosition);
        yPosition += 10;
        
        // Requested by
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Requested by:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name), margin + 30, yPosition);
        yPosition += 6;
        
        // Noted by (HR Assistant) - always show HR Assistant
        pdf.setFont('helvetica', 'bold');
        pdf.text('Noted by (HR Assistant):', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        const hrAssistantName = currentUser?.name || selectedLeaveForView.approved_by?.name || selectedLeaveForView.approvedBy?.name || '—';
        pdf.text(hrAssistantName, margin + 45, yPosition);
        yPosition += 6;
        
        // Show appropriate action based on status
        if (selectedLeaveForView.status === 'approved') {
          // Only show Approved by for approved requests
          pdf.setFont('helvetica', 'bold');
          pdf.text('Approved by:', margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          const approverName = selectedLeaveForView.approved_by?.name || selectedLeaveForView.approvedBy?.name || 'HR Assistant';
          pdf.text(approverName, margin + 25, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'bold');
          pdf.text('Approval Date:', margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          const approvalDate = new Date(selectedLeaveForView.approved_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
          });
          pdf.text(approvalDate, margin + 28, yPosition);
          
        } else if (selectedLeaveForView.status === 'rejected') {
          // Show who rejected it - either Manager or HR
          if (selectedLeaveForView.manager_rejected_at && !selectedLeaveForView.rejected_at) {
            // Rejected by Manager
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rejected by the Manager:', margin, yPosition);
            pdf.setFont('helvetica', 'normal');
            const managerName = selectedLeaveForView.manager_approved_by?.name || selectedLeaveForView.managerApprovedBy?.name || 'Manager';
            pdf.text(managerName, margin + 42, yPosition);
            yPosition += 6;
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rejection Date:', margin, yPosition);
            pdf.setFont('helvetica', 'normal');
            const rejectionDate = new Date(selectedLeaveForView.manager_rejected_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
            });
            pdf.text(rejectionDate, margin + 30, yPosition);
            yPosition += 6;
            
            // Manager Remarks
            if (selectedLeaveForView.manager_remarks) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('Manager Remarks:', margin, yPosition);
              pdf.setFont('helvetica', 'normal');
              pdf.text(selectedLeaveForView.manager_remarks, margin + 35, yPosition);
            }
          } else {
            // Rejected by HR
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rejected by HR:', margin, yPosition);
            pdf.setFont('helvetica', 'normal');
            const hrName = selectedLeaveForView.approved_by?.name || selectedLeaveForView.approvedBy?.name || 'HR Assistant';
            pdf.text(hrName, margin + 28, yPosition);
            yPosition += 6;
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rejection Date:', margin, yPosition);
            pdf.setFont('helvetica', 'normal');
            const rejectionDate = new Date(selectedLeaveForView.rejected_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
            });
            pdf.text(rejectionDate, margin + 30, yPosition);
            yPosition += 6;
            
            // HR Remarks
            if (selectedLeaveForView.admin_remarks) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('HR Remarks:', margin, yPosition);
              pdf.setFont('helvetica', 'normal');
              pdf.text(selectedLeaveForView.admin_remarks, margin + 25, yPosition);
            }
          }
        }
        
        yPosition += 15;
      }
      
      // E-Signature Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('E-Signature', margin, yPosition);
      yPosition += 10;
      
      // Signature status
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      if (selectedLeaveForView.signature_path) {
        pdf.text('Signature provided', margin, yPosition);
        
        // Show filename
        pdf.setFontSize(9);
        pdf.text(`File: ${selectedLeaveForView.signature_path.split('/').pop()}`, margin, yPosition + 6);
      } else {
        pdf.text('No signature provided', margin, yPosition);
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })}`, margin, pageHeight - 10);
      pdf.text('Cabuyao Concrete Development Corporation', pageWidth - margin, pageHeight - 10, { align: 'right' });
    
      // Save the PDF
      const employeeName = getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name);
      const fileName = `Leave_Application_${employeeName.replace(/\s+/g, '_')}_${selectedLeaveForView.id}.pdf`;
      pdf.save(fileName);
      
      // Show success message
      showAlert(`PDF exported successfully: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showAlert('Error generating PDF. Please try again.', 'danger');
    } finally {
      // Restore button state
      const exportButton = document.querySelector('[title="Download as PDF"]');
      if (exportButton) {
        exportButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export PDF
        `;
        exportButton.disabled = false;
      }
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const employeeName = getEmployeeName(request.employee, request.employee_name);
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedPeriod === 'all') return matchesSearch;
    
    // Add period filtering logic here if needed
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      manager_approved: 'info',
      manager_rejected: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    const labels = {
      pending: 'Pending',
      manager_approved: 'Manager Approved',
      manager_rejected: 'Manager Rejected',
      approved: 'HR Approved',
      rejected: 'Rejected'
    };
    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  if (loading) {
    return <div className="d-flex justify-content-center p-4">Loading...</div>;
  }

  return (
    <div style={{ height: '100%' }}>
      <Container fluid className="leave-management" style={{ 
        height: 'auto', 
        overflowY: 'auto', 
        padding: isMobile ? '20px 8px' : '20px 20px'
      }}>

      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="stats-icon me-3">
                  <Check size={20} />
                </div>
                <h6 className="mb-0">Approval Status</h6>
              </div>
              <Row className="text-center">
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Requested</div>
                    <div className="stat-value">{stats.approval_stats.requested}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Approved</div>
                    <div className="stat-value">{stats.approval_stats.approved}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Rejected</div>
                    <div className="stat-value">{stats.approval_stats.rejected}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value">{stats.approval_stats.pending}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <h6 className="mb-3">Type of Request Leave</h6>
              <div className="leave-types">
                {Object.entries(stats.type_stats).map(([type, count]) => (
                  <div key={type} className="leave-type-item d-flex justify-content-between align-items-center mb-2">
                    <span>{type}</span>
                    <div className="d-flex align-items-center">
                      <div className="progress-bar me-2" style={{width: '100px', height: '4px', backgroundColor: '#e9ecef'}}>
                        <div 
                          className="progress-fill" 
                          style={{
                            width: `${Math.min((count / stats.approval_stats.requested) * 100, 100)}%`,
                            height: '100%',
                            backgroundColor: type === 'Sick Leave' ? '#007bff' : '#6c757d'
                          }}
                        ></div>
                      </div>
                      <Badge bg="secondary">{count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search Employee"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="all">All Periods</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </Form.Select>
        </Col>
        <Col md={5} className="text-end">
          <div className="d-flex align-items-center justify-content-end gap-3">
            <small className="text-muted">
              Showing {filteredRequests.length} of {leaveRequests.length} requests
            </small>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline-danger" size="sm">
              <Download size={16} className="me-1" />
              Export
            </Button>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="leave-table-container" style={{ position: 'relative' }}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            <Table responsive className="leave-table" style={{ minWidth: '1200px' }}>
              <thead>
              <tr>
                <th>👤 Employee Name</th>
                <th>Department</th>
                <th>Type of Leave</th>
                <th>Terms</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="employee-info">
                      <strong>{getEmployeeName(request.employee, request.employee_name)}</strong>
                      {request.company && <div className="company-text">{request.company}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="department-text">{request.department || '-'}</span>
                  </td>
                  <td>
                    <div className="leave-type-info">
                      <div>{request.type}</div>
                      {request.leave_category && (
                        <small className="text-muted">({request.leave_category})</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="terms-section">
                      <div className="mb-1">
                        <Badge 
                          bg={request.terms === 'with PAY' ? 'success' : 
                              request.terms === 'without PAY' ? 'warning' :
                              'secondary'}
                        >
                          {request.terms || 'TBD by HR'}
                        </Badge>
                      </div>
                      {request.status === 'manager_approved' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditTerms(request)}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          Set Terms
                        </Button>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(request.from)}</td>
                  <td>{formatDate(request.to)}</td>
                  <td>
                    <span className="days-count">{request.total_days || '-'}</span>
                  </td>
                  <td>
                    <span className="reason-text">
                      {request.reason || 'No reason provided'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons d-flex align-items-center gap-1">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleViewLeave(request)}
                        disabled={loadingLeaveDetails}
                        title="View leave form details"
                      >
                        <Eye size={14} />
                      </Button>
                      {request.status === 'manager_approved' ? (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleAction(request, 'approve')}
                            title="Approve leave request"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleAction(request, 'reject')}
                            title="Reject leave request"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : request.status === 'manager_rejected' ? (
                        <>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleAction(request, 'confirm_rejection')}
                            title="Confirm manager's rejection"
                          >
                            <Check size={14} /> Confirm
                          </Button>
                        </>
                      ) : (
                        <div className="ms-2">
                          {getStatusBadge(request.status)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </Table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="text-center p-4">
              <p className="text-muted">No leave requests found.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' ? 'Approve' : 
             actionType === 'reject' ? 'Reject' : 
             actionType === 'confirm_rejection' ? 'Confirm Manager Rejection' : 'Process'} Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <div className="mb-3">
              <strong>Employee:</strong> {getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)}<br />
              <strong>Leave Type:</strong> {selectedLeave.type}<br />
              <strong>Duration:</strong> {formatDate(selectedLeave.from)} - {formatDate(selectedLeave.to)}
            </div>
          )}
          <Form.Group>
            <Form.Label>Remarks (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any comments or remarks..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={actionType === 'approve' ? 'success' : actionType === 'confirm_rejection' ? 'warning' : 'danger'} 
            onClick={confirmAction}
          >
            {actionType === 'approve' ? 'Approve' : 
             actionType === 'reject' ? 'Reject' : 
             actionType === 'confirm_rejection' ? 'Confirm Rejection' : 'Process'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Terms and Category Modal */}
      <Modal show={showTermsModal} onHide={() => setShowTermsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Set Pay Terms & Leave Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingLeave && (
            <div className="mb-3">
              <strong>Employee:</strong> {getEmployeeName(editingLeave.employee, editingLeave.employee_name)}<br />
              <strong>Leave Type:</strong> {editingLeave.type}<br />
              <strong>Duration:</strong> {formatDate(editingLeave.from)} - {formatDate(editingLeave.to)}
            </div>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Pay Terms *</Form.Label>
            <Form.Select
              value={editTerms}
              onChange={(e) => setEditTerms(e.target.value)}
              required
            >
              <option value="">Select pay terms...</option>
              <option value="with PAY">With PAY</option>
              <option value="without PAY">Without PAY</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Leave Category</Form.Label>
            <Form.Select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            >
              <option value="">Select category </option>
              <option value="Service Incentive Leave (SIL)">Service Incentive Leave (SIL)</option>
              <option value="Emergency Leave (EL)">Emergency Leave (EL)</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTermsModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={saveTermsAndCategory}
            disabled={!editTerms}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>


      {/* View Leave Form Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="d-flex align-items-center">
              <FileText size={24} className="me-2" />
              Leave Application Form - {getEmployeeName(selectedLeaveForView?.employee, selectedLeaveForView?.employee_name)}
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingLeaveDetails ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading leave details...</span>
              </div>
              <p className="mt-3 text-muted">Loading leave details...</p>
            </div>
          ) : selectedLeaveForView ? (
            <div id="leave-form-print">
              {/* Header Section */}
              <div className="border-bottom pb-3 mb-4">
                <Row>
                  <Col md={6}>
                    <h5 className="text-primary mb-3">👤 Employee Information</h5>
                    <div className="mb-2">
                      <strong>Company:</strong> 
                      <span className="ms-2">{selectedLeaveForView.company || 'Not specified'}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Name:</strong> 
                      <span className="ms-2">{getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name)}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Department:</strong> 
                      <span className="ms-2">{selectedLeaveForView.department || 'Not Set'}</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h5 className="text-primary mb-3">📅 Application Details</h5>
                    <div className="mb-2">
                      <strong>Date Filed:</strong> 
                      <span className="ms-2">{new Date(selectedLeaveForView.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Status:</strong> 
                      <span className="ms-2">{getStatusBadge(selectedLeaveForView.status)}</span>
                    </div>
                    <div className="mb-2">
                      <strong>Application ID:</strong> 
                      <span className="ms-2 font-monospace">#{selectedLeaveForView.id}</span>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Leave Details Section */}
              <div className="border-bottom pb-3 mb-4">
                <h5 className="text-primary mb-3">🏖️ Leave Details</h5>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Leave Type:</strong>
                      <div className="mt-1">
                        <Badge bg="info" className="me-2">{selectedLeaveForView.type}</Badge>
                        {selectedLeaveForView.leave_category && (
                          <Badge bg="secondary">({selectedLeaveForView.leave_category})</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      <strong>Pay Terms:</strong>
                      <div className="mt-1">
                        <Badge 
                          bg={selectedLeaveForView.terms === 'with PAY' ? 'success' : 
                              selectedLeaveForView.terms === 'without PAY' ? 'warning' :
                              'secondary'}
                        >
                          {selectedLeaveForView.terms || 'To be determined by HR'}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Duration:</strong>
                      <div className="mt-1">
                        <div>📅 <strong>From:</strong> {new Date(selectedLeaveForView.from).toLocaleDateString('en-US', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}</div>
                        <div>📅 <strong>To:</strong> {new Date(selectedLeaveForView.to).toLocaleDateString('en-US', { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        })}</div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <Row>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Total Days:</strong>
                          </div>
                          <Badge bg="primary" style={{ fontSize: '16px', padding: '8px 12px' }}>
                            {selectedLeaveForView.total_days || 0} {(selectedLeaveForView.total_days || 0) === 1 ? 'Day' : 'Days'}
                          </Badge>
                        </Col>
                        <Col md={6}>
                          <div className="mb-2">
                            <strong>Total Hours:</strong>
                          </div>
                          <Badge bg="info" style={{ fontSize: '16px', padding: '8px 12px' }}>
                            {(() => {
                              // If total_days is 0 or null, calculate from date range
                              if (!selectedLeaveForView.total_days && selectedLeaveForView.from && selectedLeaveForView.to) {
                                const fromDate = new Date(selectedLeaveForView.from);
                                const toDate = new Date(selectedLeaveForView.to);
                                const timeDiff = toDate.getTime() - fromDate.getTime();
                                const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                                return days * 8;
                              }
                              return selectedLeaveForView.total_days * 8 || 0;
                            })()} Hours
                          </Badge>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Reason Section */}
              <div className="border-bottom pb-3 mb-4">
                <h5 className="text-primary mb-3">📝 Reason for Leave</h5>
                <div className="bg-light p-3 rounded" style={{ minHeight: '80px' }}>
                  {selectedLeaveForView.reason || (
                    <em className="text-muted">No reason provided</em>
                  )}
                </div>
              </div>

              {/* Manager Rejection Section - Only show for manager_rejected status */}
              {selectedLeaveForView.status === 'manager_rejected' && (
                <div className="border-bottom pb-3 mb-4">
                  <h5 className="text-danger mb-3">⚠️ Manager Rejection Details</h5>
                  <div className="bg-warning bg-opacity-10 p-3 rounded border border-warning">
                    <div className="mb-2">
                      <strong>Rejected by Manager:</strong> 
                      <span className="ms-2">
                        {selectedLeaveForView.manager_approved_by?.name || selectedLeaveForView.managerApprovedBy?.name || 'Manager'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <strong>Rejection Date:</strong> 
                      <span className="ms-2">
                        {new Date(selectedLeaveForView.manager_rejected_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                      </span>
                    </div>
                    {selectedLeaveForView.manager_remarks && (
                      <div className="mb-2">
                        <strong>Manager Remarks:</strong>
                        <div className="mt-1 p-2 bg-white rounded border">
                          {selectedLeaveForView.manager_remarks}
                        </div>
                      </div>
                    )}
                    <div className="mt-3">
                      <Badge bg="warning" className="me-2">
                        <i className="fas fa-clock me-1"></i>
                        Pending HR Approval of Rejection
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">No leave details available.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <div>
            <small className="text-muted">
              Generated on {new Date().toLocaleString()}
            </small>
          </div>
          <div>
            <Button 
              variant="outline-primary" 
              className="me-2"
              onClick={handleExportLeave}
              title="Download as PDF"
            >
              <Download size={16} className="me-1" />
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      </Container>
    </div>
  );
};

export default LeaveManagement;
