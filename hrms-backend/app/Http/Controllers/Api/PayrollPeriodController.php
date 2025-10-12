<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class PayrollPeriodController extends Controller
{
    /**
     * Display a listing of payroll periods
     */
    public function index(Request $request): JsonResponse
    {
        $query = PayrollPeriod::query();

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by name
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $periods = $query->paginate($request->get('per_page', 15));

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
            'status' => ['required', Rule::in(['active', 'inactive', 'closed'])],
            'description' => 'nullable|string'
        ]);

        $period = PayrollPeriod::create($validated);

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
        $payrollPeriod->load('payrolls.employee');

        return response()->json([
            'success' => true,
            'data' => $payrollPeriod
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
            'status' => ['sometimes', 'required', Rule::in(['active', 'inactive', 'closed'])],
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
            ], 422);
        }

        $payrollPeriod->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll period deleted successfully'
        ]);
    }

    /**
     * Get active payroll periods
     */
    public function active(): JsonResponse
    {
        $periods = PayrollPeriod::active()->orderBy('start_date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $periods
        ]);
    }

    /**
     * Get current payroll period
     */
    public function current(): JsonResponse
    {
        $currentDate = now()->toDateString();
        
        $period = PayrollPeriod::where('start_date', '<=', $currentDate)
            ->where('end_date', '>=', $currentDate)
            ->where('status', 'active')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $period
        ]);
    }
}
