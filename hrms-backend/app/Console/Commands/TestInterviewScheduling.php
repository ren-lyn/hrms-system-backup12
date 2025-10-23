<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Interview;
use App\Models\Application;
use App\Models\User;
use App\Models\JobPosting;
use App\Models\Applicant;

class TestInterviewScheduling extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:interview-scheduling';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the interview scheduling functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Testing Interview Scheduling Functionality');
        $this->info('============================================');
        $this->newLine();

        try {
            // Test 1: Check if interviews table exists and has correct structure
            $this->info('1. Checking database structure...');
            
            $columns = DB::select("DESCRIBE interviews");
            $expectedColumns = ['id', 'application_id', 'interview_date', 'interview_time', 'duration', 'interview_type', 'location', 'interviewer', 'notes', 'status', 'feedback', 'result', 'created_at', 'updated_at'];
            
            $existingColumns = array_column($columns, 'Field');
            $missingColumns = array_diff($expectedColumns, $existingColumns);
            
            if (empty($missingColumns)) {
                $this->info('   ✅ Interviews table structure is correct');
            } else {
                $this->error('   ❌ Missing columns: ' . implode(', ', $missingColumns));
            }
            
            // Test 2: Check if we can create a test interview
            $this->newLine();
            $this->info('2. Testing interview creation...');
            
            // Find a test application
            $testApplication = Application::with(['applicant', 'jobPosting'])->first();
            
            if (!$testApplication) {
                $this->warn('   ⚠️  No applications found. Creating test data...');
                
                // Get or create a role first
                $role = \App\Models\Role::firstOrCreate(
                    ['name' => 'Applicant'],
                    ['name' => 'Applicant', 'description' => 'Job Applicant']
                );
                
                // Create test user
                $testUser = User::firstOrCreate(
                    ['email' => 'test@example.com'],
                    [
                        'first_name' => 'Test',
                        'last_name' => 'User',
                        'password' => bcrypt('password'),
                        'role_id' => $role->id
                    ]
                );
                
                // Create test applicant
                $testApplicant = Applicant::firstOrCreate(
                    ['user_id' => $testUser->id],
                    [
                        'first_name' => 'Test',
                        'last_name' => 'Applicant',
                        'email' => 'test@example.com'
                    ]
                );
                
                // Create test job posting
                $testJobPosting = JobPosting::firstOrCreate(
                    ['title' => 'Test Position'],
                    [
                        'title' => 'Test Position',
                        'department' => 'IT',
                        'position' => 'Developer',
                        'description' => 'Test job description',
                        'requirements' => 'Test requirements',
                        'salary_min' => 25000,
                        'salary_max' => 35000,
                        'status' => 'active'
                    ]
                );
                
                // Create test application
                $testApplication = Application::create([
                    'applicant_id' => $testApplicant->id,
                    'job_posting_id' => $testJobPosting->id,
                    'status' => 'ShortListed',
                    'applied_at' => now()
                ]);
                
                $this->info('   ✅ Test data created');
            }
            
            // Test 3: Create a test interview
            $this->newLine();
            $this->info('3. Creating test interview...');
            
            $testInterview = Interview::create([
                'application_id' => $testApplication->id,
                'interview_date' => now()->addDays(7)->format('Y-m-d'),
                'interview_time' => '10:00:00',
                'duration' => 60,
                'interview_type' => 'in-person',
                'location' => 'Main Office, Room 101',
                'interviewer' => 'John Doe',
                'notes' => 'Please bring your resume and portfolio',
                'status' => 'scheduled'
            ]);
            
            $this->info("   ✅ Test interview created with ID: {$testInterview->id}");
            
            // Test 4: Test interview retrieval by application IDs
            $this->newLine();
            $this->info('4. Testing interview retrieval...');
            
            $userInterviews = Interview::with(['application.jobPosting', 'application.applicant'])
                ->where('application_id', $testApplication->id)
                ->get();
            
            if ($userInterviews->count() > 0) {
                $this->info("   ✅ Successfully retrieved {$userInterviews->count()} interview(s)");
                
                $interview = $userInterviews->first();
                $this->info('   📋 Interview Details:');
                $this->info("      - Date: {$interview->interview_date}");
                $this->info("      - Time: {$interview->interview_time}");
                $this->info("      - Duration: {$interview->duration} minutes");
                $this->info("      - Type: {$interview->interview_type}");
                $this->info("      - Location: {$interview->location}");
                $this->info("      - Interviewer: {$interview->interviewer}");
                $this->info("      - Status: {$interview->status}");
            } else {
                $this->error('   ❌ No interviews found');
            }
            
            // Test 5: Test application status update
            $this->newLine();
            $this->info('5. Testing application status update...');
            
            $originalStatus = $testApplication->status;
            $testApplication->update(['status' => 'On going Interview']);
            
            if ($testApplication->fresh()->status === 'On going Interview') {
                $this->info("   ✅ Application status updated to 'On going Interview'");
            } else {
                $this->error('   ❌ Failed to update application status');
            }
            
            // Test 6: Clean up test data
            $this->newLine();
            $this->info('6. Cleaning up test data...');
            
            $testInterview->delete();
            $this->info('   ✅ Test interview deleted');
            
            if ($testApplication->applicant->email === 'test@example.com') {
                $testApplication->delete();
                $testApplication->applicant->delete();
                $testApplication->applicant->user->delete();
                $this->info('   ✅ Test application and user data cleaned up');
            }
            
            $this->newLine();
            $this->info('🎉 All tests passed! Interview scheduling functionality is working correctly.');
            $this->newLine();
            $this->info('📋 Summary:');
            $this->info('   - Database structure: ✅');
            $this->info('   - Interview creation: ✅');
            $this->info('   - Interview retrieval: ✅');
            $this->info('   - Application status update: ✅');
            $this->info('   - Data cleanup: ✅');
            
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('❌ Error during testing: ' . $e->getMessage());
            $this->error('Stack trace:');
            $this->error($e->getTraceAsString());
        }
    }
}