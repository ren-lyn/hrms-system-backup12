<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxTitle;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class TaxTitleController extends Controller
{
    /**
     * Display a listing of tax titles
     */
    public function index(Request $request): JsonResponse
    {
        $query = TaxTitle::query();

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

        $taxTitles = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $taxTitles
        ]);
    }

    /**
     * Store a newly created tax title
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tax_titles,name',
            'rate' => 'required|numeric|min:0',
            'type' => ['required', Rule::in(['percentage', 'fixed'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $taxTitle = TaxTitle::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tax title created successfully',
            'data' => $taxTitle
        ], 201);
    }

    /**
     * Display the specified tax title
     */
    public function show(TaxTitle $taxTitle): JsonResponse
    {
        $taxTitle->load('employees');

        return response()->json([
            'success' => true,
            'data' => $taxTitle
        ]);
    }

    /**
     * Update the specified tax title
     */
    public function update(Request $request, TaxTitle $taxTitle): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:tax_titles,name,' . $taxTitle->id,
            'rate' => 'sometimes|required|numeric|min:0',
            'type' => ['sometimes', 'required', Rule::in(['percentage', 'fixed'])],
            'description' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        $taxTitle->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tax title updated successfully',
            'data' => $taxTitle
        ]);
    }

    /**
     * Remove the specified tax title
     */
    public function destroy(TaxTitle $taxTitle): JsonResponse
    {
        // Check if tax title has employee assignments
        if ($taxTitle->employees()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete tax title with employee assignments'
            ], 422);
        }

        $taxTitle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax title deleted successfully'
        ]);
    }

    /**
     * Get active tax titles
     */
    public function active(): JsonResponse
    {
        $taxTitles = TaxTitle::active()->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $taxTitles
        ]);
    }

    /**
     * Toggle tax title active status
     */
    public function toggle(TaxTitle $taxTitle): JsonResponse
    {
        $taxTitle->update(['is_active' => !$taxTitle->is_active]);

        return response()->json([
            'success' => true,
            'message' => 'Tax title status updated successfully',
            'data' => $taxTitle
        ]);
    }
}
