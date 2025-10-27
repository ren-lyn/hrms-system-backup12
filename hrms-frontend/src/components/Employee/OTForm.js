import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, handleApiError } from '../../utils/auth';
import { FaClock, FaCalendarAlt, FaFileAlt, FaCheckCircle } from 'react-icons/fa';
import './OTForm.css';

const OTForm = () => {
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    status: 'pending',
    submittedAt: new Date().toISOString()
  });

  const [otRequests, setOtRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch employee's OT requests
    const fetchOTRequests = async () => {
      try {
        const response = await apiClient.get('/ot-requests');
        setOtRequests(response.data);
      } catch (error) {
        handleApiError(error, navigate);
        console.error('Error fetching OT requests:', error);
      }
    };

    fetchOTRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await apiClient.post('/ot-requests', formData);
      
      setSubmitSuccess(true);
      // Refresh the OT requests list
      const response = await apiClient.get('/ot-requests');
      setOtRequests(response.data);
      
      // Reset form
      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        reason: '',
        status: 'pending',
        submittedAt: new Date().toISOString()
      });
      
      // Switch to status tab
      setActiveTab('status');
      
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      handleApiError(error, navigate);
      console.error('Error submitting OT request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected'
    };
    
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return <span className={statusClasses[status] || 'status-badge'}>{statusText}</span>;
  };

  return (
    <div className="ot-container">
      <div className="ot-header">
        <h2><FaClock /> Overtime Request</h2>
        <div className="ot-tabs">
          <button 
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            New Request
          </button>
          <button 
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            Request Status
          </button>
        </div>
      </div>

      <div className="ot-content">
        {activeTab === 'new' ? (
          <form onSubmit={handleSubmit} className="ot-form">
            {submitSuccess && (
              <div className="alert alert-success">
                <FaCheckCircle /> Your overtime request has been submitted successfully!
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="date">
                <FaCalendarAlt /> Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="time-inputs">
              <div className="form-group">
                <label htmlFor="startTime">
                  <FaClock /> Start Time
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">
                  <FaClock /> End Time
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason">
                <FaFileAlt /> Reason for Overtime
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                rows="4"
                className="form-control"
                placeholder="Please provide a reason for your overtime request..."
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        ) : (
          <div className="ot-status">
            <h3>Your Overtime Requests</h3>
            {otRequests.length === 0 ? (
              <div className="no-requests">
                <p>You haven't submitted any overtime requests yet.</p>
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setActiveTab('new')}
                >
                  New Request
                </button>
              </div>
            ) : (
              <div className="ot-requests-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Submitted On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otRequests.map((request, index) => (
                      <tr key={index}>
                        <td>{new Date(request.date).toLocaleDateString()}</td>
                        <td>
                          {new Date(`1970-01-01T${request.startTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {new Date(`1970-01-01T${request.endTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td>
                          {Math.round((new Date(`1970-01-01T${request.endTime}`) - new Date(`1970-01-01T${request.startTime}`)) / (1000 * 60 * 60) * 100) / 100} hours
                        </td>
                        <td className="reason-cell">{request.reason}</td>
                        <td>{getStatusBadge(request.status)}</td>
                        <td>{new Date(request.submittedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OTForm;
