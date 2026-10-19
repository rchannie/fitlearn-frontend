import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Eye, Zap, Camera as CameraIcon, CameraOff, Loader2, HeartPulse, ScanEye } from "lucide-react";
import { Card, GaugeRing, StatusPill, TimelineItem, PageHeader } from "./shared";
import { WearableCard } from "./WearableCard";
import { RoomPanel } from "./HealthWidgets";
import { useHealth } from "../context/HealthProvider";
import { useWorkSession } from "../context/WorkSessionProvider";
import { useT } from "../i18n/LanguageProvider";
import { useHealthAssessment } from "../hooks/useHealthAssessment";
import { rateHeartRate, rateSpo2, rateBlink, rateSuhu, rateUdara } from "../lib/healthRules";

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;

/** Kotak statistik kecil untuk sinyal CV (ekspresi/postur). */
function MiniStat({ label, value, tone = "ok" }) {
  const isWarn = tone === "warn";
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${isWarn ? "border-warning/30 bg-warning/10" : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3"}`}>
      <div className="text-neutral-500 dark:text-neutral-400 text-xs">{label}</div>
      <div className={`mt-0.5 font-semibold text-sm ${isWarn ? "text-warning" : "text-neutral-800 dark:text-white"}`}>{value}</div>
    </div>
  );
}

/** Kamera nyata + overlay PERCLOS. Stream berasal dari Sesi Kerja global
 *  (WorkSessionProvider) — kamera tetap jalan walau pindah halaman. */
