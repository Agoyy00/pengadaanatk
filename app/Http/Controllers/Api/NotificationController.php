<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
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
    public function markAsRead(Notification $notification)
    {
        $notification->is_read = true;
        $notification->save();

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sudah dibaca',
        ]);
    }

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
