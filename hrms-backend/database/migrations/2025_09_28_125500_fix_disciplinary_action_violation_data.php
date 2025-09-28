<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix violation field that contains debug data
        $actionsWithDebugData = DB::table('disciplinary_actions')
            ->where('violation', 'like', '%jkbasdfhdjfb%')
            ->orWhere('violation', 'like', '%aksdbksdfb%')
            ->orWhere('violation', 'like', '%sdfhdjsfbdkbfgd%')
            ->get();

        foreach ($actionsWithDebugData as $action) {
            // Get the proper incident description from the related report
            $report = DB::table('disciplinary_reports')
                ->where('id', $action->disciplinary_report_id)
                ->first();
            
            if ($report && $report->incident_description) {
                // Update the violation field with the proper incident description
                DB::table('disciplinary_actions')
                    ->where('id', $action->id)
                    ->update([
                        'violation' => $report->incident_description,
                        'updated_at' => now()
                    ]);
                    
                echo "Fixed violation data for Disciplinary Action ID: {$action->id}\n";
            }
        }
        
        // Also ensure all actions have proper violation descriptions
        $actionsWithoutViolation = DB::table('disciplinary_actions')
            ->leftJoin('disciplinary_reports', 'disciplinary_actions.disciplinary_report_id', '=', 'disciplinary_reports.id')
            ->whereNull('disciplinary_actions.violation')
            ->orWhere('disciplinary_actions.violation', '')
            ->select('disciplinary_actions.id', 'disciplinary_reports.incident_description')
            ->get();
            
        foreach ($actionsWithoutViolation as $action) {
            if ($action->incident_description) {
                DB::table('disciplinary_actions')
                    ->where('id', $action->id)
                    ->update([
                        'violation' => $action->incident_description,
                        'updated_at' => now()
                    ]);
                    
                echo "Added violation description for Disciplinary Action ID: {$action->id}\n";
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cannot be reversed as we're fixing corrupt data
        // The previous debug data was not useful anyway
    }
};