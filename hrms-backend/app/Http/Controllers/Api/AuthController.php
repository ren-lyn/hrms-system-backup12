<?php
// hrms-backend/app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required', // this can be email or user_id (fallback)
            'password' => 'required'
        ]);

        // Try to find the user by email first, then by user_id as fallback
        $user = User::where('email', $request->login)->with('role')->first();
        
        // If not found by email and login is numeric, try by user_id (for backward compatibility)
        if (!$user && is_numeric($request->login)) {
            $user = User::where('id', $request->login)->with('role')->first();
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            "access_token" => $token,
            "user" => [
                "id" => $user->id,
                "email" => $user->email,
                "role" => [
                    "id" => $user->role_id ?? null,
                    "name" => $user->role->name ?? null
                ]
            ]
        ]);
    }


    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'full_name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'department' => $user->department,
            'role_id' => $user->role_id,
            'role' => $user->role->name ?? null
        ]);
    }
}
// This controller handles user authentication, allowing users to log in and log out.
// The login method checks the user's credentials and returns an access token if valid.