## Predictive Turnover Analytics – Computation Guide

This document gives HR teams and developers a concise reference for how the Predictive Turnover Analytics module derives risk scores, insights, and UI breakdowns.

---

### 1. Data Pipeline

1. **Frontend request**  
   `PredictiveTurnoverAnalytics` issues `GET /predictive-analytics` with timeframe, department (optional), and optional custom date range.

2. **Backend service**  
   `PredictiveAnalyticsService` (Laravel) handles the request:
   - Fetches active employees.
   - For each employee, gathers:
     - Attendance records for the requested period.
     - Performance evaluations in the period (or most recent if none).
   - Computes metrics and risk scores (see sections below).
   - Returns employees sorted descending by risk; includes deep breakdown data used in the UI.

3. **Frontend rendering**
   - Employees are resorted client-side so risk level priority is `high → medium → low`.
   - Modal tabs consume the detailed metrics to show attendance, performance, risk factors, and recommendations.

---

### 2. Attendance Metrics

We convert raw attendance behaviour into a 0–100 “raw penalty,” then apply a 40% weight.

| Component | Formula | Rationale |
|-----------|---------|-----------|
| Attendance rate gap | `(100 − attendanceRate) × 0.3` | Missing 1% of shifts translates to 0.3 points. |
| Late frequency | `min(lateRate × 2, 30)` | Tardiness hurts productivity but less than absence; doubled weight capped at 30. |
| Absence frequency | `min(absentRate × 3, 30)` | Absences are costlier than lateness, hence ×3 with the same cap. |
| Late trend | `min(max(lateTrend, 0) × 0.5, 10)` | Positive (worsening) trend adds up to 10 points. |
| Absence trend | `min(max(absentTrend, 0) × 0.5, 10)` | Same logic for absences. |

**Trend calculation**  
`trend = ((recentRate − earlierRate) ÷ earlierRate) × 100`  
If earlier = 5% and recent = 10%, trend = 100% (penalty 100 × 0.5 = 50, capped to 10).

**Weighted attendance contribution**  
`attendanceWeighted = attendanceRaw × 0.40`

Example (from the Overview tab):
```
(100 − 91) × 0.3 = 2.7
18% late × 2 = 30
9% absent × 3 = 27
Trend +10% × 0.5 = 5
Total raw = 64.7
Weighted = 64.7 × 0.40 = 25.9 pts
```

---

### 3. Performance Metrics

Converted similarly to a 0–100 penalty, then weighted 40%.

| Component | Formula | Notes |
|-----------|---------|-------|
| Score gap | `max(100 − averageScore, 0)` | Evaluations return a percentage; lower scores produce higher penalties. |
| Trend decline | `min(max(−performanceTrend, 0) × 2, 20)` | Only negative trend (worsening) adds points. |
| Recency | `+15` if no evaluation; `+10` if last evaluation older than 180 days. | Ensures stale performance data is flagged. |

Weighted contribution:  
`performanceWeighted = performanceRaw × 0.40`

Example:
```
averageScore = 84%  → 16
performanceTrend = −5% → 10
last evaluation 200 days ago → +10
Total raw = 36
Weighted = 36 × 0.40 = 14.4 pts
```

---

### 4. Risk Factors

Each flagged factor adds a flat 5 raw points (capped at 100) before applying a 20% weight.

Common flags include:
- High frequency of late arrivals
- Absences increased > threshold
- No evaluation in last 6 months
- No recent evaluation on record

Formula:
```
factorRaw = min(numberOfFlags × 5, 100)
factorWeighted = factorRaw × 0.20
```

Example:
```
2 flags × 5 = 10 raw
Weighted = 10 × 0.20 = 2 pts
```

---

### 5. Risk Score Summary

Total risk score is the sum of weighted contributions (capped at 100).

```
finalScore = attendanceWeighted
           + performanceWeighted
           + factorWeighted
```

Risk levels:
- `High` ≥ 70
- `Medium` ≥ 40 and < 70
- `Low` < 40

Returned payload includes:
```json
{
  "riskScore": 43.6,
  "riskLevel": "medium",
  "riskBreakdown": {
     "score": 43.6,
     "components": {
        "attendance": {
           "raw": 64.7,
           "weighted": 25.9,
           "weight": 0.40,
           "items": [...]
        },
        "performance": {...},
        "factors": {...}
     }
  },
  "riskInsights": [...],
  ...
}
```

Those objects feed the Attendance, Performance, and Risk Factors tabs.

---

### 6. Modal Tabs Reference

1. **Overview** – describes weights and formulas (this doc’s summary).
2. **Attendance** – shows metrics, insights, and a table of raw vs. weighted penalties.
3. **Performance** – same style for performance.
4. **Risk Factors** – lists flag-based penalties and the risk score breakdown table.
5. **Recommendations** – actionable guidance generated from risk level and factors.

---

### 7. Extending the Model

To change weights or penalty formulas:
1. Update `calculateRiskScore()` in `PredictiveAnalyticsService`.
2. Adjust insight text if necessary (`buildRiskInsights()`).
3. Update the Overview tab text so HR staff know the new logic.

Keep penalties bounded (0–100 per dimension) to preserve the simple weighted-sum structure.



