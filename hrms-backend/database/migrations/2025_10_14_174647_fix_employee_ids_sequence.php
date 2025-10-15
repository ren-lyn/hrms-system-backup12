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
        // Fix employee IDs that are out of sequence
        $employees = EmployeeProfile::where('employee_id', 'like', 'EM%')
            ->whereRaw('CAST(SUBSTRING(employee_id, 3) AS UNSIGNED) > 1027') // IDs higher than expected
            ->orderBy('id')
            ->get();

        $counter = 1028; // Start from EM1028 (after the expected range)
        
        foreach ($employees as $employee) {
            $newId = 'EM' . $counter;
            $employee->update(['employee_id' => $newId]);
            $counter++;
        }

        // Fixed employee IDs to be sequential
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration doesn't need to be reversed
        // Employee IDs should remain sequential once fixed
    }
};