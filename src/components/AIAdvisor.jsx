import { Sparkles, Coffee, Eye, Wind, Droplet, Brain, ArrowRight, Inbox, Activity, Zap, HeartPulse, Droplets, Thermometer } from "lucide-react";
import { Card, GaugeRing, PageHeader } from "./shared";
import { HealthStatusCard } from "./HealthWidgets";
import { useHealth } from "../context/HealthProvider";
import { useT } from "../i18n/LanguageProvider";
import { useHealthAssessment } from "../hooks/useHealthAssessment";
import { rateHeartRate, rateSpo2 } from "../lib/healthRules";

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;
const r = (v) => (v == null ? 0 : Math.round(v));

/** Susun kartu saran berdasarkan kondisi (reaktif ke skor). */
function buildSuggestions({ focusScore, stressLevel, fatigueScore, vitals, breakWarning }) {
  const out = [];
  const perclos = vitals.perclos;

  if (breakWarning?.triggered || stressLevel > 65 || fatigueScore > 60) {
    out.push({ icon: Coffee, tone: "alert", titleKey: "advisor.sugBreakTitle", bodyKey: "advisor.sugBreakBody",
      vars: { min: breakWarning?.recommendedMinutes || 10 }, basis: `${Math.max(r(stressLevel), r(fatigueScore))}%`, conf: 92 });
  }
  if (stressLevel > 40) {
    out.push({ icon: Wind, tone: "warning", titleKey: "advisor.sugBreatheTitle", bodyKey: "advisor.sugBreatheBody",
      basis: `${r(stressLevel)}%`, conf: 84 });
  }
  if (perclos != null && perclos > PERCLOS_THRESHOLD * 0.8) {
    out.push({ icon: Eye, tone: "warning", titleKey: "advisor.sugEyeTitle", bodyKey: "advisor.sugEyeBody",
      basis: `PERCLOS ${perclos}`, conf: 80 });
  }
  if (fatigueScore > 45) {
    out.push({ icon: Droplet, tone: "ok", titleKey: "advisor.sugHydrateTitle", bodyKey: "advisor.sugHydrateBody",
      basis: `${r(fatigueScore)}%`, conf: 70 });
  }
  if (focusScore >= 70) {
    out.push({ icon: Brain, tone: "ok", titleKey: "advisor.sugDeepworkTitle", bodyKey: "advisor.sugDeepworkBody",
      basis: `${r(focusScore)}/100`, conf: 88 });
  }
  return out;
}

/** Saran dari perangkat IoT (gelang & unit ruangan), memakai teks faktor keputusan. */
const BAND_ICON = {
  hrVeryHigh: HeartPulse, hrHigh: HeartPulse, hrLow: HeartPulse, spo2Low: Droplets, spo2Below: Droplets,
  roomHot: Thermometer, roomCold: Thermometer, roomHumid: Droplet, roomDry: Droplet, roomAir: Wind,
};
const IOT_FROM = { band: "decision.fromBand", room: "decision.fromRoom" };
function bandSuggestions(factors, t) {
  return factors
    .filter((f) => f.source === "band" || f.source === "room")
    .map((f) => ({
      icon: BAND_ICON[f.id] || HeartPulse,
      tone: f.level === "alert" ? "alert" : "warning",
      titleKey: `decision.f.${f.id}.title`,
      bodyKey: `decision.f.${f.id}.advice`,
      vars: { v: f.value },
      basis: t(IOT_FROM[f.source]),
    }));
}

const GAUGE = { good: "normal", warning: "warning", alert: "alert", none: "normal" };

const TONE_CARD = {
  alert: "border-danger/30 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
  ok: "border-accent/25 bg-accent/5",
};
const TONE_ICON = {
  alert: "bg-danger/12 text-danger",
  warning: "bg-warning/12 text-warning",
  ok: "bg-accent/12 text-primary dark:text-accent",
};

function StatusChip({ icon, label, value, status }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-white/10 px-3 py-2.5">
      <GaugeRing value={value} size={56} status={status} />
      <div>
        <div className="text-neutral-500 dark:text-neutral-400 text-xs flex items-center gap-1">{icon} {label}</div>
        <div className="text-neutral-800 dark:text-white font-semibold text-sm mt-0.5">{value == null ? "--" : value}</div>
      </div>
    </div>
  );
}

export function AIAdvisor({ onTriggerBreak }) {
  const { t } = useT();
  const { data } = useHealth();
  const { assessment, band, scores } = useHealthAssessment();
  const { focusScore, stressLevel, fatigueScore } = data;
  // Saran muncul dari skor kamera (sesi berjalan), gelang IoT, dan/atau unit ruangan.
  const hasData = scores.live || band.fresh || assessment.sources.room;

  const suggestions = [
    ...bandSuggestions(assessment.factors, t),
    ...(scores.live ? buildSuggestions(data) : []),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <PageHeader icon={<Sparkles size={24} />} title={t("advisor.title")} subtitle={t("advisor.sub")} />

      {!hasData ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Inbox size={28} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-400 dark:text-neutral-500 text-sm max-w-sm">{t("advisor.idle")}</p>
        </Card>
      ) : (
        <>
          {/* Keputusan bersama (sama dengan Dashboard): gelang + kamera + ML + aktivitas */}
          <HealthStatusCard assessment={assessment} t={t} onBreak={onTriggerBreak} maxReasons={0} />

          {/* Status ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {band.fresh && <StatusChip icon={<HeartPulse size={11} />} label={t("dash.m.hr")} value={band.heartRate} status={GAUGE[rateHeartRate(band.heartRate).level]} />}
            {band.fresh && <StatusChip icon={<Droplets size={11} />} label="SpO2" value={band.spo2} status={GAUGE[rateSpo2(band.spo2).level]} />}
            {scores.live && <StatusChip icon={<Brain size={11} />} label={t("advisor.statusFocus")} value={focusScore == null ? null : Math.round(focusScore)} status={focusScore >= 70 ? "normal" : focusScore >= 50 ? "warning" : "alert"} />}
            {scores.live && <StatusChip icon={<Activity size={11} />} label={t("advisor.statusStress")} value={stressLevel == null ? null : Math.round(stressLevel)} status={stressLevel > 65 ? "alert" : stressLevel > 40 ? "warning" : "normal"} />}
            {scores.live && <StatusChip icon={<Zap size={11} />} label={t("advisor.statusFatigue")} value={fatigueScore == null ? null : Math.round(fatigueScore)} status={fatigueScore > 60 ? "alert" : fatigueScore > 35 ? "warning" : "normal"} />}
          </div>

          {/* Suggestion cards */}
          {suggestions.length > 0 && (
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white mb-3">{t("advisor.suggestionsTitle")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <Card key={i} className={`p-4 border ${TONE_CARD[s.tone]}`}>
                      <div className="flex items-start justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONE_ICON[s.tone]}`}><Icon size={17} /></div>
                        {s.conf != null && <span className="text-[11px] font-mono text-neutral-400">{t("advisor.confidence")} {s.conf}%</span>}
                      </div>
                      <div className="mt-3 text-neutral-800 dark:text-white font-semibold text-sm">{t(s.titleKey, s.vars)}</div>
                      <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-xs leading-relaxed">{t(s.bodyKey, s.vars)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">{t("advisor.basedOn")}: <span className="font-mono text-neutral-500 dark:text-neutral-300">{s.basis}</span></span>
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-accent hover:gap-1.5 transition-all">
                          {t("advisor.apply")} <ArrowRight size={12} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIAdvisor;
