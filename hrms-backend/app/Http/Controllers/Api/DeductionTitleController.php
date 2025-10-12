<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeductionTitle;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class DeductionTitleController extends Controller
{
    /**
     * Display a listing of deduction titles
     */
    public function index(Request $request): JsonResponse
    {
        $query = DeductionTitle::query();

        // Filter by active status
        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Search by name
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Sort
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $deductionTitles = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $deductionTitles
        ]);
    }

    /**
     * Store a newly created deduction title
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:deduction_titles,name',
            'amount' => 'required|numeric|min:0',
            'type' => ['required', Rule::in(['fixed', 'percentage'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $deductionTitle = DeductionTitle::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Deduction title created successfully',
            'data' => $deductionTitle
        ], 201);
    }

    /**
     * Display the specified deduction title
     */
    public function show(DeductionTitle $deductionTitle): JsonResponse
    {
        $deductionTitle->load('employees');

        return response()->json([
            'success' => true,
            'data' => $deductionTitle
        ]);
    }

    /**
     * Update the specified deduction title
     */
    public function update(Request $request, DeductionTitle $deductionTitle): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:deduction_titles,name,' . $deductionTitle->id,
            'amount' => 'sometimes|required|numeric|min:0',
            'type' => ['sometimes', 'required', Rule::in(['fixed', 'percentage'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $deductionTitle->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Deduction title updated successfully',
            'data' => $deductionTitle
        ]);
    }

    /**
     * Remove the specified deduction title
     */
    public function destroy(DeductionTitle $deductionTitle): JsonResponse
    {
        // Check if deduction title has employee assignments
        if ($deductionTitle->employees()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete deduction title with employee assignments'
            ], 422);
        }

        $deductionTitle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Deduction title deleted successfully'
        ]);
    }

    /**
     * Get active deduction titles
     */
    public function active(): JsonResponse
    {
        $deductionTitles = DeductionTitle::active()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $deductionTitles
        ]);
    }

    /**
     * Toggle deduction title active status
     */
    public function toggle(DeductionTitle $deductionTitle): JsonResponse
    {
        $deductionTitle->update(['is_active' => !$deductionTitle->is_active]);

        return response()->json([
            'success' => true,
            'message' => 'Deduction title status updated successfully',
            'data' => $deductionTitle
        ]);
    }
}
