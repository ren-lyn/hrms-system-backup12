import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Table, Badge, Tabs, Tab } from 'react-bootstrap';
import { FaCoins, FaInfoCircle, FaCheckCircle, FaTimesCircle, FaClock, FaHistory } from 'react-icons/fa';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const LeaveMonetizationRequest = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableData, setAvailableData] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [requestForm, setRequestForm] = useState({
    requested_days: '',
    reason: '',
    year: new Date().getFullYear()
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAvailableDays();
    fetchMyRequests();
  }, [selectedYear]);

  const fetchAvailableDays = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/leave-monetization/available-days', {
        params: { year: selectedYear }
      });
      
      if (response.data.success) {
        setAvailableData(response.data.data);
        setRequestForm(prev => ({ ...prev, year: selectedYear }));
      }
    } catch (error) {
      console.error('Error fetching available days:', error);
      toast.error('Failed to load available unused leave days');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get('/leave-monetization/my-requests');
      
      let requestsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          requestsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          requestsData = response.data.data;
        }
      }
      
      setMyRequests(requestsData);
    } catch (error) {
      console.error('Error fetching my requests:', error);
      setMyRequests([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!requestForm.requested_days || parseFloat(requestForm.requested_days) <= 0) {
      newErrors.requested_days = 'Please enter a valid number of days (minimum 0.5)';
    } else {
      const requestedDays = parseFloat(requestForm.requested_days);
      if (requestedDays < 0.5) {
        newErrors.requested_days = 'Minimum request is 0.5 days';
      } else if (requestedDays > 8) {
        newErrors.requested_days = 'Maximum request is 8 days';
      } else if (availableData && requestedDays > availableData.available_days) {
        newErrors.requested_days = `You can only request up to ${availableData.available_days} days`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/leave-monetization', {
        requested_days: parseFloat(requestForm.requested_days),
        reason: requestForm.reason || null,
        year: selectedYear
      });

      if (response.data.success) {
        toast.success('Leave monetization request submitted successfully!');
        setRequestForm({
          requested_days: '',
          reason: '',
          year: selectedYear
        });
        fetchAvailableDays();
        fetchMyRequests();
        setActiveTab('history');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit leave monetization request';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', icon: FaClock, text: 'Pending' },
      approved: { variant: 'success', icon: FaCheckCircle, text: 'Approved' },
      rejected: { variant: 'danger', icon: FaTimesCircle, text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
        <Icon size={12} />
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateEstimatedAmount = () => {
    if (!availableData || !requestForm.requested_days) return 0;
    const requestedDays = parseFloat(requestForm.requested_days) || 0;
    return requestedDays * availableData.daily_rate;
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaCoins className="me-2" />
                File Request of Leave Monetization
              </h5>
            </Card.Header>
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                <Tab eventKey="form" title="Request Form">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading available unused leave days...</p>
                    </div>
                  ) : availableData ? (
                    <>
                      {/* Available Days Info */}
                      <Alert variant="info" className="mb-4">
                        <FaInfoCircle className="me-2" />
                        <strong>Available Unused Leave Days for {selectedYear}:</strong>
                        <ul className="mb-0 mt-2">
                          <li>Total Unused Days: <strong>{availableData.unused_days} days</strong></li>
                          <li>Already Requested: <strong>{availableData.requested_days} days</strong></li>
                          <li>Available to Request: <strong>{availableData.available_days} days</strong></li>
                          <li>Daily Rate: <strong>{formatCurrency(availableData.daily_rate)}</strong></li>
                        </ul>
                        <small className="text-muted d-block mt-2">
                          Note: Only unused Service Incentive Leave (SIL) days can be monetized. 
                          SIL includes Sick Leave and Emergency Leave (8 days maximum per year).
                        </small>
                      </Alert>

                      {availableData.available_days <= 0 ? (
                        <Alert variant="warning">
                          <strong>No Available Days</strong>
                          <p className="mb-0">
                            You don't have any available unused leave days to monetize for {selectedYear}.
                          </p>
                        </Alert>
                      ) : (
                        <Form onSubmit={handleSubmit}>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  Year <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                  value={selectedYear}
                                  onChange={(e) => {
                                    setSelectedYear(parseInt(e.target.value));
                                    fetchAvailableDays();
                                  }}
                                >
                                  {[new Date().getFullYear(), new Date().getFullYear() - 1].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  Number of Days to Monetize <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                  type="number"
                                  name="requested_days"
                                  value={requestForm.requested_days}
                                  onChange={handleInputChange}
                                  min="0.5"
                                  max={availableData.available_days}
                                  step="0.5"
                                  placeholder="Enter days (e.g., 1.5, 2.0, 4.5)"
                                  isInvalid={!!errors.requested_days}
                                  required
                                />
                                <Form.Text className="text-muted">
                                  Minimum: 0.5 days | Maximum: {availableData.available_days} days
                                </Form.Text>
                                <Form.Control.Feedback type="invalid">
                                  {errors.requested_days}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={12}>
                              <Form.Group className="mb-3">
                                <Form.Label>Reason (Optional)</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  name="reason"
                                  value={requestForm.reason}
                                  onChange={handleInputChange}
                                  placeholder="Enter reason for monetization request (optional)"
                                  maxLength={500}
                                />
                                <Form.Text className="text-muted">
                                  {requestForm.reason.length}/500 characters
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>

                          {/* Estimated Amount */}
                          {requestForm.requested_days && parseFloat(requestForm.requested_days) > 0 && (
                            <Alert variant="success" className="mb-3">
                              <strong>Estimated Amount:</strong>{' '}
                              {formatCurrency(calculateEstimatedAmount())}
                              <br />
                              <small className="text-muted">
                                ({requestForm.requested_days} days × {formatCurrency(availableData.daily_rate)})
                              </small>
                            </Alert>
                          )}

                          <div className="d-flex gap-2">
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={submitting || availableData.available_days <= 0}
                            >
                              {submitting ? 'Submitting...' : 'Submit Request'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline-secondary"
                              onClick={() => {
                                setRequestForm({
                                  requested_days: '',
                                  reason: '',
                                  year: selectedYear
                                });
                                setErrors({});
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                        </Form>
                      )}
                    </>
                  ) : (
                    <Alert variant="danger">
                      Failed to load available unused leave days. Please try again.
                    </Alert>
                  )}
                </Tab>

                <Tab eventKey="history" title="Request History">
                  {myRequests.length === 0 ? (
                    <Alert variant="info">
                      <FaHistory className="me-2" />
                      No monetization requests found.
                    </Alert>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Date Requested</th>
                          <th>Year</th>
                          <th>Days Requested</th>
                          <th>Daily Rate</th>
                          <th>Estimated Amount</th>
                          <th>Status</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((request) => (
                          <tr key={request.id}>
                            <td>{format(new Date(request.created_at), 'MMM dd, yyyy')}</td>
                            <td>{request.leave_year}</td>
                            <td>{request.requested_days} days</td>
                            <td>{formatCurrency(request.daily_rate)}</td>
                            <td>{formatCurrency(request.estimated_amount)}</td>
                            <td>{getStatusBadge(request.status)}</td>
                            <td>
                              {request.remarks ? (
                                <small className="text-muted">{request.remarks}</small>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LeaveMonetizationRequest;

