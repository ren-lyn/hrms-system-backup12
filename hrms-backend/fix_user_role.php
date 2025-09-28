<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Role;

try {
    $hrRole = Role::where('name', 'HR Assistant')->first();
    $user = User::first();
    
    if (!$hrRole) {
        echo "HR Assistant role not found. Available roles:\n";
        $roles = Role::all();
        foreach ($roles as $role) {
            echo "- ID: {$role->id}, Name: {$role->name}\n";
        }
        exit(1);
    }
    
    if (!$user) {
        echo "No users found in database.\n";
        exit(1);
    }
    
    $user->role_id = $hrRole->id;
    $user->save();
    
    echo "Successfully assigned HR Assistant role to user: {$user->name}\n";
    echo "User ID: {$user->id}\n";
    echo "Role ID: {$hrRole->id}\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}