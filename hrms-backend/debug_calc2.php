<?php

require __DIR__.'/vendor/autoload.php';

use Carbon\Carbon;

echo "Testing Carbon diffInMinutes\n";
echo "============================\n\n";

$clockIn = Carbon::parse('2025-10-31 07:16:25');
$clockOut = Carbon::parse('2025-10-31 12:58:14');

echo "Clock In: " . $clockIn->format('Y-m-d H:i:s') . "\n";
echo "Clock Out: " . $clockOut->format('Y-m-d H:i:s') . "\n";
echo "\n";

$diff1 = $clockIn->diffInMinutes($clockOut);
$diff2 = $clockOut->diffInMinutes($clockIn);
$diff3 = $clockIn->diffInMinutes($clockOut, false); // signed
$diff4 = $clockOut->diffInMinutes($clockIn, false); // signed

echo "clockIn->diffInMinutes(clockOut): " . $diff1 . "\n";
echo "clockOut->diffInMinutes(clockIn): " . $diff2 . "\n";
echo "clockIn->diffInMinutes(clockOut, false): " . $diff3 . "\n";
echo "clockOut->diffInMinutes(clockIn, false): " . $diff4 . "\n";
