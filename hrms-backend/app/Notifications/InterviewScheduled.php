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
            ->line('🕐 **Start Time:** ' . $interviewTime)
            ->when($this->interview->end_time, function ($message) {
                $endTime = \Carbon\Carbon::parse($this->interview->end_time)->format('g:i A');
                return $message->line('🕑 **End Time:** ' . $endTime);
            })
            ->line('📍 **Location:** ' . $this->interview->location)
            ->line('👤 **Interviewer:** ' . $this->interview->interviewer)
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
        
        $endTime = $this->interview->end_time 
            ? \Carbon\Carbon::parse($this->interview->end_time)->format('g:i A')
            : null;
        
        return [
            'type' => 'interview_scheduled',
            'title' => 'Interview Scheduled',
            'message' => "Your interview has been scheduled for {$interviewDate} at {$interviewTime}" . ($endTime ? " - {$endTime}" : ""),
            'interview_id' => $this->interview->id,
            'application_id' => $this->application->id,
            'applicant_user_id' => $this->application->applicant->user_id ?? null,
            'interview_date' => $this->interview->interview_date,
            'interview_time' => $this->interview->interview_time,
            'end_time' => $this->interview->end_time,
            'interview_type' => $this->interview->interview_type ?? 'On-site',
            'location' => $this->interview->location,
            'interviewer' => $this->interview->interviewer,
            'notes' => $this->interview->notes ?? '',
            'position' => $this->application->jobPosting->title ?? 'N/A',
            'department' => $this->application->jobPosting->department ?? 'N/A',
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