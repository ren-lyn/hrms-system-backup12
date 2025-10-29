<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/check', function () {
    return response()->json(['status' => 'Web route working']);
});

// Media proxy with CORS for local dev: serves files from storage/app/public/**
Route::get('/media/{path}', function ($path) {
    $relative = trim($path, '/');
    // Normalize and prevent directory traversal
    $relative = str_replace(['..', '\\'], ['', '/'], $relative);
    $fullPath = storage_path('app/public/' . $relative);

    abort_unless(file_exists($fullPath), 404);

    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

    $headers = [
        'Content-Type' => $mime,
        // Allow React dev server to fetch images
        'Access-Control-Allow-Origin' => 'http://localhost:3000',
        'Access-Control-Allow-Credentials' => 'true',
        'Cache-Control' => 'public, max-age=86400',
    ];

    return response()->file($fullPath, $headers);
})->where('path', '.*');
