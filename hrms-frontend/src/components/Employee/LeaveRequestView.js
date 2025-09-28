import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { ArrowLeft, Download } from 'lucide-react';
import { downloadLeavePdf } from '../../api/leave';
import axios from '../../axios';
import ApprovalInformation from '../common/ApprovalInformation';

const LeaveRequestView = ({ leaveId, onBack }) => {
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (leaveId) {
      fetchLeaveRequest();
    }
  }, [leaveId]);

  const fetchLeaveRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/leave-requests/${leaveId}`);
      setLeaveRequest(response.data);
    } catch (err) {
      setError('Failed to load leave request details');
      console.error('Error fetching leave request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (leaveId) {
      downloadLeavePdf(leaveId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!leaveRequest) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Leave request not found</Alert>
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
        <Button variant="success" onClick={handleDownloadPdf}>
          <Download size={16} className="me-2" />
          Download PDF
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Leave Application Form</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5 className="text-primary mb-3">Employee Information</h5>
              <div className="mb-2">
                <strong>Name:</strong> {leaveRequest.employee_name}
              </div>
              <div className="mb-2">
                <strong>Department:</strong> {leaveRequest.department}
              </div>
            </Col>
            <Col md={6}>
              <h5 className="text-primary mb-3">Application Details</h5>
              <div className="mb-2">
                <strong>Date Filed:</strong> {formatDate(leaveRequest.date_filed)}
              </div>
              <div className="mb-2">
                <strong>Status:</strong> 
                <span className={`ms-2 badge ${leaveRequest.status === 'approved' ? 'bg-success' : leaveRequest.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`}>
                  {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
                </span>
              </div>
              <div className="mb-2">
                <strong>Application ID:</strong> #{leaveRequest.id}
              </div>
            </Col>
          </Row>

          <hr />

          <Row>
            <Col md={6}>
              <h5 className="text-primary mb-3">Leave Details</h5>
              <div className="mb-2">
                <strong>Leave Type:</strong> {leaveRequest.type}
              </div>
              <div className="mb-2">
                <strong>Pay Terms:</strong> {leaveRequest.terms || 'TBD by HR'}
              </div>
              <div className="mb-2">
                <strong>Duration:</strong>
              </div>
              <div className="mb-2 ms-3">
                <strong>From:</strong> {formatDate(leaveRequest.from)}
              </div>
              <div className="mb-2 ms-3">
                <strong>To:</strong> {formatDate(leaveRequest.to)}
              </div>
              <div className="mb-2">
                <strong>Total Days:</strong> {leaveRequest.total_days}
              </div>
              <div className="mb-2">
                <strong>Total Hours:</strong> {(() => {
                  // If total_days is 0 or null, calculate from date range
                  if (!leaveRequest.total_days && leaveRequest.from && leaveRequest.to) {
                    const fromDate = new Date(leaveRequest.from);
                    const toDate = new Date(leaveRequest.to);
                    const timeDiff = toDate.getTime() - fromDate.getTime();
                    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                    return days * 8;
                  }
                  return leaveRequest.total_days * 8 || 0;
                })()}
              </div>
            </Col>
            <Col md={6}>
              <h5 className="text-primary mb-3">Reason for Leave</h5>
              <div className="border p-3 rounded bg-light">
                {leaveRequest.reason}
              </div>
            </Col>
          </Row>

          <ApprovalInformation leaveRequest={leaveRequest} />
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LeaveRequestView;
