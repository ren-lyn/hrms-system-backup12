<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule yearly leave archive command to run on January 1st at 12:00 AM
Schedule::command('leave:archive-yearly')
    ->yearly()
    ->at('00:00')
    ->timezone('Asia/Manila'); // Adjust timezone as needed
