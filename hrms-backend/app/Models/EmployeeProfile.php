<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeProfile extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'user_id',
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'position',
        'department',
        'salary',
        'contact_number',
        'address',
        'marital_status',
        'religion',
        'place_of_birth',
        'birth_date',
        'blood_type',
        'gender',
        'province',
        'barangay',
        'city',
        'postal_code',
        'phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'hire_date',
        'employment_status',
        'job_title',
        'sss',
        'philhealth',
        'pagibig',
        'marital_status_edit_count',
        'address_edit_count',
        'contact_edit_count'
    ];

    public function scopeEmployees($query)
    {
        return $query->where('role_id', '!=', 5);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }

    public function disciplinaryActions()
    {
        return $this->hasMany(DisciplinaryAction::class);
    }

    public function resignationFlag()
    {
        return $this->hasOne(ResignationFlag::class);
    }
}
