<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Application;

class OnboardingStatusChanged extends Notification
{
    use Queueable;

    private Application $application;

    /**
     * Create a new notification instance.
     */
    public function __construct(Application $application)
    {
        $this->application = $application;
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
        $status = $this->application->status;
        $statusText = $status === 'Hired' ? 'hired' : ($status === 'Rejected' ? 'rejected' : strtolower($status));
        
        return (new MailMessage)
            ->subject('Onboarding Status Update - ' . $this->application->jobPosting->title)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('Your application status has been updated in the onboarding process.')
            ->line('**Application Details:**')
            ->line('Position: ' . $this->application->jobPosting->title)
            ->line('Department: ' . $this->application->jobPosting->department)
            ->line('Status: ' . $status)
            ->line('Updated on: ' . $this->application->reviewed_at->format('M d, Y'))
            ->action('View Application', url('/applicant/onboarding'))
            ->line('Thank you for your interest in our company.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $status = $this->application->status;
        $statusText = $status === 'Hired' ? 'hired' : ($status === 'Rejected' ? 'rejected' : strtolower($status));
        
        return [
            'type' => 'onboarding_status_changed',
            'application_id' => $this->application->id,
            'job_posting_id' => $this->application->job_posting_id,
            'applicant_id' => $this->application->applicant_id,
            'status' => $status,
            'job_title' => $this->application->jobPosting->title,
            'department' => $this->application->jobPosting->department,
            'reviewed_at' => $this->application->reviewed_at->format('Y-m-d'),
            'title' => 'Onboarding Status Updated',
            'message' => 'Your application for ' . $this->application->jobPosting->title . ' has been ' . $statusText . ' in the onboarding process.',
            'priority' => 'medium',
            'action_required' => false,
            'created_at' => now(),
        ];
    }
}



