<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeaveRequest;

class LeaveRequestController extends Controller
{
    public function index() {
        return LeaveRequest::with(['employee', 'approvedBy'])->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'type' => 'required|string',
            'terms' => 'required|in:with PAY,without PAY',
            'leave_category' => 'nullable|in:Service Incentive Leave (SIL),Emergency Leave (EL)',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'total_days' => 'nullable|integer|min:1',
            'total_hours' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048'
        ]);

        $leaveRequest = new LeaveRequest();
        $leaveRequest->employee_id = auth()->id();
        $leaveRequest->company = $validated['company'] ?? null;
        $leaveRequest->department = $validated['department'] ?? null;
        $leaveRequest->type = $validated['type'];
        $leaveRequest->terms = $validated['terms'];
        $leaveRequest->leave_category = $validated['leave_category'] ?? null;
        $leaveRequest->from = $validated['from'];
        $leaveRequest->to = $validated['to'];
        $leaveRequest->total_days = $validated['total_days'] ?? null;
        $leaveRequest->total_hours = $validated['total_hours'] ?? null;
        $leaveRequest->date_filed = now();
        $leaveRequest->reason = $validated['reason'] ?? null;
        $leaveRequest->status = 'pending';

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('leave_attachments', $fileName, 'public');
            $leaveRequest->attachment = $filePath;
        }

        $leaveRequest->save();

        return response()->json([
            'message' => 'Leave request submitted successfully',
            'data' => $leaveRequest->load('employee')
        ], 201);
    }

    public function show($id) {
        return LeaveRequest::with(['employee', 'approvedBy'])->findOrFail($id);
    }

    public function approve(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        $leave->status = 'approved';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = auth()->id();
        $leave->approved_at = now();
        $leave->rejected_at = null;
        $leave->save();

        return response()->json([
            'message' => 'Leave request approved successfully',
            'data' => $leave->load(['employee', 'approvedBy'])
        ]);
    }

    public function reject(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        $leave->status = 'rejected';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = auth()->id();
        $leave->rejected_at = now();
        $leave->approved_at = null;
        $leave->save();

        return response()->json([
            'message' => 'Leave request rejected',
            'data' => $leave->load(['employee', 'approvedBy'])
        ]);
    }

    public function getStats()
    {
        $stats = [
            'requested' => LeaveRequest::count(),
            'approved' => LeaveRequest::where('status', 'approved')->count(),
            'rejected' => LeaveRequest::where('status', 'rejected')->count(),
            'pending' => LeaveRequest::where('status', 'pending')->count(),
        ];

        $typeStats = LeaveRequest::selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->get()
            ->pluck('count', 'type')
            ->toArray();

        return response()->json([
            'approval_stats' => $stats,
            'type_stats' => $typeStats
        ]);
    }

    public function export(Request $request) {
        $type = $request->get('type', 'csv');
        $leaves = LeaveRequest::with('user')->get();

        if ($type === 'csv') {
            $csv = "Employee,Leave Type,Start Date,End Date,Status\n";
            foreach ($leaves as $leave) {
                $csv .= "{$leave->user->name},{$leave->leave_type},{$leave->start_date},{$leave->end_date},{$leave->status}\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename=leaves.csv');
        }

        

        // You can integrate PDF generation here (e.g. DOMPDF or Snappy)
    }
}