import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const tokenParam = query.get('token') || '';
  const emailParam = query.get('email') || '';
  const requestIdParam = query.get('requestId');

  const [status, setStatus] = useState('validating');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenParam || !emailParam) {
      setStatus('invalid');
      setMessage('This reset link is missing required information. Please request a new link.');
      return;
    }

    const validateToken = async () => {
      try {
        const payload = {
          token: tokenParam,
          email: emailParam,
        };
        if (requestIdParam) {
          payload.request_id = Number(requestIdParam);
        }
        const response = await axios.post('http://localhost:8000/api/password-reset/validate', payload);
        setUserName(response.data?.name || '');
        setStatus('ready');
      } catch (error) {
        setStatus('invalid');
        const errorMessage =
          error.response?.data?.errors?.token?.[0] ||
          error.response?.data?.errors?.email?.[0] ||
          error.response?.data?.message ||
          'This reset link is invalid or has expired.';
        setMessage(errorMessage);
      }
    };

    validateToken();
  }, [tokenParam, emailParam, requestIdParam]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        token: tokenParam,
        email: emailParam,
        password,
        password_confirmation: confirmPassword,
      };
      if (requestIdParam) {
        payload.request_id = Number(requestIdParam);
      }

      const response = await axios.post('http://localhost:8000/api/password-reset/complete', payload);
      toast.success(response.data?.message || 'Password updated successfully.');
      setStatus('success');
      setMessage('Your password has been updated. You can now sign in with your new password.');
      setTimeout(() => navigate('/login'), 3500);
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.password?.[0] ||
        error.response?.data?.message ||
        'Unable to reset password. Please request a new link.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-card">
        <div className="reset-header">
          <h1>Reset Password</h1>
          <p>Securely update your HRMS account password.</p>
        </div>

        {status === 'validating' && <div className="reset-status">Validating your reset link…</div>}

        {status === 'invalid' && (
          <div className="reset-status error">
            <p>{message}</p>
            <button className="reset-primary" onClick={() => navigate('/login')}>
              Return to Login
            </button>
          </div>
        )}

        {status === 'ready' && (
          <form className="reset-form" onSubmit={handleSubmit}>
            <div className="reset-welcome">
              <h2>Welcome back{userName ? `, ${userName}` : ''}</h2>
              <p>Enter a new password below. We recommend a unique passphrase for better security.</p>
            </div>
            <div className="reset-field">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                autoComplete="new-password"
                required
              />
              <small>Minimum of 8 characters, include a mix of letters, numbers, and symbols.</small>
            </div>
            <div className="reset-field">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="reset-primary" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <div className="reset-status success">
            <p>{message}</p>
            <button className="reset-primary" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;



