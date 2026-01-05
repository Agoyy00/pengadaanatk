<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 11px;
    color: #000;
}

.header {
    text-align: center;
    border-bottom: 3px solid #000;
    margin-bottom: 15px;
    padding-bottom: 8px;
}

.header h2 {
    margin: 0;
    font-size: 16px;
    letter-spacing: 1px;
}

.header p {
    margin: 3px 0;
    font-size: 11px;
}

.section-title {
    font-weight: bold;
    margin-top: 18px;
    margin-bottom: 6px;
    text-transform: uppercase;
}

.info-table,
.data-table {
    width: 100%;
    border-collapse: collapse;
}

.info-table td {
    padding: 4px;
    vertical-align: top;
}

.data-table th,
.data-table td {
    border: 1px solid #000;
    padding: 7px;
}

.data-table th {
    background: #f0f0f0;
    font-weight: bold;
}

.text-left { text-align: left; }
.text-center { text-align: center; }

.signature-table {
    margin-top: 45px;
    width: 100%;
}

.signature-box {
    text-align: center;
    vertical-align: top;
}

.signature-line {
    margin-top: 65px;
    border-top: 1px solid #000;
    width: 75%;
    margin-left: auto;
    margin-right: auto;
}

.footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    font-size: 9px;
    text-align: center;
    border-top: 1px solid #000;
    padding-top: 5px;
}
</style>
</head>

<body>

<div class="header">
    <h2>DOKUMEN PERSETUJUAN PENGADAAN ATK</h2>
    <p>Universitas YARSI</p>
    <p>Yayasan YARSI</p>
</div>

<div class="section-title">Informasi Dokumen</div>
<table class="info-table">
<tr>
    <td width="20%">Nomor Dokumen</td>
    <td width="30%">: ATK/{{ $pengajuan->id }}/{{ date('Y') }}</td>
    <td width="20%">Tanggal Terbit</td>
    <td width="30%">: {{ $pengajuan->created_at->format('d F Y') }}</td>
</tr>
<tr>
    <td>Nama Pemohon</td>
    <td>: {{ $pengajuan->nama_pemohon }}</td>
    <td>Unit / Fakultas</td>
    <td>: {{ $pengajuan->unit }}</td>
</tr>
<tr>
    <td>Tahun Akademik</td>
    <td>: {{ $pengajuan->tahun_akademik }}</td>
    <td>Status Dokumen</td>
    <td>: Disetujui & Sah</td>
</tr>
</table>

<div class="section-title">Tujuan Pengajuan</div>
<p style="text-align: justify;">
Dokumen ini merupakan persetujuan resmi atas pengajuan pengadaan Alat Tulis
Kantor (ATK) yang diajukan oleh unit terkait untuk mendukung kegiatan operasional
dan administrasi institusi. Seluruh barang yang tercantum telah melalui proses
verifikasi dan persetujuan sesuai ketentuan yang berlaku.
</p>

<div class="section-title">Rincian Barang Disetujui</div>
<table class="data-table">
<thead>
<tr>
    <th width="5%">No</th>
    <th width="35%">Nama Barang</th>
    <th width="10%">Diajukan</th>
    <th width="10%">Disetujui</th>
    <th width="15%">Harga Satuan</th>
    <th width="15%">Subtotal</th>
    <th width="10%">Satuan</th>
</tr>
</thead>
<tbody>
@php $totalNilai = 0; @endphp
@foreach($pengajuan->items as $i => $item)
    @php
        $jumlahDisetujui = $item->jumlah_disetujui ?? 0;
        $hargaSatuan    = $item->harga_satuan ?? 0;
        $subtotal       = $jumlahDisetujui * $hargaSatuan;
        $totalNilai    += $subtotal;
    @endphp
<tr class="text-center">
    <td>{{ $i + 1 }}</td>
    <td class="text-left">{{ $item->barang->nama ?? '-' }}</td>
    <td>{{ $item->jumlah_diajukan ?? 0 }}</td>
    <td>{{ $jumlahDisetujui }}</td>
    <td>Rp {{ number_format($hargaSatuan, 0, ',', '.') }}</td>
    <td>Rp {{ number_format($subtotal, 0, ',', '.') }}</td>
    <td>{{ $item->barang->satuan ?? '-' }}</td>
</tr>
@endforeach
</tbody>
<tfoot>
<tr>
    <th colspan="5" class="text-right">Total Nilai Pengadaan:</th>
    <th colspan="2">Rp {{ number_format($totalNilai, 0, ',', '.') }}</th>
</tr>
</tfoot>
</table>

<div class="section-title">Pengesahan</div>

<table class="signature-table">
<tr>
<td width="50%" class="signature-box">
    Diverifikasi oleh<br>
    <strong>Admin ATK</strong>
    <div class="signature-line"></div>
</td>
<td width="50%" class="signature-box">
    Disetujui oleh<br>
    <strong>Super Admin</strong><br>
    @if($qr)
        <img src="data:image/png;base64,{{ $qr }}"><br>
        <small>QR Validasi Dokumen</small>
    @else
        <small><em>Dokumen sah secara elektronik</em></small>
    @endif
</td>
</tr>
</table>

<div class="footer">
Dokumen ini diterbitkan secara elektronik oleh Sistem Pengadaan ATK Universitas YARSI dan
tidak memerlukan tanda tangan basah.
</div>

</body>
</html>
