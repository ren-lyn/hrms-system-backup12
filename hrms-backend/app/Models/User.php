<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
   
    use HasApiTokens, HasFactory, Notifiable; 

    protected $fillable = [
         'role_id', 'email', 'password', 'first_name', 'last_name', 'is_active'
    ];

    protected $appends = ['name'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function employeeProfile()
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    public function applicant()
    {
        return $this->hasOne(Applicant::class);
    }

    public function leaveRequests() {
    return $this->hasMany(LeaveRequest::class);
    }

    public function leaves()
{
    return $this->hasMany(LeaveRequest::class, 'employee_id');
}

    // Accessor for full name
    public function getNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

}
