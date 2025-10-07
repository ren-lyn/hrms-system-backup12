<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Evaluation;

class EvaluationSubmitted extends Notification
{
    use Queueable;

    private Evaluation $evaluation;

    /**
     * Create a new notification instance.
     */
    public function __construct(Evaluation $evaluation)
    {
        $this->evaluation = $evaluation;
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
        $employee = $this->evaluation->employee;
        $formTitle = $this->evaluation->evaluationForm->title ?? 'Performance Evaluation';
        
        return (new MailMessage)
            ->subject('Performance Evaluation Completed - ' . $employee->name)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A performance evaluation has been completed for an employee.')
            ->line('**Evaluation Details:**')
            ->line('Employee: ' . $employee->name)
            ->line('Form: ' . $formTitle)
            ->line('Total Score: ' . $this->evaluation->total_score)
            ->line('Average Rating: ' . $this->evaluation->average_score)
            ->line('Result: ' . ($this->evaluation->is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT'))
            ->line('Completed on: ' . $this->evaluation->submitted_at->format('F d, Y'))
            ->action('View Evaluation', url('/manager/evaluations/' . $this->evaluation->id))
            ->line('The employee has been notified of their evaluation results.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $employee = $this->evaluation->employee;
        $formTitle = $this->evaluation->evaluationForm->title ?? 'Performance Evaluation';
        
        return [
            'type' => 'evaluation_submitted',
            'evaluation_id' => $this->evaluation->id,
            'employee_id' => $this->evaluation->employee_id,
            'employee_name' => $employee->name,
            'form_title' => $formTitle,
            'total_score' => $this->evaluation->total_score,
            'average_score' => $this->evaluation->average_score,
            'is_passed' => $this->evaluation->is_passed,
            'title' => 'Performance Evaluation Completed',
            'message' => 'Performance evaluation for ' . $employee->name . ' has been completed. Score: ' . $this->evaluation->total_score . ' (' . ($this->evaluation->is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT') . ').',
            'priority' => 'medium',
            'action_required' => false,
            'created_at' => now(),
        ];
    }
}
