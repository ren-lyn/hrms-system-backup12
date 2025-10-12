<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\PayrollPeriod;
use App\Models\EmployeeProfile;
use App\Services\PayrollComputationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    protected $payrollService;

    public function __construct(PayrollComputationService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * Display a listing of payrolls
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payroll::with(['employee', 'payrollPeriod']);

        // Filter by period
        if ($request->has('period_start') && $request->has('period_end')) {
            $query->whereBetween('period_start', [$request->period_start, $request->period_end]);
        }

        // Filter by employee
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by employee name
        if ($request->has('search')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $payrolls = $query->paginate($request->get('per_page', 15));

        // Calculate statistics
        $statistics = $this->getPayrollStatistics($request);

        return response()->json([
            'success' => true,
            'data' => [
                'payrolls' => $payrolls->items(),
                'pagination' => [
                    'current_page' => $payrolls->currentPage(),
                    'last_page' => $payrolls->lastPage(),
                    'per_page' => $payrolls->perPage(),
                    'total' => $payrolls->total()
                ],
                'statistics' => $statistics
            ]
        ]);
    }

    /**
     * Store a newly created payroll
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employee_profiles,id',
            'payroll_period_id' => 'nullable|exists:payroll_periods,id',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'basic_salary' => 'required|numeric|min:0',
            'overtime_pay' => 'nullable|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $payroll = Payroll::create($validated);

        // Calculate payroll
        $calculatedPayroll = $this->payrollService->calculatePayroll($payroll);

        return response()->json([
            'success' => true,
            'message' => 'Payroll created successfully',
            'data' => $calculatedPayroll
        ], 201);
    }

    /**
     * Display the specified payroll
     */
    public function show(Payroll $payroll): JsonResponse
    {
        $payroll->load(['employee', 'payrollPeriod']);

        return response()->json([
            'success' => true,
            'data' => $payroll
        ]);
    }

    /**
     * Update the specified payroll
     */
    public function update(Request $request, Payroll $payroll): JsonResponse
    {
        $validated = $request->validate([
            'basic_salary' => 'sometimes|required|numeric|min:0',
            'overtime_pay' => 'nullable|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:draft,pending,processed,paid'
        ]);

        $payroll->update($validated);

        // Recalculate payroll if financial data changed
        if (isset($validated['basic_salary']) || isset($validated['overtime_pay']) || isset($validated['allowances'])) {
            $payroll = $this->payrollService->calculatePayroll($payroll);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll updated successfully',
            'data' => $payroll
        ]);
    }

    /**
     * Remove the specified payroll
     */
    public function destroy(Payroll $payroll): JsonResponse
    {
        if ($payroll->isProcessed()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete processed payroll'
            ], 422);
        }

        $payroll->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll deleted successfully'
        ]);
    }

    /**
     * Generate payroll for a period
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'payroll_period_id' => 'nullable|exists:payroll_periods,id'
        ]);

        try {
            DB::beginTransaction();

            $generatedPayrolls = $this->payrollService->generatePayrollForPeriod(
                $validated['period_start'],
                $validated['period_end'],
                $validated['payroll_period_id'] ?? null
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll generated successfully',
                'data' => [
                    'generated_count' => count($generatedPayrolls),
                    'payrolls' => $generatedPayrolls
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance summary for payroll
     */
    public function attendanceSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);
        
        $data = $this->payrollService->getAttendanceSummary($validated['period_start'], $validated['period_end']);
        
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Export payroll data
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'format' => 'required|in:excel,pdf'
        ]);

        $exportData = $this->payrollService->exportPayrollData(
            $validated['period_start'],
            $validated['period_end'],
            $validated['format']
        );

        return response()->json([
            'success' => true,
            'data' => $exportData
        ]);
    }

    /**
     * Generate payroll report
     */
    public function generateReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'format' => 'required|in:pdf,excel'
        ]);

        $reportData = $this->payrollService->generatePayrollReport(
            $validated['period_start'],
            $validated['period_end'],
            $validated['format']
        );

        return response()->json([
            'success' => true,
            'data' => $reportData
        ]);
    }

    /**
     * Get employee payslip
     */
    public function getEmployeePayslip(Request $request, $employeeId, $periodId): JsonResponse
    {
        $payroll = Payroll::with(['employee', 'payrollPeriod'])
            ->where('employee_id', $employeeId)
            ->where('id', $periodId)
            ->first();

        if (!$payroll) {
            return response()->json([
                'success' => false,
                'message' => 'Payslip not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $payroll
        ]);
    }

    /**
     * Export employee payslip
     */
    public function exportEmployeePayslip(Request $request, $employeeId, $periodId): JsonResponse
    {
        $payroll = Payroll::with(['employee', 'payrollPeriod'])
            ->where('employee_id', $employeeId)
            ->where('id', $periodId)
            ->first();

        if (!$payroll) {
            return response()->json([
                'success' => false,
                'message' => 'Payslip not found'
            ], 404);
        }

        $payslipData = $this->payrollService->exportEmployeePayslip($payroll);

        return response()->json([
            'success' => true,
            'data' => $payslipData
        ]);
    }

    /**
     * Process payroll (mark as processed)
     */
    public function process(Payroll $payroll): JsonResponse
    {
        if ($payroll->isProcessed()) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll is already processed'
            ], 422);
        }

        $payroll->update([
            'status' => 'processed',
            'processed_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll processed successfully',
            'data' => $payroll
        ]);
    }

    /**
     * Get payroll statistics
     */
    private function getPayrollStatistics(Request $request): array
    {
        $query = Payroll::query();

        // Apply same filters as main query
        if ($request->has('period_start') && $request->has('period_end')) {
            $query->whereBetween('period_start', [$request->period_start, $request->period_end]);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return [
            'total_employees' => EmployeeProfile::count(),
            'processed_payrolls' => (clone $query)->where('status', 'processed')->count(),
            'pending_payrolls' => (clone $query)->where('status', 'pending')->count(),
            'total_gross_pay' => (clone $query)->sum('gross_pay'),
            'total_deductions' => (clone $query)->sum('total_deductions'),
            'total_net_pay' => (clone $query)->sum('net_pay')
        ];
    }
}




