<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordChangeRequest extends Model
{
    protected $fillable = [
        'user_id',
        'full_name',
        'employee_id',
        'department',
        'reason',
        'decision_notes',
        'email',
        'status',
        'id_photo_1_path',
        'id_photo_2_path',
        'approved_by',
        'decision_at',
        'reset_token_sent_at',
        'completed_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'approved_by' => 'integer',
        'decision_at' => 'datetime',
        'reset_token_sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}


