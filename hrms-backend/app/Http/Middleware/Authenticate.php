<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        // For API routes, do not redirect to a login route (which may not exist).
        // Always return null so the middleware returns a 401 JSON response.
        return null;
    }
}
