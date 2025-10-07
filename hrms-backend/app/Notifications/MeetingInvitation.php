<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\HrCalendarEvent;

class MeetingInvitation extends Notification
{
    use Queueable;

    protected $event;

    /**
     * Create a new notification instance.
     */
    public function __construct(HrCalendarEvent $event)
    {
        $this->event = $event;
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
                    ->line('You have been invited to a meeting: ' . $this->event->title)
                    ->line('Date: ' . $this->event->start_datetime->setTimezone('Asia/Manila')->format('M j, Y'))
                    ->line('Time: ' . $this->event->start_datetime->setTimezone('Asia/Manila')->format('g:i A') . ' - ' . $this->event->end_datetime->setTimezone('Asia/Manila')->format('g:i A'))
                    ->line('Description: ' . $this->event->description)
                    ->action('View Meeting Details', url('/meeting/' . $this->event->id))
                    ->line('Thank you for using our HR system!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'meeting_invitation',
            'event_id' => $this->event->id,
            'title' => 'Meeting Invitation: ' . $this->event->title,
            'message' => 'You have been invited to attend a meeting on ' . $this->event->start_datetime->setTimezone('Asia/Manila')->format('M j, Y') . ' at ' . $this->event->start_datetime->setTimezone('Asia/Manila')->format('g:i A'),
            'event_title' => $this->event->title,
            'event_description' => $this->event->description,
            'event_date' => $this->event->start_datetime->setTimezone('Asia/Manila')->format('M j, Y'),
            'event_time' => $this->event->start_datetime->setTimezone('Asia/Manila')->format('g:i A') . ' - ' . $this->event->end_datetime->setTimezone('Asia/Manila')->format('g:i A'),
            'event_type' => $this->event->event_type,
            'created_by' => $this->event->creator ? $this->event->creator->name : 'HR Assistant',
            'redirect_url' => '/my-calendar',
            'action_required' => true
        ];
    }
}