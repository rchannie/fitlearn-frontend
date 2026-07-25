/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);

const initialsOf = (name) =>
  (name || "U").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/**
 * Gabungkan info auth (user) + baris tabel `profiles` (row) jadi satu profil.
 * Tabel `profiles` adalah sumber kebenaran untuk field yang bisa diedit
 * (nama/jabatan/perusahaan); user_metadata jadi fallback bila baris belum ada.
 */
function buildProfile(user, row) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const fullName = row?.full_name || meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "User");
  return {
    id: user.id,
    email: user.email,
    fullName,
    initials: initialsOf(fullName),
    jobTitle: row?.job_title || meta.job_title || "",
    company: row?.company || meta.company || "",
    avatarUrl: row?.avatar_url || meta.avatar_url || null,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileRow, setProfileRow] = useState(null);
  const user = session?.user ?? null;

  // Ambil baris profil dari DB (diam saja bila tabel belum dibuat).
  const loadProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured || !userId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, job_title, company, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (!error) setProfileRow(data || null);
  }, []);

  useEffect(() => {
    // loading sudah false saat tak terkonfigurasi (state awal = isSupabaseConfigured).
    if (!isSupabaseConfigured) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session?.user) loadProfile(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user) loadProfile(newSession.user.id);
      else setProfileRow(null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) return { error: { message: "not-configured" } };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!isSupabaseConfigured) return { error: { message: "not-configured" } };
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: { message: "not-configured" } };
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfileRow(null);
  }, []);

  /** Simpan/ubah profil ke tabel `profiles` (upsert), lalu muat ulang. */
  const updateProfile = useCallback(async (fields) => {
    if (!isSupabaseConfigured || !user) return { error: { message: "not-configured" } };
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() });
    if (!error) await loadProfile(user.id);
    return { error };
  }, [user, loadProfile]);

  const value = useMemo(() => ({
    session,
    user,
    profile: buildProfile(user, profileRow),
    isAuthenticated: Boolean(user),
    isConfigured: isSupabaseConfigured,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
  }), [session, user, profileRow, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

export default AuthProvider;
