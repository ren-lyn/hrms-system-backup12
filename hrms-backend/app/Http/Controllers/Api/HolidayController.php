<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HolidayController extends Controller
{
	public function index(Request $request): JsonResponse
	{
		$query = Holiday::query();
		if ($request->filled('from') && $request->filled('to')) {
			$query->whereBetween('date', [$request->get('from'), $request->get('to')]);
		}
		return response()->json(['success' => true, 'data' => $query->orderBy('date')->get()]);
	}

	public function store(Request $request): JsonResponse
	{
		$validated = $request->validate([
			'name' => 'required|string|max:255',
			'date' => 'required|date',
			'type' => 'required|in:Regular,Special',
			'is_movable' => 'boolean',
			'moved_date' => 'nullable|date',
			'is_working_day' => 'boolean',
		]);
		$holiday = Holiday::create($validated);
		return response()->json(['success' => true, 'data' => $holiday], 201);
	}

	public function update(Request $request, $id): JsonResponse
	{
		$holiday = Holiday::findOrFail($id);
		$validated = $request->validate([
			'name' => 'sometimes|string|max:255',
			'date' => 'sometimes|date',
			'type' => 'sometimes|in:Regular,Special',
			'is_movable' => 'sometimes|boolean',
			'moved_date' => 'nullable|date',
			'is_working_day' => 'sometimes|boolean',
		]);
		$holiday->update($validated);
		return response()->json(['success' => true, 'data' => $holiday]);
	}

	public function destroy($id): JsonResponse
	{
		$holiday = Holiday::findOrFail($id);
		$holiday->delete();
		return response()->json(['success' => true]);
	}
}




