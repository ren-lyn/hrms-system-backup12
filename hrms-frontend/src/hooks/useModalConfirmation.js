import React, { useState, useCallback } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

/**
 * Hook for modal confirmation dialogs
 * @param {Function} onConfirm - Function to call when user confirms
 * @param {Object} options - Configuration options
 * @returns {Object} - Modal confirmation utilities
 */
export const useModalConfirmation = (onConfirm, options = {}) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Confirm Action');

  const showConfirmation = useCallback((msg, confirmCallback, config = {}) => {
    setMessage(msg);
    setTitle(config.title || 'Confirm Action');
    setShow(true);
    
    // Store the callback for later use
    window._modalConfirmCallback = confirmCallback;
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setLoading(true);
      
      if (window._modalConfirmCallback) {
        await window._modalConfirmCallback();
      } else if (onConfirm) {
        await onConfirm();
      }
      
      setShow(false);
      toast.success('Action completed successfully');
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Action failed. Please try again.');
    } finally {
      setLoading(false);
      window._modalConfirmCallback = null;
    }
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setShow(false);
    window._modalConfirmCallback = null;
  }, []);

  const ConfirmationModal = () => (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center">
          <div className="mb-3">
            <i className="fas fa-question-circle text-warning" style={{ fontSize: '3rem' }}></i>
          </div>
          <p className="mb-0">{message}</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Processing...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return {
    showConfirmation,
    ConfirmationModal,
    isShowing: show
  };
};

/**
 * Advanced modal confirmation hook with form support
 * @param {string} formName - Name of the form
 * @param {Function} onConfirm - Function to call when user confirms
 * @param {Function} onCancel - Function to call when user cancels
 * @param {Object} options - Configuration options
 * @returns {Object} - Advanced modal confirmation utilities
 */
export const useAdvancedModalConfirmation = (formName, onConfirm, onCancel, options = {}) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Confirm Action');
  const [formData, setFormData] = useState({});

  const showConfirmation = useCallback((msg, confirmCallback, config = {}) => {
    setMessage(msg);
    setTitle(config.title || 'Confirm Action');
    setFormData(config.formData || {});
    setShow(true);
    
    // Store the callback for later use
    window._advancedModalConfirmCallback = confirmCallback;
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setLoading(true);
      
      if (window._advancedModalConfirmCallback) {
        await window._advancedModalConfirmCallback(formData);
      } else if (onConfirm) {
        await onConfirm(formData);
      }
      
      setShow(false);
      toast.success('Action completed successfully');
    } catch (error) {
      console.error('Advanced confirmation error:', error);
      toast.error('Action failed. Please try again.');
    } finally {
      setLoading(false);
      window._advancedModalConfirmCallback = null;
    }
  }, [onConfirm, formData]);

  const handleCancel = useCallback(() => {
    setShow(false);
    if (onCancel) {
      onCancel(formData);
    }
    window._advancedModalConfirmCallback = null;
  }, [onCancel, formData]);

  const AdvancedConfirmationModal = () => (
    <Modal show={show} onHide={handleCancel} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center">
          <div className="mb-3">
            <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
          </div>
          <p className="mb-3">{message}</p>
          {Object.keys(formData).length > 0 && (
            <div className="text-start">
              <h6>Details:</h6>
              <ul className="list-unstyled">
                {Object.entries(formData).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Processing...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return {
    showConfirmation,
    AdvancedConfirmationModal,
    isShowing: show,
    formData
  };
};

export default useModalConfirmation;
