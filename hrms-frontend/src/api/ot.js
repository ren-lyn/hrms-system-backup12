import axios from 'axios';

const API_URL = '/api/ot-requests';

// Employee functions
export const getMyOTRequests = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching OT requests:', error);
    throw error.response?.data || error.message;
  }
};

export const createOTRequest = async (otData) => {
  try {
    const response = await axios.post(API_URL, otData);
    return response.data;
  } catch (error) {
    console.error('Error creating OT request:', error);
    throw error.response?.data || error.message;
  }
};

export const getOTStatistics = async () => {
  try {
    const response = await axios.get(`${API_URL}/statistics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching OT statistics:', error);
    throw error.response?.data || error.message;
  }
};

// HR Assistant/Admin functions
export const getAllOTRequests = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/all`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching all OT requests:', error);
    throw error.response?.data || error.message;
  }
};

export const updateOTRequestStatus = async (id, statusData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/status`, statusData);
    return response.data;
  } catch (error) {
    console.error('Error updating OT request status:', error);
    throw error.response?.data || error.message;
  }
};

// Helper function to calculate duration between two times
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  
  // Calculate difference in hours
  const diffInMs = end - start;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  // Round to 2 decimal places
  return Math.round(diffInHours * 100) / 100;
};
