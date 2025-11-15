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
  CASH_ADVANCE_STATUS: 'cash_advance_status',
  MEETING_INVITATION: 'meeting_invitation',
  LEAVE_REQUEST_SUBMITTED: 'leave_request_submitted',
  CASH_ADVANCE_SUBMITTED: 'cash_advance_submitted',
  EVALUATION_SUBMITTED: 'evaluation_submitted',
  DISCIPLINARY_REPORT_SUBMITTED: 'disciplinary_report_submitted',
  DISCIPLINARY_REPORT_SUBMITTED_TO_MANAGER: 'disciplinary_report_submitted_to_manager',
  JOB_APPLICATION_SUBMITTED: 'job_application_submitted',
  JOB_APPLICATION_STATUS_CHANGED: 'job_application_status_changed',
  JOB_POSTING_CREATED: 'job_posting_created',
  LEAVE_REQUEST_SUBMITTED_HR: 'leave_request_submitted_hr',
  INVESTIGATION_ASSIGNED: 'investigation_assigned',
  BENEFIT_CLAIM_STATUS_CHANGED: 'benefit_claim_status_changed'
});

// Helper function to get notification icon
export const getNotificationIcon = (type) => {
  const types = getNotificationTypes();
  switch (type) {
    case types.EVALUATION_RESULT:
    case types.EVALUATION_SUBMITTED:
      return '📊';
    case types.DISCIPLINARY_ACTION:
    case types.DISCIPLINARY_VERDICT:
    case types.DISCIPLINARY_REPORT_SUBMITTED:
    case types.DISCIPLINARY_REPORT_SUBMITTED_TO_MANAGER:
    case types.INVESTIGATION_ASSIGNED:
      return '⚠️';
    case types.CASH_ADVANCE_STATUS:
    case types.CASH_ADVANCE_SUBMITTED:
      return '💰';
    case types.LEAVE_STATUS:
    case types.LEAVE_REQUEST_SUBMITTED:
    case types.LEAVE_REQUEST_SUBMITTED_HR:
      return '📅';
    case types.MEETING_INVITATION:
      return '👥';
    case types.JOB_APPLICATION_SUBMITTED:
    case types.JOB_APPLICATION_STATUS_CHANGED:
    case types.JOB_POSTING_CREATED:
      return '💼';
    case types.BENEFIT_CLAIM_STATUS_CHANGED:
      return '📋';
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
    case types.EVALUATION_SUBMITTED:
      return {
        action: 'OPEN_EVALUATION',
        id: notification.evaluation_id,
        data: notification
      };
    case types.DISCIPLINARY_ACTION:
    case types.DISCIPLINARY_VERDICT:
    case types.DISCIPLINARY_REPORT_SUBMITTED:
    case types.DISCIPLINARY_REPORT_SUBMITTED_TO_MANAGER:
    case types.INVESTIGATION_ASSIGNED:
      return {
        action: 'OPEN_DISCIPLINARY',
        id: notification.disciplinary_action_id || notification.action_id || notification.report_id,
        data: notification
      };
    case types.LEAVE_STATUS:
    case types.LEAVE_REQUEST_SUBMITTED:
    case types.LEAVE_REQUEST_SUBMITTED_HR:
      return {
        action: 'OPEN_LEAVE',
        id: notification.leave_id,
        data: notification
      };
    case types.CASH_ADVANCE_STATUS:
    case types.CASH_ADVANCE_SUBMITTED:
      return {
        action: 'OPEN_CASH_ADVANCE',
        id: notification.cash_advance_id,
        data: notification
      };
    case types.MEETING_INVITATION:
      return {
        action: 'OPEN_CALENDAR',
        id: notification.event_id,
        data: notification
      };
    case types.JOB_APPLICATION_SUBMITTED:
    case types.JOB_APPLICATION_STATUS_CHANGED:
      return {
        action: 'OPEN_JOB_APPLICATIONS',
        id: notification.application_id,
        data: notification
      };
    case types.JOB_POSTING_CREATED:
      return {
        action: 'OPEN_JOB_POSTINGS',
        id: notification.job_posting_id,
        data: notification
      };
    case types.BENEFIT_CLAIM_STATUS_CHANGED:
      return {
        action: 'OPEN_BENEFIT_CLAIM',
        id: notification.benefit_claim_id,
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

