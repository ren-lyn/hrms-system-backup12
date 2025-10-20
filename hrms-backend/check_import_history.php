<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AttendanceImport;

echo "Checking Import History\n";
echo "=======================\n\n";

$totalImports = AttendanceImport::count();
echo "Total import records: {$totalImports}\n\n";

if ($totalImports > 0) {
    echo "Recent imports:\n";
    echo "---------------\n";
    
    $imports = AttendanceImport::orderBy('created_at', 'desc')
        ->take(10)
        ->get(['id', 'filename', 'status', 'total_rows', 'successful_rows', 'failed_rows', 'created_at']);
    
    foreach ($imports as $import) {
        echo sprintf(
            "ID: %-3d | File: %-30s | Status: %-10s | Rows: %d/%d | Date: %s\n",
            $import->id,
            substr($import->filename, 0, 30),
            $import->status,
            $import->successful_rows,
            $import->total_rows,
            $import->created_at->format('Y-m-d H:i:s')
        );
    }
} else {
    echo "No import records found in the database.\n";
    echo "\nChecking if attendance_imports table exists...\n";
    
    try {
        \DB::select("SHOW TABLES LIKE 'attendance_imports'");
        echo "✓ Table exists\n";
    } catch (\Exception $e) {
        echo "✗ Table does not exist or error: " . $e->getMessage() . "\n";
    }
}
