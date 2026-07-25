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
| `VITE_API_URL` | FastAPI health-score endpoint (shared) |
| `VITE_WS_URL` | WebSocket vitals real-time (shared) |

## Struktur

- `src/components` — halaman & UI
- `src/context` — provider (auth, sesi, notifikasi, health)
- `src/i18n` — terjemahan (ID default, EN alternatif)
- `src/styles` — tema & font
- `src/hooks` — computer vision & activity monitor
