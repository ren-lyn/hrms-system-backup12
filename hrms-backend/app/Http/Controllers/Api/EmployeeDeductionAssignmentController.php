<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\DeductionTitle;
use App\Models\EmployeeDeductionAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmployeeDeductionAssignmentController extends Controller
{
    /**
     * Display a listing of employee deduction assignments
     */
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeDeductionAssignment::with(['employee', 'deductionTitle']);

        // Filter by employee
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by deduction title
        if ($request->has('deduction_title_id')) {
            $query->where('deduction_title_id', $request->deduction_title_id);
        }

        // Filter by active status
        if ($request->has('active_only') && $request->active_only) {
            $query->where('is_active', true);
        }

        $assignments = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Store a newly created employee deduction assignment
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employee_profiles,id',
            'deduction_title_id' => 'required|exists:deduction_titles,id',
            'custom_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        // Check if assignment already exists
        $existingAssignment = EmployeeDeductionAssignment::where('employee_id', $validated['employee_id'])
            ->where('deduction_title_id', $validated['deduction_title_id'])
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'success' => false,
                'message' => 'Deduction assignment already exists for this employee'
            ], 422);
        }

        $assignment = EmployeeDeductionAssignment::create($validated);

        $assignment->load(['employee', 'deductionTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Deduction assignment created successfully',
            'data' => $assignment
        ], 201);
    }

    /**
     * Display the specified employee deduction assignment
     */
    public function show(EmployeeDeductionAssignment $employeeDeductionAssignment): JsonResponse
    {
        $employeeDeductionAssignment->load(['employee', 'deductionTitle']);

        return response()->json([
            'success' => true,
            'data' => $employeeDeductionAssignment
        ]);
    }

    /**
     * Update the specified employee deduction assignment
     */
    public function update(Request $request, EmployeeDeductionAssignment $employeeDeductionAssignment): JsonResponse
    {
        $validated = $request->validate([
            'custom_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        $employeeDeductionAssignment->update($validated);

        $employeeDeductionAssignment->load(['employee', 'deductionTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Deduction assignment updated successfully',
            'data' => $employeeDeductionAssignment
        ]);
    }

    /**
     * Remove the specified employee deduction assignment
     */
    public function destroy(EmployeeDeductionAssignment $employeeDeductionAssignment): JsonResponse
    {
        $employeeDeductionAssignment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deduction assignment removed successfully'
        ]);
    }

    /**
     * Get deduction assignments for a specific employee
     */
    public function getEmployeeDeductions(EmployeeProfile $employee): JsonResponse
    {
        $assignments = EmployeeDeductionAssignment::with('deductionTitle')
            ->where('employee_id', $employee->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Get employees assigned to a specific deduction title
     */
    public function getDeductionEmployees(DeductionTitle $deductionTitle): JsonResponse
    {
        $assignments = EmployeeDeductionAssignment::with('employee')
            ->where('deduction_title_id', $deductionTitle->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Toggle assignment active status
     */
    public function toggle(EmployeeDeductionAssignment $employeeDeductionAssignment): JsonResponse
    {
        $employeeDeductionAssignment->update(['is_active' => !$employeeDeductionAssignment->is_active]);

        $employeeDeductionAssignment->load(['employee', 'deductionTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Deduction assignment status updated successfully',
            'data' => $employeeDeductionAssignment
        ]);
    }
}
