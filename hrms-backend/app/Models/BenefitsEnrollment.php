<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BenefitsEnrollment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'application_id',
        'enrollment_status',
        'assigned_at',
        'metadata',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}


