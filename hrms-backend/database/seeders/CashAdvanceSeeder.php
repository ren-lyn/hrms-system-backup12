<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\CashAdvanceRequest;
use Carbon\Carbon;

class CashAdvanceSeeder extends Seeder
{
    public function run(): void
    {
        $employees = User::where('role_id', '!=', 5)
            ->whereHas('employeeProfile')
            ->inRandomOrder()
            ->take(10)
            ->get();

        foreach ($employees as $user) {
            $profile = $user->employeeProfile;
            $status = ['pending', 'approved', 'rejected'][array_rand(['pending', 'approved', 'rejected'])];
            $processed = $status !== 'pending';

            CashAdvanceRequest::create([
                'user_id' => $user->id,
                'company' => 'Cabuyao Concrete Development Corporation',
                'name' => trim(($profile->first_name ?? $user->first_name) . ' ' . ($profile->last_name ?? $user->last_name)),
                'department' => $profile->department ?? 'Not Set',
                'date_field' => Carbon::now()->subDays(rand(0, 20))->toDateString(),
                'amount_ca' => rand(1000, 10000),
                'rem_ca' => 0,
                'reason' => 'Auto-generated seed request',
                'status' => $status,
                'hr_remarks' => $processed ? 'Processed by HR' : null,
                'processed_by' => $processed ? (User::first()?->id) : null,
                'processed_at' => $processed ? Carbon::now()->toDateTimeString() : null,
                'collection_date' => $processed ? Carbon::now()->addDays(7)->toDateString() : null,
            ]);
        }
    }
}




