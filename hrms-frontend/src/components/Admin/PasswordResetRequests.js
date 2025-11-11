import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './PasswordResetRequests.css';

const statusConfig = {
  pending: { label: 'Pending', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  completed: { label: 'Completed', color: '#2563eb' },
};

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    action: null,
  });
  const [resultModal, setResultModal] = useState({
    open: false,
    variant: 'success',
    title: '',
    message: '',
  });

  const token = useMemo(() => localStorage.getItem('token') || localStorage.getItem('auth_token'), []);
  const fetchRequests = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await axios.get('http://localhost:8000/api/password-change-requests', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to load password reset requests. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => fetchRequests(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((req) => req.status === filter);
  }, [filter, requests]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return date.toLocaleString();
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setDecisionNotes('');
  };

  const openRequest = (req) => {
    setSelectedRequest(req);
    setDecisionNotes(req.decision_notes || '');
  };

  const requestAction = (action) => {
    if (!selectedRequest) return;
    setConfirmModal({
      open: true,
      action,
    });
  };

  const closeConfirm = () => {
    setConfirmModal({
      open: false,
      action: null,
    });
  };

  const showResult = (variant, title, message) => {
    setResultModal({
      open: true,
      variant,
      title,
      message,
    });
  };

  const closeResult = () => {
    setResultModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const buildAttachmentSrc = (req, slot) => {
    if (!req) return null;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `http://localhost:8000/api/password-change-requests/${req.id}/attachments/${slot}${query}`;
  };

  const performApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await axios.post(
        `http://localhost:8000/api/password-change-requests/${selectedRequest.id}/approve`,
        { notes: decisionNotes || null },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );
      toast.success('Reset request approved. Email instructions sent to the user.');
      const name = selectedRequest?.full_name || 'the request';
      closeModal();
      closeConfirm();
      showResult('success', 'Successfully Approved', 'The request has been approved.');
      fetchRequests(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve the request.');
      closeConfirm();
    } finally {
      setActionLoading(false);
    }
  };

  const performReject = async () => {
    if (!selectedRequest) return;
    if (!decisionNotes.trim()) {
      toast.error('Please provide a reason before declining the request.');
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(
        `http://localhost:8000/api/password-change-requests/${selectedRequest.id}/reject`,
        { notes: decisionNotes.trim() },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );
      toast.info('Reset request declined. The employee has been notified in the system.');
      const name = selectedRequest?.full_name || 'the request';
      closeModal();
      closeConfirm();
      showResult('decline', 'Successfully Declined', 'The request has been declined.');
      fetchRequests(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to decline the request.');
      closeConfirm();
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    requestAction('approve');
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    requestAction('reject');
  };

  const renderStatus = (status) => {
    const info = statusConfig[status] || { label: status, color: '#475569' };
    return (
      <span className="prr-status-pill" style={{ backgroundColor: info.color }}>
        {info.label}
      </span>
    );
  };

  return (
    <div className="prr-container">
      <div className="prr-header">
        <div>
          <h2>Password Reset Requests</h2>
          <p className="prr-subtitle">
            Review employee identity requests, approve or decline, and track audit information.
          </p>
        </div>
        <div className="prr-actions">
          <div className="prr-filter-group">
            {['all', 'pending', 'approved', 'rejected', 'completed'].map((status) => (
              <button
                key={status}
                className={`prr-filter-btn ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'All' : statusConfig[status]?.label ?? status}
              </button>
            ))}
          </div>
          <button className="prr-refresh-btn" onClick={() => fetchRequests(false)} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="prr-loading">Loading requests…</div>
      ) : filteredRequests.length === 0 ? (
        <div className="prr-empty">
          <h4>No requests found</h4>
          <p>{filter === 'all' ? 'There are no password reset requests yet.' : 'No requests match the selected status.'}</p>
        </div>
      ) : (
        <div className="prr-table-wrapper">
          <table className="prr-table">
            <thead>
              <tr>
                <th>Requested By</th>
                <th>Email</th>
                <th>Department</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className="prr-name-col">
                      <span className="prr-name">{req.full_name}</span>
                      {req.employee_id && <span className="prr-meta">ID: {req.employee_id}</span>}
                    </div>
                  </td>
                  <td>{req.email}</td>
                  <td>{req.department || 'N/A'}</td>
                  <td>{formatDate(req.created_at)}</td>
                  <td>{renderStatus(req.status)}</td>
                  <td>
                    <button className="prr-view-btn" onClick={() => openRequest(req)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRequest && (
        <div className="prr-modal-overlay" onClick={closeModal}>
          <div className="prr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prr-modal-header">
              <div>
                <h3>{selectedRequest.full_name}</h3>
                <span className="prr-modal-email">{selectedRequest.email}</span>
              </div>
              <button className="prr-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="prr-modal-body">
              <div className="prr-detail-grid">
                <div>
                  <label>Employee ID</label>
                  <p>{selectedRequest.employee_id || 'N/A'}</p>
                </div>
                <div>
                  <label>Department</label>
                  <p>{selectedRequest.department || 'N/A'}</p>
                </div>
                <div>
                  <label>Submitted</label>
                  <p>{formatDate(selectedRequest.created_at)}</p>
                </div>
                <div>
                  <label>Status</label>
                  <p>{renderStatus(selectedRequest.status)}</p>
                </div>
              </div>

              <div className="prr-section">
                <label>Reason Provided</label>
                <p className="prr-reason">{selectedRequest.reason || 'Not provided'}</p>
              </div>

              {(selectedRequest.id_photo_1_url || selectedRequest.id_photo_2_url) && (
                <div className="prr-section">
                  <label>Uploaded Identification</label>
                  <div className="prr-attachments">
                    {selectedRequest.id_photo_1_url && (
                      <img
                        src={buildAttachmentSrc(selectedRequest, 1)}
                        alt=""
                        className="prr-attachment-image"
                      />
                    )}
                    {selectedRequest.id_photo_2_url && (
                      <img
                        src={buildAttachmentSrc(selectedRequest, 2)}
                        alt=""
                        className="prr-attachment-image"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="prr-section">
                <label>Admin Notes</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Add an internal note or reason for approval/decline."
                  rows={4}
                />
                {selectedRequest.status === 'rejected' && (
                  <small className="prr-notes-hint">These notes were shared with the employee via in-system notification.</small>
                )}
              </div>
            </div>

            <div className="prr-modal-actions">
              <button className="prr-secondary" onClick={closeModal} disabled={actionLoading}>
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button className="prr-danger" onClick={handleReject} disabled={actionLoading}>
                    {actionLoading ? 'Declining…' : 'Decline'}
                  </button>
                  <button className="prr-primary" onClick={handleApprove} disabled={actionLoading}>
                    {actionLoading ? 'Approving…' : 'Approve & Send Email'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon question ${confirmModal.action}`}>
              <span>?</span>
            </div>
            <h3 className="modal-title">Are you sure?</h3>
            <p className="modal-message">
              {confirmModal.action === 'approve'
                ? 'Do you really want to approve this request? This process cannot be undone.'
                : 'Do you really want to decline this request?'}
            </p>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={closeConfirm} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className={`modal-btn danger${confirmModal.action === 'approve' ? ' approve' : ''}`}
                onClick={confirmModal.action === 'approve' ? performApprove : performReject}
                disabled={actionLoading}
              >
                {confirmModal.action === 'approve' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="modal-overlay" onClick={closeResult}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon ${resultModal.variant}`}>
              <span>{resultModal.variant === 'success' ? '✓' : resultModal.variant === 'decline' ? '✕' : '!'}</span>
            </div>
            <h3 className="modal-title">{resultModal.title}</h3>
            <p className="modal-message">{resultModal.message}</p>
            <div className="modal-actions single">
              <button
                className={`modal-btn ${resultModal.variant === 'decline' ? 'danger' : 'primary'}`}
                onClick={closeResult}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResetRequests;

