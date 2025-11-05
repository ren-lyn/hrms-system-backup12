<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxTitle;
use App\Models\EmployeeProfile;
use App\Models\EmployeeTaxAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TaxTitleController extends Controller
{
    /**
     * Display a listing of tax titles
     */
    public function index(Request $request): JsonResponse
    {
        $query = TaxTitle::withCount(['employees as assigned_employees_count']);

        // Filter by active status if provided
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $taxes = $query->get();

        return response()->json([
            'success' => true,
            'data' => $taxes
        ]);
    }

    /**
     * Store a newly created tax title
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:tax_titles,name',
            'rate' => 'required|numeric|min:0',
            'type' => 'required|in:fixed',
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

        $tax = TaxTitle::create([
            'name' => $request->name,
            'rate' => $request->rate,
            'type' => $request->type,
            'description' => $request->description,
            'is_active' => $request->get('is_active', true)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tax title created successfully',
            'data' => $tax
        ], 201);
    }

    /**
     * Display the specified tax title
     */
    public function show($id): JsonResponse
    {
        $tax = TaxTitle::with(['employees.user'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $tax
        ]);
    }

    /**
     * Update the specified tax title
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:tax_titles,name,' . $id,
            'rate' => 'sometimes|required|numeric|min:0',
            'type' => 'sometimes|required|in:fixed',
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

        $tax->update($request->only([
            'name', 'rate', 'type', 'description', 'is_active'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Tax title updated successfully',
            'data' => $tax->fresh()
        ]);
    }

    /**
     * Remove the specified tax title
     */
    public function destroy($id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        // Check if there are any active assignments
        $activeAssignments = EmployeeTaxAssignment::where('tax_title_id', $id)
            ->where('is_active', true)
            ->count();

        if ($activeAssignments > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete tax title with active employee assignments. Please deactivate or remove assignments first.'
            ], 422);
        }

        $tax->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax title deleted successfully'
        ]);
    }

    /**
     * Get employees assigned to a tax title
     */
    public function getAssignedEmployees($id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        $assignments = EmployeeTaxAssignment::where('tax_title_id', $id)
            ->with(['employee.user'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Assign tax title to employees
     */
    public function assignToEmployees(Request $request, $id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'required|exists:employee_profiles,id',
            'custom_rate' => 'nullable|numeric|min:0'
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
            $assignment = EmployeeTaxAssignment::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'tax_title_id' => $id
                ],
                [
                    'custom_rate' => $request->custom_rate,
                    'is_active' => true
                ]
            );

            $assignments[] = $assignment->load(['employee.user', 'taxTitle']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tax assigned to employees successfully',
            'data' => $assignments
        ]);
    }

    /**
     * Remove assignment from employees
     */
    public function removeFromEmployees(Request $request, $id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

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

        EmployeeTaxAssignment::where('tax_title_id', $id)
            ->whereIn('employee_id', $request->employee_ids)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax removed from employees successfully'
        ]);
    }

    /**
     * Update assignment (activate/deactivate or change custom rate)
     */
    public function updateAssignment(Request $request, $id, $assignmentId): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        $assignment = EmployeeTaxAssignment::where('tax_title_id', $id)
            ->findOrFail($assignmentId);

        $validator = Validator::make($request->all(), [
            'custom_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $assignment->update($request->only(['custom_rate', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Assignment updated successfully',
            'data' => $assignment->load(['employee.user', 'taxTitle'])
        ]);
    }

    /**
     * Get all available employees for assignment
     */
    public function getAvailableEmployees($id): JsonResponse
    {
        $tax = TaxTitle::findOrFail($id);

        // Get employees already assigned
        $assignedEmployeeIds = EmployeeTaxAssignment::where('tax_title_id', $id)
            ->pluck('employee_id');

        // Get all employees except those already assigned
        // Get Applicant role ID dynamically to avoid hardcoding
        $applicantRoleId = \App\Models\Role::where('name', 'Applicant')->value('id');
        
        $employees = EmployeeProfile::whereHas('user', function($query) use ($applicantRoleId) {
                $query->where('role_id', '!=', $applicantRoleId); // Exclude applicants
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

