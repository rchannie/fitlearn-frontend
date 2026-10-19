# FitLearn — Sistem Pemantauan Kesehatan Pelajar

FitLearn adalah aplikasi web pemantauan kesehatan **untuk pelajar** yang memadukan
computer vision (eye-tracking / postur di sisi klien), analisis kesehatan real-time,
dan perangkat IoT wearable. Aplikasi ini merupakan turunan dari FitWork dengan UI/UX
yang dirancang lebih ramah untuk anak sekolah.

> **Backend & database dibagikan (shared) dengan FitWork:** FitLearn menggunakan
> Supabase project dan FastAPI backend yang **sama persis**. Perbedaan hanya pada
> lapisan frontend (branding, tone bahasa pelajar, dan tema visual).

## Teknologi

- **React 19 + Vite** — SPA frontend
- **Tailwind CSS 4** — desain & tema (token di `src/index.css`)
- **Supabase** — autentikasi + database (shared)
- **FastAPI** — REST API + WebSocket vitals (shared)
- **MediaPipe** — computer vision di sisi klien (privacy-first)
- **Recharts** — grafik dashboard

## Menjalankan

```bash
npm install
cp .env.example .env   # isi kredensial (sudah shared dengan FitWork)
npm run dev
```

Buka http://localhost:5173

## Konfigurasi

Semua koneksi backend dibaca dari environment variable (lihat `.env.example`):

| Variable | Fungsi |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Auth + database (shared) |
| `VITE_API_URL` | FastAPI health-score endpoint (shared). Alamat dasarnya juga dipakai untuk data gelang IoT |
| `VITE_WS_URL` | WebSocket vitals real-time (shared). Saat login otomatis ditambah `?user_id=` agar ikut menerima data gelang |

## Menjalankan lokal bersama backend (fitwork-api)

1. Jalankan backend di folder `fitwork-api` (lihat README di sana), port 8000.
2. Di `.env` frontend, arahkan ke backend lokal lalu restart `npm run dev`:

   ```env
   VITE_API_URL=http://localhost:8000/healthscore
   VITE_WS_URL=ws://localhost:8000/ws/vitals
   ```

3. Login, buka **Monitor Kesehatan**. Kartu **Gelang FitLearn** ada di bagian bawah.

## Data gelang IoT

Gelang (ESP32-C3 + MAX30102) mengirim detak jantung & SpO2 ke backend
`POST /iot/vitals`. Frontend menerimanya dari backend yang sama:

- **Real-time**: pesan WebSocket `/ws/vitals?user_id=<id akun>` dengan `source: "iot"`.
- **Riwayat awal / fallback**: `GET /iot/vitals/{user_id}/terbaru?limit=20`
  (dipolling tiap 15 detik bila WebSocket tidak tersambung).

Data gelang disimpan terpisah dari data kamera (`wearable` di `HealthProvider`),
jadi tidak ikut tercatat ke `daily_stats` atau gamifikasi. Detak jantung dan SpO2
hanya diukur gelang (estimasi detak jantung lewat kamera/rPPG sudah dihapus).

## Data unit ruangan

Unit ruangan (Wemos D1 Mini: DHT11 + MQ135) mengirim ke `POST /iot/room`; frontend
menerimanya lewat WebSocket (`source: "iot_room"`) dan `GET /iot/room/{user_id}/terbaru`.
Bila `suhu_dummy` bernilai `true`, suhu dan kelembapan diberi penanda **simulasi**
dan tidak dipakai untuk keputusan (kualitas udara MQ135 tetap dinilai).

## Pengambilan keputusan

`src/lib/healthRules.js` menggabungkan gelang, kamera, skor ML, lama sesi, dan
aktivitas menjadi status kondisi, alasan, dan tindakan (lanjut / perbaiki /
istirahat 5 atau 10 menit). Hasilnya dipakai Dashboard, AI Advisor, Rekomendasi,
notifikasi, dan saran istirahat selama sesi. Ambang ada di `THRESHOLDS` pada file
yang sama. Saat gelang belum
pernah mengirim data, kartu menampilkan ID akun untuk diisi sebagai `user_id`
di firmware.

## Struktur

- `src/components` — halaman & UI
- `src/context` — provider (auth, sesi, notifikasi, health)
- `src/i18n` — terjemahan (ID default, EN alternatif)
- `src/styles` — tema & font
- `src/hooks` — computer vision & activity monitor
- `src/lib/iot.js`: helper data gelang IoT (URL, normalisasi, fetch riwayat)
