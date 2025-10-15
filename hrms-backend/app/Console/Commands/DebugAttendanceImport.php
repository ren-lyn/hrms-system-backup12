<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AttendanceImportService;
use PhpOffice\PhpSpreadsheet\IOFactory;

class DebugAttendanceImport extends Command
{
    protected $signature = 'debug:attendance-import {file}';
    protected $description = 'Debug attendance import process';

    public function handle()
    {
        $filePath = $this->argument('file');
        
        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return;
        }

        $this->info("Debugging file: {$filePath}");
        
        try {
            // Load the spreadsheet
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            
            $this->info("Total rows: " . count($rows));
            
            // Show first few rows
            for ($i = 0; $i < min(5, count($rows)); $i++) {
                $this->info("Row {$i}: " . json_encode($rows[$i]));
            }
            
            // Check headers
            if (count($rows) > 0) {
                $headers = $rows[0];
                $this->info("Headers: " . json_encode($headers));
                
                // Normalize headers
                $normalizedHeaders = array_map(function($header) {
                    return strtolower(str_replace([' ', '-'], '_', trim((string) $header)));
                }, $headers);
                $this->info("Normalized headers: " . json_encode($normalizedHeaders));
                
                // Check for expected columns
                $candidates = ['date', 'employee_id', 'person_id', 'person_name', 'attendance_record', 'time_in', 'time_out'];
                $foundColumns = [];
                foreach ($candidates as $cand) {
                    if (in_array($cand, $normalizedHeaders)) {
                        $foundColumns[] = $cand;
                    }
                }
                $this->info("Found expected columns: " . json_encode($foundColumns));
            }
            
        } catch (\Exception $e) {
            $this->error("Error: " . $e->getMessage());
        }
    }
}


