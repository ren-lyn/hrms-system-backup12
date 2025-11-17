<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RoleChangeRequested extends Notification
{
    protected $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function via($notifiable)
    {
        // Use database channel for immediate persistence (no queue worker needed)
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'role_change_requested',
            'title' => 'Role Change Request',
            'message' => $this->data['hr_message'] ?? 'Notify to set a new role for this applicant.',
            'applicant_name' => $this->data['applicant_name'] ?? null,
            'applicant_email' => $this->data['applicant_email'] ?? null,
            'application_id' => $this->data['application_id'] ?? null,
            'requested_by_user_id' => $this->data['requested_by_user_id'] ?? null,
            'requested_by_name' => $this->data['requested_by_name'] ?? null,
            'redirect_url' => $this->data['redirect_url'] ?? null,
            'hr_message' => $this->data['hr_message'] ?? null,
        ];
    }
}


