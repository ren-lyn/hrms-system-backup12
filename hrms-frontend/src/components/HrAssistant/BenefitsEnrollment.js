import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Table, Modal, Form, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { validateBenefitsEnrollment } from '../../utils/OnboardingValidation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faUser, 
  faShieldAlt, 
  faHeart, 
  faHome, 
  faCheckCircle, 
  faTimesCircle,
  faEdit,
  faCalendarAlt,
  faIdCard,
  faDollarSign,
  faFilter,
  faUsers,
  faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';

const BenefitsEnrollment = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    enrollment_date: new Date().toISOString().split('T')[0],
    member_id: '',
    monthly_contribution: '',
    additional_details: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDepartment]);

  const fetchEmployeesData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch employees with their benefit enrollment status
      const response = await axios.get('http://localhost:8000/api/employees-benefits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees data:', error);
      // Mock data for demonstration
      const mockEmployees = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@company.com',
          position: 'Software Developer',
          department: 'IT Department',
          avatar: 'https://i.pravatar.cc/150?img=1',
          benefits: {
            sss: { enrolled: true, member_id: '03-1234567-8', monthly_contribution: 1200, enrollment_date: '2025-01-01' },
            philhealth: { enrolled: true, member_id: '12-345678901-2', monthly_contribution: 800, enrollment_date: '2025-01-01' },
            pagibig: { enrolled: false, member_id: null, monthly_contribution: null, enrollment_date: null }
          }
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@company.com',
          position: 'UX Designer',
          department: 'Design',
          avatar: 'https://i.pravatar.cc/150?img=2',
          benefits: {
            sss: { enrolled: false, member_id: null, monthly_contribution: null, enrollment_date: null },
            philhealth: { enrolled: true, member_id: '12-345678901-3', monthly_contribution: 750, enrollment_date: '2025-01-05' },
            pagibig: { enrolled: true, member_id: '1234-5678-9012', monthly_contribution: 200, enrollment_date: '2025-01-05' }
          }
        },
        {
          id: 3,
          name: 'Michael Chen',
          email: 'michael.chen@company.com',
          position: 'Production Worker',
          department: 'Manufacturing',
          avatar: 'https://i.pravatar.cc/150?img=3',
          benefits: {
            sss: { enrolled: true, member_id: '03-2345678-9', monthly_contribution: 1000, enrollment_date: '2025-01-10' },
            philhealth: { enrolled: false, member_id: null, monthly_contribution: null, enrollment_date: null },
            pagibig: { enrolled: false, member_id: null, monthly_contribution: null, enrollment_date: null }
          }
        },
        {
          id: 4,
          name: 'Maria Santos',
          email: 'maria.santos@company.com',
          position: 'HR Assistant',
          department: 'Human Resources',
          avatar: 'https://i.pravatar.cc/150?img=4',
          benefits: {
            sss: { enrolled: true, member_id: '03-3456789-0', monthly_contribution: 1100, enrollment_date: '2025-01-01' },
            philhealth: { enrolled: true, member_id: '12-345678901-4', monthly_contribution: 800, enrollment_date: '2025-01-01' },
            pagibig: { enrolled: true, member_id: '1234-5678-9013', monthly_contribution: 200, enrollment_date: '2025-01-01' }
          }
        }
      ];
      
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(employee => employee.department === selectedDepartment);
    }

    setFilteredEmployees(filtered);
  };

  const getUniqueDepartments = () => {
    const departments = [...new Set(employees.map(emp => emp.department))];
    return departments;
  };

  const getBenefitStatus = (employee, benefitType) => {
    const benefit = employee.benefits[benefitType];
    return {
      enrolled: benefit?.enrolled || false,
      memberId: benefit?.member_id || null,
      contribution: benefit?.monthly_contribution || null,
      enrollmentDate: benefit?.enrollment_date || null
    };
  };

  const getBenefitIcon = (benefitType) => {
    switch (benefitType) {
      case 'sss': return faShieldAlt;
      case 'philhealth': return faHeart;
      case 'pagibig': return faHome;
      default: return faShieldAlt;
    }
  };

  const getBenefitName = (benefitType) => {
    switch (benefitType) {
      case 'sss': return 'SSS';
      case 'philhealth': return 'PhilHealth';
      case 'pagibig': return 'Pag-IBIG';
      default: return benefitType;
    }
  };

  const validateMemberId = (benefitType, memberId) => {
    if (!memberId) return 'Member ID is required';

    switch (benefitType) {
      case 'sss':
        // SSS format: XX-XXXXXXXX-X
        const sssPattern = /^\d{2}-\d{7}-\d{1}$/;
        if (!sssPattern.test(memberId)) {
          return 'SSS Member ID must be in format: XX-XXXXXXXX-X (e.g., 03-1234567-8)';
        }
        break;
      case 'philhealth':
        // PhilHealth format: XX-XXXXXXXXX-X
        const philhealthPattern = /^\d{2}-\d{9}-\d{1}$/;
        if (!philhealthPattern.test(memberId)) {
          return 'PhilHealth Member ID must be in format: XX-XXXXXXXXX-X (e.g., 12-345678901-2)';
        }
        break;
      case 'pagibig':
        // Pag-IBIG format: XXXX-XXXX-XXXX
        const pagibigPattern = /^\d{4}-\d{4}-\d{4}$/;
        if (!pagibigPattern.test(memberId)) {
          return 'Pag-IBIG Member ID must be in format: XXXX-XXXX-XXXX (e.g., 1234-5678-9012)';
        }
        break;
    }
    return null;
  };

  const validateForm = () => {
    const validation = validateBenefitsEnrollment({
      ...formData,
      benefitType: selectedBenefit
    });
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleEnrollBenefit = async () => {
    if (!validateForm()) {
      return;
    }

    setEnrolling(true);
    try {
      const token = localStorage.getItem('token');
      
      // Enroll employee in benefit
      await axios.post(`http://localhost:8000/api/employee-benefits/${selectedEmployee.id}`, 
        {
          benefit_type: selectedBenefit,
          member_id: formData.member_id,
          monthly_contribution: parseFloat(formData.monthly_contribution),
          enrollment_date: formData.enrollment_date,
          additional_details: formData.additional_details
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Send notification to employee
      await axios.post(`http://localhost:8000/api/notifications`, 
        {
          user_id: selectedEmployee.id,
          type: 'benefit_enrollment',
          title: `${getBenefitName(selectedBenefit)} Enrollment Confirmed`,
          message: `You have been successfully enrolled in ${getBenefitName(selectedBenefit)}. Member ID: ${formData.member_id}`,
          data: {
            benefit_type: selectedBenefit,
            member_id: formData.member_id,
            monthly_contribution: formData.monthly_contribution
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message
      alert(`${getBenefitName(selectedBenefit)} enrollment successful for ${selectedEmployee.name}!`);
      
      // Reset form and close modal
      setFormData({
        enrollment_date: new Date().toISOString().split('T')[0],
        member_id: '',
        monthly_contribution: '',
        additional_details: ''
      });
      setErrors({});
      setShowEnrollmentModal(false);
      setSelectedEmployee(null);
      setSelectedBenefit(null);
      
      // Refresh data
      fetchEmployeesData();
      
    } catch (error) {
      console.error('Error enrolling in benefit:', error);
      alert('Error enrolling in benefit. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleOpenEnrollmentModal = (employee, benefitType) => {
    setSelectedEmployee(employee);
    setSelectedBenefit(benefitType);
    setFormData({
      enrollment_date: new Date().toISOString().split('T')[0],
      member_id: '',
      monthly_contribution: '',
      additional_details: ''
    });
    setErrors({});
    setShowEnrollmentModal(true);
  };

  const formatCurrency = (amount) => {
    return `₱${amount?.toFixed(2) || '0.00'}`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h3 className="text-primary mb-1 fw-bold">
            <FontAwesomeIcon icon={faClipboardCheck} className="me-2" />
            Benefits Enrollment
          </h3>
          <p className="text-muted mb-0">Enroll employees in government-mandated benefits</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="row mb-4">
        <div className="col-md-6">
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search Employee by Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="col-md-6">
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faFilter} />
            </InputGroup.Text>
            <Form.Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </Form.Select>
          </InputGroup>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faUsers} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{filteredEmployees.length}</h3>
              <small className="opacity-75">Total Employees</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faShieldAlt} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{filteredEmployees.filter(emp => emp.benefits.sss.enrolled).length}</h3>
              <small className="opacity-75">SSS Enrolled</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faHeart} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{filteredEmployees.filter(emp => emp.benefits.philhealth.enrolled).length}</h3>
              <small className="opacity-75">PhilHealth Enrolled</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Card.Body className="text-white text-center">
              <FontAwesomeIcon icon={faHome} size="2x" className="mb-2" />
              <h3 className="fw-bold mb-1">{filteredEmployees.filter(emp => emp.benefits.pagibig.enrolled).length}</h3>
              <small className="opacity-75">Pag-IBIG Enrolled</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Employees Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>SSS</th>
                  <th>PhilHealth</th>
                  <th>Pag-IBIG</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const sssStatus = getBenefitStatus(employee, 'sss');
                  const philhealthStatus = getBenefitStatus(employee, 'philhealth');
                  const pagibigStatus = getBenefitStatus(employee, 'pagibig');
                  
                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img 
                            src={employee.avatar || 'https://i.pravatar.cc/150?img=1'} 
                            alt={employee.name}
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong>{employee.name}</strong>
                            <br />
                            <small className="text-muted">{employee.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{employee.position}</td>
                      <td>{employee.department}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon 
                            icon={sssStatus.enrolled ? faCheckCircle : faTimesCircle} 
                            className={sssStatus.enrolled ? 'text-success' : 'text-danger'} 
                          />
                          <span className="ms-2">
                            {sssStatus.enrolled ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon 
                            icon={philhealthStatus.enrolled ? faCheckCircle : faTimesCircle} 
                            className={philhealthStatus.enrolled ? 'text-success' : 'text-danger'} 
                          />
                          <span className="ms-2">
                            {philhealthStatus.enrolled ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon 
                            icon={pagibigStatus.enrolled ? faCheckCircle : faTimesCircle} 
                            className={pagibigStatus.enrolled ? 'text-success' : 'text-danger'} 
                          />
                          <span className="ms-2">
                            {pagibigStatus.enrolled ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEnrollmentModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faEdit} className="me-1" />
                          Enroll in Benefits
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Enrollment Modal */}
      <Modal show={showEnrollmentModal} onHide={() => setShowEnrollmentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faClipboardCheck} className="me-2" />
            Enroll in Benefits
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmployee && (
            <div>
              {/* Employee Info */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <img 
                      src={selectedEmployee.avatar || 'https://i.pravatar.cc/150?img=1'} 
                      alt={selectedEmployee.name}
                      className="rounded-circle me-3"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                    <div>
                      <h6 className="mb-1">{selectedEmployee.name}</h6>
                      <p className="mb-1 text-muted">{selectedEmployee.position}</p>
                      <small className="text-muted">{selectedEmployee.department}</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Enrollment Status */}
              <div className="row mb-4">
                <div className="col-12">
                  <h6 className="mb-3">Current Enrollment Status:</h6>
                  <div className="row">
                    {['sss', 'philhealth', 'pagibig'].map((benefitType) => {
                      const status = getBenefitStatus(selectedEmployee, benefitType);
                      return (
                        <div key={benefitType} className="col-md-4 mb-3">
                          <Card className={`h-100 ${status.enrolled ? 'border-success' : 'border-warning'}`}>
                            <Card.Body className="text-center">
                              <FontAwesomeIcon 
                                icon={getBenefitIcon(benefitType)} 
                                size="2x" 
                                className={status.enrolled ? 'text-success' : 'text-warning'} 
                              />
                              <h6 className="mt-2">{getBenefitName(benefitType)}</h6>
                              <div className="d-flex align-items-center justify-content-center">
                                <FontAwesomeIcon 
                                  icon={status.enrolled ? faCheckCircle : faTimesCircle} 
                                  className={status.enrolled ? 'text-success' : 'text-danger'} 
                                />
                                <span className="ms-2">
                                  {status.enrolled ? 'Enrolled' : 'Not Enrolled'}
                                </span>
                              </div>
                              {!status.enrolled && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => handleOpenEnrollmentModal(selectedEmployee, benefitType)}
                                >
                                  <FontAwesomeIcon icon={faEdit} className="me-1" />
                                  Enroll
                                </Button>
                              )}
                            </Card.Body>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Enrollment Form */}
              {selectedBenefit && (
                <div className="row">
                  <div className="col-12">
                    <Card className="border-primary">
                      <Card.Header className="bg-primary text-white">
                        <FontAwesomeIcon icon={getBenefitIcon(selectedBenefit)} className="me-2" />
                        Enroll in {getBenefitName(selectedBenefit)}
                      </Card.Header>
                      <Card.Body>
                        <Form>
                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  <FontAwesomeIcon icon={faUser} className="me-1" />
                                  Employee Name
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={selectedEmployee.name}
                                  readOnly
                                  className="bg-light"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  <FontAwesomeIcon icon={getBenefitIcon(selectedBenefit)} className="me-1" />
                                  Benefit Type
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={getBenefitName(selectedBenefit)}
                                  readOnly
                                  className="bg-light"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                                  Enrollment Date *
                                </Form.Label>
                                <Form.Control
                                  type="date"
                                  value={formData.enrollment_date}
                                  onChange={(e) => setFormData({...formData, enrollment_date: e.target.value})}
                                  isInvalid={!!errors.enrollment_date}
                                  max={new Date().toISOString().split('T')[0]}
                                />
                                <Form.Control.Feedback type="invalid">
                                  {errors.enrollment_date}
                                </Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  <FontAwesomeIcon icon={faIdCard} className="me-1" />
                                  Member ID/Number *
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder={
                                    selectedBenefit === 'sss' ? 'XX-XXXXXXXX-X' :
                                    selectedBenefit === 'philhealth' ? 'XX-XXXXXXXXX-X' :
                                    'XXXX-XXXX-XXXX'
                                  }
                                  value={formData.member_id}
                                  onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                                  isInvalid={!!errors.member_id}
                                />
                                <Form.Control.Feedback type="invalid">
                                  {errors.member_id}
                                </Form.Control.Feedback>
                                <Form.Text className="text-muted">
                                  {selectedBenefit === 'sss' && 'Format: XX-XXXXXXXX-X (e.g., 03-1234567-8)'}
                                  {selectedBenefit === 'philhealth' && 'Format: XX-XXXXXXXXX-X (e.g., 12-345678901-2)'}
                                  {selectedBenefit === 'pagibig' && 'Format: XXXX-XXXX-XXXX (e.g., 1234-5678-9012)'}
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  <FontAwesomeIcon icon={faDollarSign} className="me-1" />
                                  Monthly Contribution *
                                </Form.Label>
                                <div className="input-group">
                                  <span className="input-group-text">₱</span>
                                  <Form.Control
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.monthly_contribution}
                                    onChange={(e) => setFormData({...formData, monthly_contribution: e.target.value})}
                                    isInvalid={!!errors.monthly_contribution}
                                  />
                                  <Form.Control.Feedback type="invalid">
                                    {errors.monthly_contribution}
                                  </Form.Control.Feedback>
                                </div>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Additional Details (Optional)</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  placeholder="Additional notes or information"
                                  value={formData.additional_details}
                                  onChange={(e) => setFormData({...formData, additional_details: e.target.value})}
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        </Form>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEnrollmentModal(false)}>
            Cancel
          </Button>
          {selectedBenefit && (
            <Button 
              variant="primary" 
              onClick={handleEnrollBenefit}
              disabled={enrolling}
            >
              {enrolling ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Enrolling...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  Enroll in {getBenefitName(selectedBenefit)}
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BenefitsEnrollment;
