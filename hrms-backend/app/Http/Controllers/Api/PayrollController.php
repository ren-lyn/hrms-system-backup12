<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\EmployeeProfile;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\LeaveMonetizationRequest;
use App\Models\CashAdvanceRequest;
use App\Models\TaxTitle;
use App\Models\EmployeeTaxAssignment;
use App\Models\EmployeeDeductionAssignment;
use App\Models\DeductionTitle;
use App\Models\OvertimeRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
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

        // Add 13th month pay breakdown to each payroll and convert to array
        $payrollsArray = $payrolls->getCollection()->map(function ($payroll) use ($request) {
            // Load employee relationship if not already loaded
            if (!$payroll->relationLoaded('employee')) {
                $payroll->load('employee');
            }
            
            // Calculate breakdown if employee exists and has a salary
            $breakdown = [];
            
            // Always calculate breakdown if we have 13th month pay
            if ($payroll->thirteenth_month_pay > 0) {
                if ($payroll->employee && $payroll->employee->salary > 0) {
                    try {
                        $breakdownData = $this->calculateThirteenthMonthPayWithBreakdown(
                            $payroll->employee,
                            $payroll->period_start,
                            $payroll->period_end
                        );
                        $breakdown = $breakdownData['breakdown'] ?? [];
                        
                        // Log for debugging
                        if (config('app.debug')) {
                            \Log::info('13th Month Breakdown calculated for payroll ' . $payroll->id, [
                                'breakdown_count' => count($breakdown),
                                'thirteenth_month_pay' => $payroll->thirteenth_month_pay,
                                'employee_id' => $payroll->employee->id,
                                'employee_salary' => $payroll->employee->salary,
                                'breakdown_data' => $breakdown
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error calculating 13th month breakdown for payroll ' . $payroll->id . ': ' . $e->getMessage());
                        \Log::error('Stack trace: ' . $e->getTraceAsString());
                        $breakdown = []; // Reset to empty on error
                    }
                }
                
                // ALWAYS create a breakdown if we have 13th month pay, even if calculation failed
                if (empty($breakdown) || !is_array($breakdown) || count($breakdown) === 0) {
                    $breakdown = [
                        [
                            'description' => 'Base 13th Month Pay',
                            'calculation' => 'Calculated based on months worked during the year',
                            'amount' => round($payroll->thirteenth_month_pay, 2)
                        ],
                        [
                            'description' => 'Total 13th Month Pay',
                            'calculation' => '',
                            'amount' => round($payroll->thirteenth_month_pay, 2),
                            'is_total' => true
                        ]
                    ];
                }
            }
            
            // Convert payroll to array
            $payrollArray = $payroll->toArray();
            
            // CRITICAL: Explicitly add breakdown AFTER toArray() to ensure it's included
            // Use direct assignment to ensure it's definitely in the array
            $payrollArray['thirteenth_month_pay_breakdown'] = $breakdown;
            
            // Ensure employee data is included
            if ($payroll->employee) {
                $payrollArray['employee'] = $payroll->employee->toArray();
            }
            
            // Force the breakdown to be in the array - verify it exists
            if (!isset($payrollArray['thirteenth_month_pay_breakdown'])) {
                $payrollArray['thirteenth_month_pay_breakdown'] = $breakdown;
            }
            
            // Debug: Log the breakdown being added
            if (config('app.debug')) {
                \Log::debug('Payroll ' . $payroll->id . ' breakdown:', [
                    'breakdown' => $breakdown,
                    'breakdown_count' => count($breakdown),
                    'has_breakdown_key' => isset($payrollArray['thirteenth_month_pay_breakdown']),
                    'breakdown_in_array' => array_key_exists('thirteenth_month_pay_breakdown', $payrollArray),
                    'payroll_array_keys' => array_keys($payrollArray)
                ]);
            }
            
            return $payrollArray;
        })->toArray();

        // Verify breakdown is included in response (debug)
        if (config('app.debug') && count($payrollsArray) > 0) {
            $samplePayroll = $payrollsArray[0];
            \Log::debug('Sample payroll in response:', [
                'id' => $samplePayroll['id'] ?? 'N/A',
                'thirteenth_month_pay' => $samplePayroll['thirteenth_month_pay'] ?? 'N/A',
                'has_breakdown' => isset($samplePayroll['thirteenth_month_pay_breakdown']),
                'breakdown_count' => isset($samplePayroll['thirteenth_month_pay_breakdown']) ? count($samplePayroll['thirteenth_month_pay_breakdown']) : 0,
                'breakdown_keys' => array_keys($samplePayroll)
            ]);
        }
        
        // Double-check: Ensure breakdown is in all payrolls with 13th month pay
        foreach ($payrollsArray as &$payrollItem) {
            if (($payrollItem['thirteenth_month_pay'] ?? 0) > 0 && !isset($payrollItem['thirteenth_month_pay_breakdown'])) {
                // Recalculate if missing
                $payrollModel = Payroll::with('employee')->find($payrollItem['id']);
                if ($payrollModel && $payrollModel->employee && $payrollModel->employee->salary > 0) {
                    try {
                        $breakdownData = $this->calculateThirteenthMonthPayWithBreakdown(
                            $payrollModel->employee,
                            $payrollModel->period_start,
                            $payrollModel->period_end
                        );
                        $payrollItem['thirteenth_month_pay_breakdown'] = $breakdownData['breakdown'] ?? [];
                    } catch (\Exception $e) {
                        $payrollItem['thirteenth_month_pay_breakdown'] = [];
                    }
                } else {
                    $payrollItem['thirteenth_month_pay_breakdown'] = [];
                }
            }
        }
        unset($payrollItem); // Break reference
        
        // Final verification: Log breakdown status for all payrolls with 13th month pay
        if (config('app.debug')) {
            $payrollsWith13thMonth = array_filter($payrollsArray, function($p) {
                return ($p['thirteenth_month_pay'] ?? 0) > 0;
            });
            \Log::debug('Final verification - Payrolls with 13th month pay:', [
                'count' => count($payrollsWith13thMonth),
                'breakdown_status' => array_map(function($p) {
                    return [
                        'id' => $p['id'],
                        'has_breakdown' => isset($p['thirteenth_month_pay_breakdown']),
                        'breakdown_count' => isset($p['thirteenth_month_pay_breakdown']) ? count($p['thirteenth_month_pay_breakdown']) : 0
                    ];
                }, $payrollsWith13thMonth)
            ]);
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'payrolls' => $payrollsArray,
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
            // Get Applicant role ID dynamically to avoid hardcoding
            $applicantRoleId = \App\Models\Role::where('name', 'Applicant')->value('id');
            
            $employees = EmployeeProfile::whereHas('user', function($q) use ($applicantRoleId) {
                $q->where('role_id', '!=', $applicantRoleId);
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
                        'holiday_pay' => 0,
                        'thirteenth_month_pay' => 0,
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
        // Exclude: Absent, Holiday (No Work), On Leave, Holiday (Worked)
        // Include: Present, Late, Undertime, Overtime, Late (Undertime), Late (Overtime)
        // Note: Holiday (Worked) days are excluded from basic salary and calculated separately in holiday pay
        // An attendance record with clock_in or clock_out indicates the employee was present
        $actualDaysWorked = $attendances->filter(function($attendance) {
            $status = $attendance->status ?? 'Absent';
            // Count if status indicates work was done OR if there's a clock in/out record
            $hasWorkRecord = !empty($attendance->clock_in) || !empty($attendance->clock_out);
            // Exclude Holiday (Worked) - these are paid separately as holiday pay
            $isWorkStatus = !in_array($status, ['Absent', 'Holiday (No Work)', 'On Leave', 'Holiday (Worked)']);
            
            return $isWorkStatus && $hasWorkRecord;
        })->count();

        // Count leave days with pay (weekdays only)
        $leaveWithPayDays = $this->countLeaveWithPayDays($leaveRequests, $periodStart, $periodEnd, $attendances);

        // Calculate absences using the formula: Total Weekdays - Days Worked - Leave Days with Pay - Holidays = Absences
        // Also explicitly count days with "Absent" status in attendance records
        $periodStartCarbon = Carbon::parse($periodStart);
        $periodEndCarbon = Carbon::parse($periodEnd);
        
        // Count total weekdays in the period
        $totalWeekdays = 0;
        $holidayCount = 0;
        $currentDate = $periodStartCarbon->copy();
        
        while ($currentDate->lte($periodEndCarbon)) {
            if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) { // Weekdays only
                $totalWeekdays++;
                // Check if it's a holiday
                $dateString = $currentDate->format('Y-m-d');
                if (\App\Models\Holiday::isHolidayDate($dateString)) {
                    $holidayCount++;
                }
            }
            $currentDate->addDay();
        }
        
        // Build attendance map for quick lookup
        $attendanceMap = [];
        $absentDaysFromRecords = 0;
        
        foreach ($attendances as $att) {
            $attDate = $att->date instanceof \Carbon\Carbon 
                ? $att->date 
                : Carbon::parse($att->date);
            $dateKey = $attDate->format('Y-m-d');
            
            // Store in map
            $attendanceMap[$dateKey] = $att;
            
            // Count days with "Absent" status (but exclude holidays and leaves)
            $status = trim($att->status ?? '');
            $isHoliday = \App\Models\Holiday::isHolidayDate($dateKey);
            
            if ($status === 'Absent' && !$isHoliday) {
                // Check if it's not a leave with pay
                $isLeaveWithPay = false;
                foreach ($leaveRequests as $leave) {
                    if ($leave->terms === 'with PAY' || $leave->with_pay_days > 0) {
                        $leaveStart = Carbon::parse($leave->from);
                        $leaveEnd = Carbon::parse($leave->to);
                        if ($attDate->gte($leaveStart) && $attDate->lte($leaveEnd)) {
                            $isLeaveWithPay = true;
                            break;
                        }
                    }
                }
                
                if (!$isLeaveWithPay) {
                    $absentDaysFromRecords++;
                }
            }
        }
        
        // Get leave dates with pay for exclusion
        $leaveWithPayDates = [];
        foreach ($leaveRequests as $leave) {
            if ($leave->terms === 'with PAY' || $leave->with_pay_days > 0) {
                $leaveStart = Carbon::parse(max($leave->from, $periodStart));
                $leaveEnd = Carbon::parse(min($leave->to, $periodEnd));
                $current = $leaveStart->copy();
                
                while ($current->lte($leaveEnd)) {
                    if ($current->dayOfWeek >= 1 && $current->dayOfWeek <= 5) {
                        $leaveWithPayDates[] = $current->format('Y-m-d');
                    }
                    $current->addDay();
                }
            }
        }
        
        // Count weekdays with no attendance record that should be absences
        $unrecordedAbsences = 0;
        $currentDate = $periodStartCarbon->copy();
        
        while ($currentDate->lte($periodEndCarbon)) {
            if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) {
                $dateString = $currentDate->format('Y-m-d');
                
                // Skip if holiday
                if (\App\Models\Holiday::isHolidayDate($dateString)) {
                    $currentDate->addDay();
                    continue;
                }
                
                // Skip if leave with pay
                if (in_array($dateString, $leaveWithPayDates)) {
                    $currentDate->addDay();
                    continue;
                }
                
                // If no attendance record exists, it's an absence
                if (!isset($attendanceMap[$dateString])) {
                    $unrecordedAbsences++;
                }
            }
            $currentDate->addDay();
        }
        
        // Count all unique absent dates
        $allAbsentDates = [];
        
        // Step 1: Add explicit absences from attendance records with status "Absent"
        // If an attendance record has status "Absent", it should always count as an absence,
        // regardless of whether it's a holiday date. Only exclude if it's a leave with pay.
        foreach ($attendances as $att) {
            $attDate = $att->date instanceof \Carbon\Carbon 
                ? $att->date 
                : Carbon::parse($att->date);
            $dateKey = $attDate->format('Y-m-d');
            $status = trim($att->status ?? '');
            
            if ($status === 'Absent') {
                $isLeaveWithPay = in_array($dateKey, $leaveWithPayDates);
                
                // Count as absence if not a leave with pay
                // Note: Explicit "Absent" status always counts, even on holidays
                if (!$isLeaveWithPay) {
                    $allAbsentDates[$dateKey] = true;
                }
            }
        }
        
        // Step 2: Add weekdays with no attendance record (unrecorded absences)
        $currentDate = $periodStartCarbon->copy();
        while ($currentDate->lte($periodEndCarbon)) {
            if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) {
                $dateString = $currentDate->format('Y-m-d');
                
                // Check if it's not a holiday, not a leave with pay, and has no attendance record
                $isHoliday = \App\Models\Holiday::isHolidayDate($dateString);
                $isLeaveWithPay = in_array($dateString, $leaveWithPayDates);
                $hasAttendanceRecord = isset($attendanceMap[$dateString]);
                
                if (!$isHoliday && !$isLeaveWithPay && !$hasAttendanceRecord) {
                    $allAbsentDates[$dateString] = true;
                }
            }
            $currentDate->addDay();
        }
        
        // Final absences count = unique absent dates
        $absences = count($allAbsentDates);

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

        // Calculate holiday pay for days with "Holiday (Worked)" status
        // Holiday pay is typically double the daily rate
        $holidayPay = $this->calculateHolidayPay($employee, $attendances, $dailyRate);

        // Calculate 13th month pay (visible for all payroll periods, but not included in gross pay)
        // Formula: (Basic Salary per Month × Months Worked during the Year) / 12
        // PLUS: Unused leave days with pay converted to cash
        $thirteenthMonthPayData = $this->calculateThirteenthMonthPayWithBreakdown($employee, $periodStart, $periodEnd);
        $thirteenthMonthPay = $thirteenthMonthPayData['total'];

        // Calculate late deduction with 15-minute grace period (only if employee is assigned to Late Penalty)
        $lateDeduction = $this->calculateLateDeduction($employee, $attendances);

        // Calculate undertime deduction based on clock out time (only if employee is assigned to Undertime Penalty)
        $undertimeDeduction = $this->calculateUndertimeDeduction($employee, $attendances);

        // Calculate leave without pay (deduction)
        // Note: Using $dailyRate calculated above
        // Note: Leave with pay is already included in basic salary calculation above
        // Note: Leave without pay days are already excluded from basic salary, so this is just for tracking
        $leaveWithoutPayDeduction = $this->calculateLeaveWithoutPay($leaveRequests, $periodStart, $periodEnd, $dailyRate);

        // Gross pay
        // Basic salary already includes days worked + approved leave with pay days
        // Holiday pay is additional (typically double pay for working on holidays)
        // Note: 13th month pay is NOT included in gross pay (it's shown separately and not in payslip)
        // Leave without pay is NOT subtracted from gross pay since those days are already excluded from basic salary
        $grossPay = $basicSalary + $overtimePay + $holidayPay + ($payroll->allowances ?? 0);
        
        // Ensure gross pay never goes negative
        $grossPay = max(0, $grossPay);

        // Calculate SSS contributions based on Monthly Salary Credit (MSC) - 2025 rate
        // SSS contributions are based on the employee's monthly salary, not gross pay
        $monthlySalary = $employee->salary ?? 0;
        $sssContributions = $this->calculateSSSContributions($monthlySalary);
        
        // Calculate Pag-IBIG contributions based on monthly compensation - 2025 rate
        // Pag-IBIG contributions are based on the employee's monthly salary, not gross pay
        $pagibigContributions = $this->calculatePagIbigContributions($monthlySalary);
        
        // Calculate PhilHealth contributions based on Monthly Basic Salary (MBS) - 2025 rate
        // PhilHealth contributions are based on the employee's monthly salary, not gross pay
        $philhealthContributions = $this->calculatePhilHealthContributions($monthlySalary);
        
        // Calculate monthly factor for payroll period
        // SSS, Pag-IBIG, and PhilHealth contributions are calculated monthly, so we need to prorate based on payroll period length
        // If payroll period is 6-7 days (1 week), divide contributions by 4 (since there are 4 weeks in a month)
        // If payroll period is 15 days (half month), divide contributions by 2
        // If payroll period is full month (30-31 days), no division (multiply by 1.0)
        $monthlyFactor = $this->getMonthlyFactorForPeriod($periodStart, $periodEnd);
        
        // Calculate SSS contributions (prorated for payroll period)
        // Always calculate SSS from MSC for ALL employees - do not use assigned taxes
        // Total employee contribution: Regular SS (5%) + MPF (5%)
        $sssEmployeeDeduction = $sssContributions['employee'] * $monthlyFactor;
        // Total employer contribution: Regular SS (10%) + MPF (10%)
        $sssEmployerContribution = $sssContributions['employer'] * $monthlyFactor;
        // EC (Employees' Compensation) contribution: ₱10 or ₱30 (paid by employer only)
        $sssECContribution = $sssContributions['ec'] * $monthlyFactor;
        // Total employer contribution = Regular SS (employer) + MPF (employer) + EC
        $sssEmployerTotal = $sssContributions['employer_total'] * $monthlyFactor;
        // Total remittance = Employee + Employer (Regular SS + MPF + EC)
        $sssTotalRemittance = $sssContributions['total'] * $monthlyFactor;
        // MSC used for calculation
        $sssMSC = $sssContributions['msc'];
        
        // Regular SS contributions (prorated)
        $sssRegularSSMSC = $sssContributions['regular_ss']['msc'];
        $sssRegularSSEmployee = $sssContributions['regular_ss']['employee'] * $monthlyFactor;
        $sssRegularSSEmployer = $sssContributions['regular_ss']['employer'] * $monthlyFactor;
        $sssRegularSSTotal = $sssContributions['regular_ss']['total'] * $monthlyFactor;
        
        // MPF contributions (prorated)
        $sssMPFMSC = $sssContributions['mpf']['msc'];
        $sssMPFEmployee = $sssContributions['mpf']['employee'] * $monthlyFactor;
        $sssMPFEmployer = $sssContributions['mpf']['employer'] * $monthlyFactor;
        $sssMPFTotal = $sssContributions['mpf']['total'] * $monthlyFactor;
        
        // Calculate Pag-IBIG contributions (prorated for payroll period)
        // Always calculate Pag-IBIG from monthly salary for ALL employees - do not use assigned taxes
        // Employee contribution: 1% or 2% based on salary (capped at ₱100)
        $pagibigEmployeeDeduction = $pagibigContributions['employee'] * $monthlyFactor;
        // Employer contribution: 2% (capped at ₱100)
        $pagibigEmployerContribution = $pagibigContributions['employer'] * $monthlyFactor;
        // Total contribution = Employee + Employer
        $pagibigTotalContribution = $pagibigContributions['total'] * $monthlyFactor;
        // Salary base used for calculation
        $pagibigSalaryBase = $pagibigContributions['salary_base'];
        
        // Calculate PhilHealth contributions (prorated for payroll period)
        // Always calculate PhilHealth from monthly salary for ALL employees - do not use assigned taxes
        // Employee contribution: 50% of total premium
        $philhealthEmployeeDeduction = $philhealthContributions['employee'] * $monthlyFactor;
        // Employer contribution: 50% of total premium
        $philhealthEmployerContribution = $philhealthContributions['employer'] * $monthlyFactor;
        // Total premium = Employee + Employer
        $philhealthTotalContribution = $philhealthContributions['total'] * $monthlyFactor;
        // MBS used for calculation
        $philhealthMBS = $philhealthContributions['mbs'];

        // Calculate tax deductions from assigned taxes (SSS, Pag-IBIG, and PhilHealth are excluded and calculated separately)
        $taxDeductions = $this->calculateAssignedTaxes($employee, $periodStart, $periodEnd, true, true, true);
        
        // Always use calculated SSS contribution based on MSC (2025 rate) for all employees
        // Set SSS deduction to the calculated amount
        $taxDeductions['sss'] = $sssEmployeeDeduction;
        $taxDeductions['total'] += $sssEmployeeDeduction;
        
        // Always use calculated Pag-IBIG contribution based on monthly salary (2025 rate) for all employees
        // Set Pag-IBIG deduction to the calculated amount
        $taxDeductions['pagibig'] = $pagibigEmployeeDeduction;
        $taxDeductions['total'] += $pagibigEmployeeDeduction;
        
        // Always use calculated PhilHealth contribution based on monthly salary (2025 rate) for all employees
        // Set PhilHealth deduction to the calculated amount
        $taxDeductions['philhealth'] = $philhealthEmployeeDeduction;
        $taxDeductions['total'] += $philhealthEmployeeDeduction;
        
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
        // Note: Late and undertime are calculated only if employee is assigned to those deductions
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

        // Store 13th month pay breakdown as JSON in notes or as an attribute
        $thirteenthMonthBreakdown = json_encode($thirteenthMonthPayData['breakdown']);
        
        // Update payroll with calculated values
        $payroll->update([
            'days_worked' => $actualDaysWorked,
            'absences' => $absences,
            'basic_salary' => round($basicSalary, 2),
            'gross_pay' => round($grossPay, 2),
            'overtime_pay' => round($overtimePay, 2),
            'holiday_pay' => round($holidayPay, 2),
            'thirteenth_month_pay' => round($thirteenthMonthPay, 2),
            'sss_deduction' => $sssDed,
            'sss_employer_contribution' => max(0, round($sssEmployerContribution, 2)),
            'sss_ec_contribution' => max(0, round($sssECContribution, 2)),
            'sss_employer_total' => max(0, round($sssEmployerTotal, 2)),
            'sss_total_remittance' => max(0, round($sssTotalRemittance, 2)),
            'sss_msc' => round($sssMSC, 2),
            'sss_regular_ss_msc' => round($sssRegularSSMSC, 2),
            'sss_regular_ss_employee' => max(0, round($sssRegularSSEmployee, 2)),
            'sss_regular_ss_employer' => max(0, round($sssRegularSSEmployer, 2)),
            'sss_regular_ss_total' => max(0, round($sssRegularSSTotal, 2)),
            'sss_mpf_msc' => round($sssMPFMSC, 2),
            'sss_mpf_employee' => max(0, round($sssMPFEmployee, 2)),
            'sss_mpf_employer' => max(0, round($sssMPFEmployer, 2)),
            'sss_mpf_total' => max(0, round($sssMPFTotal, 2)),
            'philhealth_deduction' => $philhealthDed,
            'philhealth_employer_contribution' => max(0, round($philhealthEmployerContribution, 2)),
            'philhealth_total_contribution' => max(0, round($philhealthTotalContribution, 2)),
            'philhealth_mbs' => round($philhealthMBS, 2),
            'pagibig_deduction' => $pagibigDed,
            'pagibig_employer_contribution' => max(0, round($pagibigEmployerContribution, 2)),
            'pagibig_total_contribution' => max(0, round($pagibigTotalContribution, 2)),
            'pagibig_salary_base' => round($pagibigSalaryBase, 2),
            'tax_deduction' => $taxDed,
            'late_deduction' => $lateDed,
            'undertime_deduction' => $undertimeDed,
            'cash_advance_deduction' => $cashAdvanceDed,
            'other_deductions' => $otherDed,
            'total_deductions' => $totalDed,
            'net_pay' => round($netPay, 2),
        ]);

        $payroll = $payroll->fresh(['employee', 'payrollPeriod']);
        
        // Add 13th month pay breakdown as an attribute
        $payroll->setAttribute('thirteenth_month_pay_breakdown', $thirteenthMonthPayData['breakdown']);
        $payroll->thirteenth_month_pay_breakdown = $thirteenthMonthPayData['breakdown'];
        $payroll->makeVisible('thirteenth_month_pay_breakdown');
        
        return $payroll;
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
     * Late penalties are calculated only if employee is assigned to Late Penalty deduction
     * Returns 0 if employee is not assigned or has no late occurrences
     * Grace period: 8:00 AM - 8:15 AM (no penalty)
     * Penalty starts from 8:16 AM onwards at 8.67 per minute
     */
    private function calculateLateDeduction(EmployeeProfile $employee, $attendances): float
    {
        // Late penalties are calculated only if employee is assigned to Late Penalty deduction
        // Check if employee has an active Late Penalty deduction assignment
        $hasLatePenaltyAssignment = EmployeeDeductionAssignment::where('employee_id', $employee->id)
            ->where('is_active', true)
            ->whereHas('deductionTitle', function($query) {
                $query->whereRaw('LOWER(name) = ?', ['late penalty'])
                      ->where('is_active', true);
            })
            ->exists();
        
        // If employee is not assigned to Late Penalty deduction, return 0
        if (!$hasLatePenaltyAssignment) {
            return 0;
        }

        $totalDeduction = 0;
        $totalMinutesLate = 0;
        $gracePeriodMinutes = 15;
        
        // Use employee's shift time if available, otherwise use default
        $employee->load('shift');
        if ($employee->shift && $employee->shift->start_time) {
            $shiftStartTime = Carbon::parse($employee->shift->start_time)->format('H:i:s');
        } else {
            $shiftStartTime = self::STANDARD_CLOCK_IN;
        }
        
        $standardClockIn = Carbon::createFromTimeString($shiftStartTime);
        $gracePeriodEnd = $standardClockIn->copy()->addMinutes($gracePeriodMinutes);

        foreach ($attendances as $attendance) {
            // Only calculate for days with clock in
            if (empty($attendance->clock_in)) {
                continue;
            }
            
            // Skip holidays and leave days - no penalties apply
            $status = $attendance->status ?? '';
            if (in_array($status, ['Holiday (No Work)', 'Holiday (Worked)', 'On Leave'])) {
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
                
                // Check if clocked in after the grace period
                // Use greater than (not >=) so exactly 08:15:00 is not considered late
                // Only count if clocked in after 08:15:00 (not including 08:15:00)
                if ($clockIn->gt($gracePeriodEnd)) {
                    // Calculate minutes late (ignore seconds, only count minutes)
                    // Extract only hour and minute, ignore seconds for calculation
                    $clockInHour = (int) $clockIn->format('H');
                    $clockInMinute = (int) $clockIn->format('i');
                    $gracePeriodEndHour = (int) $gracePeriodEnd->format('H');
                    $gracePeriodEndMinute = (int) $gracePeriodEnd->format('i');
                    
                    // Calculate difference in minutes only (ignoring seconds)
                    $clockInMinutes = ($clockInHour * 60) + $clockInMinute;
                    $gracePeriodEndMinutes = ($gracePeriodEndHour * 60) + $gracePeriodEndMinute;
                    $minutesLate = $clockInMinutes - $gracePeriodEndMinutes;
                    
                    // Only add if there's at least 1 full minute late
                    if ($minutesLate > 0) {
                        $totalMinutesLate += $minutesLate;
                    }
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
     * Undertime penalties are calculated only if employee is assigned to Undertime Penalty deduction
     * Returns 0 if employee is not assigned or has no undertime occurrences
     * If employee clocks out before standard end time, calculate minutes early and deduct at 8.67 per minute
     */
    private function calculateUndertimeDeduction(EmployeeProfile $employee, $attendances): float
    {
        // Undertime penalties are calculated only if employee is assigned to Undertime Penalty deduction
        // Check if employee has an active Undertime Penalty deduction assignment
        $hasUndertimePenaltyAssignment = EmployeeDeductionAssignment::where('employee_id', $employee->id)
            ->where('is_active', true)
            ->whereHas('deductionTitle', function($query) {
                $query->whereRaw('LOWER(name) = ?', ['undertime penalty'])
                      ->where('is_active', true);
            })
            ->exists();
        
        // If employee is not assigned to Undertime Penalty deduction, return 0
        if (!$hasUndertimePenaltyAssignment) {
            return 0;
        }

        $totalDeduction = 0;
        $totalMinutesEarly = 0;
        
        // Use employee's shift time if available, otherwise use default
        $employee->load('shift');
        if ($employee->shift && $employee->shift->end_time) {
            $shiftEndTime = Carbon::parse($employee->shift->end_time)->format('H:i:s');
        } else {
            $shiftEndTime = self::STANDARD_CLOCK_OUT;
        }
        
        $standardClockOut = Carbon::createFromTimeString($shiftEndTime);

        foreach ($attendances as $attendance) {
            // Only calculate undertime for days with actual clock out (not absent days)
            if (empty($attendance->clock_out)) {
                continue; // Skip days without clock out records
            }
            
            // Skip holidays and leave days - no penalties apply
            $status = $attendance->status ?? '';
            if (in_array($status, ['Holiday (No Work)', 'Holiday (Worked)', 'On Leave', 'Absent'])) {
                continue;
            }
            
            // Only calculate undertime for days with "Undertime" status
            // Don't count undertime for days with "Late" status - those are late penalties, not undertime
            // Only count pure undertime days (status = "Undertime" or "Late (Undertime)")
            if ($status !== 'Undertime' && $status !== 'Late (Undertime)') {
                continue;
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
                
                // Create standard clock out time for comparison
                $standardOut = Carbon::createFromTimeString($shiftEndTime);
                
                // Check if clocked out before standard end time
                if ($clockOut->lt($standardOut)) {
                    // Calculate minutes early (ignore seconds, only count minutes)
                    // Extract only hour and minute, ignore seconds for calculation
                    $clockOutHour = (int) $clockOut->format('H');
                    $clockOutMinute = (int) $clockOut->format('i');
                    $standardOutHour = (int) $standardOut->format('H');
                    $standardOutMinute = (int) $standardOut->format('i');
                    
                    // Calculate difference in minutes only (ignoring seconds)
                    $clockOutMinutes = ($clockOutHour * 60) + $clockOutMinute;
                    $standardOutMinutes = ($standardOutHour * 60) + $standardOutMinute;
                    $minutesEarly = $standardOutMinutes - $clockOutMinutes;
                    
                    // Only add if there's at least 1 full minute early
                    if ($minutesEarly > 0) {
                        $totalMinutesEarly += $minutesEarly;
                    }
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
        $totalDays = 0.0;

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
                    // Handle fractional days (e.g., 0.5 for half-day)
                    $withPayDays = (float) ($leave->with_pay_days ?? 0);
                    $totalDays += min((float) $days, $withPayDays);
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
        $totalDays = 0.0;

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
                    // Handle fractional days (e.g., 0.5 for half-day)
                    $withoutPayDays = (float) ($leave->without_pay_days ?? 0);
                    $daysToDeduct = $withoutPayDays > 0 ? min((float) $weekdays, $withoutPayDays) : (float) $weekdays;
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
     * Calculate holiday pay for days with "Holiday (Worked)" status
     * Different rates apply based on holiday type:
     * - Regular Holidays: 200% (Daily Rate × 2)
     * - Special Holidays: 130% (Daily Rate × 1.3)
     * Note: Holiday (Worked) days are excluded from basic salary calculation
     */
    private function calculateHolidayPay(EmployeeProfile $employee, $attendances, $dailyRate): float
    {
        $totalHolidayPay = 0;

        foreach ($attendances as $attendance) {
            $status = $attendance->status ?? '';
            
            // Only calculate for days with "Holiday (Worked)" status
            if ($status !== 'Holiday (Worked)') {
                continue;
            }

            // Check if this date is a holiday and get its type
            // First check the holidays table
            $holiday = \App\Models\Holiday::isHolidayDate($attendance->date);
            $isSpecialHoliday = false;
            
            if ($holiday) {
                // If found in holidays table, use the type from there
                $isSpecialHoliday = ($holiday->type === 'Special');
            } else {
                // If not found in holidays table, check the remarks field
                // Holiday type from import is stored in remarks field
                $remarks = strtolower($attendance->remarks ?? '');
                
                // Check if remarks contains "special" (case-insensitive)
                // Examples: "Special Holiday", "Special Non-Working Holiday", "SH", etc.
                if (stripos($remarks, 'special') !== false) {
                    $isSpecialHoliday = true;
                } else {
                    // Default to Regular Holiday if not specified
                    $isSpecialHoliday = false;
                }
            }
            
            // Calculate holiday pay based on type
            if ($isSpecialHoliday) {
                // Special Holidays: 130% (Daily Rate × 1.3)
                $holidayPay = $dailyRate * 1.3;
            } else {
                // Regular Holidays: 200% (double pay)
                $holidayPay = $dailyRate * 2;
            }

            $totalHolidayPay += $holidayPay;
        }

        return round($totalHolidayPay, 2);
    }

    /**
     * Calculate unused leave days with pay for the year
     * Returns the total number of unused paid leave days that can be converted to cash
     * 
     * Only counts SIL (Service Incentive Leave) unused days:
     * - SIL (Sick Leave + Emergency Leave): 8 days maximum
     * 
     * Only SIL can be converted to cash and added to 13th month pay.
     * Other leave types (Vacation, Personal, Bereavement, etc.) cannot be converted to cash.
     * 
     * Supports fractional days (e.g., 0.5 for half-day leaves)
     * 
     * @param EmployeeProfile $employee
     * @param int $year
     * @return float Total unused SIL days with pay (0-8, can be fractional like 0.5, 1.5, etc.)
     */
    private function calculateUnusedLeaveDaysWithPay(EmployeeProfile $employee, int $year): float
    {
        $userId = $employee->user_id;
        
        // Calculate employee tenure
        $tenureInMonths = LeaveRequest::calculateEmployeeTenure($userId);
        
        // Only employees with 1 year or more tenure are eligible for paid leave
        if ($tenureInMonths < 12) {
            return 0.0;
        }
        
        // Calculate used days for SIL (Sick Leave + Emergency Leave share 8 days)
        // Only SIL can be converted to cash for 13th month pay
        // Get all approved SIL leaves for recalculation if needed
        $silLeaves = LeaveRequest::where('employee_id', $userId)
            ->whereIn('type', ['Sick Leave', 'Emergency Leave'])
            ->whereYear('from', $year)
            ->whereIn('status', ['approved'])
            ->get();
        
        // Calculate used days by summing with_pay_days
        // Recalculate payment terms if with_pay_days doesn't match expected value based on total_days
        // This handles cases where leaves were created before fractional support or have incorrect values
        $usedSILDays = 0.0;
        foreach ($silLeaves as $leave) {
            $withPayDays = (float) ($leave->with_pay_days ?? 0);
            $totalDays = (float) ($leave->total_days ?? 0);
            
            // Recalculate payment terms if:
            // 1. with_pay_days is 0 but total_days > 0 (missing payment calculation)
            // 2. with_pay_days doesn't match total_days when leave should be fully paid
            //    (e.g., total_days = 3.5 but with_pay_days = 4.0, indicating incorrect calculation)
            $needsRecalculation = false;
            if ($totalDays > 0) {
                if ($withPayDays == 0) {
                    // Missing payment calculation
                    $needsRecalculation = true;
                } elseif ($leave->terms === 'with PAY' && abs($withPayDays - $totalDays) > 0.01) {
                    // Payment terms say "with PAY" but with_pay_days doesn't match total_days
                    // This indicates the leave might have been created with incorrect values
                    $needsRecalculation = true;
                } elseif ($leave->leave_duration === 'half_day' && $totalDays < 1 && $withPayDays >= 1) {
                    // Half-day leave should have with_pay_days = 0.5, not 1.0 or more
                    $needsRecalculation = true;
                }
            }
            
            if ($needsRecalculation) {
                $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                    $userId,
                    $leave->type,
                    $totalDays,
                    $year
                );
                $withPayDays = (float) ($paymentTerms['with_pay_days'] ?? 0);
                
                // Update the leave record with correct with_pay_days for future calculations
                if (abs($withPayDays - ($leave->with_pay_days ?? 0)) > 0.01) {
                    $leave->with_pay_days = $withPayDays;
                    $leave->without_pay_days = $paymentTerms['without_pay_days'] ?? 0;
                    $leave->terms = $paymentTerms['terms'];
                    $leave->save();
                }
            }
            
            $usedSILDays += $withPayDays;
        }
        
        // Ensure usedSILDays is never negative (in case of data issues)
        // Keep as float to support fractional days (e.g., 3.5 days = 3 full days + 0.5 half-day)
        $usedSILDays = max(0.0, $usedSILDays);
        
        // Round to 2 decimal places to handle any floating point precision issues
        $usedSILDays = round($usedSILDays, 2);
        
        $silEntitled = 8.0; // SIL gets 8 days WITH PAY for employees with 1+ year tenure
        
        // Calculate unused SIL days
        // Formula: unused = entitled - used
        // Ensure unused is between 0 and entitled (cap at entitled amount)
        // Support fractional values (e.g., if used 7.5 days, unused = 0.5 days)
        $unusedSIL = $silEntitled - $usedSILDays;
        $unusedSIL = max(0.0, min($silEntitled, $unusedSIL));
        
        // Return as float to preserve fractional days (e.g., 0.5, 1.5, 2.5, etc.)
        return round($unusedSIL, 2);
    }

    /**
     * Calculate 13th month pay with breakdown
     * Formula: (Basic Salary per Month × Months Worked during the Year) / 12
     * PLUS: Unused leave days with pay converted to cash
     * 
     * @param EmployeeProfile $employee
     * @param string $periodStart
     * @param string $periodEnd
     * @return array ['total' => float, 'breakdown' => array]
     */
    private function calculateThirteenthMonthPayWithBreakdown(EmployeeProfile $employee, $periodStart, $periodEnd): array
    {
        // Get employee's monthly basic salary
        $monthlyBasicSalary = $employee->salary ?? 0;
        
        if ($monthlyBasicSalary <= 0) {
            return [
                'total' => 0,
                'breakdown' => []
            ];
        }

        // Get the year from the payroll period end date
        $periodEndCarbon = Carbon::parse($periodEnd);
        $year = $periodEndCarbon->year;
        
        // Get employee's hire date
        $hireDate = null;
        if ($employee->hire_date) {
            $hireDate = Carbon::parse($employee->hire_date);
        } else {
            // If no hire date, use employee creation date as fallback
            $hireDate = Carbon::parse($employee->created_at);
        }
        
        // Determine the start of the calculation period (start of the year)
        $yearStart = Carbon::create($year, 1, 1)->startOfDay();
        
        // Use the later of: hire date or start of the year
        $calculationStart = $hireDate->gt($yearStart) ? $hireDate : $yearStart;
        
        // Determine the end of the calculation period (end of the year or period end, whichever is earlier)
        $yearEnd = Carbon::create($year, 12, 31)->endOfDay();
        $calculationEnd = $periodEndCarbon->lt($yearEnd) ? $periodEndCarbon : $yearEnd;
        
        // Ensure calculation start is before calculation end
        if ($calculationStart->gt($calculationEnd)) {
            return [
                'total' => 0,
                'breakdown' => []
            ];
        }
        
        // Count months worked during the year
        // We count the number of calendar months the employee worked
        // Start from the first day of the start month to the last day of the end month
        $startMonth = $calculationStart->month;
        $endMonth = $calculationEnd->month;
        $startYear = $calculationStart->year;
        $endYear = $calculationEnd->year;
        
        // Calculate months worked
        if ($startYear == $endYear) {
            // Same year: count months from start month to end month (inclusive)
            $monthsWorked = ($endMonth - $startMonth) + 1;
        } else {
            // Different years (shouldn't happen for same year calculation, but handle it)
            $monthsWorked = (12 - $startMonth + 1) + ($endMonth - 1);
        }
        
        // Ensure months worked doesn't exceed 12 and is at least 1
        $monthsWorked = max(1, min($monthsWorked, 12));
        
        // Calculate total salary earned during the year
        // Total salary = monthly basic salary × months worked
        $totalSalaryEarned = $monthlyBasicSalary * $monthsWorked;
        
        // Calculate base 13th month pay: total salary earned / 12
        $baseThirteenthMonthPay = $totalSalaryEarned / 12;
        
        // Calculate approved monetization requests for this year
        // Only approved monetization requests should be added to 13th month pay
        $approvedMonetizationRequests = LeaveMonetizationRequest::where('employee_id', $employee->user_id)
            ->where('leave_year', $year)
            ->where('status', 'approved')
            ->get();
        
        // Sum up the approved requested days
        $approvedMonetizationDays = $approvedMonetizationRequests->sum('requested_days');
        $approvedMonetizationDays = (float) $approvedMonetizationDays;
        
        // Calculate daily rate (monthly salary / 26 working days)
        $dailyRate = $monthlyBasicSalary / 26;
        
        // Convert approved monetization days to cash
        // Use the daily rate from the request if available, otherwise use current daily rate
        $unusedLeaveCash = 0.0;
        foreach ($approvedMonetizationRequests as $request) {
            // Use the daily rate stored in the request (rate at time of request)
            $unusedLeaveCash += (float) $request->requested_days * (float) $request->daily_rate;
        }
        
        // For display purposes, use the approved days
        $unusedLeaveDays = $approvedMonetizationDays;
        
        // Add unused leave cash to 13th month pay
        $thirteenthMonthPay = $baseThirteenthMonthPay + $unusedLeaveCash;
        
        // Build breakdown
        $breakdown = [
            [
                'description' => 'Base 13th Month Pay',
                'calculation' => "₱" . number_format($monthlyBasicSalary, 2) . " × {$monthsWorked} months ÷ 12",
                'amount' => round($baseThirteenthMonthPay, 2)
            ]
        ];
        
        if ($unusedLeaveDays > 0) {
            // Format days display to show fractional days properly (e.g., "0.5 days" or "4.5 days")
            // Check if the value is a whole number by comparing floor to the value
            $floorValue = floor($unusedLeaveDays);
            $isWholeNumber = abs($unusedLeaveDays - $floorValue) < 0.0001;
            
            if ($isWholeNumber) {
                // Whole number: display as integer (e.g., "4 days")
                $daysDisplay = (int) $floorValue . ' day' . ($floorValue > 1 ? 's' : '');
            } else {
                // Fractional number: display with 1 decimal place (e.g., "4.5 days" or "0.5 day")
                // Use number_format to ensure exactly 1 decimal place is shown
                $daysDisplay = number_format($unusedLeaveDays, 1, '.', '') . ' day' . ($unusedLeaveDays >= 1 ? 's' : '');
            }
            
            // For approved monetization requests, show breakdown
            if ($approvedMonetizationRequests->count() > 0) {
                // Show individual requests if multiple, or single request
                if ($approvedMonetizationRequests->count() === 1) {
                    $request = $approvedMonetizationRequests->first();
                    $breakdown[] = [
                        'description' => 'Approved Leave Monetization',
                        'calculation' => "{$daysDisplay} × ₱" . number_format($request->daily_rate, 2) . " (daily rate at time of request)",
                        'amount' => round($unusedLeaveCash, 2)
                    ];
                } else {
                    // Multiple requests - show total
                    $breakdown[] = [
                        'description' => 'Approved Leave Monetization',
                        'calculation' => "{$daysDisplay} days (from {$approvedMonetizationRequests->count()} approved request" . 
                            ($approvedMonetizationRequests->count() > 1 ? 's' : '') . ")",
                        'amount' => round($unusedLeaveCash, 2)
                    ];
                }
            } else {
                // Fallback (shouldn't happen if logic is correct)
                $breakdown[] = [
                    'description' => 'Unused Leave Days (Converted to Cash)',
                    'calculation' => "{$daysDisplay} × ₱" . number_format($dailyRate, 2) . " (daily rate)",
                    'amount' => round($unusedLeaveCash, 2)
                ];
            }
        }
        
        // Always add the total row
        $breakdown[] = [
            'description' => 'Total 13th Month Pay',
            'calculation' => '',
            'amount' => round($thirteenthMonthPay, 2),
            'is_total' => true
        ];
        
        // Ensure breakdown is never empty
        if (empty($breakdown)) {
            $breakdown = [
                [
                    'description' => 'Total 13th Month Pay',
                    'calculation' => 'No breakdown available',
                    'amount' => round($thirteenthMonthPay, 2),
                    'is_total' => true
                ]
            ];
        }
        
        return [
            'total' => round($thirteenthMonthPay, 2),
            'breakdown' => $breakdown
        ];
    }

    /**
     * Calculate 13th month pay (legacy method for backward compatibility)
     * 
     * @param EmployeeProfile $employee
     * @param string $periodStart
     * @param string $periodEnd
     * @return float
     */
    private function calculateThirteenthMonthPay(EmployeeProfile $employee, $periodStart, $periodEnd): float
    {
        $data = $this->calculateThirteenthMonthPayWithBreakdown($employee, $periodStart, $periodEnd);
        return $data['total'];
    }

    /**
     * Get Monthly Salary Credit (MSC) from employee's monthly salary based on 2025 SSS table
     * SSS contributions are based on MSC brackets, not exact salary
     * 
     * @param float $monthlySalary Employee's monthly salary
     * @return float Monthly Salary Credit
     */
    private function getMonthlySalaryCredit(float $monthlySalary): float
    {
        // Handle edge cases
        if ($monthlySalary <= 0) {
            return 5000.00; // Minimum MSC
        }

        // SSS 2025 Contribution Table - Monthly Salary Credit brackets
        // Format: [min_salary, max_salary, msc]
        $mscBrackets = [
            [0, 5249.99, 5000.00],
            [5250.00, 5749.99, 5500.00],
            [5750.00, 6249.99, 6000.00],
            [6250.00, 6749.99, 6500.00],
            [6750.00, 7249.99, 7000.00],
            [7250.00, 7749.99, 7500.00],
            [7750.00, 8249.99, 8000.00],
            [8250.00, 8749.99, 8500.00],
            [8750.00, 9249.99, 9000.00],
            [9250.00, 9749.99, 9500.00],
            [9750.00, 10249.99, 10000.00],
            [10250.00, 10749.99, 10500.00],
            [10750.00, 11249.99, 11000.00],
            [11250.00, 11749.99, 11500.00],
            [11750.00, 12249.99, 12000.00],
            [12250.00, 12749.99, 12500.00],
            [12750.00, 13249.99, 13000.00],
            [13250.00, 13749.99, 13500.00],
            [13750.00, 14249.99, 14000.00],
            [14250.00, 14749.99, 14500.00],
            [14750.00, 15249.99, 15000.00],
            [15250.00, 15749.99, 15500.00],
            [15750.00, 16249.99, 16000.00],
            [16250.00, 16749.99, 16500.00],
            [16750.00, 17249.99, 17000.00],
            [17250.00, 17749.99, 17500.00],
            [17750.00, 18249.99, 18000.00],
            [18250.00, 18749.99, 18500.00],
            [18750.00, 19249.99, 19000.00],
            [19250.00, 19749.99, 19500.00],
            [19750.00, 20249.99, 20000.00],
            [20250.00, 20749.99, 20500.00],
            [20750.00, 21249.99, 21000.00],
            [21250.00, 21749.99, 21500.00],
            [21750.00, 22249.99, 22000.00],
            [22250.00, 22749.99, 22500.00],
            [22750.00, 23249.99, 23000.00],
            [23250.00, 23749.99, 23500.00],
            [23750.00, 24249.99, 24000.00],
            [24250.00, 24749.99, 24500.00],
            [24750.00, 25249.99, 25000.00],
            [25250.00, 25749.99, 25500.00],
            [25750.00, 26249.99, 26000.00],
            [26250.00, 26749.99, 26500.00],
            [26750.00, 27249.99, 27000.00],
            [27250.00, 27749.99, 27500.00],
            [27750.00, 28249.99, 28000.00],
            [28250.00, 28749.99, 28500.00],
            [28750.00, 29249.99, 29000.00],
            [29250.00, 29749.99, 29500.00],
            [29750.00, 30249.99, 30000.00],
            [30250.00, 30749.99, 30500.00],
            [30750.00, 31249.99, 31000.00],
            [31250.00, 31749.99, 31500.00],
            [31750.00, 32249.99, 32000.00],
            [32250.00, 32749.99, 32500.00],
            [32750.00, 33249.99, 33000.00],
            [33250.00, 33749.99, 33500.00],
            [33750.00, 34249.99, 34000.00],
            [34250.00, 34749.99, 34500.00],
            [34750.00, PHP_FLOAT_MAX, 35000.00], // Maximum MSC for salaries 34,750 and above
        ];

        // Find the appropriate MSC bracket
        foreach ($mscBrackets as $bracket) {
            [$min, $max, $msc] = $bracket;
            if ($monthlySalary >= $min && $monthlySalary <= $max) {
                return $msc;
            }
        }

        // Fallback to maximum MSC if salary exceeds all brackets
        return 35000.00;
    }

    /**
     * Calculate SSS contributions based on Monthly Salary Credit (MSC)
     * Based on 2025 SSS Contribution Table
     * 
     * Regular SS Contribution = 15% of MSC up to ₱20,000 (10% employer + 5% employee)
     * MPF (Member's Provident Fund) = 15% of MSC above ₱20,000 (10% employer + 5% employee)
     * Employer also pays EC (Employees' Compensation):
     *   - ₱10.00 for MSC below ₱15,000
     *   - ₱30.00 for MSC ₱15,000 and above
     * 
     * @param float $monthlySalary Employee's monthly salary
     * @return array ['msc' => float, 'employee' => float, 'employer' => float, 'ec' => float, 'employer_total' => float, 'total' => float, 'regular_ss' => array, 'mpf' => array]
     */
    private function calculateSSSContributions(float $monthlySalary): array
    {
        // Get Monthly Salary Credit from salary
        $msc = $this->getMonthlySalaryCredit($monthlySalary);

        // MPF threshold: ₱20,000
        $mpfThreshold = 20000.00;
        $employeeRate = 0.05; // 5%
        $employerRate = 0.10; // 10%
        $contributionRate = 0.15; // 15% total

        // Calculate Regular SS (for MSC up to ₱20,000)
        $regularSSMSC = min($msc, $mpfThreshold);
        $regularSSEmployee = $regularSSMSC * $employeeRate; // 5% of Regular SS MSC
        $regularSSEmployer = $regularSSMSC * $employerRate; // 10% of Regular SS MSC
        $regularSSTotal = $regularSSEmployee + $regularSSEmployer; // 15% of Regular SS MSC

        // Calculate MPF (for MSC above ₱20,000)
        $mpfMSC = max(0, $msc - $mpfThreshold);
        $mpfEmployee = $mpfMSC * $employeeRate; // 5% of MPF MSC
        $mpfEmployer = $mpfMSC * $employerRate; // 10% of MPF MSC
        $mpfTotal = $mpfEmployee + $mpfEmployer; // 15% of MPF MSC

        // Total contributions (Regular SS + MPF)
        $totalEmployeeContribution = $regularSSEmployee + $mpfEmployee;
        $totalEmployerContribution = $regularSSEmployer + $mpfEmployer;

        // Employees' Compensation (EC) - paid by employer only
        // ₱10.00 for MSC below ₱15,000
        // ₱30.00 for MSC ₱15,000 and above
        $ecContribution = 10.00;
        if ($msc >= 15000.00) {
            $ecContribution = 30.00;
        }

        // Total employer contribution = Regular SS (employer) + MPF (employer) + EC
        $totalEmployerShare = $totalEmployerContribution + $ecContribution;

        // Grand total = Employee + Employer (Regular SS + MPF + EC)
        $grandTotal = $totalEmployeeContribution + $totalEmployerShare;

        return [
            'msc' => round($msc, 2),
            'employee' => round($totalEmployeeContribution, 2),
            'employer' => round($totalEmployerContribution, 2),
            'ec' => round($ecContribution, 2),
            'employer_total' => round($totalEmployerShare, 2),
            'total' => round($grandTotal, 2),
            'regular_ss' => [
                'msc' => round($regularSSMSC, 2),
                'employee' => round($regularSSEmployee, 2),
                'employer' => round($regularSSEmployer, 2),
                'total' => round($regularSSTotal, 2)
            ],
            'mpf' => [
                'msc' => round($mpfMSC, 2),
                'employee' => round($mpfEmployee, 2),
                'employer' => round($mpfEmployer, 2),
                'total' => round($mpfTotal, 2)
            ]
        ];
    }

    /**
     * Calculate Pag-IBIG contributions based on monthly compensation - 2025 rates
     * 
     * Rules:
     * - If monthly compensation ≤ ₱1,500: Employee 1%, Employer 2%
     * - If monthly compensation > ₱1,500: Employee 2%, Employer 2%
     * - Maximum salary base for computation: ₱5,000
     * - If salary > ₱5,000, use ₱5,000 as base
     * - Maximum employee contribution: ₱100 (2% of ₱5,000)
     * - Maximum employer contribution: ₱100 (2% of ₱5,000)
     * 
     * @param float $monthlySalary Employee's monthly salary
     * @return array ['employee' => float, 'employer' => float, 'total' => float, 'salary_base' => float]
     */
    private function calculatePagIbigContributions(float $monthlySalary): array
    {
        // Maximum salary base for Pag-IBIG computation
        $maxSalaryBase = 5000.00;
        
        // Determine the salary base (capped at ₱5,000)
        $salaryBase = min($monthlySalary, $maxSalaryBase);
        
        // Handle edge cases
        if ($monthlySalary <= 0) {
            return [
                'salary_base' => 0,
                'employee' => 0,
                'employer' => 0,
                'total' => 0
            ];
        }
        
        // Determine contribution rates based on monthly compensation
        if ($monthlySalary <= 1500.00) {
            // Employee earns ₱1,500 or below: Employee 1%, Employer 2%
            $employeeRate = 0.01; // 1%
            $employerRate = 0.02; // 2%
        } else {
            // Employee earns more than ₱1,500: Both 2%
            $employeeRate = 0.02; // 2%
            $employerRate = 0.02; // 2%
        }
        
        // Calculate contributions based on salary base
        $employeeContribution = $salaryBase * $employeeRate;
        $employerContribution = $salaryBase * $employerRate;
        
        // Cap contributions at maximum (₱100 each)
        $maxEmployeeContribution = 100.00; // 2% of ₱5,000
        $maxEmployerContribution = 100.00; // 2% of ₱5,000
        
        $employeeContribution = min($employeeContribution, $maxEmployeeContribution);
        $employerContribution = min($employerContribution, $maxEmployerContribution);
        
        // Total contribution
        $totalContribution = $employeeContribution + $employerContribution;
        
        return [
            'salary_base' => round($salaryBase, 2),
            'employee' => round($employeeContribution, 2),
            'employer' => round($employerContribution, 2),
            'total' => round($totalContribution, 2)
        ];
    }

    /**
     * Calculate PhilHealth contributions based on Monthly Basic Salary (MBS) - 2025 rates
     * 
     * Rules:
     * - If MBS ≤ ₱10,000: Premium = ₱500 (fixed)
     * - If MBS is between ₱10,000.01 and ₱99,999.99: Premium = 5% of MBS, but must be between ₱500 and ₱5,000
     * - If MBS ≥ ₱100,000: Premium = ₱5,000 (maximum)
     * - After getting total premium, divide equally: 50% employee, 50% employer
     * 
     * @param float $monthlySalary Employee's monthly basic salary
     * @return array ['employee' => float, 'employer' => float, 'total' => float, 'mbs' => float]
     */
    private function calculatePhilHealthContributions(float $monthlySalary): array
    {
        // Handle edge cases
        if ($monthlySalary <= 0) {
            return [
                'mbs' => 0,
                'employee' => 0,
                'employer' => 0,
                'total' => 0
            ];
        }
        
        $mbs = $monthlySalary;
        $totalPremium = 0;
        
        // Calculate total premium based on MBS
        if ($mbs <= 10000.00) {
            // If MBS ≤ ₱10,000: Premium = ₱500 (fixed)
            $totalPremium = 500.00;
        } elseif ($mbs >= 100000.00) {
            // If MBS ≥ ₱100,000: Premium = ₱5,000 (maximum)
            $totalPremium = 5000.00;
        } else {
            // If MBS is between ₱10,000.01 and ₱99,999.99: Premium = 5% of MBS
            // But must be between ₱500 and ₱5,000
            $calculatedPremium = $mbs * 0.05; // 5% of MBS
            $totalPremium = max(500.00, min(5000.00, $calculatedPremium)); // Clamp between ₱500 and ₱5,000
        }
        
        // Divide total premium equally: 50% employee, 50% employer
        $employeeContribution = $totalPremium * 0.50; // 50%
        $employerContribution = $totalPremium * 0.50; // 50%
        
        return [
            'mbs' => round($mbs, 2),
            'employee' => round($employeeContribution, 2),
            'employer' => round($employerContribution, 2),
            'total' => round($totalPremium, 2)
        ];
    }

    /**
     * Calculate tax deductions from assigned taxes
     * Taxes are deducted per payroll period (fixed amount per period)
     * 
     * @param bool $excludeSSS If true, exclude SSS from calculation (SSS is calculated separately from MSC)
     * @param bool $excludePagIbig If true, exclude Pag-IBIG from calculation (Pag-IBIG is calculated separately from monthly salary)
     * @param bool $excludePhilHealth If true, exclude PhilHealth from calculation (PhilHealth is calculated separately from monthly salary)
     */
    private function calculateAssignedTaxes(EmployeeProfile $employee, $periodStart = null, $periodEnd = null, bool $excludeSSS = false, bool $excludePagIbig = false, bool $excludePhilHealth = false): array
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
                // SSS Contribution - exclude if $excludeSSS is true (calculated separately from MSC)
                if (!$excludeSSS) {
                    $sssDeduction += $effectiveRate;
                } else {
                    // Skip SSS - it's calculated separately from MSC for all employees
                    continue;
                }
            } elseif (strpos($taxName, 'philhealth') !== false) {
                // PhilHealth Contribution - exclude if $excludePhilHealth is true (calculated separately from monthly salary)
                if (!$excludePhilHealth) {
                    $philhealthDeduction += $effectiveRate;
                } else {
                    // Skip PhilHealth - it's calculated separately from monthly salary for all employees
                    continue;
                }
            } elseif (strpos($taxName, 'pag-ibig') !== false || strpos($taxName, 'pagibig') !== false) {
                // Pag-IBIG Contribution - exclude if $excludePagIbig is true (calculated separately from monthly salary)
                if (!$excludePagIbig) {
                    $pagibigDeduction += $effectiveRate;
                } else {
                    // Skip Pag-IBIG - it's calculated separately from monthly salary for all employees
                    continue;
                }
            } else {
                // For other taxes (like income tax), these are fixed per period
                // Note: Income tax based on gross pay will be calculated separately
                $otherTaxDeduction += $effectiveRate;
            }

            // Always add to total for accurate sum
            $totalTaxDeduction += $effectiveRate;
        }

        // Calculate monthly factor for payroll period
        // If payroll period is 6-7 days, divide by 4; if 15 days, divide by 2; if full month, no division
        $monthlyFactor = $this->getMonthlyFactorForPeriod($periodStart, $periodEnd);
        
        // Apply monthly factor to taxes (PhilHealth, Pag-IBIG)
        // These are typically calculated monthly, so we prorate based on payroll period length
        // Note: SSS is excluded from here and calculated separately from MSC for all employees
        // Note: Pag-IBIG is excluded from here and calculated separately from monthly salary for all employees
        // Note: PhilHealth is excluded from here and calculated separately from monthly salary for all employees
        if (!$excludePhilHealth) {
            $philhealthDeduction *= $monthlyFactor;
        }
        if (!$excludePagIbig) {
            $pagibigDeduction *= $monthlyFactor;
        }
        
        // Calculate total tax deduction based on which taxes are excluded
        // Build total incrementally based on what's included
        $totalTaxDeduction = 0;
        
        // Add SSS if not excluded
        if (!$excludeSSS) {
            // Use the same monthly factor calculation as the main payroll calculation
            // If payroll period is 6-7 days, divide by 4; if 15 days, divide by 2; if full month, no division
            $monthlyFactor = $this->getMonthlyFactorForPeriod($periodStart, $periodEnd);
            if ($sssDeduction > 0) {
                $sssDeduction = $sssDeduction * $monthlyFactor;
            }
            $totalTaxDeduction += $sssDeduction;
        }
        
        // Add PhilHealth if not excluded
        if (!$excludePhilHealth) {
            $totalTaxDeduction += $philhealthDeduction;
        }
        
        // Add Pag-IBIG if not excluded
        if (!$excludePagIbig) {
            $totalTaxDeduction += $pagibigDeduction;
        }
        
        // Always add other taxes
        $totalTaxDeduction += $otherTaxDeduction;

        return [
            'sss' => round($sssDeduction, 2),
            'philhealth' => round($philhealthDeduction, 2),
            'pagibig' => round($pagibigDeduction, 2),
            'tax' => round($otherTaxDeduction, 2),
            'total' => round($totalTaxDeduction, 2)
        ];
    }

    private function getWeeksFactorForPeriod($periodStart, $periodEnd): int
    {
        if (!$periodStart || !$periodEnd) {
            return 1;
        }

        try {
            $start = Carbon::parse($periodStart);
            $end = Carbon::parse($periodEnd);
        } catch (\Exception $e) {
            return 1;
        }

        if ($start->gt($end)) {
            return 1;
        }

        $days = $start->diffInDays($end) + 1;
        $weeks = (int) round($days / 7);

        return max(1, $weeks);
    }

    /**
     * Calculate monthly factor for payroll period
     * Used to prorate SSS, Pag-IBIG, and PhilHealth contributions based on period length
     * 
     * Rules:
     * - 6-7 days (1 week): divide by 4 (factor = 0.25)
     * - 15 days (half month): divide by 2 (factor = 0.5)
     * - 30-31 days (full month): no division (factor = 1.0)
     * - For other periods, interpolate based on days
     * 
     * @param mixed $periodStart
     * @param mixed $periodEnd
     * @return float
     */
    private function getMonthlyFactorForPeriod($periodStart, $periodEnd): float
    {
        if (!$periodStart || !$periodEnd) {
            return 1.0;
        }

        try {
            $start = Carbon::parse($periodStart);
            $end = Carbon::parse($periodEnd);
        } catch (\Exception $e) {
            return 1.0;
        }

        if ($start->gt($end)) {
            return 1.0;
        }

        $days = $start->diffInDays($end) + 1;

        // 6-7 days (1 week): divide by 4 (factor = 0.25)
        if ($days >= 6 && $days <= 7) {
            return 0.25;
        }
        
        // 15 days (half month): divide by 2 (factor = 0.5)
        if ($days == 15) {
            return 0.5;
        }
        
        // 30-31 days (full month): no division (factor = 1.0)
        if ($days >= 30 && $days <= 31) {
            return 1.0;
        }
        
        // For other periods, interpolate based on days
        // Linear interpolation between known points:
        // - 7 days = 0.25
        // - 15 days = 0.5
        // - 30 days = 1.0
        
        if ($days < 6) {
            // Less than 1 week: use 1 week rate (0.25)
            return 0.25;
        } elseif ($days < 15) {
            // Between 7-14 days: interpolate between 0.25 and 0.5
            // Linear interpolation: factor = 0.25 + (days - 7) * (0.5 - 0.25) / (15 - 7)
            return 0.25 + ($days - 7) * 0.25 / 8;
        } elseif ($days < 30) {
            // Between 15-29 days: interpolate between 0.5 and 1.0
            // Linear interpolation: factor = 0.5 + (days - 15) * (1.0 - 0.5) / (30 - 15)
            return 0.5 + ($days - 15) * 0.5 / 15;
        } else {
            // More than 31 days: cap at 1.0 (full month)
            return 1.0;
        }
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

            // For other deductions (custom deductions created by HR)
            // Add the fixed amount
            $totalDeduction += $effectiveAmount;
        }

        return $totalDeduction;
    }

    /**
     * Get employee's own payrolls
     */
    public function myPayrolls(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }

            $query = Payroll::with(['employee', 'payrollPeriod'])
                ->where('employee_id', $employeeProfile->id);

            // Filter by period if provided
            if ($request->has('period_start') && $request->has('period_end')) {
                $query->whereBetween('period_start', [$request->period_start, $request->period_end]);
            }

            // Sort by most recent first
            $query->orderBy('period_start', 'desc');

            $payrolls = $query->get();

            return response()->json([
                'success' => true,
                'data' => $payrolls
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payrolls: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download payslip as PDF
     * Employees can only download their own payslips
     * HR Assistant, HR Staff, and Managers can download any employee's payslip
     */
    public function downloadPayslip($id)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Please log in again.'
                ], 401);
            }
            
            // Load user role relationship explicitly
            $user->load('role');
            $userRole = $user->role ? $user->role->name : null;
            
            // Check if user is HR Assistant, HR Staff, or Manager (can download any payslip)
            $isHR = in_array($userRole, ['HR Assistant', 'HR Staff', 'Manager']);
            
            // Load payroll with relationships
            if ($isHR) {
                // HR can download any employee's payslip
                $payroll = Payroll::with(['employee', 'payrollPeriod'])
                    ->where('id', $id)
                    ->first();
                
                if (!$payroll) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payslip not found'
                    ], 404);
                }
                
                // The employee relationship returns EmployeeProfile directly
                $employeeProfile = $payroll->employee;
            } else {
                // Employees can only download their own payslips
                $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

                if (!$employeeProfile) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Employee profile not found'
                    ], 404);
                }

                $payroll = Payroll::with(['employee', 'payrollPeriod'])
                    ->where('id', $id)
                    ->where('employee_id', $employeeProfile->id)
                    ->first();
                    
                if (!$payroll) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payslip not found or you do not have permission to access it'
                    ], 404);
                }
            }

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found for this payroll'
                ], 404);
            }

            // Generate PDF using the same template employees see
            $pdf = Pdf::loadView('pdf.payslip', compact('payroll', 'employeeProfile'));
            $pdf->setPaper('a4', 'portrait');

            $employeeName = $employeeProfile->first_name . '_' . $employeeProfile->last_name;
            $period = $payroll->period_start . '_to_' . $payroll->period_end;
            $filename = 'payslip_' . $employeeName . '_' . $period . '.pdf';

            return $pdf->download($filename);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payslip not found or you do not have permission to access it'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Payslip download error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'payroll_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to download payslip: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update payroll status
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|string|in:draft,processed,paid'
            ]);

            $payroll = Payroll::findOrFail($id);
            
            // Only allow editing status if current status is draft
            if ($payroll->status !== 'draft') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only draft payrolls can have their status updated.'
                ], 400);
            }

            $payroll->status = $validated['status'];
            
            // Set processed_at or paid_at timestamps
            if ($validated['status'] === 'processed') {
                $payroll->processed_at = now();
            } elseif ($validated['status'] === 'paid') {
                $payroll->paid_at = now();
                $payroll->processed_at = $payroll->processed_at ?? now();
            }
            
            $payroll->save();

            return response()->json([
                'success' => true,
                'message' => 'Payroll status updated successfully',
                'data' => $payroll->fresh(['employee', 'payrollPeriod'])
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payroll status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update payroll statuses
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|string|in:draft,processed,paid',
                'period_start' => 'nullable|date',
                'period_end' => 'nullable|date',
                'payroll_period_id' => 'nullable|exists:payroll_periods,id'
            ]);

            $query = Payroll::where('status', 'draft'); // Only update draft payrolls

            // Filter by period if provided
            if (isset($validated['period_start']) && isset($validated['period_end'])) {
                $query->whereBetween('period_start', [$validated['period_start'], $validated['period_end']]);
            }

            // Filter by payroll period if provided
            if (isset($validated['payroll_period_id'])) {
                $query->where('payroll_period_id', $validated['payroll_period_id']);
            }

            $payrolls = $query->get();

            if ($payrolls->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No draft payrolls found to update'
                ], 404);
            }

            $updateData = ['status' => $validated['status']];
            
            // Set processed_at or paid_at timestamps
            if ($validated['status'] === 'processed') {
                $updateData['processed_at'] = now();
            } elseif ($validated['status'] === 'paid') {
                $updateData['paid_at'] = now();
                $updateData['processed_at'] = now();
            }

            $updatedCount = $query->update($updateData);

            return response()->json([
                'success' => true,
                'message' => "Successfully updated {$updatedCount} payroll status(es) to {$validated['status']}",
                'data' => [
                    'updated_count' => $updatedCount,
                    'new_status' => $validated['status']
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to bulk update payroll statuses: ' . $e->getMessage()
            ], 500);
        }
    }
}

