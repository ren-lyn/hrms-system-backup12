<?php
// hrms-backend/app/Http/Controllers/Api/EmployeeController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class EmployeeController extends Controller
{
    // GET /employees
    public function index()
    {
        //abort(500, "Simulated server error");
        $employees = User::with('employeeProfile', 'role')
            ->where('role_id', '!=', 5) // Exclude Applicants
            ->whereHas('employeeProfile') // Must have an employee profile
            ->get();

        return response()->json($employees);
    }

    // POST /employees
    // POST /employees
public function store(Request $request)
{
    $validated = $request->validate([
        'password'        => 'required|string',
        'first_name'      => 'required|string',
        'last_name'       => 'required|string',
        'email'           => 'required|email|unique:users,email|unique:employee_profiles,email',
        'position'        => 'required|string',
        'role_id'         => 'required|integer|exists:roles,id',
        'department'      => 'nullable|string',
        'salary'          => 'nullable|numeric',
        'contact_number'  => 'nullable|string',
        'address'         => 'nullable|string',
    ]);

    // ✅ Check for duplicate first + last name
    $duplicate = EmployeeProfile::where('first_name', $validated['first_name'])
        ->where('last_name', $validated['last_name'])
        ->exists();

    if ($duplicate) {
        return response()->json([
            'message' => 'An employee with the same first and last name already exists.'
        ], 409); // Conflict
    }

    // Create user
    $user = User::create([
        'email'      => $validated['email'],
        'password'   => Hash::make($validated['password']),
        'role_id'    => $validated['role_id'],
        'first_name' => $validated['first_name'],
        'last_name'  => $validated['last_name'],
    ]);

    // Create employee profile
    $user->employeeProfile()->create([
        'first_name'     => $validated['first_name'],
        'last_name'      => $validated['last_name'],
        'email'          => $validated['email'],
        'position'       => $validated['position'],
        'department'     => $validated['department'] ?? null,
        'salary'         => $validated['salary'] ?? null,
        'contact_number' => $validated['contact_number'] ?? null,
        'address'        => $validated['address'] ?? null,
    ]);

    return response()->json(['message' => 'Employee created successfully'], 201);
}

    // PUT /employees/{id}
    // PUT /employees/{id}
public function update(Request $request, $id)
{
    $user = User::with('employeeProfile')->findOrFail($id);

    $validated = $request->validate([
        'password'        => 'nullable|string',
        'first_name'      => 'sometimes|string',
        'last_name'       => 'sometimes|string',
        'email'           => [
            'sometimes',
            'email',
            'unique:users,email,' . $user->id,
            'unique:employee_profiles,email,' . ($user->employeeProfile->id ?? 'NULL'),
        ],
        'position'        => 'sometimes|string',
        'role_id'         => 'sometimes|integer|exists:roles,id',
        'department'      => 'nullable|string',
        'salary'          => 'nullable|numeric',
        'contact_number'  => 'nullable|string',
        'address'         => 'nullable|string',
    ]);

    // ✅ Check for duplicate name (ignore current employee)
    if (!empty($validated['first_name']) || !empty($validated['last_name'])) {
        $firstName = $validated['first_name'] ?? $user->first_name;
        $lastName  = $validated['last_name'] ?? $user->last_name;

        $duplicate = EmployeeProfile::where('first_name', $firstName)
            ->where('last_name', $lastName)
            ->where('id', '!=', $user->employeeProfile->id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'An employee with the same first and last name already exists.'
            ], 409);
        }
    }

    // Update User
    if (!empty($validated['password'])) {
        $user->password = Hash::make($validated['password']);
    }

    if (!empty($validated['role_id'])) {
        $user->role_id = $validated['role_id'];
    }

    $user->first_name = $validated['first_name'] ?? $user->first_name;
    $user->last_name  = $validated['last_name'] ?? $user->last_name;
    $user->email      = $validated['email'] ?? $user->email;
    $user->save();

    // Update Employee Profile
    if ($user->employeeProfile) {
        $user->employeeProfile->update([
            'first_name'     => $validated['first_name'] ?? $user->employeeProfile->first_name,
            'last_name'      => $validated['last_name'] ?? $user->employeeProfile->last_name,
            'email'          => $validated['email'] ?? $user->employeeProfile->email,
            'position'       => $validated['position'] ?? $user->employeeProfile->position,
            'department'     => $validated['department'] ?? $user->employeeProfile->department,
            'salary'         => $validated['salary'] ?? $user->employeeProfile->salary,
            'contact_number' => $validated['contact_number'] ?? $user->employeeProfile->contact_number,
            'address'        => $validated['address'] ?? $user->employeeProfile->address,
        ]);
    }

    return response()->json(['message' => 'Employee updated successfully']);
}


    // DELETE /employees/{id}
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Also delete profile if exists
        if ($user->employeeProfile) {
            $user->employeeProfile->delete();
        }

        $user->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }

    // GET /employee/profile - Get current employee's profile
    public function profile()
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        // Get the full name from User model
        $profileData = $profile->toArray();
        $profileData['name'] = $user->first_name . ' ' . $user->last_name;
        
        return response()->json([
            'profile' => $profileData,
            'edit_counts' => [
                'marital_status' => $profile->marital_status_edit_count,
                'address' => $profile->address_edit_count,
                'contact' => $profile->contact_edit_count
            ]
        ]);
    }

    // PUT /employee/profile/marital_status - Update marital status
    public function updateMaritalStatus(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->marital_status_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for marital status.'
            ], 403);
        }
        
        $validated = $request->validate([
            'marital_status' => 'required|string|in:Single,Married,Divorced,Widowed'
        ]);
        
        $profile->update([
            'marital_status' => $validated['marital_status'],
            'marital_status_edit_count' => $profile->marital_status_edit_count + 1
        ]);
        
        return response()->json([
            'message' => 'Marital status updated successfully',
            'remaining_edits' => 3 - $profile->marital_status_edit_count
        ]);
    }

    // PUT /employee/profile/address - Update address information
    public function updateAddress(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->address_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for address information.'
            ], 403);
        }
        
        $validated = $request->validate([
            'province' => 'nullable|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20'
        ]);
        
        $profile->update(array_merge($validated, [
            'address_edit_count' => $profile->address_edit_count + 1
        ]));
        
        return response()->json([
            'message' => 'Address information updated successfully',
            'remaining_edits' => 3 - $profile->address_edit_count
        ]);
    }

    // PUT /employee/profile/contact - Update contact information
    public function updateContact(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->contact_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for contact information.'
            ], 403);
        }
        
        $validated = $request->validate([
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:employee_profiles,email,' . $profile->id,
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20'
        ]);
        
        // Also update email in User model if provided
        if (isset($validated['email'])) {
            $user->update(['email' => $validated['email']]);
        }
        
        $profile->update(array_merge($validated, [
            'contact_edit_count' => $profile->contact_edit_count + 1
        ]));
        
        return response()->json([
            'message' => 'Contact information updated successfully',
            'remaining_edits' => 3 - $profile->contact_edit_count
        ]);
    }
}
