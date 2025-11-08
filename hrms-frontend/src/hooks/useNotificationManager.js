import { useEffect, useRef, useState } from 'react';

class NotificationManager {
  constructor() {
    this.eventSource = null;
    this.listeners = new Set();
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.lastNotificationId = null;
  }

  addListener(callback) {
    this.listeners.add(callback);
    
    // If this is the first listener, establish connection
    if (this.listeners.size === 1) {
      this.connect();
    }
    
    return () => {
      this.listeners.delete(callback);
      
      // If no more listeners, close connection
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  connect() {
    if (this.isConnecting || this.eventSource) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      // Silent fail - no token means not authenticated
      return;
    }

    this.isConnecting = true;
    const url = `http://localhost:8000/api/notifications/stream?token=${encodeURIComponent(token)}`;
    // Removed verbose logging to reduce console noise

    this.eventSource = new EventSource(url, { withCredentials: false });

    this.eventSource.onopen = () => {
      // Only log connection issues, not successful connections
      this.isConnecting = false;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.eventSource.onerror = (e) => {
      // Only log errors if connection was actually established
      if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
        // Connection closed - will attempt reconnect with backoff
      }
      this.isConnecting = false;
      this.disconnect();

      // Implement exponential backoff for reconnection with longer initial delay
      if (this.listeners.size > 0) {
        const delay = Math.min(15000 + Math.random() * 10000, 60000); // 15-25 seconds with jitter, max 60s
        this.reconnectTimeout = setTimeout(() => {
          if (this.listeners.size > 0) {
            this.connect();
          }
        }, delay);
      }
    };

    this.eventSource.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        // Removed verbose logging - notifications are handled silently
        this.lastNotificationId = data.id;
        
        // Notify all listeners
        this.listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            // Only log actual errors, not normal operation
            console.error('NotificationManager: Error in listener callback:', error);
          }
        });
      } catch (err) {
        // Only log parsing errors - silent otherwise
        if (process.env.NODE_ENV === 'development') {
          console.error('NotificationManager: Error parsing notification:', err);
        }
      }
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      // Silent disconnect - no logging needed
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  getLastNotificationId() {
    return this.lastNotificationId;
  }
}

// Global singleton instance
const notificationManager = new NotificationManager();

export const useNotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleNotification = (notification) => {
      setNotifications(prev => {
        // Check if notification already exists to avoid duplicates
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });
    };

    const removeListener = notificationManager.addListener(handleNotification);

    return () => {
      removeListener();
    };
  }, []);

  return {
    notifications,
    isConnected,
    addListener: notificationManager.addListener.bind(notificationManager),
    getLastNotificationId: notificationManager.getLastNotificationId.bind(notificationManager)
  };
};

export default notificationManager;





