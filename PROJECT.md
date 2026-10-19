# FitLearn — Dokumen Proyek (Sumber Kebenaran untuk Proposal)

> Dokumen ini ditujukan untuk membantu menyusun **proposal skripsi / artikel ilmiah**.
> Isinya menjelaskan APA itu FitLearn, arsitektur, fitur, teknologi, dan hubungannya
> dengan FitWork. Semua yang tertulis di sini mencerminkan kondisi kode nyata di repo
> `fitlearn-frontend` (bukan rencana). Bagian yang masih berupa asumsi/placeholder
> ditandai dengan **[PERLU DIISI]**.

---

## 1. Ringkasan Singkat

**FitLearn** adalah **sistem pemantauan kesehatan pelajar** berbasis web yang memantau
kondisi pelajar selama aktivitas belajar secara **objektif dan non-invasif**, lalu
menyajikannya dalam antarmuka **gamifikasi yang ramah pelajar**.

FitLearn mengintegrasikan tiga lapisan teknologi:
1. **Computer Vision di sisi klien** (MediaPipe di browser) — ekstraksi kondisi visual
   (kelelahan mata/PERCLOS, kedipan, dilatasi pupil, postur, ekspresi) tanpa video keluar
   dari perangkat pelajar. Detak jantung tidak lagi diestimasi dari kamera (rPPG dihapus)
   karena sudah diukur langsung oleh gelang IoT.
2. **Machine Learning (XGBoost) di backend** — klasifikasi tingkat risiko/kelelahan dari
   fitur numerik gabungan.
3. **IoT wearable (ESP32)** — sensor fisiologis & lingkungan (detak jantung/SpO2,
   suhu/kelembapan, kualitas udara). *(Detak jantung & SpO2 dari gelang ESP32-C3 + MAX30102
   dan unit ruangan Wemos D1 Mini (DHT11 + MQ135) sudah terhubung ke backend dan tampil
   di aplikasi. Sensor DHT11 yang terpasang sekarang rusak, sehingga suhu & kelembapan
   diisi data simulasi oleh firmware dan ditandai `suhu_dummy = true`.)*

FitLearn adalah **turunan (fork) dari FitWork** — aplikasi serupa untuk pekerja remote.
FitLearn menggunakan **backend & database yang sama persis** dengan FitWork; yang berbeda
hanya **lapisan frontend** (branding, tone bahasa pelajar, tema visual, dan gamifikasi).

---

## 2. Hubungan FitLearn ↔ FitWork (penting untuk metodologi)

| Aspek | FitWork | FitLearn |
|---|---|---|
| Target pengguna | Pekerja remote | **Pelajar** |
| Backend (FastAPI) | `fitwork-api` di Railway | **sama persis (shared)** |
| Database & Auth (Supabase) | 1 project | **sama persis (shared)** |
| Model ML (XGBoost) | `fitwork_model.pkl` | **sama** (via backend) |
| Computer Vision | MediaPipe (klien) | **sama** |
| Frontend | React SPA korporat | **React SPA gamifikasi ramah pelajar** |
| Bahasa/tone | "sesi kerja", "jam kerja" | **"sesi belajar", "jam belajar", XP, level, streak** |
| Tema visual | Teal/hijau korporat | **Indigo/violet + amber, membulat, playful** |

**Konsekuensi metodologis:** karena backend & DB identik, kontribusi kebaruan FitLearn
berada pada **adaptasi domain (pelajar)** dan **perancangan UX gamifikasi untuk mendukung
kesadaran kesehatan pelajar**, bukan pada algoritma ML-nya.

---

## 3. Arsitektur Sistem (3 Lapisan, Client-Server via REST API)

