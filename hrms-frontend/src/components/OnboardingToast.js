import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../styles/OnboardingStyles.css';

const OnboardingToast = ({ 
  show, 
  type = 'success', 
  title, 
  message, 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

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

  const getToastClass = () => {
    const baseClass = 'onboarding-toast';
    const typeClass = `onboarding-toast-${type}`;
    const animationClass = isExiting ? 'onboarding-slide-out' : '';
    return `${baseClass} ${typeClass} ${animationClass}`;
  };

  if (!isVisible) return null;

  return (
    <div className={getToastClass()}>
      <div className="d-flex align-items-start">
        <div className="flex-shrink-0 me-3">
          <FontAwesomeIcon 
            icon={getIcon()} 
            size="lg" 
            className="mt-1"
          />
        </div>
        <div className="flex-grow-1">
          {title && (
            <div className="fw-bold mb-1">{title}</div>
          )}
          <div className="small">{message}</div>
        </div>
        <button
          type="button"
          className="btn-close btn-close-white ms-3"
          onClick={handleClose}
          aria-label="Close"
        />
      </div>
    </div>
  );
};

export default OnboardingToast;