function CameraFeed({ ws, t }) {
  const { status, vitals, start, stop, active, getStream } = ws;
  const previewRef = useRef(null);

  // Tampilkan stream kamera global (sama dengan widget PiP) di halaman ini.
  useEffect(() => {
    const v = previewRef.current;
    if (!v) return;
    if (active) {
      const s = getStream();
      if (s && v.srcObject !== s) v.srcObject = s;
    } else {
      v.srcObject = null;
    }
  }, [active, status, getStream]);

  const statusLabel = {
    idle: t("health.camOff"),
    loading: t("health.camLoading"),
    running: vitals.faceDetected ? t("health.camTracking") : t("health.camSearching"),
    "no-face": t("health.camNoFace"),
    denied: t("health.camDenied"),
    error: t("health.camError"),
  }[status] || (active ? status : t("health.camOff"));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white">{t("health.cameraFeed")}</h3>
        <span className="inline-flex items-center gap-1.5 text-accent text-xs">
          <span className={`w-1.5 h-1.5 rounded-full bg-accent ${status === "running" ? "animate-pulse" : "opacity-40"}`} /> MediaPipe
        </span>
      </div>

      <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-neutral-900">
        <video ref={previewRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/30 via-transparent to-accent/20">
            <CameraIcon size={28} className="text-white/70" />
            <button onClick={start} className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold active:scale-95 transition">
              {t("health.startCamera")}
            </button>
            <span className="text-white/60 text-xs text-center px-6 leading-relaxed">{t("work.startCta")}</span>
          </div>
        )}

        {active && status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
        )}
        {active && (status === "denied" || status === "error") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-danger text-xs">{status === "denied" ? t("health.permissionDenied") : t("health.modelError")}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-black/50 text-white text-xs font-mono">
            {status === "running" ? "640p · live" : "offline"}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/50 text-white text-xs">{statusLabel}</span>
        </div>

        {active && (
          <button onClick={stop} className="absolute top-3 right-3 w-7 h-7 rounded-md bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition" aria-label={t("health.stopCamera")}>
            <CameraOff size={14} />
          </button>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-white/70 mb-1.5 flex justify-between text-xs font-mono">
            <span>PERCLOS</span><span>{vitals.perclos ?? "--"} / {PERCLOS_THRESHOLD}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className={`h-full ${vitals.perclos > PERCLOS_THRESHOLD ? "bg-danger" : "bg-accent"}`}
              animate={{ width: `${Math.min(((vitals.perclos || 0) / PERCLOS_THRESHOLD) * 100, 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
      <p className="text-neutral-400 dark:text-neutral-500 mt-3 text-xs leading-relaxed">
        {t("health.privacyNote")}
      </p>
    </Card>
  );
}

export function HealthMonitoring() {
  const { t, lang } = useT();
  const { data, isLive, transport } = useHealth();
  const ws = useWorkSession();
  const camLive = ws.camLive;
  const fv = ws.vitals;

  const { band, session, room, now: nowMs } = useHealthAssessment();

  // Saat kamera live, vitals dari CV adalah sumber kebenaran; null = N/A.
  // Detak jantung & SpO2 tidak lagi dari kamera: lihat kartu Gelang di bawah.
  const live = camLive;
  const perclos = live ? fv.perclos : data.vitals.perclos;
  const pupilDilation = live ? fv.pupilDilation : data.vitals.pupilDilation;
  const blinkRate = live ? fv.blinkRate : null;
  const { stressLevel, fatigueScore, focusScore } = data;
  const hasScores = stressLevel != null;

  const blinkRating = rateBlink(blinkRate, session.seconds);
  const blinkStatus = blinkRating.level === "warning" ? "warning" : "normal";
  const pupilPct = pupilDilation == null ? null : Math.round(pupilDilation * 100);
  const pupilStatus = pupilDilation == null ? "normal" : pupilDilation > 0.6 ? "warning" : "normal";
  const perclosStatus = perclos == null ? "normal" : perclos > PERCLOS_THRESHOLD ? "alert" : perclos > PERCLOS_THRESHOLD * 0.7 ? "warning" : "normal";

  // Lini masa dibangun dari pembacaan nyata; idle = kosong.
  const events = [];
  const nowLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (band.fresh) {
    const hr = rateHeartRate(band.heartRate);
    if (band.heartRate != null) {
      events.push({
        time: nowLabel,
        text: t(hr.level === "good" ? "health.tlBandHrOk" : "health.tlBandHrOff", { v: band.heartRate }),
        type: hr.level === "alert" ? "critical" : hr.level === "warning" ? "warning" : "info",
      });
    }
    const ox = rateSpo2(band.spo2);
    if (band.spo2 != null) {
      events.push({
        time: nowLabel,
        text: t(ox.level === "good" ? "health.tlBandSpo2Ok" : "health.tlBandSpo2Low", { v: band.spo2 }),
        type: ox.level === "alert" ? "critical" : ox.level === "warning" ? "warning" : "info",
      });
    }
  }
  if (room.fresh) {
    if (room.suhu != null) {
      const su = rateSuhu(room.suhu);
      events.push({
        time: nowLabel,
        text: room.suhuDummy
          ? t("health.tlRoomSuhuSim", { v: room.suhu.toFixed(1) })
          : t(su.level === "good" ? "health.tlRoomSuhuOk" : "health.tlRoomSuhuOff", { v: room.suhu.toFixed(1) }),
        type: !room.suhuDummy && su.level === "warning" ? "warning" : "info",
      });
    }
    if (room.gasPpm != null) {
      const ud = rateUdara(room.gasPpm);
      events.push({
        time: nowLabel,
        text: t(ud.level === "good" ? "health.tlRoomAirOk" : "health.tlRoomAirOff", { v: Math.round(room.gasPpm) }),
        type: ud.level === "warning" ? "warning" : "info",
      });
    }
  }
  if (hasScores) {
    const now = new Date();
    const tm = (m) => new Date(now.getTime() - m * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (stressLevel > 65) events.push({ time: tm(0), text: t("health.tlStressSpike", { v: Math.round(stressLevel) }), type: "critical" });
    else if (stressLevel > 40) events.push({ time: tm(0), text: t("health.tlStressRising", { v: Math.round(stressLevel) }), type: "warning" });
    else events.push({ time: tm(0), text: t("health.tlStressStable", { v: Math.round(stressLevel) }), type: "info" });

    if (perclos != null) {
      if (perclos > PERCLOS_THRESHOLD) events.push({ time: tm(5), text: t("health.tlEyeStrain", { v: perclos }), type: "warning" });
      else events.push({ time: tm(5), text: t("health.tlBlinkNormal", { v: perclos }), type: "info" });
    }
    if (pupilDilation != null && pupilDilation > 0.6) events.push({ time: tm(12), text: t("health.tlPupil"), type: "warning" });
    if (fatigueScore != null) {
      if (fatigueScore > 60) events.push({ time: tm(18), text: t("health.tlFatigueHigh", { v: Math.round(fatigueScore) }), type: "critical" });
      else events.push({ time: tm(18), text: t("health.tlFatigueOk", { v: Math.round(fatigueScore) }), type: "info" });
    }
    if (focusScore != null) events.push({ time: tm(25), text: t("health.tlFocus", { v: Math.round(focusScore) }), type: "info" });
  }

  const transportLabel = transport === "websocket" ? t("health.transportWebsocket") : t("health.transportPolling");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <PageHeader
        icon={<HeartPulse size={24} />}
        title={t("health.title")}
        subtitle={isLive
          ? t("health.subLive", { transport: transportLabel, cam: camLive ? t("health.cameraSuffix") : "" })
          : t("health.subIdle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hasScores && <StatusPill status={stressLevel > 65 ? "alert" : "normal"} label={stressLevel > 65 ? t("status.highStress") : t("status.normal")} />}
            {perclos != null && perclos > PERCLOS_THRESHOLD && <StatusPill status="warning" label={t("status.eyeStrain")} />}
            {fv.isSlumping && <StatusPill status="warning" label={t("status.slumping")} />}
            {fv.expression && fv.expression.tension > 0.5 && <StatusPill status="warning" label={t("status.facialTension")} />}
          </div>
        }
      />

      {/* Banner saat kamera aktif tapi wajah tidak terdeteksi */}
      {ws.status === "no-face" && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning flex items-center gap-2">
          <Eye size={16} /> {t("health.noFaceBanner")}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">

        {/* Camera feed — stream dari Sesi Kerja global */}
        <CameraFeed ws={ws} t={t} />

        {/* Live vitals */}
        <Card className="p-5">
          <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white mb-5">{t("health.liveVitals")}</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-accent flex items-center justify-center"><ScanEye size={18} /></div>
                <div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">{t("health.blinkRate")}</div>
                  <div className="text-neutral-400 text-xs">{t("health.blinkSub")}</div>
                </div>
              </div>
              <GaugeRing value={blinkRate} max={30} size={88} unit={t("dash.u.perMin")} status={blinkStatus} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Eye size={18} /></div>
                <div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">{t("health.pupil")}</div>
                  <div className="text-neutral-400 text-xs">{t("health.pupilSub")}</div>
                </div>
              </div>
              <GaugeRing value={pupilPct} size={88} unit="%" status={pupilStatus} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center"><Zap size={18} /></div>
                <div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">{t("health.perclos")}</div>
                  <div className="text-neutral-400 text-xs">{t("health.perclosSub")}</div>
                </div>
              </div>
              <GaugeRing value={perclos} max={PERCLOS_THRESHOLD} size={88} status={perclosStatus} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat
                label={t("health.facialTension")}
                value={fv.expression ? `${Math.round(fv.expression.tension * 100)}%` : "--"}
                tone={fv.expression && fv.expression.tension > 0.5 ? "warn" : "ok"}
              />
              <MiniStat
                label={t("health.posture")}
                value={fv.posture != null ? (fv.isSlumping ? t("health.postureSlumping") : t("health.postureUpright")) : "--"}
                tone={fv.isSlumping ? "warn" : "ok"}
              />
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white mb-3">{t("health.timeline")}</h3>
          <div className="overflow-y-auto max-h-96 pr-1">
            {events.length === 0 ? (
              <div className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">{t("health.timelineEmpty")}</div>
            ) : (
              events.map((e, i) => <TimelineItem key={i} {...e} />)
            )}
          </div>
        </Card>
      </div>

      {/* Gelang IoT — data dari backend fitwork-api, terpisah dari kamera */}
      <WearableCard />

      {/* Unit ruangan (suhu, kelembapan, MQ135) */}
      <RoomPanel room={room} t={t} now={nowMs} locale={lang === "id" ? "id-ID" : "en-US"} />
    </div>
  );
}

export default HealthMonitoring;
