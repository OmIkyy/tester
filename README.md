# DG-KOMPUTER — Sistem Manajemen Pelanggan Internet

Sebuah dashboard internal untuk operasional ISP skala kecil–menengah. Dipakai sehari-hari oleh tim **admin**, **sales**, dan **teknisi** untuk mendaftarkan pelanggan baru, memantau antrian pemasangan, dan mengirim rekap harian ke grup WhatsApp tanpa harus pindah-pindah antara spreadsheet, chat, dan folder foto.

> Tujuannya sederhana: satu tempat, semua orang lihat hal yang sama, dan tidak ada lagi data pelanggan yang tercecer di chat pribadi.

---

## ✨ Fitur Utama

Aplikasi ini bukan sekadar CRUD pelanggan. Setiap menu dirancang sesuai alur kerja nyata di lapangan:

- **Dashboard monitoring** — ringkasan pelanggan, tren 14 hari, ranking sales, dan timeline aktivitas terbaru. Cocok dibuka pertama kali setiap pagi untuk tahu kondisi tim.
- **Manajemen pelanggan** — daftar lengkap dengan filter status / paket / area, pencarian cepat, dan modal detail beserta foto KTP & rumah.
- **Registrasi pelanggan baru** — form khusus sales dengan validasi (Zod), upload dokumen ke storage privat, dan pencatatan otomatis ke log aktivitas.
- **Antrian teknisi** — kartu-kartu pelanggan berstatus *Pending* yang menunggu pemasangan. Teknisi tinggal isi serial ONU, redaman, panjang kabel, dan upload foto — status pelanggan otomatis berubah menjadi *Selesai*.
- **Statistik** — analitik mendalam: tren 30 hari, distribusi paket (donut chart), top 8 area, dan komposisi role tim.
- **Profil pengguna** — setiap user punya halaman profil sendiri dengan statistik pribadi (jumlah pelanggan / pemasangan, performa 7 hari terakhir, aktivitas terakhir).
- **Rekap WhatsApp** — generator teks laporan otomatis. Tinggal salin / kirim langsung ke grup koordinasi.
- **Manajemen user & role** — admin bisa mengubah role user (ADMIN, SALES, TEKNISI, VIEWER) dengan satu klik.
- **Log aktivitas** — semua aksi penting tercatat (siapa, kapan, melakukan apa). Berguna untuk audit dan menyelesaikan miskomunikasi.
- **Sinkronisasi cloud** — semua data live dari Lovable Cloud (Supabase). Tidak perlu sync manual; buka di laptop kantor atau HP, datanya sama.

---

## 🛠 Tech Stack

Stack-nya sengaja dipilih yang ringan, modern, dan punya komunitas besar:

- **Frontend**
  - React 18 + TypeScript
  - Vite 5 sebagai bundler
  - Tailwind CSS v3 + shadcn/ui untuk komponen
  - React Router v6 untuk routing
  - TanStack Query (boilerplate, siap dipakai untuk caching server state)
  - Recharts untuk visualisasi (line, bar, area, pie)
  - React Hook Form + Zod untuk validasi
  - Lucide React untuk icon (sesuai catatan: tidak pakai sticker)
  - date-fns dengan locale `id` untuk format tanggal Indonesia
- **Backend (Lovable Cloud / Supabase)**
  - Postgres + Row Level Security (RLS) di setiap tabel
  - Supabase Auth (email/password, session persistence otomatis)
  - Supabase Storage (bucket privat `customer-photos`, akses via signed URL)
  - Supabase RPC (`complete_installation`) sebagai jalur aman teknisi menyelesaikan pemasangan
- **Tooling**
  - Bun sebagai package manager
  - Vitest untuk testing

---

## 🚀 Cara Menjalankan

```bash
# 1. Clone repo
git clone <repo-url>
cd netcore-isp

# 2. Install dependency
bun install   # atau: npm install

# 3. Jalankan di local
bun dev       # atau: npm run dev
```

File `.env` sudah otomatis disediakan oleh Lovable Cloud (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). **Jangan diedit manual** — di-generate ulang setiap kali backend di-sync.

Buka `http://localhost:5173`, lalu pilih **Sign Up** untuk membuat akun pertama. **User pertama otomatis menjadi ADMIN** (lihat trigger `handle_new_user`); user berikutnya default-nya `VIEWER` dan perlu di-promote oleh admin lewat menu *Manajemen User*.

---

## 📁 Struktur Folder

```
src/
├── App.tsx                       # Root + routing
├── main.tsx                      # Entry point
├── index.css                     # Design tokens (HSL semantic colors)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Layout utama: sidebar + header + outlet
│   │   └── AppSidebar.tsx        # Sidebar collapsible, item difilter per role
│   ├── dashboard/
│   │   └── StatCard.tsx          # Kartu statistik dengan sparkline
│   ├── SignedImage.tsx           # Render foto dari bucket privat (signed URL)
│   └── ui/                       # shadcn/ui components
├── hooks/
│   └── useAuth.tsx               # Provider session + role + profile
├── integrations/supabase/
│   ├── client.ts                 # Auto-generated, jangan diedit
│   └── types.ts                  # Auto-generated dari schema DB
├── lib/
│   └── logger.ts                 # logActivity() — helper insert ke activity_logs
└── pages/
    ├── Login.tsx, Signup.tsx
    ├── Dashboard.tsx             # Halaman home
    ├── Customers.tsx             # Daftar + detail pelanggan
    ├── CustomerNew.tsx           # Form registrasi
    ├── Queue.tsx                 # Antrian teknisi
    ├── Statistics.tsx            # Analitik mendalam
    ├── Profile.tsx               # Profil + statistik pribadi
    ├── Users.tsx                 # Admin-only: ubah role user
    ├── Logs.tsx                  # Timeline aktivitas
    └── Recap.tsx                 # Generator rekap WhatsApp

supabase/
├── config.toml
├── setup.sql                     # SQL lengkap untuk setup database baru
├── reset_data.sql                # SQL reset data operasional tanpa hapus akun
└── migrations/                   # SQL migration berurutan
```

