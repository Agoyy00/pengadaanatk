<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: DejaVu Sans, sans-serif; font-size: 11px }
.header { text-align:center; border-bottom:3px solid #000; margin-bottom:15px }
.header h2 { margin:0; font-size:16px }
.section { margin-top:18px; font-weight:bold }
table { width:100%; border-collapse:collapse }
th,td { border:1px solid #000; padding:6px }
th { background:#f0f0f0 }
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
</div>

<div class="section">Informasi Pengajuan</div>
<table>
<tr>
    <td width="25%">Nomor Dokumen</td>
    <td width="25%">ATK/{{ $pengajuan->id }}/{{ date('Y') }}</td>
    <td width="25%">Tanggal</td>
    <td width="25%">{{ $pengajuan->created_at->format('d F Y') }}</td>
</tr>
<tr>
    <td>Nama Pemohon</td>
    <td>{{ $pengajuan->nama_pemohon }}</td>
    <td>Unit</td>
    <td>{{ $pengajuan->unit }}</td>
</tr>
<tr>
    <td>Status</td>
    <td colspan="3">
        <strong>
            {{ strtoupper(str_replace('_', ' ', $pengajuan->status)) }}
        </strong>
    </td>
</tr>
</table>

<div class="section">Rincian Barang</div>
<table>
<thead>
<tr>
    <th>No</th>
    <th>Nama Barang</th>
    <th>Diajukan</th>
    <th>Disetujui</th>
    <th>Harga</th>
    <th>Subtotal</th>
</tr>
</thead>
<tbody>
@php $total = 0; @endphp
@foreach($pengajuan->items as $i => $item)
@php
    $qty = $item->jumlah_disetujui ?? 0;
    $harga = $item->harga_satuan ?? 0;
    $sub = $qty * $harga;
    $total += $sub;
@endphp
<tr>
    <td>{{ $i + 1 }}</td>
    <td>{{ $item->barang->nama ?? '-' }}</td>
    <td>{{ $item->jumlah_diajukan }}</td>
    <td>{{ $qty }}</td>
    <td>Rp {{ number_format($harga,0,',','.') }}</td>
    <td>Rp {{ number_format($sub,0,',','.') }}</td>
</tr>
@endforeach
</tbody>
<tfoot>
<tr>
    <th colspan="5">Total</th>
    <th>Rp {{ number_format($total,0,',','.') }}</th>
</tr>
</tfoot>
</table>

<div class="section">Riwayat Persetujuan</div>
<p>
<strong>Verifikasi Admin:</strong><br>
@if($pengajuan->verifiedBy)
    {{ $pengajuan->verifiedBy->name }}<br>
    {{ $pengajuan->verified_at?->format('d F Y H:i') }}
@else
    -
@endif

<br><br>

<strong>Keputusan Superadmin:</strong><br>
@if($pengajuan->status === 'disetujui')
    {{ $pengajuan->approvedBy?->name ?? '-' }}<br>
    {{ $pengajuan->approved_at?->format('d F Y H:i') ?? '-' }}
@elseif($pengajuan->status === 'ditolak_admin')
    DITOLAK
@else
    Menunggu persetujuan
@endif
</p>

</body>
</html>
