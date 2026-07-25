import { useEffect, useState } from "react";

/**
 * Pelacak kepatuhan istirahat per HARI (disimpan di localStorage, reset
 * otomatis saat ganti tanggal karena key memakai tanggal lokal).
 *
 *   recommended = berapa kali dorongan "Ayo Fokus" / istirahat muncul
 *   taken       = berapa kali pengguna benar-benar membuka layar istirahat
 *   compliance  = taken / recommended (%), 100% bila belum ada dorongan
 *
 * Dipakai Dashboard agar "kepatuhan istirahat" memakai angka NYATA,
 * bukan placeholder dari backend.
 */

const PREFIX = "fitlearn:breaks:";

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${PREFIX}${y}-${m}-${day}`;
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(dayKey())) || { recommended: 0, taken: 0 };
  } catch {
    return { recommended: 0, taken: 0 };
  }
}

function write(v) {
  try { localStorage.setItem(dayKey(), JSON.stringify(v)); } catch { /* abaikan */ }
}

const listeners = new Set();
function emit() { listeners.forEach((fn) => fn()); }

export function recordBreakRecommended() { const v = read(); v.recommended += 1; write(v); emit(); }
export function recordBreakTaken() { const v = read(); v.taken += 1; write(v); emit(); }

export function getBreakStats() {
  const v = read();
  const compliance = v.recommended > 0 ? Math.min(100, Math.round((v.taken / v.recommended) * 100)) : 100;
  return { recommended: v.recommended, taken: v.taken, compliance };
}

export function subscribeBreakStats(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Hook reaktif untuk komponen (re-render saat statistik istirahat berubah). */
export function useBreakStats() {
  const [stats, setStats] = useState(getBreakStats);
  useEffect(() => subscribeBreakStats(() => setStats(getBreakStats())), []);
  return stats;
}
