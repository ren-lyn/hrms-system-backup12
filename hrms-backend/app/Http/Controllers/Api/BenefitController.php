<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Benefit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class BenefitController extends Controller
{
    /**
     * Display a listing of benefits
     */
    public function index(Request $request): JsonResponse
    {
        $query = Benefit::query();

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

        $benefits = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $benefits
        ]);
    }

    /**
     * Store a newly created benefit
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:benefits,name',
            'amount' => 'required|numeric|min:0',
            'type' => ['required', Rule::in(['fixed', 'percentage'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $benefit = Benefit::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Benefit created successfully',
            'data' => $benefit
        ], 201);
    }

    /**
     * Display the specified benefit
     */
    public function show(Benefit $benefit): JsonResponse
    {
        $benefit->load('employees');

        return response()->json([
            'success' => true,
            'data' => $benefit
        ]);
    }

    /**
     * Update the specified benefit
     */
    public function update(Request $request, Benefit $benefit): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:benefits,name,' . $benefit->id,
            'amount' => 'sometimes|required|numeric|min:0',
            'type' => ['sometimes', 'required', Rule::in(['fixed', 'percentage'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $benefit->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Benefit updated successfully',
            'data' => $benefit
        ]);
    }

    /**
     * Remove the specified benefit
     */
    public function destroy(Benefit $benefit): JsonResponse
    {
        // Check if benefit has employee assignments
        if ($benefit->employees()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete benefit with employee assignments'
            ], 422);
        }

        $benefit->delete();

        return response()->json([
            'success' => true,
            'message' => 'Benefit deleted successfully'
        ]);
    }

    /**
     * Get active benefits
     */
    public function active(): JsonResponse
    {
        $benefits = Benefit::active()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $benefits
        ]);
    }

    /**
     * Toggle benefit active status
     */
    public function toggle(Benefit $benefit): JsonResponse
    {
        $benefit->update(['is_active' => !$benefit->is_active]);

        return response()->json([
            'success' => true,
            'message' => 'Benefit status updated successfully',
            'data' => $benefit
        ]);
    }
}
