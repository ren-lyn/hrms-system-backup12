<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AttendanceImport;

echo "Fixing stuck 'processing' import records\n";
echo "=========================================\n\n";

$processingImports = AttendanceImport::where('status', 'processing')->get();

echo "Found {$processingImports->count()} import(s) stuck in 'processing' status\n\n";

foreach ($processingImports as $import) {
    echo "Import ID: {$import->id}\n";
    echo "Filename: {$import->filename}\n";
    echo "Created: {$import->created_at}\n";
    
    // Check if it has any successful rows
    if ($import->successful_rows > 0) {
        echo "Action: Marking as completed (has {$import->successful_rows} successful rows)\n";
        $import->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);
    } else {
        echo "Action: Marking as failed (no successful rows)\n";
        $import->update([
            'status' => 'failed',
            'completed_at' => now(),
            'errors' => ['Import did not complete successfully']
        ]);
    }
    
    echo "✓ Fixed\n\n";
}

echo "Done!\n";
