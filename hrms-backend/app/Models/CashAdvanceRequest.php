<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashAdvanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company',
        'name',
        'department',
        'date_field',
        'amount_ca',
        'rem_ca',
        'reason',
        'status',
        'hr_remarks',
        'processed_by',
        'processed_at'
    ];

    protected $casts = [
        'date_field' => 'date',
        'amount_ca' => 'decimal:2',
        'processed_at' => 'datetime'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
