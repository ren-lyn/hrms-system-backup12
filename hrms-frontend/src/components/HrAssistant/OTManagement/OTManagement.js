import React, { useState, useEffect } from 'react';
import axios from '../../../axios';
import { FaClock, FaCheck, FaTimes, FaSearch, FaFilter, FaDownload, FaImage, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Modal, Image, Button, Badge } from 'react-bootstrap';
import OTDetailsModal from '../../OT/OTDetailsModal';
import './OTManagement.css';

const OTManagement = () => {
  const [otRequests, setOtRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Image viewing states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchOTRequests();
  }, []);

  const fetchOTRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/ot-requests/all');
      const rawData = response.data.data || response.data;
      
      // Map the data to match frontend expectations
      const mappedData = rawData.map(request => ({
        ...request,
        employeeName: request.employee ? `${request.employee.first_name} ${request.employee.last_name}` : 'Unknown',
        employeeId: request.employee?.employee_id || 'N/A',
        startTime: request.attendance?.clock_in || request.start_time,
        endTime: request.attendance?.clock_out || request.end_time,
        submittedAt: request.created_at,
        rejectionReason: request.rejection_reason,
        // Reviewer names (support both snake_case and camelCase keys just in case)
        approvedByName: (request.manager_reviewer?.first_name && `${request.manager_reviewer.first_name} ${request.manager_reviewer.last_name}`)
          || (request.managerReviewer?.first_name && `${request.managerReviewer.first_name} ${request.managerReviewer.last_name}`)
          || '',
        notedByName: (request.hr_reviewer?.first_name && `${request.hr_reviewer.first_name} ${request.hr_reviewer.last_name}`)
          || (request.hrReviewer?.first_name && `${request.hrReviewer.first_name} ${request.hrReviewer.last_name}`)
          || ''
      }));
      
      setOtRequests(mappedData);
    } catch (error) {
      console.error('Error fetching OT requests:', error);
      toast.error('Failed to load OT requests');
    } finally {
      setLoading(false);
    }
  };

  const viewImage = (imagePath) => {
    // Convert storage path to public URL (same as attendance edit requests)
    const imageUrl = `http://localhost:8000/storage/${imagePath}`;
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleApprove = async (id) => {
    if (window.confirm('Are you sure you want to approve this OT request?')) {
      try {
        await axios.put(
          `/ot-requests/${id}/status`,
          { status: 'approved' }
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
      await axios.put(
        `/ot-requests/${id}/status`,
        { status: 'rejected', rejection_reason: reason }
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
      manager_approved: 'status-badge status-manager-approved',
      hr_approved: 'status-badge status-approved',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected'
    };
    
    const statusTexts = {
      pending: 'Pending',
      manager_approved: 'Manager Approved',
      hr_approved: 'HR Approved',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    
    const statusText = statusTexts[status] || status.charAt(0).toUpperCase() + status.slice(1);
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
                    <th>OT Hours</th>
                    <th>Reason</th>
                    <th>Proof Images</th>
                    <th>Status</th>
                    <th>Approved by</th>
                    <th>Noted by</th>
                    <th>Submitted On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((request) => (
                    <tr
                      key={request.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setSelectedRequest(request); setShowDetails(true); }}
                    >
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
                        {request.startTime && request.endTime ? (
                          <>
                            {new Date(`1970-01-01T${request.startTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(`1970-01-01T${request.endTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </>
                        ) : (
                          <span className="text-muted">No attendance record</span>
                        )}
                      </td>
                      <td>
                        {request.ot_hours || 0} hours
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }} title={request.reason}>
                        {request.reason}
                      </td>
                      <td>
                        {request.proof_images && request.proof_images.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {request.proof_images.map((imagePath, index) => (
                              <Button
                                key={index}
                                variant="outline-primary"
                                size="sm"
                                onClick={() => viewImage(imagePath)}
                                title={`View image ${index + 1}`}
                                className="p-1"
                              >
                                <FaImage size={12} className="me-1" />
                                {index + 1}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">No images</span>
                        )}
                      </td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{request.approvedByName || <span className="text-muted">—</span>}</td>
                      <td>{request.notedByName || <span className="text-muted">—</span>}</td>
                      <td>{new Date(request.submittedAt).toLocaleString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {request.status === 'manager_approved' && (
                            <>
                              <button 
                                className="btn btn-sm btn-outline-success"
                                onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                                title="Approve"
                              >
                                <FaCheck />
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                                title="Reject"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {request.status === 'hr_approved' && (
                            <span className="text-success small">✓ Approved by HR</span>
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

      {/* Image View Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                <FaImage className="text-info" size={20} />
              </div>
              <div>
                <h5 className="mb-0">Proof of Overtime</h5>
                <small className="text-muted">Employee submitted evidence</small>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
          <img 
            src={selectedImage} 
            alt="Proof" 
            className="img-fluid rounded shadow" 
            style={{ maxHeight: '70vh', maxWidth: '100%' }} 
          />
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* OT Details Modal */}
      <OTDetailsModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        request={selectedRequest}
      />
    </div>
  );
};

export default OTManagement;
