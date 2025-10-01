import API from '../axios';

// Base URL already includes /api
export const fetchNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/read`);

// Enhanced notification handling for specific types
export const getNotificationTypes = () => ({
  EVALUATION_RESULT: 'evaluation_result',
  DISCIPLINARY_ACTION: 'disciplinary_action_issued',
  DISCIPLINARY_VERDICT: 'disciplinary_verdict_issued',
  LEAVE_STATUS: 'leave_status',
  CASH_ADVANCE_STATUS: 'cash_advance_status'
});

// Helper function to get notification icon
export const getNotificationIcon = (type) => {
  const types = getNotificationTypes();
  switch (type) {
    case types.EVALUATION_RESULT:
      return '📊';
    case types.DISCIPLINARY_ACTION:
    case types.DISCIPLINARY_VERDICT:
      return '⚠️';
    case types.CASH_ADVANCE_STATUS:
      return '💰';
    case types.LEAVE_STATUS:
      return '📅';
    default:
      return '📢';
  }
};

// Notification sending functions
export const sendEvaluationNotification = async (evaluationId, employeeId, additionalData = {}) => {
  try {
    const notificationData = {
      type: 'evaluation_result',
      title: 'Performance Evaluation Completed',
      message: 'Your performance evaluation has been completed by your manager. Click to view your results and download the report.',
      evaluation_id: evaluationId,
      employee_id: employeeId,
      metadata: {
        evaluation_date: new Date().toISOString(),
        ...additionalData
      }
    };

    const response = await API.post('/notifications/send-evaluation', notificationData);
    console.log('Evaluation notification sent successfully:', response.data);
    return response;
  } catch (error) {
    console.error('Failed to send evaluation notification:', error);
    throw error;
  }
};

export const sendDisciplinaryNotification = async (disciplinaryActionId, employeeId, additionalData = {}) => {
  try {
    const notificationData = {
      type: 'disciplinary_action_issued',
      title: 'Disciplinary Action Issued',
      message: 'A disciplinary action has been issued for you. Please review the details and provide your explanation if required.',
      disciplinary_action_id: disciplinaryActionId,
      employee_id: employeeId,
      metadata: {
        action_date: new Date().toISOString(),
        ...additionalData
      }
    };

    const response = await API.post('/notifications/send-disciplinary', notificationData);
    console.log('Disciplinary notification sent successfully:', response.data);
    return response;
  } catch (error) {
    console.error('Failed to send disciplinary notification:', error);
    throw error;
  }
};
// Helper function to determine if notification should trigger specific action
export const getNotificationAction = (notification) => {
  const types = getNotificationTypes();
  
  switch (notification.type) {
    case types.EVALUATION_RESULT:
      return {
        action: 'OPEN_EVALUATION',
        id: notification.evaluation_id,
        data: notification
      };
    case types.DISCIPLINARY_ACTION:
    case types.DISCIPLINARY_VERDICT:
      return {
        action: 'OPEN_DISCIPLINARY',
        id: notification.disciplinary_action_id || notification.action_id,
        data: notification
      };
    case types.LEAVE_STATUS:
      return {
        action: 'OPEN_LEAVE',
        id: notification.leave_id,
        data: notification
      };
    case types.CASH_ADVANCE_STATUS:
      return {
        action: 'OPEN_CASH_ADVANCE',
        id: notification.cash_advance_id,
        data: notification
      };
    default:
      return {
        action: 'NONE',
        id: null,
        data: notification
      };
  }
};

