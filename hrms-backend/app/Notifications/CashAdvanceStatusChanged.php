<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\CashAdvanceRequest;

class CashAdvanceStatusChanged extends Notification
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
        // For immediate delivery, prioritize database notifications
        // Mail notifications can be added back when mail server is properly configured
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $request = $this->cashAdvanceRequest;
        $status = ucfirst($request->status);
        $subject = "Cash Advance Request {$status}";
        
        $mailMessage = (new MailMessage)
            ->subject($subject)
            ->greeting("Dear {$request->name},")
            ->line("Your cash advance request has been {$request->status}.")
            ->line("**Request Details:**")
            ->line("Amount: PHP " . number_format($request->amount_ca, 2))
            ->line("Reason: {$request->reason}")
            ->line("Submitted on: {$request->created_at->format('F d, Y')}");

        if ($request->status === 'approved' && $request->collection_date) {
            $mailMessage->line("**Collection Date: {$request->collection_date->format('F d, Y')}**")
                        ->line('Please bring a valid ID when collecting your cash advance.');
        }

        if ($request->hr_remarks) {
            $mailMessage->line("**HR Remarks:** {$request->hr_remarks}");
        }

        return $mailMessage->line('You can download your cash advance form from the employee portal.')
                          ->action('View Request', url('/employee/cash-advance/' . $request->id))
                          ->line('Thank you!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $request = $this->cashAdvanceRequest;
        $status = ucfirst($request->status);
        $statusText = $request->status === 'approved' ? 'approved' : ($request->status === 'rejected' ? 'rejected' : $request->status);
        
        // Use standardized messages based on status
        $message = '';
        if ($request->status === 'approved') {
            $message = 'Your cash advance has been approved. Please check the form for collection details.';
        } elseif ($request->status === 'rejected') {
            $message = 'Your cash advance has been rejected. Please check the form for details.';
        } else {
            $message = "Your cash advance request for PHP " . number_format($request->amount_ca, 2) . " has been {$statusText}.";
        }
        
        $data = [
            'type' => 'cash_advance_status',
            'cash_advance_id' => $request->id,
            'status' => $request->status,
            'title' => "Cash Advance Request {$status}",
            'message' => $message,
            'amount' => $request->amount_ca,
            'created_at' => now(),
        ];

        if ($request->status === 'approved' && $request->collection_date) {
            $data['collection_date'] = $request->collection_date->format('F d, Y');
        }

        if ($request->hr_remarks) {
            $data['hr_remarks'] = $request->hr_remarks;
        }

        return $data;
    }
}
