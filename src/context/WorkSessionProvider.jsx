/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Loader2, CameraOff } from "lucide-react";
import { useFaceVitals } from "../hooks/useFaceVitals";
import { useActivityMonitor } from "../hooks/useActivityMonitor";
import { useNotifications } from "./NotificationProvider";
import { useHealth } from "./HealthProvider";
import { recordBreakRecommended } from "../lib/breakStats";
import { useT } from "../i18n/LanguageProvider";

/**
 * WorkSessionProvider — "Sesi Kerja" global.
 *
 * Sekali dimulai, kamera + MediaPipe (useFaceVitals) berjalan TERUS di
 * semua halaman (kamera dipindah ke level provider, bukan per-halaman),
 * dan ditampilkan sebagai widget mengambang (PiP) di pojok layar.
 *
 * Provider memantau sinyal "kurang fokus" dan memunculkan modal "Ayo Fokus":
 *   - postur membungkuk        (isSlumping bertahan)
 *   - mata lelah / ngantuk      (PERCLOS di atas ambang bertahan)
 *   - ekspresi tegang           (facial tension tinggi bertahan)
 *   - pindah tab kelamaan       (Page Visibility — kembali setelah lama pergi)
 *
 * Selain kamera, provider juga memantau AKTIVITAS INPUT (keyboard + mouse)
 * lewat useActivityMonitor — dua sinyal ini BERDAMPINGAN:
 *   - terlalu lama mengetik / gerak mouse tanpa jeda → sarankan istirahat
 *   - tidak ada input sama sekali saat kerja          → "masih fokus?"
 *
 * Catatan teknis: browser menjeda pemrosesan kamera saat tab di-background,
 * jadi deteksi pindah-tab memakai Page Visibility (durasi pergi), bukan kamera.
 */

const WorkSessionContext = createContext(null);

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;
const TENSION_THRESHOLD = 0.55;

// Berapa lama sinyal buruk harus BERTAHAN sebelum memunculkan modal fokus.
const SLUMP_MS = 6000;
const EYE_MS = 5000;
const TENSION_MS = 8000;
const AWAY_MS = 60000;            // pindah tab > 1 menit dianggap terdistraksi
const FOCUS_COOLDOWN_MS = 90000;  // jangan munculkan modal fokus lebih sering dari ini

// Kunci pesan per alasan — dipakai modal & notifikasi sistem.
const FOCUS_REASON_KEY = {
  posture: "focus.reasonPosture",
  eye: "focus.reasonEye",
  tension: "focus.reasonTension",
  distraction: "focus.reasonDistraction",
  overactive: "focus.reasonOveractive",
  inactive: "focus.reasonInactive",
};

/** Widget kamera mengambang (PiP). Elemen video/canvas SELALU termount
 *  selama provider hidup agar ref stabil & MediaPipe bisa memprosesnya. */