```
┌───────────────────────── LAPISAN KLIEN (browser pelajar) ──────────────────────────┐
│  React 19 SPA (Vite)                                                                 │
│  ├── Computer Vision: MediaPipe (useFaceVitals) → PERCLOS, kedip, postur, ekspresi   │
│  ├── Activity Monitor: keyboard/mouse (useActivityMonitor)                           │
│  └── Dashboard gamifikasi (level/XP/streak/badge/quest)                              │
│         │  hanya ANGKA hasil ekstraksi yang dikirim (video tidak pernah keluar)      │
└─────────┼───────────────────────────────────────────────────────────────────────────┘
          │ HTTPS (REST) + WSS (WebSocket)
┌─────────▼───────────────────── LAPISAN BACKEND (Railway) ───────────────────────────┐
│  FastAPI (fitwork-api)                                                                │
│  ├── POST /healthscore   → skor kesehatan/risiko                                      │
│  ├── POST /assess        → asesmen                                                    │
│  ├── WS   /ws/vitals      → push vitals real-time (fallback polling bila gagal)       │
│  ├── POST /iot/vitals     → terima data gelang IoT (HR & SpO2, header X-Device-Key)   │
│  ├── GET  /iot/vitals/{user_id}/terbaru → riwayat data gelang                         │
│  ├── POST /iot/room       → data unit ruangan (suhu, kelembapan, MQ135, suhu_dummy)   │
│  ├── GET  /iot/room/{user_id}/terbaru → riwayat data ruangan                          │
│  └── Model XGBoost (fitwork_model.pkl) untuk klasifikasi                              │
└─────────┬───────────────────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────── LAPISAN DATA (Supabase) ─────────────────────────────┐
│  Postgres + Auth                                                                      │
│  ├── auth.users            → autentikasi (email/password, opsi Google)               │
│  ├── public.profiles       → profil (full_name, job_title→"Kelas", company→"Sekolah")│
│  ├── public.daily_stats    → statistik harian (focus/stress/fatigue/work_seconds)    │
│  │      + RPC add_health_sample (akumulasi sampel per hari)                          │
│  ├── public.iot_vitals     → data gelang (heart_rate, spo2, recorded_at)             │
│  └── public.iot_room       → data ruangan (suhu, kelembapan, suhu_dummy, gas_ppm)    │
└──────────────────────────────────────────────────────────────────────────────────────┘

Gelang IoT (ESP32-C3 + MAX30102) → HTTP POST /iot/vitals tiap ±15 detik → backend
  → simpan ke iot_vitals → push WebSocket ke dashboard (kartu "Gelang FitLearn")
Unit ruangan (Wemos D1 Mini: DHT11 + MQ135) → HTTP POST /iot/room tiap ±30 detik → backend
  → simpan ke iot_room → push WebSocket ke dashboard (panel "Unit ruangan")
```

---

## 4. Alur Proses (4 Tahap)

1. **Akuisisi** — MediaPipe mengekstrak fitur visual dari webcam di browser; (opsional)
   wearable membaca sensor periodik.
2. **Pengiriman & Pra-pemrosesan** — data numerik (JSON) dikirim via HTTP/WebSocket ke
   backend; dinormalisasi & divalidasi (termasuk penanganan "wajah tak terdeteksi" agar
   tidak menampilkan angka palsu — vitals ditandai N/A).
3. **Analisis**: vektor fitur (sinyal kamera + detak jantung dari gelang) diproses model
   XGBoost → skor fokus/stres/kelelahan. Lalu aturan keputusan (`src/lib/healthRules.js`)
   menggabungkan skor ML, data gelang, sinyal kamera, lama sesi, dan aktivitas menjadi
   status kondisi + alasan + tindakan (lihat bagian 6, "Pengambilan Keputusan").
4. **Penyajian** — hasil ditampilkan di dashboard gamifikasi + peringatan istirahat saat
   ambang terlampaui; statistik diakumulasi ke `daily_stats` (reset per hari).

---

## 5. Tumpukan Teknologi (Tech Stack)

**Frontend (repo ini):**
- React 19 + Vite 8 (SPA)
- Tailwind CSS 4 (tema via CSS custom properties di `src/index.css`)
- `motion` (animasi), `recharts` (grafik), `lucide-react` (ikon — **tanpa emoji**)
- Font: **Baloo 2** (display, ramah) + Inter (body) + JetBrains Mono (angka)
- MediaPipe (computer vision di sisi klien)
- `@supabase/supabase-js` (auth + data)

