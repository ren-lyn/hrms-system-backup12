import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Button, Modal, Form, Alert } from 'react-bootstrap';
import { Edit2, Phone, Mail, MapPin, Briefcase, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './HrAssistantProfile.css';

const HrAssistantProfile = ({ onBack }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [editCounts, setEditCounts] = useState({
    name: 0,
    nickname: 0,
    civil_status: 0,
    address: 0,
    contact: 0,
    emergency_contact: 0
  });
  const [remainingEdits, setRemainingEdits] = useState({
    name: 3,
    nickname: 3,
    civil_status: 3,
    address: 3,
    contact: 3,
    emergency_contact: 3
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState('');
  const [editData, setEditData] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

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
      const counts = response.data.edit_counts || {
        name: 0, nickname: 0, civil_status: 0, address: 0, contact: 0, emergency_contact: 0
      };
      const remaining = response.data.remaining_edits || {
        name: 3, nickname: 3, civil_status: 3, address: 3, contact: 3, emergency_contact: 3
      };
      setEditCounts(counts);
      setRemainingEdits(remaining);
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
      case 'civil_status':
        setEditData({ civil_status: profile.civil_status || '' });
        break;
      case 'address':
        setEditData({
          province: profile.province || '',
          barangay: profile.barangay || '',
          city: profile.city || '',
          postal_code: profile.postal_code || '',
          present_address: profile.present_address || ''
        });
        break;
      case 'contact':
        setEditData({
          phone: profile.contact_number || profile.phone || '',
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
      let endpoint = `http://localhost:8000/api/employee/profile/${editField}`;
      if (editField === 'civil_status') {
        endpoint = 'http://localhost:8000/api/employee/profile/civil-status';
      }
      
      const response = await axios.put(endpoint, editData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (editField === 'contact') {
        setProfile(prev => ({
          ...prev,
          contact_number: editData.phone,
          phone: editData.phone,
          email: editData.email,
          emergency_contact_name: editData.emergency_contact_name,
          emergency_contact_phone: editData.emergency_contact_phone
        }));
      } else {
        setProfile(prev => ({ ...prev, ...editData }));
      }
      
      if (response.data.remaining_edits) {
        setEditCounts(prev => ({ ...prev, [editField]: 3 - response.data.remaining_edits }));
        setRemainingEdits(prev => ({ ...prev, [editField]: response.data.remaining_edits }));
      } else {
        setEditCounts(prev => ({ ...prev, [editField]: prev[editField] + 1 }));
        setRemainingEdits(prev => ({ ...prev, [editField]: prev[editField] - 1 }));
      }
      
      setShowEditModal(false);
      showAlert(response.data.message || 'Profile updated successfully!', 'success');
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showAlert(error.response.data.message, 'danger');
      } else {
        showAlert('Error updating profile. Please try again.', 'danger');
      }
    }
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
      <div className="hr-assistant-profile-container">
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-assistant-profile-container dashboard-embedded">
      <button 
        onClick={() => navigate('/dashboard/hr-assistant')} 
        className="btn btn-outline-primary mb-4"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        ← Back to Dashboard
      </button>

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
            <Card.Header className="profile-card-header">
              <h5><User size={20} className="me-2" />Personal Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>FULL NAME</label>
                    <p>{profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.name || 'N/A'}</p>
                    <small className="text-muted">Edits remaining: {remainingEdits.name || 3}</small>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>NICKNAME</label>
                    <p>{profile.nickname || 'N/A'}</p>
                    <small className="text-muted">Edits remaining: {remainingEdits.nickname || 3}</small>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>CIVIL STATUS</label>
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="mb-0">{profile.civil_status || 'N/A'}</p>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleEdit('civil_status')}
                        disabled={editCounts.civil_status >= 3}
                        title={getEditButtonText('civil_status')}
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                    <small className="text-muted">Edits remaining: {remainingEdits.civil_status || 3}</small>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>GENDER</label>
                    <p>{profile.gender || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>PLACE OF BIRTH</label>
                    <p>{profile.place_of_birth || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>DATE OF BIRTH</label>
                    <p>{formatDate(profile.birth_date)}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>AGE</label>
                    <p>{profile.age || calculateAge(profile.birth_date)}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>DEPARTMENT</label>
                    <p>{profile.department || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Address Information */}
          <Card className="profile-card">
            <Card.Header className="profile-card-header d-flex justify-content-between align-items-center">
              <h5><MapPin size={20} className="me-2" />Address Information</h5>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={() => handleEdit('address')}
                disabled={editCounts.address >= 3}
                title={getEditButtonText('address')}
                className="edit-btn-header"
              >
                <Edit2 size={14} /> Edit
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>PROVINCE</label>
                    <p>{profile.province || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>BARANGAY</label>
                    <p>{profile.barangay || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>CITY/MUNICIPALITY</label>
                    <p>{profile.city || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>POSTAL CODE</label>
                    <p>{profile.postal_code || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col sm={12}>
                  <div className="info-item">
                    <label>PRESENT ADDRESS</label>
                    <p>{profile.present_address || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <small className="text-muted">Edits remaining: {remainingEdits.address || 3}</small>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col lg={6}>
          {/* Contact Information */}
          <Card className="profile-card">
            <Card.Header className="profile-card-header d-flex justify-content-between align-items-center">
              <h5><Phone size={20} className="me-2" />Contact Information</h5>
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={() => handleEdit('contact')}
                disabled={editCounts.contact >= 3}
                title={getEditButtonText('contact')}
                className="edit-btn-header"
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
                      <label>PHONE NUMBER</label>
                      <p>{profile.contact_number || profile.phone || 'N/A'}</p>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="info-item">
                      <label>EMAIL</label>
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
                      <label>FULL NAME</label>
                      <p>{profile.emergency_contact_name || 'N/A'}</p>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="info-item">
                      <label>PHONE NUMBER</label>
                      <p>{profile.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </Col>
                </Row>
              </div>
              <small className="text-muted">Contact edits remaining: {remainingEdits.contact || 3}</small>
              <br />
              <small className="text-muted">Emergency contact edits remaining: {remainingEdits.emergency_contact || 3}</small>
            </Card.Body>
          </Card>

          {/* Employment Overview */}
          <Card className="profile-card">
            <Card.Header className="profile-card-header">
              <h5><Briefcase size={20} className="me-2" />Employment Overview</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>DATE STARTED</label>
                    <p>{formatDate(profile.hire_date)}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>EMPLOYMENT STATUS</label>
                    <p>{profile.employment_status || 'Full Time'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>POSITION</label>
                    <p>{profile.position || profile.job_title || 'HR Assistant'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>TENURITY</label>
                    <p>{profile.tenurity || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <div className="info-item">
                    <label>PHILHEALTH</label>
                    <p>{profile.philhealth || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>PAG-IBIG</label>
                    <p>{profile.pagibig || 'N/A'}</p>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <div className="info-item">
                    <label>TIN NO.</label>
                    <p>{profile.tin_no || 'N/A'}</p>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="info-item">
                    <label>SSS</label>
                    <p>{profile.sss || 'N/A'}</p>
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
          {editField === 'civil_status' && (
            <Form.Group>
              <Form.Label>Civil Status</Form.Label>
              <Form.Select 
                value={editData.civil_status || ''} 
                onChange={(e) => setEditData({...editData, civil_status: e.target.value})}
              >
                <option value="">Select civil status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
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
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Present Address</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={2}
                      value={editData.present_address || ''} 
                      onChange={(e) => setEditData({...editData, present_address: e.target.value})}
                      placeholder="Complete present address"
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

export default HrAssistantProfile;
