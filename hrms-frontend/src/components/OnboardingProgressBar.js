import React from 'react';
import '../styles/OnboardingStyles.css';

const OnboardingProgressBar = ({ 
  current, 
  total, 
  showText = true, 
  showPercentage = true,
  animated = true 
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const getProgressText = () => {
    if (showText && showPercentage) {
      return `${current} of ${total} completed (${percentage}%)`;
    } else if (showText) {
      return `${current} of ${total} completed`;
    } else if (showPercentage) {
      return `${percentage}%`;
    }
    return '';
  };

  return (
    <div className="onboarding-progress-container">
      {showText && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="small text-muted">Progress</span>
          <span className="small text-muted">{getProgressText()}</span>
        </div>
      )}
      <div className="onboarding-progress-bar">
        <div 
          className={`onboarding-progress-fill ${animated ? 'animated' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default OnboardingProgressBar;