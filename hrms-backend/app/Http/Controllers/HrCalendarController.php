<?php

namespace App\Http\Controllers;

use App\Models\HrCalendarEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class HrCalendarController extends Controller
{
    /**
     * Display a listing of HR calendar events.
     */
    public function index(Request $request)
    {
        $query = HrCalendarEvent::with('creator');

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
            'blocks_leave_submissions' => 'boolean'
        ]);

        $validated['created_by'] = Auth::id();
        $validated['blocks_leave_submissions'] = $request->get('blocks_leave_submissions', true);

        // Convert datetime to UTC before storing
        $validated['start_datetime'] = Carbon::parse($validated['start_datetime'])->setTimezone('UTC');
        $validated['end_datetime'] = Carbon::parse($validated['end_datetime'])->setTimezone('UTC');

        // Create the event
        $event = HrCalendarEvent::create($validated);

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
}
