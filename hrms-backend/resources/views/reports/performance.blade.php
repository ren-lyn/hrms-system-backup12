<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Evaluation Report - CCDC</title>
  <style>
    @page {
      margin: 15mm;
    }
    
    body { 
      font-family: DejaVu Sans, Arial, Helvetica, sans-serif;
      font-size: 9px;
      color: #2c3e50;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }
    
    /* Header */
    .report-header {
      background-color: #1e3c72;
      color: white;
      padding: 20px 25px;
      margin-bottom: 20px;
      border-bottom: 3px solid #ff6b35;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    
    .report-title {
      font-size: 13px;
      margin-top: 4px;
    }
    
    /* Meta Information */
    .report-meta {
      background-color: #f8f9fa;
      border-left: 3px solid #1e3c72;
      padding: 12px 18px;
      margin: 0 0 20px 0;
    }
    
    .meta-table {
      width: 100%;
      border: none;
    }
    
    .meta-table td {
      padding: 3px 0;
      border: none;
    }
    
    .meta-label {
      font-weight: bold;
      color: #1e3c72;
      width: 130px;
      font-size: 9px;
    }
    
    .meta-value {
      color: #2c3e50;
      font-size: 9px;
    }
    
    /* Content */
    .content {
      padding: 0;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e3c72;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #dee2e6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Stats Cards */
    .stats-table {
      width: 100%;
      margin-bottom: 20px;
      border-collapse: collapse;
    }
    
    .stat-card {
      width: 33.33%;
      padding: 12px;
      background-color: white;
      border: 1px solid #dee2e6;
      vertical-align: top;
    }
    
    .stat-card-primary {
      border-left: 3px solid #1e3c72;
    }
    
    .stat-card-success {
      border-left: 3px solid #28a745;
    }
    
    .stat-card-warning {
      border-left: 3px solid #ffc107;
    }
    
    .stat-label {
      font-size: 8px;
      color: #6c757d;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: block;
      font-weight: bold;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
      display: block;
      margin: 4px 0;
    }
    
    .stat-subvalue {
      font-size: 8px;
      color: #6c757d;
      display: block;
    }
    
    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    
    .data-table thead {
      background-color: #1e3c72;
      color: white;
    }
    
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: bold;
      font-size: 9px;
      text-transform: uppercase;
      border: 1px solid #1e3c72;
    }
    
    .data-table td {
      padding: 8px 10px;
      border: 1px solid #dee2e6;
      font-size: 9px;
    }
    
    .data-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    /* Status Text - Clean without badges */
    .status-pass {
      color: #28a745;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9px;
    }
    
    .status-fail {
      color: #dc3545;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9px;
    }
    
    /* Insights */
    .insights-container {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .insights-container.no-background {
      background-color: #f8f9fa;
      border-left: 4px solid #6c757d;
    }
    
    .insight-card {
      background-color: white;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #bbdefb;
    }
    
    .insights-container.no-background .insight-card {
      border: 1px solid #dee2e6;
    }
    
    .insight-card:last-child {
      margin-bottom: 0;
    }
    
    .insight-title {
      font-weight: bold;
      color: #1976d2;
      font-size: 10px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    
    .insight-description {
      color: #2c3e50;
      margin-bottom: 6px;
      line-height: 1.5;
      font-size: 9px;
    }
    
    .insight-recommendation {
      background-color: #fff3cd;
      border-left: 3px solid #ffc107;
      padding: 6px 8px;
      font-size: 8px;
      color: #856404;
    }
    
    .recommendation-label {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 8px;
    }
    
    /* Detail Card */
    .detail-card {
      background-color: white;
      border: 1px solid #dee2e6;
      padding: 0;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    
    .detail-header {
      background-color: #e9ecef;
      padding: 8px 12px;
      border-bottom: 2px solid #dee2e6;
    }
    
    .detail-header-title {
      font-size: 10px;
      font-weight: bold;
      color: #1e3c72;
      text-transform: uppercase;
    }
    
    .detail-body {
      padding: 12px;
    }
    
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    
    .detail-table td {
      padding: 4px 6px;
      border: none;
      font-size: 9px;
    }
    
    .detail-label {
      font-weight: bold;
      color: #6c757d;
      width: 130px;
      text-transform: uppercase;
      font-size: 8px;
    }
    
    .detail-value {
      color: #2c3e50;
      font-weight: 500;
    }
    
    .score-section {
      background-color: #fff3cd;
      border-left: 3px solid #ffc107;
      padding: 10px;
      margin-top: 8px;
    }
    
    .score-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .score-table td {
      padding: 4px 6px;
      border: none;
      font-size: 9px;
    }
    
    .comments-section {
      background-color: #f8f9fa;
      border-left: 3px solid #6c757d;
      padding: 10px;
      margin-top: 8px;
    }
    
    .comments-label {
      font-weight: bold;
      color: #495057;
      margin-bottom: 5px;
      font-size: 9px;
      text-transform: uppercase;
    }
    
    .comments-text {
      color: #2c3e50;
      line-height: 1.6;
      font-size: 9px;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    /* Ensure clean page breaks */
    .section, .detail-card {
      page-break-inside: avoid;
    }
    
    /* Report Description - Harvard Style */
    .report-description {
      background-color: #ffffff;
      border: none;
      padding: 20px 0;
      margin-bottom: 30px;
      line-height: 1.8;
      border-top: 1px solid #2c3e50;
      border-bottom: 1px solid #2c3e50;
      padding-top: 15px;
      padding-bottom: 15px;
    }
    
    .description-title {
      font-size: 10px;
      font-weight: normal;
      color: #1a1a1a;
      margin-bottom: 12px;
      text-transform: none;
      letter-spacing: 0;
      font-style: italic;
      text-align: center;
    }
    
    .description-text {
      font-size: 9px;
      color: #1a1a1a;
      text-align: justify;
      margin-bottom: 10px;
      text-indent: 20px;
      line-height: 1.7;
    }
    
    .description-text:first-of-type {
      text-indent: 0;
    }
    
    .description-text:last-child {
      margin-bottom: 0;
    }
    
    .description-note {
      font-size: 8px;
      color: #666666;
      text-align: right;
      margin-top: 12px;
      font-style: italic;
      text-indent: 0;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="report-header">
    <div class="company-name">Cabuyao Concrete Development Corporation</div>
    <div class="report-title">Performance Evaluation Report</div>
  </div>

  <!-- Report Metadata -->
  <div class="report-meta">
    <table class="meta-table">
      <tr>
        <td class="meta-label">Generated on:</td>
        <td class="meta-value">{{ $generated_at->format('M d, Y H:i') }}</td>
      </tr>
      <tr>
        <td class="meta-label">Evaluation Period:</td>
        <td class="meta-value">{{ Carbon\Carbon::parse($filters['start_date'])->format('M d, Y') }} - {{ Carbon\Carbon::parse($filters['end_date'])->format('M d, Y') }}</td>
      </tr>
      @if(!empty($filters['department']))
      <tr>
        <td class="meta-label">Department:</td>
        <td class="meta-value">{{ $filters['department'] }}</td>
      </tr>
      @endif
      @if(!empty($filters['position']))
      <tr>
        <td class="meta-label">Position:</td>
        <td class="meta-value">{{ $filters['position'] }}</td>
      </tr>
      @endif
      @if(!empty($filters['status']) && $filters['status'] !== 'all')
      <tr>
        <td class="meta-label">Status Filter:</td>
        <td class="meta-value">{{ ucfirst($filters['status']) }}</td>
      </tr>
      @endif
    </table>
  </div>

  <div class="content">
    <!-- Report Description - Harvard Style -->
    <div class="report-description">
      <div class="description-text">
        This report presents a comprehensive analysis of employee performance evaluations conducted during the specified assessment period. The analysis encompasses quantitative performance metrics, departmental assessments, and strategic insights derived from systematic evaluation processes implemented across the organization. The report is structured to provide executive leadership with actionable intelligence regarding workforce performance, organizational strengths, and areas requiring strategic intervention.
      </div>
      <div class="description-text">
        The evaluation data presented herein has been compiled from formally submitted performance assessments that have undergone review and validation procedures. All performance scores are calculated using standardized evaluation criteria, with established passing thresholds ensuring consistent assessment standards. The report includes executive-level statistics, departmental and positional performance breakdowns, temporal trend analysis, and detailed individual evaluation records for comprehensive reference.
      </div>
      <div class="description-note">
        This document is confidential and intended for authorized personnel only. Use of this information is restricted to performance management, strategic planning, and organizational development purposes.
      </div>
    </div>

    <!-- Executive Summary Statistics -->
    <div class="section">
      <h2 class="section-title">Executive Summary</h2>
      <table class="stats-table">
        <tr>
          <td class="stat-card stat-card-primary">
            <span class="stat-label">Total Evaluations</span>
            <span class="stat-value">{{ $statistics['total_evaluations'] }}</span>
            <span class="stat-subvalue">Completed assessments</span>
          </td>
          <td class="stat-card stat-card-success">
            <span class="stat-label">Pass Rate</span>
            <span class="stat-value">{{ number_format($statistics['pass_rate'], 1) }}%</span>
            <span class="stat-subvalue">{{ $statistics['passed_count'] }} passed / {{ $statistics['failed_count'] }} needs improvement</span>
          </td>
          <td class="stat-card stat-card-warning">
            <span class="stat-label">Average Score</span>
            <span class="stat-value">{{ number_format($statistics['average_percentage'], 1) }}%</span>
            <span class="stat-subvalue">Overall performance</span>
          </td>
      </tr>
    </table>
  </div>

    <!-- Department Performance -->
  @if(!empty($analytics['by_department']) && count($analytics['by_department']) > 1)
  <div class="section">
      <h2 class="section-title">Performance by Department</h2>
      <table class="data-table">
      <thead>
        <tr>
          <th>Department</th>
            <th class="text-center">Total</th>
            <th class="text-center">Passed</th>
            <th class="text-center">Failed</th>
            <th class="text-center">Avg Score</th>
            <th class="text-center">Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_department'] as $dept)
        <tr>
            <td><strong>{{ $dept['department'] }}</strong></td>
          <td class="text-center">{{ $dept['total'] }}</td>
          <td class="text-center">{{ $dept['passed'] }}</td>
          <td class="text-center">{{ $dept['failed'] }}</td>
            <td class="text-center"><strong>{{ number_format($dept['average_score'], 1) }}%</strong></td>
            <td class="text-center"><strong>{{ number_format($dept['pass_rate'], 1) }}%</strong></td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

    <!-- Position Performance -->
  @if(!empty($analytics['by_position']) && count($analytics['by_position']) > 1)
  <div class="section">
      <h2 class="section-title">Performance by Position</h2>
      <table class="data-table">
      <thead>
        <tr>
          <th>Position</th>
            <th class="text-center">Total</th>
            <th class="text-center">Passed</th>
            <th class="text-center">Failed</th>
            <th class="text-center">Avg Score</th>
            <th class="text-center">Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_position'] as $pos)
        <tr>
            <td><strong>{{ $pos['position'] }}</strong></td>
          <td class="text-center">{{ $pos['total'] }}</td>
          <td class="text-center">{{ $pos['passed'] }}</td>
          <td class="text-center">{{ $pos['failed'] }}</td>
            <td class="text-center"><strong>{{ number_format($pos['average_score'], 1) }}%</strong></td>
            <td class="text-center"><strong>{{ number_format($pos['pass_rate'], 1) }}%</strong></td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

    <!-- Monthly Trends -->
  @if(!empty($analytics['by_month']) && count($analytics['by_month']) > 1)
  <div class="section">
      <h2 class="section-title">Performance Trends Over Time</h2>
      <table class="data-table">
      <thead>
        <tr>
          <th>Period</th>
            <th class="text-center">Total</th>
            <th class="text-center">Passed</th>
            <th class="text-center">Failed</th>
            <th class="text-center">Avg Score</th>
            <th class="text-center">Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_month'] as $month)
        <tr>
            <td><strong>{{ $month['month'] }}</strong></td>
          <td class="text-center">{{ $month['total'] }}</td>
          <td class="text-center">{{ $month['passed'] }}</td>
          <td class="text-center">{{ $month['failed'] }}</td>
            <td class="text-center"><strong>{{ number_format($month['average_score'], 1) }}%</strong></td>
            <td class="text-center"><strong>{{ number_format($month['pass_rate'], 1) }}%</strong></td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

    <!-- Key Insights -->
  @if(!empty($insights))
    <div class="section">
      <h2 class="section-title">Key Insights & Recommendations</h2>
      @php
        $hasLimitedData = false;
        foreach($insights as $insight) {
          if(isset($insight['title']) && strpos($insight['title'], 'Limited Data Available') !== false) {
            $hasLimitedData = true;
            break;
          }
        }
      @endphp
      <div class="insights-container {{ $hasLimitedData ? 'no-background' : '' }}">
    @foreach($insights as $insight)
        <div class="insight-card">
      <div class="insight-title">{{ $insight['title'] }}</div>
          <div class="insight-description">{{ $insight['description'] }}</div>
          <div class="insight-recommendation">
            <span class="recommendation-label">Recommendation:</span> {{ $insight['recommendation'] }}
          </div>
    </div>
    @endforeach
      </div>
  </div>
  @endif

    <!-- Top Performers -->
  @if(!empty($analytics['top_performers']) && count($analytics['top_performers']) > 0)
  <div class="section">
      <h2 class="section-title">Top 5 Performers</h2>
      <table class="data-table">
      <thead>
        <tr>
            <th>Rank</th>
          <th>Employee Name</th>
          <th>Department</th>
            <th class="text-center">Score</th>
            <th class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
          @foreach($analytics['top_performers'] as $index => $perf)
        <tr>
            <td><strong>#{{ $index + 1 }}</strong></td>
            <td><strong>{{ $perf['employee_name'] }}</strong></td>
          <td>{{ $perf['department'] }}</td>
            <td class="text-center"><strong>{{ number_format($perf['percentage_score'], 1) }}%</strong></td>
          <td class="text-center">
            @if($perf['is_passed'])
                <span class="status-pass">PASSED</span>
            @else
                <span class="status-fail">NEEDS IMPROVEMENT</span>
            @endif
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

    <!-- Bottom Performers -->
  @if(!empty($analytics['bottom_performers']) && count($analytics['bottom_performers']) > 0)
  <div class="section">
      <h2 class="section-title">Areas Requiring Attention</h2>
      <table class="data-table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Department</th>
            <th class="text-center">Score</th>
            <th class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['bottom_performers'] as $perf)
        <tr>
            <td><strong>{{ $perf['employee_name'] }}</strong></td>
          <td>{{ $perf['department'] }}</td>
            <td class="text-center"><strong>{{ number_format($perf['percentage_score'], 1) }}%</strong></td>
          <td class="text-center">
            @if($perf['is_passed'])
                <span class="status-pass">PASSED</span>
            @else
                <span class="status-fail">NEEDS IMPROVEMENT</span>
            @endif
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif
  </div>

  <!-- Detailed Records Start on New Page -->
  <div class="page-break"></div>

  <div class="content">
  @if(!empty($evaluations) && count($evaluations) > 0)
      <h2 class="section-title">Detailed Evaluation Records</h2>
      
    @foreach($evaluations as $index => $evaluation)
      @if($index > 0 && $index % 10 == 0)
        <div class="page-break"></div>
      @endif
      
        <div class="detail-card">
          <div class="detail-header">
            <div class="detail-header-title">Employee Evaluation #{{ $index + 1 }}</div>
          </div>
          
          <div class="detail-body">
            <table class="detail-table">
              <tr>
                <td class="detail-label">Employee Name:</td>
                <td class="detail-value">{{ $evaluation['employee_name'] }}</td>
                <td class="detail-label">Employee ID:</td>
                <td class="detail-value">{{ $evaluation['employee_id_number'] }}</td>
            </tr>
            <tr>
                <td class="detail-label">Department:</td>
                <td class="detail-value">{{ $evaluation['department'] }}</td>
                <td class="detail-label">Position:</td>
                <td class="detail-value">{{ $evaluation['position'] }}</td>
            </tr>
            <tr>
                <td class="detail-label">Evaluation Period:</td>
                <td class="detail-value">{{ Carbon\Carbon::parse($evaluation['evaluation_period_start'])->format('M d, Y') }} - {{ Carbon\Carbon::parse($evaluation['evaluation_period_end'])->format('M d, Y') }}</td>
                <td class="detail-label">Submitted:</td>
                <td class="detail-value">{{ $evaluation['submitted_at'] ? Carbon\Carbon::parse($evaluation['submitted_at'])->format('M d, Y H:i') : 'N/A' }}</td>
            </tr>
            <tr>
                <td class="detail-label">Evaluated By:</td>
                <td class="detail-value">{{ $evaluation['manager_name'] }}</td>
                <td class="detail-label">Form Used:</td>
                <td class="detail-value">{{ $evaluation['form_title'] ?? 'N/A' }}</td>
            </tr>
        </table>

            <div class="score-section">
              <table class="score-table">
                <tr>
                  <td class="detail-label">Total Score:</td>
                  <td class="detail-value"><strong>{{ $evaluation['total_score'] }}</strong></td>
                  <td class="detail-label">Average Score:</td>
                  <td class="detail-value"><strong>{{ number_format($evaluation['average_score'], 2) }}</strong></td>
            </tr>
            <tr>
                  <td class="detail-label">Percentage:</td>
                  <td class="detail-value"><strong>{{ number_format($evaluation['percentage_score'], 1) }}%</strong></td>
                  <td class="detail-label">Status:</td>
                  <td class="detail-value">
                @if($evaluation['is_passed'])
                      <span class="status-pass">PASSED</span>
                @else
                      <span class="status-fail">NEEDS IMPROVEMENT</span>
                @endif
              </td>
            </tr>
            <tr>
                  <td class="detail-label">Pass Threshold:</td>
                  <td class="detail-value">{{ $evaluation['passing_threshold'] }}</td>
              <td></td>
              <td></td>
            </tr>
        </table>
            </div>

        @if(!empty($evaluation['general_comments']))
            <div class="comments-section">
              <div class="comments-label">General Comments:</div>
              <div class="comments-text">{{ $evaluation['general_comments'] }}</div>
        </div>
        @endif
      </div>
        </div>
    @endforeach
  @else
      <div class="detail-card">
        <div class="detail-body">
          <p style="text-align: center; color: #6c757d; padding: 15px;">
            <strong>No evaluation results found for the selected criteria.</strong>
          </p>
        </div>
    </div>
  @endif
  </div>
</body>
</html>