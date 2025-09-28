import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  Home,
  CalendarDays,
  ClipboardList,
  AlertCircle,
  Bell,
  LogOut,
  FileText,
  CalendarCheck
} from 'lucide-react';
import ManagerLeaveManagement from '../components/Manager/ManagerLeaveManagement';
import ManagerEmployeeEvaluations from '../components/Manager/ManagerEmployeeEvaluations';
import ManagerDisciplinaryManagement from '../components/Manager/ManagerDisciplinaryManagement';


const ManagerDashboard = () => {
  const [date, setDate] = useState(new Date());
  const [activeView, setActiveView] = useState('dashboard');

  const links = [
    { icon: <Home size={18} />, label: 'Dashboard', view: 'dashboard' },
    { icon: <CalendarCheck size={18} />, label: 'Leave Request', view: 'leave-request' },
    { icon: <CalendarDays size={18} />, label: 'Attendance Monitor', view: 'attendance' },
    { icon: <ClipboardList size={18} />, label: 'Evaluations', view: 'evaluations' },
    { icon: <AlertCircle size={18} />, label: 'Disciplinary Cases', view: 'disciplinary' },
    { icon: <FileText size={18} />, label: 'Reports', view: 'reports' },
    { icon: <LogOut size={18} />, label: 'Logout', view: 'logout' },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      // remove axios header if set elsewhere
      try { delete require('axios').default.defaults.headers.common['Authorization']; } catch (e) {}
      window.location.href = '/';
    } catch (e) {
      window.location.href = '/';
    }
  };

  const handleNavigation = (view, label) => {
    if (view === 'logout') {
      handleLogout();
      return;
    }
    setActiveView(view);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'leave-request':
        return <ManagerLeaveManagement />;
      case 'evaluations':
        return <ManagerEmployeeEvaluations />;
      case 'disciplinary':
        return <ManagerDisciplinaryManagement />;
      case 'dashboard':
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => {
    return (
      <>
        {/* Top cards */}
        <div style={styles.dashboardCards}>
          {[
            { title: 'Evaluation Completion', value: '82%' },
            { title: 'Open Violations', value: '12' },
            { title: 'Avg. Resolve Time', value: '3.4 days' },
            { title: 'Total Employees', value: '120' },
          ].map((item, idx) => (
            <div key={idx} style={styles.card}>
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardValue}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Bottom sections */}
        <div style={styles.gridSection}>
          <div style={styles.sectionCard}>
            <h4>Disciplinary Cases</h4>
            <ul style={styles.ul}>
              <li style={styles.li}><span>Anna Reyes – AWOL</span><span style={styles.red}>Pending</span></li>
              <li style={styles.li}><span>Eric O Del Cuzz</span><span style={styles.yellow}>Under Review</span></li>
              <li style={styles.li}><span>Mark Santos – Misconduct</span><span style={styles.green}>Resolved</span></li>
            </ul>
          </div>

          <div style={styles.sectionCard}>
            <h4>Attendance Alerts</h4>
            <ul style={styles.ul}>
              <li style={styles.li}><span>Maria Lopez</span><span>4 Lates</span></li>
              <li style={styles.li}><span>Eric O Del Cuzz</span><span>2 Unfiled Leaves</span></li>
              <li style={styles.li}><span>Carlos Rivera</span><span>Perfect Attendance</span></li>
            </ul>
          </div>

          {/* Calendar resized to fit card */}
          <div style={styles.sectionCard}>
            <h4>Real-Time Calendar</h4>
            <div style={styles.calendarWrapper}>
              <Calendar
                onChange={setDate}
                value={date}
              />
            </div>
          </div>

          <div style={styles.sectionCard}>
            <h4>Upcoming HR Events</h4>
            <ul style={styles.ul}>
              <li>Q2 Evaluations – HR Dept</li>
              <li>Hearing – Sales Team</li>
              <li>Onboarding – Batch 3</li>
            </ul>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div>
          <h2 style={styles.title}>Manager Dashboard</h2>
          {links.map((link, idx) => (
            <div
              key={idx}
              style={{
                ...styles.navLink,
                ...(activeView === link.view ? styles.activeLink : {})
              }}
              onClick={() => handleNavigation(link.view, link.label)}
            >
              {link.icon}
              <span>{link.label}</span>
            </div>
          ))}
        </div>
        <div style={styles.profile}>
          <img src="https://i.pravatar.cc/40" alt="profile" style={styles.avatar} />
          <div>
            <div>Alex Rivera</div>
            <small>HR Manager</small>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={(activeView === 'leave-request' || activeView === 'evaluations' || activeView === 'disciplinary') ? {...styles.main, backgroundColor: '#f8f9fa', padding: '0'} : styles.main}>
        {activeView !== 'leave-request' && activeView !== 'evaluations' && activeView !== 'disciplinary' && (
          <>
            {/* Header */}
            <div style={styles.header}>
              <h1 style={styles.headerTitle}>
                {activeView === 'leave-request' ? 'Leave Management' : 
                 activeView === 'evaluations' ? 'Employee Evaluations' :
                 activeView === 'disciplinary' ? 'Disciplinary Management' : 'Manager Dashboard'}
              </h1>
              <div style={styles.headerIcons}>
                <Bell color="#fff" size={20} style={{ marginRight: '20px', cursor: 'pointer' }} />
                <img src="https://i.pravatar.cc/30" alt="profile" style={styles.headerAvatar} />
              </div>
            </div>
          </>
        )}

        {/* Dynamic Content */}
        {renderContent()}
      </div>
    </div>
  );
};

  const styles = {
    app: {
      display: 'flex',
      height: '100vh',
      fontFamily: 'Segoe UI, sans-serif',
      backgroundColor: '#12002f',
      color: 'white',
    },
    sidebar: {
      width: '20vw',
      backgroundColor: '#1c0140',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    title: {
      marginBottom: '30px',
      fontSize: '18px',
    },
    navLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '10px',
      color: '#c0aaff',
      cursor: 'pointer',
    },
    activeLink: {
      backgroundColor: '#3c1361',
    },
    profile: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginTop: '20px',
    },
    avatar: {
      width: '40px',
      borderRadius: '50%',
    },
    main: {
      flex: 1,
      padding: '30px',
      overflowY: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
    },
    headerTitle: {
      fontSize: '24px',
    },
    headerIcons: {
      display: 'flex',
      alignItems: 'center',
    },
    headerAvatar: {
      width: '30px',
      borderRadius: '50%',
      cursor: 'pointer',
    },
    dashboardCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '30px',
    },
    card: {
      backgroundColor: '#2c0562',
      padding: '20px',
      borderRadius: '16px',
      textAlign: 'center',
      boxShadow: '0 0 10px rgba(100, 0, 200, 0.3)',
    },
    cardTitle: {
      marginBottom: '10px',
      fontSize: '16px',
    },
    cardValue: {
      fontSize: '20px',
    },
    gridSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    },
    sectionCard: {
      backgroundColor: '#2c0562',
      padding: '20px',
      borderRadius: '16px',
      minHeight: '280px',
      display: 'flex',
      flexDirection: 'column',
    },
    calendarWrapper: {
      flex: 1,
      overflow: 'hidden',
      paddingTop: '10px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    ul: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    li: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '14px',
    },
    red: { color: '#ef4444' },
    yellow: { color: '#facc15' },
    green: { color: '#22c55e' },
  };

  export default ManagerDashboard;
