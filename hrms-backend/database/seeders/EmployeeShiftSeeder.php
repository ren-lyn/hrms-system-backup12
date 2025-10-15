<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EmployeeShift;
use App\Models\EmployeeProfile;

class EmployeeShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default shift: 8:00 AM - 5:00 PM, Monday to Saturday
        $defaultShift = EmployeeShift::firstOrCreate(
            ['name' => 'Regular Shift'],
            [
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'working_days' => [1, 2, 3, 4, 5, 6], // Monday to Saturday
                'break_duration_minutes' => 60, // 1 hour break
                'is_active' => true
            ]
        );

        // Assign default shift to all existing employees
        EmployeeProfile::whereNull('shift_id')->update(['shift_id' => $defaultShift->id]);

        $this->command->info("Created default shift: {$defaultShift->name} (8:00 AM - 5:00 PM, Monday-Saturday)");
        $this->command->info("Assigned shift to " . EmployeeProfile::where('shift_id', $defaultShift->id)->count() . " employees");
    }
}