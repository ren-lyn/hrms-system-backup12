<?php

namespace Database\Seeders;

use App\Models\DisciplinaryAction;
use App\Models\EmployeeProfile;
use Illuminate\Database\Seeder;

class DisciplinaryActionSeeder extends Seeder
{
    public function run()
    {
        EmployeeProfile::inRandomOrder()->take(10)->each(function ($employee) {
            DisciplinaryAction::factory()->create([
                'employee_id' => $employee->id,
            ]);
        });
    }
}