**Backend (shared, repo `fitwork-api`):**
- Python + FastAPI, di-deploy ke **Railway**
- Model **XGBoost** terserialisasi (`fitwork_model.pkl`)
- Endpoint: `/healthscore`, `/assess`, `/ws/vitals`, `/iot/vitals`,
  `/iot/vitals/{user_id}/terbaru`, `/iot/room`, `/iot/room/{user_id}/terbaru`

**Database & Auth (shared):** Supabase (Postgres + Auth)

**Deployment:** Frontend → **Vercel**; Backend → **Railway**; DB → **Supabase**

---

## 6. Fitur Utama

### Halaman aplikasi
- **Dashboard**: dibaca dari atas ke bawah: sapaan & level; **Kondisi saat ini**
  (keputusan + alasan + tombol istirahat); **Data langsung** per sumber (gelang IoT,
  analisis ML, kamera, aktivitas) lengkap dengan status dan batas normal tiap metrik;
  ringkasan **Hari ini**; **Tren** (sesi ini, 7 hari, detak jantung & SpO2 gelang);
  dan **Progres belajar** (streak, misi harian, lencana).
- **Monitor Kesehatan**: kamera live + MediaPipe; vitals langsung (kedipan, PERCLOS,
  dilatasi pupil, postur, tegang wajah), lini masa kejadian (termasuk data gelang), dan kartu
  **Gelang FitLearn** (detak jantung & SpO2 dari gelang IoT secara real-time, status
  terhubung, tren 20 data terakhir). Data gelang disimpan terpisah dari data kamera,
  sehingga tidak ikut masuk ke `daily_stats`.
- **Riwayat** — rekap harian (tersimpan di Supabase `daily_stats`), grafik tren 14 hari.
- **Asesmen** — kuesioner → skor via backend `/assess`.
- **Rekomendasi** — saran personal berbasis sesi + ekspor PDF.
- **AI Advisor** — insight & tips ramah pelajar.
- **Monitor Aktivitas** — statistik ketikan & gerak mouse selama sesi belajar.
- **Pengaturan** — profil (Kelas/Sekolah), privasi kamera, durasi istirahat, bahasa (ID/EN).

### Pengambilan Keputusan (gelang IoT + kamera + ML + aktivitas)
Semua sumber digabung oleh `src/lib/healthRules.js` (satu tempat, dipakai Dashboard,
AI Advisor, Rekomendasi, notifikasi, dan saran istirahat saat sesi):

| Sumber | Sinyal | Peringatan | Perlu tindakan |
|---|---|---|---|
| Gelang IoT | Detak jantung (rata-rata 3 bacaan terakhir) | > 100 atau < 50 bpm | ≥ 120 bpm |
| Gelang IoT | SpO2 (rata-rata 3 bacaan terakhir) | < 95% | < 92% |
| Model ML | Stres / kelelahan (0 sampai 100) | > 40 | > 65 / > 60 |
| Model ML | Fokus | < 50 | |
| Kamera | PERCLOS, kedipan, postur, tegang wajah | di atas/bawah ambang | |
| Unit ruangan | Suhu | > 30 C atau < 18 C | |
| Unit ruangan | Kelembapan | > 70% atau < 40% | |
| Unit ruangan | Kualitas udara (estimasi MQ135) | > 1000 ppm | |
| Sesi & aktivitas | Lama sesi, mengetik tanpa jeda | > 2,5 jam, status sibuk | |

Keputusan: ada sinyal "perlu tindakan" → **istirahat 10 menit**; ≥ 2 peringatan →
**istirahat 5 menit**; 1 peringatan → **perbaiki sesuai saran**; semua normal → **lanjut**.
Detak jantung gelang juga dikirim ke backend sehingga skor ML memakai detak jantung
nyata. Saat sesi belajar, SpO2 < 92% atau detak jantung ≥ 120 bpm memunculkan saran
istirahat; detak jantung/SpO2 di luar normal juga masuk notifikasi.

