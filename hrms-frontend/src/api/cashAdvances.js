import axios from '../axios';

// Get all cash advance requests (HR Assistant)
export const fetchCashAdvanceRequests = async (params = {}) => {
  try {
    const response = await axios.get('/cash-advances', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching cash advance requests:', error);
    throw error;
  }
};

// Get statistics for dashboard
export const getCashAdvanceStats = async () => {
  try {
    const response = await axios.get('/cash-advances/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching cash advance stats:', error);
    throw error;
  }
};

// Get specific cash advance request details
export const getCashAdvanceRequest = async (id) => {
  try {
    const response = await axios.get(`/cash-advances/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching cash advance request:', error);
    throw error;
  }
};

// Approve cash advance request
export const approveCashAdvanceRequest = async (id, remarks = '', amountCA = null, remCA = null) => {
  try {
    const response = await axios.put(`/cash-advances/${id}/approve`, {
      hr_remarks: remarks,
      amount_ca: amountCA,
      rem_ca: remCA
    });
    return response.data;
  } catch (error) {
    console.error('Error approving cash advance request:', error);
    throw error;
  }
};

// Reject cash advance request
export const rejectCashAdvanceRequest = async (id, remarks, amountCA = null, remCA = null) => {
  try {
    const response = await axios.put(`/cash-advances/${id}/reject`, {
      hr_remarks: remarks,
      amount_ca: amountCA,
      rem_ca: remCA
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting cash advance request:', error);
    throw error;
  }
};

// Submit new cash advance request (Employee)
export const submitCashAdvanceRequest = async (requestData) => {
  try {
    const response = await axios.post('/cash-advances', requestData);
    return response.data;
  } catch (error) {
    console.error('Error submitting cash advance request:', error);
    throw error;
  }
};

// Get user's own cash advance requests (Employee)
export const getMyRequests = async () => {
  try {
    const response = await axios.get('/cash-advances/my-requests');
    return response.data;
  } catch (error) {
    console.error('Error fetching user cash advance requests:', error);
    throw error;
  }
};

// Download cash advance form as PDF (HR Assistant)
export const downloadCashAdvancePdf = async (id) => {
  try {
    const response = await axios.get(`/cash-advances/${id}/download-pdf`, {
      responseType: 'blob'
    });
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cash-advance-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading cash advance PDF:', error);
    throw error;
  }
};
