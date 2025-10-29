import React, { useRef, useState } from 'react';
import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import { FaClock, FaCalendarAlt, FaUser, FaImage, FaDownload, FaCheckSquare, FaRegSquare } from 'react-icons/fa';

const getImageUrl = (path) => {
  if (!path) return '';
  let raw = String(path).trim();
  // Replace Windows backslashes and trim leading slashes
  raw = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  // Strip common storage prefixes
  raw = raw.replace(/^public\//, '').replace(/^storage\//, '');
  if (/^https?:\/\//i.test(raw)) return raw;
  // Encode each segment to be safe for URLs
  const encoded = raw.split('/').map(encodeURIComponent).join('/');
  // If path already includes storage/, avoid duplicating it
  // Prefer the CORS-enabled media proxy route
  return `http://localhost:8000/media/${encoded}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
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

const StatusBadge = ({ status }) => {
  const variants = {
    pending: 'warning',
    manager_approved: 'info',
    hr_approved: 'success',
    approved: 'success',
    rejected: 'danger'
  };
  const labels = {
    pending: 'PENDING',
    manager_approved: 'MANAGER APPROVED',
    hr_approved: 'HR APPROVED',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  };
  return <Badge bg={variants[status] || 'secondary'}>{labels[status] || (status || '').toUpperCase()}</Badge>;
};

const OTDetailsModal = ({ show, onHide, request }) => {
  const printRef = useRef(null);
  const proofRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const safe = (val) => (val === undefined || val === null || val === '' ? '—' : val);

  const approvedBy = request && (
    (request.manager_reviewer?.first_name && `${request.manager_reviewer.first_name} ${request.manager_reviewer.last_name}`) ||
    (request.managerReviewer?.first_name && `${request.managerReviewer.first_name} ${request.managerReviewer.last_name}`) ||
    ''
  );

  const notedBy = request && (
    (request.hr_reviewer?.first_name && `${request.hr_reviewer.first_name} ${request.hr_reviewer.last_name}`) ||
    (request.hrReviewer?.first_name && `${request.hrReviewer.first_name} ${request.hrReviewer.last_name}`) ||
    ''
  );

  const waitForImages = async (root) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      images.map((img) =>
        new Promise((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
      )
    );
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      // Strict generation with jsPDF + html2canvas so only the form is exported
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = printRef.current;
      await waitForImages(element);

      // Hide elements that should not appear in the PDF (e.g., proof images)
      const toHide = Array.from(element.querySelectorAll('[data-hide-for-pdf="true"]'));
      toHide.forEach((el) => {
        el.dataset.prevDisplay = el.style.display || '';
        el.style.display = 'none';
      });
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true,
        imageTimeout: 15000,
        backgroundColor: '#ffffff',
        logging: false
      });
      // Restore hidden elements
      toHide.forEach((el) => {
        el.style.display = el.dataset.prevDisplay;
        delete el.dataset.prevDisplay;
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const filename = `OT_Request_${request?.employee?.employee_id || request?.id}_${request?.ot_date || request?.date}.pdf`;
      pdf.save(filename);
    } catch (e) {
      alert('PDF generator not available. Please install dependencies: npm i jspdf html2canvas');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <FaClipboardListIcon />
          <span className="ms-2">Overtime Request Details</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {request && (
          <div ref={printRef} style={{ background: '#ffffff', padding: 16, border: '1px solid #dee2e6' }}>
            {/* Top heading */}
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.3 }}>OVERTIME REQUEST FORM</div>
            </div>

            {/* Section: Employee & Meta */}
            <div style={{ border: '1px solid #ced4da', padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Employee Name</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4, fontWeight: 600 }}>
                    {safe(`${request.employee?.first_name || ''} ${request.employee?.last_name || ''}`)}
                  </div>
                </div>
                <div style={{ width: 180 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Employee ID</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>{safe(request.employee?.employee_id)}</div>
                </div>
                <div style={{ width: 160, textAlign: 'right' }}></div>
              </div>
            </div>

            {/* Section: Date & Time */}
            <div style={{ border: '1px solid #ced4da', padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>OT Date</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>{formatDate(request.ot_date || request.date)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Time</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>
                    {request.attendance?.clock_in || request.start_time
                      ? `${formatTime(request.attendance?.clock_in || request.start_time)} - ${formatTime(request.attendance?.clock_out || request.end_time)}`
                      : '\u00A0'}
                  </div>
                </div>
                <div style={{ width: 140 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>OT Hours</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>{safe(request.ot_hours)}</div>
                </div>
              </div>
            </div>

            {/* Section: Reason */}
            <div style={{ border: '1px solid #ced4da', padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6 }}>Reason</div>
              <div style={{ minHeight: 60, whiteSpace: 'pre-wrap' }}>{safe(request.reason)}</div>
            </div>

            {/* Section: Proof Images */}
            <div style={{ border: '1px solid #ced4da', padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6 }}>Proof Images</div>
              {request.proof_images && request.proof_images.length > 0 ? (
                <div className="d-flex flex-wrap gap-2" data-hide-for-pdf="true" ref={proofRef}>
                  {request.proof_images.map((imagePath, idx) => {
                    const primary = getImageUrl(imagePath);
                    const rawAlt = /^https?:\/\//i.test(String(imagePath))
                      ? String(imagePath)
                      : `http://localhost:8000/${String(imagePath).replace(/\\/g, '/').replace(/^\/+/, '')}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: 180,
                          height: 130,
                          border: '1px solid #adb5bd',
                          backgroundImage: `url(${primary})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative'
                        }}
                        title={`Proof ${idx + 1}`}
                      >
                        <img
                          src={primary}
                          alt=""
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          loading="eager"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.dataset.fallback1) {
                              parent.dataset.fallback1 = '1';
                              parent.style.backgroundImage = `url(${rawAlt})`;
                              e.currentTarget.remove();
                              return;
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted">No images</div>
              )}
            </div>

            {/* Section: Submitted/Reviewed */}
            <div style={{ border: '1px solid #ced4da', padding: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Submitted On</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>{formatDateTime(request.created_at)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Reviewed On</div>
                  <div style={{ borderBottom: '1px solid #adb5bd', paddingBottom: 4 }}>{formatDateTime(request.hr_reviewed_at || request.manager_reviewed_at || request.reviewed_at)}</div>
                </div>
              </div>
            </div>

            {/* Signature/Approval Section */}
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 54, borderBottom: '1px solid #adb5bd' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Approved by (Manager)</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Signature, Date & Time</div>
                </div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{approvedBy || '\u2014'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 54, borderBottom: '1px solid #adb5bd' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Noted by (HR Assistant)</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Signature, Date & Time</div>
                </div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{notedBy || '\u2014'}</div>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={handleDownloadPdf} disabled={downloading}>
          {downloading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Preparing PDF...
            </>
          ) : (
            <>
              <FaDownload className="me-2" /> Download PDF
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const FaClipboardListIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 16 16" className="bi bi-clipboard-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
    <path d="M10.5 2a.5.5 0 0 1 .5.5V3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1v-.5a.5.5 0 0 1 .5-.5h5zM5 3v-.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 11 2.5V3h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1z"/>
  </svg>
);

export default OTDetailsModal;


