<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeductionTitle;
use App\Models\EmployeeProfile;
use App\Models\EmployeeDeductionAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class DeductionTitleController extends Controller
{
    /**
     * Display a listing of deduction titles
     */
    public function index(Request $request): JsonResponse
    {
        $query = DeductionTitle::withCount(['employees as assigned_employees_count']);

        // Filter by active status if provided
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $deductions = $query->get();

        return response()->json([
            'success' => true,
            'data' => $deductions
        ]);
    }

    /**
     * Store a newly created deduction title
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:deduction_titles,name',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:fixed,percentage',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $deduction = DeductionTitle::create([
            'name' => $request->name,
            'amount' => $request->amount,
            'type' => $request->type,
            'description' => $request->description,
            'is_active' => $request->get('is_active', true)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Deduction title created successfully',
            'data' => $deduction
        ], 201);
    }

    /**
     * Display the specified deduction title
     */
    public function show($id): JsonResponse
    {
        $deduction = DeductionTitle::with(['employees.user'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $deduction
        ]);
    }

    /**
     * Update the specified deduction title
     */
    public function update(Request $request, $id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:deduction_titles,name,' . $id,
            'amount' => 'sometimes|required|numeric|min:0',
            'type' => 'sometimes|required|in:fixed,percentage',
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $deduction->update($request->only([
            'name', 'amount', 'type', 'description', 'is_active'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Deduction title updated successfully',
            'data' => $deduction->fresh()
        ]);
    }

    /**
     * Remove the specified deduction title
     */
    public function destroy($id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        // Check if there are any active assignments
        $activeAssignments = EmployeeDeductionAssignment::where('deduction_title_id', $id)
            ->where('is_active', true)
            ->count();

        if ($activeAssignments > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete deduction title with active employee assignments. Please deactivate or remove assignments first.'
            ], 422);
        }

        $deduction->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deduction title deleted successfully'
        ]);
    }

    /**
     * Get employees assigned to a deduction title
     */
    public function getAssignedEmployees($id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        $assignments = EmployeeDeductionAssignment::where('deduction_title_id', $id)
            ->with(['employee.user'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Assign deduction title to employees
     */
    public function assignToEmployees(Request $request, $id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'required|exists:employee_profiles,id',
            'custom_amount' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $assignments = [];
        foreach ($request->employee_ids as $employeeId) {
            $assignment = EmployeeDeductionAssignment::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'deduction_title_id' => $id
                ],
                [
                    'custom_amount' => $request->custom_amount,
                    'is_active' => true
                ]
            );

            $assignments[] = $assignment->load(['employee.user', 'deductionTitle']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Deduction assigned to employees successfully',
            'data' => $assignments
        ]);
    }

    /**
     * Remove assignment from employees
     */
    public function removeFromEmployees(Request $request, $id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'required|exists:employee_profiles,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        EmployeeDeductionAssignment::where('deduction_title_id', $id)
            ->whereIn('employee_id', $request->employee_ids)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deduction removed from employees successfully'
        ]);
    }

    /**
     * Update assignment (activate/deactivate or change custom amount)
     */
    public function updateAssignment(Request $request, $id, $assignmentId): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        $assignment = EmployeeDeductionAssignment::where('deduction_title_id', $id)
            ->findOrFail($assignmentId);

        $validator = Validator::make($request->all(), [
            'custom_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $assignment->update($request->only(['custom_amount', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Assignment updated successfully',
            'data' => $assignment->load(['employee.user', 'deductionTitle'])
        ]);
    }

    /**
     * Get all available employees for assignment
     */
    public function getAvailableEmployees($id): JsonResponse
    {
        $deduction = DeductionTitle::findOrFail($id);

        // Get employees already assigned
        $assignedEmployeeIds = EmployeeDeductionAssignment::where('deduction_title_id', $id)
            ->pluck('employee_id');

        // Get all employees except those already assigned
        $employees = EmployeeProfile::whereHas('user', function($query) {
                $query->where('role_id', '!=', 5); // Exclude applicants
            })
            ->whereNotIn('id', $assignedEmployeeIds)
            ->with('user')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }
}