---

## 🗄 Database Schema

Empat tabel utama, semuanya dengan RLS aktif:

- **`profiles`** — data tampilan user (`nama`, `email`). Auto-dibuat lewat trigger `handle_new_user` saat signup. User hanya bisa baca profilnya sendiri; ADMIN/VIEWER bisa baca semua.
- **`user_roles`** — mapping `user_id → role` (ADMIN/SALES/TEKNISI/VIEWER). Disimpan terpisah dari `profiles` **secara sengaja** untuk mencegah privilege escalation. Cek role pakai security definer function `has_role(uid, role)`.
- **`customers`** — data pelanggan (nama, NIK, WA, alamat, area, paket, ODP, jenis, foto KTP, foto rumah, status `Pending|Selesai`, `sales_id`). SALES hanya lihat & edit pelanggan miliknya; ADMIN/VIEWER/TEKNISI lihat semua.
- **`installations`** — catatan pemasangan (ONU SN, redaman dBm, panjang kabel, foto ONU, `teknisi_id`). Hanya bisa dibuat lewat RPC `complete_installation` yang sekaligus mengubah status pelanggan jadi *Selesai*.
- **`activity_logs`** — audit trail (`action`, `details`, `user_id`). Setiap aksi penting dipanggil via `logActivity()`.

Foto disimpan di bucket **privat** `customer-photos`. Path-nya `{user_id}/{prefix}-{timestamp}.{ext}` — RLS storage memastikan user hanya bisa upload ke folder miliknya sendiri.

Kalau project mau dipindahkan ke database baru, jalankan `supabase/setup.sql` sebagai baseline schema. Untuk mengosongkan data demo/operasional tanpa menghapus akun login, jalankan `supabase/reset_data.sql`.

---

## 🔄 Alur Sistem

Skenario standar dari pelanggan masuk sampai selesai dipasang:

1. **Login** — user buka aplikasi, sign in via email/password. Session persist otomatis sampai logout.
2. **Sales mendaftarkan pelanggan** — buka *Daftar Pelanggan*, isi form, upload foto KTP & rumah. Data masuk dengan status `Pending` dan `sales_id = auth.uid()`.
3. **Teknisi membuka antrian** — menu *Antrian Teknisi* menampilkan semua pelanggan `Pending`. Teknisi pilih satu, isi data pemasangan (ONU, redaman, kabel), upload foto ONU.
4. **Pemasangan selesai** — RPC `complete_installation` jalan: insert ke `installations` + update `customers.status = 'Selesai'` dalam satu transaksi.
5. **Admin pantau dashboard** — semua statistik (tren, ranking, completion rate) update otomatis berdasarkan data terbaru.
6. **Rekap harian** — sales/admin buka menu *Rekap WhatsApp*, salin teks yang sudah ter-generate, kirim ke grup.
7. **Audit** — semua langkah di atas masuk ke `activity_logs`, bisa ditelusuri admin kapan saja.

---

## ⚠️ Catatan & Limitasi

Beberapa hal yang sudah disadari tapi belum jadi prioritas:

- **Belum ada notifikasi push** — teknisi harus refresh atau buka antrian sendiri untuk lihat job baru.
- **Realtime subscription dimatikan** untuk tabel sensitif (customers, installations, activity_logs) demi keamanan; data tetap fresh karena ada reload trigger di tiap mutasi, tapi belum benar-benar live antar device.
- **Belum ada export ke Excel/PDF** — rekap masih sebatas teks WhatsApp.
- **Belum ada filter periode di dashboard** — semua chart hard-coded 14 / 30 hari terakhir.
- **Reset password / lupa password** belum ada UI; sementara dilakukan via admin.
- **Mobile app native** belum ada; PWA install bisa, tapi belum dioptimasi penuh untuk offline.

---

## 🗺 Rencana Pengembangan

Beberapa ide yang masuk akal untuk next iteration:

- 📱 **Notifikasi real-time** ke teknisi saat ada pelanggan baru masuk antrian (lewat channel realtime ber-RLS atau push notification).
- 📊 **Analitik lebih dalam** — komisi sales, SLA pemasangan rata-rata per area, prediksi load mingguan.
- 📤 **Export laporan** ke Excel & PDF dengan template branding.
- 🌍 **Multi-area / multi-cabang** — partisi data per cabang dengan role manager cabang.
- 💬 **Integrasi WhatsApp Business API** untuk mengirim notifikasi ke pelanggan otomatis (jadwal teknisi, konfirmasi selesai).
- 🗓 **Scheduling teknisi** — drag & drop kalender untuk assign pemasangan ke teknisi tertentu di slot waktu tertentu.
- 🔐 **2FA** untuk akun admin.

---

## 🙌 Penutup

Project ini lahir dari kebutuhan nyata: tim DG-KOMPUTER yang masih mencatat pelanggan di Excel, mengirim foto KTP via WhatsApp, dan rekap harian yang ditulis manual setiap malam. Tujuan utamanya bukan bikin sistem yang sempurna, tapi yang **benar-benar dipakai** — cukup ringan untuk teknisi yang sambil di lapangan, cukup informatif untuk admin yang merencanakan strategi, dan cukup aman supaya data pelanggan tidak bocor ke mana-mana.

Kalau ada masukan, bug, atau ide fitur baru, silakan buka issue. Selamat memakai 🚀