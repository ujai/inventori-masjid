# 08 — Rekod Pulang Barang

**Bila perlu guna panduan ni:** Peminjam dah pulangkan barang. Catat dalam sistem supaya status balik **Aktif** dan stok dikemaskini.

---

## Langkah-langkah

### 1. Buka page detail barang yang dipinjam

Cari barang dalam senarai inventori (filter Status = **Dipinjam** untuk cepat), klik untuk buka detail.

### 2. Scroll ke Sejarah Pergerakan

Di bahagian bawah page, ada **Sejarah Pergerakan**. Cari rekod pinjam yang nak ditandakan sebagai pulang. Rekod yang masih outstanding (belum pulang) ada butang **Tandakan Pulang**.

![Sejarah pergerakan + butang Pulang](screenshots/08-pulang-barang/step-1.png)

### 3. Klik **Tandakan Pulang**

Form kecil akan keluar — minta info pulangan.


### 4. Isi info pulangan

- **Tarikh pulang** *(wajib)* — default hari ini, tukar kalau pulangan berlaku tarikh lain
- **Keadaan semasa pulang** — pilih Baik / Sederhana / Rosak (cek dulu sebelum terima!)
- **Catatan pulangan** — kalau ada apa-apa nak nota (cth: "Periuk kotor sedikit", "Bahagian gagang patah")

### 5. Klik **Simpan**

Sistem akan:
- Tukar status barang balik jadi **Aktif** (atau **Rosak** kalau keadaan ditanda Rosak)
- Update tarikh pulang dalam rekod pergerakan
- Update stok (kalau mod Kuantiti)


---

## Kalau tak boleh rekod pulang

**Butang Tandakan Pulang tak nampak?**
Rekod pergerakan tu dah ditandakan pulang sebelum ni. Cek "Tarikh pulang" dalam rekod — kalau ada, dah selesai.

**Status barang masih Dipinjam selepas tandakan pulang?**
Refresh page (F5). Kalau masih sama, mungkin ada rekod pinjam lain yang outstanding — cek Sejarah Pergerakan.

**Barang dipulangkan dalam keadaan rosak teruk?**
Tandakan keadaan **Rosak** masa pulang. Lepas tu, kalau perlu dilupuskan, ikut panduan **[11 — Lapor Rosak](11-lapor-rosak-hilang.md)**.

---

## Lepas ni

- Nak rekod servis untuk baiki barang yang pulang dengan kerosakan? Pergi **[09 — Rekod Servis](09-log-servis.md)**
- Nak tengok semua pergerakan masjid? Pergi `/activity`
