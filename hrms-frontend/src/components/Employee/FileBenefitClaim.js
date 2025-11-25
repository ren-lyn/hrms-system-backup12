import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Table, Badge, ListGroup, Tabs, Tab, Modal } from 'react-bootstrap';
import { FaFileAlt, FaUpload, FaInfoCircle, FaCheckCircle, FaTimesCircle, FaUser, FaTrash, FaClock, FaHistory, FaEye, FaDownload } from 'react-icons/fa';
import axios from '../../axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import useUserProfile from '../../hooks/useUserProfile';

const FileBenefitClaim = () => {
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [myClaims, setMyClaims] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetails, setClaimDetails] = useState(null);
  const [documentViewerUrl, setDocumentViewerUrl] = useState(null);
  const [documentViewerType, setDocumentViewerType] = useState(null);
  const [allDocuments, setAllDocuments] = useState([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

  const [claimForm, setClaimForm] = useState({
    benefit_type: '',
    claim_type: '',
    description: '',
    application_form: null, // Changed from amount to application_form file
    supporting_documents: [] // Changed to array to support multiple files
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchEmployeeProfile();
    fetchMyClaims();
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee/profile');
      // The API returns { profile: {...}, edit_counts: {...}, remaining_edits: {...} }
      setEmployeeProfile(response.data.profile || response.data);
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      toast.error('Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClaims = async () => {
    try {
      const response = await axios.get('/benefit-claims/my-claims');
      
      // Handle different response structures
      let claimsData = [];
      if (response.data) {
        // Handle case where data is directly an array
        if (Array.isArray(response.data)) {
          claimsData = response.data;
        } 
        // Handle case where data is nested under a data property (API response: { success: true, data: [...] })
        else if (response.data.data && Array.isArray(response.data.data)) {
          claimsData = response.data.data;
        }
        // Handle case where data is an object with claims property
        else if (response.data.claims && Array.isArray(response.data.claims)) {
          claimsData = response.data.claims;
        }
      }
      
      setMyClaims(claimsData);
    } catch (error) {
      console.error('Error fetching my claims:', error);
      // If endpoint doesn't exist, use empty array
      setMyClaims([]);
    }
  };

  const getEnrolledBenefits = () => {
    if (!employeeProfile) return [];
    
    const benefits = [];
    if (employeeProfile.sss) {
      benefits.push({ key: 'sss', label: 'SSS', number: employeeProfile.sss });
    }
    if (employeeProfile.philhealth) {
      benefits.push({ key: 'philhealth', label: 'PhilHealth', number: employeeProfile.philhealth });
    }
    if (employeeProfile.pagibig) {
      benefits.push({ key: 'pagibig', label: 'Pag-IBIG', number: employeeProfile.pagibig });
    }
    return benefits;
  };

  const getClaimTypes = (benefitType) => {
    const claimTypesMap = {
      sss: [
        { value: 'sickness', label: 'Sickness Benefit' },
        { value: 'maternity', label: 'Maternity Benefit' },
        { value: 'ecp', label: 'Employee\'s Compensation Program (ECP/EC)' }
      ],
      philhealth: [
        { value: 'medical', label: 'Medical' },
        { value: 'maternity', label: 'Maternity' }
      ],
      pagibig: [
        { value: 'multipurpose', label: 'Multi-Purpose Loan' }
      ]
    };
    return claimTypesMap[benefitType] || [];
  };

  const getClaimTypeLabel = () => {
    if (!claimForm.benefit_type || !claimForm.claim_type) return '';
    const claimTypes = getClaimTypes(claimForm.benefit_type);
    const selectedClaim = claimTypes.find(type => type.value === claimForm.claim_type);
    return selectedClaim ? selectedClaim.label : claimForm.claim_type;
  };

  const getEligibilityConditions = () => {
    if (!claimForm.benefit_type || !claimForm.claim_type) return null;

    const eligibilityMap = {
      sss: {
        sickness: {
          title: 'Sickness Benefit - Eligibility / Qualifying Conditions',
          conditions: [
            'The member must be unable to work due to sickness or injury and confined (either at home or hospital) for at least 4 days',
            'The member must have paid at least 3 months of SSS contributions in the 12-month period immediately preceding the semester (i.e., six-month block) in which sickness occurred'
          ]
        },
        maternity: {
          title: 'Maternity Benefit - Eligibility / Qualifying Conditions',
          conditions: [
            'The female member must have paid at least 3 monthly contributions in the 12-month period immediately before the semester contingency (i.e., childbirth, miscarriage, or emergency termination of pregnancy)',
            'Only contributions before the contingency semester are counted'
          ]
        },
        ecp: {
          title: 'Employee\'s Compensation Program (ECP/EC) - Eligibility / Qualifying Conditions',
          conditions: [
            'The sickness, injury, or death must be work-related',
            'The member (employee) must have been duly reported to SSS',
            'SSS must be notified about the contingency (illness, injury, or death) per the notification rules'
          ]
        }
      },
      philhealth: {
        medical: {
          title: 'Hospitalization Claim (PhilHealth CF1) - Eligibility / Qualifying Conditions',
          conditions: [
            'Employee must be an active PhilHealth member OR dependent of a member',
            'Have at least 9 months of contributions within the last 12 months',
            'Be confined in a PhilHealth-accredited hospital',
            'Have an attending physician who certifies illness & confinement'
          ]
        },
        maternity: {
          title: 'Maternity Care Package (Normal/Cesarean) - Eligibility / Qualifying Conditions',
          conditions: [
            'Female employee who is an active PhilHealth member',
            'At least 9 months PhilHealth contributions within the prior 12 months',
            'Applies to:',
            '  • Normal Spontaneous Delivery (NSD)',
            '  • Caesarean delivery',
            '  • Maternity Care Package at lying-in/clinic'
          ]
        }
      },
      pagibig: {
        multipurpose: {
          title: 'MPL Payment Waiver / Adjustment (Due to Maternity or Separation) - Eligibility / Qualifying Conditions',
          conditions: [
            'Employee must be currently paying a Pag-IBIG Multi-Purpose Loan',
            'Unable to pay due to:',
            '  • Maternity leave',
            '  • Separation from work'
          ]
        }
      }
    };

    return eligibilityMap[claimForm.benefit_type]?.[claimForm.claim_type] || null;
  };

  const getRequiredSupportingDocuments = () => {
    if (!claimForm.benefit_type || !claimForm.claim_type) return [];

    const documentsMap = {
      sss: {
        sickness: [
          'SS Medical Certificate',
          'Supporting Medical Documents (if necessary):',
          '  • Lab results',
          '  • X-ray',
          '  • ECG',
          '  • Hospital abstracts',
          '  • Operating room or clinical records',
          'Note: The Sickness Benefit Application Form should be uploaded in the "Upload Benefit Application Form" field above'
        ],
        maternity: [
          'Maternity Benefit Application Form / Maternity Benefit Reimbursement Application',
          'Proof of pregnancy:',
          '  • Pregnancy test result signed by physician / municipal health officer',
          '  • Diagnostic tests such as ultrasound, beta-hCG, early pregnancy factor',
          'Birth / Death / Miscarriage Documents (depending on the case):',
          '  • For live birth: Certificate of Live Birth (CLB) from Local Civil Registrar (LCR) or PSA',
          '  • For miscarriage / ETP: Medical records or hospital documents',
          'Valid ID of the member'
        ],
        ecp: [
          'Accident / Sickness Report from employer. If the contingency is due to vehicular accident, a Police Report may be required',
          'Employer\'s logbook entry describing the accident / sickness (if applicable)',
          'Medical documents:',
          '  • Hospital abstracts',
          '  • Records',
          '  • Physician\'s report',
          'For EC Medical Reimbursement:',
          '  • EC Application Forms (1 & 2)',
          '  • Logbook page',
          '  • Accident report',
          '  • SS ID / UMID or other ID',
          'Valid ID',
          'If the claimant can\'t personally file:',
          '  • SPA (Special Power of Attorney)',
          '  • Affidavit of guardianship',
          '  • In-trust-for account setup',
          'For dependents (in total disability):',
          '  • Marriage certificate',
          '  • Children\'s birth certificates',
          'For medical expenses reimbursement:',
          '  • Receipts (OR) with BIR permit number',
          '  • Deposit slips or bank statements'
        ],
        disability: [
          'SSS disability application form (SS Form B-311)',
          'Medical certificate from attending physician',
          'Hospital/Clinic records',
          'Certificate of disability from attending physician',
          'Laboratory results and diagnostic reports'
        ],
        retirement: [
          'SSS retirement claim application form (SS Form CLD-102)',
          'Birth certificate',
          'Valid ID',
          'SSS E-1 or E-4 form',
          'Bank account details'
        ],
        death: [
          'SSS death claim application form (SS Form CLD-102)',
          'Death certificate',
          'Birth certificate of deceased',
          'Marriage certificate (if applicable)',
          'Valid IDs of beneficiaries'
        ],
        other: [
          'SSS application form (appropriate form for claim type)',
          'Supporting documents relevant to your claim',
          'Medical certificates (if applicable)',
          'Valid ID'
        ]
      },
      philhealth: {
        medical: [
          'PhilHealth Claim Form 1 (CF1) – employee fills Part I',
          'PhilHealth ID or any valid government ID',
          'Hospital documents (if required):',
          '  • Admission slip',
          '  • Medical abstract',
          '  • Doctor\'s order or clinical summary',
          'Note: The PhilHealth CF1 should be uploaded in the "Upload Benefit Application Form" field above'
        ],
        maternity: [
          'PhilHealth CF1',
          'PhilHealth ID or valid ID',
          'MDR (Member Data Record)',
          'Medical documents:',
          '  • Pregnancy ultrasound (if asked by hospital)',
          '  • OB history',
          'Note: The PhilHealth CF1 should be uploaded in the "Upload Benefit Application Form" field above'
        ],
        disability: [
          'PhilHealth disability claim form',
          'Medical certificate from attending physician',
          'Hospital/Clinic records',
          'Certificate of disability',
          'Laboratory results and diagnostic reports'
        ],
        death: [
          'PhilHealth death claim form',
          'Death certificate',
          'Birth certificate of deceased',
          'Marriage certificate (if applicable)',
          'Valid IDs of beneficiaries'
        ],
        other: [
          'PhilHealth claim form (appropriate form for claim type)',
          'Supporting documents relevant to your claim',
          'Medical certificates (if applicable)',
          'Valid ID'
        ]
      },
      pagibig: {
        housing: [
          'Pag-IBIG housing loan application form',
          'Valid ID',
          'Proof of income',
          'Property documents',
          'Marriage certificate (if applicable)'
        ],
        calamity: [
          'Pag-IBIG calamity loan application form',
          'Valid ID',
          'Proof of calamity (news clippings, barangay certificate)',
          'Proof of income',
          'Pag-IBIG membership ID'
        ],
        multipurpose: [
          'MPL Payment Adjustment/Waiver Form (varies by Pag-IBIG branch)',
          'Valid ID',
          'Supporting documents:',
          '  • Maternity leave certificate or OB medical certificate (if due to maternity)',
          '  • Certificate of separation if due to job loss',
          '  • Recent payslips (optional, for employer confirmation)',
          'Note: The MPL Payment Adjustment/Waiver Form should be uploaded in the "Upload Benefit Application Form" field above'
        ],
        savings: [
          'Pag-IBIG savings withdrawal form',
          'Valid ID',
          'Pag-IBIG membership ID',
          'Bank account details',
          'Proof of membership'
        ],
        other: [
          'Pag-IBIG application form (appropriate form for claim type)',
          'Supporting documents relevant to your claim',
          'Valid ID',
          'Pag-IBIG membership ID'
        ]
      }
    };

    return documentsMap[claimForm.benefit_type]?.[claimForm.claim_type] || [];
  };

  const handleSupportingDocumentAdd = (e) => {
    const files = Array.from(e.target.files);
    setClaimForm({
      ...claimForm,
      supporting_documents: [...claimForm.supporting_documents, ...files]
    });
  };

  const handleSupportingDocumentRemove = (index) => {
    const updatedDocs = claimForm.supporting_documents.filter((_, i) => i !== index);
    setClaimForm({
      ...claimForm,
      supporting_documents: updatedDocs
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!claimForm.benefit_type) {
      newErrors.benefit_type = 'Please select a benefit type';
    }
    if (!claimForm.claim_type) {
      newErrors.claim_type = 'Please select a claim type';
    }
    if (!claimForm.application_form) {
      newErrors.application_form = 'Please upload the benefit claim application form';
    }
    if (!claimForm.description || claimForm.description.trim().length < 10) {
      newErrors.description = 'Please provide a detailed description (at least 10 characters)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('benefit_type', claimForm.benefit_type);
      formData.append('claim_type', claimForm.claim_type);
      formData.append('description', claimForm.description);
      
      // Add application form file (required)
      if (claimForm.application_form) {
        formData.append('application_form', claimForm.application_form);
      }
      
      // Add supporting documents (optional - multiple files)
      if (claimForm.supporting_documents && claimForm.supporting_documents.length > 0) {
        claimForm.supporting_documents.forEach((file, index) => {
          formData.append(`supporting_documents[${index}]`, file);
        });
      }

      await axios.post('/benefit-claims', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Benefit claim request filed successfully');
      
      // Reset form
      setClaimForm({
        benefit_type: '',
        claim_type: '',
        description: '',
        application_form: null,
        supporting_documents: []
      });
      setErrors({});
      
      // Refresh claims list
      await fetchMyClaims();
      
      // Switch to pending tab to show the newly filed claim
      setActiveTab('pending');
    } catch (error) {
      console.error('Error filing claim:', error);
      const errorMessage = error.response?.data?.message || 'Failed to file benefit claim';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusLabels = {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved_by_hr': 'Approved by HR',
      'for_submission_to_agency': 'For Submission to Agency',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'pending': 'Pending', // Legacy support
      'approved': 'Approved', // Legacy support
      'processing': 'Processing' // Legacy support
    };
    
    const variants = {
      'submitted': 'info',
      'under_review': 'warning',
      'approved_by_hr': 'success',
      'for_submission_to_agency': 'primary',
      'completed': 'success',
      'rejected': 'danger',
      'pending': 'warning', // Legacy
      'approved': 'success', // Legacy
      'processing': 'info' // Legacy
    };
    
    const label = statusLabels[status] || status?.toUpperCase() || 'N/A';
    return <Badge bg={variants[status] || 'secondary'}>{label}</Badge>;
  };

  const enrolledBenefits = getEnrolledBenefits();
  const availableClaimTypes = claimForm.benefit_type ? getClaimTypes(claimForm.benefit_type) : [];

  // Filter claims by status
  const pendingClaims = myClaims.filter(claim => 
    claim.status === 'submitted' || 
    claim.status === 'under_review' || 
    claim.status === 'approved_by_hr' || 
    claim.status === 'for_submission_to_agency' ||
    claim.status === 'pending' // Legacy support
  );
  const historyClaims = myClaims.filter(claim => 
    claim.status === 'completed' || 
    claim.status === 'rejected' ||
    (claim.status !== 'submitted' && 
     claim.status !== 'under_review' && 
     claim.status !== 'approved_by_hr' && 
     claim.status !== 'for_submission_to_agency' &&
     claim.status !== 'pending') // Legacy support
  );

  // Helper function to load document for preview
  const loadDocument = async (index) => {
    try {
      setLoading(true);
      const doc = allDocuments[index];
      
      // Fetch document as blob using axios (includes auth headers)
      if (doc.preview_url) {
        const docResponse = await axios.get(doc.preview_url, {
          responseType: 'blob'
        });
        
        // Determine file type
        const contentType = docResponse.headers['content-type'] || '';
        const fileName = doc.name;
        const isPdf = contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
        const isImage = contentType.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(fileName);
        
        // Create blob URL for preview (iframe/img can use this)
        const blobUrl = window.URL.createObjectURL(new Blob([docResponse.data], { type: contentType }));
        setDocumentViewerUrl(blobUrl);
        setDocumentViewerType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
        setCurrentDocumentIndex(index);
      } else {
        throw new Error('Document preview URL not available');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document for preview');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render claim card
  const renderClaimCard = (claim, showViewButton = false) => (
    <div key={claim.id} className="mb-3 p-3 border rounded">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <strong>{claim.benefit_type?.toUpperCase()}</strong>
          <br />
          <small className="text-muted">{claim.claim_type}</small>
        </div>
        {getStatusBadge(claim.status)}
      </div>
      <div className="mb-2">
        <small className="text-muted">
          Filed: {claim.created_at ? format(new Date(claim.created_at), 'MMM dd, yyyy') : 'N/A'}
        </small>
      </div>
      {claim.description && (
        <div>
          <small>
            <strong>Description:</strong> {claim.description.substring(0, 100)}
            {claim.description.length > 100 ? '...' : ''}
          </small>
        </div>
      )}
      {claim.rejection_reason && (
        <Alert variant="danger" className="mt-2 mb-0 py-2">
          <small>
            <strong>Rejection Reason:</strong> {claim.rejection_reason}
          </small>
        </Alert>
      )}
      {showViewButton && (
        <div className="mt-3">
          <Button
            variant="info"
            size="sm"
            onClick={async () => {
              setSelectedClaim(claim);
              // Fetch full claim details
              try {
                const response = await axios.get(`/benefit-claims/${claim.id}`);
                setClaimDetails(response.data.data || response.data);
                setShowClaimDetailsModal(true);
              } catch (error) {
                console.error('Error fetching claim details:', error);
                // If fetch fails, use the claim data from the list
                setClaimDetails(claim);
                setShowClaimDetailsModal(true);
              }
            }}
          >
            <FaEye /> View
          </Button>
        </div>
      )}
    </div>
  );

  if (profileLoading || loading) {
    return (
      <Container className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">
            <FaFileAlt className="me-2" />
            File Benefit Claim Request
          </h2>
          <p className="text-muted">File a claim request based on your enrolled benefits</p>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        {/* Tab 1: Benefit Claim Request Form */}
        <Tab eventKey="form" title={
          <span>
            <FaFileAlt className="me-2" />
            Benefit Claim Request Form
          </span>
        }>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaFileAlt className="me-2" />
                Benefit Claim Request Form
              </h5>
            </Card.Header>
            <Card.Body>
              {/* Employee Information Section */}
              {employeeProfile && (
                <Card className="mb-4 border-primary">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0">
                      <FaUser className="me-2 text-primary" />
                      Employee Information
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p className="mb-2">
                          <strong>Name:</strong> {employeeProfile.first_name || ''} {employeeProfile.last_name || ''}
                        </p>
                        <p className="mb-2">
                          <strong>Employee ID:</strong> {employeeProfile.employee_id || 'N/A'}
                        </p>
                      </Col>
                      <Col md={6}>
                        <p className="mb-2">
                          <strong>Department:</strong> {employeeProfile.department || 'N/A'}
                        </p>
                        <p className="mb-2">
                          <strong>Position:</strong> {employeeProfile.position || 'N/A'}
                        </p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Enrolled Benefits Section */}
              <Card className="mb-4 border-success">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">
                    <FaInfoCircle className="me-2 text-success" />
                    Enrolled Benefits
                  </h6>
                </Card.Header>
                <Card.Body>
                  {enrolledBenefits.length === 0 ? (
                    <Alert variant="warning" className="mb-0">
                      <strong>Note:</strong> You don't have any enrolled benefits yet. Please contact HR to enroll in SSS, PhilHealth, or Pag-IBIG benefits. You can still file a claim request, but it may require additional verification.
                    </Alert>
                  ) : (
                    <ListGroup variant="flush">
                      {enrolledBenefits.map((benefit) => (
                        <ListGroup.Item key={benefit.key} className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{benefit.label}</strong>
                            <br />
                            <small className="text-muted">Number: {benefit.number || 'N/A'}</small>
                          </div>
                          <Badge bg="success">Enrolled</Badge>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold">
                        Select Benefit Type <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={claimForm.benefit_type}
                        onChange={(e) => {
                          setClaimForm({ 
                            ...claimForm, 
                            benefit_type: e.target.value,
                            claim_type: '' // Reset claim type when benefit type changes
                          });
                          setErrors({ ...errors, benefit_type: '', claim_type: '' });
                        }}
                        isInvalid={!!errors.benefit_type}
                        required
                        size="lg"
                      >
                        <option value="">-- Select Benefit Type --</option>
                        <option value="sss">SSS (Social Security System)</option>
                        <option value="philhealth">PhilHealth (Philippine Health Insurance Corporation)</option>
                        <option value="pagibig">Pag-IBIG (Home Development Mutual Fund)</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.benefit_type}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted">
                        Select the benefit program you want to file a claim for
                      </Form.Text>
                    </Form.Group>

                    {claimForm.benefit_type && (
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">
                          Select Claim Type <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          value={claimForm.claim_type}
                          onChange={(e) => {
                            setClaimForm({ ...claimForm, claim_type: e.target.value });
                            setErrors({ ...errors, claim_type: '' });
                          }}
                          isInvalid={!!errors.claim_type}
                          required
                          size="lg"
                        >
                          <option value="">-- Select Claim Type --</option>
                          {availableClaimTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.claim_type}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Select the specific type of claim you want to file for {claimForm.benefit_type.toUpperCase()}
                        </Form.Text>
                      </Form.Group>
                    )}

                    {/* Eligibility / Qualifying Conditions Section - For SSS, PhilHealth, and Pag-IBIG */}
                    {claimForm.benefit_type && claimForm.claim_type && getEligibilityConditions() && (
                      <Card className="mb-4 border-warning">
                        <Card.Header className="bg-warning bg-opacity-10">
                          <h6 className="mb-0">
                            <FaInfoCircle className="me-2 text-warning" />
                            {getEligibilityConditions().title}
                          </h6>
                        </Card.Header>
                        <Card.Body>
                          <ListGroup variant="flush">
                            {getEligibilityConditions().conditions.map((condition, index) => {
                              // Check if this is a sub-item (starts with "  • ")
                              const isSubItem = condition.trim().startsWith('•');
                              const isCategory = condition.endsWith(':') && !isSubItem;
                              
                              return (
                                <ListGroup.Item key={index} className={`px-0 py-2 ${isSubItem ? 'ps-4' : ''}`}>
                                  <div className="d-flex align-items-start">
                                    {!isSubItem && !isCategory && (
                                      <FaCheckCircle className="me-2 text-success mt-1" style={{ flexShrink: 0 }} />
                                    )}
                                    <span className={isCategory ? 'fw-bold' : ''}>{condition}</span>
                                  </div>
                                </ListGroup.Item>
                              );
                            })}
                          </ListGroup>
                          <Alert variant="info" className="mt-3 mb-0">
                            <small>
                              <strong>Note:</strong> Please ensure you meet all eligibility requirements before filing your claim. 
                              Claims that do not meet the eligibility criteria may be rejected.
                            </small>
                          </Alert>
                        </Card.Body>
                      </Card>
                    )}

                    {claimForm.claim_type && (
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">
                          Upload Benefit Application Form <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            setClaimForm({ ...claimForm, application_form: e.target.files[0] });
                            setErrors({ ...errors, application_form: '' });
                          }}
                          isInvalid={!!errors.application_form}
                          required
                          size="lg"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.application_form}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted d-block mt-2">
                          <FaInfoCircle className="me-1" />
                          Please upload the scanned or PDF file of your {getClaimTypeLabel()} Benefit Application Form (e.g., Sickness Benefit Application Form for SSS sickness claims)
                        </Form.Text>
                        {claimForm.application_form && (
                          <Alert variant="success" className="mt-2 mb-0">
                            <FaCheckCircle className="me-2" />
                            <strong>File selected:</strong> {claimForm.application_form.name}
                            <br />
                            <small>Size: {(claimForm.application_form.size / 1024 / 1024).toFixed(2)} MB</small>
                          </Alert>
                        )}
                      </Form.Group>
                    )}

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold">
                        Reason for Claim <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Please provide a detailed reason and description of your claim request. Include relevant dates, circumstances, and any important information that will help process your claim..."
                        value={claimForm.description}
                        onChange={(e) => {
                          setClaimForm({ ...claimForm, description: e.target.value });
                          setErrors({ ...errors, description: '' });
                        }}
                        isInvalid={!!errors.description}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.description}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted d-block mt-2">
                        <FaInfoCircle className="me-1" />
                        Minimum 10 characters. Please provide a detailed explanation of your claim, including relevant dates, circumstances, and any important information.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold">
                        Supporting Documents
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleSupportingDocumentAdd}
                        multiple
                        size="lg"
                      />
                      <Form.Text className="text-muted d-block mt-2">
                        <FaInfoCircle className="me-1" />
                        You can upload multiple supporting documents. Accepted formats: PDF, DOC, DOCX, JPG, PNG. Maximum file size per file: 5MB
                      </Form.Text>
                      
                      {claimForm.supporting_documents && claimForm.supporting_documents.length > 0 && (
                        <div className="mt-3">
                          <h6 className="mb-2">Uploaded Documents:</h6>
                          <ListGroup>
                            {claimForm.supporting_documents.map((file, index) => (
                              <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                <div>
                                  <FaFileAlt className="me-2 text-primary" />
                                  <span>{file.name}</span>
                                  <br />
                                  <small className="text-muted">
                                    Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </small>
                                </div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleSupportingDocumentRemove(index)}
                                >
                                  <FaTrash />
                                </Button>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </div>
                      )}

                      {/* Required Supporting Documents Description */}
                      {claimForm.benefit_type && claimForm.claim_type && (
                        <Alert variant="info" className="mt-3">
                          <h6 className="mb-2">
                            <FaInfoCircle className="me-2" />
                            Required Supporting Documents for {claimForm.benefit_type.toUpperCase()} - {getClaimTypeLabel()}:
                          </h6>
                          <ListGroup variant="flush" className="mb-0">
                            {getRequiredSupportingDocuments().map((doc, index) => {
                              // Check if this is a sub-item (starts with "  • ")
                              const isSubItem = doc.trim().startsWith('•');
                              const isCategory = doc.endsWith(':') && !isSubItem;
                              
                              return (
                                <ListGroup.Item 
                                  key={index} 
                                  className={`px-0 py-1 ${isSubItem ? 'ps-4' : ''} ${isCategory ? 'fw-bold' : ''}`}
                                >
                                  <small>
                                    {!isSubItem && !isCategory && (
                                      <FaCheckCircle className="me-2 text-success" />
                                    )}
                                    {isSubItem ? doc.trim() : doc}
                                  </small>
                                </ListGroup.Item>
                              );
                            })}
                          </ListGroup>
                          <small className="text-muted mt-2 d-block">
                            <strong>Note:</strong> Please ensure you have all required documents ready before submitting your claim. Missing documents may delay the processing of your claim.
                          </small>
                        </Alert>
                      )}
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting...' : 'Submit Claim Request'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        type="button"
                        onClick={() => {
                          setClaimForm({
                            benefit_type: '',
                            claim_type: '',
                            description: '',
                            application_form: null,
                            supporting_documents: []
                          });
                          setErrors({});
                        }}
                      >
                        Clear Form
                      </Button>
                    </div>
                  </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* Tab 2: Pending Claim Request */}
        <Tab eventKey="pending" title={
          <span>
            <FaClock className="me-2" />
            Pending Claim Request
            {pendingClaims.length > 0 && (
              <Badge bg="warning" className="ms-2">{pendingClaims.length}</Badge>
            )}
          </span>
        }>
          <Card>
            <Card.Header className="bg-warning bg-opacity-10">
              <h5 className="mb-0">
                <FaClock className="me-2 text-warning" />
                Pending Claim Requests
              </h5>
            </Card.Header>
            <Card.Body>
              {pendingClaims.length === 0 ? (
                <div className="text-center py-5">
                  <FaClock size={48} className="text-muted mb-3" />
                  <p className="text-muted">No pending claim requests</p>
                  <p className="text-muted small">All your claims have been processed or you haven't filed any claims yet.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {pendingClaims.map(renderClaimCard)}
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Tab 3: History */}
        <Tab eventKey="history" title={
          <span>
            <FaHistory className="me-2" />
            History
            {historyClaims.length > 0 && (
              <Badge bg="secondary" className="ms-2">{historyClaims.length}</Badge>
            )}
          </span>
        }>
          <Card>
            <Card.Header className="bg-info bg-opacity-10">
              <h5 className="mb-0">
                <FaHistory className="me-2 text-info" />
                Claim History
              </h5>
            </Card.Header>
            <Card.Body>
              {historyClaims.length === 0 ? (
                <div className="text-center py-5">
                  <FaHistory size={48} className="text-muted mb-3" />
                  <p className="text-muted">No claim history</p>
                  <p className="text-muted small">Your processed claims will appear here.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {historyClaims.map(claim => renderClaimCard(claim, true))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Claim Details Modal */}
      <Modal
        show={showClaimDetailsModal}
        onHide={() => {
          setShowClaimDetailsModal(false);
          setSelectedClaim(null);
          setClaimDetails(null);
          // Clean up document viewer URL
          if (documentViewerUrl) {
            window.URL.revokeObjectURL(documentViewerUrl);
            setDocumentViewerUrl(null);
            setDocumentViewerType(null);
          }
          setAllDocuments([]);
          setCurrentDocumentIndex(0);
        }}
        size="lg"
      >
        <Modal.Header closeButton className="border-bottom bg-light">
          <Modal.Title className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <FaFileAlt className="text-primary" />
            </div>
            <div>
              <h5 className="mb-0">Benefit Claim Details</h5>
              <small className="text-muted">Claim ID: {claimDetails?.id || selectedClaim?.id || 'N/A'}</small>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {claimDetails || selectedClaim ? (() => {
            const claim = claimDetails || selectedClaim;
            
            // Format claim ID helper
            const formatClaimId = (id) => {
              if (!id) return 'N/A';
              return `BC-${String(id).padStart(6, '0')}`;
            };
            
            return (
              <div>
                {/* Status Banner */}
                <div className={`mb-4 p-3 rounded ${
                  claim.status === 'completed' || claim.status === 'approved_by_hr' ? 'bg-success bg-opacity-10 border border-success' : 
                  claim.status === 'rejected' ? 'bg-danger bg-opacity-10 border border-danger' : 
                  claim.status === 'for_submission_to_agency' ? 'bg-primary bg-opacity-10 border border-primary' :
                  claim.status === 'under_review' ? 'bg-warning bg-opacity-10 border border-warning' :
                  'bg-info bg-opacity-10 border border-info'
                }`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="mb-1 d-flex align-items-center">
                        {getStatusBadge(claim.status)}
                        <span className="ms-2 fw-normal">{formatClaimId(claim.id)}</span>
                      </h5>
                      <p className="mb-0 text-muted small">
                        {claim.benefit_type?.toUpperCase() || 'N/A'} - {claim.claim_type || 'N/A'}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="mb-0 small text-muted">Date Filed</p>
                      <p className="mb-0 fw-semibold">
                        {claim.created_at 
                          ? format(new Date(claim.created_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <Row className="g-3">
                  {/* Claim Information Card */}
                  <Col md={12}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Header className="bg-info bg-opacity-10 border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaFileAlt className="me-2 text-info" />
                          Claim Information
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Benefit Type</p>
                          <div className="mb-3">
                            <Badge bg="info" className="px-3 py-2">{claim.benefit_type?.toUpperCase() || 'N/A'}</Badge>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-muted small mb-1">Claim Type</p>
                          <p className="mb-0 fw-semibold">{claim.claim_type || 'N/A'}</p>
                        </div>
                        {claim.reviewed_at && (
                          <div className="mb-3">
                            <p className="text-muted small mb-1">Reviewed At</p>
                            <p className="mb-0 fw-semibold">
                              {format(new Date(claim.reviewed_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Description Card */}
                  <Col md={12}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h6 className="mb-0 d-flex align-items-center">
                          <FaInfoCircle className="me-2 text-primary" />
                          Description / Reason for Claim
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {claim.description || 'No description provided'}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  {claim.rejection_reason && (
                    <Col md={12}>
                      <Alert variant="danger" className="mb-0">
                        <Alert.Heading className="h6 mb-2 d-flex align-items-center">
                          <FaTimesCircle className="me-2" />
                          Rejection Reason
                        </Alert.Heading>
                        <p className="mb-0">{claim.rejection_reason}</p>
                      </Alert>
                    </Col>
                  )}
                  
                  {(claim.supporting_documents_path || claim.supporting_documents_name || claim.application_form_path) && (
                    <Col md={12}>
                      <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-light border-0">
                          <h6 className="mb-0 d-flex align-items-center">
                            <FaFileAlt className="me-2 text-primary" />
                            Documents
                          </h6>
                        </Card.Header>
                        <Card.Body>
                          <Alert variant="info" className="mb-3">
                            <small>
                              <strong>Document Types:</strong> Application Form • Supporting Documents
                            </small>
                          </Alert>
                          <div className="d-flex gap-2 mb-3">
                            <Button
                              variant="primary"
                              size="sm"
                              className="px-4"
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  // Fetch all documents
                                  const documentsResponse = await axios.get(`/benefit-claims/${claim.id}/documents`);
                                  
                                  if (documentsResponse.data.success && documentsResponse.data.data.length > 0) {
                                    setAllDocuments(documentsResponse.data.data);
                                    setCurrentDocumentIndex(0);
                                    
                                    // Load the first document for preview
                                    const firstDoc = documentsResponse.data.data[0];
                                    if (firstDoc.preview_url) {
                                      // Fetch document as blob using axios (includes auth headers)
                                      try {
                                        const docResponse = await axios.get(firstDoc.preview_url, {
                                          responseType: 'blob'
                                        });
                                        
                                        // Determine file type
                                        const contentType = docResponse.headers['content-type'] || '';
                                        const fileName = firstDoc.name;
                                        const isPdf = contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
                                        const isImage = contentType.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(fileName);
                                        
                                        // Create blob URL for preview (iframe/img can use this)
                                        const blobUrl = window.URL.createObjectURL(new Blob([docResponse.data], { type: contentType }));
                                        setDocumentViewerUrl(blobUrl);
                                        setDocumentViewerType(isPdf ? 'pdf' : isImage ? 'image' : 'other');
                                        
                                        toast.success(`${documentsResponse.data.data.length} document(s) loaded successfully`);
                                      } catch (docError) {
                                        console.error('Error loading document for preview:', docError);
                                        toast.error('Failed to load document for preview');
                                      }
                                    } else {
                                      toast.error('Document preview URL not available');
                                    }
                                  } else {
                                    toast.error('No documents available');
                                  }
                                } catch (error) {
                                  console.error('Error loading documents:', error);
                                  toast.error('Failed to load documents');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                            >
                              <FaEye className="me-2" />
                              View Documents
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="px-4"
                              onClick={async () => {
                                try {
                                  const response = await axios.get(`/benefit-claims/${claim.id}/document`, {
                                    responseType: 'blob'
                                  });
                                  
                                  // Create download link
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', claim.supporting_documents_name || `benefit-claim-${claim.id}-documents.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  window.URL.revokeObjectURL(url);
                                  
                                  toast.success('Document downloaded successfully');
                                } catch (error) {
                                  console.error('Error downloading document:', error);
                                  toast.error('Failed to download document');
                                }
                              }}
                            >
                              <FaDownload className="me-2" />
                              Download Documents
                            </Button>
                          </div>
                          
                          {/* Document Viewer */}
                          {documentViewerUrl && allDocuments.length > 0 && (
                            <Card className="mt-3">
                              <Card.Header className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                  <span>
                                    <FaFileAlt className="me-2" />
                                    Document Preview
                                  </span>
                                  {allDocuments.length > 1 && (
                                    <div className="d-flex align-items-center gap-2">
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={async () => {
                                          if (currentDocumentIndex > 0) {
                                            const newIndex = currentDocumentIndex - 1;
                                            await loadDocument(newIndex);
                                          }
                                        }}
                                        disabled={currentDocumentIndex === 0 || loading}
                                      >
                                        Previous
                                      </Button>
                                      <span className="text-muted">
                                        {currentDocumentIndex + 1} of {allDocuments.length}
                                      </span>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={async () => {
                                          if (currentDocumentIndex < allDocuments.length - 1) {
                                            const newIndex = currentDocumentIndex + 1;
                                            await loadDocument(newIndex);
                                          }
                                        }}
                                        disabled={currentDocumentIndex === allDocuments.length - 1 || loading}
                                      >
                                        Next
                                      </Button>
                                    </div>
                                  )}
                                  <Badge bg="info">
                                    {allDocuments[currentDocumentIndex]?.label || allDocuments[currentDocumentIndex]?.name || 'Document'}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => {
                                    window.URL.revokeObjectURL(documentViewerUrl);
                                    setDocumentViewerUrl(null);
                                    setDocumentViewerType(null);
                                    setAllDocuments([]);
                                    setCurrentDocumentIndex(0);
                                  }}
                                >
                                  Close
                                </Button>
                              </Card.Header>
                              <Card.Body style={{ padding: 0, maxHeight: '500px', overflow: 'auto' }}>
                                {documentViewerType === 'pdf' && (
                                  <iframe
                                    src={`${documentViewerUrl}#toolbar=1`}
                                    title="PDF Document"
                                    style={{
                                      width: '100%',
                                      height: '500px',
                                      border: 'none',
                                      borderRadius: '0 0 0.375rem 0.375rem'
                                    }}
                                    onError={() => {
                                      console.error('Failed to load PDF in iframe');
                                      toast.error('Failed to load PDF document');
                                    }}
                                  />
                                )}
                                {documentViewerType === 'image' && (
                                  <div className="text-center p-3">
                                    <img
                                      src={documentViewerUrl}
                                      alt="Document"
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '500px',
                                        height: 'auto',
                                        borderRadius: '8px',
                                        display: 'block',
                                        margin: '0 auto',
                                        objectFit: 'contain'
                                      }}
                                      onError={(e) => {
                                        console.error('Failed to load image');
                                        toast.error('Failed to load image document');
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                {documentViewerType === 'other' && (
                                  <div className="text-center p-5">
                                    <FaFileAlt size={48} className="text-muted mb-3" />
                                    <p className="text-muted">Preview not available for this file type</p>
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = documentViewerUrl;
                                        link.download = claim.supporting_documents_name || `benefit-claim-${claim.id}-documents`;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      <FaDownload className="me-2" />
                                      Download Document
                                    </Button>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  )}
                </Row>
              </div>
            );
          })() : (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowClaimDetailsModal(false);
            setSelectedClaim(null);
            setClaimDetails(null);
            if (documentViewerUrl) {
              window.URL.revokeObjectURL(documentViewerUrl);
              setDocumentViewerUrl(null);
              setDocumentViewerType(null);
            }
            setAllDocuments([]);
            setCurrentDocumentIndex(0);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FileBenefitClaim;

