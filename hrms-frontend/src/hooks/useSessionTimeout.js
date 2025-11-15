import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { clearAuthData } from '../utils/auth';

/**
 * Custom hook to handle session timeout based on user inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default: 30)
 * @param {number} warningMinutes - Minutes before timeout to show warning (default: 5)
 */
const useSessionTimeout = (timeoutMinutes = 30, warningMinutes = 5) => {
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Calculate timeout values
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  // Update last activity timestamp
  const updateActivity = () => {
    if (isAuthenticated()) {
      lastActivityRef.current = Date.now();
      localStorage.setItem('lastActivity', lastActivityRef.current.toString());
      
      // Reset warning if it was showing
      if (showWarning) {
        setShowWarning(false);
        setTimeRemaining(null);
        // Clear countdown interval
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
      
      // Reset timers
      resetTimers();
    }
  };

  // Reset all timers
  const resetTimers = () => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (!isAuthenticated()) {
      return;
    }

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated()) {
        setShowWarning(true);
        startWarningCountdown();
      }
    }, warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      if (isAuthenticated()) {
        handleLogout();
      }
    }, timeoutMs);
  };

  // Start countdown for warning modal
  const startWarningCountdown = () => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      if (!isAuthenticated()) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }

      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;
      const remainingSeconds = Math.max(0, Math.floor(remaining / 1000));

      if (remainingSeconds <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        handleLogout();
      } else {
        setTimeRemaining(remainingSeconds);
      }
    }, 1000);
  };

  // Handle logout
  const handleLogout = () => {
    clearAuthData();
    setShowWarning(false);
    setTimeRemaining(null);
    
    toast.error('Your session has expired due to inactivity. Please log in again.', {
      position: 'top-center',
      autoClose: 5000,
    });
    
    // Navigate to login page
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  // Extend session (called when user clicks "Stay Logged In")
  const extendSession = () => {
    updateActivity();
    toast.success('Session extended', {
      position: 'top-right',
      autoClose: 2000,
    });
  };

  // Initialize on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    // Restore last activity from localStorage if available
    const savedActivity = localStorage.getItem('lastActivity');
    if (savedActivity) {
      const savedTime = parseInt(savedActivity, 10);
      const elapsed = Date.now() - savedTime;
      
      // If already past timeout, logout immediately
      if (elapsed >= timeoutMs) {
        handleLogout();
        return;
      }
      
      // If past warning time, show warning immediately
      if (elapsed >= warningMs) {
        setShowWarning(true);
        lastActivityRef.current = savedTime;
        startWarningCountdown();
      } else {
        lastActivityRef.current = savedTime;
      }
    }

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to avoid excessive calls
    let activityThrottle = null;
    const throttledActivity = () => {
      if (activityThrottle) {
        clearTimeout(activityThrottle);
      }
      activityThrottle = setTimeout(handleActivity, 1000); // Update at most once per second
    };

    events.forEach(event => {
      document.addEventListener(event, throttledActivity, true);
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (activityThrottle) {
        clearTimeout(activityThrottle);
      }
    };
  }, []);

  // Reset timers when authentication state changes
  useEffect(() => {
    if (isAuthenticated()) {
      resetTimers();
    } else {
      // Clear timers if not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setShowWarning(false);
      setTimeRemaining(null);
    }
  }, [localStorage.getItem('token')]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    updateActivity,
  };
};

export default useSessionTimeout;

