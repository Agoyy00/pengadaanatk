<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { background: #eee; }
    </style>
</head>
<body>

<h3>Pengajuan ATK</h3>

<p>
Nama: {{ $pengajuan->nama_pemohon }}<br>
Unit: {{ $pengajuan->unit }}<br>
Tahun Akademik: {{ $pengajuan->tahun_akademik }}
</p>

<table>
<tr>
  <th>Barang</th>
  <th>Diajukan</th>
  <th>Disetujui</th>
  <th>Satuan</th>
</tr>
@foreach($pengajuan->items as $item)
<tr>
  <td>{{ $item->barang->nama }}</td>
  <td>{{ $item->jumlah_diajukan }}</td>
  <td>{{ $item->jumlah_disetujui ?? $item->jumlah_diajukan }}</td>
  <td>{{ $item->barang->satuan }}</td>
</tr>
@endforeach
</table>

<p><strong>Total Nilai:</strong> Rp {{ number_format($pengajuan->total_nilai) }}</p>

</body>
</html>
