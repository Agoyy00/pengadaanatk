<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Pengambilan Barang ATK</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #111;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0 0 5px 0;
            font-size: 16px;
            text-transform: uppercase;
        }
        .header p {
            margin: 0;
            font-size: 11px;
            color: #666;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
        }
        .meta-table td {
            padding: 3px 0;
            vertical-align: top;
        }
        .meta-label {
            width: 150px;
            font-weight: bold;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 25px;
        }
        .items-table th, .items-table td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            text-align: left;
        }
        .items-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .signature-section {
            margin-top: 30px;
            width: 100%;
        }
        .signature-box {
            width: 45%;
            float: left;
            text-align: center;
        }
        .signature-box.right {
            float: right;
        }
        .signature-space {
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .signature-img {
            max-height: 65px;
            max-width: 150px;
        }
        .clear {
            clear: both;
        }
        .notes-box {
            background-color: #f9f9f9;
            border: 1px dashed #ccc;
            padding: 8px 12px;
            margin-top: 10px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>BERITA ACARA SERAH TERIMA & PENGAMBILAN BARANG ATK</h2>
        <p>Universitas YARSI - Bagian Pengadaan Alat Tulis Kantor</p>
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Nomor Pengambilan:</td>
            <td><strong>{{ $pengambilan->nomor_pengambilan }}</strong></td>
            <td class="meta-label">Tanggal Pengambilan:</td>
            <td>{{ \Carbon\Carbon::parse($pengambilan->tanggal_pengambilan)->translatedFormat('d F Y') }}</td>
        </tr>
        <tr>
            <td class="meta-label">Nama Pengambil/Penerima:</td>
            <td>{{ $pengambilan->nama_penerima }}</td>
            <td class="meta-label">Unit / Departemen:</td>
            <td>{{ $pengambilan->unit }}</td>
        </tr>
        <tr>
            <td class="meta-label">Tahun Akademik:</td>
            <td>{{ $pengambilan->pengajuan->tahun_akademik ?? '-' }}</td>
            <td class="meta-label">Nama Pemohon:</td>
            <td>{{ $pengambilan->pengajuan->nama_pemohon ?? '-' }}</td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 20%;">Kode Barang</th>
                <th style="width: 35%;">Nama Barang</th>
                <th style="width: 10%;">Satuan</th>
                <th style="width: 15%;">Jumlah Disetujui</th>
                <th style="width: 15%;">Jumlah Diambil</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pengambilan->items as $index => $item)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td>{{ $item->barang->kode ?? '-' }}</td>
                <td>{{ $item->barang->nama ?? '-' }}</td>
                <td class="text-center">{{ $item->satuan }}</td>
                <td class="text-center">{{ $item->jumlah_disetujui }}</td>
                <td class="text-center"><strong>{{ $item->jumlah_diambil }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>

    @if($pengambilan->catatan_kondisi)
    <div class="notes-box">
        <strong>Catatan Kondisi Barang:</strong> {{ $pengambilan->catatan_kondisi }}
    </div>
    @endif

    <div class="signature-section">
        <div class="signature-box">
            <p>Petugas Pengadaan / Serah Terima,</p>
            <div class="signature-space"></div>
            <p><strong>( {{ $pengambilan->creator->name ?? 'Petugas Logistik' }} )</strong></p>
        </div>

        <div class="signature-box right">
            <p>Penerima / Pengambil Barang,</p>
            <div class="signature-space">
                @if($pengambilan->tanda_tangan && str_starts_with($pengambilan->tanda_tangan, 'data:image'))
                    <img src="{{ $pengambilan->tanda_tangan }}" class="signature-img" />
                @endif
            </div>
            <p><strong>( {{ $pengambilan->nama_penerima }} )</strong></p>
        </div>
        <div class="clear"></div>
    </div>
</body>
</html>
