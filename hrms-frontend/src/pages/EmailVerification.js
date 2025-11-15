import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Get email from location state or localStorage
    const emailFromState = location.state?.email;
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (emailFromState) {
      setEmail(emailFromState);
      localStorage.setItem('pendingVerificationEmail', emailFromState);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email found, redirect to register
      navigate('/register');
    }
  }, [location, navigate]);

  useEffect(() => {
    // Resend cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...verificationCode];
    newCode[index] = value.replace(/\D/g, ''); // Only numbers
    
    setVerificationCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      setError('');
      // Focus last input
      const lastInput = document.getElementById('code-5');
      if (lastInput) lastInput.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await axios.post('http://localhost:8000/api/verify-email', {
        email: email,
        verification_code: code,
      });

      setSuccess('Email verified successfully! Registration completed.');
      
      // Store user data in localStorage
      if (response.data.user) {
        const userData = {
          first_name: response.data.user.name.split(' ')[0],
          last_name: response.data.user.name.split(' ').slice(1).join(' '),
          name: response.data.user.name,
          email: response.data.user.email,
        };
        localStorage.setItem('user', JSON.stringify(userData));
      }

      // Clear pending verification email
      localStorage.removeItem('pendingVerificationEmail');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please login with your credentials.' 
          } 
        });
      }, 2000);
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError('Verification failed. Please check your code and try again.');
      }
      // Clear code on error
      setVerificationCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('code-0');
      if (firstInput) firstInput.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('http://localhost:8000/api/resend-verification', {
        email: email,
      });

      setSuccess('Verification code has been resent to your email address.');
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to resend verification code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #bfdbfe 0%, #7dd3fc 25%, #3b82f6 75%, #1e40af 100%)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap');
        
        html, body, #root {
          height: 100%;
        }
        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          min-height: 100vh;
          width: 100vw;
          overflow-y: auto;
          font-family: 'Noto Sans', sans-serif;
        }
        * { 
          box-sizing: border-box;
          font-family: 'Noto Sans', sans-serif;
        }

        .verification-wrapper {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .verification-card {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          width: 100%;
          position: relative;
        }

        .verification-header {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(30, 64, 175, 0.05));
          padding: 40px 40px 30px;
          text-align: center;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          position: relative;
        }

        .verification-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }

        .verification-body {
          padding: 40px;
          background: #ffffff;
        }

        .email-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .code-inputs {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 30px 0;
        }

        .code-input {
          width: 55px;
          height: 65px;
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          transition: all 0.3s ease;
          font-family: 'Courier New', monospace;
        }

        .code-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .verify-button {
          background: #10b981;
          color: white;
          border: none;
          padding: 18px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-top: 20px;
        }

        .verify-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
          background: #059669;
        }

        .verify-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resend-section {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .resend-button {
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .resend-button:hover:not(:disabled) {
          background: #e5e7eb;
          color: #374151;
        }

        .resend-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          padding: 16px 20px;
          border-radius: 10px;
          margin-bottom: 25px;
          font-weight: 500;
          text-align: center;
        }

        .alert-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);
        }

        .alert-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
        }

        .back-link {
          text-align: center;
          margin-top: 20px;
        }

        .back-link button {
          color: #10b981;
          background: none;
          border: none;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .back-link button:hover {
          color: #059669;
        }
      `}</style>

      <div className="verification-wrapper">
        <motion.div
          className="verification-card"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="verification-header">
            <motion.div
              className="email-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </motion.div>
            <motion.h2
              style={{
                color: '#00033d',
                marginBottom: '10px',
                fontSize: '1.8rem',
                fontWeight: '700',
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Verify Your Email
            </motion.h2>
            <motion.p
              style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '0.95rem',
                lineHeight: '1.5'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              We sent a verification code to your email. Please enter it below to verify your account.
            </motion.p>
          </div>

          <div className="verification-body">
            <AnimatePresence mode="wait">
              {success && (
                <motion.div
                  className="alert alert-success"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {success}
                </motion.div>
              )}
              {error && (
                <motion.div
                  className="alert alert-danger"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {email && !success && (
              <motion.div
                style={{
                  padding: '20px',
                  background: '#f0fdf4',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p style={{ margin: 0, color: '#059669', fontWeight: '600' }}>
                  Verification code sent to
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#10b981', fontWeight: '700', fontSize: '1.1rem' }}>
                  {email}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '10px',
                    color: '#374151',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Verification Code
                </label>
                <div className="code-inputs" onPaste={handlePaste}>
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      className="code-input"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      maxLength="1"
                      autoComplete="off"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <p style={{ textAlign: 'center', marginTop: '10px', color: '#6b7280', fontSize: '0.85rem' }}>
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <motion.button
                type="submit"
                className="verify-button"
                disabled={isVerifying || verificationCode.join('').length !== 6}
                whileHover={!isVerifying && verificationCode.join('').length === 6 ? { scale: 1.02 } : {}}
                whileTap={!isVerifying && verificationCode.join('').length === 6 ? { scale: 0.98 } : {}}
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </motion.button>
            </form>

            <div className="resend-section">
              <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '0.9rem' }}>
                DIDN'T RECEIVE THE CODE?
              </p>
              <button
                type="button"
                className="resend-button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Resend code in ${resendCooldown} seconds`
                  : 'Resend Code'}
              </button>
            </div>

            <div className="back-link">
              <button type="button" onClick={() => navigate('/login')}>
                Back to login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmailVerification;

