import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/responsive-global.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import performanceMonitor from './utils/performanceMonitoring';
import { preloadCriticalChunks } from './config/lazyComponents';
import '@fortawesome/fontawesome-free/css/all.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Preload critical chunks during idle time
preloadCriticalChunks();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals((metric) => {
  if (performanceMonitor && typeof performanceMonitor.reportWebVitals === 'function') {
    performanceMonitor.reportWebVitals(metric);
  }
});

// Register service worker for caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}