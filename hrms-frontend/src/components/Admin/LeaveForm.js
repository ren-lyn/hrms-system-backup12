import React from 'react';
import EmbeddedLeaveForm from '../Employee/EmbeddedLeaveForm';
import './LeaveForm.css';

const LeaveForm = () => {
  return (
    <div className="admin-leave-form">
      <div className="admin-leave-form__header">
        <h2>Leave Form</h2>
        <p>Access the same leave application form used by employees.</p>
      </div>
      <div className="admin-leave-form__content">
        <EmbeddedLeaveForm />
      </div>
    </div>
  );
};

export default LeaveForm;

