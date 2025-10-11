import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/OnboardingStyles.css';

const OnboardingLoading = ({ 
  message = 'Loading...', 
  size = 'medium',
  showSpinner = true 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'onboarding-loading-sm';
      case 'large':
        return 'onboarding-loading-lg';
      default:
        return 'onboarding-loading';
    }
  };

  return (
    <div className={getSizeClass()}>
      {showSpinner && (
        <div className="onboarding-spinner me-3"></div>
      )}
      <span>{message}</span>
    </div>
  );
};

export default OnboardingLoading;

