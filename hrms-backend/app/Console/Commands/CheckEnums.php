<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckEnums extends Command
{
    protected $signature = 'check:enums';
    protected $description = 'Check database enum values';

    public function handle()
    {
        $this->info('🔍 Checking Database Enums');
        $this->info('========================');
        $this->newLine();

        try {
            // Check applications table status enum
            $this->info('1. Applications table status enum:');
            $applicationsStatus = DB::select("SHOW COLUMNS FROM applications LIKE 'status'");
            if (!empty($applicationsStatus)) {
                $enumValues = $applicationsStatus[0]->Type;
                $this->line("   Status enum: " . $enumValues);
                
                // Check if 'On going Interview' is in the enum
                if (strpos($enumValues, 'On going Interview') !== false) {
                    $this->info("   ✅ 'On going Interview' is present");
                } else {
                    $this->error("   ❌ 'On going Interview' is MISSING");
                }
            } else {
                $this->error("   ❌ Could not find status column");
            }
            
            $this->newLine();
            
            // Check interviews table interview_type enum
            $this->info('2. Interviews table interview_type enum:');
            $interviewsType = DB::select("SHOW COLUMNS FROM interviews LIKE 'interview_type'");
            if (!empty($interviewsType)) {
                $enumValues = $interviewsType[0]->Type;
                $this->line("   Interview type enum: " . $enumValues);
                
                // Check if 'On-site' is in the enum
                if (strpos($enumValues, 'On-site') !== false) {
                    $this->info("   ✅ 'On-site' is present");
                } else {
                    $this->error("   ❌ 'On-site' is MISSING");
                }
            } else {
                $this->error("   ❌ Could not find interview_type column");
            }
            
            $this->newLine();
            
            // Check if interviews table exists
            $this->info('3. Interviews table structure:');
            $interviewsExists = DB::select("SHOW TABLES LIKE 'interviews'");
            if (!empty($interviewsExists)) {
                $this->info("   ✅ Interviews table exists");
                
                // Get all columns
                $columns = DB::select("DESCRIBE interviews");
                $columnNames = array_map(function($col) { return $col->Field; }, $columns);
                $this->line("   Columns: " . implode(', ', $columnNames));
            } else {
                $this->error("   ❌ Interviews table does not exist");
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
        }
    }
}
