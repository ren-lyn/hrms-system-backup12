<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_posting_id',
        'applicant_id',
        'status',
        'applied_at',
        'resume_path',
        'reviewed_at',
        'offer_accepted_at',
        'documents_start_date',
        'documents_deadline',
        'documents_locked_at',
        'documents_approved_at',
        'documents_snapshot',
        'documents_completed_at',
    ];

    protected $casts = [
        'applied_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'offer_accepted_at' => 'datetime',
        'documents_start_date' => 'datetime',
        'documents_deadline' => 'datetime',
        'documents_locked_at' => 'datetime',
        'documents_approved_at' => 'datetime',
        'documents_snapshot' => 'array',
        'documents_completed_at' => 'datetime',
    ];

    protected $appends = [
        'offer_status',
        'is_offer_locked',
        'is_in_benefits_enrollment',
        'benefits_enrollment_status',
        'documents_stage_status',
    ];

    public function jobPosting()
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function applicant()
    {
        return $this->belongsTo(Applicant::class);
    }

    public function jobOffer()
    {
        return $this->hasOne(JobOffer::class);
    }

    public function documentRequirements()
    {
        return $this->hasMany(DocumentRequirement::class);
    }

    public function documentSubmissions()
    {
        return $this->hasMany(DocumentSubmission::class);
    }

    public function documentFollowUpRequests()
    {
        return $this->hasMany(DocumentFollowUpRequest::class);
    }

    public function benefitsEnrollment()
    {
        return $this->hasOne(BenefitsEnrollment::class);
    }

    protected function resolveJobOfferRelation(): ?JobOffer
    {
        if ($this->relationLoaded('jobOffer')) {
            return $this->getRelation('jobOffer');
        }

        return $this->jobOffer()->first();
    }

    public function getOfferStatusAttribute(): ?string
    {
        $jobOffer = $this->resolveJobOfferRelation();

        if ($jobOffer) {
            return $jobOffer->status ?: 'pending';
        }

        return match ($this->status) {
            'Offered' => 'pending',
            'Offer Accepted' => 'accepted',
            default => null,
        };
    }

    public function getIsOfferLockedAttribute(): bool
    {
        if (in_array($this->status, ['Offered', 'Offer Accepted', 'Hired'], true)) {
            return true;
        }

        $jobOffer = $this->resolveJobOfferRelation();

        if (!$jobOffer) {
            return false;
        }

        return $jobOffer->status !== 'declined';
    }

    public function getIsInBenefitsEnrollmentAttribute(): bool
    {
        if ($this->relationLoaded('benefitsEnrollment')) {
            return $this->benefitsEnrollment !== null;
        }

        return $this->benefitsEnrollment()->exists();
    }

    public function getBenefitsEnrollmentStatusAttribute(): ?string
    {
        $benefitsEnrollment = $this->relationLoaded('benefitsEnrollment')
            ? $this->benefitsEnrollment
            : $this->benefitsEnrollment()->first();

        return $benefitsEnrollment?->enrollment_status;
    }

    public function getDocumentsStageStatusAttribute(): string
    {
        if ($this->documents_completed_at) {
            return 'completed';
        }

        if ($this->documents_approved_at) {
            return 'approved';
        }

        return 'in_progress';
    }
}