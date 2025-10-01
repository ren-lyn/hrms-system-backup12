import API from '../axios';

// Cash Advance API endpoints
export const fetchCashAdvance = (id) => API.get(`/cash-advances/${id}`);
export const fetchMyCashAdvances = () => API.get('/cash-advances/my-requests');
export const downloadCashAdvancePdf = async (id) => {
  try {
    const response = await API.get(`/cash-advances/${id}/download-pdf`, {
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

export const submitCashAdvance = (data) => API.post('/cash-advances', data);