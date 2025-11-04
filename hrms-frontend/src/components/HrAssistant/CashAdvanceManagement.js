import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Modal, Alert, Nav, Tab } from 'react-bootstrap';
import { Search, DollarSign, Download, Eye, Check, X, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { 
  fetchCashAdvanceRequests, 
  getCashAdvanceStats, 
  approveCashAdvanceRequest, 
  rejectCashAdvanceRequest,
  downloadCashAdvancePdf
} from '../../api/cashAdvances';
import jsPDF from 'jspdf';
import './CashAdvanceManagement.css';

const CashAdvanceManagement = () => {
  const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
  const [stats, setStats] = useState({
    total_requests: 0,
    pending_requests: 0,
    approved_requests: 0,
    rejected_requests: 0,
    total_amount_requested: 0,
    total_amount_approved: 0,
    recent_requests: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [editableAmount, setEditableAmount] = useState('');
  const [editableRemCA, setEditableRemCA] = useState('');

  useEffect(() => {
    // Load data once when component mounts
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

  // Single instant data loading function
  const loadData = async () => {
    try {
      const [requestsResponse, statsResponse] = await Promise.all([
        fetchCashAdvanceRequests(),
        getCashAdvanceStats()
      ]);
      
      console.log('Cash Advance Requests Response:', requestsResponse);
      console.log('Stats Response:', statsResponse);
      
      // Handle paginated response - Laravel paginator wraps data in 'data' property
      let newRequests = [];
      if (requestsResponse) {
        // Handle paginated response structure (Laravel paginator)
        if (requestsResponse.data && Array.isArray(requestsResponse.data)) {
          newRequests = requestsResponse.data;
        } 
        // If it's already an array, use it directly
        else if (Array.isArray(requestsResponse)) {
          newRequests = requestsResponse;
        }
        // If it has a data.data (nested paginated response)
        else if (requestsResponse.data?.data && Array.isArray(requestsResponse.data.data)) {
          newRequests = requestsResponse.data.data;
        }
        // If data is an object but not an array, initialize empty
        else if (requestsResponse.data && !Array.isArray(requestsResponse.data)) {
          newRequests = [];
        }
      }
      
      // Handle stats response - can be direct object or wrapped in data
      let newStats = {
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        total_amount_requested: 0,
        total_amount_approved: 0,
        recent_requests: []
      };
      
      if (statsResponse) {
        if (statsResponse.data) {
          newStats = { ...newStats, ...statsResponse.data };
        } else if (typeof statsResponse === 'object' && !Array.isArray(statsResponse)) {
          newStats = { ...newStats, ...statsResponse };
        }
      }
      
      console.log('Processed Requests:', newRequests);
      console.log('Processed Stats:', newStats);
      console.log('Number of requests loaded:', newRequests.length);
      
      // Update data instantly
      setCashAdvanceRequests(newRequests || []);
      setStats(newStats);
      
    } catch (error) {
      console.error('Error loading cash advance data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Set default empty values to prevent undefined errors
      setCashAdvanceRequests([]);
      setStats({
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        total_amount_requested: 0,
        total_amount_approved: 0,
        recent_requests: []
      });
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Failed to load cash advance data. Please try again.';
      
      showAlert(errorMessage, 'danger');
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    // Faster alert dismissal for better performance
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 2500);
  };

  const handleAction = async (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    // Initialize editable fields with current values
    setEditableAmount(request.amount_ca?.toString() || '');
    setEditableRemCA(request.rem_ca?.toString() || '');
    setShowModal(true);
  };

  const confirmAction = async () => {
    try {
      // Prepare update data with edited amounts
      const updateData = {
        hr_remarks: remarks,
        amount_ca: editableAmount ? parseFloat(editableAmount) : selectedRequest.amount_ca,
        rem_ca: editableRemCA || selectedRequest.rem_ca
      };

      if (actionType === 'approve') {
        await approveCashAdvanceRequest(selectedRequest.id, remarks, updateData.amount_ca, updateData.rem_ca);
        showAlert(`✅ ${selectedRequest.name} - Request approved with updated amounts!`, 'success');
      } else if (actionType === 'reject') {
        await rejectCashAdvanceRequest(selectedRequest.id, remarks, updateData.amount_ca, updateData.rem_ca);
        showAlert(`❌ ${selectedRequest.name} - Request rejected`, 'warning');
      }
      
      // Fast cleanup
      setShowModal(false);
      setSelectedRequest(null);
      setRemarks('');
      setActionType('');
      setEditableAmount('');
      setEditableRemCA('');
      
      // Quick data refresh
      loadData();
    } catch (error) {
      showAlert('Action failed. Please try again.', 'danger');
    }
  };

  const filteredRequests = cashAdvanceRequests.filter(request => {
    const matchesSearch = request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by active tab
    let matchesTab = false;
    switch (activeTab) {
      case 'pending':
        matchesTab = request.status === 'pending';
        break;
      case 'approved':
        matchesTab = request.status === 'approved';
        break;
      case 'rejected':
        matchesTab = request.status === 'rejected';
        break;
      default:
        matchesTab = true;
    }
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const handleDownloadPdf = async () => {
    if (!selectedRequest) return;
    
    try {
      setDownloadingPdf(true);
      await downloadCashAdvancePdf(selectedRequest.id);
      showAlert(`✅ PDF downloaded successfully for ${selectedRequest.name}`, 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showAlert('❌ Failed to download PDF. Please try again.', 'danger');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportAll = async () => {
    if (filteredRequests.length === 0) {
      showAlert('No cash advance requests to export.', 'warning');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const tableStartY = 60;
      let yPosition = tableStartY;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cash Advance Requests Report', pageWidth / 2, 20, { align: 'center' });
      
      // Tab label
      const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${tabLabel} Requests`, pageWidth / 2, 30, { align: 'center' });
      
      // Date and time
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, 40);
      pdf.text(`Total Records: ${filteredRequests.length}`, pageWidth - margin, 40, { align: 'right' });

      // Table headers
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const headers = ['Employee', 'Company', 'Department', 'Date Filed', 'Amount', 'Status'];
      const colWidths = [35, 35, 30, 25, 25, 20];
      let xPosition = margin;

      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });

      yPosition += 5;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Table data
      pdf.setFont('helvetica', 'normal');
      filteredRequests.forEach((request, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
          
          // Redraw headers on new page
          pdf.setFont('helvetica', 'bold');
          xPosition = margin;
          headers.forEach((header, headerIndex) => {
            pdf.text(header, xPosition, yPosition);
            xPosition += colWidths[headerIndex];
          });
          yPosition += 5;
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
          pdf.setFont('helvetica', 'normal');
        }

        // Clean amount formatting - extract only numeric value
        const cleanAmount = (amount) => {
          if (!amount) return '0.00';
          // Remove any non-numeric characters except decimal point
          const numericValue = String(amount).replace(/[^\d.-]/g, '');
          const parsedAmount = parseFloat(numericValue) || 0;
          return parsedAmount.toFixed(2);
        };

        const rowData = [
          request.name || 'N/A',
          request.company || 'N/A',
          request.department || 'N/A',
          formatDate(request.date_field),
          cleanAmount(request.amount_ca),
          request.status.charAt(0).toUpperCase() + request.status.slice(1)
        ];

        xPosition = margin;
        rowData.forEach((data, colIndex) => {
          const cellData = data.length > 15 ? data.substring(0, 15) + '...' : data;
          pdf.text(cellData, xPosition, yPosition);
          xPosition += colWidths[colIndex];
        });

        yPosition += 5;
      });

      // Footer
      pdf.setFontSize(8);
      pdf.text(`Total Records: ${filteredRequests.length}`, margin, pageHeight - 15);
      pdf.text('Cabuyao Concrete Development Corporation', pageWidth - margin, pageHeight - 15, { align: 'right' });
      
      // Save the PDF
      const fileName = `Cash_Advance_${tabLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showAlert(`Report exported successfully: ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Error exporting report:', error);
      showAlert('Error generating report. Please try again.', 'danger');
    }
  };

  // No loading screen - show content immediately for instant feel

  return (
    <div className="cash-advance-management" style={{ 
      height: '100vh',
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
                <h6 className="mb-0">Request Status</h6>
              </div>
              <Row className="text-center">
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Total</div>
                    <div className="stat-value">{stats.total_requests}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value text-warning">{stats.pending_requests}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Approved</div>
                    <div className="stat-value text-success">{stats.approved_requests}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Rejected</div>
                    <div className="stat-value text-danger">{stats.rejected_requests}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="stats-card">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="stats-icon me-3">
                  <DollarSign size={20} />
                </div>
                <h6 className="mb-0">Amount Overview</h6>
              </div>
              <Row className="text-center">
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Total Requested</div>
                    <div className="stat-value">{formatAmount(stats.total_amount_requested)}</div>
                  </div>
                </Col>
                <Col>
                  <div className="stat-item">
                    <div className="stat-label">Total Approved</div>
                    <div className="stat-value text-success">{formatAmount(stats.total_amount_approved)}</div>
                  </div>
                </Col>
              </Row>
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
              placeholder="Search Employee, Department, or Company"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Form.Select>
        </Col>
        <Col md={5} className="text-end">
          <div className="d-flex align-items-center justify-content-end gap-3">
            <small className="text-muted">
              Showing {filteredRequests.length} of {cashAdvanceRequests.length} requests
            </small>
            
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={handleExportAll}
              disabled={filteredRequests.length === 0}
              title="Export filtered cash advance requests to PDF"
            >
              <Download size={16} className="me-1" />
              Export
            </Button>
          </div>
        </Col>
      </Row>

      {/* Tabbed Cash Advance Requests */}
      <Card>
        <Card.Body className="p-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-bottom">
              <Nav.Item>
                <Nav.Link eventKey="pending" className="d-flex align-items-center">
                  <Clock size={16} className="me-2" />
                  Pending Requests
                  <Badge bg="warning" className="ms-2">
                    {cashAdvanceRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="approved" className="d-flex align-items-center">
                  <CheckCircle size={16} className="me-2" />
                  Approved Requests
                  <Badge bg="success" className="ms-2">
                    {cashAdvanceRequests.filter(r => r.status === 'approved').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rejected" className="d-flex align-items-center">
                  <XCircle size={16} className="me-2" />
                  Rejected Requests
                  <Badge bg="danger" className="ms-2">
                    {cashAdvanceRequests.filter(r => r.status === 'rejected').length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
            </Nav>
            
            <Tab.Content>
              <Tab.Pane eventKey="pending">
                <div className="cash-advance-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
            <Table responsive className="cash-advance-table" style={{ minWidth: '1200px' }}>
              <thead>
              <tr>
                <th>👤 Employee Name</th>
                <th>Company</th>
                <th>Department</th>
                <th>Date Filed</th>
                <th>Amount Requested</th>
                <th>Remaining CA</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="employee-info">
                      <strong>{request.name}</strong>
                      <div className="small text-muted">ID: {request.user_id}</div>
                    </div>
                  </td>
                  <td>
                    <span className="company-text">{request.company}</span>
                  </td>
                  <td>
                    <span className="department-text">{request.department}</span>
                  </td>
                  <td>{formatDate(request.date_field)}</td>
                  <td>
                    <strong className="amount-text">{formatAmount(request.amount_ca)}</strong>
                  </td>
                  <td>
                    <span className="remaining-ca-text">
                      {request.rem_ca ? formatAmount(request.rem_ca) : 'N/A'}
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(request.status)}
                    {request.hr_remarks && (
                      <div className="small text-muted mt-1">
                        <em>Remarks: {request.hr_remarks.substring(0, 30)}...</em>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-1"
                        onClick={() => handleAction(request, 'view')}
                        title="View Form"
                      >
                        <Eye size={14} />
                      </Button>
                          <Button
                            variant="success"
                            size="sm"
                            className="me-1"
                            onClick={() => handleAction(request, 'approve')}
                            title="Approve Request"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleAction(request, 'reject')}
                            title="Reject Request"
                          >
                            <X size={14} />
                          </Button>
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
                    <p className="text-muted">No pending cash advance requests found.</p>
                    {searchTerm && (
                      <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </Tab.Pane>
              
              <Tab.Pane eventKey="approved">
                <div className="cash-advance-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
                  <Table responsive className="cash-advance-table" style={{ minWidth: '1200px' }}>
                    <thead>
                    <tr>
                      <th>👤 Employee Name</th>
                      <th>Company</th>
                      <th>Department</th>
                      <th>Date Filed</th>
                      <th>Amount Requested</th>
                      <th>Remaining CA</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <div className="employee-info">
                            <strong>{request.name}</strong>
                            <div className="small text-muted">ID: {request.user_id}</div>
                          </div>
                        </td>
                        <td>
                          <span className="company-text">{request.company}</span>
                        </td>
                        <td>
                          <span className="department-text">{request.department}</span>
                        </td>
                        <td>{formatDate(request.date_field)}</td>
                        <td>
                          <strong className="amount-text">{formatAmount(request.amount_ca)}</strong>
                        </td>
                        <td>
                          <span className="remaining-ca-text">
                            {request.rem_ca ? formatAmount(request.rem_ca) : 'N/A'}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(request.status)}
                          {request.hr_remarks && (
                            <div className="small text-muted mt-1">
                              <em>Remarks: {request.hr_remarks.substring(0, 30)}...</em>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleAction(request, 'view')}
                              title="View Form"
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </Table>
                </div>
                
                {filteredRequests.length === 0 && (
                  <div className="text-center p-4">
                    <CheckCircle size={48} className="text-muted mb-3" />
                    <p className="text-muted">No approved cash advance requests found.</p>
                    {searchTerm && (
                      <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </Tab.Pane>
              
              <Tab.Pane eventKey="rejected">
                <div className="cash-advance-table-container" style={{ position: 'relative', maxHeight: '500px', overflowY: 'auto' }}>
                  <Table responsive className="cash-advance-table" style={{ minWidth: '1200px' }}>
                    <thead>
                    <tr>
                      <th>👤 Employee Name</th>
                      <th>Company</th>
                      <th>Department</th>
                      <th>Date Filed</th>
                      <th>Amount Requested</th>
                      <th>Remaining CA</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <div className="employee-info">
                            <strong>{request.name}</strong>
                            <div className="small text-muted">ID: {request.user_id}</div>
                          </div>
                        </td>
                        <td>
                          <span className="company-text">{request.company}</span>
                        </td>
                        <td>
                          <span className="department-text">{request.department}</span>
                        </td>
                        <td>{formatDate(request.date_field)}</td>
                        <td>
                          <strong className="amount-text">{formatAmount(request.amount_ca)}</strong>
                        </td>
                        <td>
                          <span className="remaining-ca-text">
                            {request.rem_ca ? formatAmount(request.rem_ca) : 'N/A'}
                          </span>
                        </td>
                        <td>
                          {getStatusBadge(request.status)}
                          {request.hr_remarks && (
                            <div className="small text-muted mt-1">
                              <em>Remarks: {request.hr_remarks.substring(0, 30)}...</em>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleAction(request, 'view')}
                              title="View Form"
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </Table>
                </div>
                
                {filteredRequests.length === 0 && (
                  <div className="text-center p-4">
                    <XCircle size={48} className="text-muted mb-3" />
                    <p className="text-muted">No rejected cash advance requests found.</p>
              {searchTerm && (
                <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' && 'Approve Cash Advance Request'}
            {actionType === 'reject' && 'Reject Cash Advance Request'}
            {actionType === 'view' && 'Cash Advance Form - Employee Submission'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              {/* Replicate the exact employee form */}
              <div className="employee-cash-advance-form">
                {/* Form Header */}
                <div className="text-center mb-4">
                  <h4 className="text-dark">CASH ADVANCE FORM</h4>
                  <small className="text-muted d-block">Employee Submission - {formatDate(selectedRequest.date_field)}</small>
                  <small className="text-info d-block">Submitted: {new Date(selectedRequest.created_at).toLocaleString()}</small>
                </div>
                
                {/* Basic Information Card - Same layout as employee form */}
                <div className="form-card-replica mb-4">
                  <Row className="g-4">
                    <Col md={6}>
                      <div className="form-field-replica">
                        <label className="field-label-replica">Company</label>
                        <div className="underline-input-replica">
                          <span className="auto-filled-text-replica">{selectedRequest.company}</span>
                        </div>
                      </div>
                      <div className="form-field-replica">
                        <label className="field-label-replica">Name</label>
                        <div className="underline-input-replica">
                          <span className="auto-filled-text-replica">{selectedRequest.name}</span>
                        </div>
                      </div>
                      <div className="form-field-replica">
                        <label className="field-label-replica">Amount C.A. : *</label>
                        <div className="underline-input-replica">
                          {actionType === 'view' ? (
                            <span className="editable-field-replica amount-highlight">{formatAmount(selectedRequest.amount_ca)}</span>
                          ) : (
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              value={editableAmount}
                              onChange={(e) => setEditableAmount(e.target.value)}
                              className="editable-amount-input"
                              placeholder="Enter amount"
                            />
                          )}
                        </div>
                        {(actionType !== 'view' && parseFloat(editableAmount) !== selectedRequest.amount_ca) && (
                          <small className="text-muted">Original: {formatAmount(selectedRequest.amount_ca)}</small>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="form-field-replica">
                        <label className="field-label-replica">Date Field</label>
                        <div className="underline-input-replica">
                          <span className="auto-filled-text-replica">{formatDate(selectedRequest.date_field)}</span>
                        </div>
                      </div>
                      <div className="form-field-replica">
                        <label className="field-label-replica">Department</label>
                        <div className="underline-input-replica">
                          <span className="auto-filled-text-replica">{selectedRequest.department}</span>
                        </div>
                      </div>
                      <div className="form-field-replica">
                        <label className="field-label-replica">REM C.A. :</label>
                        <div className="underline-input-replica">
                          {actionType === 'view' ? (
                            <span className="editable-field-replica">{selectedRequest.rem_ca || '(Not specified)'}</span>
                          ) : (
                            <Form.Control
                              type="text"
                              value={editableRemCA}
                              onChange={(e) => setEditableRemCA(e.target.value)}
                              className="editable-remca-input"
                              placeholder="Enter remaining amount"
                            />
                          )}
                        </div>
                        {(actionType !== 'view' && selectedRequest.rem_ca && editableRemCA !== selectedRequest.rem_ca) && (
                          <small className="text-muted">Original: {selectedRequest.rem_ca}</small>
                        )}
                      </div>
                    </Col>
                  </Row>
                </div>
                
                {/* Reason Section - Same layout as employee form */}
                <div className="form-card-replica mb-4">
                  <div className="form-field-replica">
                    <label className="field-label-replica">Reason: *</label>
                    <div className="reason-lines-replica">
                      <div className="reason-textarea-replica">
                        {selectedRequest.reason}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Agreement Section - Same as employee form */}
                <div className="form-card-replica agreement-card-replica mb-4">
                  <div className="agreement-header-replica">
                    <h5>AGREEMENT & AUTHORITY TO DEDUCT (KASUNDUAN AT AWTORIDAD NA MAGBAWAS)</h5>
                  </div>
                  <div className="agreement-text-replica">
                    <p>
                      Ako si <span className="employee-name-filled-replica">{selectedRequest.name}</span> empleyado ng <span className="company-name-replica">{selectedRequest.company}</span>, ay sumasang-ayon na ako ay kakitaan sa araw ng sahod Linggo-linggo bilang kabayaran sa Cash Advance o perang inutang sa kumpanya hanggang sa ito ay matapos at mabayaran. Kasabot nito, kung ako ay matanggal (terminated) o umalis ng kusa (resigned) sa trabaho, maaaring ibawas ng kumpanya ang natitirang utang sa huling bayad at final pay at nakang makuluna. Kapag hindi naging sapat ang final pay at may balance pang utang, ang kasundang ito ay maaaring gamitin ng kumpanya sa pagasasang ng reklamo base sa pag-iwas sa responsibilidad ng pagbabayad nang hiniram at magsilbing legal na dokumento ito at katibayan ng pagpapaasunduan sa paghiram at pagbabautang ng pera.
                    </p>
                  </div>
                </div>
                
                {/* Status and Processing Info */}
                {(selectedRequest.status !== 'pending' || selectedRequest.hr_remarks) && (
                  <div className="processing-info-section">
                    <hr className="my-4" />
                    <h6 className="text-secondary mb-3">Processing Information</h6>
                    
                    <Row className="mb-3">
                      <Col md={6}>
                        <div className="form-field-replica">
                          <label className="field-label-replica">Status:</label>
                          <div className="status-display">{getStatusBadge(selectedRequest.status)}</div>
                        </div>
                      </Col>
                      {selectedRequest.processed_at && (
                        <Col md={6}>
                          <div className="form-field-replica">
                            <label className="field-label-replica">Processed Date:</label>
                            <div className="underline-input-replica">
                              <span className="auto-filled-text-replica">{formatDate(selectedRequest.processed_at)}</span>
                            </div>
                          </div>
                        </Col>
                      )}
                    </Row>
                    
                    {selectedRequest.hr_remarks && (
                      <div className="form-field-replica">
                        <label className="field-label-replica">HR Remarks:</label>
                        <div className="hr-remarks-display">
                          {selectedRequest.hr_remarks}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* HR Action Section */}
              {actionType !== 'view' && (
                <div className="hr-action-section">
                  <hr className="my-4" />
                  <h6 className="text-secondary mb-3">HR Action</h6>
                  <Form.Group>
                    <Form.Label>
                      <strong>HR Remarks {actionType === 'reject' ? '(Required)' : '(Optional)'}</strong>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={
                        actionType === 'approve' 
                          ? "Add any approval comments or conditions..."
                          : "Please provide reason for rejection..."
                      }
                    />
                  </Form.Group>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div>
              {actionType === 'view' && selectedRequest && (
                <Button 
                  variant="outline-success" 
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="me-2"
                >
                  <Download size={16} className="me-1" />
                  {downloadingPdf ? 'Exporting...' : 'Export PDF'}
                </Button>
              )}
            </div>
            <div>
              <Button variant="secondary" onClick={() => setShowModal(false)} className="me-2">
                {actionType === 'view' ? 'Close' : 'Cancel'}
              </Button>
              {actionType !== 'view' && (
                <Button 
                  variant={actionType === 'approve' ? 'success' : 'danger'} 
                  onClick={confirmAction}
                  disabled={actionType === 'reject' && !remarks.trim()}
                >
                  {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CashAdvanceManagement;
