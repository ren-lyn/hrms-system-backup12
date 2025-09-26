import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Star, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  FileText,
  Download,
  Eye,
  ArrowLeft
} from 'lucide-react';
import axios from '../../axios';
import { toast } from 'react-toastify';
import EvaluationForm from './EvaluationForm';
import EvaluationResult from './EvaluationResult';

const ManagerEmployeeEvaluations = () => {
  const [employees, setEmployees] = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'evaluate', 'result'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchActiveForm();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/manager-evaluations/employees');
      setEmployees(response.data.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveForm = async () => {
    try {
      const response = await axios.get('/manager-evaluations/active-form');
      setActiveForm(response.data.data);
    } catch (error) {
      console.error('Error fetching active form:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load evaluation form');
      }
    }
  };

  const handleEvaluateEmployee = async (employee) => {
    if (!activeForm) {
      toast.error('No active evaluation form available');
      return;
    }

    if (!employee.can_evaluate) {
      toast.error('Employee was recently evaluated. Please wait for the next evaluation period.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/manager-evaluations/start/${employee.id}`, {});
      
      setSelectedEmployee(employee);
      setEvaluationData(response.data.data);
      setCurrentView('evaluate');
    } catch (error) {
      console.error('Error starting evaluation:', error);
      toast.error(error.response?.data?.message || 'Failed to start evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluationSubmit = async (result) => {
    try {
      setLoading(true);
      const evaluationId = result?.evaluation?.id || result?.id;
      if (!evaluationId) {
        // Fallback to previous behavior if we can't determine the ID
        setEvaluationResult(result);
        setCurrentView('result');
        fetchEmployees();
        return;
      }

      const response = await axios.get(`/manager-evaluations/result/${evaluationId}`);
      setEvaluationResult(response.data.data);
      setCurrentView('result');
      fetchEmployees(); // Refresh employee list
    } catch (error) {
      console.error('Error fetching evaluation result after submit:', error);
      toast.error('Failed to load evaluation result');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResult = async (evaluationId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/manager-evaluations/result/${evaluationId}`);
      
      setEvaluationResult(response.data.data);
      setCurrentView('result');
    } catch (error) {
      console.error('Error fetching evaluation result:', error);
      toast.error('Failed to load evaluation result');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready for Evaluation':
        return '#22c55e';
      case 'Recently Evaluated':
        return '#f59e0b';
      case 'Not Evaluated':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const renderEmployeeList = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Employee Evaluations</h2>
          <p style={styles.subtitle}>Manage and conduct employee performance evaluations</p>
        </div>
        {activeForm ? (
          <div style={styles.activeFormInfo}>
            <FileText size={20} />
            <div>
              <div style={styles.formTitle}>{activeForm.title}</div>
              <div style={styles.formSubtitle}>{activeForm.questions?.length || 0} Questions</div>
            </div>
          </div>
        ) : (
          <div style={styles.noActiveForm}>
            <XCircle size={20} color="#ef4444" />
            <span>No active evaluation form</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading employees...</div>
      ) : (
        <div style={styles.employeesGrid}>
          {employees.map((employee) => (
            <div key={employee.id} style={styles.employeeCard}>
              <div style={styles.employeeInfo}>
                <div style={styles.employeeName}>{employee.name}</div>
                <div style={styles.employeeDetails}>
                  <div>{employee.department} • {employee.position}</div>
                  <div>ID: {employee.employee_id}</div>
                </div>
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(employee.evaluation_status) + '20',
                  color: getStatusColor(employee.evaluation_status)
                }}>
                  {employee.evaluation_status}
                </div>
              </div>

              <div style={styles.employeeActions}>
                {employee.last_evaluation && (
                  <div style={styles.lastEvaluation}>
                    <Calendar size={16} />
                    <span>Last: {formatDate(employee.last_evaluation.submitted_at)}</span>
                    <button
                      onClick={() => handleViewResult(employee.last_evaluation.id)}
                      style={styles.viewButton}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                )}

                {employee.next_evaluation_date && (
                  <div style={styles.nextEvaluation}>
                    Next evaluation: {formatDate(employee.next_evaluation_date)}
                  </div>
                )}

                <button
                  onClick={() => handleEvaluateEmployee(employee)}
                  disabled={!employee.can_evaluate || !activeForm}
                  style={{
                    ...styles.evaluateButton,
                    ...(employee.can_evaluate && activeForm ? {} : styles.disabledButton)
                  }}
                >
                  {employee.can_evaluate ? (
                    <>
                      <Star size={16} />
                      Evaluate
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Evaluated
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {employees.length === 0 && (
            <div style={styles.emptyState}>
              <Users size={48} color="#6b7280" />
              <h3>No employees found</h3>
              <p>There are no employees available for evaluation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'evaluate':
        return (
          <EvaluationForm
            employee={selectedEmployee}
            evaluationData={evaluationData}
            activeForm={activeForm}
            onSubmit={handleEvaluationSubmit}
            onCancel={() => setCurrentView('list')}
          />
        );
      case 'result':
        return (
          <EvaluationResult
            result={evaluationResult}
            onBack={() => setCurrentView('list')}
          />
        );
      default:
        return renderEmployeeList();
    }
  };

  return (
    <div style={styles.wrapper}>
      {currentView !== 'list' && (
        <button
          onClick={() => setCurrentView('list')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} />
          Back to Employee List
        </button>
      )}
      {renderCurrentView()}
    </div>
  );
};

const styles = {
  wrapper: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  activeFormInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    color: '#374151',
  },
  formTitle: {
    fontWeight: '500',
    fontSize: '14px',
  },
  formSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
  },
  noActiveForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6b7280',
  },
  employeesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  employeeCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  employeeInfo: {
    marginBottom: '16px',
  },
  employeeName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },
  employeeDetails: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  employeeActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  lastEvaluation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  viewButton: {
    marginLeft: 'auto',
    padding: '4px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  nextEvaluation: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '500',
  },
  evaluateButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
};

export default ManagerEmployeeEvaluations;