<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NotificationStreamController extends Controller
{
    public function stream(Request $request)
    {
        // Authenticate via Bearer token or token query param
        $user = $request->user();
        if (!$user) {
            $token = $request->query('token');
            if ($token) {
                $accessToken = PersonalAccessToken::findToken($token);
                if ($accessToken) {
                    $user = $accessToken->tokenable;
                    // Set the authenticated user for this request
                    auth()->setUser($user);
                }
            }
        }

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $lastId = $request->query('last_id');

        $response = new StreamedResponse(function () use ($user, $lastId) {
            @ob_end_clean();
            set_time_limit(0);
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');

            $sinceId = $lastId;
            $start = time();

            while (true) {
                // Break after 120 seconds, client will reconnect
                if (time() - $start > 120) {
                    echo ": ping\n\n";
                    flush();
                    break;
                }

                $query = $user->notifications()->latest();
                if ($sinceId) {
                    $query->where('id', '>', $sinceId);
                }

                $new = $query->take(5)->get();
                if ($new->count() > 0) {
                    foreach ($new as $n) {
                        $payload = [
                            'id' => $n->id,
                            'type' => $n->data['type'] ?? null,
                            'title' => $n->data['title'] ?? '',
                            'message' => $n->data['message'] ?? '',
                            'leave_id' => $n->data['leave_id'] ?? null,
                            'evaluation_id' => $n->data['evaluation_id'] ?? null,
                            'redirect_url' => $n->data['redirect_url'] ?? null,
                            'status' => $n->data['status'] ?? null,
                            'read_at' => $n->read_at,
                            'created_at' => $n->created_at,
                        ];
                        echo 'event: notification' . "\n";
                        echo 'data: ' . json_encode($payload) . "\n\n";
                        $sinceId = $n->id; // advance
                    }
                    flush();
                }

                sleep(2);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        return $response;
    }
}


