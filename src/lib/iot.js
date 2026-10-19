/**
 * Helper data gelang IoT (ESP32-C3 + MAX30102) dari backend fitwork-api.
 *
 * Gelang mengirim detak jantung & SpO2 ke POST /iot/vitals (backend), lalu:
 *   - WebSocket /ws/vitals?user_id=<uuid>   → push tiap data baru, pesan berformat
 *                                             sama seperti /ws/vitals biasa dengan
 *                                             source = "iot"
 *   - GET /iot/vitals/{user_id}/terbaru     → riwayat terbaru (untuk isi awal &
 *                                             fallback bila WebSocket tidak jalan)
 *
 * Base URL backend diturunkan dari VITE_API_URL (".../healthscore"), jadi tidak
 * perlu env baru.
 */

const API_URL = import.meta.env.VITE_API_URL || "";

/** Origin/base backend, mis. "http://localhost:8000". Kosong = IoT nonaktif. */
export const API_BASE = API_URL.replace(/\/healthscore\/?$/, "").replace(/\/+$/, "");
export const IOT_ENABLED = Boolean(API_BASE);

export const IOT_HISTORY_LIMIT = 20;
/** Gelang mengirim tiap ~15 detik; lewat dari ini dianggap tidak aktif. */
export const IOT_STALE_MS = 60000;

/** Tambahkan ?user_id= ke URL WebSocket agar ikut menerima push gelang. */
export function wsUrlWithUser(wsUrl, userId) {
  if (!wsUrl || !userId) return wsUrl;
  const sep = wsUrl.includes("?") ? "&" : "?";
  return `${wsUrl}${sep}user_id=${encodeURIComponent(userId)}`;
}

export function isIotMessage(msg) {
  return Boolean(msg) && msg.source === "iot";
}

/** Pesan push WebSocket (source "iot") → satu pembacaan. */
export function readingFromPush(msg) {
  return {
    heartRate: msg.vitals?.heartRate ?? null,
    spo2: msg.vitals?.spo2 ?? null,
    deviceId: msg.deviceId ?? null,
    at: msg.timestamp || new Date().toISOString(),
  };
}

/** Baris tabel iot_vitals (respons GET) → satu pembacaan. */
export function readingFromRow(row) {
  return {
    heartRate: row.heart_rate ?? null,
    spo2: row.spo2 ?? null,
    deviceId: row.device_id ?? null,
    at: row.recorded_at,
  };
}

/** Ambil pembacaan terbaru user, diurutkan dari yang paling lama ke terbaru. */
export async function fetchLatestIot(userId, { limit = IOT_HISTORY_LIMIT, signal } = {}) {
  const url = `${API_BASE}/iot/vitals/${encodeURIComponent(userId)}/terbaru?limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(readingFromRow).reverse();
}

/**
 * Gabungkan riwayat dari GET (sumber utama) dengan push yang datang setelah
 * baris terakhir GET. Push untuk baris yang sama punya timestamp sedikit
 * berbeda (dibuat server setelah insert), jadi diberi toleransi 1 detik.
 */
export function mergeReadings(fromServer, current, limit = IOT_HISTORY_LIMIT) {
  const lastAt = fromServer.length ? Date.parse(fromServer[fromServer.length - 1].at) : -Infinity;
  const newer = current.filter((r) => Date.parse(r.at) > lastAt + 1000);
  return [...fromServer, ...newer].slice(-limit);
}

// ── Unit ruangan (Wemos D1 Mini: DHT11 + MQ135) ─────────────────────────
// POST /iot/room tiap ~30 detik. Push WebSocket bertanda source = "iot_room".
// suhuDummy = true berarti suhu & kelembapan adalah data SIMULASI dari firmware
// (sensor DHT gagal dibaca), bukan hasil ukur.

export const ROOM_HISTORY_LIMIT = 20;
/** Unit ruangan mengirim tiap ~30 detik; lewat dari ini dianggap tidak aktif. */
export const ROOM_STALE_MS = 120000;

export function isRoomMessage(msg) {
  return Boolean(msg) && msg.source === "iot_room";
}

export function roomFromPush(msg) {
  const r = msg.room || {};
  return {
    suhu: r.suhu ?? null,
    kelembapan: r.kelembapan ?? null,
    suhuDummy: Boolean(r.suhuDummy),
    gasAdc: r.gasAdc ?? null,
    gasPpm: r.gasPpm ?? null,
    deviceId: msg.deviceId ?? null,
    at: msg.timestamp || new Date().toISOString(),
  };
}

export function roomFromRow(row) {
  return {
    suhu: row.suhu ?? null,
    kelembapan: row.kelembapan ?? null,
    suhuDummy: Boolean(row.suhu_dummy),
    gasAdc: row.gas_adc ?? null,
    gasPpm: row.gas_ppm ?? null,
    deviceId: row.device_id ?? null,
    at: row.recorded_at,
  };
}

/** Data ruangan terbaru user, diurutkan dari yang paling lama ke terbaru. */
export async function fetchLatestRoom(userId, { limit = ROOM_HISTORY_LIMIT, signal } = {}) {
  const url = `${API_BASE}/iot/room/${encodeURIComponent(userId)}/terbaru?limit=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(roomFromRow).reverse();
}
