import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const ValidationModal = ({ 
  show, 
  type = 'success', 
  title, 
  message, 
  onClose 
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faTimesCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'info':
        return faInfoCircle;
      default:
        return faCheckCircle;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#28a745';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#28a745';
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'success':
        return 'Oh Yeah!';
      case 'error':
        return 'Sorry!';
      case 'warning':
        return 'Warning!';
      case 'info':
        return 'Information';
      default:
        return 'Success!';
    }
  };

  return (
    <div 
      className="modal show d-block" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div 
          className="modal-content border-0 shadow-lg"
          style={{
            borderRadius: '0.5rem',
            maxWidth: '400px',
            margin: '0 auto'
          }}
        >
          <div 
            className="modal-body p-4 text-center"
            style={{ backgroundColor: 'white' }}
          >
            {/* Icon */}
            <div className="mb-3">
              <FontAwesomeIcon 
                icon={getIcon()} 
                size="3x"
                style={{ 
                  color: getIconColor(),
                  fontSize: '4rem'
                }}
              />
            </div>

            {/* Title */}
            <h4 
              className="mb-3 fw-bold"
              style={{ 
                color: getIconColor(),
                fontSize: '1.5rem'
              }}
            >
              {getTitle()}
            </h4>

            {/* Message */}
            <p 
              className="mb-4"
              style={{ 
                color: '#333',
                fontSize: '1rem',
                lineHeight: '1.4'
              }}
            >
              {message}
            </p>

            {/* OK Button */}
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{
                backgroundColor: getButtonColor(),
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 2rem',
                fontSize: '1rem',
                fontWeight: '500',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
