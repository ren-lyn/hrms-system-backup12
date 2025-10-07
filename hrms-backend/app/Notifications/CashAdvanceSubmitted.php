<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\CashAdvanceRequest;

class CashAdvanceSubmitted extends Notification
{
    use Queueable;

    private CashAdvanceRequest $cashAdvanceRequest;

    /**
     * Create a new notification instance.
     */
    public function __construct(CashAdvanceRequest $cashAdvanceRequest)
    {
        $this->cashAdvanceRequest = $cashAdvanceRequest;
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
            ->subject('New Cash Advance Request Submitted - ' . $this->cashAdvanceRequest->name)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A new cash advance request has been submitted by an employee and requires your review.')
            ->line('**Request Details:**')
            ->line('Employee: ' . $this->cashAdvanceRequest->name)
            ->line('Department: ' . $this->cashAdvanceRequest->department)
            ->line('Amount: PHP ' . number_format($this->cashAdvanceRequest->amount_ca, 2))
            ->line('Reason: ' . $this->cashAdvanceRequest->reason)
            ->line('Date Filed: ' . $this->cashAdvanceRequest->date_field)
            ->action('Review Request', url('/hr/cash-advances/' . $this->cashAdvanceRequest->id))
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
            'type' => 'cash_advance_submitted',
            'cash_advance_id' => $this->cashAdvanceRequest->id,
            'employee_id' => $this->cashAdvanceRequest->user_id,
            'employee_name' => $this->cashAdvanceRequest->name,
            'department' => $this->cashAdvanceRequest->department,
            'amount' => $this->cashAdvanceRequest->amount_ca,
            'reason' => $this->cashAdvanceRequest->reason,
            'title' => 'New Cash Advance Request Submitted',
            'message' => $this->cashAdvanceRequest->name . ' from ' . $this->cashAdvanceRequest->department . ' has submitted a cash advance request for PHP ' . number_format($this->cashAdvanceRequest->amount_ca, 2) . '.',
            'priority' => 'medium',
            'action_required' => true,
            'created_at' => now(),
        ];
    }
}
