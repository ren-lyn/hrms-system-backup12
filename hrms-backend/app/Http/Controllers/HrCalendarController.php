<?php

namespace App\Http\Controllers;

use App\Models\HrCalendarEvent;
use App\Models\CalendarEventInvitation;
use App\Models\User;
use App\Notifications\MeetingInvitation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class HrCalendarController extends Controller
{
    /**
     * Display a listing of HR calendar events.
     */
    public function index(Request $request)
    {
        $query = HrCalendarEvent::with(['creator', 'invitedEmployees']);

        // Filter by date range if provided
        if ($request->has('start_date') && $request->has('end_date')) {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            
            $query->whereBetween('start_datetime', [$startDate, $endDate]);
        } elseif ($request->has('date')) {
            // Filter by specific date
            $date = Carbon::parse($request->date);
            $query->whereDate('start_datetime', $date);
        } else {
            // Default: show events for the next 30 days
            $query->whereBetween('start_datetime', [now(), now()->addDays(30)]);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by event type
        if ($request->has('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        $events = $query->orderBy('start_datetime')->get();

        return response()->json([
            'success' => true,
            'data' => $events->map(function($event) {
                return $event->toApiFormat();
            }),
            'total' => $events->count()
        ]);
    }

    /**
     * Store a newly created HR calendar event.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'required|date|after_or_equal:now',
            'end_datetime' => 'required|date|after:start_datetime',
            'event_type' => 'required|in:meeting,training,interview,break,unavailable,other',
            'blocks_leave_submissions' => 'boolean',
            'invited_employees' => 'nullable|array',
            'invited_employees.*' => 'exists:users,id'
        ]);

        $validated['created_by'] = Auth::id();
        $validated['blocks_leave_submissions'] = $request->get('blocks_leave_submissions', true);

        // Convert datetime to UTC before storing
        $validated['start_datetime'] = Carbon::parse($validated['start_datetime'])->setTimezone('UTC');
        $validated['end_datetime'] = Carbon::parse($validated['end_datetime'])->setTimezone('UTC');

        // Create the event
        $event = HrCalendarEvent::create($validated);

        // Handle employee invitations
        $invitedEmployees = $request->get('invited_employees', []);
        if (!empty($invitedEmployees)) {
            foreach ($invitedEmployees as $employeeId) {
                CalendarEventInvitation::create([
                    'event_id' => $event->id,
                    'employee_id' => $employeeId,
                    'status' => 'pending'
                ]);

                // Send notification to the employee
                $employee = User::find($employeeId);
                if ($employee) {
                    $employee->notify(new MeetingInvitation($event));
                }
            }
        }

        // Load the event with relationships for response
        $event->load(['creator', 'invitedEmployees']);

        // Check for overlaps and warn (but don't prevent creation)
        if ($event->hasOverlap()) {
            return response()->json([
                'success' => true,
                'data' => $event->toApiFormat(),
                'warning' => 'This event overlaps with existing events.',
                'message' => 'Event created successfully, but it overlaps with other scheduled events.'
            ], 201);
        }

        return response()->json([
            'success' => true,
            'data' => $event->toApiFormat(),
            'message' => 'HR calendar event created successfully.'
        ], 201);
    }

    /**
     * Display the specified HR calendar event.
     */
    public function show($id)
    {
        $event = HrCalendarEvent::with('creator')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $event->toApiFormat()
        ]);
    }

    /**
     * Update the specified HR calendar event.
     */
    public function update(Request $request, $id)
    {
        $event = HrCalendarEvent::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_datetime' => 'sometimes|required|date',
            'end_datetime' => 'sometimes|required|date|after:start_datetime',
            'event_type' => 'sometimes|required|in:meeting,training,interview,break,unavailable,other',
            'status' => 'sometimes|required|in:active,cancelled,completed',
            'blocks_leave_submissions' => 'boolean'
        ]);

        // Convert datetime to UTC before storing if provided
        if (isset($validated['start_datetime'])) {
            $validated['start_datetime'] = Carbon::parse($validated['start_datetime'])->setTimezone('UTC');
        }
        if (isset($validated['end_datetime'])) {
            $validated['end_datetime'] = Carbon::parse($validated['end_datetime'])->setTimezone('UTC');
        }

        // Validate that end_datetime is after start_datetime
        if (isset($validated['start_datetime']) && isset($validated['end_datetime'])) {
            if (Carbon::parse($validated['end_datetime'])->lte(Carbon::parse($validated['start_datetime']))) {
                throw ValidationException::withMessages([
                    'end_datetime' => 'End time must be after start time.'
                ]);
            }
        }

        $event->update($validated);

        return response()->json([
            'success' => true,
            'data' => $event->fresh()->toApiFormat(),
            'message' => 'HR calendar event updated successfully.'
        ]);
    }

    /**
     * Remove the specified HR calendar event.
     */
    public function destroy($id)
    {
        $event = HrCalendarEvent::findOrFail($id);
        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'HR calendar event deleted successfully.'
        ]);
    }

    /**
     * Get today's HR calendar events.
     */
    public function todaysEvents()
    {
        $events = HrCalendarEvent::getTodaysEvents();

        return response()->json([
            'success' => true,
            'data' => $events->map(function($event) {
                return $event->toApiFormat();
            }),
            'total' => $events->count()
        ]);
    }

    /**
     * Check if HR is currently in a meeting (for leave submission blocking).
     */
    public function checkHrAvailability()
    {
        $blockingStatus = HrCalendarEvent::hasActiveBlockingEvent();

        return response()->json([
            'success' => true,
            'available' => !$blockingStatus['blocked'],
            'blocked' => $blockingStatus['blocked'],
            'message' => $blockingStatus['message'],
            'end_time' => $blockingStatus['end_time'] ?? null,
            'end_datetime' => $blockingStatus['end_datetime'] ?? null
        ]);
    }

    /**
     * Get upcoming events for the next 7 days.
     */
    public function upcomingEvents()
    {
        $events = HrCalendarEvent::active()
                    ->whereBetween('start_datetime', [now(), now()->addDays(7)])
                    ->orderBy('start_datetime')
                    ->get();

        return response()->json([
            'success' => true,
            'data' => $events->map(function($event) {
                return $event->toApiFormat();
            }),
            'total' => $events->count()
        ]);
    }

    /**
     * Cancel an event (soft delete - mark as cancelled).
     */
    public function cancel($id)
    {
        $event = HrCalendarEvent::findOrFail($id);
        $event->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'data' => $event->fresh()->toApiFormat(),
            'message' => 'HR calendar event cancelled successfully.'
        ]);
    }

    /**
     * Complete an event (mark as completed).
     */
    public function complete($id)
    {
        $event = HrCalendarEvent::findOrFail($id);
        $event->update(['status' => 'completed']);

        return response()->json([
            'success' => true,
            'data' => $event->fresh()->toApiFormat(),
            'message' => 'HR calendar event marked as completed.'
        ]);
    }

    /**
     * Get employee's personal calendar events (invited events + public events).
     */
    public function employeeCalendar(Request $request)
    {
        $user = Auth::user();
        
        $query = HrCalendarEvent::with(['creator', 'invitedEmployees'])
            ->where(function($q) use ($user) {
                // Events where user is invited
                $q->whereHas('invitations', function($invitationQuery) use ($user) {
                    $invitationQuery->where('employee_id', $user->id);
                })
                // OR public events (no specific invitations)
                ->orWhereDoesntHave('invitations');
            });

        // Filter by date range if provided
        if ($request->has('start_date') && $request->has('end_date')) {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            
            $query->whereBetween('start_datetime', [$startDate, $endDate]);
        } elseif ($request->has('date')) {
            // Filter by specific date
            $date = Carbon::parse($request->date);
            $query->whereDate('start_datetime', $date);
        } else {
            // Default: show events for the next 30 days
            $query->whereBetween('start_datetime', [now(), now()->addDays(30)]);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $events = $query->orderBy('start_datetime')->get();

        return response()->json([
            'success' => true,
            'data' => $events->map(function($event) use ($user) {
                $eventData = $event->toApiFormat();
                
                // Add user's invitation status if they were invited
                $invitation = $event->invitations()->where('employee_id', $user->id)->first();
                if ($invitation) {
                    $eventData['my_invitation_status'] = $invitation->status;
                    $eventData['my_responded_at'] = $invitation->responded_at;
                } else {
                    $eventData['my_invitation_status'] = null;
                    $eventData['my_responded_at'] = null;
                }
                
                return $eventData;
            }),
            'total' => $events->count()
        ]);
    }

    /**
     * Respond to a meeting invitation.
     */
    public function respondToInvitation(Request $request, $eventId)
    {
        $user = Auth::user();
        
        $invitation = CalendarEventInvitation::where('event_id', $eventId)
            ->where('employee_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:accepted,declined'
        ]);

        $invitation->update([
            'status' => $validated['status'],
            'responded_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invitation response recorded successfully.',
            'data' => [
                'event_id' => $eventId,
                'status' => $validated['status'],
                'responded_at' => $invitation->responded_at
            ]
        ]);
    }

    /**
     * Get all employees for invitation selection.
     */
    public function getEmployees()
    {
        $employees = User::with('employeeProfile')
            ->whereHas('role', function($query) {
                $query->whereIn('name', ['Employee', 'Manager', 'HR Staff', 'HR Assistant']);
            })
            ->whereHas('employeeProfile') // Only include users with employee profiles
            ->select('id', 'first_name', 'last_name', 'email')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->employeeProfile ? $user->employeeProfile->position : null
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }
}
