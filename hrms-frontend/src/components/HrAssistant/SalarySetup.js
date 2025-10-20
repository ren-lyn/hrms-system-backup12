import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { validateSalarySetup } from '../../utils/OnboardingValidation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDollarSign, 
  faEdit, 
  faCalendarAlt, 
  faUser, 
  faExclamationTriangle,
  faCheckCircle,
  faWarning,
  faMoneyBillWave,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';

const SalarySetup = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    hourly_rate: '',
    effective_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSalaryData();
  }, []);

  const fetchSalaryData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch salary rates for all positions
      const response = await axios.get('http://localhost:8000/api/salary-rates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching salary data:', error);
      // Mock data for demonstration
      const mockPositions = [
        {
          id: 1,
          position_name: 'HR Staff',
          hourly_rate: 450.00,
          last_updated: '2025-01-10T10:00:00Z',
          updated_by: 'Admin User',
          effective_date: '2025-01-01',
          notes: 'Annual salary review'
        },
        {
          id: 2,
          position_name: 'HR Assistant',
          hourly_rate: 350.00,
          last_updated: '2025-01-08T14:30:00Z',
          updated_by: 'HR Manager',
          effective_date: '2025-01-01',
          notes: 'Entry level position'
        },
        {
          id: 3,
          position_name: 'Foreman',
          hourly_rate: 500.00,
          last_updated: '2025-01-05T09:15:00Z',
          updated_by: 'Operations Manager',
          effective_date: '2025-01-01',
          notes: 'Supervisory role'
        },
        {
          id: 4,
          position_name: 'Assistant Foreman',
          hourly_rate: 400.00,
          last_updated: '2025-01-03T16:20:00Z',
          updated_by: 'Operations Manager',
          effective_date: '2025-01-01',
          notes: 'Support role'
        },
        {
          id: 5,
          position_name: 'Production Worker',
          hourly_rate: 280.00,
          last_updated: '2025-01-01T08:00:00Z',
          updated_by: 'HR Manager',
          effective_date: '2025-01-01',
          notes: 'Standard production rate'
        },
        {
          id: 6,
          position_name: 'Driver',
          hourly_rate: 320.00,
          last_updated: '2025-01-02T11:45:00Z',
          updated_by: 'Logistics Manager',
          effective_date: '2025-01-01',
          notes: 'Includes hazard pay'
        },
        {
          id: 7,
          position_name: 'Helper',
          hourly_rate: 250.00,
          last_updated: '2025-01-01T08:00:00Z',
          updated_by: 'HR Manager',
          effective_date: '2025-01-01',
          notes: 'Entry level support'
        },
        {
          id: 8,
          position_name: 'Admin Staff',
          hourly_rate: 300.00,
          last_updated: '2025-01-04T13:30:00Z',
          updated_by: 'Admin Manager',
          effective_date: '2025-01-01',
          notes: 'Administrative support'
        },
        {
          id: 9,
          position_name: 'Maintenance Foreman',
          hourly_rate: 480.00,
          last_updated: '2025-01-06T10:15:00Z',
          updated_by: 'Maintenance Manager',
          effective_date: '2025-01-01',
          notes: 'Technical supervisory role'
        },
        {
          id: 10,
          position_name: 'Maintenance Assistant',
          hourly_rate: 350.00,
          last_updated: '2025-01-07T15:20:00Z',
          updated_by: 'Maintenance Manager',
          effective_date: '2025-01-01',
          notes: 'Technical support role'
        },
        {
          id: 11,
          position_name: 'Accounting Staff',
          hourly_rate: 380.00,
          last_updated: '2025-01-09T12:00:00Z',
          updated_by: 'Finance Manager',
          effective_date: '2025-01-01',
          notes: 'Financial operations'
        },
        {
          id: 12,
          position_name: 'Accounting Assistant',
          hourly_rate: 320.00,
          last_updated: '2025-01-01T08:00:00Z',
          updated_by: 'Finance Manager',
          effective_date: '2025-01-01',
          notes: 'Entry level accounting'
        }
      ];
      
      setPositions(mockPositions);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const validation = validateSalarySetup(formData, selectedPosition?.hourly_rate);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSaveRate = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Update salary rate
      await axios.put(`http://localhost:8000/api/salary-rates/${selectedPosition.id}`, 
        {
          hourly_rate: parseFloat(formData.hourly_rate),
          effective_date: formData.effective_date,
          notes: formData.notes,
          updated_by: currentUser.name || 'HR Staff'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message
      alert(`Salary rate updated successfully for ${selectedPosition.position_name}!`);
      
      // Reset form and close modal
      setFormData({
        hourly_rate: '',
        effective_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setErrors({});
      setShowEditModal(false);
      setSelectedPosition(null);
      
      // Refresh data
      fetchSalaryData();
      
    } catch (error) {
      console.error('Error updating salary rate:', error);
      alert('Error updating salary rate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (position) => {
    setSelectedPosition(position);
    setFormData({
      hourly_rate: position.hourly_rate?.toString() || '',
      effective_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setErrors({});
    setShowEditModal(true);
  };

  const formatCurrency = (amount) => {
    return `₱${amount?.toFixed(2) || '0.00'}`;
  };

  const getRateChangeWarning = () => {
    if (!selectedPosition || !formData.hourly_rate) return null;
    
    const oldRate = selectedPosition.hourly_rate || 0;
    const newRate = parseFloat(formData.hourly_rate);
    const changePercent = ((newRate - oldRate) / oldRate) * 100;
    
    if (Math.abs(changePercent) > 20) {
      return (
        <Alert variant="warning" className="d-flex align-items-center">
          <FontAwesomeIcon icon={faWarning} className="me-2" />
          <div>
            <strong>Significant Rate Change:</strong> {changePercent > 0 ? 'Increase' : 'Decrease'} of {Math.abs(changePercent).toFixed(1)}%
            <br />
            <small>Previous: {formatCurrency(oldRate)} → New: {formatCurrency(newRate)}</small>
          </div>
        </Alert>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h3 className="text-primary mb-1 fw-bold">
            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
            Salary Setup
          </h3>
          <p className="text-muted mb-0">Define hourly rates for each position</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faUser} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{positions.length}</h3>
              <small className="opacity-75">Total Positions</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{positions.filter(p => p.hourly_rate).length}</h3>
              <small className="opacity-75">Rates Set</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{positions.filter(p => !p.hourly_rate).length}</h3>
              <small className="opacity-75">Rates Pending</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faChartLine} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{formatCurrency(positions.reduce((sum, p) => sum + (p.hourly_rate || 0), 0) / positions.length)}</h3>
              <small className="opacity-75">Average Rate</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Positions Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Position Name</th>
                  <th>Current Hourly Rate</th>
                  <th>Last Updated</th>
                  <th>Updated By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id}>
                    <td>
                      <div>
                        <strong>{position.position_name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faDollarSign} className="text-success me-2" />
                        <span className="fw-bold">
                          {position.hourly_rate ? formatCurrency(position.hourly_rate) : 'Not Set'}
                        </span>
                        {!position.hourly_rate && (
                          <Badge bg="warning" className="ms-2">Pending</Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      {position.last_updated ? (
                        <div>
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-primary me-1" />
                          {new Date(position.last_updated).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted">Never</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <FontAwesomeIcon icon={faUser} className="text-info me-1" />
                        {position.updated_by || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleOpenEditModal(position)}
                      >
                        <FontAwesomeIcon icon={faEdit} className="me-1" />
                        Edit Rate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Edit Rate Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faDollarSign} className="me-2" />
            Edit Salary Rate
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPosition && (
            <div>
              {/* Position Info */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="me-3" style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '15px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FontAwesomeIcon icon={faDollarSign} className="text-white" size="lg" />
                    </div>
                    <div>
                      <h6 className="mb-1">{selectedPosition.position_name}</h6>
                      <p className="mb-1 text-muted">Current Rate: {formatCurrency(selectedPosition.hourly_rate)}</p>
                      <small className="text-muted">Last Updated: {selectedPosition.last_updated ? new Date(selectedPosition.last_updated).toLocaleDateString() : 'Never'}</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Setting Form */}
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faDollarSign} className="me-1" />
                        Hourly Rate *
                      </Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">₱</span>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          max="10000"
                          placeholder="0.00"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                          isInvalid={!!errors.hourly_rate}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.hourly_rate}
                        </Form.Control.Feedback>
                      </div>
                      <Form.Text className="text-muted">
                        Enter rate in Philippine Peso (₱). Maximum: ₱10,000 per hour.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                        Effective Date *
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.effective_date}
                        onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
                        isInvalid={!!errors.effective_date}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.effective_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="e.g., Annual review, Market adjustment, Performance-based increase"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </Form.Group>

                {/* Rate Change Warning */}
                {getRateChangeWarning()}
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveRate}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                Save Rate
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalarySetup;