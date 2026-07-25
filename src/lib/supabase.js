import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase tunggal untuk seluruh aplikasi.
 *
 * Kredensial dibaca dari .env (Vite):
 *   VITE_SUPABASE_URL       = https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  = public anon key
 *
 * Bila belum diisi, `supabase` = null dan `isSupabaseConfigured` = false,
 * sehingga UI bisa menampilkan pesan "belum dikonfigurasi" alih-alih crash.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;
