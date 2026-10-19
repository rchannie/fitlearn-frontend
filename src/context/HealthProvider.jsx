/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNotifications } from "./NotificationProvider";
import { useAuth } from "./AuthContext";
import {
  IOT_ENABLED, IOT_HISTORY_LIMIT, fetchLatestIot, isIotMessage, mergeReadings,
  readingFromPush, wsUrlWithUser,
  ROOM_HISTORY_LIMIT, fetchLatestRoom, isRoomMessage, roomFromPush,
} from "../lib/iot";
import { summarizeBand, bandAlerts, summarizeRoom, roomAlerts } from "../lib/healthRules";

/**
 * HealthProvider — SATU sumber data kesehatan untuk seluruh app.
 *
 * Transport dipilih otomatis:
 *   1. WebSocket real-time — bila VITE_WS_URL diset & koneksi ws berhasil.
 *   2. Polling HTTP        — fallback otomatis.
 *
 * PENTING: tidak ada mock/seed. Saat idle (backend mati / belum ada pembacaan),
 * semua nilai = null dan history = [] → UI menampilkan "--"/kosong, BUKAN angka palsu.
 *
 * Kamera (HealthMonitoring) mengirim vitals via setLiveVitals(); provider
 * meneruskannya ke backend agar skor ML dihitung dari pembacaan nyata.
 *
 * Gelang IoT: saat user login, WebSocket dibuka dengan ?user_id=<uuid> sehingga
 * backend ikut mendorong data gelang (pesan source = "iot"). Pesan gelang
 * disimpan TERPISAH di `wearable` (detak jantung & SpO2) dan tidak menimpa skor
 * kamera, supaya daily_stats tetap hanya berisi sesi kamera. Riwayat awal
 * diambil dari GET /iot/vitals/{user_id}/terbaru; bila WebSocket tidak jalan,
 * endpoint itu dipolling sebagai fallback.
 *
 * Data gelang ikut memengaruhi keputusan:
 *   - detak jantung gelang dikirim ke backend bersama vitals kamera, sehingga
 *     skor ML (stres/kelelahan/fokus) dihitung dari detak jantung nyata
 *     (kamera tidak lagi mengestimasi detak jantung);
 *   - detak jantung tinggi/rendah dan SpO2 rendah memicu notifikasi.
 *
 * Unit ruangan (suhu, kelembapan, MQ135) datang lewat jalur yang sama dengan
 * source = "iot_room" dan disimpan terpisah di `room`. Suhu & kelembapan bertanda
 * suhuDummy (simulasi firmware) hanya ditampilkan, tidak dipakai keputusan.
 */

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL || null;
const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;
const POLL_INTERVAL = 5000;
const PUSH_INTERVAL = 2000;
const MAX_HISTORY = 12;
const IOT_POLL_INTERVAL = 15000; // sama dengan interval kirim gelang
const ROOM_POLL_INTERVAL = 30000; // sama dengan interval kirim unit ruangan

// State kosong — dipakai saat idle. Semua skor/vitals null.
const EMPTY = {
  status: "idle",
  userId: null,
  timestamp: null,
  focusScore: null,
  stressLevel: null,
  fatigueScore: null,
  vitals: { heartRate: null, pupilDilation: null, perclos: null },
  breakWarning: { triggered: false, reason: null, recommendedMinutes: null },
  sessionInfo: { activeWorkHours: null, deepWorkBlocks: null, breakCompliance: null },
  source: null,
};

const HealthContext = createContext(null);

/** Turunkan breakWarning dari skor nyata (hanya bila skor tersedia). */
function deriveBreakWarning(stressLevel, fatigueScore, activeWorkHours) {
  if (stressLevel == null && fatigueScore == null) {
    return { triggered: false, reason: null, recommendedMinutes: null };
  }
  const highStress = stressLevel != null && stressLevel > 65;
  const highFatigue = fatigueScore != null && fatigueScore > 60;
  const longSession = activeWorkHours != null && activeWorkHours > 2.5;
  const triggered = highStress || highFatigue || longSession;

  let reason = null;
  if (highStress && highFatigue) reason = "cognitive_overload";
  else if (highStress) reason = "stress_index_high";
  else if (highFatigue) reason = "fatigue_detected";
  else if (longSession) reason = "long_session";

  return { triggered, reason, recommendedMinutes: triggered ? 10 : null };
}

