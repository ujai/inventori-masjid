# UAT Checklist — Inventori Masjid Anda

**URL:** https://inventori.example.com  
**Versi:** c328025  
**Tarikh UAT:** ___________  
**Penguji:** ___________

Tandakan ✅ apabila lulus, ❌ jika gagal, dan catat apa yang berlaku.

---

## Bahagian 1 — Log Masuk & Pengurusan Pengguna (Admin)

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 1.1 | Admin buka `/sign-in` di Chrome mobile | Halaman log masuk muncul, butang Google kelihatan | | |
| 1.2 | Admin klik **Log Masuk dengan Google** | Diarahkan ke Google, kembali ke dashboard selepas pilih akaun | | |
| 1.3 | Buka `/admin/users` sebagai admin | Senarai pengguna muncul | | |
| 1.4 | Cuba buka `/admin/users` sebagai AJK | Lihat mesej 403 ditolak | | |

---

## Bahagian 2 — Dashboard

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 2.1 | Buka `/` sebagai admin | Kad statistik muncul (Aktif, Rosak, dll) | | |
| 2.2 | Semak kad statistik sesuai dengan data | Nombor pada kad sepadan dengan senarai sebenar | | |
| 2.3 | Klik banner amaran (jika ada) | Diarahkan ke laporan berkaitan | | |
| 2.4 | Semak **Aktiviti Terkini** | 10 tindakan terkini muncul dengan nama pengguna | | |

---

## Bahagian 3 — Inventori (AJK)

### 3A — Senarai & Carian

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 3.1 | Buka `/items` | Senarai barang muncul dalam kad, tiada barang hilang/dilupuskan | | |
| 3.2 | Taip **"periuk"** di kotak carian | Periuk Besar muncul | | |
| 3.3 | Taip **"FSI"** | Penghawa Dingin (FSI-0001, FSI-0002) muncul | | |
| 3.4 | Buka **Tapis** → pilih Kategori = Dapur | Hanya barang Dapur | | |
| 3.5 | Buka **Tapis** → tanda kotak **"Tunjuk barang hilang & dilupuskan"** | Barang berstatus Hilang muncul | | |
| 3.6 | Buang tapisan | Semua barang aktif kembali muncul | | |

### 3B — Tambah Barang Baru

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 3.7 | Klik **Tambah Barang** | Borang muncul dengan medan yang betul | | |
| 3.8 | Isi nama, kategori, lokasi, mod = Kuantiti, status = Aktif → Simpan | Barang baru muncul dalam senarai | | |
| 3.9 | Tambah barang mod **Aset Individu**, biarkan Kod Aset kosong → Simpan | Kod aset auto-jana (cth: PEJ-0001) | | |
| 3.10 | Cuba simpan tanpa nama | Mesej ralat "Nama barang diperlukan" muncul | | |

### 3C — Edit & Detail

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 3.11 | Klik barang → halaman detail | Semua maklumat muncul betul | | |
| 3.12 | Klik **Edit** → ubah status → Kemaskini | Status barang berubah | | |
| 3.13 | Pada halaman detail → scroll bawah | Bahagian Foto, Log Servis, Log Pergerakan, Log Pelupusan & Kehilangan muncul | | |

---

## Bahagian 4 — Operasi (AJK)

### 4A — Log Servis

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 4.1 | Buka Penghawa Dingin → klik **Tambah log servis** | Borang servis muncul | | |
| 4.2 | Isi tarikh servis, kos RM200, nota → Simpan log | Log servis muncul dalam sejarah, tarikh servis dikemaskini | | |
| 4.3 | Tukar status kepada **Aktif** → sahkan | Status barang bertukar | | |

### 4B — Pinjam & Pindah

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 4.4 | Buka Sejadah → **Tambah pergerakan** → pilih **Pinjam** | Medan Nama Peminjam dan Jangka Pulang muncul | | |
| 4.5 | Isi nama peminjam "Ahmad", tarikh pulang esok → Simpan | Status Sejadah bertukar ke **Dipinjam** | | |
| 4.6 | Klik **Rekod pulangan** pada log pinjaman | Status kembali ke Aktif | | |
| 4.7 | Buka Periuk Besar → **Pindah lokasi** ke lokasi lain | Lokasi barang bertukar dalam detail | | |
| 4.8 | Cuba pinjam barang yang sedang Dipinjam | Mesej ralat "sedang dipinjam" | | |

### 4C — Foto

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 4.9 | Buka mana-mana barang → **Tambah foto** → upload JPG | Foto muncul sebagai thumbnail | | |
| 4.10 | Klik thumbnail | Lightbox terbuka dengan foto penuh | | |
| 4.11 | Cuba upload fail PDF sebagai foto | Mesej ralat "Hanya JPG atau PNG dibenarkan" | | |

---

## Bahagian 5 — Operasi (Admin Sahaja)

