import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { ArrowLeft, Download } from 'lucide-react';
import { fetchCashAdvance, downloadCashAdvancePdf } from '../../api/cashAdvance';
import CashAdvanceApprovalInfo from '../common/CashAdvanceApprovalInfo';

const CashAdvanceView = ({ cashAdvanceId, onBack }) => {
  const [cashAdvance, setCashAdvance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (cashAdvanceId) {
      fetchCashAdvanceRequest();
    }
  }, [cashAdvanceId]);

  const fetchCashAdvanceRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching cash advance request:', cashAdvanceId);
      const response = await fetchCashAdvance(cashAdvanceId);
      console.log('Cash advance response:', response.data);
      setCashAdvance(response.data.data || response.data);
    } catch (err) {
      console.error('Error fetching cash advance request:', err);
      setError('Failed to load cash advance request details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await downloadCashAdvancePdf(cashAdvanceId);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP' 
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      approved: 'bg-success',
      rejected: 'bg-danger',
      pending: 'bg-warning text-dark'
    };
    
    return (
      <span className={`badge ${statusStyles[status] || 'bg-secondary'}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!cashAdvance) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Cash advance request not found</Alert>
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-primary" onClick={onBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Dashboard
        </Button>
        <Button 
          variant="success" 
          onClick={handleDownloadPdf} 
          disabled={downloading}
        >
          <Download size={16} className="me-2" />
          {downloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Cash Advance Request Form</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5 className="text-primary mb-3">Employee Information</h5>
              <div className="mb-2">
                <strong>Name:</strong> {cashAdvance.name || 'N/A'}
              </div>
              <div className="mb-2">
                <strong>Company:</strong> {cashAdvance.company || 'N/A'}
              </div>
              <div className="mb-2">
                <strong>Department:</strong> {cashAdvance.department || 'N/A'}
              </div>
            </Col>
            <Col md={6}>
              <h5 className="text-primary mb-3">Request Details</h5>
              <div className="mb-2">
                <strong>Date Filed:</strong> {formatDate(cashAdvance.created_at)}
              </div>
              <div className="mb-2">
                <strong>Request Date:</strong> {formatDate(cashAdvance.date_field)}
              </div>
              <div className="mb-2">
                <strong>Status:</strong> {getStatusBadge(cashAdvance.status)}
              </div>
              <div className="mb-2">
                <strong>Request ID:</strong> #{cashAdvance.id}
              </div>
            </Col>
          </Row>

          <hr />

          <Row>
            <Col md={6}>
              <h5 className="text-primary mb-3">Cash Advance Details</h5>
              <div className="mb-2">
                <strong>Amount Requested:</strong> 
                <span className="ms-2 text-primary fw-bold fs-5">
                  {formatCurrency(cashAdvance.amount_ca)}
                </span>
              </div>
              {cashAdvance.rem_ca && (
                <div className="mb-2">
                  <strong>Remittance/Deduction:</strong> {cashAdvance.rem_ca}
                </div>
              )}
            </Col>
            <Col md={6}>
              <h5 className="text-primary mb-3">Reason for Cash Advance</h5>
              <div className="border p-3 rounded bg-light">
                {cashAdvance.reason || 'No reason provided'}
              </div>
            </Col>
          </Row>

          <hr />

          {/* Agreement Section */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">Agreement & Authority to Deduct</h5>
            <div className="p-3 bg-light rounded border">
              <p className="small mb-0">
                <strong>KASUNDUAN AT AWTORIDAD NA MAGBAWAS:</strong> Ako si <strong>{cashAdvance.name}</strong> empleyado ng <strong>{cashAdvance.company}</strong>, ay sumasang-ayon na ako ay kakitaan sa araw ng sahod Linggo-linggo bilang kabayaran sa Cash Advance o perang inutang sa kumpanya hanggang sa ito ay matapos at mabayaran. Kasabot nito, kung ako ay matanggal (terminated) o umalis ng kusa (resigned) sa trabaho, maaaring ibawas ng kumpanya ang natitirang utang sa huling bayad at final pay at nakang makuluna.
              </p>
            </div>
          </div>

          {/* Approval/Processing Information */}
          <CashAdvanceApprovalInfo cashAdvance={cashAdvance} />
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CashAdvanceView;