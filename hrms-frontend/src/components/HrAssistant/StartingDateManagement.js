import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { validateStartingDate } from '../../utils/OnboardingValidation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faClock, 
  faUser, 
  faEdit,
  faCheckCircle,
  faExclamationTriangle,
  faCalendarCheck,
  faWarning
} from '@fortawesome/free-solid-svg-icons';

const StartingDateManagement = () => {
  const [newHires, setNewHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [setting, setSetting] = useState(false);
  const [activeTab, setActiveTab] = useState('needs-date');

  // Form state
  const [formData, setFormData] = useState({
    starting_date: '',
    notes: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchStartingDateData();
  }, []);

  const fetchStartingDateData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch onboarding records for newly hired employees
      const response = await axios.get('http://localhost:8000/api/onboarding-records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allRecords = response.data;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Filter for newly hired employees (hired within last 30 days)
      const newlyHired = allRecords.filter(record => {
        const hiredDate = new Date(record.created_at);
        return hiredDate >= thirtyDaysAgo;
      });
      
      setNewHires(newlyHired);
    } catch (error) {
      console.error('Error fetching starting date data:', error);
      // Mock data for demonstration
      const mockNewHires = [
        {
          id: 1,
          employee_name: 'John Doe',
          employee_email: 'john.doe@company.com',
          position: 'Software Developer',
          department: 'IT Department',
          start_date: '2025-01-15',
          created_at: '2025-01-10T10:00:00Z',
          avatar: 'https://i.pravatar.cc/150?img=1',
          starting_date_set: false
        },
        {
          id: 2,
          employee_name: 'Sarah Johnson',
          employee_email: 'sarah.johnson@company.com',
          position: 'UX Designer',
          department: 'Design',
          start_date: '2025-01-20',
          created_at: '2025-01-12T14:30:00Z',
          avatar: 'https://i.pravatar.cc/150?img=2',
          starting_date_set: true,
          official_starting_date: '2025-01-22'
        }
      ];
      
      setNewHires(mockNewHires);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const validation = validateStartingDate(formData.starting_date, selectedEmployee?.start_date);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSetStartingDate = async () => {
    if (!validateForm()) {
      return;
    }

    setSetting(true);
    try {
      const token = localStorage.getItem('token');
      
      // Update onboarding record with starting date
      await axios.put(`http://localhost:8000/api/onboarding-records/${selectedEmployee.id}`, 
        {
          official_starting_date: formData.starting_date,
          starting_date_notes: formData.notes,
          starting_date_set: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Send notification to employee
      await axios.post(`http://localhost:8000/api/notifications`, 
        {
          user_id: selectedEmployee.user_id,
          type: 'starting_date_set',
          title: 'Starting Date Confirmed',
          message: `Your official starting date has been set to ${new Date(formData.starting_date).toLocaleDateString()}. Please prepare accordingly.`,
          data: {
            starting_date: formData.starting_date,
            notes: formData.notes
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message
      alert(`Starting date set successfully for ${selectedEmployee.employee_name}!`);
      
      // Reset form and close modal
      setFormData({
        starting_date: '',
        notes: ''
      });
      setErrors({});
      setShowDateModal(false);
      setSelectedEmployee(null);
      
      // Refresh data
      fetchStartingDateData();
      
    } catch (error) {
      console.error('Error setting starting date:', error);
      alert('Error setting starting date. Please try again.');
    } finally {
      setSetting(false);
    }
  };

  const handleOpenDateModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      starting_date: employee.official_starting_date || '',
      notes: employee.starting_date_notes || ''
    });
    setErrors({});
    setShowDateModal(true);
  };

  const getDateStatus = (employee) => {
    if (employee.starting_date_set && employee.official_starting_date) {
      return {
        status: 'Set',
        color: 'success',
        date: employee.official_starting_date
      };
    } else {
      return {
        status: 'Not Set',
        color: 'warning',
        date: null
      };
    }
  };

  const getDaysFromHire = (employee) => {
    if (!employee.starting_date_set || !employee.official_starting_date) return null;
    
    const hireDate = new Date(employee.start_date);
    const startDate = new Date(employee.official_starting_date);
    const daysDiff = Math.ceil((startDate - hireDate) / (1000 * 60 * 60 * 24));
    return daysDiff;
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
            <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
            Starting Date Management
          </h3>
          <p className="text-muted mb-0">Set official starting dates for new employees</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex gap-2">
            <Button
              variant={activeTab === 'needs-date' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('needs-date')}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Needs Starting Date ({newHires.filter(h => !h.starting_date_set).length})
            </Button>
            <Button
              variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('all')}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              All Employees ({newHires.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Date Hired</th>
                  <th>Current Starting Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {newHires
                  .filter(employee => activeTab === 'all' || !employee.starting_date_set)
                  .map((employee) => {
                    const dateStatus = getDateStatus(employee);
                    const daysFromHire = getDaysFromHire(employee);
                    
                    return (
                      <tr key={employee.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={employee.avatar || 'https://i.pravatar.cc/150?img=1'} 
                              alt={employee.employee_name}
                              className="rounded-circle me-3"
                              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            <div>
                              <strong>{employee.employee_name}</strong>
                              <br />
                              <small className="text-muted">{employee.employee_email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{employee.position}</strong>
                            <br />
                            <small className="text-muted">{employee.department}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-primary me-1" />
                            {new Date(employee.start_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          {dateStatus.date ? (
                            <div>
                              <FontAwesomeIcon icon={faCalendarCheck} className="text-success me-1" />
                              {new Date(dateStatus.date).toLocaleDateString()}
                              {daysFromHire && daysFromHire > 30 && (
                                <div>
                                  <small className="text-warning">
                                    <FontAwesomeIcon icon={faWarning} className="me-1" />
                                    {daysFromHire} days from hire
                                  </small>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Not set</span>
                          )}
                        </td>
                        <td>
                          <Badge bg={dateStatus.color} className="rounded-pill px-3 py-1">
                            {dateStatus.status}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant={employee.starting_date_set ? "outline-primary" : "primary"}
                            size="sm"
                            onClick={() => handleOpenDateModal(employee)}
                          >
                            <FontAwesomeIcon icon={employee.starting_date_set ? faEdit : faCalendarCheck} className="me-1" />
                            {employee.starting_date_set ? 'Edit Date' : 'Set Starting Date'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Starting Date Modal */}
      <Modal show={showDateModal} onHide={() => setShowDateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
            Set Starting Date
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmployee && (
            <div>
              {/* Employee Info */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <img 
                      src={selectedEmployee.avatar || 'https://i.pravatar.cc/150?img=1'} 
                      alt={selectedEmployee.employee_name}
                      className="rounded-circle me-3"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                    <div>
                      <h6 className="mb-1">{selectedEmployee.employee_name}</h6>
                      <p className="mb-1 text-muted">{selectedEmployee.position}</p>
                      <small className="text-muted">{selectedEmployee.department}</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Setting Form */}
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faCalendarCheck} className="me-1" />
                        Starting Date *
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.starting_date}
                        onChange={(e) => setFormData({...formData, starting_date: e.target.value})}
                        isInvalid={!!errors.starting_date}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.starting_date}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        Must be on or after hire date ({new Date(selectedEmployee.start_date).toLocaleDateString()})
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faUser} className="me-1" />
                        Notes (Optional)
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="e.g., First day orientation, Bring ID, Parking instructions"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Warning for 30+ days */}
                {formData.starting_date && selectedEmployee && (() => {
                  const selectedDate = new Date(formData.starting_date);
                  const hireDate = new Date(selectedEmployee.start_date);
                  const daysDiff = Math.ceil((selectedDate - hireDate) / (1000 * 60 * 60 * 24));
                  
                  if (daysDiff > 30) {
                    return (
                      <Alert variant="warning" className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faWarning} className="me-2" />
                        <div>
                          <strong>Warning:</strong> Starting date is {daysDiff} days from hire date. 
                          Consider if this extended period is necessary.
                        </div>
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSetStartingDate}
            disabled={setting}
          >
            {setting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Setting Date...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
                Set Starting Date
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StartingDateManagement;