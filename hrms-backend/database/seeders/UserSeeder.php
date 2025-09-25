<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create default HR Assistant user only (Juan Dela Cruz)
        // Maria Santos (Employee) has been removed as requested
        
        $hrUser = User::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'hr@company.com',
            'password' => Hash::make('password123'),
            'role_id' => 1, // HR Assistant
        ]);

        // Create comprehensive employee profile for HR Assistant
        $hrUser->employeeProfile()->create([
            // Personal Information
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'nickname' => 'Juan',
            'email' => 'hr@company.com',
            'civil_status' => 'Single',
            'gender' => 'Male',
            'place_of_birth' => 'Laguna',
            'birth_date' => '1990-01-15',
            'age' => 34,
            
            // Contact Information
            'contact_number' => '09991234567',
            'emergency_contact_name' => 'Maria Dela Cruz',
            'emergency_contact_phone' => '09987654321',
            
            // Address Information
            'province' => 'Laguna',
            'barangay' => 'Banay-Banay',
            'city' => 'Cabuyao',
            'postal_code' => '4025',
            'present_address' => 'Banay-Banay, Cabuyao, Laguna 4025',
            
            // Employment Overview
            'position' => 'HR Assistant',
            'department' => 'HR Department',
            'employment_status' => 'Full Time',
            'tenurity' => '2 years',
            'hire_date' => '2023-01-15',
            'salary' => 35000,
            'sss' => '12-3456789-0',
            'philhealth' => 'PH-123456789',
            'pagibig' => 'PG-123456789',
            'tin_no' => '123-456-789-000',
            
            // Initialize edit counts
            'name_edit_count' => 0,
            'nickname_edit_count' => 0,
            'civil_status_edit_count' => 0,
            'address_edit_count' => 0,
            'contact_edit_count' => 0,
            'emergency_contact_edit_count' => 0,
        ]);
        
        echo "Default user created:\n";
        echo "HR Assistant - User ID: {$hrUser->id}, Email: {$hrUser->email}, Password: password123\n";
    }
}