function WorkSessionPiP({ videoRef, canvasRef, active, status, vitals, onStop, t }) {
  const loading = status === "loading";
  const denied = status === "denied" || status === "error";
  const tracking = status === "running" && vitals.faceDetected;

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${active ? "" : "hidden"}`}>
      <div className="w-44 rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl border border-white/10">
        <div className="relative aspect-4/3 bg-neutral-900">
          <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />

          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <Loader2 size={20} className="text-white animate-spin" />
            </div>
          )}
          {denied && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 px-2 text-center">
              <span className="text-danger text-[11px] leading-tight">{t("health.permissionDenied")}</span>
            </div>
          )}

          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55">
            <span className={`w-1.5 h-1.5 rounded-full ${tracking ? "bg-accent animate-pulse" : "bg-white/40"}`} />
            <span className="text-white text-[10px] font-medium">{t("work.pip")}</span>
          </div>
          <button
            onClick={onStop}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/55 hover:bg-black/75 text-white grid place-items-center transition"
            aria-label={t("work.stop")}
          >
            <CameraOff size={12} />
          </button>
        </div>
        <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] text-white/70">
          <span>{status === "no-face" ? t("health.camNoFace") : t("work.live")}</span>
          <span className="font-mono">{vitals.perclos != null ? `P ${vitals.perclos}` : "--"}</span>
        </div>
      </div>
    </div>
  );
}

export function WorkSessionProvider({ children }) {
  const { t } = useT();
  const face = useFaceVitals();
  const { pushAlert } = useNotifications();
  const { setLiveVitals } = useHealth();

  // Ref agar notifikasi sistem selalu memakai terjemahan terbaru tanpa
  // memaksa effect deteksi dibuat ulang saat bahasa berganti.
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const { vitals, status, preload } = face;
  const [active, setActive] = useState(false);

  // Preload MediaPipe (skrip + WASM + model) saat browser idle, supaya klik
  // "Mulai Kerja" langsung menyalakan kamera tanpa jeda unduh dari CDN.
  useEffect(() => {
    let idleId, timeoutId;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(() => preload());
    } else {
      timeoutId = setTimeout(() => preload(), 1500);
    }
    return () => {
      if (idleId) window.cancelIdleCallback?.(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [preload]);
  const [sessionStart, setSessionStart] = useState(null);
  const [awayCount, setAwayCount] = useState(0);
  const [focus, setFocus] = useState({ open: false, reason: null });
  const swRegRef = useRef(null);

  const camLive = active && status === "running" && vitals.faceDetected;

  // Salurkan vitals kamera + lama sesi NYATA ke HealthProvider (sumber skor ML).
  // sessionHours dikirim agar backend tak memakai default palsu (5.4 jam).
  useEffect(() => {
    if (!camLive) { setLiveVitals(null); return; }
    const sessionHours = sessionStart ? (Date.now() - sessionStart) / 3600000 : 0;
    setLiveVitals({ ...vitals, sessionHours: Number(sessionHours.toFixed(3)) });
    return () => setLiveVitals(null);
  }, [camLive, vitals, sessionStart, setLiveVitals]);

  // ── Deteksi kurang fokus (timer "sejak kapan" tiap sinyal) ──
  const since = useRef({ slump: 0, eye: 0, tension: 0 });
  const lastFocusFired = useRef(0);

  const fireFocus = useCallback((reason) => {
    const now = Date.now();
    if (now - lastFocusFired.current < FOCUS_COOLDOWN_MS) return;
    lastFocusFired.current = now;

    // Catat sebagai "istirahat disarankan" untuk metrik kepatuhan istirahat —
    // KECUALI sinyal "inactive" yang hanya menanyakan apakah masih fokus
    // (bukan saran istirahat).
    if (reason !== "inactive") recordBreakRecommended();

    const tt = tRef.current;
    const reg = swRegRef.current;

    // UTAMA: popup notifikasi DI LUAR website + tombol "Istirahat"/"Lanjut fokus".
    // Muncul di pojok layar walau pengguna sedang di tab/aplikasi lain.
    if (reg && "Notification" in window && Notification.permission === "granted") {
      try {
        reg.showNotification(tt("focus.title"), {
          body: tt(FOCUS_REASON_KEY[reason] || "focus.reasonTension"),
          tag: "fitlearn-focus",
          renotify: true,
          requireInteraction: true,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          actions: [
            { action: "break", title: tt("focus.takeBreak") },
            { action: "focus", title: tt("focus.keepFocus") },
          ],
        });
        return;
      } catch { /* fallback ke modal dalam halaman */ }
    }

    // FALLBACK: modal dalam halaman (bila notifikasi belum diizinkan/didukung).
    setFocus({ open: true, reason });
  }, []);

  useEffect(() => {
    if (!camLive) { since.current = { slump: 0, eye: 0, tension: 0 }; return; }
    const now = Date.now();
    const check = (key, cond, dur, onFire) => {
      if (cond) {
        if (!since.current[key]) since.current[key] = now;
        else if (now - since.current[key] >= dur) { since.current[key] = now; onFire(); }
      } else {
        since.current[key] = 0;
      }
    };
    check("slump", vitals.isSlumping, SLUMP_MS, () => { pushAlert("posture"); fireFocus("posture"); });
    check("eye", vitals.perclos != null && vitals.perclos > PERCLOS_THRESHOLD, EYE_MS, () => { pushAlert("eye", { v: vitals.perclos }); fireFocus("eye"); });
    check("tension", vitals.expression != null && vitals.expression.tension > TENSION_THRESHOLD, TENSION_MS, () => { pushAlert("tension"); fireFocus("tension"); });
  }, [camLive, vitals, pushAlert, fireFocus]);

  // ── Deteksi pindah tab (Page Visibility) ──
  const awayStart = useRef(0);
  useEffect(() => {
    if (!active) return;
    function onVis() {
      if (document.hidden) {
        awayStart.current = Date.now();
      } else if (awayStart.current) {
        const away = Date.now() - awayStart.current;
        awayStart.current = 0;
        setAwayCount((c) => c + 1);
        if (away >= AWAY_MS) { pushAlert("distraction"); fireFocus("distraction"); }
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, pushAlert, fireFocus]);

  // ── Aktivitas keyboard + mouse (berdampingan dengan sinyal kamera) ──
  const onSuggestBreak = useCallback((reason) => {
    pushAlert(reason === "keys" ? "overactiveKeys" : "overactiveDuration");
    fireFocus("overactive");
  }, [pushAlert, fireFocus]);

  const onIdle = useCallback(() => {
    pushAlert("inactive");
    fireFocus("inactive");
  }, [pushAlert, fireFocus]);

  const { stats: activity, reset: resetActivity } = useActivityMonitor({
    active,
    onSuggestBreak,
    onIdle,
  });

  const start = useCallback(async () => {
    setActive(true);
    setSessionStart(Date.now());
    setAwayCount(0);
    lastFocusFired.current = 0;
    // Siapkan notifikasi popup di luar website: minta izin + daftarkan service
    // worker (klik tombol "Mulai Kerja" = gesture pengguna yang sah).
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if ("serviceWorker" in navigator && !swRegRef.current) {
        swRegRef.current = await navigator.serviceWorker.register("/sw.js");
      }
    } catch { /* abaikan bila tak didukung */ }
    resetActivity();
    await face.start();
  }, [face, resetActivity]);

  const stop = useCallback(() => {
    face.stop();
    setActive(false);
    setSessionStart(null);
    setFocus({ open: false, reason: null });
    since.current = { slump: 0, eye: 0, tension: 0 };
  }, [face]);

  const dismissFocus = useCallback(() => setFocus((f) => ({ ...f, open: false })), []);
  const getStream = useCallback(() => face.videoRef.current?.srcObject || null, [face.videoRef]);

  const value = useMemo(
    () => ({ active, status, vitals, camLive, sessionStart, awayCount, focus, activity, start, stop, dismissFocus, getStream }),
    [active, status, vitals, camLive, sessionStart, awayCount, focus, activity, start, stop, dismissFocus, getStream]
  );

  return (
    <WorkSessionContext.Provider value={value}>
      {children}
      <WorkSessionPiP videoRef={face.videoRef} canvasRef={face.canvasRef} active={active} status={status} vitals={vitals} onStop={stop} t={t} />
    </WorkSessionContext.Provider>
  );
}

export function useWorkSession() {
  const ctx = useContext(WorkSessionContext);
  if (!ctx) throw new Error("useWorkSession harus dipakai di dalam <WorkSessionProvider>");
  return ctx;
}

export default WorkSessionProvider;
