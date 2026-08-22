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
</table>

<div class="section">Rincian Barang</div>
<table>
<thead>
<tr>
    <th>No</th>
    <th>Nama Barang</th>
    <th>Diajukan</th>
    <th>Disetujui</th>
    <th>Ditolak</th>
</tr>
</thead>
<tbody>
@foreach($pengajuan->items as $i => $item)
@php
    $isDitolak = ($pengajuan->status === 'ditolak_admin') || (isset($item->jumlah_disetujui) && (int)$item->jumlah_disetujui === 0);
    $disetujuiVal = $isDitolak ? '-' : ($item->jumlah_disetujui ?? $item->jumlah_diajukan);
    $ditolakVal = $isDitolak ? $item->jumlah_diajukan : '-';
@endphp
<tr>
    <td style="text-align: center;">{{ $i + 1 }}</td>
    <td>
        {{ $item->barang->nama ?? '-' }}
        @if(!empty($item->catatan_revisi))
            <br><small style="color: #dc2626; font-style: italic;">Catatan: {{ $item->catatan_revisi }}</small>
        @endif
    </td>
    <td style="text-align: center;">{{ $item->jumlah_diajukan }} {{ $item->barang->satuan ?? '' }}</td>
    <td style="text-align: center;">{{ $disetujuiVal }} {{ $item->barang->satuan ?? '' }}</td>
    <td style="text-align: center;">{{ $ditolakVal !== '-' ? $ditolakVal . ' ' . ($item->barang->satuan ?? '') : '-' }}</td>
</tr>
@endforeach
</tbody>
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

<strong>Keputusan Persetujuan:</strong><br>
@if($pengajuan->status === 'disetujui')
    DISETUJUI<br>
    Oleh: {{ $pengajuan->approvedBy?->name ?? '-' }} ({{ $pengajuan->approved_at?->format('d F Y H:i') ?? '-' }})
@elseif($pengajuan->status === 'ditolak_admin')
    DITOLAK
    @if(!empty($pengajuan->catatan_admin))
        <br><strong>Alasan Penolakan:</strong> {{ $pengajuan->catatan_admin }}
    @endif
@else
    Menunggu persetujuan
@endif
</p>

</body>
</html>
