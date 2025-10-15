<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PerformanceMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        $response = $next($request);
        
        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        // Add performance headers
        $response->headers->set('X-Response-Time', round($executionTime, 2) . 'ms');
        $response->headers->set('X-Cache-Status', $this->getCacheStatus($request));
        
        // Add cache control headers for better browser caching
        if ($request->is('api/employees') || $request->is('api/job-postings')) {
            $response->headers->set('Cache-Control', 'public, max-age=600'); // 10 minutes
        } elseif ($request->is('api/leave-requests') || $request->is('api/cash-advances')) {
            $response->headers->set('Cache-Control', 'public, max-age=120'); // 2 minutes
        } elseif ($request->is('api/auth/user') || $request->is('api/employee/profile')) {
            $response->headers->set('Cache-Control', 'public, max-age=900'); // 15 minutes
        }
        
        return $response;
    }
    
    private function getCacheStatus(Request $request): string
    {
        // This would be implemented based on your caching strategy
        if ($request->is('api/employees')) {
            return 'cached';
        }
        
        return 'no-cache';
    }
}
