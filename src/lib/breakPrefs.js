import { useEffect, useState } from "react";

/**
 * Preferensi durasi istirahat (disimpan di localStorage agar jadi default
 * lintas sesi). Dipakai BreakModal (durasi awal hitung mundur) & Settings
 * (slider/pilihan menit). Reaktif lewat subscribe → useBreakDuration.
 */

const KEY = "fitlearn:break-minutes";
const DEFAULT_MINUTES = 5;
const MIN = 1;
const MAX = 60;

export const BREAK_PRESETS = [5, 10, 15, 20];

function clamp(n) {
  if (!Number.isFinite(n)) return DEFAULT_MINUTES;
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

export function getBreakMinutes() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v ? clamp(v) : DEFAULT_MINUTES;
  } catch {
    return DEFAULT_MINUTES;
  }
}

const listeners = new Set();

export function setBreakMinutes(minutes) {
  const m = clamp(Number(minutes));
  try { localStorage.setItem(KEY, String(m)); } catch { /* abaikan */ }
  listeners.forEach((fn) => fn(m));
  return m;
}

/** Hook reaktif: nilai menit terkini + setter. */
export function useBreakDuration() {
  const [minutes, setMinutes] = useState(getBreakMinutes);
  useEffect(() => {
    const fn = (m) => setMinutes(m);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return [minutes, setBreakMinutes];
}