### 5A — Pelupusan

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 5.1 | Buka Vacuum Cleaner (rosak) → **Rekod pelupusan** | Borang pelupusan dengan sebab muncul | | |
| 5.2 | Pilih sebab "Rosak Teruk", kuantiti 1 → Teruskan → Sahkan | Status bertukar Dilupuskan, hilang dari senarai biasa | | |
| 5.3 | Semak `/reports/pelupusan` | Rekod Vacuum Cleaner muncul dalam laporan | | |

### 5B — Kehilangan (Ujian dengan data dummy)

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 5.4 | Buka barang aktif → **Rekod kehilangan** → pilih Dicuri | Medan No. Laporan Polis muncul sebagai wajib | | |
| 5.5 | Cuba simpan tanpa no. laporan polis | Mesej ralat no. polis diperlukan | | |
| 5.6 | Isi no. polis, upload laporan dummy (PDF/PNG) → Sahkan | Status Hilang, rekod muncul | | |
| 5.7 | Buka detail barang Hilang → klik **Barang dijumpai semula** | Borang tarikh dijumpai muncul | | |
| 5.8 | Isi tarikh dan nota → Sahkan dijumpai | Status kembali Aktif, log penemuan dalam aktiviti | | |

---

## Bahagian 6 — Data Induk (AJK)

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 6.1 | Buka `/admin/master-data` → tab Kategori | 8 kategori dengan prefix muncul | | |
| 6.2 | Klik **Edit** pada mana-mana kategori → ubah nama → Simpan | Nama dikemaskini | | |
| 6.3 | Klik **Unit baru** → tambah unit "tin" | Unit muncul dalam dropdown borang barang | | |

---

## Bahagian 7 — Laporan & CSV

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 7.1 | Buka `/reports` | 7 kad laporan muncul | | |
| 7.2 | Klik **Ikut Kategori** | Jadual dengan bilangan barang per kategori | | |
| 7.3 | Klik **Muat turun CSV** pada mana-mana laporan | Fail .csv dimuat turun | | |
| 7.4 | Buka CSV dalam Excel/Sheets | Teks Malay muncul betul (bukan garbled text) | | |
| 7.5 | Buka **Sedang Dipinjam** | Barang yang dipinjam di 4.5 muncul | | |

---

## Bahagian 8 — Pemberitahuan

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 8.1 | Buka `/me` → semak toggle emel | Toggle hidup (biru) | | |
| 8.2 | Semak status Telegram di `/me` | "Disambung" dengan nama akaun | | |
| 8.3 | Buka URL ujian sebagai admin: `/api/cron/test` | JSON `{"email":"Sent to...","telegram":"Sent to..."}` | | |
| 8.4 | Semak peti emel | Emel peringatan sampai dengan pautan barang | | |
| 8.5 | Semak Telegram | Mesej tiba dengan pautan yang boleh diklik | | |

---

## Bahagian 9 — Pengalaman Mudah Alih

Buka https://inventori.example.com pada **telefon bimbit** (bukan desktop):

| # | Senario | Jangkaan | ✅/❌ | Catatan |
|---|---|---|---|---|
| 9.1 | Halaman `/` — statistik | Kad tersusun dalam grid 2 lajur | | |
| 9.2 | Halaman `/items` — senarai | Kad barang penuh lebar skrin, mudah ditap | | |
| 9.3 | Borang tambah barang | Butang simpan melekat di bawah skrin semasa scroll | | |
| 9.4 | Menu navigasi (ikon ☰) | Drawer terbuka, semua pautan boleh ditap | | |
| 9.5 | Lightbox foto | Foto penuh skrin, butang tutup mudah capai | | |

---

## Bahagian 10 — Semak Keselamatan Asas

| # | Semak | Jangkaan | ✅/❌ |
|---|---|---|---|
| 10.1 | Buka `/admin/users` tanpa log masuk (incognito) | Diarahkan ke `/sign-in` | |
| 10.2 | Log masuk sebagai AJK → buka `/admin/users` | Paparan 403 Akses Ditolak | |
| 10.3 | Cuba `GET /api/items` tanpa log masuk (curl/Insomnia) | `401 UNAUTHENTICATED` | |

---

## Penemuan Pepijat

Catat sebarang masalah di sini:

| # | Halaman | Penerangan Masalah | Keterukan | Status |
|---|---|---|---|---|
| | | | | |
| | | | | |

**Keterukan:** Kritikal (sistem tidak boleh digunakan) / Tinggi (fungsi utama rosak) / Rendah (kosmetik)

---

## Keputusan UAT

- [ ] **Lulus** — sistem sedia untuk digunakan AJK
- [ ] **Lulus bersyarat** — beberapa isu minor, boleh diguna dengan had
- [ ] **Gagal** — isu kritikal perlu diselesaikan dahulu

**Diluluskan oleh:** ___________  
**Tarikh:** ___________
