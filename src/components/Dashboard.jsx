import { Activity, Brain, Clock, Coffee, Sparkles, Lightbulb, TrendingUp, AlertTriangle, WifiOff, ChevronRight, Keyboard, MousePointer, MousePointerClick, Zap, Moon, ChevronRight as ArrowRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, MetricCard, GaugeRing, StatusPill } from "./shared";
import { useHealth } from "../context/HealthProvider";
import { useDailyStats } from "../context/DailyStatsProvider";
import { useWorkSession } from "../context/WorkSessionProvider";
import { useAuth } from "../context/AuthContext";
import { useBreakStats } from "../lib/breakStats";
import { useT } from "../i18n/LanguageProvider";

function stressStatus(v) { return v == null ? "inactive" : v > 65 ? "alert" : v > 40 ? "warning" : "normal"; }
function fatigueStatus(v) { return v == null ? "inactive" : v > 60 ? "alert" : v > 35 ? "warning" : "normal"; }
function focusStatus(v) { return v == null ? "inactive" : v >= 70 ? "normal" : v >= 50 ? "warning" : "alert"; }
const r = (v) => (v == null ? "--" : Math.round(v));

// Ikon + pill untuk status aktivitas input (keyboard/mouse).
const ACTIVITY_STATUS = {
  idle:   { Icon: Activity, statusKey: "activity.statusIdle",   pill: "inactive" },
  normal: { Icon: Activity, statusKey: "activity.statusNormal", pill: "normal" },
  busy:   { Icon: Zap,      statusKey: "activity.statusBusy",   pill: "warning" },
  away:   { Icon: Moon,     statusKey: "activity.statusAway",   pill: "alert" },
};

