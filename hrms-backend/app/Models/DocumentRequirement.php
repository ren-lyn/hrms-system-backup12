<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'document_key',
        'document_name',
        'description',
        'is_required',
        'file_format',
        'max_file_size_mb',
        'order'
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'max_file_size_mb' => 'integer',
        'order' => 'integer'
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    public function submissions()
    {
        return $this->hasMany(DocumentSubmission::class);
    }

    public function latestSubmission()
    {
        return $this->hasOne(DocumentSubmission::class)->latestOfMany();
    }

    public function followUpRequests()
    {
        return $this->hasMany(DocumentFollowUpRequest::class);
    }
}


