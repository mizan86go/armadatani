# ArmadaTani

Platform sewa alsintan (alat & mesin pertanian) dan armada angkut hasil kebun untuk petani, admin KUD, dan operator lapangan. Dibangun ulang dari prototype satu-file menjadi aplikasi modular **Vite + JavaScript vanilla + HTML5 + CSS**, dengan landing page publik, autentikasi, dan tiga pengalaman peran yang terpisah.

Alamat `#/` menampilkan landing page (perkenalan produk + katalog unggulan). Halaman masuk ada di `#/masuk` dan pendaftaran petani di `#/daftar`; keduanya tidak lagi menjadi halaman pertama.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output statis di dist/
npm run preview  # pratinjau hasil build
```

Butuh Node 20+ (Web Crypto dipakai untuk hashing kata sandi). Aplikasi harus dibuka melalui `localhost` atau HTTPS agar `crypto.subtle` tersedia.

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Petani | `petani@armadatani.id` | `Petani#2026` |
| Admin KUD | `admin@armadatani.id` | `Admin#2026` |
| Operator | `operator@armadatani.id` | `Operator#2026` |

Kredensial di atas hanya didokumentasikan di README ini dan **tidak** ditampilkan di halaman mana pun. Data contoh (6 akun, 13 unit, 4 paket, 4 pesanan, 3 log BBM) ditanam otomatis pada kunjungan pertama dan disimpan di `localStorage` browser, sehingga akun langsung bisa dipakai untuk mencoba tiap peran.

## Peran & hak akses

| Area | Petani | Admin KUD | Operator |
| --- | --- | --- | --- |
| Ringkasan | Pesanan aktif, rekomendasi unit, aksi cepat | Antrean persetujuan, peringatan servis, nilai kontrak | Tugas aktif, upah, BBM dilaporkan |
| Katalog / armada | Cari, filter, favorit, detail, paket | CRUD unit, ubah status, jadwal servis | — |
| Pesanan | Ajukan sewa, batalkan, lihat detail | Setujui/tolak, mulai, selesaikan, tugaskan operator | Mulai/selesaikan tugas lapangan |
| Pengguna | — | Buat akun operator/admin, ubah peran, aktif/nonaktif | — |
| Laporan | — | Log BBM, biaya, pendapatan, margin | Catat BBM & hasil kerja |

Registrasi publik **hanya** membuat akun petani. Akun operator dan admin dibuat oleh admin KUD dari konsol pengguna — mencegah eskalasi hak akses.

## Foto & kredit

Semua foto peralatan dan landing page adalah foto asli dari **Wikimedia Commons** dengan lisensi bebas (CC BY, CC BY-SA, CC0, atau public domain). Berkasnya disalin ke `public/images/` agar aplikasi tidak bergantung pada host luar, dan setiap entri tetap menyimpan nama pemotret, lisensi, serta tautan sumber di `src/data/images.js`.

- `src/data/images.js` — peta `unitId → [{ src, alt, credit, license, source }]` dan foto landing. Katalog serta detail unit membacanya; kartu memakai foto pertama sebagai sampul.
- Galeri detail unit (`src/ui/gallery.js`) adalah slideshow dengan panah, titik navigasi, dan penghitung foto. Tidak ada teks kredit/lisensi yang dirender di UI.
- Metadata kredit disimpan sebagai data, bukan ditampilkan. Sebelum publikasi luas, ganti foto dengan materi milik sendiri/berlisensi komersial **atau** tampilkan kembali atribusi sesuai lisensi CC BY / CC BY-SA.

Untuk mengganti foto: taruh berkas baru di `public/images/units/` (atau `landing/`), lalu perbarui entri terkait di `src/data/images.js` beserta `alt`, `credit`, `license`, dan `source`.

## Aturan bisnis inti

- **Anti-bentrok**: unit dan operator dicek terhadap pesanan berstatus `pending`, `approved`, dan `in_progress`. Unit berstatus `maintenance` tidak bisa dipesan. Tanggal dihitung lokal (bukan UTC) sehingga rentang 1–7 hari konsisten.
- **Harga** (`src/lib/domain.js`): `tarif dasar × kuantitas × hari`, ditambah BBM (`konsumsi × kuantitas × hari × faktor medan`) dan upah operator per hari pada skema paket lengkap. Total dibulatkan ke ribuan.
- **Transisi status** dijaga (`src/lib/bookings.js`): `pending → approved/rejected/cancelled`, `approved → in_progress/cancelled`, `in_progress → completed`.
- **Guard rute**: rute peran dilindungi; pengguna yang belum masuk diarahkan ke `/masuk?next=…`, dan peran yang salah dikembalikan ke beranda miliknya.

## Struktur

```
index.html                 entry Vite
public/favicon.svg
public/images/             foto unit + landing (lokal, dari Wikimedia Commons)
src/
  main.js                  boot, tabel rute, guard, event global
  styles/                  tokens, base, layout, components, auth, landing
  data/seed.js             data awal + akun demo
  data/images.js           peta foto unit/landing + kredit & lisensi
  lib/
    auth.js                login, registrasi, sesi, pembuatan akun staf
    password.js            PBKDF2-SHA256 (Web Crypto)
    store.js               lapisan persistensi (async, mudah ditukar ke HTTP API)
    domain.js              harga, konflik jadwal, matriks ketersediaan
    bookings.js            transisi status & penugasan operator
    favorites.js, router.js, utils.js, constants.js
  ui/                      shell sidebar, modal/toast, kit, ikon, unit card, galeri foto
  views/
    landing.js             landing page publik
    auth/                  login, daftar
    farmer/                home, catalog, booking, orders, unitDetail
    admin/                 home, bookings, fleet, users, reports
    operator/              tasks, history
```

### Mengganti ke backend nyata

Semua akses data melewati `src/lib/store.js` dan `src/lib/auth.js`. Ganti isi kedua modul dengan `fetch` ke API: fungsi sudah `async`, mengembalikan JSON biasa, dan tidak ada view yang menyentuh `localStorage` secara langsung. Hashing kata sandi juga harus dipindahkan ke server (modul `password.js` adalah satu-satunya titik yang perlu dihapus).

## Catatan produksi

- Build ini **client-only**: sesi, pengguna, dan kata sandi tersimpan di browser. Untuk produksi, gunakan backend dengan sesi `httpOnly`, rate limiting login, verifikasi email, dan otorisasi di sisi server — guard di UI bukan pengganti otorisasi server.
- Akun contoh berada di `src/data/seed.js` (`demoPassword` pada tiap pengguna) dan hanya ditanam sekali saat inisialisasi. Saat data nyata digunakan, hapus akun seed beserta pemanggilan seed, lalu ganti `store.js`/`auth.js` dengan API backend.
- Sesi kedaluwarsa setelah 8 jam (`SESSION_TTL_MS`), dan akun nonaktif langsung ditolak saat memuat sesi.
- Foto berlisensi CC BY / CC BY-SA mewajibkan atribusi saat dipublikasikan. UI saat ini tidak menampilkannya; sebelum rilis publik, tambahkan halaman atribusi atau ganti fotonya.
- Ukuran foto sudah diturunkan ke lebar 900 px, tetapi total `public/images` masih sekitar 7,5 MB. Untuk produksi, kompres ke WebP/AVIF dan sediakan `srcset`.
- Belum termasuk dari prototype lama: peta zonasi SVG Aceh dan toggle bahasa ID/EN.
