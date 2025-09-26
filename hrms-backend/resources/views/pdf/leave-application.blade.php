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
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #28a745;
            margin-top: 20px;
        }
        .approval-info h3 {
            margin: 0 0 10px 0;
            color: #28a745;
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
        <div class="field"><strong>Total Hours:</strong> {{ $leaveRequest->total_hours * 8 }}</div>
    </div>

    <div class="section">
        <h2>Reason for Leave</h2>
        <div class="field">{{ $leaveRequest->reason }}</div>
    </div>

    @if($leaveRequest->status === 'approved' || $leaveRequest->status === 'rejected')
    <div class="approval-info">
        <h3>Approval Information</h3>
        @if($leaveRequest->status === 'approved')
            <div class="field"><strong>Approved by:</strong> {{ $leaveRequest->approvedBy->name ?? 'HR Assistant' }}</div>
            <div class="field"><strong>Approved at:</strong> {{ \Carbon\Carbon::parse($leaveRequest->approved_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        @elseif($leaveRequest->status === 'rejected')
            <div class="field"><strong>Rejected by:</strong> {{ $leaveRequest->approvedBy->name ?? 'HR Assistant' }}</div>
            <div class="field"><strong>Rejected at:</strong> {{ \Carbon\Carbon::parse($leaveRequest->rejected_at)->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        @endif
        @if($leaveRequest->admin_remarks)
            <div class="field"><strong>Remarks:</strong> {{ $leaveRequest->admin_remarks }}</div>
        @endif
    </div>
    @endif
</body>
</html>
