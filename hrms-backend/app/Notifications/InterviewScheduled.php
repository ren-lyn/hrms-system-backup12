<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class InterviewScheduled extends Notification implements ShouldQueue
{
    use Queueable;

    protected $interview;
    protected $application;

    /**
     * Create a new notification instance.
     */
    public function __construct($interview, $application)
    {
        $this->interview = $interview;
        $this->application = $application;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $interviewDate = \Carbon\Carbon::parse($this->interview->interview_date)->format('M d, Y');
        $interviewTime = \Carbon\Carbon::parse($this->interview->interview_time)->format('g:i A');
        
        return (new MailMessage)
            ->subject('Interview Scheduled - ' . ($this->application->jobPosting->title ?? 'Position'))
            ->greeting('Hello ' . ($notifiable->first_name ?? $notifiable->name ?? 'Applicant') . '!')
            ->line('We are pleased to inform you that an interview has been scheduled for your application.')
            ->line('**Interview Details:**')
            ->line('📅 **Date:** ' . $interviewDate)
            ->line('🕐 **Time:** ' . $interviewTime)
            ->line('📍 **Location:** ' . $this->interview->location)
            ->line('👤 **Interviewer:** ' . $this->interview->interviewer)
            ->line('⏱️ **Duration:** ' . ($this->interview->duration ?? 30) . ' minutes')
            ->line('💼 **Position:** ' . ($this->application->jobPosting->title ?? 'N/A'))
            ->when($this->interview->notes, function ($message) {
                return $message->line('📝 **Additional Notes:** ' . $this->interview->notes);
            })
            ->line('Please arrive 10-15 minutes early and bring a valid government ID.')
            ->action('View Interview Details', url('/personal-onboarding'))
            ->line('Thank you for your interest in joining our team!')
            ->salutation('Best regards, HR Team');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        $interviewDate = \Carbon\Carbon::parse($this->interview->interview_date)->format('M d, Y');
        $interviewTime = \Carbon\Carbon::parse($this->interview->interview_time)->format('g:i A');
        
        return [
            'type' => 'interview_scheduled',
            'title' => 'Interview Scheduled',
            'message' => "Your interview has been scheduled for {$interviewDate} at {$interviewTime}",
            'interview_id' => $this->interview->id,
            'application_id' => $this->application->id,
            'interview_date' => $this->interview->interview_date,
            'interview_time' => $this->interview->interview_time,
            'location' => $this->interview->location,
            'interviewer' => $this->interview->interviewer,
            'position' => $this->application->jobPosting->title ?? 'N/A',
            'created_at' => now(),
        ];
    }

    /**
     * Get the database representation of the notification.
     */
    public function toDatabase($notifiable): array
    {
        return $this->toArray($notifiable);
    }
}