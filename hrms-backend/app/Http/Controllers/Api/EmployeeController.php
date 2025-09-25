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
        // Required fields
        'password'        => 'required|string',
        'first_name'      => 'required|string',
        'last_name'       => 'required|string',
        'email'           => 'required|email|unique:users,email|unique:employee_profiles,email',
        'role_id'         => 'required|integer|exists:roles,id',
        
        // Personal Information
        'nickname'        => 'nullable|string',
        'civil_status'    => 'nullable|string|in:Single,Married,Divorced,Widowed,Separated',
        'gender'          => 'nullable|string|in:Female,Male',
        'place_of_birth'  => 'nullable|string',
        'birth_date'      => 'nullable|date',
        'age'             => 'nullable|integer|min:1|max:120',
        
        // Contact Information
        'contact_number'  => 'nullable|string',
        'emergency_contact_name' => 'nullable|string',
        'emergency_contact_phone' => 'nullable|string',
        
        // Address Information
        'province'        => 'nullable|string',
        'barangay'        => 'nullable|string',
        'city'            => 'nullable|string',
        'postal_code'     => 'nullable|string',
        'present_address' => 'nullable|string',
        
        // Employment Overview
        'department'      => 'nullable|string|in:Logistics,Accounting,IT Department',
        'position'        => 'nullable|string|in:HR Assistant,HR Staff,Manager,Employee',
        'employment_status' => 'nullable|string',
        'tenurity'        => 'nullable|string',
        'hire_date'       => 'nullable|date',
        'salary'          => 'nullable|numeric',
        'sss'             => 'nullable|string',
        'philhealth'      => 'nullable|string',
        'pagibig'         => 'nullable|string',
        'tin_no'          => 'nullable|string',
        
        // Termination (optional)
        'termination_date' => 'nullable|date',
        'termination_reason' => 'nullable|string',
        'termination_remarks' => 'nullable|string',
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

    // Create employee profile with all new fields
    $user->employeeProfile()->create([
        // Personal Information
        'first_name'     => $validated['first_name'],
        'last_name'      => $validated['last_name'],
        'nickname'       => $validated['nickname'] ?? null,
        'civil_status'   => $validated['civil_status'] ?? null,
        'gender'         => $validated['gender'] ?? null,
        'place_of_birth' => $validated['place_of_birth'] ?? null,
        'birth_date'     => $validated['birth_date'] ?? null,
        'age'            => $validated['age'] ?? null,
        
        // Contact Information
        'email'          => $validated['email'],
        'contact_number' => $validated['contact_number'] ?? null,
        'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
        'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
        
        // Address Information
        'province'       => $validated['province'] ?? null,
        'barangay'       => $validated['barangay'] ?? null,
        'city'           => $validated['city'] ?? null,
        'postal_code'    => $validated['postal_code'] ?? null,
        'present_address' => $validated['present_address'] ?? null,
        
        // Employment Overview
        'department'     => $validated['department'] ?? null,
        'position'       => $validated['position'] ?? null,
        'employment_status' => $validated['employment_status'] ?? null,
        'tenurity'       => $validated['tenurity'] ?? null,
        'hire_date'      => $validated['hire_date'] ?? null,
        'salary'         => $validated['salary'] ?? null,
        'sss'            => $validated['sss'] ?? null,
        'philhealth'     => $validated['philhealth'] ?? null,
        'pagibig'        => $validated['pagibig'] ?? null,
        'tin_no'         => $validated['tin_no'] ?? null,
        
        // Termination (optional)
        'termination_date' => $validated['termination_date'] ?? null,
        'termination_reason' => $validated['termination_reason'] ?? null,
        'termination_remarks' => $validated['termination_remarks'] ?? null,
        
        // Initialize edit counts
        'name_edit_count' => 0,
        'nickname_edit_count' => 0,
        'civil_status_edit_count' => 0,
        'address_edit_count' => 0,
        'contact_edit_count' => 0,
        'emergency_contact_edit_count' => 0,
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
                'name' => $profile->name_edit_count ?? 0,
                'nickname' => $profile->nickname_edit_count ?? 0,
                'civil_status' => $profile->civil_status_edit_count ?? 0,
                'address' => $profile->address_edit_count ?? 0,
                'contact' => $profile->contact_edit_count ?? 0,
                'emergency_contact' => $profile->emergency_contact_edit_count ?? 0
            ],
            'remaining_edits' => [
                'name' => 3 - ($profile->name_edit_count ?? 0),
                'nickname' => 3 - ($profile->nickname_edit_count ?? 0),
                'civil_status' => 3 - ($profile->civil_status_edit_count ?? 0),
                'address' => 3 - ($profile->address_edit_count ?? 0),
                'contact' => 3 - ($profile->contact_edit_count ?? 0),
                'emergency_contact' => 3 - ($profile->emergency_contact_edit_count ?? 0)
            ]
        ]);
    }

    // PUT /employee/profile/civil-status - Update civil status
    public function updateCivilStatus(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->civil_status_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for civil status.'
            ], 403);
        }
        
        $validated = $request->validate([
            'civil_status' => 'required|string|in:Single,Married,Divorced,Widowed,Separated'
        ]);
        
        $profile->update([
            'civil_status' => $validated['civil_status'],
            'civil_status_edit_count' => $profile->civil_status_edit_count + 1
        ]);
        
        return response()->json([
            'message' => 'Civil status updated successfully',
            'remaining_edits' => 3 - $profile->civil_status_edit_count
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
            'postal_code' => 'nullable|string|max:20',
            'present_address' => 'nullable|string'
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
        
        // Ensure phone and contact_number are synchronized
        $updateData = $validated;
        if (isset($validated['phone'])) {
            $updateData['contact_number'] = $validated['phone'];
        }
        
        $profile->update(array_merge($updateData, [
            'contact_edit_count' => $profile->contact_edit_count + 1
        ]));
        
        return response()->json([
            'message' => 'Contact information updated successfully',
            'remaining_edits' => 3 - $profile->contact_edit_count
        ]);
    }

    // PUT /employee/profile/name - Update name information (first name, last name)
    public function updateName(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->name_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for name information.'
            ], 403);
        }
        
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255'
        ]);
        
        // Check for duplicate name
        $duplicate = EmployeeProfile::where('first_name', $validated['first_name'])
            ->where('last_name', $validated['last_name'])
            ->where('id', '!=', $profile->id)
            ->exists();
            
        if ($duplicate) {
            return response()->json([
                'message' => 'An employee with the same first and last name already exists.'
            ], 409);
        }
        
        // Update both User and EmployeeProfile
        $user->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name']
        ]);
        
        $profile->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'name_edit_count' => $profile->name_edit_count + 1
        ]);
        
        return response()->json([
            'message' => 'Name information updated successfully',
            'remaining_edits' => 3 - $profile->name_edit_count
        ]);
    }

    // PUT /employee/profile/nickname - Update nickname
    public function updateNickname(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->nickname_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for nickname.'
            ], 403);
        }
        
        $validated = $request->validate([
            'nickname' => 'nullable|string|max:255'
        ]);
        
        $profile->update([
            'nickname' => $validated['nickname'],
            'nickname_edit_count' => $profile->nickname_edit_count + 1
        ]);
        
        return response()->json([
            'message' => 'Nickname updated successfully',
            'remaining_edits' => 3 - $profile->nickname_edit_count
        ]);
    }

    // PUT /employee/profile/emergency-contact - Update emergency contact (separate from regular contact)
    public function updateEmergencyContact(Request $request)
    {
        $user = Auth::user();
        $profile = $user->employeeProfile;
        
        if (!$profile) {
            return response()->json([
                'message' => 'Employee profile not found'
            ], 404);
        }
        
        if ($profile->emergency_contact_edit_count >= 3) {
            return response()->json([
                'message' => 'You have reached the maximum number of edits (3) for emergency contact information.'
            ], 403);
        }
        
        $validated = $request->validate([
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20'
        ]);
        
        $profile->update(array_merge($validated, [
            'emergency_contact_edit_count' => $profile->emergency_contact_edit_count + 1
        ]));
        
        return response()->json([
            'message' => 'Emergency contact information updated successfully',
            'remaining_edits' => 3 - $profile->emergency_contact_edit_count
        ]);
    }
}
