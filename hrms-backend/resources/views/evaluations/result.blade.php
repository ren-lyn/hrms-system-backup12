<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Employee Evaluation Result</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body { 
      font-family: 'Arial', 'Helvetica', 'DejaVu Sans', sans-serif; 
      font-size: 12px; 
      color: #000; 
      margin: 0;
      padding: 20px;
      background-color: #fff;
      line-height: 1.6;
    }
    @page {
      margin: 15mm;
      size: A4 portrait;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding: 12px 0;
      border-bottom: 2px solid #34495e;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      font-weight: bold;
      color: #000;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .company-name {
      font-size: 13px;
      font-weight: 600;
      color: #000;
      margin: 6px 0 0 0;
      letter-spacing: 0.5px;
    }
    .generated-date {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 2px solid #34495e;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 0.5px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .table th {
      background-color: #34495e;
      color: #ffffff;
      padding: 11px 14px;
      border: 1px solid #2c3e50;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .table td {
      padding: 10px 14px;
      border: 1px solid #e0e0e0;
      font-size: 11px;
      color: #000;
      vertical-align: top;
    }
    .summary-table th {
      width: 25%;
    }
    .badge {
      display: inline-block;
      padding: 0;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    .analysis-table th {
      width: 50%;
    }
    .analysis-table td {
      padding: 12px 14px;
      font-size: 11px;
      line-height: 1.8;
    }
    .analysis-item {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .analysis-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .analysis-item strong {
      font-weight: 700;
      display: block;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .detailed-table th {
      font-size: 10px;
    }
    .detailed-table td {
      font-size: 10px;
    }
    .detailed-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .detailed-table tbody tr:nth-child(odd) {
      background-color: #ffffff;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>EMPLOYEE EVALUATION RESULT</h1>
    <div class="company-name">
      CABUYAO CONCRETE DEVELOPMENT CORPORATION
    </div>
    <div class="generated-date">Generated on {{ now()->format('F d, Y h:i A') }}</div>
  </div>

  <div class="section">
    <div class="section-title">Evaluation Summary</div>
    <table class="table summary-table">
      <tr>
        <th>Evaluation Form</th>
        <td>{{ optional($evaluation->evaluationForm)->title ?? 'N/A' }}</td>
        <th>Submitted Date</th>
        <td>{{ optional($evaluation->submitted_at)->format('M d, Y h:i A') ?? 'N/A' }}</td>
      </tr>
      <tr>
        <th>Employee Name</th>
        <td>
          @php
            $emp = $evaluation->employee;
            $ep = optional($emp->employeeProfile);
            $empName = ($ep->first_name && $ep->last_name) ? trim($ep->first_name.' '.$ep->last_name) : $emp->name;
          @endphp
          {{ $empName }}
        </td>
        <th>Employee ID</th>
        <td>{{ $ep->employee_id ?? 'N/A' }}</td>
      </tr>
      <tr>
        <th>Department</th>
        <td>{{ $ep->department ?? 'N/A' }}</td>
        <th>Position</th>
        <td>{{ $ep->position ?? 'N/A' }}</td>
      </tr>
      <tr>
        <th>Evaluated By</th>
        <td>
          @php
            $mgr = $evaluation->manager;
            $mp = optional($mgr->employeeProfile);
            $mgrName = ($mp->first_name && $mp->last_name) ? trim($mp->first_name.' '.$mp->last_name) : ($mgr->name ?? $mgr->email);
          @endphp
          {{ $mgrName }}
        </td>
        <th>Evaluation Status</th>
        <td>
          @if($scores['is_passed'])
            <span class="badge">PASSED</span>
          @else
            <span class="badge">NEEDS IMPROVEMENT</span>
          @endif
        </td>
      </tr>
      <tr>
        <th>Total Score</th>
        <td><strong>{{ $scores['total_score'] }} / {{ ($scores['total_questions'] ?? 0) * 10 }}</strong></td>
        <th>Average Score</th>
        <td><strong>{{ number_format($scores['average_score'], 2) }}</strong></td>
      </tr>
      <tr>
        <th>Percentage Score</th>
        <td><strong>{{ number_format($scores['percentage'], 2) }}%</strong></td>
        <th>Passing Score</th>
        <td><strong>{{ $scores['passing_score'] }}</strong></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Performance Analysis</div>
    <table class="table analysis-table">
      <tr>
        <th>Strengths ({{ $analysis['strengths_count'] }})</th>
        <th>Areas for Improvement ({{ $analysis['weaknesses_count'] }})</th>
      </tr>
      <tr>
        <td style="background-color: #f8f9fa;">
          @if($analysis['strengths_count'] > 0)
            @foreach($analysis['strengths'] as $r)
              <div class="analysis-item">
                <strong>{{ $r->question->category }}</strong>
                Rating: {{ $r->rating }}/10
              </div>
            @endforeach
          @else
            <em>No strengths identified</em>
          @endif
        </td>
        <td style="background-color: #f8f9fa;">
          @if($analysis['weaknesses_count'] > 0)
            @foreach($analysis['weaknesses'] as $r)
              <div class="analysis-item">
                <strong>{{ $r->question->category }}</strong>
                Rating: {{ $r->rating }}/10
              </div>
            @endforeach
          @else
            <em>No areas for improvement identified</em>
          @endif
        </td>
      </tr>
    </table>
  </div>

  <div class="section page-break">
    <div class="section-title">Detailed Evaluation Responses</div>
    <table class="table detailed-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 15%;">Category</th>
          <th style="width: 35%;">Question</th>
          <th style="width: 10%;">Rating</th>
          <th style="width: 15%;">Classification</th>
          <th style="width: 20%;">Manager Comment</th>
        </tr>
      </thead>
      <tbody>
        @foreach($evaluation->responses as $i => $response)
          <tr>
            <td style="text-align: center; font-weight: 600;">{{ $i + 1 }}</td>
            <td><strong>{{ $response->question->category ?? 'N/A' }}</strong></td>
            <td>{{ $response->question->question_text ?? 'N/A' }}</td>
            <td style="text-align: center; font-weight: 600;">{{ $response->rating ?? 'N/A' }}/10</td>
            <td style="text-align: center;">
              @if(($response->classification ?? '') === 'Strength')
                <span style="color: #000; font-weight: 600;">Strength</span>
              @else
                <span style="color: #000; font-weight: 600;">Weakness</span>
              @endif
            </td>
            <td>{{ $response->manager_comment ?? '—' }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  @if($evaluation->general_comments)
  <div class="section">
    <div class="section-title">General Comments</div>
    <div style="padding: 14px; background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 11px; line-height: 1.7;">
      {{ $evaluation->general_comments }}
    </div>
  </div>
  @endif

  <div class="footer">
    <p><strong>Note:</strong> This is a system-generated evaluation result. Please keep this document for your records.</p>
  </div>
</body>
</html>
