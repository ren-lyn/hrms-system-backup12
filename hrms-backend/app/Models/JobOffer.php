<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'department',
        'position',
        'salary',
        'payment_schedule',
        'employment_type',
        'work_setup',
        'offer_validity',
        'contact_person',
        'contact_number',
        'notes',
        'status',
        'offer_sent_at',
        'responded_at'
    ];

    protected $dates = [
        'offer_sent_at',
        'responded_at'
    ];

    public function application()
    {
        return $this->belongsTo(Application::class);
    }
}
