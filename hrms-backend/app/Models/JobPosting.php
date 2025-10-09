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
        'position',
        'salary_min',
        'salary_max',
        'salary_notes',
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

    /**
     * Get salary ranges for positions
     */
    public static function getSalaryRanges()
    {
        return [
            'HR Assistant' => ['min' => 22000, 'max' => 30000],
            'HR Staff' => ['min' => 25000, 'max' => 35000],
            'Production Worker' => ['min' => 14000, 'max' => 22000],
            'Assistant Foreman' => ['min' => 18000, 'max' => 28000],
            'Foreman' => ['min' => 22000, 'max' => 32000],
            'Driver' => ['min' => 14000, 'max' => 28000, 'notes' => 'Salary depends on distance and routes assigned'],
            'Helper' => ['min' => 12000, 'max' => 16000],
            'Admin Staff' => ['min' => 14000, 'max' => 22000],
            'Maintenance Assistant' => ['min' => 14000, 'max' => 20000],
            'Maintenance Foreman' => ['min' => 20000, 'max' => 30000],
            'Accounting Assistant' => ['min' => 18000, 'max' => 25000],
            'Accounting Staff' => ['min' => 22000, 'max' => 35000],
        ];
    }

    /**
     * Get salary range for a specific position
     */
    public static function getSalaryRangeForPosition($position)
    {
        $ranges = self::getSalaryRanges();
        return $ranges[$position] ?? null;
    }
}
