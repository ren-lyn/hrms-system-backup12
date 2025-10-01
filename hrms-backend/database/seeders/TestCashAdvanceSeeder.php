<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\CashAdvanceRequest;
use Carbon\Carbon;

class TestCashAdvanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create a test user
        $user = User::first();
        
        if (!$user) {
            $user = User::create([
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@company.com',
                'password' => bcrypt('password'),
                'role' => 'Employee'
            ]);
        }

        // Create test cash advance requests
        $requests = [
            [
                'user_id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'company' => 'Cabuyao Concrete Development Corporation',
                'department' => 'IT Department',
                'date_field' => Carbon::now()->toDateString(),
                'reason' => 'Medical emergency expenses',
                'amount_ca' => 5000.00,
                'rem_ca' => 'To be deducted from salary',
                'status' => 'pending'
            ],
            [
                'user_id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'company' => 'Cabuyao Concrete Development Corporation',
                'department' => 'IT Department',
                'date_field' => Carbon::now()->subDays(3)->toDateString(),
                'reason' => 'Home renovation',
                'amount_ca' => 10000.00,
                'rem_ca' => 'To be deducted in 2 months',
                'status' => 'approved',
                'processed_by' => $user->id,
                'processed_at' => Carbon::now()->subDays(1),
                'collection_date' => Carbon::now()->addDays(1),
                'hr_remarks' => 'Approved for emergency expenses'
            ],
            [
                'user_id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'company' => 'Cabuyao Concrete Development Corporation',
                'department' => 'IT Department',
                'date_field' => Carbon::now()->subDays(7)->toDateString(),
                'reason' => 'Personal vacation expenses',
                'amount_ca' => 15000.00,
                'rem_ca' => 'To be deducted in 3 months',
                'status' => 'rejected',
                'processed_by' => $user->id,
                'processed_at' => Carbon::now()->subDays(5),
                'hr_remarks' => 'Rejected due to policy restrictions on vacation expenses'
            ]
        ];

        foreach ($requests as $requestData) {
            CashAdvanceRequest::create($requestData);
        }

        $this->command->info('Created ' . count($requests) . ' test cash advance requests');
    }
}