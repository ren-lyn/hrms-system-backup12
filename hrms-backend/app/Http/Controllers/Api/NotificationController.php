<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        return response()->json([
            'data' => $user->notifications()->latest()->take(20)->get()->map(function($n) {
                $data = [
                    'id' => $n->id,
                    'type' => $n->data['type'] ?? null,
                    'title' => $this->generateNotificationTitle($n),
                    'message' => $this->generateNotificationMessage($n),
                    'leave_id' => $n->data['leave_id'] ?? null,
                    'action_id' => $n->data['action_id'] ?? null,
                    'disciplinary_action_id' => $n->data['action_id'] ?? null,
                    'status' => $n->data['status'] ?? null,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ];
                
                return $data;
            })
        ]);
    }

    public function markAsRead($id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $notification = $user->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }
    
    private function generateNotificationTitle($notification)
    {
        $type = $notification->data['type'] ?? '';
        $data = $notification->data;
        
        switch ($type) {
            case 'disciplinary_action_issued':
                return 'Disciplinary Action Issued';
            case 'disciplinary_verdict_issued':
                return 'Disciplinary Verdict Issued';
            case 'investigation_assigned':
                return 'Investigation Assigned';
            case 'leave_status':
                return 'Leave Request Update';
            default:
                return $data['title'] ?? 'Notification';
        }
    }
    
    private function generateNotificationMessage($notification)
    {
        $type = $notification->data['type'] ?? '';
        $data = $notification->data;
        
        switch ($type) {
            case 'disciplinary_action_issued':
                $actionType = ucfirst(str_replace('_', ' ', $data['action_type'] ?? 'action'));
                return "A {$actionType} has been issued against you. Please submit your explanation by " . 
                       (isset($data['due_date']) ? date('M d, Y', strtotime($data['due_date'])) : 'the specified due date');
            
            case 'disciplinary_verdict_issued':
                return 'A verdict has been issued for your disciplinary case. Please review the details.';
            
            case 'investigation_assigned':
                return 'You have been assigned to investigate a disciplinary case.';
            
            case 'leave_status':
                $status = ucfirst($data['status'] ?? 'updated');
                return "Your leave request has been {$status}.";
            
            default:
                return $data['message'] ?? 'You have a new notification.';
        }
    }
}


