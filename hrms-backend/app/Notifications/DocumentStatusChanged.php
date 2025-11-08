<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Models\DocumentSubmission;

class DocumentStatusChanged extends Notification
{
    use Queueable;

    private DocumentSubmission $submission;

    /**
     * Create a new notification instance.
     */
    public function __construct(DocumentSubmission $submission)
    {
        $this->submission = $submission;
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
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $status = $this->submission->status;
        $documentName = $this->submission->documentRequirement->document_name ?? 'document';
        
        $title = $status === 'approved' 
            ? 'Document Approved' 
            : 'Document Rejected';
        
        $message = $status === 'approved'
            ? "Your {$documentName} has been approved."
            : "Your {$documentName} has been rejected. " . ($this->submission->rejection_reason ? "Reason: {$this->submission->rejection_reason}" : '');
        
        return [
            'type' => 'document_status_changed',
            'submission_id' => $this->submission->id,
            'application_id' => $this->submission->application_id,
            'document_name' => $documentName,
            'status' => $status,
            'rejection_reason' => $this->submission->rejection_reason,
            'title' => $title,
            'message' => $message,
            'created_at' => now(),
        ];
    }
}

