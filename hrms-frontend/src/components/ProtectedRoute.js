import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { clearAuthData } from '../utils/auth';

const ProtectedRoute = ({ children, role }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      // First check if token and user exist in localStorage
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        clearAuthData();
        setIsAuthorized(false);
        setIsValidating(false);
        return;
      }

      try {
        // Verify token with backend
        const response = await axios.get('http://localhost:8000/api/user', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const user = response.data;
        
        // Check if user role matches required role
        if (user.role && user.role.name === role) {
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(user));
          setIsAuthorized(true);
        } else {
          // Role doesn't match
          console.warn('Role mismatch:', user.role?.name, 'expected:', role);
          clearAuthData();
          setIsAuthorized(false);
        }
      } catch (error) {
        // Token is invalid or expired
        console.error('Auth validation error:', error.response?.status, error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearAuthData();
        }
        setIsAuthorized(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [role]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated, or unauthorized if wrong role
  if (!isAuthorized) {
    // Always redirect to login if not authorized (token invalid or wrong role)
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;