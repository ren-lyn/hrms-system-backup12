<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CalendarEventInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'employee_id',
        'status',
        'responded_at'
    ];

    protected $casts = [
        'responded_at' => 'datetime'
    ];

    // Relationship with HR Calendar Event
    public function event()
    {
        return $this->belongsTo(HrCalendarEvent::class, 'event_id');
    }

    // Relationship with User (Employee)
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    // Scope to get pending invitations
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // Scope to get accepted invitations
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    // Scope to get declined invitations
    public function scopeDeclined($query)
    {
        return $query->where('status', 'declined');
    }

    // Check if invitation is pending
    public function isPending()
    {
        return $this->status === 'pending';
    }

    // Check if invitation is accepted
    public function isAccepted()
    {
        return $this->status === 'accepted';
    }

    // Check if invitation is declined
    public function isDeclined()
    {
        return $this->status === 'declined';
    }

    // Accept the invitation
    public function accept()
    {
        $this->update([
            'status' => 'accepted',
            'responded_at' => now()
        ]);
    }

    // Decline the invitation
    public function decline()
    {
        $this->update([
            'status' => 'declined',
            'responded_at' => now()
        ]);
    }
}