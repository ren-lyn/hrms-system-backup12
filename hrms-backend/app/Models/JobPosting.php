<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobPosting extends Model
{
    use HasFactory;

    protected $fillable = [
        'hr_staff_id',
        'title',
        'description',
        'requirements',
        'department',
        'status',
    ];

    public function applications()
    {
        return $this->hasMany(Application::class, 'job_posting_id');
    }

    public function hrStaff()
    {
        return $this->belongsTo(User::class, 'hr_staff_id');
    }
}
