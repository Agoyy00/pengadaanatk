<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: DejaVu Sans, sans-serif; font-size: 11px }
.header { text-align:center; border-bottom:3px solid #000; margin-bottom:15px }
table { width:100%; border-collapse:collapse }
th,td { border:1px solid #000; padding:6px }
th { background:#f0f0f0 }
.section { margin-top:18px; font-weight:bold }
.footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    font-size: 9px;
    text-align: center;
    border-top: 1px solid #000;
}
</style>
</head>
<body>

<div class="header">
    <h2>DOKUMEN PENGAJUAN ATK (ADMIN)</h2>
    <p>Universitas YARSI</p>
</div>

<div class="section">Informasi Pengajuan</div>
<table>
<tr>
    <td>Nomor</td>
    <td>ATK/{{ $pengajuan->id }}/{{ date('Y') }}</td>
    <td>Tanggal</td>
    <td>{{ $pengajuan->created_at->format('d F Y') }}</td>
</tr>
<tr>
    <td>Nama Pemohon</td>
    <td>{{ $pengajuan->nama_pemohon }}</td>
    <td>Unit</td>
    <td>{{ $pengajuan->unit }}</td>
</tr>
<tr>
    <td>Status</td>
    <td colspan="3"><strong>DIAJUKAN</strong></td>
</tr>
</table>

<div class="section">Rincian Barang Diajukan</div>
<table>
<thead>
<tr>
    <th>No</th>
    <th>Nama Barang</th>
    <th>Jumlah Diajukan</th>
</tr>
</thead>
<tbody>
@foreach($pengajuan->items as $i => $item)
<tr>
    <td>{{ $i + 1 }}</td>
    <td>{{ $item->barang->nama }}</td>
    <td>{{ $item->jumlah_diajukan }} {{ $item->barang->satuan }}</td>
</tr>
@endforeach
</tbody>
</table>

<div class="section">Keterangan</div>
<p>
Dokumen ini merupakan <strong>data mentah pengajuan ATK</strong> dari pemohon.<br>
Belum dilakukan proses verifikasi dan persetujuan.
</p>

<div class="footer">
Dokumen ini sah secara elektronik dan digunakan untuk keperluan verifikasi internal.
</div>

</body>
</html>
