import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/login', {
        login: email,
        password,
      });

      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role.name);

      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      switch (user.role.name) {
        case 'HR Assistant':
          navigate('/dashboard/hr-assistant');
          break;
        case 'HR Staff':
          navigate('/dashboard/hr-staff');
          break;
        case 'Manager':
          navigate('/dashboard/manager');
          break;
        case 'Applicant':
          navigate('/');
          break;
        case 'Employee':
          navigate('/dashboard/employee');
          break;
        default:
          navigate('/unauthorized');
          break;
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background:
          'linear-gradient(135deg, #ccdff8ff 0%, rgba(128, 169, 219, 1) 40%, #557aafff 100%)',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #3f454eff; 
        }
        * { box-sizing: border-box; }

        .login-wrapper {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
        }

        .login-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.32);
          width: 100%;
          max-width: 1000px;
          min-height: 650px;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .welcome-panel {
          background: linear-gradient(135deg, #45c2f3ff, #1e40af);
          color: white;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        /* Back to Home button */
        .back-home-btn {
          position: absolute;
          top: 24px;
          left: 24px;
          background: rgba(29, 84, 204, 0.27);
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(22, 65, 184, 0.39);
          transition: background 0.2s, transform 0.2s;
          z-index: 10;
        }
        .back-home-btn:hover {
          background: rgba(0, 87, 187, 0.88);
          transform: scale(1.05);
        }

        .back-home-btn svg {
          width: 22px;
          height: 22px;
          stroke: #ffffffff;
          stroke-width: 2.5;
          fill: none;
        }

        .back-home-btn span {
          display: none; /* text hidden by default */
          margin-left: 8px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        @media (min-width: 1025px) {
          .back-home-btn {
            border-radius: 8px;
            width: auto;
            height: auto;
            padding: 8px 16px;
            background: rgba(255,255,255,0.15);
          }
          .back-home-btn span {
            display: inline;
          }
        }

        .welcome-content h6 {
          font-family: 'Inter', sans-serif;          
          font-size: clamp(0.75rem, 1vw, 0.875rem);
          font-weight: 500;
          margin-bottom: 16px;                       
          opacity: 0.85;
          letter-spacing: 0.08em;                    
          text-transform: uppercase;                 
          color: rgba(255, 255, 255, 0.87);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); 
        }

        .welcome-content h2 {
          font-family: 'Poppins', sans-serif;        
          font-size: clamp(1.5rem, 4vw, 2.75rem);                        
          font-weight: 800;                          
          line-height: 1.1;                          
          margin-bottom: 20px;
          letter-spacing: -0.02em;                   
          background: linear-gradient(135deg, #fcfeffff 0%, rgba(224, 235, 255, 0.95) 30%, rgba(191, 200, 255, 0.95) 100%); 
          -webkit-background-clip: text;             
          -webkit-text-fill-color: transparent;      
          background-clip: text;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); 
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)); 
        }

        .welcome-content h5 {
          font-family: 'Inter', sans-serif;          
          font-size: clamp(0.9rem, 2vw, 1.125rem);
          font-weight: 400;
          opacity: 0.8;
          line-height: 1.6;
          letter-spacing: 0.01em;                   
          color: rgba(255, 255, 255, 0.8);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); 
        }

        .form-panel {
          padding: 50px 45px;
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-header { 
          text-align: center; 
          margin-bottom: 35px; 
        }
        .form-header h3 {
          font-size: clamp(1.2rem, 3vw, 1.6rem);
          font-weight: 700;
          margin-bottom: 8px;
          color: #19396dff;
        }
        .form-header p {
          font-size: clamp(0.85rem, 2vw, 0.95rem);
          color: #64748b;
        }

        .role-selector { 
          display: flex; 
          justify-content: center; 
          gap: 15px; 
          margin-bottom: 35px; 
          flex-wrap: wrap;
        }

        .role-btn {
          padding: 10px 24px;
          border: 2px solid #3171d6ff;
          background: transparent;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #3b82f6;
        }
          
        .role-btn:hover {
          border-color: #2157a1ff;
          color: #2157a1ff;
        }
        .role-btn.active {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 4px 15px rgba(30, 41, 59, 0.3);
        }

        .form-group { margin-bottom: 20px; }
        .form-label { 
          display: block; 
          margin-bottom: 6px; 
          font-weight: 600; 
          font-size: 0.95rem;
          color: #1e293b;
        }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 20px; color: #7e8da1ff; font-size: 18px; }
        .toggle-password-btn { position: absolute; right: 14px; background: transparent; border: none; cursor: pointer; padding: 4px; color: #7e8da1ff; display: flex; align-items: center; justify-content: center; }
        .toggle-password-btn:hover { color: #475569; }

        .form-input {
          width: 100%;
          padding: 15px 18px 15px 50px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          background: #f8fafc;
          transition: all 0.3s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: #475569;
          background: white;
          box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.15);
        }
        .form-input.password-field { padding-right: 48px; }

        .login-button {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
          display: block;
          margin: 25px auto 0 auto;
          width: 60%;
          text-align: center;
        }
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(30, 41, 59, 0.3);
        }

        .error-alert {
          background: linear-gradient(135deg, #dc2626, #991b1b);
          color: white;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 0.95rem;
        }

        .register-link { 
          text-align: center; 
          margin-top: 20px; 
          font-size: 0.95rem;
        }
        .register-link button {
          color: #1e293b;
          font-weight: 600;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .register-link button:hover {
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .login-card { grid-template-columns: 1fr; max-width: 500px; }
          .welcome-panel, .form-panel { padding: 35px 25px; text-align: center; }
        }
        @media (max-width: 768px) {
          .login-card { border-radius: 15px; min-height: auto; }
          .welcome-panel, .form-panel { padding: 30px 20px; }
          .role-selector { flex-direction: column; gap: 10px; }
          .login-button { width: 80%; }
        }
        @media (max-width: 480px) {
          .form-input { padding: 13px 13px 13px 45px; font-size: 14px; }
          .input-icon { left: 15px; font-size: 16px; }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          {/* Left welcome panel */}
          <div className="welcome-panel">
            {/* Back to Home button */}
            <button
              className="back-home-btn"
              onClick={() => navigate('/')}
              type="button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
              <span>Back to Home</span>
            </button>

            <div className="welcome-content">
              <h6>Welcome to</h6>
              <h2>
                Cabuyao Concrete
                <br /> Development Corporation
              </h2>
              <h5>Human Resource Management System</h5>
            </div>
          </div>

          {/* Right form panel */}
          <div className="form-panel">
            <div className="form-header">
              <h3>Login to Your Account</h3>
              <p>Please enter your credentials to continue</p>
            </div>

            <div className="role-selector">
              <button
                className={`role-btn ${role === 'Admin' ? 'active' : ''}`}
                onClick={() => setRole('Admin')}
              >
                Administrator
              </button>
              <button
                className={`role-btn ${role === 'Employee' ? 'active' : ''}`}
                onClick={() => setRole('Employee')}
              >
                Employee
              </button>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username or Email</label>
                <div className="input-wrapper">
                  <i className="bi bi-person-fill input-icon"></i>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your User ID or Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <i className="bi bi-lock-fill input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input password-field"
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="login-button">
                Login
              </button>
            </form>

            <div className="register-link">
              <span>Creating an account? </span>
              <button onClick={() => navigate('/register')}>Register Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;