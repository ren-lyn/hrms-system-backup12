<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\PayrollComputationService;

class PayrollController extends Controller
{
	public function attendanceSummary(Request $request, PayrollComputationService $service): JsonResponse
	{
		$validated = $request->validate([
			'period_start' => 'required|date',
			'period_end' => 'required|date|after_or_equal:period_start',
		]);
		$data = $service->getAttendanceSummary($validated['period_start'], $validated['period_end']);
		return response()->json(['success' => true, 'data' => $data]);
	}
}




