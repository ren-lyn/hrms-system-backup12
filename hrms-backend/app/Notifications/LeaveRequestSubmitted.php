<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\LeaveRequest;

class LeaveRequestSubmitted extends Notification
{
    use Queueable;

    private LeaveRequest $leaveRequest;

    /**
     * Create a new notification instance.
     */
    public function __construct(LeaveRequest $leaveRequest)
    {
        $this->leaveRequest = $leaveRequest;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Leave Request Submitted - ' . $this->leaveRequest->employee_name)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A new leave request has been submitted by an employee and requires your approval.')
            ->line('**Request Details:**')
            ->line('Employee: ' . $this->leaveRequest->employee_name)
            ->line('Department: ' . $this->leaveRequest->department)
            ->line('Leave Type: ' . ucfirst($this->leaveRequest->type))
            ->line('From: ' . $this->leaveRequest->from->format('M d, Y'))
            ->line('To: ' . $this->leaveRequest->to->format('M d, Y'))
            ->line('Total Days: ' . $this->leaveRequest->total_days)
            ->line('Reason: ' . $this->leaveRequest->reason)
            ->action('Review Request', url('/manager/leave-requests/' . $this->leaveRequest->id))
            ->line('Please review and approve or reject this request promptly.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'leave_request_submitted',
            'leave_id' => $this->leaveRequest->id,
            'employee_id' => $this->leaveRequest->employee_id,
            'employee_name' => $this->leaveRequest->employee_name,
            'department' => $this->leaveRequest->department,
            'leave_type' => $this->leaveRequest->type,
            'from_date' => $this->leaveRequest->from->format('Y-m-d'),
            'to_date' => $this->leaveRequest->to->format('Y-m-d'),
            'total_days' => $this->leaveRequest->total_days,
            'title' => 'New Leave Request Submitted',
            'message' => $this->leaveRequest->employee_name . ' from ' . $this->leaveRequest->department . ' has submitted a ' . $this->leaveRequest->type . ' leave request for ' . $this->leaveRequest->total_days . ' days.',
            'priority' => 'high',
            'action_required' => true,
            'created_at' => now(),
        ];
    }
}
