<?php

namespace App\Notifications;

use App\Models\DisciplinaryAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DisciplinaryVerdictIssued extends Notification
{
    use Queueable;
    
    public $disciplinaryAction;
    public $recipient; // 'employee' or 'reporter'

    /**
     * Create a new notification instance.
     */
    public function __construct(DisciplinaryAction $disciplinaryAction, $recipient = 'employee')
    {
        $this->disciplinaryAction = $disciplinaryAction;
        $this->recipient = $recipient;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $subject = 'Disciplinary Case Verdict - ' . $this->disciplinaryAction->action_number;
        $message = (new MailMessage)->subject($subject)->greeting('Hello ' . $notifiable->first_name . ',');
        
        if ($this->recipient === 'employee') {
            $message->line('The verdict for your disciplinary case has been issued.')
                   ->line('**Case Details:**')
                   ->line('Action Number: ' . $this->disciplinaryAction->action_number)
                   ->line('Verdict: ' . ucfirst(str_replace('_', ' ', $this->disciplinaryAction->verdict)))
                   ->line('Details: ' . ($this->disciplinaryAction->verdict_details ?: 'No additional details provided.'))
                   ->action('View Details', url('/employee/disciplinary-actions/' . $this->disciplinaryAction->id));
        } else {
            $message->line('The disciplinary case you reported has been concluded.')
                   ->line('**Case Details:**')
                   ->line('Action Number: ' . $this->disciplinaryAction->action_number)
                   ->line('Employee: ' . $this->disciplinaryAction->employee->first_name . ' ' . $this->disciplinaryAction->employee->last_name)
                   ->line('Verdict: ' . ucfirst(str_replace('_', ' ', $this->disciplinaryAction->verdict)))
                   ->action('View Details', url('/manager/disciplinary-reports/' . $this->disciplinaryAction->disciplinary_report_id));
        }
        
        return $message->line('Thank you for your cooperation in this matter.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'disciplinary_verdict_issued',
            'action_id' => $this->disciplinaryAction->id,
            'action_number' => $this->disciplinaryAction->action_number,
            'verdict' => $this->disciplinaryAction->verdict,
            'recipient' => $this->recipient,
            'message' => 'Disciplinary case verdict has been issued'
        ];
    }
}
