/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useHealth } from "./HealthProvider";

/**
 * DailyStatsProvider — riwayat kesehatan per HARI di Supabase.
 *
 * Selama sesi LIVE (kamera → backend menghasilkan skor), tiap interval app
 * mengirim satu sampel skor ke RPC `add_health_sample` yang menambah
 * (akumulasi) ke baris hari ini. Rata-rata harian = sum / samples.
 *
 * "Reset per hari" terjadi otomatis: data dikunci per tanggal (lokal), jadi
 * ganti hari = baris baru, dan Dashboard cukup membaca baris hari ini.
 *
 * Butuh: tabel `daily_stats` + fungsi `add_health_sample` (lihat SUPABASE_SETUP.md).
 */

const DailyStatsContext = createContext(null);

const WRITE_INTERVAL_MS = 30000; // simpan satu sampel tiap 30 detik saat live
const HISTORY_DAYS = 30;

/** Tanggal LOKAL "YYYY-MM-DD" (bukan UTC) agar "per hari" sesuai zona pengguna. */
export function localDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rowToStat(row) {
  const s = row.samples || 0;
  return {
    day: row.day,
    focus: s ? Math.round(row.focus_sum / s) : null,
    stress: s ? Math.round(row.stress_sum / s) : null,
    fatigue: s ? Math.round(row.fatigue_sum / s) : null,
    workHours: row.work_seconds ? Number((row.work_seconds / 3600).toFixed(1)) : 0,
    samples: s,
  };
}

export function DailyStatsProvider({ children }) {
  const { user } = useAuth();
  const { data, isLive } = useHealth();
  const enabled = isSupabaseConfigured && !!user;

  const [history, setHistory] = useState([]); // urut menaik berdasarkan tanggal
  const [loading, setLoading] = useState(enabled);

  // Ref agar penulis berkala selalu memakai data live terbaru tanpa reset timer.
  const liveRef = useRef({ data, isLive });
  useEffect(() => { liveRef.current = { data, isLive }; }, [data, isLive]);

  const visibleHistory = useMemo(() => (enabled ? history : []), [enabled, history]);
  const today = localDay();
  const todayStat = visibleHistory.find((h) => h.day === today) || null;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const since = localDay(new Date(Date.now() - (HISTORY_DAYS - 1) * 86400000));
    const { data: rows, error } = await supabase
      .from("daily_stats")
      .select("day, focus_sum, stress_sum, fatigue_sum, samples, work_seconds")
      .gte("day", since)
      .order("day", { ascending: true });
    if (!error && rows) setHistory(rows.map(rowToStat));
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    (async () => { await refresh(); })();
  }, [enabled, refresh]);

  // Penulisan berkala: hanya saat LIVE & ada skor nyata.
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = setInterval(async () => {
      const { data: d, isLive: live } = liveRef.current;
      if (!live || !d || d.focusScore == null) { last = Date.now(); return; }
      const now = Date.now();
      let secs = Math.round((now - last) / 1000);
      last = now;
      secs = Math.max(1, Math.min(secs, (WRITE_INTERVAL_MS / 1000) * 2));
      const { error } = await supabase.rpc("add_health_sample", {
        p_day: localDay(),
        p_focus: d.focusScore,
        p_stress: d.stressLevel ?? 0,
        p_fatigue: d.fatigueScore ?? 0,
        p_seconds: secs,
      });
      if (!error) refresh();
    }, WRITE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  const value = useMemo(
    () => ({ today: todayStat, history: visibleHistory, loading: enabled ? loading : false, enabled, refresh }),
    [todayStat, visibleHistory, loading, enabled, refresh]
  );

  return <DailyStatsContext.Provider value={value}>{children}</DailyStatsContext.Provider>;
}

export function useDailyStats() {
  const ctx = useContext(DailyStatsContext);
  if (!ctx) throw new Error("useDailyStats harus dipakai di dalam <DailyStatsProvider>");
  return ctx;
}

export default DailyStatsProvider;
