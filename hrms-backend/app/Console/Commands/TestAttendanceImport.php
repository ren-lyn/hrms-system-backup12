<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AttendanceImportService;

class TestAttendanceImport extends Command
{
    protected $signature = 'attendance:test-import {--file=sample_attendance.csv}';
    protected $description = 'Test the attendance import functionality';

    public function handle()
    {
        $filename = $this->option('file');
        $csvPath = storage_path('app/public/' . $filename);

        if (!file_exists($csvPath)) {
            $this->error("Error: CSV file not found at $csvPath");
            return 1;
        }

        $this->info('CSV file found. Starting import...');
        $this->info('File: ' . $csvPath);

        try {
            $service = new AttendanceImportService();
            $results = $service->importFromExcel($csvPath);
            
            $this->info('Import completed!');
            $this->info('Success: ' . $results['success']);
            $this->info('Failed: ' . $results['failed']);
            $this->info('Skipped: ' . $results['skipped']);
            
            if (!empty($results['errors'])) {
                $this->warn('Errors encountered:');
                foreach (array_slice($results['errors'], 0, 5) as $error) {
                    $this->line('- ' . $error);
                }
                if (count($results['errors']) > 5) {
                    $this->line('... and ' . (count($results['errors']) - 5) . ' more errors');
                }
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error('Error during import: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }
    }
}