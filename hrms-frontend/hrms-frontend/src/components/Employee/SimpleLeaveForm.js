import React, { useState } from 'react';
import { Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { createLeaveRequest } from '../../api/leave';

const SimpleLeaveForm = () => {
  const [formData, setFormData] = useState({
    company: 'Cabuyao Concrete Development Corporation',
    name: 'Test Employee',
    department: 'IT Department',
    leaveType: 'Vacation Leave',
    terms: 'with PAY',
    leaveCategory: 'Service Incentive Leave (SIL)',
    startDate: '2025-01-20',
    endDate: '2025-01-22',
    totalDays: 3,
    totalHours: 24,
    reason: 'Family vacation'
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        company: formData.company,
        department: formData.department,
        type: formData.leaveType,
        terms: formData.terms,
        leave_category: formData.leaveCategory,
        from: formData.startDate,
        to: formData.endDate,
        total_days: formData.totalDays,
        total_hours: formData.totalHours,
        reason: formData.reason
      };

      console.log('Submitting:', submitData);
      const response = await createLeaveRequest(submitData);
      console.log('Response:', response);
      
      showAlert('Leave request submitted successfully!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error submitting leave request: ' + (error.response?.data?.message || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded">
      <h3>Simple Leave Request Form</h3>
      
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                required
              >
                <option value="Vacation Leave">Vacation Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Reason</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Leave Request'}
        </Button>
      </Form>
    </div>
  );
};

export default SimpleLeaveForm;
