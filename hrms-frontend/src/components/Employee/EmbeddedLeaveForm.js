import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createLeaveRequest } from '../../api/leave';
import './EmbeddedLeaveForm.css';

const EmbeddedLeaveForm = () => {
  const [formData, setFormData] = useState({
    company: 'Cabuyao Concrete Development Corporation',
    name: '',
    dateFiled: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: 'Vacation Leave',
    terms: 'with PAY',
    leaveCategory: 'Service Incentive Leave (SIL)',
    startDate: null,
    endDate: null,
    totalDays: 0,
    totalHours: 0,
    reason: '',
    applicantName: '',
    eSignature: ''
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  // Auto-fill user info on component mount
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    setFormData(prev => ({
      ...prev,
      name: userInfo.name || '',
      department: userInfo.department || '',
      applicantName: userInfo.name || ''
    }));
  }, []);

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const calculateDaysAndHours = (startDate, endDate) => {
    if (!startDate || !endDate) return { days: 0, hours: 0 };

    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    const hours = days * 8;

    return { days: days > 0 ? days : 0, hours: hours > 0 ? hours : 0 };
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    const { days, hours } = calculateDaysAndHours(start, end);

    setFormData(prev => ({
      ...prev,
      startDate: start,
      endDate: end,
      totalDays: days,
      totalHours: hours
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formatDateForAPI = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const submitData = new FormData();
      submitData.append('company', formData.company);
      submitData.append('department', formData.department);
      submitData.append('type', formData.leaveType);
      submitData.append('terms', formData.terms);
      submitData.append('leave_category', formData.leaveCategory);
      submitData.append('from', formatDateForAPI(formData.startDate));
      submitData.append('to', formatDateForAPI(formData.endDate));
      submitData.append('total_days', formData.totalDays);
      submitData.append('total_hours', formData.totalHours);
      submitData.append('reason', formData.reason);

      await createLeaveRequest(submitData);
      showAlert('Leave application submitted successfully!', 'success');

      // Reset form
      setFormData(prev => ({
        ...prev,
        leaveType: 'Vacation Leave',
        terms: 'with PAY',
        leaveCategory: 'Service Incentive Leave (SIL)',
        startDate: null,
        endDate: null,
        totalDays: 0,
        totalHours: 0,
        reason: '',
        eSignature: ''
      }));
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showAlert('Failed to submit leave application. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="embedded-leave-form">
      {alert.show && (
        <Alert
          variant={alert.type}
          dismissible
          onClose={() => setAlert({ show: false, message: '', type: '' })}
        >
          {alert.message}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Top Section */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Company</Form.Label>
              <Form.Control
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="underlined-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="underlined-input"
                required
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Date Filed</Form.Label>
              <Form.Control
                type="date"
                value={formData.dateFiled}
                readOnly
                className="underlined-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Department</Form.Label>
              <Form.Control
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="underlined-input"
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Leave Type, Terms, Category */}
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="form-label">Leave Type</Form.Label>
              <Form.Select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                className="form-select-custom"
                required
              >
                <option value="Vacation Leave">Vacation Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label className="form-label">Terms</Form.Label>
              <Form.Select
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                className="form-select-custom"
                required
              >
                <option value="with PAY">with PAY</option>
                <option value="without PAY">without PAY</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Label className="form-label">Category</Form.Label>
            <Form.Check
              type="radio"
              label="Service Incentive Leave (SIL)"
              name="leaveCategory"
              value="Service Incentive Leave (SIL)"
              checked={formData.leaveCategory === 'Service Incentive Leave (SIL)'}
              onChange={(e) => setFormData({ ...formData, leaveCategory: e.target.value })}
            />
            <Form.Check
              type="radio"
              label="Emergency Leave (EL)"
              name="leaveCategory"
              value="Emergency Leave (EL)"
              checked={formData.leaveCategory === 'Emergency Leave (EL)'}
              onChange={(e) => setFormData({ ...formData, leaveCategory: e.target.value })}
            />
          </Col>
        </Row>

        {/* Dates Section */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="form-label">Dates</Form.Label>
              <div className="date-input-wrapper">
                <DatePicker
                  selected={formData.startDate}
                  onChange={handleDateChange}
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  selectsRange
                  placeholderText="Select date range"
                  className="date-range-input"
                />
                <CalendarIcon className="calendar-icon" size={20} />
              </div>
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label className="form-label">Total Days</Form.Label>
              <Form.Control
                type="number"
                value={formData.totalDays}
                readOnly
                className="calculation-input"
              />
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label className="form-label">Total Hours</Form.Label>
              <Form.Control
                type="number"
                value={formData.totalHours}
                readOnly
                className="calculation-input"
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Reason & Signature */}
        <Row className="mb-3">
          <Col md={8}>
            <Form.Group>
              <Form.Label className="form-label">Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="reason-textarea"
              />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Label className="form-label">Applicant Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.applicantName}
              onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
              className="underlined-input text-center mb-3"
            />

            <Form.Label className="form-label">E-Signature</Form.Label>
            <Form.Control
              type="text"
              value={formData.eSignature}
              onChange={(e) => setFormData({ ...formData, eSignature: e.target.value })}
              className="underlined-input text-center"
            />
          </Col>
        </Row>

        {/* Submit Button */}
        <Row>
          <Col className="text-end">
            <Button variant="success" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default EmbeddedLeaveForm;