export function Dashboard({ onTriggerBreak, onViewHistory, onOpenActivity }) {
  const { t, lang } = useT();
  const { profile, isAuthenticated } = useAuth();
  const { data, history, isLive } = useHealth();
  const { today: todayStat, history: daily } = useDailyStats();
  const { active: workActive, activity } = useWorkSession();
  const breakStats = useBreakStats(); // kepatuhan istirahat NYATA (lokal/harian)
  const { focusScore, stressLevel, fatigueScore, vitals, sessionInfo, breakWarning } = data;

  // Skor fokus: real-time saat mode kerja aktif; saat dimatikan tetap
  // menampilkan skor TERAKHIR sebelum dihentikan (HealthProvider menyimpan
  // `data` terakhir & hanya men-set isLive=false). Hanya jatuh ke rata-rata
  // harian bila belum pernah ada pembacaan live sama sekali.
  const displayFocus = focusScore ?? todayStat?.focus;
  const displayStress = todayStat?.stress ?? stressLevel;
  const displayFatigue = todayStat?.fatigue ?? fatigueScore;
  const displayWorkHours = todayStat?.workHours ?? sessionInfo.activeWorkHours;

  const last7 = daily
    .filter((d) => d.samples > 0)
    .slice(-7)
    .map((d) => ({
      label: new Date(d.day + "T00:00:00").toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }),
      focus: d.focus,
    }));

  const hasData = focusScore != null;
  const REASON_LABEL = {
    stress_index_high: t("advisor.reasonStressHigh"),
    fatigue_detected: t("advisor.reasonFatigue"),
    long_session: t("advisor.reasonLongSession"),
    cognitive_overload: t("advisor.reasonOverload"),
  };

  // Insight hanya dibangun saat ada pembacaan nyata (real-time).
  const insights = hasData
    ? [
        {
          icon: <Lightbulb size={16} />,
          title: focusScore >= 70 ? t("dashboard.insightFocusInTitle") : t("dashboard.insightFocusOutTitle"),
          body: focusScore >= 70
            ? t("dashboard.insightFocusIn", { score: r(focusScore) })
            : t("dashboard.insightFocusOut", { score: r(focusScore) }),
        },
        {
          icon: <Coffee size={16} />,
          title: stressLevel > 40 ? t("dashboard.insightStretchTitle") : t("dashboard.insightStressOkTitle"),
          body: stressLevel > 40
            ? t("dashboard.insightStretch", { score: r(stressLevel) })
            : t("dashboard.insightStressOk", { score: r(stressLevel) }),
        },
        {
          icon: <TrendingUp size={16} />,
          title: t("dashboard.insightBlocksTitle", { n: sessionInfo.deepWorkBlocks ?? 0 }),
          body: t("dashboard.insightBlocks", {
            hours: displayWorkHours ?? 0,
            compliance: sessionInfo.breakCompliance ?? breakStats.compliance,
          }),
        },
      ]
    : [];

  const greeting = isAuthenticated && profile
    ? t("dashboard.greeting", { name: profile.fullName })
    : t("dashboard.greetingGuest");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">

      {/* Hero row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <GaugeRing value={focusScore == null ? null : Math.round(focusScore)} size={88} status={focusStatus(focusScore)} />
          <div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(20px,4vw,28px)", fontWeight: 600 }} className="text-neutral-900 dark:text-white">
              {greeting}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1" style={{ fontSize: 14 }}>
              {hasData ? (
                <>
                  {t("dashboard.focusLine", { score: r(focusScore) })}
                  {focusScore >= 70 ? t("dashboard.inFlow") : t("dashboard.bringBack")}
                </>
              ) : (
                t("dashboard.idleSub")
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenActivity}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold active:scale-95 transition shrink-0"
          >
            <Keyboard size={16} /> {t("dashboard.activityMonitor")}
          </button>
          <StatusPill status={isLive ? "normal" : "inactive"} label={isLive ? t("status.liveActive") : t("status.idle")} />
        </div>
      </div>

      {/* Break warning banner (muncul kalau triggered dari data nyata) */}
      {breakWarning?.triggered && (
        <Card className="p-4 border-warning/40 bg-warning/8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-neutral-900 dark:text-white font-semibold text-sm">{t("dashboard.breakRecommended")}</div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                  {REASON_LABEL[breakWarning.reason] || t("dashboard.breakTime")} · {t("dashboard.suggestedMin", { min: breakWarning.recommendedMinutes })}
                </p>
              </div>
            </div>
            <button
              onClick={onTriggerBreak}
              className="px-4 py-2 rounded-xl bg-warning text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition shrink-0"
            >
              {t("dashboard.takeBreakNow")}
            </button>
          </div>
        </Card>
      )}

      {/* Metric cards — dari accumulated daily stats (fallback ke real-time saat idle) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard label={t("dashboard.metricFocus")} value={r(displayFocus)} unit="/100" delta={displayFocus == null ? t("common.noData") : !isLive ? t("dashboard.deltaLastScore") : displayFocus >= 70 ? t("dashboard.deltaInFlow") : t("dashboard.deltaBelowPeak")} status={focusStatus(displayFocus)} icon={<Brain size={18} />} />
        <MetricCard label={t("dashboard.metricStress")} value={r(displayStress)} unit="%" delta={hasData ? (displayStress > 40 ? t("dashboard.deltaModerate") : t("dashboard.deltaHealthy")) : t("common.noData")} status={stressStatus(displayStress)} icon={<Activity size={18} />} />
        <MetricCard label={t("dashboard.metricFatigue")} value={r(displayFatigue)} unit="%" delta={hasData ? (displayFatigue > 35 ? t("dashboard.deltaWatch") : t("dashboard.deltaLowFatigue")) : t("common.noData")} status={fatigueStatus(displayFatigue)} icon={<Coffee size={18} />} />
        <MetricCard label={t("dashboard.metricHours")} value={displayWorkHours != null ? `${(displayWorkHours || 0).toFixed(1)}h` : "--"} delta={sessionInfo.deepWorkBlocks != null ? t("dashboard.deepBlocks", { n: sessionInfo.deepWorkBlocks }) : t("common.noData")} status={displayWorkHours != null ? "normal" : "inactive"} icon={<Clock size={18} />} />
      </div>

      {/* Ringkasan Monitor Aktivitas (keyboard + mouse) */}
      {(() => {
        const a = activity || { keystrokes: 0, mouseMoves: 0, clicks: 0, keysPerMin: 0, status: "idle" };
        const meta = ACTIVITY_STATUS[workActive ? a.status : "idle"] || ACTIVITY_STATUS.idle;
        const AIcon = meta.Icon;
        return (
          <Card className="p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-accent" />
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{t("dashboard.activityTitle")}</h3>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={meta.pill} label={t(meta.statusKey)} />
                <button onClick={onOpenActivity} className="inline-flex items-center gap-1 text-primary dark:text-accent hover:underline text-sm font-medium">
                  {t("dashboard.openActivity")} <ArrowRight size={15} />
                </button>
              </div>
            </div>
            {workActive ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ActivityTile icon={<Keyboard size={16} />} label={t("activity.keystrokes")} value={a.keystrokes.toLocaleString()} />
                <ActivityTile icon={<MousePointer size={16} />} label={t("activity.mouseMoves")} value={a.mouseMoves.toLocaleString()} />
                <ActivityTile icon={<MousePointerClick size={16} />} label={t("activity.clicks")} value={a.clicks.toLocaleString()} />
                <ActivityTile icon={<AIcon size={16} />} label={t("dashboard.activityPace")} value={`${a.keysPerMin}`} sub={t("dashboard.activityPaceUnit")} />
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-neutral-50 dark:bg-white/3 border border-neutral-200 dark:border-white/10 text-sm text-neutral-400 dark:text-neutral-500">
                {t("dashboard.activityIdle")}
              </div>
            )}
          </Card>
        );
      })()}

      {/* Chart + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
        <Card className="xl:col-span-2 p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">
                {t("dashboard.chartTitle")}
              </h3>
              <p className="text-neutral-400 dark:text-neutral-500 mt-0.5" style={{ fontSize: 13 }}>{isLive ? t("dashboard.chartLive") : t("dashboard.chartIdle")}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> {t("dashboard.productivity")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> {t("dashboard.stress")}</span>
            </div>
          </div>
          <div className="h-60 sm:h-72">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 gap-2">
                <WifiOff size={22} className="opacity-50" />
                <span className="text-sm">{t("dashboard.chartEmpty")}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ left: -20, top: 8, right: 8 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-dark, #fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontSize: 12 }}
                    itemStyle={{ color: "#6b7280" }}
                  />
                  <Line type="monotone" dataKey="productivity" stroke="#5B4BE6" strokeWidth={2.5} dot={{ r: 3, fill: "#5B4BE6" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
                  <Line type="monotone" dataKey="stress"       stroke="#BA7517" strokeWidth={2.5} dot={{ r: 3, fill: "#BA7517" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-accent" />
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{t("dashboard.aiInsights")}</h3>
          </div>
          {insights.length === 0 ? (
            <div className="rounded-xl p-4 bg-neutral-50 dark:bg-white/3 border border-neutral-200 dark:border-white/10 text-sm text-neutral-400 dark:text-neutral-500">
              {t("dashboard.insightsIdle")}
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((i, idx) => (
                <div key={idx} className="rounded-xl p-3.5 bg-accent/5 dark:bg-accent/8 border border-accent/20 hover:border-accent/40 transition cursor-pointer">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-primary dark:text-accent flex items-center justify-center shrink-0">{i.icon}</div>
                    <div>
                      <div className="text-neutral-800 dark:text-white font-semibold" style={{ fontSize: 13.5 }}>{i.title}</div>
                      <p className="text-neutral-500 dark:text-neutral-400 mt-0.5" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{i.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Riwayat 7 hari (tersimpan di Supabase, reset per hari) */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{t("history.card7Title")}</h3>
            <p className="text-neutral-400 dark:text-neutral-500 mt-0.5" style={{ fontSize: 13 }}>{t("history.card7Sub")}</p>
          </div>
          <button onClick={onViewHistory} className="inline-flex items-center gap-1 text-primary dark:text-accent hover:underline text-sm font-medium">
            {t("history.viewAll")} <ChevronRight size={15} />
          </button>
        </div>
        <div className="h-44">
          {last7.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 gap-2">
              <WifiOff size={20} className="opacity-50" />
              <span className="text-sm text-center max-w-xs">{t("history.card7Empty")}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7} margin={{ left: -20, top: 8, right: 8 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--color-surface-dark, #fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontSize: 12 }} itemStyle={{ color: "#6b7280" }} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} />
                <Bar dataKey="focus" fill="#5B4BE6" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Live session bar — vitals dari shared state */}
      <Card className="p-3.5 px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
            ) : (
              <WifiOff size={14} className="text-neutral-400" />
            )}
            <span className="text-neutral-700 dark:text-neutral-200 font-medium text-sm">{isLive ? t("dashboard.sessionLive") : t("dashboard.sessionOffline")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-neutral-500 dark:text-neutral-400 text-xs">
            <span>{t("dashboard.source")}: <span className={`font-mono ${data.source === "live" ? "text-accent" : "text-neutral-500"}`}>{data.source === "live" ? t("status.camera") : t("status.baseline")}</span></span>
            <span>HR: <span className="font-mono text-neutral-700 dark:text-neutral-200">{vitals.heartRate != null ? `${vitals.heartRate} bpm` : "--"}</span></span>
            <span>PERCLOS: <span className="font-mono text-neutral-700 dark:text-neutral-200">{vitals.perclos != null ? vitals.perclos : "--"}</span></span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Kotak metrik kecil untuk ringkasan aktivitas di dashboard. */
function ActivityTile({ icon, label, value, sub }) {
  return (
    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/3 border border-neutral-200 dark:border-white/10">
      <div className="flex items-center gap-2 text-primary dark:text-accent">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">{icon}</div>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{value}</span>
        {sub && <span className="text-neutral-400 dark:text-neutral-500 text-xs">{sub}</span>}
      </div>
    </div>
  );
}

export default Dashboard;
