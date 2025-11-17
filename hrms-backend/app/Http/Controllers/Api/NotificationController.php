<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Notifications\RoleChangeRequested;
use Illuminate\Support\Facades\Log;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        return response()->json([
            'data' => DatabaseNotification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->latest()
                ->take(20)
                ->get()
                ->map(function($n) {
                $data = [
                    'id' => $n->id,
                    'type' => $n->data['type'] ?? null,
                    'title' => $this->generateNotificationTitle($n),
                    'message' => $this->generateNotificationMessage($n),
                    'applicant_name' => $n->data['applicant_name'] ?? null,
                    'applicant_email' => $n->data['applicant_email'] ?? null,
                    'hr_message' => $n->data['hr_message'] ?? null,
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
                    // Interview-specific fields
                    'interview_id' => $n->data['interview_id'] ?? null,
                    'applicant_user_id' => $n->data['applicant_user_id'] ?? null,
                    'interview_date' => $n->data['interview_date'] ?? null,
                    'interview_time' => $n->data['interview_time'] ?? null,
                    'end_time' => $n->data['end_time'] ?? null,
                    'interview_type' => $n->data['interview_type'] ?? null,
                    'location' => $n->data['location'] ?? null,
                    'interviewer' => $n->data['interviewer'] ?? null,
                    'notes' => $n->data['notes'] ?? null,
                    'position' => $n->data['position'] ?? null,
                    // Benefit claim specific fields
                    'benefit_claim_id' => $n->data['benefit_claim_id'] ?? null,
                    'claim_id' => $n->data['claim_id'] ?? null,
                    'benefit_type' => $n->data['benefit_type'] ?? null,
                    'claim_type' => $n->data['claim_type'] ?? null,
                    'rejection_reason' => $n->data['rejection_reason'] ?? null,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ];
                
                return $data;
            })
        ]);
    }

    public function roleChangeRequest(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'applicant_name' => 'nullable|string|max:255',
            'applicant_email' => 'nullable|email|max:255',
            'application_id' => 'nullable|integer',
            'redirect_url' => 'nullable|string|max:1024',
            'hr_message' => 'nullable|string|max:2000',
        ]);

        $payload = array_merge($validated, [
            'requested_by_user_id' => $user->id,
            'requested_by_name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->email,
        ]);

        try {
            $admins = User::whereHas('role', function ($q) {
                $q->whereIn('name', ['Admin', 'System Administrator', 'System Admin']);
            })->get();

            foreach ($admins as $admin) {
                $admin->notify(new RoleChangeRequested($payload));
            }

            Log::info('Role change request notification sent to admins', [
                'admins_notified' => $admins->count(),
                'requested_by' => $user->id,
                'applicant_email' => $validated['applicant_email'] ?? null,
                'application_id' => $validated['application_id'] ?? null,
            ]);

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            Log::error('Failed to send role change request notification', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => 'Failed to send notification'], 500);
        }
    }

    public function markAsRead($id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $notification = DatabaseNotification::where('id', $id)
            ->where('notifiable_id', $user->id)
            ->where('notifiable_type', User::class)
            ->firstOrFail();
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $notification = DatabaseNotification::where('id', $id)
            ->where('notifiable_id', $user->id)
            ->where('notifiable_type', User::class)
            ->firstOrFail();
        $notification->delete();

        return response()->json(['success' => true, 'message' => 'Notification deleted successfully']);
    }
    
    private function generateNotificationTitle($notification)
    {
        $type = $notification->data['type'] ?? '';
        $data = $notification->data;
        
        switch ($type) {
            case 'role_change_requested':
                return 'Role Change Request';
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
            case 'interview_scheduled':
                return 'Interview Scheduled';
            case 'password_change_request_submitted':
                return 'Password Reset Request';
            case 'password_change_request_status':
                return 'Password Reset Request Update';
            case 'benefit_claim_status_changed':
                $status = ucfirst($data['status'] ?? 'updated');
                return "Benefit Claim {$status}";
            case 'role_change_verification':
                return 'Role Change Verification Required';
            default:
                return $data['title'] ?? 'Notification';
        }
    }
    
    private function generateNotificationMessage($notification)
    {
        $type = $notification->data['type'] ?? '';
        $data = $notification->data;
        
        switch ($type) {
            case 'role_change_requested':
                $name = $data['applicant_name'] ?? ($data['applicant_email'] ?? 'the applicant');
                return "Please set a role for {$name}.";
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
            
            case 'interview_scheduled':
                return $data['message'] ?? 'An interview has been scheduled for your application. Check your Interview tab for details.';
            
            case 'password_change_request_submitted':
                return $data['message'] ?? 'A new password reset request was submitted and needs your review.';
            
            case 'password_change_request_status':
                $status = $data['status'] ?? null;
                if ($status === 'approved') {
                    return 'Your password reset request was approved. Please check your email for the reset link.';
                }
                if ($status === 'rejected') {
                    return 'Your password reset request was declined. Review the administrator notes.';
                }
                return $data['message'] ?? 'Your password reset request status was updated.';
            
            case 'benefit_claim_status_changed':
                // Use the message from the notification data (already formatted in BenefitClaimStatusChanged)
                return $data['message'] ?? 'Your benefit claim status has been updated.';
            
            case 'role_change_verification':
                return $data['message'] ?? 'Your role has been changed. Please verify your account to activate this role.';
            
            default:
                return $data['message'] ?? 'You have a new notification.';
        }
    }
    
    public function verifyRoleChange()
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        
        // The role is already updated by admin, we just need to confirm verification
        // This endpoint can be used to mark the verification notification as read
        // and potentially trigger any post-verification actions
        
        try {
            // Mark all role_change_verification notifications as read
            DatabaseNotification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->where('type', 'App\\Notifications\\RoleChangeVerification')
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
            
            return response()->json([
                'success' => true,
                'message' => 'Role change verified successfully. Please log out and log back in to see your new role.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to verify role change', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);
            return response()->json(['success' => false, 'message' => 'Failed to verify role change'], 500);
        }
    }
}


