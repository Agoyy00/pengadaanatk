<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications?user_id=1
     * Ambil notif milik user (superadmin)
     */
    public function index(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $userId = $request->query('user_id');

        $data = Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'notifications' => $data,
        ]);
    }

    /**
     * PATCH /api/notifications/{notification}/read
     * Tandai 1 notif sudah dibaca
     */
    public function markAsRead(Notification $notification)
    {
        $notification->is_read = true;
        $notification->save();

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sudah dibaca',
        ]);
    }

    /**
     * PATCH /api/notifications/read-all?user_id=1
     * Tandai semua notif milik user menjadi read
     */
    public function markAllAsRead(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $userId = $request->query('user_id');

        Notification::where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Semua notifikasi ditandai sudah dibaca',
        ]);
    }
}
