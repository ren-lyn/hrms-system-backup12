import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Form, Row, Col, Alert, Modal, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faSave, 
  faEye, 
  faEdit, 
  faTrash,
  faUpload,
  faCheckCircle,
  faExclamationTriangle,
  faBuilding,
  faUserTie,
  faFileContract,
  faCalendarAlt,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faIdCard,
  faDollarSign
} from '@fortawesome/free-solid-svg-icons';

const EmployeeProfileCreation = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [contractFile, setContractFile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [formData, setFormData] = useState({
    // Basic Information
    first_name: '',
    last_name: '',
    nickname: '',
    email: '',
    phone: '',
    birth_date: '',
    birth_place: '',
    age: '',
    civil_status: '',
    gender: '',
    present_address: '',
    
    // Employment Information
    job_title: '',
    position: '',
    department: '',
    manager_id: '',
    supervisor_id: '',
    employment_status: 'Full-time',
    hire_date: '',
    tenurity: '',
    
    // Government IDs
    sss_no: '',
    phic_no: '',
    pagibig_no: '',
    tin_no: '',
    
    // Optional Termination Information
    termination_date: '',
    termination_reason: '',
    remarks: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Mock data for demonstration
      const mockEmployees = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          nickname: 'Johnny',
          email: 'john.doe@company.com',
          phone: '+63 912 345 6789',
          job_title: 'Software Developer',
          department: 'IT Department',
          employment_status: 'Full-time',
          hire_date: '2024-01-15',
          sss_no: '12-3456789-0',
          phic_no: '12-345678901-2',
          pagibig_no: '1234-5678-9012',
          tin_no: '123-456-789-000'
        }
      ];
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Mock departments
      setDepartments([
        { id: 1, name: 'IT Department' },
        { id: 2, name: 'Human Resources' },
        { id: 3, name: 'Finance' },
        { id: 4, name: 'Marketing' },
        { id: 5, name: 'Operations' }
      ]);
    }
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/employees/managers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManagers(response.data);
    } catch (error) {
      console.error('Error fetching managers:', error);
      // Mock managers
      setManagers([
        { id: 1, first_name: 'Sarah', last_name: 'Johnson', position: 'IT Manager' },
        { id: 2, first_name: 'Michael', last_name: 'Brown', position: 'HR Manager' },
        { id: 3, first_name: 'Emily', last_name: 'Davis', position: 'Finance Manager' }
      ]);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setContractFile(e.target.files[0]);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleBirthDateChange = (e) => {
    const birthDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      birth_date: birthDate,
      age: calculateAge(birthDate)
    }));
  };


  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const submitData = {
        ...formData,
        contract_file: contractFile
      };

      if (editingEmployee) {
        // Update existing employee
        await axios.put(`http://localhost:8000/api/employees/${editingEmployee.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showAlert('Employee profile updated successfully!', 'success');
      } else {
        // Create new employee
        await axios.post('http://localhost:8000/api/employees', submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showAlert('Employee profile created successfully!', 'success');
      }

      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      showAlert('Error saving employee profile. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAllChanges = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Submit all pending changes (if any)
      showAlert('All changes have been submitted successfully!', 'success');
      fetchEmployees();
    } catch (error) {
      console.error('Error submitting changes:', error);
      showAlert('Error submitting changes. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      nickname: '',
      email: '',
      phone: '',
      birth_date: '',
      birth_place: '',
      age: '',
      civil_status: '',
      gender: '',
      present_address: '',
      job_title: '',
      position: '',
      department: '',
      manager_id: '',
      supervisor_id: '',
      employment_status: 'Full-time',
      hire_date: '',
      tenurity: '',
      sss_no: '',
      phic_no: '',
      pagibig_no: '',
      tin_no: '',
      termination_date: '',
      termination_reason: '',
      remarks: ''
    });
    setContractFile(null);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      nickname: employee.nickname || '',
      email: employee.email || '',
      phone: employee.phone || '',
      birth_date: employee.birth_date || '',
      birth_place: employee.birth_place || '',
      age: employee.age || '',
      civil_status: employee.civil_status || '',
      gender: employee.gender || '',
      present_address: employee.present_address || '',
      job_title: employee.job_title || '',
      position: employee.position || '',
      department: employee.department || '',
      manager_id: employee.manager_id || '',
      supervisor_id: employee.supervisor_id || '',
      employment_status: employee.employment_status || 'Full-time',
      hire_date: employee.hire_date || '',
      tenurity: employee.tenurity || '',
      sss_no: employee.sss_no || '',
      phic_no: employee.phic_no || '',
      pagibig_no: employee.pagibig_no || '',
      tin_no: employee.tin_no || '',
      termination_date: employee.termination_date || '',
      termination_reason: employee.termination_reason || '',
      remarks: employee.remarks || ''
    });
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  };

  const getEmploymentStatusBadge = (status) => {
    const statusConfig = {
      'Full-time': { color: 'success', text: 'Full-time' },
      'Part-time': { color: 'info', text: 'Part-time' },
      'Probationary': { color: 'warning', text: 'Probationary' },
      'Contractual': { color: 'primary', text: 'Contractual' },
      'Project-based': { color: 'secondary', text: 'Project-based' },
      'Intern/Trainee': { color: 'light', text: 'Intern/Trainee' },
      'Retired': { color: 'dark', text: 'Retired' },
      'Resigned': { color: 'danger', text: 'Resigned' },
      'On leave': { color: 'warning', text: 'On leave' }
    };
    
    const config = statusConfig[status] || statusConfig['Full-time'];
    return <Badge bg={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="container-fluid p-4">
      <style>
        {`
          .modal-scrollable .modal-body {
            max-height: 70vh;
            overflow-y: auto;
            padding-bottom: 20px;
          }
          
          .modal-scrollable .modal-footer {
            position: sticky;
            bottom: 0;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            z-index: 1050;
          }
          
          .modal-scrollable .modal-body::-webkit-scrollbar {
            width: 8px;
          }
          
          .modal-scrollable .modal-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          .modal-scrollable .modal-body::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          .modal-scrollable .modal-body::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}
      </style>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-primary mb-1 fw-bold">
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                Employee Profile Creation
              </h2>
              <p className="text-muted mb-0">Create and manage employee profiles</p>
            </div>
            <Button variant="primary" onClick={handleCreateNew}>
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              Create New Employee
            </Button>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert.show && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
          {alert.message}
        </Alert>
      )}

      {/* Employees Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">
            <FontAwesomeIcon icon={faBuilding} className="me-2" />
            Employee List
          </h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Employment Status</th>
                    <th>Hire Date</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div>
                          <strong>{employee.first_name} {employee.last_name}</strong>
                          {employee.nickname && (
                            <><br /><small className="text-muted">({employee.nickname})</small></>
                          )}
                        </div>
                      </td>
                      <td>{employee.job_title || employee.position}</td>
                      <td>{employee.department}</td>
                      <td>{getEmploymentStatusBadge(employee.employment_status)}</td>
                      <td>{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div>
                          <small className="text-muted">{employee.email}</small>
                          {employee.phone && (
                            <><br /><small className="text-muted">{employee.phone}</small></>
                          )}
                        </div>
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          className="me-2"
                        >
                          <FontAwesomeIcon icon={faEdit} className="me-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" scrollable className="modal-scrollable">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={editingEmployee ? faEdit : faUserPlus} className="me-2" />
            {editingEmployee ? 'Edit Employee Profile' : 'Create New Employee Profile'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: '20px' }}>
            <Row>
              {/* Basic Information */}
              <Col md={6}>
                <Card className="mb-4">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faUserTie} className="me-2" />
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>First Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Last Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nickname</Form.Label>
                          <Form.Control
                            type="text"
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email *</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone Number *</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Gender</Form.Label>
                          <Form.Select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Birth Date *</Form.Label>
                          <Form.Control
                            type="date"
                            name="birth_date"
                            value={formData.birth_date}
                            onChange={handleBirthDateChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Age</Form.Label>
                          <Form.Control
                            type="text"
                            name="age"
                            value={formData.age}
                            readOnly
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Birth Place</Form.Label>
                          <Form.Control
                            type="text"
                            name="birth_place"
                            value={formData.birth_place}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Civil Status</Form.Label>
                          <Form.Select
                            name="civil_status"
                            value={formData.civil_status}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Civil Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Present Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="present_address"
                        value={formData.present_address}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>

              {/* Employment Information */}
              <Col md={6}>
                <Card className="mb-4">
                  <Card.Header className="bg-success text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faBuilding} className="me-2" />
                      Employment Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Job Title *</Form.Label>
                          <Form.Control
                            type="text"
                            name="job_title"
                            value={formData.job_title}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Position</Form.Label>
                          <Form.Control
                            type="text"
                            name="position"
                            value={formData.position}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Department *</Form.Label>
                          <Form.Select
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Employment Status *</Form.Label>
                          <Form.Select
                            name="employment_status"
                            value={formData.employment_status}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Project-based">Project-based</option>
                            <option value="Intern/Trainee">Intern/Trainee</option>
                            <option value="Retired">Retired</option>
                            <option value="Resigned">Resigned</option>
                            <option value="On leave">On leave</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Manager/Supervisor</Form.Label>
                          <Form.Select
                            name="manager_id"
                            value={formData.manager_id}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Manager</option>
                            {managers.map(manager => (
                              <option key={manager.id} value={manager.id}>
                                {manager.first_name} {manager.last_name} - {manager.position}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Hire Date *</Form.Label>
                          <Form.Control
                            type="date"
                            name="hire_date"
                            value={formData.hire_date}
                            onChange={handleInputChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Tenurity</Form.Label>
                      <Form.Control
                        type="text"
                        name="tenurity"
                        value={formData.tenurity}
                        onChange={handleInputChange}
                        placeholder="e.g., 2 years, 6 months"
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              {/* Government IDs */}
              <Col md={6}>
                <Card className="mb-4">
                  <Card.Header className="bg-info text-white">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faIdCard} className="me-2" />
                      Government IDs
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>SSS Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="sss_no"
                            value={formData.sss_no}
                            onChange={handleInputChange}
                            placeholder="12-3456789-0"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>PhilHealth Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="phic_no"
                            value={formData.phic_no}
                            onChange={handleInputChange}
                            placeholder="12-345678901-2"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Pag-IBIG Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="pagibig_no"
                            value={formData.pagibig_no}
                            onChange={handleInputChange}
                            placeholder="1234-5678-9012"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>TIN Number</Form.Label>
                          <Form.Control
                            type="text"
                            name="tin_no"
                            value={formData.tin_no}
                            onChange={handleInputChange}
                            placeholder="123-456-789-000"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {/* Contract Upload & Termination Info */}
              <Col md={6}>
                <Card className="mb-4">
                  <Card.Header className="bg-warning text-dark">
                    <h6 className="mb-0">
                      <FontAwesomeIcon icon={faFileContract} className="me-2" />
                      Contract & Termination
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Employment Contract</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <Form.Text className="text-muted">
                        Upload employment contract (PDF, DOC, DOCX)
                      </Form.Text>
                    </Form.Group>
                    
                    <hr />
                    
                    <h6 className="text-muted">Termination Information (Optional)</h6>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Termination Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="termination_date"
                            value={formData.termination_date}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Termination Reason</Form.Label>
                          <Form.Select
                            name="termination_reason"
                            value={formData.termination_reason}
                            onChange={handleInputChange}
                          >
                            <option value="">Select Reason</option>
                            <option value="Resignation">Resignation</option>
                            <option value="Termination">Termination</option>
                            <option value="Retirement">Retirement</option>
                            <option value="End of Contract">End of Contract</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Remarks</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        placeholder="Additional notes or remarks..."
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between border-top bg-light" style={{ position: 'sticky', bottom: 0, zIndex: 1050 }}>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Cancel
            </Button>
            <div className="d-flex gap-2">
              <Button variant="success" type="submit" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    {editingEmployee ? 'Update Employee Profile' : 'Submit Employee Profile'}
                  </>
                )}
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeProfileCreation;
