# 11 — Lapor Rosak atau Hilang

**Bila perlu guna panduan ni:** Barang rosak (boleh / tak boleh dibaiki), atau barang hilang / dicuri. Catat dalam sistem supaya ada rekod rasmi.

---

## Kes 1: Barang Rosak (boleh dibaiki)

### 1. Buka page detail barang

### 2. Klik **Rekod Servis**

Walaupun belum dibaiki, kita catat dulu sebagai "Dalam Servis":

- **Tarikh servis** — hari ini
- **Keadaan sebelum** — pilih ikut sebenar
- **Keadaan selepas** — biarkan kosong atau sama (sebab belum baiki lagi)
- **Status selepas servis** — pilih **Dalam Servis**
- **Catatan** — tulis apa yang rosak, contoh: "Wayar putus, tunggu diiklankan kepada tukang"

Klik **Simpan**. Status barang akan jadi **Dalam Servis** — orang lain tak akan cuba pinjam.

Bila dah baiki, **[09 — Rekod Servis](09-log-servis.md)** sekali lagi dengan keadaan selepas + status balik **Aktif**.

---

## Kes 2: Barang Rosak Teruk (tak boleh dibaiki) — perlu Lupus

> **Untuk Admin sahaja.** Tindakan ni serius, akan keluarkan barang dari inventori aktif.

### 1. Buka page detail barang

### 2. Klik **Lupus** (butang merah)

Form pelupusan akan keluar.

![Klik Lupus](screenshots/11-lapor-rosak-hilang/step-1.png)

### 3. Isi info pelupusan

- **Tarikh pelupusan** — bila barang dilupuskan
- **Sebab** — pilih: Rosak Teruk / Dijual (Besi Buruk) / Dijual (Terpakai) / Sumbangan Keluar / Lain-lain
- **Kuantiti** — berapa unit dilupuskan
- **Jumlah jualan (RM)** — kalau dijual
- **Nama pembeli** — kalau dijual
- **Catatan** — apa-apa nota tambahan

Klik **Teruskan** → review → **Sahkan**. Status barang akan jadi **Dilupuskan**.


---

## Kes 3: Barang Hilang / Dicuri

> **Untuk Admin sahaja.**

### 1. Buka page detail barang

### 2. Klik **Lapor Hilang** (butang amber/kuning)

Form kehilangan akan keluar.


### 3. Isi info kehilangan

- **Tarikh** — bila perasan hilang
- **Jenis** — Hilang biasa / Dicuri
- **Kuantiti** — berapa unit hilang
- **No. laporan polis** *(wajib untuk kes curi)* — masjid mesti buat laporan polis dulu
- **Dokumen sokongan** — upload laporan polis, foto kejadian, atau dokumen berkaitan
- **Catatan** — kronologi pendek

Klik **Teruskan** → **Sahkan**. Status barang akan jadi **Hilang**.


---

## Kalau tak boleh lapor

**Butang Lupus / Lapor Hilang tak nampak?**
Anda bukan Admin. Hubungi Admin untuk laporkan.

**Kes curi tapi belum buat laporan polis?**
Jangan isi form ni dulu — buat laporan polis dulu (wajib untuk insurans + audit), baru daftar dalam sistem dengan No. laporan polis.

**Barang dijumpa balik selepas dilaporkan hilang?**
Page detail akan ada butang **Pulihkan** (Recovery). Klik untuk tukar status balik ke Aktif.

---

## Lepas ni

- Nak tengok semua rekod pelupusan untuk audit? Pergi `/reports/pelupusan`
- Nak tengok rekod kehilangan? Pergi `/reports/kehilangan`
- Pergi **[12 — Lihat Laporan](12-lihat-laporan.md)** untuk panduan penuh laporan
