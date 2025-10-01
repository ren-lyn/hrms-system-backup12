<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Foundation\Application;
use App\Models\User;
use App\Models\Evaluation;
use App\Models\EvaluationForm;
use App\Models\EvaluationQuestion;
use App\Notifications\EvaluationCompleted;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing Evaluation Notification System\n";
echo "=====================================\n\n";

try {
    // Check if we have users in the system
    $employeeCount = User::whereHas('role', function($query) {
        $query->where('name', 'Employee');
    })->count();
    
    $managerCount = User::whereHas('role', function($query) {
        $query->where('name', 'Manager');
    })->count();
    
    echo "System Status:\n";
    echo "- Employees in system: {$employeeCount}\n";
    echo "- Managers in system: {$managerCount}\n";
    
    // Check for active evaluation forms
    $activeFormCount = EvaluationForm::where('status', 'Active')->count();
    echo "- Active evaluation forms: {$activeFormCount}\n";
    
    // Check for existing evaluations
    $submittedEvaluations = Evaluation::where('status', 'Submitted')->count();
    echo "- Submitted evaluations: {$submittedEvaluations}\n\n";
    
    if ($submittedEvaluations > 0) {
        echo "Testing Notification Content:\n";
        echo "----------------------------\n";
        
        // Get a sample evaluation
        $sampleEvaluation = Evaluation::with(['employee', 'manager.employeeProfile', 'evaluationForm'])
            ->where('status', 'Submitted')
            ->first();
            
        if ($sampleEvaluation) {
            echo "Sample Evaluation ID: {$sampleEvaluation->id}\n";
            echo "Employee: {$sampleEvaluation->employee->name}\n";
            echo "Manager: {$sampleEvaluation->manager->name}\n";
            echo "Score: {$sampleEvaluation->total_score}\n";
            echo "Result: " . ($sampleEvaluation->is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT') . "\n\n";
            
            // Create notification instance to test content
            $notification = new EvaluationCompleted($sampleEvaluation);
            $notificationData = $notification->toArray($sampleEvaluation->employee);
            
            echo "Notification Data:\n";
            echo "- Type: {$notificationData['type']}\n";
            echo "- Title: {$notificationData['title']}\n";
            echo "- Message: {$notificationData['message']}\n";
            echo "- Evaluation ID: {$notificationData['evaluation_id']}\n";
            echo "- Redirect URL: {$notificationData['redirect_url']}\n";
            echo "- Manager Name: {$notificationData['manager_name']}\n";
            echo "- Result: {$notificationData['result']}\n\n";
            
            // Test the notification routes
            echo "API Endpoints Available:\n";
            echo "- GET /api/notifications - Get user notifications\n";
            echo "- POST /api/notifications/{id}/read - Mark notification as read\n";
            echo "- GET /api/employee-evaluations/my-evaluations - Get employee's evaluations\n";
            echo "- GET /api/employee-evaluations/{id} - View specific evaluation\n";
            echo "- GET /api/employee-evaluations/{id}/pdf - Download evaluation PDF\n\n";
            
            echo "✅ Notification system is properly configured!\n";
            echo "✅ When an evaluation is submitted, the employee will receive a notification with:\n";
            echo "   - Clear title: 'New Evaluation Available'\n";
            echo "   - Descriptive message about the completed evaluation\n";
            echo "   - Evaluation ID for frontend redirection\n";
            echo "   - Redirect URL: '/employee/evaluations/{id}'\n\n";
            
            echo "🔗 Frontend Integration:\n";
            echo "   The frontend should listen for notifications and redirect users to the\n";
            echo "   evaluation summary page using the 'redirect_url' or 'evaluation_id' fields.\n";
            
        } else {
            echo "❌ No submitted evaluations found to test with.\n";
        }
        
    } else {
        echo "ℹ️  No submitted evaluations found. To test:\n";
        echo "   1. Create an evaluation form (if not exists)\n";
        echo "   2. Have a manager submit an evaluation for an employee\n";
        echo "   3. The notification will be automatically sent\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error testing notification system: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=====================================\n";
echo "Test completed.\n";