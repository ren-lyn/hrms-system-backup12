<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordChangeRequest;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PasswordChangeRequestController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required_without:email|string|max:255',
            'employee_id' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'reason' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payload = $validator->validated();
        $user = $request->user();

        $data = [
            'user_id' => $user?->id,
            'full_name' => $payload['full_name'],
            'employee_id' => $payload['employee_id'] ?? null,
            'department' => $payload['department'] ?? null,
            'email' => $payload['email'] ?? ($user?->email),
            'reason' => $payload['reason'] ?? null,
            'status' => 'pending',
        ];

        // Handle up to 2 image uploads
        $paths = [];
        foreach (['id_photo_1','id_photo_2'] as $idx => $key) {
            if ($request->hasFile($key) && $request->file($key)->isValid()) {
                $paths[$key] = $request->file($key)->store('password_requests', 'public');
            }
        }
        if (isset($paths['id_photo_1'])) $data['id_photo_1_path'] = $paths['id_photo_1'];
        if (isset($paths['id_photo_2'])) $data['id_photo_2_path'] = $paths['id_photo_2'];

        // Always write an audit log first so alerts can be generated even if DB create fails
        AuditLog::log($user?->id, 'Password change request submitted', 'success', $request->ip(), $request->userAgent(), [
            'email' => $data['email'] ?? null,
            'full_name' => $data['full_name'] ?? null,
            'department' => $data['department'] ?? null,
        ]);

        try {
            $requestModel = PasswordChangeRequest::create($data);
            return response()->json(['message' => 'Password change request submitted', 'id' => $requestModel->id, 'saved' => true], 201);
        } catch (\Throwable $e) {
            // Graceful fallback when table is missing or any other storage error occurs
            return response()->json(['message' => 'Password change request submitted', 'saved' => false], 201);
        }
    }

    public function index()
    {
        $items = PasswordChangeRequest::latest()->limit(50)->get();
        return response()->json($items);
    }

    public function approve($id)
    {
        $req = PasswordChangeRequest::findOrFail($id);
        $req->status = 'approved';
        $req->save();
        AuditLog::log(auth()->id(), 'Password change request approved', 'success', request()->ip(), request()->userAgent(), [
            'id' => $req->id,
            'email' => $req->email,
        ]);
        return response()->json(['message' => 'Request approved']);
    }

    public function reject($id)
    {
        $req = PasswordChangeRequest::findOrFail($id);
        $req->status = 'rejected';
        $req->save();
        AuditLog::log(auth()->id(), 'Password change request rejected', 'success', request()->ip(), request()->userAgent(), [
            'id' => $req->id,
            'email' => $req->email,
        ]);
        return response()->json(['message' => 'Request rejected']);
    }
}


