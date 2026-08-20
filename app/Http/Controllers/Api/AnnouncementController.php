<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnnouncementController extends Controller
{
    /**
     * Helper to verify admin/superadmin access
     */
    private function ensureAdmin($user)
    {
        if (!$user || !in_array($user->role_id, [1, 2])) {
            abort(response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Hanya Admin dan Super Admin yang memiliki hak akses untuk mengelola pengumuman.',
            ], 403));
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN / SUPERADMIN ENDPOINTS
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/announcements
     * Daftar seluruh pengumuman untuk manajemen admin
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $query = Announcement::with(['creator'])
            ->withCount('reads')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%$s%")
                  ->orWhere('body', 'like', "%$s%");
            });
        }

        $announcements = $query->get();

        // Hitung total user aktif untuk rasio keterbacaan
        $totalUsers = User::count();

        return response()->json([
            'success'     => true,
            'data'        => $announcements,
            'total_users' => $totalUsers,
        ]);
    }

    /**
     * POST /api/announcements
     * Buat pengumuman baru (DRAFT atau langsung PUBLISHED)
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'body'         => 'required|string',
            'priority'     => 'required|in:NORMAL,IMPORTANT',
            'status'       => 'required|in:DRAFT,PUBLISHED',
            'target_type'  => 'required|in:ALL,ROLE,SPECIFIC_USERS',
            'target_value' => 'nullable|array',
            'expires_at'   => 'nullable|date',
        ]);

        $publishedAt = null;
        if ($validated['status'] === 'PUBLISHED') {
            $publishedAt = Carbon::now('Asia/Jakarta');
        }

        $announcement = Announcement::create([
            'title'        => $validated['title'],
            'body'         => $validated['body'],
            'priority'     => $validated['priority'],
            'status'       => $validated['status'],
            'target_type'  => $validated['target_type'],
            'target_value' => $validated['target_value'] ?? null,
            'created_by'   => $user->id,
            'published_at' => $publishedAt,
            'expires_at'   => $validated['expires_at'] ? Carbon::parse($validated['expires_at']) : null,
        ]);

        // Audit Log
        DB::table('admin_activity_logs')->insert([
            'user_id'     => $user->id,
            'action'      => 'create_announcement',
            'description' => "Membuat pengumuman \"{$announcement->title}\" (Status: {$announcement->status})",
            'details'     => json_encode($announcement->toArray()),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil dibuat.',
            'data'    => $announcement->load('creator'),
        ], 201);
    }

    /**
     * PUT /api/announcements/{id}
     * Edit pengumuman (Hanya jika berstatus DRAFT)
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $announcement = Announcement::findOrFail($id);

        // Guardrail: Pengumuman yang sudah PUBLISHED tidak boleh diedit isinya
        if ($announcement->status === 'PUBLISHED') {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman yang sudah dipublikasikan (PUBLISHED) tidak dapat diedit untuk menjaga integritas histori pembacaan. Buat pengumuman baru jika ada revisi info.',
            ], 422);
        }

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'body'         => 'required|string',
            'priority'     => 'required|in:NORMAL,IMPORTANT',
            'status'       => 'required|in:DRAFT,PUBLISHED',
            'target_type'  => 'required|in:ALL,ROLE,SPECIFIC_USERS',
            'target_value' => 'nullable|array',
            'expires_at'   => 'nullable|date',
        ]);

        $publishedAt = $announcement->published_at;
        if ($validated['status'] === 'PUBLISHED' && !$publishedAt) {
            $publishedAt = Carbon::now('Asia/Jakarta');
        }

        $announcement->update([
            'title'        => $validated['title'],
            'body'         => $validated['body'],
            'priority'     => $validated['priority'],
            'status'       => $validated['status'],
            'target_type'  => $validated['target_type'],
            'target_value' => $validated['target_value'] ?? null,
            'published_at' => $publishedAt,
            'expires_at'   => $validated['expires_at'] ? Carbon::parse($validated['expires_at']) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil diperbarui.',
            'data'    => $announcement->load('creator'),
        ]);
    }

    /**
     * PATCH /api/announcements/{id}/publish
     * Publikasikan draft pengumuman
     */
    public function publish(Request $request, $id)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $announcement = Announcement::findOrFail($id);
        $announcement->update([
            'status'       => 'PUBLISHED',
            'published_at' => Carbon::now('Asia/Jakarta'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil dipublikasikan dan sekarang dapat dibaca oleh pengguna yang ditargetkan.',
            'data'    => $announcement,
        ]);
    }

    /**
     * DELETE /api/announcements/{id}
     * Soft delete / arsipkan pengumuman
     */
    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        // Audit Log
        DB::table('admin_activity_logs')->insert([
            'user_id'     => $user->id,
            'action'      => 'delete_announcement',
            'description' => "Menghapus/mengarsipkan pengumuman #{$id} ({$announcement->title})",
            'details'     => json_encode(['announcement_id' => $id]),
            'ip_address'  => $request->ip(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil diarsipkan/dihapus.',
        ]);
    }

    /**
     * GET /api/announcements/{id}/read-receipts
     * Lihat daftar siapa saja yang sudah dan belum membaca pengumuman
     */
    public function readReceipts(Request $request, $id)
    {
        $user = Auth::user();
        $this->ensureAdmin($user);

        $announcement = Announcement::with('creator')->findOrFail($id);

        $readers = AnnouncementRead::with('user')
            ->where('announcement_id', $id)
            ->orderBy('read_at', 'desc')
            ->get();

        $readerUserIds = $readers->pluck('user_id')->toArray();

        // Ambil target users yang belum membaca
        $targetQuery = User::whereNotIn('id', $readerUserIds);

        if ($announcement->target_type === 'ROLE' && !empty($announcement->target_value)) {
            $roleNames = (array)$announcement->target_value;
            $targetQuery->whereHas('role', function ($q) use ($roleNames) {
                $q->whereIn('name', $roleNames);
            });
        } elseif ($announcement->target_type === 'SPECIFIC_USERS' && !empty($announcement->target_value)) {
            $targetQuery->whereIn('id', (array)$announcement->target_value);
        }

        $unreadUsers = $targetQuery->select('id', 'name', 'email', 'unit', 'role_id')->get();

        return response()->json([
            'success'      => true,
            'announcement' => $announcement,
            'total_read'   => $readers->count(),
            'total_unread' => $unreadUsers->count(),
            'readers'      => $readers,
            'unread_users' => $unreadUsers,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | USER (READ-ONLY) ENDPOINTS
    |--------------------------------------------------------------------------
    */

    /**
     * Helper to filter announcements targeted for a user
     */
    private function applyUserTargetFilter($query, $user)
    {
        $roleName = strtolower($user->role?->name ?? ($user->role_id === 1 ? 'superadmin' : ($user->role_id === 2 ? 'admin' : 'user')));

        $query->where('status', 'PUBLISHED')
            ->where(function ($q) use ($user, $roleName) {
                $q->where('target_type', 'ALL')
                  ->orWhere(function ($rq) use ($roleName) {
                      $rq->where('target_type', 'ROLE')
                         ->whereJsonContains('target_value', $roleName);
                  })
                  ->orWhere(function ($uq) use ($user) {
                      $uq->where('target_type', 'SPECIFIC_USERS')
                         ->whereJsonContains('target_value', (string)$user->id)
                         ->orWhereJsonContains('target_value', (int)$user->id);
                  });
            });
    }

    /**
     * GET /api/me/announcements
     * Pengumuman aktif yang ditujukan ke user ini
     */
    public function myAnnouncements(Request $request)
    {
        $user = Auth::user();
        $now = Carbon::now('Asia/Jakarta');

        $query = Announcement::with('creator');
        $this->applyUserTargetFilter($query, $user);

        // Hanya yang belum kedaluwarsa
        $query->where(function ($q) use ($now) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>=', $now);
        })->orderBy('published_at', 'desc');

        $announcements = $query->get()->map(function ($ann) use ($user) {
            $ann->is_read = $ann->isReadBy($user->id);
            return $ann;
        });

        return response()->json([
            'success' => true,
            'data'    => $announcements,
        ]);
    }

    /**
     * GET /api/me/announcements/unread-count
     * Jumlah pengumuman aktif yang belum dibaca user
     */
    public function unreadCount(Request $request)
    {
        $user = Auth::user();
        $now = Carbon::now('Asia/Jakarta');

        $query = Announcement::query();
        $this->applyUserTargetFilter($query, $user);

        $query->where(function ($q) use ($now) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>=', $now);
        });

        // Filter unread
        $query->whereDoesntHave('reads', function ($rq) use ($user) {
            $rq->where('user_id', $user->id);
        });

        return response()->json([
            'success'      => true,
            'unread_count' => $query->count(),
        ]);
    }

    /**
     * GET /api/me/announcements/{id}
     * Detail pengumuman + Otomatis tandai sebagai sudah dibaca (read receipt)
     */
    public function show(Request $request, $id)
    {
        $user = Auth::user();
        $announcement = Announcement::with('creator')->findOrFail($id);

        // Otomatis record status baca jika belum ada
        AnnouncementRead::firstOrCreate([
            'announcement_id' => $announcement->id,
            'user_id'         => $user->id,
        ], [
            'read_at' => Carbon::now('Asia/Jakarta'),
        ]);

        $announcement->is_read = true;

        return response()->json([
            'success' => true,
            'data'    => $announcement,
        ]);
    }

    /**
     * GET /api/me/announcements/history
     * Arsip seluruh pengumuman lama yang pernah ditujukan ke user ini
     */
    public function myHistory(Request $request)
    {
        $user = Auth::user();

        $query = Announcement::with('creator');
        $this->applyUserTargetFilter($query, $user);

        $query->orderBy('published_at', 'desc');

        $announcements = $query->get()->map(function ($ann) use ($user) {
            $ann->is_read = $ann->isReadBy($user->id);
            return $ann;
        });

        return response()->json([
            'success' => true,
            'data'    => $announcements,
        ]);
    }
}
