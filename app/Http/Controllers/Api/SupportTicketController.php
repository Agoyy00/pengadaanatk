<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SupportTicketController extends Controller
{
    /**
     * GET /api/support-tickets
     * List tickets based on active role & target role
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $activeRole = strtolower($request->header('X-Active-Role', ''));

        if (! $activeRole) {
            if ($user->isSuperAdmin()) {
                $activeRole = 'superadmin';
            } elseif ($user->isAdmin()) {
                $activeRole = 'admin';
            } else {
                $activeRole = 'user';
            }
        }

        $query = SupportTicket::with(['user', 'replies.user'])
            ->orderBy('created_at', 'desc');

        if ($activeRole === 'superadmin' || $activeRole === 'admin') {
            // Admin and Superadmin see all tickets
        } else {
            $query->where('user_id', $user->id);
        }

        $tickets = $query->get()->map(function ($ticket) use ($user) {
            $notifCount = Notification::where('ticket_id', $ticket->id)
                ->where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            $ticket->unread_count = $notifCount;

            return $ticket;
        });

        return response()->json([
            'success' => true,
            'tickets' => $tickets,
        ]);
    }

    /**
     * POST /api/support-tickets
     * Create new ticket with target_role
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

        // Untuk tiket baru: notifikasi ke semua admin (role_id 1 dan 2)
        $targetUsers = \App\Models\User::whereIn('role_id', [1, 2])
            ->where('id', '!=', Auth::id())
            ->get();

        foreach ($targetUsers as $targetUser) {
            Notification::create([
                'user_id' => $targetUser->id,
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
     * Get ticket detail with replies & auto mark unread notifications as read for current user
     */
    public function show(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::with(['user', 'replies.user'])->findOrFail($id);

        if (! $user->isAdmin() && ! $user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $activeRole = strtolower($request->header('X-Active-Role', ''));
        $isViewingAsAdmin = $activeRole === 'admin' || $activeRole === 'superadmin';

        if (! $isViewingAsAdmin && ! $request->hasHeader('X-Active-Role')) {
            $isViewingAsAdmin = $user->isAdmin() || $user->isSuperAdmin();
        }

        // Auto mark unread notifications for this ticket & user as read when opening
        Notification::where('user_id', $user->id)
            ->where('ticket_id', $ticket->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        // Auto mark initial ticket message as read if viewed by recipient (non-author)
        if ($ticket->user_id !== $user->id && ! $ticket->is_read) {
            $ticket->is_read = true;
            $ticket->save();
        }

        // Auto mark all replies from other users in this ticket as read when opened
        SupportTicketReply::where('ticket_id', $ticket->id)
            ->where('user_id', '!=', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        // Re-load ticket with updated replies
        $ticket = SupportTicket::with(['user', 'replies.user'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'ticket' => $ticket,
        ]);
    }

    /**
     * PATCH /api/support-tickets/{id}/status
     * Update ticket status manually
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        if (! $user->isAdmin() && ! $user->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:open,process,complete',
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
                'process' => 'Sedang Diproses',
                'complete' => 'Selesai',
            ];

            // Notifikasi ke semua partisipan tiket kecuali yang update
            $participantIds = $this->getTicketParticipantIds($ticket, $user->id);
            foreach ($participantIds as $participantId) {
                Notification::create([
                    'user_id' => $participantId,
                    'ticket_id' => $ticket->id,
                    'title' => 'Status Tiket Support Diperbarui',
                    'message' => "Tiket '{$ticket->subject}' telah diubah ke status: ".($statusLabels[$validated['status']] ?? $validated['status']),
                    'pengajuan_id' => null,
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status ticket berhasil diperbarui.',
            'ticket' => $ticket,
        ]);
    }

    /**
     * POST /api/support-tickets/{id}/reply
     * Add reply to ticket. Automatically resets status to 'open' if not process/complete.
     * Notifications sent to ALL participants of the ticket EXCEPT the sender.
     */
    public function reply(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::findOrFail($id);

        if (! $user->isAdmin() && ! $user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $activeRole = strtolower($request->header('X-Active-Role', ''));
        $isViewingAsAdmin = $activeRole === 'admin' || $activeRole === 'superadmin';

        if (! $isViewingAsAdmin && ! $request->hasHeader('X-Active-Role')) {
            $isViewingAsAdmin = $user->isAdmin() || $user->isSuperAdmin();
        }

        $reply = SupportTicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
            'sender_type' => $isViewingAsAdmin ? 'admin' : 'user',
        ]);

        // If ticket status is not yet 'process' and not 'complete', set status back to 'open'
        if ($ticket->status !== 'process' && $ticket->status !== 'complete') {
            $ticket->status = 'open';
            $ticket->save();
        }

        // Kirim notifikasi ke SEMUA partisipan tiket KECUALI pengirim
        // Partisipan = pembuat tiket + semua user yang pernah reply
        $participantIds = $this->getTicketParticipantIds($ticket, $user->id);

        $notifTitle = $isViewingAsAdmin
            ? 'Balasan Baru di Tiket Support'
            : 'Balasan Baru di Tiket Support';

        $notifMessage = $isViewingAsAdmin
            ? "Ada balasan baru dari tim support untuk tiket '{$ticket->subject}'."
            : "User {$user->name} mengirim balasan baru pada tiket '{$ticket->subject}'.";

        foreach ($participantIds as $participantId) {
            Notification::create([
                'user_id' => $participantId,
                'ticket_id' => $ticket->id,
                'title' => $notifTitle,
                'message' => $notifMessage,
                'pengajuan_id' => null,
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Balasan berhasil dikirim.',
            'reply' => $reply->load('user'),
        ], 201);
    }

    /**
     * Helper: get all participant user IDs for a ticket, excluding a specific user.
     * Participants = ticket creator + all unique reply authors + target admins/superadmins.
     */
    private function getTicketParticipantIds(SupportTicket $ticket, int $excludeUserId): array
    {
        // Ambil pembuat tiket
        $participantIds = collect([$ticket->user_id]);

        // Ambil semua user_id yang pernah reply di tiket ini
        $replyUserIds = SupportTicketReply::where('ticket_id', $ticket->id)
            ->pluck('user_id');

        $participantIds = $participantIds->merge($replyUserIds);

        // Tambahkan semua admin dan superadmin ke daftar partisipan yang diberitahu
        $targetRoleUserIds = \App\Models\User::whereIn('role_id', [1, 2])->pluck('id');

        $participantIds = $participantIds->merge($targetRoleUserIds)
            ->unique()
            ->reject(function ($id) use ($excludeUserId) {
                return (int) $id === (int) $excludeUserId;
            })
            ->values()
            ->toArray();

        return $participantIds;
    }

    /**
     * GET /api/support-tickets/unread-count
     * Get count of unread support notifications for current user
     */
    public function unreadCount(Request $request)
    {
        $user = Auth::user();

        $count = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->whereNotNull('ticket_id')
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    /**
     * GET /api/support-tickets/unread-counts
     * Get grouped unread support notifications per ticket for current user
     */
    public function unreadCounts(Request $request)
    {
        $user = Auth::user();

        $groups = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->whereNotNull('ticket_id')
            ->select('ticket_id')
            ->selectRaw('COUNT(*) as count, MAX(created_at) as last_at')
            ->groupBy('ticket_id')
            ->get()
            ->map(function ($row) {
                $ticket = SupportTicket::find($row->ticket_id);

                return [
                    'ticket_id' => $row->ticket_id,
                    'subject' => $ticket ? $ticket->subject : 'Tiket Dihapus',
                    'count' => $row->count,
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
     * Mark all support notifications for a specific ticket as read for current user
     */
    public function markTicketAsRead(Request $request, $id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::findOrFail($id);

        if (! ($user->isAdmin() || $user->isSuperAdmin()) && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        Notification::where('ticket_id', $ticket->id)
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

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

        if (! $user->isAdmin() && ! $user->isSuperAdmin() && $ticket->user_id !== $user->id) {
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
