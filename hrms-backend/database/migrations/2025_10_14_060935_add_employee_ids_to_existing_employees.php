<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\EmployeeProfile;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Generate employee IDs for existing employees who don't have them
        $employeesWithoutId = EmployeeProfile::whereNull('employee_id')
            ->orWhere('employee_id', '')
            ->get();

        foreach ($employeesWithoutId as $employee) {
            $employee->update(['employee_id' => EmployeeProfile::generateEmployeeId()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration doesn't need to be reversed
        // Employee IDs should remain once assigned
    }
};
