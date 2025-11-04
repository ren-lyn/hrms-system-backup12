<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Report</title>
  <style>
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; font-size: 9px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 10px; text-align: center; }
    h2 { font-size: 14px; margin: 12px 0 6px; }
    h3 { font-size: 12px; margin: 8px 0 4px; }
    .muted { color: #666; }
    .section { margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
    .table th { background-color: #f5f5f5; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
    .badge-pass { background: #e6f6ea; color: #136f2d; }
    .badge-fail { background: #fdecea; color: #a71d2a; }
    .header-info { margin-bottom: 10px; }
    .header-info table { width: 100%; border: none; }
    .header-info table td { border: none; padding: 2px 0; }
    .page-break { page-break-before: always; }
    .statistics { background-color: #f9f9f9; padding: 8px; border: 1px solid #ddd; margin-bottom: 10px; }
    .statistics table { width: 100%; border: none; }
    .statistics table td { border: none; padding: 3px 5px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .insights { background-color: #e8f4fd; padding: 8px; border-left: 4px solid #0066cc; margin-bottom: 10px; }
    .insight-item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #ccc; }
    .insight-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .insight-title { font-weight: bold; color: #0066cc; }
    .recommendation { font-style: italic; color: #333; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Performance Evaluation Report</h1>
  
  <div class="header-info">
    <table>
      <tr>
        <td><strong>Generated on:</strong> {{ $generated_at->format('M d, Y H:i') }}</td>
      </tr>
      <tr>
        <td><strong>Period:</strong> {{ Carbon\Carbon::parse($filters['start_date'])->format('M d, Y') }} - {{ Carbon\Carbon::parse($filters['end_date'])->format('M d, Y') }}</td>
      </tr>
      @if(!empty($filters['department']))
      <tr>
        <td><strong>Department:</strong> {{ $filters['department'] }}</td>
      </tr>
      @endif
      @if(!empty($filters['position']))
      <tr>
        <td><strong>Position:</strong> {{ $filters['position'] }}</td>
      </tr>
      @endif
      @if(!empty($filters['status']) && $filters['status'] !== 'all')
      <tr>
        <td><strong>Status:</strong> {{ ucfirst($filters['status']) }}</td>
      </tr>
      @endif
    </table>
  </div>

  <div class="statistics">
    <h2>Summary Statistics</h2>
    <table>
      <tr>
        <td><strong>Total Evaluations:</strong></td>
        <td class="text-right">{{ $statistics['total_evaluations'] }}</td>
        <td width="30"></td>
        <td><strong>Average Percentage:</strong></td>
        <td class="text-right">{{ number_format($statistics['average_percentage'], 2) }}%</td>
      </tr>
      <tr>
        <td><strong>Passed:</strong></td>
        <td class="text-right">{{ $statistics['passed_count'] }}</td>
        <td></td>
        <td><strong>Pass Rate:</strong></td>
        <td class="text-right">{{ number_format($statistics['pass_rate'], 2) }}%</td>
      </tr>
      <tr>
        <td><strong>Failed:</strong></td>
        <td class="text-right">{{ $statistics['failed_count'] }}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </table>
  </div>

  @if(!empty($analytics['by_department']) && count($analytics['by_department']) > 1)
  <div class="section">
    <h2>Performance by Department</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Department</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Average Score</th>
          <th>Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_department'] as $dept)
        <tr>
          <td>{{ $dept['department'] }}</td>
          <td class="text-center">{{ $dept['total'] }}</td>
          <td class="text-center">{{ $dept['passed'] }}</td>
          <td class="text-center">{{ $dept['failed'] }}</td>
          <td class="text-center">{{ number_format($dept['average_score'], 2) }}%</td>
          <td class="text-center">{{ number_format($dept['pass_rate'], 2) }}%</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

  @if(!empty($analytics['by_position']) && count($analytics['by_position']) > 1)
  <div class="section">
    <h2>Performance by Position</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Position</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Average Score</th>
          <th>Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_position'] as $pos)
        <tr>
          <td>{{ $pos['position'] }}</td>
          <td class="text-center">{{ $pos['total'] }}</td>
          <td class="text-center">{{ $pos['passed'] }}</td>
          <td class="text-center">{{ $pos['failed'] }}</td>
          <td class="text-center">{{ number_format($pos['average_score'], 2) }}%</td>
          <td class="text-center">{{ number_format($pos['pass_rate'], 2) }}%</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

  @if(!empty($analytics['by_month']) && count($analytics['by_month']) > 1)
  <div class="section">
    <h2>Performance Trends Over Time</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Period</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Average Score</th>
          <th>Pass Rate</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['by_month'] as $month)
        <tr>
          <td>{{ $month['month'] }}</td>
          <td class="text-center">{{ $month['total'] }}</td>
          <td class="text-center">{{ $month['passed'] }}</td>
          <td class="text-center">{{ $month['failed'] }}</td>
          <td class="text-center">{{ number_format($month['average_score'], 2) }}%</td>
          <td class="text-center">{{ number_format($month['pass_rate'], 2) }}%</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

  @if(!empty($insights))
  <div class="insights">
    <h2>Key Insights & Recommendations</h2>
    @foreach($insights as $insight)
    <div class="insight-item">
      <div class="insight-title">{{ $insight['title'] }}</div>
      <div>{{ $insight['description'] }}</div>
      <div class="recommendation"><strong>Recommendation:</strong> {{ $insight['recommendation'] }}</div>
    </div>
    @endforeach
  </div>
  @endif

  @if(!empty($analytics['top_performers']) && count($analytics['top_performers']) > 0)
  <div class="section">
    <h2>Top 5 Performers</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Department</th>
          <th>Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['top_performers'] as $perf)
        <tr>
          <td>{{ $perf['employee_name'] }}</td>
          <td>{{ $perf['department'] }}</td>
          <td class="text-center">{{ number_format($perf['percentage_score'], 2) }}%</td>
          <td class="text-center">
            @if($perf['is_passed'])
              <span class="badge badge-pass">PASSED</span>
            @else
              <span class="badge badge-fail">FAILED</span>
            @endif
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

  @if(!empty($analytics['bottom_performers']) && count($analytics['bottom_performers']) > 0)
  <div class="section">
    <h2>Bottom 5 Performers (Need Attention)</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Employee Name</th>
          <th>Department</th>
          <th>Score</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @foreach($analytics['bottom_performers'] as $perf)
        <tr>
          <td>{{ $perf['employee_name'] }}</td>
          <td>{{ $perf['department'] }}</td>
          <td class="text-center">{{ number_format($perf['percentage_score'], 2) }}%</td>
          <td class="text-center">
            @if($perf['is_passed'])
              <span class="badge badge-pass">PASSED</span>
            @else
              <span class="badge badge-fail">FAILED</span>
            @endif
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif

  <div class="page-break"></div>

  @if(!empty($evaluations) && count($evaluations) > 0)
    <h2>Detailed Evaluation Records</h2>
    @foreach($evaluations as $index => $evaluation)
      @if($index > 0 && $index % 10 == 0)
        <div class="page-break"></div>
      @endif
      
      <div class="section">
        <table class="table">
          <thead>
            <tr>
              <th colspan="4">Employee Information</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Employee Name:</strong></td>
              <td>{{ $evaluation['employee_name'] }}</td>
              <td><strong>Employee ID:</strong></td>
              <td>{{ $evaluation['employee_id_number'] }}</td>
            </tr>
            <tr>
              <td><strong>Department:</strong></td>
              <td>{{ $evaluation['department'] }}</td>
              <td><strong>Position:</strong></td>
              <td>{{ $evaluation['position'] }}</td>
            </tr>
            <tr>
              <td><strong>Evaluation Period:</strong></td>
              <td>{{ Carbon\Carbon::parse($evaluation['evaluation_period_start'])->format('M d, Y') }} - {{ Carbon\Carbon::parse($evaluation['evaluation_period_end'])->format('M d, Y') }}</td>
              <td><strong>Submitted At:</strong></td>
              <td>{{ $evaluation['submitted_at'] ? Carbon\Carbon::parse($evaluation['submitted_at'])->format('M d, Y H:i') : 'N/A' }}</td>
            </tr>
            <tr>
              <td><strong>Evaluated By:</strong></td>
              <td>{{ $evaluation['manager_name'] }}</td>
              <td><strong>Form:</strong></td>
              <td>{{ $evaluation['form_title'] ?? 'N/A' }}</td>
            </tr>
          </tbody>
        </table>

        <table class="table">
          <thead>
            <tr>
              <th colspan="4">Evaluation Scores</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total Score:</strong></td>
              <td>{{ $evaluation['total_score'] }}</td>
              <td><strong>Average Score:</strong></td>
              <td>{{ number_format($evaluation['average_score'], 2) }}</td>
            </tr>
            <tr>
              <td><strong>Percentage:</strong></td>
              <td>{{ number_format($evaluation['percentage_score'], 2) }}%</td>
              <td><strong>Status:</strong></td>
              <td>
                @if($evaluation['is_passed'])
                  <span class="badge badge-pass">PASSED</span>
                @else
                  <span class="badge badge-fail">NEEDS IMPROVEMENT</span>
                @endif
              </td>
            </tr>
            <tr>
              <td><strong>Passing Threshold:</strong></td>
              <td>{{ $evaluation['passing_threshold'] }}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        @if(!empty($evaluation['general_comments']))
        <div class="section">
          <strong>General Comments:</strong><br>
          {{ $evaluation['general_comments'] }}
        </div>
        @endif
      </div>

      @if($index < count($evaluations) - 1)
        <hr style="margin: 10px 0; border: none; border-top: 2px solid #ddd;">
      @endif
    @endforeach
  @else
    <div class="section">
      <p><strong>No evaluation results found for the selected criteria.</strong></p>
    </div>
  @endif
</body>
</html>
