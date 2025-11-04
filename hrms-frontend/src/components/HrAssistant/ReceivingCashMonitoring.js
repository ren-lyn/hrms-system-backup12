import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Alert } from 'react-bootstrap';
import { Search, DollarSign, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { 
  fetchCashAdvanceRequests, 
  updateMoneyReceivedStatus 
} from '../../api/cashAdvances';
import './ReceivingCashMonitoring.css';

const ReceivingCashMonitoring = () => {
  const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [filterStatus, setFilterStatus] = useState('all'); // all, received, not_received, not_set

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const requestsResponse = await fetchCashAdvanceRequests({ status: 'approved' });
      
      let newRequests = [];
      
      if (requestsResponse) {
        // Handle paginated response structure (Laravel paginator)
        if (requestsResponse.data && Array.isArray(requestsResponse.data)) {
          newRequests = requestsResponse.data;
        } 
        // Handle direct array response
        else if (Array.isArray(requestsResponse)) {
          newRequests = requestsResponse;
        }
        // Handle nested data structure (if wrapped)
        else if (requestsResponse.data?.data && Array.isArray(requestsResponse.data.data)) {
          newRequests = requestsResponse.data.data;
        }
      }
      
      // Filter to only show approved requests (extra safety check)
      newRequests = newRequests.filter(req => req.status === 'approved');
      
      setCashAdvanceRequests(newRequests || []);
    } catch (error) {
      console.error('Error loading cash advance data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Set empty array to prevent undefined errors
      setCashAdvanceRequests([]);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Failed to load cash advance requests. Please check your connection and try again.';
      
      showAlert(errorMessage, 'danger');
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
  };

  const handleMoneyReceivedStatusChange = async (requestId, newStatus) => {
    if (!newStatus) return;
    
    try {
      await updateMoneyReceivedStatus(requestId, newStatus);
      setCashAdvanceRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { ...request, money_received_status: newStatus }
            : request
        )
      );
      showAlert('Money received status updated successfully', 'success');
    } catch (error) {
      showAlert('Failed to update money received status. Please try again.', 'danger');
    }
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

  const getMoneyReceivedStatusBadge = (status) => {
    if (!status) {
      return <Badge bg="secondary">Not Set</Badge>;
    }
    return status === 'received' 
      ? <Badge bg="success">Received</Badge>
      : <Badge bg="warning">Not Received</Badge>;
  };

  // Filter requests
  const filteredRequests = cashAdvanceRequests.filter(request => {
    const matchesSearch = request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = (() => {
      switch (filterStatus) {
        case 'received':
          return request.money_received_status === 'received';
        case 'not_received':
          return request.money_received_status === 'not_received';
        case 'not_set':
          return !request.money_received_status;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesFilter && request.status === 'approved';
  });

  // Calculate statistics
  const stats = {
    total: cashAdvanceRequests.length,
    received: cashAdvanceRequests.filter(r => r.money_received_status === 'received').length,
    notReceived: cashAdvanceRequests.filter(r => r.money_received_status === 'not_received').length,
    notSet: cashAdvanceRequests.filter(r => !r.money_received_status).length,
    totalAmount: cashAdvanceRequests.reduce((sum, r) => sum + parseFloat(r.amount_ca || 0), 0)
  };

  return (
    <div className="receiving-cash-monitoring">
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <div className="monitoring-header">
        <h4 className="mb-0">Receiving Cash Monitoring</h4>
        <p className="text-muted mb-4">Track and monitor cash advance distribution status</p>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card 
            className={`stat-card ${filterStatus === 'all' ? 'stat-card-active' : ''}`}
            onClick={() => setFilterStatus('all')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="stat-label">Total Approved</div>
              <div className="stat-value">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card 
            className={`stat-card stat-received ${filterStatus === 'received' ? 'stat-card-active' : ''}`}
            onClick={() => setFilterStatus('received')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="stat-label">
                <CheckCircle size={16} className="me-1" />
                Received
              </div>
              <div className="stat-value text-success">{stats.received}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card 
            className={`stat-card stat-not-received ${filterStatus === 'not_received' ? 'stat-card-active' : ''}`}
            onClick={() => setFilterStatus('not_received')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="stat-label">
                <XCircle size={16} className="me-1" />
                Not Received
              </div>
              <div className="stat-value text-warning">{stats.notReceived}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card 
            className={`stat-card stat-not-set ${filterStatus === 'not_set' ? 'stat-card-active' : ''}`}
            onClick={() => setFilterStatus('not_set')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="stat-label">Not Set</div>
              <div className="stat-value text-secondary">{stats.notSet}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search Employee or Department"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="received">Received</option>
            <option value="not_received">Not Received</option>
            <option value="not_set">Not Set</option>
          </Form.Select>
        </Col>
        <Col md={2} className="text-end">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={loadData}
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </Button>
        </Col>
      </Row>

      {/* Results Summary */}
      <div className="mb-3">
        <small className="text-muted">
          Showing {filteredRequests.length} of {stats.total} approved requests
        </small>
      </div>

      {/* Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <Table hover className="monitoring-table mb-0">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Date Filed</th>
                  <th>Amount</th>
                  <th>Collection Date</th>
                  <th>Status</th>
                  <th>Money Received</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-4">
                      No approved cash advance requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="employee-info">
                          <strong>{request.name}</strong>
                          <div className="small text-muted">ID: {request.user_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className="department-badge">{request.department}</span>
                      </td>
                      <td>{formatDate(request.date_field)}</td>
                      <td>
                        <strong className="amount-display">{formatAmount(request.amount_ca)}</strong>
                      </td>
                      <td>
                        {request.collection_date 
                          ? formatDate(request.collection_date)
                          : <span className="text-muted">N/A</span>
                        }
                      </td>
                      <td>
                        {getMoneyReceivedStatusBadge(request.money_received_status)}
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={request.money_received_status || ''}
                          onChange={(e) => handleMoneyReceivedStatusChange(request.id, e.target.value)}
                          className="status-select"
                          disabled={!!request.money_received_status}
                          title={request.money_received_status ? 'This status cannot be changed once set' : 'Select money received status'}
                        >
                          <option value="">-- Select --</option>
                          <option value="received">Received</option>
                          <option value="not_received">Not Received</option>
                        </Form.Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ReceivingCashMonitoring;

