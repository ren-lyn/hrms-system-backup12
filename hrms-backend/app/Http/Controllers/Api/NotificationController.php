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
                    'cash_advance_id' => $n->data['cash_advance_id'] ?? null,
                    'evaluation_id' => $n->data['evaluation_id'] ?? null,
                    'application_id' => $n->data['application_id'] ?? null,
                    'job_posting_id' => $n->data['job_posting_id'] ?? null,
                    'event_id' => $n->data['event_id'] ?? null,
                    'report_id' => $n->data['report_id'] ?? null,
                    'redirect_url' => $n->data['redirect_url'] ?? null,
                    'status' => $n->data['status'] ?? null,
                    'amount' => $n->data['amount'] ?? null,
                    'collection_date' => $n->data['collection_date'] ?? null,
                    'employee_id' => $n->data['employee_id'] ?? null,
                    'employee_name' => $n->data['employee_name'] ?? null,
                    'department' => $n->data['department'] ?? null,
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
            case 'cash_advance_status':
                $status = ucfirst($data['status'] ?? 'updated');
                return "Cash Advance Request {$status}";
            case 'evaluation_result':
                return $data['title'] ?? 'New Evaluation Available';
            case 'leave_request_submitted':
                return 'New Leave Request Submitted';
            case 'cash_advance_submitted':
                return 'New Cash Advance Request Submitted';
            case 'evaluation_submitted':
                return 'Performance Evaluation Completed';
            case 'disciplinary_report_submitted':
                return 'New Disciplinary Report Submitted';
            case 'meeting_invitation':
                return 'Meeting Invitation';
            case 'job_application_submitted':
                return 'New Job Application Submitted';
            case 'job_application_status_changed':
                return 'Job Application Status Updated';
            case 'job_posting_created':
                return 'New Job Posting Created';
            case 'leave_request_submitted_hr':
                return 'New Leave Request Submitted';
            case 'disciplinary_report_submitted_to_manager':
                return 'Disciplinary Report Submitted to Manager';
            case 'cash_advance_submitted':
                return 'New Cash Advance Request Submitted';
            case 'evaluation_submitted':
                return 'Performance Evaluation Completed';
            case 'disciplinary_report_submitted':
                return 'New Disciplinary Report Submitted';
            case 'meeting_invitation':
                return 'Meeting Invitation';
            case 'job_application_submitted':
                return 'New Job Application Submitted';
            case 'job_application_status_changed':
                return 'Job Application Status Updated';
            case 'job_posting_created':
                return 'New Job Posting Created';
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
                $status = $data['status'] ?? 'updated';
                if ($status === 'approved') {
                    return 'Your leave request has been approved. Please check the form for collection details.';
                } elseif ($status === 'rejected') {
                    return 'Your leave request has been rejected. Please check the form for details.';
                } else {
                    return "Your leave request has been {$status}.";
                }
            
            case 'cash_advance_status':
                $status = $data['status'] ?? 'updated';
                if ($status === 'approved') {
                    return 'Your cash advance has been approved. Please check the form for collection details.';
                } elseif ($status === 'rejected') {
                    return 'Your cash advance has been rejected. Please check the form for details.';
                } else {
                    $amount = isset($data['amount']) ? 'PHP ' . number_format($data['amount'], 2) : '';
                    return "Your cash advance request for {$amount} has been {$status}.";
                }
            
            case 'evaluation_result':
                return $data['message'] ?? 'A new evaluation is available for your review. Click to view your evaluation summary and detailed results.';
            
            case 'leave_request_submitted':
                return $data['message'] ?? 'A new leave request has been submitted and requires your approval.';
            
            case 'cash_advance_submitted':
                return $data['message'] ?? 'A new cash advance request has been submitted and requires your review.';
            
            case 'evaluation_submitted':
                return $data['message'] ?? 'A performance evaluation has been completed and is available for review.';
            
            case 'disciplinary_report_submitted':
                return $data['message'] ?? 'A new disciplinary report has been submitted and requires your attention.';
            
            case 'meeting_invitation':
                return $data['message'] ?? 'You have been invited to a meeting.';
            
            case 'job_application_submitted':
                return $data['message'] ?? 'A new job application has been submitted and requires your review.';
            
            case 'job_application_status_changed':
                return $data['message'] ?? 'Your job application status has been updated.';
            
            case 'job_posting_created':
                return $data['message'] ?? 'A new job posting has been created and is now live.';
            
            case 'leave_request_submitted_hr':
                return $data['message'] ?? 'A new leave request has been submitted and requires your review.';
            
            case 'disciplinary_report_submitted_to_manager':
                return $data['message'] ?? 'A disciplinary report has been submitted to a manager and requires your attention.';
            
            default:
                return $data['message'] ?? 'You have a new notification.';
        }
    }
}


