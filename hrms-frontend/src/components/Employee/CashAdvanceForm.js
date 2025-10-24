import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { ArrowLeft, Calendar, User, Building2, DollarSign } from 'lucide-react';
import axios from '../../axios';
import ConfirmationModal from '../common/ConfirmationModal';
import ValidationErrorModal from '../common/ValidationErrorModal';
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      // Check cache first
      const cachedData = localStorage.getItem('employeeProfile');
      const cacheTime = localStorage.getItem('employeeProfileTime');
      const now = Date.now();
      const cacheAge = now - (cacheTime ? parseInt(cacheTime) : 0);
      const isCacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes
      
      if (cachedData && isCacheValid) {
        try {
          const profileData = JSON.parse(cachedData);
          const profile = profileData.profile;
          
          setFormData(prev => ({
            ...prev,
            company: 'Cabuyao Concrete Development Corporation',
            name: profile.name || `${profile.first_name} ${profile.last_name}` || '',
            department: profile.department || 'Not Specified',
            dateField: new Date().toLocaleDateString('en-CA')
          }));
          
          setLoading(false);
          
          // Still fetch fresh data in background
          fetchFreshEmployeeData();
          return;
        } catch (e) {
          console.error('Error parsing cached data:', e);
        }
      }
      
      // Fetch fresh data
      await fetchFreshEmployeeData();
    } catch (error) {
      console.error('Error fetching employee data:', error);
      showAlert('Error loading employee information. Please try again.', 'danger');
      setLoading(false);
    }
  };

  const fetchFreshEmployeeData = async () => {
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
      console.error('Error fetching fresh employee data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleInputChange = (field, value) => {
    // Apply 5-digit limit for amountCA and remCA fields
    if (field === 'amountCA' || field === 'remCA') {
      // Remove any non-digit characters and limit to 5 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 5) {
        return; // Don't update if more than 5 digits
      }
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.amountCA || !formData.reason) {
      setValidationMessage('Please fill in all required fields.');
      setShowValidationModal(true);
      return false;
    }

    // Check amount validation
    const amount = parseFloat(formData.amountCA);
    if (isNaN(amount) || amount <= 0) {
      setValidationMessage('Please enter a valid amount greater than 0.');
      setShowValidationModal(true);
      return false;
    }

    if (amount > 999999.99) {
      setValidationMessage('The amount must not be greater than 999,999.99.');
      setShowValidationModal(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Show confirmation modal instead of submitting directly
    setShowConfirmationModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true);
      setShowConfirmationModal(false);
      
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
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error submitting request. Please try again.';
      
      // Check if it's a new hire validation error
      if (errorMessage.includes('must be employed for at least 6 months')) {
        setValidationMessage(errorMessage);
        setShowValidationModal(true);
      } else {
        showAlert(errorMessage, 'danger');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmationModal(false);
  };

  const handleCloseValidationModal = () => {
    setShowValidationModal(false);
    setValidationMessage('');
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
    <div className="cash-advance-container scrollable responsive-container" style={{ padding: '20px' }}>
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmationModal}
        title="Do you want to submit this?"
        message="Do you really want to submit this cash advance request? This action cannot be undone."
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        confirmButtonColor="#28a745"
        cancelButtonColor="#6c757d"
      />

      {/* Validation Error Modal */}
      <ValidationErrorModal
        show={showValidationModal}
        message={validationMessage}
        onClose={handleCloseValidationModal}
      />

      <Form onSubmit={handleSubmit} className="responsive-form-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
        {/* Basic Information Card */}
        <div className="responsive-card" style={{ marginBottom: '20px' }}>
          <div className="responsive-card-body">
            <div className="responsive-form-row">
              <div className="responsive-form-col">
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">Company</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text text-responsive-sm">{formData.company}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">Name</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text text-responsive-sm">{formData.name}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">Amount C.A. : *</Form.Label>
                  <div className="underline-input">
                    <Form.Control
                      type="text"
                      value={formData.amountCA}
                      onChange={(e) => handleInputChange('amountCA', e.target.value)}
                      className="underlined-input responsive-form-control"
                      placeholder="Enter amount"
                      maxLength="5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="responsive-form-col">
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">Date Field</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text text-responsive-sm">{new Date(formData.dateField).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">Department</Form.Label>
                  <div className="underline-input">
                    <span className="auto-filled-text text-responsive-sm">{formData.department}</span>
                  </div>
                </div>
                <div className="form-field">
                  <Form.Label className="field-label text-responsive-md">REM C.A. :</Form.Label>
                  <div className="underline-input">
                    <Form.Control
                      type="text"
                      value={formData.remCA}
                      onChange={(e) => handleInputChange('remCA', e.target.value)}
                      className="underlined-input responsive-form-control"
                      placeholder="Enter amount"
                      maxLength="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reason Section */}
        <div className="responsive-card" style={{ marginBottom: '20px' }}>
          <div className="responsive-card-body">
            <div className="form-field">
              <Form.Label className="field-label text-responsive-md">Reason: *</Form.Label>
              <div className="reason-lines">
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className="reason-textarea responsive-form-control"
                  placeholder="Please provide the reason for your cash advance request..."
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Section - Full Width */}
        <div className="responsive-card agreement-card" style={{ marginBottom: '20px' }}>
          <div className="responsive-header">
            <h5 className="text-responsive-md">AGREEMENT & AUTHORITY TO DEDUCT (KASUNDUAN AT AWTORIDAD NA MAGBAWAS)</h5>
          </div>
          <div className="responsive-card-body">
            <div className="agreement-text">
              <p className="text-responsive-sm">
                Ako si <span className="employee-name-filled">{formData.name}</span> empleyado ng <span className="company-name">{formData.company}</span>, ay sumasang-ayon na ako ay kakitaan sa araw ng sahod Linggo-linggo bilang kabayaran sa Cash Advance o perang inutang sa kumpanya hanggang sa ito ay matapos at mabayaran. Kasabot nito, kung ako ay matanggal (terminated) o umalis ng kusa (resigned) sa trabaho, maaaring ibawas ng kumpanya ang natitirang utang sa huling bayad at final pay at nakang makuluna. Kapag hindi naging sapat ang final pay at may balance pang utang, ang kasundang ito ay maaaring gamitin ng kumpanya sa pagasasang ng reklamo base sa pag-iwas sa responsibilidad ng pagbabayad nang hiniram at magsilbing legal na dokumento ito at katibayan ng pagpapaasunduan sa paghiram at pagbabautang ng pera.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions responsive-actions">
          <Button 
            variant="danger" 
            type="button" 
            onClick={handleCancel}
            className="action-button cancel-button responsive-btn"
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            type="submit" 
            disabled={submitting}
            className="action-button submit-button responsive-btn"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CashAdvanceForm;
