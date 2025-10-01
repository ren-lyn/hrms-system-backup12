<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cash Advance Request Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #000;
            line-height: 1.4;
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
        .company-info {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
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
        .rejection-info {
            background-color: #f8d7da;
            padding: 15px;
            border: 1px solid #f5c6cb;
            border-left: 4px solid #dc3545;
            margin-top: 20px;
            border-radius: 4px;
        }
        .pending-info {
            background-color: #fff3cd;
            padding: 15px;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #ffc107;
            margin-top: 20px;
            border-radius: 4px;
        }
        .approval-info h3, .rejection-info h3, .pending-info h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .approval-info h3 {
            color: #28a745;
        }
        .rejection-info h3 {
            color: #dc3545;
        }
        .pending-info h3 {
            color: #856404;
        }
        .status-approved {
            color: #28a745;
            font-weight: bold;
            font-size: 16px;
        }
        .status-rejected {
            color: #dc3545;
            font-weight: bold;
            font-size: 16px;
        }
        .status-pending {
            color: #856404;
            font-weight: bold;
            font-size: 16px;
        }
        .amount-highlight {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
        .collection-date {
            background-color: #e7f3ff;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #007bff;
            margin: 10px 0;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .signatures {
            margin-top: 40px;
        }
        .signature-line {
            margin-top: 30px;
            border-bottom: 1px solid #000;
            width: 200px;
            display: inline-block;
            margin-right: 100px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <strong>{{ $request->company }}</strong><br>
            Cash Advance Request Form
        </div>
        <h1>CASH ADVANCE REQUEST</h1>
    </div>

    <div class="section">
        <h2>Employee Information</h2>
        <div class="field"><strong>Name:</strong> {{ $request->name }}</div>
        <div class="field"><strong>Department:</strong> {{ $request->department }}</div>
        <div class="field"><strong>Employee ID:</strong> {{ $request->user->employee_id ?? 'N/A' }}</div>
    </div>

    <div class="section">
        <h2>Request Details</h2>
        <div class="field"><strong>Request ID:</strong> #{{ $request->id }}</div>
        <div class="field"><strong>Date Filed:</strong> {{ $request->created_at->format('F j, Y') }}</div>
        <div class="field"><strong>Request Date:</strong> {{ $request->date_field->format('F j, Y') }}</div>
        <div class="field"><strong>Status:</strong> 
            <span class="status-{{ $request->status }}">
                {{ strtoupper($request->status) }}
            </span>
        </div>
    </div>

    <div class="section">
        <h2>Cash Advance Information</h2>
        <div class="field">
            <strong>Amount Requested:</strong> 
            <span class="amount-highlight">PHP {{ number_format($request->amount_ca, 2) }}</span>
        </div>
        @if($request->rem_ca)
        <div class="field"><strong>Remittance/Deduction:</strong> {{ $request->rem_ca }}</div>
        @endif
        <div class="field"><strong>Reason:</strong></div>
        <div style="margin-left: 20px; padding: 10px; border-left: 3px solid #ccc; background: #f9f9f9;">
            {{ $request->reason }}
        </div>
    </div>

    @if($request->status === 'approved')
    <div class="approval-info">
        <h3>✅ APPROVED</h3>
        <div class="field"><strong>Processed by:</strong> {{ $request->processedBy ? ($request->processedBy->first_name . ' ' . $request->processedBy->last_name) : 'HR Assistant' }}</div>
        <div class="field"><strong>Approval Date:</strong> {{ $request->processed_at->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        
        @if($request->collection_date)
        <div class="collection-date">
            <strong>🗓️ Collection Date: {{ $request->collection_date->format('l, F j, Y') }}</strong><br>
            <small>Please bring a valid government-issued ID when collecting your cash advance.</small><br>
            <small><strong>Collection Hours:</strong> Monday to Friday, 8:00 AM - 5:00 PM</small><br>
            <small><strong>Location:</strong> HR Office</small>
        </div>
        @endif
        
        @if($request->hr_remarks)
        <div class="field"><strong>HR Remarks:</strong> {{ $request->hr_remarks }}</div>
        @endif
        
        <div style="margin-top: 15px; font-weight: bold; color: #28a745;">
            Amount to be released: PHP {{ number_format($request->amount_ca, 2) }}
        </div>
    </div>

    @elseif($request->status === 'rejected')
    <div class="rejection-info">
        <h3>❌ REJECTED</h3>
        <div class="field"><strong>Processed by:</strong> {{ $request->processedBy ? ($request->processedBy->first_name . ' ' . $request->processedBy->last_name) : 'HR Assistant' }}</div>
        <div class="field"><strong>Rejection Date:</strong> {{ $request->processed_at->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        @if($request->hr_remarks)
        <div class="field"><strong>HR Remarks:</strong> {{ $request->hr_remarks }}</div>
        @endif
    </div>

    @else
    <div class="pending-info">
        <h3>⏳ PENDING APPROVAL</h3>
        <div class="field">This request is currently under review by the HR department.</div>
        <div class="field">You will be notified once a decision has been made.</div>
    </div>
    @endif

    @if($request->status === 'approved')
    <div class="signatures">
        <div class="field"><strong>Acknowledgment of Receipt:</strong></div>
        <br>
        <div style="margin-top: 20px;">
            <div class="signature-line"></div>
            <div class="signature-line"></div>
            <br><br>
            <div style="display: inline-block; margin-right: 100px;">
                <strong>Employee Signature</strong><br>
                <small>{{ $request->name }}</small>
            </div>
            <div style="display: inline-block;">
                <strong>HR Representative</strong><br>
                <small>{{ $request->processedBy ? ($request->processedBy->first_name . ' ' . $request->processedBy->last_name) : 'HR Assistant' }}</small>
            </div>
        </div>
        <br><br>
        <div style="text-align: left;">
            <strong>Date Received:</strong> _______________
        </div>
    </div>
    @endif

    <div class="footer">
        <hr style="margin: 20px 0; border: 1px solid #ddd;">
        <div>Generated on {{ $generatedAt->setTimezone('Asia/Manila')->format('F j, Y \a\t g:i A') }}</div>
        <div>This is an official document from {{ $request->company }}</div>
        @if($request->status === 'approved')
        <div style="margin-top: 10px; font-style: italic;">
            <strong>Important:</strong> Please present this form when collecting your cash advance.
            @if($request->collection_date)
            <br>Collect on or after: <strong>{{ $request->collection_date->format('l, F j, Y') }}</strong>
            @endif
        </div>
        @endif
    </div>
</body>
</html>