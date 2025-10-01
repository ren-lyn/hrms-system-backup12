<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Evaluation;

class EvaluationCompleted extends Notification
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
        // For immediate delivery, prioritize database notifications
        // Mail notifications can be added when mail server is configured
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $employee = $this->evaluation->employee;
        $manager = $this->evaluation->manager;
        $formTitle = $this->evaluation->evaluationForm->title ?? 'Performance Evaluation';
        
        $mailMessage = (new MailMessage)
            ->subject('Performance Evaluation Completed')
            ->greeting("Dear {$employee->name},")
            ->line('Your performance evaluation has been completed by your manager.')
            ->line('**Evaluation Details:**')
            ->line("Form: {$formTitle}")
            ->line("Total Score: {$this->evaluation->total_score}")
            ->line("Average Rating: {$this->evaluation->average_score}")
            ->line("Result: " . ($this->evaluation->is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT'))
            ->line("Completed on: {$this->evaluation->submitted_at->format('F d, Y')}")
            ->line("Evaluated by: {$manager->name}");

        if ($this->evaluation->general_comments) {
            $mailMessage->line("**General Comments:** {$this->evaluation->general_comments}");
        }

        return $mailMessage
            ->line('You can view your detailed evaluation results and download the report from the employee portal.')
            ->action('View Evaluation Results', url('/employee/evaluation/' . $this->evaluation->id))
            ->line('Thank you!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $manager = $this->evaluation->manager;
        $managerName = $manager->name;
        
        // Try to get full name from employee profile if available
        if ($manager->employeeProfile && $manager->employeeProfile->first_name && $manager->employeeProfile->last_name) {
            $managerName = trim($manager->employeeProfile->first_name . ' ' . $manager->employeeProfile->last_name);
        }
        
        $result = $this->evaluation->is_passed ? 'passed' : 'needs improvement';
        
        return [
            'type' => 'evaluation_result',
            'evaluation_id' => $this->evaluation->id,
            'title' => 'New Evaluation Available',
            'message' => "A new evaluation is available for your review. Your performance evaluation has been completed by {$managerName}. Click to view your evaluation summary and detailed results.",
            'manager_name' => $managerName,
            'total_score' => $this->evaluation->total_score,
            'average_score' => $this->evaluation->average_score,
            'is_passed' => $this->evaluation->is_passed,
            'result' => $result,
            'submitted_at' => $this->evaluation->submitted_at,
            'created_at' => now(),
            // Add redirect information for frontend
            'redirect_url' => '/employee/evaluations/' . $this->evaluation->id,
            'action_required' => false, // This is informational, not requiring action
        ];
    }
}