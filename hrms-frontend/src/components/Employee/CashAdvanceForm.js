import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { ArrowLeft, Calendar, User, Building2, DollarSign } from 'lucide-react';
import axios from '../../axios';
import './CashAdvanceForm.css';

const CashAdvanceForm = () => {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    department: '',
    dateField: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
    amountCA: '',
    remCA: '',
    reason: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const response = await axios.get('/employee/profile');
      
      const profile = response.data.profile || response.data;
      setFormData(prev => ({
        ...prev,
        company: 'Cabuyao Concrete Development Corporation',
        name: profile.name || `${profile.first_name} ${profile.last_name}` || '',
        department: profile.department || 'Not Specified',
        dateField: new Date().toLocaleDateString('en-CA')
      }));
    } catch (error) {
      console.error('Error fetching employee data:', error);
      showAlert('Error loading employee information. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amountCA || !formData.reason) {
      showAlert('Please fill in all required fields.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      
      const submitData = {
        reason: formData.reason,
        amount_ca: parseFloat(formData.amountCA),
        rem_ca: formData.remCA || null
      };

      // Submit to backend API
      const response = await axios.post('/cash-advances', submitData);
      
      console.log('Cash Advance Request Response:', response.data);
      
      showAlert('Cash advance request submitted successfully! HR will review your request.', 'success');
      
      // Reset form except auto-filled fields
      setFormData(prev => ({
        ...prev,
        amountCA: '',
        remCA: '',
        reason: ''
      }));
      
    } catch (error) {
      console.error('Error submitting cash advance request:', error);
      const errorMessage = error.response?.data?.message || 'Error submitting request. Please try again.';
      showAlert(errorMessage, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form except auto-filled fields
    setFormData(prev => ({
      ...prev,
      amountCA: '',
      remCA: '',
      reason: ''
    }));
  };

  if (loading) {
    return (
      <div className="cash-advance-container">
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cash-advance-container scrollable">
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Basic Information Card */}
        <Card className="form-card">
          <Card.Body>
            <Row className="g-4">
              <Col md={6}>
                <div className="form-field">
                  <Form.Label className="field-label">Company</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text">{formData.company}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label">Name</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text">{formData.name}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label">Amount C.A. : *</Form.Label>
                  <div className="underline-input">
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amountCA}
                      onChange={(e) => handleInputChange('amountCA', e.target.value)}
                      className="underlined-input"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="form-field">
                  <Form.Label className="field-label">Date Field</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text">{new Date(formData.dateField).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label">Department</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text">{formData.department}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label">REM C.A. :</Form.Label>
                  <div className="underline-input">
                    <Form.Control
                      type="text"
                      value={formData.remCA}
                      onChange={(e) => handleInputChange('remCA', e.target.value)}
                      className="underlined-input"
                      placeholder="Remarks (optional)"
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Reason Section */}
        <Card className="form-card">
          <Card.Body>
            <div className="form-field">
              <Form.Label className="field-label">Reason: *</Form.Label>
              <div className="reason-lines">
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className="reason-textarea"
                  placeholder="Please provide the reason for your cash advance request..."
                  required
                />
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Agreement Section - Full Width */}
        <Card className="form-card agreement-card">
          <Card.Header className="agreement-header">
            <h5>AGREEMENT & AUTHORITY TO DEDUCT (KASUNDUAN AT AWTORIDAD NA MAGBAWAS)</h5>
          </Card.Header>
          <Card.Body>
            <div className="agreement-text">
              <p>
                Ako si <span className="employee-name-filled">{formData.name}</span> empleyado ng <span className="company-name">{formData.company}</span>, ay sumasang-ayon na ako ay kakitaan sa araw ng sahod Linggo-linggo bilang kabayaran sa Cash Advance o perang inutang sa kumpanya hanggang sa ito ay matapos at mabayaran. Kasabot nito, kung ako ay matanggal (terminated) o umalis ng kusa (resigned) sa trabaho, maaaring ibawas ng kumpanya ang natitirang utang sa huling bayad at final pay at nakang makuluna. Kapag hindi naging sapat ang final pay at may balance pang utang, ang kasundang ito ay maaaring gamitin ng kumpanya sa pagasasang ng reklamo base sa pag-iwas sa responsibilidad ng pagbabayad nang hiniram at magsilbing legal na dokumento ito at katibayan ng pagpapaasunduan sa paghiram at pagbabautang ng pera.
              </p>
            </div>
          </Card.Body>
        </Card>

        {/* Action Buttons */}
        <div className="form-actions">
          <Button 
            variant="danger" 
            type="button" 
            onClick={handleCancel}
            className="action-button cancel-button"
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            type="submit" 
            disabled={submitting}
            className="action-button submit-button"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CashAdvanceForm;
