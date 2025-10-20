<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Api\AttendanceController;
use App\Services\AttendanceImportService;

echo "Testing Import History API\n";
echo "==========================\n\n";

// Create controller instance
$importService = new AttendanceImportService();
$controller = new AttendanceController($importService);

// Create a mock request
$request = Request::create('/api/attendance/import/history', 'GET', ['per_page' => 20]);

// Call the method
try {
    $response = $controller->importHistory($request);
    $data = json_decode($response->getContent(), true);
    
    echo "API Response:\n";
    echo "-------------\n";
    echo "Success: " . ($data['success'] ? 'true' : 'false') . "\n";
    echo "Data count: " . (isset($data['data']) ? count($data['data']) : 0) . "\n\n";
    
    if (isset($data['data']) && count($data['data']) > 0) {
        echo "Import records:\n";
        foreach ($data['data'] as $import) {
            echo sprintf(
                "  ID: %d | File: %s | Status: %s\n",
                $import['id'],
                $import['filename'],
                $import['status']
            );
        }
    } else {
        echo "No data returned\n";
    }
    
    echo "\nFull response:\n";
    echo json_encode($data, JSON_PRETTY_PRINT) . "\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
