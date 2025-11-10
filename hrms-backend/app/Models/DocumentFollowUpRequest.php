<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentFollowUpRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'document_requirement_id',
        'document_key',
        'applicant_id',
        'message',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size',
        'status',
        'extension_days',
        'extension_deadline',
        'hr_response',
        'hr_user_id',
        'responded_at',
    ];

    protected $casts = [
        'extension_deadline' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function documentRequirement(): BelongsTo
    {
        return $this->belongsTo(DocumentRequirement::class);
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(Applicant::class);
    }

    public function hrUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hr_user_id');
    }
}

