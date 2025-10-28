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
            
            // Set proper headers for SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no'); // Disable nginx buffering
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Headers: Cache-Control');

            $sinceId = $lastId;
            $start = time();
            $lastPing = $start;

            // Send initial connection confirmation
            echo ": SSE connection established\n\n";
            flush();

            while (true) {
                // Break after 60 seconds to prevent long-running connections
                if (time() - $start > 60) {
                    echo ": Connection timeout\n\n";
                    flush();
                    break;
                }

                // Send ping every 30 seconds to keep connection alive
                if (time() - $lastPing > 30) {
                    echo ": ping\n\n";
                    flush();
                    $lastPing = time();
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
                            'action_id' => $n->data['action_id'] ?? null,
                            'disciplinary_action_id' => $n->data['action_id'] ?? null,
                            'cash_advance_id' => $n->data['cash_advance_id'] ?? null,
                            'evaluation_id' => $n->data['evaluation_id'] ?? null,
                            'application_id' => $n->data['application_id'] ?? null,
                            'job_posting_id' => $n->data['job_posting_id'] ?? null,
                            'event_id' => $n->data['event_id'] ?? null,
                            'report_id' => $n->data['report_id'] ?? null,
                            'redirect_url' => $n->data['redirect_url'] ?? null,
                            'status' => $n->data['status'] ?? null,
                            'amount' => $n->data['amount'] ?? null,
                            'collection_date' => $n->data['collection_date'] ?? null,
                            'employee_id' => $n->data['employee_id'] ?? null,
                            'employee_name' => $n->data['employee_name'] ?? null,
                            'department' => $n->data['department'] ?? null,
                            'read_at' => $n->read_at,
                            'created_at' => $n->created_at,
                        ];
                        echo 'event: notification' . "\n";
                        echo 'data: ' . json_encode($payload) . "\n\n";
                        $sinceId = $n->id; // advance
                    }
                    flush();
                }

                // Check for connection issues
                if (connection_aborted()) {
                    break;
                }

                sleep(3); // Increased sleep time to reduce server load
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Headers', 'Cache-Control');
        return $response;
    }
}


