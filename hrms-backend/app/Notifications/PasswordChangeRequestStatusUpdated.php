<?php

namespace App\Notifications;

use App\Models\PasswordChangeRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordChangeRequestStatusUpdated extends Notification
{
    use Queueable;

    public PasswordChangeRequest $request;

    public function __construct(PasswordChangeRequest $request)
    {
        $this->request = $request;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $status = $this->request->status;
        $subMessage = match ($status) {
            'approved' => 'Your password reset request was approved. Check your email for the reset link.',
            'rejected' => 'Your password reset request was declined. Please review the notes provided.',
            default => 'Your password reset request was updated.',
        };

        return [
            'type' => 'password_change_request_status',
            'title' => 'Password Reset Request Update',
            'message' => $subMessage,
            'status' => $status,
            'request_id' => $this->request->id,
            'notes' => $this->request->decision_notes,
            'decided_at' => optional($this->request->decision_at)->toISOString(),
        ];
    }
}



