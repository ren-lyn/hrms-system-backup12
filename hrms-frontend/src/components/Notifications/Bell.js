import React, { useEffect, useState, useRef } from 'react';
import { fetchNotifications, markNotificationRead } from '../../api/notifications';

const Bell = ({ onOpenLeave }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

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
      // Update local state to mark as read
      setItems(prev => prev.map(item => 
        item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
      ));
      setUnread(prev => Math.max(0, prev - 1));
      setOpen(false);
      // If it's a leave notification, open the leave application with that ID
      if (n.type === 'leave_status' && n.leave_id && onOpenLeave) {
        onOpenLeave(n.leave_id);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="position-relative" ref={ref}>
      <button className="btn btn-link position-relative" onClick={async () => { const next = !open; setOpen(next); if (next) await load(); }}>
        <span role="img" aria-label="bell">🔔</span>
        {unread > 0 && (
          <span className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill">{unread}</span>
        )}
      </button>
      {/* Always listen for real-time updates */}
      <Poller tick={load} />
      <SSEStream onEvent={handleNewNotification} />
      {/* Show notifications dropdown when opened */}
      {open && (
        <div className="card shadow-sm" style={{ position: 'absolute', right: 0, width: 320, zIndex: 1000 }}>
          <div className="card-header fw-semibold">Notifications</div>
          <div className="list-group list-group-flush" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div className="p-3 text-muted small">No notifications</div>
            )}
            {items.map((n) => (
              <button key={n.id} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${!n.read_at ? 'bg-light border-primary' : ''}`} onClick={() => handleClickItem(n)}>
                <div className="flex-grow-1">
                  <div className={`fw-${!n.read_at ? 'bold' : 'semibold'}`}>{n.title}</div>
                  <div className="small text-muted">{n.message}</div>
                  <div className="small text-muted mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read_at && (
                  <span className="badge bg-primary rounded-pill ms-2">New</span>
                )}
              </button>
            ))}
          </div>
        </div>
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


