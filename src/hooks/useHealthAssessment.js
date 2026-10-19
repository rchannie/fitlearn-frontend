import { useMemo } from "react";
import { useHealth } from "../context/HealthProvider";
import { useWorkSession } from "../context/WorkSessionProvider";
import { assessHealth, summarizeBand, summarizeRoom } from "../lib/healthRules";
import { useNow } from "./useNow";

/**
 * Satu pintu untuk semua data kesehatan + keputusan (lihat lib/healthRules.js):
 * gelang IoT, unit ruangan, kamera, skor model ML, aktivitas, dan sesi belajar.
 * Dipakai Dashboard, Monitor Kesehatan, AI Advisor, dan Rekomendasi agar
 * keputusan yang tampil selalu sama di semua halaman.
 */
export function useHealthAssessment() {
  const health = useHealth();
  const ws = useWorkSession();
  const now = useNow(5000);
  const { data, wearable, room: roomData } = health;

  return useMemo(() => {
    const band = summarizeBand(wearable.readings, now);
    const room = summarizeRoom(roomData.readings, now);
    const sessionSeconds = ws.active && ws.sessionStart ? Math.max(0, (now - ws.sessionStart) / 1000) : null;
    const fv = ws.vitals;

    // Skor ML hanya dianggap "langsung" selama kamera benar-benar membaca wajah.
    const scores = {
      live: ws.camLive && data.focusScore != null,
      focusScore: data.focusScore,
      stressLevel: data.stressLevel,
      fatigueScore: data.fatigueScore,
    };
    const cv = {
      live: ws.camLive,
      perclos: fv.perclos,
      blinkRate: fv.blinkRate,
      pupilDilation: fv.pupilDilation,
      posture: fv.posture,
      isSlumping: fv.isSlumping,
      tension: fv.expression ? fv.expression.tension : null,
    };
    const activity = { active: ws.active, ...(ws.activity || {}) };
    const session = {
      active: ws.active,
      seconds: sessionSeconds,
      hours: sessionSeconds != null ? sessionSeconds / 3600 : null,
      awayCount: ws.awayCount,
    };
    const assessment = assessHealth({ band, scores, cv, activity, session, room });
    return { assessment, band, scores, cv, activity, session, wearable, room, roomData, now };
  }, [wearable, roomData, now, ws.active, ws.sessionStart, ws.vitals, ws.camLive, ws.activity, ws.awayCount, data.focusScore, data.stressLevel, data.fatigueScore]);
}

export default useHealthAssessment;
