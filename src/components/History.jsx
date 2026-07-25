import { Brain, Activity, Coffee, Clock, CalendarDays, WifiOff, Loader2, LogIn } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, MetricCard } from "./shared";
import { useDailyStats } from "../context/DailyStatsProvider";
import { useT } from "../i18n/LanguageProvider";

const r = (v) => (v == null ? "--" : Math.round(v));

function avg(rows, key) {
  const vals = rows.map((x) => x[key]).filter((v) => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

export function History() {
  const { t, lang } = useT();
  const { history, loading, enabled } = useDailyStats();

  const fmtDay = (day) =>
    new Date(day + "T00:00:00").toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" });

  const withData = history.filter((h) => h.samples > 0);
  const last7 = withData.slice(-7);
  const last14 = history.slice(-14).map((h) => ({ label: fmtDay(h.day), focus: h.focus, stress: h.stress }));
  const totalHours = last7.reduce((a, h) => a + (h.workHours || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: "clamp(20px,4vw,28px)", fontWeight: 600 }} className="text-neutral-900 dark:text-white">
          {t("history.title")}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1" style={{ fontSize: 14 }}>{t("history.sub")}</p>
      </div>

      {/* Belum login / Supabase belum siap */}
      {!enabled ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"><LogIn size={22} /></div>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm">{t("history.needLogin")}</p>
        </Card>
      ) : loading ? (
        <Card className="p-12 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-accent" /></Card>
      ) : withData.length === 0 ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <WifiOff size={26} className="text-neutral-400 opacity-60" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm">{t("history.empty")}</p>
        </Card>
      ) : (
        <>
          {/* Ringkasan 7 hari */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard label={t("history.avgFocus")} value={r(avg(last7, "focus"))} unit="/100" delta={t("history.last7")} status="normal" icon={<Brain size={18} />} />
            <MetricCard label={t("history.avgStress")} value={r(avg(last7, "stress"))} unit="%" delta={t("history.last7")} status="normal" icon={<Activity size={18} />} />
            <MetricCard label={t("history.avgFatigue")} value={r(avg(last7, "fatigue"))} unit="%" delta={t("history.last7")} status="normal" icon={<Coffee size={18} />} />
            <MetricCard label={t("history.totalHours")} value={totalHours ? totalHours.toFixed(1) : "0"} unit="h" delta={t("history.last7")} status="normal" icon={<Clock size={18} />} />
          </div>

          {/* Grafik tren */}
          <Card className="p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{t("history.trendTitle")}</h3>
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> {t("dashboard.metricFocus")}</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> {t("dashboard.metricStress")}</span>
              </div>
            </div>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last14} margin={{ left: -20, top: 8, right: 8 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-dark, #fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontSize: 12 }} itemStyle={{ color: "#6b7280" }} />
                  <Line type="monotone" dataKey="focus" stroke="#5B4BE6" strokeWidth={2.5} dot={{ r: 3, fill: "#5B4BE6" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
                  <Line type="monotone" dataKey="stress" stroke="#FF9E45" strokeWidth={2.5} dot={{ r: 3, fill: "#FF9E45" }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Daftar per hari (terbaru di atas) */}
          <Card className="p-5 lg:p-6">
            <h3 style={{ fontFamily: "'Baloo 2', 'Baloo 2', 'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white mb-4">{t("history.listTitle")}</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 px-3 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                <span className="col-span-2 inline-flex items-center gap-1.5"><CalendarDays size={13} /> {t("history.colDay")}</span>
                <span className="text-right">{t("history.colFocus")}</span>
                <span className="text-right">{t("history.colStress")}</span>
                <span className="text-right">{t("history.colHours")}</span>
              </div>
              {[...withData].reverse().map((h) => (
                <div key={h.day} className="grid grid-cols-5 gap-2 px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-white/3 border border-neutral-200 dark:border-white/10 items-center" style={{ fontSize: 13.5 }}>
                  <span className="col-span-2 text-neutral-800 dark:text-white font-medium">{fmtDay(h.day)}</span>
                  <span className="text-right font-mono text-primary dark:text-accent">{r(h.focus)}</span>
                  <span className="text-right font-mono text-warning">{r(h.stress)}</span>
                  <span className="text-right font-mono text-neutral-600 dark:text-neutral-300">{h.workHours ? `${h.workHours}h` : "--"}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default History;
