import React from 'react';
import { Modal, Button, Row, Col, Card, Badge } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaImage } from 'react-icons/fa';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const formatTime = (time) => {
  if (!time) return '—';
  try {
    let t = String(time).trim();
    const match = t.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return t;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const hours12 = ((hours + 11) % 12) + 1;
    return `${hours12}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return String(time);
  }
};

const getStatusBadge = (status) => {
  const variants = { pending: 'warning', approved: 'success', rejected: 'danger' };
  const labels = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED' };
  return <Badge bg={variants[status] || 'secondary'}>{labels[status] || (status || '').toUpperCase()}</Badge>;
};

const EditAttendanceDetailsModal = ({ show, onHide, request }) => {
  if (!request) return null;
  let images = request.images || request.proof_images || request.proofImages || request.attachments || [];
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) images = parsed;
    } catch {}
  }
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
            <FaClock className="text-primary" />
          </div>
          <div>
            <div className="fw-semibold">Attendance Edit Request</div>
            <small className="text-muted">Submitted details</small>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#f8f9fa' }}>
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <div className="small text-muted">Date</div>
                <div className="fw-semibold"><FaCalendarAlt className="me-2 text-muted" />{formatDate(request.date)}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted">Current</div>
                <div className="fw-semibold"><FaClock className="me-2 text-muted" />{formatTime(request.current_time_in)} - {formatTime(request.current_time_out)}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted">Requested</div>
                <div className="fw-semibold"><FaClock className="me-2 text-muted" />{formatTime(request.requested_time_in)} - {formatTime(request.requested_time_out)}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <div className="small text-muted mb-2">Reason</div>
            <div className="border rounded p-2 bg-light" style={{ whiteSpace: 'pre-wrap' }}>{request.reason || '—'}</div>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm mb-3">
          <Card.Body>
            <div className="d-flex align-items-center mb-2"><FaImage className="me-2 text-muted" /><div className="small text-muted">Proof Images</div></div>
            {images.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {images.map((imagePath, idx) => (
                  <img key={idx} src={`http://localhost:8000/media/${String(imagePath).replace(/^public\//,'').replace(/^storage\//,'')}`} alt={`Proof ${idx + 1}`} style={{ width: 180, height: 130, objectFit: 'cover', border: '1px solid #adb5bd', borderRadius: 4 }} />
                ))}
              </div>
            ) : (
              <div className="text-muted">No images</div>
            )}
          </Card.Body>
        </Card>

        <Row className="g-3">
          <Col md={4}>
            <div className="small text-muted">Status</div>
            <div>{getStatusBadge(request.status)}</div>
          </Col>
          <Col md={4}>
            <div className="small text-muted">Submitted On</div>
            <div>{formatDate(request.created_at)}</div>
          </Col>
          <Col md={4}>
            <div className="small text-muted">Reviewed On</div>
            <div>{request.reviewed_at ? formatDate(request.reviewed_at) : '—'}</div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="primary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditAttendanceDetailsModal;


