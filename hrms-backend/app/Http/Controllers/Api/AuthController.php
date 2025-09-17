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
            'login' => 'required', // this can be user_id or email
            'password' => 'required'
        ]);

        // Try to find the user based on whether login is numeric (user_id) or email
        if (is_numeric($request->login)) {
            // Login using user_id
            $user = User::where('id', $request->login)->where('role_id', '<', 5)->first();
        } else {
            // Login using email (applicant only)
            $user = User::where('email', $request->login)->where('role_id', 5)->first();
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