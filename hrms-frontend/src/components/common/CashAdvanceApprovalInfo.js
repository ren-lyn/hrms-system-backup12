import React from 'react';

const CashAdvanceApprovalInfo = ({ cashAdvance, showTitle = true }) => {
  if (!cashAdvance || !['approved', 'rejected'].includes(cashAdvance.status)) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP' 
    }).format(amount);
  };

  return (
    <div className="approval-info bg-light p-3 rounded border">
      {showTitle && <h5 className="text-primary mb-3">Processing Information</h5>}
      
      {/* Always show who requested */}
      <div className="mb-2">
        <strong>Requested by:</strong> {cashAdvance.name || 'Employee'}
      </div>
      
      {/* Show approval information */}
      {cashAdvance.status === 'approved' && (
        <>
          <div className="mb-2">
            <strong>Approved by:</strong> {cashAdvance.processedBy?.name || cashAdvance.processed_by_name || 'HR Assistant'}
          </div>
          <div className="mb-2">
            <strong>Approval Date:</strong> {formatDate(cashAdvance.processed_at)}
          </div>
          {cashAdvance.collection_date && (
            <div className="mb-2">
              <strong>Collection Date:</strong> 
              <span className="ms-2 badge bg-info">
                {new Date(cashAdvance.collection_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
          <div className="mb-2">
            <strong>Amount Approved:</strong> 
            <span className="ms-2 text-success fw-bold fs-5">
              {formatCurrency(cashAdvance.amount_ca)}
            </span>
          </div>
        </>
      )}
      
      {/* Show rejection information */}
      {cashAdvance.status === 'rejected' && (
        <>
          <div className="mb-2">
            <strong>Rejected by:</strong> {cashAdvance.processedBy?.name || cashAdvance.processed_by_name || 'HR Assistant'}
          </div>
          <div className="mb-2">
            <strong>Rejection Date:</strong> {formatDate(cashAdvance.processed_at)}
          </div>
        </>
      )}
      
      {/* Show HR remarks if available */}
      {cashAdvance.hr_remarks && (
        <div className="mb-2">
          <strong>HR Remarks:</strong>
          <div className="mt-1 p-2 bg-white rounded border">
            {cashAdvance.hr_remarks}
          </div>
        </div>
      )}

      {/* Collection Instructions for approved requests */}
      {cashAdvance.status === 'approved' && (
        <div className="mt-3 p-3 bg-success-subtle border border-success rounded">
          <h6 className="text-success mb-2">📋 Collection Instructions</h6>
          <ul className="small mb-0">
            <li>Please bring a valid government-issued ID when collecting your cash advance</li>
            <li>Collection is available during office hours (8:00 AM - 5:00 PM)</li>
            <li>Visit the HR Office to complete the collection process</li>
            {cashAdvance.collection_date && (
              <li>
                <strong>Collect on or after: {new Date(cashAdvance.collection_date).toLocaleDateString()}</strong>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CashAdvanceApprovalInfo;