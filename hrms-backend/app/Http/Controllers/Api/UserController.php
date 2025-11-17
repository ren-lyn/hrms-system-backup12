<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use App\Notifications\RoleChangeVerification;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        $users = User::with('role')->get();
        return response()->json($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json($user->load('role'), 201);
    }

    /**
     * Display the specified user.
     */
    public function show($id)
    {
        $user = User::with('role')->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, $id)
    {
        $user = User::with('employeeProfile')->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'password' => 'sometimes|string|min:8',
            'role_id' => 'sometimes|exists:roles,id',
            'is_active' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->only(['first_name', 'last_name', 'email', 'role_id', 'is_active']);
        
        // Track role change for notification
        $oldRoleId = $user->role_id;
        $oldRoleName = $user->role->name ?? null;
        $roleChanged = false;
        $newRoleName = null;
        
        if ($request->has('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        // Check if role is being changed
        if (isset($updateData['role_id']) && $updateData['role_id'] != $oldRoleId) {
            $newRole = Role::find($updateData['role_id']);
            $newRoleName = $newRole->name ?? null;
            $roleChanged = true;
        }

        $user->update($updateData);

        // If role changed from Applicant to Employee, notify the user
        if ($roleChanged && $oldRoleName === 'Applicant' && $newRoleName === 'Employee') {
            try {
                $user->notify(new RoleChangeVerification([
                    'user_id' => $user->id,
                    'old_role_name' => $oldRoleName,
                    'new_role_name' => $newRoleName,
                ]));
                Log::info('Role change verification notification sent to user', [
                    'user_id' => $user->id,
                    'old_role' => $oldRoleName,
                    'new_role' => $newRoleName,
                ]);
            } catch (\Throwable $e) {
                Log::error('Failed to send role change verification notification', [
                    'error' => $e->getMessage(),
                    'user_id' => $user->id,
                ]);
            }
        }

        // Sync changes to EmployeeProfile if user has one
        if ($user->employeeProfile) {
            $profileUpdateData = [];
            
            // Sync name and email to EmployeeProfile
            if (isset($updateData['first_name'])) {
                $profileUpdateData['first_name'] = $updateData['first_name'];
            }
            if (isset($updateData['last_name'])) {
                $profileUpdateData['last_name'] = $updateData['last_name'];
            }
            if (isset($updateData['email'])) {
                $profileUpdateData['email'] = $updateData['email'];
            }
            
            // Update EmployeeProfile if there are changes
            if (!empty($profileUpdateData)) {
                $user->employeeProfile->update($profileUpdateData);
                
                // Clear employees cache when profile is updated
                Cache::forget('employees_list');
            }
        }

        // Refresh the user from database to ensure we get the latest role relationship
        $user = $user->fresh(['role']);

        return response()->json($user);
    }

    /**
     * Remove the specified user.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Reset user password.
     */
    public function resetPassword(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:8|confirmed'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($id);
        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }
}