/** Normalisasi response backend. Field yang tak ada TETAP null (tanpa mock). */
function normalize(raw) {
  const vitals = { ...EMPTY.vitals, ...(raw.vitals || {}) };
  const sessionInfo = { ...EMPTY.sessionInfo, ...(raw.sessionInfo || {}) };
  const focusScore = raw.focusScore ?? null;
  const stressLevel = raw.stressLevel ?? null;
  const fatigueScore = raw.fatigueScore ?? null;

  const breakWarning =
    raw.breakWarning || deriveBreakWarning(stressLevel, fatigueScore, sessionInfo.activeWorkHours);

  return {
    status: raw.status || "ok",
    userId: raw.userId || null,
    timestamp: raw.timestamp || new Date().toISOString(),
    focusScore,
    stressLevel,
    fatigueScore,
    vitals,
    breakWarning,
    sessionInfo,
    source: raw.source || (raw.vitals ? "live" : "baseline"),
  };
}

function clockLabel(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function vitalsBody(v, bandReadings) {
  if (!v) return undefined;
  // Detak jantung dari gelang (rata-rata pembacaan terbaru); bila gelang
  // tidak aktif field ini dihilangkan dan backend memakai nilai dasarnya.
  const band = summarizeBand(bandReadings || [], Date.now());
  return JSON.stringify({
    heartRate: band.heartRate ?? undefined,
    perclos: v.perclos,
    pupilDilation: v.pupilDilation,
    blinkRate: v.blinkRate,
    isSlumping: v.isSlumping ? 1 : 0,
    facialTension: v.expression ? v.expression.tension : undefined,
    // Lama sesi kerja nyata (jam) → backend tak memakai default 5.4 lagi.
    activeWorkHours: v.sessionHours,
  });
}

export function HealthProvider({ children }) {
  const { pushAlert } = useNotifications();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [transport, setTransport] = useState("offline");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Data gelang IoT, dicatat bersama pemiliknya agar ganti akun tidak
  // menampilkan data user sebelumnya.
  const [iot, setIot] = useState({ userId: null, readings: [], error: null });
  // Data unit ruangan, dicatat bersama pemiliknya (sama seperti gelang).
  const [roomState, setRoomState] = useState({ userId: null, readings: [], error: null });

  const timer = useRef(null);
  const vitalsRef = useRef(null);
  const bandReadingsRef = useRef([]);
  const setLiveVitals = useCallback((v) => { vitalsRef.current = v; }, []);

  const addIotReading = useCallback((uid, reading) => {
    setIot((prev) => {
      const base = prev.userId === uid ? prev.readings : [];
      return { userId: uid, readings: [...base, reading].slice(-IOT_HISTORY_LIMIT), error: null };
    });
  }, []);

  const addRoomReading = useCallback((uid, reading) => {
    setRoomState((prev) => {
      const base = prev.userId === uid ? prev.readings : [];
      return { userId: uid, readings: [...base, reading].slice(-ROOM_HISTORY_LIMIT), error: null };
    });
  }, []);

  // Evaluasi alert dari data nyata (hanya bila skor tersedia).
  // pushAlert stabil (useCallback []) → aman jadi dependensi.
  const evaluateAlerts = useCallback((n) => {
    if (n.breakWarning?.triggered) pushAlert("break", { min: n.breakWarning.recommendedMinutes ?? 10 });
    if (n.stressLevel != null && n.stressLevel > 65) pushAlert("stress", { v: Math.round(n.stressLevel) });
    if (n.vitals.perclos != null && n.vitals.perclos > PERCLOS_THRESHOLD) pushAlert("eye", { v: n.vitals.perclos });
  }, [pushAlert]);

  useEffect(() => {
    // Tunggu sesi login dipulihkan dulu, supaya WebSocket langsung dibuka
    // dengan user_id yang benar (tidak buka-tutup dua kali saat start).
    if (authLoading) return;
    let active = true;
    let socket = null;
    let pushTimer = null;

    function commit(json) {
      if (!active || !json || json.status === "error") return;
      const normalized = normalize(json);
      setData(normalized);
      setIsLive(true);
      setError(null);
      setLastUpdated(new Date());
      evaluateAlerts(normalized);
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            t: clockLabel(normalized.timestamp),
            productivity: normalized.focusScore != null ? Math.round(normalized.focusScore) : null,
            stress: normalized.stressLevel != null ? Math.round(normalized.stressLevel) : null,
          },
        ];
        return next.slice(-MAX_HISTORY);
      });
    }

    // WebSocket real-time (pengganti SignalR): buka koneksi ke FastAPI /ws/vitals,
    // kirim vitals kamera tiap PUSH_INTERVAL, terima skor ML dari server.
    function startWebSocket() {
      return new Promise((resolve) => {
        try {
          socket = new WebSocket(wsUrlWithUser(WS_URL, userId));
        } catch (e) {
          console.warn("[HealthProvider] WebSocket gagal dibuat, fallback polling:", e?.message);
          resolve(false);
          return;
        }

        const sendVitals = () => {
          const v = vitalsRef.current;
          if (!v || socket?.readyState !== WebSocket.OPEN) return;
          try { socket.send(vitalsBody(v, bandReadingsRef.current)); } catch { /* reconnect via fallback */ }
        };

        let opened = false;
        socket.onopen = () => {
          if (!active) { try { socket.close(); } catch { /* abaikan */ } return; }
          opened = true;
          setTransport("websocket");
          sendVitals();
          pushTimer = setInterval(sendVitals, PUSH_INTERVAL);
          resolve(true);
        };
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            // Data gelang → wearable; data ruangan → room; selain itu → alur kamera.
            if (isRoomMessage(msg)) { if (active && userId) addRoomReading(userId, roomFromPush(msg)); }
            else if (isIotMessage(msg)) { if (active && userId) addIotReading(userId, readingFromPush(msg)); }
            else commit(msg);
          } catch { /* abaikan frame rusak */ }
        };
        socket.onerror = () => {
          // Bila gagal sebelum open, resolve(false) → fallback polling.
          console.warn("[HealthProvider] WebSocket error, fallback polling");
          resolve(false);
        };
        // Koneksi yang sudah terbuka lalu putus (mis. backend restart) juga
        // pindah ke polling, supaya data tidak diam-diam berhenti.
        socket.onclose = () => {
          if (!active || !opened) return;
          if (pushTimer) { clearInterval(pushTimer); pushTimer = null; }
          console.warn("[HealthProvider] WebSocket terputus, fallback polling");
          startPolling();
        };
      });
    }

    async function poll() {
      const v = vitalsRef.current;
      // Idle = belum ada sesi kamera → JANGAN tarik baseline. Biarkan benar-benar kosong.
      if (!v) { if (active) setIsLive(false); return; }
      if (!API_URL) { if (active) { setIsLive(false); setTransport("offline"); } return; }
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(API_URL, {
          method: "POST",
          // Content-Type text/plain + hanya header CORS-safelisted → tidak memicu
          // preflight OPTIONS (yang ditolak backend). Body tetap JSON; backend
          // membaca via req.get_json() yang tak peduli Content-Type.
          headers: { Accept: "application/json", "Content-Type": "text/plain" },
          body: vitalsBody(v, bandReadingsRef.current),
          signal: controller.signal,
        });
        clearTimeout(to);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        commit(await res.json());
      } catch (e) {
        if (!active) return;
        setIsLive(false);
        setError(e.message || "fetch failed");
      }
    }

    function startPolling() {
      setTransport("polling");
      poll();
      timer.current = setInterval(poll, POLL_INTERVAL);
    }

    (async () => {
      const usedWebSocket = WS_URL ? await startWebSocket() : false;
      if (active && !usedWebSocket) startPolling();
    })();

    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
      if (pushTimer) clearInterval(pushTimer);
      try { socket?.close?.(); } catch { /* abaikan */ }
    };
  }, [evaluateAlerts, userId, authLoading, addIotReading, addRoomReading]);

  // Riwayat gelang dari backend: sekali saat login, lalu dipolling bila
  // WebSocket tidak tersedia (push hanya datang lewat WebSocket).
  useEffect(() => {
    if (!IOT_ENABLED || !userId) return;
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const fromServer = await fetchLatestIot(userId, { signal: controller.signal });
        if (!active) return;
        setIot((prev) => ({
          userId,
          readings: mergeReadings(fromServer, prev.userId === userId ? prev.readings : []),
          error: null,
        }));
      } catch (e) {
        if (!active || e?.name === "AbortError") return;
        setIot((prev) => ({
          userId,
          readings: prev.userId === userId ? prev.readings : [],
          error: e?.message || "fetch failed",
        }));
      }
    }

    load();
    const id = transport === "websocket" ? null : setInterval(load, IOT_POLL_INTERVAL);
    return () => {
      active = false;
      controller.abort();
      if (id) clearInterval(id);
    };
  }, [userId, transport]);

  // Pembacaan gelang milik user ini: disimpan di ref untuk dikirim ke backend,
  // dan dievaluasi untuk notifikasi kesehatan (cooldown diatur NotificationProvider).
  useEffect(() => {
    const readings = iot.userId === userId ? iot.readings : [];
    bandReadingsRef.current = readings;
    if (!readings.length) return;
    for (const a of bandAlerts(summarizeBand(readings, Date.now()))) pushAlert(a.type, { v: a.v });
  }, [iot, userId, pushAlert]);

  // Riwayat unit ruangan: sama seperti gelang (sekali saat login, polling bila
  // WebSocket tidak tersedia).
  useEffect(() => {
    if (!IOT_ENABLED || !userId) return;
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const fromServer = await fetchLatestRoom(userId, { signal: controller.signal });
        if (!active) return;
        setRoomState((prev) => ({
          userId,
          readings: mergeReadings(fromServer, prev.userId === userId ? prev.readings : [], ROOM_HISTORY_LIMIT),
          error: null,
        }));
      } catch (e) {
        if (!active || e?.name === "AbortError") return;
        setRoomState((prev) => ({
          userId,
          readings: prev.userId === userId ? prev.readings : [],
          error: e?.message || "fetch failed",
        }));
      }
    }

    load();
    const id = transport === "websocket" ? null : setInterval(load, ROOM_POLL_INTERVAL);
    return () => {
      active = false;
      controller.abort();
      if (id) clearInterval(id);
    };
  }, [userId, transport]);

  // Notifikasi kondisi ruangan (hanya data asli; simulasi tidak memicu notifikasi).
  useEffect(() => {
    const readings = roomState.userId === userId ? roomState.readings : [];
    if (!readings.length) return;
    for (const a of roomAlerts(summarizeRoom(readings, Date.now()))) pushAlert(a.type, { v: a.v });
  }, [roomState, userId, pushAlert]);

  const room = useMemo(() => {
    const mine = roomState.userId === userId && userId != null;
    const readings = mine ? roomState.readings : [];
    return {
      enabled: IOT_ENABLED && userId != null,
      readings,
      latest: readings.length ? readings[readings.length - 1] : null,
      error: mine ? roomState.error : null,
    };
  }, [roomState, userId]);

  const wearable = useMemo(() => {
    const mine = iot.userId === userId && userId != null;
    const readings = mine ? iot.readings : [];
    return {
      enabled: IOT_ENABLED && userId != null,
      userId,
      readings,
      latest: readings.length ? readings[readings.length - 1] : null,
      error: mine ? iot.error : null,
    };
  }, [iot, userId]);

  const value = useMemo(
    () => ({ data, history, isLive, transport, lastUpdated, error, setLiveVitals, wearable, room }),
    [data, history, isLive, transport, lastUpdated, error, setLiveVitals, wearable, room]
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error("useHealth harus dipakai di dalam <HealthProvider>");
  return ctx;
}

export default HealthProvider;
