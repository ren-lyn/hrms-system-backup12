<?php

require_once __DIR__ . '/vendor/autoload.php';

// Load Laravel environment
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\DisciplinaryCategory;
use App\Http\Controllers\HRDisciplinaryController;
use Illuminate\Http\Request;

try {
    echo "=== COMPREHENSIVE DEBUG OF CATEGORIES RESPONSE ===\n";
    
    // 1. Direct database query
    echo "1. DIRECT DATABASE QUERY:\n";
    $allCategories = DisciplinaryCategory::orderBy('name')->get();
    echo "Total in database: " . $allCategories->count() . "\n";
    echo "Sample categories from DB:\n";
    foreach ($allCategories->take(5) as $category) {
        echo "  - ID: {$category->id}, Name: {$category->name}, Active: " . ($category->is_active ? 'Yes' : 'No') . "\n";
    }
    
    // 2. Controller response with different parameters
    echo "\n2. CONTROLLER API RESPONSE:\n";
    $controller = new HRDisciplinaryController();
    
    $testParams = [
        'status' => 'all',
        'severity' => 'all', 
        'per_page' => 100
    ];
    
    echo "Request params: " . json_encode($testParams) . "\n";
    
    $request = new Request($testParams);
    $response = $controller->getCategories($request);
    $responseContent = $response->getContent();
    
    echo "Response status: " . $response->getStatusCode() . "\n";
    echo "Response size: " . strlen($responseContent) . " bytes\n";
    
    $data = json_decode($responseContent, true);
    
    if ($data) {
        echo "Response structure:\n";
        echo "- success: " . ($data['success'] ? 'true' : 'false') . "\n";
        
        if (isset($data['data'])) {
            if (isset($data['data']['data'])) {
                echo "- data.data exists (pagination structure)\n";
                echo "- Categories count: " . count($data['data']['data']) . "\n";
                echo "- current_page: " . ($data['data']['current_page'] ?? 'N/A') . "\n";
                echo "- per_page: " . ($data['data']['per_page'] ?? 'N/A') . "\n";
                echo "- total: " . ($data['data']['total'] ?? 'N/A') . "\n";
                echo "- last_page: " . ($data['data']['last_page'] ?? 'N/A') . "\n";
                
                echo "\nFirst 3 categories from API:\n";
                foreach (array_slice($data['data']['data'], 0, 3) as $category) {
                    echo "  - ID: {$category['id']}, Name: {$category['name']}\n";
                }
                
                echo "\nLast 3 categories from API:\n";
                foreach (array_slice($data['data']['data'], -3) as $category) {
                    echo "  - ID: {$category['id']}, Name: {$category['name']}\n";
                }
                
            } else {
                echo "- data.data does NOT exist (direct array)\n";
                echo "- Categories count: " . count($data['data']) . "\n";
            }
        } else {
            echo "- data field missing\n";
        }
        
        // Show full response structure (first 1000 chars)
        echo "\nFirst 1000 chars of response:\n";
        echo substr($responseContent, 0, 1000) . "\n";
        
    } else {
        echo "Failed to decode JSON response\n";
        echo "Raw response: " . substr($responseContent, 0, 500) . "\n";
    }
    
    // 3. Test different parameters that might affect results
    echo "\n3. TESTING DIFFERENT PARAMETER COMBINATIONS:\n";
    
    $paramTests = [
        [],
        ['status' => 'all'],
        ['severity' => 'all'],
        ['status' => 'all', 'severity' => 'all'],
        ['status' => 'active'],
        ['status' => 'active', 'severity' => 'all'],
        ['per_page' => 50],
        ['per_page' => 100],
    ];
    
    foreach ($paramTests as $i => $params) {
        $request = new Request($params);
        $response = $controller->getCategories($request);
        $data = json_decode($response->getContent(), true);
        
        $count = 0;
        if (isset($data['data']['data'])) {
            $count = count($data['data']['data']);
        } elseif (isset($data['data'])) {
            $count = is_array($data['data']) ? count($data['data']) : 0;
        }
        
        echo "Test " . ($i + 1) . " " . json_encode($params) . " => $count categories\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}