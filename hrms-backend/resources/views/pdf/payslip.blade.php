<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip</title>
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
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
            color: #000;
        }
        .company-info {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 15px 0;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            text-transform: uppercase;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .info-label {
            font-weight: bold;
            width: 40%;
        }
        .info-value {
            width: 60%;
            text-align: right;
        }
        .earnings-table, .deductions-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .earnings-table th, .deductions-table th {
            background-color: #f0f0f0;
            padding: 10px;
            text-align: left;
            border: 1px solid #000;
            font-weight: bold;
        }
        .earnings-table td, .deductions-table td {
            padding: 8px 10px;
            border: 1px solid #000;
        }
        .earnings-table td:last-child, .deductions-table td:last-child {
            text-align: right;
        }
        .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
        }
        .net-pay-section {
            margin-top: 30px;
            padding: 20px;
            background-color: #e8f4f8;
            border: 2px solid #000;
            text-align: center;
        }
        .net-pay-label {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .net-pay-amount {
            font-size: 32px;
            font-weight: bold;
            color: #000;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #000;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYSLIP</h1>
        <div class="company-info">
            <strong>Company Name</strong><br>
            This is a system-generated payslip
        </div>
    </div>

    <div class="section">
        <div class="section-title">Employee Information</div>
        <div class="info-row">
            <div class="info-label">Employee Name:</div>
            <div class="info-value">{{ $employeeProfile->first_name }} {{ $employeeProfile->last_name }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Employee ID:</div>
            <div class="info-value">{{ $employeeProfile->employee_id }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Position:</div>
            <div class="info-value">{{ $employeeProfile->position }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Department:</div>
            <div class="info-value">{{ $employeeProfile->department }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Pay Period:</div>
            <div class="info-value">{{ \Carbon\Carbon::parse($payroll->period_start)->format('M d, Y') }} - {{ \Carbon\Carbon::parse($payroll->period_end)->format('M d, Y') }}</div>
        </div>
        @if($payroll->payrollPeriod)
        <div class="info-row">
            <div class="info-label">Period Name:</div>
            <div class="info-value">{{ $payroll->payrollPeriod->name }}</div>
        </div>
        @endif
        <div class="info-row">
            <div class="info-label">Days Worked:</div>
            <div class="info-value">{{ $payroll->days_worked ?? 0 }} days</div>
        </div>
    </div>

    <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1;">
            <div class="section-title">Earnings</div>
            <table class="earnings-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Basic Salary</td>
                        <td>PHP {{ number_format($payroll->basic_salary ?? 0, 2) }}</td>
                    </tr>
                    @if(($payroll->overtime_pay ?? 0) > 0)
                    <tr>
                        <td>Overtime Pay</td>
                        <td>PHP {{ number_format($payroll->overtime_pay, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->holiday_pay ?? 0) > 0)
                    <tr>
                        <td>Holiday Pay</td>
                        <td>PHP {{ number_format($payroll->holiday_pay, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->allowances ?? 0) > 0)
                    <tr>
                        <td>Allowances</td>
                        <td>PHP {{ number_format($payroll->allowances, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="total-row">
                        <td><strong>Total Earnings (Gross Pay)</strong></td>
                        <td><strong>PHP {{ number_format($payroll->gross_pay ?? 0, 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="flex: 1;">
            <div class="section-title">Deductions</div>
            <table class="deductions-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @if(($payroll->sss_deduction ?? 0) > 0)
                    <tr>
                        <td>SSS</td>
                        <td>PHP {{ number_format($payroll->sss_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->philhealth_deduction ?? 0) > 0)
                    <tr>
                        <td>PhilHealth</td>
                        <td>PHP {{ number_format($payroll->philhealth_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->pagibig_deduction ?? 0) > 0)
                    <tr>
                        <td>Pag-IBIG</td>
                        <td>PHP {{ number_format($payroll->pagibig_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->tax_deduction ?? 0) > 0)
                    <tr>
                        <td>Tax</td>
                        <td>PHP {{ number_format($payroll->tax_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->late_deduction ?? 0) > 0)
                    <tr>
                        <td>Late Penalty</td>
                        <td>PHP {{ number_format($payroll->late_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->undertime_deduction ?? 0) > 0)
                    <tr>
                        <td>Undertime Penalty</td>
                        <td>PHP {{ number_format($payroll->undertime_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->cash_advance_deduction ?? 0) > 0)
                    <tr>
                        <td>Cash Advance</td>
                        <td>PHP {{ number_format($payroll->cash_advance_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->other_deductions ?? 0) > 0)
                    <tr>
                        <td>Other Deductions</td>
                        <td>PHP {{ number_format($payroll->other_deductions, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="total-row">
                        <td><strong>Total Deductions</strong></td>
                        <td><strong>PHP {{ number_format($payroll->total_deductions ?? 0, 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="net-pay-section">
        <div class="net-pay-label">NET PAY</div>
        <div class="net-pay-amount">PHP {{ number_format($payroll->net_pay ?? 0, 2) }}</div>
    </div>

    <div class="footer">
        <p><strong>Note:</strong> This is a system-generated payslip. Please keep this document for your records.</p>
        <p>Generated on: {{ \Carbon\Carbon::now()->format('F d, Y h:i A') }}</p>
        @if($payroll->status)
        <p>Status: <strong>{{ ucfirst($payroll->status) }}</strong></p>
        @endif
    </div>
</body>
</html>

