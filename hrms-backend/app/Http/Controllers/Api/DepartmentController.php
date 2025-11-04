<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    /**
     * Display a listing of departments.
     */
    public function index()
    {
        $departments = Department::with('positions')->get();
        return response()->json($departments);
    }

    /**
     * Store a newly created department.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:departments',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $department = Department::create($request->only(['name', 'description']));

        return response()->json($department, 201);
    }

    /**
     * Display the specified department.
     */
    public function show($id)
    {
        $department = Department::with('positions')->findOrFail($id);
        return response()->json($department);
    }

    /**
     * Update the specified department.
     */
    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:departments,name,' . $id,
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $department->update($request->only(['name', 'description']));

        return response()->json($department);
    }

    /**
     * Remove the specified department.
     */
    public function destroy($id)
    {
        $department = Department::findOrFail($id);
        
        // Check if department has positions
        if ($department->positions()->count() > 0) {
            return response()->json(['message' => 'Cannot delete department with existing positions'], 422);
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }
}
