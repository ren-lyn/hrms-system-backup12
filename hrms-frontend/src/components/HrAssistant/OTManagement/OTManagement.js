import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaClock, FaCheck, FaTimes, FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './OTManagement.css';

const OTManagement = () => {
  const [otRequests, setOtRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchOTRequests();
  }, []);

  const fetchOTRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ot-requests/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOtRequests(response.data);
    } catch (error) {
      console.error('Error fetching OT requests:', error);
      toast.error('Failed to load OT requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm('Are you sure you want to approve this OT request?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(
          `/api/ot-requests/${id}/status`,
          { status: 'approved' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('OT request approved successfully');
        fetchOTRequests();
      } catch (error) {
        console.error('Error approving OT request:', error);
        toast.error('Failed to approve OT request');
      }
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please enter the reason for rejection:');
    if (reason === null) return; // User clicked cancel
    
    if (reason.trim() === '') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/ot-requests/${id}/status`,
        { status: 'rejected', rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('OT request rejected successfully');
      fetchOTRequests();
    } catch (error) {
      console.error('Error rejecting OT request:', error);
      toast.error('Failed to reject OT request');
    }
  };

  const filteredRequests = otRequests.filter(request => {
    const matchesSearch = 
      request.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    const matchesDate = !selectedDate || 
      new Date(request.date).toISOString().split('T')[0] === selectedDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected'
    };
    
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return <span className={statusClasses[status] || 'status-badge'}>{statusText}</span>;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const exportToExcel = () => {
    // This is a placeholder for Excel export functionality
    // You can implement this using a library like xlsx
    toast.info('Export to Excel functionality will be implemented here');
  };

  return (
    <div className="ot-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><FaClock className="me-2" /> Overtime Requests</h2>
        <button 
          className="btn btn-outline-primary"
          onClick={exportToExcel}
        >
          <FaDownload className="me-1" /> Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text"><FaSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text"><FaFilter /></span>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedDate('');
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OT Requests Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center p-5">
              <p className="text-muted">No overtime requests found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img 
                            src={request.employeeAvatar || 'https://i.pravatar.cc/40'} 
                            alt={request.employeeName} 
                            className="rounded-circle me-2" 
                            width="32" 
                            height="32"
                          />
                          <div>
                            <div className="fw-semibold">{request.employeeName}</div>
                            <small className="text-muted">ID: {request.employeeId}</small>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(request.date)}</td>
                      <td>
                        {new Date(`1970-01-01T${request.startTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(`1970-01-01T${request.endTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td>
                        {Math.round((new Date(`1970-01-01T${request.endTime}`) - new Date(`1970-01-01T${request.startTime}`)) / (1000 * 60 * 60) * 100) / 100} hours
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }} title={request.reason}>
                        {request.reason}
                      </td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{new Date(request.submittedAt).toLocaleString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {request.status === 'pending' && (
                            <>
                              <button 
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleApprove(request.id)}
                                title="Approve"
                              >
                                <FaCheck />
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleReject(request.id)}
                                title="Reject"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {request.status === 'rejected' && request.rejectionReason && (
                            <span 
                              className="text-danger"
                              title={`Rejection Reason: ${request.rejectionReason}`}
                              style={{ cursor: 'help' }}
                            >
                              <FaTimes className="text-danger" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => paginate(currentPage - 1)}
              >
                Previous
              </button>
            </li>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => paginate(number)}
                >
                  {number}
                </button>
              </li>
            ))}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => paginate(currentPage + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default OTManagement;
