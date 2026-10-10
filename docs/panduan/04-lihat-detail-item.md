# 04 — Lihat Detail Barang

**Bila perlu guna panduan ni:** Nak tengok info penuh tentang satu barang — status semasa, lokasi, sejarah pinjam, sejarah servis, dan tindakan yang boleh dibuat.

---

## Langkah-langkah

### 1. Pergi page detail

Dari senarai inventori (`/items`), klik mana-mana barang. Anda akan dibawa ke page `/items/{id}` — page detail barang tu.

![Page detail barang](screenshots/04-lihat-detail-item/step-1.png)

### 2. Bahagian atas — info ringkas

Anda akan nampak:
- **Nama barang** + kod aset (kalau ada, cth: AC-01)
- **Status badge** — warna ikut status (hijau = Aktif, merah = Rosak, dll.)
- **Lokasi semasa** — di mana barang ada sekarang
- **Health score** — angka antara 0-100 yang tunjuk kesihatan barang ikut umur, servis, jaminan


### 3. Butang tindakan

Bergantung pada status barang dan role anda, anda akan nampak butang-butang ni:

- **Pergerakan / Pinjam** — rekod barang dipinjam atau dipindah lokasi
- **Servis** — rekod servis / maintenance yang dah dibuat
- **Cetak Label QR** — cetak label QR untuk tampal pada barang
- **Edit** *(Admin sahaja)* — kemaskini info barang
- **Lupus** *(Admin sahaja)* — rekod pelupusan barang
- **Lapor Hilang** *(Admin sahaja)* — kalau barang hilang/dicuri


### 4. Maklumat tambahan + Sejarah

Scroll ke bawah, anda akan nampak:
- **Maklumat tambahan** (collapsible) — harga, pembekal, tarikh perolehan, jaminan, peranan institusi (cth: untuk solat Jumaat)
- **Sejarah pergerakan** — semua pinjam/pulang yang dah berlaku
- **Sejarah servis** — semua maintenance log

Klik mana-mana untuk expand / collapse.


---

## Kalau tak boleh lihat detail

**Page "Not Found" (404)?**
Barang dah dipadam, atau URL salah. Pergi `/items` dan klik dari senarai.

**Butang Edit / Lupus tak nampak?**
Anda bukan Admin. Tanya Admin kalau perlu buat perubahan.

---

## Lepas ni

- Nak rekod pinjam? Pergi **[07 — Rekod Pinjam Barang](07-pinjam-barang.md)**
- Nak rekod servis? Pergi **[09 — Rekod Servis](09-log-servis.md)**
- Nak cetak QR label? Pergi **[10 — Cetak Label QR](10-cetak-qr.md)**
