import React from 'react';

const ValidationErrorModal = ({ 
  show, 
  title = "Validation Error", 
  message,
  onClose,
  buttonColor = "#dc3545"
}) => {
  if (!show) return null;

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
            margin: '0 auto',
            backgroundColor: 'white'
          }}
        >
          {/* Close button */}
          <div className="modal-header border-0 p-0">
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              ×
            </button>
          </div>

          <div 
            className="modal-body p-4 text-center"
            style={{ backgroundColor: 'white' }}
          >
            {/* Error Icon */}
            <div 
              className="mb-3"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#dc3545',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '0 auto'
                }}
              >
                <span
                  style={{
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </span>
              </div>
            </div>

            {/* Title */}
            <h4 
              className="mb-3 fw-bold"
              style={{ 
                color: '#dc3545',
                fontSize: '1.5rem'
              }}
            >
              Sorry!
            </h4>

            {/* Message */}
            <p 
              className="mb-4"
              style={{ 
                color: '#6c757d',
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
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 2rem',
                fontSize: '1rem',
                fontWeight: 'bold',
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

export default ValidationErrorModal;
