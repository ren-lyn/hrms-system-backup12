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
        'email',
        'status',
        'id_photo_1_path',
        'id_photo_2_path'
    ];

    protected $casts = [
        'user_id' => 'integer'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


