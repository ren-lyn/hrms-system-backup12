<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Employee Payslip</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 25px;
            color: #000;
            background-color: #fff;
            line-height: 1.5;
        }
        @page {
            margin: 15mm;
            size: A4 portrait;
        }
        .header {
            text-align: center;
            margin-bottom: 25px;
            padding: 15px 0;
            border-bottom: 3px solid #34495e;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: bold;
            color: #000;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .company-name {
            font-size: 14px;
            font-weight: 600;
            color: #000;
            margin: 8px 0 0 0;
            letter-spacing: 0.5px;
        }
        .section {
            margin-bottom: 18px;
        }
        .section-title {
            font-size: 12px;
            font-weight: 700;
            margin: 0 0 12px 0;
            padding-bottom: 6px;
            border-bottom: 2px solid #34495e;
            text-transform: uppercase;
            color: #000;
            letter-spacing: 0.5px;
        }
        .employee-info {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 12px;
            background-color: #f8f9fa;
            margin-bottom: 18px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        .info-table td {
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            font-size: 11px;
            vertical-align: middle;
        }
        .info-label {
            font-weight: 600;
            width: 40%;
            color: #000;
            background-color: #ecf0f1;
        }
        .info-value {
            width: 60%;
            color: #000;
            font-weight: 500;
        }
        .earnings-table, .deductions-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .earnings-table th, .deductions-table th {
            background-color: #34495e;
            padding: 10px 12px;
            text-align: left;
            border: 1px solid #2c3e50;
            font-weight: 700;
            font-size: 11px;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .earnings-table th:last-child, .deductions-table th:last-child {
            text-align: right;
        }
        .earnings-table td, .deductions-table td {
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            font-size: 11px;
            color: #000;
        }
        .earnings-table td:last-child, .deductions-table td:last-child {
            text-align: right;
            font-weight: 600;
            color: #000;
        }
        .total-row {
            font-weight: 700;
            background-color: #ecf0f1;
            border-top: 2px solid #34495e;
        }
        .total-row td {
            padding: 10px 12px;
            font-size: 12px;
            color: #000;
        }
        .total-row td:last-child {
            color: #000;
        }
        .net-pay-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            page-break-inside: avoid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .net-pay-table td {
            padding: 14px 16px;
            border: 2px solid #34495e;
            font-size: 13px;
        }
        .net-pay-label {
            font-weight: 700;
            background-color: #34495e;
            color: #ffffff;
            width: 40%;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 12px;
        }
        .net-pay-amount {
            font-weight: 700;
            text-align: right;
            background-color: #ecf0f1;
            color: #000;
            font-size: 16px;
            width: 60%;
        }
        .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 9px;
            color: #7f8c8d;
            line-height: 1.6;
        }
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 15px 0;
        }
        .tables-container {
            display: flex;
            gap: 18px;
            margin-bottom: 18px;
        }
        .table-wrapper {
            flex: 1;
        }
        .table-wrapper .section-title {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>EMPLOYEE PAYSLIP</h1>
        <div class="company-name">
            CABUYAO CONCRETE DEVELOPMENT CORPORATION
        </div>
    </div>

    <div class="employee-info">
        <div class="section-title">Employee Information</div>
        <table class="info-table">
            <tbody>
                <tr>
                    <td class="info-label">Employee Name:</td>
                    <td class="info-value">{{ $employeeProfile->first_name }} {{ $employeeProfile->last_name }}</td>
                    <td class="info-label">Department:</td>
                    <td class="info-value">{{ $employeeProfile->department ?? 'N/A' }}</td>
                </tr>
                <tr>
                    <td class="info-label">Employee ID:</td>
                    <td class="info-value">{{ $employeeProfile->employee_id ?? 'N/A' }}</td>
                    <td class="info-label">Pay Period:</td>
                    <td class="info-value">{{ \Carbon\Carbon::parse($payroll->period_start)->format('M d, Y') }} - {{ \Carbon\Carbon::parse($payroll->period_end)->format('M d, Y') }}</td>
                </tr>
                <tr>
                    <td class="info-label">Position:</td>
                    <td class="info-value">{{ $employeeProfile->position ?? 'N/A' }}</td>
                    @if($payroll->payrollPeriod)
                    <td class="info-label">Period Name:</td>
                    <td class="info-value">{{ $payroll->payrollPeriod->name }}</td>
                    @else
                    <td class="info-label">Days Worked:</td>
                    <td class="info-value">{{ $payroll->days_worked ?? 0 }} days</td>
                    @endif
                </tr>
                @if($payroll->payrollPeriod)
                <tr>
                    <td class="info-label"></td>
                    <td class="info-value"></td>
                    <td class="info-label">Days Worked:</td>
                    <td class="info-value">{{ $payroll->days_worked ?? 0 }} days</td>
                </tr>
                @endif
            </tbody>
        </table>
    </div>
    
    <div class="divider"></div>

    <div class="tables-container">
        <div class="table-wrapper">
            <div class="section-title">Earnings</div>
            <table class="earnings-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Basic Salary</td>
                        <td>PHP {{ number_format($payroll->basic_salary ?? 0, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Gross Pay</strong></td>
                        <td><strong>PHP {{ number_format($payroll->gross_pay ?? 0, 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="table-wrapper">
            <div class="section-title">Deductions</div>
            <table class="deductions-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @if(($payroll->sss_deduction ?? 0) > 0)
                    <tr>
                        <td>SSS Contribution (Employee)</td>
                        <td>PHP {{ number_format($payroll->sss_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->philhealth_deduction ?? 0) > 0)
                    <tr>
                        <td>PhilHealth (Employee)</td>
                        <td>PHP {{ number_format($payroll->philhealth_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->pagibig_deduction ?? 0) > 0)
                    <tr>
                        <td>Pag-IBIG (Employee)</td>
                        <td>PHP {{ number_format($payroll->pagibig_deduction, 2) }}</td>
                    </tr>
                    @endif
                    @if(($payroll->tax_deduction ?? 0) > 0)
                    <tr>
                        <td>Income Tax</td>
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
                    <tr class="total-row">
                        <td><strong>Total Deductions</strong></td>
                        <td><strong>PHP {{ number_format($payroll->total_deductions ?? 0, 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <table class="net-pay-table">
        <tbody>
            <tr>
                <td class="net-pay-label">NET PAY</td>
                <td class="net-pay-amount">PHP {{ number_format($payroll->net_pay ?? 0, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <p><strong>Note:</strong> This is a system-generated payslip. Please keep this document for your records.</p>
        <p>Generated on: {{ \Carbon\Carbon::now()->format('F d, Y h:i A') }}</p>
        @if($payroll->status)
        <p>Status: <strong>{{ ucfirst($payroll->status) }}</strong></p>
        @endif
    </div>
</body>
</html>

