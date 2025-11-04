<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Position;
use Illuminate\Support\Facades\Validator;

class PositionController extends Controller
{
    /**
     * Display a listing of positions.
     */
    public function index()
    {
        $positions = Position::with('department')->get();
        return response()->json($positions);
    }

    /**
     * Store a newly created position.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $position = Position::create($request->only(['name', 'description', 'department_id']));

        return response()->json($position->load('department'), 201);
    }

    /**
     * Display the specified position.
     */
    public function show($id)
    {
        $position = Position::with('department')->findOrFail($id);
        return response()->json($position);
    }

    /**
     * Update the specified position.
     */
    public function update(Request $request, $id)
    {
        $position = Position::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $position->update($request->only(['name', 'description', 'department_id']));

        return response()->json($position->load('department'));
    }

    /**
     * Remove the specified position.
     */
    public function destroy($id)
    {
        $position = Position::findOrFail($id);
        $position->delete();

        return response()->json(['message' => 'Position deleted successfully']);
    }
}
