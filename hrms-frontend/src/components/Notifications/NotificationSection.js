import React, { useEffect, useState } from 'react';
import { fetchNotifications, getNotificationAction, getNotificationIcon } from '../../api/notifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

const NotificationSection = ({ onOpenLeave, onOpenCashAdvance, onOpenEvaluation, onOpenDisciplinary, onOpenCalendar, onOpenJobApplications, onOpenJobPostings }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetchNotifications();
      console.log('Dashboard notifications response:', res.data);
      const list = res.data.data || [];
      console.log('All notifications:', list);
      console.log('Notification types:', list.map(n => ({ id: n.id, type: n.type, title: n.title })));
      
      // Get the most recent 3 unread notifications for dashboard display
      const recentNotifications = list
        .filter(n => !n.read_at)
        .slice(0, 3);
      
      console.log('Recent unread notifications:', recentNotifications);
      setNotifications(recentNotifications);
      setError(null);
    } catch (e) {
      console.error('Error loading dashboard notifications:', e);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 10 seconds
    const interval = setInterval(loadNotifications, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notification) => {
    console.log('Dashboard notification clicked:', notification);
    
    // Use the enhanced notification action handler
    const notificationAction = getNotificationAction(notification);
    console.log('Notification action:', notificationAction);
    
    switch (notificationAction.action) {
      case 'OPEN_EVALUATION':
        if (onOpenEvaluation && notificationAction.id) {
          onOpenEvaluation(notificationAction.id, notificationAction.data);
        }
        break;
      case 'OPEN_DISCIPLINARY':
        if (onOpenDisciplinary) {
          onOpenDisciplinary(notificationAction.id, notificationAction.data);
        }
        break;
      case 'OPEN_LEAVE':
        if (onOpenLeave && notificationAction.id) {
          onOpenLeave(notificationAction.id, notificationAction.data);
        }
        break;
      case 'OPEN_CASH_ADVANCE':
        if (onOpenCashAdvance && notificationAction.id) {
          onOpenCashAdvance(notificationAction.id, notificationAction.data);
        }
        break;
        case 'OPEN_CALENDAR':
          if (onOpenCalendar) {
            onOpenCalendar(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_JOB_APPLICATIONS':
          if (onOpenJobApplications) {
            onOpenJobApplications(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_JOB_POSTINGS':
          if (onOpenJobPostings) {
            onOpenJobPostings(notificationAction.id, notificationAction.data);
          }
          break;
        default:
          console.log('No specific action for notification type:', notification.type);
    }
  };


  if (loading) {
    return (
      <div className="card shadow-sm p-3 rounded-4">
        <h6 className="text-secondary mb-3">
          <FontAwesomeIcon icon={faBell} className="me-2 text-warning" /> Notifications
        </h6>
        <div className="d-flex justify-content-center">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card shadow-sm p-3 rounded-4">
        <h6 className="text-secondary mb-3">
          <FontAwesomeIcon icon={faBell} className="me-2 text-warning" /> Notifications
        </h6>
        <div className="text-muted small">
          <div className="text-danger">⚠️ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm p-3 rounded-4">
      <h6 className="text-secondary mb-3">
        <FontAwesomeIcon icon={faBell} className="me-2 text-warning" /> Notifications
      </h6>
      <div className="small ps-2">
        {notifications.length === 0 ? (
          <div className="text-muted">No new notifications</div>
        ) : (
          <ul className="list-unstyled">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className="mb-2"
                style={{ cursor: 'pointer' }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="d-flex align-items-start">
                  <span className="me-2">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-primary" style={{ fontSize: '0.85rem' }}>
                      {notification.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {notification.message}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {notifications.length > 0 && (
          <div className="text-center mt-2">
            <small className="text-muted">
              Click on a notification to view details • Check the bell icon for more
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSection;