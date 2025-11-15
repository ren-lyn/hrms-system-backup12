<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Models\BenefitClaim;

class BenefitClaimStatusChanged extends Notification
{
    use Queueable;

    private BenefitClaim $benefitClaim;

    public function __construct(BenefitClaim $benefitClaim)
    {
        $this->benefitClaim = $benefitClaim;
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        $status = $this->benefitClaim->status;
        
        // Map status to readable text
        $statusMap = [
            'submitted' => 'submitted',
            'under_review' => 'under review',
            'approved_by_hr' => 'approved by HR',
            'for_submission_to_agency' => 'for submission to agency',
            'completed' => 'completed',
            'rejected' => 'rejected'
        ];
        $statusText = $statusMap[$status] ?? $status;
        
        // Build message based on status
        $message = '';
        $claimId = 'CB-' . str_pad($this->benefitClaim->id, 4, '0', STR_PAD_LEFT);
        $benefitType = strtoupper($this->benefitClaim->benefit_type ?? '');
        
        switch ($status) {
            case 'submitted':
                $message = "Your {$benefitType} benefit claim ({$claimId}) has been submitted and is awaiting review.";
                break;
            case 'under_review':
                $message = "Your {$benefitType} benefit claim ({$claimId}) is currently under review.";
                break;
            case 'approved_by_hr':
                $message = "Your {$benefitType} benefit claim ({$claimId}) has been approved by HR. It will be processed for submission to the agency.";
                break;
            case 'for_submission_to_agency':
                $message = "Your {$benefitType} benefit claim ({$claimId}) has been prepared and is ready for submission to the agency.";
                break;
            case 'completed':
                $message = "Your {$benefitType} benefit claim ({$claimId}) has been completed. Please check your claim details for more information.";
                break;
            case 'rejected':
                $rejectionReason = $this->benefitClaim->rejection_reason 
                    ? ' Reason: ' . $this->benefitClaim->rejection_reason 
                    : '';
                $message = "Your {$benefitType} benefit claim ({$claimId}) has been rejected.{$rejectionReason}";
                break;
            default:
                $message = "Your {$benefitType} benefit claim ({$claimId}) status has been updated to {$statusText}.";
        }
        
        return [
            'type' => 'benefit_claim_status_changed',
            'benefit_claim_id' => $this->benefitClaim->id,
            'claim_id' => $claimId,
            'benefit_type' => $this->benefitClaim->benefit_type,
            'claim_type' => $this->benefitClaim->claim_type,
            'status' => $status,
            'rejection_reason' => $this->benefitClaim->rejection_reason,
            'title' => 'Benefit claim ' . $statusText,
            'message' => $message,
            'redirect_url' => '/dashboard/employee/file-benefit-claim',
            'created_at' => now(),
        ];
    }
}

