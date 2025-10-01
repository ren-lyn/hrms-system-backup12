<?php

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking Emily Reyes Notifications\n";
echo "=================================\n\n";

try {
    // Check if Emily Reyes exists
    $user = App\Models\User::where('name', 'Emily Reyes')->first();
    
    if ($user) {
        echo "User found: {$user->name} (ID: {$user->id})\n";
        echo "Email: {$user->email}\n";
        echo "Role: " . ($user->role ? $user->role->name : 'No role') . "\n";
        echo "Total notifications: " . $user->notifications()->count() . "\n";
        echo "Unread notifications: " . $user->unreadNotifications()->count() . "\n\n";
        
        // Show recent notifications
        $notifications = $user->notifications()->latest()->take(10)->get();
        if ($notifications->count() > 0) {
            echo "Recent notifications:\n";
            echo "--------------------\n";
            foreach ($notifications as $n) {
                echo "ID: {$n->id}\n";
                echo "Title: " . ($n->data['title'] ?? 'No title') . "\n";
                echo "Type: " . ($n->data['type'] ?? 'No type') . "\n";
                echo "Message: " . ($n->data['message'] ?? 'No message') . "\n";
                echo "Evaluation ID: " . ($n->data['evaluation_id'] ?? 'None') . "\n";
                echo "Created: {$n->created_at}\n";
                echo "Read: " . ($n->read_at ? 'Yes' : 'No') . "\n";
                echo "---\n";
            }
        } else {
            echo "❌ No notifications found for Emily Reyes.\n\n";
        }
        
        // Check if there are any evaluations for this user
        $evaluations = App\Models\Evaluation::where('employee_id', $user->id)->get();
        echo "Evaluations for this user: " . $evaluations->count() . "\n";
        
        if ($evaluations->count() > 0) {
            echo "Evaluation details:\n";
            foreach ($evaluations as $eval) {
                echo "- Evaluation ID: {$eval->id}, Status: {$eval->status}, Notified: " . ($eval->employee_notified ? 'Yes' : 'No') . "\n";
            }
        }
        
    } else {
        echo "❌ User Emily Reyes not found.\n";
        
        // Show all users
        echo "\nAll users in system:\n";
        $users = App\Models\User::with('role')->get();
        foreach ($users as $u) {
            echo "- {$u->name} (ID: {$u->id}, Role: " . ($u->role ? $u->role->name : 'No role') . ")\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=================================\n";
echo "Check completed.\n";