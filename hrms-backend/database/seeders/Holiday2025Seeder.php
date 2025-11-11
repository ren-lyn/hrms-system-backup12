<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Holiday;

class Holiday2025Seeder extends Seeder
{
    public function run(): void
    {
        $holidays = [
            // Regular Holidays
            ['name' => "New Year's Day", 'date' => '2025-01-01', 'type' => 'Regular'],
            ['name' => 'Araw ng Kagitingan (Day of Valor)', 'date' => '2025-04-09', 'type' => 'Regular'],
            ['name' => 'Maundy Thursday', 'date' => '2025-04-17', 'type' => 'Regular'],
            ['name' => 'Good Friday', 'date' => '2025-04-18', 'type' => 'Regular'],
            ['name' => 'Labor Day', 'date' => '2025-05-01', 'type' => 'Regular'],
            ['name' => 'Independence Day', 'date' => '2025-06-12', 'type' => 'Regular'],
            ['name' => "National Heroes' Day", 'date' => '2025-08-25', 'type' => 'Regular'],
            ['name' => 'Bonifacio Day', 'date' => '2025-11-30', 'type' => 'Regular'],
            ['name' => 'Christmas Day', 'date' => '2025-12-25', 'type' => 'Regular'],
            ['name' => 'Rizal Day', 'date' => '2025-12-30', 'type' => 'Regular'],

            // Special (Non-Working) Days
            ['name' => 'Chinese New Year', 'date' => '2025-01-29', 'type' => 'Special'],
            ['name' => 'EDSA People Power Revolution Anniversary', 'date' => '2025-02-25', 'type' => 'Special'],
            ['name' => 'Black Saturday', 'date' => '2025-04-19', 'type' => 'Special'],
            ['name' => "Ninoy Aquino Day", 'date' => '2025-08-21', 'type' => 'Special'],
            ['name' => "All Saints' Day", 'date' => '2025-11-01', 'type' => 'Special'],
            ['name' => "All Souls' Day", 'date' => '2025-11-02', 'type' => 'Special'],
            ['name' => 'Feast of the Immaculate Conception of the Blessed Virgin Mary', 'date' => '2025-12-08', 'type' => 'Special'],
            ['name' => 'Christmas Eve', 'date' => '2025-12-24', 'type' => 'Special'],
            ['name' => "New Year's Eve", 'date' => '2025-12-31', 'type' => 'Special'],

            // Islamic Feasts (subject to proclamation)
            // These dates are based on expected astronomical calculations and may change; keep as placeholders
            ['name' => 'Eid al-Fitr', 'date' => '2025-04-01', 'type' => 'Regular'],
            ['name' => 'Eid al-Adha', 'date' => '2025-06-06', 'type' => 'Regular'],
        ];

        foreach ($holidays as $data) {
            Holiday::updateOrCreate(
                ['date' => $data['date'], 'name' => $data['name']],
                [
                    'type' => $data['type'],
                    'is_movable' => false,
                    'moved_date' => null,
                    'is_working_day' => false,
                ]
            );
        }
    }
}








