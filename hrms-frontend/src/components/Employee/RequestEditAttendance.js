import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Tabs, Tab, Table, Modal } from 'react-bootstrap';
import { FaEdit, FaCalendarAlt, FaClock, FaImage, FaTrash, FaPaperPlane, FaExclamationTriangle, FaEye, FaHistory, FaCheckCircle, FaTimesCircle, FaList, FaDownload } from 'react-icons/fa';
import axios from '../../axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import EditAttendanceDetailsModal from './EditAttendanceDetailsModal';

const RequestEditAttendance = () => {
  const [activeTab, setActiveTab] = useState('submit');
  
  const [formData, setFormData] = useState({
    date: '',
    current_time_in: '',
    current_time_out: '',
    requested_time_in: '',
    requested_time_out: '',
    reason: '',
    images: []
  });

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imagePreview, setImagePreview] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Submitted requests state
  const [submittedRequests, setSubmittedRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // History state
  const [historyRequests, setHistoryRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Image viewing states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    fetchRecentAttendance();
    // Fetch employee profile for PDF header fields
    (async () => {
      try {
        const res = await axios.get('/employee/profile');
        // Backend returns { profile: {...}, edit_counts: {...}, ... }
        // Prefer the nested profile object
        setEmployeeProfile(res.data?.profile || res.data?.data || res.data || null);
      } catch (e) {
        // ignore if not available
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'submitted') {
      fetchSubmittedRequests();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchRecentAttendance = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/attendance/my-records', {
        params: {
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0]
        }
      });
      
      if (response.data.success) {
        setAttendanceRecords(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await axios.get('/attendance/my-edit-requests', {
        params: { status: 'pending' }
      });
      
      if (response.data.success) {
        setSubmittedRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching submitted requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get('/attendance/my-edit-requests', {
        params: { status: 'all' }
      });
      
      if (response.data.success) {
        // Filter to show processed or old requests
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const filtered = (response.data.data || []).filter(req => {
          const isProcessed = req.status === 'approved' || req.status === 'rejected';
          const isOld = new Date(req.created_at) <= oneWeekAgo;
          return isProcessed || isOld;
        });
        
        setHistoryRequests(filtered);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    
    const record = attendanceRecords.find(r => {
      if (!r.date) return false;
      const recordDate = new Date(r.date).toISOString().split('T')[0];
      return recordDate === selectedDate;
    });
    
    if (record) {
      setSelectedRecord(record);
      
      const formatTimeForInput = (time) => {
        if (!time) return '';
        const parts = time.split(':');
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }
        return time;
      };
      
      setFormData({
        ...formData,
        date: selectedDate,
        current_time_in: record.clock_in || '',
        current_time_out: record.clock_out || '',
        requested_time_in: formatTimeForInput(record.clock_in) || '',
        requested_time_out: formatTimeForInput(record.clock_out) || ''
      });
    } else {
      setSelectedRecord(null);
      setFormData({
        ...formData,
        date: selectedDate,
        current_time_in: '',
        current_time_out: '',
        requested_time_in: '',
        requested_time_out: ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.images.length + files.length > 2) {
      setMessage({ type: 'warning', text: 'You can only upload a maximum of 2 images' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setMessage({ type: 'warning', text: 'Only JPEG, PNG, and GIF images are allowed' });
      return;
    }

    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setMessage({ type: 'warning', text: 'Each image must be less than 5MB' });
      return;
    }

    const newImages = [...formData.images, ...files];
    setFormData({ ...formData, images: newImages });

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
    setMessage({ type: '', text: '' });
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(imagePreview[index]);
    
    setFormData({ ...formData, images: newImages });
    setImagePreview(newPreviews);
  };

  const viewImage = (imagePath) => {
    // Convert storage path to public URL (CORS-friendly media route)
    const clean = String(imagePath).replace(/^public\//, '').replace(/^storage\//, '');
    const imageUrl = `http://localhost:8000/media/${clean}`;
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const extractImages = (req) => {
    let imgs = req.images ?? req.proof_images ?? req.proofImages ?? [];
    if (typeof imgs === 'string') {
      try {
        const parsed = JSON.parse(imgs);
        if (Array.isArray(parsed)) imgs = parsed;
      } catch {}
    }
    return Array.isArray(imgs) ? imgs : [];
  };

  const handleDownloadPdf = async (req) => {
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Resolve employee identity (request payload may omit it)
      let resolvedEmployeeName = '';
      let resolvedEmployeeId = '';
      if (req.employee?.first_name) {
        resolvedEmployeeName = `${req.employee.first_name} ${req.employee.last_name || ''}`.trim();
        resolvedEmployeeId = req.employee.employee_id || '';
      } else if (employeeProfile) {
        // Employee profile endpoint returns fields like { name, employee_id }
        if (employeeProfile.name) {
          resolvedEmployeeName = employeeProfile.name;
        } else if (employeeProfile.first_name) {
          resolvedEmployeeName = `${employeeProfile.first_name} ${employeeProfile.last_name || ''}`.trim();
        }
        if (employeeProfile.employee_id) {
          resolvedEmployeeId = employeeProfile.employee_id;
        }
      } else {
        try {
          const res = await axios.get('/employee/profile');
          const prof = res.data?.profile || res.data?.data || res.data || {};
          if (prof.name) {
            resolvedEmployeeName = prof.name;
          } else if (prof.first_name) {
            resolvedEmployeeName = `${prof.first_name} ${prof.last_name || ''}`.trim();
          }
          if (prof.employee_id) {
            resolvedEmployeeId = prof.employee_id;
          }
        } catch (e) {
          // ignore
        }
      }

      // Build a lightweight print view offscreen
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.background = '#ffffff';
      container.style.padding = '16px';
      const employeeName = resolvedEmployeeName;
      const employeeId = resolvedEmployeeId;
      const submittedOn = req.created_at ? new Date(req.created_at).toLocaleString() : '-';
      const reviewedOn = req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : '-';
      container.innerHTML = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
          <h3 style="margin:0 0 16px 0; text-align:center;">ATTENDANCE EDIT REQUEST FORM</h3>

          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="width:50%; padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Employee Name</div>
                <div style="padding-top:3px; border-top:1px solid #dee2e6;">${employeeName || '—'}</div>
              </td>
              <td style="width:50%; padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Employee ID</div>
                <div style="padding-top:3px; border-top:1px solid #dee2e6;">${employeeId || '—'}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Date</div>
                <div style="padding-top:3px; border-top:1px solid #dee2e6;">${req.date ? new Date(req.date).toLocaleDateString() : '-'}</div>
              </td>
              <td style="padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Time</div>
                <div style="padding-top:3px; border-top:1px solid #dee2e6;">${(req.requested_time_in || '—')} - ${(req.requested_time_out || '—')}</div>
              </td>
            </tr>
          </table>

          <div style="margin-top:12px; border:1px solid #dee2e6; padding:8px 10px;">
            <div style="color:#6c757d; font-size:12px;">Reason</div>
            <div style="min-height:40px;">${req.reason || '—'}</div>
          </div>

          <div style="margin-top:12px; border:1px solid #dee2e6; padding:8px 10px;">
            <div style="color:#6c757d; font-size:12px;">Proof Images</div>
            <div id="imgwrap" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;"></div>
          </div>

          <table style="width:100%; margin-top:12px; border-collapse:collapse; font-size:13px;">
            <tr>
              <td style="width:50%; padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Submitted On</div>
                <div>${submittedOn}</div>
              </td>
              <td style="width:50%; padding:8px 10px; border:1px solid #dee2e6;">
                <div style="color:#6c757d; font-size:12px;">Reviewed On</div>
                <div>${reviewedOn}</div>
              </td>
            </tr>
          </table>

          <table style="width:100%; margin-top:16px; border-collapse:collapse;">
            <tr>
              <td style="width:100%; padding:8px 10px; border-top:1px solid #adb5bd; text-align:center;">
                <div style="font-weight:600;">${req.hr_reviewer?.first_name ? `${req.hr_reviewer.first_name} ${req.hr_reviewer.last_name || ''}` : (req.hrReviewer?.first_name ? `${req.hrReviewer.first_name} ${req.hrReviewer.last_name || ''}` : '__________________')}</div>
                <div style="color:#6c757d; font-size:12px;">Approved by (HR Assistant)</div>
              </td>
            </tr>
          </table>
        </div>
      `;
      document.body.appendChild(container);

      const imgwrap = container.querySelector('#imgwrap');
      const imgs = extractImages(req);
      imgs.forEach((p) => {
        const clean = String(p).replace(/^public\//, '').replace(/^storage\//, '');
        const src = `http://localhost:8000/media/${clean}`;
        const img = document.createElement('img');
        img.src = src;
        img.style.width = '180px';
        img.style.height = '130px';
        img.style.objectFit = 'cover';
        img.style.border = '1px solid #adb5bd';
        imgwrap.appendChild(img);
      });

      // Wait a tick for images to load
      await new Promise((r) => setTimeout(r, 200));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      const filename = `Edit_Attendance_${req.id || ''}_${req.date || ''}.pdf`;
      pdf.save(filename);
      document.body.removeChild(container);
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  const submitEditToServer = async () => {
    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('date', formData.date);
      submitData.append('current_time_in', formData.current_time_in || '');
      submitData.append('current_time_out', formData.current_time_out || '');
      submitData.append('requested_time_in', formData.requested_time_in || '');
      submitData.append('requested_time_out', formData.requested_time_out || '');
      submitData.append('reason', formData.reason);
      formData.images.forEach((image, index) => {
        submitData.append(`images[${index}]`, image);
      });
      const response = await axios.post('/attendance/request-edit', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        toast.success('Attendance edit request submitted');
        setFormData({ date: '', current_time_in: '', current_time_out: '', requested_time_in: '', requested_time_out: '', reason: '', images: [] });
        setImagePreview([]);
        setSelectedRecord(null);
        setShowConfirm(false);
        setActiveTab('submitted');
        fetchSubmittedRequests();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(response.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit edit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.date) {
      setMessage({ type: 'warning', text: 'Please select a date' });
      return;
    }

    if (!formData.requested_time_in && !formData.requested_time_out) {
      setMessage({ type: 'warning', text: 'Please provide at least one requested time' });
      return;
    }

    if (!formData.reason.trim()) {
      setMessage({ type: 'warning', text: 'Please provide a reason for the edit request' });
      return;
    }

    if (formData.images.length === 0) {
      setMessage({ type: 'warning', text: 'Please attach at least one image as proof' });
      return;
    }

    setShowConfirm(true);
  };

  const formatTime = (time) => {
    if (!time) return '--';
    try {
      return format(new Date(`2000-01-01 ${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FaEdit className="me-2" />
            Attendance Edit Requests
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-0"
            fill
          >
            {/* Submit Request Tab */}
            <Tab 
              eventKey="submit" 
              title={
                <>
                  <FaPaperPlane className="me-2" />
                  Submit Request
                </>
              }
            >
              <div className="p-4">
                {message.text && (
                  <Alert 
                    variant={message.type} 
                    dismissible 
                    onClose={() => setMessage({ type: '', text: '' })}
                    className="mb-4"
                  >
                    {message.text}
                  </Alert>
                )}

                <Alert variant="info" className="mb-4">
                  <strong>Note:</strong> Please attach 1-2 images (screenshots, photos of timesheets, etc.) 
                  as proof for your attendance edit request. HR will review your request and approve/reject accordingly.
                </Alert>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label>
                      <FaCalendarAlt className="me-2 text-primary" />
                      Select Date <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleDateChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <Form.Text className="text-muted">
                      Select the date for which you want to request an attendance edit
                    </Form.Text>
                  </Form.Group>

                  {selectedRecord && (
                    <Alert variant="info" className="mb-4">
                      <div className="d-flex align-items-start">
                        <div className="flex-grow-1">
                          <strong className="d-block mb-2">
                            <FaClock className="me-2" />
                            Current Record for {format(new Date(selectedRecord.date), 'MMM dd, yyyy')}:
                          </strong>
                          <Row className="g-2">
                            <Col md={4}>
                              <small className="text-muted d-block">Time In:</small>
                              <Badge bg="light" text="dark" className="font-monospace">
                                {formatTime(selectedRecord.clock_in)}
                              </Badge>
                            </Col>
                            <Col md={4}>
                              <small className="text-muted d-block">Time Out:</small>
                              <Badge bg="light" text="dark" className="font-monospace">
                                {formatTime(selectedRecord.clock_out)}
                              </Badge>
                            </Col>
                            <Col md={4}>
                              <small className="text-muted d-block">Status:</small>
                              <Badge bg="secondary">
                                {selectedRecord.status}
                              </Badge>
                            </Col>
                          </Row>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {formData.date && !selectedRecord && (
                    <Alert variant="warning" className="mb-4">
                      <FaExclamationTriangle className="me-2" />
                      <strong>No attendance record found for this date.</strong>
                      <div className="mt-2 small">
                        You can still submit an edit request to add or correct the attendance record for this date.
                      </div>
                    </Alert>
                  )}

                  <Row className="mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          <FaClock className="me-2 text-primary" />
                          Requested Time In <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="time"
                          name="requested_time_in"
                          value={formData.requested_time_in}
                          onChange={handleInputChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Enter the correct time you clocked in
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          <FaClock className="me-2 text-primary" />
                          Requested Time Out
                        </Form.Label>
                        <Form.Control
                          type="time"
                          name="requested_time_out"
                          value={formData.requested_time_out}
                          onChange={handleInputChange}
                        />
                        <Form.Text className="text-muted">
                          Enter the correct time you clocked out
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      Reason for Edit Request <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="Please explain why you need this attendance record to be corrected..."
                      required
                      maxLength={500}
                    />
                    <Form.Text className="text-muted">
                      {formData.reason.length}/500 characters
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      <FaImage className="me-2 text-primary" />
                      Attach Proof (1-2 Images) <span className="text-danger">*</span>
                    </Form.Label>
                    
                    {formData.images.length < 2 && (
                      <div className="mb-3">
                        <Form.Control
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          onChange={handleImageUpload}
                          multiple
                          ref={fileInputRef}
                        />
                        <Form.Text className="text-muted">
                          Maximum 2 images, up to 5MB each. Accepted formats: JPEG, PNG, GIF
                        </Form.Text>
                      </div>
                    )}

                    {imagePreview.length > 0 && (
                      <Row className="mt-3">
                        {imagePreview.map((preview, index) => (
                          <Col md={6} key={index} className="mb-3">
                            <Card className="border">
                              <Card.Body className="p-2">
                                <div className="position-relative">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
                                  />
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="position-absolute top-0 end-0 m-2"
                                    onClick={() => removeImage(index)}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                                <div className="mt-2 small text-muted">
                                  {formData.images[index]?.name}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={submitting || loading}
                    >
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane className="me-2" />
                          Submit Edit Request
                        </>
                      )}
                    </Button>
                  </div>
                </Form>

                <Alert variant="secondary" className="mt-4 mb-0">
                  <h6 className="fw-bold mb-3">
                    <FaExclamationTriangle className="text-warning me-2" />
                    Important Information
                  </h6>
                  <ul className="mb-0 small">
                    <li className="mb-2">Edit requests can only be made for the last 30 days</li>
                    <li className="mb-2">You must provide a valid reason and supporting proof (images)</li>
                    <li className="mb-2">HR will review your request within 2-3 business days</li>
                    <li className="mb-2">You will be notified once your request is approved or rejected</li>
                    <li>Multiple edit requests for the same date may be flagged for review</li>
                  </ul>
                </Alert>
              </div>
            </Tab>

            {/* Pending Requests Tab (same layout naming as OT Request) */}
            <Tab 
              eventKey="submitted" 
              title={
                <>
                  <FaClock className="me-2" />
                  Pending Requests
                </>
              }
            >
              <div className="p-4">
                {requestsLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3">Loading requests...</p>
                  </div>
                ) : submittedRequests.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Current Times</th>
                          <th>Requested Times</th>
                          <th>Reason</th>
                          <th>Proof Images</th>
                          <th>Status</th>
                          <th>Submitted On</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submittedRequests.map((req) => (
                          <tr key={req.id}>
                            <td>
                              <div className="fw-medium">
                                {format(new Date(req.date), 'MMM dd, yyyy')}
                              </div>
                              <small className="text-muted">
                                {format(new Date(req.date), 'EEEE')}
                              </small>
                            </td>
                            <td>
                              <div className="small">
                                <div>In: <Badge bg="light" text="dark">{formatTime(req.current_time_in)}</Badge></div>
                                <div>Out: <Badge bg="light" text="dark">{formatTime(req.current_time_out)}</Badge></div>
                              </div>
                            </td>
                            <td>
                              <div className="small">
                                <div>In: <Badge bg="primary">{formatTime(req.requested_time_in)}</Badge></div>
                                <div>Out: <Badge bg="primary">{formatTime(req.requested_time_out)}</Badge></div>
                              </div>
                            </td>
                            <td>
                              <div className="small" style={{ maxWidth: '200px' }}>
                                {req.reason?.substring(0, 50)}
                                {req.reason?.length > 50 && '...'}
                              </div>
                            </td>
                            <td>
                              {extractImages(req).length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {extractImages(req).map((imagePath, index) => (
                                    <Button
                                      key={index}
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => viewImage(imagePath)}
                                      title={`View image ${index + 1}`}
                                      className="p-1"
                                    >
                                      <FaImage size={12} className="me-1" />
                                      {index + 1}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted small">No images</span>
                              )}
                            </td>
                            <td>
                              {getStatusBadge(req.status)}
                            </td>
                            <td>
                              <small className="text-muted">
                                {format(new Date(req.created_at), 'MMM dd, yyyy')}
                                <br />
                                {format(new Date(req.created_at), 'h:mm a')}
                              </small>
                            </td>
                            <td>
                              <Button variant="outline-secondary" size="sm" onClick={() => handleDownloadPdf(req)}>
                                <FaDownload className="me-1" /> PDF
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaList size={48} className="text-muted mb-3" />
                    <h6 className="text-muted">No Pending Requests</h6>
                    <p className="text-muted small">
                      You don't have any pending edit requests at the moment.
                    </p>
                  </div>
                )}
              </div>
            </Tab>

            {/* History Tab */}
            <Tab 
              eventKey="history" 
              title={
                <>
                  <FaHistory className="me-2" />
                  History
                </>
              }
            >
              <div className="p-4">
                {historyLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3">Loading history...</p>
                  </div>
                ) : historyRequests.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Requested Times</th>
                          <th>Reason</th>
                          <th>Proof Images</th>
                          <th>Status</th>
                          <th>Submitted On</th>
                          <th>Reviewed On</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRequests.map((req) => (
                          <tr key={req.id}>
                            <td>
                              <div className="fw-medium">
                                {format(new Date(req.date), 'MMM dd, yyyy')}
                              </div>
                            </td>
                            <td>
                              <div className="small">
                                <div>In: <Badge bg="primary">{formatTime(req.requested_time_in)}</Badge></div>
                                <div>Out: <Badge bg="primary">{formatTime(req.requested_time_out)}</Badge></div>
                              </div>
                            </td>
                            <td>
                              <div className="small" style={{ maxWidth: '200px' }}>
                                {req.reason?.substring(0, 50)}
                                {req.reason?.length > 50 && '...'}
                              </div>
                            </td>
                            <td>
                              {extractImages(req).length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {extractImages(req).map((imagePath, index) => (
                                    <Button
                                      key={index}
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => viewImage(imagePath)}
                                      title={`View image ${index + 1}`}
                                      className="p-1"
                                    >
                                      <FaImage size={12} className="me-1" />
                                      {index + 1}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted small">No images</span>
                              )}
                            </td>
                            <td>
                              {getStatusBadge(req.status)}
                              {req.status === 'approved' && (
                                <div className="small text-success mt-1">
                                  <FaCheckCircle className="me-1" />
                                  Approved
                                </div>
                              )}
                              {req.status === 'rejected' && (
                                <>
                                  <div className="small text-danger mt-1">
                                    <FaTimesCircle className="me-1" />
                                    Rejected
                                  </div>
                                  {req.rejection_reason && (
                                    <div className="small text-muted mt-1">
                                      Reason: {req.rejection_reason.substring(0, 30)}...
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                            <td>
                              <small className="text-muted">
                                {format(new Date(req.created_at), 'MMM dd, yyyy')}
                              </small>
                            </td>
                            <td>
                              {req.reviewed_at ? (
                                <small className="text-muted">
                                  {format(new Date(req.reviewed_at), 'MMM dd, yyyy')}
                                </small>
                              ) : (
                                <small className="text-muted">--</small>
                              )}
                            </td>
                            <td>
                              <Button variant="outline-secondary" size="sm" onClick={() => handleDownloadPdf(req)}>
                                <FaDownload className="me-1" /> PDF
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaHistory size={48} className="text-muted mb-3" />
                    <h6 className="text-muted">No History Found</h6>
                    <p className="text-muted small">
                      Your processed edit requests from a week ago or older will appear here.
                    </p>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Confirm Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
              <FaEdit className="text-primary" />
            </div>
            <div>
              <div className="fw-semibold">Confirm Attendance Edit Request</div>
              <small className="text-muted">Please review the details before submitting</small>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3" style={{ backgroundColor: '#f8f9fa' }}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <div className="small text-muted">Date</div>
                  <div className="fw-semibold">{formData.date}</div>
                </Col>
                <Col md={8}>
                  <div className="small text-muted">Current</div>
                  <div className="fw-semibold">{formData.current_time_in || '—'} - {formData.current_time_out || '—'}</div>
                </Col>
                <Col md={12}>
                  <div className="small text-muted">Requested</div>
                  <div className="fw-semibold">{formData.requested_time_in || '—'} - {formData.requested_time_out || '—'}</div>
                </Col>
                <Col md={12}>
                  <div className="small text-muted">Reason</div>
                  <div className="border rounded p-2 bg-light">{formData.reason || '—'}</div>
                </Col>
                <Col md={12}>
                  <div className="small text-muted">Proof Images</div>
                  <div className="fw-semibold">{formData.images.length}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Back
          </Button>
          <Button variant="primary" onClick={submitEditToServer} disabled={submitting} className="px-4">
            {submitting ? <Spinner animation="border" size="sm" className="me-2" /> : null}
            Continue & Submit
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image View Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                <FaImage className="text-info" size={20} />
              </div>
              <div>
                <h5 className="mb-0">Proof of Attendance Edit</h5>
                <small className="text-muted">Employee submitted evidence</small>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#f8f9fa' }}>
          <img 
            src={selectedImage} 
            alt="Proof" 
            className="img-fluid rounded shadow" 
            style={{ maxHeight: '70vh', maxWidth: '100%' }} 
          />
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light">
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Details Modal */}
      <EditAttendanceDetailsModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        request={selectedRequest}
      />
    </Container>
  );
};

export default RequestEditAttendance;





