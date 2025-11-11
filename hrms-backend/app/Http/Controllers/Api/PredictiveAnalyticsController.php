<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PredictiveAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PredictiveAnalyticsController extends Controller
{
    protected $analyticsService;

    public function __construct(PredictiveAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get predictive turnover analytics
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $timeframe = $request->input('timeframe', '3months');
            $department = $request->input('department', 'all');
            $startDate = $request->input('startDate');
            $endDate = $request->input('endDate');

            $result = $this->analyticsService->calculateTurnoverRisk($timeframe, $department, $startDate, $endDate);
            $data = $result['employees'];
            $dateRange = $result['dateRange'];

            // Calculate summary statistics
            $totalEmployees = count($data);
            $highRiskCount = count(array_filter($data, fn($emp) => $emp['riskLevel'] === 'high'));
            $mediumRiskCount = count(array_filter($data, fn($emp) => $emp['riskLevel'] === 'medium'));
            $lowRiskCount = count(array_filter($data, fn($emp) => $emp['riskLevel'] === 'low'));

            return response()->json([
                'success' => true,
                'data' => $data,
                'dateRange' => $dateRange,
                'summary' => [
                    'totalEmployees' => $totalEmployees,
                    'highRisk' => $highRiskCount,
                    'mediumRisk' => $mediumRiskCount,
                    'lowRisk' => $lowRiskCount,
                ],
                'filters' => [
                    'timeframe' => $timeframe,
                    'department' => $department,
                    'startDate' => $startDate,
                    'endDate' => $endDate,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve predictive analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


