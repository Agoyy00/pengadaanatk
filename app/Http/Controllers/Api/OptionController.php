<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Option;
use Illuminate\Http\Request;

class OptionController extends Controller
{
    private array $defaults = [
        'satuan' => [
            "Dus", "Rim", "Pcs", "Box", "Pack", "Roll", "Botol", "Buku", "Set", "Lembar", "Tube", "Pad"
        ],
        'jabatan' => [
            "Staf", "Dosen"
        ],
        'unit' => [
            "Direktorat", "DPJJ", "PDJAMA", "Pascasarjana", "Fakultas Kedokteran", 
            "Fakultas Kedokteran Gigi", "Fakultas Teknologi Informasi", "Fakultas Hukum", 
            "Fakultas Psikologi", "Fakultas Ekonomi"
        ]
    ];

    public function index(string $type)
    {
        $options = Option::where('type', $type)->orderBy('value')->get();

        // Auto-seed defaults if table has no entries for this type
        if ($options->isEmpty() && isset($this->defaults[$type])) {
            foreach ($this->defaults[$type] as $val) {
                Option::firstOrCreate([
                    'type' => $type,
                    'value' => $val,
                ]);
            }
            $options = Option::where('type', $type)->orderBy('value')->get();
        }

        return response()->json([
            'success' => true,
            'data' => $options
        ]);
    }

    public function store(Request $request, string $type)
    {
        $request->validate([
            'value' => 'required|string|max:255',
        ]);

        $val = trim($request->input('value'));

        $option = Option::firstOrCreate([
            'type' => $type,
            'value' => $val,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Opsi berhasil ditambahkan',
            'data' => $option
        ]);
    }

    public function destroy(int $id)
    {
        $option = Option::findOrFail($id);
        $option->delete();

        return response()->json([
            'success' => true,
            'message' => 'Opsi berhasil dihapus'
        ]);
    }
}
