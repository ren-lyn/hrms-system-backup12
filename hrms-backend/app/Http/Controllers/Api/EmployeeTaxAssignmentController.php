<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\TaxTitle;
use App\Models\EmployeeTaxAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmployeeTaxAssignmentController extends Controller
{
    /**
     * Display a listing of employee tax assignments
     */
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeTaxAssignment::with(['employee', 'taxTitle']);

        // Filter by employee
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by tax title
        if ($request->has('tax_title_id')) {
            $query->where('tax_title_id', $request->tax_title_id);
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
     * Store a newly created employee tax assignment
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employee_profiles,id',
            'tax_title_id' => 'required|exists:tax_titles,id',
            'custom_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        // Check if assignment already exists
        $existingAssignment = EmployeeTaxAssignment::where('employee_id', $validated['employee_id'])
            ->where('tax_title_id', $validated['tax_title_id'])
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'success' => false,
                'message' => 'Tax assignment already exists for this employee'
            ], 422);
        }

        $assignment = EmployeeTaxAssignment::create($validated);

        $assignment->load(['employee', 'taxTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Tax assignment created successfully',
            'data' => $assignment
        ], 201);
    }

    /**
     * Display the specified employee tax assignment
     */
    public function show(EmployeeTaxAssignment $employeeTaxAssignment): JsonResponse
    {
        $employeeTaxAssignment->load(['employee', 'taxTitle']);

        return response()->json([
            'success' => true,
            'data' => $employeeTaxAssignment
        ]);
    }

    /**
     * Update the specified employee tax assignment
     */
    public function update(Request $request, EmployeeTaxAssignment $employeeTaxAssignment): JsonResponse
    {
        $validated = $request->validate([
            'custom_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean'
        ]);

        $employeeTaxAssignment->update($validated);

        $employeeTaxAssignment->load(['employee', 'taxTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Tax assignment updated successfully',
            'data' => $employeeTaxAssignment
        ]);
    }

    /**
     * Remove the specified employee tax assignment
     */
    public function destroy(EmployeeTaxAssignment $employeeTaxAssignment): JsonResponse
    {
        $employeeTaxAssignment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax assignment removed successfully'
        ]);
    }

    /**
     * Get tax assignments for a specific employee
     */
    public function getEmployeeTaxes(EmployeeProfile $employee): JsonResponse
    {
        $assignments = EmployeeTaxAssignment::with('taxTitle')
            ->where('employee_id', $employee->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Get employees assigned to a specific tax title
     */
    public function getTaxEmployees(TaxTitle $taxTitle): JsonResponse
    {
        $assignments = EmployeeTaxAssignment::with('employee')
            ->where('tax_title_id', $taxTitle->id)
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
    public function toggle(EmployeeTaxAssignment $employeeTaxAssignment): JsonResponse
    {
        $employeeTaxAssignment->update(['is_active' => !$employeeTaxAssignment->is_active]);

        $employeeTaxAssignment->load(['employee', 'taxTitle']);

        return response()->json([
            'success' => true,
            'message' => 'Tax assignment status updated successfully',
            'data' => $employeeTaxAssignment
        ]);
    }
}
