<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Leave Application Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 10px 0;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        .field {
            margin-bottom: 8px;
        }
        .field strong {
            font-weight: bold;
        }
        .approval-info {
            background-color: #d4edda;
            padding: 15px;
            border: 1px solid #c3e6cb;
            border-left: 4px solid #28a745;
            margin-top: 20px;
            border-radius: 4px;
        }
        .approval-info h3 {
            margin: 0 0 15px 0;
            color: #28a745;
            font-size: 18px;
            font-weight: bold;
        }
        .status-approved {
            color: #28a745;
            font-weight: bold;
        }
        .status-rejected {
            color: #dc3545;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Leave Application Form</h1>
    </div>

    <div class="section">
        <h2>Employee Information</h2>
        <div class="field"><strong>Name:</strong> {{ $leaveRequest->employee_name }}</div>
        <div class="field"><strong>Department:</strong> {{ $leaveRequest->department }}</div>
    </div>

    <div class="section">
        <h2>Application Details</h2>
        <div class="field"><strong>Date Filed:</strong> {{ \Carbon\Carbon::parse($leaveRequest->date_filed)->format('F j, Y') }}</div>
        <div class="field"><strong>Status:</strong> 
            <span class="status-{{ $leaveRequest->status === 'approved' ? 'approved' : ($leaveRequest->status === 'rejected' ? 'rejected' : '') }}">
                {{ ucfirst($leaveRequest->status) }}
            </span>
        </div>
        <div class="field"><strong>Application ID:</strong> #{{ $leaveRequest->id }}</div>
    </div>

    <div class="section">
        <h2>Leave Details</h2>
        <div class="field"><strong>Leave Type:</strong> {{ $leaveRequest->type }}</div>
        <div class="field"><strong>Pay Terms:</strong> {{ $leaveRequest->terms ?? 'TBD by HR' }}</div>
        <div class="field"><strong>Duration:</strong></div>
        <div class="field" style="margin-left: 20px;">
            <strong>From:</strong> {{ \Carbon\Carbon::parse($leaveRequest->from)->format('l, F j, Y') }}
        </div>
        <div class="field" style="margin-left: 20px;">
            <strong>To:</strong> {{ \Carbon\Carbon::parse($leaveRequest->to)->format('l, F j, Y') }}
        </div>
        <div class="field"><strong>Total Days:</strong> {{ $leaveRequest->total_days }}</div>
        <div class="field"><strong>Total Hours:</strong> {{ number_format($leaveRequest->total_hours, 0) }}</div>
    </div>

    <div class="section">
        <h2>Reason for Leave</h2>
        <div class="field">{{ $leaveRequest->reason }}</div>
    </div>

    @if(in_array($leaveRequest->status, ['approved', 'rejected', 'manager_approved', 'manager_rejected']))
    <div class="approval-info">
        <h3>Approval Information</h3>
        
        {{-- Always show who requested --}}
        <div class="field"><strong>Requested by:</strong> {{ $leaveRequest->employee->name ?? $leaveRequest->employee_name ?? 'Employee' }}</div>
        
        {{-- Handle different approval/rejection scenarios --}}
        @if($leaveRequest->status === 'approved')
            {{-- Final approval by Manager, HR noted --}}
            @if($leaveRequest->approved_by)
                {{-- Show HR assistant noted when HR processed after manager --}}
                <div class="field"><strong>Noted by:</strong> {{ $leaveRequest->approvedBy->name ?? 'HR Assistant' }}</div>
            @endif
            <div class="field"><strong>Approved by:</strong> {{ $leaveRequest->managerApprovedBy->name ?? 'Manager' }}</div>
            <div class="field"><strong>Approval Date:</strong> {{ \Carbon\Carbon::parse($leaveRequest->manager_approved_at ?? $leaveRequest->approved_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
            
        @elseif($leaveRequest->status === 'rejected')
            {{-- Final rejection by Manager, HR noted --}}
            @if($leaveRequest->approved_by)
                {{-- Show HR assistant noted when HR processed the rejection --}}
                <div class="field"><strong>Noted by:</strong> {{ $leaveRequest->approvedBy->name ?? 'HR Assistant' }}</div>
            @endif
            <div class="field"><strong>Rejected by:</strong> {{ $leaveRequest->managerApprovedBy->name ?? 'Manager' }}</div>
            <div class="field"><strong>Rejection Date:</strong> {{ \Carbon\Carbon::parse($leaveRequest->manager_rejected_at ?? $leaveRequest->rejected_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
            
        @elseif($leaveRequest->status === 'manager_approved')
            {{-- Manager approved, waiting for HR --}}
            <div class="field"><strong>Approved by:</strong> {{ $leaveRequest->managerApprovedBy->name ?? 'Manager' }}</div>
            <div class="field"><strong>Approval Date:</strong> {{ \Carbon\Carbon::parse($leaveRequest->manager_approved_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
            
        @elseif($leaveRequest->status === 'manager_rejected')
            {{-- Direct rejection by Manager --}}
            <div class="field"><strong>Rejected by:</strong> {{ $leaveRequest->managerApprovedBy->name ?? 'Manager' }}</div>
            <div class="field"><strong>Rejection Date:</strong> {{ \Carbon\Carbon::parse($leaveRequest->manager_rejected_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        @endif
        
        {{-- Show remarks if available --}}
        @if($leaveRequest->status === 'manager_rejected')
            {{-- For manager rejections, show 'Manager Remarks' as specified in the user requirement --}}
            <div class="field"><strong>Manager Remarks:</strong> {{ $leaveRequest->manager_remarks ?: 'noo' }}</div>
        @else
            {{-- For other cases, show HR remarks if available --}}
            @if($leaveRequest->admin_remarks)
                <div class="field"><strong>Remarks:</strong> {{ $leaveRequest->admin_remarks }}</div>
            @endif
        @endif
    </div>
    @endif
</body>
</html>
