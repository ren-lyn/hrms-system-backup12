<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Applicant;
use Illuminate\Support\Facades\Hash;

class ApplicantController extends Controller
{
    public function register(Request $request)
    {
        // Validate the incoming request
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email|unique:applicants,email',
            'password'   => [
                'required',
                'confirmed',
                'min:12',
                'max:16',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            ],
            'phone'      => 'required|string|size:11|regex:/^09\d{9}$/',
            'resume'     => 'nullable|string|max:1000',
        ], [
            'password.min' => 'Password must be at least 12 characters long.',
            'password.max' => 'Password must not exceed 16 characters.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'phone.required' => 'Phone number is required.',
            'phone.size' => 'Phone number must be exactly 11 digits.',
            'phone.regex' => 'Phone number must be a valid Philippine mobile number starting with 09.',
        ]);

        // Check for password uniqueness
        $existingPassword = User::where('password', Hash::make($request->password))->exists();
        if ($existingPassword) {
            return response()->json([
                'message' => 'This password has already been used by another account. Please choose a different password.',
                'errors' => ['password' => ['This password has already been used by another account.']]
            ], 422);
        }

        // Create the user
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'role_id'    => 5, // Assuming 5 = Applicant
        ]);

        // Create the applicant profile
        Applicant::create([
            'user_id'        => $user->id,
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'          => $request->email,
            'contact_number' => $request->phone ?? null,
            'resume_path'    => $request->resume ?? null,
        ]);

        return response()->json(['message' => 'Registration successful.'], 201);
    }
}
// This controller handles the registration of applicants, creating both a user and an applicant profile.