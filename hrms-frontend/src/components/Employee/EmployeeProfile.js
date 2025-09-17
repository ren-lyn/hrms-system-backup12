import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Briefcase, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EmployeeProfile.css';

const EmployeeProfile = () => {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [editCounts, setEditCounts] = useState({
    marital_status: 0,
    address: 0,
    contact: 0
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState('');
  const [editData, setEditData] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/employee/profile', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProfile(response.data.profile || response.data);
      setEditCounts(response.data.edit_counts || { marital_status: 0, address: 0, contact: 0 });
    } catch (error) {
      console.error('Error fetching profile:', error);
      showAlert('Error loading profile. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleEdit = (field) => {
    if (editCounts[field] >= 3) {
      showAlert('You have reached the maximum number of edits (3) for this field.', 'warning');
      return;
    }

    setEditField(field);
    switch (field) {
      case 'marital_status':
        setEditData({ marital_status: profile.marital_status || '' });
        break;
      case 'address':
        setEditData({
          province: profile.province || '',
          barangay: profile.barangay || '',
          city: profile.city || '',
          postal_code: profile.postal_code || ''
        });
        break;
      case 'contact':
        setEditData({
          phone: profile.phone || '',
          email: profile.email || '',
          emergency_contact_name: profile.emergency_contact_name || '',
          emergency_contact_phone: profile.emergency_contact_phone || ''
        });
        break;
      default:
        break;
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(`http://localhost:8000/api/employee/profile/${editField}`, editData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setProfile(prev => ({ ...prev, ...editData }));
      setEditCounts(prev => ({ ...prev, [editField]: prev[editField] + 1 }));
      setShowEditModal(false);
      showAlert('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error updating profile. Please try again.', 'danger');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getEditButtonText = (field) => {
    const remaining = 3 - editCounts[field];
    return remaining > 0 ? `Edit (${remaining} left)` : 'No edits left';
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="employee-profile-container">
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-profile-container dashboard-embedded">
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Row className="g-4">
        {/* Left Column */}
        <Col lg={6}>
          {/* Personal Information */}
          <Card className="profile-card">
            <Card.Header>
              <h5><User size={20} className="me-2" />Personal Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Full name</label>
                    <p>{profile.name || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Gender</label>
                    <p>{profile.gender || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Marital Status</label>
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="mb-0">{profile.marital_status || 'Single'}</p>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleEdit('marital_status')}
                        disabled={editCounts.marital_status >= 3}
                        title={getEditButtonText('marital_status')}
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                    <small className="text-muted">Edits remaining: {3 - editCounts.marital_status}</small>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Religion</label>
                    <p>{profile.religion || 'Catholic'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Place of Birth</label>
                    <p>{profile.place_of_birth || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Date of Birth</label>
                    <p>{formatDate(profile.birth_date)}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Age</label>
                    <p>{calculateAge(profile.birth_date)}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Blood Type</label>
                    <p>{profile.blood_type || 'A+'}</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Address Information */}
          <Card className="profile-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5><MapPin size={20} className="me-2" />Address Information</h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => handleEdit('address')}
                disabled={editCounts.address >= 3}
                title={getEditButtonText('address')}
              >
                <Edit2 size={14} /> Edit
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Province</label>
                    <p>{profile.province || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Barangay</label>
                    <p>{profile.barangay || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>City/Municipality</label>
                    <p>{profile.city || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Postal Code</label>
                    <p>{profile.postal_code || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <small className="text-muted">Edits remaining: {3 - editCounts.address}</small>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col lg={6}>
          {/* Contact Information */}
          <Card className="profile-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5><Phone size={20} className="me-2" />Contact Information</h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => handleEdit('contact')}
                disabled={editCounts.contact >= 3}
                title={getEditButtonText('contact')}
              >
                <Edit2 size={14} /> Edit
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="contact-section">
                <h6>Personal Contact</h6>
                <Row className="mb-3">
                  <Col sm={6}>
                    <div className="info-item">
                      <label>Phone Number</label>
                      <p>{profile.phone || 'N/A'}</p>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{profile.email || 'N/A'}</p>
                    </div>
                  </Col>
                </Row>
              </div>
              
              <div className="emergency-section">
                <h6>In case of Emergency</h6>
                <Row>
                  <Col sm={6}>
                    <div className="info-item">
                      <label>Full Name</label>
                      <p>{profile.emergency_contact_name || 'N/A'}</p>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="info-item">
                      <label>Phone Number</label>
                      <p>{profile.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </Col>
                </Row>
              </div>
              <small className="text-muted">Edits remaining: {3 - editCounts.contact}</small>
            </Card.Body>
          </Card>

          {/* Employment Overview */}
          <Card className="profile-card">
            <Card.Header>
              <h5><Briefcase size={20} className="me-2" />Employment Overview</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Date Started</label>
                    <p>{formatDate(profile.hire_date)}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Employment status</label>
                    <p>{profile.employment_status || 'Full Time'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>Job Role</label>
                    <p>{profile.position || profile.job_title || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>SSS</label>
                    <p>{profile.sss || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>PhilHealth</label>
                    <p>{profile.philhealth || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>Pag-ibig</label>
                    <p>{profile.pagibig || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>Edit {editField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editField === 'marital_status' && (
            <Form.Group>
              <Form.Label>Marital Status</Form.Label>
              <Form.Select 
                value={editData.marital_status || ''} 
                onChange={(e) => setEditData({...editData, marital_status: e.target.value})}
              >
                <option value="">Select marital status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </Form.Select>
            </Form.Group>
          )}
          
          {editField === 'address' && (
            <>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Province</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={editData.province || ''} 
                      onChange={(e) => setEditData({...editData, province: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Barangay</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={editData.barangay || ''} 
                      onChange={(e) => setEditData({...editData, barangay: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>City/Municipality</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={editData.city || ''} 
                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Postal Code</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={editData.postal_code || ''} 
                      onChange={(e) => setEditData({...editData, postal_code: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}
          
          {editField === 'contact' && (
            <>
              <h6>Personal Contact</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control 
                      type="tel" 
                      value={editData.phone || ''} 
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={editData.email || ''} 
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <h6>Emergency Contact</h6>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={editData.emergency_contact_name || ''} 
                      onChange={(e) => setEditData({...editData, emergency_contact_name: e.target.value})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control 
                      type="tel" 
                      value={editData.emergency_contact_phone || ''} 
                      onChange={(e) => setEditData({...editData, emergency_contact_phone: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}
          
          <div className="text-muted small">
            <strong>Note:</strong> You can only edit this information {3 - editCounts[editField]} more time(s).
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmployeeProfile;
