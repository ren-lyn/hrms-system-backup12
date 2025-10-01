// Test notification utility for debugging
import { sendEvaluationNotification } from '../api/notifications';

export const createTestEvaluationNotification = async () => {
  try {
    console.log('Creating test evaluation notification...');
    
    // Create a test notification
    const testNotification = {
      type: 'evaluation_result',
      title: 'TEST: Performance Evaluation Completed',
      message: 'This is a test notification. Your performance evaluation has been completed by your manager. Click to view your results and download the report.',
      evaluation_id: 123, // Test ID
      employee_id: null, // Will be filled by current user
      metadata: {
        employee_name: 'Test Employee',
        employee_department: 'Test Department',
        evaluation_date: new Date().toISOString()
      }
    };

    // Try to send via API first
    try {
      await sendEvaluationNotification(123, null, {
        employee_name: 'Test Employee',
        employee_department: 'Test Department'
      });
      console.log('Test notification sent via API');
      return { success: true, method: 'api' };
    } catch (apiError) {
      console.log('API method failed, trying direct method:', apiError);
      
      // If API fails, try direct axios call
      const axios = (await import('axios')).default;
      
      await axios.post('http://localhost:8000/api/notifications/send-evaluation', testNotification, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Test notification sent via direct axios');
      return { success: true, method: 'direct' };
    }
    
  } catch (error) {
    console.error('Failed to create test notification:', error);
    return { success: false, error: error.message };
  }
};

export const createTestDisciplinaryNotification = async () => {
  try {
    console.log('Creating test disciplinary notification...');
    
    const testNotification = {
      type: 'disciplinary_action_issued',
      title: 'TEST: Disciplinary Action Issued',
      message: 'This is a test notification. A disciplinary action has been issued for you. Please review the details and provide your explanation if required.',
      disciplinary_action_id: 456, // Test ID
      employee_id: null, // Will be filled by current user
      metadata: {
        employee_name: 'Test Employee',
        action_type: 'Written Warning',
        action_date: new Date().toISOString()
      }
    };

    const axios = (await import('axios')).default;
    
    await axios.post('http://localhost:8000/api/notifications/send-disciplinary', testNotification, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test disciplinary notification sent');
    return { success: true };
    
  } catch (error) {
    console.error('Failed to create test disciplinary notification:', error);
    return { success: false, error: error.message };
  }
};

// Function to create a mock notification locally (for testing UI without backend)
export const createMockNotification = (type = 'evaluation_result') => {
  const notifications = {
    evaluation_result: {
      id: Date.now(),
      type: 'evaluation_result',
      title: 'TEST: Performance Evaluation Completed',
      message: 'Your performance evaluation has been completed by your manager. Click to view your results and download the report.',
      evaluation_id: 123,
      created_at: new Date().toISOString(),
      read_at: null,
      metadata: {
        employee_name: 'Test Employee',
        evaluation_date: new Date().toISOString()
      }
    },
    disciplinary_action_issued: {
      id: Date.now() + 1,
      type: 'disciplinary_action_issued',
      title: 'TEST: Disciplinary Action Issued',
      message: 'A disciplinary action has been issued for you. Please review the details and provide your explanation if required.',
      disciplinary_action_id: 456,
      created_at: new Date().toISOString(),
      read_at: null,
      metadata: {
        action_type: 'Written Warning',
        action_date: new Date().toISOString()
      }
    }
  };
  
  return notifications[type];
};