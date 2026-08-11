<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SupportTicketController extends Controller
{
    /**
     * GET /api/support-tickets
     * List tickets based on role
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if ($user->isAdmin() || $user->isSuperAdmin()) {
            $tickets = SupportTicket::with(['user', 'replies.user'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            $tickets = SupportTicket::with(['user', 'replies.user'])
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return response()->json([
            'success' => true,
            'tickets' => $tickets,
        ]);
    }

    /**
     * POST /api/support-tickets
     * Create new ticket (user)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'priority' => 'required|in:low,medium,high',
            'message' => 'required|string',
        ]);

        $ticket = SupportTicket::create([
            'user_id' => Auth::id(),
            'subject' => $validated['subject'],
            'priority' => $validated['priority'],
            'message' => $validated['message'],
            'status' => 'open',
        ]);

        $adminUsers = \App\Models\User::whereHas('role', function ($q) {
            $q->whereIn('name', ['admin', 'superadmin']);
        })->get();

        foreach ($adminUsers as $adminUser) {
            Notification::create([
                'user_id' => $adminUser->id,
                'ticket_id' => $ticket->id,
                'title' => 'Tiket Support Baru',
                'message' => "User {$ticket->user->name} membuat tiket support baru: '{$ticket->subject}'.",
                'pengajuan_id' => null,
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ticket berhasil dibuat.',
            'ticket' => $ticket->load('user'),
        ], 201);
    }

    /**
     * GET /api/support-tickets/{id}
     * Get ticket detail with replies
     */
    public function show(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::with(['user', 'replies.user'])->findOrFail($id);

        if (!$user->isAdmin() && !$user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Auto update status to 'read' only when admin/superadmin views another user's ticket
        $activeRole = strtolower($request->header('X-Active-Role', ''));
        $isViewingAsAdmin = $activeRole === 'admin' || $activeRole === 'superadmin';

        if (!$isViewingAsAdmin && !$request->hasHeader('X-Active-Role')) {
            $isViewingAsAdmin = $user->isAdmin() || $user->isSuperAdmin();
        }

        if ($isViewingAsAdmin && $ticket->status === 'open') {
            $ticket->status = 'read';
            $ticket->save();

            Notification::create([
                'user_id' => $ticket->user_id,
                'ticket_id' => $ticket->id,
                'title' => 'Status Tiket Support Diperbarui',
                'message' => "Tiket '{$ticket->subject}' telah diubah ke status: Sedang Dibaca",
                'pengajuan_id' => null,
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'ticket' => $ticket,
        ]);
    }

    /**
     * PATCH /api/support-tickets/{id}/status
     * Update ticket status (admin/superadmin)
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user->isAdmin() && !$user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:open,read,process,complete',
            'admin_message' => 'nullable|string',
        ]);

        $ticket = SupportTicket::findOrFail($id);
        $oldStatus = $ticket->status;
        $ticket->status = $validated['status'];

        if (isset($validated['admin_message'])) {
            $ticket->admin_message = $validated['admin_message'];
        }

        $ticket->save();

        if ($oldStatus !== $validated['status']) {
            $statusLabels = [
                'open' => 'Dibuka',
                'read' => 'Sedang Dibaca',
                'process' => 'Sedang Diproses',
                'complete' => 'Selesai',
            ];

            Notification::create([
                'user_id' => $ticket->user_id,
                'ticket_id' => $ticket->id,
                'title' => 'Status Tiket Support Diperbarui',
                'message' => "Tiket '{$ticket->subject}' telah diubah ke status: " . ($statusLabels[$validated['status']] ?? $validated['status']),
                'pengajuan_id' => null,
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Status ticket berhasil diperbarui.',
            'ticket' => $ticket,
        ]);
    }

    /**
     * POST /api/support-tickets/{id}/reply
     * Add reply to ticket
     */
    public function reply(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::findOrFail($id);

        if (!$user->isAdmin() && !$user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $activeRole = strtolower($request->header('X-Active-Role', ''));
        $isViewingAsAdmin = $activeRole === 'admin' || $activeRole === 'superadmin';

        if (!$isViewingAsAdmin && !$request->hasHeader('X-Active-Role')) {
            $isViewingAsAdmin = $user->isAdmin() || $user->isSuperAdmin();
        }

        $reply = SupportTicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
            'sender_type' => $isViewingAsAdmin ? 'admin' : 'user',
        ]);

        if ($isViewingAsAdmin) {
            // Auto update status to 'process' when admin replies
            if ($ticket->status !== 'complete' && $ticket->status !== 'process') {
                $ticket->status = 'process';
                $ticket->save();

                Notification::create([
                    'user_id' => $ticket->user_id,
                    'ticket_id' => $ticket->id,
                    'title' => 'Status Tiket Support Diperbarui',
                    'message' => "Tiket '{$ticket->subject}' telah diubah ke status: Sedang Diproses",
                    'pengajuan_id' => null,
                    'is_read' => false,
                ]);
            }

            Notification::create([
                'user_id' => $ticket->user_id,
                'ticket_id' => $ticket->id,
                'title' => 'Balasan Baru di Tiket Support',
                'message' => "Ada balasan baru dari tim support untuk tiket '{$ticket->subject}'.",
                'pengajuan_id' => null,
                'is_read' => false,
            ]);
        } else {
            // User replied, notify all admins/superadmins
            $adminUsers = \App\Models\User::whereHas('role', function ($q) {
                $q->whereIn('name', ['admin', 'superadmin']);
            })->get();

            foreach ($adminUsers as $adminUser) {
                Notification::create([
                    'user_id' => $adminUser->id,
                    'ticket_id' => $ticket->id,
                    'title' => 'Balasan Baru di Tiket Support',
                    'message' => "User {$user->name} mengirim balasan baru pada tiket '{$ticket->subject}'.",
                    'pengajuan_id' => null,
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Balasan berhasil dikirim.',
            'reply' => $reply->load('user'),
        ], 201);
    }

    /**
     * GET /api/support-tickets/unread-count
     * Get unread support notifications count for current user
     */
    public function unreadCount(Request $request)
    {
        $user = Auth::user();

        if ($user->isAdmin() || $user->isSuperAdmin()) {
            $count = Notification::where('is_read', false)
                ->where('title', 'like', '%Support%')
                ->count();
        } else {
            $count = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->where('title', 'like', '%Support%')
                ->count();
        }

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    /**
     * GET /api/support-tickets/unread-counts
     * Get grouped unread support notifications per ticket
     */
    public function unreadCounts(Request $request)
    {
        $user = Auth::user();
        $currentPath = $request->path(); // not used but available

        $query = Notification::where('is_read', false)
            ->where('title', 'like', '%Support%')
            ->whereNotNull('ticket_id')
            ->select('ticket_id')
            ->selectRaw('MAX(created_at) as last_at')
            ->groupBy('ticket_id');

        if (!($user->isAdmin() || $user->isSuperAdmin())) {
            $query->where('user_id', $user->id);
        }

        $groups = $query->get()->map(function ($row) {
            $ticket = SupportTicket::find($row->ticket_id);
            return [
                'ticket_id' => $row->ticket_id,
                'subject' => $ticket ? $ticket->subject : 'Tiket Dihapus',
                'count' => Notification::where('ticket_id', $row->ticket_id)
                    ->where('is_read', false)
                    ->where('title', 'like', '%Support%')
                    ->count(),
                'last_at' => $row->last_at,
            ];
        })->sortByDesc('last_at')->values();

        return response()->json([
            'success' => true,
            'groups' => $groups,
            'total' => $groups->sum('count'),
        ]);
    }

    /**
     * PATCH /api/support-tickets/{id}/mark-read
     * Mark all support notifications for a specific ticket as read
     */
    public function markTicketAsRead(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::findOrFail($id);

        if (!($user->isAdmin() || $user->isSuperAdmin()) && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $query = Notification::where('ticket_id', $ticket->id)
            ->where('is_read', false)
            ->where('title', 'like', '%Support%');

        if (!($user->isAdmin() || $user->isSuperAdmin())) {
            $query->where('user_id', $user->id);
        }

        $query->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi tiket berhasil ditandai sudah dibaca.',
        ]);
    }

    /**
     * DELETE /api/support-tickets/{id}
     * Delete ticket
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::findOrFail($id);

        if (!$user->isAdmin() && !$user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $ticket->replies()->delete();
        $ticket->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tiket berhasil dihapus.',
        ]);
    }
}
