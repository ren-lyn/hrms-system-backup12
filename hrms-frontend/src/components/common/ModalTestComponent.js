import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

const ModalTestComponent = () => {
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    console.log('Confirmed!');
    setShowModal(false);
  };

  const handleCancel = () => {
    console.log('Cancelled!');
    setShowModal(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Confirmation Modal Test</h2>
      <button 
        onClick={() => setShowModal(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Test Confirmation Modal
      </button>

      <ConfirmationModal
        show={showModal}
        title="Do you want to submit this?"
        message="Do you really want to submit this cash advance request? This action cannot be undone."
        confirmText="Submit"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmButtonColor="#28a745"
        cancelButtonColor="#6c757d"
      />
    </div>
  );
};

export default ModalTestComponent;