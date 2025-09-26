<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Evaluation Result</title>
  <style>
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; font-size: 12px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    h2 { font-size: 16px; margin: 16px 0 8px; }
    .muted { color: #666; }
    .section { margin-bottom: 14px; }
    .grid { display: table; width: 100%; }
    .row { display: table-row; }
    .cell { display: table-cell; padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
    .badge-pass { background: #e6f6ea; color: #136f2d; }
    .badge-fail { background: #fdecea; color: #a71d2a; }
  </style>
</head>
<body>
  <h1>Evaluation Results</h1>
  <div class="muted">Generated on {{ now()->format('M d, Y H:i') }}</div>

  <div class="section">
    <h2>Summary</h2>
    <table class="table">
      <tr>
        <th>Form</th>
        <td>{{ optional($evaluation->evaluationForm)->title }}</td>
        <th>Submitted</th>
        <td>{{ optional($evaluation->submitted_at)->format('M d, Y H:i') }}</td>
      </tr>
      <tr>
        <th>Employee</th>
        <td>
          @php
            $emp = $evaluation->employee;
            $ep = optional($emp->employeeProfile);
            $empName = ($ep->first_name && $ep->last_name) ? trim($ep->first_name.' '.$ep->last_name) : $emp->name;
          @endphp
          {{ $empName }} (ID: {{ $ep->employee_id ?? 'N/A' }})
        </td>
        <th>Department / Position</th>
        <td>{{ $ep->department ?? 'N/A' }} / {{ $ep->position ?? 'N/A' }}</td>
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
        <th>Status</th>
        <td>
          @if($scores['is_passed'])
            <span class="badge badge-pass">PASSED</span>
          @else
            <span class="badge badge-fail">NEEDS IMPROVEMENT</span>
          @endif
        </td>
      </tr>
      <tr>
        <th>Total Score</th>
        <td>{{ $scores['total_score'] }} / {{ ($scores['total_questions'] ?? 0) * 10 }}</td>
        <th>Average</th>
        <td>{{ number_format($scores['average_score'], 2) }}</td>
      </tr>
      <tr>
        <th>Percentage</th>
        <td>{{ number_format($scores['percentage'], 2) }}%</td>
        <th>Passing Score</th>
        <td>{{ $scores['passing_score'] }}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Analysis</h2>
    <table class="table">
      <tr>
        <th>Strengths ({{ $analysis['strengths_count'] }})</th>
        <th>Areas for Improvement ({{ $analysis['weaknesses_count'] }})</th>
      </tr>
      <tr>
        <td>
          <ul>
            @foreach($analysis['strengths'] as $r)
              <li>{{ $r->question->category }} — Rating: {{ $r->rating }}/10</li>
            @endforeach
          </ul>
        </td>
        <td>
          <ul>
            @foreach($analysis['weaknesses'] as $r)
              <li>{{ $r->question->category }} — Rating: {{ $r->rating }}/10</li>
            @endforeach
          </ul>
        </td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Detailed Responses</h2>
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Category</th>
          <th>Question</th>
          <th>Rating</th>
          <th>Classification</th>
          <th>Manager Comment</th>
        </tr>
      </thead>
      <tbody>
        @foreach($evaluation->responses as $i => $response)
          <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $response->question->category }}</td>
            <td>{{ $response->question->question_text }}</td>
            <td>{{ $response->rating }}/10</td>
            <td>{{ $response->classification }}</td>
            <td>{{ $response->manager_comment ?? '—' }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  @if($evaluation->general_comments)
  <div class="section">
    <h2>General Comments</h2>
    <div>{{ $evaluation->general_comments }}</div>
  </div>
  @endif
</body>
</html>
