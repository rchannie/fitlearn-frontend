import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useActivityMonitor
 * -------------------------------------------------------------
 * Pelacak aktivitas input NYATA (keyboard + mouse) di seluruh halaman.
 * Tidak butuh kamera/izin — hanya event listener `keydown`, `mousemove`,
 * `mousedown`, dan `wheel` pada window.
 *
 * Tujuannya menggantikan deteksi "fokus" berbasis gaze/gestur:
 *
 *   1. OVERAKTIF  — bila pengguna mengetik & menggerakkan mouse terus-menerus
 *                   (tanpa jeda berarti) selama BUSY_WINDOW_MS, ATAU jumlah
 *                   ketikan menembus KEYS_PER_BREAK → sarankan istirahat.
 *
 *   2. IDLE       — bila saat mode kerja AKTIF tidak ada satupun input selama
 *                   IDLE_MS → tanyakan apakah masih fokus (mungkin ketiduran /
 *                   meninggalkan meja / terdistraksi di perangkat lain).
 *
 * Hook ini stateless terhadap UI: ia hanya menghitung & memanggil callback
 * `onSuggestBreak(reason)` dan `onIdle()`. WorkSessionProvider yang memutuskan
 * apa yang ditampilkan (modal / notifikasi), agar konsisten dengan sinyal kamera.
 */

// ── Ambang waktu & hitungan (boleh dioverride lewat opts) ──
const DEFAULTS = {
  // Hitung ketikan: setelah sekian tuts diketik tanpa istirahat → saran istirahat.
  keysPerBreak: 600,
  // Aktif terus (typing/mouse hampir tanpa jeda) selama ini → saran istirahat.
  busyWindowMs: 25 * 60 * 1000, // 25 menit (pola Pomodoro)
  // Jeda terpanjang yang masih dianggap "tanpa istirahat" dalam sesi sibuk.
  busyMaxGapMs: 90 * 1000,      // 1,5 menit
  // Tidak ada input sama sekali selama ini saat kerja → "masih fokus?".
  idleMs: 2 * 60 * 1000,        // 2 menit
  // Jangan picu callback yang sama lebih sering dari ini.
  cooldownMs: 90 * 1000,
};

