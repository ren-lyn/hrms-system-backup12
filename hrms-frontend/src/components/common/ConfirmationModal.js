import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
  show,
  onHide,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon = AlertTriangle,
  isLoading = false
}) => {
  const IconComponent = icon;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="sm"
      backdrop="static"
      keyboard={false}
      centered
      className="confirmation-modal"
      style={{ zIndex: 10001 }}
    >
      <Modal.Header className="confirmation-header">
        <Modal.Title className="confirmation-title">
          <IconComponent size={20} className="me-2" />
          {title}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="confirmation-body">
        <div className="confirmation-message">
          {message}
        </div>
      </Modal.Body>
      
      <Modal.Footer className="confirmation-footer">
        <Button 
          variant="secondary" 
          onClick={onHide}
          disabled={isLoading}
          className="confirmation-cancel-btn"
        >
          {cancelText}
        </Button>
        <Button 
          variant={variant} 
          onClick={onConfirm}
          disabled={isLoading}
          className="confirmation-confirm-btn"
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing...
            </>
          ) : (
            confirmText
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;