<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'status',
        'ip_address',
        'user_agent',
        'details'
    ];

    protected $casts = [
        'details' => 'array'
    ];

    public static function log($userId, $action, $status, $ipAddress, $userAgent = null, $details = null)
    {
        return self::create([
            'user_id' => $userId,
            'action' => $action,
            'status' => $status,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'details' => $details
        ]);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
