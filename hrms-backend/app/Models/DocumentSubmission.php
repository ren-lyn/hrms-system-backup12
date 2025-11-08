<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class DocumentSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'document_requirement_id',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'status',
        'rejection_reason',
        'submitted_at',
        'reviewed_at',
        'reviewed_by'
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'file_size' => 'integer'
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    public function documentRequirement()
    {
        return $this->belongsTo(DocumentRequirement::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(\App\Models\User::class, 'reviewed_by');
    }
}

