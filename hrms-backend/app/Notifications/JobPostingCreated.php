<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\JobPosting;

class JobPostingCreated extends Notification
{
    use Queueable;

    private JobPosting $jobPosting;

    /**
     * Create a new notification instance.
     */
    public function __construct(JobPosting $jobPosting)
    {
        $this->jobPosting = $jobPosting;
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
            ->subject('New Job Posting Created - ' . $this->jobPosting->title)
            ->greeting('Hello ' . $notifiable->first_name . ',')
            ->line('A new job posting has been created and is now available.')
            ->line('**Job Details:**')
            ->line('Position: ' . $this->jobPosting->title)
            ->line('Department: ' . $this->jobPosting->department)
            ->line('Status: ' . $this->jobPosting->status)
            ->line('Created on: ' . $this->jobPosting->created_at->format('M d, Y'))
            ->action('View Job Posting', url('/hr/job-postings/' . $this->jobPosting->id))
            ->line('The job posting is now live and accepting applications.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'job_posting_created',
            'job_posting_id' => $this->jobPosting->id,
            'job_title' => $this->jobPosting->title,
            'department' => $this->jobPosting->department,
            'status' => $this->jobPosting->status,
            'created_at' => $this->jobPosting->created_at->format('Y-m-d'),
            'title' => 'New Job Posting Created',
            'message' => 'A new job posting for ' . $this->jobPosting->title . ' in ' . $this->jobPosting->department . ' has been created and is now live.',
            'priority' => 'low',
            'action_required' => false,
            'created_at' => now(),
        ];
    }
}
