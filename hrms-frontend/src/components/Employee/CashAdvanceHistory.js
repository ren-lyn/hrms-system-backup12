import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge, Button } from 'react-bootstrap';
import { fetchMyCashAdvances, fetchMyCashAdvanceStats } from '../../api/cashAdvance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faHistory, faChevronDown, faChevronUp, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import './CashAdvanceHistory.css';

const CashAdvanceHistory = ({ onViewRequest, onRequestNew }) => {
  const [stats, setStats] = useState({ total_amount_approved: 0, total_requests: 0, pending_requests: 0, approved_requests: 0, rejected_requests: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    fetchDataOptimized();
  }, []);

  const fetchDataOptimized = async () => {
    // Check cache first for instant display
    const cacheKey = 'cashAdvanceCache';
    const cacheTimeKey = 'cashAdvanceCacheTime';
    
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();
    const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
    const isCacheValid = cacheAge < 2 * 60 * 1000; // 2 minutes cache
    
    if (cachedData && isCacheValid) {
      try {
        const data = JSON.parse(cachedData);
        setStats(data.stats);
        setHistory(data.history);
        // Don't show loading, just update silently in background
        fetchFreshData();
        return;
      } catch (e) {
        console.error('Error parsing cached data:', e);
      }
    }
    
    // No cache or expired, fetch with loading indicator
    setLoading(true);
    await fetchFreshData();
  };

  const fetchFreshData = async () => {
    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetchMyCashAdvanceStats().catch(e => {
          console.error('Error fetching stats:', e);
          return { data: { total_amount_approved: 0, total_requests: 0, pending_requests: 0, approved_requests: 0, rejected_requests: 0 } };
        }),
        fetchMyCashAdvances().catch(e => {
          console.error('Error fetching history:', e);
          return { data: { data: [] } };
        })
      ]);
      
      const statsData = statsResponse.data || { total_amount_approved: 0, total_requests: 0, pending_requests: 0, approved_requests: 0, rejected_requests: 0 };
      const historyData = historyResponse.data?.data || historyResponse.data || [];
      
      setStats(statsData);
      setHistory(historyData);
      
      // Update cache only if we got valid data
      if (statsData || historyData.length >= 0) {
        const cacheKey = 'cashAdvanceCache';
        const cacheTimeKey = 'cashAdvanceCacheTime';
        localStorage.setItem(cacheKey, JSON.stringify({ stats: statsData, history: historyData }));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      }
    } catch (err) {
      console.error('Error fetching cash advance data:', err);
      // Use empty/default data if failed
      setStats({ total_amount_approved: 0, total_requests: 0, pending_requests: 0, approved_requests: 0, rejected_requests: 0 });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpand = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleFilterClick = (filterType) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
    // Collapse all rows when filtering
    setExpandedRows(new Set());
  };

  const filteredHistory = activeFilter 
    ? history.filter(request => request.status.toLowerCase() === activeFilter)
    : history;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { variant: 'success', label: 'Approved' },
      pending: { variant: 'warning', label: 'Pending' },
      rejected: { variant: 'danger', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge bg={config.variant}>{config.label}</Badge>;
  };

  // Show loading only if we truly have no data
  if (loading && stats.total_requests === 0 && history.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="cash-advance-history-container">
      {/* Summary Card */}
      <Card className="mb-4 summary-card">
        <Card.Header className="summary-header d-flex justify-content-between align-items-center">
          <div>
            <FontAwesomeIcon icon={faDollarSign} className="me-2" />
            <span>Total Amount Deducted</span>
          </div>
          {onRequestNew && (
            <Button 
              variant="light" 
              size="sm"
              onClick={onRequestNew}
              className="request-btn"
            >
              <FontAwesomeIcon icon={faPlusCircle} className="me-1" />
              Request Cash Advance
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          <div className="summary-amount">
            {formatCurrency(stats?.total_amount_approved || 0)}
          </div>
          <div className="summary-stats">
            <div 
              className={`stat-item ${activeFilter === null ? 'stat-active' : ''}`}
              onClick={() => handleFilterClick(null)}
            >
              <span className="stat-label">Total Requests:</span>
              <span className="stat-value">{stats?.total_requests || 0}</span>
            </div>
            <div 
              className={`stat-item ${activeFilter === 'approved' ? 'stat-active' : ''}`}
              onClick={() => handleFilterClick('approved')}
            >
              <span className="stat-label">Approved:</span>
              <span className="stat-value text-success">{stats?.approved_requests || 0}</span>
            </div>
            <div 
              className={`stat-item ${activeFilter === 'pending' ? 'stat-active' : ''}`}
              onClick={() => handleFilterClick('pending')}
            >
              <span className="stat-label">Pending:</span>
              <span className="stat-value text-warning">{stats?.pending_requests || 0}</span>
            </div>
            <div 
              className={`stat-item ${activeFilter === 'rejected' ? 'stat-active' : ''}`}
              onClick={() => handleFilterClick('rejected')}
            >
              <span className="stat-label">Rejected:</span>
              <span className="stat-value text-danger">{stats?.rejected_requests || 0}</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* History Section */}
      <Card>
        <Card.Header className="history-header">
          <FontAwesomeIcon icon={faHistory} className="me-2" />
          <span>Transaction History</span>
        </Card.Header>
        <Card.Body>
          {history.length === 0 ? (
            <div className="text-center text-muted p-4">
              No cash advance requests found.
            </div>
          ) : (
            <div>
              {activeFilter && (
                <div className="filter-indicator mb-3">
                  <Badge bg="info">
                    Showing {activeFilter} requests only
                    <button 
                      className="btn-close ms-2" 
                      style={{ fontSize: '0.7rem' }}
                      onClick={() => handleFilterClick(null)}
                      aria-label="Clear filter"
                    ></button>
                  </Badge>
                </div>
              )}
              <div className="table-responsive">
                <Table hover className="history-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Actions</th>
                      <th>Request Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Processed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted p-4">
                          No {activeFilter} cash advance requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((request) => (
                    <React.Fragment key={request.id}>
                      <tr className="history-row">
                        <td>
                          <button
                            className="expand-btn"
                            onClick={() => toggleRowExpand(request.id)}
                          >
                            <FontAwesomeIcon
                              icon={expandedRows.has(request.id) ? faChevronUp : faChevronDown}
                            />
                          </button>
                        </td>
                        <td>{formatDate(request.created_at)}</td>
                        <td className="amount-cell">{formatCurrency(request.amount_ca)}</td>
                        <td>{getStatusBadge(request.status)}</td>
                        <td>
                          {request.processed_at
                            ? formatDate(request.processed_at)
                            : '-'}
                        </td>
                      </tr>
                      {expandedRows.has(request.id) && (
                        <tr className="details-row">
                          <td colSpan="5" className="details-cell">
                            <div className="details-content">
                              <div className="details-grid">
                                <div className="detail-item">
                                  <strong>Reason:</strong>
                                  <p>{request.reason || 'N/A'}</p>
                                </div>
                                <div className="detail-item">
                                  <strong>Department:</strong>
                                  <p>{request.department || 'N/A'}</p>
                                </div>
                                {request.rem_ca && (
                                  <div className="detail-item">
                                    <strong>Remittance/Deduction:</strong>
                                    <p>{request.rem_ca}</p>
                                  </div>
                                )}
                                {request.processedBy && (
                                  <div className="detail-item">
                                    <strong>Processed By:</strong>
                                    <p>
                                      {request.processedBy.first_name}{' '}
                                      {request.processedBy.last_name}
                                    </p>
                                  </div>
                                )}
                                {request.hr_remarks && (
                                  <div className="detail-item">
                                    <strong>HR Remarks:</strong>
                                    <p>{request.hr_remarks}</p>
                                  </div>
                                )}
                              </div>
                              {onViewRequest && (
                                <div className="details-actions">
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => onViewRequest(request.id)}
                                  >
                                    View Full Details
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default CashAdvanceHistory;

