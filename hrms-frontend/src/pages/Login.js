import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const welcomePanelRef = useRef(null);
  const [isHoveringText, setIsHoveringText] = useState(false);
  
  // Smooth cursor tracking for glowing light
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { stiffness: 150, damping: 15 });
  const smoothY = useSpring(cursorY, { stiffness: 150, damping: 15 });

  // Handle mouse movement for interactive glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (welcomePanelRef.current) {
        const rect = welcomePanelRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        cursorX.set(x);
        cursorY.set(y);
        
        // Check if cursor is over text elements
        const textElements = welcomePanelRef.current.querySelectorAll('h2');
        let hoveringAnyText = false;
        
        textElements.forEach((element) => {
          const elementRect = element.getBoundingClientRect();
          const elementLeft = elementRect.left;
          const elementTop = elementRect.top;
          const elementRight = elementRect.right;
          const elementBottom = elementRect.bottom;
          
          // Check if cursor is within element bounds with some padding for glow radius
          if (
            e.clientX >= elementLeft - 100 &&
            e.clientX <= elementRight + 100 &&
            e.clientY >= elementTop - 100 &&
            e.clientY <= elementBottom + 100
          ) {
            hoveringAnyText = true;
          }
        });
        
        setIsHoveringText(hoveringAnyText);
      }
    };
    
    const welcomePanel = welcomePanelRef.current;
    if (welcomePanel) {
      welcomePanel.addEventListener('mousemove', handleMouseMove);
      return () => {
        welcomePanel.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [cursorX, cursorY]);

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
          'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 25%, #7dd3fc 50%, #3b82f6 75%, #1e40af 100%)',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
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
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 1000px;
          min-height: 650px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }

        .welcome-panel {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          border-radius: 24px 0 0 24px;
          overflow: hidden;
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
          font-family: 'Noto Sans', sans-serif;
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

        .welcome-content {
          text-align: center;
          display: flex;
          flex-direction: column;
        }

        .welcome-content h2 {
          font-family: 'Momo Trust Display', sans-serif;        
          font-size: clamp(1.5rem, 4vw, 2.75rem);                        
          font-weight: 800;                          
          line-height: 1.2;                          
          margin-bottom: 0;
          margin-top: 0px;
          letter-spacing: 1px;                   
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .welcome-content h5 {
          font-family: 'Noto Sans', sans-serif;          
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
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-radius: 0 24px 24px 0;
        }

        .form-header { 
          text-align: left; 
          margin-bottom: 40px; 
        }
        .form-header h3 {
          font-family: 'Noto Sans', sans-serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          margin-bottom: 12px;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        .form-header p {
          font-family: 'Noto Sans', sans-serif;
          font-size: clamp(0.9rem, 2vw, 1rem);
          color: #64748b;
          margin: 0;
          line-height: 1.5;
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
          font-family: 'Noto Sans', sans-serif;
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
          font-family: 'Noto Sans', sans-serif;
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
          font-family: 'Noto Sans', sans-serif;
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
          padding: 18px 24px;
          border-radius: 12px;
          font-family: 'Noto Sans', sans-serif;
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          display: block;
          margin: 30px auto 0 auto;
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }
        .login-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #2563eb, #1e3a8a);
        }
        
        .login-button:active {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        .error-alert {
          background: linear-gradient(135deg, #dc2626, #991b1b);
          color: white;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-family: 'Noto Sans', sans-serif;
          font-size: 0.95rem;
        }

        .register-link { 
          text-align: center; 
          margin-top: 25px; 
          font-family: 'Noto Sans', sans-serif;
          font-size: 0.875rem;
          color: #64748b;
        }
        .register-link button {
          color: #1e293b;
          font-family: 'Noto Sans', sans-serif;
          font-weight: 600;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .register-link button:hover {
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .login-card { 
            grid-template-columns: 1fr; 
            max-width: 500px;
            border-radius: 24px;
          }
          .welcome-panel { 
            padding: 40px 30px; 
            text-align: center;
            border-radius: 24px 24px 0 0;
          }
          .form-panel { 
            padding: 35px 25px; 
            border-radius: 0 0 24px 24px;
          }
        }
        @media (max-width: 768px) {
          .login-card { 
            border-radius: 20px; 
            min-height: auto; 
          }
          .welcome-panel { 
            padding: 35px 25px; 
            border-radius: 20px 20px 0 0;
          }
          .form-panel { 
            padding: 30px 20px; 
            border-radius: 0 0 20px 20px;
          }
          .role-selector { flex-direction: column; gap: 10px; }
          .login-button { width: 80%; }
        }
        @media (max-width: 480px) {
          .form-input { padding: 13px 13px 13px 45px; font-size: 14px; }
          .input-icon { left: 15px; font-size: 16px; }
        }
      `}</style>

      <div className="login-wrapper">
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Left welcome panel */}
          <motion.div 
            ref={welcomePanelRef}
            className="welcome-panel"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            {/* Interactive Glowing Light that follows cursor */}
            <motion.div
              style={{
                position: "absolute",
                left: smoothX,
                top: smoothY,
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                background: "white",
                pointerEvents: "none",
                x: "-50%",
                y: "-50%",
                zIndex: 1,
              }}
              animate={{
                scale: isHoveringText ? 1.3 : 0.2,
              }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            />

            {/* Back to Home button */}
            <motion.button
              className="back-home-btn"
              onClick={() => navigate('/')}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ zIndex: 10 }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
              <span>Back to Home</span>
            </motion.button>

            <motion.div 
              className="welcome-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              style={{ position: "relative", zIndex: 2 }}
            >
              <h2>
                Cabuyao Concrete
                <br /> Development Corporation
              </h2>
            </motion.div>
          </motion.div>

          {/* Right form panel */}
          <motion.div 
            className="form-panel"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <motion.div 
              className="form-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h3>Login to Your Account</h3>
              <p>Please enter your credentials to continue</p>
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  className="error-alert"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} autoComplete="off">
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <i className="bi bi-envelope-fill input-icon"></i>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                className="form-group"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <i className="bi bi-lock-fill input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input password-field"
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <motion.button
                    type="button"
                    className="toggle-password-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </motion.button>
                </div>
              </motion.div>

              <motion.button 
                type="submit" 
                className="login-button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 30px rgba(59, 130, 246, 0.4)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                LOGIN
              </motion.button>
            </form>

            <motion.div 
              className="register-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <span>Creating an account? </span>
              <button onClick={() => navigate('/register')}>Register Now</button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;