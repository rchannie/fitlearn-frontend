import { Sparkles, AlertTriangle, CheckCircle2, Coffee, Eye, Wind, Droplet, Brain, ArrowRight, Inbox, Activity, Zap } from "lucide-react";
import { Card, GaugeRing } from "./shared";
import { useHealth } from "../context/HealthProvider";
import { useT } from "../i18n/LanguageProvider";

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;
const r = (v) => (v == null ? 0 : Math.round(v));

/** Tentukan peringatan prioritas tertinggi dari kondisi saat ini. */
function pickPriority({ stressLevel, fatigueScore, vitals, breakWarning }) {
  const perclos = vitals.perclos;
  if (stressLevel > 65 && fatigueScore > 60)
    return { tone: "alert", reasonKey: "advisor.reasonOverload", min: breakWarning?.recommendedMinutes || 10 };
  if (stressLevel > 65)
    return { tone: "alert", reasonKey: "advisor.reasonStressHigh", min: breakWarning?.recommendedMinutes || 10 };
  if (fatigueScore > 60)
    return { tone: "alert", reasonKey: "advisor.reasonFatigue", min: breakWarning?.recommendedMinutes || 10 };
  if (perclos != null && perclos > PERCLOS_THRESHOLD)
    return { tone: "warning", reasonKey: "advisor.reasonEyeStrain", min: 5 };
  if (breakWarning?.triggered)
    return { tone: "warning", reasonKey: "advisor.reasonLongSession", min: breakWarning?.recommendedMinutes || 10 };
  return null; // semua aman
}

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
  const { focusScore, stressLevel, fatigueScore } = data;
  const hasData = focusScore != null || stressLevel != null;

  const priority = hasData ? pickPriority(data) : null;
  const suggestions = hasData ? buildSuggestions(data) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-accent/12 text-primary dark:text-accent flex items-center justify-center"><Sparkles size={18} /></div>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(20px,4vw,28px)", fontWeight: 600 }} className="text-neutral-900 dark:text-white">
            {t("advisor.title")}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400" style={{ fontSize: 14 }}>{t("advisor.sub")}</p>
        </div>
      </div>

      {!hasData ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Inbox size={28} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-400 dark:text-neutral-500 text-sm max-w-sm">{t("advisor.idle")}</p>
        </Card>
      ) : (
        <>
          {/* Status ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatusChip icon={<Brain size={11} />} label={t("advisor.statusFocus")} value={focusScore == null ? null : Math.round(focusScore)} status={focusScore >= 70 ? "normal" : focusScore >= 50 ? "warning" : "alert"} />
            <StatusChip icon={<Activity size={11} />} label={t("advisor.statusStress")} value={stressLevel == null ? null : Math.round(stressLevel)} status={stressLevel > 65 ? "alert" : stressLevel > 40 ? "warning" : "normal"} />
            <StatusChip icon={<Zap size={11} />} label={t("advisor.statusFatigue")} value={fatigueScore == null ? null : Math.round(fatigueScore)} status={fatigueScore > 60 ? "alert" : fatigueScore > 35 ? "warning" : "normal"} />
          </div>

          {/* Priority alert */}
          {priority ? (
            <Card className={`p-5 ${priority.tone === "alert" ? "border-danger/40" : "border-warning/40"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${priority.tone === "alert" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-neutral-400">{t("advisor.priorityTitle")}</div>
                    <div className="text-neutral-900 dark:text-white font-semibold mt-0.5">{t(priority.reasonKey)}</div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-xl leading-relaxed">{t("advisor.sugBreakBody")}</p>
                  </div>
                </div>
                <button
                  onClick={onTriggerBreak}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shrink-0 active:scale-95 transition ${priority.tone === "alert" ? "bg-danger hover:opacity-90" : "bg-warning hover:opacity-90"}`}
                >
                  <Coffee size={16} /> {t("advisor.actNow")}
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-5 border-accent/30 bg-accent/5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-accent/15 text-primary dark:text-accent flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="text-neutral-900 dark:text-white font-semibold">{t("advisor.allClearTitle")}</div>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 leading-relaxed">{t("advisor.allClearBody")}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Suggestion cards */}
          {suggestions.length > 0 && (
            <div>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600 }} className="text-neutral-900 dark:text-white mb-3">{t("advisor.suggestionsTitle")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <Card key={i} className={`p-4 border ${TONE_CARD[s.tone]}`}>
                      <div className="flex items-start justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONE_ICON[s.tone]}`}><Icon size={17} /></div>
                        <span className="text-[11px] font-mono text-neutral-400">{t("advisor.confidence")} {s.conf}%</span>
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
