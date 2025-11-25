<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'company', 'employee_name', 'department', 'type', 'terms', 'leave_category', 'from', 'to', 
        'leave_duration', 'half_day_period', 'total_days', 'with_pay_days', 'without_pay_days', 'total_hours', 'date_filed', 'reason', 'attachment', 'signature_path', 'status', 
        'admin_remarks', 'approved_at', 'rejected_at', 'approved_by',
        'manager_approved_at', 'manager_rejected_at', 'manager_approved_by', 'manager_remarks'
    ];

    protected $casts = [
        'from' => 'date',
        'to' => 'date',
        'date_filed' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'manager_approved_at' => 'datetime',
        'manager_rejected_at' => 'datetime',
        'total_days' => 'decimal:2',
        'total_hours' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function employeeProfile()
    {
        return $this->hasOneThrough(EmployeeProfile::class, User::class, 'id', 'user_id', 'employee_id', 'id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function managerApprovedBy()
    {
        return $this->belongsTo(User::class, 'manager_approved_by');
    }

    public function getDaysCountAttribute()
    {
        return $this->from->diffInDays($this->to) + 1;
    }

    /**
     * Calculate employee tenure in months
     * 
     * @param int $employeeId
     * @return float Tenure in months
     */
    public static function calculateEmployeeTenure($employeeId)
    {
        $employee = User::find($employeeId);
        
        if (!$employee) {
            return 0;
        }
        
        // Try to get hire_date from employee profile
        $employeeProfile = $employee->employeeProfile;
        $hireDate = null;
        
        if ($employeeProfile && $employeeProfile->hire_date) {
            $hireDate = \Carbon\Carbon::parse($employeeProfile->hire_date);
        } elseif ($employee->created_at) {
            // Fallback to account creation date if hire_date not available
            $hireDate = \Carbon\Carbon::parse($employee->created_at);
        } else {
            return 0;
        }
        
        // Calculate tenure in months
        $now = \Carbon\Carbon::now();
        $tenureInMonths = $hireDate->diffInMonths($now);
        
        return $tenureInMonths;
    }

    /**
     * Determine leave category based on leave type and employee tenure
     * 
     * @param string $leaveType
     * @param int $tenureInMonths (optional) - if provided, tenure affects categorization
     * @return string 'SIL' or 'Emergency Leave'
     */
    public static function determineLeaveCategory($leaveType, $tenureInMonths = null)
    {
        // Sick Leave and Emergency Leave fall under SIL ONLY for employees with 1+ year tenure
        $silLeaveTypes = ['Sick Leave', 'Emergency Leave'];
        
        if (in_array($leaveType, $silLeaveTypes)) {
            // If tenure is provided and employee has 1+ year (12+ months), categorize as SIL
            // Otherwise, categorize as Emergency Leave (EL)
            if ($tenureInMonths !== null && $tenureInMonths >= 12) {
                return 'Service Incentive Leave (SIL)';
            } else {
                // New hires (< 1 year): Even Sick/Emergency Leave is categorized as Emergency Leave
                return 'Emergency Leave (EL)';
            }
        }
        
        // All other leave types fall under Emergency Leave category
        return 'Emergency Leave (EL)';
    }

    /**
     * Calculate automatic payment terms based on employee tenure
     * 
     * New Rules:
     * - < 1 year: All leave types are WITHOUT PAY
     * - 1 year+: Sick/Emergency categorized as SIL, gets 8 days WITH PAY
     * - 1 year+: Other leave types get WITH PAY based on config
     * 
     * Categories (tenure-based):
     * - SIL (Service Incentive Leave): Sick Leave and Emergency Leave ONLY for employees with 1+ year tenure
     * - Emergency Leave (EL): All other leave types, and Sick/Emergency for employees with < 1 year tenure
     * 
     * @param int $employeeId
     * @param string $leaveType
     * @param int $requestedDays
     * @param int $currentYear
     * @return array ['with_pay_days' => int, 'without_pay_days' => int, 'terms' => string, 'message' => string, 'leave_category' => string]
     */
    public static function calculateAutomaticPaymentTerms($employeeId, $leaveType, $requestedDays, $currentYear = null)
    {
        $currentYear = $currentYear ?? now()->year;
        
        // Calculate employee tenure
        $tenureInMonths = self::calculateEmployeeTenure($employeeId);
        
        // Determine leave category (tenure-based for Sick/Emergency Leave)
        $leaveCategory = self::determineLeaveCategory($leaveType, $tenureInMonths);
        $isSIL = ($leaveCategory === 'Service Incentive Leave (SIL)');
        
        // Determine max with-pay days based on tenure and leave category
        $maxWithPayDays = 0;
        
        if ($tenureInMonths < 12) {
            // Less than 1 year: All leave types are WITHOUT PAY
            $maxWithPayDays = 0;
        } else {
            // 1 year or more
            if ($isSIL) {
                // SIL gets 8 days WITH PAY
                $maxWithPayDays = 8;
            } else {
                // Other leave types get WITH PAY based on their configured days
                // For tenure >= 1 year, use the original config or default to full pay
                $withPayDaysConfig = config('leave.with_pay_days', []);
                $maxWithPayDays = $withPayDaysConfig[$leaveType] ?? $requestedDays; // If not in config, all days are paid
            }
        }
        
        // If no paid days available, return all WITHOUT PAY
        if ($maxWithPayDays === 0) {
            return [
                'with_pay_days' => 0,
                'without_pay_days' => $requestedDays,
                'terms' => 'without PAY',
                'leave_category' => $leaveCategory,
                'message' => "Based on your tenure ({$tenureInMonths} months), this leave will be without pay.",
                'max_with_pay' => 0,
                'used_with_pay' => 0,
                'remaining_with_pay' => 0,
                'tenure_months' => $tenureInMonths
            ];
        }
        
        // Calculate how many "with pay" days have been used for this leave category in current year
        // For SIL, count both Sick Leave and Emergency Leave together
        // For other leaves, count each type separately
        $usedWithPayDays = 0;
        
        if ($isSIL) {
            // Count all Sick Leave and Emergency Leave together for SIL
            $usedWithPayDays = self::where('employee_id', $employeeId)
                ->whereIn('type', ['Sick Leave', 'Emergency Leave'])
                ->whereYear('from', $currentYear)
                ->whereIn('status', ['approved'])
                ->sum('with_pay_days'); // Use with_pay_days instead of total_days
        } else {
            // Count specific leave type
            $usedWithPayDays = self::where('employee_id', $employeeId)
                ->where('type', $leaveType)
                ->whereYear('from', $currentYear)
                ->whereIn('status', ['approved'])
                ->sum('with_pay_days'); // Use with_pay_days instead of total_days
        }
        
        // Calculate remaining "with pay" days
        $remainingWithPayDays = max(0, $maxWithPayDays - $usedWithPayDays);
        
        // Handle fractional days (e.g., 0.5 for half-day)
        $requestedDaysFloat = (float) $requestedDays;
        $remainingWithPayDaysFloat = (float) $remainingWithPayDays;
        
        // Determine how many days will be with pay and without pay
        if ($remainingWithPayDaysFloat >= $requestedDaysFloat) {
            // All requested days can be with pay
            return [
                'with_pay_days' => $requestedDaysFloat,
                'without_pay_days' => 0,
                'terms' => 'with PAY',
                'leave_category' => $leaveCategory,
                'message' => "All {$requestedDaysFloat} day(s) will be with pay. You have {$remainingWithPayDaysFloat} paid days remaining for {$leaveCategory}.",
                'max_with_pay' => $maxWithPayDays,
                'used_with_pay' => $usedWithPayDays,
                'remaining_with_pay' => $remainingWithPayDaysFloat,
                'tenure_months' => $tenureInMonths
            ];
        } elseif ($remainingWithPayDaysFloat > 0) {
            // Split: Some days with pay, some without pay
            $withPayDays = $remainingWithPayDaysFloat;
            $withoutPayDays = $requestedDaysFloat - $remainingWithPayDaysFloat;
            
            return [
                'with_pay_days' => $withPayDays,
                'without_pay_days' => $withoutPayDays,
                'terms' => 'with PAY', // Mark as with PAY since it includes some paid days
                'leave_category' => $leaveCategory,
                'message' => "Only {$withPayDays} day(s) are with pay. The remaining {$withoutPayDays} day(s) will be without pay. You have used {$usedWithPayDays} of {$maxWithPayDays} paid days for {$leaveCategory} this year.",
                'max_with_pay' => $maxWithPayDays,
                'used_with_pay' => $usedWithPayDays,
                'remaining_with_pay' => $remainingWithPayDaysFloat,
                'is_split' => true,
                'tenure_months' => $tenureInMonths
            ];
        } else {
            // No remaining "with pay" days - all without pay
            return [
                'with_pay_days' => 0,
                'without_pay_days' => $requestedDaysFloat,
                'terms' => 'without PAY',
                'leave_category' => $leaveCategory,
                'message' => "All {$requestedDaysFloat} day(s) will be without pay. You have already used all {$maxWithPayDays} paid days for {$leaveCategory} this year.",
                'max_with_pay' => $maxWithPayDays,
                'used_with_pay' => $usedWithPayDays,
                'remaining_with_pay' => 0,
                'tenure_months' => $tenureInMonths
            ];
        }
    }

    /**
     * Check if employee has active leave (not yet ended)
     * 
     * @param int $employeeId
     * @return array ['has_active_leave' => bool, 'leave' => LeaveRequest|null, 'message' => string|null]
     */
    public static function checkActiveLeave($employeeId)
    {
        $today = now()->startOfDay();
        
        // Check for any approved or pending leave that hasn't ended yet
        $activeLeave = self::where('employee_id', $employeeId)
            ->whereIn('status', ['pending', 'manager_approved', 'approved'])
            ->where('to', '>=', $today->toDateString())
            ->orderBy('to', 'desc')
            ->first();
        
        if ($activeLeave) {
            $endDate = \Carbon\Carbon::parse($activeLeave->to);
            $canFileFrom = $endDate->copy()->addDay(); // Can file from the day after leave ends
            
            return [
                'has_active_leave' => true,
                'leave' => $activeLeave,
                'message' => "You cannot file another leave request until your current leave ends on {$endDate->format('F j, Y')}. You can file your next leave on {$canFileFrom->format('F j, Y')}."
            ];
        }
        
        return [
            'has_active_leave' => false,
            'leave' => null,
            'message' => null
        ];
    }
}
