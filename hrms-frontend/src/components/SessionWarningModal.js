import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const SessionWarningModal = ({ show, timeRemaining, onExtend, onLogout }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      onHide={onExtend}
      style={{ zIndex: 10000 }}
    >
      <Modal.Header style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
        <Modal.Title style={{ color: '#856404', fontWeight: 'bold' }}>
          ⚠️ Session Expiring Soon
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px' }}>
        <p style={{ fontSize: '16px', marginBottom: '15px' }}>
          Your session will expire due to inactivity in:
        </p>
        <div style={{ 
          textAlign: 'center', 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#dc3545',
          marginBottom: '20px',
          fontFamily: 'monospace'
        }}>
          {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
        </div>
        <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: 0 }}>
          Click "Stay Logged In" to continue your session, or you will be automatically logged out.
        </p>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '2px solid #ffc107' }}>
        <Button variant="secondary" onClick={onLogout}>
          Log Out Now
        </Button>
        <Button variant="warning" onClick={onExtend} style={{ fontWeight: 'bold' }}>
          Stay Logged In
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SessionWarningModal;

