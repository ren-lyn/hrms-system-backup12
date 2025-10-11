import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faClock, 
  faTimesCircle, 
  faExclamationTriangle,
  faCircle
} from '@fortawesome/free-solid-svg-icons';
import '../styles/OnboardingStyles.css';

const OnboardingStatusBadge = ({ status, showIcon = true, size = 'normal' }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'complete':
      case 'completed':
        return {
          class: 'onboarding-status-approved',
          icon: faCheckCircle,
          text: 'Approved'
        };
      case 'pending':
      case 'in_progress':
      case 'review':
        return {
          class: 'onboarding-status-pending',
          icon: faClock,
          text: 'Pending'
        };
      case 'rejected':
      case 'error':
      case 'failed':
        return {
          class: 'onboarding-status-rejected',
          icon: faTimesCircle,
          text: 'Rejected'
        };
      case 'not_started':
      case 'not_submitted':
      case 'incomplete':
        return {
          class: 'onboarding-status-not-started',
          icon: faCircle,
          text: 'Not Started'
        };
      default:
        return {
          class: 'onboarding-status-not-started',
          icon: faCircle,
          text: status || 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClass = size === 'small' ? 'small' : '';

  return (
    <span className={`onboarding-status-badge ${config.class} ${sizeClass}`}>
      {showIcon && (
        <FontAwesomeIcon icon={config.icon} />
      )}
      {config.text}
    </span>
  );
};

export default OnboardingStatusBadge;

