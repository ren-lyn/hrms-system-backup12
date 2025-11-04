<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class HolidayController extends Controller
{
	public function index(Request $request): JsonResponse
	{
		$query = Holiday::query();
		if ($request->filled('from') && $request->filled('to')) {
			// Use >= and <= to ensure the range is inclusive of both start and end dates
			$query->where('date', '>=', $request->get('from'))
			      ->where('date', '<=', $request->get('to'));
		}
		$holidays = $query->orderBy('date')->get()->map(function ($holiday) {
			return [
				'id' => $holiday->id,
				'name' => $holiday->name,
				'date' => $holiday->date->format('Y-m-d'), // Ensure date is formatted as Y-m-d string
				'type' => $holiday->type,
				'is_movable' => $holiday->is_movable,
				'moved_date' => $holiday->moved_date ? $holiday->moved_date->format('Y-m-d') : null,
				'is_working_day' => $holiday->is_working_day,
			];
		});
		return response()->json(['success' => true, 'data' => $holidays]);
	}

	public function store(Request $request): JsonResponse
	{
		$validated = $request->validate([
			'name' => 'required|string|max:255',
			'date' => 'required|date',
			'type' => 'required|in:Regular,Special',
			'is_movable' => 'boolean',
			'moved_date' => 'nullable|date',
			'is_working_day' => 'boolean',
		]);
		$holiday = Holiday::create($validated);
		return response()->json(['success' => true, 'data' => $holiday], 201);
	}

	public function update(Request $request, $id): JsonResponse
	{
		$holiday = Holiday::findOrFail($id);
		$validated = $request->validate([
			'name' => 'sometimes|string|max:255',
			'date' => 'sometimes|date',
			'type' => 'sometimes|in:Regular,Special',
			'is_movable' => 'sometimes|boolean',
			'moved_date' => 'nullable|date',
			'is_working_day' => 'sometimes|boolean',
		]);
		$holiday->update($validated);
		return response()->json(['success' => true, 'data' => $holiday]);
	}

	public function destroy($id): JsonResponse
	{
		$holiday = Holiday::findOrFail($id);
		$holiday->delete();
		return response()->json(['success' => true]);
	}

    /**
     * Fetch public holidays from Google Calendar within a date range.
     * Returns a lightweight array formatted to blend into the existing
     * calendar UI without modifying current event logic.
     */
    public function google(Request $request): JsonResponse
    {
        $apiKey = config('services.google.api_key', env('GOOGLE_API_KEY'));
        $calendarId = config('services.google.holidays_calendar_id', env('GOOGLE_HOLIDAY_CALENDAR_ID'));

        // Fail-safe: if not configured, return empty list to avoid breaking UI
        if (empty($apiKey) || empty($calendarId)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Parse dates; default to current month range
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        $startDate = $start ? Carbon::parse($start)->startOfDay() : Carbon::now()->startOfMonth();
        $endDate = $end ? Carbon::parse($end)->endOfDay() : Carbon::now()->endOfMonth();

        $cacheKey = sprintf('google_holidays:%s:%s', $startDate->toDateString(), $endDate->toDateString());

        $events = Cache::remember($cacheKey, now()->addHours(12), function () use ($apiKey, $calendarId, $startDate, $endDate) {
            $url = sprintf('https://www.googleapis.com/calendar/v3/calendars/%s/events', urlencode($calendarId));
            $params = [
                'key' => $apiKey,
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'maxResults' => 250,
                'timeMin' => $startDate->toIso8601String(),
                'timeMax' => $endDate->toIso8601String(),
            ];

            $response = Http::get($url, $params);
            if (!$response->ok()) {
                return [];
            }

            $items = $response->json('items', []);

            $mapped = [];
            foreach ($items as $item) {
                // Google holiday entries are all-day; use 'date' if present, else fallback
                $startRaw = $item['start']['date'] ?? ($item['start']['dateTime'] ?? null);
                if (!$startRaw) {
                    continue;
                }

                // Normalize to YYYY-MM-DD in Asia/Manila; keep times as "All day"
                $startDateStr = strlen($startRaw) === 10 ? $startRaw : Carbon::parse($startRaw)->setTimezone('Asia/Manila')->toDateString();

                $mapped[] = [
                    // Use a stable synthetic id to avoid collisions with local events
                    'id' => 'holiday_' . md5(($item['id'] ?? $item['summary'] ?? '') . '_' . $startDateStr),
                    'title' => ($item['summary'] ?? 'Holiday'),
                    'description' => 'Official Holiday',
                    'event_type' => 'other', // safe color path in UI
                    'status' => 'active',
                    // Start/end datetimes (use all-day convention at 00:00 to 23:59 Manila)
                    'start_datetime' => $startDateStr . 'T00:00:00+08:00',
                    'end_datetime' => $startDateStr . 'T23:59:59+08:00',
                    // Precomputed display helpers expected by UI
                    'start_date_manila' => $startDateStr,
                    'start_time_formatted' => 'All day',
                    'end_time_formatted' => '',
                    'created_by' => 'System',
                    'blocks_leave_submissions' => false,
                ];
            }

            return $mapped;
        });

        return response()->json(['success' => true, 'data' => $events, 'total' => count($events)]);
    }
}




