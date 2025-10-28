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
      console.log('No token found for SSE');
      return;
    }

    this.isConnecting = true;
    const url = `http://localhost:8000/api/notifications/stream?token=${encodeURIComponent(token)}`;
    console.log('NotificationManager: Connecting to SSE:', url);

    this.eventSource = new EventSource(url, { withCredentials: false });

    this.eventSource.onopen = () => {
      console.log('NotificationManager: SSE connection opened');
      this.isConnecting = false;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.eventSource.onerror = (e) => {
      console.log('NotificationManager: SSE error:', e);
      this.isConnecting = false;
      this.disconnect();

      // Implement exponential backoff for reconnection
      if (this.listeners.size > 0) {
        const delay = Math.min(5000 + Math.random() * 5000, 30000); // 5-10 seconds with jitter
        this.reconnectTimeout = setTimeout(() => {
          if (this.listeners.size > 0) {
            console.log('NotificationManager: Attempting to reconnect SSE...');
            this.connect();
          }
        }, delay);
      }
    };

    this.eventSource.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('NotificationManager: Received notification:', data);
        this.lastNotificationId = data.id;
        
        // Notify all listeners
        this.listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('NotificationManager: Error in listener callback:', error);
          }
        });
      } catch (err) {
        console.log('NotificationManager: Error parsing notification:', err);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      console.log('NotificationManager: Closing SSE connection');
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


