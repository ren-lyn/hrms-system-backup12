<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\EmployeeProfile;

class PayrollComputationService
{
	public function getAttendanceSummary(string $periodStart, string $periodEnd): array
	{
		$employees = EmployeeProfile::with('user')->get();
		$summary = [];
		foreach ($employees as $employee) {
			$records = Attendance::where('employee_id', $employee->id)
				->whereBetween('date', [$periodStart, $periodEnd])
				->get();

			$totalHours = (float) $records->sum('total_hours');
			$lateCount = (int) $records->where('status', 'Late')->count();
			$presentCount = (int) $records->whereIn('status', ['Present', 'Late', 'Holiday (Worked)'])->count();
			$absentCount = (int) $records->where('status', 'Absent')->count();
			$onLeaveCount = (int) $records->where('status', 'On Leave')->count();
			$holidayNoWorkCount = (int) $records->where('status', 'Holiday (No Work)')->count();
			$holidayWorkedHours = (float) $records->where('status', 'Holiday (Worked)')->sum('total_hours');

			$summary[] = [
				'employee_id' => $employee->id,
				'employee_name' => trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
				'period_start' => $periodStart,
				'period_end' => $periodEnd,
				'total_hours' => round($totalHours, 2),
				'present_days' => $presentCount,
				'late_days' => $lateCount,
				'absent_days' => $absentCount,
				'on_leave_days' => $onLeaveCount,
				'holiday_no_work_days' => $holidayNoWorkCount,
				'holiday_worked_hours' => round($holidayWorkedHours, 2),
			];
		}

		return $summary;
	}
}




