<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class HrCalendarEvent extends Model
{
    use HasFactory;

    protected $table = 'hr_calendar_events';

    protected $fillable = [
        'title',
        'description',
        'start_datetime',
        'end_datetime',
        'event_type',
        'status',
        'created_by',
        'blocks_leave_submissions'
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'blocks_leave_submissions' => 'boolean'
    ];

    // Relationship with User who created the event
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scope to get active events (ongoing or future)
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                    ->where('end_datetime', '>=', now());
    }

    // Scope to get current ongoing events
    public function scopeOngoing($query)
    {
        $now = now();
        return $query->where('status', 'active')
                    ->where('start_datetime', '<=', $now)
                    ->where('end_datetime', '>=', $now);
    }

    // Check if there's an ongoing HR meeting that blocks leave submissions
    public static function hasActiveBlockingEvent()
    {
        $activeEvent = self::ongoing()
                          ->where('blocks_leave_submissions', true)
                          ->first();
        
        if ($activeEvent) {
            // Convert to Manila timezone for display
            $endTimeManila = $activeEvent->end_datetime->setTimezone('Asia/Manila');
            
            return [
                'blocked' => true,
                'event' => $activeEvent,
                'message' => 'Juan Dela Cruz is still in the meeting, just try again after ' . $endTimeManila->format('h:i A'),
                'end_time' => $endTimeManila->format('h:i A'),
                'end_datetime' => $activeEvent->end_datetime
            ];
        }

        return [
            'blocked' => false,
            'message' => null
        ];
    }

    // Get upcoming events for today
    public static function getTodaysEvents()
    {
        return self::active()
                  ->whereDate('start_datetime', today())
                  ->orderBy('start_datetime')
                  ->get();
    }

    // Check if event overlaps with existing events
    public function hasOverlap()
    {
        return self::where('id', '!=', $this->id ?? 0)
                  ->where('status', 'active')
                  ->where(function($query) {
                      $query->whereBetween('start_datetime', [$this->start_datetime, $this->end_datetime])
                           ->orWhereBetween('end_datetime', [$this->start_datetime, $this->end_datetime])
                           ->orWhere(function($q) {
                               $q->where('start_datetime', '<=', $this->start_datetime)
                                ->where('end_datetime', '>=', $this->end_datetime);
                           });
                  })
                  ->exists();
    }

    // Format event for API response
    public function toApiFormat()
    {
        // Convert UTC times to Asia/Manila timezone for display
        $startTimeManila = $this->start_datetime->setTimezone('Asia/Manila');
        $endTimeManila = $this->end_datetime->setTimezone('Asia/Manila');
        
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'start_datetime' => $this->start_datetime->toISOString(),
            'end_datetime' => $this->end_datetime->toISOString(),
            'start_time_formatted' => $startTimeManila->format('g:i A'),
            'end_time_formatted' => $endTimeManila->format('g:i A'),
            'date_formatted' => $startTimeManila->format('M j, Y'),
            'event_type' => $this->event_type,
            'status' => $this->status,
            'blocks_leave_submissions' => $this->blocks_leave_submissions,
            'is_ongoing' => $this->start_datetime <= now() && $this->end_datetime >= now(),
            'created_by' => $this->creator ? $this->creator->name : 'System',
            'created_at' => $this->created_at->toISOString(),
            // Add Manila timezone formatted times for frontend
            // Use ISO8601 with timezone offset (e.g., +08:00) so JS respects Asia/Manila
            'start_datetime_manila' => $startTimeManila->format(DATE_ATOM), // Y-m-dTH:i:s+08:00
            'end_datetime_manila' => $endTimeManila->format(DATE_ATOM),
            // Precomputed Manila date to avoid off-by-one issues on client
            'start_date_manila' => $startTimeManila->format('Y-m-d'),
            'start_time_manila' => $startTimeManila->format('H:i'),
            'end_time_manila' => $endTimeManila->format('H:i')
        ];
    }
}
