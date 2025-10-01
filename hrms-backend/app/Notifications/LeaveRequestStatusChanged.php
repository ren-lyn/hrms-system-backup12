<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use App\Models\LeaveRequest;

class LeaveRequestStatusChanged extends Notification
{
    use Queueable;

    private LeaveRequest $leaveRequest;

    public function __construct(LeaveRequest $leaveRequest)
    {
        $this->leaveRequest = $leaveRequest;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        $status = $this->leaveRequest->status;
        $statusText = $status === 'approved' ? 'approved' : ($status === 'rejected' ? 'rejected' : $status);
        
        // Use standardized messages based on status
        $message = '';
        if ($status === 'approved') {
            $message = 'Your leave request has been approved. Please check the form for collection details.';
        } elseif ($status === 'rejected') {
            $message = 'Your leave request has been rejected. Please check the form for details.';
        } else {
            $message = 'Your leave request is ' . $statusText . '.';
        }
        
        return [
            'type' => 'leave_status',
            'leave_id' => $this->leaveRequest->id,
            'status' => $status,
            'title' => 'Leave request ' . $statusText,
            'message' => $message,
            'created_at' => now(),
        ];
    }
}


