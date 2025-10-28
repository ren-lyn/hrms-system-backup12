import React, { useState, useEffect, useRef } from 'react';
import { Alert, Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';

const NotificationSystem = ({ userId, userRole, onApplicationUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const intervalRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (userRole === 'Applicant') {
      console.log('NotificationSystem: Setting up for applicant', userId);
      // Initial check
      checkApplicationUpdates();
      
      // Set up polling every 60 seconds (reduced from 10s)
      intervalRef.current = setInterval(() => {
        console.log('NotificationSystem: Polling for updates...');
        checkApplicationUpdates();
      }, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, userRole]);

  const checkApplicationUpdates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:8000/api/my-applications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const applications = response.data || [];
      
      // Check for status changes that should trigger notifications
      applications.forEach(app => {
        const storageKey = `app_${app.id}_last_status`;
        const lastNotifiedStatus = localStorage.getItem(storageKey);
        
        if (isFirstLoad.current) {
          // On first load, just store the current status without showing notifications
          localStorage.setItem(storageKey, app.status);
        } else if (lastNotifiedStatus && lastNotifiedStatus !== app.status) {
          // Status changed, show notification
          console.log(`Status changed for application ${app.id}: ${lastNotifiedStatus} -> ${app.status}`);
          showStatusNotification(app, lastNotifiedStatus);
          localStorage.setItem(storageKey, app.status);
        } else if (!lastNotifiedStatus) {
          // New application, store status
          localStorage.setItem(storageKey, app.status);
        }
      });
      
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      }
      
      // Trigger callback if provided
      if (onApplicationUpdate) {
        onApplicationUpdate(applications);
      }
    } catch (error) {
      console.error('Error checking application updates:', error);
    }
  };
  
  // Expose manual check function
  const manualCheck = () => {
    console.log('Manual check triggered');
    checkApplicationUpdates();
  };
  
  // Add manual check to window for debugging
  React.useEffect(() => {
    window.checkNotifications = manualCheck;
    return () => {
      delete window.checkNotifications;
    };
  }, []);

  const showStatusNotification = (application, previousStatus) => {
    let message = '';
    let type = 'info';
    
    switch (application.status) {
      case 'ShortListed':
        message = `🎉 Great news! You have been shortlisted for "${application.job_posting?.title}". Interview will be scheduled soon.`;
        type = 'success';
        break;
      case 'Interview':
        message = `📅 Interview scheduled for "${application.job_posting?.title}". Check your applications for details.`;
        type = 'info';
        break;
      case 'Offer Sent':
        message = `🎊 Congratulations! You have received a job offer for "${application.job_posting?.title}". Please review and respond.`;
        type = 'warning';
        break;
      case 'Offer Accepted':
        message = `✅ Your acceptance for "${application.job_posting?.title}" has been confirmed. Onboarding will begin soon.`;
        type = 'success';
        break;
      case 'For Onboarding':
        message = `🚀 Welcome aboard! Your onboarding process for "${application.job_posting?.title}" has begun.`;
        type = 'success';
        break;
      case 'Rejected':
        message = `Thank you for your interest in "${application.job_posting?.title}". Unfortunately, we have decided to move forward with other candidates.`;
        type = 'danger';
        break;
      default:
        return;
    }

    console.log('Showing notification:', message);
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Add to persistent notifications
    const newNotification = {
      id: Date.now(),
      title: `Application Status Updated`,
      message: message,
      status: application.status,
      timestamp: new Date().toLocaleTimeString(),
      jobTitle: application.job_posting?.title
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 latest
    
    // Auto-hide toast after 10 seconds
    setTimeout(() => setShowToast(false), 10000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ShortListed':
      case 'For Onboarding':
        return 'success';
      case 'Interview':
        return 'info';
      case 'Offer Sent':
        return 'warning';
      case 'Rejected':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <ToastContainer className="p-3" position="top-end" style={{ zIndex: 9999 }}>
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          className={`mb-2 border-${toastType}`}
          bg={toastType === 'danger' ? 'danger' : toastType === 'success' ? 'success' : toastType === 'warning' ? 'warning' : 'info'}
        >
          <Toast.Header className={toastType === 'danger' || toastType === 'success' ? 'text-white' : ''}>
            <i className={`bi ${
              toastType === 'success' ? 'bi-check-circle-fill' :
              toastType === 'warning' ? 'bi-exclamation-triangle-fill' :
              toastType === 'danger' ? 'bi-x-circle-fill' :
              'bi-info-circle-fill'
            } me-2`}></i>
            <strong className="me-auto">Application Status Update</strong>
            <small>Just now</small>
          </Toast.Header>
          <Toast.Body className={toastType === 'danger' || toastType === 'success' ? 'text-white' : 'text-dark'}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Persistent Notifications List (optional) */}
      {notifications.length > 0 && (
        <div className="notification-list mt-3">
          <h6 className="fw-bold text-muted">Recent Notifications</h6>
          {notifications.map((notification, index) => (
            <Alert 
              key={index}
              variant={getStatusColor(notification.status)}
              dismissible
              onClose={() => {
                setNotifications(notifications.filter((_, i) => i !== index));
              }}
              className="small"
            >
              <div className="d-flex align-items-start">
                <i className="bi bi-info-circle-fill me-2 mt-1"></i>
                <div>
                  <strong>{notification.title}</strong>
                  <div>{notification.message}</div>
                  <small className="text-muted">{notification.timestamp}</small>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationSystem;