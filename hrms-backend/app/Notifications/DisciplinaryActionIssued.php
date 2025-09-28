<?php

namespace App\Notifications;

use App\Models\DisciplinaryAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DisciplinaryActionIssued extends Notification
{
    use Queueable;
    
    public $disciplinaryAction;

    /**
     * Create a new notification instance.
     */
    public function __construct(DisciplinaryAction $disciplinaryAction)
    {
        $this->disciplinaryAction = $disciplinaryAction;
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
        return (new MailMessage)
            ->subject('Disciplinary Action Issued - ' . $this->disciplinaryAction->action_number)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A disciplinary action has been issued against you and requires your attention.')
            ->line('**Action Details:**')
            ->line('Action Number: ' . $this->disciplinaryAction->action_number)
            ->line('Action Type: ' . ucfirst(str_replace('_', ' ', $this->disciplinaryAction->action_type)))
            ->line('Effective Date: ' . $this->disciplinaryAction->effective_date->format('M d, Y'))
            ->line('Due Date for Explanation: ' . $this->disciplinaryAction->due_date->format('M d, Y'))
            ->line('You are required to submit an explanation regarding this matter.')
            ->action('Submit Explanation', url('/employee/disciplinary-actions/' . $this->disciplinaryAction->id))
            ->line('Please submit your explanation by the due date specified above.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'disciplinary_action_issued',
            'action_id' => $this->disciplinaryAction->id,
            'action_number' => 'DA-' . $this->disciplinaryAction->id,
            'action_type' => $this->disciplinaryAction->action_type,
            'due_date' => $this->disciplinaryAction->due_date ? $this->disciplinaryAction->due_date->format('Y-m-d') : null,
            'title' => 'Disciplinary Action Issued',
            'message' => 'A disciplinary action has been issued against you and requires your explanation.'
        ];
    }
}