**Data simulasi tidak dipakai keputusan.** Suhu & kelembapan bertanda `suhu_dummy = true`
(firmware mengisi data simulasi karena DHT11 rusak) hanya ditampilkan dengan label
"simulasi" dan tidak dinilai (`IZINKAN_SIMULASI_DI_KEPUTUSAN = false` di
`healthRules.js`). Kualitas udara MQ135 tetap data asli sehingga tetap dinilai.

### Sistem Gamifikasi (kebaruan UX FitLearn)
Dihitung **murni dari data yang sudah ada** (`daily_stats`) — **tanpa tabel/skema baru**
di Supabase (lihat `src/lib/gamification.js`):
- **XP** — dari skor fokus, jam belajar, ketenangan, dan "hadir belajar" per hari.
- **Level** — kurva kuadratik (`50·L·(L−1)`), judul: Pemula → Penjelajah → … → Bintang.
- **Streak** — jumlah hari belajar beruntun (+ rekor terbaik).
- **Quest harian** — target fokus 70, belajar 2 jam, 3 istirahat sehat.
- **Badge** — 8 pencapaian (Langkah Pertama, Si Fokus, Api 3 Hari, Kutu Buku, Sang Juara, dll.).

### Privacy-first
Seluruh pemrosesan video terjadi **di browser** (MediaPipe). Hanya **angka hasil ekstraksi**
yang dikirim ke server — video tidak pernah meninggalkan perangkat pelajar. Ini menjawab
kekhawatiran privasi pada pemantauan berbasis kamera untuk populasi pelajar.

---

## 7. Desain UI/UX Ramah Pelajar

- **Palet**: primary indigo/violet `#5B4BE6`, accent amber `#FF9E45`, mint `#22C7B8`,
  danger coral `#FF5C7A` (lebih lembut dari merah), background lilac-white.
- **Bentuk**: sudut sangat membulat (`rounded-3xl`), kartu besar, tombol chunky.
- **Font display**: Baloo 2 (bulat & ramah).
- **Ikon**: seluruhnya `lucide-react` — **nol emoji**, agar terlihat profesional & bukan
  kesan "AI-generated".
- **Bilingual**: Bahasa Indonesia (default) & English.
- **Dark mode**: didukung penuh.

---

## 8. Struktur Repositori (frontend)

```
fitlearn-frontend/
├── src/
│   ├── App.jsx                    # shell: sidebar/navbar responsif + router layar
│   ├── index.css                  # @theme token warna/radius/font (sumber tema)
│   ├── components/
│   │   ├── Dashboard.jsx          # dashboard gamifikasi
│   │   ├── gamified.jsx           # komponen game: HeroPanel, LevelBar, StreakCard, dll.
│   │   ├── shared.jsx             # Card, MetricCard, GaugeRing, PageHeader, Logo, dll.
│   │   ├── HealthMonitoring.jsx   # kamera + vitals + lini masa
│   │   ├── History.jsx / Assessment.jsx / Recommendations.jsx / AIAdvisor.jsx
│   │   ├── ActivityMonitor.jsx / Settings.jsx / Onboarding.jsx
│   │   └── BreakModal.jsx / FocusModal.jsx / NotificationBell.jsx
│   ├── context/                   # provider: Auth, Health, DailyStats, WorkSession, Break, Notif
│   ├── hooks/                     # useFaceVitals (CV), useActivityMonitor, useHealthData
│   ├── lib/                       # gamification.js, supabase.js, breakPrefs.js, breakStats.js
│   ├── i18n/                      # translations.js (ID/EN) + LanguageProvider
│   └── styles/                    # fitlearn.css, fonts.css
├── SUPABASE_SETUP.md              # setup tabel & auth (shared dengan FitWork)
├── .env.example                   # template environment
└── vercel.json                    # SPA rewrite untuk Vercel
```

---

## 9. Konfigurasi & Environment

