import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useEmployeeCount = () => {
  const [employeeCount, setEmployeeCount] = useState({
    total: 0,
    fullTime: 0,
    training: 0,
    loading: true,
    error: null
  });

  const fetchEmployeeCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEmployeeCount(prev => ({ ...prev, loading: false, error: 'No authentication token' }));
        return;
      }

      const response = await axios.get('http://localhost:8000/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const employees = response.data || [];
      const total = employees.length;
      
      // Calculate full-time vs training based on employment status
      const fullTime = employees.filter(emp => 
        emp.employee_profile?.employment_status?.toLowerCase().includes('full') ||
        emp.employee_profile?.employment_status?.toLowerCase().includes('regular') ||
        emp.employee_profile?.employment_status?.toLowerCase().includes('permanent')
      ).length;
      
      const training = employees.filter(emp => 
        emp.employee_profile?.employment_status?.toLowerCase().includes('training') ||
        emp.employee_profile?.employment_status?.toLowerCase().includes('probation') ||
        emp.employee_profile?.employment_status?.toLowerCase().includes('intern')
      ).length;

      setEmployeeCount({
        total,
        fullTime,
        training,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch employee count:', error);
      setEmployeeCount(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch employee count'
      }));
    }
  }, []);

  useEffect(() => {
    fetchEmployeeCount();
  }, [fetchEmployeeCount]);

  return {
    ...employeeCount,
    refetch: fetchEmployeeCount
  };
};

export default useEmployeeCount;
