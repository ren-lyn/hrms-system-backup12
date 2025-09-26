<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        return response()->json([
            'data' => $user->notifications()->latest()->take(20)->get()->map(function($n) {
                return [
                    'id' => $n->id,
                    'type' => $n->data['type'] ?? null,
                    'title' => $n->data['title'] ?? '',
                    'message' => $n->data['message'] ?? '',
                    'leave_id' => $n->data['leave_id'] ?? null,
                    'status' => $n->data['status'] ?? null,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ];
            })
        ]);
    }

    public function markAsRead($id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $notification = $user->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }
}