Semua koneksi backend lewat environment variable (lihat `.env.example`):

| Variable | Fungsi |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Auth + database (shared) |
| `VITE_API_URL` | FastAPI `/healthscore` (shared, di Railway). Alamat dasarnya juga dipakai untuk data gelang (`/iot/vitals/...`) |
| `VITE_WS_URL` | WebSocket vitals real-time (`wss://` di production) |
| `VITE_PERCLOS_THRESHOLD` | Ambang kelelahan mata |
| `VITE_ENABLE_*` | Feature flags (eye-tracking, gesture, AI) |

**Deployment checklist:**
1. Vercel: import repo, isi env vars (sama dengan project FitWork).
2. Supabase → Auth → URL Configuration → tambahkan domain FitLearn ke **Redirect URLs**.
3. Railway: CORS sudah mengizinkan `*.vercel.app` via `CORS_ORIGIN_REGEX` (tidak perlu diubah).

---

## 10. Cara Menjalankan (Lokal)

```bash
npm install
cp .env.example .env      # isi kredensial (shared dengan FitWork)
npm run dev               # http://localhost:5173
npm run build             # build produksi ke dist/
```

---

## 11. Pengujian (untuk bagian Hasil pada artikel)

Metode **black-box** terhadap fungsi utama (bisa dilakukan mandiri tanpa responden):

| No | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Wearable/klien mengirim data sensor ke backend | Diterima & tersimpan di Supabase |
| 2 | Computer vision mengekstrak kondisi visual via kamera | Vitals tampil sesuai kondisi aktual |
| 3 | Model ML menghasilkan prediksi tingkat risiko | Prediksi tampil dengan kategori sesuai |
| 4 | Dashboard menampilkan data real-time | Grafik & indikator diperbarui sesuai interval |
| 5 | Sistem memberi peringatan istirahat saat ambang terlampaui | Notifikasi muncul sesuai ambang |
| 6 | Gamifikasi (level/XP/streak/badge) terhitung dari riwayat | Sesuai akumulasi `daily_stats` |

**[PERLU DIISI]** kolom Hasil Aktual & Status setelah pengujian dijalankan.

---

## 12. Keterbatasan & Rencana Lanjut

**Keterbatasan:**
- Baru tahap perancangan & pengembangan; efektivitas/penerimaan pelajar belum dievaluasi.
- Akurasi MAX30102 (detak jantung & SpO2) dipengaruhi posisi gelang dan gerakan tangan;
  ambang keputusan bersifat umum (bukan alat diagnosis medis).
- Sensor MQ135 (IoT) hanya menghasilkan indeks kualitas udara relatif (perlu pemanasan
  dan kalibrasi R0); nilai ppm adalah estimasi.
- Sensor DHT11 pada unit ruangan rusak; suhu & kelembapan saat ini data simulasi
  (bertanda `suhu_dummy`) dan **tidak boleh dilaporkan sebagai hasil pengukuran**.
- Data pelajar & pekerja berbagi satu Supabase (bisa dipisah bila diperlukan).

**Rencana lanjut:**
- Evaluasi pengguna: **System Usability Scale (SUS)** + adaptasi **Technology Acceptance
  Model (TAM)**.
- Validasi akurasi sensor terhadap alat ukur pembanding.
- Mengganti sensor DHT11 yang rusak supaya suhu & kelembapan ruangan kembali data asli
  (firmware otomatis berhenti memakai data simulasi begitu DHT terbaca).

---

## 13. Referensi Metadata

- **Nama proyek:** FitLearn (usulan; sesuaikan arahan pembimbing)
- **Repo frontend:** `github.com/rchannie/fitlearn-frontend`
- **Repo backend (shared):** `fitwork-api` (FastAPI, Railway)
- **Pendekatan penelitian:** Research and Development (R&D), dibatasi tahap perancangan &
  pengembangan.
- **[PERLU DIISI]:** nama pembimbing/co-author, email korespondensi, total biaya komponen
  wearable, interval baca sensor, dataset & jumlah data pelatihan XGBoost.
