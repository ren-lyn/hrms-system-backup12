<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class RoleChangeVerification extends Notification
{
    protected $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function via(object $notifiable): array
    {
        // Use database channel for immediate persistence (no queue worker needed)
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'role_change_verification',
            'title' => 'Role Change Verification Required',
            'message' => sprintf(
                'Your role has been changed to %s. Please verify your account to activate this role.',
                $this->data['new_role_name'] ?? 'Employee'
            ),
            'user_id' => $this->data['user_id'] ?? null,
            'old_role_name' => $this->data['old_role_name'] ?? null,
            'new_role_name' => $this->data['new_role_name'] ?? null,
            'redirect_url' => '/dashboard/applicant/onboarding?tab=my-account',
        ];
    }
}
