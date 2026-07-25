# Setup Supabase Auth — FitLearn (shared dengan FitWork)

Panduan menghubungkan login FitLearn ke Supabase (project yang SAMA dengan FitWork). Estimasi 5–10 menit.

---

## 1. Buat project Supabase
1. Buka https://supabase.com → **Sign in** (pakai GitHub/Google).
2. **New project**:
   - **Name**: `fitlearn` (bebas — atau pakai project FitWork yang sudah ada)
   - **Database Password**: buat & **simpan** (untuk akses DB, bukan untuk login app).
   - **Region**: `Southeast Asia (Singapore)` (paling dekat).
3. Tunggu ±1–2 menit sampai project siap.

## 2. Ambil URL & anon key
1. Di project → ikon gerigi **Project Settings** (kiri bawah) → **API**.
2. Salin dua nilai:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **Project API keys → `anon` `public`** → string panjang `eyJ...`
   > Pakai key **anon public**, JANGAN `service_role` (itu rahasia, jangan ditaruh di frontend).

## 3. Tempel ke `.env`
Buka file `.env` di folder `fitlearn-frontend`, isi:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...isi-anon-key
```
**Penting:** setelah mengubah `.env`, **restart** dev server (`Ctrl+C` lalu `npm run dev`). Vite hanya membaca `.env` saat start.

## 4. Buat tabel profil + trigger (WAJIB agar Settings bisa simpan profil)
Di Supabase → menu **SQL Editor** → **New query** → tempel semua di bawah → **Run**:

```sql
-- Tabel profil (1 baris per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  job_title text,
  company text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Keamanan: tiap user hanya bisa baca/tulis profilnya sendiri
alter table public.profiles enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-buat baris profil saat user mendaftar (ambil nama dari signup)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 4b. Tabel riwayat harian (untuk halaman Riwayat / Dashboard 7 hari)
Masih di **SQL Editor** → **New query** → tempel semua → **Run**:

```sql
-- Statistik harian: 1 baris per user per tanggal (akumulasi sum + jumlah sampel)
create table if not exists public.daily_stats (
  user_id      uuid    not null references auth.users(id) on delete cascade,
  day          date    not null,
  focus_sum    numeric not null default 0,
  stress_sum   numeric not null default 0,
  fatigue_sum  numeric not null default 0,
  samples      integer not null default 0,
  work_seconds integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_stats enable row level security;

drop policy if exists "Users manage own daily stats" on public.daily_stats;
create policy "Users manage own daily stats" on public.daily_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tambah satu sampel skor ke baris hari ini secara atomik (rata-rata = sum/samples)
create or replace function public.add_health_sample(
  p_day date, p_focus numeric, p_stress numeric, p_fatigue numeric, p_seconds int
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.daily_stats (user_id, day, focus_sum, stress_sum, fatigue_sum, samples, work_seconds, updated_at)
  values (auth.uid(), p_day, p_focus, p_stress, p_fatigue, 1, p_seconds, now())
  on conflict (user_id, day) do update set
    focus_sum    = daily_stats.focus_sum    + excluded.focus_sum,
    stress_sum   = daily_stats.stress_sum   + excluded.stress_sum,
    fatigue_sum  = daily_stats.fatigue_sum  + excluded.fatigue_sum,
    samples      = daily_stats.samples      + 1,
    work_seconds = daily_stats.work_seconds + excluded.work_seconds,
    updated_at   = now();
end; $$;
```

Tanpa langkah ini, halaman **Riwayat** menampilkan "belum ada riwayat" dan kartu 7 hari di Dashboard kosong (app tetap jalan normal).

## 5. Atur konfirmasi email (untuk demo)
Default Supabase mewajibkan **konfirmasi email** saat daftar. Untuk demo cepat tanpa cek email:
- **Authentication → Sign In / Providers → Email** → matikan **Confirm email** → **Save**.
- (Kalau dibiarkan ON, setelah daftar user harus klik link di email dulu baru bisa login. App akan menampilkan pesan "Cek emailmu untuk konfirmasi".)

## 6. (Opsional) Login Google
1. **Authentication → Sign In / Providers → Google** → toggle **Enable**.
2. Butuh **Client ID** & **Client Secret** dari Google Cloud Console (OAuth consent + Credentials → OAuth client → Web).
3. Di Google, tambahkan **Authorized redirect URI**:
   `https://xxxxx.supabase.co/auth/v1/callback`
4. Simpan. Tanpa langkah ini, tombol "Lanjut dengan Google" akan error.

## 7. (Saat deploy) Redirect URL
Supabase → **Authentication → URL Configuration**:
- **Site URL**: URL produksi kamu, mis. `https://gentle-coast-0b709aa00.7.azurestaticapps.net`
- **Redirect URLs**: tambahkan juga `http://localhost:5173` untuk dev.

---

## Cek berhasil
1. `npm run dev` → buka app → klik **Daftar sekarang** → isi nama/email/password → **Daftar**.
2. Kalau "Confirm email" OFF → langsung masuk; greeting Dashboard pakai nama kamu.
3. Buka **Settings → Akun** → ubah Job title/Company → **Simpan** → reload → masih tersimpan. ✅

## Troubleshooting
- **Halaman Login bilang "Supabase belum dikonfigurasi"** → `.env` belum keisi / dev server belum di-restart.
- **"Invalid login credentials"** → email/password salah, atau email belum dikonfirmasi (lihat langkah 5).
- **Simpan profil gagal** → tabel `profiles` belum dibuat (ulangi langkah 4).
- Env Supabase **tidak boleh** di-commit ke git publik (anon key aman dipakai di browser, tapi tetap rapikan via Static Web App settings saat deploy).
