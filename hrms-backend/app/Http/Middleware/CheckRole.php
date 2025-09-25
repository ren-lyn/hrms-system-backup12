<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = $request->user();
        
        // If no role relationship exists, deny access
        if (!$user->role) {
            return response()->json(['message' => 'No role assigned'], 403);
        }

        $userRoleName = $user->role->name;
        
        // Check if user's role matches any of the allowed roles
        $hasPermission = false;
        foreach ($roles as $role) {
            // Handle comma-separated roles like "HR Assistant,HR Staff"
            $allowedRoles = array_map('trim', explode(',', $role));
            if (in_array($userRoleName, $allowedRoles)) {
                $hasPermission = true;
                break;
            }
        }
        
        if (!$hasPermission) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        return $next($request);
    }
}