export function useActivityMonitor({ active, onSuggestBreak, onIdle, ...opts } = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  // Statistik yang ditampilkan ke UI (re-render ringan tiap detik).
  const [stats, setStats] = useState({
    keystrokes: 0,
    mouseMoves: 0,
    clicks: 0,
    keysPerMin: 0,
    activeRatio: 0,    // 0..1 — porsi detik yang ada inputnya selama sesi busy
    status: "idle",    // "idle" | "normal" | "busy" | "away"
    lastInputAgo: 0,   // detik sejak input terakhir
  });

  // Penghitung mentah (ref agar tidak memicu render tiap keystroke).
  const counts = useRef({ keystrokes: 0, mouseMoves: 0, clicks: 0 });
  const lastInputAt = useRef(0);
  const busyStart = useRef(0);          // kapan periode "sibuk tanpa istirahat" dimulai
  const keysSinceBreak = useRef(0);     // ketikan sejak istirahat terakhir
  const activeSeconds = useRef(0);      // detik yang ada inputnya (untuk activeRatio)
  const busySeconds = useRef(0);        // total detik dalam periode busy
  const lastSuggest = useRef(0);
  const lastIdle = useRef(0);

  // Simpan callback di ref agar listener tidak perlu dipasang ulang.
  const cbRef = useRef({ onSuggestBreak, onIdle });
  useEffect(() => { cbRef.current = { onSuggestBreak, onIdle }; }, [onSuggestBreak, onIdle]);

  /** Reset semua hitungan — dipanggil saat sesi mulai / saat istirahat diambil. */
  const reset = useCallback(() => {
    counts.current = { keystrokes: 0, mouseMoves: 0, clicks: 0 };
    keysSinceBreak.current = 0;
    busyStart.current = 0;
    activeSeconds.current = 0;
    busySeconds.current = 0;
    lastInputAt.current = Date.now();
    lastSuggest.current = 0;
    lastIdle.current = 0;
    setStats((s) => ({ ...s, keystrokes: 0, mouseMoves: 0, clicks: 0, keysPerMin: 0, activeRatio: 0, status: "normal", lastInputAgo: 0 }));
  }, []);

  /** Tandai istirahat sudah diambil → nolkan akumulasi "sejak istirahat". */
  const markBreakTaken = useCallback(() => {
    keysSinceBreak.current = 0;
    busyStart.current = 0;
    activeSeconds.current = 0;
    busySeconds.current = 0;
    lastSuggest.current = Date.now();
  }, []);

  // ── Pasang listener input (hanya saat sesi kerja aktif) ──
  useEffect(() => {
    if (!active) return;
    lastInputAt.current = Date.now();
    busyStart.current = Date.now();

    const onKey = (e) => {
      // Abaikan tuts modifier murni agar hitungan mencerminkan "mengetik".
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      counts.current.keystrokes += 1;
      keysSinceBreak.current += 1;
      lastInputAt.current = Date.now();
    };
    const onMove = () => {
      counts.current.mouseMoves += 1;
      lastInputAt.current = Date.now();
    };
    const onClick = () => {
      counts.current.clicks += 1;
      lastInputAt.current = Date.now();
    };

    window.addEventListener("keydown", onKey, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onClick, { passive: true });
    window.addEventListener("wheel", onMove, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("wheel", onMove);
    };
  }, [active]);

  // ── Loop evaluasi per detik ──
  // Saat sesi tidak aktif, interval tidak berjalan; konsumen menampilkan
  // "idle" berdasarkan flag `active` (lihat ActivityMonitor), jadi tak perlu
  // setState sinkron di sini.
  useEffect(() => {
    if (!active) return;
    let prevKeys = counts.current.keystrokes;
    const sampleKeys = [];      // ketikan per detik (jendela 60 dtk untuk kpm)

    const id = setInterval(() => {
      const now = Date.now();
      const c = counts.current;
      const sinceInput = now - lastInputAt.current;
      const hadInputThisSec = sinceInput < 1500;

      busySeconds.current += 1;
      if (hadInputThisSec) activeSeconds.current += 1;

      // Keystrokes per menit (rata-rata jendela 60 detik).
      const deltaKeys = c.keystrokes - prevKeys;
      prevKeys = c.keystrokes;
      sampleKeys.push(deltaKeys);
      if (sampleKeys.length > 60) sampleKeys.shift();
      const kpm = sampleKeys.reduce((a, b) => a + b, 0) * (60 / sampleKeys.length);

      const activeRatio = busySeconds.current > 0 ? activeSeconds.current / busySeconds.current : 0;

      // ── 1) IDLE: tidak ada input lama saat kerja → "masih fokus?" ──
      if (sinceInput >= cfg.idleMs) {
        if (now - lastIdle.current >= cfg.cooldownMs) {
          lastIdle.current = now;
          cbRef.current.onIdle?.();
        }
      }

      // Jika ada jeda panjang, reset titik mulai "sibuk tanpa istirahat".
      if (sinceInput >= cfg.busyMaxGapMs) {
        busyStart.current = now;
        activeSeconds.current = 0;
        busySeconds.current = 0;
      }

      // ── 2) OVERAKTIF: terlalu banyak ketik / sibuk terlalu lama → istirahat ──
      const tooManyKeys = keysSinceBreak.current >= cfg.keysPerBreak;
      const busyTooLong =
        busyStart.current > 0 &&
        now - busyStart.current >= cfg.busyWindowMs &&
        activeRatio >= 0.6; // benar-benar aktif terus, bukan idle yang lama

      if ((tooManyKeys || busyTooLong) && now - lastSuggest.current >= cfg.cooldownMs) {
        lastSuggest.current = now;
        const reason = tooManyKeys ? "keys" : "duration";
        // Setelah menyarankan, nolkan akumulasi agar tidak spam.
        keysSinceBreak.current = 0;
        busyStart.current = now;
        activeSeconds.current = 0;
        busySeconds.current = 0;
        cbRef.current.onSuggestBreak?.(reason);
      }

      const status = sinceInput >= cfg.idleMs ? "away" : kpm > 200 || activeRatio > 0.7 ? "busy" : "normal";

      setStats({
        keystrokes: c.keystrokes,
        mouseMoves: c.mouseMoves,
        clicks: c.clicks,
        keysPerMin: Math.round(kpm),
        activeRatio: Number(activeRatio.toFixed(2)),
        status,
        lastInputAgo: Math.round(sinceInput / 1000),
      });
    }, 1000);

    return () => clearInterval(id);
  }, [active, cfg.idleMs, cfg.busyMaxGapMs, cfg.busyWindowMs, cfg.keysPerBreak, cfg.cooldownMs]);

  return { stats, reset, markBreakTaken };
}

export default useActivityMonitor;
