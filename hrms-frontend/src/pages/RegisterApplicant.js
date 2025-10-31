import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const RegisterApplicant = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    resume: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    unique: true // Will be checked on submit
  });

  const validatePassword = (password) => {
    const validation = {
      length: password.length >= 12 && password.length <= 16,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      unique: true // Will be validated on backend
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setForm({ ...form, [e.target.name]: password });
    validatePassword(password);
  };

  const handleChange = (e) => {
    if (e.target.name === 'password') {
      handlePasswordChange(e);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check if terms and conditions are accepted
    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions to continue.');
      return;
    }

    // Validate phone number
    if (!form.phone || form.phone.length !== 11 || !/^09\d{9}$/.test(form.phone)) {
      setError('Please enter a valid 11-digit Philippine mobile number starting with 09.');
      return;
    }

    // Validate password requirements
    if (!validatePassword(form.password)) {
      setError('Password does not meet the required criteria. Please check the requirements below.');
      return;
    }

    // Check password confirmation
    if (form.password !== form.password_confirmation) {
      setError('Password and confirmation do not match.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/api/register', form);
      
      // Store user data in localStorage for immediate access
      const userData = {
        first_name: form.first_name,
        last_name: form.last_name,
        name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        phone: form.phone
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('User data stored in localStorage:', userData);
      
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError('Registration failed. Please try again.');
      }
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
        @import url('https://fonts.googleapis.com/css2?family=Momo+Trust+Display&display=swap');
        
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

        .register-wrapper {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }

        .register-card {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          width: 100%;
          position: relative;
        }

        .register-header {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(30, 64, 175, 0.05));
          padding: 50px 40px 30px;
          text-align: center;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          position: relative;
        }

        .register-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }

        .back-home-btn {
          position: absolute;
          top: 18px;
          left: 18px;
          background: rgba(59,130,246,0.10);
          color: #1e40af;
          border: none;
          border-radius: 8px;
          padding: 7px 16px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          letter-spacing: 0.03em;
          box-shadow: 0 2px 8px rgba(30,64,175,0.08);
          transition: background 0.2s, color 0.2s;
          z-index: 10;
        }
        .back-home-btn:hover {
          background: rgba(59,130,246,0.18);
          color: #2563eb;
        }

        .header-icon {
          width: 90px;
          height: 90px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 25px;
          box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3);
          border: 4px solid rgba(255, 255, 255, 0.9);
        }

        .register-body {
          padding: 40px;
          background: #ffffff;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 20px;
          color: #9ca3af;
          font-size: 18px;
          z-index: 2;
        }

        .form-input {
          width: 100%;
          padding: 18px 20px 18px 55px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
          background: #f9fafb;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .register-button {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          border: none;
          padding: 20px;
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

        .register-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(59, 130, 246, 0.4);
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

        .login-link {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
        }

        .login-link button {
          color: #3b82f6;
          background: none;
          border: none;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .login-link button:hover {
          color: #1e40af;
        }

        .password-toggle {
          position: absolute;
          right: 20px;
          color: #9ca3af;
          font-size: 18px;
          cursor: pointer;
          z-index: 2;
          transition: color 0.2s;
        }
        .password-toggle:hover {
          color: #3b82f6;
        }

        .terms-checkbox-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .terms-checkbox {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          accent-color: #3b82f6;
          cursor: pointer;
        }

        .terms-label {
          color: #475569;
          font-size: 0.9rem;
          line-height: 1.5;
          cursor: pointer;
          flex: 1;
        }

        .terms-label a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .terms-label a:hover {
          text-decoration: underline;
        }

        .password-requirements {
          margin-top: 10px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .password-requirements.full-width {
          margin-top: 15px;
          grid-column: 1 / -1;
        }

        .password-requirement {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        .password-requirement:last-child {
          margin-bottom: 0;
        }

        .requirement-icon {
          margin-right: 8px;
          font-size: 0.8rem;
          width: 16px;
          text-align: center;
        }

        .requirement-met {
          color: #10b981;
        }

        .requirement-not-met {
          color: #6b7280;
        }

        .password-strength {
          margin-top: 10px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .strength-weak {
          color: #ef4444;
        }

        .strength-medium {
          color: #f59e0b;
        }

        .strength-strong {
          color: #10b981;
        }

        .password-reminder {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }

        @media (max-width: 768px) {
          .register-header {
            padding: 30px 25px 20px;
          }
          .register-body {
            padding: 25px 20px;
          }
          .form-grid {
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .header-icon {
            width: 70px;
            height: 70px;
            margin-bottom: 20px;
          }
        }

        @media (max-width: 480px) {
          .register-header {
            padding: 25px 20px 15px;
          }
          .register-body {
            padding: 20px 15px;
          }
          .form-input {
            padding: 15px 15px 15px 45px;
            font-size: 14px;
          }
          .input-icon {
            left: 15px;
            font-size: 16px;
          }
          .header-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 15px;
          }
          .form-grid {
            gap: 15px;
            margin-bottom: 15px;
          }
          .form-group {
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div className="register-wrapper">
        <motion.div 
          className="register-card"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Header Section */}
          <motion.div 
            className="register-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Back to Home button */}
            <motion.button
              className="back-home-btn"
              onClick={() => navigate('/')}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Home
            </motion.button>
            <motion.div 
              className="header-icon"
              initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
            >
              <i className="bi bi-person-plus-fill text-white" style={{ fontSize: '2.2rem' }}></i>
            </motion.div>
            <motion.h2 
              style={{
                fontFamily: "'Momo Trust Display', sans-serif",
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '10px',
                fontSize: '1.8rem'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Applicant Registration
            </motion.h2>
            <motion.p 
              style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '1rem',
                lineHeight: '1.5'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Join Cabuyao Concrete Development Corporation<br />
              Create your account to apply for positions
            </motion.p>
          </motion.div>

          {/* Body Section */}
          <motion.div 
            className="register-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <AnimatePresence mode="wait">
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
            </AnimatePresence>

            <form onSubmit={handleRegister} autoComplete="off">
              {/* Personal Information */}
              <motion.div 
                style={{ marginBottom: '30px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <motion.h4 
                  style={{
                    color: '#374151',
                    fontWeight: '600',
                    marginBottom: '20px',
                    fontSize: '1.1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                >
                  Personal Information
                </motion.h4>

                <div className="form-grid">
                  <motion.div 
                    className="form-group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    <label className="form-label">
                      First Name <span className="required-indicator">*</span>
                    </label>
                    <div className="input-wrapper">
                      <i className="bi bi-person input-icon"></i>
                      <input
                        type="text"
                        className="form-input"
                        name="first_name"
                        placeholder="Enter your first name"
                        value={form.first_name}
                        onChange={handleChange}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    className="form-group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                  >
                    <label className="form-label">
                      Last Name <span className="required-indicator">*</span>
                    </label>
                    <div className="input-wrapper">
                      <i className="bi bi-person input-icon"></i>
                      <input
                        type="text"
                        className="form-input"
                        name="last_name"
                        placeholder="Enter your last name"
                        value={form.last_name}
                        onChange={handleChange}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div 
                style={{ marginBottom: '30px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <motion.h4 
                  style={{
                    color: '#374151',
                    fontWeight: '600',
                    marginBottom: '20px',
                    fontSize: '1.1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                >
                  Contact Information
                </motion.h4>

                <motion.div 
                  className="form-group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.2 }}
                >
                  <label className="form-label">
                    Email Address <span className="required-indicator">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="bi bi-envelope input-icon"></i>
                    <input
                      type="email"
                      className="form-input"
                      name="email"
                      placeholder="Enter your email address"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="off"
                      required
                    />
                    </div>
                </motion.div>

                <motion.div 
                  className="form-group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.3 }}
                >
                  <label className="form-label">
                    Phone Number <span className="required-indicator">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="bi bi-telephone input-icon"></i>
                    <input
                      type="tel"
                      className="form-input"
                      name="phone"
                      placeholder="Enter your 11-digit phone number (e.g., 09123456789)"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength="11"
                      pattern="[0-9]{11}"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="form-text">
                    <small className="text-muted">
                      Philippine mobile number format: 09XXXXXXXXX (11 digits)
                    </small>
                  </div>
                </motion.div>
              </motion.div>

              {/* Account Security */}
              <motion.div 
                style={{ marginBottom: '30px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 }}
              >
                <motion.h4 
                  style={{
                    color: '#374151',
                    fontWeight: '600',
                    marginBottom: '20px',
                    fontSize: '1.1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.5 }}
                >
                  Account Security
                </motion.h4>

                <div className="form-grid">
                  <motion.div 
                    className="form-group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.6 }}
                  >
                    <label className="form-label">
                      Password <span className="required-indicator">*</span>
                    </label>
                    <div className="input-wrapper">
                      <i className="bi bi-lock input-icon"></i>
                      <input
                        type={showPasswords ? "text" : "password"}
                        className="form-input"
                        name="password"
                        placeholder="Create a secure password (12-16 characters)"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    className="form-group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.7 }}
                  >
                    <label className="form-label">
                      Confirm Password <span className="required-indicator">*</span>
                    </label>
                    <div className="input-wrapper">
                      <i className="bi bi-shield-lock input-icon"></i>
                      <input
                        type={showPasswords ? "text" : "password"}
                        className="form-input"
                        name="password_confirmation"
                        placeholder="Confirm your password"
                        value={form.password_confirmation}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                      />
                      <motion.i 
                        className={`bi ${showPasswords ? 'bi-eye-slash' : 'bi-eye'} password-toggle`}
                        onClick={() => setShowPasswords(!showPasswords)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{ cursor: 'pointer' }}
                      ></motion.i>
                    </div>
                  </motion.div>
                </div>
                
                {/* Password Requirements - Full Width */}
                <AnimatePresence>
                  {form.password && (
                    <motion.div 
                      className="password-requirements full-width"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                    {/* Password Strength Indicator */}
                    <div className="password-strength">
                      {form.password.length > 0 && (
                        <>
                          Password Strength: {
                            Object.values(passwordValidation).filter(Boolean).length < 3 ? (
                              <span className="strength-weak">Weak</span>
                            ) : Object.values(passwordValidation).filter(Boolean).length < 5 ? (
                              <span className="strength-medium">Medium</span>
                            ) : (
                              <span className="strength-strong">Strong</span>
                            )
                          }
                        </>
                      )}
                    </div>
                    
                    {/* Password Requirements Reminder */}
                    <div className="password-reminder">
                      <small className="text-muted">
                        Must be 12-16 characters with uppercase, lowercase, numbers, and special characters.
                      </small>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Terms and Conditions */}
              <motion.div 
                className="terms-checkbox-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.8 }}
              >
                <input
                  type="checkbox"
                  id="terms"
                  className="terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="terms" className="terms-label">
                  I agree to the <a href="#" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="#" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. 
                  I understand that my information will be used solely for recruitment and application purposes.
                </label>
              </motion.div>

              <motion.button 
                type="submit" 
                className="register-button"
                disabled={!termsAccepted}
                style={{
                  opacity: termsAccepted ? 1 : 0.6,
                  cursor: termsAccepted ? 'pointer' : 'not-allowed'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: termsAccepted ? 1 : 0.6, y: 0 }}
                transition={{ duration: 0.4, delay: 1.9 }}
                whileHover={termsAccepted ? { 
                  scale: 1.02,
                  boxShadow: "0 12px 35px rgba(59, 130, 246, 0.4)"
                } : {}}
                whileTap={termsAccepted ? { scale: 0.98 } : {}}
              >
                Create Account
              </motion.button>
            </form>

            <motion.div 
              className="login-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 2.0 }}
            >
              <span>Already have an account? </span>
              <button onClick={() => navigate('/login')}>
                Sign in here
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterApplicant;