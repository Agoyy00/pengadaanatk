<?php

namespace App\Exports;

use App\Models\Barang;
use App\Models\StockOpname;
use App\Models\Periode;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Carbon\Carbon;

class TemplatePengajuanExport implements FromCollection, WithHeadings, WithStyles, WithTitle, WithColumnWidths, WithEvents
{
    protected $timestampStr;
    protected $rowCount = 0;
    protected $userId;

    public function __construct($userId = null)
    {
        $this->userId = $userId;
        $this->timestampStr = Carbon::now('Asia/Jakarta')->translatedFormat('d F Y, H:i:s') . ' WIB';
    }

    public function title(): string
    {
        return 'Template Pengajuan ATK';
    }

    public function collection()
    {
        $items = collect();

        if ($this->userId) {
            $now = Carbon::now('Asia/Jakarta');
            $periode = Periode::where('mulai', '<=', $now)->where('selesai', '>=', $now)->first();

            $query = StockOpname::with(['barang'])
                ->where('user_id', $this->userId);

            if ($periode) {
                $query->where('created_at', '>=', Carbon::parse($periode->mulai)->subDays(7));
            }

            $opnames = $query->get();

            $items = $opnames->map(function ($so) {
                $barang = $so->barang;
                $stokFisik = (int)($so->stok_fisik ?? 0);
                $sisaStok = $so->hasil_verifikasi !== null
                    ? (int)$so->hasil_verifikasi
                    : $stokFisik;

                return [
                    'nama' => $barang->nama ?? 'Barang Terhapus',
                    'satuan' => $so->satuan ?? $barang->satuan ?? 'Pcs',
                    'sisa_stok' => $sisaStok,
                ];
            });
        }

        // Fallback jika tidak ada userId atau belum ada data stock opname
        if ($items->isEmpty()) {
            $barangs = Barang::orderBy('nama', 'asc')->get();
            $items = $barangs->map(function ($barang) {
                return [
                    'nama' => $barang->nama,
                    'satuan' => $barang->satuan ?? 'Pcs',
                    'sisa_stok' => (int)$barang->stok,
                ];
            });
        }

        $this->rowCount = $items->count();

        return $items->values()->map(function ($it) {
            return [
                'nama_barang'        => $it['nama'],
                'satuan'             => $it['satuan'],
                'kebutuhan_total'    => '', // Dikosongkan agar user mudah mengetik angka
                'sisa_stok_saat_ini' => $it['sisa_stok'],
            ];
        });
    }

    public function headings(): array
    {
        return [
            ['DATA STOK ATK REAL-TIME PER: ' . $this->timestampStr, '', '', ''],
            [
                'Nama Barang',
                'Satuan',
                'Kebutuhan Total (Input)',
                'Sisa Stok Saat Ini (Terkunci)',
            ]
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 40,
            'B' => 14,
            'C' => 24,
            'D' => 26,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Header Info Row 1
            1 => [
                'font' => [
                    'bold'  => true,
                    'size'  => 11,
                    'color' => ['rgb' => '1E3A8A'],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ],
            // Table Column Headers Row 2
            2 => [
                'font' => [
                    'bold'  => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size'  => 11,
                ],
                'fill' => [
                    'fillType'   => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1E293B'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                    'wrapText'   => true,
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = max(3, $this->rowCount + 2);

                // Merge row 1 across all columns
                $sheet->mergeCells('A1:D1');
                $sheet->getRowDimension(1)->setRowHeight(28);
                $sheet->getRowDimension(2)->setRowHeight(32);

                // Set row 1 background
                $sheet->getStyle('A1:D1')->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('E0F2FE');

                // Border and alignment for all data rows
                $dataRange = "A2:D{$lastRow}";
                $sheet->getStyle($dataRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $sheet->getStyle($dataRange)->getBorders()->getAllBorders()->getColor()->setRGB('CBD5E1');

                // Alignments
                $sheet->getStyle("A3:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("B3:B{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C3:C{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("D3:D{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

                // Format numbers
                $sheet->getStyle("D3:D{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');

                // Highlight editable column C (Kebutuhan Total) with soft yellow
                $sheet->getStyle("C3:C{$lastRow}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('FEF9C3');

                // Style header row 2 border
                $sheet->getStyle('A2:D2')->getBorders()->getOutline()->setBorderStyle(Border::BORDER_MEDIUM);

                // Lock all cells by default, then unlock column C for editing
                $sheet->getProtection()->setPassword('YarsiATK2026');
                $sheet->getProtection()->setSheet(true);
                $sheet->getProtection()->setSort(true);
                $sheet->getProtection()->setInsertRows(true);
                $sheet->getProtection()->setFormatCells(true);

                // Unlock Column C only (Kebutuhan Total)
                $sheet->getStyle("C3:C{$lastRow}")->getProtection()->setLocked(\PhpOffice\PhpSpreadsheet\Style\Protection::PROTECTION_UNPROTECTED);
            },
        ];
    }
}
