import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert, Nav, Tab } from 'react-bootstrap';
import { Search, Calendar, Download, Eye, Check, X, FileText, Clock, CheckCircle, XCircle, BarChart2 } from 'lucide-react';
import { fetchLeaveRequests, getLeaveStats, getLeaveRequest, approveLeaveRequest, rejectLeaveRequest, approveLeaveRequestAsManager, rejectLeaveRequestAsManager } from '../../api/leave';
import jsPDF from 'jspdf';
import ManagerLeaveTracker from './ManagerLeaveTracker';
import './ManagerLeaveManagement.css';

const ManagerLeaveManagement = ({ viewType }) => {
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const [loadingLeaveDetails, setLoadingLeaveDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(null); // 'requests', 'days', 'employees'
  const [highlightedRequests, setHighlightedRequests] = useState([]);

  useEffect(() => {
    loadData();
    
    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, statsResponse] = await Promise.all([
        fetchLeaveRequests(),
        getLeaveStats()
      ]);
      
      console.log('Loaded leave requests:', requestsResponse.data);
      console.log('Loaded stats:', statsResponse.data);
      
      // For now, show all requests (can be filtered later based on role)
      setLeaveRequests(requestsResponse.data || []);
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
        response = await approveLeaveRequestAsManager(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been approved and forwarded to HR!`, 'success');
      } else if (actionType === 'reject') {
        response = await rejectLeaveRequestAsManager(selectedLeave.id, remarks);
        showAlert(`Leave request for ${getEmployeeName(selectedLeave.employee, selectedLeave.employee_name)} has been rejected.`, 'info');
      }
      
      console.log('Manager action response:', response);
      
      setShowModal(false);
      setSelectedLeave(null);
      setRemarks('');
      setActionType('');
      
      // Immediately reload data to show changes
      await loadData();
    } catch (error) {
      console.error('Error processing manager action:', error);
      const errorMessage = error.response?.data?.message || 'Error processing request. Please try again.';
      showAlert(errorMessage, 'danger');
    }
  };


  const handleViewLeave = async (request) => {
    try {
      setLoadingLeaveDetails(true);
      const response = await getLeaveRequest(request.id);
      console.log('Full leave request data:', response.data);
      setSelectedLeaveForView(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching leave details:', error);
      showAlert('Error loading leave details. Please try again.', 'danger');
    } finally {
      setLoadingLeaveDetails(false);
    }
  };

  const getEmployeeName = (employee, employeeName) => {
    try {
      if (employeeName && typeof employeeName === 'string') {
        return employeeName;
      }
      
      if (employee && typeof employee === 'object' && employee !== null) {
        if (employee.name && typeof employee.name === 'string') {
          return employee.name;
        }
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

  // Helper function to calculate hours based on days (8 hours per day)
  const calculateHoursFromDays = (days) => {
    const totalDays = parseInt(days) || 0;
    return totalDays * 8;
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  const handleExportAll = async () => {
    if (filteredRequests.length === 0) {
      showAlert('No leave requests to export.', 'warning');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Leave Requests Report - Manager View', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Report details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      pdf.text(`Generated on: ${reportDate}`, margin, yPosition);
      yPosition += 5;
      
      const tabLabel = activeTab === 'pending' ? 'Pending Requests' : 
                      activeTab === 'approved' ? 'Approved Requests' : 'Rejected Requests';
      pdf.text(`Filter: ${tabLabel}`, margin, yPosition);
      yPosition += 5;
      
      if (selectedPeriod === 'this_month') {
        pdf.text('Period: This Month', margin, yPosition);
      } else if (selectedPeriod === 'month' && selectedMonth) {
        const monthLabel = generateMonthOptions().find(m => m.value === selectedMonth)?.label || selectedMonth;
        pdf.text(`Period: ${monthLabel}`, margin, yPosition);
      } else {
        pdf.text('Period: All Periods', margin, yPosition);
      }
      yPosition += 10;
      
      // Table headers
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      const headers = ['Employee', 'Department', 'Type', 'Status', 'Start Date', 'End Date', 'Days', 'Hours'];
      const colWidths = [30, 25, 20, 20, 20, 20, 15, 15];
      let xPosition = margin;
      
      // Draw table headers
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      
      // Draw line under headers
      yPosition += 3;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
      
      // Table data
      pdf.setFont('helvetica', 'normal');
      filteredRequests.forEach((request, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        
        const rowData = [
          getEmployeeName(request.employee, request.employee_name).substring(0, 18),
          (request.department || '-').substring(0, 15),
          (request.type || '-').substring(0, 12),
          request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('_', ' '),
          formatDate(request.from),
          formatDate(request.to),
          (request.total_days || '-').toString(),
          `${calculateHoursFromDays(request.total_days)}h`
        ];
        
        xPosition = margin;
        rowData.forEach((data, colIndex) => {
          pdf.text(data, xPosition, yPosition);
          xPosition += colWidths[colIndex];
        });
        
        yPosition += 5;
      });
      
      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Total Records: ${filteredRequests.length}`, margin, pageHeight - 15);
      pdf.text('Cabuyao Concrete Development Corporation', pageWidth - margin, pageHeight - 15, { align: 'right' });
      
      // Save the PDF
      const fileName = `Manager_Leave_Requests_${tabLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showAlert(`Report exported successfully: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error exporting report:', error);
      showAlert('Error generating report. Please try again.', 'danger');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const employeeName = getEmployeeName(request.employee, request.employee_name);
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by tab status
    let matchesTab = false;
    if (activeTab === 'pending') {
      matchesTab = request.status === 'pending';
    } else if (activeTab === 'approved') {
      matchesTab = request.status === 'manager_approved' || request.status === 'approved';
    } else if (activeTab === 'rejected') {
      matchesTab = request.status === 'manager_rejected' || request.status === 'rejected';
    }
    
    // Filter by period
    let matchesPeriod = true;
    if (selectedPeriod === 'this_month') {
      const currentDate = new Date();
      const requestDate = new Date(request.created_at);
      matchesPeriod = requestDate.getMonth() === currentDate.getMonth() && 
                     requestDate.getFullYear() === currentDate.getFullYear();
    } else if (selectedPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const requestDate = new Date(request.created_at);
      matchesPeriod = requestDate.getMonth() === parseInt(month) - 1 && 
                     requestDate.getFullYear() === parseInt(year);
    }
    
    return matchesSearch && matchesTab && matchesPeriod;
  });

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: '#92400e',
        border: '2px solid #fbbf24',
        icon: '⏳'
      },
      manager_approved: {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: '#1e40af',
        border: '2px solid #3b82f6',
        icon: '📤'
      },
      manager_rejected: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#991b1b',
        border: '2px solid #ef4444',
        icon: '❌'
      },
      approved: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        color: '#065f46',
        border: '2px solid #10b981',
        icon: '✅'
      },
      rejected: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#991b1b',
        border: '2px solid #ef4444',
        icon: '❌'
      }
    };
    const labels = {
      pending: 'Pending Review',
      manager_approved: 'Forwarded to HR',
      manager_rejected: 'Rejected',
      approved: 'Approved by HR',
      rejected: 'Rejected'
    };
    const style = statusStyles[status] || {
      background: '#e5e7eb',
      color: '#6b7280',
      border: '2px solid #9ca3af',
      icon: '●'
    };
    return (
      <Badge 
        style={{
          background: style.background,
          color: style.color,
          border: style.border,
          padding: '6px 12px',
          borderRadius: '20px',
          fontWeight: '600',
          fontSize: '0.75rem',
          letterSpacing: '0.025em',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>{style.icon}</span>
        {labels[status] || status}
      </Badge>
    );
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

  // If viewType is 'tracker', show Leave Tracker
  if (viewType === 'tracker') {
    return (
      <div style={{ height: '100%', backgroundColor: '#f8f9fa' }}>
        <Container fluid style={{ padding: isMobile ? '20px 8px' : '20px 20px' }}>
          <ManagerLeaveTracker />
        </Container>
      </div>
    );
  }

  // If viewType is 'overview', show Leave Overview (Pending requests only)
  if (viewType === 'overview') {
    const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
    
    // Get unique employees
    const uniqueEmployees = Array.from(new Set(pendingRequests.map(r => ({
      id: r.employee?.id || r.employee_name,
      name: getEmployeeName(r.employee, r.employee_name),
      department: r.department,
      company: r.company
    })).map(JSON.stringify))).map(JSON.parse);

    // Get requests with most days
    const requestsByDays = [...pendingRequests].sort((a, b) => 
      (parseInt(b.total_days) || 0) - (parseInt(a.total_days) || 0)
    );

    const handleCardClick = (cardType) => {
      setShowStatsModal(cardType);
      if (cardType === 'employees') {
        setHighlightedRequests(pendingRequests.map(r => r.id));
      }
    };
    
    return (
      <div style={{ height: '100%', backgroundColor: '#f8f9fa' }}>
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }
          .action-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .action-btn:hover {
            transform: translateY(-2px) !important;
          }
          .action-btn:active {
            transform: translateY(0) !important;
          }
        `}</style>
        <Container fluid style={{ padding: isMobile ? '20px 8px' : '32px 40px', maxWidth: '1400px' }}>
          <div>
            {alert.show && (
              <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
                {alert.message}
              </Alert>
            )}

            {/* Statistics Cards at Top - Enhanced Attractive Design */}
            <Row className="mb-4" style={{ gap: '0' }}>
              <Col lg={4} md={6} className="mb-3">
                <Card 
                  onClick={() => handleCardClick('requests')}
                  style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(245, 158, 11, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)';
                  }}>
                  {/* Decorative Circle */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.1)',
                    zIndex: 0
                  }}></div>
                  <Card.Body style={{ padding: '28px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#92400e',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}>
                        Pending Requests
                      </div>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                      }}>
                        <Clock size={24} color="#ffffff" />
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '3rem', 
                      fontWeight: '800', 
                      color: '#f59e0b',
                      lineHeight: '1',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      textShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
                    }}>
                      {pendingRequests.length}
                    </div>
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.8125rem',
                      color: '#78716c',
                      fontWeight: '500'
                    }}>
                      Awaiting your review
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4} md={6} className="mb-3">
                <Card 
                  onClick={() => handleCardClick('days')}
                  style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)';
                  }}>
                  {/* Decorative Circle */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.1)',
                    zIndex: 0
                  }}></div>
                  <Card.Body style={{ padding: '28px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#1e40af',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}>
                        Total Days Requested
                      </div>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}>
                        <Calendar size={24} color="#ffffff" />
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '3rem', 
                      fontWeight: '800', 
                      color: '#3b82f6',
                      lineHeight: '1',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      textShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
                    }}>
                      {pendingRequests.reduce((sum, r) => sum + (parseInt(r.total_days) || 0), 0)}
                    </div>
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.8125rem',
                      color: '#78716c',
                      fontWeight: '500'
                    }}>
                      Days off requested
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4} md={6} className="mb-3">
                <Card 
                  onClick={() => handleCardClick('employees')}
                  style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(139, 92, 246, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)';
                  }}>
                  {/* Decorative Circle */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.1)',
                    zIndex: 0
                  }}></div>
                  <Card.Body style={{ padding: '28px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#5b21b6',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}>
                        Employees Awaiting
                      </div>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}>
                        <CheckCircle size={24} color="#ffffff" />
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '3rem', 
                      fontWeight: '800', 
                      color: '#8b5cf6',
                      lineHeight: '1',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      textShadow: '0 2px 4px rgba(139, 92, 246, 0.1)'
                    }}>
                      {new Set(pendingRequests.map(r => r.employee?.id || r.employee_name)).size}
                    </div>
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.8125rem',
                      color: '#78716c',
                      fontWeight: '500'
                    }}>
                      Unique employees
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Pending Requests Table - Enhanced Attractive Design */}
            <Card style={{ 
              border: 'none', 
              borderRadius: '16px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              background: '#ffffff'
            }}>
              <Card.Header style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)', 
                borderBottom: 'none', 
                padding: '24px 28px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  zIndex: 0
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  zIndex: 0
                }}></div>
                <div className="d-flex align-items-center justify-content-between" style={{ position: 'relative', zIndex: 1 }}>
                  <div className="d-flex align-items-center">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                      <Clock size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <h6 className="mb-0" style={{ 
                      color: '#78350f', 
                      fontWeight: '700',
                      fontSize: '1.25rem',
                      letterSpacing: '-0.02em',
                      textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)'
                    }}>
                      Pending Leave Requests
                    </h6>
                  </div>
                  <Badge 
                    style={{ 
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#f59e0b',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {pendingRequests.length} {pendingRequests.length === 1 ? 'Request' : 'Requests'}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body style={{ padding: 0 }}>
                {pendingRequests.length === 0 ? (
                  <div className="text-center p-5">
                    <Clock size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                    <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '4px' }}>No pending requests</p>
                    <small style={{ color: '#9ca3af', fontSize: '0.875rem' }}>All leave requests have been processed</small>
                  </div>
                ) : (
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                      <thead style={{ 
                        backgroundColor: '#f9fafb', 
                        position: 'sticky', 
                        top: 0, 
                        zIndex: 10,
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <tr>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Employee</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Department</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Type</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Status</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Start Date</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>End Date</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Days</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Reason</th>
                          <th style={{ 
                            padding: '14px 16px', 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: '0.875rem',
                            letterSpacing: '0.025em'
                          }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRequests.map((request, index) => (
                          <tr key={request.id} style={{ 
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fefce8';
                            e.currentTarget.style.transform = 'scale(1.01)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div>
                                <strong style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600' }}>
                                  {getEmployeeName(request.employee, request.employee_name)}
                                </strong>
                                {request.company && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{request.company}</div>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{request.department || '-'}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div>
                                <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>{request.type}</div>
                                {request.leave_category && (
                                  <small style={{ fontSize: '0.75rem', color: '#6b7280' }}>({request.leave_category})</small>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {getStatusBadge(request.status)}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#4b5563' }}>{formatDate(request.from)}</td>
                            <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#4b5563' }}>{formatDate(request.to)}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{request.total_days || '-'}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '0.875rem', color: '#4b5563', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {request.reason || 'No reason provided'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div className="d-flex gap-2">
                                <Button
                                  className="action-btn"
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewLeave(request)}
                                  disabled={loadingLeaveDetails}
                                  title="View details"
                                  style={{
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f8fafc',
                                    border: '2px solid #e2e8f0',
                                    fontWeight: '500',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#3b82f6';
                                    e.currentTarget.style.borderColor = '#3b82f6';
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.color = '#475569';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                  }}
                                >
                                  <Eye size={16} />
                                </Button>
                                <Button
                                  className="action-btn"
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleAction(request, 'approve')}
                                  title="Approve"
                                  style={{
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                                    border: 'none',
                                    fontWeight: '500',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                                  }}
                                >
                                  <Check size={16} />
                                </Button>
                                <Button
                                  className="action-btn"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleAction(request, 'reject')}
                                  title="Reject"
                                  style={{
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                    border: 'none',
                                    fontWeight: '500',
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                                  }}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                </div>
              )}
            </Card.Body>
            </Card>
          </div>

          {/* View Modal */}
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
                <div>
                  <Row className="mb-3">
                    <Col md={6}>
                      <h6 className="text-primary mb-3">Employee Information</h6>
                      <p><strong>Name:</strong> {getEmployeeName(selectedLeaveForView.employee, selectedLeaveForView.employee_name)}</p>
                      <p><strong>Department:</strong> {selectedLeaveForView.department || 'Not Set'}</p>
                      <p><strong>Company:</strong> {selectedLeaveForView.company || 'Not specified'}</p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-primary mb-3">Leave Details</h6>
                      <p><strong>Type:</strong> {selectedLeaveForView.type}</p>
                      <p><strong>From:</strong> {formatDate(selectedLeaveForView.from)}</p>
                      <p><strong>To:</strong> {formatDate(selectedLeaveForView.to)}</p>
                      <p><strong>Total Days:</strong> {selectedLeaveForView.total_days}</p>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <h6 className="text-primary mb-3">Reason</h6>
                      <p>{selectedLeaveForView.reason || 'No reason provided'}</p>
                    </Col>
                  </Row>
                </div>
              ) : (
                <p className="text-muted">No leave details available.</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
            </Modal.Footer>
          </Modal>

          {/* Action Modal */}
          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>
                {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
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
                <Form.Label>Manager Remarks (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any comments or remarks..."
                />
              </Form.Group>
              {actionType === 'approve' && (
                <Alert variant="info" className="mt-3">
                  <small>
                    <strong>Note:</strong> Approving this request will forward it to HR for final processing.
                  </small>
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button 
                variant={actionType === 'approve' ? 'success' : 'danger'} 
                onClick={confirmAction}
              >
                {actionType === 'approve' ? 'Approve & Forward to HR' : 'Reject Request'}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Statistics Detail Modals */}
          {/* Pending Requests Detail Modal */}
          <Modal show={showStatsModal === 'requests'} onHide={() => setShowStatsModal(null)} size="lg">
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', borderBottom: '2px solid #fbbf24' }}>
              <Modal.Title style={{ color: '#92400e', fontWeight: '700' }}>
                <Clock size={24} className="me-2" style={{ verticalAlign: 'middle' }} />
                All Pending Requests ({pendingRequests.length})
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-5">
                  <Clock size={64} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                  <p style={{ color: '#6b7280' }}>No pending requests</p>
                </div>
              ) : (
                <div>
                  {pendingRequests.map((request, index) => (
                    <Card key={request.id} className="mb-3" style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 style={{ color: '#111827', fontWeight: '600', marginBottom: '4px' }}>
                              {getEmployeeName(request.employee, request.employee_name)}
                            </h6>
                            <small style={{ color: '#6b7280' }}>
                              {request.department} • {request.company}
                            </small>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="row mt-3">
                          <div className="col-6 col-md-4 mb-2">
                            <small style={{ color: '#6b7280', display: 'block' }}>Type</small>
                            <strong style={{ color: '#111827', fontSize: '0.875rem' }}>{request.type}</strong>
                          </div>
                          <div className="col-6 col-md-4 mb-2">
                            <small style={{ color: '#6b7280', display: 'block' }}>Duration</small>
                            <strong style={{ color: '#f59e0b', fontSize: '0.875rem' }}>{request.total_days} days</strong>
                          </div>
                          <div className="col-12 col-md-4 mb-2">
                            <small style={{ color: '#6b7280', display: 'block' }}>Date Range</small>
                            <strong style={{ color: '#111827', fontSize: '0.875rem' }}>
                              {formatDate(request.from)} - {formatDate(request.to)}
                            </strong>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowStatsModal(null)}>Close</Button>
            </Modal.Footer>
          </Modal>

          {/* Total Days Breakdown Modal */}
          <Modal show={showStatsModal === 'days'} onHide={() => setShowStatsModal(null)} size="lg">
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderBottom: '2px solid #3b82f6' }}>
              <Modal.Title style={{ color: '#1e40af', fontWeight: '700' }}>
                <Calendar size={24} className="me-2" style={{ verticalAlign: 'middle' }} />
                Days Breakdown (Total: {pendingRequests.reduce((sum, r) => sum + (parseInt(r.total_days) || 0), 0)} days)
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <div className="mb-3">
                <div style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  marginBottom: '20px'
                }}>
                  <div className="row text-center">
                    <div className="col-4">
                      <h3 style={{ color: '#3b82f6', fontWeight: '700', marginBottom: '4px' }}>
                        {pendingRequests.reduce((sum, r) => sum + (parseInt(r.total_days) || 0), 0)}
                      </h3>
                      <small style={{ color: '#6b7280' }}>Total Days</small>
                    </div>
                    <div className="col-4">
                      <h3 style={{ color: '#10b981', fontWeight: '700', marginBottom: '4px' }}>
                        {pendingRequests.length}
                      </h3>
                      <small style={{ color: '#6b7280' }}>Requests</small>
                    </div>
                    <div className="col-4">
                      <h3 style={{ color: '#8b5cf6', fontWeight: '700', marginBottom: '4px' }}>
                        {(pendingRequests.reduce((sum, r) => sum + (parseInt(r.total_days) || 0), 0) / Math.max(pendingRequests.length, 1)).toFixed(1)}
                      </h3>
                      <small style={{ color: '#6b7280' }}>Avg Days/Request</small>
                    </div>
                  </div>
                </div>
              </div>
              
              <h6 style={{ color: '#374151', fontWeight: '600', marginBottom: '16px' }}>Requests Sorted by Days</h6>
              {requestsByDays.map((request, index) => (
                <div key={request.id} className="mb-2" style={{
                  padding: '12px 16px',
                  background: index < 3 ? 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)' : '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong style={{ color: '#111827', fontSize: '0.875rem' }}>
                        {getEmployeeName(request.employee, request.employee_name)}
                      </strong>
                      <div>
                        <small style={{ color: '#6b7280' }}>{request.type} • {formatDate(request.from)} - {formatDate(request.to)}</small>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700', 
                        color: index < 3 ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {request.total_days}
                      </div>
                      <small style={{ color: '#6b7280' }}>days</small>
                    </div>
                  </div>
                </div>
              ))}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowStatsModal(null)}>Close</Button>
            </Modal.Footer>
          </Modal>

          {/* Employees Awaiting Modal */}
          <Modal show={showStatsModal === 'employees'} onHide={() => setShowStatsModal(null)} size="lg">
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderBottom: '2px solid #8b5cf6' }}>
              <Modal.Title style={{ color: '#5b21b6', fontWeight: '700' }}>
                <CheckCircle size={24} className="me-2" style={{ verticalAlign: 'middle' }} />
                Employees Awaiting Response ({uniqueEmployees.length})
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {uniqueEmployees.length === 0 ? (
                <div className="text-center py-5">
                  <CheckCircle size={64} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                  <p style={{ color: '#6b7280' }}>No employees awaiting</p>
                </div>
              ) : (
                <div>
                  {uniqueEmployees.map((employee, index) => {
                    const employeeRequests = pendingRequests.filter(r => 
                      (r.employee?.id || r.employee_name) === employee.id
                    );
                    const totalDays = employeeRequests.reduce((sum, r) => sum + (parseInt(r.total_days) || 0), 0);
                    
                    return (
                      <Card key={index} className="mb-3" style={{ 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)'
                      }}>
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                              <h6 style={{ color: '#111827', fontWeight: '600', marginBottom: '4px' }}>
                                {employee.name}
                              </h6>
                              <small style={{ color: '#6b7280' }}>
                                {employee.department} • {employee.company}
                              </small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <Badge bg="warning" style={{ marginBottom: '4px' }}>
                                {employeeRequests.length} {employeeRequests.length === 1 ? 'Request' : 'Requests'}
                              </Badge>
                              <div>
                                <small style={{ color: '#6b7280' }}>
                                  <strong style={{ color: '#8b5cf6' }}>{totalDays}</strong> total days
                                </small>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ paddingLeft: '12px', borderLeft: '3px solid #8b5cf6' }}>
                            {employeeRequests.map((req, idx) => (
                              <div key={idx} className="mb-2" style={{ padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                                <div className="d-flex justify-content-between">
                                  <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                                    {req.type}
                                  </span>
                                  <span style={{ fontSize: '0.875rem', color: '#8b5cf6', fontWeight: '600' }}>
                                    {req.total_days} days
                                  </span>
                                </div>
                                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                  {formatDate(req.from)} - {formatDate(req.to)}
                                </small>
                              </div>
                            ))}
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowStatsModal(null)}>Close</Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    );
  }

  // If viewType is 'status', show Leave Status
  if (viewType === 'status') {
    const approvedRequests = leaveRequests.filter(r => r.status === 'manager_approved' || r.status === 'approved');
    const rejectedRequests = leaveRequests.filter(r => r.status === 'manager_rejected' || r.status === 'rejected');

    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        overflow: 'auto'
      }}>
        <Container fluid style={{ 
          padding: isMobile ? '20px 16px 40px 16px' : '24px 40px 60px 40px',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div>
            {/* Header */}
            <div className="mb-3">
              <h4 style={{ 
                color: '#111827', 
                fontWeight: '700',
                fontSize: '1.5rem',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Leave Status
              </h4>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '0.875rem',
                margin: '4px 0 0 0',
                fontWeight: '400'
              }}>
                View approved and rejected leave requests
              </p>
            </div>

            {alert.show && (
              <Alert 
                variant={alert.type} 
                dismissible 
                onClose={() => setAlert({ show: false, message: '', type: '' })}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                {alert.message}
              </Alert>
            )}

            {/* Tabbed Interface */}
            <Tab.Container defaultActiveKey="approved">
              <Nav variant="tabs" style={{ 
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '24px',
                gap: '8px'
              }}>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="approved"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      padding: '14px 20px',
                      border: 'none',
                      borderBottom: '2px solid transparent',
                      color: '#6b7280',
                      transition: 'all 0.2s ease',
                      borderRadius: '0'
                    }}
                    className="tab-link-approved"
                  >
                    <CheckCircle size={16} className="me-2" style={{ verticalAlign: 'middle' }} />
                    Approved
                    <Badge 
                      className="ms-2"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        backgroundColor: '#10b981',
                        color: '#ffffff'
                      }}
                    >
                      {approvedRequests.length}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="rejected"
                    style={{
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      padding: '14px 20px',
                      border: 'none',
                      borderBottom: '2px solid transparent',
                      color: '#6b7280',
                      transition: 'all 0.2s ease',
                      borderRadius: '0'
                    }}
                    className="tab-link-rejected"
                  >
                    <XCircle size={16} className="me-2" style={{ verticalAlign: 'middle' }} />
                    Rejected
                    <Badge 
                      className="ms-2"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        backgroundColor: '#ef4444',
                        color: '#ffffff'
                      }}
                    >
                      {rejectedRequests.length}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                {/* Approved Tab */}
                <Tab.Pane eventKey="approved">
                  <div style={{ 
                    border: 'none', 
                    borderRadius: '0',
                    boxShadow: 'none'
                  }}>
                      {approvedRequests.length === 0 ? (
                        <div className="text-center" style={{ 
                          padding: '80px 20px'
                        }}>
                          <CheckCircle size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                          <h6 style={{ color: '#6b7280', fontWeight: '500', fontSize: '0.9375rem', margin: '0 0 4px 0' }}>
                            No approved requests
                          </h6>
                          <p style={{ color: '#9ca3af', fontSize: '0.8125rem', margin: 0 }}>
                            Approved requests will appear here
                          </p>
                        </div>
                      ) : (
                        <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                          <thead style={{ 
                            backgroundColor: '#fafafa',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <tr>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Employee</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Type</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Dates</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                textAlign: 'center'
                              }}>Days</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {approvedRequests.map((request, index) => (
                              <tr key={request.id} style={{ 
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                              }}>
                                <td style={{ padding: '16px 20px' }}>
                                  <div>
                                    <div style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600' }}>
                                      {getEmployeeName(request.employee, request.employee_name)}
                                    </div>
                                    {request.department && (
                                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                                        {request.department}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '16px 20px', color: '#4b5563', fontSize: '0.875rem' }}>
                                  {request.type}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#4b5563', fontSize: '0.875rem' }}>
                                  {formatDate(request.from)} - {formatDate(request.to)}
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                  <span style={{ 
                                    fontWeight: '700', 
                                    color: '#10b981', 
                                    fontSize: '0.875rem',
                                    backgroundColor: '#ecfdf5',
                                    padding: '4px 10px',
                                    borderRadius: '6px'
                                  }}>
                                    {request.total_days}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                  {getStatusBadge(request.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                  </div>
                </Tab.Pane>

                {/* Rejected Tab */}
                <Tab.Pane eventKey="rejected">
                  <div style={{ 
                    border: 'none', 
                    borderRadius: '0',
                    boxShadow: 'none'
                  }}>
                      {rejectedRequests.length === 0 ? (
                        <div className="text-center" style={{ 
                          padding: '80px 20px'
                        }}>
                          <XCircle size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                          <h6 style={{ color: '#6b7280', fontWeight: '500', fontSize: '0.9375rem', margin: '0 0 4px 0' }}>
                            No rejected requests
                          </h6>
                          <p style={{ color: '#9ca3af', fontSize: '0.8125rem', margin: 0 }}>
                            Rejected requests will appear here
                          </p>
                        </div>
                      ) : (
                        <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                          <thead style={{ 
                            backgroundColor: '#fafafa',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <tr>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Employee</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Type</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Dates</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                textAlign: 'center'
                              }}>Days</th>
                              <th style={{ 
                                padding: '12px 20px', 
                                fontWeight: '600', 
                                color: '#374151',
                                fontSize: '0.8125rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rejectedRequests.map((request, index) => (
                              <tr key={request.id} style={{ 
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                              }}>
                                <td style={{ padding: '16px 20px' }}>
                                  <div>
                                    <div style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '600' }}>
                                      {getEmployeeName(request.employee, request.employee_name)}
                                    </div>
                                    {request.department && (
                                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                                        {request.department}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '16px 20px', color: '#4b5563', fontSize: '0.875rem' }}>
                                  {request.type}
                                </td>
                                <td style={{ padding: '16px 20px', color: '#4b5563', fontSize: '0.875rem' }}>
                                  {formatDate(request.from)} - {formatDate(request.to)}
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                  <span style={{ 
                                    fontWeight: '700', 
                                    color: '#ef4444', 
                                    fontSize: '0.875rem',
                                    backgroundColor: '#fef2f2',
                                    padding: '4px 10px',
                                    borderRadius: '6px'
                                  }}>
                                    {request.total_days}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                  {getStatusBadge(request.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </div>
        </Container>
      </div>
    );
  }

  // Default view: Leave Management (for backwards compatibility)
  return (
    <div style={{ height: '100%', backgroundColor: '#f8f9fa' }}>
      <Container fluid className="manager-leave-management" style={{ 
        height: 'auto', 
        overflowY: 'auto', 
        padding: isMobile ? '20px 8px' : '20px 20px',
        backgroundColor: '#f8f9fa'
      }}>

      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderBottom: '1px solid #e9ecef',
        marginBottom: '20px',
        borderRadius: '8px 8px 0 0'
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Leave Management</h4>
          <div className="text-muted small">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

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
                  {activeTab === 'pending' ? <Clock size={20} /> : 
                   activeTab === 'approved' ? <CheckCircle size={20} /> : 
                   <XCircle size={20} />}
                </div>
                <h6 className="mb-0">
                  {activeTab === 'pending' ? 'Pending Requests' : 
                   activeTab === 'approved' ? 'Approved Requests' : 
                   'Rejected Requests'}
                </h6>
              </div>
              <Row className="text-center">
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Total</div>
                    <div className="stat-value">
                      {activeTab === 'pending' ? 
                        leaveRequests.filter(r => r.status === 'pending').length :
                        activeTab === 'approved' ? 
                        leaveRequests.filter(r => r.status === 'manager_approved' || r.status === 'approved').length :
                        leaveRequests.filter(r => r.status === 'manager_rejected' || r.status === 'rejected').length}
                    </div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">This Month</div>
                    <div className="stat-value">
                      {(() => {
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        return leaveRequests.filter(r => {
                          const requestDate = new Date(r.created_at);
                          const matchesTab = activeTab === 'pending' ? r.status === 'pending' :
                            activeTab === 'approved' ? (r.status === 'manager_approved' || r.status === 'approved') : 
                            (r.status === 'manager_rejected' || r.status === 'rejected');
                          return matchesTab && requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
                        }).length;
                      })()}
                    </div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">This Week</div>
                    <div className="stat-value">
                      {(() => {
                        const now = new Date();
                        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                        return leaveRequests.filter(r => {
                          const requestDate = new Date(r.created_at);
                          const matchesTab = activeTab === 'pending' ? r.status === 'pending' :
                            activeTab === 'approved' ? (r.status === 'manager_approved' || r.status === 'approved') : 
                            (r.status === 'manager_rejected' || r.status === 'rejected');
                          return matchesTab && requestDate >= startOfWeek && requestDate <= endOfWeek;
                        }).length;
                      })()}
                    </div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Today</div>
                    <div className="stat-value">
                      {(() => {
                        const today = new Date().toDateString();
                        return leaveRequests.filter(r => {
                          const requestDate = new Date(r.created_at).toDateString();
                          const matchesTab = activeTab === 'pending' ? r.status === 'pending' :
                            activeTab === 'approved' ? (r.status === 'manager_approved' || r.status === 'approved') : 
                            (r.status === 'manager_rejected' || r.status === 'rejected');
                          return matchesTab && requestDate === today;
                        }).length;
                      })()}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <h6 className="mb-3">
                {activeTab === 'pending' ? 'Pending by Leave Type' : 
                 activeTab === 'approved' ? 'Approved by Leave Type' : 
                 'Rejected by Leave Type'}
              </h6>
              <div className="leave-types" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {(() => {
                  const filteredRequests = leaveRequests.filter(r => {
                    if (activeTab === 'pending') return r.status === 'pending';
                    if (activeTab === 'approved') return r.status === 'manager_approved' || r.status === 'approved';
                    if (activeTab === 'rejected') return r.status === 'manager_rejected' || r.status === 'rejected';
                    return false;
                  });
                  
                  const typeCounts = {};
                  filteredRequests.forEach(request => {
                    const type = request.type || 'Unknown';
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                  });
                  
                  const total = filteredRequests.length;
                  
                  return Object.entries(typeCounts).map(([type, count]) => (
                    <div key={type} className="leave-type-item d-flex justify-content-between align-items-center mb-2">
                      <span>{type}</span>
                      <div className="d-flex align-items-center">
                        <div className="progress-bar me-2" style={{width: '100px', height: '4px', backgroundColor: '#e9ecef'}}>
                          <div 
                            className="progress-fill" 
                            style={{
                              width: `${total > 0 ? (count / total) * 100 : 0}%`,
                              height: '100%',
                              backgroundColor: activeTab === 'pending' ? '#ffc107' : 
                                            activeTab === 'approved' ? '#198754' : '#dc3545'
                            }}
                          ></div>
                        </div>
                        <Badge bg={activeTab === 'pending' ? 'warning' : 
                                   activeTab === 'approved' ? 'success' : 'danger'}>
                          {count}
                        </Badge>
                      </div>
                    </div>
                  ));
                })()}
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
          <Form.Select value={selectedPeriod} onChange={(e) => {
            setSelectedPeriod(e.target.value);
            if (e.target.value !== 'month') {
              setSelectedMonth('');
            }
          }}>
            <option value="all">All Periods</option>
            <option value="this_month">This Month</option>
            <option value="month">Month</option>
          </Form.Select>
        </Col>
        {selectedPeriod === 'month' && (
          <Col md={3}>
            <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">Select Month</option>
              {generateMonthOptions().map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
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
              title="Refresh leave requests data"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <span className="me-1">🔄</span>
                  Refresh
                </>
              )}
            </Button>
            <Button 
              variant="outline-success" 
              size="sm"
              onClick={handleExportAll}
              disabled={filteredRequests.length === 0}
              title="Export filtered leave requests to PDF"
            >
              <Download size={16} className="me-1" />
              Export
            </Button>
          </div>
        </Col>
      </Row>

      {/* Tabbed Leave Requests */}
      <Card>
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-bottom">
              <Nav.Item>
                <Nav.Link eventKey="pending" className="d-flex align-items-center">
                  <Clock size={16} className="me-2" />
                  Pending Requests
                  <Badge bg="warning" className="ms-2">
                    {leaveRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="approved" className="d-flex align-items-center">
                  <CheckCircle size={16} className="me-2" />
                  Approved Requests
                  <Badge bg="success" className="ms-2">
                    {leaveRequests.filter(r => r.status === 'manager_approved' || r.status === 'approved').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rejected" className="d-flex align-items-center">
                  <XCircle size={16} className="me-2" />
                  Rejected Requests
                  <Badge bg="danger" className="ms-2">
                    {leaveRequests.filter(r => r.status === 'manager_rejected' || r.status === 'rejected').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
            </Nav>
            
            <Tab.Content>
              <Tab.Pane eventKey="pending">
                <div className="leave-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
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
                  <Table responsive className="leave-table" style={{ minWidth: '1300px' }}>
                    <thead>
                    <tr>
                      <th>👤 Employee Name</th>
                      <th>Department</th>
                      <th>Type of Leave</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Hours</th>
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
                          {getStatusBadge(request.status)}
                        </td>
                        <td>{formatDate(request.from)}</td>
                        <td>{formatDate(request.to)}</td>
                        <td>
                          <span className="days-count">{request.total_days || '-'}</span>
                        </td>
                        <td>
                          <span className="hours-count">{calculateHoursFromDays(request.total_days)} hrs</span>
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
                            {request.status === 'pending' ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleAction(request, 'approve')}
                                  title="Approve and forward to HR"
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
                    <Clock size={48} className="text-muted mb-3" />
                    <p className="text-muted">No pending leave requests found.</p>
                    <small className="text-muted">Leave requests that need manager approval will appear here.</small>
                  </div>
                )}
              </Tab.Pane>
              
              <Tab.Pane eventKey="approved">
                <div className="leave-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
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
                  <Table responsive className="leave-table" style={{ minWidth: '1300px' }}>
                    <thead>
                    <tr>
                      <th>👤 Employee Name</th>
                      <th>Department</th>
                      <th>Type of Leave</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Hours</th>
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
                          {getStatusBadge(request.status)}
                        </td>
                        <td>{formatDate(request.from)}</td>
                        <td>{formatDate(request.to)}</td>
                        <td>
                          <span className="days-count">{request.total_days || '-'}</span>
                        </td>
                        <td>
                          <span className="hours-count">{calculateHoursFromDays(request.total_days)} hrs</span>
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
                            <div className="ms-2">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </Table>
                </div>
                
                {filteredRequests.length === 0 && (
                  <div className="text-center p-4">
                    <CheckCircle size={48} className="text-success mb-3" />
                    <p className="text-muted">No approved leave requests found.</p>
                    <small className="text-muted">Approved leave requests will appear here.</small>
                  </div>
                )}
              </Tab.Pane>
              
              <Tab.Pane eventKey="rejected">
                <div className="leave-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
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
                  <Table responsive className="leave-table" style={{ minWidth: '1300px' }}>
                    <thead>
                    <tr>
                      <th>👤 Employee Name</th>
                      <th>Department</th>
                      <th>Type of Leave</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Hours</th>
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
                          {getStatusBadge(request.status)}
                        </td>
                        <td>{formatDate(request.from)}</td>
                        <td>{formatDate(request.to)}</td>
                        <td>
                          <span className="days-count">{request.total_days || '-'}</span>
                        </td>
                        <td>
                          <span className="hours-count">{calculateHoursFromDays(request.total_days)} hrs</span>
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
                            <div className="ms-2">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </Table>
                </div>
                
                {filteredRequests.length === 0 && (
                  <div className="text-center p-4">
                    <XCircle size={48} className="text-danger mb-3" />
                    <p className="text-muted">No rejected leave requests found.</p>
                    <small className="text-muted">Rejected leave requests will appear here.</small>
                  </div>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
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
            <Form.Label>Manager Remarks (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any comments or remarks..."
            />
          </Form.Group>
          {actionType === 'approve' && (
            <Alert variant="info" className="mt-3">
              <small>
                <strong>Note:</strong> Approving this request will forward it to HR for final processing and pay terms determination.
              </small>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={actionType === 'approve' ? 'success' : 'danger'} 
            onClick={confirmAction}
          >
            {actionType === 'approve' ? 'Approve & Forward to HR' : 'Reject Request'}
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
                            {calculateHoursFromDays(selectedLeaveForView.total_days)} Hours
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

export default ManagerLeaveManagement;
