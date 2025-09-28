<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DisciplinaryCategory extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'description',
        'severity_level',
        'suggested_actions',
        'is_active'
    ];
    
    protected $casts = [
        'suggested_actions' => 'array',
        'is_active' => 'boolean'
    ];
    
    // Relationships
    public function disciplinaryReports()
    {
        return $this->hasMany(DisciplinaryReport::class);
    }
    
    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
    
    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity_level', $severity);
    }
}
