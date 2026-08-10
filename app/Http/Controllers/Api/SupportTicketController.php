<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
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
    public function show($id)
    {
        $user = Auth::user();
        $ticket = SupportTicket::with(['user', 'replies.user'])->findOrFail($id);

        if (!$user->isAdmin() && !$user->isSuperAdmin() && $ticket->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
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
            'status' => 'required|in:open,read,processing,completed',
            'admin_message' => 'nullable|string',
        ]);

        $ticket = SupportTicket::findOrFail($id);
        $ticket->status = $validated['status'];

        if (isset($validated['admin_message'])) {
            $ticket->admin_message = $validated['admin_message'];
        }

        $ticket->save();

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

        $reply = SupportTicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
            'sender_type' => $user->isAdmin() || $user->isSuperAdmin() ? 'admin' : 'user',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Balasan berhasil dikirim.',
            'reply' => $reply->load('user'),
        ], 201);
    }
}
