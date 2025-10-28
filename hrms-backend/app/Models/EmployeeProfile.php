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
        'shift_id',
        'first_name',
        'last_name',
        'nickname',
        'email',
        'position',
        'department',
        'salary',
        'contact_number',
        'address',
        'civil_status',
        'place_of_birth',
        'birth_date',
        'age',
        'gender',
        'province',
        'barangay',
        'city',
        'postal_code',
        'present_address',
        'phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'hire_date',
        'employment_status',
        'job_title',
        'tenurity',
        'sss',
        'philhealth',
        'pagibig',
        'tin_no',
        'status',
        'termination_date',
        'termination_reason',
        'termination_remarks',
        'termination_notes',
        'name_edit_count',
        'nickname_edit_count',
        'civil_status_edit_count',
        'address_edit_count',
        'contact_edit_count',
        'emergency_contact_edit_count'
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

    public function shift()
    {
        return $this->belongsTo(EmployeeShift::class);
    }

    /**
     * Generate a unique employee ID in format EM####
     */
    public static function generateEmployeeId()
    {
        do {
            // Generate a random 4-digit number
            $number = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
            $employeeId = 'EM' . $number;
        } while (self::where('employee_id', $employeeId)->exists());

        return $employeeId;
    }

    /**
     * Boot method to auto-generate employee_id when creating
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($employee) {
            if (empty($employee->employee_id)) {
                $employee->employee_id = self::generateEmployeeId();
            }
        });
    }

    /**
     * Get the next sequential employee ID
     */
    public static function getNextEmployeeId()
    {
        $lastEmployee = self::where('employee_id', 'like', 'EM%')
            ->whereRaw('CAST(SUBSTRING(employee_id, 3) AS UNSIGNED) < 10000') // Only consider IDs under 10000
            ->orderByRaw('CAST(SUBSTRING(employee_id, 3) AS UNSIGNED) DESC')
            ->first();
        
        if ($lastEmployee) {
            $lastNumber = (int) substr($lastEmployee->employee_id, 2);
            return 'EM' . ($lastNumber + 1);
        }
        
        return 'EM1001';
    }
}
