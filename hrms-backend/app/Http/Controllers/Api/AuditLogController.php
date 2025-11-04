<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Display audit logs.
     */
    public function index(Request $request)
    {
        $query = AuditLog::with('user')
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('first_name', 'like', "%{$search}%")
                               ->orWhere('last_name', 'like', "%{$search}%")
                               ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->limit(50)->get();

        return response()->json($logs->map(function($log) {
            return [
                'id' => $log->id,
                'user' => $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System',
                'action' => $log->action,
                'status' => $log->status,
                'ip_address' => $log->ip_address,
                'timestamp' => $log->created_at->toISOString(),
                'details' => $log->details
            ];
        }));
    }
}
