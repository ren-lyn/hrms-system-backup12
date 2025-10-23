<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Application;

class OnboardingApplicationSubmitted extends Notification
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
        return (new MailMessage)
            ->subject('New Application for Onboarding Review - ' . $this->application->jobPosting->title)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A new job application has been submitted and is ready for onboarding review.')
            ->line('**Application Details:**')
            ->line('Position: ' . $this->application->jobPosting->title)
            ->line('Department: ' . $this->application->jobPosting->department)
            ->line('Applicant: ' . $this->application->applicant->first_name . ' ' . $this->application->applicant->last_name)
            ->line('Email: ' . $this->application->applicant->email)
            ->line('Applied on: ' . $this->application->applied_at->format('M d, Y'))
            ->action('Review in Onboarding', url('/hr/onboarding'))
            ->line('Please review this application in the Onboarding system.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'onboarding_application_submitted',
            'application_id' => $this->application->id,
            'job_posting_id' => $this->application->job_posting_id,
            'applicant_id' => $this->application->applicant_id,
            'applicant_name' => $this->application->applicant->first_name . ' ' . $this->application->applicant->last_name,
            'job_title' => $this->application->jobPosting->title,
            'department' => $this->application->jobPosting->department,
            'applied_at' => $this->application->applied_at->format('Y-m-d'),
            'title' => 'New Application for Onboarding Review',
            'message' => $this->application->applicant->first_name . ' ' . $this->application->applicant->last_name . ' has applied for ' . $this->application->jobPosting->title . ' and is ready for onboarding review.',
            'priority' => 'high',
            'action_required' => true,
            'created_at' => now(),
        ];
    }
}



