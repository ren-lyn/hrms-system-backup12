import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { validateOrientationScheduling } from '../../utils/OnboardingValidation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, 
  faClock, 
  faMapMarkerAlt, 
  faUsers, 
  faVideo, 
  faUser, 
  faEdit,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

const OrientationScheduling = () => {
  const [newHires, setNewHires] = useState([]);
  const [scheduledOrientations, setScheduledOrientations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState('needs-scheduling');

  // Form state
  const [formData, setFormData] = useState({
    orientation_date: '',
    orientation_time: '',
    location: '',
    orientation_type: 'In-person',
    additional_notes: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchOrientationData();
  }, []);

  const fetchOrientationData = async () => {
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
        return hiredDate >= thirtyDaysAgo && !record.orientation_date;
      });
      
      // Filter for scheduled orientations
      const scheduled = allRecords.filter(record => record.orientation_date);
      
      setNewHires(newlyHired);
      setScheduledOrientations(scheduled);
    } catch (error) {
      console.error('Error fetching orientation data:', error);
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
          avatar: 'https://i.pravatar.cc/150?img=1'
        },
        {
          id: 2,
          employee_name: 'Sarah Johnson',
          employee_email: 'sarah.johnson@company.com',
          position: 'UX Designer',
          department: 'Design',
          start_date: '2025-01-20',
          created_at: '2025-01-12T14:30:00Z',
          avatar: 'https://i.pravatar.cc/150?img=2'
        }
      ];
      
      const mockScheduled = [
        {
          id: 3,
          employee_name: 'Michael Chen',
          employee_email: 'michael.chen@company.com',
          position: 'Data Scientist',
          department: 'Analytics',
          start_date: '2025-01-25',
          created_at: '2025-01-15T09:15:00Z',
          orientation_date: '2025-01-18',
          orientation_time: '09:00 AM',
          location: 'Main Conference Room',
          orientation_type: 'In-person',
          additional_notes: 'Bring laptop and ID'
        }
      ];
      
      setNewHires(mockNewHires);
      setScheduledOrientations(mockScheduled);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const validation = validateOrientationScheduling(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleScheduleOrientation = async () => {
    if (!validateForm()) {
      return;
    }

    setScheduling(true);
    try {
      const token = localStorage.getItem('token');
      
      // Update onboarding record with orientation details
      await axios.put(`http://localhost:8000/api/onboarding-records/${selectedEmployee.id}`, 
        {
          orientation_date: formData.orientation_date,
          orientation_time: formData.orientation_time,
          location: formData.location,
          orientation_type: formData.orientation_type,
          additional_notes: formData.additional_notes,
          status: 'orientation_scheduled'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Send notification to employee
      await axios.post(`http://localhost:8000/api/notifications`, 
        {
          user_id: selectedEmployee.user_id,
          type: 'orientation_scheduled',
          title: 'Orientation Scheduled',
          message: `Your orientation has been scheduled for ${new Date(formData.orientation_date).toLocaleDateString()} at ${formData.orientation_time} in ${formData.location}.`,
          data: {
            orientation_date: formData.orientation_date,
            orientation_time: formData.orientation_time,
            location: formData.location,
            orientation_type: formData.orientation_type
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message
      alert(`Orientation scheduled successfully for ${selectedEmployee.employee_name}!`);
      
      // Reset form and close modal
      setFormData({
        orientation_date: '',
        orientation_time: '',
        location: '',
        orientation_type: 'In-person',
        additional_notes: ''
      });
      setErrors({});
      setShowSchedulingModal(false);
      setSelectedEmployee(null);
      
      // Refresh data
      fetchOrientationData();
      
    } catch (error) {
      console.error('Error scheduling orientation:', error);
      alert('Error scheduling orientation. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const handleOpenSchedulingModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      orientation_date: '',
      orientation_time: '',
      location: '',
      orientation_type: 'In-person',
      additional_notes: ''
    });
    setErrors({});
    setShowSchedulingModal(true);
  };

  const getOrientationTypeIcon = (type) => {
    return type === 'Virtual/Online' ? faVideo : faUser;
  };

  const getOrientationTypeColor = (type) => {
    return type === 'Virtual/Online' ? 'info' : 'primary';
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
            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
            Orientation Scheduling
          </h3>
          <p className="text-muted mb-0">Schedule orientation sessions for new hires</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex gap-2">
            <Button
              variant={activeTab === 'needs-scheduling' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('needs-scheduling')}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Needs Scheduling ({newHires.length})
            </Button>
            <Button
              variant={activeTab === 'scheduled' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('scheduled')}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Scheduled ({scheduledOrientations.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'needs-scheduling' && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            {newHires.length === 0 ? (
              <div className="text-center py-4">
                <FontAwesomeIcon icon={faCheckCircle} size="3x" className="text-success mb-3" />
                <h5 className="text-muted">All caught up!</h5>
                <p className="text-muted">No new hires need orientation scheduling at the moment.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Date Hired</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newHires.map((employee) => (
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
                        <td>{employee.position}</td>
                        <td>{employee.department}</td>
                        <td>{new Date(employee.start_date).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenSchedulingModal(employee)}
                          >
                            <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                            Schedule Orientation
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'scheduled' && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            {scheduledOrientations.length === 0 ? (
              <div className="text-center py-4">
                <FontAwesomeIcon icon={faCalendarAlt} size="3x" className="text-muted mb-3" />
                <h5 className="text-muted">No scheduled orientations</h5>
                <p className="text-muted">Orientation sessions will appear here once scheduled.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Date & Time</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledOrientations.map((orientation) => (
                      <tr key={orientation.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={orientation.avatar || 'https://i.pravatar.cc/150?img=3'} 
                              alt={orientation.employee_name}
                              className="rounded-circle me-3"
                              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            <div>
                              <strong>{orientation.employee_name}</strong>
                              <br />
                              <small className="text-muted">{orientation.position}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{new Date(orientation.orientation_date).toLocaleDateString()}</strong>
                            <br />
                            <small className="text-muted">
                              <FontAwesomeIcon icon={faClock} className="me-1" />
                              {orientation.orientation_time}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-primary me-1" />
                            {orientation.location}
                          </div>
                        </td>
                        <td>
                          <Badge bg={getOrientationTypeColor(orientation.orientation_type)}>
                            <FontAwesomeIcon icon={getOrientationTypeIcon(orientation.orientation_type)} className="me-1" />
                            {orientation.orientation_type}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenSchedulingModal(orientation)}
                          >
                            <FontAwesomeIcon icon={faEdit} className="me-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Scheduling Modal */}
      <Modal show={showSchedulingModal} onHide={() => setShowSchedulingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
            Schedule Orientation
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

              {/* Scheduling Form */}
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                        Date of Orientation *
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.orientation_date}
                        onChange={(e) => setFormData({...formData, orientation_date: e.target.value})}
                        isInvalid={!!errors.orientation_date}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.orientation_date}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        Time *
                      </Form.Label>
                      <Form.Control
                        type="time"
                        value={formData.orientation_time}
                        onChange={(e) => setFormData({...formData, orientation_time: e.target.value})}
                        isInvalid={!!errors.orientation_time}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.orientation_time}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                        Location/Venue *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., Main Conference Room, Building A"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        isInvalid={!!errors.location}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.location}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FontAwesomeIcon icon={faUsers} className="me-1" />
                        Orientation Type *
                      </Form.Label>
                      <Form.Select
                        value={formData.orientation_type}
                        onChange={(e) => setFormData({...formData, orientation_type: e.target.value})}
                        isInvalid={!!errors.orientation_type}
                      >
                        <option value="In-person">In-person</option>
                        <option value="Virtual/Online">Virtual/Online</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.orientation_type}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="e.g., Bring laptop, ID required, Dress code: Business casual"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                  />
                </Form.Group>
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSchedulingModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleScheduleOrientation}
            disabled={scheduling}
          >
            {scheduling ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Scheduling...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                Schedule Orientation
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrientationScheduling;
