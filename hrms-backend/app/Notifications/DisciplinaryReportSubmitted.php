<?php

namespace App\Notifications;

use App\Models\DisciplinaryReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DisciplinaryReportSubmitted extends Notification
{
    use Queueable;
    
    public $disciplinaryReport;

    /**
     * Create a new notification instance.
     */
    public function __construct(DisciplinaryReport $disciplinaryReport)
    {
        $this->disciplinaryReport = $disciplinaryReport;
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
            ->subject('New Disciplinary Report Submitted - ' . $this->disciplinaryReport->report_number)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A new disciplinary report has been submitted and requires your review.')
            ->line('**Report Details:**')
            ->line('Report Number: ' . $this->disciplinaryReport->report_number)
            ->line('Employee: ' . $this->disciplinaryReport->employee->first_name . ' ' . $this->disciplinaryReport->employee->last_name)
            ->line('Category: ' . $this->disciplinaryReport->disciplinaryCategory->name)
            ->line('Incident Date: ' . $this->disciplinaryReport->incident_date->format('M d, Y'))
            ->line('Priority: ' . ucfirst($this->disciplinaryReport->priority))
            ->action('Review Report', url('/hr/disciplinary-reports/' . $this->disciplinaryReport->id))
            ->line('Please review this report promptly and take appropriate action.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'disciplinary_report_submitted',
            'report_id' => $this->disciplinaryReport->id,
            'report_number' => $this->disciplinaryReport->report_number,
            'employee_name' => $this->disciplinaryReport->employee->first_name . ' ' . $this->disciplinaryReport->employee->last_name,
            'category' => $this->disciplinaryReport->disciplinaryCategory->name,
            'priority' => $this->disciplinaryReport->priority,
            'incident_date' => $this->disciplinaryReport->incident_date->format('Y-m-d'),
            'message' => 'New disciplinary report requires review'
        ];
    }
}
