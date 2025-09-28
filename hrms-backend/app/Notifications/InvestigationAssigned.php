<?php

namespace App\Notifications;

use App\Models\DisciplinaryAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvestigationAssigned extends Notification
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
            ->subject('Investigation Assigned - ' . $this->disciplinaryAction->action_number)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('You have been assigned as the investigator for a disciplinary case.')
            ->line('**Case Details:**')
            ->line('Action Number: ' . $this->disciplinaryAction->action_number)
            ->line('Employee: ' . $this->disciplinaryAction->employee->first_name . ' ' . $this->disciplinaryAction->employee->last_name)
            ->line('Action Type: ' . ucfirst(str_replace('_', ' ', $this->disciplinaryAction->action_type)))
            ->action('Begin Investigation', url('/manager/investigations/' . $this->disciplinaryAction->id))
            ->line('Please conduct a thorough investigation and submit your findings.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'investigation_assigned',
            'action_id' => $this->disciplinaryAction->id,
            'action_number' => $this->disciplinaryAction->action_number,
            'employee_name' => $this->disciplinaryAction->employee->first_name . ' ' . $this->disciplinaryAction->employee->last_name,
            'message' => 'Investigation assigned to you'
        ];
    }
}
