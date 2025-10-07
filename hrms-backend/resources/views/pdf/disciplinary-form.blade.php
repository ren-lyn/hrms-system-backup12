<!DOCTYPE html>
<html>
<head>
    <title>Disciplinary Action Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 15px;
            line-height: 1.4;
            color: #000;
        }
        
        .header {
            text-align: center;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #000;
            margin: 0;
            font-size: 18px;
            font-weight: bold;
        }
        
        .header h2 {
            color: #000;
            margin: 3px 0 0 0;
            font-size: 12px;
            font-weight: normal;
        }
        
        .section {
            margin-bottom: 15px;
        }
        
        .section-header {
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .section-content {
            margin-left: 0;
        }
        
        .field {
            margin-bottom: 4px;
            line-height: 1.3;
        }
        
        .field-label {
            font-weight: bold;
            display: inline;
        }
        
        .field-value {
            display: inline;
        }
        
        .text-box {
            padding: 6px 0;
            background-color: #fff;
            margin-top: 3px;
            min-height: 30px;
        }
        
        .signature-section {
            margin-top: 15px;
            padding-top: 10px;
        }
        
        .signature-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        
        .signature-item {
            flex: 1;
            margin: 0 8px;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            width: 100%;
            margin: 3px 0;
            height: 15px;
        }
        
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #000;
            padding-top: 10px;
        }
        
        .repeat-violation {
            padding: 8px 0;
            margin: 10px 0;
        }
        
        .repeat-violation h4 {
            color: #000;
            margin: 0 0 6px 0;
            font-size: 12px;
        }
        
        .repeat-violation ul {
            margin: 6px 0;
            padding-left: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DISCIPLINARY ACTION FORM</h1>
        <h2>Employee: {{ $action->employee->first_name }} {{ $action->employee->last_name }}</h2>
    </div>

    <!-- Action Information -->
    <div class="section">
        <div class="section-header">Action Information</div>
        <div class="section-content">
            <div class="field">
                <span class="field-label">Action Type:</span> <span class="field-value">{{ ucwords(str_replace('_', ' ', $action->action_type)) }}</span>
            </div>
            <div class="field">
                <span class="field-label">Status:</span> <span class="field-value">{{ ucwords(str_replace('_', ' ', $action->status)) }}</span>
            </div>
            <div class="field">
                <span class="field-label">Effective Date:</span> <span class="field-value">{{ \Carbon\Carbon::parse($action->effective_date)->format('F j, Y') }}</span>
            </div>
            <div class="field">
                <span class="field-label">Issued Date:</span> <span class="field-value">{{ \Carbon\Carbon::parse($action->created_at)->format('F j, Y') }}</span>
            </div>
        </div>
    </div>

    <!-- Employee Information -->
    <div class="section">
        <div class="section-header">Employee Information</div>
        <div class="section-content">
            <div class="field">
                <span class="field-label">Name:</span> <span class="field-value">{{ $action->employee->first_name }} {{ $action->employee->last_name }}</span>
            </div>
            <div class="field">
                <span class="field-label">Employee ID:</span> <span class="field-value">{{ $action->employee->employee_id ?? 'N/A' }}</span>
            </div>
            <div class="field">
                <span class="field-label">Position:</span> <span class="field-value">{{ $action->employee->position ?? 'N/A' }}</span>
            </div>
            <div class="field">
                <span class="field-label">Department:</span> <span class="field-value">{{ $action->employee->department ?? 'N/A' }}</span>
            </div>
        </div>
    </div>

    <!-- Issued By -->
    <div class="section">
        <div class="section-header">Issued By</div>
        <div class="section-content">
            <div class="field">
                <span class="field-label">Name:</span> <span class="field-value">{{ $action->issuedBy->first_name }} {{ $action->issuedBy->last_name }}</span>
            </div>
            <div class="field">
                <span class="field-label">Position:</span> <span class="field-value">{{ $action->issuedBy->position ?? 'N/A' }}</span>
            </div>
            @if($action->investigator)
            <div class="field">
                <span class="field-label">Investigator:</span> <span class="field-value">{{ $action->investigator->first_name }} {{ $action->investigator->last_name }} ({{ $action->investigator->position ?? 'N/A' }})</span>
            </div>
            @endif
        </div>
    </div>

    <!-- Action Details -->
    <div class="section">
        <div class="section-header">Action Details</div>
        <div class="section-content">
            <div class="text-box">
                {{ $action->action_details ?? 'No additional details provided.' }}
            </div>
        </div>
    </div>

    @if($action->disciplinary_report)
    <!-- Related Violation -->
    <div class="section">
        <div class="section-header">Related Violation</div>
        <div class="section-content">
            <div class="field">
                <span class="field-label">Category:</span> <span class="field-value">{{ $action->disciplinary_report->disciplinary_category->name }}</span>
            </div>
            <div class="field">
                <span class="field-label">Incident Date:</span> <span class="field-value">{{ \Carbon\Carbon::parse($action->incident_date)->format('F j, Y') }}</span>
            </div>
            <div class="field">
                <span class="field-label">Violation Description:</span>
            </div>
            <div class="text-box">
                {{ $action->violation }}
            </div>
        </div>
    </div>

    <!-- Repeat Violation Notice -->
    @if($action->is_repeat_violation)
    <div class="repeat-violation">
        <h4>REPEAT VIOLATION NOTICE</h4>
        <p><strong>This is a repeat violation in the same category.</strong></p>
        <p>{{ $action->violation_warning_message }}</p>
        @if($action->previous_violations && count($action->previous_violations) > 0)
        <p><strong>Previous violations in this category:</strong></p>
        <ul>
            @foreach($action->previous_violations->take(3) as $violation)
            <li>Report #{{ $violation->report_number }} - {{ \Carbon\Carbon::parse($violation->incident_date)->format('F j, Y') }} ({{ ucwords(str_replace('_', ' ', $violation->status)) }})</li>
            @endforeach
            @if(count($action->previous_violations) > 3)
            <li>...and {{ count($action->previous_violations) - 3 }} more</li>
            @endif
        </ul>
        @endif
    </div>
    @endif
    @endif

    <!-- Employee Explanation -->
    @if($action->employee_explanation)
    <div class="section">
        <div class="section-header">Employee Explanation</div>
        <div class="section-content">
            <div class="text-box">
                {{ $action->employee_explanation }}
            </div>
            <div class="field">
                <span class="field-label">Submitted on:</span> <span class="field-value">{{ \Carbon\Carbon::parse($action->explanation_submitted_at)->format('F j, Y g:i A') }}</span>
            </div>
        </div>
    </div>
    @endif

    <!-- Investigation Notes -->
    @if($action->investigation_notes)
    <div class="section">
        <div class="section-header">Investigation Notes</div>
        <div class="section-content">
            <div class="text-box">
                {{ $action->investigation_notes }}
            </div>
        </div>
    </div>
    @endif

    <!-- Final Verdict -->
    @if($action->hr_verdict)
    <div class="section">
        <div class="section-header">Final Verdict</div>
        <div class="section-content">
            <div class="text-box">
                {{ $action->hr_verdict }}
            </div>
            <div class="field">
                <span class="field-label">Issued on:</span> <span class="field-value">{{ \Carbon\Carbon::parse($action->verdict_date)->format('F j, Y g:i A') }}</span>
            </div>
        </div>
    </div>
    @endif

    <!-- Signature Section -->
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-item">
                <div class="field">
                    <span class="field-label">Employee Signature:</span>
                </div>
                <div class="signature-line"></div>
                <div class="field">
                    <span class="field-label">Date:</span> <span class="field-value">_______________</span>
                </div>
            </div>
            <div class="signature-item">
                <div class="field">
                    <span class="field-label">HR Representative:</span>
                </div>
                <div class="signature-line"></div>
                <div class="field">
                    <span class="field-label">Date:</span> <span class="field-value">_______________</span>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This document was generated on {{ \Carbon\Carbon::now()->format('F j, Y g:i A') }}</p>
        <p>Confidential - For Internal Use Only</p>
    </div>
</body>
</html>
