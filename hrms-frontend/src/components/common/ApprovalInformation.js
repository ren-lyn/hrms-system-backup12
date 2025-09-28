import React from 'react';

const ApprovalInformation = ({ leaveRequest, showTitle = true }) => {
  if (!leaveRequest || !['approved', 'rejected', 'manager_approved', 'manager_rejected'].includes(leaveRequest.status)) {
    return null;
  }

  // Debug: Log the leaveRequest data to see what properties are available
  console.log('ApprovalInformation leaveRequest data:', leaveRequest);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="approval-info bg-light p-3 rounded border">
      {showTitle && <h5 className="text-primary mb-3">Approval Information</h5>}
      
      {/* Always show who requested */}
      <div className="mb-2">
        <strong>Requested by:</strong> {leaveRequest.employee?.name || leaveRequest.employee_name || 'Employee'}
      </div>
      
          {/* Show final approval/rejection based on status */}
        {leaveRequest.status === 'approved' && (
          <>
            {/* Show HR Assistant noted when available */}
            {leaveRequest.approved_by && (
              <div className="mb-2">
                <strong>Noted by:</strong> {leaveRequest.approved_by?.name || 'HR Assistant'}
              </div>
            )}
            <div className="mb-2">
              <strong>Approved by:</strong> {leaveRequest.manager_approved_by?.name || 'Manager'}
            </div>
            <div className="mb-2">
              <strong>Approval Date:</strong> {formatDate(leaveRequest.manager_approved_at || leaveRequest.approved_at)}
            </div>
          </>
        )}
      
        {leaveRequest.status === 'rejected' && (
          <>
            {/* Show HR Assistant noted when available */}
            {leaveRequest.approved_by && (
              <div className="mb-2">
                <strong>Noted by:</strong> {leaveRequest.approved_by?.name || 'HR Assistant'}
              </div>
            )}
            <div className="mb-2">
              <strong>Rejected by:</strong> {leaveRequest.manager_approved_by?.name || 'Manager'}
            </div>
            <div className="mb-2">
              <strong>Rejection Date:</strong> {formatDate(leaveRequest.manager_rejected_at || leaveRequest.rejected_at)}
            </div>
          </>
        )}
      
        {leaveRequest.status === 'manager_approved' && (
          <>
            <div className="mb-2">
              <strong>Approved by:</strong> {leaveRequest.manager_approved_by?.name || 'Manager'}
            </div>
            <div className="mb-2">
              <strong>Approval Date:</strong> {formatDate(leaveRequest.manager_approved_at)}
            </div>
          </>
        )}
      
        {leaveRequest.status === 'manager_rejected' && (
          <>
            <div className="mb-2">
              <strong>Rejected by:</strong> {leaveRequest.manager_approved_by?.name || 'Manager'}
            </div>
            <div className="mb-2">
              <strong>Rejection Date:</strong> {formatDate(leaveRequest.manager_rejected_at)}
            </div>
          </>
        )}
      
      {/* Show remarks if available */}
      {leaveRequest.status === 'manager_rejected' && leaveRequest.manager_remarks && (
        <div className="mb-2">
          <strong>Remarks:</strong>
          <div className="mt-1 p-2 bg-white rounded border">
            <small className="text-muted">Manager:</small> {leaveRequest.manager_remarks}
          </div>
        </div>
      )}
      
      {(leaveRequest.status === 'approved' || leaveRequest.status === 'rejected') && leaveRequest.admin_remarks && (
        <div className="mb-2">
          <strong>Remarks:</strong>
          <div className="mt-1 p-2 bg-white rounded border">
            {leaveRequest.admin_remarks}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalInformation;