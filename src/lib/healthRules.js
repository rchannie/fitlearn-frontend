/**
 * healthRules.js — aturan pengambilan keputusan kesehatan FitLearn.
 *
 * Menggabungkan SEMUA sumber data menjadi satu penilaian yang bisa dijelaskan:
 *   - Gelang IoT (detak jantung & SpO2, MAX30102)      → source "band"
 *   - Skor model ML backend (fokus, stres, kelelahan)  → source "model"
 *   - Computer vision kamera (PERCLOS, kedip, postur…) → source "camera"
 *   - Unit ruangan (suhu, kelembapan, MQ135)           → source "room"
 *   - Aktivitas keyboard/mouse & lama sesi             → source "activity" / "session"
 *
 * Setiap sinyal yang melewati ambang menjadi "faktor" (alasan) dengan level
 * warning/alert. Dari faktor-faktor itu ditentukan status keseluruhan dan
 * tindakan yang disarankan (lanjut / perbaiki / istirahat). Ambang ditulis di
 * satu tempat (THRESHOLDS) supaya mudah dijelaskan dan diubah.
 *
 * File ini murni (tanpa React) sehingga bisa dipakai di mana saja dan diuji.
 */

import { IOT_STALE_MS, ROOM_STALE_MS } from "./iot";

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;

export const THRESHOLDS = {
  // Gelang (saat duduk belajar)
  hrHigh: 100,        // > 100 bpm: agak tinggi
  hrVeryHigh: 120,    // >= 120 bpm: tinggi
  hrLow: 50,          // < 50 bpm: rendah (atau gelang kurang pas)
  spo2Warn: 95,       // < 95%: sedikit di bawah normal
  spo2Alert: 92,      // < 92%: rendah
  // Skor model ML (0..100)
  stressWarn: 40,
  stressAlert: 65,
  fatigueWarn: 40,
  fatigueAlert: 60,
  focusLow: 50,
  // Kamera
  perclos: PERCLOS_THRESHOLD,
  blinkLow: 8,        // < 8 kedipan/menit: jarang berkedip (mata kering)
  tension: 0.55,
  // Sesi
  longSessionHours: 2.5,
  // Ruangan (kenyamanan ruang belajar)
  roomHot: 30,        // > 30 C: panas
  roomCold: 18,       // < 18 C: dingin
  humidHigh: 70,      // > 70 %: lembap/pengap
  humidLow: 40,       // < 40 %: kering
  co2Warn: 1000,      // > 1000 ppm (estimasi MQ135): udara pengap, perlu ventilasi
};

/**
 * Suhu & kelembapan bertanda simulasi (suhu_dummy dari firmware, saat sensor
 * DHT rusak) TIDAK dipakai untuk keputusan kesehatan, hanya ditampilkan dengan
 * label "simulasi". Ubah ke true hanya untuk demo alur keputusan; faktor yang
 * berasal dari data simulasi tetap ditandai "simulasi".
 */
export const IZINKAN_SIMULASI_DI_KEPUTUSAN = false;

/** Pembacaan gelang yang dirata-rata: maks 3 terakhir dalam 45 detik. */
const BAND_AVG_WINDOW_MS = 45000;
const BAND_AVG_COUNT = 3;

const LEVEL_RANK = { alert: 2, warning: 1, good: 0, none: -1 };
const SOURCE_RANK = { band: 0, model: 1, room: 2, camera: 3, session: 4, activity: 5 };

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

/**
 * Ringkasan gelang: rata-rata beberapa pembacaan terakhir (meredam pembacaan
 * yang meleset sesaat) dan apakah gelang masih aktif mengirim.
 */
export function summarizeBand(readings, now) {
  const latest = readings.length ? readings[readings.length - 1] : null;
  if (!latest) return { hasData: false, fresh: false, heartRate: null, spo2: null, latest: null, ageMs: null };
  const ageMs = now - Date.parse(latest.at);
  const fresh = ageMs <= IOT_STALE_MS;
  const recent = readings
    .filter((r) => now - Date.parse(r.at) <= BAND_AVG_WINDOW_MS)
    .slice(-BAND_AVG_COUNT);
  const hrs = recent.map((r) => r.heartRate).filter((v) => v != null);
  const spo2s = recent.map((r) => r.spo2).filter((v) => v != null);
  const hr = avg(hrs);
  const spo2 = avg(spo2s);
  return {
    hasData: true,
    fresh,
    heartRate: fresh && hr != null ? Math.round(hr) : null,
    spo2: fresh && spo2 != null ? Math.round(spo2) : null,
    samples: recent.length,
    latest,
    ageMs,
  };
}

/** Ringkasan unit ruangan: pembacaan terakhir dan apakah unit masih mengirim. */
export function summarizeRoom(readings, now) {
  const latest = readings.length ? readings[readings.length - 1] : null;
  if (!latest) return { hasData: false, fresh: false, latest: null, ageMs: null, suhu: null, kelembapan: null, suhuDummy: false, gasPpm: null, gasAdc: null };
  const ageMs = now - Date.parse(latest.at);
  const fresh = ageMs <= ROOM_STALE_MS;
  return {
    hasData: true,
    fresh,
    latest,
    ageMs,
    suhu: fresh ? latest.suhu : null,
    kelembapan: fresh ? latest.kelembapan : null,
    suhuDummy: Boolean(latest.suhuDummy),
    gasPpm: fresh ? latest.gasPpm : null,
    gasAdc: fresh ? latest.gasAdc : null,
  };
}

// ── Penilaian per metrik → { level, word } (word = kunci terjemahan "rate.*") ──

const NONE = { level: "none", word: "noData" };

export function rateHeartRate(hr) {
  if (hr == null) return NONE;
  if (hr >= THRESHOLDS.hrVeryHigh) return { level: "alert", word: "high" };
  if (hr > THRESHOLDS.hrHigh) return { level: "warning", word: "elevated" };
  if (hr < THRESHOLDS.hrLow) return { level: "warning", word: "low" };
  return { level: "good", word: "normal" };
}

export function rateSpo2(spo2) {
  if (spo2 == null) return NONE;
  if (spo2 < THRESHOLDS.spo2Alert) return { level: "alert", word: "low" };
  if (spo2 < THRESHOLDS.spo2Warn) return { level: "warning", word: "slightlyLow" };
  return { level: "good", word: "normal" };
}

export function rateStress(v) {
  if (v == null) return NONE;
  if (v > THRESHOLDS.stressAlert) return { level: "alert", word: "high" };
  if (v > THRESHOLDS.stressWarn) return { level: "warning", word: "elevated" };
  return { level: "good", word: "low" };
}

export function rateFatigue(v) {
  if (v == null) return NONE;
  if (v > THRESHOLDS.fatigueAlert) return { level: "alert", word: "high" };
  if (v > THRESHOLDS.fatigueWarn) return { level: "warning", word: "elevated" };
  return { level: "good", word: "low" };
}

export function rateFocus(v) {
  if (v == null) return NONE;
  if (v < THRESHOLDS.focusLow) return { level: "warning", word: "low" };
  if (v >= 70) return { level: "good", word: "good" };
  return { level: "good", word: "normal" };
}

export function ratePerclos(v) {
  if (v == null) return NONE;
  if (v > THRESHOLDS.perclos) return { level: "warning", word: "tired" };
  return { level: "good", word: "normal" };
}

/** Kedipan baru bermakna setelah jendela 60 detik penuh. */
export function rateBlink(v, sessionSeconds) {
  if (v == null || sessionSeconds == null || sessionSeconds < 60) return NONE;
  if (v < THRESHOLDS.blinkLow) return { level: "warning", word: "rare" };
  return { level: "good", word: "normal" };
}

export function ratePosture(isSlumping, measured) {
  if (!measured) return NONE;
  return isSlumping ? { level: "warning", word: "slumping" } : { level: "good", word: "upright" };
}

export function rateTension(v) {
  if (v == null) return NONE;
  return v > THRESHOLDS.tension ? { level: "warning", word: "tense" } : { level: "good", word: "relaxed" };
}

export function rateSuhu(v) {
  if (v == null) return NONE;
  if (v > THRESHOLDS.roomHot) return { level: "warning", word: "hot" };
  if (v < THRESHOLDS.roomCold) return { level: "warning", word: "cold" };
  return { level: "good", word: "comfortable" };
}

export function rateKelembapan(v) {
  if (v == null) return NONE;
  if (v > THRESHOLDS.humidHigh) return { level: "warning", word: "humid" };
  if (v < THRESHOLDS.humidLow) return { level: "warning", word: "dry" };
  return { level: "good", word: "normal" };
}

export function rateUdara(ppm) {
  if (ppm == null) return NONE;
  if (ppm > THRESHOLDS.co2Warn) return { level: "warning", word: "stuffy" };
  return { level: "good", word: "fresh" };
}

export function rateSessionHours(h) {
  if (h == null) return NONE;
  return h > THRESHOLDS.longSessionHours ? { level: "warning", word: "long" } : { level: "good", word: "normal" };
}

export function rateActivity(status, active) {
  if (!active) return NONE;
  if (status === "busy") return { level: "warning", word: "busy" };
  if (status === "away") return { level: "warning", word: "away" };
  return { level: "good", word: "normal" };
}

/**
 * Penilaian keseluruhan.
 *
 * @param {object} p
 * @param {object} p.band     hasil summarizeBand()
 * @param {object} p.scores   { live, focusScore, stressLevel, fatigueScore }
 * @param {object} p.cv       { live, perclos, blinkRate, isSlumping, posture, tension }
 * @param {object} p.activity { active, status }
 * @param {object} p.session  { active, hours, seconds }
 * @param {object} p.room     hasil summarizeRoom()
 * @returns {{ level, factors, primary, sources, action, breakMinutes, notes }}
 */
export function assessHealth({ band, scores, cv, activity, session, room }) {
  const factors = [];
  const notes = [];
  const add = (id, source, level, value, simulated = false) => factors.push({ id, source, level, value, simulated });

  // ── Gelang IoT ──
  if (band?.fresh) {
    const hr = rateHeartRate(band.heartRate);
    if (hr.level === "alert") add("hrVeryHigh", "band", "alert", band.heartRate);
    else if (hr.word === "elevated") add("hrHigh", "band", "warning", band.heartRate);
    else if (hr.word === "low") add("hrLow", "band", "warning", band.heartRate);

    const ox = rateSpo2(band.spo2);
    if (ox.level === "alert") add("spo2Low", "band", "alert", band.spo2);
    else if (ox.level === "warning") add("spo2Below", "band", "warning", band.spo2);
  }

  // ── Skor model ML (hanya saat sesi kamera live, karena dihitung dari kamera + gelang) ──
  if (scores?.live) {
    const st = rateStress(scores.stressLevel);
    if (st.level === "alert") add("stressHigh", "model", "alert", Math.round(scores.stressLevel));
    else if (st.level === "warning") add("stressRising", "model", "warning", Math.round(scores.stressLevel));

    const fa = rateFatigue(scores.fatigueScore);
    if (fa.level === "alert") add("fatigueHigh", "model", "alert", Math.round(scores.fatigueScore));
    else if (fa.level === "warning") add("fatigueRising", "model", "warning", Math.round(scores.fatigueScore));

    if (rateFocus(scores.focusScore).level === "warning") add("focusLow", "model", "warning", Math.round(scores.focusScore));
  }

  // ── Kamera ──
  if (cv?.live) {
    if (ratePerclos(cv.perclos).level === "warning") add("eyeStrain", "camera", "warning", cv.perclos);
    if (rateBlink(cv.blinkRate, session?.seconds).level === "warning") add("blinkLow", "camera", "warning", cv.blinkRate);
    if (ratePosture(cv.isSlumping, cv.posture != null).level === "warning") add("posture", "camera", "warning", null);
    if (rateTension(cv.tension).level === "warning") add("tension", "camera", "warning", Math.round(cv.tension * 100));
  }

  // ── Unit ruangan ──
  // Kualitas udara (MQ135) selalu data asli. Suhu & kelembapan simulasi
  // (suhuDummy) hanya dipakai bila IZINKAN_SIMULASI_DI_KEPUTUSAN = true.
  let roomUsed = false;
  if (room?.fresh) {
    const pakaiSuhu = !room.suhuDummy || IZINKAN_SIMULASI_DI_KEPUTUSAN;
    const sim = room.suhuDummy;
    if (room.suhuDummy && !IZINKAN_SIMULASI_DI_KEPUTUSAN && room.suhu != null) notes.push("roomSimulated");
    if (pakaiSuhu && room.suhu != null) {
      roomUsed = true;
      const su = rateSuhu(room.suhu);
      if (su.word === "hot") add("roomHot", "room", "warning", Number(room.suhu.toFixed(1)), sim);
      else if (su.word === "cold") add("roomCold", "room", "warning", Number(room.suhu.toFixed(1)), sim);
    }
    if (pakaiSuhu && room.kelembapan != null) {
      roomUsed = true;
      const ke = rateKelembapan(room.kelembapan);
      if (ke.word === "humid") add("roomHumid", "room", "warning", Math.round(room.kelembapan), sim);
      else if (ke.word === "dry") add("roomDry", "room", "warning", Math.round(room.kelembapan), sim);
    }
    if (room.gasPpm != null) {
      roomUsed = true;
      if (rateUdara(room.gasPpm).level === "warning") add("roomAir", "room", "warning", Math.round(room.gasPpm));
    }
  }

  // ── Sesi & aktivitas ──
  if (session?.active && rateSessionHours(session.hours).level === "warning") {
    add("longSession", "session", "warning", Number(session.hours.toFixed(1)));
  }
  if (activity?.active && activity.status === "busy") add("overactive", "activity", "warning", null);

  factors.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);

  const sources = {
    band: Boolean(band?.fresh),
    camera: Boolean(cv?.live),
    model: Boolean(scores?.live),
    room: roomUsed,
    activity: Boolean(activity?.active),
  };
  const anySource = Object.values(sources).some(Boolean);

  const alerts = factors.filter((f) => f.level === "alert").length;
  const warnings = factors.filter((f) => f.level === "warning").length;
  const level = alerts ? "alert" : warnings ? "warning" : anySource ? "good" : "none";

  // Keputusan: alert apa pun → istirahat 10 menit; >= 2 peringatan → istirahat
  // 5 menit; 1 peringatan → cukup perbaiki sesuai saran; aman → lanjut.
  let action = "none";
  let breakMinutes = null;
  if (alerts) { action = "break"; breakMinutes = 10; }
  else if (warnings >= 2) { action = "break"; breakMinutes = 5; }
  else if (warnings === 1) action = "adjust";
  else if (anySource) action = "continue";

  return { level, factors, primary: factors[0] || null, sources, action, breakMinutes, notes };
}

/** Kondisi ruangan yang layak jadi notifikasi (hanya data asli). */
export function roomAlerts(room) {
  if (!room?.fresh) return [];
  const out = [];
  const pakaiSuhu = !room.suhuDummy || IZINKAN_SIMULASI_DI_KEPUTUSAN;
  if (pakaiSuhu && rateSuhu(room.suhu).word === "hot") out.push({ type: "roomHot", v: Number(room.suhu.toFixed(1)) });
  if (rateUdara(room.gasPpm).level === "warning") out.push({ type: "roomAir", v: Math.round(room.gasPpm) });
  return out;
}

/** Faktor gelang yang layak jadi notifikasi (dipakai HealthProvider). */
export function bandAlerts(band) {
  if (!band?.fresh) return [];
  const out = [];
  const hr = rateHeartRate(band.heartRate);
  if (hr.level === "alert" || hr.word === "elevated") out.push({ type: "hrHigh", v: band.heartRate });
  else if (hr.word === "low") out.push({ type: "hrLow", v: band.heartRate });
  if (rateSpo2(band.spo2).level !== "good" && band.spo2 != null) out.push({ type: "spo2Low", v: band.spo2 });
  return out;
}
