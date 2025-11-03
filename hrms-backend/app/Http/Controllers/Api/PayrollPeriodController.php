<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PayrollPeriodController extends Controller
{
    /**
     * Display a listing of payroll periods
     */
    public function index(): JsonResponse
    {
        $periods = PayrollPeriod::with(['payrolls' => function($query) {
                $query->with(['employee:id,first_name,last_name,position']);
            }])
            ->orderBy('start_date', 'desc')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $periods
        ]);
    }

    /**
     * Store a newly created payroll period
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'description' => 'nullable|string'
        ]);

        $period = PayrollPeriod::create([
            'name' => $validated['name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'description' => $validated['description'] ?? null,
            'status' => 'active'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll period created successfully',
            'data' => $period
        ], 201);
    }

    /**
     * Display the specified payroll period
     */
    public function show(PayrollPeriod $payrollPeriod): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $payrollPeriod->load('payrolls')
        ]);
    }

    /**
     * Update the specified payroll period
     */
    public function update(Request $request, PayrollPeriod $payrollPeriod): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after:start_date',
            'status' => 'sometimes|in:active,closed',
            'description' => 'nullable|string'
        ]);

        $payrollPeriod->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Payroll period updated successfully',
            'data' => $payrollPeriod
        ]);
    }

    /**
     * Remove the specified payroll period
     */
    public function destroy(PayrollPeriod $payrollPeriod): JsonResponse
    {
        // Check if period has payrolls
        if ($payrollPeriod->payrolls()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete payroll period with existing payrolls'
            ], 400);
        }

        $payrollPeriod->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll period deleted successfully'
        ]);
    }
}

