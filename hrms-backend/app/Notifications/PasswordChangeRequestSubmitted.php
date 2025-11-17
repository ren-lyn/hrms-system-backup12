<?php

namespace App\Notifications;

use App\Models\PasswordChangeRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PasswordChangeRequestSubmitted extends Notification
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
        return [
            'type' => 'password_change_request_submitted',
            'title' => 'New Password Reset Request',
            'message' => sprintf(
                '%s requested a password reset. Review the request details and approve or decline.',
                $this->request->full_name ?: ($this->request->email ?? 'An employee')
            ),
            'request_id' => $this->request->id,
            'status' => $this->request->status,
            'email' => $this->request->email,
            'full_name' => $this->request->full_name,
            'department' => $this->request->department,
            'submitted_at' => optional($this->request->created_at)->toISOString(),
            'redirect_url' => '/dashboard/admin?view=password-reset-requests',
        ];
    }
}




