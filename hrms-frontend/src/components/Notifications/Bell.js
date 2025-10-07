import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchNotifications, markNotificationRead, getNotificationAction, getNotificationIcon } from '../../api/notifications';

const Bell = ({ onOpenLeave, onOpenDisciplinary, onOpenCashAdvance, onOpenEvaluation, onOpenCalendar, onOpenJobApplications, onOpenJobPostings }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  const load = async () => {
    try {
      console.log('Loading notifications...');
      const res = await fetchNotifications();
      console.log('Notifications response:', res.data);
      const list = res.data.data || [];
      setItems(list);
      setUnread(list.filter(n => !n.read_at).length);
      console.log('Set items:', list.length, 'unread:', list.filter(n => !n.read_at).length);
    } catch (e) {
      console.log('Error loading notifications:', e);
    }
  };

  const handleNewNotification = (notification) => {
    console.log('New notification received:', notification);
    setItems(prev => {
      // Check if notification already exists to avoid duplicates
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
    setUnread(prev => prev + 1);
  };

  useEffect(() => {
    load();
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleClickItem = async (n) => {
    try {
      await markNotificationRead(n.id);

      // Mark as read in local state immediately
      setItems(prev => prev.map(item => 
        item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
      ));
      setUnread(prev => Math.max(0, prev - 1));
      setOpen(false);
      
      // Use the enhanced notification action handler
      const notificationAction = getNotificationAction(n);
      console.log('Notification action:', notificationAction);
      
      switch (notificationAction.action) {
        case 'OPEN_EVALUATION':
          if (onOpenEvaluation && notificationAction.id) {
            onOpenEvaluation(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_DISCIPLINARY':
          if (onOpenDisciplinary) {
            onOpenDisciplinary(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_LEAVE':
          if (onOpenLeave && notificationAction.id) {
            onOpenLeave(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_CASH_ADVANCE':
          if (onOpenCashAdvance && notificationAction.id) {
            onOpenCashAdvance(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_CALENDAR':
          if (onOpenCalendar) {
            onOpenCalendar(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_JOB_APPLICATIONS':
          if (onOpenJobApplications) {
            onOpenJobApplications(notificationAction.id, notificationAction.data);
          }
          break;
        case 'OPEN_JOB_POSTINGS':
          if (onOpenJobPostings) {
            onOpenJobPostings(notificationAction.id, notificationAction.data);
          }
          break;
        default:
          console.log('No specific action for notification type:', n.type);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="position-relative" ref={ref}>
      <button
        ref={buttonRef}
        className="btn btn-link position-relative"
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next) {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) setAnchor({ top: rect.bottom + 8, left: Math.max(8, rect.right - 320) });
            await load();
          }
        }}
      >
        <span role="img" aria-label="bell">🔔</span>
        {unread > 0 && (
          <span className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">{unread}</span>
        )}
      </button>
      {/* Always listen for real-time updates */}
      <Poller tick={load} />
      <SSEStream onEvent={handleNewNotification} />
      {/* Show notifications dropdown when opened */}
      {open && ReactDOM.createPortal(
        (
          <div
            className="card shadow-sm"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              width: 320,
              zIndex: 9999,
              maxHeight: 'calc(100vh - 100px)',
              overflow: 'hidden',
              padding: 0,
              margin: 0
            }}
          >
            <div className="card-header fw-semibold" style={{ padding: '12px 16px' }}>Notifications</div>
            <div 
              style={{ 
                maxHeight: items.length > 4 ? '320px' : 'auto',
                overflowY: items.length > 4 ? 'auto' : 'visible',
                padding: 0,
                margin: 0,
                borderRadius: '0 0 0.375rem 0.375rem'
              }}
            >
              {items.length === 0 && (
                <div className="p-3 text-muted small" style={{ margin: 0 }}>No notifications</div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  className={`${!n.read_at ? 'bg-light' : ''}`}
                  onClick={() => handleClickItem(n)}
                  style={{ 
                    width: '100%',
                    textAlign: 'left', 
                    border: 'none', 
                    padding: '12px 16px',
                    margin: 0,
                    borderRadius: 0,
                    backgroundColor: !n.read_at ? '#f8f9fa' : 'white',
                    cursor: 'pointer',
                    borderBottom: '1px solid #dee2e6'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = !n.read_at ? '#f8f9fa' : 'white'}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className={`fw-semibold ${!n.read_at ? 'text-primary' : ''}`} style={{ fontSize: '0.9rem' }}>
                        {n.title || 'Notification'}
                        {!n.read_at && <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>New</span>}
                      </div>
                      <div className="small text-muted mt-1" style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                        {n.message || 'No message content'}
                      </div>
                      <div className="small text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', marginLeft: '8px' }}>{getNotificationIcon(n.type)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ),
        document.body
      )}
    </div>
  );
};

export default Bell;


// Tiny polling component for real-time updates
const Poller = ({ tick, interval = 5000 }) => {
  useEffect(() => {
    const id = setInterval(() => tick(), interval);
    return () => clearInterval(id);
  }, [tick, interval]);
  return null;
};

const SSEStream = ({ onEvent }) => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found for SSE');
      return;
    }
    
    const url = `http://localhost:8000/api/notifications/stream?token=${encodeURIComponent(token)}`;
    console.log('Connecting to SSE:', url);
    
    const es = new EventSource(url, { withCredentials: false });
    
    es.onopen = () => console.log('SSE connection opened');
    es.onerror = (e) => console.log('SSE error:', e);
    
    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('Received notification:', data);
        onEvent && onEvent(data);
      } catch (err) {
        console.log('Error parsing notification:', err);
      }
    });
    
    return () => {
      console.log('Closing SSE connection');
      es.close();
    };
  }, [onEvent]);
  return null;
};


