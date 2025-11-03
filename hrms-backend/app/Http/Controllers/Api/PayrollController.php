<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\EmployeeProfile;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\CashAdvanceRequest;
use App\Models\TaxTitle;
use App\Models\EmployeeTaxAssignment;
use App\Models\EmployeeDeductionAssignment;
use App\Models\DeductionTitle;
use App\Models\OvertimeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollController extends Controller
{
    // Constants for payroll calculation
    const SSS_CONTRIBUTION = 168.84;
    const PAGIBIG_CONTRIBUTION = 50.00;
    const PHILHEALTH_CONTRIBUTION = 84.50;
    const LATE_DEDUCTION_PER_MINUTE = 8.67;
    const UNDERTIME_DEDUCTION_PER_MINUTE = 8.67;
    const OVERTIME_PAY_PER_HOUR = 65.00;
    const DAILY_WAGE = 520.00;
    const STANDARD_CLOCK_IN = '08:00:00';
    const STANDARD_CLOCK_OUT = '17:00:00';
    const STANDARD_HOURS_PER_DAY = 8;

    /**
     * Display a listing of payrolls
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payroll::with(['employee', 'payrollPeriod']);

        // Filter by period
        if ($request->has('period_start') && $request->has('period_end')) {
            $query->whereBetween('period_start', [$request->period_start, $request->period_end]);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $payrolls = $query->paginate($request->get('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => [
                'payrolls' => $payrolls->items(),
                'pagination' => [
                    'current_page' => $payrolls->currentPage(),
                    'last_page' => $payrolls->lastPage(),
                    'per_page' => $payrolls->perPage(),
                    'total' => $payrolls->total()
                ]
            ]
        ]);
    }

    /**
     * Generate payroll for a period
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'payroll_period_id' => 'nullable|exists:payroll_periods,id',
        ]);

        try {
            DB::beginTransaction();

            $periodStart = $validated['period_start'];
            $periodEnd = $validated['period_end'];
            $payrollPeriodId = $validated['payroll_period_id'] ?? null;

            // Get all active employees
            $employees = EmployeeProfile::whereHas('user', function($q) {
                $q->where('role_id', '!=', 5);
            })->with('user')->get();

            $generatedPayrolls = [];

            foreach ($employees as $employee) {
                // Check if payroll already exists for this period
                // Use date comparison to handle different date formats
                $existingPayroll = Payroll::where('employee_id', $employee->id)
                    ->whereDate('period_start', '=', $periodStart)
                    ->whereDate('period_end', '=', $periodEnd)
                    ->first();

                if ($existingPayroll) {
                    // Update existing payroll - recalculate with new logic
                    $calculatedPayroll = $this->calculatePayroll($existingPayroll);
                    $generatedPayrolls[] = $calculatedPayroll;
                } else {
                    // Create new payroll with initial values
                    // Basic salary will be calculated based on actual attendance in calculatePayroll()
                    $payroll = Payroll::create([
                        'employee_id' => $employee->id,
                        'payroll_period_id' => $payrollPeriodId,
                        'period_start' => $periodStart,
                        'period_end' => $periodEnd,
                        'days_worked' => 0,
                        'absences' => 0,
                        'basic_salary' => 0, // Will be calculated based on actual attendance
                        'overtime_pay' => 0,
                        'allowances' => 0,
                        'gross_pay' => 0,
                        'sss_deduction' => 0,
                        'philhealth_deduction' => 0,
                        'pagibig_deduction' => 0,
                        'tax_deduction' => 0,
                        'late_deduction' => 0,
                        'undertime_deduction' => 0,
                        'cash_advance_deduction' => 0,
                        'other_deductions' => 0,
                        'total_deductions' => 0,
                        'net_pay' => 0,
                        'status' => 'draft',
                    ]);

                    // Calculate payroll based on actual attendance records
                    $calculatedPayroll = $this->calculatePayroll($payroll);
                    $generatedPayrolls[] = $calculatedPayroll;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll generated successfully',
                'data' => [
                    'generated_count' => count($generatedPayrolls),
                    'payrolls' => $generatedPayrolls
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate payroll for a single record
     */
    private function calculatePayroll(Payroll $payroll)
    {
        $employee = $payroll->employee;
        if (!$employee) {
            throw new \Exception("Employee not found for payroll ID: {$payroll->id}");
        }

        $periodStart = $payroll->period_start;
        $periodEnd = $payroll->period_end;

        // Get attendance records for the payroll period
        // Use >= and <= to include both start and end dates
        $attendances = Attendance::where('employee_id', $employee->id)
            ->where('date', '>=', $periodStart)
            ->where('date', '<=', $periodEnd)
            ->get();

        // Get approved leave requests
        $userId = $employee->user_id;
        $leaveRequests = collect([]);
        
        if ($userId) {
            $leaveRequests = LeaveRequest::where('employee_id', $userId)
                ->where('status', 'approved')
                ->where(function($query) use ($periodStart, $periodEnd) {
                    $query->whereBetween('from', [$periodStart, $periodEnd])
                        ->orWhereBetween('to', [$periodStart, $periodEnd])
                        ->orWhere(function($q) use ($periodStart, $periodEnd) {
                            $q->where('from', '<=', $periodStart)
                                ->where('to', '>=', $periodEnd);
                        });
                })
                ->get();
        }

        // Count actual days worked from attendance records
        // Exclude: Absent, Holiday (No Work), On Leave
        // Include: Present, Late, Undertime, Overtime, Late (Undertime), Late (Overtime), Holiday (Worked)
        // An attendance record with clock_in or clock_out indicates the employee was present
        $actualDaysWorked = $attendances->filter(function($attendance) {
            $status = $attendance->status ?? 'Absent';
            // Count if status indicates work was done OR if there's a clock in/out record
            $hasWorkRecord = !empty($attendance->clock_in) || !empty($attendance->clock_out);
            $isWorkStatus = !in_array($status, ['Absent', 'Holiday (No Work)', 'On Leave']);
            
            return $isWorkStatus && $hasWorkRecord;
        })->count();

        // Count leave days with pay (weekdays only)
        $leaveWithPayDays = $this->countLeaveWithPayDays($leaveRequests, $periodStart, $periodEnd, $attendances);

        // Count absences (days with status 'Absent' or no attendance record)
        // Get all weekdays in the period (excluding weekends)
        $periodStartCarbon = Carbon::parse($periodStart);
        $periodEndCarbon = Carbon::parse($periodEnd);
        $totalWeekdays = 0;
        $currentDate = $periodStartCarbon->copy();
        
        while ($currentDate->lte($periodEndCarbon)) {
            // Count only weekdays (Monday = 1, Friday = 5)
            if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) {
                $totalWeekdays++;
            }
            $currentDate->addDay();
        }

        // Count absences: total weekdays minus days worked (excluding leave days)
        $absences = max(0, $totalWeekdays - $actualDaysWorked - $leaveWithPayDays);

        // Total payable days = actual days worked + approved leave days with pay
        $totalPayableDays = $actualDaysWorked + $leaveWithPayDays;

        // Calculate daily rate
        $dailyRate = null;
        if ($employee->salary && $employee->salary > 0) {
            $monthlySalary = $employee->salary;
            $dailyRate = $monthlySalary / 26; // 26 working days per month
        } else {
            $dailyRate = self::DAILY_WAGE;
        }

        // Calculate basic salary based on actual days worked (not all weekdays)
        $basicSalary = $dailyRate * $totalPayableDays;
        
        // Update the payroll basic_salary if it was previously calculated incorrectly
        $payroll->basic_salary = round($basicSalary, 2);

        // Calculate overtime from approved OT requests
        // Formula: OVERTIME_PAY_PER_HOUR (₱65.00) * approved_ot_hours
        $overtimePay = $this->calculateOvertimePay($employee, $periodStart, $periodEnd, $dailyRate);

        // Calculate late deduction with 15-minute grace period (automatically calculated for all employees)
        $lateDeduction = $this->calculateLateDeduction($employee, $attendances);

        // Calculate undertime deduction based on clock out time (automatically calculated for all employees)
        $undertimeDeduction = $this->calculateUndertimeDeduction($employee, $attendances);

        // Calculate leave without pay (deduction)
        // Note: Using $dailyRate calculated above
        // Note: Leave with pay is already included in basic salary calculation above
        $leaveWithoutPayDeduction = $this->calculateLeaveWithoutPay($leaveRequests, $periodStart, $periodEnd, $dailyRate);

        // Gross pay
        // Basic salary already includes days worked + approved leave with pay days
        $grossPay = $basicSalary + $overtimePay + ($payroll->allowances ?? 0) - $leaveWithoutPayDeduction;

        // Calculate tax deductions from assigned taxes
        $taxDeductions = $this->calculateAssignedTaxes($employee);
        
        // Calculate income tax based on gross pay (if not already included in assigned taxes)
        if ($taxDeductions['tax'] == 0) {
            $taxDeductions['tax'] = $this->calculateTax($grossPay);
            $taxDeductions['total'] += $taxDeductions['tax'];
        }
        
        // Calculate deductions from assigned deduction titles (excluding auto-calculated ones)
        $assignedDeductions = $this->calculateAssignedDeductions($employee, $periodStart, $periodEnd);
        
        // Calculate cash advance deduction
        $cashAdvanceDeduction = $this->calculateCashAdvanceDeduction($userId);

        // Calculate other deductions (late, undertime, cash advance, assigned deductions)
        // Note: Late and undertime are now automatically calculated for all employees
        $otherDeductions = $lateDeduction + $undertimeDeduction + $cashAdvanceDeduction + $assignedDeductions;

        // Calculate total deductions (taxes + other deductions)
        // Ensure all values are positive (deductions should never be negative)
        $totalDeductions = abs($taxDeductions['total']) + abs($otherDeductions);

        // Calculate net pay (ensure it doesn't go negative)
        $netPay = max(0, $grossPay - $totalDeductions);

        // Ensure all deduction values are positive (never negative)
        $sssDed = max(0, round($taxDeductions['sss'] ?? 0, 2));
        $philhealthDed = max(0, round($taxDeductions['philhealth'] ?? 0, 2));
        $pagibigDed = max(0, round($taxDeductions['pagibig'] ?? 0, 2));
        $taxDed = max(0, round($taxDeductions['tax'] ?? 0, 2));
        $lateDed = max(0, round($lateDeduction, 2));
        $undertimeDed = max(0, round($undertimeDeduction, 2));
        $cashAdvanceDed = max(0, round($cashAdvanceDeduction, 2));
        $otherDed = max(0, round($assignedDeductions, 2)); // Other deductions excluding late/undertime/cash advance
        $totalDed = max(0, round($totalDeductions, 2));

        // Update payroll with calculated values
        $payroll->update([
            'days_worked' => $actualDaysWorked,
            'absences' => $absences,
            'basic_salary' => round($basicSalary, 2),
            'gross_pay' => round($grossPay, 2),
            'overtime_pay' => round($overtimePay, 2),
            'sss_deduction' => $sssDed,
            'philhealth_deduction' => $philhealthDed,
            'pagibig_deduction' => $pagibigDed,
            'tax_deduction' => $taxDed,
            'late_deduction' => $lateDed,
            'undertime_deduction' => $undertimeDed,
            'cash_advance_deduction' => $cashAdvanceDed,
            'other_deductions' => $otherDed,
            'total_deductions' => $totalDed,
            'net_pay' => round($netPay, 2),
        ]);

        return $payroll->fresh(['employee', 'payrollPeriod']);
    }

    /**
     * Calculate working days between two dates
     */
    private function calculateWorkingDays($start, $end): int
    {
        $start = Carbon::parse($start);
        $end = Carbon::parse($end);
        $days = 0;

        while ($start->lte($end)) {
            // Count only weekdays
            if ($start->dayOfWeek !== 0 && $start->dayOfWeek !== 6) {
                $days++;
            }
            $start->addDay();
        }

        return $days;
    }

    /**
     * Calculate late deduction from attendance with 15-minute grace period
     * Late penalties are automatically calculated for all employees based on attendance
     * Grace period: 8:00 AM - 8:15 AM (no penalty)
     * Penalty starts from 8:16 AM onwards at 8.67 per minute
     */
    private function calculateLateDeduction(EmployeeProfile $employee, $attendances): float
    {
        // Late penalties are automatically calculated for all employees based on attendance
        // No need to check for assignment - this is a standard deduction

        $totalDeduction = 0;
        $totalMinutesLate = 0;
        $gracePeriodMinutes = 15;
        $standardClockIn = Carbon::createFromTimeString(self::STANDARD_CLOCK_IN); // 8:00 AM
        $gracePeriodEnd = $standardClockIn->copy()->addMinutes($gracePeriodMinutes); // 8:15 AM

        foreach ($attendances as $attendance) {
            // Only calculate for days with clock in
            if (empty($attendance->clock_in)) {
                continue;
            }

            // Parse clock_in time - extract time portion from datetime cast
            $clockInTime = $attendance->clock_in;
            
            try {
                // Get time as string - handle both Carbon instances and strings
                if ($clockInTime instanceof \Carbon\Carbon) {
                    $timeString = $clockInTime->format('H:i:s');
                } elseif (is_string($clockInTime)) {
                    // If it's already a time string (HH:MM:SS), use it directly
                    // If it's a datetime string, extract time portion
                    if (strlen($clockInTime) <= 8) {
                        $timeString = $clockInTime;
                    } else {
                        // Extract time from datetime string
                        $timeString = Carbon::parse($clockInTime)->format('H:i:s');
                    }
                } else {
                    // Fallback: try to parse as datetime and extract time
                    $timeString = Carbon::parse($clockInTime)->format('H:i:s');
                }
                
                // Parse time string to Carbon instance for comparison
                $clockIn = Carbon::createFromTimeString($timeString);
                
                // Check if clocked in after the grace period (after 8:15 AM)
                if ($clockIn->gt($gracePeriodEnd)) {
                    // Calculate minutes late beyond grace period
                    // If clock in is at 8:16 AM, that's 1 minute late (8:16 - 8:15 = 1 minute)
                    $minutesLate = $gracePeriodEnd->diffInMinutes($clockIn);
                    $totalMinutesLate += $minutesLate;
                }
            } catch (\Exception $e) {
                // Skip invalid time format
                continue;
            }
        }

        // Calculate total deduction: total minutes × rate per minute (8.67)
        $totalDeduction = $totalMinutesLate * self::LATE_DEDUCTION_PER_MINUTE;

        return round($totalDeduction, 2);
    }

    /**
     * Calculate undertime deduction from attendance based on clock out time
     * Undertime penalties are automatically calculated for all employees based on attendance
     * If employee clocks out before 5:00 PM, calculate minutes early and deduct at 8.67 per minute
     */
    private function calculateUndertimeDeduction(EmployeeProfile $employee, $attendances): float
    {
        // Undertime penalties are automatically calculated for all employees based on attendance
        // No need to check for assignment - this is a standard deduction

        $totalDeduction = 0;
        $totalMinutesEarly = 0;
        $standardClockOut = Carbon::parse(self::STANDARD_CLOCK_OUT); // 5:00 PM (17:00:00)

        foreach ($attendances as $attendance) {
            // Only calculate undertime for days with actual clock out (not absent days)
            if (empty($attendance->clock_out)) {
                continue; // Skip days without clock out records
            }

            // Parse clock_out time - extract time portion from datetime cast
            $clockOutTime = $attendance->clock_out;
            
            try {
                // Get time as string - handle both Carbon instances and strings
                if ($clockOutTime instanceof \Carbon\Carbon) {
                    $timeString = $clockOutTime->format('H:i:s');
                } elseif (is_string($clockOutTime)) {
                    // If it's already a time string (HH:MM:SS), use it directly
                    // If it's a datetime string, extract time portion
                    if (strlen($clockOutTime) <= 8) {
                        $timeString = $clockOutTime;
                    } else {
                        // Extract time from datetime string
                        $timeString = Carbon::parse($clockOutTime)->format('H:i:s');
                    }
                } else {
                    // Fallback: try to parse as datetime and extract time
                    $timeString = Carbon::parse($clockOutTime)->format('H:i:s');
                }
                
                // Parse time string to Carbon instance for comparison
                $clockOut = Carbon::createFromTimeString($timeString);
                
                // Create standard clock out time for comparison (17:00:00 = 5:00 PM)
                $standardOut = Carbon::createFromTimeString(self::STANDARD_CLOCK_OUT);
                
                // Check if clocked out before 5:00 PM
                if ($clockOut->lt($standardOut)) {
                    // Calculate minutes early (how many minutes before 5:00 PM)
                    // Example: If clocked out at 4:44 PM (16:44), that's 16 minutes early
                    // Example: If clocked out at 4:08 PM (16:08), that's 52 minutes early
                    // Example: If clocked out at 4:04 PM (16:04), that's 56 minutes early
                    $minutesEarly = $standardOut->diffInMinutes($clockOut);
                    $totalMinutesEarly += $minutesEarly;
                }
            } catch (\Exception $e) {
                // Skip invalid time format
                continue;
            }
        }

        // Calculate total deduction: total minutes × rate per minute (8.67)
        $totalDeduction = $totalMinutesEarly * self::UNDERTIME_DEDUCTION_PER_MINUTE;

        return round($totalDeduction, 2);
    }

    /**
     * Calculate leave with pay
     */
    private function calculateLeaveWithPay($leaveRequests, $periodStart, $periodEnd): float
    {
        $totalDays = 0;

        foreach ($leaveRequests as $leave) {
            if ($leave->terms === 'with PAY' || $leave->with_pay_days > 0) {
                // Calculate overlapping days
                $leaveStart = Carbon::parse(max($leave->from, $periodStart));
                $leaveEnd = Carbon::parse(min($leave->to, $periodEnd));
                
                if ($leaveStart->lte($leaveEnd)) {
                    $overlapDays = $leaveStart->diffInDays($leaveEnd) + 1;
                    // Count only weekdays
                    $days = 0;
                    $current = $leaveStart->copy();
                    while ($current->lte($leaveEnd)) {
                        if ($current->dayOfWeek !== 0 && $current->dayOfWeek !== 6) {
                            $days++;
                        }
                        $current->addDay();
                    }
                    $totalDays += min($days, $leave->with_pay_days);
                }
            }
        }

        return $totalDays * self::DAILY_WAGE;
    }

    /**
     * Calculate leave without pay (as deduction)
     */
    private function calculateLeaveWithoutPay($leaveRequests, $periodStart, $periodEnd, $dailyRate): float
    {
        $totalDays = 0;

        foreach ($leaveRequests as $leave) {
            if ($leave->terms === 'without PAY' || $leave->without_pay_days > 0) {
                // Calculate overlapping days
                $leaveStart = Carbon::parse(max($leave->from, $periodStart));
                $leaveEnd = Carbon::parse(min($leave->to, $periodEnd));
                
                if ($leaveStart->lte($leaveEnd)) {
                    // Count only weekdays
                    $weekdays = 0;
                    $current = $leaveStart->copy();
                    while ($current->lte($leaveEnd)) {
                        if ($current->dayOfWeek !== 0 && $current->dayOfWeek !== 6) {
                            $weekdays++;
                        }
                        $current->addDay();
                    }
                    // Use the actual without_pay_days if specified, otherwise use all weekdays
                    $daysToDeduct = $leave->without_pay_days > 0 ? min($weekdays, $leave->without_pay_days) : $weekdays;
                    $totalDays += $daysToDeduct;
                }
            }
        }

        return $totalDays * $dailyRate;
    }

    /**
     * Count leave days with pay (excluding days already worked)
     */
    private function countLeaveWithPayDays($leaveRequests, $periodStart, $periodEnd, $attendances): int
    {
        $totalDays = 0;
        
        // Get all attendance dates to exclude from leave calculation
        $attendanceDates = $attendances->pluck('date')->map(function($date) {
            return Carbon::parse($date)->format('Y-m-d');
        })->toArray();

        foreach ($leaveRequests as $leave) {
            if ($leave->terms === 'with PAY' || $leave->with_pay_days > 0) {
                // Calculate overlapping days
                $leaveStart = Carbon::parse(max($leave->from, $periodStart));
                $leaveEnd = Carbon::parse(min($leave->to, $periodEnd));
                
                if ($leaveStart->lte($leaveEnd)) {
                    // Count only weekdays that are NOT in attendance records
                    $days = 0;
                    $current = $leaveStart->copy();
                    $maxDays = $leave->with_pay_days ?? 999; // Use high number if not specified
                    
                    while ($current->lte($leaveEnd) && $days < $maxDays) {
                        // Only count weekdays that don't have attendance records
                        if ($current->dayOfWeek !== 0 && $current->dayOfWeek !== 6) {
                            $dateString = $current->format('Y-m-d');
                            if (!in_array($dateString, $attendanceDates)) {
                                $days++;
                            }
                        }
                        $current->addDay();
                    }
                    $totalDays += $days;
                }
            }
        }

        return $totalDays;
    }

    /**
     * Calculate tax deduction (simple flat rate for now)
     */
    private function calculateTax($grossPay): float
    {
        // Simple tax calculation (can be enhanced)
        if ($grossPay <= 25000) {
            return 0;
        } elseif ($grossPay <= 40000) {
            return $grossPay * 0.20;
        } else {
            return $grossPay * 0.25;
        }
    }

    /**
     * Calculate cash advance deduction
     * Rules:
     * - Cash advances exceeding 10,000: 1,000 deduction per payroll period
     * - Cash advances 10,000 or below: 500 deduction per payroll period
     * - Stop deducting when remaining balance reaches 0 or below
     */
    private function calculateCashAdvanceDeduction($userId): float
    {
        if (!$userId) {
            return 0;
        }

        // Get approved cash advances with remaining balance
        $cashAdvances = CashAdvanceRequest::where('user_id', $userId)
            ->where('status', 'approved')
            ->where(function($query) {
                $query->where('remaining_balance', '>', 0)
                    ->orWhereNull('remaining_balance'); // For backward compatibility
            })
            ->get();

        if ($cashAdvances->isEmpty()) {
            return 0;
        }

        $totalDeduction = 0;
        
        foreach ($cashAdvances as $ca) {
            $remainingBalance = $ca->remaining_balance ?? $ca->amount_ca ?? 0;
            
            // Skip if already paid in full
            if ($remainingBalance <= 0) {
                continue;
            }

            // Determine deduction amount based on original amount
            $originalAmount = $ca->amount_ca ?? 0;
            $deductionAmount = 0;

            if ($originalAmount > 10000) {
                // Exceeding 10,000: 1,000 per payroll period
                $deductionAmount = 1000;
            } else {
                // 10,000 or below: 500 per payroll period
                $deductionAmount = 500;
            }

            // Don't deduct more than remaining balance
            $actualDeduction = min($deductionAmount, $remainingBalance);
            $totalDeduction += $actualDeduction;

            // Update remaining balance
            $newBalance = max(0, $remainingBalance - $actualDeduction);
            $ca->remaining_balance = $newBalance;
            $ca->save();
        }

        return $totalDeduction;
    }

    /**
     * Calculate overtime pay from approved OT requests
     * Formula: OVERTIME_PAY_PER_HOUR * approved_ot_hours
     * OT pay is a fixed rate of ₱65.00 per hour for all employees
     * Example: If ot_hours = 2, then: ot_pay = 65 * 2 = ₱130.00
     */
    private function calculateOvertimePay(EmployeeProfile $employee, $periodStart, $periodEnd, $dailyRate): float
    {
        // Get approved overtime requests for the employee within the payroll period
        // Status 'hr_approved' means fully approved (both manager and HR approved)
        $approvedOTRequests = OvertimeRequest::where('employee_id', $employee->id)
            ->where('status', 'hr_approved')
            ->where('ot_date', '>=', $periodStart)
            ->where('ot_date', '<=', $periodEnd)
            ->get();

        $totalOvertimePay = 0;

        foreach ($approvedOTRequests as $otRequest) {
            $otHours = $otRequest->ot_hours ?? 0;
            
            if ($otHours > 0) {
                // Formula: Fixed rate per hour * number of OT hours
                // OT pay is ₱65.00 per hour for all employees
                $otPay = self::OVERTIME_PAY_PER_HOUR * $otHours;
                $totalOvertimePay += $otPay;
            }
        }

        return round($totalOvertimePay, 2);
    }

    /**
     * Calculate tax deductions from assigned taxes
     * Taxes are deducted per payroll period (fixed amount per period)
     */
    private function calculateAssignedTaxes(EmployeeProfile $employee): array
    {
        // Get all active tax assignments for the employee
        // Only employees with assigned taxes will have tax deductions
        // Load all tax titles, then filter in PHP to ensure we get all assignments
        // Use the employee's ID directly to ensure we get the correct assignments
        $employeeId = $employee->id;
        $taxAssignments = EmployeeTaxAssignment::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->with('taxTitle')
            ->get();
        
        $sssDeduction = 0;
        $philhealthDeduction = 0;
        $pagibigDeduction = 0;
        $otherTaxDeduction = 0;
        $totalTaxDeduction = 0;

        foreach ($taxAssignments as $assignment) {
            // Load tax title if not already loaded
            if (!$assignment->relationLoaded('taxTitle')) {
                $assignment->load('taxTitle');
            }
            
            $taxTitle = $assignment->taxTitle;
            
            // Skip if tax title doesn't exist or is inactive
            if (!$taxTitle || !$taxTitle->is_active) {
                continue;
            }

            // Get effective rate (custom rate if set, otherwise default rate)
            // This is the amount to deduct PER PAYROLL PERIOD
            // If custom_rate is null or empty, use the tax title's rate
            if ($assignment->custom_rate !== null && $assignment->custom_rate !== '' && $assignment->custom_rate > 0) {
                $effectiveRate = (float)$assignment->custom_rate;
            } else {
                $effectiveRate = (float)$taxTitle->rate;
            }
            
            // Skip if rate is 0 or invalid
            if ($effectiveRate <= 0 || !is_numeric($effectiveRate)) {
                continue;
            }

            // Categorize by tax name for backward compatibility
            $taxName = strtolower(trim($taxTitle->name));
            
            // Match taxes more flexibly - check for SSS, PhilHealth, Pag-IBIG
            if (strpos($taxName, 'sss') !== false) {
                // SSS Contribution - sum all SSS taxes
                $sssDeduction += $effectiveRate;
            } elseif (strpos($taxName, 'philhealth') !== false) {
                // PhilHealth Contribution
                $philhealthDeduction += $effectiveRate;
            } elseif (strpos($taxName, 'pag-ibig') !== false || strpos($taxName, 'pagibig') !== false) {
                // Pag-IBIG Contribution
                $pagibigDeduction += $effectiveRate;
            } else {
                // For other taxes (like income tax), these are fixed per period
                // Note: Income tax based on gross pay will be calculated separately
                $otherTaxDeduction += $effectiveRate;
            }

            // Always add to total for accurate sum
            $totalTaxDeduction += $effectiveRate;
        }

        return [
            'sss' => round($sssDeduction, 2),
            'philhealth' => round($philhealthDeduction, 2),
            'pagibig' => round($pagibigDeduction, 2),
            'tax' => round($otherTaxDeduction, 2),
            'total' => round($totalTaxDeduction, 2)
        ];
    }

    /**
     * Calculate deductions from assigned deduction titles
     * Includes late penalty, undertime penalty, cash advance, and other deductions
     */
    private function calculateAssignedDeductions(EmployeeProfile $employee, $periodStart, $periodEnd): float
    {
        // Get all active deduction assignments for the employee
        $deductionAssignments = EmployeeDeductionAssignment::where('employee_id', $employee->id)
            ->where('is_active', true)
            ->with('deductionTitle')
            ->get();

        $totalDeduction = 0;

        foreach ($deductionAssignments as $assignment) {
            $deductionTitle = $assignment->deductionTitle;
            
            if (!$deductionTitle || !$deductionTitle->is_active) {
                continue;
            }

            // Get effective amount (custom amount if set, otherwise default amount)
            $effectiveAmount = $assignment->custom_amount ?? $deductionTitle->amount;
            $effectiveAmount = (float)$effectiveAmount;

            // Check if this is an auto-calculated deduction (Late Penalty, Undertime Penalty, Cash Advance)
            // These are already calculated separately, so skip them here
            $deductionName = strtolower($deductionTitle->name);
            
            if (in_array($deductionName, ['late penalty', 'undertime penalty', 'cash advance'])) {
                // Skip - these are calculated separately from attendance
                continue;
            }

            // For other deductions (Absence Deduction, Loan Deduction, Uniform Deduction, etc.)
            // Add the fixed amount
            $totalDeduction += $effectiveAmount;
        }

        return $totalDeduction;
    }
}

