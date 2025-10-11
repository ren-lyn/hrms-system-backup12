<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AttendanceImport extends Model
{
    use HasFactory;

    protected $fillable = [
        'filename',
        'period_start',
        'period_end',
        'import_type',
        'total_rows',
        'successful_rows',
        'failed_rows',
        'skipped_rows',
        'errors',
        'status',
        'imported_by',
        'completed_at'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'completed_at' => 'datetime',
        'errors' => 'array'
    ];

    /**
     * Get the user who imported this batch
     */
    public function importer()
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    /**
     * Check if there's an overlapping import for the same period
     */
    public static function hasOverlappingImport($periodStart, $periodEnd, $excludeId = null)
    {
        $query = self::where(function($q) use ($periodStart, $periodEnd) {
            $q->whereBetween('period_start', [$periodStart, $periodEnd])
              ->orWhereBetween('period_end', [$periodStart, $periodEnd])
              ->orWhere(function($q2) use ($periodStart, $periodEnd) {
                  $q2->where('period_start', '<=', $periodStart)
                     ->where('period_end', '>=', $periodEnd);
              });
        })->where('status', '!=', 'failed');

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Get import summary
     */
    public function getSummaryAttribute()
    {
        return [
            'total' => $this->total_rows,
            'successful' => $this->successful_rows,
            'failed' => $this->failed_rows,
            'skipped' => $this->skipped_rows,
            'success_rate' => $this->total_rows > 0 
                ? round(($this->successful_rows / $this->total_rows) * 100, 2) 
                : 0
        ];
    }

    /**
     * Get period description
     */
    public function getPeriodDescriptionAttribute()
    {
        $start = Carbon::parse($this->period_start);
        $end = Carbon::parse($this->period_end);
        
        $days = $start->diffInDays($end) + 1;
        
        if ($days <= 7) {
            return "Week of {$start->format('M d')} - {$end->format('M d, Y')}";
        } elseif ($days <= 31) {
            return "{$start->format('F Y')}";
        } else {
            return "{$start->format('M d, Y')} - {$end->format('M d, Y')}";
        }
    }

    /**
     * Mark import as completed
     */
    public function markAsCompleted()
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);
    }

    /**
     * Mark import as failed
     */
    public function markAsFailed($errors = [])
    {
        // Cap stored errors length/count to fit column limits
        $maxItems = 200;
        $maxLen = 255;
        if (is_array($errors)) {
            $errors = array_map(function($e) use ($maxLen) {
                $s = (string) $e;
                return mb_strlen($s) > $maxLen ? mb_substr($s, 0, $maxLen - 3) . '...' : $s;
            }, array_slice($errors, 0, $maxItems));
        }

        $this->update([
            'status' => 'failed',
            'errors' => $errors,
            'completed_at' => now()
        ]);
    }

    /**
     * Scope for recent imports
     */
    public function scopeRecent($query, $limit = 10)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    /**
     * Scope for successful imports
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for failed imports
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }
}
